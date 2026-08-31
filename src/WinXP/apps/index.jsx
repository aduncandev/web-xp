import React from 'react';
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
import MarioVsLuigiComponent from './MarioVsLuigi';
import ClimbRaceComponent from './ClimbRace';

import MinesweeperComponent from './Minesweeper';
import VoltorbFlipComponent from './VoltorbFlip';
import PinballComponent from './Pinball';

import { EXE_PATHS } from '../../context/vfsConstants';

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

const isMobileUA = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return (
    /android/i.test(userAgent) ||
    (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream)
  );
};

const isScreenTooSmall = (minW, minH) => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < minW || window.innerHeight < minH;
};

const getWinState = () => {
  if (typeof window === 'undefined')
    return { w: 1024, h: 768, isMobile: false };
  return {
    w: window.innerWidth,
    h: window.innerHeight,
    isMobile: window.innerWidth < 800,
  };
};

const getCenter = (appW, appH) => {
  const { w, h } = getWinState();
  const targetW = appW || 300;
  const targetH = appH || 300;
  return {
    x: Math.max(0, w / 2 - targetW / 2),
    y: Math.max(0, h / 2 - targetH / 2),
  };
};

const shouldMaximize = (appW, appH, isResizable) => {
  const { w, h, isMobile } = getWinState();
  if (isResizable) return isMobile;
  return w < appW || h < appH;
};

const checkMinesweeperBlock = () => isMobileUA();
const checkPinballBlock = () => isMobileUA() || isScreenTooSmall(600, 470);
const checkVoltorbBlock = () => isScreenTooSmall(570, 670);

const WrappedMinesweeper = props => {
  if (checkMinesweeperBlock()) {
    return (
      <ErrorBox
        {...props}
        message="Mobile Device Detected: Minesweeper is designed for desktop mouse interaction and does not function correctly on mobile devices."
        title="Compatibility Warning"
        iconType="warning"
      />
    );
  }
  return <MinesweeperComponent {...props} />;
};

const WrappedPinball = props => {
  if (checkPinballBlock()) {
    return (
      <ErrorBox
        {...props}
        message="Incompatible Device / Screen: 3D Pinball requires a desktop environment and a screen size of at least 600x470px."
        title="Compatibility Warning"
        iconType="warning"
      />
    );
  }
  return <PinballComponent {...props} />;
};

const WrappedMarioVsLuigi = props => {
  if (isMobileUA()) {
    return (
      <ErrorBox
        {...props}
        message="Mobile Device Detected: Mario vs Luigi requires a desktop browser with keyboard input."
        title="Compatibility Warning"
        iconType="warning"
      />
    );
  }
  return <MarioVsLuigiComponent {...props} />;
};

const WrappedVoltorb = props => {
  if (checkVoltorbBlock()) {
    return (
      <ErrorBox
        {...props}
        message="Screen Too Small: Voltorb Flip requires a viewport of at least 570x670px. Please rotate your device or use a larger screen."
        title="Display Error"
      />
    );
  }
  return <VoltorbFlipComponent {...props} />;
};

export const defaultAppState = [];

/**
 * The program registry: every runnable program keyed by the canonical VFS
 * path of its executable. Launching ANYTHING flows through the shell
 * resolving one of these paths (shortcuts, Start Menu, file associations,
 * double-clicked .exe files, the Run box, cmd's `start`).
 *
 * Entry shape: window config consumed by the reducer/Windows renderer
 * (component, header, defaultSize/Offset, resizable, maximized,
 * multiInstance, minWidth/minHeight) plus program metadata (displayName,
 * description, commandNames for Run/cmd bare-name resolution).
 */
export const PROGRAMS = {
  [EXE_PATHS.IEXPLORE]: {
    name: 'Internet Explorer',
    displayName: 'Internet Explorer',
    description: 'Internet Explorer',
    commandNames: ['iexplore'],
    header: { icon: iePaper, title: 'Microsoft Internet Explorer' },
    component: InternetExplorer,
    defaultSize: { width: 700, height: 500 },
    defaultOffset: getCenter(700, 500),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(700, 500, true),
    multiInstance: true,
  },
  [EXE_PATHS.WINMINE]: {
    name: 'Minesweeper',
    displayName: 'Minesweeper',
    description: 'Entertainment Pack Minesweeper Game',
    commandNames: ['winmine'],
    header: { icon: mine, title: 'Minesweeper' },
    component: WrappedMinesweeper,
    defaultSize: checkMinesweeperBlock()
      ? { width: 380, height: 0 }
      : { width: 0, height: 0 },
    defaultOffset: checkMinesweeperBlock()
      ? getCenter(380, 200)
      : getCenter(0, 0),
    resizable: false,
    minimized: false,
    maximized: checkMinesweeperBlock() ? false : shouldMaximize(0, 0, false),
    multiInstance: true,
  },
  [EXE_PATHS.EXPLORER]: {
    name: 'Explorer',
    displayName: 'Windows Explorer',
    description: 'Windows Explorer',
    commandNames: ['explorer'],
    header: { icon: computer, title: 'My Computer' },
    component: Explorer,
    defaultSize: { width: 660, height: 500 },
    defaultOffset: getCenter(660, 500),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(660, 500, true),
    multiInstance: true,
  },
  [EXE_PATHS.NOTEPAD]: {
    name: 'Notepad',
    displayName: 'Notepad',
    description: 'Windows NT Notepad',
    commandNames: ['notepad'],
    header: { icon: notepad, title: 'Untitled - Notepad' },
    component: Notepad,
    defaultSize: { width: 660, height: 500 },
    defaultOffset: getCenter(660, 500),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(660, 500, true),
    multiInstance: true,
  },
  [EXE_PATHS.WINAMP]: {
    name: 'Winamp',
    displayName: 'Winamp',
    description: 'Winamp media player',
    commandNames: ['winamp'],
    header: { icon: winampIcon, title: 'Winamp', invisible: true },
    component: Winamp,
    defaultSize: { width: 0, height: 0 },
    // 0x0 wrapper pinned to the origin: the component's Host div spans the
    // desktop from here so webamp's contained windows use page coordinates
    defaultOffset: { x: 0, y: 0 },
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: false,
  },
  [EXE_PATHS.MVL]: {
    name: 'MarioVsLuigi',
    displayName: 'Mario vs Luigi',
    description: 'NSMB-MarioVsLuigi online multiplayer',
    publisher: 'ipodtouch0218',
    commandNames: ['mariovsluigi'],
    header: { icon: mvlIcon, title: 'Mario vs Luigi' },
    component: WrappedMarioVsLuigi,
    defaultSize: { width: 960, height: 585 },
    defaultOffset: getCenter(960, 585),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(960, 585, true),
    multiInstance: false,
    minWidth: 640,
    minHeight: 420,
  },
  [EXE_PATHS.DELTASCEND]: {
    name: 'DELTASCEND',
    displayName: 'DELTASCEND',
    description: 'The chapter 5 wall climb, plus a wall for every seed',
    publisher: 'aduncan.dev',
    commandNames: ['climbrace', 'deltaclimb', 'deltascend'],
    header: { icon: climbRaceIcon, title: 'DELTASCEND' },
    component: ClimbRaceComponent,
    defaultSize: { width: 800, height: 628 },
    defaultOffset: getCenter(800, 628),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(800, 628, true),
    multiInstance: false,
    minWidth: 480,
    minHeight: 388,
  },
  [EXE_PATHS.GUESTBOOK]: {
    name: 'Guest Book',
    displayName: 'Guest Book',
    description: 'Sign the guest book',
    publisher: 'aduncan.dev',
    commandNames: ['guestbook'],
    header: { icon: guestBookIcon, title: 'Guest Book' },
    component: GuestBook,
    defaultSize: { width: 560, height: 520 },
    defaultOffset: getCenter(560, 520),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(560, 520, true),
    multiInstance: false,
    minWidth: 380,
    minHeight: 340,
  },
  [EXE_PATHS.MSPAINT]: {
    name: 'Paint',
    displayName: 'Paint',
    description: 'Windows Paint',
    commandNames: ['mspaint', 'paint'],
    header: { icon: paint, title: 'untitled - Paint' },
    component: Paint,
    defaultSize: { width: 660, height: 520 },
    defaultOffset: getCenter(660, 520),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(660, 520, true),
    multiInstance: true,
  },
  [EXE_PATHS.SHIMGVW]: {
    name: 'PictureViewer',
    displayName: 'Windows Picture and Fax Viewer',
    description: 'Windows Picture and Fax Viewer',
    commandNames: ['shimgvw', 'pictureviewer'],
    header: {
      icon: getArt('Bitmap', paint),
      title: 'Windows Picture and Fax Viewer',
    },
    component: PictureViewer,
    defaultSize: { width: 795, height: 560 },
    defaultOffset: getCenter(795, 560),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(795, 560, true),
    multiInstance: true,
  },
  [EXE_PATHS.TOUR]: {
    name: 'AboutMe',
    displayName: 'aduncan.dev Tour',
    description: 'A tour of aduncan.dev',
    publisher: 'aduncan.dev',
    commandNames: ['tour'],
    header: { icon: aboutMeIcon, title: 'aduncan.dev Tour' },
    component: AboutMe,
    defaultSize: { width: 640, height: 480 },
    defaultOffset: getCenter(640, 480),
    resizable: false,
    minimized: false,
    maximized: shouldMaximize(640, 480, false),
    multiInstance: false,
  },
  [EXE_PATHS.VOLTORB]: {
    name: 'VoltorbFlip',
    displayName: 'Voltorb Flip',
    description: 'Voltorb Flip',
    publisher: 'aduncan.dev',
    commandNames: ['voltorbflip'],
    header: { icon: voltorbFlipIcon, title: 'Voltorb Flip' },
    component: WrappedVoltorb,
    defaultSize: checkVoltorbBlock()
      ? { width: 380, height: 0 }
      : { width: 570, height: 670 },
    defaultOffset: checkVoltorbBlock()
      ? getCenter(380, 200)
      : getCenter(570, 670),
    resizable: false,
    minimized: false,
    maximized: checkVoltorbBlock() ? false : shouldMaximize(570, 670, false),
    multiInstance: false,
  },
  [EXE_PATHS.PINBALL]: {
    name: 'Pinball',
    displayName: '3D Pinball',
    description: '3D Pinball for Windows - Space Cadet',
    commandNames: ['pinball'],
    header: {
      icon: pinballIcon16,
      title: '3D Pinball for Windows - Space Cadet',
    },
    component: WrappedPinball,
    defaultSize: checkPinballBlock()
      ? { width: 380, height: 0 }
      : { width: 600, height: 470 },
    defaultOffset: checkPinballBlock()
      ? getCenter(380, 200)
      : getCenter(600, 470),
    resizable: false,
    minimized: false,
    maximized: checkPinballBlock() ? false : shouldMaximize(600, 470, false),
    multiInstance: false,
  },
  [EXE_PATHS.PICTOCHAT]: {
    name: 'PictoChat',
    displayName: 'PictoChat',
    description: 'PictoChat',
    publisher: 'aduncan.dev',
    commandNames: ['pictochat'],
    header: { icon: pictoChatIcon, title: 'PictoChat' },
    component: PictoChat,
    defaultSize: { width: 400, height: 600 },
    defaultOffset: getCenter(400, 600),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(400, 600, true),
    multiInstance: false,
  },
  [EXE_PATHS.DOGVIRUS]: {
    name: 'DogVirus',
    displayName: 'Dog Virus',
    description: 'Dog Virus',
    publisher: 'skillzdev.xyz',
    unlisted: true, // secrets stay out of program pickers
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
    defaultOffset: getCenter(240, 230),
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: false,
  },
  // The windows the virus spawns — the same component in child mode.
  [EXE_PATHS.DOGWINDOW]: {
    name: 'DogWindow',
    displayName: 'A Dog',
    description: 'A Dog',
    unlisted: true, // secrets stay out of program pickers
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
    defaultOffset: getCenter(220, 210),
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: true,
  },
  [EXE_PATHS.MISSINGNO]: {
    name: 'Egg',
    displayName: '???',
    description: '???',
    unlisted: true, // secrets stay out of program pickers
    commandNames: ['room_man'],
    header: { icon: eggIcon, title: '???' },
    component: Egg,
    defaultSize: { width: 400, height: 350 },
    defaultOffset: getCenter(400, 350),
    resizable: true,
    minimized: false,
    maximized: false,
    multiInstance: false,
    minWidth: 400,
    minHeight: 350,
  },
  [EXE_PATHS.STORE]: {
    name: 'Store',
    displayName: 'XP Shop',
    description: 'Add or remove optional software and extras',
    publisher: 'aduncan.dev',
    commandNames: ['store', 'xpshop'],
    header: { icon: storeIcon, title: 'XP Shop' },
    component: Store,
    // 4:3 like the TV it belongs on; the shop page letterboxes itself into
    // whatever size the window ends up.
    defaultSize: { width: 640, height: 508 },
    defaultOffset: getCenter(640, 508),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(640, 508, true),
    multiInstance: false,
    minWidth: 400,
    minHeight: 330,
  },
  [EXE_PATHS.TAGEDITOR]: {
    name: 'TagEditor',
    displayName: 'Media Tag Editor',
    description: 'Media Tag Editor',
    commandNames: ['tageditor'],
    header: { icon: tagEditorIcon, title: 'Media Tag Editor' },
    component: TagEditor,
    defaultSize: { width: 820, height: 520 },
    defaultOffset: getCenter(820, 520),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(820, 520, true),
    multiInstance: false,
    minWidth: 520,
    minHeight: 320,
  },
  [EXE_PATHS.WMPLAYER]: {
    name: 'WindowsMediaPlayer',
    displayName: 'Windows Media Player',
    description: 'Windows Media Player',
    commandNames: ['wmplayer'],
    header: { icon: mediaPlayerIcon, title: 'Windows Media Player' },
    component: WindowsMediaPlayer,
    // 676x533 reproduces the reference capture's 670x483 player body
    // exactly, given the shell's 3px borders and 25px title bar.
    defaultSize: { width: 676, height: 533 },
    defaultOffset: getCenter(676, 533),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(676, 533, true),
    multiInstance: false,
    minWidth: 560,
    minHeight: 520,
  },
  // The previous player, kept where XP kept its own older one. Still fully
  // functional, just not a recreation of any particular Microsoft release.
  [EXE_PATHS.MPLAYER2]: {
    name: 'MediaPlayer',
    displayName: 'Media Player',
    description: 'Windows Media Player',
    commandNames: ['mplayer2'],
    header: { icon: mediaPlayerIcon, title: 'Media Player', invisible: false },
    component: MediaPlayer,
    defaultSize: { width: 800, height: 575 },
    defaultOffset: getCenter(300, 450),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(300, 450, true),
    multiInstance: false,
    minWidth: 370,
    minHeight: 370,
  },
  [EXE_PATHS.CMD]: {
    name: 'CommandPrompt',
    displayName: 'Command Prompt',
    description: 'Windows Command Processor',
    commandNames: ['cmd'],
    header: { icon: cmdIcon, title: 'C:\\WINDOWS\\system32\\cmd.exe' },
    component: CommandPrompt,
    defaultSize: { width: 680, height: 380 },
    defaultOffset: getCenter(680, 380),
    resizable: true,
    minimized: false,
    maximized: false,
    multiInstance: true,
    minWidth: 320,
    minHeight: 200,
  },
  'C:/WINDOWS/system32/ntbackup.exe': {
    name: 'Backup',
    displayName: 'Backup',
    description: 'Back up or restore files and settings',
    commandNames: ['ntbackup', 'backup'],
    header: { icon: backupIcon, title: 'Backup Utility' },
    component: Backup,
    defaultSize: { width: 470, height: 380 },
    defaultOffset: getCenter(470, 380),
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: false,
  },
  'C:/WINDOWS/system32/calc.exe': {
    name: 'Calculator',
    displayName: 'Calculator',
    description: 'Windows Calculator application file',
    commandNames: ['calc'],
    header: { icon: calcIcon, title: 'Calculator' },
    component: Calculator,
    // 260x260 outer frame reproduces the real calc.exe Standard-view
    // client area (254x229) given the shell's 3px borders + 25px title bar
    defaultSize: { width: 260, height: 260 },
    defaultOffset: getCenter(260, 260),
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: true,
  },
  'C:/WINDOWS/system32/sndvol32.exe': {
    name: 'Volume Control',
    displayName: 'Volume Control',
    description: 'Volume Control application',
    commandNames: ['sndvol32', 'sndvol'],
    header: { icon: volumeSmallIcon, title: 'Volume Control' },
    component: VolumeControl,
    defaultSize: { width: 565, height: 300 },
    defaultOffset: getCenter(565, 300),
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: false,
  },
  'C:/WINDOWS/system32/taskmgr.exe': {
    name: 'TaskManager',
    displayName: 'Windows Task Manager',
    description: 'Windows Task Manager',
    commandNames: ['taskmgr'],
    header: { icon: taskmgrIcon, title: 'Windows Task Manager' },
    component: TaskManager,
    defaultSize: { width: 403, height: 434 },
    defaultOffset: getCenter(403, 434),
    resizable: true,
    minimized: false,
    maximized: false,
    multiInstance: false,
    minWidth: 400,
    minHeight: 340,
  },
  'C:/Program Files/Windows NT/Accessories/wordpad.exe': {
    name: 'WordPad',
    displayName: 'WordPad',
    description: 'Windows WordPad application',
    commandNames: ['wordpad', 'write'],
    header: { icon: wordPadIcon, title: 'Document - WordPad' },
    component: WordPad,
    defaultSize: { width: 620, height: 460 },
    defaultOffset: getCenter(620, 460),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(620, 460, true),
    multiInstance: true,
    minWidth: 460,
    minHeight: 320,
  },
  'C:/WINDOWS/system32/control.exe': {
    name: 'ControlPanel',
    displayName: 'Control Panel',
    description: 'Control Panel',
    commandNames: ['control'],
    header: { icon: controlIcon, title: 'Control Panel' },
    component: ControlPanel,
    defaultSize: { width: 660, height: 500 },
    defaultOffset: getCenter(660, 500),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(660, 500, true),
    multiInstance: false,
  },
  'C:/WINDOWS/system32/desk.cpl': {
    name: 'DisplayProperties',
    displayName: 'Display Properties',
    description: 'Display Properties',
    commandNames: ['desk.cpl'],
    header: { icon: displayIcon, title: 'Display Properties' },
    component: DisplayProperties,
    defaultSize: { width: 413, height: 484 },
    defaultOffset: getCenter(413, 484),
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: false,
  },
  'C:/WINDOWS/system32/sysdm.cpl': {
    name: 'SystemProperties',
    displayName: 'System Properties',
    description: 'System Properties',
    commandNames: ['sysdm.cpl'],
    header: { icon: sysdmIcon, title: 'System Properties' },
    component: SystemProperties,
    defaultSize: { width: 413, height: 484 },
    defaultOffset: getCenter(413, 484),
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: false,
  },
  'C:/WINDOWS/system32/sol.exe': {
    name: 'Solitaire',
    displayName: 'Solitaire',
    description: 'Solitaire Game',
    commandNames: ['sol', 'solitaire'],
    header: { icon: solitaireIcon, title: 'Solitaire' },
    component: Solitaire,
    defaultSize: { width: 585, height: 446 },
    defaultOffset: getCenter(585, 446),
    resizable: true,
    minimized: false,
    maximized: false,
    multiInstance: true,
    minWidth: 585,
    minHeight: 420,
  },
};

// Case-insensitive lookup map (Windows paths are case-insensitive)
const PROGRAMS_CI = new Map(
  Object.keys(PROGRAMS).map(k => [k.toLowerCase(), PROGRAMS[k]]),
);

const normalizeProgramPath = p =>
  String(p)
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .toLowerCase();

/** Look up a registered program by its executable's VFS path. */
export function getProgramByPath(path) {
  if (!path) return null;
  return PROGRAMS_CI.get(normalizeProgramPath(path)) || null;
}

/** Resolve a bare command name ('notepad', 'cmd', 'winmine.exe') to a program. */
export function getProgramByCommand(command) {
  if (!command) return null;
  const cmd = String(command)
    .trim()
    .toLowerCase()
    .replace(/\.exe$/, '');
  for (const [exePath, entry] of Object.entries(PROGRAMS)) {
    if ((entry.commandNames || []).includes(cmd)) {
      return { exePath, entry };
    }
  }
  return null;
}

/**
 * Shell-internal windows that are not programs: just the error box now —
 * the Recycle Bin and Control Panel became Explorer namespaces.
 */
export const SHELL_WINDOWS = {
  error: {
    name: 'Error',
    header: {
      icon: null,
      title: 'C:\\',
      buttons: ['close'],
      noFooterWindow: true,
    },
    component: ErrorBox,
    defaultSize: { width: 380, height: 0 },
    defaultOffset: getCenter(380, 200),
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: true,
  },
};

export {
  InternetExplorer,
  MinesweeperComponent as Minesweeper,
  ErrorBox,
  Explorer,
  Notepad,
  Winamp,
  Paint,
  AboutMe,
  VoltorbFlipComponent as VoltorbFlip,
  PinballComponent as Pinball,
  PictoChat,
  Egg,
  MediaPlayer,
  WindowsMediaPlayer,
  TagEditor,
  DogVirus,
};
