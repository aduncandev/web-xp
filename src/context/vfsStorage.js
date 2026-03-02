/**
 * IndexedDB storage backend for the Virtual File System.
 *
 * Provides an async wrapper around IndexedDB with fallback to localStorage.
 * Each FileNode is stored as a separate IDB record keyed by normalized path.
 */

const DB_NAME = 'webxp-vfs';
const DB_VERSION = 1;
const FS_STORE = 'files';
const META_STORE = 'meta';

// Keys used in the meta store
const RECYCLE_META_KEY = 'recycleMeta';
const VFS_VERSION_KEY = 'vfsVersion';

let _db = null;
let _idbAvailable = null;

/**
 * Check if IndexedDB is available (some browsers block it in private mode).
 */
function checkIDBAvailable() {
  if (_idbAvailable !== null) return Promise.resolve(_idbAvailable);
  return new Promise(resolve => {
    try {
      const req = indexedDB.open('__idb_test__');
      req.onsuccess = () => {
        req.result.close();
        indexedDB.deleteDatabase('__idb_test__');
        _idbAvailable = true;
        resolve(true);
      };
      req.onerror = () => {
        _idbAvailable = false;
        resolve(false);
      };
    } catch {
      _idbAvailable = false;
      resolve(false);
    }
  });
}

/**
 * Open (or reuse) the IndexedDB database.
 */
function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FS_STORE)) {
        db.createObjectStore(FS_STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Generic IDB transaction helper.
 */
function withStore(storeName, mode, fn) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = fn(store);
      tx.oncomplete = () => resolve(result._value);
      tx.onerror = () => reject(tx.error);
    });
  });
}

// ---------------------------------------------------------------------------
// Public API — File Store
// ---------------------------------------------------------------------------

/**
 * Get a single FileNode by path.
 */
export function idbGetFile(path) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FS_STORE, 'readonly');
      const req = tx.objectStore(FS_STORE).get(path);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Put a single FileNode by path.
 */
export function idbPutFile(path, node) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FS_STORE, 'readwrite');
      tx.objectStore(FS_STORE).put(node, path);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

/**
 * Delete a single FileNode by path.
 */
export function idbDeleteFile(path) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FS_STORE, 'readwrite');
      tx.objectStore(FS_STORE).delete(path);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

/**
 * Get all FileNodes as a Map<string, FileNode>.
 */
export function idbGetAllFiles() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FS_STORE, 'readonly');
      const store = tx.objectStore(FS_STORE);
      const map = new Map();
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          map.set(cursor.key, cursor.value);
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve(map);
      tx.onerror = () => reject(tx.error);
    });
  });
}

/**
 * Replace the entire file store with a Map<string, FileNode>.
 * Used for initial migration and reset.
 */
export function idbSetAllFiles(map) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FS_STORE, 'readwrite');
      const store = tx.objectStore(FS_STORE);
      store.clear();
      for (const [key, value] of map) {
        store.put(value, key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

/**
 * Sync a set of changes to IDB in a single transaction.
 * @param {Map} currentFS - The full current FS map
 * @param {Map} previousFS - The previous FS map (to compute diff)
 */
export function idbSyncChanges(currentFS, previousFS) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FS_STORE, 'readwrite');
      const store = tx.objectStore(FS_STORE);

      // Find deleted keys
      if (previousFS) {
        for (const key of previousFS.keys()) {
          if (!currentFS.has(key)) {
            store.delete(key);
          }
        }
      }

      // Find added/modified keys
      for (const [key, value] of currentFS) {
        if (!previousFS || previousFS.get(key) !== value) {
          store.put(value, key);
        }
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

/**
 * Clear the entire file store.
 */
export function idbClearFiles() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FS_STORE, 'readwrite');
      tx.objectStore(FS_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

// ---------------------------------------------------------------------------
// Public API — Meta Store (recycle bin metadata, version, etc.)
// ---------------------------------------------------------------------------

/**
 * Get a value from the meta store.
 */
export function idbGetMeta(key) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const req = tx.objectStore(META_STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Set a value in the meta store.
 */
export function idbSetMeta(key, value) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

/**
 * Delete a key from the meta store.
 */
export function idbDeleteMeta(key) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

// ---------------------------------------------------------------------------
// Migration: localStorage → IndexedDB
// ---------------------------------------------------------------------------

const LS_STORAGE_KEY = 'vfsData';
const LS_RECYCLE_META_KEY = 'vfsRecycleMeta';
const LS_VERSION_KEY = 'vfsVersion';
const MIGRATION_DONE_KEY = 'vfs_idb_migrated';

/**
 * Detect existing localStorage data and migrate it into IDB.
 * Returns { fs: Map, recycleMeta: Map, migrated: boolean }
 */
export async function migrateFromLocalStorage() {
  // Check if already migrated
  const alreadyMigrated = await idbGetMeta(MIGRATION_DONE_KEY);
  if (alreadyMigrated) return { fs: null, recycleMeta: null, migrated: false };

  // Check if there's localStorage data to migrate
  const savedFS = localStorage.getItem(LS_STORAGE_KEY);
  const savedMeta = localStorage.getItem(LS_RECYCLE_META_KEY);

  if (!savedFS) {
    // Mark as migrated even if there was nothing to migrate
    await idbSetMeta(MIGRATION_DONE_KEY, true);
    return { fs: null, recycleMeta: null, migrated: false };
  }

  try {
    // Parse localStorage data
    const entries = JSON.parse(savedFS);
    const fsMap = new Map(entries);

    let recycleMap = new Map();
    if (savedMeta) {
      try {
        recycleMap = new Map(JSON.parse(savedMeta));
      } catch { /* ignore */ }
    }

    // Write to IDB
    await idbSetAllFiles(fsMap);
    await idbSetMeta(RECYCLE_META_KEY, [...recycleMap.entries()]);
    await idbSetMeta(MIGRATION_DONE_KEY, true);

    // Read the version
    const version = localStorage.getItem(LS_VERSION_KEY);
    if (version) {
      await idbSetMeta(VFS_VERSION_KEY, parseInt(version, 10));
    }

    // Clear old localStorage data
    localStorage.removeItem(LS_STORAGE_KEY);
    localStorage.removeItem(LS_RECYCLE_META_KEY);
    localStorage.removeItem(LS_VERSION_KEY);

    return { fs: fsMap, recycleMeta: recycleMap, migrated: true };
  } catch (err) {
    console.warn('VFS migration from localStorage failed:', err);
    await idbSetMeta(MIGRATION_DONE_KEY, true);
    return { fs: null, recycleMeta: null, migrated: false };
  }
}

/**
 * Load the full VFS state from IndexedDB.
 * Returns { fs: Map|null, recycleMeta: Map|null, version: number|null }
 */
export async function loadFromIDB() {
  const fs = await idbGetAllFiles();
  const recycleRaw = await idbGetMeta(RECYCLE_META_KEY);
  const version = await idbGetMeta(VFS_VERSION_KEY);

  const recycleMeta = recycleRaw ? new Map(recycleRaw) : new Map();
  return {
    fs: fs.size > 0 ? fs : null,
    recycleMeta,
    version: version || null,
  };
}

/**
 * Save recycle bin metadata to IDB.
 */
export async function saveRecycleMeta(recycleMap) {
  await idbSetMeta(RECYCLE_META_KEY, [...recycleMap.entries()]);
}

/**
 * Save the VFS version to IDB.
 */
export async function saveVFSVersion(version) {
  await idbSetMeta(VFS_VERSION_KEY, version);
}

// Re-export availability check
export { checkIDBAvailable };

// Export key names for external use
export { RECYCLE_META_KEY, VFS_VERSION_KEY };
