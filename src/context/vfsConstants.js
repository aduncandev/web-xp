// VFS constants: file associations, special folder paths, icon mappings

// --- Icons (16x16) ---
import folderIcon from 'assets/windowsIcons/318(16x16).png';
import zipIcon from 'assets/windowsIcons/zipfldr(16x16).png';
import zipIconLarge from 'assets/windowsIcons/zipfldr(32x32).png';
import folderIconLarge from 'assets/windowsIcons/318(32x32).png';
import folderIcon48 from 'assets/windowsIcons/318(48x48).png';
import documentIcon from 'assets/windowsIcons/308(16x16).png';
import documentIconLarge from 'assets/windowsIcons/308(32x32).png';
import computerIcon from 'assets/windowsIcons/676(16x16).png';
import computerIconLarge from 'assets/windowsIcons/676(32x32).png';
import diskIcon from 'assets/windowsIcons/334(32x32).png';
import diskIcon48 from 'assets/windowsIcons/334(48x48).png';
import cdIcon from 'assets/windowsIcons/111(32x32).png';
import cdIcon48 from 'assets/windowsIcons/111(48x48).png';
import notepadIcon from 'assets/windowsIcons/327(16x16).png';
import notepadIconLarge from 'assets/windowsIcons/327(32x32).png';
import paintIcon from 'assets/windowsIcons/680(16x16).png';
import paintIconLarge from 'assets/windowsIcons/680(32x32).png';
import ieIcon from 'assets/windowsIcons/896(16x16).png';
import mediaIcon from 'assets/windowsIcons/846(16x16).png';
import mediaIconLarge from 'assets/windowsIcons/846(32x32).png';
import wordPadIcon from 'assets/windowsIcons/153(16x16).png';
import applicationIconDrawn from 'assets/windowsIcons/application.svg';
import dllIconDrawn from 'assets/windowsIcons/dll.svg';
import { getArt } from '../xpArt';

import { getExtension } from './vfsUtils';
import { getCurrentUserName, listUsers } from './users';

// Real shell32 icons win when dropped into src/assets/xp/
const applicationIcon = getArt('application', applicationIconDrawn);
const dllIcon = getArt('dll', dllIconDrawn);
// Unknown/generic file icon — reuse the document icon
const unknownIcon = documentIcon;

// --- Well-known paths ---

export const DOCS_AND_SETTINGS = 'C:/Documents and Settings';

/**
 * The active user's profile root. Before anyone is logged in it falls back
 * to the first registered account (or the legacy 'Skillz' name) so path
 * reads never crash.
 */
export function getProfileRoot() {
  const current = getCurrentUserName();
  if (current) return `${DOCS_AND_SETTINGS}/${current}`;
  const first = listUsers()[0];
  return `${DOCS_AND_SETTINGS}/${first ? first.name : 'Skillz'}`;
}

/** Profile root for a specific account (seeding, Control Panel). */
export function getProfileRootFor(userName) {
  return `${DOCS_AND_SETTINGS}/${userName}`;
}

// User-scoped entries are getters so every read resolves against the
// CURRENT user; machine-wide entries stay static strings. Do not capture
// these at module scope — always read at call time.
export const SPECIAL_FOLDERS = {
  get DESKTOP() {
    return `${getProfileRoot()}/Desktop`;
  },
  get MY_DOCUMENTS() {
    return `${getProfileRoot()}/My Documents`;
  },
  get MY_MUSIC() {
    return `${getProfileRoot()}/My Documents/My Music`;
  },
  get MY_PICTURES() {
    return `${getProfileRoot()}/My Documents/My Pictures`;
  },
  get MY_VIDEOS() {
    return `${getProfileRoot()}/My Documents/My Videos`;
  },
  get START_MENU() {
    return `${getProfileRoot()}/Start Menu`;
  },
  get PROGRAMS() {
    return `${getProfileRoot()}/Start Menu/Programs`;
  },
  get FAVORITES() {
    return `${getProfileRoot()}/Favorites`;
  },
  get TEMP() {
    return `${getProfileRoot()}/Local Settings/Temp`;
  },
  PROGRAM_FILES: 'C:/Program Files',
  WINDOWS: 'C:/WINDOWS',
  SYSTEM32: 'C:/WINDOWS/system32',
  RECYCLER: 'C:/RECYCLER',
};

/**
 * Canonical install locations of every runnable program. The registry in
 * WinXP/apps/index.jsx binds React components to these paths; the seeder
 * (vfsDefaults) creates the actual .exe nodes; the shell launches programs
 * by resolving these paths through the VFS.
 */
export const EXE_PATHS = {
  NOTEPAD: 'C:/WINDOWS/system32/notepad.exe',
  MSPAINT: 'C:/WINDOWS/system32/mspaint.exe',
  // Windows Picture and Fax Viewer — really a shimgvw.dll entry point that
  // the shell launches through rundll32; a plain exe node here.
  SHIMGVW: 'C:/WINDOWS/system32/shimgvw.dll',
  // Compressed (zipped) Folders — a shell extension rather than a program,
  // which is why a .zip opens "in Explorer" and not in an application.
  ZIPFLDR: 'C:/WINDOWS/system32/zipfldr.dll',
  WINMINE: 'C:/WINDOWS/system32/winmine.exe',
  CMD: 'C:/WINDOWS/system32/cmd.exe',
  // The egg. 'room_man' is the internal name of DELTARUNE's hidden room,
  // an orphan binary that answers nothing about itself — kept with the
  // other joke programs on the D: "CD", hidden.
  MISSINGNO: 'D:/ROOM_MAN.exe',
  EXPLORER: 'C:/WINDOWS/explorer.exe',
  IEXPLORE: 'C:/Program Files/Internet Explorer/iexplore.exe',
  WMPLAYER: 'C:/Program Files/Windows Media Player/wmplayer.exe',
  // XP shipped its previous-generation player alongside the new one;
  // mplayer2.exe is where it lived.
  MPLAYER2: 'C:/Program Files/Windows Media Player/mplayer2.exe',
  WINAMP: 'C:/Program Files/Winamp/winamp.exe',
  PINBALL: 'C:/Program Files/Windows NT/Pinball/pinball.exe',
  PICTOCHAT: 'C:/Program Files/PictoChat/pictochat.exe',
  VOLTORB: 'C:/Program Files/Voltorb Flip/voltorbflip.exe',
  TOUR: 'C:/Program Files/webxp.net/tour.exe',
  // A third-party tagger, the way anyone with a music folder ended up
  // installing one — XP itself could only edit tags a file at a time.
  TAGEDITOR: 'C:/Program Files/Media Tag Editor/tageditor.exe',
  // A loving recreation of skillzdev.xyz's old 404 page — tucked away on
  // the otherwise-unused D: drive, no desktop shortcut.
  DOGVIRUS: 'D:/dogvirus.exe',
  // The individual dog windows the virus spawns; internal, launched only
  // by dogvirus.exe. Hidden next to it on D:.
  DOGWINDOW: 'D:/dogwindow.exe',
  // NSMB-MarioVsLuigi — ipodtouch0218's fan remake, a shop title (never
  // seeded by default; the store creates this exe on install).
  MVL: 'C:/Program Files/Mario vs Luigi/mariovsluigi.exe',
  // DELTASCEND — our chapter 5 wall-climb fan recreation with a seeded
  // wall generator; a shop title like MVL, created on install.
  DELTASCEND: 'C:/Program Files/DELTASCEND/deltascend.exe',
  // The app store — add/remove non-stock apps to keep the base lean.
  STORE: 'C:/Program Files/Store/store.exe',
  // The guest book. The only program here that talks to a server of its own
  // (server/guestbook), which is why it lives under the site's own folder
  // rather than pretending to be something Microsoft shipped.
  GUESTBOOK: 'C:/Program Files/webxp.net/guestbook.exe',
};

/** Extensions the shell treats as launchable. */
export const EXECUTABLE_EXTENSIONS = ['.exe', '.cpl', '.msc', '.com', '.scr'];

export function isExecutablePath(path) {
  return EXECUTABLE_EXTENSIONS.includes(getExtension(path));
}

// --- File extension → opening program ---
// exePath is the program the shell launches (with { filePath }); appName is
// the friendly product name shown in Properties' "Opens with:" line.
const notepadAssoc = {
  exePath: EXE_PATHS.NOTEPAD,
  appName: 'Notepad',
  icon: notepadIcon,
  iconLarge: notepadIconLarge,
};
const ieAssoc = {
  exePath: EXE_PATHS.IEXPLORE,
  appName: 'Internet Explorer',
  icon: ieIcon,
  iconLarge: ieIcon,
};
// Paint is the "Edit" verb for pictures, not the default open handler
export const paintAssoc = {
  exePath: EXE_PATHS.MSPAINT,
  appName: 'Paint',
  icon: paintIcon,
  iconLarge: paintIconLarge,
};
const mediaAssoc = {
  exePath: EXE_PATHS.WMPLAYER,
  appName: 'Windows Media Player',
  icon: mediaIcon,
  iconLarge: mediaIconLarge,
};
// XP's default handler for pictures is the viewer, not Paint — Paint is the
// "Edit" verb. Each format keeps its own shell icon.
const picture = art => ({
  exePath: EXE_PATHS.SHIMGVW,
  appName: 'Windows Picture and Fax Viewer',
  icon: getArt(art, paintIcon),
  iconLarge: getArt(art, paintIconLarge),
});
const bmpAssoc = picture('Bitmap');
const jpgAssoc = picture('JPG');
const gifAssoc = picture('GIF');
const tiffAssoc = picture('TIFF');
const wordPadAssoc = {
  exePath: 'C:/Program Files/Windows NT/Accessories/wordpad.exe',
  appName: 'WordPad',
  icon: wordPadIcon,
  iconLarge: wordPadIcon,
};

export const FILE_ASSOCIATIONS = {
  '.rtf': wordPadAssoc,
  '.doc': wordPadAssoc,
  '.txt': notepadAssoc,
  '.log': notepadAssoc,
  '.ini': notepadAssoc,
  '.cfg': notepadAssoc,
  '.bat': notepadAssoc,
  '.html': ieAssoc,
  '.htm': ieAssoc,
  '.url': ieAssoc,
  '.bmp': bmpAssoc,
  '.png': bmpAssoc,
  '.jpg': jpgAssoc,
  '.jpeg': jpgAssoc,
  '.gif': gifAssoc,
  '.tif': tiffAssoc,
  '.tiff': tiffAssoc,
  '.ico': bmpAssoc,
  '.wav': mediaAssoc,
  '.mp3': mediaAssoc,
  '.ogg': mediaAssoc,
  '.mp4': mediaAssoc,
  '.webm': mediaAssoc,
  '.avi': mediaAssoc,
  // playlists open in the player and load as the Now Playing list
  '.m3u': { ...mediaAssoc, typeName: 'Playlist' },
  '.zip': {
    exePath: EXE_PATHS.ZIPFLDR,
    appName: 'Compressed (zipped) Folders',
    icon: zipIcon,
    iconLarge: zipIconLarge,
  },
};

// --- Icon helpers ---
export { folderIcon, folderIconLarge, folderIcon48 };
export { documentIcon, documentIconLarge };
export { computerIcon, computerIconLarge };
export { diskIcon, diskIcon48, cdIcon, cdIcon48 };

// --- Shell folders with their own icons ---
// Only the registered per-profile (and All Users) paths are special; a folder
// the user happens to name "My Music" elsewhere stays a plain folder, exactly
// as the real shell treats it.
const shellFolder = (icon, iconLarge) => ({ icon, iconLarge });
const SHELL_FOLDER_ICONS = [
  [
    /^C:\/Documents and Settings\/[^/]+\/Desktop$/i,
    () =>
      shellFolder(
        getArt('Desktop16', getArt('Desktop', folderIcon)),
        getArt('Desktop', folderIconLarge),
      ),
  ],
  [
    /^C:\/Documents and Settings\/[^/]+\/My Documents$/i,
    () =>
      shellFolder(
        getArt('MyDocuments16', getArt('MyDocuments', folderIcon)),
        getArt('MyDocuments', folderIconLarge),
      ),
  ],
  [
    /^C:\/Documents and Settings\/[^/]+\/(My )?Documents\/My Music$/i,
    () =>
      shellFolder(
        getArt('MyMusic16', getArt('MyMusic', folderIcon)),
        getArt('MyMusic', folderIconLarge),
      ),
  ],
  [
    /^C:\/Documents and Settings\/[^/]+\/(My )?Documents\/My Pictures$/i,
    () =>
      shellFolder(
        getArt('MyPictures16', getArt('MyPictures', folderIcon)),
        getArt('MyPictures', folderIconLarge),
      ),
  ],
  [
    /^C:\/Documents and Settings\/[^/]+\/(My )?Documents\/My Videos$/i,
    () =>
      shellFolder(
        getArt('MyVideos16', getArt('MyVideos', folderIcon)),
        getArt('MyVideos', folderIconLarge),
      ),
  ],
  [
    /^C:\/Documents and Settings\/All Users\/Documents$/i,
    () =>
      shellFolder(
        getArt('SharedFolder16', getArt('SharedFolder', folderIcon)),
        getArt('SharedFolder', folderIconLarge),
      ),
  ],
];

function shellFolderIcons(path) {
  for (const [pattern, make] of SHELL_FOLDER_ICONS) {
    if (pattern.test(path)) return make();
  }
  return null;
}

/** Get { icon, iconLarge } for a FileNode based on type and extension. */
export function getIconsForNode(node) {
  if (!node) return { icon: unknownIcon, iconLarge: unknownIcon };

  // A stable custom icon (e.g. an album folder wearing its cover art)
  // outranks the type-derived defaults
  if (node.customIcon && node.icon) {
    return { icon: node.icon, iconLarge: node.iconLarge || node.icon };
  }
  switch (node.type) {
    case 'folder': {
      const special = shellFolderIcons(node.path);
      if (special) return special;
      return { icon: folderIcon, iconLarge: folderIconLarge };
    }
    case 'drive':
      if (node.fileSystemType === 'CDFS') {
        return { icon: cdIcon, iconLarge: cdIcon48 };
      }
      return { icon: diskIcon, iconLarge: diskIcon48 };
    case 'shortcut':
      // Shortcuts keep their own icon (set at creation time)
      return { icon: node.icon, iconLarge: node.iconLarge };
    case 'special':
      return { icon: node.icon, iconLarge: node.iconLarge };
    case 'file': {
      const ext = getExtension(node.path);
      if (EXECUTABLE_EXTENSIONS.includes(ext)) {
        return { icon: applicationIcon, iconLarge: applicationIcon };
      }
      if (ext === '.dll' || ext === '.sys' || ext === '.ocx') {
        return { icon: dllIcon, iconLarge: dllIcon };
      }
      const assoc = FILE_ASSOCIATIONS[ext];
      if (assoc) return { icon: assoc.icon, iconLarge: assoc.iconLarge };
      return { icon: documentIcon, iconLarge: documentIconLarge };
    }
    default:
      return { icon: unknownIcon, iconLarge: unknownIcon };
  }
}

/** Get the associated app name for a file path by extension. */
export function getFileAssociation(pathOrExt) {
  const ext = pathOrExt.startsWith('.')
    ? pathOrExt.toLowerCase()
    : getExtension(pathOrExt);
  return FILE_ASSOCIATIONS[ext] || null;
}
