import { SPECIAL_FOLDERS } from '../context/vfsConstants';
import { extractOsFiles, importOsFiles } from './osImport';
import { dropMoveInto } from './shell/move';
import { DND_TYPE, readDndPaths } from './shell/Explorer/helpers';

/**
 * Drops onto the bare desktop: files from the host OS import into the
 * Desktop folder, items dragged out of an Explorer window move there. Drops
 * over windows, dialogs or the taskbar are left to their own handlers.
 */
export function useHostDrop(vfs, dlg) {
  const isDesktopSurface = e => {
    const t = e.target;
    if (!(t instanceof Element)) return false;
    return t === e.currentTarget || !!t.closest('.desktop-icons-layer');
  };
  const onDragOver = e => {
    if (!e.dataTransfer) return;
    if (!isDesktopSurface(e)) return;
    const types = Array.from(e.dataTransfer.types || []);
    if (types.includes(DND_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      return;
    }
    if (!types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDrop = e => {
    if (!e.dataTransfer) return;
    if (!isDesktopSurface(e)) return;
    const paths = readDndPaths(e);
    if (paths && paths.length) {
      e.preventDefault();
      // Namespace icons are not files and stay put; everything else runs
      // the same move an Explorer window would, replace prompt and error
      // dialogs included
      dropMoveInto(
        paths.filter(p => {
          const node = vfs.getNode(p);
          return node && !node.system;
        }),
        SPECIAL_FOLDERS.DESKTOP,
        { vfs, dlg },
      );
      return;
    }
    const files = extractOsFiles(e.dataTransfer);
    if (files.length === 0) return;
    e.preventDefault();
    importOsFiles(vfs, dlg, files, SPECIAL_FOLDERS.DESKTOP);
  };
  return { onDragOver, onDrop };
}
