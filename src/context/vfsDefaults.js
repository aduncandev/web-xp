/**
 * Default file tree matching the Windows XP structure.
 * Returns a flat Map<string, FileNode> keyed by normalized paths.
 */

/**
 * FileNode shape:
 * {
 *   path: string,
 *   name: string,
 *   type: 'file' | 'directory' | 'shortcut',
 *   content: string | ArrayBuffer | Blob | null,
 *   icon: string | null,           // custom icon override
 *   size: number,                   // byte size for files
 *   mimeType: string | null,        // e.g. 'text/plain', 'image/png'
 *   createdAt: number,
 *   modifiedAt: number,
 *   // Shortcut-only fields:
 *   target: string | undefined,     // path or app name
 *   targetArgs: object | undefined, // extra props to pass when opening
 *   shortcutIcon: string | undefined, // icon override for shortcut display
 * }
 */

function dir(path, name) {
  const now = Date.now();
  return {
    path,
    name,
    type: 'directory',
    content: null,
    icon: null,
    size: 0,
    mimeType: null,
    createdAt: now,
    modifiedAt: now,
  };
}

function file(path, name, content = '', mimeType = 'text/plain') {
  const now = Date.now();
  return {
    path,
    name,
    type: 'file',
    content,
    icon: null,
    size: typeof content === 'string' ? content.length : 0,
    mimeType,
    createdAt: now,
    modifiedAt: now,
  };
}

function shortcut(path, name, target, icon = null, targetArgs = undefined) {
  const now = Date.now();
  return {
    path,
    name,
    type: 'shortcut',
    content: null,
    icon: null,
    size: 0,
    mimeType: null,
    createdAt: now,
    modifiedAt: now,
    target,
    shortcutIcon: icon,
    targetArgs,
  };
}

const DESKTOP = 'C:/Documents and Settings/User/Desktop';
const START_MENU = 'C:/Documents and Settings/User/Start Menu';
const START_PROGRAMS = `${START_MENU}/Programs`;

export function createDefaultFS() {
  const entries = [
    // Drive root
    dir('C:/', 'C:'),

    // Recycle Bin storage
    dir('C:/RECYCLER', 'RECYCLER'),

    // Top-level directories (matching real XP)
    dir('C:/Documents and Settings', 'Documents and Settings'),
    dir('C:/Documents and Settings/All Users', 'All Users'),
    dir('C:/Documents and Settings/All Users/Documents', 'Documents'),
    dir('C:/Documents and Settings/User', 'User'),
    dir(DESKTOP, 'Desktop'),
    dir('C:/Documents and Settings/User/Favorites', 'Favorites'),
    dir(START_MENU, 'Start Menu'),
    dir(START_PROGRAMS, 'Programs'),

    // My Documents
    dir('C:/Documents and Settings/User/My Documents', 'My Documents'),
    dir('C:/Documents and Settings/User/My Documents/My Music', 'My Music'),
    dir('C:/Documents and Settings/User/My Documents/My Pictures', 'My Pictures'),
    dir('C:/Documents and Settings/User/My Documents/My Videos', 'My Videos'),

    // Shared Documents
    dir('C:/Documents and Settings/All Users/Shared Documents', 'Shared Documents'),
    dir('C:/Documents and Settings/All Users/Shared Documents/Shared Music', 'Shared Music'),
    dir('C:/Documents and Settings/All Users/Shared Documents/Shared Pictures', 'Shared Pictures'),

    // Program Files
    dir('C:/Program Files', 'Program Files'),
    dir('C:/Program Files/Common Files', 'Common Files'),
    dir('C:/Program Files/Internet Explorer', 'Internet Explorer'),
    dir('C:/Program Files/Windows Media Player', 'Windows Media Player'),
    dir('C:/Program Files/Windows NT', 'Windows NT'),

    // WINDOWS
    dir('C:/WINDOWS', 'WINDOWS'),
    dir('C:/WINDOWS/Fonts', 'Fonts'),
    dir('C:/WINDOWS/Help', 'Help'),
    dir('C:/WINDOWS/Media', 'Media'),
    dir('C:/WINDOWS/system32', 'system32'),
    dir('C:/WINDOWS/Temp', 'Temp'),

    // ── Desktop shortcuts ──
    shortcut(`${DESKTOP}/Internet Explorer.lnk`, 'Internet Explorer.lnk', 'Internet Explorer'),
    shortcut(`${DESKTOP}/Minesweeper.lnk`, 'Minesweeper.lnk', 'Minesweeper'),
    shortcut(`${DESKTOP}/My Computer.lnk`, 'My Computer.lnk', 'My Computer'),
    shortcut(`${DESKTOP}/Notepad.lnk`, 'Notepad.lnk', 'Notepad'),
    shortcut(`${DESKTOP}/Winamp.lnk`, 'Winamp.lnk', 'Winamp'),
    shortcut(`${DESKTOP}/Paint.lnk`, 'Paint.lnk', 'Paint'),
    shortcut(`${DESKTOP}/aduncan.dev Tour.lnk`, 'aduncan.dev Tour.lnk', 'AboutMe'),
    shortcut(`${DESKTOP}/Voltorb Flip.lnk`, 'Voltorb Flip.lnk', 'VoltorbFlip'),
    shortcut(`${DESKTOP}/3D Pinball.lnk`, '3D Pinball.lnk', 'Pinball'),
    shortcut(`${DESKTOP}/PictoChat.lnk`, 'PictoChat.lnk', 'PictoChat'),
    shortcut(`${DESKTOP}/Recycle Bin.lnk`, 'Recycle Bin.lnk', 'RecycleBin'),
    shortcut(`${DESKTOP}/Easter Egg.lnk`, 'Easter Egg.lnk', 'Egg'),
    shortcut(`${DESKTOP}/Media Player.lnk`, 'Media Player.lnk', 'MediaPlayer'),

    // ── Start Menu shortcuts ──
    // Top-level quick-access items
    shortcut(`${START_MENU}/Internet Explorer.lnk`, 'Internet Explorer.lnk', 'Internet Explorer'),
    shortcut(`${START_MENU}/Notepad.lnk`, 'Notepad.lnk', 'Notepad'),
    shortcut(`${START_MENU}/Winamp.lnk`, 'Winamp.lnk', 'Winamp'),
    shortcut(`${START_MENU}/Paint.lnk`, 'Paint.lnk', 'Paint'),
    shortcut(`${START_MENU}/Media Player.lnk`, 'Media Player.lnk', 'MediaPlayer'),
    shortcut(`${START_MENU}/PictoChat.lnk`, 'PictoChat.lnk', 'PictoChat'),

    // Programs menu
    dir(`${START_PROGRAMS}/Accessories`, 'Accessories'),
    dir(`${START_PROGRAMS}/Games`, 'Games'),
    dir(`${START_PROGRAMS}/Startup`, 'Startup'),
    shortcut(`${START_PROGRAMS}/Internet Explorer.lnk`, 'Internet Explorer.lnk', 'Internet Explorer'),
    shortcut(`${START_PROGRAMS}/Winamp.lnk`, 'Winamp.lnk', 'Winamp'),
    shortcut(`${START_PROGRAMS}/Media Player.lnk`, 'Media Player.lnk', 'MediaPlayer'),

    // Accessories
    shortcut(`${START_PROGRAMS}/Accessories/Notepad.lnk`, 'Notepad.lnk', 'Notepad'),
    shortcut(`${START_PROGRAMS}/Accessories/Paint.lnk`, 'Paint.lnk', 'Paint'),
    shortcut(`${START_PROGRAMS}/Accessories/PictoChat.lnk`, 'PictoChat.lnk', 'PictoChat'),

    // Games
    shortcut(`${START_PROGRAMS}/Games/Minesweeper.lnk`, 'Minesweeper.lnk', 'Minesweeper'),
    shortcut(`${START_PROGRAMS}/Games/Voltorb Flip.lnk`, 'Voltorb Flip.lnk', 'VoltorbFlip'),
    shortcut(`${START_PROGRAMS}/Games/3D Pinball.lnk`, '3D Pinball.lnk', 'Pinball'),

    // Sample files in My Documents
    file(
      'C:/Documents and Settings/User/My Documents/welcome.txt',
      'welcome.txt',
      'Welcome to Windows XP!\r\n\r\n' +
        'This is your virtual file system. You can create, edit,\r\n' +
        'and organize files just like a real computer.\r\n\r\n' +
        'Try opening this file in Notepad to edit it!',
    ),
    file(
      'C:/Documents and Settings/User/My Documents/readme.txt',
      'readme.txt',
      'My Documents\r\n' +
        '============\r\n\r\n' +
        'This folder contains your personal documents.\r\n' +
        'Use My Computer to browse and manage your files.',
    ),
  ];

  const map = new Map();
  for (const node of entries) {
    map.set(node.path, node);
  }
  return map;
}

/**
 * Virtual "special folder" paths that map to real VFS paths.
 */
export const SPECIAL_FOLDERS = {
  'My Documents': 'C:/Documents and Settings/User/My Documents',
  'Shared Documents': 'C:/Documents and Settings/All Users/Shared Documents',
  'Desktop': DESKTOP,
  'Recycle Bin': 'C:/RECYCLER',
  'Start Menu': START_MENU,
  'Start Menu Programs': START_PROGRAMS,
};
