import { useState } from 'react';
import { extractOsFiles, importOsFiles } from '../../osImport';
import { dropMoveInto } from '../move';
import { DND_TYPE, readDndPaths, isDndFolder } from './helpers';

/**
 * Dragging items between folders and windows, and dropping files in from the
 * host OS. Internal drops move with XP semantics (same-folder drops are
 * silent, name clashes ask); host drops import into the current folder. The
 * My Computer root is not a folder, so it rejects both.
 */
export function useItemDragDrop({
  vfs,
  dlg,
  inFolder,
  currentPath,
  selectedPaths,
  selectSingle,
  onDragStart,
}) {
  const [dropTargetPath, setDropTargetPath] = useState(null);

  const dropMoveHere = (paths, destDir) =>
    dropMoveInto(paths, destDir, { vfs, dlg });

  const onItemDragStart = (e, node) => {
    onDragStart();
    // Dragging an unselected item makes it the selection, like the real thing
    const paths = selectedPaths.includes(node.path)
      ? selectedPaths
      : [node.path];
    if (!selectedPaths.includes(node.path)) selectSingle(node.path);
    e.dataTransfer.setData(DND_TYPE, JSON.stringify(paths));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onItemDragOver = (e, node) => {
    if (!isDndFolder(node) || !e.dataTransfer) return;
    if (!Array.from(e.dataTransfer.types || []).includes(DND_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetPath !== node.path) setDropTargetPath(node.path);
  };

  const onItemDragLeave = (e, node) => {
    setDropTargetPath(p => (p === node.path ? null : p));
  };

  const onItemDrop = (e, node) => {
    if (!isDndFolder(node) || !e.dataTransfer) return;
    const paths = readDndPaths(e);
    if (!paths) return;
    e.preventDefault();
    e.stopPropagation();
    setDropTargetPath(null);
    dropMoveHere(paths, node.path);
  };

  const onListDragOver = e => {
    if (!inFolder || !e.dataTransfer) return;
    const types = Array.from(e.dataTransfer.types || []);
    if (types.includes(DND_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      return;
    }
    if (!types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onListDrop = e => {
    if (!inFolder || !e.dataTransfer) return;
    const internal = readDndPaths(e);
    if (internal) {
      e.preventDefault();
      e.stopPropagation();
      setDropTargetPath(null);
      dropMoveHere(internal, currentPath);
      return;
    }
    const files = extractOsFiles(e.dataTransfer);
    if (files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    importOsFiles(vfs, dlg, files, currentPath);
  };

  return {
    dropTargetPath,
    onItemDragStart,
    onItemDragOver,
    onItemDragLeave,
    onItemDrop,
    onListDragOver,
    onListDrop,
  };
}
