/*
 * The shell's one answer to "what is at this path?"
 *
 * Explorer navigates more than folders: My Computer, the Recycle Bin,
 * Control Panel and its pages, archives and the folders inside them. Before
 * this module existed each of those was a string comparison scattered through
 * Explorer — navigation, the address bar, the window title, Up and the
 * gone-folder fallback each kept their own copy of the rules, and every new
 * namespace meant finding all of them again.
 *
 * `resolveLocation` returns one descriptor the rest of the shell reads:
 *
 *   kind     'computer' | 'recycle' | 'control' | 'archive' | 'folder'
 *            | 'drive' | 'missing'
 *   exists   whether navigating here can succeed
 *   path     the canonical path (folder case corrected to the node's own)
 *   address  what the address bar shows
 *   title    what the window title bar shows
 *   icon     the small icon for the title and address bar (null: caller's
 *            default)
 *   parent   where Up goes, or null at the top
 *   node     the VFS node, when the location is one
 *   archive  { archive, inner } when inside a .zip
 *   view     the Control Panel page ('home' when at its root)
 *
 * This is where a namespace is recognised. Explorer still decides what a
 * namespace lists, which columns it shows and which menus it offers, so a
 * new one is a branch here plus those decisions there.
 */
import { zipPathParts } from '../../context/zipShell';
import { SPECIAL_FOLDERS } from '../../context/vfsConstants';
import { displayPath, getParentPath } from '../../context/vfsUtils';
import { getArt } from '../../xpArt';
import {
  controlPanelViewTitle,
  isControlPanelView,
} from './ControlPanel/categories';

import computerIcon from 'assets/windowsIcons/676(16x16).png';
import folderIcon from 'assets/windowsIcons/318(16x16).png';
import controlIcon from 'assets/windowsIcons/300(16x16).png';
import recycleEmptyDrawn from 'assets/windowsIcons/recycle-empty.svg';
import zipIcon from 'assets/windowsIcons/zipfldr(16x16).png';

// The namespaces, as Explorer paths
export const MY_COMPUTER = 'My Computer';
export const RECYCLE_BIN = 'Recycle Bin';
export const CONTROL_PANEL = 'Control Panel';

// Shortcuts to shell objects carry a token rather than a path. The desktop's
// bin shortcut has always been seeded with this one, so it is persisted in
// every store and stays; My Computer's token equals its path.
export const RECYCLE_BIN_TARGET = 'RecycleBin';
export const MY_COMPUTER_TARGET = MY_COMPUTER;

/** A shortcut to the Recycle Bin shell object (the desktop's bin icon). */
export const isRecycleBinShortcut = node =>
  !!node && node.type === 'shortcut' && node.target === RECYCLE_BIN_TARGET;

/** A shortcut to the My Computer shell object. */
export const isMyComputerShortcut = node =>
  !!node && node.type === 'shortcut' && node.target === MY_COMPUTER_TARGET;

/** True for either shell-object token, which shellOpen browses rather than resolves. */
export const isShellObjectTarget = target =>
  target === MY_COMPUTER_TARGET || target === RECYCLE_BIN_TARGET;

const recycleIcon = () => getArt('recycle-empty', recycleEmptyDrawn);

export function resolveLocation(vfs, path) {
  const p = String(path || '');

  if (p === MY_COMPUTER)
    return {
      kind: 'computer',
      exists: true,
      path: p,
      address: MY_COMPUTER,
      title: MY_COMPUTER,
      icon: computerIcon,
      parent: null,
      node: null,
      archive: null,
      view: null,
    };

  if (p === RECYCLE_BIN)
    return {
      kind: 'recycle',
      exists: true,
      path: p,
      address: RECYCLE_BIN,
      title: RECYCLE_BIN,
      icon: recycleIcon(),
      // The bin sits on the Desktop in the real namespace tree
      parent: SPECIAL_FOLDERS.DESKTOP,
      node: null,
      archive: null,
      view: null,
    };

  if (p === CONTROL_PANEL || p.startsWith(`${CONTROL_PANEL}/`)) {
    const view =
      p === CONTROL_PANEL ? 'home' : p.slice(CONTROL_PANEL.length + 1);
    // Only pages Control Panel has; anything else is as missing as a
    // folder that is not there
    if (isControlPanelView(view))
      return {
        kind: 'control',
        exists: true,
        path: p,
        address: CONTROL_PANEL,
        title: CONTROL_PANEL,
        // Where the window is within Control Panel, for history menus
        pageTitle: controlPanelViewTitle(view),
        icon: controlIcon,
        parent: view === 'home' ? MY_COMPUTER : CONTROL_PANEL,
        node: null,
        archive: null,
        view,
      };
  }

  // A .zip and the paths inside it — but only when the archive really is a
  // file; a folder someone named "x.zip" stays an ordinary folder.
  const parts = zipPathParts(p);
  if (parts) {
    const zipNode = vfs.getNode(parts.archive);
    if (zipNode && zipNode.type === 'file') {
      const canonical = parts.inner
        ? `${zipNode.path}/${parts.inner}`
        : zipNode.path;
      return {
        kind: 'archive',
        exists: true,
        path: canonical,
        address: displayPath(canonical),
        title: parts.inner
          ? parts.inner.split('/').pop()
          : zipNode.name.replace(/\.zip$/i, ''),
        icon: parts.inner ? folderIcon : zipIcon,
        parent: parts.inner
          ? canonical.slice(0, canonical.lastIndexOf('/'))
          : getParentPath(zipNode.path),
        node: zipNode,
        archive: { archive: zipNode.path, inner: parts.inner },
        view: null,
      };
    }
  }

  const node = vfs.getNode(p);
  if (node && (node.type === 'folder' || node.type === 'drive')) {
    const parent = getParentPath(node.path);
    return {
      kind: node.type,
      exists: true,
      path: node.path,
      address: displayPath(node.path),
      title:
        node.type === 'drive'
          ? `${node.driveLabel || 'Local Disk'} (${node.name})`
          : node.name,
      icon: node.icon || folderIcon,
      parent: parent && vfs.exists(parent) ? parent : MY_COMPUTER,
      node,
      archive: null,
      view: null,
    };
  }

  return {
    kind: 'missing',
    exists: false,
    path: p,
    address: displayPath(p),
    title: p.split('/').pop() || p,
    icon: null,
    parent: null,
    node: node || null,
    archive: null,
    view: null,
  };
}
