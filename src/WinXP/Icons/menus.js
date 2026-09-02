// Pure context-menu item-list builders for the desktop icon layer. These
// only assemble the item arrays from plain arguments — the action handlers
// stay in index.jsx.
import { folderIcon } from '../../context/vfsConstants';
import { openWithChoicesFor } from '../shell/fileTypes';
import { getArt } from '../../xpArt';

import notepadSmall from 'assets/windowsIcons/327(16x16).png';
import zipSendIcon from 'assets/windowsIcons/zipfldr(16x16).png';
import documentIcon16 from 'assets/windowsIcons/308(16x16).png';
import desktopIconSvg from 'assets/windowsIcons/desktop.svg';

/** Desktop (empty wallpaper) right-click menu. */
export function buildDesktopMenuItems({ autoArrange, alignToGrid, clipboard }) {
  return [
    {
      label: 'Arrange Icons By',
      submenu: [
        { label: 'Name', action: 'arrange:name' },
        { label: 'Size', action: 'arrange:size' },
        { label: 'Type', action: 'arrange:type' },
        { label: 'Modified', action: 'arrange:modified' },
        { type: 'separator' },
        {
          label: 'Auto Arrange',
          action: 'toggle-auto-arrange',
          checked: autoArrange,
        },
        {
          label: 'Align to Grid',
          action: 'toggle-align-grid',
          checked: alignToGrid,
        },
      ],
    },
    { label: 'Refresh', action: 'refresh' },
    { type: 'separator' },
    { label: 'Paste', action: 'paste', disabled: !clipboard },
    { label: 'Paste Shortcut', action: 'paste-shortcut', disabled: true },
    { type: 'separator' },
    {
      label: 'New',
      submenu: [
        { label: 'Folder', action: 'new-folder', icon: folderIcon },
        { label: 'Shortcut', action: 'new-shortcut' },
        { type: 'separator' },
        { label: 'Text Document', action: 'new-txt', icon: notepadSmall },
      ],
    },
    { type: 'separator' },
    { label: 'Properties', action: 'display-properties' },
  ];
}

/** The Recycle Bin desktop icon's special menu. */
export function buildRecycleBinMenuItems({ hasItems }) {
  return [
    { label: 'Open', action: 'open', bold: true },
    { type: 'separator' },
    {
      label: 'Empty Recycle Bin',
      action: 'empty-bin',
      disabled: !hasItems,
    },
    { type: 'separator' },
    { label: 'Properties', action: 'properties' },
  ];
}

/**
 * My Computer's shell-namespace menu; its Properties opens System
 * Properties, like real XP.
 */
export function buildMyComputerMenuItems({ isSystem }) {
  return [
    { label: 'Open', action: 'open', bold: true },
    { label: 'Explore', action: 'explore' },
    { label: 'Search...', action: 'search' },
    { label: 'Manage', action: 'manage' },
    { type: 'separator' },
    {
      label: 'Map Network Drive...',
      action: 'map-drive',
      disabled: true,
    },
    {
      label: 'Disconnect Network Drive...',
      action: 'disconnect-drive',
      disabled: true,
    },
    { type: 'separator' },
    { label: 'Create Shortcut', action: 'create-shortcut' },
    { label: 'Delete', action: 'delete', disabled: isSystem },
    { label: 'Rename', action: 'rename', disabled: isSystem },
    { type: 'separator' },
    { label: 'Properties', action: 'system-properties' },
  ];
}

/**
 * The item context menu, shared by Explorer and the desktop.
 *   multiple   more than one item selected
 *   isZip      the Compressed Folders verbs
 *   isImage    the Edit / Print / Preview verbs
 *   name       the file's name, for the Open With choices (files only)
 *   allSystem  every selected item is locked: no Cut, no Delete
 *   isSystem   the clicked item is locked: no Rename
 *   isDrive    nothing to send it to, no renaming
 *   pinLabel   'Pin to Start menu' / 'Unpin from Start menu', or null
 *   canPaste   a folder with something on the clipboard
 *   inArchive  an entry inside a zip: only Open and Extract
 */
export function buildIconMenuItems({
  multiple,
  isZip,
  isImage,
  name,
  allSystem,
  isSystem,
  isDrive = false,
  pinLabel = null,
  canPaste = false,
  inArchive = false,
}) {
  if (inArchive) {
    return [
      { label: 'Open', action: 'open', bold: true },
      { type: 'separator' },
      { label: 'Extract...', action: 'extract-here' },
    ];
  }
  const items = [];
  if (!multiple) {
    items.push({ label: 'Open', action: 'open', bold: true });
    if (isImage) {
      // the picture verbs, in the real menu's order
      items.push({ label: 'Edit', action: 'img-edit' });
      items.push({ label: 'Print', action: 'img-print' });
      items.push({ label: 'Preview', action: 'img-preview' });
    }
    if (isZip) {
      items.push({ label: 'Extract All...', action: 'extract-all' });
      items.push({ label: 'Add a password...', action: 'zip-password' });
      items.push({ label: 'Remove password...', action: 'zip-unpassword' });
    }
    if (name) {
      const choices = openWithChoicesFor(name);
      items.push({
        label: 'Open With',
        submenu: [
          ...choices.map(c => ({
            label: c.label,
            icon: c.icon,
            action: `openwith:${c.exePath}`,
          })),
          ...(choices.length ? [{ type: 'separator' }] : []),
          { label: 'Choose Program...', action: 'open-with' },
        ],
      });
    }
    if (pinLabel) items.push({ label: pinLabel, action: 'toggle-pin' });
    items.push({ type: 'separator' });
  }
  if (!isDrive) {
    items.push({
      label: 'Send To',
      submenu: [
        {
          label: 'Compressed (zipped) Folder',
          icon: zipSendIcon,
          action: 'sendto-zip',
        },
        {
          label: 'Desktop (create shortcut)',
          icon: getArt('Desktop16', getArt('Desktop', desktopIconSvg)),
          action: 'sendto-desktop',
        },
        {
          label: 'My Documents',
          icon: getArt('MyDocuments16', documentIcon16),
          action: 'sendto-mydocs',
        },
      ],
    });
    items.push({ type: 'separator' });
  }
  items.push({ label: 'Cut', action: 'cut', disabled: allSystem });
  items.push({ label: 'Copy', action: 'copy' });
  if (!multiple && canPaste) items.push({ label: 'Paste', action: 'paste' });
  items.push({ type: 'separator' });
  items.push({ label: 'Create Shortcut', action: 'create-shortcut' });
  items.push({ label: 'Delete', action: 'delete', disabled: allSystem });
  if (!multiple) {
    items.push({
      label: 'Rename',
      action: 'rename',
      disabled: isSystem || isDrive,
    });
  }
  items.push({ type: 'separator' });
  items.push({
    label: 'Properties',
    action: 'properties',
    disabled: multiple,
  });
  return items;
}
