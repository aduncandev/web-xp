/**
 * Pure utility functions for the Virtual File System.
 * No React dependencies — safe to use anywhere.
 */

/**
 * Normalize a path: forward slashes, collapse `.` / `..`, strip trailing slash
 * (except for drive root like `C:/`).
 */
export function normalizePath(raw) {
  let p = raw.replace(/\\/g, '/');

  // Collapse sequences of slashes
  p = p.replace(/\/+/g, '/');

  // Resolve `.` and `..`
  const parts = p.split('/');
  const resolved = [];
  for (const seg of parts) {
    if (seg === '.') continue;
    if (seg === '..') {
      // Don't pop past drive letter (e.g. "C:")
      if (resolved.length > 1) resolved.pop();
      continue;
    }
    resolved.push(seg);
  }

  p = resolved.join('/');

  // Strip trailing slash unless it's the drive root (e.g. "C:/")
  if (p.length > 3 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }

  // Ensure drive root always ends with slash: "C:" -> "C:/"
  if (/^[A-Z]:$/i.test(p)) {
    p += '/';
  }

  return p;
}

/** Return the parent directory path, or null if already at root. */
export function getParentPath(path) {
  const n = normalizePath(path);
  // Drive root has no parent
  if (/^[A-Z]:\/$/i.test(n)) return null;

  const idx = n.lastIndexOf('/');
  if (idx <= 0) return null;

  const parent = n.slice(0, idx);
  // If parent is just drive letter, ensure slash: "C:" -> "C:/"
  if (/^[A-Z]:$/i.test(parent)) return parent + '/';
  return parent;
}

/** Return direct children of `dirPath` from the flat map `fs`. */
export function getChildren(fs, dirPath) {
  const dir = normalizePath(dirPath);
  const results = [];
  for (const [key, node] of fs) {
    if (key === dir) continue; // skip self
    const parent = getParentPath(key);
    if (parent === dir) results.push(node);
  }
  return results;
}

/** Return the filename portion of a path. */
export function getBaseName(path) {
  const n = normalizePath(path);
  const idx = n.lastIndexOf('/');
  return idx >= 0 ? n.slice(idx + 1) : n;
}

/** Return the file extension (lowercase, no dot), or '' for none. */
export function getExtension(path) {
  const base = getBaseName(path);
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return ''; // no ext, or dotfile like ".gitignore"
  return base.slice(dot + 1).toLowerCase();
}

/** Check that a filename contains no illegal characters. */
export function isValidName(name) {
  if (!name || !name.trim()) return false;
  return !/[\\/:*?"<>|]/.test(name);
}

/** Format bytes into human-readable size string (Windows XP style). */
export function formatFileSize(bytes) {
  if (bytes == null || bytes === 0) return '0 bytes';
  if (bytes === 1) return '1 byte';
  if (bytes < 1024) return `${bytes} bytes`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

/** Get the actual byte size of file content (string, ArrayBuffer, or Blob). */
export function getContentSize(content) {
  if (content == null) return 0;
  if (typeof content === 'string') return new Blob([content]).size;
  if (content instanceof ArrayBuffer) return content.byteLength;
  if (content instanceof Blob) return content.size;
  return 0;
}

/** Detect MIME type from filename extension. */
export function getMimeType(filename) {
  const ext = getExtension(filename);
  const mimeMap = {
    txt: 'text/plain',
    log: 'text/plain',
    ini: 'text/plain',
    cfg: 'text/plain',
    htm: 'text/html',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',
    md: 'text/markdown',
    bmp: 'image/bmp',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    webp: 'image/webp',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    pdf: 'application/pdf',
    zip: 'application/zip',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/** Check if a MIME type represents a text-based file. */
export function isTextMimeType(mimeType) {
  if (!mimeType) return true;
  return mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml';
}

/** Get Windows XP-style type display string for a file. */
export function getFileTypeDisplay(node) {
  if (node.type === 'directory') return 'File Folder';
  const ext = getExtension(node.path || node.name);
  const typeMap = {
    txt: 'Text Document',
    log: 'Text Document',
    doc: 'Microsoft Word Document',
    htm: 'HTML Document',
    html: 'HTML Document',
    bmp: 'Bitmap Image',
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image',
    png: 'PNG Image',
    gif: 'GIF Image',
    ini: 'Configuration Settings',
    cfg: 'Configuration Settings',
    bat: 'MS-DOS Batch File',
    exe: 'Application',
    dll: 'Application Extension',
    sys: 'System File',
    zip: 'Compressed (zipped) Folder',
  };
  return typeMap[ext] || (ext ? `${ext.toUpperCase()} File` : 'File');
}

/** Format a timestamp as Windows XP style date string. */
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Format a timestamp as short date (for Details view). */
export function formatDateShort(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Generate a unique name under `dirPath` by appending (2), (3), etc.
 * `baseName` can be "New Folder" or "readme.txt".
 */
export function generateUniqueName(fs, dirPath, baseName) {
  const dir = normalizePath(dirPath);
  const testPath = normalizePath(`${dir}/${baseName}`);
  if (!fs.has(testPath)) return baseName;

  const dot = baseName.lastIndexOf('.');
  const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
  const ext = dot > 0 ? baseName.slice(dot) : '';

  let counter = 2;
  while (true) {
    const candidate = `${stem} (${counter})${ext}`;
    const candidatePath = normalizePath(`${dir}/${candidate}`);
    if (!fs.has(candidatePath)) return candidate;
    counter++;
  }
}
