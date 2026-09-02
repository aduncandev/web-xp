import { useMemo } from 'react';
import { SPECIAL_FOLDERS, EXE_PATHS } from '../../context/vfsConstants';
import { displayName, hiddenExtension } from '../shell/fileTypes';
import { isMyComputerShortcut, isRecycleBinShortcut } from '../shell/location';
import { getArt } from '../../xpArt';
import { INFOTIPS } from './helpers';

import recycleEmptyDrawn from 'assets/windowsIcons/recycle-empty.svg';
import recycleFullDrawn from 'assets/windowsIcons/recycle-full.svg';

// Real shell32 recycle-bin icons win when dropped into src/assets/xp/
const recycleEmpty = getArt('recycle-empty', recycleEmptyDrawn);
const recycleFull = getArt('recycle-full', recycleFullDrawn);

/**
 * What the desktop shows: one entry per visible node in this user's Desktop
 * folder, shaped for the Icon component. The Recycle Bin's picture follows
 * its contents.
 */
export function useDesktopIcons({
  vfs,
  userName,
  focusedIconPaths,
  explorerView,
  hideExt,
}) {
  const recycleBinHasItems = useMemo(() => {
    if (!vfs.initialized) return false;
    return vfs.getRecycleBinContents().length > 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version, vfs.initialized]);

  const icons = useMemo(() => {
    if (!vfs.initialized) return [];
    // The dormant '???' shortcut materializes once this user has EVER
    // found an egg: lastEggTime is stamped on the first find and survives
    // trading the eggs away in the shop, so the door never closes again
    let eggData = null;
    let eggTime = null;
    try {
      eggData = vfs.getUserConfigFor(userName, 'eggData', null);
      eggTime = vfs.getUserConfigFor(userName, 'lastEggTime', null);
    } catch {
      eggData = null;
    }
    const eggFound =
      (Array.isArray(eggData) && eggData.length > 0) || eggTime != null;
    const isEggShortcut = node =>
      node.type === 'shortcut' && node.target === EXE_PATHS.MISSINGNO;
    return vfs
      .listDir(SPECIAL_FOLDERS.DESKTOP)
      .filter(
        node =>
          (eggFound && isEggShortcut(node)) || explorerView.isVisible(node),
      )
      .map(node => {
        const isRecycle = isRecycleBinShortcut(node);
        const stockIcon = node.iconLarge || node.icon;
        return {
          id: node.path,
          icon: isRecycle
            ? recycleBinHasItems
              ? recycleFull
              : recycleEmpty
            : stockIcon,
          title: displayName(node, hideExt),
          selectBaseOnRename:
            node.type === 'file' && !hiddenExtension(node, hideExt),
          isFocus: focusedIconPaths.includes(node.path),
          isCut:
            vfs.clipboard?.action === 'cut' &&
            vfs.clipboard.paths.includes(node.path),
          nodeType: node.type,
          infoTip: node.type === 'shortcut' ? INFOTIPS[node.target] : undefined,
          isRecycle,
          isFolder: node.type === 'folder',
          isHidden: !!node.hidden && !(eggFound && isEggShortcut(node)),
          // The shell namespace icons (My Computer, Recycle Bin) carry no
          // arrow in XP; real shortcuts do
          hasArrow:
            node.type === 'shortcut' &&
            !isMyComputerShortcut(node) &&
            !isRecycleBinShortcut(node),
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vfs.version,
    vfs.initialized,
    vfs.clipboard,
    focusedIconPaths,
    recycleBinHasItems,
    userName,
    explorerView,
    hideExt,
  ]);

  return { icons, recycleBinHasItems };
}
