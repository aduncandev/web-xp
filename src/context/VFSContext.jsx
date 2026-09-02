import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { NodeStore } from './vfs/nodeStore';
import { Persistence } from './vfs/persistence';
import { FileSystem } from './vfs/fileSystem';
import { bootFileSystem, registeredUserNames } from './vfs/boot';
import { migrateLegacySettings } from './legacySettings';
import { getCurrentUserName, listUsers, subscribeUsers } from './users';
import { normalizePath, getBaseName } from './vfsUtils';

export const VFSContext = createContext(null);

export function useVFS() {
  const ctx = useContext(VFSContext);
  if (!ctx) throw new Error('useVFS must be used within a VFSProvider');
  return ctx;
}

const PASTE_ERRORS = {
  system: name =>
    `Cannot move '${name}': it would replace a system item that Windows requires.`,
  protected: name =>
    `Cannot move '${name}': It is a Windows system folder and is required for Windows to run properly.`,
  cycle: name =>
    `Cannot move '${name}': the destination folder is a subfolder of the source folder.`,
  exists: name => `An item named '${name}' already exists in this location.`,
  'not-found': name => `'${name}' could not be found.`,
};
const pasteError = (error, srcPath) =>
  (PASTE_ERRORS[error] ||
    (name => `An error occurred while processing '${name}'.`))(
    getBaseName(srcPath),
  );

/**
 * Hosts the filesystem for the app. The operations live in vfs/fileSystem.js
 * and know nothing of React; this provider boots it, persists it, and
 * re-renders consumers when it changes. The clipboard and the recent
 * documents list are the only state that is React's own.
 */
export function VFSProvider({ children }) {
  const [version, setVersion] = useState(0);
  const [initialized, setInitialized] = useState(false);
  // Non-null while boot is held on the Windows Error Recovery screen (a
  // schema change wants to erase a store holding the user's own files)
  const [recovery, setRecovery] = useState(null);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  // One filesystem for the provider's lifetime
  const fsRef = useRef(null);
  if (!fsRef.current) {
    const store = new NodeStore();
    fsRef.current = new FileSystem({
      store,
      persistence: new Persistence(store, bump),
      notify: bump,
    });
  }
  const fs = fsRef.current;

  useEffect(() => {
    let cancelled = false;
    const requestRecovery = info =>
      new Promise(resolve => {
        setRecovery({
          fileCount: info.fileCount,
          buildBackup: info.buildBackup,
          proceed: async () => {
            await info.proceed();
            setRecovery(null);
            resolve();
          },
        });
      });
    bootFileSystem({
      store: fs.store,
      persistence: fs.persistence,
      requestRecovery,
    }).then(() => {
      if (cancelled) return;
      setInitialized(true);
      bump();
      fs.persistence.refreshDriveStats();
    });
    return () => {
      cancelled = true;
    };
  }, [fs, bump]);

  // Flush debounced writes when the tab is hidden or closing: IDB writes
  // during unload are best-effort, but this closes the window where the
  // last few hundred milliseconds of changes were lost on refresh
  useEffect(() => {
    const flush = () => fs.persistence.flush();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fs]);

  // --- Clipboard ---

  const [clipboard, setClipboard] = useState(null); // { action: 'cut'|'copy', paths }

  const clipboardCut = useCallback(paths => {
    setClipboard({ action: 'cut', paths: Array.isArray(paths) ? paths : [paths] });
  }, []);

  const clipboardCopy = useCallback(paths => {
    setClipboard({ action: 'copy', paths: Array.isArray(paths) ? paths : [paths] });
  }, []);

  /**
   * Paste the clipboard into a directory. `resolveConflict(node)` (optional,
   * async) is asked whether an existing same-named item should be replaced
   * when moving. Returns { pasted, errors: [{ path, error, message }] }.
   */
  const clipboardPaste = useCallback(
    async (destDirPath, resolveConflict) => {
      if (!clipboard || clipboard.paths.length === 0)
        return { pasted: 0, errors: [] };
      const dp = normalizePath(destDirPath);
      let pasted = 0;
      const errors = [];
      for (const srcPath of clipboard.paths) {
        let res;
        if (clipboard.action === 'copy') {
          res = fs.copy(srcPath, dp);
        } else {
          res = fs.move(srcPath, dp);
          if (!res.ok && res.error === 'exists' && resolveConflict) {
            const replace = await resolveConflict(fs.getNode(srcPath));
            res = replace
              ? fs.move(srcPath, dp, { replace: true })
              : { ok: false, error: 'skipped' };
          }
        }
        if (res.ok) pasted++;
        // Cut+paste into the same folder is a silent no-op, like XP
        else if (res.error !== 'skipped' && res.error !== 'same')
          errors.push({
            path: srcPath,
            error: res.error,
            message: pasteError(res.error, srcPath),
          });
      }
      if (clipboard.action === 'cut') setClipboard(null);
      return { pasted, errors };
    },
    [clipboard, fs],
  );

  // --- Recent documents (Start Menu > My Recent Documents), per user ---

  const [recentDocuments, setRecentDocuments] = useState([]);

  const loadRecentFor = useCallback(
    name => {
      if (!name) return [];
      const list = fs.getUserConfigFor(name, 'recentDocuments', null);
      return Array.isArray(list) ? list : [];
    },
    [fs],
  );

  const addRecentDocument = useCallback(
    path => {
      const p = normalizePath(path);
      setRecentDocuments(prev => {
        const next = [p, ...prev.filter(x => x !== p)].slice(0, 10);
        fs.setUserConfigFor(getCurrentUserName(), 'recentDocuments', next);
        return next;
      });
    },
    [fs],
  );

  // "Clear List" in Customize Start Menu (Advanced > Recent documents)
  const clearRecentDocuments = useCallback(() => {
    fs.setUserConfigFor(getCurrentUserName(), 'recentDocuments', []);
    setRecentDocuments([]);
  }, [fs]);

  // Once the filesystem is up: settings from before accounts existed move
  // into the hive, then the recent list loads
  useEffect(() => {
    if (!initialized) return;
    migrateLegacySettings(fs, registeredUserNames());
    setRecentDocuments(loadRecentFor(getCurrentUserName()));
  }, [initialized, fs, loadRecentFor]);

  // Account changes: reload the active user's recent list and bump so
  // everything reading the SPECIAL_FOLDERS getters re-resolves. The
  // registry also emits for settings that change no path (fast boot, a
  // password); those must not invalidate every consumer.
  useEffect(() => {
    const accounts = () =>
      `${getCurrentUserName() || ''}|${listUsers()
        .map(u => u.name)
        .join('|')}`;
    let last = accounts();
    return subscribeUsers(() => {
      const now = accounts();
      if (now === last) return;
      last = now;
      setRecentDocuments(loadRecentFor(getCurrentUserName()));
      bump();
    });
  }, [bump, loadRecentFor]);

  const value = useMemo(
    () => ({
      version,
      initialized,
      recovery,
      ...fs.api,
      clipboard,
      clipboardCut,
      clipboardCopy,
      clipboardPaste,
      recentDocuments,
      addRecentDocument,
      clearRecentDocuments,
    }),
    [
      version,
      initialized,
      recovery,
      fs,
      clipboard,
      clipboardCut,
      clipboardCopy,
      clipboardPaste,
      recentDocuments,
      addRecentDocument,
      clearRecentDocuments,
    ],
  );

  return <VFSContext.Provider value={value}>{children}</VFSContext.Provider>;
}
