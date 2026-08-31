/*
 * dropMoveInto — the one drag-and-drop move for both shells.
 *
 * The desktop and Explorer draw their own icons and run their own drag
 * loops, but they move files through the same file system, and they used to
 * disagree about what a refused move looks like. Explorer asked before
 * replacing anything and reported every refusal; the desktop asked nothing,
 * reported two of the six errors and swallowed the rest — so dropping a
 * protected folder onto a desktop folder, or dragging anything at all from
 * the desktop into an open Explorer window, silently did nothing.
 *
 * Both call this now, so a move means the same thing wherever it starts.
 *
 * It returns the paths that actually moved. The desktop needs that: a
 * refused move must not free the grid cell its icon is still sitting in.
 */
import { getBaseName } from '../../context/vfsUtils';

export const dndErrMessage = (error, srcPath) => {
  const name = getBaseName(srcPath);
  switch (error) {
    case 'system':
      return `Cannot move '${name}': it would replace a system item that Windows requires.`;
    case 'protected':
      return `Cannot move '${name}': It is a Windows system folder and is required for Windows to run properly.`;
    case 'cycle':
      return `Cannot move '${name}': the destination folder is a subfolder of the source folder.`;
    case 'not-found':
      return `'${name}' could not be found.`;
    default:
      return `An error occurred while moving '${name}'.`;
  }
};

export async function dropMoveInto(paths, destDir, { vfs, dlg }) {
  const moved = [];
  if (!destDir || paths.includes(destDir)) return moved;
  for (const src of paths) {
    let res = vfs.move(src, destDir);
    if (!res.ok && res.error === 'exists') {
      const replace = await dlg.confirm(
        `This folder already contains an item named '${getBaseName(
          src,
        )}'.\n\nWould you like to replace the existing item with this one?`,
        'Confirm Replace',
      );
      res = replace
        ? vfs.move(src, destDir, { replace: true })
        : { ok: false, error: 'skipped' };
    }
    if (res.ok) {
      moved.push(src);
      continue;
    }
    // Dropping something back into the folder it already lives in is a no-op
    // in XP, and a declined replace has already had its answer — neither is
    // an error worth a second dialog.
    if (res.error === 'skipped' || res.error === 'same') continue;
    dlg.alert(dndErrMessage(res.error, src), 'Error Moving File or Folder', {
      icon: 'error',
    });
  }
  return moved;
}
