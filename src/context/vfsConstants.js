import notepadIcon from 'assets/windowsIcons/327(16x16).png';
import notepadLarge from 'assets/windowsIcons/327(32x32).png';
import paintIcon from 'assets/windowsIcons/680(16x16).png';
import paintLarge from 'assets/windowsIcons/680(32x32).png';
import ieIcon from 'assets/windowsIcons/ie-paper.png';
import ieLarge from 'assets/windowsIcons/ie.png';
import documentIcon from 'assets/windowsIcons/308(16x16).png';
import folderIcon from 'assets/windowsIcons/318(48x48).png';
import folderSmallIcon from 'assets/windowsIcons/318(16x16).png';
import computerIcon from 'assets/windowsIcons/676(16x16).png';
import computerLarge from 'assets/windowsIcons/676(32x32).png';
import winampIcon from 'assets/windowsIcons/winamp.png';
import mineIcon from 'assets/minesweeper/mine-icon.png';
import aboutMeIcon from 'assets/windowsIcons/touricon.png';
import voltorbFlipIcon from 'assets/windowsIcons/voltorb.png';
import pinballIcon from 'assets/windowsIcons/pinball.png';
import pictoChatIcon from 'assets/windowsIcons/pictochat.png';
import eggIcon from 'assets/windowsIcons/tree.gif';
import mediaPlayerIcon from 'assets/windowsIcons/846(16x16).png';
import mediaPlayerLarge from 'assets/windowsIcons/846(32x32).png';
import recycleBinIcon from 'assets/windowsIcons/302(16x16).png';
import shortcutOverlay from 'assets/windowsIcons/308(16x16).png';

export const STORAGE_KEY = 'vfsData';
export const RECYCLE_META_KEY = 'vfsRecycleMeta';

/** Map file extension → app name (used by getAssociatedApp). */
export const FILE_ASSOCIATIONS = {
  txt: 'Notepad',
  log: 'Notepad',
  ini: 'Notepad',
  cfg: 'Notepad',
  bmp: 'Paint',
  jpg: 'Paint',
  jpeg: 'Paint',
  png: 'Paint',
  gif: 'Paint',
  htm: 'Internet Explorer',
  html: 'Internet Explorer',
};

/** Map file extension → icon asset (small / list-view size). */
export const ICON_MAP = {
  txt: notepadIcon,
  log: notepadIcon,
  ini: notepadIcon,
  cfg: notepadIcon,
  bmp: paintIcon,
  jpg: paintIcon,
  jpeg: paintIcon,
  png: paintIcon,
  gif: paintIcon,
  htm: ieIcon,
  html: ieIcon,
};

/** Fallback icons when extension has no mapping. */
export const DEFAULT_FILE_ICON = documentIcon;
export const FOLDER_ICON = folderIcon;
export const FOLDER_ICON_SMALL = folderSmallIcon;
export const SHORTCUT_OVERLAY = shortcutOverlay;

/**
 * Map app name → icon (large, for desktop/shortcuts).
 * Used to resolve shortcut icons from target app name.
 */
export const APP_ICONS = {
  'Internet Explorer': ieLarge,
  'Minesweeper': mineIcon,
  'My Computer': computerLarge,
  'Notepad': notepadLarge,
  'Winamp': winampIcon,
  'Paint': paintLarge,
  'AboutMe': aboutMeIcon,
  'VoltorbFlip': voltorbFlipIcon,
  'Pinball': pinballIcon,
  'PictoChat': pictoChatIcon,
  'Egg': eggIcon,
  'MediaPlayer': mediaPlayerLarge,
  'RecycleBin': recycleBinIcon,
};

/**
 * Map app name → small icon (for menus, list views).
 */
export const APP_ICONS_SMALL = {
  'Internet Explorer': ieIcon,
  'Minesweeper': mineIcon,
  'My Computer': computerIcon,
  'Notepad': notepadIcon,
  'Winamp': winampIcon,
  'Paint': paintIcon,
  'AboutMe': aboutMeIcon,
  'VoltorbFlip': voltorbFlipIcon,
  'Pinball': pinballIcon,
  'PictoChat': pictoChatIcon,
  'Egg': eggIcon,
  'MediaPlayer': mediaPlayerIcon,
  'RecycleBin': recycleBinIcon,
};

/**
 * Map app name → display name for UI.
 */
export const APP_DISPLAY_NAMES = {
  'Internet Explorer': 'Internet Explorer',
  'Minesweeper': 'Minesweeper',
  'My Computer': 'My Computer',
  'Notepad': 'Notepad',
  'Winamp': 'Winamp',
  'Paint': 'Paint',
  'AboutMe': 'aduncan.dev Tour',
  'VoltorbFlip': 'Voltorb Flip',
  'Pinball': '3D Pinball',
  'PictoChat': 'PictoChat',
  'Egg': '???',
  'MediaPlayer': 'Media Player',
  'RecycleBin': 'Recycle Bin',
};

/** Get the display icon for a file node. */
export function getIconForNode(node, large = false) {
  if (node.shortcutIcon) return node.shortcutIcon;
  if (node.icon) return node.icon;
  if (node.type === 'shortcut') {
    const icons = large ? APP_ICONS : APP_ICONS_SMALL;
    return icons[node.target] || DEFAULT_FILE_ICON;
  }
  if (node.type === 'directory') return large ? FOLDER_ICON : FOLDER_ICON_SMALL;
  const ext = (node.name.split('.').pop() || '').toLowerCase();
  return ICON_MAP[ext] || DEFAULT_FILE_ICON;
}

/** Get the large (desktop) icon for a node. */
export function getLargeIconForNode(node) {
  if (node.shortcutIcon) return node.shortcutIcon;
  if (node.icon) return node.icon;
  if (node.type === 'shortcut') {
    return APP_ICONS[node.target] || DEFAULT_FILE_ICON;
  }
  if (node.type === 'directory') return FOLDER_ICON;
  const ext = (node.name.split('.').pop() || '').toLowerCase();
  return ICON_MAP[ext] || DEFAULT_FILE_ICON;
}

/** Get display name for a node (strip .lnk for shortcuts). */
export function getDisplayName(node) {
  if (node.type === 'shortcut') {
    // Strip .lnk extension for display
    const name = node.name;
    if (name.toLowerCase().endsWith('.lnk')) {
      return name.slice(0, -4);
    }
    // Use app display name as fallback
    return APP_DISPLAY_NAMES[node.target] || name;
  }
  return node.name;
}
