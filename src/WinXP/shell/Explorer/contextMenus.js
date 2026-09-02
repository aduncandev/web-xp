// The right-click menus Explorer builds itself. The item menu shares its
// verbs with the desktop through buildIconMenuItems.
import { isPinned } from '../../startMenuConfig';
import { buildIconMenuItems } from '../../Icons/menus';
import { getCurrentUserName } from '../../../context/users';
import { folderIcon, isExecutablePath } from '../../../context/vfsConstants';
import { isImageFile } from '../fileTypes';
import { MY_COMPUTER, resolveLocation } from '../location';
import { VIEW_MODES, SORT_KEYS } from './menus';

import notepadSmall from 'assets/windowsIcons/327(16x16).png';

/** The View radios. Control Panel's layout is its own, so they grey out there. */
export const viewSubmenu = (viewMode, locked) =>
  VIEW_MODES.map(v => ({
    label: v.label,
    action: `view:${v.key}`,
    radio: viewMode === v.key,
    disabled: locked,
  }));

export const arrangeSubmenu = sortBy =>
  SORT_KEYS.map(s => ({
    label: s.label,
    action: `sort:${s.key}`,
    radio: sortBy === s.key,
  }));

/** How a place reads in a menu or an Other Places row. */
export function placeName(vfs, path) {
  if (path === MY_COMPUTER) return MY_COMPUTER;
  const n = vfs.getNode(path);
  if (!n) {
    // A namespace (the bin, a Control Panel page) has a title of its own
    const where = resolveLocation(vfs, path);
    return where.pageTitle || where.title || path;
  }
  if (n.type === 'drive') return `${n.driveLabel || 'Local Disk'} (${n.name})`;
  return n.name;
}

/** The Back or Forward chevron: up to ten entries, nearest first. */
export function historyMenu(vfs, history, index, dir) {
  const entries =
    dir === 'back'
      ? history
          .slice(0, index)
          .map((p, i) => ({ idx: i, path: p }))
          .reverse()
      : history
          .slice(index + 1)
          .map((p, i) => ({ idx: index + 1 + i, path: p }));
  return entries.slice(0, 10).map(en => ({
    label: placeName(vfs, en.path),
    action: `hist:${en.idx}`,
  }));
}

export const recycleItemMenu = multiple => [
  { label: 'Restore', action: 'rb-restore', bold: true },
  { type: 'separator' },
  { label: 'Delete', action: 'rb-delete' },
  { type: 'separator' },
  { label: 'Properties', action: 'properties', disabled: multiple },
];

/**
 * An item's menu, and what it can pin to the Start menu (executables and
 * shortcuts to them). Nothing inside an archive can be renamed, cut,
 * deleted or handed to another program in place, it has to come out first,
 * so extraction is the only verb besides Open there.
 */
export function itemMenu({ vfs, node, selection, inArchive }) {
  const multiple = selection.length > 1;
  const nodes = selection.map(p => vfs.getNode(p)).filter(Boolean);
  // Override-aware: the Folder Options toggle re-enables these entries
  const isLocked = n => vfs.isProtectedPath(n.path);
  const isFolder = node.type === 'folder' || node.type === 'drive';
  let pinTarget = null;
  if (!multiple) {
    if (node.type === 'shortcut') {
      if (node.target && isExecutablePath(node.target)) pinTarget = node.target;
    } else if (isExecutablePath(node.path)) {
      pinTarget = node.path;
    }
  }
  const items = buildIconMenuItems({
    multiple,
    isZip: /\.zip$/i.test(node.name),
    isImage: node.type === 'file' && isImageFile(node.name),
    name: node.type === 'file' ? node.name : null,
    allSystem: nodes.every(isLocked),
    isSystem: isLocked(node),
    isDrive: node.type === 'drive',
    pinLabel: pinTarget
      ? isPinned(vfs, getCurrentUserName(), pinTarget)
        ? 'Unpin from Start menu'
        : 'Pin to Start menu'
      : null,
    canPaste: isFolder && !!vfs.clipboard,
    inArchive,
  });
  return { items, pinTarget };
}

/** Right-click on the empty part of the file area. */
export function emptyAreaMenu({
  viewMode,
  sortBy,
  locked,
  inRecycleBin,
  binEmpty,
  inArchive,
  archiveEncrypted,
  canPaste,
}) {
  const items = [
    { label: 'View', submenu: viewSubmenu(viewMode, locked) },
    { label: 'Arrange Icons by', submenu: arrangeSubmenu(sortBy) },
    { type: 'separator' },
    { label: 'Refresh', action: 'refresh' },
  ];
  if (inRecycleBin) {
    items.push({ type: 'separator' });
    items.push({
      label: 'Empty Recycle Bin',
      action: 'rb-empty',
      disabled: binEmpty,
    });
    return items;
  }
  if (inArchive) {
    // A compressed folder offers neither New nor Properties here, and its
    // Paste entries sit greyed out above the two jobs it does have
    items.push({ type: 'separator' });
    items.push({ label: 'Paste', action: 'paste-here', disabled: true });
    items.push({
      label: 'Paste Shortcut',
      action: 'paste-here',
      disabled: true,
    });
    items.push({ type: 'separator' });
    items.push({ label: 'Extract All...', action: 'extract-here' });
    if (archiveEncrypted)
      items.push({ label: 'Remove Password...', action: 'unpassword-here' });
    else items.push({ label: 'Add a Password...', action: 'password-here' });
    return items;
  }
  if (canPaste) {
    items.push({ type: 'separator' });
    items.push({ label: 'Paste', action: 'paste-here' });
  }
  items.push({ type: 'separator' });
  items.push({
    label: 'New',
    submenu: [
      { label: 'Folder', action: 'new-folder', icon: folderIcon },
      { label: 'Shortcut', action: 'new-shortcut' },
      { type: 'separator' },
      { label: 'Text Document', action: 'new-txt', icon: notepadSmall },
    ],
  });
  items.push({ type: 'separator' });
  items.push({ label: 'Properties', action: 'properties-folder' });
  return items;
}
