import React from 'react';
import InternetExplorer from './InternetExplorer';
import Minesweeper from './Minesweeper';
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

// --- Universal Compatibility Logic ---

const isScreenTooSmall = minWidth => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < minWidth;
};

// 1. The Wrapper Component (renders ErrorBox or App)
const createResponsiveComponent = (Component, minWidth, appName) => props => {
  if (isScreenTooSmall(minWidth)) {
    return (
      <ErrorBox
        {...props}
        message={`Mobile Device / Small Screen Detected:\n\n${appName} requires a minimum screen width of ${minWidth}px to function correctly.\n\nPlease access this page on a desktop computer.`}
        title="Compatibility Warning"
      />
    );
  }
  return <Component {...props} />;
};

// 2. The Size Logic (returns Error Size or App Size)
const getResponsiveSize = (defaultW, defaultH, minWidth) => {
  if (isScreenTooSmall(minWidth)) {
    return { width: 380, height: 0 }; // Standard ErrorBox size
  }
  return { width: defaultW, height: defaultH };
};

// --- Wrapped Components ---
// We redefine these exports as the "Smart" versions
const VoltorbFlip = createResponsiveComponent(
  VoltorbFlipComponent,
  570,
  'Voltorb Flip',
);
const Pinball = createResponsiveComponent(PinballComponent, 600, '3D Pinball');

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
    component: Minesweeper,
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
    component: VoltorbFlip, // Uses the wrapped component
    isFocus: false,
    appName: 'VoltorbFlip',
  },
  {
    id: genId(),
    icon: pinballIcon32,
    title: '3D Pinball',
    component: Pinball, // Uses the wrapped component
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
    component: Minesweeper,
    defaultSize: { width: 0, height: 0 },
    defaultOffset: getCenter(0, 0),
    resizable: false,
    minimized: false,
    maximized: shouldMaximize(0, 0, false),
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
    component: VoltorbFlip,
    // Dynamically set size: Small Error Size OR Big Game Size
    defaultSize: getResponsiveSize(570, 670, 570),
    defaultOffset: getCenter(570, 670),
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: false,
  },
  Pinball: {
    name: 'Pinball',
    header: {
      icon: pinballIcon16,
      title: '3D Pinball for Windows - Space Cadet',
    },
    component: Pinball,
    // Dynamically set size: Small Error Size OR Big Game Size
    defaultSize: getResponsiveSize(600, 470, 600),
    defaultOffset: getCenter(600, 470),
    resizable: false,
    minimized: false,
    maximized: false,
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
  Minesweeper,
  ErrorBox,
  MyComputer,
  Notepad,
  Winamp,
  Paint,
  AboutMe,
  VoltorbFlip,
  Pinball,
  PictoChat,
  Egg,
  MediaPlayer,
};
