import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useWindowSize from 'react-use/lib/useWindowSize';
import { useVFS } from '../../context/VFSContext';
import { useDialog } from '../../context/DialogContext';
import { SPECIAL_FOLDERS, EXE_PATHS } from '../../context/vfsConstants';
import { getExtension, INVALID_NAME_MESSAGE } from '../../context/vfsUtils';
import { displayName, hiddenExtension, isImageFile } from '../shell/fileTypes';
import { useExplorerView } from '../shell/useExplorerView';
import { useRecycleBinActions } from '../shell/RecycleBin/actions';
import {
  MY_COMPUTER_TARGET,
  isMyComputerShortcut,
  isRecycleBinShortcut,
} from '../shell/location';
import ContextMenu from '../../components/ContextMenu';
import PropertiesDialog from '../../components/PropertiesDialog';
import RecycleBinProperties from '../../components/RecycleBinProperties';
import ShortcutWizard from '../../components/ShortcutWizard';
import { runItemAction } from '../shell/itemActions';
import { CELL_W, GRID_X, GRID_Y, ICON_HIT_H } from './helpers';
import {
  buildDesktopMenuItems,
  buildRecycleBinMenuItems,
  buildMyComputerMenuItems,
  buildIconMenuItems,
} from './menus';
import { DragGhostLayer, IconsContainer, StyledIcon } from './styles';
import { dropMoveInto } from '../shell/move';
import { useDesktopIcons } from './useDesktopIcons';
import { useDesktopLayout } from './useDesktopLayout';
import { useIconDrag } from './useIconDrag';

function Icons({
  userName,
  // Whether this session is the one on screen. Fast user switching keeps
  // the others mounted; only the visible desktop may write its layout.
  active,
  focusedIconPaths,
  onMouseDown,
  onDoubleClick,
  onShellOpen,
  onExtractZip,
  displayFocus,
  mouse,
  selecting,
  setSelectedIcons,
  desktopContextMenuEvent,
}) {
  const vfs = useVFS();
  const dialog = useDialog();
  const { width: winWidth, height: winHeight } = useWindowSize();
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingPath, setRenamingPath] = useState(null);
  const [propertiesPath, setPropertiesPath] = useState(null);
  const [binPropsOpen, setBinPropsOpen] = useState(false);
  const [shortcutWizardOpen, setShortcutWizardOpen] = useState(false);

  // This user's Folder Options view settings (hidden files, extensions)
  const explorerView = useExplorerView(userName);
  const { hideExt } = explorerView;

  const { icons, recycleBinHasItems } = useDesktopIcons({
    vfs,
    userName,
    focusedIconPaths,
    explorerView,
    hideExt,
  });
  const desk = useDesktopLayout({
    vfs,
    userName,
    active,
    icons,
    winWidth,
    winHeight,
  });
  const { layout, placements } = desk;

  // Rubber-band selection (start point relayed from the WinXP shell)
  useEffect(() => {
    if (!selecting) return;
    const sx = Math.min(selecting.x, mouse.docX);
    const sy = Math.min(selecting.y, mouse.docY);
    const sw = Math.abs(selecting.x - mouse.docX);
    const sh = Math.abs(selecting.y - mouse.docY);
    const hit = icons
      .filter(icon => {
        const p = placements[icon.id];
        if (!p) return false;
        return (
          p.x - sx < sw &&
          sx - p.x < CELL_W &&
          p.y - sy < sh &&
          sy - p.y < ICON_HIT_H
        );
      })
      .map(icon => icon.id);
    let next = hit;
    if (selecting.ctrl && selecting.base) {
      const set = new Set(selecting.base);
      hit.forEach(id => (set.has(id) ? set.delete(id) : set.add(id)));
      next = [...set];
    }
    setSelectedIcons(next);
  }, [icons, placements, setSelectedIcons, selecting, mouse.docX, mouse.docY]);

  // --- Shared operations ---

  // The same delete and empty verbs Explorer uses, confirmations included
  const recycle = useRecycleBinActions(vfs, dialog, hideExt);
  const deletePaths = recycle.deleteToBin;
  const emptyBin = useCallback(
    () => recycle.emptyBin(vfs.getRecycleBinContents()),
    [recycle, vfs],
  );

  const pasteOnDesktop = useCallback(async () => {
    const { errors } = await vfs.clipboardPaste(
      SPECIAL_FOLDERS.DESKTOP,
      async node =>
        dialog.confirm(
          `The Desktop already contains an item named '${displayName(
            node,
            hideExt,
          )}'.\n\nWould you like to replace the existing item?`,
          'Confirm File Replace',
        ),
    );
    if (errors.some(er => er.error === 'cycle')) {
      dialog.alert(
        'The destination folder is a subfolder of the source folder.',
        'Cannot Move Folder',
      );
    }
    const other = errors.find(er => er.error !== 'cycle');
    if (other) {
      dialog.alert(
        other.message || 'The file or folder cannot be pasted.',
        'Error Moving File or Folder',
        { icon: 'error' },
      );
    }
  }, [vfs, dialog, hideExt]);

  const { forget } = desk;
  const moveIntoFolder = useCallback(
    async (paths, destPath) => {
      const moved = await dropMoveInto(paths, destPath, {
        vfs,
        dlg: dialog,
      });
      // Only the icons that really left free their desktop cells
      if (moved.length) forget(moved);
    },
    [vfs, dialog, forget],
  );

  const createOnDesktop = kind => {
    const desktop = SPECIAL_FOLDERS.DESKTOP;
    const base = kind === 'folder' ? 'New Folder' : 'New Text Document';
    const ext = kind === 'folder' ? '' : '.txt';
    const name = vfs.uniqueNameIn(desktop, n =>
      n === 1 ? `${base}${ext}` : `${base} (${n})${ext}`,
    );
    const path = `${desktop}/${name}`;
    if (kind === 'folder') vfs.createFolder(path);
    else vfs.createFile(path, '');
    setTimeout(() => setRenamingPath(path), 50);
  };

  // XP's "slow double click": clicking an already-selected item a second time
  // starts a rename, unless a real double-click lands first
  const slowRenameTimer = useRef(null);
  const cancelSlowRename = useCallback(() => {
    if (slowRenameTimer.current) {
      clearTimeout(slowRenameTimer.current);
      slowRenameTimer.current = null;
    }
  }, []);
  useEffect(() => cancelSlowRename, [cancelSlowRename]);

  const armSlowRename = useCallback(
    id => {
      const node = vfs.getNode(id);
      if (!node || node.system) return;
      cancelSlowRename();
      // Comfortably past the double-click window so opening never renames
      slowRenameTimer.current = setTimeout(() => {
        slowRenameTimer.current = null;
        setRenamingPath(id);
      }, 700);
    },
    [vfs, cancelSlowRename],
  );

  const handleIconDoubleClick = useCallback(
    id => {
      cancelSlowRename();
      onDoubleClick(id);
    },
    [cancelSlowRename, onDoubleClick],
  );

  // --- Dragging ---

  const drag = useIconDrag({
    icons,
    placements,
    onClick: (id, { collapse, rename }) => {
      if (collapse) onMouseDown(id);
      if (rename) armSlowRename(id);
    },
    onDropIntoWindow: (paths, dir) => {
      // Namespace icons (My Computer and friends) are not files and stay
      // put; everything else runs the same move the Explorer window itself
      // would, replace prompt and error dialogs included
      moveIntoFolder(
        paths.filter(p => {
          const node = vfs.getNode(p);
          return node && !node.system;
        }),
        dir,
      );
    },
    onDrop: (paths, dx, dy, target) => {
      if (!target) {
        desk.dropAt(paths, dx, dy);
        return;
      }
      const t = icons.find(i => i.id === target);
      if (t?.isRecycle) deletePaths(paths);
      else if (t?.isFolder) moveIntoFolder(paths, target);
    },
  });

  const handleIconMouseDown = (id, e) => {
    if (e.button !== 0) return; // right-clicks are handled by the context menu
    cancelSlowRename();
    if (e.ctrlKey) {
      const next = focusedIconPaths.includes(id)
        ? focusedIconPaths.filter(p => p !== id)
        : [...focusedIconPaths, id];
      setSelectedIcons(next);
      return;
    }
    if (focusedIconPaths.includes(id)) {
      // Keep a multi-selection intact for dragging; collapse on plain click
      const soleSelection =
        focusedIconPaths.length === 1 && displayFocus && !renamingPath;
      setSelectedIcons(focusedIconPaths);
      drag.startDrag(
        id,
        focusedIconPaths,
        focusedIconPaths.length > 1,
        soleSelection,
        e,
      );
    } else {
      onMouseDown(id);
      drag.startDrag(id, [id], false, false, e);
    }
  };

  // --- Keyboard shortcuts on focused desktop icons ---
  useEffect(() => {
    const handler = e => {
      if (!displayFocus || renamingPath) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete') {
        e.preventDefault();
        deletePaths(focusedIconPaths);
      } else if (e.key === 'F2') {
        e.preventDefault();
        const target = focusedIconPaths
          .map(p => vfs.getNode(p))
          .find(n => n && !n.system);
        if (target) setRenamingPath(target.path);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIconPaths[0]) onDoubleClick(focusedIconPaths[0]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [
    displayFocus,
    renamingPath,
    focusedIconPaths,
    deletePaths,
    onDoubleClick,
    vfs,
  ]);

  // --- Desktop empty area context menu ---
  const openDesktopMenuAt = useCallback(
    (x, y) => {
      setContextMenu({
        x,
        y,
        items: buildDesktopMenuItems({
          autoArrange: layout.autoArrange,
          alignToGrid: layout.alignToGrid,
          clipboard: vfs.clipboard,
        }),
        target: null,
        selection: [],
      });
    },
    [vfs.clipboard, layout.autoArrange, layout.alignToGrid],
  );

  const onDesktopContextMenu = useCallback(
    e => {
      if (e.target !== e.currentTarget) return;
      e.preventDefault();
      openDesktopMenuAt(e.clientX, e.clientY);
    },
    [openDesktopMenuAt],
  );

  // Right-clicks on the bare wallpaper are relayed here by the WinXP shell
  // (the icon layer itself is pointer-events: none)
  useEffect(() => {
    if (desktopContextMenuEvent) {
      openDesktopMenuAt(desktopContextMenuEvent.x, desktopContextMenuEvent.y);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktopContextMenuEvent?.id]);

  // --- Icon context menu ---
  const onIconContextMenu = useCallback(
    (e, iconId) => {
      e.preventDefault();
      e.stopPropagation();
      cancelSlowRename();
      const node = vfs.getNode(iconId);
      if (!node) return;

      // Right-clicking outside the current selection reselects just it
      const selection = focusedIconPaths.includes(iconId)
        ? focusedIconPaths
        : [iconId];
      if (!focusedIconPaths.includes(iconId)) onMouseDown(iconId);

      // The shell namespace icons carry their own menus and act alone; My
      // Computer's Properties opens System Properties, like real XP
      const namespace =
        isRecycleBinShortcut(node) || isMyComputerShortcut(node);
      let items;
      if (isRecycleBinShortcut(node)) {
        items = buildRecycleBinMenuItems({ hasItems: recycleBinHasItems });
      } else if (isMyComputerShortcut(node)) {
        items = buildMyComputerMenuItems({ isSystem: node.system });
      } else {
        const nodes = selection.map(p => vfs.getNode(p)).filter(Boolean);
        items = buildIconMenuItems({
          multiple: selection.length > 1,
          isZip: /\.zip$/i.test(node.name),
          isImage: node.type === 'file' && isImageFile(node.name),
          name: node.type === 'file' ? node.name : null,
          allSystem: nodes.every(n => n.system),
          isSystem: node.system,
        });
      }
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items,
        target: iconId,
        selection: namespace ? [iconId] : selection,
      });
    },
    [vfs, onMouseDown, focusedIconPaths, recycleBinHasItems, cancelSlowRename],
  );

  // --- Context menu action handler ---
  const handleContextAction = useCallback(
    async action => {
      const target = contextMenu?.target;
      const selection = contextMenu?.selection || [];

      if (action.startsWith('arrange:')) {
        desk.arrangeBy(action.slice('arrange:'.length));
        return;
      }
      // The verbs every file has, shared with Explorer
      const shared = await runItemAction(action, {
        vfs,
        dlg: dialog,
        target,
        selection,
        onShellOpen,
        extractZip: onExtractZip,
        shortcutDir: SPECIAL_FOLDERS.DESKTOP,
        onProperties: setPropertiesPath,
        onBinProperties: () => setBinPropsOpen(true),
      });
      if (shared) return;
      switch (action) {
        case 'toggle-auto-arrange':
          desk.toggleAutoArrange();
          break;
        case 'toggle-align-grid':
          desk.toggleAlignToGrid();
          break;
        case 'new-folder':
          createOnDesktop('folder');
          break;
        case 'new-txt':
          createOnDesktop('txt');
          break;
        case 'new-shortcut':
          setShortcutWizardOpen(true);
          break;
        case 'paste':
          pasteOnDesktop();
          break;
        case 'open':
          if (target) onDoubleClick(target);
          break;
        case 'explore':
          if (onShellOpen)
            onShellOpen(MY_COMPUTER_TARGET, {
              injectProps: { initialFoldersPane: true },
            });
          break;
        case 'system-properties':
          if (onShellOpen) onShellOpen(EXE_PATHS.SYSDM_CPL);
          break;
        case 'delete':
          await deletePaths(selection);
          break;
        case 'rename':
          if (target) setRenamingPath(target);
          break;
        case 'empty-bin':
          emptyBin();
          break;
        case 'display-properties':
          // Desktop Properties = the Display control panel applet
          if (onShellOpen) onShellOpen(EXE_PATHS.DESK_CPL);
          break;
        default:
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      vfs,
      dialog,
      contextMenu,
      onDoubleClick,
      onShellOpen,
      onExtractZip,
      pasteOnDesktop,
      deletePaths,
      emptyBin,
      desk,
    ],
  );

  // --- Rename handler ---
  const { repath } = desk;
  const handleRename = useCallback(
    async (path, newName) => {
      setRenamingPath(null);
      const node = vfs.getNode(path);
      if (!node || !newName) return;
      // A hidden extension survives the rename untouched, like real XP
      const hiddenExt = hiddenExtension(node, hideExt);
      const finalName = `${newName}${hiddenExt}`;
      if (finalName === node.name) return;
      if (
        !hiddenExt &&
        node.type === 'file' &&
        getExtension(finalName) !== getExtension(node.name)
      ) {
        const yes = await dialog.confirm(
          'If you change a file name extension, the file may become unusable. Are you sure you want to change it?',
          'Rename',
          { icon: 'warning' },
        );
        if (!yes) return;
      }
      const res = vfs.rename(path, finalName);
      if (!res.ok) {
        if (res.error === 'invalid') {
          dialog.alert(INVALID_NAME_MESSAGE, 'Rename');
        } else if (res.error === 'exists') {
          dialog.alert(
            `Cannot rename ${displayName(
              node,
              hideExt,
            )}: A file with the name you specified already exists. Specify a different file name.`,
            'Error Renaming File or Folder',
          );
        }
        return;
      }
      repath(path, `${SPECIAL_FOLDERS.DESKTOP}/${finalName}`);
    },
    [vfs, dialog, hideExt, repath],
  );

  const dragSet = drag.dragState ? new Set(drag.dragState.paths) : null;

  return (
    <IconsContainer
      className="desktop-icons-layer"
      onContextMenu={onDesktopContextMenu}
    >
      {icons.map(iconData => {
        const pos = placements[iconData.id] || { x: GRID_X, y: GRID_Y };
        const isDragging = dragSet?.has(iconData.id);
        return (
          <StyledIcon
            key={iconData.id}
            {...iconData}
            displayFocus={displayFocus}
            onMouseDown={handleIconMouseDown}
            onDoubleClick={handleIconDoubleClick}
            onContextMenu={onIconContextMenu}
            isRenaming={renamingPath === iconData.id}
            onRename={handleRename}
            isDropTarget={drag.dropTarget === iconData.id}
            style={{
              left: pos.x,
              top: pos.y,
              // The moving copy renders in the ghost layer; the original
              // holds its cell invisibly until the drop lands
              opacity: isDragging ? 0 : undefined,
              pointerEvents: isDragging ? 'none' : undefined,
            }}
          />
        );
      })}
      {drag.dragState &&
        createPortal(
          <DragGhostLayer>
            {icons
              .filter(iconData => dragSet.has(iconData.id))
              .map(iconData => {
                const pos = placements[iconData.id] || { x: GRID_X, y: GRID_Y };
                return (
                  <StyledIcon
                    key={iconData.id}
                    {...iconData}
                    displayFocus={displayFocus}
                    style={{
                      left: pos.x + drag.dragState.dx,
                      top: pos.y + drag.dragState.dy,
                      opacity: 0.6,
                      // The icon's own pointer-events: auto would make the
                      // ghost swallow the drop's elementFromPoint hit-test
                      pointerEvents: 'none',
                    }}
                  />
                );
              })}
          </DragGhostLayer>,
          document.body,
        )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}
      {propertiesPath && (
        <PropertiesDialog
          path={propertiesPath}
          onShellOpen={onShellOpen}
          onClose={() => setPropertiesPath(null)}
        />
      )}
      {binPropsOpen && (
        <RecycleBinProperties onClose={() => setBinPropsOpen(false)} />
      )}
      {shortcutWizardOpen && (
        <ShortcutWizard
          initialDir={SPECIAL_FOLDERS.DESKTOP}
          onClose={() => setShortcutWizardOpen(false)}
        />
      )}
    </IconsContainer>
  );
}

export default Icons;
