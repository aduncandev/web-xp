// IndexedDB persistence layer for the VFS

const DB_NAME = 'winxp_vfs';
const DB_VERSION = 1;
const META_STORE = 'vfs_meta';
const BLOB_STORE = 'vfs_blobs';

/**
 * Open (or create) the VFS IndexedDB database.
 * Returns a Promise<IDBDatabase>.
 */
export function openVFSDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'path' });
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: 'path' });
      }
    };

    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e.target.error);
  });
}

/** Load all FileNode metadata from IDB. */
export function loadAllMeta(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = e => reject(e.target.error);
  });
}

/** Save a single FileNode to IDB (upsert). */
export function saveMeta(db, node) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    const request = store.put(node);
    request.onsuccess = () => resolve();
    request.onerror = e => reject(e.target.error);
  });
}

/** Batch-save multiple FileNodes to IDB. */
export function saveManyMeta(db, nodes) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    for (const node of nodes) {
      store.put(node);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

/** Delete a single entry from meta store by path. */
export function deleteMeta(db, path) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    const request = store.delete(path);
    request.onsuccess = () => resolve();
    request.onerror = e => reject(e.target.error);
  });
}

/** Delete multiple entries from meta store by paths. */
export function deleteManyMeta(db, paths) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    for (const p of paths) {
      store.delete(p);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

// --- Transparent blob compression -----------------------------------
// Compressible content is gzipped on write and inflated on read, so big
// text-ish files cost less origin quota. Already-compressed media (mp3,
// jpg, mp4, zip, pdf...) is stored raw — gzip would only burn CPU there.
// Records written before this existed have no `enc` field and read back
// unchanged.

const RAW_MIME = /^(audio|video)\/|^image\/(?!bmp|x-ms-bmp|tiff)|(zip|gzip|compress|rar|7z|pdf|ogg|mpeg)/i;
const COMPRESS_MIN_BYTES = 64 * 1024;

function isCompressibleMime(mime) {
  return !RAW_MIME.test(String(mime || ''));
}

function gzipBlob(blob) {
  return new Response(
    blob.stream().pipeThrough(new CompressionStream('gzip')),
  ).blob();
}

async function gunzipBlob(blob, mimeType) {
  const out = await new Response(
    blob.stream().pipeThrough(new DecompressionStream('gzip')),
  ).blob();
  return mimeType ? out.slice(0, out.size, mimeType) : out;
}

/** Load binary content for a file (inflating compressed records). */
export function loadBlob(db, path) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readonly');
    const store = tx.objectStore(BLOB_STORE);
    const request = store.get(path);
    request.onsuccess = () => {
      const result = request.result;
      if (!result) return resolve(null);
      if (result.enc === 'gzip' && typeof DecompressionStream === 'function') {
        gunzipBlob(result.blob, result.mimeType).then(resolve, () =>
          resolve(result.blob),
        );
        return;
      }
      resolve(result.blob);
    };
    request.onerror = e => reject(e.target.error);
  });
}

/** Store binary content for a file, gzipping when it actually helps. */
export async function saveBlob(db, path, blob, mimeType) {
  let stored = blob;
  let enc;
  if (
    typeof CompressionStream === 'function' &&
    blob.size >= COMPRESS_MIN_BYTES &&
    isCompressibleMime(mimeType || blob.type)
  ) {
    try {
      const packed = await gzipBlob(blob);
      if (packed.size < blob.size * 0.95) {
        stored = packed;
        enc = 'gzip';
      }
    } catch {
      // compression unavailable — store raw
    }
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    const store = tx.objectStore(BLOB_STORE);
    const request = store.put({
      path,
      blob: stored,
      mimeType,
      enc,
      rawSize: blob.size,
    });
    request.onsuccess = () => resolve();
    request.onerror = e => reject(e.target.error);
  });
}

/** Delete binary content for a file. */
export function deleteBlob(db, path) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    const store = tx.objectStore(BLOB_STORE);
    const request = store.delete(path);
    request.onsuccess = () => resolve();
    request.onerror = e => reject(e.target.error);
  });
}

/**
 * Clear both stores entirely (factory reset).
 */
export function clearAllStores(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
    tx.objectStore(META_STORE).clear();
    tx.objectStore(BLOB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}
