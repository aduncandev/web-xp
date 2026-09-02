import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { WindowDropDowns } from 'components';
import { useVFS } from '../../../context/VFSContext';
import { useDialog } from '../../../context/DialogContext';
import { getCurrentUserName } from '../../../context/users';
import ContextMenu from '../../../components/ContextMenu';
import {
  EXE_PATHS,
  SPECIAL_FOLDERS,
  computerIcon,
  folderIcon,
  shellFolderFor,
} from '../../../context/vfsConstants';
import { togglePinned } from '../../startMenuConfig';
import { useExplorerView } from '../useExplorerView';
import { addArchivePassword, removeArchivePassword } from '../zipVerbs';
import { runItemAction } from '../itemActions';
import {
  getParentPath,
  getExtension,
  formatSize,
  normalizePath,
  INVALID_NAME_MESSAGE,
} from '../../../context/vfsUtils';
import {
  buildExplorerMenus,
  displayName,
  hiddenExtension,
  VIEW_MODES,
  SORT_KEYS,
} from './menus';
import { zipChildren } from '../../../context/zipShell';
import { IMAGE_EXTENSIONS } from '../fileTypes';
import {
  MY_COMPUTER,
  RECYCLE_BIN,
  CONTROL_PANEL,
  isRecycleBinShortcut,
  resolveLocation,
} from '../location';
import { useRecycleBinActions } from '../RecycleBin/actions';
import ControlPanel from '../ControlPanel';
import useExtraction from '../../../components/ExtractionWizard/useExtraction';
import FolderTree from './FolderTree';
import { Div } from './styles';
import { ARCHIVE_COLUMNS, DETAIL_COLUMNS, RECYCLE_COLUMNS } from './helpers';
import { sortItems } from './sortItems';
import { useHistory } from './useHistory';
import { useRubberBand } from './useRubberBand';
import { useItemDragDrop } from './useItemDragDrop';
import { useArchiveListing } from './useArchiveListing';
import {
  viewSubmenu,
  historyMenu,
  recycleItemMenu,
  itemMenu,
  emptyAreaMenu,
} from './contextMenus';
import AddressBar from './AddressBar';
import FunctionBar from './FunctionBar';
import LeftPane from './LeftPane';
import RenameInput from './RenameInput';
import { FolderView } from './views';
import {
  MyComputerView,
  countMyComputerItems,
  useMyComputerData,
} from './MyComputerView';
import PropertiesDialog from '../../../components/PropertiesDialog';
import RecycleBinProperties from '../../../components/RecycleBinProperties';
import ShortcutWizard from '../../../components/ShortcutWizard';
import FolderOptions from '../../../components/FolderOptions';
import AboutWindows from '../../../components/AboutWindows';
import { getArt } from '../../../xpArt';

import windows from 'assets/windowsIcons/windows.png';

// Right-clicks on these land on the file area itself, not on an item
const EMPTY_AREA = [
  'com__content__right',
  'com__content__right__card__content',
  'com__content__right__card',
  'com__content__empty',
  'com__view',
];

// The shell hides the contents of its own install folders behind a warning
// panel until you click through
const HIDDEN_SYSTEM_FOLDER = /^C:\/(Program Files|WINDOWS)(\/system32)?$/i;

// The centered, narrow views wrap the edit box; the row views widen it
const WRAPPING_VIEWS = ['icons', 'thumbnails', 'tiles'];

export default function Explorer({
  onClose,
  onShellOpen,
  onSetHeader,
  initialPath,
  initialFoldersPane,
}) {
  const vfs = useVFS();
  const dlg = useDialog();
  const rootRef = useRef(null);
  const contentAreaRef = useRef(null);

  const [selectedPaths, setSelectedPaths] = useState([]);
  const [anchorPath, setAnchorPath] = useState(null);
  const clearSelection = useCallback(() => {
    setSelectedPaths([]);
    setAnchorPath(null);
  }, []);

  const nav = useHistory(vfs, initialPath, clearSelection);
  const { current: currentPath, navigateTo } = nav;
  const inFolder = currentPath !== MY_COMPUTER;

  const [contextMenu, setContextMenu] = useState(null);
  const [renamingPath, setRenamingPath] = useState(null);
  // Folders whose "These files are hidden" panel has been clicked through
  const [revealedFolders, setRevealedFolders] = useState([]);
  const [binPropsOpen, setBinPropsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('tiles');
  const [sortBy, setSortBy] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [statusBarVisible, setStatusBarVisible] = useState(true);
  const [foldersPaneOpen, setFoldersPaneOpen] = useState(!!initialFoldersPane);
  const [propertiesPath, setPropertiesPath] = useState(null);
  const [shortcutWizardOpen, setShortcutWizardOpen] = useState(false);
  const [folderOptionsOpen, setFolderOptionsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState({});

  // Everything the shell knows about the current path, namespace or folder,
  // title, icons, where Up goes, comes from one resolver
  const location = useMemo(
    () => resolveLocation(vfs, currentPath),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPath, vfs.version, vfs.initialized],
  );
  const archive = useMemo(
    () =>
      location.archive
        ? { archive: location.archive.archive, inner: location.archive.inner }
        : null,
    [location.archive],
  );
  const inRecycleBin = location.kind === 'recycle';
  const inControlPanel = location.kind === 'control';

  // Folder Options: hidden extensions, and which files show at all
  const view = useExplorerView();
  const { hideExt } = view;

  const zipExtraction = useExtraction(vfs, navigateTo);
  const recycle = useRecycleBinActions(vfs, dlg, hideExt);
  const listing = useArchiveListing({
    vfs,
    dlg,
    archive,
    askPassword: zipExtraction.askPassword,
    onShellOpen,
  });

  // Window title/icon follows the current folder, like real Explorer
  useEffect(() => {
    if (!onSetHeader) return;
    if (!inFolder) {
      onSetHeader({ title: MY_COMPUTER, icon: computerIcon });
      return;
    }
    if (location.exists)
      onSetHeader({ title: location.title, icon: location.icon || folderIcon });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, inFolder, onSetHeader, hideExt, vfs.version]);

  // If the current folder was deleted, fall back to the nearest ancestor
  useEffect(() => {
    if (!vfs.initialized || !inFolder) return;
    if (!location.exists) {
      let p = getParentPath(currentPath);
      while (p && !vfs.exists(p)) p = getParentPath(p);
      nav.replaceCurrent(p || MY_COMPUTER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version, vfs.initialized, currentPath, inFolder]);

  const currentNode = useMemo(
    () => (inFolder ? vfs.getNode(currentPath) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPath, inFolder, vfs.version],
  );

  // --- Items for the current view, sorted ---

  const items = useMemo(() => {
    if (!vfs.initialized || !inFolder || inControlPanel) return [];
    let list;
    if (inRecycleBin) {
      list = vfs.getRecycleBinContents();
    } else if (archive) {
      const { archiveData } = listing;
      list =
        archiveData && archiveData.path === archive.archive
          ? zipChildren(archiveData.entries, archive.archive, archive.inner)
          : [];
    } else {
      // Hidden-file visibility follows Folder Options (per-user, in the hive)
      list = vfs.listDir(currentPath).filter(view.isVisible);
    }
    return sortItems(list, sortBy, sortAsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPath,
    inFolder,
    inControlPanel,
    inRecycleBin,
    sortBy,
    sortAsc,
    vfs.version,
    vfs.initialized,
    archive,
    listing.archiveData,
    view,
  ]);

  const myComputerData = useMyComputerData(vfs, inFolder);

  const goUp = useCallback(() => {
    if (!inFolder) return;
    navigateTo(location.parent || MY_COMPUTER);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFolder, location.parent, navigateTo]);

  // --- Selection ---

  const selectSingle = useCallback(path => {
    setSelectedPaths([path]);
    setAnchorPath(path);
  }, []);

  // XP's "slow double click": a second click on an item that is already the
  // whole selection opens the rename box, unless a double-click beats it
  const slowRenameTimer = useRef(null);
  const cancelSlowRename = useCallback(() => {
    if (slowRenameTimer.current) {
      clearTimeout(slowRenameTimer.current);
      slowRenameTimer.current = null;
    }
  }, []);
  useEffect(() => cancelSlowRename, [cancelSlowRename]);
  // Changing folder, or clicking anything else, drops a pending rename. Keyed
  // on the joined paths so re-selecting the same single item doesn't cancel.
  const selectionKey = selectedPaths.join('|');
  useEffect(() => {
    cancelSlowRename();
  }, [currentPath, selectionKey, cancelSlowRename]);

  const onItemClick = (e, node) => {
    e.stopPropagation();
    const wasSoleSelection =
      selectedPaths.length === 1 &&
      selectedPaths[0] === node.path &&
      !renamingPath;
    cancelSlowRename();
    if (
      wasSoleSelection &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !node.system &&
      !inRecycleBin
    ) {
      slowRenameTimer.current = setTimeout(() => {
        slowRenameTimer.current = null;
        setRenamingPath(node.path);
      }, 700);
    }
    if (e.ctrlKey) {
      setSelectedPaths(prev =>
        prev.includes(node.path)
          ? prev.filter(p => p !== node.path)
          : [...prev, node.path],
      );
      setAnchorPath(node.path);
    } else if (e.shiftKey && anchorPath) {
      const order = items.map(n => n.path);
      const a = order.indexOf(anchorPath);
      const b = order.indexOf(node.path);
      if (a === -1 || b === -1) {
        selectSingle(node.path);
      } else {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        setSelectedPaths(order.slice(lo, hi + 1));
      }
    } else {
      selectSingle(node.path);
    }
  };

  const onItemDoubleClick = node => {
    cancelSlowRename();
    if (node.type === 'folder' || node.type === 'drive') {
      navigateTo(node.path);
    } else if (inRecycleBin) {
      setPropertiesPath(node.path);
    } else if (node.inArchive) {
      listing.openEntry(node);
    } else if (/\.zip$/i.test(node.name) && node.type === 'file') {
      // Browsed, not launched
      navigateTo(node.path);
    } else if (node.type === 'shortcut' || node.type === 'file') {
      // Shortcuts, executables and documents all resolve through the shell
      if (onShellOpen) onShellOpen(node.path);
    } else if (
      node.type === 'special' &&
      node.specialFolder === 'recycle-bin'
    ) {
      navigateTo(RECYCLE_BIN);
    } else if (node.type === 'special') {
      if (node.specialFolder === 'my-computer') navigateTo(MY_COMPUTER);
    }
  };

  const dnd = useItemDragDrop({
    vfs,
    dlg,
    inFolder,
    currentPath,
    selectedPaths,
    selectSingle,
    onDragStart: cancelSlowRename,
  });

  const band = useRubberBand({
    areaRef: contentAreaRef,
    selectedPaths,
    setSelectedPaths,
    disabled: !!renamingPath,
  });

  // --- File operations on the current selection ---

  const modifiableSelection = useMemo(
    () =>
      selectedPaths
        .map(p => vfs.getNode(p))
        .filter(n => n && !n.system)
        .map(n => n.path),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPaths, vfs.version],
  );

  const deletePaths = useCallback(
    async paths => {
      if (inRecycleBin) {
        for (const p of paths) {
          // eslint-disable-next-line no-await-in-loop
          await recycle.deletePermanently(p);
        }
        setSelectedPaths([]);
        return;
      }
      if (await recycle.deleteToBin(paths)) setSelectedPaths([]);
    },
    [inRecycleBin, recycle],
  );

  const createNew = useCallback(
    (kind, baseDir) => {
      const dir = baseDir || currentPath;
      if (dir === MY_COMPUTER) return;
      const baseName = kind === 'folder' ? 'New Folder' : 'New Text Document';
      const ext = kind === 'folder' ? '' : '.txt';
      const name = vfs.uniqueNameIn(dir, n =>
        n === 1 ? `${baseName}${ext}` : `${baseName} (${n})${ext}`,
      );
      const path = `${dir}/${name}`;
      if (kind === 'folder') vfs.createFolder(path);
      else vfs.createFile(path, '');
      setTimeout(() => setRenamingPath(path), 50);
    },
    [currentPath, vfs],
  );

  // Paste, resolving replace conflicts and surfacing errors
  const pasteInto = useCallback(
    async destDir => {
      const { errors } = await vfs.clipboardPaste(destDir, async node =>
        dlg.confirm(
          `This folder already contains an item named '${displayName(
            node,
            hideExt,
          )}'.\n\nWould you like to replace the existing item?`,
          'Confirm File Replace',
        ),
      );
      if (errors.some(e => e.error === 'cycle')) {
        dlg.alert(
          'The destination folder is a subfolder of the source folder.',
          'Cannot Move Folder',
        );
      }
      const other = errors.find(e => e.error !== 'cycle');
      if (other) {
        dlg.alert(
          other.message || 'The file or folder cannot be pasted.',
          'Error Moving File or Folder',
          { icon: 'error' },
        );
      }
    },
    [vfs, dlg, hideExt],
  );

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
        const yes = await dlg.confirm(
          'If you change a file name extension, the file may become unusable. Are you sure you want to change it?',
          'Rename',
          { icon: 'warning' },
        );
        if (!yes) return;
      }
      const res = vfs.rename(path, finalName);
      if (res.ok) return;
      if (res.error === 'protected') {
        dlg.alert(
          `Cannot rename ${displayName(
            node,
            hideExt,
          )}: It is a Windows system folder and is required for Windows to run properly.`,
          'Error Renaming File or Folder',
          { icon: 'error' },
        );
      } else if (res.error === 'invalid') {
        dlg.alert(INVALID_NAME_MESSAGE, 'Rename');
      } else if (res.error === 'exists') {
        dlg.alert(
          `Cannot rename ${displayName(
            node,
            hideExt,
          )}: A file with the name you specified already exists. Specify a different file name.`,
          'Error Renaming File or Folder',
        );
      }
    },
    [vfs, dlg, hideExt],
  );

  // --- Menu bar ---

  const menus = useMemo(
    () =>
      buildExplorerMenus({
        viewMode,
        sortBy,
        canPaste: !!vfs.clipboard && inFolder,
        hasSelection: selectedPaths.length > 0,
        canModifySelection: modifiableSelection.length > 0,
        statusBar: statusBarVisible,
        inFolder,
        layoutLocked: inControlPanel,
      }),
    [
      viewMode,
      sortBy,
      vfs.clipboard,
      inFolder,
      inControlPanel,
      selectedPaths,
      modifiableSelection,
      statusBarVisible,
    ],
  );

  function onClickOptionItem(item) {
    const viewEntry = VIEW_MODES.find(v => v.label === item);
    if (viewEntry) {
      setViewMode(viewEntry.key);
      return;
    }
    const sortEntry = SORT_KEYS.find(s => s.label === item);
    if (sortEntry) {
      setSortBy(sortEntry.key);
      setSortAsc(true);
      return;
    }
    switch (item) {
      case 'Close':
        onClose();
        break;
      case 'Up One Level':
        goUp();
        break;
      case 'Back':
        nav.goBack();
        break;
      case 'Forward':
        nav.goForward();
        break;
      case 'My Computer':
        navigateTo(MY_COMPUTER);
        break;
      case 'Folder':
        createNew('folder');
        break;
      case 'Shortcut':
        if (inFolder) setShortcutWizardOpen(true);
        break;
      case 'Text Document':
        createNew('txt');
        break;
      case 'Create Shortcut':
        if (inFolder)
          selectedPaths.forEach(p => vfs.createShortcutTo(p, currentPath));
        break;
      case 'Folder Options...':
        setFolderOptionsOpen(true);
        break;
      case 'About Windows':
        setAboutOpen(true);
        break;
      case 'Delete':
        deletePaths(selectedPaths);
        break;
      case 'Rename':
        if (modifiableSelection.length > 0)
          setRenamingPath(modifiableSelection[0]);
        break;
      case 'Properties':
        if (selectedPaths.length > 0) setPropertiesPath(selectedPaths[0]);
        break;
      case 'Cut':
        if (modifiableSelection.length > 0)
          vfs.clipboardCut(modifiableSelection);
        break;
      case 'Copy':
        if (selectedPaths.length > 0) vfs.clipboardCopy(selectedPaths);
        break;
      case 'Paste':
        if (inFolder) pasteInto(currentPath);
        break;
      case 'Select All':
        setSelectedPaths(items.map(n => n.path));
        break;
      case 'Invert Selection':
        setSelectedPaths(
          items.map(n => n.path).filter(p => !selectedPaths.includes(p)),
        );
        break;
      case 'Status Bar':
        setStatusBarVisible(v => !v);
        break;
      default:
        break;
    }
  }

  // --- Keyboard shortcuts ---

  const onKeyDown = e => {
    if (renamingPath) return;
    if (e.target.tagName === 'INPUT') return;
    const key = e.key;
    if (key === 'Delete') {
      e.preventDefault();
      deletePaths(selectedPaths);
    } else if (key === 'F2') {
      e.preventDefault();
      if (modifiableSelection.length > 0)
        setRenamingPath(modifiableSelection[0]);
    } else if (key === 'Enter') {
      e.preventDefault();
      const first = selectedPaths[0] && vfs.getNode(selectedPaths[0]);
      if (first) onItemDoubleClick(first);
    } else if (key === 'Backspace') {
      e.preventDefault();
      goUp();
    } else if (e.ctrlKey && key.toLowerCase() === 'a') {
      e.preventDefault();
      setSelectedPaths(items.map(n => n.path));
    } else if (e.ctrlKey && key.toLowerCase() === 'c') {
      if (selectedPaths.length > 0) vfs.clipboardCopy(selectedPaths);
    } else if (e.ctrlKey && key.toLowerCase() === 'x') {
      if (modifiableSelection.length > 0) vfs.clipboardCut(modifiableSelection);
    } else if (e.ctrlKey && key.toLowerCase() === 'v') {
      if (inFolder) pasteInto(currentPath);
    }
  };

  // --- Context menus ---

  const openMenuAt = (e, items, extra) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      x: rect.left,
      y: rect.bottom,
      items,
      target: null,
      selection: [],
      ...extra,
    });
  };

  // Back/Forward chevrons jump anywhere in history, like XP
  const openHistoryMenu = (e, dir) => {
    e.stopPropagation();
    const entries = historyMenu(vfs, nav.history, nav.index, dir);
    if (entries.length > 0) openMenuAt(e, entries);
  };

  const onViewsButton = e => {
    e.stopPropagation();
    openMenuAt(e, viewSubmenu(viewMode, inControlPanel));
  };

  const onItemContextMenu = useCallback(
    (e, node) => {
      e.preventDefault();
      e.stopPropagation();
      cancelSlowRename();
      // Right-clicking outside the current selection reselects
      const selection = selectedPaths.includes(node.path)
        ? selectedPaths
        : [node.path];
      if (!selectedPaths.includes(node.path)) selectSingle(node.path);
      const menu = inRecycleBin
        ? { items: recycleItemMenu(selection.length > 1) }
        : itemMenu({ vfs, node, selection, inArchive: !!archive });
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: menu.items,
        pinTarget: menu.pinTarget,
        target: node.path,
        selection,
      });
    },
    [vfs, selectedPaths, selectSingle, cancelSlowRename, archive, inRecycleBin],
  );

  const onEmptyContextMenu = useCallback(
    e => {
      if (!inFolder) return;
      if (!EMPTY_AREA.some(c => e.target.classList.contains(c))) return;
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        target: null,
        selection: [],
        items: emptyAreaMenu({
          viewMode,
          sortBy,
          locked: inControlPanel,
          inRecycleBin,
          binEmpty: items.length === 0,
          inArchive: !!archive,
          archiveEncrypted: items.some(n => n.encrypted),
          canPaste: !!vfs.clipboard,
        }),
      });
    },
    [
      inFolder,
      vfs.clipboard,
      viewMode,
      sortBy,
      archive,
      inRecycleBin,
      inControlPanel,
      items,
    ],
  );

  const handleContextAction = useCallback(
    async action => {
      const targetPath = contextMenu?.target;
      const selection = contextMenu?.selection || [];

      if (action.startsWith('view:')) {
        setViewMode(action.slice(5));
        return;
      }
      if (action.startsWith('sort:')) {
        setSortBy(action.slice(5));
        setSortAsc(true);
        return;
      }
      if (action.startsWith('hist:')) {
        nav.jumpTo(parseInt(action.slice(5), 10));
        return;
      }
      // The verbs every file has, shared with the desktop
      const shared = await runItemAction(action, {
        vfs,
        dlg,
        target: targetPath,
        selection,
        onShellOpen,
        extractZip: zipExtraction.extract,
        shortcutDir: inFolder ? currentPath : null,
        onProperties: setPropertiesPath,
        onBinProperties: () => setBinPropsOpen(true),
        // an open listing shows the new state
        onArchiveChanged: listing.reload,
      });
      if (shared) return;

      switch (action) {
        case 'open': {
          if (!targetPath) break;
          // Entries inside an archive are rows of the listing, not VFS nodes
          const node =
            vfs.getNode(targetPath) || items.find(i => i.path === targetPath);
          if (node) onItemDoubleClick(node);
          break;
        }
        case 'toggle-pin':
          if (contextMenu?.pinTarget)
            togglePinned(vfs, getCurrentUserName(), contextMenu.pinTarget);
          break;
        case 'paste':
          if (targetPath) pasteInto(targetPath);
          break;
        case 'paste-here':
          pasteInto(currentPath);
          break;
        case 'delete':
          await deletePaths(selection);
          break;
        case 'rename':
          if (targetPath) setRenamingPath(targetPath);
          break;
        case 'properties-folder':
          if (inFolder) setPropertiesPath(currentPath);
          break;
        case 'new-folder':
          createNew('folder', targetPath || currentPath);
          break;
        case 'new-txt':
          createNew('txt', targetPath || currentPath);
          break;
        case 'new-shortcut':
          if (inFolder) setShortcutWizardOpen(true);
          break;
        case 'extract-here':
          if (archive) zipExtraction.extract(archive.archive);
          break;
        case 'rb-restore':
          for (const p of selection) {
            // eslint-disable-next-line no-await-in-loop
            await recycle.restore(p);
          }
          setSelectedPaths([]);
          break;
        case 'rb-delete':
          for (const p of selection) {
            // eslint-disable-next-line no-await-in-loop
            await recycle.deletePermanently(p);
          }
          setSelectedPaths([]);
          break;
        case 'rb-empty':
          await recycle.emptyBin(items);
          break;
        case 'password-here':
          if (await addArchivePassword(vfs, dlg, archive.archive))
            listing.reload();
          break;
        case 'unpassword-here':
          if (await removeArchivePassword(vfs, dlg, archive.archive))
            listing.reload();
          break;
        default:
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vfs, dlg, contextMenu, currentPath, pasteInto, deletePaths, createNew],
  );

  // --- Derived state for rendering ---

  const selectedNode =
    selectedPaths.length === 1 ? vfs.getNode(selectedPaths[0]) : null;
  const isCut = path =>
    vfs.clipboard?.action === 'cut' && vfs.clipboard.paths.includes(path);
  const itemCount = inFolder
    ? items.length
    : countMyComputerItems(myComputerData);

  const selectedSize = useMemo(() => {
    let total = 0;
    for (const p of selectedPaths) {
      const n = vfs.getNode(p);
      if (n?.type === 'file') total += n.size || 0;
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPaths, vfs.version]);

  // Which media shell folder the current view is, if any. XP gives My
  // Music, My Pictures and My Videos their own task card and swaps the
  // "Shared Documents" link for the matching shared folder.
  const shellFolderKind = useMemo(() => {
    const folder = inFolder ? shellFolderFor(currentNode) : null;
    return folder
      ? { 'my-music': 'music', 'my-pictures': 'pictures', 'my-videos': 'videos' }[
          folder.kind
        ] || null
      : null;
  }, [inFolder, currentNode]);

  const firstPicture = useMemo(() => {
    if (shellFolderKind !== 'pictures') return null;
    const hit = items.find(
      n => n.type === 'file' && IMAGE_EXTENSIONS.includes(getExtension(n.path)),
    );
    return hit ? hit.path : null;
  }, [shellFolderKind, items]);

  // XP paints a big translucent glyph into the bottom-right of a shell
  // folder's file area. Only the ones we hold a real crop of are shown.
  const folderWatermark = shellFolderKind
    ? getArt(`folder-watermark-${shellFolderKind}`, null)
    : null;

  // Revealing a hidden system folder is per folder and lasts as long as the
  // window is open, like the real thing
  const folderKey = normalizePath(currentPath || '');
  const contentsHidden =
    inFolder &&
    HIDDEN_SYSTEM_FOLDER.test(folderKey) &&
    !revealedFolders.includes(folderKey);
  const revealContents = () =>
    setRevealedFolders(r => (r.includes(folderKey) ? r : [...r, folderKey]));

  const renderName = node =>
    renamingPath === node.path ? (
      <RenameInput
        defaultValue={displayName(node, hideExt)}
        selectBase={node.type === 'file' && !hiddenExtension(node, hideExt)}
        onFinish={newName => handleRename(node.path, newName)}
        multiline={WRAPPING_VIEWS.includes(viewMode)}
      />
    ) : (
      <span className="com__item-name">{displayName(node, hideExt)}</span>
    );

  const itemHandlers = node => ({
    // nothing drags out of the Recycle Bin
    ...(inRecycleBin ? { draggable: false } : null),
    onClick: e => onItemClick(e, node),
    onDoubleClick: () => onItemDoubleClick(node),
    onContextMenu: e => onItemContextMenu(e, node),
    // A draggable ancestor swallows mouse drags, which would stop the edit
    // box from sweeping a text selection
    draggable: renamingPath !== node.path,
    onDragStart: e => dnd.onItemDragStart(e, node),
    onDragOver: e => dnd.onItemDragOver(e, node),
    onDragLeave: e => dnd.onItemDragLeave(e, node),
    onDrop: e => dnd.onItemDrop(e, node),
    'data-path': node.path,
  });

  const myComputerItemProps = node => ({
    onClick: e => onItemClick(e, node),
    onDoubleClick: () => onItemDoubleClick(node),
    onDragOver: e => dnd.onItemDragOver(e, node),
    onDragLeave: e => dnd.onItemDragLeave(e, node),
    onDrop: e => dnd.onItemDrop(e, node),
  });

  const itemClass = node =>
    `${
      selectedPaths.includes(node.path) || dnd.dropTargetPath === node.path
        ? ' selected'
        : ''
    }${isCut(node.path) ? ' cut' : ''}${
      renamingPath === node.path ? ' renaming' : ''
    }`;

  const headerSort = key => {
    if (sortBy === key) setSortAsc(a => !a);
    else {
      setSortBy(key);
      setSortAsc(true);
    }
  };

  const detailColumns = inRecycleBin
    ? RECYCLE_COLUMNS
    : archive
    ? ARCHIVE_COLUMNS
    : DETAIL_COLUMNS;

  const folderTree = (
    <FolderTree
      currentPath={currentPath}
      onNavigate={navigateTo}
      onClose={() => setFoldersPaneOpen(false)}
    />
  );

  return (
    <Div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onClick={() => {
        if (band.consumeSuppressedClick()) return;
        setSelectedPaths([]);
      }}
      onMouseDown={e => {
        if (e.target.tagName !== 'INPUT' && rootRef.current) {
          rootRef.current.focus();
        }
      }}
    >
      <section className="com__toolbar">
        <div className="com__options">
          <WindowDropDowns items={menus} onClickItem={onClickOptionItem} />
        </div>
        <img className="com__windows-logo" src={windows} alt="windows" />
      </section>

      <FunctionBar
        canBack={nav.canBack}
        canForward={nav.canForward}
        canUp={inFolder}
        onBack={nav.goBack}
        onForward={nav.goForward}
        onUp={goUp}
        onHistoryMenu={openHistoryMenu}
        foldersOpen={foldersPaneOpen}
        onToggleFolders={() => setFoldersPaneOpen(o => !o)}
        viewsLocked={inControlPanel}
        onViews={onViewsButton}
      />

      <AddressBar
        address={location.address}
        icon={location.icon || computerIcon}
        onNavigate={navigateTo}
      />

      <div className="com__content">
        {inControlPanel ? (
          <div className="com__content__inner">
            {/* the Folders pane replaces Control Panel's own task pane,
                exactly as it replaces the task cards in a folder */}
            {foldersPaneOpen && folderTree}
            <ControlPanel
              embedded
              hideTaskPane={foldersPaneOpen}
              view={location.view}
              onShellOpen={onShellOpen}
              onNavigate={v =>
                navigateTo(
                  v === 'home' ? CONTROL_PANEL : `${CONTROL_PANEL}/${v}`,
                )
              }
            />
          </div>
        ) : (
          <div className="com__content__inner">
            {foldersPaneOpen ? (
              folderTree
            ) : (
              <LeftPane
                collapsed={collapsedCards}
                onToggleCard={key =>
                  setCollapsedCards(c => ({ ...c, [key]: !c[key] }))
                }
                vfs={vfs}
                hideExt={hideExt}
                inFolder={inFolder}
                inRecycleBin={inRecycleBin}
                archive={archive}
                contentsHidden={contentsHidden}
                currentPath={currentPath}
                currentNode={currentNode}
                shellFolderKind={shellFolderKind}
                firstPicture={firstPicture}
                items={items}
                selectedPaths={selectedPaths}
                selectedNode={selectedNode}
                selectedSize={selectedSize}
                modifiableSelection={modifiableSelection}
                navigateTo={navigateTo}
                onShellOpen={onShellOpen}
                recycle={recycle}
                zipExtraction={zipExtraction}
                createNew={createNew}
                deletePaths={deletePaths}
                onRename={setRenamingPath}
                clearSelection={clearSelection}
                revealContents={revealContents}
              />
            )}

            <div
              className="com__content__right"
              ref={contentAreaRef}
              onContextMenu={onEmptyContextMenu}
              onMouseDown={band.startRubberBand}
              onDragOver={dnd.onListDragOver}
              onDrop={dnd.onListDrop}
              // the desktop's mouse-drag hit-tests for this to drop files in
              data-drop-path={
                inFolder && !archive && !inRecycleBin ? currentPath : undefined
              }
            >
              {folderWatermark && !contentsHidden && (
                <img
                  className="com__watermark"
                  src={folderWatermark}
                  alt=""
                  draggable={false}
                />
              )}
              {contentsHidden ? (
                <div className="com__hidden-panel">
                  <img
                    className="com__hidden-panel__art"
                    src={getArt('folder-hidden-watermark', null) || undefined}
                    alt=""
                    draggable={false}
                  />
                  <div className="com__hidden-panel__title">
                    These files are hidden.
                  </div>
                  <div className="com__hidden-panel__body">
                    This folder contains files that keep your system working
                    properly. You should not modify its contents.
                  </div>
                  <div
                    className="com__hidden-panel__link"
                    onClick={revealContents}
                  >
                    Show the contents of this folder
                  </div>
                </div>
              ) : !inFolder ? (
                <MyComputerView
                  data={myComputerData}
                  hideExt={hideExt}
                  selectedPaths={selectedPaths}
                  dropTargetPath={dnd.dropTargetPath}
                  itemProps={myComputerItemProps}
                />
              ) : (
                <FolderView
                  viewMode={viewMode}
                  items={items}
                  onEmptyContextMenu={onEmptyContextMenu}
                  renderName={renderName}
                  itemClass={itemClass}
                  itemHandlers={itemHandlers}
                  columns={detailColumns}
                  sortBy={sortBy}
                  sortAsc={sortAsc}
                  onHeaderSort={headerSort}
                />
              )}
              {band.rubber && (
                <div
                  className="com__rubberband"
                  style={{
                    position: 'absolute',
                    left: band.rubber.left,
                    top: band.rubber.top,
                    width: Math.max(0, band.rubber.right - band.rubber.left),
                    height: Math.max(0, band.rubber.bottom - band.rubber.top),
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Control Panel carries its own layout; everything else gets the bar */}
      {statusBarVisible && !inControlPanel && (
        <div className="com__status_bar">
          <div className="com__status_bar__section com__status_bar__main">
            {selectedPaths.length > 0
              ? `${selectedPaths.length} object(s) selected`
              : `${itemCount} object(s)`}
          </div>
          {selectedSize > 0 && (
            <div className="com__status_bar__section">
              {formatSize(selectedSize)}
            </div>
          )}
          <div className="com__status_bar__section com__status_bar__zone">
            <img src={computerIcon} alt="" />
            <span>My Computer</span>
          </div>
        </div>
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
          onShellOpen={navigateTo}
          onClose={() => setPropertiesPath(null)}
        />
      )}
      {binPropsOpen && (
        <RecycleBinProperties onClose={() => setBinPropsOpen(false)} />
      )}
      {shortcutWizardOpen && inFolder && (
        <ShortcutWizard
          initialDir={currentPath}
          onClose={() => setShortcutWizardOpen(false)}
        />
      )}
      {folderOptionsOpen && (
        <FolderOptions onClose={() => setFolderOptionsOpen(false)} />
      )}
      {aboutOpen && <AboutWindows onClose={() => setAboutOpen(false)} />}
      {zipExtraction.element}
    </Div>
  );
}
