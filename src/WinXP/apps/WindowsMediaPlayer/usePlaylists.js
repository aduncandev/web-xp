// Saved playlists: .m3u files under My Playlists, so they refresh with the
// filesystem. The dialogs for making, renaming and deleting them live here
// too, along with dragging rows into a new order.
import { useCallback, useMemo, useState } from 'react';
import {
  addToPlaylist,
  createPlaylist,
  listPlaylists,
  readPlaylist,
  savePlaylist,
  validatePlaylistName,
} from './playlists';

export function usePlaylists({
  vfs,
  dlg,
  library,
  libraryPaths,
  storeLibrary,
  setPlaylistName,
}) {
  const { alert, confirm, prompt } = dlg;
  // A playlist opened from somewhere other than My Playlists joins the list
  // for as long as the player is open
  const [openedPlaylist, setOpenedPlaylist] = useState(null);

  const playlists = useMemo(() => {
    if (!vfs.initialized) return [];
    const saved = listPlaylists(vfs);
    if (openedPlaylist && !saved.some(p => p.path === openedPlaylist.path))
      return [...saved, openedPlaylist];
    return saved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, vfs.version, openedPlaylist]);

  /** File > New Playlist... Loops until the name is usable or cancelled. */
  const newPlaylist = useCallback(
    async (seedTracks = []) => {
      let suggestion = 'New Playlist';
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const name = await prompt(
          'Enter the new playlist name:',
          suggestion,
          'New Playlist',
        );
        if (name === null) return null;
        const problem = validatePlaylistName(vfs, name);
        if (problem) {
          suggestion = name;
          // eslint-disable-next-line no-await-in-loop
          await alert(problem, 'Windows Media Player');
          continue;
        }
        const created = createPlaylist(vfs, name);
        if (seedTracks.length)
          addToPlaylist(
            vfs,
            created.path,
            seedTracks.map(t => t.path),
            library,
          );
        return created;
      }
    },
    [alert, prompt, vfs, library],
  );

  const deletePlaylist = useCallback(
    async playlist => {
      const ok = await confirm(
        `Are you sure you want to delete "${playlist.name}" from your library?`,
        'Windows Media Player',
      );
      if (!ok) return false;
      vfs.deleteNode(playlist.path);
      setPlaylistName(prev => (prev === playlist.name ? 'All Audio' : prev));
      return true;
    },
    [confirm, vfs, setPlaylistName],
  );

  const renamePlaylist = useCallback(
    async playlist => {
      let suggestion = playlist.name;
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const name = await prompt(
          'Enter the new playlist name:',
          suggestion,
          'Rename Playlist',
        );
        if (name === null) return;
        const trimmed = String(name).trim();
        if (trimmed === playlist.name) return;
        const problem = validatePlaylistName(vfs, trimmed);
        if (problem) {
          suggestion = name;
          // eslint-disable-next-line no-await-in-loop
          await alert(problem, 'Windows Media Player');
          continue;
        }
        vfs.rename(playlist.path, `${trimmed}.m3u`);
        setPlaylistName(prev => (prev === playlist.name ? trimmed : prev));
        return;
      }
    },
    [alert, prompt, vfs, setPlaylistName],
  );

  /**
   * Drag one row onto another to move it there, in the library or a
   * playlist. Both keep an order the user chose, so both can be moved.
   */
  const reorder = useCallback(
    (playlist, fromPath, toPath) => {
      const move = list => {
        // paths are matched the way the file system compares them
        const at = target =>
          list.findIndex(p => p.toLowerCase() === target.toLowerCase());
        const from = at(fromPath);
        const to = at(toPath);
        if (from < 0 || to < 0 || from === to) return null;
        const next = [...list];
        next.splice(to, 0, next.splice(from, 1)[0]);
        return next;
      };
      if (playlist) {
        const next = move(readPlaylist(vfs, playlist.path));
        if (next)
          savePlaylist(
            vfs,
            playlist.path,
            next.map(
              p => library.find(t => t.path === p) || { path: p, title: p },
            ),
          );
        return;
      }
      const next = move(libraryPaths || []);
      if (next) storeLibrary(next);
    },
    [vfs, library, libraryPaths, storeLibrary],
  );

  return {
    playlists,
    setOpenedPlaylist,
    newPlaylist,
    deletePlaylist,
    renamePlaylist,
    reorder,
  };
}
