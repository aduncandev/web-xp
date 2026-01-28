import React from 'react';
import InternetExplorer from './InternetExplorer';
import ErrorBox from './ErrorBox';
import MyComputer from './MyComputer';
import Notepad from './Notepad';
import Winamp from './Winamp';
import Paint from './Paint';
import AboutMe from './AboutMe';
import PictoChat from './PictoChat';
import Egg from './Egg';
import MediaPlayer from './MediaPlayer';

// --- Renamed Imports for Wrapper Logic ---
import MinesweeperComponent from './Minesweeper';
import VoltorbFlipComponent from './VoltorbFlip';
import PinballComponent from './Pinball';

// --- Icon Imports ---
import iePaper from 'assets/windowsIcons/ie-paper.png';
import ie from 'assets/windowsIcons/ie.png';
import mine from 'assets/minesweeper/mine-icon.png';
import error from 'assets/windowsIcons/897(16x16).png';
import computer from 'assets/windowsIcons/676(16x16).png';
import computerLarge from 'assets/windowsIcons/676(32x32).png';
import notepad from 'assets/windowsIcons/327(16x16).png';
import notepadLarge from 'assets/windowsIcons/327(32x32).png';
import winampIcon from 'assets/windowsIcons/winamp.png';
import paintLarge from 'assets/windowsIcons/680(32x32).png';
import paint from 'assets/windowsIcons/680(16x16).png';
import aboutMeIcon from 'assets/windowsIcons/touricon.png';
import aboutMeIconLarge from 'assets/windowsIcons/touricon.png';
import voltorbFlipIcon from 'assets/windowsIcons/voltorb.png';
import voltorbFlipIconLarge from 'assets/windowsIcons/voltorb.png';
import pinballIcon16 from 'assets/windowsIcons/pinball.png';
import pinballIcon32 from 'assets/windowsIcons/pinball.png';
import pictoChatIcon from 'assets/windowsIcons/pictochat.png';
import pictoChatIconLarge from 'assets/windowsIcons/pictochat.png';
import eggIcon from 'assets/windowsIcons/tree.gif';
import eggIconLarge from 'assets/windowsIcons/tree.gif';
import mediaPlayerIcon from 'assets/windowsIcons/846(16x16).png';
import mediaPlayerIconLarge from 'assets/windowsIcons/846(32x32).png';

// --- Helper Functions ---

// 1. Strict Mobile Device Check (User Agent)
const isMobileUA = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return (
    /android/i.test(userAgent) ||
    (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream)
  );
};

// 2. Screen Dimensions Check (Width AND Height)
const isScreenTooSmall = (minW, minH) => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < minW || window.innerHeight < minH;
};

// 3. Window State Helpers
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

// --- Blocking Logic Definitions ---

const checkMinesweeperBlock = () => isMobileUA(); // Strictly User Agent
const checkPinballBlock = () => isMobileUA() || isScreenTooSmall(600, 470); // UA OR Size
const checkVoltorbBlock = () => isScreenTooSmall(570, 670); // Size Only (Width + Height)

// --- Component Wrappers ---

const WrappedMinesweeper = props => {
  if (checkMinesweeperBlock()) {
    return (
      <ErrorBox
        {...props}
        message="Mobile Device Detected: Minesweeper is designed for desktop mouse interaction and does not function correctly on mobile devices."
        title="Compatibility Warning"
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
      />
    );
  }
  return <PinballComponent {...props} />;
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

// ---------------------

const gen = () => {
  let id = -1;
  return () => {
    id += 1;
    return id;
  };
};
const genId = gen();

export const defaultAppState = [];

export const defaultIconState = [
  {
    id: genId(),
    icon: ie,
    title: 'Internet Explorer',
    component: InternetExplorer,
    isFocus: false,
    appName: 'Internet Explorer',
  },
  {
    id: genId(),
    icon: mine,
    title: 'Minesweeper',
    component: WrappedMinesweeper,
    isFocus: false,
    appName: 'Minesweeper',
  },
  {
    id: genId(),
    icon: computerLarge,
    title: 'My Computer',
    component: MyComputer,
    isFocus: false,
    appName: 'My Computer',
  },
  {
    id: genId(),
    icon: notepadLarge,
    title: 'Notepad',
    component: Notepad,
    isFocus: false,
    appName: 'Notepad',
  },
  {
    id: genId(),
    icon: winampIcon,
    title: 'Winamp',
    component: Winamp,
    isFocus: false,
    appName: 'Winamp',
  },
  {
    id: genId(),
    icon: paintLarge,
    title: 'Paint',
    component: Paint,
    isFocus: false,
    appName: 'Paint',
  },
  {
    id: genId(),
    icon: aboutMeIconLarge,
    title: 'aduncan.dev Tour',
    component: AboutMe,
    isFocus: false,
    appName: 'AboutMe',
  },
  {
    id: genId(),
    icon: voltorbFlipIconLarge,
    title: 'Voltorb Flip',
    component: WrappedVoltorb,
    isFocus: false,
    appName: 'VoltorbFlip',
  },
  {
    id: genId(),
    icon: pinballIcon32,
    title: '3D Pinball',
    component: WrappedPinball,
    isFocus: false,
    appName: 'Pinball',
  },
  {
    id: genId(),
    icon: pictoChatIconLarge,
    title: 'PictoChat',
    component: PictoChat,
    isFocus: false,
    appName: 'PictoChat',
  },
  {
    id: genId(),
    icon: eggIconLarge,
    title: '???',
    component: Egg,
    isFocus: false,
    appName: 'Egg',
  },
  {
    id: genId(),
    icon: mediaPlayerIconLarge,
    title: 'Media Player',
    component: MediaPlayer,
    isFocus: false,
    appName: 'MediaPlayer',
  },
];

export const appSettings = {
  'Internet Explorer': {
    name: 'Internet Explorer',
    header: { icon: iePaper, title: 'InternetExplorer' },
    component: InternetExplorer,
    defaultSize: { width: 700, height: 500 },
    defaultOffset: getCenter(700, 500),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(700, 500, true),
    multiInstance: true,
  },
  Minesweeper: {
    name: 'Minesweeper',
    header: { icon: mine, title: 'Minesweeper' },
    component: WrappedMinesweeper,
    defaultSize: checkMinesweeperBlock()
      ? { width: 380, height: 0 }
      : { width: 0, height: 0 },
    defaultOffset: getCenter(0, 0),
    resizable: false,
    minimized: false,
    maximized: checkMinesweeperBlock() ? false : shouldMaximize(0, 0, false),
    multiInstance: true,
  },
  Error: {
    name: 'Error',
    header: {
      icon: error,
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
  'My Computer': {
    name: 'My Computer',
    header: { icon: computer, title: 'My Computer' },
    component: MyComputer,
    defaultSize: { width: 660, height: 500 },
    defaultOffset: getCenter(660, 500),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(660, 500, true),
    multiInstance: false,
  },
  Notepad: {
    name: 'Notepad',
    header: { icon: notepad, title: 'Untitled - Notepad' },
    component: Notepad,
    defaultSize: { width: 660, height: 500 },
    defaultOffset: getCenter(660, 500),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(660, 500, true),
    multiInstance: true,
  },
  Winamp: {
    name: 'Winamp',
    header: { icon: winampIcon, title: 'Winamp', invisible: true },
    component: Winamp,
    defaultSize: { width: 0, height: 0 },
    defaultOffset: getCenter(0, 0),
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: false,
  },
  Paint: {
    name: 'Paint',
    header: { icon: paint, title: 'Untitled - Paint' },
    component: Paint,
    defaultSize: { width: 660, height: 500 },
    defaultOffset: getCenter(660, 500),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(660, 500, true),
    multiInstance: true,
  },
  AboutMe: {
    name: 'AboutMe',
    header: { icon: aboutMeIcon, title: 'aduncan.dev Tour' },
    component: AboutMe,
    defaultSize: { width: 550, height: 400 },
    defaultOffset: getCenter(550, 400),
    resizable: false,
    minimized: false,
    maximized: shouldMaximize(550, 400, false),
    multiInstance: false,
  },
  VoltorbFlip: {
    name: 'VoltorbFlip',
    header: { icon: voltorbFlipIcon, title: 'Voltorb Flip' },
    component: WrappedVoltorb,
    defaultSize: checkVoltorbBlock()
      ? { width: 380, height: 0 }
      : { width: 570, height: 670 },
    defaultOffset: getCenter(570, 670),
    resizable: false,
    minimized: false,
    maximized: checkVoltorbBlock() ? false : shouldMaximize(570, 670, false),
    multiInstance: false,
  },
  Pinball: {
    name: 'Pinball',
    header: {
      icon: pinballIcon16,
      title: '3D Pinball for Windows - Space Cadet',
    },
    component: WrappedPinball,
    defaultSize: checkPinballBlock()
      ? { width: 380, height: 0 }
      : { width: 600, height: 470 },
    defaultOffset: getCenter(600, 470),
    resizable: false,
    minimized: false,
    maximized: checkPinballBlock() ? false : shouldMaximize(600, 470, false),
    multiInstance: false,
  },
  PictoChat: {
    name: 'PictoChat',
    header: { icon: pictoChatIcon, title: 'PictoChat' },
    component: PictoChat,
    defaultSize: { width: 400, height: 600 },
    defaultOffset: getCenter(400, 600),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(400, 600, true),
    multiInstance: false,
  },
  Egg: {
    name: 'Egg',
    header: { icon: eggIcon, title: '???' },
    component: Egg,
    defaultSize: { width: 400, height: 350 },
    defaultOffset: getCenter(400, 350),
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: false,
  },
  MediaPlayer: {
    name: 'MediaPlayer',
    header: { icon: mediaPlayerIcon, title: 'Media Player', invisible: false },
    component: MediaPlayer,
    defaultSize: { width: 300, height: 450 },
    defaultOffset: getCenter(300, 450),
    resizable: true,
    minimized: false,
    maximized: shouldMaximize(300, 450, true),
    multiInstance: false,
    minWidth: 300,
    minHeight: 300,
  },
};

export {
  InternetExplorer,
  MinesweeperComponent as Minesweeper,
  ErrorBox,
  MyComputer,
  Notepad,
  Winamp,
  Paint,
  AboutMe,
  VoltorbFlipComponent as VoltorbFlip,
  PinballComponent as Pinball,
  PictoChat,
  Egg,
  MediaPlayer,
};
