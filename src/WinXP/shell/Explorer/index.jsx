import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useLayoutEffect,
} from 'react';

import { WindowDropDowns } from 'components';
import { useVFS } from '../../../context/VFSContext';
import { useDialog } from '../../../context/DialogContext';
import { getCurrentUserName, listUsers } from '../../../context/users';
import ContextMenu from '../../../components/ContextMenu';
import {
  ColumnDivider,
  sumWidths,
  useColumns,
} from '../../../components/ListView';
import { playSystemSound } from '../../sounds';
import { extractOsFiles, importOsFiles } from '../../osImport';
import {
  EXE_PATHS,
  SPECIAL_FOLDERS,
  computerIcon,
  folderIcon,
  isExecutablePath,
} from '../../../context/vfsConstants';
import { isPinned, togglePinned } from '../../startMenuConfig';
import {
  displayPath,
  getParentPath,
  getBaseName,
  getExtension,
  formatSize,
  normalizePath,
  INVALID_NAME_MESSAGE,
} from '../../../context/vfsUtils';
import {
  buildExplorerMenus,
  getTypeLabel,
  displayName,
  hiddenExtension,
  VIEW_MODES,
  SORT_KEYS,
} from './menus';
import {
  addPasswordToArchive,
  extractOne,
  removePasswordFromArchive,
  openArchive,
  sendToCompressedFolder,
  zipChildren,
} from '../../../context/zipShell';
import { BadPasswordError } from '../../../context/zip';
import { IMAGE_EXTS, openWithChoicesFor } from '../fileTypes';
import { printImage } from '../printImage';
import zipSendIcon from 'assets/windowsIcons/zipfldr(16x16).png';
import { MY_COMPUTER, resolveLocation } from '../location';
import { useRecycleBinActions } from '../RecycleBin/actions';
import ControlPanel from '../ControlPanel';
import useExtraction from '../../../components/ExtractionWizard/useExtraction';
import zipTaskIcon from 'assets/windowsIcons/zipfldr(16x16).png';
import FolderTree from './FolderTree';
import { Div, ItemIcon } from './styles';
import { TaskCard, taskRow } from './TaskPane';
import {
  ALL_DETAIL_COLUMNS,
  ARCHIVE_COLUMNS,
  DETAIL_COLUMNS,
  RECYCLE_COLUMNS,
  DND_TYPE,
  readDndPaths,
  isDndFolder,
  fmtDate,
} from './helpers';
import { dropMoveInto } from '../move';
import PropertiesDialog from '../../../components/PropertiesDialog';
import RecycleBinProperties, {
  readRecycleSettings,
} from '../../../components/RecycleBinProperties';
import ShortcutWizard from '../../../components/ShortcutWizard';
import FolderOptions from '../../../components/FolderOptions';
import AboutWindows from '../../../components/AboutWindows';
import { getArt } from '../../../xpArt';

import notepadSmall from 'assets/windowsIcons/327(16x16).png';
import desktopIconSvg from 'assets/windowsIcons/desktop.svg';

import go from 'assets/windowsIcons/290.png';
import search from 'assets/windowsIcons/299(32x32).png';
import back from 'assets/windowsIcons/back.png';
import forward from 'assets/windowsIcons/forward.png';
import up from 'assets/windowsIcons/up.png';
import viewInfo from 'assets/windowsIcons/view-info.ico';
import remove from 'assets/windowsIcons/302(16x16).png';
import control from 'assets/windowsIcons/300(16x16).png';
import network from 'assets/windowsIcons/693(16x16).png';
import documentIcon from 'assets/windowsIcons/308(16x16).png';
import folderSmall from 'assets/windowsIcons/318(16x16).png';
import menu from 'assets/windowsIcons/358(32x32).png';
import folderOpen from 'assets/windowsIcons/337(32x32).png';
import dropdown from 'assets/windowsIcons/dropdown.png';
import windows from 'assets/windowsIcons/windows.png';

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

  const [history, setHistory] = useState(() => {
    // The resolver, not getNode: a window can open onto a namespace —
    // Control Panel, the Recycle Bin, a zip — that is not a node at all.
    const start = initialPath ? resolveLocation(vfs, initialPath) : null;
    return [start && start.exists ? start.path : MY_COMPUTER];
  });
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [anchorPath, setAnchorPath] = useState(null);
  const [addressInput, setAddressInput] = useState(MY_COMPUTER);
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const detailsRef = useRef(null);
  const detailCols = useColumns('explorer.details', ALL_DETAIL_COLUMNS);
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
  const [rubber, setRubber] = useState(null);
  const contentAreaRef = useRef(null);
  const rubberState = useRef(null);
  const suppressClickRef = useRef(false);

  const currentPath = history[historyIndex];
  const inFolder = currentPath !== MY_COMPUTER;

  /*
   * Compressed Folders was a shell namespace extension, so a .zip is walked
   * with the same path string as any folder — "…/a.zip" and "…/a.zip/sub".
   * Only the listing comes from somewhere else, and its entries are shaped
   * like nodes so icons, type names and sorting need to know nothing.
   */
  /*
   * Everything the shell knows about the current path — namespace or folder,
   * title, icons, where Up goes — comes from one resolver. The `archive` and
   * `shellSpace` locals keep their old shapes so the render code reads the
   * same; only the source of truth moved.
   */
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
  const shellSpace =
    location.kind === 'recycle' || location.kind === 'control'
      ? { kind: location.kind, view: location.view }
      : null;
  const [archiveData, setArchiveData] = useState(null);

  useEffect(() => {
    if (!archive || !vfs.initialized) {
      setArchiveData(null);
      return undefined;
    }
    if (archiveData && archiveData.path === archive.archive) return undefined;
    let live = true;
    openArchive(vfs, archive.archive)
      .then(({ entries }) => {
        if (live) setArchiveData({ path: archive.archive, entries });
      })
      .catch(err => {
        if (!live) return;
        setArchiveData({ path: archive.archive, entries: [] });
        dlg.alert(
          err.message ||
            'The Compressed (zipped) Folder is invalid or corrupted.',
          'Compressed (zipped) Folders Error',
        );
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archive, vfs.initialized, vfs.version]);

  // 'Hide extensions for known file types' — XP default is on
  const hideExt = useMemo(() => {
    try {
      const view = vfs.getUserConfig('explorerView', null) || {};
      return view.hideExt !== false;
    } catch {
      return true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version, vfs.initialized]);

  // Sync address bar text when path changes
  useEffect(() => {
    setAddressInput(location.address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.address]);

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
      const target = p || MY_COMPUTER;
      setHistory(h => [...h.slice(0, historyIndex), target]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version, vfs.initialized, currentPath, inFolder]);

  // Get current folder node (null for My Computer special view)
  const currentNode = useMemo(() => {
    if (!inFolder) return null;
    return vfs.getNode(currentPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, inFolder, vfs.version]);

  // --- Items for current view (sorted) ---

  const items = useMemo(() => {
    if (!vfs.initialized || !inFolder) return [];
    // Hidden-file visibility follows Folder Options (per-user, in the hive)
    let view = {};
    try {
      view = vfs.getUserConfig('explorerView', null) || {};
    } catch {
      view = {};
    }
    if (shellSpace && shellSpace.kind !== 'recycle') return [];
    const showHidden = !!view.showHidden;
    const hideProtectedOS = view.hideProtectedOS !== false;
    const list = shellSpace
      ? vfs.getRecycleBinContents()
      : archive
      ? archiveData && archiveData.path === archive.archive
        ? zipChildren(archiveData.entries, archive.archive, archive.inner)
        : []
      : vfs
          .listDir(currentPath)
          .filter(
            n => !n.hidden || (showHidden && !(n.system && hideProtectedOS)),
          );
    const dirRank = n => (n.type === 'folder' || n.type === 'drive' ? 0 : 1);
    const cmp = (a, b) => {
      if (dirRank(a) !== dirRank(b)) return dirRank(a) - dirRank(b);
      let r = 0;
      switch (sortBy) {
        case 'size':
          r = (a.size || 0) - (b.size || 0);
          break;
        case 'type':
          r = getTypeLabel(a).localeCompare(getTypeLabel(b));
          break;
        case 'modified':
          r = (a.modifiedAt || 0) - (b.modifiedAt || 0);
          break;
        case 'location':
          r = (a.originalPath || '').localeCompare(b.originalPath || '');
          break;
        case 'packed':
          r = (a.packedSize || 0) - (b.packedSize || 0);
          break;
        case 'password':
          r = (a.encrypted ? 1 : 0) - (b.encrypted ? 1 : 0);
          break;
        case 'ratio':
          r =
            (a.size ? 1 - (a.packedSize || 0) / a.size : 0) -
            (b.size ? 1 - (b.packedSize || 0) / b.size : 0);
          break;
        case 'deleted':
          r = (a.deletedAt || 0) - (b.deletedAt || 0);
          break;
        default:
          r = 0;
      }
      if (r === 0)
        r = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      return sortAsc ? r : -r;
    };
    return [...list].sort(cmp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPath,
    inFolder,
    sortBy,
    sortAsc,
    vfs.version,
    vfs.initialized,
    archive,
    archiveData,
  ]);

  // My Computer special view data — matches real Windows XP layout
  const myComputerData = useMemo(() => {
    if (inFolder || !vfs.initialized) return null;

    const userFolders = [];
    const sharedDocs = vfs.getNode(
      'C:/Documents and Settings/All Users/Documents',
    );
    if (sharedDocs)
      userFolders.push({ ...sharedDocs, displayName: 'Shared Documents' });
    const myDocs = vfs.getNode(SPECIAL_FOLDERS.MY_DOCUMENTS);
    if (myDocs)
      userFolders.push({
        ...myDocs,
        displayName: `${getCurrentUserName()}'s Documents`,
      });

    const hardDrives = [];
    const cDrive = vfs.getNode('C:/');
    if (cDrive) hardDrives.push({ ...cDrive, displayName: 'Local Disk (C:)' });

    const removable = [];
    const dDrive = vfs.getNode('D:/');
    if (dDrive) removable.push({ ...dDrive, displayName: 'CD Drive (D:)' });

    return { userFolders, hardDrives, removable };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFolder, vfs.version, vfs.initialized]);

  // --- Navigation ---

  const navigateTo = useCallback(
    path => {
      // Only the archive is a node; the folders inside it are not, so those
      // are checked against the archive that holds them.
      const where = resolveLocation(vfs, path);
      if (!where.exists) return;
      playSystemSound('navigate');
      const target = where.path;
      setHistory(h => {
        const newHistory = h.slice(0, historyIndex + 1);
        newHistory.push(target);
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
      });
      setSelectedPaths([]);
      setAnchorPath(null);
      setAddressDropdownOpen(false);
    },
    [vfs, historyIndex],
  );

  const goBack = () => {
    if (historyIndex > 0) {
      playSystemSound('navigate');
      setHistoryIndex(historyIndex - 1);
      setSelectedPaths([]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      playSystemSound('navigate');
      setHistoryIndex(historyIndex + 1);
      setSelectedPaths([]);
    }
  };

  const goUp = useCallback(() => {
    if (!inFolder) return;
    navigateTo(location.parent || MY_COMPUTER);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFolder, location.parent, navigateTo]);

  // --- Importing files dragged in from the host OS ---
  // Drops land in the current folder; the My Computer root is not a folder,
  // so it rejects them (no preventDefault = no-drop cursor).
  // --- Drag and drop (internal move, like dragging files in real XP) ---

  const [dropTargetPath, setDropTargetPath] = useState(null);

  // Move dragged paths into destDir with XP semantics: same-folder drops are
  // silent no-ops, name collisions ask before replacing.
  const dropMoveHere = (paths, destDir) =>
    dropMoveInto(paths, destDir, { vfs, dlg });

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

  const onItemDragStart = (e, node) => {
    cancelSlowRename();
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
    // A drop from another Explorer window moves into this folder; a drop
    // from the host OS imports the files.
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

  // --- Selection ---

  const selectSingle = useCallback(path => {
    setSelectedPaths([path]);
    setAnchorPath(path);
  }, []);

  const onItemClick = (e, node) => {
    e.stopPropagation();
    // XP's "slow double click": a second click on an item that is already the
    // whole selection opens the rename box, unless a double-click beats it.
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
      // A file inside an archive has to come out before anything can open it,
      // which is what the shell did too — into a temporary directory named
      // after the archive.
      openFromArchive(node);
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
      navigateTo('Recycle Bin');
    } else if (node.type === 'special') {
      if (node.specialFolder === 'my-computer') navigateTo(MY_COMPUTER);
    }
  };

  const zipExtraction = useExtraction(vfs, path => navigateTo(path));
  const recycle = useRecycleBinActions(vfs, dlg, hideExt);
  const inRecycleBin = location.kind === 'recycle';
  const inControlPanel = location.kind === 'control';

  /** Extract one entry to the shell's temp folder and hand it on. */
  const openFromArchive = async node => {
    if (!archive) return;
    const temp = `${
      SPECIAL_FOLDERS.TEMP
    }/Temporary Directory 1 for ${getBaseName(archive.archive)}`;
    const inner = node.path.slice(archive.archive.length + 1);
    let password = '';
    for (;;) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const out = await extractOne(
          vfs,
          archive.archive,
          inner,
          temp,
          password,
        );
        if (out && onShellOpen) onShellOpen(out);
        return;
      } catch (err) {
        if (err instanceof BadPasswordError) {
          // The real "Password needed" dialog, retried until it opens or the
          // user gives up; Skip File on a single file is just a cancel.
          // eslint-disable-next-line no-await-in-loop
          const answer = await zipExtraction.askPassword(node.name, !!password);
          if (answer && answer !== 'skip') {
            password = answer;
            continue;
          }
          return;
        }
        dlg.alert(
          err.message || 'An error occurred while performing this operation.',
          'Compressed (zipped) Folders Error',
        );
        return;
      }
    }
  };

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
      const nodes = paths.map(p => vfs.getNode(p)).filter(Boolean);
      const blockedSystem = nodes.filter(
        n => vfs.isProtectedPath && vfs.isProtectedPath(n.path),
      );
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
      if (deletable.length === 0) return;
      // Recycle Bin Properties decides whether we confirm, and whether the
      // file lands in the bin at all
      const bin = readRecycleSettings(vfs);
      const remove = n =>
        bin.nukeOnDelete
          ? vfs.deleteNodePermanently(n.path)
          : vfs.deleteNode(n.path);
      if (!bin.confirmDelete) {
        deletable.forEach(remove);
        setSelectedPaths([]);
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
      const yes = await dlg.confirm(message, title);
      if (!yes) return;
      deletable.forEach(remove);
      setSelectedPaths([]);
    },
    [vfs, dlg, hideExt],
  );

  const createNew = useCallback(
    (kind, baseDir) => {
      const dir = baseDir || currentPath;
      if (dir === MY_COMPUTER) return;
      const baseName = kind === 'folder' ? 'New Folder' : 'New Text Document';
      const ext = kind === 'folder' ? '' : '.txt';
      let name = `${baseName}${ext}`;
      let path = `${dir}/${name}`;
      let counter = 2;
      while (vfs.exists(path)) {
        name = `${baseName} (${counter})${ext}`;
        path = `${dir}/${name}`;
        counter++;
      }
      if (kind === 'folder') vfs.createFolder(path);
      else vfs.createFile(path, '');
      setTimeout(() => setRenamingPath(path), 50);
    },
    [currentPath, vfs],
  );

  // --- Paste helper: resolves replace conflicts and surfaces errors ---
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

  // --- Address bar ---

  const onAddressSubmit = e => {
    if (e) e.preventDefault();
    let path = addressInput.replace(/\\/g, '/').trim();
    if (path.toLowerCase() === 'my computer' || path === MY_COMPUTER) {
      navigateTo(MY_COMPUTER);
      return;
    }
    if (/^recycle bin$/i.test(path)) path = 'Recycle Bin';
    if (/^control panel$/i.test(path)) path = 'Control Panel';
    if (/^[A-Za-z]:$/.test(path)) path += '/';
    if (path.length > 3 && path.endsWith('/')) path = path.slice(0, -1);
    if (resolveLocation(vfs, path).exists) {
      navigateTo(path);
    } else {
      dlg.alert(
        `Windows cannot find '${addressInput.trim()}'. Check the spelling and try again, or try searching for the item by clicking the Start button and then clicking Search.`,
        'My Computer',
      );
    }
  };

  /**
   * The address bar drops the shell namespace, not the current path's
   * ancestors — Desktop at the root with My Documents, My Computer and its
   * drives, the shared/other-user document folders, then My Network Places
   * and the Recycle Bin.
   */
  const addressQuickLinks = useMemo(() => {
    const indent = depth => 8 + depth * 12;
    const links = [
      {
        label: 'Desktop',
        icon: getArt('Desktop16', getArt('Desktop', desktopIconSvg)),
        path: SPECIAL_FOLDERS.DESKTOP,
        indentPx: indent(0),
      },
      {
        label: 'My Documents',
        icon: getArt('MyDocuments16', documentIcon),
        path: SPECIAL_FOLDERS.MY_DOCUMENTS,
        indentPx: indent(1),
      },
      {
        label: MY_COMPUTER,
        icon: computerIcon,
        path: MY_COMPUTER,
        indentPx: indent(1),
      },
    ];
    for (const drivePath of ['C:/', 'D:/']) {
      const node = vfs.getNode(drivePath);
      if (node)
        links.push({
          label: `${node.driveLabel || 'Local Disk'} (${node.name})`,
          icon: node.icon,
          path: node.path,
          indentPx: indent(2),
        });
    }
    links.push({
      label: 'Control Panel',
      icon: control,
      path: 'Control Panel',
      indentPx: indent(2),
    });
    const shared = 'C:/Documents and Settings/All Users/Documents';
    if (vfs.exists(shared)) {
      links.push({
        label: 'Shared Documents',
        icon: getArt('SharedFolder', documentIcon),
        path: shared,
        indentPx: indent(1),
      });
    }
    // Every other profile's documents, as the shell lists them
    const me = getCurrentUserName();
    for (const user of listUsers()) {
      if (!user || user.name === me) continue;
      const docs = `C:/Documents and Settings/${user.name}/My Documents`;
      if (!vfs.exists(docs)) continue;
      links.push({
        label: `${user.name}'s Documents`,
        icon: getArt('MyDocuments16', documentIcon),
        path: docs,
        indentPx: indent(1),
      });
    }
    links.push({
      label: 'My Network Places',
      icon: getArt('MyNetworkPlaces', network),
      indentPx: indent(1),
    });
    links.push({
      label: 'Recycle Bin',
      icon: getArt('recycle-empty', documentIcon),
      path: 'Recycle Bin',
      indentPx: indent(1),
    });
    return links;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version]);

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
        goBack();
        break;
      case 'Forward':
        goForward();
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
      case 'Refresh':
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

  const viewSubmenu = () =>
    VIEW_MODES.map(v => ({
      label: v.label,
      action: `view:${v.key}`,
      radio: viewMode === v.key,
      // Control Panel's layout is its own; the radios grey out there
      disabled: inControlPanel,
    }));

  const arrangeSubmenu = () =>
    SORT_KEYS.map(s => ({
      label: s.label,
      action: `sort:${s.key}`,
      radio: sortBy === s.key,
    }));

  const friendlyName = p => {
    if (p === MY_COMPUTER) return MY_COMPUTER;
    const n = vfs.getNode(p);
    if (!n) return p;
    if (n.type === 'drive')
      return `${n.driveLabel || 'Local Disk'} (${n.name})`;
    return n.name;
  };

  // Back/Forward dropdown chevrons — jump anywhere in history, like XP
  const openHistoryMenu = (e, dir) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const entries =
      dir === 'back'
        ? history
            .slice(0, historyIndex)
            .map((p, i) => ({ idx: i, path: p }))
            .reverse()
        : history
            .slice(historyIndex + 1)
            .map((p, i) => ({ idx: historyIndex + 1 + i, path: p }));
    if (entries.length === 0) return;
    setContextMenu({
      x: rect.left,
      y: rect.bottom,
      target: null,
      selection: [],
      items: entries.slice(0, 10).map(en => ({
        label: friendlyName(en.path),
        action: `hist:${en.idx}`,
      })),
    });
  };

  // Luna rubber-band selection over the file list
  const startRubberBand = e => {
    if (e.button !== 0 || renamingPath) return;
    const t = e.target;
    const okClasses = [
      'com__content__right',
      'com__content__right__card',
      'com__content__right__card__content',
      'com__content__empty',
      'com__view',
      'com__table',
    ];
    const ok =
      okClasses.some(c => t.classList.contains(c)) || t.tagName === 'TBODY';
    if (!ok) return;
    const base = e.ctrlKey ? [...selectedPaths] : [];
    rubberState.current = { x0: e.clientX, y0: e.clientY, base, active: false };
    const onMove = ev => {
      const s = rubberState.current;
      if (!s) return;
      if (
        !s.active &&
        Math.abs(ev.clientX - s.x0) < 4 &&
        Math.abs(ev.clientY - s.y0) < 4
      )
        return;
      s.active = true;
      ev.preventDefault();
      const area = contentAreaRef.current;
      if (!area) return;
      const ar = area.getBoundingClientRect();
      const rect = {
        left: Math.max(Math.min(s.x0, ev.clientX), ar.left),
        top: Math.max(Math.min(s.y0, ev.clientY), ar.top),
        right: Math.min(Math.max(s.x0, ev.clientX), ar.right),
        bottom: Math.min(Math.max(s.y0, ev.clientY), ar.bottom),
      };
      // The window's CSS transform makes position:fixed resolve against the
      // window, not the viewport — store area-relative coords instead and
      // render the band absolutely inside the list area.
      setRubber({
        left: rect.left - ar.left + area.scrollLeft,
        top: rect.top - ar.top + area.scrollTop,
        right: rect.right - ar.left + area.scrollLeft,
        bottom: rect.bottom - ar.top + area.scrollTop,
      });
      const hit = [];
      area.querySelectorAll('[data-path]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (
          r.left < rect.right &&
          r.right > rect.left &&
          r.top < rect.bottom &&
          r.bottom > rect.top
        )
          hit.push(el.getAttribute('data-path'));
      });
      setSelectedPaths([...new Set([...s.base, ...hit])]);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      if (rubberState.current && rubberState.current.active)
        suppressClickRef.current = true;
      rubberState.current = null;
      setRubber(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, { once: true });
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

      const multiple = selection.length > 1;
      if (inRecycleBin) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            { label: 'Restore', action: 'rb-restore', bold: true },
            { type: 'separator' },
            { label: 'Delete', action: 'rb-delete' },
            { type: 'separator' },
            {
              label: 'Properties',
              action: 'properties',
              disabled: multiple,
            },
          ],
          target: node.path,
          selection,
        });
        return;
      }
      const nodes = selection.map(p => vfs.getNode(p)).filter(Boolean);
      // Override-aware: the Folder Options toggle re-enables these entries
      const isLocked = n =>
        vfs.isProtectedPath ? vfs.isProtectedPath(n.path) : !!n.system;
      const allSystem = nodes.every(isLocked);
      const isFolder = node.type === 'folder' || node.type === 'drive';
      // Executables (and shortcuts to them) can be pinned to the Start menu
      let pinTarget = null;
      if (!multiple) {
        if (node.type === 'shortcut') {
          if (node.target && isExecutablePath(node.target)) {
            pinTarget = node.target;
          }
        } else if (isExecutablePath(node.path)) {
          pinTarget = node.path;
        }
      }
      const menuItems = [];
      const isImage = node.type === 'file' && IMAGE_EXTS.test(node.name);
      if (!multiple) {
        menuItems.push({ label: 'Open', action: 'open', bold: true });
        if (isImage) {
          // the picture verbs, in the real menu's order
          menuItems.push({ label: 'Edit', action: 'img-edit' });
          menuItems.push({ label: 'Print', action: 'img-print' });
          menuItems.push({ label: 'Preview', action: 'img-preview' });
        }
        if (node.type === 'file') {
          const choices = openWithChoicesFor(node.name);
          menuItems.push({
            label: 'Open With',
            submenu: [
              ...choices.map(c => ({
                label: c.label,
                icon: c.icon,
                action: `openwith:${c.exePath}`,
              })),
              ...(choices.length ? [{ type: 'separator' }] : []),
              { label: 'Choose Program...', action: 'open-with' },
            ],
          });
        }
        if (pinTarget) {
          menuItems.push({
            label: isPinned(vfs, getCurrentUserName(), pinTarget)
              ? 'Unpin from Start menu'
              : 'Pin to Start menu',
            action: 'toggle-pin',
          });
        }
        menuItems.push({ type: 'separator' });
      }
      if (!multiple && /\.zip$/i.test(node.name) && !archive) {
        menuItems.push({ label: 'Extract All...', action: 'extract-all' });
        menuItems.push({ label: 'Add a password...', action: 'zip-password' });
        menuItems.push({
          label: 'Remove password...',
          action: 'zip-unpassword',
        });
        menuItems.push({ type: 'separator' });
      }
      // Nothing inside an archive can be renamed, cut, deleted or handed to
      // another program in place — it has to come out first, so extraction is
      // the only verb besides Open.
      if (archive) {
        const kept = menuItems.filter(
          item => item.label === 'Open' || item.type === 'separator',
        );
        kept.push({ label: 'Extract...', action: 'extract-here' });
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: kept,
          target: node.path,
          selection,
        });
        return;
      }
      if (node.type !== 'drive') {
        menuItems.push({
          label: 'Send To',
          submenu: [
            {
              label: 'Compressed (zipped) Folder',
              icon: zipSendIcon,
              action: 'sendto-zip',
            },
            {
              label: 'Desktop (create shortcut)',
              icon: getArt('Desktop16', getArt('Desktop', desktopIconSvg)),
              action: 'sendto-desktop',
            },
            {
              label: 'My Documents',
              icon: getArt('MyDocuments16', documentIcon),
              action: 'sendto-mydocs',
            },
          ],
        });
        menuItems.push({ type: 'separator' });
      }
      menuItems.push({ label: 'Cut', action: 'cut', disabled: allSystem });
      menuItems.push({ label: 'Copy', action: 'copy' });
      if (!multiple && isFolder && vfs.clipboard) {
        menuItems.push({ label: 'Paste', action: 'paste' });
      }
      menuItems.push({ type: 'separator' });
      menuItems.push({ label: 'Create Shortcut', action: 'create-shortcut' });
      menuItems.push({
        label: 'Delete',
        action: 'delete',
        disabled: allSystem,
      });
      if (!multiple) {
        menuItems.push({
          label: 'Rename',
          action: 'rename',
          disabled: isLocked(node) || node.type === 'drive',
        });
      }
      menuItems.push({ type: 'separator' });
      menuItems.push({
        label: 'Properties',
        action: 'properties',
        disabled: multiple,
      });
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: menuItems,
        target: node.path,
        selection,
        pinTarget,
      });
    },
    [vfs, selectedPaths, selectSingle, cancelSlowRename, archive],
  );

  const onEmptyContextMenu = useCallback(
    e => {
      if (!inFolder) return;
      const target = e.target;
      if (
        !target.classList.contains('com__content__right') &&
        !target.classList.contains('com__content__right__card__content') &&
        !target.classList.contains('com__content__right__card') &&
        !target.classList.contains('com__content__empty') &&
        !target.classList.contains('com__view')
      )
        return;
      e.preventDefault();
      const menuItems = [
        { label: 'View', submenu: viewSubmenu() },
        { label: 'Arrange Icons by', submenu: arrangeSubmenu() },
        { type: 'separator' },
        { label: 'Refresh', action: 'refresh' },
      ];
      if (inRecycleBin) {
        menuItems.push({ type: 'separator' });
        menuItems.push({
          label: 'Empty Recycle Bin',
          action: 'rb-empty',
          disabled: items.length === 0,
        });
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: menuItems,
          target: null,
          selection: [],
        });
        return;
      }
      if (archive) {
        // A compressed folder offers neither New nor Properties here, and its
        // Paste entries sit greyed out above the two jobs it does have.
        menuItems.push({ type: 'separator' });
        menuItems.push({
          label: 'Paste',
          action: 'paste-here',
          disabled: true,
        });
        menuItems.push({
          label: 'Paste Shortcut',
          action: 'paste-here',
          disabled: true,
        });
        menuItems.push({ type: 'separator' });
        menuItems.push({ label: 'Extract All...', action: 'extract-here' });
        menuItems.push({ label: 'Add a Password...', action: 'password-here' });
      } else {
        if (vfs.clipboard) {
          menuItems.push({ type: 'separator' });
          menuItems.push({ label: 'Paste', action: 'paste-here' });
        }
        menuItems.push({ type: 'separator' });
        menuItems.push({
          label: 'New',
          submenu: [
            { label: 'Folder', action: 'new-folder', icon: folderIcon },
            { label: 'Shortcut', action: 'new-shortcut' },
            { type: 'separator' },
            { label: 'Text Document', action: 'new-txt', icon: notepadSmall },
          ],
        });
        menuItems.push({ type: 'separator' });
        menuItems.push({ label: 'Properties', action: 'properties-folder' });
      }
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: menuItems,
        target: null,
        selection: [],
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inFolder, vfs.clipboard, viewMode, sortBy, archive],
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
        const idx = parseInt(action.slice(5), 10);
        if (!Number.isNaN(idx) && idx >= 0 && idx < history.length) {
          setHistoryIndex(idx);
          setSelectedPaths([]);
        }
        return;
      }

      switch (action) {
        case 'open': {
          if (!targetPath) break;
          // Entries inside an archive are rows of the listing, not VFS nodes
          const node =
            vfs.getNode(targetPath) || items.find(i => i.path === targetPath);
          if (node) onItemDoubleClick(node);
          break;
        }
        case 'open-with':
          if (targetPath && onShellOpen) {
            onShellOpen(targetPath, { openWith: true });
          }
          break;
        case 'img-edit':
          if (targetPath && onShellOpen)
            onShellOpen(targetPath, { withExe: EXE_PATHS.MSPAINT });
          break;
        case 'img-preview':
          if (targetPath && onShellOpen)
            onShellOpen(targetPath, { withExe: EXE_PATHS.SHIMGVW });
          break;
        case 'img-print':
          if (targetPath)
            printImage(vfs, targetPath).catch(err =>
              dlg.alert(err.message, 'Print'),
            );
          break;
        case 'toggle-pin':
          if (contextMenu?.pinTarget) {
            togglePinned(vfs, getCurrentUserName(), contextMenu.pinTarget);
          }
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
        case 'properties': {
          const t = targetPath && vfs.getNode(targetPath);
          // The Recycle Bin is a shell object with its own sheet
          if (t && t.type === 'shortcut' && t.target === 'RecycleBin') {
            setBinPropsOpen(true);
          } else if (targetPath) {
            setPropertiesPath(targetPath);
          }
          break;
        }
        case 'properties-folder':
          if (inFolder) setPropertiesPath(currentPath);
          break;
        case 'new-folder':
          createNew('folder', contextMenu?.target || currentPath);
          break;
        case 'new-txt':
          createNew('txt', contextMenu?.target || currentPath);
          break;
        case 'new-shortcut':
          if (inFolder) setShortcutWizardOpen(true);
          break;
        case 'create-shortcut':
          if (inFolder)
            selection.forEach(p => vfs.createShortcutTo(p, currentPath));
          break;
        case 'sendto-desktop':
          selection.forEach(p =>
            vfs.createShortcutTo(p, SPECIAL_FOLDERS.DESKTOP),
          );
          break;
        case 'sendto-mydocs':
          selection.forEach(p => vfs.copy(p, SPECIAL_FOLDERS.MY_DOCUMENTS));
          break;
        case 'sendto-zip':
          sendToCompressedFolder(vfs, selection).catch(err =>
            dlg.alert(
              err.message ||
                'An error occurred while performing this operation.',
              'Compressed (zipped) Folders Error',
            ),
          );
          break;
        case 'extract-all':
          zipExtraction.extract(selection[0]);
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
        case 'extract-here':
          if (archive) zipExtraction.extract(archive.archive);
          break;
        case 'password-here':
        case 'zip-password': {
          const target =
            action === 'password-here' ? archive.archive : selection[0];
          // Look before asking: prompting for a password and only then
          // discovering the archive is already protected is backwards
          try {
            const { entries } = await openArchive(vfs, target);
            if (entries.some(en => en.encrypted)) {
              dlg.alert(
                'This Compressed (zipped) Folder is already password protected. Remove the existing password first.',
                'Compressed (zipped) Folders',
              );
              break;
            }
          } catch (err) {
            dlg.alert(err.message, 'Compressed (zipped) Folders Error');
            break;
          }
          dlg
            .prompt(
              'Enter a password to protect the Compressed (zipped) Folder.',
              '',
              'Add Password',
            )
            .then(async password => {
              if (!password) return;
              await addPasswordToArchive(vfs, target, password);
              setArchiveData(null); // an open listing shows the new state
            })
            .catch(err =>
              dlg.alert(
                err.message ||
                  'An error occurred while performing this operation.',
                'Compressed (zipped) Folders Error',
              ),
            );
          break;
        }
        case 'unpassword-here':
        case 'zip-unpassword': {
          const target =
            action === 'unpassword-here' ? archive.archive : selection[0];
          try {
            const { entries } = await openArchive(vfs, target);
            if (!entries.some(en => en.encrypted)) {
              dlg.alert(
                'This Compressed (zipped) Folder is not password protected.',
                'Compressed (zipped) Folders',
              );
              break;
            }
          } catch (err) {
            dlg.alert(err.message, 'Compressed (zipped) Folders Error');
            break;
          }
          dlg
            .prompt(
              'Enter the password to remove from the Compressed (zipped) Folder.',
              '',
              'Remove Password',
            )
            .then(async password => {
              if (!password) return;
              await removePasswordFromArchive(vfs, target, password);
              setArchiveData(null);
            })
            .catch(err =>
              dlg.alert(
                err instanceof BadPasswordError
                  ? // ZIPFLDR #10076
                    'The password you have entered is invalid. Do you wish to enter a new password now?'
                  : err.message ||
                      'An error occurred while performing this operation.',
                'Compressed (zipped) Folders Error',
              ),
            );
          break;
        }
        case 'refresh':
          break;
        default:
          if (action.startsWith('openwith:') && targetPath && onShellOpen)
            onShellOpen(targetPath, { withExe: action.slice(9) });
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vfs, dlg, contextMenu, currentPath, pasteInto, deletePaths, createNew],
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
        const yes = await dlg.confirm(
          'If you change a file name extension, the file may become unusable. Are you sure you want to change it?',
          'Rename',
          { icon: 'warning' },
        );
        if (!yes) return;
      }
      const res = vfs.rename(path, finalName);
      if (!res.ok) {
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
      }
    },
    [vfs, dlg, hideExt],
  );

  // --- Derived state for rendering ---

  const addressIcon = location.icon || computerIcon;
  const selectedNode =
    selectedPaths.length === 1 ? vfs.getNode(selectedPaths[0]) : null;
  const isCut = path =>
    vfs.clipboard?.action === 'cut' && vfs.clipboard.paths.includes(path);

  const itemCount = !inFolder
    ? myComputerData
      ? myComputerData.userFolders.length +
        myComputerData.hardDrives.length +
        myComputerData.removable.length
      : 0
    : items.length;

  const selectedSize = useMemo(() => {
    let total = 0;
    for (const p of selectedPaths) {
      const n = vfs.getNode(p);
      if (n?.type === 'file') total += n.size || 0;
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPaths, vfs.version]);

  // --- Renderers ---

  const renderDetailsPanel = () => {
    if (inRecycleBin && !selectedNode) {
      return (
        <>
          <div className="com__content__left__card__text bold">Recycle Bin</div>
          <div className="com__content__left__card__text">System Folder</div>
        </>
      );
    }
    if (selectedNode) {
      return (
        <>
          <div className="com__content__left__card__text bold">
            {displayName(selectedNode, hideExt)}
          </div>
          <div className="com__content__left__card__text">
            {getTypeLabel(selectedNode)}
          </div>
          {selectedNode.type === 'drive' && selectedNode.freeSpace != null && (
            <div className="com__content__left__card__text">
              Free Space: {formatSize(selectedNode.freeSpace)}
            </div>
          )}
          {selectedNode.type === 'drive' && selectedNode.totalSpace != null && (
            <div className="com__content__left__card__text">
              Total Size: {formatSize(selectedNode.totalSpace)}
            </div>
          )}
          {selectedNode.type === 'file' && (
            <div className="com__content__left__card__text">
              Size: {formatSize(selectedNode.size)}
            </div>
          )}
          {selectedNode.modifiedAt &&
            selectedNode.type !== 'drive' &&
            selectedNode.type !== 'special' && (
              <div className="com__content__left__card__text">
                Date Modified:{' '}
                {new Date(selectedNode.modifiedAt).toLocaleDateString()}
              </div>
            )}
        </>
      );
    }
    if (selectedPaths.length > 1) {
      return (
        <>
          <div className="com__content__left__card__text bold">
            {selectedPaths.length} items selected
          </div>
          {selectedSize > 0 && (
            <div className="com__content__left__card__text">
              Total File Size: {formatSize(selectedSize)}
            </div>
          )}
        </>
      );
    }
    return (
      <>
        <div className="com__content__left__card__text bold">
          {!inFolder ? MY_COMPUTER : currentNode?.name || currentPath}
        </div>
        <div className="com__content__left__card__text">
          {!inFolder ? 'System Folder' : getTypeLabel(currentNode)}
        </div>
      </>
    );
  };

  // --- Luna task pane pieces ---

  const renderTaskCard = (key, title, content) => (
    <TaskCard
      key={key}
      title={title}
      collapsed={!!collapsedCards[key]}
      onToggle={() => setCollapsedCards(c => ({ ...c, [key]: !c[key] }))}
    >
      {content}
    </TaskCard>
  );

  /**
   * Which shell folder the current view is, if any. XP gives My Music, My
   * Pictures and My Videos their own task card and swaps the "Shared
   * Documents" link for the matching shared folder.
   */
  const shellFolderKind = useMemo(() => {
    if (!inFolder || !currentPath) return null;
    if (/\/My Music$/i.test(currentPath)) return 'music';
    if (/\/My Pictures$/i.test(currentPath)) return 'pictures';
    if (/\/My Videos$/i.test(currentPath)) return 'videos';
    return null;
  }, [inFolder, currentPath]);

  // "View as a slide show" hands the first picture to the viewer, which
  // walks the rest of the folder from there
  const firstPicture = useMemo(() => {
    if (shellFolderKind !== 'pictures') return null;
    const hit = items.find(
      n =>
        n.type === 'file' &&
        ['.bmp', '.png', '.jpg', '.jpeg', '.gif', '.tif', '.tiff'].includes(
          getExtension(n.path).toLowerCase(),
        ),
    );
    return hit ? hit.path : null;
  }, [shellFolderKind, items]);

  // XP paints a big translucent glyph into the bottom-right of a shell
  // folder's file area. Only the ones we hold a real crop of are shown.
  const folderWatermark = shellFolderKind
    ? getArt(`folder-watermark-${shellFolderKind}`, null)
    : null;

  /**
   * The shell hides the contents of its own install folders behind a warning
   * panel until you click through. Revealing is per folder and lasts as long
   * as the window is open, like the real thing.
   */
  const isHiddenSystemFolder =
    inFolder &&
    /^C:\/(Program Files|WINDOWS)(\/system32)?$/i.test(
      normalizePath(currentPath || ''),
    );
  const contentsHidden =
    isHiddenSystemFolder &&
    !revealedFolders.includes(normalizePath(currentPath));
  const revealContents = () =>
    setRevealedFolders(r =>
      r.includes(normalizePath(currentPath))
        ? r
        : [...r, normalizePath(currentPath)],
    );

  const shellFolderTasks = () => {
    if (inRecycleBin) {
      const selected = selectedPaths.length;
      return renderTaskCard(
        'recycle-tasks',
        'Recycle Bin Tasks',
        <>
          {taskRow(
            getArt('recycle-empty16', getArt('recycle-empty', null)),
            'Empty the Recycle Bin',
            items.length ? () => recycle.emptyBin(items) : undefined,
          )}
          {selected === 0 &&
            taskRow(
              getArt('recycle-full16', getArt('recycle-full', null)),
              'Restore all items',
              items.length
                ? async () => {
                    for (const item of items) {
                      // eslint-disable-next-line no-await-in-loop
                      await recycle.restore(item.path);
                    }
                  }
                : undefined,
            )}
          {selected > 0 &&
            taskRow(
              getArt('recycle-full16', getArt('recycle-full', null)),
              selected === 1
                ? 'Restore this item'
                : 'Restore the selected items',
              async () => {
                for (const p of selectedPaths) {
                  // eslint-disable-next-line no-await-in-loop
                  await recycle.restore(p);
                }
                setSelectedPaths([]);
              },
            )}
        </>,
      );
    }
    if (archive)
      return renderTaskCard(
        'zip-tasks',
        'Folder Tasks',
        taskRow(zipTaskIcon, 'Extract all files', () =>
          zipExtraction.extract(archive.archive),
        ),
      );
    if (shellFolderKind === 'music') {
      return renderTaskCard(
        'music-tasks',
        'Music Tasks',
        <>
          {taskRow(getArt('MyMusic', folderSmall), 'Play all')}
          {taskRow(network, 'Shop for music online')}
        </>,
      );
    }
    if (shellFolderKind === 'pictures') {
      return renderTaskCard(
        'picture-tasks',
        'Picture Tasks',
        <>
          {taskRow(
            getArt('Slideshow', folderSmall),
            'View as a slide show',
            firstPicture
              ? () => onShellOpen && onShellOpen(firstPicture)
              : undefined,
          )}
          {taskRow(network, 'Order prints online')}
          {taskRow(getArt('Printer', folderSmall), 'Print pictures')}
        </>,
      );
    }
    // My Videos gets no card of its own — the real shell only shows
    // File and Folder Tasks there.
    return null;
  };

  const fileTaskRows = () => {
    if (selectedPaths.length === 0) {
      return (
        <>
          {taskRow(folderSmall, 'Make a new folder', () => createNew('folder'))}
          {taskRow(network, 'Publish this folder to the Web')}
          {taskRow(network, 'Share this folder')}
        </>
      );
    }
    const multi = selectedPaths.length > 1;
    const noun = multi
      ? 'the selected items'
      : selectedNode && selectedNode.type === 'folder'
      ? 'this folder'
      : 'this file';
    return (
      <>
        {!multi &&
          selectedNode &&
          !selectedNode.system &&
          selectedNode.type !== 'drive' &&
          taskRow(folderSmall, `Rename ${noun}`, () =>
            setRenamingPath(selectedNode.path),
          )}
        {taskRow(documentIcon, `Move ${noun}`)}
        {taskRow(documentIcon, `Copy ${noun}`, () =>
          vfs.clipboardCopy(selectedPaths),
        )}
        {taskRow(
          network,
          multi
            ? 'Publish the selected items to the Web'
            : `Publish ${noun} to the Web`,
        )}
        {!multi &&
          selectedNode &&
          selectedNode.type === 'file' &&
          taskRow(network, 'E-mail this file')}
        {modifiableSelection.length > 0 &&
          taskRow(remove, `Delete ${noun}`, () => deletePaths(selectedPaths))}
      </>
    );
  };

  const otherPlacesRows = () => {
    const shared = 'C:/Documents and Settings/All Users/Documents';
    if (inRecycleBin) {
      return (
        <>
          {taskRow(
            getArt('Desktop16', getArt('Desktop', desktopIconSvg)),
            'Desktop',
            () => navigateTo(SPECIAL_FOLDERS.DESKTOP),
          )}
          {taskRow(getArt('MyDocuments16', documentIcon), 'My Documents', () =>
            navigateTo(SPECIAL_FOLDERS.MY_DOCUMENTS),
          )}
          {taskRow(computerIcon, 'My Computer', () => navigateTo(MY_COMPUTER))}
          {taskRow(network, 'My Network Places')}
        </>
      );
    }
    if (!inFolder) {
      return (
        <>
          {taskRow(network, 'My Network Places')}
          {taskRow(documentIcon, 'My Documents', () =>
            navigateTo(SPECIAL_FOLDERS.MY_DOCUMENTS),
          )}
          {vfs.exists(shared) &&
            taskRow(documentIcon, 'Shared Documents', () => navigateTo(shared))}
          {taskRow(control, 'Control Panel', () => navigateTo('Control Panel'))}
        </>
      );
    }
    const myDocs = SPECIAL_FOLDERS.MY_DOCUMENTS;
    // My Documents' shell parent is the Desktop, not the profile folder —
    // the profile folder is never a place XP offers.
    const shellParent =
      normalizePath(currentPath) === normalizePath(myDocs)
        ? SPECIAL_FOLDERS.DESKTOP
        : getParentPath(currentPath);
    const parentPath = shellParent;
    const parentNode =
      parentPath && parentPath !== currentPath && vfs.exists(parentPath)
        ? vfs.getNode(parentPath)
        : null;
    // My Music/Pictures/Videos point at their shared counterpart instead of
    // the generic Shared Documents
    const sharedRoot = 'C:/Documents and Settings/All Users/Documents';
    const sharedSpecial = {
      music: [`${sharedRoot}/My Music`, 'Shared Music'],
      pictures: [`${sharedRoot}/My Pictures`, 'Shared Pictures'],
      videos: [`${sharedRoot}/My Videos`, 'Shared Video'],
    }[shellFolderKind];
    return (
      <>
        {parentNode
          ? taskRow(
              parentNode.icon || folderSmall,
              friendlyName(parentNode.path),
              () => navigateTo(parentNode.path),
              'parent',
            )
          : taskRow(
              computerIcon,
              MY_COMPUTER,
              () => navigateTo(MY_COMPUTER),
              'parent',
            )}
        {currentPath !== myDocs &&
          parentPath !== myDocs &&
          taskRow(
            documentIcon,
            'My Documents',
            () => navigateTo(myDocs),
            'mydocs',
          )}
        {sharedSpecial && vfs.exists(sharedSpecial[0])
          ? taskRow(
              vfs.getNode(sharedSpecial[0]).icon || documentIcon,
              sharedSpecial[1],
              () => navigateTo(sharedSpecial[0]),
              'shared',
            )
          : vfs.exists(shared) &&
            currentPath !== shared &&
            parentPath !== shared &&
            taskRow(
              getArt('SharedFolder', documentIcon),
              'Shared Documents',
              () => navigateTo(shared),
              'shared',
            )}
        {parentNode &&
          taskRow(
            computerIcon,
            MY_COMPUTER,
            () => navigateTo(MY_COMPUTER),
            'mycomputer',
          )}
        {taskRow(network, 'My Network Places', undefined, 'network')}
      </>
    );
  };

  const renderMyComputerItem = node => (
    <div
      key={node.path}
      data-path={node.path}
      className={`com__view-tile ${
        selectedPaths.includes(node.path) || dropTargetPath === node.path
          ? 'selected'
          : ''
      }`}
      onClick={e => onItemClick(e, node)}
      onDoubleClick={() => onItemDoubleClick(node)}
      onDragOver={e => onItemDragOver(e, node)}
      onDragLeave={e => onItemDragLeave(e, node)}
      onDrop={e => onItemDrop(e, node)}
    >
      <ItemIcon
        node={node}
        src={node.iconLarge || node.icon}
        className="com__view-tile__img"
      />
      <div className="com__view-tile__text">
        <div className="com__view-tile__name">{displayName(node, hideExt)}</div>
        <div className="com__view-tile__type">{getTypeLabel(node)}</div>
      </div>
    </div>
  );

  const renderMyComputerContent = () => {
    if (!myComputerData) return null;
    const groups = [
      {
        label: 'Files Stored on This Computer',
        items: myComputerData.userFolders,
      },
      { label: 'Hard Disk Drives', items: myComputerData.hardDrives },
      {
        label: 'Devices with Removable Storage',
        items: myComputerData.removable,
      },
    ];
    return groups.map(group => {
      if (group.items.length === 0) return null;
      return (
        <div key={group.label} className="com__content__right__card">
          <div className="com__content__right__card__header">{group.label}</div>
          <div className="com__content__right__card__content">
            {group.items.map(renderMyComputerItem)}
          </div>
        </div>
      );
    });
  };

  // The centered, narrow views wrap the edit box; the row views widen it
  const wrapsRename = ['icons', 'thumbnails', 'tiles'].includes(viewMode);

  const renderName = node =>
    renamingPath === node.path ? (
      <RenameInput
        defaultValue={displayName(node, hideExt)}
        selectBase={node.type === 'file' && !hiddenExtension(node, hideExt)}
        onFinish={newName => handleRename(node.path, newName)}
        multiline={wrapsRename}
      />
    ) : (
      <span className="com__item-name">{displayName(node, hideExt)}</span>
    );

  const activeDetailColumns = inRecycleBin
    ? RECYCLE_COLUMNS
    : archive
    ? ARCHIVE_COLUMNS
    : DETAIL_COLUMNS;

  /** One details cell's text, shared by both column sets. */
  const detailCellValue = (id, node) => {
    switch (id) {
      case 'size':
        return node.type === 'file' ? formatSize(node.size) : '';
      case 'type':
        return getTypeLabel(node);
      case 'modified':
        return node.type !== 'drive' ? fmtDate(node.modifiedAt) : '';
      case 'location':
        return node.originalPath
          ? displayPath(getParentPath(node.originalPath))
          : '';
      case 'deleted':
        return fmtDate(node.deletedAt);
      case 'packed':
        return node.type === 'file' ? formatSize(node.packedSize || 0) : '';
      case 'password':
        // ZIPFLDR #10079-#10081: the column that shows a password took hold
        return node.type === 'file' ? (node.encrypted ? 'Yes' : 'No') : '';
      case 'ratio': {
        if (node.type !== 'file' || !node.size) return '';
        return `${Math.round((1 - (node.packedSize || 0) / node.size) * 100)}%`;
      }
      default:
        return '';
    }
  };

  const itemHandlers = node => ({
    // nothing drags out of the Recycle Bin
    ...(inRecycleBin ? { draggable: false } : null),
    onClick: e => onItemClick(e, node),
    onDoubleClick: () => onItemDoubleClick(node),
    onContextMenu: e => onItemContextMenu(e, node),
    // A draggable ancestor swallows mouse drags, which would stop the edit
    // box from sweeping a text selection
    draggable: renamingPath !== node.path,
    onDragStart: e => onItemDragStart(e, node),
    onDragOver: e => onItemDragOver(e, node),
    onDragLeave: e => onItemDragLeave(e, node),
    onDrop: e => onItemDrop(e, node),
    'data-path': node.path,
  });

  const itemClass = node =>
    `${
      selectedPaths.includes(node.path) || dropTargetPath === node.path
        ? ' selected'
        : ''
    }${isCut(node.path) ? ' cut' : ''}${
      renamingPath === node.path ? ' renaming' : ''
    }`;

  const renderTilesView = () => (
    <div
      className="com__view com__view--tiles"
      onContextMenu={onEmptyContextMenu}
    >
      {items.map(node => (
        <div
          key={node.path}
          className={`com__view-tile${itemClass(node)}`}
          {...itemHandlers(node)}
        >
          <ItemIcon
            node={node}
            src={node.iconLarge || node.icon}
            className="com__view-tile__img"
          />
          <div className="com__view-tile__text">
            <div className="com__view-tile__name">{renderName(node)}</div>
            <div className="com__view-tile__type">{getTypeLabel(node)}</div>
            {node.type === 'file' && node.size != null && (
              <div className="com__view-tile__type">
                {formatSize(node.size)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderIconsView = () => (
    <div
      className="com__view com__view--icons"
      onContextMenu={onEmptyContextMenu}
    >
      {items.map(node => (
        <div
          key={node.path}
          className={`com__view-icon${itemClass(node)}`}
          {...itemHandlers(node)}
        >
          <ItemIcon
            node={node}
            src={node.iconLarge || node.icon}
            className="com__view-icon__img"
          />
          <div className="com__view-icon__name">{renderName(node)}</div>
        </div>
      ))}
    </div>
  );

  const renderThumbnailsView = () => (
    <div
      className="com__view com__view--thumbs"
      onContextMenu={onEmptyContextMenu}
    >
      {items.map(node => (
        <div
          key={node.path}
          className={`com__view-thumb${itemClass(node)}`}
          {...itemHandlers(node)}
        >
          <div className="com__view-thumb__box">
            <ItemIcon node={node} src={node.iconLarge || node.icon} />
          </div>
          <div className="com__view-thumb__name">{renderName(node)}</div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div
      className="com__view com__view--list"
      onContextMenu={onEmptyContextMenu}
    >
      {items.map(node => (
        <div
          key={node.path}
          className={`com__view-listitem${itemClass(node)}`}
          {...itemHandlers(node)}
        >
          <ItemIcon
            node={node}
            src={node.icon}
            className="com__view-listitem__img"
          />
          {renderName(node)}
        </div>
      ))}
    </div>
  );

  const headerSort = key => {
    if (sortBy === key) setSortAsc(a => !a);
    else {
      setSortBy(key);
      setSortAsc(true);
    }
  };

  const renderDetailsView = () => (
    <div
      className="com__view com__view--details"
      onContextMenu={onEmptyContextMenu}
      ref={detailsRef}
    >
      <table
        className="com__table"
        style={{ width: sumWidths(activeDetailColumns, detailCols.widths) }}
      >
        <colgroup>
          {activeDetailColumns.map(col => (
            <col key={col.id} style={{ width: detailCols.widths[col.id] }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {activeDetailColumns.map(col => (
              <th
                key={col.id}
                className={`com__th${col.num ? ' com__th--size' : ''}`}
                onClick={() => headerSort(col.sort)}
              >
                {col.label} {sortBy === col.sort ? (sortAsc ? '▲' : '▼') : ''}
                <ColumnDivider
                  columnId={col.id}
                  onResize={detailCols.beginResize}
                  onAutoSize={id => detailCols.autoSize(id, detailsRef.current)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(node => (
            <tr
              key={node.path}
              className={`com__tr${itemClass(node)}`}
              {...itemHandlers(node)}
            >
              {activeDetailColumns.map(col =>
                col.id === 'name' ? (
                  <td
                    key="name"
                    className="com__td com__td--name"
                    data-col="name"
                  >
                    <ItemIcon node={node} src={node.icon} />
                    {renderName(node)}
                  </td>
                ) : (
                  <td
                    key={col.id}
                    className={`com__td${col.num ? ' com__td--size' : ''}`}
                    data-col={col.id}
                  >
                    {detailCellValue(col.id, node)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderFolderContent = () => {
    if (items.length === 0) {
      return (
        <div
          className="com__content__empty com__view"
          onContextMenu={onEmptyContextMenu}
        />
      );
    }
    switch (viewMode) {
      case 'thumbnails':
        return renderThumbnailsView();
      case 'icons':
        return renderIconsView();
      case 'list':
        return renderListView();
      case 'details':
        return renderDetailsView();
      default:
        return renderTilesView();
    }
  };

  // Views toolbar button dropdown
  const onViewsButton = e => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      x: rect.left,
      y: rect.bottom,
      items: viewSubmenu(),
      target: null,
      selection: [],
    });
  };

  return (
    <Div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        setSelectedPaths([]);
        setAddressDropdownOpen(false);
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

      <section className="com__function_bar">
        <div
          className={`com__function_bar__button${
            historyIndex > 0 ? '' : '--disable'
          }`}
          onClick={goBack}
        >
          <img className="com__function_bar__icon" src={back} alt="Back" />
          <span className="com__function_bar__text">Back</span>
          <div
            className="com__function_bar__arrow"
            onClick={e => historyIndex > 0 && openHistoryMenu(e, 'back')}
          />
        </div>

        <div
          className={`com__function_bar__button${
            historyIndex < history.length - 1 ? '' : '--disable'
          }`}
          onClick={goForward}
        >
          <img
            className="com__function_bar__icon"
            src={forward}
            alt="Forward"
          />
          <div
            className="com__function_bar__arrow"
            onClick={e =>
              historyIndex < history.length - 1 && openHistoryMenu(e, 'forward')
            }
          />
        </div>

        <div
          className={`com__function_bar__button${!inFolder ? '--disable' : ''}`}
          onClick={goUp}
        >
          <img
            className="com__function_bar__icon--normalize"
            src={up}
            alt="Up"
          />
        </div>

        <div className="com__function_bar__separate" />

        <div className="com__function_bar__button">
          <img
            className="com__function_bar__icon--normalize "
            src={search}
            alt="Search"
          />
          <span className="com__function_bar__text">Search</span>
        </div>
        <div
          className={`com__function_bar__button${
            foldersPaneOpen ? ' com__function_bar__button--active' : ''
          }`}
          onClick={() => setFoldersPaneOpen(o => !o)}
        >
          <img
            className="com__function_bar__icon--normalize"
            src={folderOpen}
            alt="Folders"
          />
          <span className="com__function_bar__text">Folders</span>
        </div>
        <div className="com__function_bar__separate" />
        <div
          className={`com__function_bar__button${
            inControlPanel ? '--disable' : ''
          }`}
          onClick={inControlPanel ? undefined : onViewsButton}
        >
          <img
            className="com__function_bar__icon--margin12"
            src={menu}
            alt="Views"
          />
          <div className="com__function_bar__arrow" />
        </div>
      </section>

      <form className="com__address_bar" onSubmit={onAddressSubmit}>
        <div className="com__address_bar__title">Address</div>
        <div className="com__address_bar__content">
          <img
            src={addressIcon}
            alt="icon"
            className="com__address_bar__content__img"
          />
          <input
            className="com__address_bar__input"
            value={addressInput}
            onChange={e => setAddressInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onAddressSubmit(e);
            }}
            spellCheck={false}
          />
          <img
            src={dropdown}
            alt="dropdown"
            className="com__address_bar__content__dropdown"
            onClick={e => {
              e.stopPropagation();
              setAddressDropdownOpen(o => !o);
            }}
          />
          {addressDropdownOpen && (
            <div
              className="com__address_bar__dropdown-list"
              onClick={e => e.stopPropagation()}
            >
              {addressQuickLinks.map(link => (
                <div
                  key={link.path + link.label}
                  className="com__address_bar__dropdown-item"
                  style={
                    link.indentPx ? { paddingLeft: link.indentPx } : undefined
                  }
                  onClick={() => {
                    setAddressDropdownOpen(false);
                    if (link.shellPath) {
                      if (onShellOpen) onShellOpen(link.shellPath);
                    } else if (link.path) {
                      navigateTo(link.path);
                    }
                  }}
                >
                  <img src={link.icon} alt="" />
                  <span>{link.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="com__address_bar__go" onClick={onAddressSubmit}>
          <img className="com__address_bar__go__img" src={go} alt="Go" />
          <span className="com__address_bar__go__text">Go</span>
        </div>
      </form>

      <div className="com__content">
        {shellSpace && shellSpace.kind === 'control' ? (
          <div className="com__content__inner">
            {/* the Folders pane replaces Control Panel's own task pane,
                exactly as it replaces the task cards in a folder */}
            {foldersPaneOpen && (
              <FolderTree
                currentPath={currentPath}
                onNavigate={navigateTo}
                onShellOpen={onShellOpen}
                onClose={() => setFoldersPaneOpen(false)}
              />
            )}
            <ControlPanel
              embedded
              hideTaskPane={foldersPaneOpen}
              view={shellSpace.view}
              onShellOpen={onShellOpen}
              onNavigate={v =>
                navigateTo(
                  v === 'home' ? 'Control Panel' : 'Control Panel/' + v,
                )
              }
            />
          </div>
        ) : (
          <div className="com__content__inner">
            {foldersPaneOpen ? (
              <FolderTree
                currentPath={currentPath}
                onNavigate={navigateTo}
                onShellOpen={onShellOpen}
                onClose={() => setFoldersPaneOpen(false)}
              />
            ) : (
              <div className="com__content__left">
                {/* XP puts the shell folder's own card above File and Folder Tasks */}
                {inFolder && !contentsHidden && shellFolderTasks()}
                {contentsHidden
                  ? renderTaskCard(
                      'tasks',
                      'System Tasks',
                      <>
                        {taskRow(
                          folderSmall,
                          'Show the contents of this folder',
                          revealContents,
                        )}
                        {taskRow(remove, 'Add or remove programs')}
                        {taskRow(search, 'Search for files or folders')}
                      </>,
                    )
                  : !inFolder
                  ? renderTaskCard(
                      'tasks',
                      'System Tasks',
                      <>
                        {taskRow(
                          viewInfo,
                          'View system information',
                          onShellOpen
                            ? () => onShellOpen('C:/WINDOWS/system32/sysdm.cpl')
                            : undefined,
                        )}
                        {taskRow(remove, 'Add or remove programs')}
                        {taskRow(control, 'Change a setting', () =>
                          navigateTo('Control Panel'),
                        )}
                      </>,
                    )
                  : archive || inRecycleBin
                  ? // archives only extract; the bin's card carries its verbs
                    null
                  : renderTaskCard(
                      'tasks',
                      'File and Folder Tasks',
                      fileTaskRows(),
                    )}
                {renderTaskCard('places', 'Other Places', otherPlacesRows())}
                {renderTaskCard('details', 'Details', renderDetailsPanel())}
              </div>
            )}

            <div
              className="com__content__right"
              ref={contentAreaRef}
              onContextMenu={onEmptyContextMenu}
              onMouseDown={startRubberBand}
              onDragOver={onListDragOver}
              onDrop={onListDrop}
              // the desktop's mouse-drag hit-tests for this to drop files in
              data-drop-path={
                inFolder && !archive && !shellSpace ? currentPath : undefined
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
                renderMyComputerContent()
              ) : (
                renderFolderContent()
              )}
              {rubber && (
                <div
                  className="com__rubberband"
                  style={{
                    position: 'absolute',
                    left: rubber.left,
                    top: rubber.top,
                    width: Math.max(0, rubber.right - rubber.left),
                    height: Math.max(0, rubber.bottom - rubber.top),
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Control Panel carries its own layout; everything else gets the bar */}
      {statusBarVisible && shellSpace?.kind !== 'control' && (
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

/**
 * Inline rename editor. Like the shell's own edit box it always shows the
 * whole name: the icon-ish views wrap it downward, the row views widen it to
 * the right. It floats over the item so growing never shifts the layout.
 */
function RenameInput({ defaultValue, selectBase, onFinish, multiline }) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef(null);
  const sizerRef = useRef(null);
  const [width, setWidth] = useState(null);

  // Grow to fit whatever is typed
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (multiline) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    } else if (sizerRef.current) {
      setWidth(Math.min(Math.max(sizerRef.current.offsetWidth + 12, 60), 460));
    }
  }, [value, multiline]);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      // With a visible extension, select only the base name (like XP)
      const dot = selectBase ? defaultValue.lastIndexOf('.') : -1;
      if (dot > 0) {
        ref.current.setSelectionRange(0, dot);
      } else {
        ref.current.select();
      }
    }
  }, [defaultValue, selectBase]);

  const common = {
    ref,
    className: `com__rename-input${
      multiline ? ' com__rename-input--wrap' : ''
    }`,
    value,
    onChange: e => setValue(e.target.value),
    onKeyDown: e => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault(); // never insert a newline into a file name
        onFinish(value.trim());
      }
      if (e.key === 'Escape') onFinish(defaultValue); // cancel
    },
    onBlur: () => onFinish(value.trim()),
    onClick: e => e.stopPropagation(),
    // The row is draggable="false" while renaming, so the pointer is free to
    // sweep a text selection — just keep the events off the list handlers.
    onMouseDown: e => e.stopPropagation(),
    onDoubleClick: e => e.stopPropagation(),
    spellCheck: false,
  };

  return (
    <span className="com__rename-wrap">
      {!multiline && (
        <span ref={sizerRef} className="com__rename-sizer" aria-hidden="true">
          {value || ' '}
        </span>
      )}
      {multiline ? (
        <textarea {...common} rows={1} />
      ) : (
        <input
          {...common}
          style={width ? { width: `${width}px` } : undefined}
        />
      )}
    </span>
  );
}
