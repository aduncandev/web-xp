// The icon registry. Nodes persist an iconKey rather than a hashed asset URL and
// are re-resolved from here on every load; keys stay for as long as anything on
// disk uses them, and an unknown key falls back to the type's icon.
import {
  documentIcon,
  documentIconLarge,
  getIconsForNode,
} from './vfsConstants';
import { getArt } from '../xpArt';

import recycleEmptyDrawn from 'assets/windowsIcons/recycle-empty.svg';

// --- Desktop shortcut icons (large, matching original defaultIconState) ---
import ieDesktop from 'assets/windowsIcons/ie.png';
import mineDesktop from 'assets/minesweeper/mine-icon.png';
import computerDesktop from 'assets/windowsIcons/676(32x32).png';
import notepadDesktop from 'assets/windowsIcons/327(32x32).png';
import winampDesktop from 'assets/windowsIcons/winamp.png';
import paintDesktop from 'assets/windowsIcons/680(32x32).png';
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
// SHELL32 icon 2, what the shell gives an executable that carries no
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
import accessIcon from 'assets/xp/SetProgramAccess(16x16).png';
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
  'desk-notepad': { icon: notepadSmall, iconLarge: notepadDesktop },
  'desk-winamp': { icon: winampDesktop, iconLarge: winampDesktop },
  'desk-paint': { icon: paintSmall, iconLarge: paintDesktop },
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
  'sm-media': { icon: mediaSmall },
  'sm-tageditor': { icon: genericAppIcon },
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

/** Stamp a node's icons in place and hand it back. */
export function finishIcons(node) {
  const icons = resolveNodeIcons(node);
  node.icon = icons.icon;
  node.iconLarge = icons.iconLarge;
  return node;
}
