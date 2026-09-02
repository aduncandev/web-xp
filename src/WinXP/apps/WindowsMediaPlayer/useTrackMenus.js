// The right-click menus over tracks and over the library tree, and what
// each of their verbs does.
import { useCallback, useState } from 'react';
import { buildTrackMenuItems, buildTreeMenuItems } from './menus';
import { addToPlaylist, removeFromPlaylist } from './playlists';

export function useTrackMenus({
  vfs,
  dlg,
  library,
  playlists,
  deletedPaths,
  storeDeleted,
  addToLibrary,
  removeFromLibrary,
  newPlaylist,
  renamePlaylist,
  deletePlaylist,
  playList,
  playTrack,
  setPropertiesPath,
}) {
  const { confirm } = dlg;
  const [menu, setMenu] = useState(null);
  const [treeMenu, setTreeMenu] = useState(null);

  /** The menu behind a right-click on a track, wherever it is listed. */
  const openTrackMenu = useCallback(
    (event, tracksOrTrack, context = {}) => {
      event.preventDefault();
      const tracks = Array.isArray(tracksOrTrack)
        ? tracksOrTrack
        : [tracksOrTrack];
      const items = buildTrackMenuItems(tracks, context, playlists);
      setMenu({ x: event.clientX, y: event.clientY, items, tracks, context });
    },
    [playlists],
  );

  /** The menu behind a right-click on a branch of the library tree. */
  const openTreeMenu = useCallback((event, item, context = {}) => {
    event.preventDefault();
    const items = buildTreeMenuItems(item, context);
    if (!items.length) return;
    setTreeMenu({ x: event.clientX, y: event.clientY, items, item, context });
  }, []);

  const emptyDeleted = useCallback(async () => {
    const ok = await confirm(
      'Are you sure you want to remove all deleted media from the library?',
      'Windows Media Player',
    );
    if (ok) storeDeleted([]);
  }, [confirm, storeDeleted]);

  const deleteFromLibrary = useCallback(
    async tracks => {
      if (!tracks || !tracks.length) return;
      const ok = await confirm(
        [
          'Are you sure you want to remove the items from the Media Library?',
          '',
          'They stay on your computer, and in Deleted Items, until you remove them there.',
        ].join(String.fromCharCode(10)),
        'Windows Media Player',
      );
      if (ok) removeFromLibrary(tracks.map(t => t.path));
    },
    [confirm, removeFromLibrary],
  );

  const onTreeMenuAction = useCallback(
    async action => {
      const { item, context } = treeMenu || {};
      setTreeMenu(null);
      if (!item) return;
      const rows = (context && context.rows) || [];
      const picked = (context && context.selected) || [];
      if (action === 'play') {
        if (rows.length) playList(item.label, rows);
      } else if (action === 'rename' && item.playlist) {
        await renamePlaylist(item.playlist);
      } else if (action === 'delete' && item.playlist) {
        const gone = await deletePlaylist(item.playlist);
        if (gone && context && context.setNode) context.setNode('all-audio');
      } else if (action === 'restore-all') {
        addToLibrary(rows.map(t => t.path));
      } else if (action === 'restore-picked') {
        addToLibrary(picked.map(t => t.path));
      } else if (action === 'empty') {
        await emptyDeleted();
      } else if (action === 'new') {
        await newPlaylist();
      }
    },
    [
      treeMenu,
      renamePlaylist,
      deletePlaylist,
      addToLibrary,
      emptyDeleted,
      newPlaylist,
      playList,
    ],
  );

  const onTrackMenuAction = useCallback(
    async action => {
      const { tracks, context } = menu || {};
      setMenu(null);
      if (!tracks || !tracks.length) return;
      if (action === 'play') {
        playTrack(tracks[0]);
      } else if (action === 'remove' && context.playlist) {
        for (const t of tracks)
          removeFromPlaylist(vfs, context.playlist.path, t.path, library);
      } else if (action === 'delete') {
        await deleteFromLibrary(tracks);
      } else if (action === 'edit') {
        if (context.beginEdit) context.beginEdit(context.column, tracks);
      } else if (action === 'up' || action === 'down') {
        if (context.moveBy) context.moveBy(tracks, action === 'up' ? -1 : 1);
      } else if (action === 'restore') {
        addToLibrary(tracks.map(t => t.path));
      } else if (action === 'purge') {
        const gone = new Set(tracks.map(t => t.path.toLowerCase()));
        storeDeleted(deletedPaths.filter(p => !gone.has(p.toLowerCase())));
      } else if (action === 'library') {
        addToLibrary(
          tracks.filter(t => !t.path.startsWith('url:')).map(t => t.path),
        );
      } else if (action === 'properties') {
        if (!tracks[0].path.startsWith('url:'))
          setPropertiesPath(tracks[0].path);
      } else if (action === 'add:new') {
        await newPlaylist(tracks);
      } else if (action.startsWith('add:')) {
        addToPlaylist(
          vfs,
          action.slice(4),
          tracks.map(t => t.path),
          library,
        );
      }
    },
    [
      menu,
      vfs,
      library,
      newPlaylist,
      deleteFromLibrary,
      addToLibrary,
      deletedPaths,
      storeDeleted,
      playTrack,
      setPropertiesPath,
    ],
  );

  return {
    menu,
    setMenu,
    treeMenu,
    setTreeMenu,
    openTrackMenu,
    openTreeMenu,
    onTrackMenuAction,
    onTreeMenuAction,
    emptyDeleted,
    deleteFromLibrary,
  };
}
