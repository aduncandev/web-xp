// Importing files dragged in from the host OS into the virtual filesystem.

import { playSystemSound } from './sounds';

// Kept free so a big import can never wedge the origin's quota completely.
const IMPORT_HEADROOM_BYTES = 50 * 1024 * 1024;

/**
 * Bytes still available in the origin's storage quota (the real limit on
 * imports — browsers typically grant a large share of free disk). Returns
 * null when the browser won't say; the write attempt decides then.
 */
async function freeQuotaBytes() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      if (quota > 0) return Math.max(0, quota - usage - IMPORT_HEADROOM_BYTES);
    }
  } catch {
    // estimate unavailable
  }
  return null;
}

const OUT_OF_SPACE_MESSAGE =
  'There is not enough free disk space.\n\nDelete one or more files to free disk space, and then try again.';

// Once someone stores real files here, ask the browser to mark the origin
// persistent: protects against storage eviction and typically raises the
// quota. Chromium decides silently from site engagement — no prompt.
let persistRequested = false;
async function requestPersistentStorage() {
  if (persistRequested) return;
  persistRequested = true;
  try {
    if (navigator.storage && navigator.storage.persist) {
      await navigator.storage.persist();
    }
  } catch {
    // best effort
  }
}

/**
 * Pull File objects out of a drop's dataTransfer synchronously (the items
 * list is only valid during the event). Directories are skipped — the VFS
 * import supports files only.
 */
export function extractOsFiles(dataTransfer) {
  if (!dataTransfer) return [];
  const items = dataTransfer.items;
  if (
    items &&
    items.length > 0 &&
    typeof items[0].webkitGetAsEntry === 'function'
  ) {
    const out = [];
    for (const item of items) {
      if (item.kind !== 'file') continue;
      const entry = item.webkitGetAsEntry();
      if (entry && entry.isDirectory) continue;
      const file = item.getAsFile();
      if (file) out.push(file);
    }
    return out;
  }
  return Array.from(dataTransfer.files || []);
}

function splitName(name) {
  const dot = name.lastIndexOf('.');
  if (dot > 0) return [name.slice(0, dot), name.slice(dot)];
  return [name, ''];
}

/**
 * Copy OS File objects into a VFS folder. Name conflicts auto-number
 * case-insensitively ('name (2).ext'); oversized files get the XP error
 * dialog; a ding plays once when at least one file lands.
 */
export async function importOsFiles(vfs, dlg, files, destDir) {
  let imported = 0;
  await requestPersistentStorage();
  let remaining = await freeQuotaBytes();
  let spaceErrorShown = false;
  const outOfSpace = async () => {
    if (spaceErrorShown) return;
    spaceErrorShown = true;
    await dlg.alert(OUT_OF_SPACE_MESSAGE, 'Error Copying File or Folder', {
      icon: 'error',
    });
  };
  for (const file of files || []) {
    const name = file.name || 'New File';
    if (remaining != null && file.size > remaining) {
      await outOfSpace();
      continue;
    }
    const [base, ext] = splitName(name);
    let candidate = `${destDir}/${name}`;
    let counter = 2;
    while (vfs.existsCI(candidate)) {
      candidate = `${destDir}/${base} (${counter})${ext}`;
      counter += 1;
    }
    try {
      vfs.createFile(candidate, '', file.type || undefined);
      const ok = await vfs.writeBinaryFile(
        candidate,
        file,
        file.type || undefined,
      );
      if (ok !== false) {
        imported += 1;
        if (remaining != null) remaining -= file.size;
      } else {
        // The write itself hit the quota — drop the empty shell
        if (vfs.deleteNodePermanently) vfs.deleteNodePermanently(candidate);
        await outOfSpace();
      }
    } catch {
      // best-effort per file; keep copying the rest
    }
  }
  if (imported > 0) playSystemSound('ding');
  return imported;
}
