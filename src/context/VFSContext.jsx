import React, {
  createContext,
  useReducer,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { createDefaultFS } from './vfsDefaults';
import {
  normalizePath,
  getParentPath,
  getChildren,
  getExtension,
} from './vfsUtils';
import { STORAGE_KEY, RECYCLE_META_KEY, FILE_ASSOCIATIONS } from './vfsConstants';
import { SPECIAL_FOLDERS } from './vfsDefaults';
import {
  checkIDBAvailable,
  migrateFromLocalStorage,
  loadFromIDB,
  idbSyncChanges,
  idbSetAllFiles,
  saveRecycleMeta,
  saveVFSVersion,
} from './vfsStorage';

const VFS_VERSION = 2; // Bump when default FS structure changes

// ---------------------------------------------------------------------------
// localStorage fallback serialization (used when IDB unavailable)
// ---------------------------------------------------------------------------

function serializeFS(map) {
  return JSON.stringify([...map.entries()]);
}

function deserializeFS(json) {
  try {
    const entries = JSON.parse(json);
    return new Map(entries);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Initial state (synchronous — uses localStorage as initial load, then
// async IDB load replaces it)
// ---------------------------------------------------------------------------

function loadInitialFS() {
  // Try localStorage first for instant load (will be replaced by IDB data)
  const VFS_VERSION_KEY = 'vfsVersion';
  const savedVersion = localStorage.getItem(VFS_VERSION_KEY);
  if (savedVersion && parseInt(savedVersion, 10) === VFS_VERSION) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = deserializeFS(saved);
      if (parsed && parsed.size > 0) return parsed;
    }
  }
  return createDefaultFS();
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const WRITE_FILE = 'WRITE_FILE';
const CREATE_DIR = 'CREATE_DIR';
const DELETE = 'DELETE';
const RENAME = 'RENAME';
const COPY_TREE = 'COPY_TREE';
const RESET = 'RESET';
const REPLACE_FS = 'REPLACE_FS';

function ensureParents(fs, path) {
  const parent = getParentPath(path);
  if (!parent || fs.has(parent)) return;
  ensureParents(fs, parent);
  const name = parent.split('/').filter(Boolean).pop() || parent;
  const now = Date.now();
  fs.set(parent, {
    path: parent,
    name,
    type: 'directory',
    content: null,
    icon: null,
    size: 0,
    mimeType: null,
    createdAt: now,
    modifiedAt: now,
  });
}

function vfsReducer(state, action) {
  const fs = new Map(state);

  switch (action.type) {
    case WRITE_FILE: {
      const { path, content, mimeType } = action.payload;
      const n = normalizePath(path);
      ensureParents(fs, n);
      const existing = fs.get(n);
      const now = Date.now();
      const name = n.split('/').pop();
      const size = content == null ? 0
        : typeof content === 'string' ? content.length
        : content instanceof ArrayBuffer ? content.byteLength
        : content instanceof Blob ? content.size
        : 0;
      fs.set(n, {
        path: n,
        name,
        type: 'file',
        content,
        icon: existing?.icon || null,
        size,
        mimeType: mimeType || existing?.mimeType || null,
        createdAt: existing?.createdAt || now,
        modifiedAt: now,
      });
      return fs;
    }

    case CREATE_DIR: {
      const n = normalizePath(action.payload.path);
      if (fs.has(n)) return state;
      ensureParents(fs, n);
      const now = Date.now();
      const name = n.split('/').pop();
      fs.set(n, {
        path: n,
        name,
        type: 'directory',
        content: null,
        icon: null,
        size: 0,
        mimeType: null,
        createdAt: now,
        modifiedAt: now,
      });
      return fs;
    }

    case DELETE: {
      const n = normalizePath(action.payload.path);
      for (const key of [...fs.keys()]) {
        if (key === n || key.startsWith(n + '/')) {
          fs.delete(key);
        }
      }
      return fs;
    }

    case RENAME: {
      const { oldPath, newPath } = action.payload;
      const oldn = normalizePath(oldPath);
      const newn = normalizePath(newPath);
      if (oldn === newn) return state;

      const toMove = [];
      for (const key of fs.keys()) {
        if (key === oldn || key.startsWith(oldn + '/')) {
          toMove.push(key);
        }
      }

      ensureParents(fs, newn);

      for (const key of toMove) {
        const node = fs.get(key);
        fs.delete(key);
        const updatedPath = newn + key.slice(oldn.length);
        const updatedName = updatedPath.split('/').pop();
        fs.set(updatedPath, {
          ...node,
          path: updatedPath,
          name: updatedName,
          modifiedAt: Date.now(),
        });
      }
      return fs;
    }

    case COPY_TREE: {
      const { srcPath, destPath } = action.payload;
      const srcN = normalizePath(srcPath);
      const destN = normalizePath(destPath);
      ensureParents(fs, destN);

      for (const [key, node] of [...state.entries()]) {
        if (key === srcN || key.startsWith(srcN + '/')) {
          const newKey = destN + key.slice(srcN.length);
          const newName = newKey.split('/').pop();
          const now = Date.now();
          fs.set(newKey, {
            ...node,
            path: newKey,
            name: newName,
            createdAt: now,
            modifiedAt: now,
          });
        }
      }
      return fs;
    }

    case RESET:
      return createDefaultFS();

    case REPLACE_FS:
      return action.payload;

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const VFSContext = createContext();

export const useVFS = () => useContext(VFSContext);

export const VFSProvider = ({ children }) => {
  const [fs, dispatch] = useReducer(vfsReducer, null, loadInitialFS);
  const [useIDB, setUseIDB] = useState(false);
  const idbReady = useRef(false);
  const previousFS = useRef(null);

  // Recycle bin metadata
  const [recycleMeta, setRecycleMeta] = React.useState(() => {
    try {
      const saved = localStorage.getItem(RECYCLE_META_KEY);
      if (saved) return new Map(JSON.parse(saved));
    } catch { /* ignore */ }
    return new Map();
  });

  // --- Async IDB initialization ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await checkIDBAvailable();
      if (!available || cancelled) {
        // Fallback: keep using localStorage
        return;
      }

      // Try migration from localStorage → IDB
      const migration = await migrateFromLocalStorage();

      if (migration.migrated && migration.fs) {
        // Migration happened — IDB now has the data. Use it.
        dispatch({ type: REPLACE_FS, payload: migration.fs });
        if (migration.recycleMeta) {
          setRecycleMeta(migration.recycleMeta);
        }
      } else {
        // No migration needed — try loading from IDB
        const idbData = await loadFromIDB();

        if (idbData.fs && idbData.version === VFS_VERSION) {
          // IDB has valid data
          if (!cancelled) {
            dispatch({ type: REPLACE_FS, payload: idbData.fs });
            if (idbData.recycleMeta.size > 0) {
              setRecycleMeta(idbData.recycleMeta);
            }
          }
        } else {
          // IDB empty or version mismatch — seed with defaults
          const defaults = createDefaultFS();
          await idbSetAllFiles(defaults);
          await saveVFSVersion(VFS_VERSION);
          if (!cancelled) {
            dispatch({ type: REPLACE_FS, payload: defaults });
          }
        }
      }

      if (!cancelled) {
        setUseIDB(true);
        idbReady.current = true;
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // --- Debounced persistence ---
  const timerRef = useRef(null);
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (useIDB && idbReady.current) {
        // Sync only changes to IDB
        idbSyncChanges(fs, previousFS.current).catch(err => {
          console.warn('IDB sync failed, falling back to localStorage:', err);
          try {
            localStorage.setItem(STORAGE_KEY, serializeFS(fs));
          } catch { /* quota exceeded */ }
        });
        saveRecycleMeta(recycleMeta).catch(() => {});
        saveVFSVersion(VFS_VERSION).catch(() => {});
      } else {
        // Fallback: localStorage
        try {
          localStorage.setItem(STORAGE_KEY, serializeFS(fs));
          localStorage.setItem(RECYCLE_META_KEY, JSON.stringify([...recycleMeta.entries()]));
          localStorage.setItem('vfsVersion', String(VFS_VERSION));
        } catch { /* quota exceeded */ }
      }
      previousFS.current = fs;
    }, 500);
    return () => clearTimeout(timerRef.current);
  }, [fs, recycleMeta, useIDB]);

  // --- Public API ---

  const readDir = useCallback(
    dirPath => {
      const n = normalizePath(dirPath);
      const children = getChildren(fs, n);
      const dirs = children
        .filter(c => c.type === 'directory')
        .sort((a, b) => a.name.localeCompare(b.name));
      const files = children
        .filter(c => c.type !== 'directory')
        .sort((a, b) => a.name.localeCompare(b.name));
      return { dirs, files, all: [...dirs, ...files] };
    },
    [fs],
  );

  const readFile = useCallback(
    path => {
      const n = normalizePath(path);
      return fs.get(n) || null;
    },
    [fs],
  );

  const writeFile = useCallback((path, content, mimeType) => {
    dispatch({ type: WRITE_FILE, payload: { path, content, mimeType } });
  }, []);

  const createDir = useCallback(path => {
    dispatch({ type: CREATE_DIR, payload: { path } });
  }, []);

  const deleteNode = useCallback(path => {
    dispatch({ type: DELETE, payload: { path } });
  }, []);

  const rename = useCallback((oldPath, newPath) => {
    dispatch({ type: RENAME, payload: { oldPath, newPath } });
  }, []);

  const copyTree = useCallback((srcPath, destPath) => {
    dispatch({ type: COPY_TREE, payload: { srcPath, destPath } });
  }, []);

  const exists = useCallback(
    path => {
      const n = normalizePath(path);
      return fs.has(n);
    },
    [fs],
  );

  const getAssociatedApp = useCallback(path => {
    const ext = getExtension(path);
    return FILE_ASSOCIATIONS[ext] || 'Notepad';
  }, []);

  const resetFS = useCallback(() => {
    dispatch({ type: RESET });
    // Also reset IDB
    if (useIDB) {
      const defaults = createDefaultFS();
      idbSetAllFiles(defaults).catch(() => {});
      saveVFSVersion(VFS_VERSION).catch(() => {});
      saveRecycleMeta(new Map()).catch(() => {});
    }
  }, [useIDB]);

  const RECYCLER_PATH = SPECIAL_FOLDERS['Recycle Bin'];

  const recycleNode = useCallback(
    path => {
      const n = normalizePath(path);
      const node = fs.get(n);
      if (!node) return;
      const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const destPath = normalizePath(`${RECYCLER_PATH}/${uniqueId}_${node.name}`);

      dispatch({ type: RENAME, payload: { oldPath: n, newPath: destPath } });

      setRecycleMeta(prev => {
        const next = new Map(prev);
        next.set(destPath, { originalPath: n, deletedAt: Date.now() });
        return next;
      });
    },
    [fs, RECYCLER_PATH],
  );

  const restoreNode = useCallback(
    recyclerPath => {
      const n = normalizePath(recyclerPath);
      const meta = recycleMeta.get(n);
      if (!meta) return;

      dispatch({ type: RENAME, payload: { oldPath: n, newPath: meta.originalPath } });
      setRecycleMeta(prev => {
        const next = new Map(prev);
        next.delete(n);
        return next;
      });
    },
    [recycleMeta],
  );

  const emptyRecycleBin = useCallback(() => {
    const recyclerN = normalizePath(RECYCLER_PATH);
    for (const key of fs.keys()) {
      if (key !== recyclerN && key.startsWith(recyclerN + '/')) {
        dispatch({ type: DELETE, payload: { path: key } });
      }
    }
    setRecycleMeta(new Map());
  }, [fs, RECYCLER_PATH]);

  const getRecycleBinItems = useCallback(() => {
    const recyclerN = normalizePath(RECYCLER_PATH);
    const items = [];
    for (const [key, node] of fs) {
      if (key === recyclerN) continue;
      if (getParentPath(key) === recyclerN) {
        const meta = recycleMeta.get(key) || {};
        items.push({ ...node, originalPath: meta.originalPath, deletedAt: meta.deletedAt });
      }
    }
    return items;
  }, [fs, recycleMeta, RECYCLER_PATH]);

  const isRecycleBinEmpty = useCallback(() => {
    const recyclerN = normalizePath(RECYCLER_PATH);
    for (const key of fs.keys()) {
      if (key !== recyclerN && key.startsWith(recyclerN + '/')) {
        if (getParentPath(key) === recyclerN) return false;
      }
    }
    return true;
  }, [fs, RECYCLER_PATH]);

  const value = useMemo(
    () => ({
      fs,
      readDir,
      readFile,
      writeFile,
      createDir,
      deleteNode,
      rename,
      copyTree,
      exists,
      getAssociatedApp,
      resetFS,
      recycleNode,
      restoreNode,
      emptyRecycleBin,
      getRecycleBinItems,
      isRecycleBinEmpty,
    }),
    [fs, readDir, readFile, writeFile, createDir, deleteNode, rename, copyTree, exists, getAssociatedApp, resetFS, recycleNode, restoreNode, emptyRecycleBin, getRecycleBinItems, isRecycleBinEmpty],
  );

  return <VFSContext.Provider value={value}>{children}</VFSContext.Provider>;
};
