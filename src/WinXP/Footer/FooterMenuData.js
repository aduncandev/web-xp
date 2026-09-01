import empty from 'assets/empty.png';
import cmd from 'assets/windowsIcons/56(16x16).png';
import calculator from 'assets/windowsIcons/74(16x16).png';
import wordPad from 'assets/windowsIcons/153(16x16).png';
import winExplorer from 'assets/windowsIcons/156(16x16).png';
import notepad from 'assets/windowsIcons/327(16x16).png';
import painter from 'assets/windowsIcons/680(16x16).png';
import mediaPlayer from 'assets/windowsIcons/846(16x16).png';
import outlook from 'assets/windowsIcons/887(16x16).png';
import ie from 'assets/windowsIcons/896(16x16).png';
import solitaire from 'assets/windowsIcons/solitaire.png';
import pinball from 'assets/windowsIcons/pinball.png';
import mine from 'assets/minesweeper/mine-icon.png';
import winamp from 'assets/windowsIcons/winamp.png';
import voltorbflip from 'assets/windowsIcons/voltorb.png';

import aboutMeIcon from 'assets/windowsIcons/676(16x16).png';

import { EXE_PATHS } from '../../context/vfsConstants';

// 16px icons for Start Menu program rows keyed by executable path
// (small-icon mode and pinned/MFU fallbacks). Programs without an entry
// fall back to their PROGRAMS registry header icon.
export const PROGRAM_ICONS_16 = {
  [EXE_PATHS.IEXPLORE]: ie,
  'C:/Program Files/Outlook Express/msimn.exe': outlook,
  [EXE_PATHS.WINMINE]: mine,
  [EXE_PATHS.NOTEPAD]: notepad,
  [EXE_PATHS.WINAMP]: winamp,
  [EXE_PATHS.MSPAINT]: painter,
  [EXE_PATHS.WMPLAYER]: mediaPlayer,
  [EXE_PATHS.MPLAYER2]: mediaPlayer,
  [EXE_PATHS.CMD]: cmd,
  [EXE_PATHS.PINBALL]: pinball,
  [EXE_PATHS.VOLTORB]: voltorbflip,
  [EXE_PATHS.TOUR]: aboutMeIcon,
  [EXE_PATHS.EXPLORER]: winExplorer,
  'C:/WINDOWS/system32/calc.exe': calculator,
  'C:/WINDOWS/system32/sol.exe': solitaire,
  'C:/Program Files/Windows NT/Accessories/wordpad.exe': wordPad,
};

export const MyRecentDocuments = [
  {
    type: 'item',
    icon: empty,
    text: '(Empty)',
  },
];
