// Pure module-level plumbing for the common file dialog: the places-bar
// icon resolution, location tokens, and the default filter list. Nothing
// here closes over component state.
import { normalizePath } from '../../context/vfsUtils';

import { getArt } from '../../xpArt';

import desktopDrawn from 'assets/windowsIcons/desktop.svg';
import documentsDrawn from 'assets/windowsIcons/308(32x32).png';
import computerDrawn32 from 'assets/windowsIcons/676(32x32).png';
import recentDrawn from 'assets/windowsIcons/716(16x16).png';

// The places bar wants the real shell namespace icons, not the drawn
// stand-ins the rest of the dialog falls back to.
export const desktopIcon = getArt('Desktop', desktopDrawn);
export const documentsIcon = getArt('MyDocuments', documentsDrawn);
export const computerIcon32 = getArt('MyComputer', computerDrawn32);
export const recentIcon = getArt('RecentDocuments', recentDrawn);
export const networkIcon = getArt('MyNetworkPlaces', computerDrawn32);

export const LOC_MY_COMPUTER = { kind: 'my-computer' };
export const LOC_RECENT = { kind: 'recent' };
export const folderLoc = path => ({
  kind: 'folder',
  path: normalizePath(path),
});

export const DEFAULT_FILTERS = [{ label: 'All Files (*.*)', extensions: null }];
