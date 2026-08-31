/*
 * The Recycle Bin's verbs — restore, delete permanently, empty — with the
 * confirmations and the sound the real shell played.
 *
 * The bin used to be a whole view component; now Explorer renders its
 * listing through the normal content pipeline (so Tiles/Icons/Details and
 * the Folders pane all just work) and only these actions are bin-specific.
 */
import { useCallback } from 'react';

import { useVolume } from '../../../context/VolumeContext';
import { displayPath } from '../../../context/vfsUtils';
import { displayName } from '../fileTypes';
import recycleSoundSrc from 'assets/sounds/Windows XP Recycle.wav';

export function useRecycleBinActions(vfs, dlg, hideExt) {
  const { applyVolume } = useVolume();

  const playRecycleSound = useCallback(() => {
    try {
      const audio = new Audio(recycleSoundSrc);
      applyVolume(audio);
      audio.play().catch(() => {});
    } catch {
      // sound is best-effort
    }
  }, [applyVolume]);

  const emptyBin = useCallback(
    async items => {
      if (!items.length) return;
      const message =
        items.length === 1
          ? `Are you sure you want to delete '${displayName(
              items[0],
              hideExt,
            )}'?`
          : `Are you sure you want to delete these ${items.length} items?`;
      const title =
        items.length === 1
          ? 'Confirm File Delete'
          : 'Confirm Multiple File Delete';
      const yes = await dlg.confirm(message, title, { icon: 'none' });
      if (yes) {
        vfs.emptyRecycleBin();
        playRecycleSound();
      }
    },
    [vfs, dlg, playRecycleSound, hideExt],
  );

  const restore = useCallback(
    async path => {
      // Capture before restoring — a successful restore removes this node
      const node = vfs.getNode(path);
      if (!node) return;
      const name = displayName(node, hideExt);
      let res = vfs.restoreFromRecycleBin(path);
      if (!res.ok && res.error === 'exists') {
        const yes = await dlg.confirm(
          `There is already an item named '${name}' in this location.\n\nWould you like to replace it with the one you are restoring?`,
          'Confirm File Replace',
        );
        if (yes) res = vfs.restoreFromRecycleBin(path, { replace: true });
        else res = { ok: true };
      }
      if (!res.ok && res.error === 'blocked') {
        await dlg.alert(
          `Cannot restore '${name}'.\n\nThe path '${displayPath(
            node?.originalPath || '',
          )}' cannot be created because a file with the same name as a required folder already exists.`,
          'Error Restoring File or Folder',
        );
      } else if (!res.ok && res.error === 'system') {
        await dlg.alert(
          `Cannot restore '${name}': it would replace a system item that Windows requires.`,
          'Error Restoring File or Folder',
        );
      }
    },
    [vfs, dlg, hideExt],
  );

  const deletePermanently = useCallback(
    async path => {
      const node = vfs.getNode(path);
      if (!node) return;
      const yes = await dlg.confirm(
        `Are you sure you want to delete '${displayName(node, hideExt)}'?`,
        'Confirm File Delete',
        { icon: 'none' },
      );
      if (yes) vfs.deleteNodePermanently(path);
    },
    [vfs, dlg, hideExt],
  );

  return { emptyBin, restore, deletePermanently };
}
