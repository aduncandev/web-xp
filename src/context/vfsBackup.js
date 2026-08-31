/*
 * User-data backup and restore.
 *
 * Two callers share this: the Windows Error Recovery screen (a schema bump
 * is about to rebuild the filesystem, so the user's own files are offered
 * as a downloadable .zip first) and the Backup tool (ntbackup.exe), which
 * makes the same archive on demand and restores one back into the live
 * filesystem.
 *
 * The archive holds full paths with the drive colon dropped ("C:/x" ->
 * "C/x") plus a README.txt explaining how to restore. Only data the user
 * made is included: non-system files that actually carry bytes (seeded
 * assets live in the site build and come back on their own), and the
 * per-user ntuser.dat settings hives.
 */
import { extractEntry, readZip, writeZip } from './zip';

/** A file the user made or filled in — worth carrying across a rebuild. */
export function isUserFile(n) {
  return (
    n.type === 'file' &&
    !n.system &&
    (n.content != null || n.hasBinaryContent || !!n.blobId)
  );
}

/** A folder the user made; kept so empty ones survive the trip. */
export function isUserFolder(n) {
  return n.type === 'folder' && !n.system;
}

const README = `WINDOWS BACKUP
==============

This archive holds the files and settings that were stored on your
computer at aduncan.dev — documents, pictures, downloads, and the
ntuser.dat file inside each profile folder (that one holds your
settings, XP Points, and eggs).

To restore everything:

 1. Visit the site and log in. If your account is gone, create it
    again FIRST, using the same user name as before — files go back
    to the profile folder they came from.

 2. Open Start > All Programs > Accessories > System Tools > Backup
    (or Start > Run..., type  backup  and press OK).

 3. Choose "Restore files and settings", pick this .zip file, and
    let it run.

 4. Log off and log back on so your restored settings take effect.

The folder layout inside this archive mirrors the computer itself:
"C/Documents and Settings/<you>/..." is drive C:. Nothing here is
readable by real Windows — it only means something to the site.
`;

/** 'C:/x' -> 'C/x'; a drive colon makes a hostile zip root. */
const entryNameFor = path => path.replace(':', '');

/** 'C/x' -> 'C:/x' — only single-letter roots count as drives. */
const pathForEntry = name => name.replace(/^([A-Za-z])\//, '$1:/');

const isSafeEntryName = name =>
  /^[A-Za-z]\//.test(name) &&
  name.split('/').every(part => part !== '..' && part !== '');

// The settings hive must land back as text (the shell reads it from
// node.content); these are the text types the site's apps write.
const TEXT_FILE = /(^|\/)ntuser\.dat$|\.(txt|log|ini|cfg|bat|reg|rtf|htm|html|url|m3u|css|js|json|xml|csv)$/i;

/**
 * Build the backup archive.
 *
 * `nodes` is any iterable of VFS node records (live or straight out of
 * IndexedDB); `readBytes(node)` resolves a user file's contents as a
 * Uint8Array, or null when they cannot be read (the file is then listed in
 * the README's place — skipped, not fatal).
 */
export async function buildBackupZip(nodes, readBytes) {
  const files = [
    { name: 'README.txt', bytes: new TextEncoder().encode(README) },
  ];
  let count = 0;
  for (const node of nodes) {
    if (isUserFolder(node)) {
      files.push({
        name: `${entryNameFor(node.path)}/`,
        directory: true,
        modified: node.modifiedAt,
      });
    } else if (isUserFile(node)) {
      // eslint-disable-next-line no-await-in-loop
      const bytes = await readBytes(node);
      if (bytes) {
        files.push({
          name: entryNameFor(node.path),
          bytes,
          modified: node.modifiedAt,
        });
        count += 1;
      }
    }
  }
  const blob = await writeZip(files);
  return { blob, count };
}

/** Bytes for a stored (not-yet-live) node record, given a blob loader. */
export async function storedNodeBytes(node, loadNodeBlob) {
  // Files corrupted by the old createFile kept their real bytes as a Blob
  // inside `content` — rescue those first.
  if (node.content instanceof Blob)
    return new Uint8Array(await node.content.arrayBuffer());
  if (typeof node.content === 'string')
    return new TextEncoder().encode(node.content);
  try {
    const blob = await loadNodeBlob(node);
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/**
 * Restore a backup archive into the live filesystem. Existing user files
 * are overwritten; system nodes are never touched. Returns counts for the
 * completion summary.
 */
export async function restoreBackupZip(vfs, zipBytes, { onProgress } = {}) {
  const { entries } = readZip(zipBytes);
  let restored = 0;
  let skipped = 0;

  const ensureFolders = path => {
    const parts = path.split('/');
    let at = parts[0];
    for (let i = 1; i < parts.length; i++) {
      at += `/${parts[i]}`;
      const existing = vfs.findNodeCI(at);
      if (!existing) vfs.createFolder(at);
      else if (existing.type === 'file' || existing.type === 'shortcut')
        return false; // a file is squatting where a folder must go
    }
    return true;
  };

  for (const entry of entries.filter(e => e.directory)) {
    const name = entry.name.replace(/\/$/, '');
    if (!isSafeEntryName(name)) continue;
    ensureFolders(pathForEntry(name));
  }

  const wanted = entries.filter(e => !e.directory && e.name !== 'README.txt');
  for (let i = 0; i < wanted.length; i++) {
    const entry = wanted[i];
    if (onProgress) onProgress(`${i + 1} of ${wanted.length}`, entry.name);
    if (!isSafeEntryName(entry.name)) {
      skipped++;
      continue;
    }
    const path = pathForEntry(entry.name);
    const existing = vfs.findNodeCI(path);
    if (existing && (existing.system || existing.type !== 'file')) {
      skipped++;
      continue;
    }
    const parent = path.slice(0, path.lastIndexOf('/'));
    if (!ensureFolders(parent)) {
      skipped++;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const data = await extractEntry(zipBytes, entry, '');
    let ok;
    if (TEXT_FILE.test(path)) {
      const text = new TextDecoder().decode(data);
      ok = existing
        ? vfs.writeFile(existing.path, text)
        : vfs.createFile(path, text);
    } else {
      ok = vfs.createFile(path, new Blob([data]));
    }
    if (ok) restored++;
    else skipped++;
    // The hive keeps its hidden-file nature when recreated from scratch
    if (!existing && /(^|\/)ntuser\.dat$/i.test(path))
      vfs.setNodeAttributes(path, { hidden: true });
  }
  return { restored, skipped };
}
