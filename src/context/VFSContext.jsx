import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import {
  openVFSDatabase,
  loadAllMeta,
  saveManyMeta,
  deleteManyMeta,
  loadBlob,
  saveBlob,
  deleteBlob,
  clearAllStores,
} from './vfsStorage';
import {
  buildDefaultFileSystem,
  buildMachineFileSystem,
  buildUserProfile,
  resolveNodeIcons,
} from './vfsDefaults';
import { listUsers, subscribeUsers, getCurrentUserName } from './users';
import { openRemoteFile } from './remoteFile';
import {
  normalizePath,
  getParentPath,
  getBaseName,
  getExtension,
  joinPath,
  displayPath,
  formatSize,
  isDirectChildOf,
  isDescendantOf,
  guessMimeType,
  validateFileName,
} from './vfsUtils';
import {
  EXE_PATHS,
  getFileAssociation,
  getProfileRootFor,
  SPECIAL_FOLDERS,
} from './vfsConstants';
import { hiddenExtension } from '../WinXP/shell/fileTypes';
import { buildBackupZip, isUserFile, storedNodeBytes } from './vfsBackup';

// Bump when the seeded filesystem layout changes incompatibly (shortcut
// target format, system tree, per-user profiles) — mismatched stores are
// wiped and reseeded. The authoritative marker lives INSIDE IndexedDB as a
// sentinel meta record; localStorage only keeps a secondary copy.
// 2: added guestbook.exe under Program Files/aduncan.dev. Machine-wide nodes
// only appear on a fresh seed, so an existing disk had the Start menu
// shortcut (profiles rebuild per user) pointing at an exe that was never
// created — which the shell reports as a broken shortcut.
// 3: privacy.txt under system32. Machine-wide nodes only appear on a fresh
// seed, so without this an existing disk never gets the file.
// 4: privacy.txt moved from system32 to My Documents, beside readme.txt,
// and its wording corrected. Both the location and the contents are baked
// in at seed time, so an existing disk keeps the old copy without this.
// 5: Program Files/aduncan.dev renamed to Program Files/webxp.net (site
// rebrand). tour.exe and guestbook.exe live there, and every seeded
// shortcut carries the old absolute target, so an existing disk would
// keep launching into a folder the code no longer knows about.
// 6: tour.exe, tourstart.exe and their shortcuts unseeded (the tour is
// shelved for a rework; the app code stays). An existing disk keeps the
// exes and shortcuts without this.
const VFS_SCHEMA_VERSION = '6';
const SCHEMA_KEY = 'winxp_vfs_schema';
const SCHEMA_SENTINEL = '::schema';

/** Names of registered accounts, for seeding profile trees. */
function registeredUserNames() {
  return listUsers().map(u => u.name);
}

/**
 * Default filesystem for this machine: full profiles for registered
 * accounts, or the machine tree alone before OOBE has created any.
 */
function buildSeedNodes() {
  const names = registeredUserNames();
  return names.length > 0
    ? buildDefaultFileSystem(names)
    : buildMachineFileSystem();
}

export const VFSContext = createContext(null);

export function useVFS() {
  const ctx = useContext(VFSContext);
  if (!ctx) throw new Error('useVFS must be used within a VFSProvider');
  return ctx;
}

// Debounce helper
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function VFSProvider({ children }) {
  // In-memory filesystem — mutated in-place, version counter triggers re-renders
  const nodesRef = useRef(new Map());
  const [version, setVersion] = useState(0);
  const [initialized, setInitialized] = useState(false);
  // Non-null while boot is held on the Windows Error Recovery screen (a
  // schema change wants to erase a store holding the user's own files).
  const [recovery, setRecovery] = useState(null);

  // IDB handle
  const dbRef = useRef(null);
  // Blobs handed to createFile/writeBinaryFile that IndexedDB hasn't
  // finished (or can't finish) persisting — readBinaryFile serves these
  // first, so a file is readable the moment it is written, and binary
  // writes still work in memory-only mode.
  const pendingBlobs = useRef(new Map());
  const storageBackend = useRef('indexeddb'); // 'indexeddb' | 'localstorage'

  // Dirty tracking for debounced persistence
  const dirtyPaths = useRef(new Set());
  const deletedPaths = useRef(new Set());

  // Forward ref: move() needs deleteNodePermanently, declared later
  const deleteNodePermanentlyRef = useRef(() => {});

  // Forward ref: createShortcutTo needs getUserConfig, declared later
  const getUserConfigRef = useRef(() => undefined);

  // Forward ref: early callbacks refresh drive stats, declared later
  const refreshDriveStatsRef = useRef(() => {});
  // Assigned once the user-settings helpers exist, further down
  const repathConfigRef = useRef(() => {});

  // Bump version (triggers re-renders in consumers)
  const bump = useCallback(() => setVersion(v => v + 1), []);

  // --- Persistence ---

  const persistDirty = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;

    const toSave = [];
    for (const p of dirtyPaths.current) {
      const node = nodesRef.current.get(p);
      if (node) toSave.push(node);
    }
    const toDelete = [...deletedPaths.current];
    dirtyPaths.current.clear();
    deletedPaths.current.clear();

    try {
      if (toSave.length > 0) await saveManyMeta(db, toSave);
      if (toDelete.length > 0) await deleteManyMeta(db, toDelete);
    } catch (err) {
      console.warn('VFS: IDB persist failed', err);
    }
    refreshDriveStatsRef.current();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schedulePersist = useCallback(
    debounce(() => persistDirty(), 300),
    [persistDirty],
  );

  const markDirty = useCallback(
    path => {
      dirtyPaths.current.add(path);
      deletedPaths.current.delete(path);
      schedulePersist();
    },
    [schedulePersist],
  );

  const markDeleted = useCallback(
    path => {
      deletedPaths.current.add(path);
      dirtyPaths.current.delete(path);
      schedulePersist();
    },
    [schedulePersist],
  );

  // --- Initialization ---

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const db = await openVFSDatabase();
        dbRef.current = db;

        let stored = await loadAllMeta(db);
        const marker = stored.find(n => n.path === SCHEMA_SENTINEL);
        stored = stored.filter(n => n.path !== SCHEMA_SENTINEL);
        const idbSchema = marker ? marker.schemaVersion : null;
        let lsSchema = null;
        try {
          lsSchema = localStorage.getItem(SCHEMA_KEY);
        } catch {
          // storage unavailable
        }

        // The in-store marker is authoritative (localStorage can be cleared
        // independently of IndexedDB); stores predating the marker fall back
        // to the localStorage copy. Either way, a store only counts as
        // current when the seeded tree is actually present.
        const hasTree = stored.some(n => n.path === 'C:/');
        const current =
          hasTree &&
          (idbSchema === VFS_SCHEMA_VERSION ||
            (idbSchema === null && lsSchema === VFS_SCHEMA_VERSION));

        if (current) {
          // Icon URLs from a previous build are stale (hashed asset paths).
          // Re-resolve every node's icons; adopt iconKeys from the default
          // tree for legacy nodes persisted before iconKey existed.
          const defaultsByPath = new Map(
            buildDefaultFileSystem(registeredUserNames()).map(n => [n.path, n]),
          );
          // System exes that moved (the joke programs relocated to D:).
          // Persisted shortcuts still point at the old paths — repoint them
          // so e.g. the desktop '???' keeps opening after the move.
          const MIGRATED_TARGETS = new Map([
            ['c:/windows/system32/room_man.exe', EXE_PATHS.MISSINGNO],
            ['c:/windows/system32/dogwindow.exe', EXE_PATHS.DOGWINDOW],
          ]);
          for (const node of stored) {
            if (node.type === 'shortcut' && node.target) {
              const moved = MIGRATED_TARGETS.get(node.target.toLowerCase());
              if (moved) node.target = moved;
            }
            // Repair files written before createFile knew about Blobs:
            // the Blob sat in `content` (structured clone kept it alive in
            // IndexedDB) and read back as "[object Blob]" text. Move the
            // bytes to the blob store where they belong.
            if (node.type === 'file' && node.content instanceof Blob) {
              const blob = node.content;
              node.content = null;
              node.hasBinaryContent = true;
              node.blobId = node.blobId || newBlobId();
              node.mimeType = node.mimeType || blob.type || null;
              node.size = blob.size;
              pendingBlobs.current.set(node.blobId, blob);
              saveBlob(db, node.blobId, blob, node.mimeType)
                .then(() => pendingBlobs.current.delete(node.blobId))
                .catch(() => {});
            }
            if (!node.iconKey) {
              const def = defaultsByPath.get(node.path);
              if (def?.iconKey) node.iconKey = def.iconKey;
            }
            const icons = resolveNodeIcons(node);
            node.icon = icons.icon;
            node.iconLarge = icons.iconLarge;
            nodesRef.current.set(node.path, node);
          }
          // Additive migration: system nodes added to vfsDefaults after this
          // store was seeded (new exes, .cpl applets) are missing from it.
          // The shell never lets system items be deleted, so a missing one
          // always means "newer than the store" — seed just those, leaving
          // user data untouched.
          // System nodes that have since been renamed away. Without this
          // the additive pass below seeds the new name and leaves the old
          // one orphaned in system32 forever.
          const RETIRED_SYSTEM_PATHS = [
            'c:/windows/system32/missingno.exe',
            // was seeded before the legacy player became a Store title; a
            // Store-installed copy is system: false and survives this pass
            'c:/program files/windows media player/mplayer2.exe',
            // the joke programs moved to the D: "CD" (see MIGRATED_TARGETS)
            'c:/windows/system32/room_man.exe',
            'c:/windows/system32/dogwindow.exe',
          ];
          for (const dead of RETIRED_SYSTEM_PATHS) {
            for (const n of stored) {
              if (n.path.toLowerCase() === dead && n.system) {
                nodesRef.current.delete(n.path);
                markDeleted(n.path);
              }
            }
          }
          const storedLower = new Set(
            stored
              .filter(n => !RETIRED_SYSTEM_PATHS.includes(n.path.toLowerCase()))
              .map(n => n.path.toLowerCase()),
          );
          const missingSystem = [];
          for (const def of defaultsByPath.values()) {
            if (def.system && !storedLower.has(def.path.toLowerCase())) {
              nodesRef.current.set(def.path, def);
              missingSystem.push(def);
            }
          }
          await saveManyMeta(db, stored);
          if (missingSystem.length > 0) {
            await saveManyMeta(db, missingSystem);
          }
          if (!marker) {
            await saveManyMeta(db, [
              { path: SCHEMA_SENTINEL, schemaVersion: VFS_SCHEMA_VERSION },
            ]);
          }
        } else {
          if (hasTree) {
            console.info(
              `VFS: rebuilding filesystem (schema ${idbSchema ||
                lsSchema ||
                'unknown'} -> ${VFS_SCHEMA_VERSION})`,
            );
          }
          const wipeAndSeed = async () => {
            await clearAllStores(db);
            const defaults = buildSeedNodes();
            for (const node of defaults) {
              nodesRef.current.set(node.path, node);
            }
            await saveManyMeta(db, defaults);
            // Stamp the version only after the seed write has committed, so
            // a failure mid-seed leaves an unstamped store that reseeds
            // cleanly on the next load.
            await saveManyMeta(db, [
              { path: SCHEMA_SENTINEL, schemaVersion: VFS_SCHEMA_VERSION },
            ]);
          };
          // A schema change is about to erase an existing store. If the
          // user made anything in it, hold the whole boot on the Windows
          // Error Recovery screen: they can download their files first,
          // proceed, or close the page and leave the store untouched (the
          // promise then simply never resolves).
          const userFiles = hasTree ? stored.filter(isUserFile) : [];
          if (userFiles.length > 0) {
            console.info(
              `VFS: offering recovery backup (${userFiles.length} user files)`,
            );
            await new Promise(resolve => {
              setRecovery({
                fileCount: userFiles.length,
                buildBackup: () =>
                  buildBackupZip(stored, node =>
                    storedNodeBytes(node, n =>
                      loadBlob(db, n.blobId || n.path),
                    ),
                  ),
                proceed: async () => {
                  await wipeAndSeed();
                  resolve();
                },
              });
            });
            setRecovery(null);
          } else {
            await wipeAndSeed();
          }
        }
        try {
          localStorage.setItem(SCHEMA_KEY, VFS_SCHEMA_VERSION);
        } catch {
          // ignore
        }

        // Mutations made before the DB handle was ready stay in the dirty
        // sets (persistDirty bails without clearing) — flush them now.
        if (dirtyPaths.current.size > 0 || deletedPaths.current.size > 0) {
          schedulePersist();
        }

        if (!cancelled) {
          setInitialized(true);
          bump();
          refreshDriveStatsRef.current();
        }
      } catch (err) {
        console.warn('VFS: IndexedDB unavailable, using memory only', err);
        // Never keep writing into a store that may be half-wiped/half-seeded
        dbRef.current = null;
        nodesRef.current.clear();
        const defaults = buildSeedNodes();
        for (const node of defaults) {
          nodesRef.current.set(node.path, node);
        }
        if (!cancelled) {
          storageBackend.current = 'memory';
          setInitialized(true);
          bump();
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [bump, schedulePersist]);

  // Flush pending (debounced) writes when the tab is hidden or closing.
  // IDB writes during unload are best-effort, but this closes the window
  // where the last ≤300ms of mutations were lost on refresh.
  useEffect(() => {
    const flush = () => {
      if (dirtyPaths.current.size > 0 || deletedPaths.current.size > 0) {
        persistDirty();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [persistDirty]);

  // --- Read operations ---

  const getNode = useCallback(path => {
    if (!path) return null;
    return nodesRef.current.get(normalizePath(path)) || null;
  }, []);

  const exists = useCallback(
    path => {
      return getNode(path) !== null;
    },
    [getNode],
  );

  /**
   * Find an existing node whose path matches case-insensitively.
   * Windows paths are case-insensitive but case-preserving; the map key
   * stores the original case, so collision checks must scan.
   */
  const findNodeCI = useCallback(path => {
    const p = normalizePath(path);
    const direct = nodesRef.current.get(p);
    if (direct) return direct;
    const target = p.toLowerCase();
    for (const [key, node] of nodesRef.current) {
      if (key.toLowerCase() === target) return node;
    }
    return null;
  }, []);

  const existsCI = useCallback(path => findNodeCI(path) !== null, [findNodeCI]);

  /** True if the node at `path` — or any descendant — is a system item. */
  const hasSystemNodes = useCallback(path => {
    const p = normalizePath(path);
    const node = nodesRef.current.get(p);
    if (!node) return false;
    if (node.system) return true;
    if (node.type === 'folder' || node.type === 'drive') {
      const prefix = p.endsWith('/') ? p : p + '/';
      for (const [key, child] of nodesRef.current) {
        if (key.startsWith(prefix) && child.system) return true;
      }
    }
    return false;
  }, []);

  const listDir = useCallback(path => {
    const normalized = normalizePath(path);
    const children = [];
    for (const [key, node] of nodesRef.current) {
      // Drive roots are their own parent (getParentPath('C:/') === 'C:/'),
      // so explicitly exclude the directory's own node from its listing.
      if (key.toLowerCase() === normalized.toLowerCase()) continue;
      if (isDirectChildOf(key, normalized)) {
        children.push(node);
      }
    }
    // Sort: folders first, then alphabetically
    children.sort((a, b) => {
      const aIsDir = a.type === 'folder' || a.type === 'drive' ? 0 : 1;
      const bIsDir = b.type === 'folder' || b.type === 'drive' ? 0 : 1;
      if (aIsDir !== bIsDir) return aIsDir - bIsDir;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return children;
  }, []);

  const readFile = useCallback(
    path => {
      const node = getNode(path);
      if (!node || node.type !== 'file') return null;
      return node.content;
    },
    [getNode],
  );

  const readBinaryFile = useCallback(async path => {
    const p = normalizePath(path);
    const node = nodesRef.current.get(p);
    // A blob still in flight to (or unstorable in) IndexedDB
    if (node?.blobId && pendingBlobs.current.has(node.blobId))
      return pendingBlobs.current.get(node.blobId);
    const db = dbRef.current;
    if (db) {
      try {
        // Blobs are keyed by stable blobId (survives moves/renames);
        // fall back to path for legacy entries.
        const stored = await loadBlob(db, node?.blobId || p);
        if (stored) return stored;
      } catch {
        // fall through to the asset copy, if there is one
      }
    }
    // Files that came with the image live as static assets rather than in the
    // database. Their bytes are still their bytes.
    if (node && node.sourceUrl) {
      try {
        const res = await fetch(node.sourceUrl);
        return res.ok ? await res.blob() : null;
      } catch {
        return null;
      }
    }
    // A file written as text has no blob, but it still has contents
    if (node && node.content != null)
      return new Blob([node.content], {
        type: node.mimeType || 'text/plain',
      });
    return null;
  }, []);

  /**
   * Open a file for reading without committing to downloading all of it.
   * Returns a real Blob for stored content, or a Blob-alike over the asset URL
   * that fetches only the ranges asked for — which is what makes reading tags
   * out of a folder of large media files cheap.
   */
  const openBinaryFile = useCallback(
    async path => {
      const p = normalizePath(path);
      const node = nodesRef.current.get(p);
      if (node && node.sourceUrl && !node.hasBinaryContent)
        return openRemoteFile(node.sourceUrl, node.mimeType);
      return readBinaryFile(p);
    },
    [readBinaryFile],
  );

  /**
   * Get a URL suitable for <img>/<audio>/<video>/iframe for a file node:
   * static asset URL, object URL for stored blobs, or data URL for text.
   */
  const readFileUrl = useCallback(
    async path => {
      const p = normalizePath(path);
      const node = nodesRef.current.get(p);
      if (!node || node.type !== 'file') return null;
      if (node.sourceUrl) return node.sourceUrl;
      if (node.hasBinaryContent) {
        const blob = await readBinaryFile(p);
        return blob ? URL.createObjectURL(blob) : null;
      }
      if (node.content != null) {
        const blob = new Blob([node.content], {
          type: node.mimeType || 'text/plain',
        });
        return URL.createObjectURL(blob);
      }
      return null;
    },
    [readBinaryFile],
  );

  const search = useCallback((rootPath, query) => {
    const root = normalizePath(rootPath);
    const lowerQuery = query.toLowerCase();
    const results = [];
    for (const [key, node] of nodesRef.current) {
      if (
        isDescendantOf(key, root) &&
        node.name.toLowerCase().includes(lowerQuery)
      ) {
        results.push(node);
      }
    }
    return results;
  }, []);

  // --- Write operations ---

  const setNode = useCallback(
    node => {
      nodesRef.current.set(node.path, node);
      markDirty(node.path);
      bump();
    },
    [markDirty, bump],
  );

  const makeNode = useCallback((path, type) => {
    const p = normalizePath(path);
    const now = Date.now();
    return {
      path: p,
      name: getBaseName(p),
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
      createdAt: now,
      modifiedAt: now,
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
  }, []);

  const applyIcons = node => {
    const icons = resolveNodeIcons(node);
    node.icon = icons.icon;
    node.iconLarge = icons.iconLarge;
    return node;
  };

  const createFile = useCallback(
    (path, content = '', mimeType) => {
      // Case-insensitive target: writing over an existing file that differs
      // only by case overwrites it instead of creating a case-variant twin.
      const ci = findNodeCI(path);
      const overwriting = ci && ci.type === 'file' ? ci : null;
      if (
        overwriting &&
        (overwriting.hasBinaryContent || overwriting.blobId) &&
        dbRef.current
      ) {
        // Drop the superseded blob so it can't leak or be served stale
        deleteBlob(
          dbRef.current,
          overwriting.blobId || overwriting.path,
        ).catch(() => {});
      }
      const node = makeNode(overwriting ? overwriting.path : path, 'file');
      if (content instanceof Blob) {
        // Binary content goes to the blob store, never into `content` —
        // a Blob stored there reads back as the string "[object Blob]"
        // the first time anything coerces it.
        node.content = null;
        node.hasBinaryContent = true;
        node.blobId = newBlobId();
        node.mimeType = mimeType || content.type || guessMimeType(node.path);
        node.size = content.size;
        pendingBlobs.current.set(node.blobId, content);
        const db = dbRef.current;
        if (db) {
          const { blobId } = node;
          saveBlob(db, blobId, content, node.mimeType)
            .then(() => pendingBlobs.current.delete(blobId))
            .catch(err => console.warn('VFS: blob save failed', err));
        }
      } else {
        node.content = content;
        node.mimeType = mimeType || guessMimeType(node.path);
        node.size = content ? new Blob([content]).size : 0;
      }
      if (overwriting) {
        node.createdAt = overwriting.createdAt;
        node.system = overwriting.system;
        node.readOnly = overwriting.readOnly;
        node.hidden = overwriting.hidden;
      }
      setNode(applyIcons(node));
      return node;
    },
    [makeNode, setNode, findNodeCI],
  );

  /**
   * A server-hosted file: the node lives in the tree (browsable, playable,
   * deletable) but its bytes stay on the server behind `sourceUrl`, so it
   * costs the user none of their storage. The shop's Extras install songs
   * and pictures this way — the same trick the seeded My Music uses.
   */
  const createRemoteFile = useCallback(
    (path, sourceUrl, opts = {}) => {
      const ci = findNodeCI(path);
      if (ci && ci.type !== 'file') return null;
      if (ci && (ci.hasBinaryContent || ci.blobId) && dbRef.current) {
        deleteBlob(dbRef.current, ci.blobId || ci.path).catch(() => {});
      }
      const node = makeNode(ci ? ci.path : path, 'file');
      node.sourceUrl = sourceUrl;
      node.mimeType = opts.mimeType || guessMimeType(node.path);
      node.size = opts.sizeBytes || 0;
      if (ci) node.createdAt = ci.createdAt;
      setNode(applyIcons(node));
      return node;
    },
    [makeNode, setNode, findNodeCI],
  );

  const createFolder = useCallback(
    path => {
      // mkdir over an existing folder (any case) is a no-op, like Windows
      const ci = findNodeCI(path);
      if (ci && (ci.type === 'folder' || ci.type === 'drive')) return ci;
      const node = makeNode(path, 'folder');
      setNode(applyIcons(node));
      return node;
    },
    [makeNode, setNode, findNodeCI],
  );

  const createShortcut = useCallback(
    (path, target, opts = {}) => {
      const ci = findNodeCI(path);
      const node = makeNode(
        ci && ci.type === 'shortcut' ? ci.path : path,
        'shortcut',
      );
      node.target = target;
      node.targetArgs = opts.targetArgs ?? null;
      node.iconKey = opts.iconKey ?? null;
      setNode(applyIcons(node));
      return node;
    },
    [makeNode, setNode, findNodeCI],
  );

  /**
   * XP "Create Shortcut": places `Shortcut to <name>` in destDirPath,
   * pointing at the target's canonical path and mirroring its icons
   * (via iconKey when the target has one, so the look survives rebuilds).
   */
  const createShortcutTo = useCallback(
    (targetPath, destDirPath) => {
      const target = findNodeCI(targetPath);
      if (!target) return { ok: false, error: 'not-found' };
      const destDir = findNodeCI(destDirPath);
      if (!destDir || (destDir.type !== 'folder' && destDir.type !== 'drive'))
        return { ok: false, error: 'invalid' };
      // XP names the shortcut after the target's shell display name, so a
      // hidden known extension stays out of it ('Shortcut to notes')
      let hideExt = true;
      try {
        const view = getUserConfigRef.current('explorerView', null) || {};
        hideExt = view.hideExt !== false;
      } catch {
        hideExt = true;
      }
      const hiddenExt = hiddenExtension(target, hideExt);
      const base = `Shortcut to ${
        hiddenExt ? target.name.slice(0, -hiddenExt.length) : target.name
      }`;
      let name = base;
      let n = 2;
      while (findNodeCI(joinPath(destDir.path, name))) {
        name = `${base} (${n})`;
        n += 1;
      }
      const node = makeNode(joinPath(destDir.path, name), 'shortcut');
      // Shortcutting a shortcut copies its target rather than chaining —
      // otherwise a link to a shell object (the Recycle Bin) points at
      // another link and resolves to nothing.
      node.target = target.type === 'shortcut' ? target.target : target.path;
      node.iconKey = target.iconKey ?? null;
      applyIcons(node);
      // Mirror the target's current look even when its icons come from
      // type/extension resolution rather than a registry key.
      node.icon = target.icon;
      node.iconLarge = target.iconLarge;
      setNode(node);
      return { ok: true, path: node.path };
    },
    [makeNode, setNode, findNodeCI],
  );

  /**
   * Edit a shortcut in place from its Properties > Shortcut tab. `target`
   * repoints the link (and re-mirrors the new target's icons unless the user
   * has picked a custom one); comment / startIn / runMode are the rest of the
   * .lnk fields XP exposes there.
   */
  const updateShortcut = useCallback(
    (path, patch = {}) => {
      const node = findNodeCI(path);
      if (!node || node.type !== 'shortcut')
        return { ok: false, error: 'not-found' };
      const updated = { ...node };
      if (typeof patch.target === 'string') {
        const target = findNodeCI(patch.target);
        if (!target) return { ok: false, error: 'bad-target' };
        updated.target = target.path;
        if (!updated.customIcon) {
          updated.iconKey = target.iconKey ?? null;
          updated.icon = target.icon;
          updated.iconLarge = target.iconLarge;
        }
      }
      if (typeof patch.comment === 'string') updated.comment = patch.comment;
      if (typeof patch.startIn === 'string') updated.startIn = patch.startIn;
      if (typeof patch.runMode === 'string') updated.runMode = patch.runMode;
      if (patch.icon) {
        updated.icon = patch.icon;
        updated.iconLarge = patch.iconLarge || patch.icon;
        updated.iconKey = null;
        updated.customIcon = true;
      }
      updated.modifiedAt = Date.now();
      nodesRef.current.set(updated.path, updated);
      markDirty(updated.path);
      bump();
      return { ok: true };
    },
    [findNodeCI, markDirty, bump],
  );

  const writeFile = useCallback(
    (path, content) => {
      const existing = findNodeCI(path);
      if (!existing || existing.type !== 'file') return false;
      // A text write supersedes any previous binary/asset content: drop the
      // stored blob and clear the binary fields so readFileUrl serves the
      // new text instead of the stale binary.
      if ((existing.hasBinaryContent || existing.blobId) && dbRef.current) {
        deleteBlob(
          dbRef.current,
          existing.blobId || existing.path,
        ).catch(() => {});
      }
      const updated = {
        ...existing,
        content,
        hasBinaryContent: false,
        blobId: null,
        sourceUrl: null,
        mimeType: guessMimeType(existing.path),
        size: content ? new Blob([content]).size : 0,
        modifiedAt: Date.now(),
      };
      setNode(updated);
      return true;
    },
    [setNode, findNodeCI],
  );

  const writeBinaryFile = useCallback(
    async (path, blob, mimeType) => {
      const existing = findNodeCI(path);
      if (!existing) return false;
      const updated = {
        ...existing,
        content: null,
        hasBinaryContent: true,
        blobId: existing.blobId || newBlobId(),
        sourceUrl: null,
        mimeType: mimeType || blob.type || 'application/octet-stream',
        size: blob.size,
        modifiedAt: Date.now(),
      };
      setNode(updated);
      pendingBlobs.current.set(updated.blobId, blob);
      const db = dbRef.current;
      if (db) {
        try {
          await saveBlob(db, updated.blobId, blob, updated.mimeType);
          pendingBlobs.current.delete(updated.blobId);
          refreshDriveStatsRef.current();
        } catch (err) {
          // Usually QuotaExceededError — report failure so callers can
          // clean up instead of leaving a contentless shell
          console.warn('VFS: blob save failed', err);
          pendingBlobs.current.delete(updated.blobId);
          return false;
        }
      }
      return true;
    },
    [setNode, findNodeCI],
  );

  /**
   * Relocate a node (and its descendants) to a new path.
   * Internal helper shared by rename and move.
   */
  // --- Real drive statistics ------------------------------------------
  // C:'s capacity mirrors the browser's actual storage quota for this
  // origin, so My Computer and drive Properties tell the truth. Rewrites
  // only on >1 MB movement to keep render churn down.
  const refreshDriveStats = useCallback(async () => {
    try {
      if (!(navigator.storage && navigator.storage.estimate)) return;
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      if (!quota) return;
      const c = nodesRef.current.get('C:/');
      if (!c) return;
      const free = Math.max(0, quota - usage);
      const MB = 1024 * 1024;
      if (
        Math.abs((c.totalSpace || 0) - quota) < MB &&
        Math.abs((c.freeSpace || 0) - free) < MB
      ) {
        return;
      }
      nodesRef.current.set('C:/', {
        ...c,
        totalSpace: quota,
        freeSpace: free,
      });
      markDirty('C:/');
      bump();
    } catch {
      // estimate unavailable — the seeded numbers stand
    }
  }, [markDirty, bump]);
  refreshDriveStatsRef.current = refreshDriveStats;

  // --- Protected system folders ---------------------------------------
  // Moving, renaming or deleting Windows' own folders (WINDOWS, Program
  // Files, profile roots and their Desktop / My Documents / Start Menu)
  // breaks the machine, so those operations are refused with error
  // 'protected' — unless the Folder Options override ("Allow changes to
  // protected operating system folders") is switched on. The path pattern
  // covers profiles created before these folders carried system flags.
  const isProtectedSystemNode = useCallback(node => {
    if (!node) return false;
    if (node.system) return true;
    const p = String(node.path || '').toLowerCase();
    // A profile root
    if (/^c:\/documents and settings\/[^/]+$/.test(p)) return true;
    // Its top-level shell folders
    if (
      /^c:\/documents and settings\/[^/]+\/(desktop|my documents|start menu)$/.test(
        p,
      )
    )
      return true;
    // The media shell folders, in both the profile and All Users. Not
    // strictly protected in real XP, but they carry registered icons and
    // task panes here, so losing them breaks more than it's worth — the
    // Folder Options override still lets you do it on purpose.
    return /^c:\/documents and settings\/[^/]+\/(my )?documents\/my (music|pictures|videos)$/.test(
      p,
    );
  }, []);

  const systemChangesAllowed = useCallback(() => {
    try {
      const cfg = getUserConfigRef.current('explorerView', null) || {};
      return !!cfg.allowSystemChanges;
    } catch {
      return false;
    }
  }, []);

  /** Set the user-visible file attributes from the Properties dialog. */
  const setNodeAttributes = useCallback(
    (path, attrs = {}) => {
      const p = normalizePath(path);
      const node = nodesRef.current.get(p);
      if (!node) return { ok: false, error: 'not-found' };
      if (node.system || node.type === 'drive')
        return { ok: false, error: 'system' };
      const updated = { ...node };
      if (typeof attrs.readOnly === 'boolean')
        updated.readOnly = attrs.readOnly;
      if (typeof attrs.hidden === 'boolean') updated.hidden = attrs.hidden;
      // Programmatic installers (the Store) dress their exes properly
      if (typeof attrs.iconKey === 'string') {
        updated.iconKey = attrs.iconKey;
        const icons = resolveNodeIcons(updated);
        updated.icon = icons.icon;
        updated.iconLarge = icons.iconLarge;
      }
      // A direct icon URL (must be a STABLE url — public/, not a hashed
      // bundle asset); customIcon makes it survive load-time re-resolution
      if (typeof attrs.icon === 'string') {
        updated.icon = attrs.icon;
        updated.iconLarge = attrs.iconLarge || attrs.icon;
        updated.iconKey = null;
        updated.customIcon = true;
      }
      if (Number.isFinite(attrs.size)) updated.size = attrs.size;
      nodesRef.current.set(p, updated);
      markDirty(p);
      bump();
      return { ok: true };
    },
    [markDirty, bump],
  );

  /** True when `path` is a system folder the current settings refuse to
   *  move/rename/delete. Surfaces use this for their error dialogs. */
  const isProtectedPath = useCallback(
    path => {
      const node = nodesRef.current.get(normalizePath(path));
      return isProtectedSystemNode(node) && !systemChangesAllowed();
    },
    [isProtectedSystemNode, systemChangesAllowed],
  );

  const relocate = useCallback(
    (op, np, extraPatch = {}) => {
      const node = nodesRef.current.get(op);
      if (!node) return;

      nodesRef.current.delete(op);
      markDeleted(op);

      const updated = {
        ...node,
        path: np,
        name: getBaseName(np),
        modifiedAt: Date.now(),
        ...extraPatch,
      };
      nodesRef.current.set(np, updated);
      markDirty(np);

      if (node.type === 'folder') {
        const prefix = op + '/';
        const toMove = [];
        for (const [key, child] of nodesRef.current) {
          if (key.startsWith(prefix)) {
            toMove.push([key, child]);
          }
        }
        for (const [key, child] of toMove) {
          nodesRef.current.delete(key);
          markDeleted(key);
          const newKey = np + key.slice(op.length);
          const updatedChild = { ...child, path: newKey };
          nodesRef.current.set(newKey, updatedChild);
          markDirty(newKey);
        }
      }

      // Settings filed under the old path have to follow it there
      repathConfigRef.current(op, np);
    },
    [markDirty, markDeleted],
  );

  /**
   * Rename a node in place.
   * Returns { ok: true } or { ok: false, error: 'not-found'|'invalid'|'exists' }.
   */
  const rename = useCallback(
    (oldPath, newName) => {
      const op = normalizePath(oldPath);
      const node = nodesRef.current.get(op);
      if (!node) return { ok: false, error: 'not-found' };
      if (isProtectedSystemNode(node) && !systemChangesAllowed())
        return { ok: false, error: 'protected' };

      if (validateFileName(newName)) return { ok: false, error: 'invalid' };

      const parent = getParentPath(op);
      if (!parent) return { ok: false, error: 'not-found' };
      const np = joinPath(parent, newName);
      if (np === op) return { ok: true };
      // Windows names are case-insensitive: a case-only rename of the SAME
      // node is allowed, but colliding with any different node — even one
      // differing only by case — is rejected.
      const collision = findNodeCI(np);
      if (collision && collision.path !== op) {
        return { ok: false, error: 'exists' };
      }

      relocate(op, np);
      bump();
      return { ok: true };
    },
    [relocate, bump, findNodeCI, isProtectedSystemNode, systemChangesAllowed],
  );

  /**
   * Move a node into a destination directory.
   * Returns { ok: true, newPath } or
   * { ok: false, error: 'not-found'|'same'|'cycle'|'exists', conflictPath? }.
   * Pass { replace: true } to overwrite an existing item of the same name.
   */
  const move = useCallback(
    (srcPath, destDirPath, opts = {}) => {
      const sp = normalizePath(srcPath);
      const node = nodesRef.current.get(sp);
      if (!node) return { ok: false, error: 'not-found' };
      if (isProtectedSystemNode(node) && !systemChangesAllowed())
        return { ok: false, error: 'protected' };

      const dp = normalizePath(destDirPath);
      if (getParentPath(sp) === dp) return { ok: false, error: 'same' };
      if (dp === sp || isDescendantOf(dp, sp))
        return { ok: false, error: 'cycle' };

      const newPath = joinPath(dp, node.name);
      const existing = findNodeCI(newPath);
      if (existing && existing.path !== sp) {
        if (!opts.replace)
          return { ok: false, error: 'exists', conflictPath: existing.path };
        // Never replace system or read-only items (or folders containing
        // system ones) — a replace-move would delete them permanently.
        if (hasSystemNodes(existing.path) || existing.readOnly)
          return { ok: false, error: 'system', conflictPath: existing.path };
        deleteNodePermanentlyRef.current(existing.path);
      }

      relocate(sp, newPath);
      bump();
      return { ok: true, newPath };
    },
    [
      relocate,
      bump,
      findNodeCI,
      hasSystemNodes,
      isProtectedSystemNode,
      systemChangesAllowed,
    ],
  );

  const newBlobId = () =>
    `bin_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

  /** Asynchronously duplicate stored binary content under a new blob id. */
  const duplicateBlob = useCallback((srcId, destId, mimeType) => {
    const db = dbRef.current;
    if (!db || !srcId) return;
    loadBlob(db, srcId)
      .then(blob => {
        if (blob) return saveBlob(db, destId, blob, mimeType);
      })
      .catch(() => {});
  }, []);

  /**
   * Copy a node into a destination directory (auto-renames on collision,
   * XP-style "Copy of X"). Returns { ok: true, newPath } or
   * { ok: false, error: 'not-found'|'cycle' }.
   */
  const copy = useCallback(
    (srcPath, destDirPath) => {
      const sp = normalizePath(srcPath);
      const node = nodesRef.current.get(sp);
      if (!node) return { ok: false, error: 'not-found' };

      const dp = normalizePath(destDirPath);
      if (dp === sp || isDescendantOf(dp, sp))
        return { ok: false, error: 'cycle' };

      let destName = node.name;

      // Handle name collision (case-insensitive, like Windows)
      if (existsCI(joinPath(dp, destName))) {
        destName = `Copy of ${destName}`;
        let counter = 2;
        while (existsCI(joinPath(dp, destName))) {
          destName = `Copy (${counter}) of ${node.name}`;
          counter++;
        }
      }

      const newPath = joinPath(dp, destName);
      const now = Date.now();
      const copied = {
        ...node,
        path: newPath,
        name: destName,
        system: false,
        createdAt: now,
        modifiedAt: now,
      };
      if (copied.hasBinaryContent) {
        copied.blobId = newBlobId();
        duplicateBlob(node.blobId || node.path, copied.blobId, node.mimeType);
      }
      nodesRef.current.set(newPath, copied);
      markDirty(newPath);

      // Copy descendants if folder
      if (node.type === 'folder') {
        const prefix = sp + '/';
        for (const [key, child] of [...nodesRef.current]) {
          if (key.startsWith(prefix)) {
            const newKey = newPath + key.slice(sp.length);
            const copiedChild = {
              ...child,
              path: newKey,
              // A copy of a system item is an ordinary item
              system: false,
              createdAt: now,
              modifiedAt: now,
            };
            if (copiedChild.hasBinaryContent) {
              copiedChild.blobId = newBlobId();
              duplicateBlob(
                child.blobId || child.path,
                copiedChild.blobId,
                child.mimeType,
              );
            }
            nodesRef.current.set(newKey, copiedChild);
            markDirty(newKey);
          }
        }
      }

      bump();
      return { ok: true, newPath };
    },
    [markDirty, bump, duplicateBlob, existsCI],
  );

  const deleteNode = useCallback(
    path => {
      const p = normalizePath(path);
      const node = nodesRef.current.get(p);
      if (!node) return false;
      if (isProtectedSystemNode(node) && !systemChangesAllowed()) return false;
      // Read-only attribute (user-settable in Properties) blocks deletion,
      // like the system flag — clear it in Properties to delete.
      if (node.readOnly) return false;

      const recyclerPath = SPECIAL_FOLDERS.RECYCLER;
      const now = Date.now();

      // Generate unique name in recycler to avoid collisions
      let destName = node.name;
      let destPath = joinPath(recyclerPath, destName);
      let counter = 1;
      while (existsCI(destPath)) {
        const ext = getExtension(destName);
        const base = ext ? destName.slice(0, -ext.length) : destName;
        destName = ext
          ? `${base} (${counter})${ext}`
          : `${node.name} (${counter})`;
        destPath = joinPath(recyclerPath, destName);
        counter++;
      }

      // Move to recycler
      nodesRef.current.delete(p);
      markDeleted(p);

      const recycled = {
        ...node,
        path: destPath,
        name: destName,
        originalPath: p,
        deletedAt: now,
      };
      nodesRef.current.set(destPath, recycled);
      markDirty(destPath);

      // Move descendants if folder
      if (node.type === 'folder') {
        const prefix = p + '/';
        const toMove = [];
        for (const [key, child] of nodesRef.current) {
          if (key.startsWith(prefix)) {
            toMove.push([key, child]);
          }
        }
        for (const [key, child] of toMove) {
          nodesRef.current.delete(key);
          markDeleted(key);
          const newKey = destPath + key.slice(p.length);
          const movedChild = {
            ...child,
            path: newKey,
            originalPath: key,
            deletedAt: now,
          };
          nodesRef.current.set(newKey, movedChild);
          markDirty(newKey);
        }
      }

      bump();
      return true;
    },
    [
      markDirty,
      markDeleted,
      bump,
      existsCI,
      isProtectedSystemNode,
      systemChangesAllowed,
    ],
  );

  const deleteNodePermanently = useCallback(
    path => {
      const p = normalizePath(path);
      const node = nodesRef.current.get(p);
      if (!node) return false;
      if (isProtectedSystemNode(node) && !systemChangesAllowed()) return false;

      const dropBlob = n => {
        if (n?.hasBinaryContent && dbRef.current) {
          deleteBlob(dbRef.current, n.blobId || n.path).catch(() => {});
        }
      };

      nodesRef.current.delete(p);
      markDeleted(p);
      dropBlob(node);

      // Delete descendants
      if (node.type === 'folder') {
        const prefix = p + '/';
        for (const [key, child] of [...nodesRef.current]) {
          if (key.startsWith(prefix)) {
            nodesRef.current.delete(key);
            markDeleted(key);
            dropBlob(child);
          }
        }
      }

      bump();
      return true;
    },
    [markDeleted, bump, isProtectedSystemNode, systemChangesAllowed],
  );
  deleteNodePermanentlyRef.current = deleteNodePermanently;

  // --- Recycle Bin ---

  const getRecycleBinContents = useCallback(() => {
    return listDir(SPECIAL_FOLDERS.RECYCLER).filter(
      // Only show top-level recycled items (not sub-items of recycled folders)
      node => node.originalPath !== null,
    );
  }, [listDir]);

  /**
   * Ensure every ancestor folder of `path` exists (used on restore),
   * creating missing ones and canonicalizing case against existing nodes.
   * Returns the canonical path of the immediate parent, or null when the
   * chain is blocked by a non-folder node (can't restore "inside" a file).
   */
  const ensureAncestors = useCallback(
    path => {
      const chain = [];
      let parent = getParentPath(normalizePath(path));
      while (parent) {
        chain.push(parent);
        const up = getParentPath(parent);
        if (up === parent) break; // drive roots are their own parent
        parent = up;
      }
      chain.reverse(); // topmost (drive) first

      let canonical = null;
      for (const level of chain) {
        const levelPath = canonical
          ? joinPath(canonical, getBaseName(level))
          : level;
        const existingNode = findNodeCI(levelPath);
        if (existingNode) {
          if (existingNode.type !== 'folder' && existingNode.type !== 'drive') {
            return null; // blocked by a file
          }
          canonical = existingNode.path;
        } else {
          const folder = applyIcons(makeNode(levelPath, 'folder'));
          nodesRef.current.set(levelPath, folder);
          markDirty(levelPath);
          canonical = levelPath;
        }
      }
      return canonical;
    },
    [makeNode, markDirty, findNodeCI],
  );

  /**
   * Restore an item from the Recycle Bin to its original location.
   * Returns { ok: true } or
   * { ok: false, error: 'not-found'|'exists'|'blocked'|'system' }.
   * Pass { replace: true } to overwrite an item now occupying the path.
   * 'blocked' means an ancestor of the original path is now a file;
   * 'system' means the occupying item cannot be replaced.
   */
  const restoreFromRecycleBin = useCallback(
    (path, opts = {}) => {
      const p = normalizePath(path);
      const node = nodesRef.current.get(p);
      if (!node || !node.originalPath) return { ok: false, error: 'not-found' };

      // If ancestors were deleted since, recreate them (XP does this too).
      // Fails when the chain is blocked by a file; returns the
      // canonical-case parent path otherwise.
      const parentPath = ensureAncestors(node.originalPath);
      if (!parentPath) return { ok: false, error: 'blocked' };
      const restorePath = joinPath(parentPath, getBaseName(node.originalPath));

      const occupied = findNodeCI(restorePath);
      if (occupied && occupied.path !== p) {
        if (!opts.replace)
          return { ok: false, error: 'exists', conflictPath: occupied.path };
        if (hasSystemNodes(occupied.path))
          return { ok: false, error: 'system', conflictPath: occupied.path };
        deleteNodePermanentlyRef.current(occupied.path);
      }

      // Remove from recycler
      nodesRef.current.delete(p);
      markDeleted(p);

      // Restore to original location
      const restored = {
        ...node,
        path: restorePath,
        name: getBaseName(restorePath),
        originalPath: null,
        deletedAt: null,
      };
      nodesRef.current.set(restorePath, restored);
      markDirty(restorePath);

      // Restore descendants under the restored folder
      if (node.type === 'folder') {
        const prefix = p + '/';
        const toRestore = [];
        for (const [key, child] of nodesRef.current) {
          if (key.startsWith(prefix)) {
            toRestore.push([key, child]);
          }
        }
        for (const [key, child] of toRestore) {
          const restoredChildPath = restorePath + key.slice(p.length);
          nodesRef.current.delete(key);
          markDeleted(key);
          const restoredChild = {
            ...child,
            path: restoredChildPath,
            name: getBaseName(restoredChildPath),
            originalPath: null,
            deletedAt: null,
          };
          nodesRef.current.set(restoredChildPath, restoredChild);
          markDirty(restoredChildPath);
        }
      }

      bump();
      return { ok: true };
    },
    [markDirty, markDeleted, bump, ensureAncestors, findNodeCI, hasSystemNodes],
  );

  const emptyRecycleBin = useCallback(() => {
    const recycler = SPECIAL_FOLDERS.RECYCLER;
    const prefix = recycler + '/';
    const toDelete = [];
    for (const [key] of nodesRef.current) {
      if (key.startsWith(prefix)) {
        toDelete.push(key);
      }
    }
    for (const key of toDelete) {
      const node = nodesRef.current.get(key);
      nodesRef.current.delete(key);
      markDeleted(key);
      if (node?.hasBinaryContent && dbRef.current) {
        deleteBlob(dbRef.current, node.blobId || key).catch(() => {});
      }
    }
    bump();
  }, [markDeleted, bump]);

  // --- Utility ---

  const getDisplayPath = useCallback(path => displayPath(path), []);

  const getDirSize = useCallback(path => {
    const p = normalizePath(path);
    let total = 0;
    for (const [key, node] of nodesRef.current) {
      if (isDescendantOf(key, p) && node.type === 'file') {
        total += node.size || 0;
      }
    }
    return total;
  }, []);

  const persistNow = useCallback(() => persistDirty(), [persistDirty]);

  const resetToDefaults = useCallback(async () => {
    nodesRef.current.clear();
    const defaults = buildSeedNodes();
    for (const node of defaults) {
      nodesRef.current.set(node.path, node);
    }
    const db = dbRef.current;
    if (db) {
      try {
        await clearAllStores(db);
        await saveManyMeta(db, defaults);
        await saveManyMeta(db, [
          { path: SCHEMA_SENTINEL, schemaVersion: VFS_SCHEMA_VERSION },
        ]);
      } catch (err) {
        console.warn('VFS: reset failed', err);
      }
    }
    dirtyPaths.current.clear();
    deletedPaths.current.clear();
    bump();
  }, [bump]);

  /**
   * Seed a profile tree (Desktop, My Documents, Start Menu, Favorites) for
   * a newly created account into the live filesystem. Existing nodes are
   * left untouched, so re-running for an old profile is harmless.
   */
  const createUserProfile = useCallback(
    name => {
      if (!name || !String(name).trim()) return { ok: false, error: 'invalid' };
      const profile = buildUserProfile(String(name).trim());
      let added = 0;
      for (const node of profile) {
        if (findNodeCI(node.path)) continue;
        nodesRef.current.set(node.path, node);
        markDirty(node.path);
        added += 1;
      }
      if (added > 0) bump();
      return { ok: true, added };
    },
    [findNodeCI, markDirty, bump],
  );

  // --- Per-user configuration (the profile's ntuser.dat hive) ---
  //
  // Every user-scoped setting (desktop layout, egg counts, run history,
  // recent documents, app options) lives as JSON inside a REAL file at
  // C:/Documents and Settings/<user>/ntuser.dat, so it is per-account,
  // browsable in Explorer/cmd, and persisted with the filesystem.

  const ntuserPathFor = name => `${getProfileRootFor(name)}/ntuser.dat`;
  // path -> { modifiedAt, data } so reads don't re-parse per render
  const userConfigCache = useRef(new Map());

  const readUserConfigMap = useCallback(
    name => {
      if (!name) return {};
      const node = findNodeCI(ntuserPathFor(name));
      if (!node || node.type !== 'file' || node.content == null) return {};
      const cached = userConfigCache.current.get(node.path);
      if (cached && cached.modifiedAt === node.modifiedAt) return cached.data;
      let data = {};
      try {
        data = JSON.parse(node.content) || {};
      } catch {
        data = {};
      }
      userConfigCache.current.set(node.path, {
        modifiedAt: node.modifiedAt,
        data,
      });
      return data;
    },
    [findNodeCI],
  );

  const getUserConfigFor = useCallback(
    (name, key, def) => {
      const data = readUserConfigMap(name);
      return data[key] !== undefined ? data[key] : def;
    },
    [readUserConfigMap],
  );

  const setUserConfigFor = useCallback(
    (name, key, value) => {
      if (!name) return false;
      const path = ntuserPathFor(name);
      const data = { ...readUserConfigMap(name), [key]: value };
      const json = JSON.stringify(data);
      const node = findNodeCI(path);
      if (!node || node.type !== 'file') {
        // The user deleted their hive — recreate it silently
        const created = createFile(path, json);
        if (created) setNode({ ...created, hidden: true });
      } else {
        writeFile(node.path, json);
      }
      // Refresh the cache eagerly so same-tick reads see the write
      const after = findNodeCI(path);
      if (after) {
        userConfigCache.current.set(after.path, {
          modifiedAt: after.modifiedAt,
          data,
        });
      }
      return true;
    },
    [findNodeCI, readUserConfigMap, createFile, writeFile, setNode],
  );

  /*
   * Account lifecycle, the two halves that touch the disk.
   *
   * Both deliberately bypass isProtectedSystemNode. A profile root is
   * protected so that nobody drags their own Documents and Settings folder
   * into the bin from Explorer — but renaming and deleting an account are
   * exactly the sanctioned ways for it to move or go, and refusing them
   * here is what left profiles orphaned under their old name.
   */

  /** Repaths one account's own path-keyed settings after its profile moves. */
  const repathConfigFor = useCallback(
    (name, oldPath, newPath) => {
      const fromLc = String(oldPath).toLowerCase();
      const prefixLc = `${fromLc}/`;
      const moved = (entry, to) => {
        const entryLc = String(entry).toLowerCase();
        if (entryLc === fromLc) return to;
        if (entryLc.startsWith(prefixLc))
          return to + entry.slice(oldPath.length);
        return null;
      };

      for (const { key, lower } of [
        { key: 'fileSummaries', lower: false },
        { key: 'mediaTagEdits', lower: true },
      ]) {
        const map = getUserConfigFor(name, key, null);
        if (!map || typeof map !== 'object' || Array.isArray(map)) continue;
        const to = lower ? String(newPath).toLowerCase() : newPath;
        let changed = false;
        const next = {};
        for (const [entry, value] of Object.entries(map)) {
          const target = moved(entry, to);
          if (target !== null) changed = true;
          next[target !== null ? target : entry] = value;
        }
        if (changed) setUserConfigFor(name, key, next);
      }

      for (const key of ['mediaLibrary', 'mediaLibraryDeleted']) {
        const list = getUserConfigFor(name, key, null);
        if (!Array.isArray(list)) continue;
        let changed = false;
        const next = list.map(entry => {
          if (typeof entry !== 'string') return entry;
          const target = moved(entry, newPath);
          if (target !== null) changed = true;
          return target !== null ? target : entry;
        });
        if (changed) setUserConfigFor(name, key, next);
      }

      // Desktop icon positions are keyed by the path of what they point at.
      const layout = getUserConfigFor(name, 'desktopLayout', null);
      if (layout && typeof layout === 'object' && !Array.isArray(layout)) {
        let changed = false;
        const next = {};
        for (const [entry, value] of Object.entries(layout)) {
          const target = moved(entry, newPath);
          if (target !== null) changed = true;
          next[target !== null ? target : entry] = value;
        }
        if (changed) setUserConfigFor(name, 'desktopLayout', next);
      }
    },
    [getUserConfigFor, setUserConfigFor],
  );

  /**
   * Moves an account's profile tree when the account is renamed.
   *
   * Returns false when there is nothing to move, which is not a failure —
   * an account that has never logged in has no profile yet, and one gets
   * built under the new name on first login.
   */
  const renameUserProfile = useCallback(
    (oldName, newName) => {
      const oldRoot = getProfileRootFor(oldName);
      const newRoot = getProfileRootFor(newName);
      if (oldRoot === newRoot) return true;
      if (!nodesRef.current.get(oldRoot)) return false;
      if (nodesRef.current.get(newRoot)) return false;

      relocate(oldRoot, newRoot);
      // After the move, so it reads the hive at its new home.
      repathConfigFor(newName, oldRoot, newRoot);
      bump();
      return true;
    },
    [relocate, bump, repathConfigFor],
  );

  /** Removes an account's profile tree and everything in it. */
  const deleteUserProfile = useCallback(
    name => {
      const root = getProfileRootFor(name);
      const node = nodesRef.current.get(root);
      if (!node) return false;

      const dropBlob = n => {
        if (n?.hasBinaryContent && dbRef.current) {
          deleteBlob(dbRef.current, n.blobId || n.path).catch(() => {});
        }
      };

      nodesRef.current.delete(root);
      markDeleted(root);
      dropBlob(node);

      const prefix = root + '/';
      for (const [key, child] of [...nodesRef.current]) {
        if (key.startsWith(prefix)) {
          nodesRef.current.delete(key);
          markDeleted(key);
          dropBlob(child);
        }
      }

      bump();
      return true;
    },
    [bump, markDeleted],
  );


  const getUserConfig = useCallback(
    (key, def) => getUserConfigFor(getCurrentUserName(), key, def),
    [getUserConfigFor],
  );
  getUserConfigRef.current = getUserConfig;
  const setUserConfig = useCallback(
    (key, value) => setUserConfigFor(getCurrentUserName(), key, value),
    [setUserConfigFor],
  );

  /**
   * Settings the profile files under a file's path — the Summary fields and
   * the media tag edits. Renaming or moving a file has to carry them along,
   * or what the user typed about it is orphaned the moment it is renamed.
   * `lower` says whether that store lower-cases its keys.
   */
  // Maps keyed by a file's path, and lists that hold paths outright — the
  // Media Player's library among them. `lower` marks a store whose keys are
  // kept lower-cased.
  const PATH_KEYED_CONFIG = [
    { key: 'fileSummaries', lower: false },
    { key: 'mediaTagEdits', lower: true },
  ];
  const PATH_LIST_CONFIG = ['mediaLibrary', 'mediaLibraryDeleted'];

  repathConfigRef.current = (oldPath, newPath) => {
    const fromLc = String(oldPath).toLowerCase();
    const prefixLc = `${fromLc}/`;
    // one path rewritten the way the store spells it
    const moved = (entry, to) => {
      const entryLc = entry.toLowerCase();
      if (entryLc === fromLc) return to;
      if (entryLc.startsWith(prefixLc))
        // a renamed folder takes everything filed under it
        return to + entry.slice(oldPath.length);
      return null;
    };
    for (const { key, lower } of PATH_KEYED_CONFIG) {
      let map;
      try {
        map = getUserConfig(key, null);
      } catch {
        map = null;
      }
      if (!map || typeof map !== 'object' || Array.isArray(map)) continue;
      const to = lower ? String(newPath).toLowerCase() : newPath;
      let changed = false;
      const next = {};
      for (const [entry, value] of Object.entries(map)) {
        const target = moved(entry, to);
        if (target !== null) changed = true;
        next[target !== null ? target : entry] = value;
      }
      if (changed) setUserConfig(key, next);
    }
    for (const key of PATH_LIST_CONFIG) {
      let list;
      try {
        list = getUserConfig(key, null);
      } catch {
        list = null;
      }
      if (!Array.isArray(list)) continue;
      let changed = false;
      const next = list.map(entry => {
        if (typeof entry !== 'string') return entry;
        const target = moved(entry, newPath);
        if (target !== null) changed = true;
        return target !== null ? target : entry;
      });
      if (changed) setUserConfig(key, next);
    }
  };

  // --- Clipboard ---

  const [clipboard, setClipboard] = useState(null); // { action: 'cut'|'copy', paths: string[] }

  const clipboardCut = useCallback(paths => {
    setClipboard({
      action: 'cut',
      paths: Array.isArray(paths) ? paths : [paths],
    });
  }, []);

  const clipboardCopy = useCallback(paths => {
    setClipboard({
      action: 'copy',
      paths: Array.isArray(paths) ? paths : [paths],
    });
  }, []);

  /**
   * Paste the clipboard into a directory.
   * `resolveConflict(node)` (optional, async) is asked whether an existing
   * same-named item should be replaced when moving; return true to replace.
   * Returns { pasted, errors: [{ path, error }] }.
   */
  const clipboardPaste = useCallback(
    async (destDirPath, resolveConflict) => {
      if (!clipboard || clipboard.paths.length === 0)
        return { pasted: 0, errors: [] };
      const dp = normalizePath(destDirPath);
      let pasted = 0;
      const errors = [];
      const errMessage = (error, srcPath) => {
        const name = getBaseName(srcPath);
        switch (error) {
          case 'system':
            return `Cannot move '${name}': it would replace a system item that Windows requires.`;
          case 'protected':
            return `Cannot move '${name}': It is a Windows system folder and is required for Windows to run properly.`;
          case 'cycle':
            return `Cannot move '${name}': the destination folder is a subfolder of the source folder.`;
          case 'exists':
            return `An item named '${name}' already exists in this location.`;
          case 'not-found':
            return `'${name}' could not be found.`;
          default:
            return `An error occurred while processing '${name}'.`;
        }
      };
      for (const srcPath of clipboard.paths) {
        if (clipboard.action === 'copy') {
          const res = copy(srcPath, dp);
          if (res.ok) pasted++;
          else
            errors.push({
              path: srcPath,
              error: res.error,
              message: errMessage(res.error, srcPath),
            });
        } else if (clipboard.action === 'cut') {
          let res = move(srcPath, dp);
          if (!res.ok && res.error === 'exists' && resolveConflict) {
            const node = nodesRef.current.get(normalizePath(srcPath));
            const replace = await resolveConflict(node);
            if (replace) res = move(srcPath, dp, { replace: true });
            else res = { ok: false, error: 'skipped' };
          }
          if (res.ok) pasted++;
          else if (res.error !== 'skipped' && res.error !== 'same')
            // Cut+paste into the same folder is a silent no-op, like XP
            errors.push({
              path: srcPath,
              error: res.error,
              message: errMessage(res.error, srcPath),
            });
        }
      }
      if (clipboard.action === 'cut') setClipboard(null);
      return { pasted, errors };
    },
    [clipboard, copy, move],
  );

  const clipboardClear = useCallback(() => setClipboard(null), []);

  // --- Recent documents (Start Menu > My Recent Documents), per user ---
  // Stored in the profile's ntuser.dat under 'recentDocuments'; legacy
  // localStorage lists are imported once and the old key removed.

  const legacyRecentKeyFor = name =>
    `winxp_recent_docs_${String(name || '_default').toLowerCase()}`;
  const [recentDocuments, setRecentDocuments] = useState([]);

  const loadRecentFor = useCallback(
    name => {
      if (!name) return [];
      let list = getUserConfigFor(name, 'recentDocuments', null);
      if (list == null) {
        try {
          const raw = localStorage.getItem(legacyRecentKeyFor(name));
          if (raw) {
            list = JSON.parse(raw) || [];
            setUserConfigFor(name, 'recentDocuments', list);
            localStorage.removeItem(legacyRecentKeyFor(name));
          }
        } catch {
          // legacy list unreadable — start empty
        }
      }
      return Array.isArray(list) ? list : [];
    },
    [getUserConfigFor, setUserConfigFor],
  );

  const addRecentDocument = useCallback(
    path => {
      const p = normalizePath(path);
      setRecentDocuments(prev => {
        const next = [p, ...prev.filter(x => x !== p)].slice(0, 10);
        setUserConfigFor(getCurrentUserName(), 'recentDocuments', next);
        return next;
      });
    },
    [setUserConfigFor],
  );

  // "Clear List" in Customize Start Menu (Advanced > Recent documents)
  const clearRecentDocuments = useCallback(() => {
    setUserConfigFor(getCurrentUserName(), 'recentDocuments', []);
    setRecentDocuments([]);
  }, [setUserConfigFor]);

  // Load once the filesystem is up (the hive is a VFS file)
  useEffect(() => {
    if (initialized) setRecentDocuments(loadRecentFor(getCurrentUserName()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // React to account changes: reload the active user's recent list and bump
  // the version so everything reading the SPECIAL_FOLDERS getters (desktop,
  // Start Menu, Explorer panes) re-resolves against the new profile.
  useEffect(
    () =>
      subscribeUsers(() => {
        setRecentDocuments(loadRecentFor(getCurrentUserName()));
        bump();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bump, loadRecentFor],
  );

  // --- Context value (stable references via useCallback) ---

  const value = {
    version,
    initialized,
    recovery,

    // Read
    getNode,
    exists,
    existsCI,
    findNodeCI,
    listDir,
    readFile,
    readBinaryFile,
    openBinaryFile,
    readFileUrl,
    search,

    // Write
    createFile,
    createRemoteFile,
    createFolder,
    createShortcut,
    createShortcutTo,
    updateShortcut,
    writeFile,
    writeBinaryFile,
    rename,
    move,
    copy,
    isProtectedPath,
    setNodeAttributes,
    deleteNode,
    deleteNodePermanently,

    // Recycle Bin
    getRecycleBinContents,
    restoreFromRecycleBin,
    emptyRecycleBin,

    // Clipboard
    clipboard,
    clipboardCut,
    clipboardCopy,
    clipboardPaste,
    clipboardClear,

    // Recent documents
    recentDocuments,
    addRecentDocument,
    clearRecentDocuments,

    // Per-user configuration (ntuser.dat)
    getUserConfig,
    setUserConfig,
    getUserConfigFor,
    setUserConfigFor,

    // Utility
    getFileAssociation: path => getFileAssociation(path),
    getDisplayPath,
    formatSize,
    getDirSize,
    persistNow,
    resetToDefaults,
    createUserProfile,
    renameUserProfile,
    deleteUserProfile,
  };

  return <VFSContext.Provider value={value}>{children}</VFSContext.Provider>;
}
