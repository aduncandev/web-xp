import InternetExplorer from './InternetExplorer';
import Explorer from '../shell/Explorer';
import Notepad from './Notepad';
import Winamp from './Winamp';
import Paint from './Paint';
import PictureViewer from './PictureViewer';
import AboutMe from './AboutMe';
import PictoChat from './PictoChat';
import Egg from './Egg';
import MediaPlayer from './MediaPlayer';
import WindowsMediaPlayer from './WindowsMediaPlayer';
import TagEditor from './TagEditor';
import DogVirus from './DogVirus';
import Store from './Store';
import GuestBook from './GuestBook';
import ErrorBox from './ErrorBox';
import CommandPrompt from './CommandPrompt';
import Calculator from './Calculator';
import VolumeControl from '../system/VolumeControl';
import volumeSmallIcon from 'assets/windowsIcons/690(16x16).png';
import TaskManager from '../system/TaskManager';
import WordPad from './WordPad';
import ControlPanel from '../shell/ControlPanel';
import DisplayProperties from '../system/DisplayProperties';
import SystemProperties from '../system/SystemProperties';
import Solitaire from './Solitaire';
import Backup from './Backup';
import ClimbRaceComponent from './ClimbRace';
import {
  WARNING_BOX_LAYOUT,
  WrappedMinesweeper,
  WrappedPinball,
  WrappedMarioVsLuigi,
  WrappedVoltorb,
  checkMinesweeperBlock,
  checkPinballBlock,
  checkVoltorbBlock,
} from './compat';

import { EXE_PATHS } from '../../context/vfsConstants';
import { CONTROL_PANEL } from '../shell/location';
import { PROGRAM_META } from './programMeta';

import iePaper from 'assets/windowsIcons/ie-paper.png';
import mine from 'assets/minesweeper/mine-icon.png';
import computer from 'assets/windowsIcons/676(16x16).png';
import notepad from 'assets/windowsIcons/327(16x16).png';
import winampIcon from 'assets/windowsIcons/winamp.png';
import paint from 'assets/windowsIcons/680(16x16).png';
import aboutMeIcon from 'assets/windowsIcons/touricon.png';
import voltorbFlipIcon from 'assets/windowsIcons/voltorb.png';
import pinballIcon16 from 'assets/windowsIcons/pinball.png';
import pictoChatIcon from 'assets/windowsIcons/pictochat.png';
import eggIcon from 'assets/windowsIcons/tree.gif';
import mediaPlayerIcon from 'assets/windowsIcons/846(16x16).png';
import tagEditorIcon from 'assets/windowsIcons/shell32-2(16x16).png';
import cmdIcon from 'assets/windowsIcons/56(16x16).png';
import calcIcon from 'assets/windowsIcons/74(16x16).png';
import taskmgrIconDrawn from '../system/TaskManager/taskmgr-icon.svg';
import wordPadIcon from 'assets/windowsIcons/153(16x16).png';
import controlIcon from 'assets/windowsIcons/300(16x16).png';
import displayIconDrawn from 'assets/windowsIcons/desktop.svg';
import solitaireIcon from 'assets/windowsIcons/solitaire.png';
import backupIcon from 'assets/windowsIcons/23(16x16).png';
import dogVirusIcon from 'assets/dogvirus/undertale-annoying.gif';
import storeIcon from 'assets/store/bag.gif';
import ieBook from 'assets/windowsIcons/ie-book.png';
import mvlIcon from 'assets/windowsIcons/mariovsluigi.png';
import climbRaceIcon from 'assets/windowsIcons/climbrace.gif';
import { getArt } from '../../xpArt';

// Real extracted icons win when dropped into src/assets/xp/
const taskmgrIcon = getArt('taskmgr', taskmgrIconDrawn);
const displayIcon = getArt('display', displayIconDrawn);
const sysdmIcon = getArt('sysdm', computer);
// IE's Favourites book stands in until a real Address Book icon (wab.exe) is
// dropped into src/assets/xp/ as guestbook.png — see that folder's README.
const guestBookIcon = getArt('guestbook', ieBook);

/**
 * The program registry: every runnable program keyed by its executable's VFS
 * path. Launching anything resolves one of these paths through the shell.
 *
 *   displayName, description, publisher: shop titles take the first and last
 *     from programMeta, so the registry and the catalog cannot disagree
 *   commandNames: bare names the Run box resolves; cmd searches the filesystem
 *   header: title bar and taskbar { icon, title, buttons, invisible,
 *     noFooterWindow, noMinimize }
 *   component: what the window renders
 *   defaultSize, defaultOffset, centerAs, maximized, layout: geometry,
 *     resolved at launch by resolveLaunchLayout (layout.js)
 *   resizable, multiInstance, minWidth, minHeight
 *   unlisted: kept out of program pickers
 *   excludeFromMfu: never in the most-used list, launches not counted
 *   namespace: an Explorer namespace to browse instead of launching
 */
export const PROGRAMS = {
  [EXE_PATHS.IEXPLORE]: {
    displayName: 'Internet Explorer',
    description: 'Internet Explorer',
    commandNames: ['iexplore'],
    header: { icon: iePaper, title: 'Microsoft Internet Explorer' },
    component: InternetExplorer,
    defaultSize: { width: 700, height: 500 },
    resizable: true,
    multiInstance: true,
    excludeFromMfu: true,
  },
  [EXE_PATHS.WINMINE]: {
    displayName: 'Minesweeper',
    description: 'Entertainment Pack Minesweeper Game',
    commandNames: ['winmine'],
    header: { icon: mine, title: 'Minesweeper' },
    component: WrappedMinesweeper,
    // Sized by its own board; the warning box replaces it on a phone
    defaultSize: { width: 0, height: 0 },
    layout: () => (checkMinesweeperBlock() ? WARNING_BOX_LAYOUT : null),
    resizable: false,
    maximized: false,
    multiInstance: true,
  },
  [EXE_PATHS.EXPLORER]: {
    displayName: 'Windows Explorer',
    description: 'Windows Explorer',
    commandNames: ['explorer'],
    header: { icon: computer, title: 'My Computer' },
    component: Explorer,
    defaultSize: { width: 795, height: 594 },
    resizable: true,
    multiInstance: true,
    excludeFromMfu: true,
  },
  [EXE_PATHS.NOTEPAD]: {
    displayName: 'Notepad',
    description: 'Windows NT Notepad',
    commandNames: ['notepad'],
    header: { icon: notepad, title: 'Untitled - Notepad' },
    component: Notepad,
    defaultSize: { width: 764, height: 525 },
    resizable: true,
    multiInstance: true,
  },
  [EXE_PATHS.WINAMP]: {
    description: 'Winamp media player',
    commandNames: ['winamp'],
    header: { icon: winampIcon, title: 'Winamp', invisible: true },
    component: Winamp,
    defaultSize: { width: 0, height: 0 },
    // 0x0 wrapper pinned to the origin: the component's Host div spans the
    // desktop from here so webamp's contained windows use page coordinates
    defaultOffset: { x: 0, y: 0 },
    resizable: false,
    maximized: false,
    multiInstance: false,
  },
  [EXE_PATHS.MVL]: {
    description: 'NSMB-MarioVsLuigi online multiplayer',
    commandNames: ['mariovsluigi'],
    header: { icon: mvlIcon, title: 'Mario vs Luigi' },
    component: WrappedMarioVsLuigi,
    defaultSize: { width: 960, height: 585 },
    resizable: true,
    multiInstance: false,
    minWidth: 640,
    minHeight: 420,
  },
  [EXE_PATHS.DELTASCEND]: {
    description: 'The chapter 5 wall climb, plus a wall for every seed',
    commandNames: ['climbrace', 'deltaclimb', 'deltascend'],
    header: { icon: climbRaceIcon, title: 'DELTASCEND' },
    component: ClimbRaceComponent,
    defaultSize: { width: 800, height: 628 },
    resizable: true,
    multiInstance: false,
    minWidth: 480,
    minHeight: 388,
  },
  [EXE_PATHS.GUESTBOOK]: {
    displayName: 'Guest Book',
    description: 'Sign the guest book',
    publisher: 'webxp.net',
    commandNames: ['guestbook'],
    header: { icon: guestBookIcon, title: 'Guest Book' },
    component: GuestBook,
    defaultSize: { width: 560, height: 520 },
    resizable: true,
    multiInstance: false,
    minWidth: 380,
    minHeight: 340,
  },
  [EXE_PATHS.MSPAINT]: {
    displayName: 'Paint',
    description: 'Windows Paint',
    commandNames: ['mspaint', 'paint'],
    header: { icon: paint, title: 'untitled - Paint' },
    component: Paint,
    defaultSize: { width: 660, height: 520 },
    resizable: true,
    multiInstance: true,
  },
  [EXE_PATHS.SHIMGVW]: {
    displayName: 'Windows Picture and Fax Viewer',
    description: 'Windows Picture and Fax Viewer',
    commandNames: ['shimgvw', 'pictureviewer'],
    header: {
      icon: getArt('Bitmap', paint),
      title: 'Windows Picture and Fax Viewer',
    },
    component: PictureViewer,
    defaultSize: { width: 795, height: 560 },
    resizable: true,
    multiInstance: true,
  },
  [EXE_PATHS.TOUR]: {
    displayName: 'webXP Tour',
    description: 'A tour of webXP',
    publisher: 'webxp.net',
    commandNames: ['tour'],
    header: { icon: aboutMeIcon, title: 'webXP Tour' },
    component: AboutMe,
    defaultSize: { width: 640, height: 480 },
    resizable: false,
    multiInstance: false,
  },
  [EXE_PATHS.VOLTORB]: {
    description: 'Voltorb Flip',
    commandNames: ['voltorbflip'],
    header: { icon: voltorbFlipIcon, title: 'Voltorb Flip' },
    component: WrappedVoltorb,
    defaultSize: { width: 570, height: 670 },
    layout: () => (checkVoltorbBlock() ? WARNING_BOX_LAYOUT : null),
    resizable: false,
    multiInstance: false,
  },
  [EXE_PATHS.PINBALL]: {
    displayName: '3D Pinball',
    description: '3D Pinball for Windows - Space Cadet',
    commandNames: ['pinball'],
    header: {
      icon: pinballIcon16,
      title: '3D Pinball for Windows - Space Cadet',
    },
    component: WrappedPinball,
    defaultSize: { width: 600, height: 470 },
    layout: () => (checkPinballBlock() ? WARNING_BOX_LAYOUT : null),
    resizable: false,
    multiInstance: false,
  },
  [EXE_PATHS.PICTOCHAT]: {
    description: 'PictoChat',
    commandNames: ['pictochat'],
    header: { icon: pictoChatIcon, title: 'PictoChat' },
    component: PictoChat,
    defaultSize: { width: 400, height: 600 },
    resizable: true,
    multiInstance: false,
  },
  [EXE_PATHS.DOGVIRUS]: {
    displayName: 'Dog Virus',
    description: 'Dog Virus',
    publisher: 'skillzdev.xyz',
    unlisted: true, // secrets stay out of program pickers
    excludeFromMfu: true,
    commandNames: ['dogvirus'],
    header: {
      icon: dogVirusIcon,
      title: 'Dog Virus',
      buttons: ['close'],
      noFooterWindow: true,
      noMinimize: true,
    },
    component: DogVirus,
    defaultSize: { width: 240, height: 230 },
    resizable: false,
    maximized: false,
    multiInstance: false,
  },
  // The windows the virus spawns — the same component in child mode.
  [EXE_PATHS.DOGWINDOW]: {
    displayName: 'A Dog',
    description: 'A Dog',
    unlisted: true, // secrets stay out of program pickers
    excludeFromMfu: true,
    commandNames: ['dogwindow'],
    header: {
      icon: dogVirusIcon,
      title: 'A Dog',
      buttons: ['close'],
      noFooterWindow: true,
      noMinimize: true,
    },
    component: DogVirus,
    defaultSize: { width: 220, height: 210 },
    resizable: false,
    maximized: false,
    multiInstance: true,
  },
  [EXE_PATHS.MISSINGNO]: {
    displayName: '???',
    description: '???',
    unlisted: true, // secrets stay out of program pickers
    excludeFromMfu: true,
    commandNames: ['room_man'],
    header: { icon: eggIcon, title: '???' },
    component: Egg,
    defaultSize: { width: 400, height: 350 },
    resizable: true,
    maximized: false,
    multiInstance: false,
    minWidth: 400,
    minHeight: 350,
  },
  [EXE_PATHS.STORE]: {
    displayName: 'XP Shop',
    description: 'Add or remove optional software and extras',
    publisher: 'webxp.net',
    commandNames: ['store', 'xpshop'],
    header: { icon: storeIcon, title: 'XP Shop' },
    component: Store,
    // 4:3 like the TV it belongs on; the shop page letterboxes itself into
    // whatever size the window ends up.
    defaultSize: { width: 640, height: 508 },
    resizable: true,
    multiInstance: false,
    minWidth: 400,
    minHeight: 330,
    excludeFromMfu: true,
  },
  [EXE_PATHS.TAGEDITOR]: {
    description: 'Media Tag Editor',
    commandNames: ['tageditor'],
    header: { icon: tagEditorIcon, title: 'Media Tag Editor' },
    component: TagEditor,
    defaultSize: { width: 820, height: 520 },
    resizable: true,
    multiInstance: false,
    minWidth: 520,
    minHeight: 320,
  },
  [EXE_PATHS.WMPLAYER]: {
    displayName: 'Windows Media Player',
    description: 'Windows Media Player',
    commandNames: ['wmplayer'],
    header: { icon: mediaPlayerIcon, title: 'Windows Media Player' },
    component: WindowsMediaPlayer,
    // 676x533 reproduces the reference capture's 670x483 player body
    // exactly, given the shell's 3px borders and 25px title bar.
    defaultSize: { width: 676, height: 533 },
    resizable: true,
    multiInstance: false,
    minWidth: 560,
    minHeight: 520,
  },
  // The previous player, kept where XP kept its own older one. Still fully
  // functional, just not a recreation of any particular Microsoft release.
  [EXE_PATHS.MPLAYER2]: {
    description: 'Windows Media Player',
    commandNames: ['mplayer2'],
    header: { icon: mediaPlayerIcon, title: 'Media Player', invisible: false },
    component: MediaPlayer,
    defaultSize: { width: 800, height: 575 },
    resizable: true,
    multiInstance: false,
    minWidth: 370,
    minHeight: 370,
  },
  [EXE_PATHS.CMD]: {
    displayName: 'Command Prompt',
    description: 'Windows Command Processor',
    commandNames: ['cmd'],
    header: { icon: cmdIcon, title: 'C:\\WINDOWS\\system32\\cmd.exe' },
    component: CommandPrompt,
    defaultSize: { width: 648, height: 318 },
    resizable: true,
    maximized: false,
    multiInstance: true,
    minWidth: 320,
    minHeight: 200,
  },
  [EXE_PATHS.NTBACKUP]: {
    displayName: 'Backup',
    description: 'Back up or restore files and settings',
    commandNames: ['ntbackup', 'backup'],
    header: { icon: backupIcon, title: 'Backup Utility' },
    component: Backup,
    defaultSize: { width: 470, height: 380 },
    resizable: false,
    maximized: false,
    multiInstance: false,
  },
  [EXE_PATHS.CALC]: {
    displayName: 'Calculator',
    description: 'Windows Calculator application file',
    commandNames: ['calc'],
    header: { icon: calcIcon, title: 'Calculator' },
    component: Calculator,
    // 260x260 outer frame reproduces the real calc.exe Standard-view
    // client area (254x229) given the shell's 3px borders + 25px title bar
    defaultSize: { width: 260, height: 260 },
    resizable: false,
    maximized: false,
    multiInstance: true,
  },
  [EXE_PATHS.SNDVOL32]: {
    displayName: 'Volume Control',
    description: 'Volume Control application',
    commandNames: ['sndvol32', 'sndvol'],
    header: { icon: volumeSmallIcon, title: 'Volume Control' },
    component: VolumeControl,
    defaultSize: { width: 565, height: 300 },
    resizable: false,
    maximized: false,
    multiInstance: false,
    // Opened from the tray speaker, like Task Manager from the taskbar
    excludeFromMfu: true,
  },
  [EXE_PATHS.TASKMGR]: {
    displayName: 'Windows Task Manager',
    description: 'Windows Task Manager',
    commandNames: ['taskmgr'],
    header: { icon: taskmgrIcon, title: 'Windows Task Manager' },
    component: TaskManager,
    defaultSize: { width: 383, height: 438 },
    resizable: true,
    maximized: false,
    multiInstance: false,
    minWidth: 400,
    minHeight: 340,
    excludeFromMfu: true,
  },
  [EXE_PATHS.WORDPAD]: {
    displayName: 'WordPad',
    description: 'Windows WordPad application',
    commandNames: ['wordpad', 'write'],
    header: { icon: wordPadIcon, title: 'Document - WordPad' },
    component: WordPad,
    defaultSize: { width: 746, height: 513 },
    resizable: true,
    multiInstance: true,
    minWidth: 460,
    minHeight: 320,
  },
  [EXE_PATHS.CONTROL]: {
    displayName: 'Control Panel',
    description: 'Control Panel',
    commandNames: ['control'],
    header: { icon: controlIcon, title: 'Control Panel' },
    // Registered so 'control' resolves in Run and the Start menu; the
    // shell browses the namespace in Explorer rather than opening this.
    namespace: CONTROL_PANEL,
    component: ControlPanel,
    defaultSize: { width: 776, height: 565 },
    resizable: true,
    multiInstance: false,
    excludeFromMfu: true,
  },
  [EXE_PATHS.DESK_CPL]: {
    displayName: 'Display Properties',
    description: 'Display Properties',
    commandNames: ['desk.cpl'],
    header: {
      icon: displayIcon,
      title: 'Display Properties',
      buttons: ['help', 'close'],
      noIcon: true,
      dialogFrame: true,
    },
    component: DisplayProperties,
    // XP's sheet: 404 by 455 with the Luna frame
    defaultSize: { width: 404, height: 455 },
    resizable: false,
    maximized: false,
    multiInstance: false,
  },
  [EXE_PATHS.SYSDM_CPL]: {
    displayName: 'System Properties',
    description: 'System Properties',
    commandNames: ['sysdm.cpl'],
    header: { icon: sysdmIcon, title: 'System Properties' },
    component: SystemProperties,
    defaultSize: { width: 413, height: 484 },
    resizable: false,
    maximized: false,
    multiInstance: false,
  },
  [EXE_PATHS.SOL]: {
    displayName: 'Solitaire',
    description: 'Solitaire Game',
    commandNames: ['sol', 'solitaire'],
    header: { icon: solitaireIcon, title: 'Solitaire' },
    component: Solitaire,
    defaultSize: { width: 580, height: 420 },
    resizable: true,
    maximized: false,
    multiInstance: true,
    minWidth: 585,
    minHeight: 420,
  },
};

/*
 * Give every entry its own path.
 *
 * A program's path is otherwise only the object KEY, which lookup throws
 * away — so a launched window never knew which program it was, and Task
 * Manager had to keyword-match window titles to guess. Derived from the
 * keys here rather than written into each entry by hand, so it cannot
 * drift the way a second copy would.
 */
for (const [exePath, entry] of Object.entries(PROGRAMS)) {
  entry.exePath = exePath;
  /*
   * Programs the shop also sells take their display name and publisher
   * from programMeta, so the registry and the catalog cannot describe the
   * same program differently. Their entries above deliberately omit those
   * two fields.
   */
  const meta = PROGRAM_META[exePath];
  if (meta) Object.assign(entry, meta);
}

// Case-insensitive lookup map (Windows paths are case-insensitive)
const PROGRAMS_CI = new Map(
  Object.keys(PROGRAMS).map(k => [k.toLowerCase(), PROGRAMS[k]]),
);

// Bare command name -> entry, built once rather than scanned per lookup
const PROGRAMS_BY_COMMAND = new Map();
for (const entry of Object.values(PROGRAMS)) {
  for (const command of entry.commandNames || []) {
    PROGRAMS_BY_COMMAND.set(command.toLowerCase(), entry);
  }
}

const normalizeProgramPath = p =>
  String(p)
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .toLowerCase();

/** Look up a registered program by its executable's VFS path. */
// Other seeded copies of a registered binary (XP keeps notepad.exe in both
// WINDOWS and system32); they launch the registered program
const MIRRORS = new Map(
  [['C:/WINDOWS/notepad.exe', EXE_PATHS.NOTEPAD]].map(([copy, exe]) => [
    normalizeProgramPath(copy),
    exe,
  ]),
);

export function getProgramByPath(path) {
  if (!path) return null;
  const key = normalizeProgramPath(path);
  const mirrored = MIRRORS.get(key);
  return (
    PROGRAMS_CI.get(mirrored ? normalizeProgramPath(mirrored) : key) || null
  );
}

/** Resolve a bare command name ('notepad', 'cmd', 'winmine.exe') to a program. */
export function getProgramByCommand(command) {
  if (!command) return null;
  const cmd = String(command)
    .trim()
    .toLowerCase()
    .replace(/\.exe$/, '');
  const entry = PROGRAMS_BY_COMMAND.get(cmd);
  return entry ? { exePath: entry.exePath, entry } : null;
}

/** The programs the Start menu's most-used list never shows. */
export const MFU_EXCLUDED = Object.values(PROGRAMS)
  .filter(entry => entry.excludeFromMfu)
  .map(entry => entry.exePath);

/**
 * Shell-internal windows that are not programs: just the error box now —
 * the Recycle Bin and Control Panel became Explorer namespaces.
 */
export const SHELL_WINDOWS = {
  error: {
    header: {
      icon: null,
      title: 'C:\\',
      buttons: ['close'],
      noFooterWindow: true,
    },
    component: ErrorBox,
    ...WARNING_BOX_LAYOUT,
    resizable: false,
    multiInstance: true,
  },
};
