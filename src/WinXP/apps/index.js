import InternetExplorer from './InternetExplorer';
import Minesweeper from './Minesweeper';
import ErrorBox from './ErrorBox';
import MyComputer from './MyComputer';
import Notepad from './Notepad';
import Winamp from './Winamp';
import Paint from './Paint';
import AboutMe from './AboutMe';
import VoltorbFlip from './VoltorbFlip';
import Pinball from './Pinball';
import PictoChat from './PictoChat';

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

const gen = () => {
  let id = -1;
  return () => {
    id += 1;
    return id;
  };
};
const genId = gen();
// const genIndex = gen(); // This was unused

export const defaultAppState = [
  // No apps open by default
];

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
    icon: winampIcon, // Using the renamed import
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
    component: VoltorbFlip,
    isFocus: false,
    appName: 'VoltorbFlip',
  },
  {
    id: genId(),
    icon: pinballIcon32,
    title: '3D Pinball',
    component: Pinball,
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
];

export const appSettings = {
  'Internet Explorer': {
    name: 'Internet Explorer',
    header: {
      icon: iePaper,
      title: 'InternetExplorer',
    },
    component: InternetExplorer,
    defaultSize: {
      width: 700,
      height: 500,
    },
    defaultOffset: {
      x: 140,
      y: 30,
    },
    resizable: true,
    minimized: false,
    maximized: typeof window !== 'undefined' && window.innerWidth < 800,
    multiInstance: true,
  },
  Minesweeper: {
    name: 'Minesweeper',
    header: {
      icon: mine,
      title: 'Minesweeper',
    },
    component: Minesweeper,
    defaultSize: {
      width: 0,
      height: 0,
    },
    defaultOffset: {
      x: 190,
      y: 180,
    },
    resizable: false,
    minimized: false,
    maximized: false,
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
    defaultSize: {
      width: 380,
      height: 0,
    },
    defaultOffset: {
      x: typeof window !== 'undefined' ? window.innerWidth / 2 - 190 : 200,
      y: typeof window !== 'undefined' ? window.innerHeight / 2 - 60 : 150,
    },
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: true,
  },
  'My Computer': {
    name: 'My Computer',
    header: {
      icon: computer,
      title: 'My Computer',
    },
    component: MyComputer,
    defaultSize: {
      width: 660,
      height: 500,
    },
    defaultOffset: {
      x: 260,
      y: 50,
    },
    resizable: true,
    minimized: false,
    maximized: typeof window !== 'undefined' && window.innerWidth < 800,
    multiInstance: false,
  },
  Notepad: {
    name: 'Notepad',
    header: {
      icon: notepad,
      title: 'Untitled - Notepad',
    },
    component: Notepad,
    defaultSize: {
      width: 660,
      height: 500,
    },
    defaultOffset: {
      x: 270,
      y: 60,
    },
    resizable: true,
    minimized: false,
    maximized: typeof window !== 'undefined' && window.innerWidth < 800,
    multiInstance: true,
  },
  Winamp: {
    name: 'Winamp',
    header: {
      icon: winampIcon, // Using the renamed import
      title: 'Winamp',
      invisible: true,
    },
    component: Winamp,
    defaultSize: {
      width: 0,
      height: 0,
    },
    defaultOffset: {
      x: 0,
      y: 0,
    },
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: false,
    // Assuming initialTracks and initialSkin are handled by its own config or passed dynamically
  },
  Paint: {
    name: 'Paint',
    header: {
      icon: paint,
      title: 'Untitled - Paint',
    },
    component: Paint,
    defaultSize: {
      width: 660,
      height: 500,
    },
    defaultOffset: {
      x: 280,
      y: 70,
    },
    resizable: true,
    minimized: false,
    maximized: typeof window !== 'undefined' && window.innerWidth < 800,
    multiInstance: true,
  },
  AboutMe: {
    name: 'AboutMe',
    header: {
      icon: aboutMeIcon,
      title: 'aduncan.dev Tour',
    },
    component: AboutMe,
    defaultSize: {
      width: 550,
      height: 400,
    },
    defaultOffset: {
      x: 200,
      y: 100,
    },
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: false,
  },
  VoltorbFlip: {
    name: 'VoltorbFlip',
    header: {
      icon: voltorbFlipIcon, // Using the provided Voltorb icon
      title: 'Voltorb Flip',
    },
    component: VoltorbFlip,
    defaultSize: {
      width: 570,
      height: 670,
    },
    defaultOffset: {
      x: 250,
      y: 150,
    },
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
    defaultSize: {
      width: 600,
      height: 470,
    },
    defaultOffset: {
      x: 150,
      y: 100,
    },
    resizable: false,
    minimized: false,
    maximized: false,
    multiInstance: false,
  },
  PictoChat: {
    name: 'PictoChat',
    header: {
      icon: pictoChatIcon,
      title: 'PictoChat',
    },
    component: PictoChat,
    defaultSize: {
      width: 400,
      height: 600,
    },
    defaultOffset: {
      x: 150,
      y: 100,
    },
    resizable: true,
    minimized: false,
    maximized: true,
    multiInstance: false,
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
};
