// The context-menu verbs a file has wherever it is shown. The desktop and
// Explorer build the same menu (buildIconMenuItems) and used to dispatch
// its actions separately; both run the shared ones through here first and
// keep only what differs between them (selection model, navigation).
import { EXE_PATHS, SPECIAL_FOLDERS } from '../../context/vfsConstants';
import { sendToCompressedFolder } from '../../context/zipShell';
import { addArchivePassword, removeArchivePassword } from './zipVerbs';
import { printImage } from './printImage';
import { isRecycleBinShortcut } from './location';

const ZIP_ERROR_TITLE = 'Compressed (zipped) Folders Error';

/**
 * Run `action` for `target` (the right-clicked path) and `selection`.
 * Returns true when the action was one of the shared verbs.
 *
 *   onShellOpen(path, opts)     the shell's open
 *   extractZip(path)            the Extraction Wizard for one archive
 *   shortcutDir                 where Create Shortcut puts its shortcut
 *   onProperties(path)          the Properties sheet for a path
 *   onBinProperties()           the Recycle Bin's own sheet
 *   onArchiveChanged()          after a password was added or removed
 */
export async function runItemAction(
  action,
  {
    vfs,
    dlg,
    target,
    selection = [],
    onShellOpen,
    extractZip,
    shortcutDir,
    onProperties,
    onBinProperties,
    onArchiveChanged,
  },
) {
  const openTarget = opts => {
    if (target && onShellOpen) onShellOpen(target, opts);
  };
  if (action.startsWith('openwith:')) {
    openTarget({ withExe: action.slice('openwith:'.length) });
    return true;
  }
  switch (action) {
    case 'open-with':
      openTarget({ openWith: true });
      return true;
    case 'img-edit':
      openTarget({ withExe: EXE_PATHS.MSPAINT });
      return true;
    case 'img-preview':
      openTarget({ withExe: EXE_PATHS.SHIMGVW });
      return true;
    case 'img-print':
      if (target)
        printImage(vfs, target).catch(err => dlg.alert(err.message, 'Print'));
      return true;
    case 'cut': {
      const cuttable = selection
        .map(p => vfs.getNode(p))
        .filter(n => n && !n.system)
        .map(n => n.path);
      if (cuttable.length > 0) vfs.clipboardCut(cuttable);
      return true;
    }
    case 'copy':
      if (selection.length > 0) vfs.clipboardCopy(selection);
      return true;
    case 'create-shortcut':
      if (shortcutDir)
        selection.forEach(p => vfs.createShortcutTo(p, shortcutDir));
      return true;
    case 'sendto-desktop':
      selection.forEach(p => vfs.createShortcutTo(p, SPECIAL_FOLDERS.DESKTOP));
      return true;
    case 'sendto-mydocs':
      selection.forEach(p => vfs.copy(p, SPECIAL_FOLDERS.MY_DOCUMENTS));
      return true;
    case 'sendto-zip':
      sendToCompressedFolder(vfs, selection).catch(err =>
        dlg.alert(
          err.message || 'An error occurred while performing this operation.',
          ZIP_ERROR_TITLE,
        ),
      );
      return true;
    case 'extract-all':
      if (extractZip && selection[0]) extractZip(selection[0]);
      return true;
    case 'zip-password':
      if (await addArchivePassword(vfs, dlg, selection[0]))
        if (onArchiveChanged) onArchiveChanged();
      return true;
    case 'zip-unpassword':
      if (await removeArchivePassword(vfs, dlg, selection[0]))
        if (onArchiveChanged) onArchiveChanged();
      return true;
    case 'properties': {
      // The Recycle Bin is a shell object with its own sheet
      const node = target && vfs.getNode(target);
      if (isRecycleBinShortcut(node)) {
        if (onBinProperties) onBinProperties();
      } else if (target && onProperties) {
        onProperties(target);
      }
      return true;
    }
    default:
      return false;
  }
}
