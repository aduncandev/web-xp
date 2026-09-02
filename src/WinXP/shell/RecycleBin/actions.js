// The Recycle Bin's verbs, with their confirmations and sound. Explorer and the
// desktop share them.
import { useCallback } from 'react';

import { displayPath } from '../../../context/vfsUtils';
import { displayName } from '../fileTypes';
import { playSystemSound } from '../../sounds';
import { readRecycleSettings } from '../../../components/RecycleBinProperties';

export function useRecycleBinActions(vfs, dlg, hideExt) {
  /**
   * Send items to the bin (or past it, per Recycle Bin Properties). Protected
   * and read-only items are refused with the shell's error. Resolves true when
   * something was deleted.
   */
  const deleteToBin = useCallback(
    async paths => {
      const nodes = paths.map(p => vfs.getNode(p)).filter(Boolean);
      const blockedSystem = nodes.filter(n => vfs.isProtectedPath(n.path));
      const blockedReadOnly = nodes.filter(
        n => !blockedSystem.includes(n) && n.readOnly,
      );
      if (blockedSystem.length > 0) {
        dlg.alert(
          `Cannot delete ${displayName(
            blockedSystem[0],
            hideExt,
          )}: It is a Windows system folder and is required for Windows to run properly.`,
          'Error Deleting File or Folder',
          { icon: 'error' },
        );
      } else if (blockedReadOnly.length > 0) {
        dlg.alert(
          `Cannot delete ${displayName(
            blockedReadOnly[0],
            hideExt,
          )}: The file is read-only. Remove the read-only attribute in the file's Properties, and then try again.`,
          'Error Deleting File or Folder',
          { icon: 'error' },
        );
      }
      const deletable = nodes.filter(
        n => !blockedSystem.includes(n) && !blockedReadOnly.includes(n),
      );
      if (deletable.length === 0) return false;
      // Recycle Bin Properties decides whether we confirm, and whether the
      // file lands in the bin at all
      const bin = readRecycleSettings(vfs);
      const remove = n =>
        bin.nukeOnDelete
          ? vfs.deleteNodePermanently(n.path)
          : vfs.deleteNode(n.path);
      if (bin.confirmDelete) {
        const message =
          deletable.length === 1
            ? `Are you sure you want to send '${displayName(
                deletable[0],
                hideExt,
              )}' to the Recycle Bin?`
            : `Are you sure you want to send these ${deletable.length} items to the Recycle Bin?`;
        const title =
          deletable.length === 1
            ? 'Confirm File Delete'
            : 'Confirm Multiple File Delete';
        const yes = await dlg.confirm(message, title, { icon: 'none' });
        if (!yes) return false;
      }
      deletable.forEach(remove);
      return true;
    },
    [vfs, dlg, hideExt],
  );

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
        playSystemSound('recycle');
      }
    },
    [vfs, dlg, hideExt],
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

  return { deleteToBin, emptyBin, restore, deletePermanently };
}
