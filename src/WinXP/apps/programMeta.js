import { EXE_PATHS } from '../../context/vfsConstants';

import ie16 from 'assets/windowsIcons/896(16x16).png';
import ie32 from 'assets/windowsIcons/ie.png';
import outlook16 from 'assets/windowsIcons/887(16x16).png';
import outlook32 from 'assets/windowsIcons/887(32x32).png';
import notepad16 from 'assets/windowsIcons/327(16x16).png';
import notepad32 from 'assets/windowsIcons/327(32x32).png';
import paint16 from 'assets/windowsIcons/680(16x16).png';
import paint32 from 'assets/windowsIcons/680(32x32).png';
import mediaPlayer16 from 'assets/windowsIcons/846(16x16).png';
import mediaPlayer32 from 'assets/windowsIcons/846(32x32).png';
import cmd16 from 'assets/windowsIcons/56(16x16).png';
import calculator16 from 'assets/windowsIcons/74(16x16).png';
import wordPad16 from 'assets/windowsIcons/153(16x16).png';
import winExplorer16 from 'assets/windowsIcons/156(16x16).png';
import tour16 from 'assets/windowsIcons/676(16x16).png';
import solitaire16 from 'assets/windowsIcons/solitaire.png';
import pinball16 from 'assets/windowsIcons/pinball.png';
import mine from 'assets/minesweeper/mine-icon.png';
import winamp from 'assets/windowsIcons/winamp.png';
import voltorb16 from 'assets/windowsIcons/voltorb.png';
import pictochat32 from 'assets/windowsIcons/pictochat.png';

const OUTLOOK_EXE = 'C:/Program Files/Outlook Express/msimn.exe';
const CALC_EXE = 'C:/WINDOWS/system32/calc.exe';
const SOL_EXE = 'C:/WINDOWS/system32/sol.exe';
const WORDPAD_EXE = 'C:/Program Files/Windows NT/Accessories/wordpad.exe';

/**
 * Facts about a program that more than one surface needs to agree on,
 * keyed by the program's executable path.
 *
 * `displayName` and `publisher` used to be written out in both the program
 * registry and the XP Shop catalog, which is how three programs ended up
 * with a publisher in the shop and none in the registry. `icon16` and
 * `icon32` used to live in two more tables in two other files, one of
 * which was not even exported.
 *
 * Not every program needs an entry, and an entry need not be a registered
 * program — Quick Launch slots can hold any path, so Outlook Express keeps
 * its icons here despite having no registry entry to launch.
 *
 * Anything absent falls back to the registry's own `header.icon`.
 *
 * This is a leaf module: it imports path constants and image assets and
 * nothing else, so both the registry and the shop can read it without the
 * import cycle that pointing the shop at the registry would create.
 */
export const PROGRAM_META = {
  [EXE_PATHS.IEXPLORE]: { icon16: ie16, icon32: ie32 },
  [OUTLOOK_EXE]: { icon16: outlook16, icon32: outlook32 },
  [EXE_PATHS.WINMINE]: { icon16: mine, icon32: mine },
  [EXE_PATHS.NOTEPAD]: { icon16: notepad16, icon32: notepad32 },
  [EXE_PATHS.MSPAINT]: { icon16: paint16, icon32: paint32 },
  [EXE_PATHS.CMD]: { icon16: cmd16 },
  [EXE_PATHS.EXPLORER]: { icon16: winExplorer16 },
  [EXE_PATHS.PINBALL]: { icon16: pinball16 },
  [EXE_PATHS.TOUR]: { icon16: tour16 },
  [CALC_EXE]: { icon16: calculator16 },
  [SOL_EXE]: { icon16: solitaire16 },
  [WORDPAD_EXE]: { icon16: wordPad16 },

  [EXE_PATHS.WMPLAYER]: { icon16: mediaPlayer16, icon32: mediaPlayer32 },

  // Programs the shop also sells: the registry and the catalog both take
  // their name and publisher from here.
  [EXE_PATHS.PICTOCHAT]: {
    displayName: 'PictoChat',
    publisher: 'webxp.net',
    icon32: pictochat32,
  },
  [EXE_PATHS.VOLTORB]: {
    displayName: 'Voltorb Flip',
    publisher: 'webxp.net',
    icon16: voltorb16,
  },
  [EXE_PATHS.TAGEDITOR]: {
    displayName: 'Media Tag Editor',
    publisher: 'webxp.net',
  },
  [EXE_PATHS.WINAMP]: {
    displayName: 'Winamp',
    publisher: 'Nullsoft',
    icon16: winamp,
    icon32: winamp,
  },
  [EXE_PATHS.MPLAYER2]: {
    displayName: 'Media Player',
    publisher: 'Microsoft',
    icon16: mediaPlayer16,
    icon32: mediaPlayer32,
  },
  [EXE_PATHS.MVL]: {
    displayName: 'Mario vs Luigi',
    publisher: 'ipodtouch0218',
  },
  [EXE_PATHS.DELTASCEND]: {
    displayName: 'DELTASCEND',
    publisher: 'webxp.net',
  },
};

/** The small icon for a path, or null when it has no dedicated one. */
export const programIcon16 = path => PROGRAM_META[path]?.icon16 || null;

/** The large icon for a path, falling back to the small one like the
 *  Start menu's large-icon column always has. */
export const programIcon32 = path =>
  PROGRAM_META[path]?.icon32 || PROGRAM_META[path]?.icon16 || null;
