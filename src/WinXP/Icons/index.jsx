import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import useWindowSize from 'react-use/lib/useWindowSize';
import { useVFS } from '../../context/VFSContext';
import { useDialog } from '../../context/DialogContext';
import { listUsers, getCurrentUserName } from '../../context/users';
import { SPECIAL_FOLDERS, EXE_PATHS } from '../../context/vfsConstants';
import { getExtension, INVALID_NAME_MESSAGE } from '../../context/vfsUtils';
import { displayName, hiddenExtension } from '../shell/fileTypes';
import ContextMenu from '../../components/ContextMenu';
import PropertiesDialog from '../../components/PropertiesDialog';
import RecycleBinProperties, {
  readRecycleSettings,
} from '../../components/RecycleBinProperties';
import ShortcutWizard from '../../components/ShortcutWizard';

import recycleEmptyDrawn from 'assets/windowsIcons/recycle-empty.svg';
import recycleFullDrawn from 'assets/windowsIcons/recycle-full.svg';
import { getArt } from '../../xpArt';
import recycleSoundSrc from 'assets/sounds/Windows XP Recycle.wav';
import { useVolume } from '../../context/VolumeContext';
import {
  addPasswordToArchive,
  openArchive,
  removePasswordFromArchive,
  sendToCompressedFolder,
} from '../../context/zipShell';
import { BadPasswordError } from '../../context/zip';
import { IMAGE_EXTS } from '../shell/fileTypes';
import { printImage } from '../shell/printImage';
import {
  INFOTIPS,
  CELL_W,
  CELL_H,
  GRID_X,
  GRID_Y,
  TASKBAR_H,
  ICON_HIT_H,
  DRAG_THRESHOLD,
  LEGACY_LAYOUT_KEY,
  EMPTY_LAYOUT,
  clamp,
  cellKey,
  nearestFreeCell,
} from './helpers';
import {
  buildDesktopMenuItems,
  buildRecycleBinMenuItems,
  buildMyComputerMenuItems,
  buildIconMenuItems,
} from './menus';
import { DragGhostLayer, IconsContainer, StyledIcon } from './styles';
import { dropMoveInto } from '../shell/move';

// Real shell32 recycle-bin icons win when dropped into src/assets/xp/
const recycleEmpty = getArt('recycle-empty', recycleEmptyDrawn);
const recycleFull = getArt('recycle-full', recycleFullDrawn);

function Icons({
  userName,
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
  const { applyVolume } = useVolume();
  const { width: winWidth, height: winHeight } = useWindowSize();
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingPath, setRenamingPath] = useState(null);
  const [propertiesPath, setPropertiesPath] = useState(null);
  const [binPropsOpen, setBinPropsOpen] = useState(false);
  const [shortcutWizardOpen, setShortcutWizardOpen] = useState(false);
  const [layout, setLayout] = useState(EMPTY_LAYOUT);
  const layoutReadyRef = useRef(false);
  const [dragState, setDragState] = useState(null); // {paths, dx, dy}
  const [dropTarget, setDropTarget] = useState(null); // hovered folder/bin path

  const cols = Math.max(1, Math.floor((winWidth - GRID_X) / CELL_W));
  // A row exists wherever an icon fits, not wherever a whole cell does:
  // the 75px cell is padding around a 62px icon, so the last band above
  // the taskbar holds a row at sizes where it cannot hold a full cell.
  const rows = Math.max(
    1,
    Math.floor((winHeight - TASKBAR_H - GRID_Y - ICON_HIT_H) / CELL_H) + 1,
  );

  const cellToXy = useCallback(
    c => ({ x: GRID_X + c.col * CELL_W, y: GRID_Y + c.row * CELL_H }),
    [],
  );
  const xyToCell = useCallback(
    (x, y) => ({
      col: clamp(Math.round((x - GRID_X) / CELL_W), 0, cols - 1),
      row: clamp(Math.round((y - GRID_Y) / CELL_H), 0, rows - 1),
    }),
    [cols, rows],
  );

  // Load this user's layout from their profile hive (ntuser.dat) once the
  // VFS is up; the legacy shared localStorage layout is imported once, for
  // the first registered account only, then removed.
  useEffect(() => {
    if (!vfs.initialized || layoutReadyRef.current) return;
    let cfg = null;
    try {
      cfg = vfs.getUserConfigFor(userName, 'desktopLayout', null);
    } catch {
      cfg = null;
    }
    if (cfg == null) {
      try {
        const raw = localStorage.getItem(LEGACY_LAYOUT_KEY);
        const first = (listUsers()[0] || {}).name;
        if (raw && first && userName === first) {
          cfg = JSON.parse(raw);
          vfs.setUserConfigFor(userName, 'desktopLayout', cfg);
          localStorage.removeItem(LEGACY_LAYOUT_KEY);
        }
      } catch {
        // legacy layout unreadable — start fresh
      }
    }
    layoutReadyRef.current = true;
    if (cfg && typeof cfg === 'object') {
      setLayout({
        positions: cfg.positions || {},
        autoArrange: !!cfg.autoArrange,
        alignToGrid: cfg.alignToGrid !== false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, userName]);

  // Persist layout (positions + toggles) into this user's hive — only from
  // the active session (hidden sessions never see user interaction, and
  // must not write while their derived listings track the active user).
  useEffect(() => {
    if (!layoutReadyRef.current || !vfs.initialized) return;
    if (getCurrentUserName() !== userName) return;
    try {
      vfs.setUserConfigFor(userName, 'desktopLayout', layout);
    } catch {
      // hive write failed — layout stays session-only
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // Read desktop contents from VFS
  const recycleBinHasItems = useMemo(() => {
    if (!vfs.initialized) return false;
    return vfs.getRecycleBinContents().length > 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version, vfs.initialized]);

  // This user's Folder Options view settings (hidden files, extensions)
  const explorerView = useMemo(() => {
    if (!vfs.initialized) return {};
    try {
      return vfs.getUserConfigFor(userName, 'explorerView', null) || {};
    } catch {
      return {};
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version, vfs.initialized, userName]);
  const hideExt = explorerView.hideExt !== false;

  const icons = useMemo(() => {
    if (!vfs.initialized) return [];
    const view = explorerView;
    const showHidden = !!view.showHidden;
    const hideProtectedOS = view.hideProtectedOS !== false;
    // The dormant '???' shortcut materializes once this user has EVER
    // found an egg — lastEggTime is stamped on the first find and survives
    // trading the eggs away in the shop, so the door never closes again.
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
          (eggFound && isEggShortcut(node)) ||
          !node.hidden ||
          (showHidden && !(node.system && hideProtectedOS)),
      )
      .map(node => {
        let icon = node.iconLarge || node.icon;
        const isRecycle =
          node.type === 'shortcut' && node.target === 'RecycleBin';
        // Dynamic Recycle Bin icon: swap empty ↔ full based on contents
        if (isRecycle) {
          icon = recycleBinHasItems ? recycleFull : recycleEmpty;
        }
        return {
          id: node.path,
          icon,
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
            node.target !== 'My Computer' &&
            node.target !== 'RecycleBin',
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

  // Drop layout entries for icons no longer on the desktop. Guarded to the
  // ACTIVE session: a hidden session's SPECIAL_FOLDERS reads resolve the
  // active user's desktop, and pruning against that listing would gut this
  // user's stored layout.
  useEffect(() => {
    if (!vfs.initialized || icons.length === 0) return;
    if (getCurrentUserName() !== userName) return;
    const ids = new Set(icons.map(i => i.id));
    setLayout(l => {
      const stale = Object.keys(l.positions).filter(k => !ids.has(k));
      if (stale.length === 0) return l;
      const positions = { ...l.positions };
      stale.forEach(k => delete positions[k]);
      return { ...l, positions };
    });
  }, [icons, vfs.initialized, userName]);

  // Resolve every icon to a pixel position. Stored entries are either grid
  // cells {col,row} or free pixels {x,y}; unstored icons take the first free
  // cell in XP flow order (top->bottom, left->right).
  const placements = useMemo(() => {
    const out = {};
    const occupied = new Set();
    const order = icons.map(i => i.id);
    const recycleIds = new Set(icons.filter(i => i.isRecycle).map(i => i.id));

    if (layout.autoArrange) {
      order.forEach((id, i) => {
        out[id] = cellToXy({ col: Math.floor(i / rows), row: i % rows });
      });
      return out;
    }

    for (const id of order) {
      const e = layout.positions[id];
      if (!e) continue;
      if (e.col != null) {
        const c = nearestFreeCell(
          {
            col: clamp(e.col, 0, cols - 1),
            row: clamp(e.row, 0, rows - 1),
          },
          occupied,
          cols,
          rows,
        );
        occupied.add(cellKey(c));
        out[id] = cellToXy(c);
      } else if (e.x != null) {
        if (layout.alignToGrid) {
          const c = nearestFreeCell(xyToCell(e.x, e.y), occupied, cols, rows);
          occupied.add(cellKey(c));
          out[id] = cellToXy(c);
        } else {
          // Clamped on the way out, not on the way into storage. A window
          // that shrinks must not strand an icon past its edge — that is
          // how they went missing — but the position the user actually
          // dropped it at is kept, so widening the window puts it back.
          out[id] = {
            x: clamp(e.x, 0, Math.max(0, winWidth - CELL_W)),
            y: clamp(e.y, 0, Math.max(0, winHeight - TASKBAR_H - ICON_HIT_H)),
          };
        }
      }
    }
    for (const id of order) {
      if (out[id]) continue;
      // An unpositioned Recycle Bin takes XP's stock spot: hugging the
      // bottom-right corner (ref desktop-empty.png: icon centered ~40px from
      // the right edge, label just above the taskbar) — off the flow grid,
      // like the real shell's default.
      if (recycleIds.has(id)) {
        const corner = { col: cols - 1, row: rows - 1 };
        occupied.add(cellKey(corner));
        // XP parks the bin off the grid, so dragging it away used to be
        // one-way: no cell resolved back to those pixels. With Align to
        // Grid on it takes the corner cell instead, which is a corner the
        // user can drag it back to; with alignment off the stock pixels
        // stand, and free placement can reach them.
        out[id] = layout.alignToGrid
          ? cellToXy(corner)
          : {
              x: winWidth - CELL_W - 2,
              y: winHeight - TASKBAR_H - CELL_H - 5,
            };
        continue;
      }
      for (let i = 0; i < cols * rows + 1; i++) {
        const c = { col: Math.floor(i / rows), row: i % rows };
        if (c.col >= cols) break;
        if (!occupied.has(cellKey(c))) {
          occupied.add(cellKey(c));
          out[id] = cellToXy(c);
          break;
        }
      }
      if (!out[id]) out[id] = cellToXy({ col: cols - 1, row: rows - 1 });
    }
    return out;
  }, [icons, layout, cols, rows, cellToXy, xyToCell, winWidth, winHeight]);

  // --- Rubber-band selection (start point relayed from the WinXP shell) ---
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

  const playRecycleSound = useCallback(() => {
    try {
      const audio = new Audio(recycleSoundSrc);
      applyVolume(audio);
      audio.play().catch(() => {});
    } catch {
      // sound is best-effort
    }
  }, [applyVolume]);

  const deletePaths = useCallback(
    async paths => {
      const deletable = paths
        .map(p => vfs.getNode(p))
        .filter(n => n && !n.system);
      if (deletable.length === 0) return;
      // Recycle Bin Properties governs whether we confirm, and whether the
      // file goes to the bin at all
      const bin = readRecycleSettings(vfs);
      if (!bin.confirmDelete) {
        for (const n of deletable) {
          if (bin.nukeOnDelete) vfs.deleteNodePermanently(n.path);
          else vfs.deleteNode(n.path);
        }
        return;
      }
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
      const yes = await dialog.confirm(message, title, { icon: 'none' });
      if (!yes) return;
      for (const n of deletable) {
        if (bin.nukeOnDelete) vfs.deleteNodePermanently(n.path);
        else vfs.deleteNode(n.path);
      }
    },
    [vfs, dialog, hideExt],
  );

  const emptyBin = useCallback(async () => {
    const contents = vfs.getRecycleBinContents();
    if (contents.length === 0) return;
    const message =
      contents.length === 1
        ? `Are you sure you want to delete '${displayName(
            contents[0],
            hideExt,
          )}'?`
        : `Are you sure you want to delete these ${contents.length} items?`;
    const title =
      contents.length === 1
        ? 'Confirm File Delete'
        : 'Confirm Multiple File Delete';
    const yes = await dialog.confirm(message, title, { icon: 'none' });
    if (yes) {
      vfs.emptyRecycleBin();
      playRecycleSound();
    }
  }, [vfs, dialog, playRecycleSound, hideExt]);

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

  const moveIntoFolder = useCallback(
    async (paths, destPath) => {
      const moved = await dropMoveInto(paths, destPath, {
        vfs,
        dlg: dialog,
      });
      // Only the icons that really left free their desktop cells. A
      // refused move used to free the cell anyway, so the icon it had
      // just failed to move jumped somewhere else.
      if (!moved.length) return;
      setLayout(l => {
        const positions = { ...l.positions };
        let changed = false;
        moved.forEach(p => {
          if (positions[p]) {
            delete positions[p];
            changed = true;
          }
        });
        return changed ? { ...l, positions } : l;
      });
    },
    [vfs, dialog],
  );

  // --- Icon dragging (free positioning, XP-style) ---
  const cancelledRef = useRef(false);

  const finishDrop = useCallback(
    (paths, dx, dy, target) => {
      if (target) {
        const t = icons.find(i => i.id === target);
        if (t?.isRecycle) {
          deletePaths(paths);
        } else if (t?.isFolder) {
          moveIntoFolder(paths, target);
        }
        return;
      }
      if (layout.autoArrange) return; // snap back into the packed flow
      // Materialize the ENTIRE arrangement on every drop: resting icons keep
      // exactly the cell they are rendered in, so the stored layout can never
      // disagree with the screen (stored-cell conflicts made icons jump).
      const dragged = new Set(paths);
      const positions = {};
      if (layout.alignToGrid) {
        const occupied = new Set();
        icons.forEach(i => {
          if (dragged.has(i.id)) return;
          const p = placements[i.id];
          if (!p) return;
          const c = xyToCell(p.x, p.y);
          occupied.add(cellKey(c));
          positions[i.id] = c;
        });
        for (const p of paths) {
          const orig = placements[p];
          if (!orig) continue;
          const c = nearestFreeCell(
            xyToCell(orig.x + dx, orig.y + dy),
            occupied,
            cols,
            rows,
          );
          occupied.add(cellKey(c));
          positions[p] = c;
        }
      } else {
        icons.forEach(i => {
          if (dragged.has(i.id)) return;
          const p = placements[i.id];
          if (p) positions[i.id] = { x: p.x, y: p.y };
        });
        for (const p of paths) {
          const orig = placements[p];
          if (!orig) continue;
          positions[p] = {
            x: clamp(orig.x + dx, 0, winWidth - CELL_W),
            y: clamp(orig.y + dy, 0, winHeight - TASKBAR_H - ICON_HIT_H),
          };
        }
      }
      setLayout(l => ({ ...l, positions }));
    },
    [
      icons,
      layout,
      placements,
      deletePaths,
      moveIntoFolder,
      xyToCell,
      cols,
      rows,
      winWidth,
      winHeight,
    ],
  );

  // XP's "slow double click": clicking an already-selected item a second time
  // starts a rename, unless a real double-click lands first.
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

  const startDrag = (primaryId, paths, deferCollapse, armRename, e) => {
    const startX = e.clientX;
    const startY = e.clientY;
    // The icon under the cursor is the anchor: it claims its target cell first
    const ordered = [primaryId, ...paths.filter(p => p !== primaryId)];
    let moved = false;
    let curDx = 0;
    let curDy = 0;
    let curTarget = null;
    cancelledRef.current = false;

    // Potential drop targets: folders and the Recycle Bin, excluding dragged
    const dragged = new Set(ordered);
    const targets = icons
      .filter(i => !dragged.has(i.id) && (i.isFolder || i.isRecycle))
      .map(i => ({ id: i.id, p: placements[i.id] }))
      .filter(t => t.p);

    const onMove = ev => {
      if ((ev.buttons & 1) === 0) {
        // The button was released outside the window: XP restores the icon
        onCancel();
        return;
      }
      curDx = ev.clientX - startX;
      curDy = ev.clientY - startY;
      if (!moved) {
        if (
          Math.abs(curDx) < DRAG_THRESHOLD &&
          Math.abs(curDy) < DRAG_THRESHOLD
        )
          return;
        moved = true;
      }
      const hit = targets.find(
        t =>
          ev.clientX >= t.p.x &&
          ev.clientX <= t.p.x + CELL_W &&
          ev.clientY >= t.p.y &&
          ev.clientY <= t.p.y + ICON_HIT_H,
      );
      const nextTarget = hit ? hit.id : null;
      if (nextTarget !== curTarget) {
        curTarget = nextTarget;
        setDropTarget(nextTarget);
      }
      setDragState({ paths: ordered, dx: curDx, dy: curDy });
    };
    const cleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onCancel);
      setDragState(null);
      setDropTarget(null);
    };
    const onUp = ev => {
      cleanup();
      if (cancelledRef.current) return;
      if (!moved) {
        if (deferCollapse) onMouseDown(primaryId);
        if (armRename) armSlowRename(primaryId);
        return;
      }
      // Released over an Explorer window's file area? Then this is a move
      // into that folder, not a desktop rearrangement.
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      const drop = under && under.closest && under.closest('[data-drop-path]');
      if (drop) {
        const dir = drop.getAttribute('data-drop-path');
        // Namespace icons (My Computer and friends) are not files and
        // stay put; everything else runs the same move the Explorer
        // window itself would, replace prompt and error dialogs included.
        // This used to call vfs.move and throw the result away, so a
        // refused move was completely silent.
        moveIntoFolder(
          ordered.filter(p => {
            const node = vfs.getNode(p);
            return node && !node.system;
          }),
          dir,
        );
        return;
      }
      finishDrop(ordered, curDx, curDy, curTarget);
    };
    const onCancel = () => {
      cancelledRef.current = true;
      cleanup();
    };
    const onKey = ev => {
      if (ev.key === 'Escape') onCancel();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keydown', onKey);
    window.addEventListener('blur', onCancel);
  };

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
      startDrag(
        id,
        focusedIconPaths,
        focusedIconPaths.length > 1,
        soleSelection,
        e,
      );
    } else {
      onMouseDown(id);
      startDrag(id, [id], false, false, e);
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

  // --- Arrange Icons By ---
  const arrangeBy = useCallback(
    key => {
      const nodes = icons.map(i => vfs.getNode(i.id)).filter(Boolean);
      const rank = n =>
        n.type === 'shortcut' || n.type === 'special'
          ? 0
          : n.type === 'folder'
          ? 1
          : 2;
      const ext = n => {
        const idx = n.name.lastIndexOf('.');
        return idx > 0 ? n.name.slice(idx + 1).toLowerCase() : '';
      };
      const cmp = {
        name: (a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        size: (a, b) => (a.size || 0) - (b.size || 0),
        type: (a, b) =>
          ext(a).localeCompare(ext(b)) ||
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        modified: (a, b) => (a.modifiedAt || 0) - (b.modifiedAt || 0),
      }[key];
      const sorted = [...nodes].sort((a, b) => rank(a) - rank(b) || cmp(a, b));
      const positions = {};
      sorted.forEach((n, i) => {
        positions[n.path] = { col: Math.floor(i / rows), row: i % rows };
      });
      setLayout(l => ({ ...l, positions }));
    },
    [icons, vfs, rows],
  );

  const toggleAutoArrange = useCallback(() => {
    setLayout(l => {
      if (!l.autoArrange) return { ...l, autoArrange: true };
      // Turning off: keep icons where the flow put them
      const positions = {};
      icons.forEach((icon, i) => {
        positions[icon.id] = { col: Math.floor(i / rows), row: i % rows };
      });
      return { ...l, autoArrange: false, positions };
    });
  }, [icons, rows]);

  const toggleAlignToGrid = useCallback(() => {
    setLayout(l => {
      if (l.alignToGrid) {
        // Turning off: materialize current pixel spots so nothing moves
        const positions = {};
        icons.forEach(icon => {
          const p = placements[icon.id];
          if (p) positions[icon.id] = { x: p.x, y: p.y };
        });
        return { ...l, alignToGrid: false, positions };
      }
      // Turning on: snap every icon to its nearest free cell right away so
      // later renders can't shuffle them (order-dependent re-snapping)
      const occupied = new Set();
      const positions = {};
      icons.forEach(icon => {
        const p = placements[icon.id];
        if (!p) return;
        const c = nearestFreeCell(xyToCell(p.x, p.y), occupied, cols, rows);
        occupied.add(cellKey(c));
        positions[icon.id] = c;
      });
      return { ...l, alignToGrid: true, positions };
    });
  }, [icons, placements, xyToCell, cols, rows]);

  // --- Desktop empty area context menu ---
  const openDesktopMenuAt = useCallback(
    (x, y) => {
      const items = buildDesktopMenuItems({
        autoArrange: layout.autoArrange,
        alignToGrid: layout.alignToGrid,
        clipboard: vfs.clipboard,
      });
      setContextMenu({
        x,
        y,
        items,
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

      // The Recycle Bin icon gets its special menu
      if (node.type === 'shortcut' && node.target === 'RecycleBin') {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: buildRecycleBinMenuItems({ hasItems: recycleBinHasItems }),
          target: iconId,
          selection: [iconId],
        });
        return;
      }

      // My Computer is a shell namespace icon with its own menu; its
      // Properties opens System Properties, like real XP
      if (node.type === 'shortcut' && node.target === 'My Computer') {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: buildMyComputerMenuItems({ isSystem: node.system }),
          target: iconId,
          selection: [iconId],
        });
        return;
      }

      const multiple = selection.length > 1;
      const nodes = selection.map(p => vfs.getNode(p)).filter(Boolean);
      const allSystem = nodes.every(n => n.system);
      const items = buildIconMenuItems({
        multiple,
        isZip: /\.zip$/i.test(node.name),
        isImage: node.type === 'file' && IMAGE_EXTS.test(node.name),
        name: node.type === 'file' ? node.name : null,
        allSystem,
        isSystem: node.system,
      });
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items,
        target: iconId,
        selection,
      });
    },
    [vfs, onMouseDown, focusedIconPaths, recycleBinHasItems, cancelSlowRename],
  );

  // --- Context menu action handler ---
  const handleContextAction = useCallback(
    async action => {
      const desktop = SPECIAL_FOLDERS.DESKTOP;
      const selection = contextMenu?.selection || [];

      if (action && action.startsWith('arrange:')) {
        arrangeBy(action.slice('arrange:'.length));
        return;
      }
      switch (action) {
        case 'toggle-auto-arrange':
          toggleAutoArrange();
          break;
        case 'toggle-align-grid':
          toggleAlignToGrid();
          break;
        case 'new-folder': {
          let name = 'New Folder';
          let path = `${desktop}/${name}`;
          let counter = 2;
          while (vfs.exists(path)) {
            name = `New Folder (${counter})`;
            path = `${desktop}/${name}`;
            counter++;
          }
          vfs.createFolder(path);
          // Start rename on the new folder
          setTimeout(() => setRenamingPath(path), 50);
          break;
        }
        case 'new-txt': {
          let name = 'New Text Document.txt';
          let path = `${desktop}/${name}`;
          let counter = 2;
          while (vfs.exists(path)) {
            name = `New Text Document (${counter}).txt`;
            path = `${desktop}/${name}`;
            counter++;
          }
          vfs.createFile(path, '');
          setTimeout(() => setRenamingPath(path), 50);
          break;
        }
        case 'new-shortcut':
          setShortcutWizardOpen(true);
          break;
        case 'create-shortcut':
        case 'sendto-desktop':
          selection.forEach(p => vfs.createShortcutTo(p, desktop));
          break;
        case 'sendto-mydocs':
          selection.forEach(p => vfs.copy(p, SPECIAL_FOLDERS.MY_DOCUMENTS));
          break;
        case 'extract-all':
          if (onExtractZip) onExtractZip(selection[0]);
          break;
        case 'sendto-zip':
          sendToCompressedFolder(vfs, selection).catch(err =>
            dialog.alert(
              err.message ||
                'An error occurred while performing this operation.',
              'Compressed (zipped) Folders Error',
            ),
          );
          break;
        case 'zip-password': {
          const target = selection[0];
          try {
            const { entries } = await openArchive(vfs, target);
            if (entries.some(en => en.encrypted)) {
              dialog.alert(
                'This Compressed (zipped) Folder is already password protected. Remove the existing password first.',
                'Compressed (zipped) Folders',
              );
              break;
            }
          } catch (err) {
            dialog.alert(err.message, 'Compressed (zipped) Folders Error');
            break;
          }
          dialog
            .prompt(
              'Enter a password to protect the Compressed (zipped) Folder.',
              '',
              'Add Password',
            )
            .then(password =>
              password ? addPasswordToArchive(vfs, target, password) : null,
            )
            .catch(err =>
              dialog.alert(
                err.message ||
                  'An error occurred while performing this operation.',
                'Compressed (zipped) Folders Error',
              ),
            );
          break;
        }
        case 'zip-unpassword': {
          const target = selection[0];
          try {
            const { entries } = await openArchive(vfs, target);
            if (!entries.some(en => en.encrypted)) {
              dialog.alert(
                'This Compressed (zipped) Folder is not password protected.',
                'Compressed (zipped) Folders',
              );
              break;
            }
          } catch (err) {
            dialog.alert(err.message, 'Compressed (zipped) Folders Error');
            break;
          }
          dialog
            .prompt(
              'Enter the password to remove from the Compressed (zipped) Folder.',
              '',
              'Remove Password',
            )
            .then(password =>
              password
                ? removePasswordFromArchive(vfs, target, password)
                : null,
            )
            .catch(err =>
              dialog.alert(
                err instanceof BadPasswordError
                  ? 'The password you have entered is invalid. Do you wish to enter a new password now?'
                  : err.message ||
                      'An error occurred while performing this operation.',
                'Compressed (zipped) Folders Error',
              ),
            );
          break;
        }
        case 'img-edit':
          if (contextMenu?.target && onShellOpen)
            onShellOpen(contextMenu.target, { withExe: EXE_PATHS.MSPAINT });
          break;
        case 'img-preview':
          if (contextMenu?.target && onShellOpen)
            onShellOpen(contextMenu.target, { withExe: EXE_PATHS.SHIMGVW });
          break;
        case 'img-print':
          if (contextMenu?.target)
            printImage(vfs, contextMenu.target).catch(err =>
              dialog.alert(err.message, 'Print'),
            );
          break;
        case 'open-with':
          if (contextMenu?.target && onShellOpen)
            onShellOpen(contextMenu.target, { openWith: true });
          break;
        case 'refresh':
          break;
        case 'paste':
          pasteOnDesktop();
          break;
        case 'open':
          if (contextMenu?.target) onDoubleClick(contextMenu.target);
          break;
        case 'explore':
          if (onShellOpen)
            onShellOpen('My Computer', {
              injectProps: { initialFoldersPane: true },
            });
          break;
        case 'system-properties':
          if (onShellOpen) onShellOpen('C:/WINDOWS/system32/sysdm.cpl');
          break;
        case 'cut': {
          const cuttable = selection
            .map(p => vfs.getNode(p))
            .filter(n => n && !n.system)
            .map(n => n.path);
          if (cuttable.length > 0) vfs.clipboardCut(cuttable);
          break;
        }
        case 'copy':
          if (selection.length > 0) vfs.clipboardCopy(selection);
          break;
        case 'delete':
          await deletePaths(selection);
          break;
        case 'rename':
          if (contextMenu?.target) setRenamingPath(contextMenu.target);
          break;
        case 'properties': {
          const t = contextMenu?.target && vfs.getNode(contextMenu.target);
          if (t && t.type === 'shortcut' && t.target === 'RecycleBin') {
            setBinPropsOpen(true);
          } else if (contextMenu?.target) {
            setPropertiesPath(contextMenu.target);
          }
          break;
        }
        case 'empty-bin':
          emptyBin();
          break;
        case 'display-properties':
          // Desktop Properties = the Display control panel applet
          if (onShellOpen) onShellOpen('C:/WINDOWS/system32/desk.cpl');
          break;
        default:
          if (
            action.startsWith('openwith:') &&
            contextMenu?.target &&
            onShellOpen
          )
            onShellOpen(contextMenu.target, { withExe: action.slice(9) });
          break;
      }
    },
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
      arrangeBy,
      toggleAutoArrange,
      toggleAlignToGrid,
    ],
  );

  // --- Rename handler ---
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
      // Keep the icon's desktop spot under its new path
      const newPath = `${SPECIAL_FOLDERS.DESKTOP}/${finalName}`;
      setLayout(l => {
        if (!l.positions[path]) return l;
        const positions = { ...l.positions };
        positions[newPath] = positions[path];
        delete positions[path];
        return { ...l, positions };
      });
    },
    [vfs, dialog, hideExt],
  );

  const dragSet = dragState ? new Set(dragState.paths) : null;

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
            isDropTarget={dropTarget === iconData.id}
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
      {dragState &&
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
                      left: pos.x + dragState.dx,
                      top: pos.y + dragState.dy,
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
