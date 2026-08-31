// The shell's registry of file-type knowledge: what each file type is
// called (the XP "Type" column) and how node names display — which
// registered extensions get hidden and where the shell overrides the
// on-disk name.
import { getExtension } from '../../context/vfsUtils';
import { FILE_ASSOCIATIONS } from '../../context/vfsConstants';
import { getArt } from '../../xpArt';
import ieOpenIcon from 'assets/windowsIcons/ie-paper.png';
import paintOpenIcon from 'assets/windowsIcons/680(16x16).png';
import notepadOpenIcon from 'assets/windowsIcons/327(16x16).png';
import wordpadOpenIcon from 'assets/windowsIcons/153(16x16).png';
import wmpOpenIcon from 'assets/windowsIcons/846(16x16).png';

const shimgvwIcon = getArt('Slideshow', paintOpenIcon);

/** Friendly type labels by extension (XP "Type" column). */
const EXT_TYPE_LABELS = {
  '.txt': 'Text Document',
  '.log': 'Text Document',
  '.ini': 'Configuration Settings',
  '.cfg': 'Configuration Settings',
  '.html': 'HTML Document',
  '.htm': 'HTML Document',
  '.url': 'Internet Shortcut',
  '.bmp': 'Bitmap Image',
  '.png': 'PNG Image',
  '.jpg': 'JPEG Image',
  '.jpeg': 'JPEG Image',
  '.gif': 'GIF Image',
  '.wav': 'Wave Sound',
  '.mp3': 'MP3 Format Sound',
  '.ogg': 'OGG Audio File',
  '.mp4': 'Video Clip',
  '.webm': 'Video Clip',
  '.avi': 'Video Clip',
  '.exe': 'Application',
  '.dll': 'Application Extension',
  '.sys': 'System file',
  '.ocx': 'ActiveX Control',
  '.zip': 'Compressed (zipped) Folder',
  '.pdf': 'PDF Document',
};

/** Registered ("known") extensions — XP hides these when HideFileExt is on. */
const KNOWN_EXTENSIONS = new Set([
  ...Object.keys(EXT_TYPE_LABELS),
  ...Object.keys(FILE_ASSOCIATIONS),
  '.lnk',
]);

/**
 * The extension XP hides from a node's displayed name, in its original
 * casing ('' when nothing is hidden). Only files and shortcuts with a
 * registered extension hide it; folders and drives never do.
 */
export function hiddenExtension(node, hideExt) {
  if (!hideExt || !node || !node.name) return '';
  if (node.type !== 'file' && node.type !== 'shortcut') return '';
  const ext = getExtension(node.name);
  if (!ext || !KNOWN_EXTENSIONS.has(ext)) return '';
  return node.name.slice(node.name.length - ext.length);
}

// The All Users media folders sit on disk as "My Music" and friends but the
// shell labels them "Shared ...", the same trick their desktop.ini pulls.
const SHARED_MEDIA_NAMES = [
  [
    /^C:\/Documents and Settings\/All Users\/Documents\/My Music$/i,
    'Shared Music',
  ],
  [
    /^C:\/Documents and Settings\/All Users\/Documents\/My Pictures$/i,
    'Shared Pictures',
  ],
  [
    /^C:\/Documents and Settings\/All Users\/Documents\/My Videos$/i,
    'Shared Video',
  ],
];

/** The shell's own label for a node, where it overrides the on-disk name. */
export function shellDisplayName(node) {
  if (!node || node.type !== 'folder' || !node.path) return null;
  for (const [pattern, label] of SHARED_MEDIA_NAMES) {
    if (pattern.test(node.path)) return label;
  }
  return null;
}

/** Name as Explorer displays it: known extensions stripped when hidden. */
export function displayName(node, hideExt) {
  if (!node) return '';
  const shell = shellDisplayName(node);
  if (shell) return shell;
  const name = node.displayName || node.name;
  const ext = hiddenExtension(node, hideExt);
  return ext && name === node.name ? name.slice(0, -ext.length) : name;
}

export function getTypeLabel(node) {
  if (!node) return 'System Folder';
  switch (node.type) {
    case 'folder':
      return 'File Folder';
    case 'drive':
      return node.fileSystemType === 'CDFS' ? 'CD Drive' : 'Local Disk';
    case 'shortcut':
      return 'Shortcut';
    case 'file': {
      const ext = getExtension(node.path);
      if (EXT_TYPE_LABELS[ext]) return EXT_TYPE_LABELS[ext];
      if (ext) return `${ext.slice(1).toUpperCase()} File`;
      return 'File';
    }
    default:
      return 'System Folder';
  }
}

// --- Open With candidates ------------------------------------------------
// The programs XP's "Open With >" submenu offered per type: the handlers
// that can genuinely open the file, default first. Icons ride along so menu
// builders stay free of the program registry (importing it from here would
// cycle: apps/index.jsx already imports Explorer).

const VIEWER = {
  exePath: 'C:/WINDOWS/system32/shimgvw.dll',
  label: 'Windows Picture and Fax Viewer',
  icon: shimgvwIcon,
};
const IE = {
  exePath: 'C:/Program Files/Internet Explorer/iexplore.exe',
  label: 'Internet Explorer',
  icon: ieOpenIcon,
};
const PAINT = {
  exePath: 'C:/WINDOWS/system32/mspaint.exe',
  label: 'Paint',
  icon: paintOpenIcon,
};
const NOTEPAD = {
  exePath: 'C:/WINDOWS/system32/notepad.exe',
  label: 'Notepad',
  icon: notepadOpenIcon,
};
const WORDPAD = {
  exePath: 'C:/Program Files/Windows NT/Accessories/wordpad.exe',
  label: 'WordPad',
  icon: wordpadOpenIcon,
};
const WMP = {
  exePath: 'C:/Program Files/Windows Media Player/wmplayer.exe',
  label: 'Windows Media Player',
  icon: wmpOpenIcon,
};

export const IMAGE_EXTS = /\.(bmp|png|jpe?g|gif|tiff?|ico)$/i;

/** Ordered "Open With >" entries for a file name, or [] when unknown. */
export function openWithChoicesFor(name) {
  const n = String(name || '');
  if (IMAGE_EXTS.test(n)) return [VIEWER, IE, PAINT];
  if (/\.(txt|log|ini|cfg|bat)$/i.test(n)) return [NOTEPAD, WORDPAD];
  if (/\.(rtf|doc)$/i.test(n)) return [WORDPAD, NOTEPAD];
  if (/\.(html?|url)$/i.test(n)) return [IE, NOTEPAD];
  if (/\.(wav|mp3|ogg|mp4|webm|avi|m3u)$/i.test(n)) return [WMP];
  return [];
}
