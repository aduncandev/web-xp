// Default VFS filesystem — seeded on first visit (IDB empty)

import {
  SPECIAL_FOLDERS,
  EXE_PATHS,
  profileFoldersFor,
  DOCS_AND_SETTINGS,
} from './vfsConstants';
import { guessMimeType, makeVfsNode } from './vfsUtils';
import { finishIcons } from './vfsIcons';
import { PRIVACY_FULL } from '../privacyNotice';

// Timestamp for all default entries
const EPOCH = new Date('2024-08-24T00:00:00').getTime();

// Machine-wide roots only — these SPECIAL_FOLDERS entries are static.
// User-scoped paths are derived per profile inside buildUserProfile().
const PROGRAM_FILES = SPECIAL_FOLDERS.PROGRAM_FILES;
const WINDOWS = SPECIAL_FOLDERS.WINDOWS;
const SYSTEM32 = SPECIAL_FOLDERS.SYSTEM32;
const RECYCLER = SPECIAL_FOLDERS.RECYCLER;

// --- Node factory helpers ---
// Icon keys used below are the registry's in vfsIcons.js.

function baseNode(path, type) {
  return makeVfsNode(path, type, {
    // Drive roots must come out as "C:", which getBaseName does not do —
    // it returns '' for "C:/". Seeded paths are already canonical, so
    // they are used as written rather than normalized.
    name: path.split('/').pop() || path.replace('/', ''),
    at: EPOCH,
  });
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
  node.mimeType = guessMimeType(path);
  node.system = true;
  node.readOnly = true;
  node.hidden = opts.hidden ?? false;
  return finishIcons(node);
}

// --- Bundled sample music (served from /public, so URLs are stable) ---

// Exact byte counts of the files in public/music. They were once typed in
// as rounded megabytes and drifted up to four times off the real size.
const MUSIC_FILES = [
  ['addiction.wav', 50895912],
  ['youwillknow.mp3', 5395025],
  // music1 / EternalDepthsOfHell / AudioWavesOfPainAndSuffering are
  // Aaron's own songs — sold in the shop as an album now, no longer
  // seeded free. Installs that already have them keep them.
  ['MIKEtheBOARDpleasey.wav', 5793694],
  ['man.ogg', 140530],
  ['robocop.mp3', 2366258],
];

/** A public (server) URL, honoring the deploy's base path. */
const publicUrl = rel =>
  `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${rel}`;

function makeMusicNodes(dirPath) {
  return MUSIC_FILES.map(([name, sizeBytes]) =>
    makeFile(`${dirPath}/${name}`, null, {
      sourceUrl: publicUrl(`music/${name}`),
      sizeBytes,
    }),
  );
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
      sourceUrl: publicUrl('wallpaper/Bliss.jpg'),
      sizeBytes: 674371,
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
  add(makeFolder(SPECIAL_FOLDERS.ALL_USERS, { system: true }));
  add(
    makeFolder(SPECIAL_FOLDERS.SHARED_DOCUMENTS, {
      iconKey: 'folder-docs',
      system: true,
    }),
  );
  add(makeFolder(SPECIAL_FOLDERS.SHARED_MUSIC));
  add(makeFolder(SPECIAL_FOLDERS.SHARED_PICTURES));
  add(makeFolder(SPECIAL_FOLDERS.SHARED_VIDEOS));
  // Shared sample music lives in the All Users profile, like real XP
  makeMusicNodes(SPECIAL_FOLDERS.SHARED_MUSIC).forEach(add);
  add(
    makeFolder(`${DOCS_AND_SETTINGS}/Default User`, {
      system: true,
      hidden: true,
    }),
  );
}

// --- One user's profile: Desktop + My Documents ---

function addUserDocs(add, ctx) {
  const {
    ROOT: root,
    DESKTOP,
    MY_DOCUMENTS,
    MY_MUSIC,
    MY_PICTURES,
    MY_VIDEOS,
    TEMP,
  } = ctx;

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
  add(makeFolder(TEMP, { hidden: true }));
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
  add(makeExe(EXE_PATHS.CALC, 114688, { iconKey: 'sm-calc' }));
  add(makeExe(EXE_PATHS.TASKMGR, 135680));
  add(makeExe(EXE_PATHS.SOL, 56832, { iconKey: 'sm-solitaire' }));
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
  add(makeExe(EXE_PATHS.SNDVOL32, 141824, { iconKey: 'sm-volume' }));
  add(makeExe(`${SYSTEM32}/netsetup.exe`, 305664, { iconKey: 'sm-netsetup' }));
  add(makeExe(`${SYSTEM32}/msconfig.exe`, 158208));
  add(makeExe(EXE_PATHS.CONTROL, 110592, { iconKey: 'sm-access' }));
  add(makeExe(`${SYSTEM32}/helpctr.exe`, 772608, { iconKey: 'sm-compat' }));
  add(makeExe(EXE_PATHS.NTBACKUP, 1187840, { iconKey: 'sm-backup' }));
  add(makeExe(`${SYSTEM32}/mstask.exe`, 122880, { iconKey: 'sm-recent' }));
  add(makeSystemFile(`${SYSTEM32}/ncpa.cpl`, 36864));
  add(makeSystemFile(EXE_PATHS.DESK_CPL, 129536));
  add(makeSystemFile(EXE_PATHS.SYSDM_CPL, 298496));
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
  // The Store is the only way to install anything, so it is a system file:
  // undeletable, and re-seeded if an older disk lost it
  add(makeFolder(`${PROGRAM_FILES}/Store`, {}));
  add(makeExe(EXE_PATHS.STORE, 262144, { iconKey: 'desk-store' }));
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
  add(makeExe(EXE_PATHS.WORDPAD, 208896, { iconKey: 'sm-wordpad' }));
  add(
    makeExe(`${PROGRAM_FILES}/Windows NT/hypertrm.exe`, 28160, {
      iconKey: 'sm-hyperterm',
    }),
  );
  add(makeFolder(`${PROGRAM_FILES}/Outlook Express`, { system: true }));
  add(makeExe(EXE_PATHS.MSIMN, 60416, { iconKey: 'sm-outlook' }));
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
  // The site's own program, not a Store title: system, like the Store
  add(makeExe(EXE_PATHS.GUESTBOOK, 118784, { iconKey: 'desk-guestbook' }));
  // The joke programs live together on the otherwise-empty D: "CD". The
  // Dog Virus sits in plain sight for anyone who goes looking (or Run
  // 'dogvirus'); its dog-window helper and the egg keep hidden attributes.
  add(makeExe(EXE_PATHS.DOGVIRUS, 65536, { iconKey: 'desk-dogvirus' }));
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

// The Start menu's All Programs tree, as data. A folder is { folder,
// children }; a shortcut is [name, target, iconKey]. The FAVORITES entries
// depend on the profile, so the tree is built per user.
const allProgramsTree = ({ FAVORITES }) => {
  const ZONE = `${PROGRAM_FILES}/MSN Gaming Zone/Windows`;
  return [
    ['Set Program Access and Defaults', EXE_PATHS.CONTROL, 'sm-access'],
    ['Windows Catalog', `${FAVORITES}/Windows Catalog.url`, 'sm-catalog'],
    ['Windows Update', `${FAVORITES}/Windows Update.url`, 'sm-update'],
    ['Internet Explorer', EXE_PATHS.IEXPLORE, 'sm-ie'],
    ['Outlook Express', EXE_PATHS.MSIMN, 'sm-outlook'],
    // Shop Apps: everything installable through the XP Shop lives here,
    // sorted the way the shop sorts it, instead of cluttering All Programs
    {
      folder: 'Shop Apps',
      children: [
        {
          folder: 'Games',
          children: [['Voltorb Flip', EXE_PATHS.VOLTORB, 'desk-voltorb']],
        },
        {
          folder: 'XPWare',
          children: [
            ['PictoChat', EXE_PATHS.PICTOCHAT, 'desk-pictochat'],
            ['Media Tag Editor', EXE_PATHS.TAGEDITOR, 'sm-tageditor'],
            ['Winamp', EXE_PATHS.WINAMP, 'desk-winamp'],
          ],
        },
      ],
    },
    ['Windows Media Player', EXE_PATHS.WMPLAYER, 'sm-media'],
    [
      'Windows Messenger',
      `${PROGRAM_FILES}/Messenger/msmsgs.exe`,
      'sm-messenger',
    ],
    [
      'Windows Movie Maker',
      `${PROGRAM_FILES}/Movie Maker/moviemk.exe`,
      'sm-moviemaker',
    ],
    ['XP Shop', EXE_PATHS.STORE, 'desk-store'],
    ['Guest Book', EXE_PATHS.GUESTBOOK, 'desk-guestbook'],
    {
      folder: 'Accessories',
      children: [
        {
          folder: 'Accessibility',
          children: [
            [
              'Accessibility Wizard',
              `${SYSTEM32}/accwiz.exe`,
              'sm-accessibility',
            ],
            ['Magnifier', `${SYSTEM32}/magnify.exe`, 'sm-magnifier'],
            ['Narrator', `${SYSTEM32}/narrator.exe`, 'sm-narrator'],
            ['On-Screen Keyboard', `${SYSTEM32}/osk.exe`, 'sm-keyboard'],
            ['Utility Manager', `${SYSTEM32}/utilman.exe`, 'sm-utility'],
          ],
        },
        {
          folder: 'Communications',
          children: [
            [
              'HyperTerminal',
              `${PROGRAM_FILES}/Windows NT/hypertrm.exe`,
              'sm-hyperterm',
            ],
            ['Network Connections', `${SYSTEM32}/ncpa.cpl`, 'sm-netconn'],
            ['Network Setup Wizard', `${SYSTEM32}/netsetup.exe`, 'sm-netsetup'],
            [
              'New Connection Wizard',
              `${PROGRAM_FILES}/Internet Explorer/Connection Wizard/icwconn1.exe`,
              'sm-connwizard',
            ],
            [
              'Wireless Network Setup Wizard',
              `${SYSTEM32}/netsetup.exe`,
              'sm-wireless',
            ],
          ],
        },
        {
          folder: 'Entertainment',
          children: [
            ['Sound Recorder', `${SYSTEM32}/sndrec32.exe`, 'sm-sound'],
            ['Volume Control', EXE_PATHS.SNDVOL32, 'sm-volume'],
            ['Windows Media Player', EXE_PATHS.WMPLAYER, 'sm-media'],
          ],
        },
        {
          folder: 'System Tools',
          children: [
            ['Backup', EXE_PATHS.NTBACKUP, 'sm-backup'],
            ['Character Map', `${SYSTEM32}/charmap.exe`, 'sm-charmap'],
            ['Disk Cleanup', `${SYSTEM32}/cleanmgr.exe`, 'sm-cleandisk'],
            ['Disk Defragmenter', `${SYSTEM32}/dfrg.msc`, 'sm-defrag'],
            [
              'Files and Settings Transfer Wizard',
              `${SYSTEM32}/usmt/migwiz.exe`,
              'sm-transfer',
            ],
            ['Scheduled Tasks', `${SYSTEM32}/mstask.exe`, 'sm-recent'],
            ['Security Center', `${SYSTEM32}/wscui.cpl`, 'sm-security'],
            [
              'System Information',
              `${PROGRAM_FILES}/Common Files/Microsoft Shared/MSInfo/msinfo32.exe`,
              'sm-sysinfo',
            ],
            ['System Restore', `${SYSTEM32}/Restore/rstrui.exe`, 'sm-restore'],
          ],
        },
        [
          'Address Book',
          `${PROGRAM_FILES}/Outlook Express/wab.exe`,
          'sm-address',
        ],
        ['Command Prompt', EXE_PATHS.CMD, 'sm-cmd'],
        ['Notepad', EXE_PATHS.NOTEPAD, 'sm-notepad'],
        ['Paint', EXE_PATHS.MSPAINT, 'sm-paint'],
        ['Calculator', EXE_PATHS.CALC, 'sm-calc'],
        [
          'Program Compatibility Wizard',
          `${SYSTEM32}/helpctr.exe`,
          'sm-compat',
        ],
        ['Remote Desktop Connection', `${SYSTEM32}/mstsc.exe`, 'sm-rdp'],
        ['Synchronize', `${SYSTEM32}/mobsync.exe`, 'sm-sync'],
        ['Windows Explorer', EXE_PATHS.EXPLORER, 'sm-winexplorer'],
        ['WordPad', EXE_PATHS.WORDPAD, 'sm-wordpad'],
      ],
    },
    {
      folder: 'Games',
      children: [
        ['FreeCell', `${SYSTEM32}/freecell.exe`, 'sm-freecell'],
        ['Hearts', `${SYSTEM32}/mshearts.exe`, 'sm-hearts'],
        ['Internet Backgammon', `${ZONE}/bckgzm.exe`, 'sm-backgammon'],
        ['Internet Checkers', `${ZONE}/chkrzm.exe`, 'sm-checkers'],
        ['Internet Hearts', `${ZONE}/hrtzzm.exe`, 'sm-onlinehearts'],
        ['Internet Reversi', `${ZONE}/rvsezm.exe`, 'sm-reversi'],
        ['Internet Spades', `${ZONE}/shvlzm.exe`, 'sm-spades'],
        ['Minesweeper', EXE_PATHS.WINMINE, 'sm-mine'],
        ['Pinball', EXE_PATHS.PINBALL, 'desk-pinball'],
        ['Solitaire', EXE_PATHS.SOL, 'sm-solitaire'],
        ['Spider Solitaire', `${SYSTEM32}/spider.exe`, 'sm-spider'],
      ],
    },
    { folder: 'Startup', children: [] },
  ];
};

/** Walk the tree under `dir`: menu folders, then their shortcuts. */
function addMenuTree(add, dir, entries) {
  for (const entry of entries) {
    if (Array.isArray(entry)) {
      const [name, target, iconKey] = entry;
      add(makeShortcut(`${dir}/${name}`, target, iconKey));
    } else {
      const path = `${dir}/${entry.folder}`;
      add(makeFolder(path, { iconKey: 'menu-folder' }));
      addMenuTree(add, path, entry.children);
    }
  }
}

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
  add(
    makeFolder(START_MENU, {
      system: true,
      hidden: true,
      specialFolder: 'start-menu',
    }),
  );
  add(makeFolder(PROGRAMS, { system: true }));
  addMenuTree(add, PROGRAMS, allProgramsTree(ctx));
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
  const ctx = profileFoldersFor(name);
  // The profile hive: a REAL file holding this user's settings as JSON
  // (desktop layout, egg counts, run history, recent documents, …).
  // Hidden like the real ntuser.dat; deleting it resets the settings.
  add(makeFile(`${ctx.ROOT}/ntuser.dat`, '{}', { hidden: true }));
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
