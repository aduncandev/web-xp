// VFS path utilities and helpers — pure functions, no dependencies

/**
 * Normalize a path: forward slashes, no trailing slash (except root drives).
 * "C:\Users\foo\" → "C:/Users/foo"
 * "C:\" → "C:/"
 */
export function normalizePath(p) {
  let out = p.replace(/\\/g, '/').replace(/\/+/g, '/');
  // Remove trailing slash unless it's a drive root like "C:/"
  if (out.length > 1 && out.endsWith('/') && out[out.length - 2] !== ':') {
    out = out.slice(0, -1);
  }
  return out;
}

/**
 * Every field a VFS node has, in one place.
 *
 * The live filesystem and the seeder both build nodes, and each used to
 * carry its own copy of this list. They drifted: seeded nodes never got
 * the four shortcut fields the Properties dialog edits, so a seeded
 * shortcut held `undefined` where a user-created one held `null`.
 *
 * The two things callers legitimately differ on are passed in. The seeder
 * derives drive names its own way — `getBaseName('C:/')` is `''` where a
 * drive node needs `'C:'` — and stamps a fixed epoch so that a freshly
 * seeded disk is identical every time.
 */
export function makeVfsNode(path, type, { name, at } = {}) {
  return {
    path,
    name: name !== undefined ? name : getBaseName(path),
    type,
    content: null,
    hasBinaryContent: false,
    blobId: null,
    sourceUrl: null,
    mimeType: null,
    size: 0,
    icon: null,
    iconLarge: null,
    iconKey: null,
    createdAt: at,
    modifiedAt: at,
    readOnly: false,
    system: false,
    hidden: false,
    target: null,
    targetArgs: null,
    // Shortcut-only fields, editable from Properties > Shortcut
    comment: null,
    startIn: null,
    runMode: null,
    customIcon: false,
    driveLabel: null,
    fileSystemType: null,
    totalSpace: null,
    freeSpace: null,
    originalPath: null,
    deletedAt: null,
    specialFolder: null,
  };
}

/** Get parent directory path. "C:/foo/bar" → "C:/foo" */
export function getParentPath(p) {
  const normalized = normalizePath(p);
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash <= 0) return null;
  // If parent would be "C:", return "C:/"
  const parent = normalized.slice(0, lastSlash);
  if (parent.length === 2 && parent[1] === ':') return parent + '/';
  return parent;
}

/** Get the filename/last segment. "C:/foo/bar.txt" → "bar.txt" */
export function getBaseName(p) {
  const normalized = normalizePath(p);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
}

/** Get file extension (with dot, lowercase). "readme.TXT" → ".txt" */
export function getExtension(p) {
  const name = getBaseName(p);
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return '';
  return name.slice(dot).toLowerCase();
}

/** Join path segments. joinPath("C:/foo", "bar") → "C:/foo/bar" */
export function joinPath(base, name) {
  const b = normalizePath(base);
  return b.endsWith('/') ? b + name : b + '/' + name;
}

/** Convert internal path to Windows display format. "C:/foo/bar" → "C:\\foo\\bar" */
export function displayPath(p) {
  return normalizePath(p).replace(/\//g, '\\');
}

/** Human-readable file size. */
export function formatSize(bytes) {
  if (bytes == null || bytes < 0) return '0 bytes';
  if (bytes === 0) return '0 bytes';
  if (bytes === 1) return '1 byte';
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Check if childPath is a descendant of parentPath. */
export function isDescendantOf(childPath, parentPath) {
  const child = normalizePath(childPath);
  const parent = normalizePath(parentPath);
  const prefix = parent.endsWith('/') ? parent : parent + '/';
  return child.startsWith(prefix);
}

/** Check if childPath is a direct child of parentPath. */
export function isDirectChildOf(childPath, parentPath) {
  const child = normalizePath(childPath);
  const parent = normalizePath(parentPath);
  const prefix = parent.endsWith('/') ? parent : parent + '/';
  if (!child.startsWith(prefix)) return false;
  return !child.slice(prefix.length).includes('/');
}

/** Characters Windows forbids in file names. */
export const INVALID_NAME_CHARS = [
  '\\',
  '/',
  ':',
  '*',
  '?',
  '"',
  '<',
  '>',
  '|',
];

/**
 * Validate a file/folder name the way Windows XP does.
 * Returns null if valid, or an error string describing the problem.
 */
export function validateFileName(name) {
  if (!name || !name.trim()) return 'empty';
  if (INVALID_NAME_CHARS.some(c => name.includes(c))) return 'invalid-chars';
  if (/^\.+$/.test(name.trim())) return 'invalid-chars';
  return null;
}

/** The XP error message shown when a name contains forbidden characters. */
export const INVALID_NAME_MESSAGE =
  'A file name cannot contain any of the following characters:\n\\ / : * ? " < > |';

/** Guess MIME type from file extension. */
export function guessMimeType(pathOrExt) {
  const ext = pathOrExt.startsWith('.')
    ? pathOrExt.toLowerCase()
    : getExtension(pathOrExt);
  const map = {
    '.txt': 'text/plain',
    '.log': 'text/plain',
    '.ini': 'text/plain',
    '.cfg': 'text/plain',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.exe': 'application/x-msdownload',
  };
  return map[ext] || 'application/octet-stream';
}
