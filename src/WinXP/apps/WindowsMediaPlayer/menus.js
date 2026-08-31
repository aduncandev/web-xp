/*
 * Pure builders for the player's popup menus. Each one turns plain arguments
 * into a ContextMenu items array and nothing more — the click handlers, and
 * the state that positions and shows the menus, stay in index.jsx.
 */

import { ALBUM_ART, NO_VIZ, VIZ_FAMILIES } from './visualizations';

/** The menu behind a right-click on a track, wherever it is listed. */
export function buildTrackMenuItems(tracks, context, playlists) {
  const many = tracks.length > 1;
  const items = [
    { label: 'Play', bold: true, action: 'play', disabled: many },
    { type: 'separator' },
    {
      label: many
        ? `Add ${tracks.length} items to playlist`
        : 'Add to playlist',
      submenu: [
        ...playlists.map(p => ({ label: p.name, action: `add:${p.path}` })),
        ...(playlists.length ? [{ type: 'separator' }] : []),
        { label: 'New playlist...', action: 'add:new' },
      ],
    },
  ];
  // Edit / Delete / Move, in the order and wording of the real player's
  // library popup (WMPLOC menu 1650).
  const block = [];
  if (context.canEdit)
    block.push({
      label: many ? 'Edit Selected Items' : 'Edit',
      action: 'edit',
    });
  if (context.library)
    block.push({
      label: many
        ? `Delete ${tracks.length} items from Library`
        : 'Delete from Library',
      action: 'delete',
    });
  if (context.playlist)
    block.push({
      label: many
        ? `Remove ${tracks.length} items from Playlist`
        : 'Delete from Playlist',
      action: 'remove',
    });
  if (block.length) {
    items.push({ type: 'separator' });
    items.push(...block);
  }
  if (context.canReorder) {
    items.push({ type: 'separator' });
    items.push({ label: 'Move Up', action: 'up', disabled: many });
    items.push({ label: 'Move Down', action: 'down', disabled: many });
  }
  if (context.deleted) {
    items.push({ type: 'separator' });
    items.push({ label: 'Restore to Library', action: 'restore' });
    items.push({ label: 'Remove from Deleted Items', action: 'purge' });
  }
  if (context.nowPlaying) {
    items.push({ type: 'separator' });
    items.push({
      label: 'Add to Library',
      action: 'library',
      disabled: tracks.every(t => t.path.startsWith('url:')),
    });
  }
  items.push({ type: 'separator' });
  items.push({
    label: 'Properties',
    action: 'properties',
    disabled: many || tracks[0].path.startsWith('url:'),
  });
  return items;
}

/**
 * The menu behind a right-click on a branch of the library tree. The real
 * player's is WMPLOC menu 145, "Playlist Stuff": Play, Rename, Get Names,
 * Update Names, Info, Delete, Restore, Restore Selected Items and Empty
 * "Deleted Items". The three that only ever talked to WindowsMedia.com are
 * left out; New Playlist is added, since there is nowhere else to reach it
 * from the tree.
 */
export function buildTreeMenuItems(item, context) {
  const playlist = item.playlist || null;
  const rows = context.rows || [];
  const picked = context.selected || [];
  const items = [];
  if (item.id !== 'playlists' && item.id !== 'presets')
    items.push({
      label: 'Play',
      bold: true,
      action: 'play',
      disabled: !rows.length,
    });
  if (playlist) {
    if (items.length) items.push({ type: 'separator' });
    items.push({ label: 'Rename', action: 'rename' });
    items.push({ label: 'Delete', action: 'delete' });
  }
  if (item.id === 'deleted') {
    if (items.length) items.push({ type: 'separator' });
    items.push({
      label: 'Restore',
      action: 'restore-all',
      disabled: !rows.length,
    });
    items.push({
      label: 'Restore Selected Items',
      action: 'restore-picked',
      disabled: !picked.length,
    });
    items.push({ type: 'separator' });
    items.push({
      label: 'Empty "Deleted Items"',
      action: 'empty',
      disabled: !rows.length,
    });
  }
  if (playlist || item.id === 'playlists' || item.id === 'root') {
    if (items.length) items.push({ type: 'separator' });
    items.push({ label: 'New Playlist...', action: 'new' });
  }
  return items;
}

/* The pulldown under the video picks a visualization or album art — the
   real button opens this list rather than stepping through it. */
export function buildVizMenuItems(visualization) {
  const mark = name => ({
    label: name.includes(': ') ? name.slice(name.indexOf(': ') + 2) : name,
    action: name,
    radio: visualization === name,
  });
  return [
    { ...mark(ALBUM_ART), label: ALBUM_ART },
    { type: 'separator' },
    ...VIZ_FAMILIES.map(family =>
      family.presets
        ? {
            label: family.name,
            submenu: family.presets.map(preset =>
              mark(`${family.name}: ${preset}`),
            ),
          }
        : mark(family.name),
    ),
    { type: 'separator' },
    { ...mark(NO_VIZ), label: NO_VIZ },
  ];
}
