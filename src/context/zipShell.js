/*
 * Zipping things that live in the file system.
 *
 * The format itself is in zip.js and knows nothing about the VFS; this is the
 * shell half — walking a selection into a list of entries — so that Explorer
 * can offer "Send To > Compressed (zipped) Folder" without reaching into an
 * application's module.
 */
import { BadPasswordError, extractEntry, readZip, writeZip } from './zip';
import { getParentPath } from './vfsUtils';
import { resolveNodeIcons } from './vfsIcons';

/**
 * An entry name that stays inside the folder it is extracted to. Nothing
 * legitimate is named "..\evil" or "C:\evil", so those are skipped rather
 * than allowed to climb out of the destination.
 */
function safeEntryName(name) {
  if (!name || name.startsWith('/') || /^[a-z]:/i.test(name)) return false;
  return name.split('/').every(part => part !== '..' && part !== '');
}

/** Make every folder along `path`; the VFS creates only one at a time. */
export function ensureFolder(vfs, path) {
  const parts = path.split('/');
  let at = parts[0];
  for (let i = 1; i < parts.length; i++) {
    at += `/${parts[i]}`;
    if (!vfs.findNodeCI(at)) vfs.createFolder(at);
  }
}

/** Read an archive out of the file system. */
export async function openArchive(vfs, zipPath) {
  const blob = await vfs.readBinaryFile(zipPath);
  if (!blob) throw new Error('Error opening the compressed file.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { entries } = readZip(bytes);
  return { bytes, entries };
}

/**
 * Extract every file in `zipPath` under `destination`.
 *
 * `onNeedPassword(name, wasWrong)` is asked whenever an entry will not open
 * with the password in hand, and may answer with a new one, 'skip', or null
 * to give up — which is what the real dialog's three buttons did.
 */
export async function extractArchive(
  vfs,
  zipPath,
  destination,
  { password = '', onProgress, onNeedPassword } = {},
) {
  const { bytes, entries } = await openArchive(vfs, zipPath);
  const wanted = entries.filter(e => !e.directory);
  if (!wanted.length) throw new Error('No files to extract.');
  ensureFolder(vfs, destination);

  let key = password;
  let extracted = 0;
  let skipped = 0;
  for (let i = 0; i < wanted.length; i++) {
    const entry = wanted[i];
    if (onProgress) onProgress(`${i + 1} of ${wanted.length}`, entry.name);
    if (!safeEntryName(entry.name)) {
      skipped++;
      continue;
    }
    let data = null;
    for (;;) {
      try {
        // eslint-disable-next-line no-await-in-loop
        data = await extractEntry(bytes, entry, key);
        break;
      } catch (err) {
        if (!(err instanceof BadPasswordError) || !onNeedPassword) throw err;
        // eslint-disable-next-line no-await-in-loop
        const answer = await onNeedPassword(entry.name, !!key);
        if (answer === 'skip') break;
        if (answer === null || answer === undefined)
          return { extracted, skipped, cancelled: true };
        key = answer;
      }
    }
    if (data === null) {
      skipped++;
      continue;
    }
    const target = `${destination}/${entry.name}`;
    ensureFolder(vfs, getParentPath(target));
    const existing = vfs.findNodeCI(target);
    if (existing) vfs.deleteNodePermanently(existing.path);
    const blob = new Blob([data]);
    if (vfs.createFile(target, blob, blob.type)) extracted++;
  }
  return { extracted, skipped };
}

/**
 * Pull a single entry out to `destination`, returning where it landed. This is
 * what opening a file inside a compressed folder did: the shell unpacked it to
 * a temporary directory and then opened that copy.
 */
export async function extractOne(
  vfs,
  zipPath,
  innerName,
  destination,
  password,
) {
  const { bytes, entries } = await openArchive(vfs, zipPath);
  const entry = entries.find(e => e.name === innerName && !e.directory);
  if (!entry || !safeEntryName(entry.name))
    throw new Error('The specified compressed file is empty.');
  const data = await extractEntry(bytes, entry, password || '');
  const target = `${destination}/${entry.name}`;
  ensureFolder(vfs, getParentPath(target));
  const existing = vfs.findNodeCI(target);
  if (existing) vfs.deleteNodePermanently(existing.path);
  const blob = new Blob([data]);
  return vfs.createFile(target, blob, blob.type) ? target : null;
}

/** Rewrite an archive with every entry encrypted, as "Add a password" did. */
export async function addPasswordToArchive(vfs, zipPath, password) {
  const { bytes, entries } = await openArchive(vfs, zipPath);
  if (entries.some(e => e.encrypted))
    // XP's zipfldr had separate add/remove verbs; layering a second password
    // over the first is never what anyone means
    throw new Error(
      'This Compressed (zipped) Folder is already password protected. Remove the existing password first.',
    );
  const files = [];
  for (const entry of entries.filter(e => !e.directory)) {
    // eslint-disable-next-line no-await-in-loop
    const data = await extractEntry(bytes, entry, '');
    files.push({ name: entry.name, bytes: data, modified: entry.modified });
  }
  const blob = await writeZip(files, { password });
  return vfs.writeBinaryFile(zipPath, blob, 'application/zip');
}

/**
 * The other half of the pair — "Remove password from selected item(s)"
 * (ZIPFLDR #109): decrypt with the password in hand, rewrite in the clear.
 * Throws BadPasswordError on a wrong password so the caller can use the
 * real invalid-password wording (#10076).
 */
export async function removePasswordFromArchive(vfs, zipPath, password) {
  const { bytes, entries } = await openArchive(vfs, zipPath);
  if (!entries.some(e => e.encrypted))
    throw new Error(
      'This Compressed (zipped) Folder is not password protected.',
    );
  const files = [];
  for (const entry of entries.filter(e => !e.directory)) {
    // eslint-disable-next-line no-await-in-loop
    const data = await extractEntry(bytes, entry, password);
    files.push({ name: entry.name, bytes: data, modified: entry.modified });
  }
  const blob = await writeZip(files);
  return vfs.writeBinaryFile(zipPath, blob, 'application/zip');
}

/**
 * Send To > Compressed (zipped) Folder, complete: the archive is named after
 * the first item, lands beside it, and dodges collisions the way the shell
 * names copies. The desktop and Explorer both call this — it used to live,
 * duplicated, in each of them.
 */
export async function sendToCompressedFolder(vfs, paths) {
  const first = vfs.getNode(paths[0]);
  if (!first) return null;
  const dir = getParentPath(first.path);
  const stem = first.name.replace(/\.[^.]+$/, '') || first.name;
  let dest = `${dir}/${stem}.zip`;
  for (let n = 2; vfs.findNodeCI(dest); n++) dest = `${dir}/${stem} (${n}).zip`;
  await compressPaths(vfs, paths, dest);
  return dest;
}

/** Zip a set of paths into `destination`, the way Send To did. */
export async function compressPaths(vfs, paths, destination, password) {
  const files = [];
  const add = async (path, base) => {
    const node = vfs.findNodeCI(path);
    if (!node) return;
    const name = base ? `${base}/${node.name}` : node.name;
    if (node.type === 'folder') {
      files.push({ name: `${name}/`, directory: true });
      // eslint-disable-next-line no-await-in-loop
      for (const child of vfs.listDir(node.path)) await add(child.path, name);
      return;
    }
    if (node.type !== 'file') return;
    const blob = await vfs.readBinaryFile(node.path);
    files.push({
      name,
      bytes: blob
        ? new Uint8Array(await blob.arrayBuffer())
        : new Uint8Array(0),
      modified: node.modifiedAt,
    });
  };
  for (const path of paths) {
    // eslint-disable-next-line no-await-in-loop
    await add(path, '');
  }
  const blob = await writeZip(files, { password: password || '' });
  return vfs.createFile(destination, blob, 'application/zip');
}

/**
 * Split a shell path that points at or into an archive.
 *
 * "C:/x/a.zip" -> { archive: 'C:/x/a.zip', inner: '' }
 * "C:/x/a.zip/sub" -> { archive: 'C:/x/a.zip', inner: 'sub' }
 * anything else -> null.
 *
 * This is what lets a .zip behave like a folder in Explorer: the shell keeps
 * walking the same path string, and only the listing comes from elsewhere.
 */
export function zipPathParts(path) {
  const text = String(path || '');
  const match = /^(.*?\.zip)(?:\/(.*))?$/i.exec(text);
  if (!match) return null;
  return { archive: match[1], inner: match[2] || '' };
}

/**
 * The immediate children of `inner` inside an archive, shaped like file system
 * nodes so the rest of Explorer — icons, type names, sorting, the status bar —
 * needs to know nothing about archives.
 */
const withIcons = node => ({ ...node, ...resolveNodeIcons(node) });

export function zipChildren(entries, archive, inner) {
  const prefix = inner ? `${inner}/` : '';
  const folders = new Map();
  const files = [];
  for (const entry of entries) {
    if (!entry.name.startsWith(prefix)) continue;
    const rest = entry.name.slice(prefix.length);
    if (!rest) continue;
    const slash = rest.indexOf('/');
    if (slash < 0 && !entry.directory) {
      files.push(
        withIcons({
          path: `${archive}/${entry.name}`,
          name: rest,
          type: 'file',
          size: entry.size,
          packedSize: entry.packedSize,
          modifiedAt: entry.modified,
          inArchive: true,
          encrypted: entry.encrypted,
        }),
      );
    } else {
      // Folders may exist only as a prefix of the paths inside them
      const label = slash < 0 ? rest.replace(/\/$/, '') : rest.slice(0, slash);
      if (label && !folders.has(label))
        folders.set(
          label,
          withIcons({
            path: `${archive}/${prefix}${label}`,
            name: label,
            type: 'folder',
            size: 0,
            modifiedAt: entry.modified,
            inArchive: true,
          }),
        );
    }
  }
  return [...folders.values(), ...files];
}
