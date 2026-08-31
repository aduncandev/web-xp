// Default VFS filesystem — seeded on first visit (IDB empty)

import {
  documentIcon,
  documentIconLarge,
  getIconsForNode,
  SPECIAL_FOLDERS,
  EXE_PATHS,
  getProfileRootFor,
  DOCS_AND_SETTINGS,
} from './vfsConstants';
import { guessMimeType } from './vfsUtils';

import recycleEmptyDrawn from 'assets/windowsIcons/recycle-empty.svg';
import { getArt } from '../xpArt';
import { PRIVACY_FULL } from '../privacyNotice';

// --- Desktop shortcut icons (large, matching original defaultIconState) ---
import ieDesktop from 'assets/windowsIcons/ie.png';
import mineDesktop from 'assets/minesweeper/mine-icon.png';
import computerDesktop from 'assets/windowsIcons/676(32x32).png';
import notepadDesktop from 'assets/windowsIcons/327(32x32).png';
import winampDesktop from 'assets/windowsIcons/winamp.png';
import paintDesktop from 'assets/windowsIcons/680(32x32).png';
import aboutMeDesktop from 'assets/windowsIcons/touricon.png';
import voltorbDesktop from 'assets/windowsIcons/voltorb.png';
import pinballDesktop from 'assets/windowsIcons/pinball.png';
import pictochatDesktop from 'assets/windowsIcons/pictochat.png';
import eggDesktop from 'assets/windowsIcons/tree.gif';
import mediaDesktop from 'assets/windowsIcons/846(32x32).png';
import guestBookDesktop from 'assets/windowsIcons/ie-book.png';

// --- Small icons (16x16) ---
import iePaper from 'assets/windowsIcons/ie-paper.png';
import computerSmall from 'assets/windowsIcons/676(16x16).png';
import notepadSmall from 'assets/windowsIcons/327(16x16).png';
import paintSmall from 'assets/windowsIcons/680(16x16).png';
import mediaSmall from 'assets/windowsIcons/846(16x16).png';
// SHELL32 icon 2 — what the shell gives an executable that carries no
// icon of its own, which is exactly what a small utility looks like.
import genericAppIcon from 'assets/windowsIcons/shell32-2(16x16).png';
import zipSmallIcon from 'assets/windowsIcons/zipfldr(16x16).png';
import zipLargeIcon from 'assets/windowsIcons/zipfldr(32x32).png';
import genericAppIconLarge from 'assets/windowsIcons/shell32-2(32x32).png';
import dogVirusGif from 'assets/dogvirus/undertale-annoying.gif';
import storeBag from 'assets/store/bag.gif';
import mvlIcon from 'assets/windowsIcons/mariovsluigi.png';
import climbRaceIcon from 'assets/windowsIcons/climbrace.gif';

// --- Start Menu icons (16x16) ---
import accessIcon from 'assets/windowsIcons/227(16x16).png';
import catalogIcon from 'assets/windowsIcons/392(16x16).png';
import updateIcon from 'assets/windowsIcons/322(16x16).png';
import menuIcon from 'assets/windowsIcons/358(16x16).png';
import accessibilityIcon from 'assets/windowsIcons/238(16x16).png';
import magnifierIcon from 'assets/windowsIcons/817(16x16).png';
import narratorIcon from 'assets/windowsIcons/narrator.ico';
import keyboardIcon from 'assets/windowsIcons/58(16x16).png';
import utilityIcon from 'assets/windowsIcons/119(16x16).png';
import hyperCmdIcon from 'assets/windowsIcons/669(16x16).png';
import networkConnectionIcon from 'assets/windowsIcons/404(16x16).png';
import networkSetupIcon from 'assets/windowsIcons/664(16x16).png';
import connectionWizardIcon from 'assets/windowsIcons/663(16x16).png';
import wirelessIcon from 'assets/windowsIcons/234(16x16).png';
import soundIcon from 'assets/windowsIcons/690(16x16).png';
import volumeIcon from 'assets/windowsIcons/120(16x16).png';
import backupIcon from 'assets/windowsIcons/23(16x16).png';
import charMapIcon from 'assets/windowsIcons/127(16x16).png';
import cleanDiskIcon from 'assets/windowsIcons/128(16x16).png';
import defragIcon from 'assets/windowsIcons/374(16x16).png';
import transferIcon from 'assets/windowsIcons/367(16x16).png';
import recentIcon from 'assets/windowsIcons/716(16x16).png';
import securityIcon from 'assets/windowsIcons/214(16x16).png';
import infoIcon from 'assets/windowsIcons/505(16x16).png';
import restoreIcon from 'assets/windowsIcons/restore.ico';
import addressIcon from 'assets/windowsIcons/554(16x16).png';
import cmdIcon from 'assets/windowsIcons/56(16x16).png';
import calcIcon from 'assets/windowsIcons/74(16x16).png';
import compatIcon from 'assets/windowsIcons/747(16x16).png';
import rdpIcon from 'assets/windowsIcons/rdp.png';
import syncIcon from 'assets/windowsIcons/182(16x16).png';
import tourIcon from 'assets/windowsIcons/853(32x32).png';
import winExplorerIcon from 'assets/windowsIcons/156(16x16).png';
import wordPadIcon from 'assets/windowsIcons/153(16x16).png';
import freecellIcon from 'assets/windowsIcons/freecell.png';
import heartIcon from 'assets/windowsIcons/heart.png';
import backgammonIcon from 'assets/windowsIcons/892(16x16).png';
import checkerIcon from 'assets/windowsIcons/891(16x16).png';
import onlineHeartIcon from 'assets/windowsIcons/890(16x16).png';
import reversiIcon from 'assets/windowsIcons/889(16x16).png';
import spadeIcon from 'assets/windowsIcons/888(16x16).png';
import solitaireIcon from 'assets/windowsIcons/solitaire.png';
import spiderIcon from 'assets/windowsIcons/spider.png';
import ieSmallIcon from 'assets/windowsIcons/896(16x16).png';
import outlookIcon from 'assets/windowsIcons/887(16x16).png';
import messengerIcon from 'assets/windowsIcons/msn.png';
import movieMakerIcon from 'assets/windowsIcons/894(16x16).png';

// Real shell32 recycle-bin icon wins when dropped into src/assets/xp/
const recycleEmptyIcon = getArt('recycle-empty', recycleEmptyDrawn);

// Timestamp for all default entries
const EPOCH = new Date('2024-08-24T00:00:00').getTime();

// Machine-wide roots only — these SPECIAL_FOLDERS entries are static.
// User-scoped paths are derived per profile inside buildUserProfile().
const PROGRAM_FILES = SPECIAL_FOLDERS.PROGRAM_FILES;
const WINDOWS = SPECIAL_FOLDERS.WINDOWS;
const SYSTEM32 = SPECIAL_FOLDERS.SYSTEM32;
const RECYCLER = SPECIAL_FOLDERS.RECYCLER;

/**
 * Stable icon registry: nodes persist an `iconKey` string instead of relying
 * on bundled asset URLs (which change hash across rebuilds). Icons are
 * re-resolved from this registry every time the VFS loads.
 */
export const ICON_REGISTRY = {
  // Special / system
  computer: { icon: computerSmall, iconLarge: computerDesktop },
  'recycle-bin': { icon: recycleEmptyIcon, iconLarge: recycleEmptyIcon },
  // Folder styles
  'folder-docs': { icon: documentIcon, iconLarge: documentIconLarge },
  'menu-folder': { icon: menuIcon, iconLarge: menuIcon },
  // Desktop shortcuts (small 16px + large 32px pairs)
  'desk-ie': { icon: iePaper, iconLarge: ieDesktop },
  'desk-minesweeper': { icon: mineDesktop, iconLarge: mineDesktop },
  'desk-computer': { icon: computerSmall, iconLarge: computerDesktop },
  'desk-notepad': { icon: notepadSmall, iconLarge: notepadDesktop },
  'desk-winamp': { icon: winampDesktop, iconLarge: winampDesktop },
  'desk-paint': { icon: paintSmall, iconLarge: paintDesktop },
  'desk-aboutme': { icon: aboutMeDesktop, iconLarge: aboutMeDesktop },
  'desk-voltorb': { icon: voltorbDesktop, iconLarge: voltorbDesktop },
  'desk-pinball': { icon: pinballDesktop, iconLarge: pinballDesktop },
  'desk-pictochat': { icon: pictochatDesktop, iconLarge: pictochatDesktop },
  'desk-egg': { icon: eggDesktop, iconLarge: eggDesktop },
  'desk-media': { icon: mediaSmall, iconLarge: mediaDesktop },
  'desk-tageditor': { icon: genericAppIcon, iconLarge: genericAppIconLarge },
  'desk-guestbook': {
    icon: getArt('guestbook', guestBookDesktop),
    iconLarge: getArt('guestbook', guestBookDesktop),
  },
  'desk-store': { icon: storeBag, iconLarge: storeBag },
  'desk-mariovsluigi': { icon: mvlIcon, iconLarge: mvlIcon },
  'desk-deltascend': { icon: climbRaceIcon, iconLarge: climbRaceIcon },
  'desk-dogvirus': { icon: dogVirusGif, iconLarge: dogVirusGif },
  'desk-zip': { icon: zipSmallIcon, iconLarge: zipLargeIcon },
  // Start Menu (16px)
  'sm-access': { icon: accessIcon },
  'sm-catalog': { icon: catalogIcon },
  'sm-update': { icon: updateIcon },
  'sm-ie': { icon: ieSmallIcon },
  'sm-outlook': { icon: outlookIcon },
  'sm-aboutme': { icon: computerSmall },
  'sm-media': { icon: mediaSmall },
  'sm-tageditor': { icon: genericAppIcon },
  'sm-store': { icon: storeBag },
  'sm-messenger': { icon: messengerIcon },
  'sm-moviemaker': { icon: movieMakerIcon },
  'sm-accessibility': { icon: accessibilityIcon },
  'sm-magnifier': { icon: magnifierIcon },
  'sm-narrator': { icon: narratorIcon },
  'sm-keyboard': { icon: keyboardIcon },
  'sm-utility': { icon: utilityIcon },
  'sm-hyperterm': { icon: hyperCmdIcon },
  'sm-netconn': { icon: networkConnectionIcon },
  'sm-netsetup': { icon: networkSetupIcon },
  'sm-connwizard': { icon: connectionWizardIcon },
  'sm-wireless': { icon: wirelessIcon },
  'sm-sound': { icon: soundIcon },
  'sm-volume': { icon: volumeIcon },
  'sm-backup': { icon: backupIcon },
  'sm-charmap': { icon: charMapIcon },
  'sm-cleandisk': { icon: cleanDiskIcon },
  'sm-defrag': { icon: defragIcon },
  'sm-transfer': { icon: transferIcon },
  'sm-recent': { icon: recentIcon },
  'sm-security': { icon: securityIcon },
  'sm-sysinfo': { icon: infoIcon },
  'sm-restore': { icon: restoreIcon },
  'sm-address': { icon: addressIcon },
  'sm-cmd': { icon: cmdIcon },
  'sm-notepad': { icon: notepadSmall },
  'sm-paint': { icon: paintSmall },
  'sm-calc': { icon: calcIcon },
  'sm-compat': { icon: compatIcon },
  'sm-rdp': { icon: rdpIcon },
  'sm-sync': { icon: syncIcon },
  'sm-tour': { icon: tourIcon },
  'sm-winexplorer': { icon: winExplorerIcon },
  'sm-wordpad': { icon: wordPadIcon },
  'sm-freecell': { icon: freecellIcon },
  'sm-hearts': { icon: heartIcon },
  'sm-backgammon': { icon: backgammonIcon },
  'sm-checkers': { icon: checkerIcon },
  'sm-onlinehearts': { icon: onlineHeartIcon },
  'sm-reversi': { icon: reversiIcon },
  'sm-spades': { icon: spadeIcon },
  'sm-solitaire': { icon: solitaireIcon },
  'sm-spider': { icon: spiderIcon },
  'sm-mine': { icon: mineDesktop },
};

/**
 * Resolve the display icons for a node. Prefers the stable iconKey registry;
 * falls back to type/extension-derived icons. Used at load time to repair
 * icon URLs persisted from a previous build.
 */
export function resolveNodeIcons(node) {
  if (node.iconKey && ICON_REGISTRY[node.iconKey]) {
    const entry = ICON_REGISTRY[node.iconKey];
    return { icon: entry.icon, iconLarge: entry.iconLarge || entry.icon };
  }
  return getIconsForNode(node);
}

// --- Node factory helpers ---

function baseNode(path, type) {
  return {
    path,
    name: path.split('/').pop() || path.replace('/', ''),
    type,
    content: null,
    hasBinaryContent: false,
    blobId: null,
    sourceUrl: null,
    mimeType: null,
    size: 0,
    icon: null,
    iconLarge: null,
    iconKey: null,
    createdAt: EPOCH,
    modifiedAt: EPOCH,
    readOnly: false,
    system: false,
    hidden: false,
    target: null,
    targetArgs: null,
    driveLabel: null,
    fileSystemType: null,
    totalSpace: null,
    freeSpace: null,
    originalPath: null,
    deletedAt: null,
    specialFolder: null,
  };
}

function finishIcons(node) {
  const icons = resolveNodeIcons(node);
  node.icon = icons.icon;
  node.iconLarge = icons.iconLarge;
  return node;
}

function makeFolder(path, opts = {}) {
  const node = baseNode(path, 'folder');
  node.iconKey = opts.iconKey ?? null;
  node.readOnly = opts.readOnly ?? false;
  node.system = opts.system ?? false;
  node.hidden = opts.hidden ?? false;
  node.specialFolder = opts.specialFolder ?? null;
  return finishIcons(node);
}

function makeDrive(path, label, fsType, total, free) {
  const node = baseNode(path, 'drive');
  node.system = true;
  node.readOnly = fsType === 'CDFS';
  node.driveLabel = label;
  node.fileSystemType = fsType;
  node.totalSpace = total;
  node.freeSpace = free;
  return finishIcons(node);
}

function makeShortcut(path, target, iconKey, opts = {}) {
  const node = baseNode(path, 'shortcut');
  node.iconKey = iconKey;
  node.system = opts.system ?? false;
  node.hidden = opts.hidden ?? false;
  node.target = target;
  node.targetArgs = opts.targetArgs ?? null;
  return finishIcons(node);
}

function makeFile(path, content, opts = {}) {
  const node = baseNode(path, 'file');
  node.content = content ?? (opts.sourceUrl ? null : '');
  node.mimeType = opts.mimeType ?? guessMimeType(path);
  node.size = opts.sizeBytes ?? (content ? new Blob([content]).size : 0);
  node.sourceUrl = opts.sourceUrl ?? null;
  node.readOnly = opts.readOnly ?? false;
  node.hidden = opts.hidden ?? false;
  node.system = opts.system ?? false;
  return finishIcons(node);
}

function makeSpecial(name, specialFolder, iconKey) {
  const node = baseNode(name, 'special');
  node.iconKey = iconKey;
  node.readOnly = true;
  node.system = true;
  node.specialFolder = specialFolder;
  return finishIcons(node);
}

/** An executable (or other system binary): a real file node the shell can
 *  resolve and launch. Registered programs carry their own iconKey. */
function makeExe(path, sizeBytes, opts = {}) {
  const node = baseNode(path, 'file');
  node.size = sizeBytes;
  node.mimeType = 'application/x-msdownload';
  node.iconKey = opts.iconKey ?? null;
  node.system = opts.system ?? true;
  node.readOnly = opts.readOnly ?? true;
  node.hidden = opts.hidden ?? false;
  return finishIcons(node);
}

/** A binary system file (dll/sys/etc.) — browsable flavor, delete-guarded. */
function makeSystemFile(path, sizeBytes, opts = {}) {
  const node = baseNode(path, 'file');
  node.size = sizeBytes;
  node.content = opts.content ?? null;
  node.mimeType = guessMimeType(path) ?? 'application/octet-stream';
  node.system = true;
  node.readOnly = true;
  node.hidden = opts.hidden ?? false;
  return finishIcons(node);
}

// --- Bundled sample music (served from /public, so URLs are stable) ---

const MUSIC_FILES = [
  ['addiction.wav', 49.8],
  ['youwillknow.mp3', 3.9],
  // music1 / EternalDepthsOfHell / AudioWavesOfPainAndSuffering are
  // Aaron's own songs — sold in the shop as an album now, no longer
  // seeded free. Installs that already have them keep them.
  ['MIKEtheBOARDpleasey.wav', 20.4],
  ['man.ogg', 0.2],
  ['robocop.mp3', 2.8],
];

function makeMusicNodes(dirPath) {
  const base = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/music`;
  return MUSIC_FILES.map(([name, mb]) =>
    makeFile(`${dirPath}/${name}`, null, {
      sourceUrl: `${base}/${name}`,
      sizeBytes: Math.round(mb * 1024 * 1024),
    }),
  );
}

/** Paths for one user's profile, derived from the account name. */
function makeProfileCtx(name) {
  const root = getProfileRootFor(name);
  const MY_DOCUMENTS = `${root}/My Documents`;
  const START_MENU = `${root}/Start Menu`;
  return {
    root,
    DESKTOP: `${root}/Desktop`,
    MY_DOCUMENTS,
    MY_MUSIC: `${MY_DOCUMENTS}/My Music`,
    MY_PICTURES: `${MY_DOCUMENTS}/My Pictures`,
    MY_VIDEOS: `${MY_DOCUMENTS}/My Videos`,
    START_MENU,
    PROGRAMS: `${START_MENU}/Programs`,
    FAVORITES: `${root}/Favorites`,
  };
}

// --- Machine-wide filesystem: drives, shared profiles, WINDOWS, Program Files ---

function addMachineCore(add) {
  // Virtual/special nodes
  add(makeSpecial('My Computer', 'my-computer', 'computer'));
  add(makeSpecial('Recycle Bin', 'recycle-bin', 'recycle-bin'));

  // Drives
  add(makeDrive('C:/', 'Local Disk', 'NTFS', 40 * 1024 ** 3, 32 * 1024 ** 3));
  add(makeDrive('D:/', 'CD Drive', 'CDFS', 650 * 1024 ** 2, 0));

  // C:/ top-level folders
  add(makeFolder('C:/Documents and Settings', { system: true }));
  add(makeFolder('C:/Program Files', { system: true }));
  add(makeFolder('C:/WINDOWS', { system: true }));
  add(makeFolder(SYSTEM32, { system: true }));
  // Where XP really kept its wallpapers — browsable JPGs, so pickers that
  // roam the filesystem ("Browse for more pictures...") find real images
  add(makeFolder('C:/WINDOWS/Web', { system: true }));
  add(makeFolder('C:/WINDOWS/Web/Wallpaper', { system: true }));
  add(
    makeFile('C:/WINDOWS/Web/Wallpaper/Bliss.jpg', null, {
      sourceUrl: `${import.meta.env.BASE_URL.replace(
        /\/$/,
        '',
      )}/wallpaper/Bliss.jpg`,
      sizeBytes: 674 * 1024,
      system: true,
    }),
  );
  add(makeFolder(RECYCLER, { system: true, hidden: true }));

  // C:/ system files
  add(
    makeSystemFile('C:/boot.ini', 211, {
      hidden: true,
      content:
        '[boot loader]\r\ntimeout=30\r\ndefault=multi(0)disk(0)rdisk(0)partition(1)\\WINDOWS\r\n[operating systems]\r\nmulti(0)disk(0)rdisk(0)partition(1)\\WINDOWS="Microsoft Windows XP Professional" /noexecute=optin /fastdetect',
    }),
  );
  add(makeSystemFile('C:/ntldr', 250032, { hidden: true }));
  add(makeSystemFile('C:/NTDETECT.COM', 47564, { hidden: true }));
  add(makeSystemFile('C:/pagefile.sys', 402653184, { hidden: true }));

  // All Users profile (Shared Documents)
  add(makeFolder('C:/Documents and Settings/All Users', { system: true }));
  add(
    makeFolder('C:/Documents and Settings/All Users/Documents', {
      iconKey: 'folder-docs',
      system: true,
    }),
  );
  add(makeFolder('C:/Documents and Settings/All Users/Documents/My Music'));
  add(makeFolder('C:/Documents and Settings/All Users/Documents/My Pictures'));
  add(makeFolder('C:/Documents and Settings/All Users/Documents/My Videos'));
  // Shared sample music lives in the All Users profile, like real XP
  makeMusicNodes(`${DOCS_AND_SETTINGS}/All Users/Documents/My Music`).forEach(
    add,
  );
  add(
    makeFolder('C:/Documents and Settings/Default User', {
      system: true,
      hidden: true,
    }),
  );
}

// --- One user's profile: Desktop + My Documents ---

function addUserDocs(add, ctx) {
  const { root, DESKTOP, MY_DOCUMENTS, MY_MUSIC, MY_PICTURES, MY_VIDEOS } = ctx;

  add(makeFolder(root, { system: true }));

  // Desktop — system-flagged: losing it breaks the shell (VFS refuses to
  // move/delete it unless the Folder Options override is on)
  add(makeFolder(DESKTOP, { specialFolder: 'desktop', system: true }));

  // A stock XP desktop carries exactly one icon: the Recycle Bin.
  // ('RecycleBin' is the shell sentinel the desktop layer also keys its
  // dynamic icon off.) The '???' shortcut lies dormant — hidden until the
  // desktop layer materializes it after the user finds their first egg.
  add(
    makeShortcut(`${DESKTOP}/Recycle Bin`, 'RecycleBin', 'recycle-bin', {
      system: true,
    }),
  );
  // The Store is the gateway to every optional app, so it earns a desktop
  // icon (delete it if you prefer a clean desktop).
  add(makeShortcut(`${DESKTOP}/XP Shop`, EXE_PATHS.STORE, 'desk-store'));
  add(
    makeShortcut(`${DESKTOP}/???`, EXE_PATHS.MISSINGNO, 'desk-egg', {
      hidden: true,
    }),
  );

  // My Documents tree (system-flagged like Desktop)
  add(
    makeFolder(MY_DOCUMENTS, {
      iconKey: 'folder-docs',
      specialFolder: 'my-documents',
      system: true,
    }),
  );
  add(makeFolder(MY_MUSIC, { specialFolder: 'my-music' }));
  add(makeFolder(`${root}/Local Settings`, { hidden: true }));
  add(makeFolder(`${root}/Local Settings/Temp`, { hidden: true }));
  add(makeFolder(MY_PICTURES, { specialFolder: 'my-pictures' }));
  add(makeFolder(MY_VIDEOS, { specialFolder: 'my-videos' }));

  // Bundled tracks — only the machine's first account gets the sample music
  /*
   * No sample music in a personal folder. XP put its samples in All Users
   * and left everybody's own My Music empty, which is also the only way
   * they are shared rather than copied per account — the first user used
   * to get a second copy of the same tracks nobody else could see.
   */

  // Sample file
  add(
    makeFile(
      `${MY_DOCUMENTS}/readme.txt`,
      'Welcome to Windows XP!\r\n\r\nThis is your personal computer. You can create files and folders, browse the filesystem, and use the installed applications.\r\n\r\nTry right-clicking the desktop to create a new folder!',
    ),
  );

  // The privacy notice, beside the readme where somebody might actually
  // find it. XP kept eula.txt buried in system32; nobody has ever opened
  // that on purpose, and a notice nobody can find protects nobody.
  add(
    makeFile(`${MY_DOCUMENTS}/privacy.txt`, PRIVACY_FULL, {
      readOnly: true,
    }),
  );
}

// --- Machine system tree: C:/WINDOWS + Program Files ---

function addMachineSystem(add) {
  // ---- C:/WINDOWS — the real system root ----
  add(makeExe(EXE_PATHS.EXPLORER, 1032192, { iconKey: 'sm-winexplorer' }));
  add(
    makeSystemFile(`${WINDOWS}/win.ini`, 743, {
      content:
        '; for 16-bit app support\r\n[fonts]\r\n[extensions]\r\n[mci extensions]\r\n[files]\r\n[Mail]\r\nMAPI=1\r\n',
    }),
  );
  add(
    makeSystemFile(`${WINDOWS}/system.ini`, 227, {
      content:
        '; for 16-bit app support\r\n[386Enh]\r\nwoafont=dosapp.fon\r\nEGA80WOA.FON=EGA80WOA.FON\r\nEGA40WOA.FON=EGA40WOA.FON\r\nCGA80WOA.FON=CGA80WOA.FON\r\nCGA40WOA.FON=CGA40WOA.FON\r\n[drivers]\r\nwave=mmdrv.dll\r\ntimer=timer.drv\r\n[mci]\r\n',
    }),
  );
  add(makeExe(`${WINDOWS}/regedit.exe`, 146432));
  add(makeExe(`${WINDOWS}/notepad.exe`, 69120, { iconKey: 'desk-notepad' }));
  add(makeFolder(`${WINDOWS}/Cursors`, { system: true }));
  add(makeFolder(`${WINDOWS}/Fonts`, { system: true }));
  add(makeFolder(`${WINDOWS}/Prefetch`, { system: true }));
  add(makeFolder(`${WINDOWS}/Temp`, { system: true }));

  // ---- C:/WINDOWS/system32 — registered programs + classic binaries ----
  add(makeExe(EXE_PATHS.NOTEPAD, 69120, { iconKey: 'desk-notepad' }));
  add(makeExe(EXE_PATHS.MSPAINT, 343040, { iconKey: 'desk-paint' }));
  // Windows Picture and Fax Viewer lives in shimgvw.dll
  add(makeExe(EXE_PATHS.SHIMGVW, 348160, { system: true }));
  add(makeExe(EXE_PATHS.WINMINE, 119808, { iconKey: 'desk-minesweeper' }));
  add(makeExe(EXE_PATHS.CMD, 388608, { iconKey: 'sm-cmd' }));
  add(makeExe(`${SYSTEM32}/calc.exe`, 114688, { iconKey: 'sm-calc' }));
  add(makeExe(`${SYSTEM32}/taskmgr.exe`, 135680));
  add(makeExe(`${SYSTEM32}/sol.exe`, 56832, { iconKey: 'sm-solitaire' }));
  add(makeExe(`${SYSTEM32}/freecell.exe`, 55808, { iconKey: 'sm-freecell' }));
  add(makeExe(`${SYSTEM32}/spider.exe`, 67072, { iconKey: 'sm-spider' }));
  add(makeExe(`${SYSTEM32}/mshearts.exe`, 126976, { iconKey: 'sm-hearts' }));
  add(makeExe(`${SYSTEM32}/charmap.exe`, 171520, { iconKey: 'sm-charmap' }));
  add(makeExe(`${SYSTEM32}/magnify.exe`, 30208, { iconKey: 'sm-magnifier' }));
  add(makeExe(`${SYSTEM32}/narrator.exe`, 53760, { iconKey: 'sm-narrator' }));
  add(makeExe(`${SYSTEM32}/osk.exe`, 259072, { iconKey: 'sm-keyboard' }));
  add(makeExe(`${SYSTEM32}/utilman.exe`, 49664, { iconKey: 'sm-utility' }));
  add(
    makeExe(`${SYSTEM32}/accwiz.exe`, 179712, { iconKey: 'sm-accessibility' }),
  );
  add(makeExe(`${SYSTEM32}/cleanmgr.exe`, 87552, { iconKey: 'sm-cleandisk' }));
  add(makeExe(`${SYSTEM32}/mstsc.exe`, 408064, { iconKey: 'sm-rdp' }));
  add(makeExe(`${SYSTEM32}/mobsync.exe`, 141312, { iconKey: 'sm-sync' }));
  add(makeExe(`${SYSTEM32}/sndrec32.exe`, 138752, { iconKey: 'sm-sound' }));
  add(makeExe(`${SYSTEM32}/sndvol32.exe`, 141824, { iconKey: 'sm-volume' }));
  add(makeExe(`${SYSTEM32}/netsetup.exe`, 305664, { iconKey: 'sm-netsetup' }));
  add(makeExe(`${SYSTEM32}/msconfig.exe`, 158208));
  add(makeExe(`${SYSTEM32}/control.exe`, 110592, { iconKey: 'sm-access' }));
  add(makeExe(`${SYSTEM32}/helpctr.exe`, 772608, { iconKey: 'sm-compat' }));
  add(makeExe(`${SYSTEM32}/ntbackup.exe`, 1187840, { iconKey: 'sm-backup' }));
  add(makeExe(`${SYSTEM32}/mstask.exe`, 122880, { iconKey: 'sm-recent' }));
  add(makeSystemFile(`${SYSTEM32}/ncpa.cpl`, 36864));
  add(makeSystemFile(`${SYSTEM32}/desk.cpl`, 129536));
  add(makeSystemFile(`${SYSTEM32}/sysdm.cpl`, 298496));
  add(makeSystemFile(`${SYSTEM32}/wscui.cpl`, 224768));
  add(makeSystemFile(`${SYSTEM32}/dfrg.msc`, 41751));
  add(makeSystemFile(`${SYSTEM32}/kernel32.dll`, 989696));
  add(makeSystemFile(`${SYSTEM32}/user32.dll`, 577536));
  add(makeSystemFile(`${SYSTEM32}/shell32.dll`, 8461312));
  add(makeSystemFile(`${SYSTEM32}/gdi32.dll`, 285696));
  add(makeSystemFile(`${SYSTEM32}/ntdll.dll`, 708096));
  add(makeSystemFile(`${SYSTEM32}/hal.dll`, 134400));
  add(makeSystemFile(`${SYSTEM32}/advapi32.dll`, 617472));
  add(makeSystemFile(`${SYSTEM32}/comctl32.dll`, 617472));
  add(makeSystemFile(`${SYSTEM32}/ole32.dll`, 1287168));
  add(makeSystemFile(`${SYSTEM32}/ws2_32.dll`, 82944));
  add(makeSystemFile(`${SYSTEM32}/msvcrt.dll`, 343040));
  add(makeFolder(`${SYSTEM32}/drivers`, { system: true }));
  add(makeFolder(`${SYSTEM32}/Restore`, { system: true }));
  add(
    makeExe(`${SYSTEM32}/Restore/rstrui.exe`, 235520, {
      iconKey: 'sm-restore',
    }),
  );
  add(makeFolder(`${SYSTEM32}/usmt`, { system: true }));
  add(
    makeExe(`${SYSTEM32}/usmt/migwiz.exe`, 606208, { iconKey: 'sm-transfer' }),
  );

  // ---- C:/Program Files — one real folder per installed program ----
  add(makeFolder(`${PROGRAM_FILES}/Internet Explorer`, { system: true }));
  add(makeExe(EXE_PATHS.IEXPLORE, 93184, { iconKey: 'desk-ie' }));
  add(
    makeFolder(`${PROGRAM_FILES}/Internet Explorer/Connection Wizard`, {
      system: true,
    }),
  );
  add(
    makeExe(
      `${PROGRAM_FILES}/Internet Explorer/Connection Wizard/icwconn1.exe`,
      214528,
      {
        iconKey: 'sm-connwizard',
      },
    ),
  );
  add(makeFolder(`${PROGRAM_FILES}/Windows Media Player`, { system: true }));
  add(makeExe(EXE_PATHS.WMPLAYER, 513536, { iconKey: 'desk-media' }));
  // mplayer2.exe is deliberately NOT seeded: the legacy player is a paid
  // title in the Store (which installs it with system: false so it can be
  // deleted again).
  add(makeExe(EXE_PATHS.ZIPFLDR, 124976, { iconKey: 'desk-zip' }));
  // The Store — an always-installed utility for adding/removing apps.
  add(makeFolder(`${PROGRAM_FILES}/Store`, {}));
  add(
    makeExe(EXE_PATHS.STORE, 262144, {
      iconKey: 'desk-store',
      system: false,
    }),
  );
  add(makeFolder(`${PROGRAM_FILES}/Media Tag Editor`, {}));
  add(
    makeExe(EXE_PATHS.TAGEDITOR, 372736, {
      iconKey: 'desk-tageditor',
      system: false,
    }),
  );
  add(makeFolder(`${PROGRAM_FILES}/Winamp`, {}));
  add(
    makeExe(EXE_PATHS.WINAMP, 1198592, {
      iconKey: 'desk-winamp',
      system: false,
    }),
  );
  add(makeFolder(`${PROGRAM_FILES}/Windows NT`, { system: true }));
  add(makeFolder(`${PROGRAM_FILES}/Windows NT/Pinball`, { system: true }));
  add(makeExe(EXE_PATHS.PINBALL, 2088960, { iconKey: 'desk-pinball' }));
  add(makeFolder(`${PROGRAM_FILES}/Windows NT/Accessories`, { system: true }));
  add(
    makeExe(`${PROGRAM_FILES}/Windows NT/Accessories/wordpad.exe`, 208896, {
      iconKey: 'sm-wordpad',
    }),
  );
  add(
    makeExe(`${PROGRAM_FILES}/Windows NT/hypertrm.exe`, 28160, {
      iconKey: 'sm-hyperterm',
    }),
  );
  add(makeFolder(`${PROGRAM_FILES}/Outlook Express`, { system: true }));
  add(
    makeExe(`${PROGRAM_FILES}/Outlook Express/msimn.exe`, 60416, {
      iconKey: 'sm-outlook',
    }),
  );
  add(
    makeExe(`${PROGRAM_FILES}/Outlook Express/wab.exe`, 45056, {
      iconKey: 'sm-address',
    }),
  );
  add(makeFolder(`${PROGRAM_FILES}/Messenger`, { system: true }));
  add(
    makeExe(`${PROGRAM_FILES}/Messenger/msmsgs.exe`, 1694208, {
      iconKey: 'sm-messenger',
    }),
  );
  add(makeFolder(`${PROGRAM_FILES}/Movie Maker`, { system: true }));
  add(
    makeExe(`${PROGRAM_FILES}/Movie Maker/moviemk.exe`, 3555328, {
      iconKey: 'sm-moviemaker',
    }),
  );
  add(makeFolder(`${PROGRAM_FILES}/MSN Gaming Zone`, { system: true }));
  add(makeFolder(`${PROGRAM_FILES}/MSN Gaming Zone/Windows`, { system: true }));
  add(
    makeExe(`${PROGRAM_FILES}/MSN Gaming Zone/Windows/bckgzm.exe`, 40960, {
      iconKey: 'sm-backgammon',
    }),
  );
  add(
    makeExe(`${PROGRAM_FILES}/MSN Gaming Zone/Windows/chkrzm.exe`, 40960, {
      iconKey: 'sm-checkers',
    }),
  );
  add(
    makeExe(`${PROGRAM_FILES}/MSN Gaming Zone/Windows/hrtzzm.exe`, 40960, {
      iconKey: 'sm-onlinehearts',
    }),
  );
  add(
    makeExe(`${PROGRAM_FILES}/MSN Gaming Zone/Windows/rvsezm.exe`, 40960, {
      iconKey: 'sm-reversi',
    }),
  );
  add(
    makeExe(`${PROGRAM_FILES}/MSN Gaming Zone/Windows/shvlzm.exe`, 40960, {
      iconKey: 'sm-spades',
    }),
  );
  add(makeFolder(`${PROGRAM_FILES}/Common Files`, { system: true }));
  add(
    makeFolder(`${PROGRAM_FILES}/Common Files/Microsoft Shared`, {
      system: true,
    }),
  );
  add(
    makeFolder(`${PROGRAM_FILES}/Common Files/Microsoft Shared/MSInfo`, {
      system: true,
    }),
  );
  add(
    makeExe(
      `${PROGRAM_FILES}/Common Files/Microsoft Shared/MSInfo/msinfo32.exe`,
      297984,
      {
        iconKey: 'sm-sysinfo',
      },
    ),
  );
  // Custom programs installed on this machine
  add(makeFolder(`${PROGRAM_FILES}/PictoChat`, {}));
  add(
    makeExe(EXE_PATHS.PICTOCHAT, 524288, {
      iconKey: 'desk-pictochat',
      system: false,
    }),
  );
  add(makeFolder(`${PROGRAM_FILES}/Voltorb Flip`, {}));
  add(
    makeExe(EXE_PATHS.VOLTORB, 786432, {
      iconKey: 'desk-voltorb',
      system: false,
    }),
  );
  add(makeFolder(`${PROGRAM_FILES}/webxp.net`, {}));
  // tour.exe (the webXP Tour) is shelved for a rework: the app code and its
  // registry entry are kept, but nothing seeds the exe or its shortcuts.
  add(
    makeExe(EXE_PATHS.GUESTBOOK, 118784, {
      iconKey: 'desk-guestbook',
      system: false,
    }),
  );
  // The joke programs live together on the otherwise-empty D: "CD". The
  // Dog Virus sits in plain sight for anyone who goes looking (or Run
  // 'dogvirus'); its dog-window helper and the egg keep hidden attributes.
  add(
    makeExe(EXE_PATHS.DOGVIRUS, 65536, {
      iconKey: 'desk-dogvirus',
      system: false,
    }),
  );
  add(
    makeExe(EXE_PATHS.DOGWINDOW, 24576, {
      iconKey: 'desk-dogvirus',
      hidden: true,
    }),
  );
  add(
    makeExe(EXE_PATHS.MISSINGNO, 33333, { iconKey: 'desk-egg', hidden: true }),
  );
}

// --- One user's Start Menu + Favorites ---

function addUserMenus(add, ctx) {
  const { START_MENU, PROGRAMS, FAVORITES } = ctx;

  // ---- Favorites (Windows Update / Catalog resolve through IE) ----
  add(makeFolder(FAVORITES, { system: true }));
  add(
    makeFile(
      `${FAVORITES}/Windows Update.url`,
      '[InternetShortcut]\r\nURL=https://update.microsoft.com/windowsupdate/',
    ),
  );
  add(
    makeFile(
      `${FAVORITES}/Windows Catalog.url`,
      '[InternetShortcut]\r\nURL=https://www.microsoft.com/windows/catalog/',
    ),
  );

  // Start Menu tree
  add(makeFolder(START_MENU, { system: true, hidden: true }));
  add(makeFolder(PROGRAMS, { system: true }));

  // All Programs — top-level items
  add(
    makeShortcut(
      `${PROGRAMS}/Set Program Access and Defaults`,
      `${SYSTEM32}/control.exe`,
      'sm-access',
    ),
  );
  add(
    makeShortcut(
      `${PROGRAMS}/Windows Catalog`,
      `${FAVORITES}/Windows Catalog.url`,
      'sm-catalog',
    ),
  );
  add(
    makeShortcut(
      `${PROGRAMS}/Windows Update`,
      `${FAVORITES}/Windows Update.url`,
      'sm-update',
    ),
  );
  add(
    makeShortcut(`${PROGRAMS}/Internet Explorer`, EXE_PATHS.IEXPLORE, 'sm-ie'),
  );
  add(
    makeShortcut(
      `${PROGRAMS}/Outlook Express`,
      `${PROGRAM_FILES}/Outlook Express/msimn.exe`,
      'sm-outlook',
    ),
  );
  // Shop Apps — everything installable through the XP Shop lives here,
  // sorted the way the shop sorts it, instead of cluttering All Programs.
  const SHOP_APPS = `${PROGRAMS}/Shop Apps`;
  add(makeFolder(SHOP_APPS, { iconKey: 'menu-folder' }));
  add(makeFolder(`${SHOP_APPS}/Games`, { iconKey: 'menu-folder' }));
  add(makeFolder(`${SHOP_APPS}/XPWare`, { iconKey: 'menu-folder' }));
  add(
    makeShortcut(
      `${SHOP_APPS}/XPWare/PictoChat`,
      EXE_PATHS.PICTOCHAT,
      'desk-pictochat',
    ),
  );
  add(
    makeShortcut(
      `${SHOP_APPS}/XPWare/Media Tag Editor`,
      EXE_PATHS.TAGEDITOR,
      'sm-tageditor',
    ),
  );
  add(
    makeShortcut(`${SHOP_APPS}/XPWare/Winamp`, EXE_PATHS.WINAMP, 'desk-winamp'),
  );
  add(
    makeShortcut(
      `${SHOP_APPS}/Games/Voltorb Flip`,
      EXE_PATHS.VOLTORB,
      'desk-voltorb',
    ),
  );
  add(
    makeShortcut(
      `${PROGRAMS}/Windows Media Player`,
      EXE_PATHS.WMPLAYER,
      'sm-media',
    ),
  );
  add(
    makeShortcut(
      `${PROGRAMS}/Windows Messenger`,
      `${PROGRAM_FILES}/Messenger/msmsgs.exe`,
      'sm-messenger',
    ),
  );
  add(
    makeShortcut(
      `${PROGRAMS}/Windows Movie Maker`,
      `${PROGRAM_FILES}/Movie Maker/moviemk.exe`,
      'sm-moviemaker',
    ),
  );
  add(makeShortcut(`${PROGRAMS}/XP Shop`, EXE_PATHS.STORE, 'desk-store'));
  add(
    makeShortcut(
      `${PROGRAMS}/Guest Book`,
      EXE_PATHS.GUESTBOOK,
      'desk-guestbook',
    ),
  );

  // Accessories folder
  const ACC = `${PROGRAMS}/Accessories`;
  add(makeFolder(ACC, { iconKey: 'menu-folder' }));

  // Accessories > Accessibility
  const ACCSB = `${ACC}/Accessibility`;
  add(makeFolder(ACCSB, { iconKey: 'menu-folder' }));
  add(
    makeShortcut(
      `${ACCSB}/Accessibility Wizard`,
      `${SYSTEM32}/accwiz.exe`,
      'sm-accessibility',
    ),
  );
  add(
    makeShortcut(
      `${ACCSB}/Magnifier`,
      `${SYSTEM32}/magnify.exe`,
      'sm-magnifier',
    ),
  );
  add(
    makeShortcut(
      `${ACCSB}/Narrator`,
      `${SYSTEM32}/narrator.exe`,
      'sm-narrator',
    ),
  );
  add(
    makeShortcut(
      `${ACCSB}/On-Screen Keyboard`,
      `${SYSTEM32}/osk.exe`,
      'sm-keyboard',
    ),
  );
  add(
    makeShortcut(
      `${ACCSB}/Utility Manager`,
      `${SYSTEM32}/utilman.exe`,
      'sm-utility',
    ),
  );

  // Accessories > Communications
  const COMM = `${ACC}/Communications`;
  add(makeFolder(COMM, { iconKey: 'menu-folder' }));
  add(
    makeShortcut(
      `${COMM}/HyperTerminal`,
      `${PROGRAM_FILES}/Windows NT/hypertrm.exe`,
      'sm-hyperterm',
    ),
  );
  add(
    makeShortcut(
      `${COMM}/Network Connections`,
      `${SYSTEM32}/ncpa.cpl`,
      'sm-netconn',
    ),
  );
  add(
    makeShortcut(
      `${COMM}/Network Setup Wizard`,
      `${SYSTEM32}/netsetup.exe`,
      'sm-netsetup',
    ),
  );
  add(
    makeShortcut(
      `${COMM}/New Connection Wizard`,
      `${PROGRAM_FILES}/Internet Explorer/Connection Wizard/icwconn1.exe`,
      'sm-connwizard',
    ),
  );
  add(
    makeShortcut(
      `${COMM}/Wireless Network Setup Wizard`,
      `${SYSTEM32}/netsetup.exe`,
      'sm-wireless',
    ),
  );

  // Accessories > Entertainment
  const ENT = `${ACC}/Entertainment`;
  add(makeFolder(ENT, { iconKey: 'menu-folder' }));
  add(
    makeShortcut(
      `${ENT}/Sound Recorder`,
      `${SYSTEM32}/sndrec32.exe`,
      'sm-sound',
    ),
  );
  add(
    makeShortcut(
      `${ENT}/Volume Control`,
      `${SYSTEM32}/sndvol32.exe`,
      'sm-volume',
    ),
  );
  add(
    makeShortcut(`${ENT}/Windows Media Player`, EXE_PATHS.WMPLAYER, 'sm-media'),
  );

  // Accessories > System Tools
  const SYS = `${ACC}/System Tools`;
  add(makeFolder(SYS, { iconKey: 'menu-folder' }));
  add(makeShortcut(`${SYS}/Backup`, `${SYSTEM32}/ntbackup.exe`, 'sm-backup'));
  add(
    makeShortcut(
      `${SYS}/Character Map`,
      `${SYSTEM32}/charmap.exe`,
      'sm-charmap',
    ),
  );
  add(
    makeShortcut(
      `${SYS}/Disk Cleanup`,
      `${SYSTEM32}/cleanmgr.exe`,
      'sm-cleandisk',
    ),
  );
  add(
    makeShortcut(
      `${SYS}/Disk Defragmenter`,
      `${SYSTEM32}/dfrg.msc`,
      'sm-defrag',
    ),
  );
  add(
    makeShortcut(
      `${SYS}/Files and Settings Transfer Wizard`,
      `${SYSTEM32}/usmt/migwiz.exe`,
      'sm-transfer',
    ),
  );
  add(
    makeShortcut(
      `${SYS}/Scheduled Tasks`,
      `${SYSTEM32}/mstask.exe`,
      'sm-recent',
    ),
  );
  add(
    makeShortcut(
      `${SYS}/Security Center`,
      `${SYSTEM32}/wscui.cpl`,
      'sm-security',
    ),
  );
  add(
    makeShortcut(
      `${SYS}/System Information`,
      `${PROGRAM_FILES}/Common Files/Microsoft Shared/MSInfo/msinfo32.exe`,
      'sm-sysinfo',
    ),
  );
  add(
    makeShortcut(
      `${SYS}/System Restore`,
      `${SYSTEM32}/Restore/rstrui.exe`,
      'sm-restore',
    ),
  );

  // Accessories direct items
  add(
    makeShortcut(
      `${ACC}/Address Book`,
      `${PROGRAM_FILES}/Outlook Express/wab.exe`,
      'sm-address',
    ),
  );
  add(makeShortcut(`${ACC}/Command Prompt`, EXE_PATHS.CMD, 'sm-cmd'));
  add(makeShortcut(`${ACC}/Notepad`, EXE_PATHS.NOTEPAD, 'sm-notepad'));
  add(makeShortcut(`${ACC}/Paint`, EXE_PATHS.MSPAINT, 'sm-paint'));
  add(makeShortcut(`${ACC}/Calculator`, `${SYSTEM32}/calc.exe`, 'sm-calc'));
  add(
    makeShortcut(
      `${ACC}/Program Compatibility Wizard`,
      `${SYSTEM32}/helpctr.exe`,
      'sm-compat',
    ),
  );
  add(
    makeShortcut(
      `${ACC}/Remote Desktop Connection`,
      `${SYSTEM32}/mstsc.exe`,
      'sm-rdp',
    ),
  );
  add(makeShortcut(`${ACC}/Synchronize`, `${SYSTEM32}/mobsync.exe`, 'sm-sync'));
  add(
    makeShortcut(
      `${ACC}/Windows Explorer`,
      EXE_PATHS.EXPLORER,
      'sm-winexplorer',
    ),
  );
  add(
    makeShortcut(
      `${ACC}/WordPad`,
      `${PROGRAM_FILES}/Windows NT/Accessories/wordpad.exe`,
      'sm-wordpad',
    ),
  );

  // Games folder
  const GAMES = `${PROGRAMS}/Games`;
  add(makeFolder(GAMES, { iconKey: 'menu-folder' }));
  const ZONE = `${PROGRAM_FILES}/MSN Gaming Zone/Windows`;
  add(
    makeShortcut(
      `${GAMES}/FreeCell`,
      `${SYSTEM32}/freecell.exe`,
      'sm-freecell',
    ),
  );
  add(makeShortcut(`${GAMES}/Hearts`, `${SYSTEM32}/mshearts.exe`, 'sm-hearts'));
  add(
    makeShortcut(
      `${GAMES}/Internet Backgammon`,
      `${ZONE}/bckgzm.exe`,
      'sm-backgammon',
    ),
  );
  add(
    makeShortcut(
      `${GAMES}/Internet Checkers`,
      `${ZONE}/chkrzm.exe`,
      'sm-checkers',
    ),
  );
  add(
    makeShortcut(
      `${GAMES}/Internet Hearts`,
      `${ZONE}/hrtzzm.exe`,
      'sm-onlinehearts',
    ),
  );
  add(
    makeShortcut(
      `${GAMES}/Internet Reversi`,
      `${ZONE}/rvsezm.exe`,
      'sm-reversi',
    ),
  );
  add(
    makeShortcut(`${GAMES}/Internet Spades`, `${ZONE}/shvlzm.exe`, 'sm-spades'),
  );
  add(makeShortcut(`${GAMES}/Minesweeper`, EXE_PATHS.WINMINE, 'sm-mine'));
  add(makeShortcut(`${GAMES}/Pinball`, EXE_PATHS.PINBALL, 'desk-pinball'));
  add(
    makeShortcut(`${GAMES}/Solitaire`, `${SYSTEM32}/sol.exe`, 'sm-solitaire'),
  );
  add(
    makeShortcut(
      `${GAMES}/Spider Solitaire`,
      `${SYSTEM32}/spider.exe`,
      'sm-spider',
    ),
  );

  // Startup folder (empty)
  add(makeFolder(`${PROGRAMS}/Startup`, { iconKey: 'menu-folder' }));
}

// --- Composers ---

export function buildMachineFileSystem() {
  const nodes = [];
  const add = n => nodes.push(n);
  addMachineCore(add);
  addMachineSystem(add);
  return nodes;
}

export function buildUserProfile(name) {
  const nodes = [];
  const add = n => nodes.push(n);
  const ctx = makeProfileCtx(name);
  // The profile hive: a REAL file holding this user's settings as JSON
  // (desktop layout, egg counts, run history, recent documents, …).
  // Hidden like the real ntuser.dat; deleting it resets the settings.
  add(makeFile(`${ctx.root}/ntuser.dat`, '{}', { hidden: true }));
  addUserDocs(add, ctx);
  addUserMenus(add, ctx);
  return nodes;
}

/**
 * Full default filesystem for a machine with the given accounts. With no
 * accounts registered yet (pre-OOBE) the legacy fallback profile is used so
 * nothing that reads SPECIAL_FOLDERS crashes.
 */
export function buildDefaultFileSystem(userNames) {
  const names =
    Array.isArray(userNames) && userNames.length > 0 ? userNames : ['Skillz'];
  const nodes = buildMachineFileSystem();
  names.forEach(name => {
    nodes.push(...buildUserProfile(name));
  });
  return nodes;
}
