// What the user has filed in the library, as VFS paths in their profile:
// the list itself, Deleted Items, and Tools > Options. The player asks
// before it goes looking, so the list starts empty.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { trackForPath } from './library';

export function useLibrary(vfs) {
  const [libraryPaths, setLibraryPaths] = useState(null);
  const [askedToSearch, setAskedToSearch] = useState(false);
  // Entries taken out of the library. They are not gone: the Deleted Items
  // branch keeps them so they can be put back.
  const [deletedPaths, setDeletedPaths] = useState([]);
  const [options, setOptions] = useState({
    addPlayedToLibrary: false,
    startInMediaGuide: false,
    showTitleBar: true,
  });

  // Follows the hive rather than loading once: renaming a track in Explorer
  // or the tag editor repaths the stored lists, and a player that kept its
  // first copy would write the stale one straight back over the fix.
  useEffect(() => {
    if (!vfs.initialized || !vfs.getUserConfig) return;
    const same = (a, b) =>
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((p, i) => p === b[i]);
    const saved = vfs.getUserConfig('mediaLibrary', null);
    setLibraryPaths(prev => {
      const next = Array.isArray(saved) ? saved : [];
      return same(prev, next) ? prev : next;
    });
    if (libraryPaths === null) setAskedToSearch(Array.isArray(saved));
    const bin = vfs.getUserConfig('mediaLibraryDeleted', null);
    setDeletedPaths(prev => {
      const next = Array.isArray(bin) ? bin : [];
      return same(prev, next) ? prev : next;
    });
    if (libraryPaths === null) {
      const opts = vfs.getUserConfig('wmpOptions', null);
      if (opts) setOptions(prev => ({ ...prev, ...opts }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, vfs.version]);

  const storeDeleted = useCallback(
    next => {
      setDeletedPaths(next);
      if (vfs.initialized && vfs.setUserConfig)
        vfs.setUserConfig('mediaLibraryDeleted', next);
    },
    [vfs],
  );

  const setOption = useCallback(
    (key, value) => {
      setOptions(prev => {
        const next = { ...prev, [key]: value };
        if (vfs.initialized && vfs.setUserConfig)
          vfs.setUserConfig('wmpOptions', next);
        return next;
      });
    },
    [vfs],
  );

  const storeLibrary = useCallback(
    next => {
      setLibraryPaths(next);
      if (vfs.initialized && vfs.setUserConfig)
        vfs.setUserConfig('mediaLibrary', next);
    },
    [vfs],
  );

  /** File paths in the library; returns how many were new. */
  const addToLibrary = useCallback(
    paths => {
      const wanted = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
      if (!wanted.length) return 0;
      const have = new Set((libraryPaths || []).map(p => p.toLowerCase()));
      const fresh = wanted.filter(p => !have.has(p.toLowerCase()));
      if (fresh.length) storeLibrary([...(libraryPaths || []), ...fresh]);
      const back = new Set(wanted.map(p => p.toLowerCase()));
      if (deletedPaths.some(p => back.has(p.toLowerCase())))
        storeDeleted(deletedPaths.filter(p => !back.has(p.toLowerCase())));
      return fresh.length;
    },
    [libraryPaths, storeLibrary, deletedPaths, storeDeleted],
  );

  /** Take entries out of the library and drop them in Deleted Items. */
  const removeFromLibrary = useCallback(
    paths => {
      const gone = new Set(paths.map(p => p.toLowerCase()));
      storeLibrary(
        (libraryPaths || []).filter(p => !gone.has(p.toLowerCase())),
      );
      const already = new Set(deletedPaths.map(p => p.toLowerCase()));
      storeDeleted([
        ...deletedPaths,
        ...paths.filter(p => !already.has(p.toLowerCase())),
      ]);
    },
    [libraryPaths, storeLibrary, deletedPaths, storeDeleted],
  );

  // The library's paths as tracks, before tags and durations are laid over
  const rawLibrary = useMemo(() => {
    if (!vfs.initialized || !libraryPaths) return [];
    return libraryPaths.map(p => trackForPath(vfs, p)).filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryPaths, vfs.initialized, vfs.version]);

  return {
    libraryPaths,
    setLibraryPaths,
    askedToSearch,
    setAskedToSearch,
    deletedPaths,
    options,
    setOption,
    storeDeleted,
    storeLibrary,
    addToLibrary,
    removeFromLibrary,
    rawLibrary,
  };
}
