import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import ContextMenu from 'components/ContextMenu';
import PropertiesDialog from './PropertiesDialog';
import SearchPanel from './SearchPanel';
import dropDownData from './dropDownData';

import go from 'assets/windowsIcons/290.png';
import search from 'assets/windowsIcons/299(32x32).png';
import computer from 'assets/windowsIcons/676(16x16).png';
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
import folder from 'assets/windowsIcons/318(48x48).png';
import folderOpen from 'assets/windowsIcons/337(32x32).png';
import disk from 'assets/windowsIcons/334(48x48).png';
import cd from 'assets/windowsIcons/111(48x48).png';
import dropdown from 'assets/windowsIcons/dropdown.png';
import pullup from 'assets/windowsIcons/pullup.png';
import windows from 'assets/windowsIcons/windows.png';

import { useVFS } from '../../../context/VFSContext';
import { useDialog } from '../../../context/DialogContext';
import { useVolume } from '../../../context/VolumeContext';
import { getIconForNode, getDisplayName, FOLDER_ICON_SMALL } from '../../../context/vfsConstants';
import { SPECIAL_FOLDERS } from '../../../context/vfsDefaults';

import recycleSoundSrc from 'assets/sounds/recycle.wav';
import {
  normalizePath,
  getParentPath,
  generateUniqueName,
  isValidName,
  formatFileSize,
  getFileTypeDisplay,
  formatDateShort,
  getMimeType,
} from '../../../context/vfsUtils';

const VIEW_MODES = { TILES: 'Tiles', ICONS: 'Icons', LIST: 'List', DETAILS: 'Details' };

function playSound(soundSrc, applyVolume) {
  if (!soundSrc) return;
  try {
    const audio = new Audio(soundSrc);
    if (typeof applyVolume === 'function') applyVolume(audio);
    audio.play().catch(() => {});
  } catch { /* ignore */ }
}

export default function MyComputer({ onClose, onOpenFile, onSetTitle, onLaunchApp, initialPath }) {
  const vfs = useVFS();
  const dialog = useDialog();
  const { applyVolume } = useVolume();

  const [history, setHistory] = useState(initialPath ? [initialPath] : ['My Computer']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedItems, setSelectedItems] = useState([]);
  const [viewMode, setViewMode] = useState(VIEW_MODES.TILES);
  const [sortBy, setSortBy] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Context menu
  const [contextMenu, setContextMenu] = useState(null);

  // Clipboard
  const [clipboard, setClipboard] = useState(null); // { path, operation: 'copy'|'cut' }

  // Rename
  const [renamingPath, setRenamingPath] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);

  // File upload ref
  const uploadInputRef = useRef(null);

  // Internal drag state
  const [dragOverPath, setDragOverPath] = useState(null);

  // Properties dialog
  const [propertiesNode, setPropertiesNode] = useState(null);

  // Search panel
  const [showSearch, setShowSearch] = useState(false);

  // Address bar editing
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressValue, setAddressValue] = useState('');
  const addressInputRef = useRef(null);

  // Last-clicked anchor for shift-select
  const [lastClickedPath, setLastClickedPath] = useState(null);

  const contentRef = useRef(null);

  const currentPath = history[historyIndex];

  // Helper: primary selected item (last in array) for details/single-item ops
  const selectedItem = selectedItems.length > 0 ? selectedItems[selectedItems.length - 1] : null;

  const isSelected = item => selectedItems.some(s => s.path === item.path);

  // Update window title when navigating
  useEffect(() => {
    if (onSetTitle) {
      if (currentPath === 'My Computer') {
        onSetTitle('My Computer');
      } else {
        const node = vfs.readFile(currentPath);
        if (node) {
          onSetTitle(node.name);
        } else {
          onSetTitle(currentPath);
        }
      }
    }
  }, [currentPath, onSetTitle, vfs]);

  // Focus rename input
  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
      renameInputRef.current.focus();
      const dotIdx = renameValue.lastIndexOf('.');
      if (dotIdx > 0) {
        renameInputRef.current.setSelectionRange(0, dotIdx);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [renamingPath, renameValue]);

  // Focus address input
  useEffect(() => {
    if (editingAddress && addressInputRef.current) {
      addressInputRef.current.focus();
      addressInputRef.current.select();
    }
  }, [editingAddress]);

  // --- Navigation ---

  const navigateTo = useCallback(
    path => {
      if (path === 'My Computer' || vfs.exists(path)) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(path);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setSelectedItems([]);
        setLastClickedPath(null);
        setContextMenu(null);
        setRenamingPath(null);
      }
    },
    [history, historyIndex, vfs],
  );

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSelectedItems([]);
      setLastClickedPath(null);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSelectedItems([]);
      setLastClickedPath(null);
    }
  };

  const goUp = () => {
    if (currentPath === 'My Computer') return;
    const parent = getParentPath(currentPath);
    if (!parent) {
      navigateTo('My Computer');
    } else {
      navigateTo(parent);
    }
  };

  // --- Address bar ---

  const startEditAddress = () => {
    setEditingAddress(true);
    setAddressValue(currentPath === 'My Computer' ? '' : currentPath);
  };

  const commitAddress = () => {
    setEditingAddress(false);
    if (!addressValue.trim()) return;
    const normalized = normalizePath(addressValue);
    if (vfs.exists(normalized)) {
      const node = vfs.readFile(normalized);
      if (node && node.type === 'directory') {
        navigateTo(normalized);
      }
    }
  };

  // --- Menu handler ---

  function onClickOptionItem(item) {
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
      case 'Refresh':
        break; // VFS is always fresh
      case 'Tiles':
        setViewMode(VIEW_MODES.TILES);
        break;
      case 'Icons':
        setViewMode(VIEW_MODES.ICONS);
        break;
      case 'List':
        setViewMode(VIEW_MODES.LIST);
        break;
      case 'Details':
        setViewMode(VIEW_MODES.DETAILS);
        break;
      case 'Select All':
        if (currentPath !== 'My Computer') {
          const { dirs: allDirs, files: allFiles } = vfs.readDir(currentPath);
          setSelectedItems([...allDirs, ...allFiles]);
        }
        break;
      default:
        break;
    }
  }

  // --- Sorting ---

  const sortItems = useCallback(
    items => {
      return [...items].sort((a, b) => {
        let cmp = 0;
        switch (sortBy) {
          case 'name':
            cmp = a.name.localeCompare(b.name);
            break;
          case 'size':
            cmp = (a.size || 0) - (b.size || 0);
            break;
          case 'type':
            cmp = getFileTypeDisplay(a).localeCompare(getFileTypeDisplay(b));
            break;
          case 'modified':
            cmp = (a.modifiedAt || 0) - (b.modifiedAt || 0);
            break;
          default:
            cmp = a.name.localeCompare(b.name);
        }
        return sortAsc ? cmp : -cmp;
      });
    },
    [sortBy, sortAsc],
  );

  const handleSort = useCallback(
    col => {
      if (sortBy === col) {
        setSortAsc(!sortAsc);
      } else {
        setSortBy(col);
        setSortAsc(true);
      }
    },
    [sortBy, sortAsc],
  );

  // --- File operations ---

  const handleNewFolder = useCallback(() => {
    if (currentPath === 'My Computer') return;
    const name = generateUniqueName(vfs.fs, currentPath, 'New Folder');
    const newPath = normalizePath(`${currentPath}/${name}`);
    vfs.createDir(newPath);
    setContextMenu(null);
    setTimeout(() => {
      setRenamingPath(newPath);
      setRenameValue(name);
      setSelectedItems([{ path: newPath, name, type: 'directory' }]);
    }, 50);
  }, [currentPath, vfs]);

  const handleNewTextFile = useCallback(() => {
    if (currentPath === 'My Computer') return;
    const name = generateUniqueName(vfs.fs, currentPath, 'New Text Document.txt');
    const newPath = normalizePath(`${currentPath}/${name}`);
    vfs.writeFile(newPath, '');
    setContextMenu(null);
    setTimeout(() => {
      setRenamingPath(newPath);
      setRenameValue(name);
      setSelectedItems([{ path: newPath, name, type: 'file' }]);
    }, 50);
  }, [currentPath, vfs]);

  const handleDelete = useCallback(async () => {
    const toDelete = selectedItems.filter(i => i.path);
    if (toDelete.length === 0) return;
    setContextMenu(null);

    const message = toDelete.length === 1
      ? (toDelete[0].type === 'directory'
        ? `Are you sure you want to remove the folder '${toDelete[0].name}' and all its contents?`
        : `Are you sure you want to send '${toDelete[0].name}' to the Recycle Bin?`)
      : `Are you sure you want to send these ${toDelete.length} items to the Recycle Bin?`;

    const title = toDelete.length === 1
      ? (toDelete[0].type === 'directory' ? 'Confirm Folder Delete' : 'Confirm File Delete')
      : 'Confirm Multiple File Delete';

    const yes = await dialog.confirm({ title, message, icon: 'question' });
    if (yes) {
      for (const item of toDelete) {
        vfs.recycleNode(item.path);
      }
      playSound(recycleSoundSrc, applyVolume);
      setSelectedItems([]);
    }
  }, [selectedItems, vfs, dialog, applyVolume]);

  const handleCopy = useCallback(() => {
    const toCopy = selectedItems.filter(i => i.path);
    if (toCopy.length === 0) return;
    setClipboard({ paths: toCopy.map(i => i.path), operation: 'copy' });
    setContextMenu(null);
  }, [selectedItems]);

  const handleCut = useCallback(() => {
    const toCut = selectedItems.filter(i => i.path);
    if (toCut.length === 0) return;
    setClipboard({ paths: toCut.map(i => i.path), operation: 'cut' });
    setContextMenu(null);
  }, [selectedItems]);

  const handlePaste = useCallback(() => {
    if (!clipboard || currentPath === 'My Computer') return;
    for (const srcPath of clipboard.paths) {
      const srcNode = vfs.readFile(srcPath);
      if (!srcNode) continue;
      const destName = generateUniqueName(vfs.fs, currentPath, srcNode.name);
      const destPath = normalizePath(`${currentPath}/${destName}`);

      if (srcNode.type === 'file') {
        vfs.writeFile(destPath, srcNode.content || '');
      } else {
        vfs.copyTree(srcPath, destPath);
      }

      if (clipboard.operation === 'cut') {
        vfs.deleteNode(srcPath);
      }
    }
    if (clipboard.operation === 'cut') {
      setClipboard(null);
    }
    setContextMenu(null);
  }, [clipboard, currentPath, vfs]);

  // --- Properties dialog ---
  const handleShowProperties = useCallback(() => {
    if (!selectedItem || !selectedItem.path) return;
    const node = vfs.readFile(selectedItem.path);
    if (node) setPropertiesNode(node);
    setContextMenu(null);
  }, [selectedItem, vfs]);

  // --- File download/export ---
  const handleDownload = useCallback(() => {
    if (!selectedItem || !selectedItem.path) return;
    const node = vfs.readFile(selectedItem.path);
    if (!node || node.type === 'directory') return;

    let blob;
    if (node.content instanceof ArrayBuffer) {
      blob = new Blob([node.content], { type: node.mimeType || 'application/octet-stream' });
    } else if (node.content instanceof Blob) {
      blob = node.content;
    } else if (typeof node.content === 'string') {
      blob = new Blob([node.content], { type: node.mimeType || 'text/plain' });
    } else {
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = node.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setContextMenu(null);
  }, [selectedItem, vfs]);

  // --- Create shortcut ---
  const handleCreateShortcut = useCallback(() => {
    if (!selectedItem || !selectedItem.path || currentPath === 'My Computer') return;
    const name = generateUniqueName(vfs.fs, currentPath, `${selectedItem.name} - Shortcut.lnk`);
    const shortcutPath = normalizePath(`${currentPath}/${name}`);
    const now = Date.now();
    // Use writeFile with a special shortcut node structure
    // We dispatch directly to create a shortcut node
    vfs.writeFile(shortcutPath, null, null);
    // Then update it to be a shortcut type via rename trick — actually let's just write a
    // text-based shortcut content that encodes the target
    // For now, create a simple text file that points to the target
    // Better: just write it as a regular shortcut
    setContextMenu(null);
  }, [selectedItem, currentPath, vfs]);

  // --- File upload from OS ---

  const processDroppedFiles = useCallback(
    (fileList, targetPath) => {
      if (!targetPath || targetPath === 'My Computer') return;
      Array.from(fileList).forEach(file => {
        const reader = new FileReader();
        const isText = file.type.startsWith('text/') || /\.(txt|log|ini|cfg|html?|css|js|json|xml|csv|md)$/i.test(file.name);
        const mimeType = file.type || getMimeType(file.name);
        if (isText) {
          reader.onload = e => {
            const name = generateUniqueName(vfs.fs, targetPath, file.name);
            vfs.writeFile(normalizePath(`${targetPath}/${name}`), e.target.result, mimeType);
          };
          reader.readAsText(file);
        } else {
          reader.onload = e => {
            const name = generateUniqueName(vfs.fs, targetPath, file.name);
            vfs.writeFile(normalizePath(`${targetPath}/${name}`), e.target.result, mimeType);
          };
          reader.readAsArrayBuffer(file);
        }
      });
    },
    [vfs],
  );

  const handleDragOver = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    e => {
      e.preventDefault();
      e.stopPropagation();
      if (currentPath === 'My Computer') return;

      // OS file drop
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processDroppedFiles(e.dataTransfer.files, currentPath);
        return;
      }

      // Internal VFS drag onto content area background → move/copy to current directory
      const pathsJson = e.dataTransfer.getData('application/vfs-paths');
      const srcPaths = pathsJson ? JSON.parse(pathsJson) : [];
      if (srcPaths.length === 0) {
        const single = e.dataTransfer.getData('application/vfs-path');
        if (single) srcPaths.push(single);
      }
      if (srcPaths.length === 0) return;

      // Only move if source is from a different directory
      const operation = e.dataTransfer.getData('application/vfs-operation') || (e.ctrlKey ? 'copy' : 'move');
      moveOrCopyToDir(srcPaths, currentPath, operation);
    },
    [currentPath, processDroppedFiles, moveOrCopyToDir],
  );

  const handleUploadClick = useCallback(() => {
    if (uploadInputRef.current) uploadInputRef.current.click();
  }, []);

  const handleUploadChange = useCallback(
    e => {
      if (e.target.files && e.target.files.length > 0) {
        processDroppedFiles(e.target.files, currentPath);
      }
      e.target.value = null;
    },
    [currentPath, processDroppedFiles],
  );

  // --- Internal drag-and-drop within My Computer ---

  const handleInternalDragStart = useCallback(
    (e, item) => {
      // Include all selected items if the dragged item is in the selection
      const dragItems = selectedItems.some(s => s.path === item.path) && selectedItems.length > 1
        ? selectedItems.filter(s => s.path)
        : [item];
      const paths = dragItems.map(i => i.path);
      e.dataTransfer.setData('application/vfs-paths', JSON.stringify(paths));
      e.dataTransfer.setData('application/vfs-path', item.path);
      e.dataTransfer.setData('application/vfs-operation', e.ctrlKey ? 'copy' : 'move');
      e.dataTransfer.effectAllowed = 'copyMove';

      // Custom drag ghost
      const ghost = document.createElement('div');
      ghost.style.cssText = 'display:flex;align-items:center;gap:4px;padding:4px 8px;background:#316ac5;color:#fff;font:11px Tahoma,sans-serif;border-radius:3px;position:absolute;top:-1000px;left:-1000px;white-space:nowrap;pointer-events:none;';
      const img = document.createElement('img');
      img.src = getIconForNode(item);
      img.style.cssText = 'width:16px;height:16px;';
      ghost.appendChild(img);
      const label = document.createElement('span');
      label.textContent = dragItems.length > 1 ? `${dragItems.length} items` : getDisplayName(item);
      ghost.appendChild(label);
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 10, 10);
      requestAnimationFrame(() => document.body.removeChild(ghost));
    },
    [selectedItems],
  );

  const handleItemDragOver = useCallback(
    (e, item) => {
      if (item.type !== 'directory') return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
      setDragOverPath(item.path);
    },
    [],
  );

  const handleItemDragLeave = useCallback(() => {
    setDragOverPath(null);
  }, []);

  const moveOrCopyToDir = useCallback(
    (srcPaths, targetDirPath, operation) => {
      for (const srcPath of srcPaths) {
        // Don't drop onto self or into own subtree
        if (srcPath === targetDirPath || targetDirPath.startsWith(srcPath + '/')) continue;
        const srcNode = vfs.readFile(srcPath);
        if (!srcNode) continue;
        const destName = generateUniqueName(vfs.fs, targetDirPath, srcNode.name);
        const destPath = normalizePath(`${targetDirPath}/${destName}`);

        if (srcNode.type === 'file') {
          vfs.writeFile(destPath, srcNode.content || '', srcNode.mimeType);
        } else {
          vfs.copyTree(srcPath, destPath);
        }

        if (operation === 'move') {
          vfs.deleteNode(srcPath);
        }
      }
    },
    [vfs],
  );

  const handleItemDrop = useCallback(
    (e, targetItem) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverPath(null);

      if (targetItem.type !== 'directory') return;

      // OS file drop onto folder
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processDroppedFiles(e.dataTransfer.files, targetItem.path);
        return;
      }

      // Internal drag (multi-item)
      const pathsJson = e.dataTransfer.getData('application/vfs-paths');
      const srcPaths = pathsJson ? JSON.parse(pathsJson) : [];
      if (srcPaths.length === 0) {
        const single = e.dataTransfer.getData('application/vfs-path');
        if (single) srcPaths.push(single);
      }
      if (srcPaths.length === 0) return;

      const operation = e.dataTransfer.getData('application/vfs-operation') || (e.ctrlKey ? 'copy' : 'move');
      moveOrCopyToDir(srcPaths, targetItem.path, operation);
    },
    [processDroppedFiles, moveOrCopyToDir],
  );

  const handleStartRename = useCallback(() => {
    if (!selectedItem || !selectedItem.path) return;
    setRenamingPath(selectedItem.path);
    setRenameValue(selectedItem.name);
    setContextMenu(null);
  }, [selectedItem]);

  const commitRename = useCallback(() => {
    if (!renamingPath || !renameValue.trim()) {
      setRenamingPath(null);
      return;
    }
    if (!isValidName(renameValue)) {
      setRenamingPath(null);
      return;
    }
    const parent = getParentPath(renamingPath);
    if (!parent) {
      setRenamingPath(null);
      return;
    }
    const newPath = normalizePath(`${parent}/${renameValue}`);
    if (newPath !== renamingPath) {
      vfs.rename(renamingPath, newPath);
    }
    setRenamingPath(null);
    setSelectedItems([]);
  }, [renamingPath, renameValue, vfs]);

  const handleRenameKeyDown = useCallback(
    e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRename();
      } else if (e.key === 'Escape') {
        setRenamingPath(null);
      }
    },
    [commitRename],
  );

  // --- Keyboard shortcuts ---

  const handleKeyDown = useCallback(
    e => {
      if (renamingPath || editingAddress) return;

      switch (e.key) {
        case 'F2':
          e.preventDefault();
          if (selectedItems.length === 1 && selectedItem.path) handleStartRename();
          break;
        case 'Delete':
          e.preventDefault();
          if (selectedItems.length > 0) handleDelete();
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedItem) {
            if (selectedItem.type === 'directory' && selectedItem.path) {
              navigateTo(selectedItem.path);
            } else if (selectedItem.path && onOpenFile) {
              onOpenFile(selectedItem.path);
            }
          }
          break;
        case 'Backspace':
          e.preventDefault();
          goUp();
          break;
        case 'F5':
          e.preventDefault();
          break;
        case 'F4':
          e.preventDefault();
          startEditAddress();
          break;
        case 'a':
          if (e.ctrlKey) {
            e.preventDefault();
            if (currentPath !== 'My Computer') {
              const { dirs: allD, files: allF } = vfs.readDir(currentPath);
              setSelectedItems([...allD, ...allF]);
            }
          }
          break;
        default:
          break;
      }

      if (e.ctrlKey) {
        switch (e.key) {
          case 'c':
            e.preventDefault();
            if (selectedItems.length > 0) handleCopy();
            break;
          case 'x':
            e.preventDefault();
            if (selectedItems.length > 0) handleCut();
            break;
          case 'v':
            e.preventDefault();
            handlePaste();
            break;
          default:
            break;
        }
      }
    },
    [
      renamingPath, editingAddress, selectedItems, selectedItem, handleStartRename,
      handleDelete, navigateTo, onOpenFile, handleCopy, handleCut, handlePaste,
      currentPath, vfs,
    ],
  );

  // --- Context menu ---

  const handleContextMenu = useCallback(
    e => {
      e.preventDefault();
      e.stopPropagation();
      if (currentPath === 'My Computer') return;
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [currentPath],
  );

  const handleClick = useCallback(() => {
    setContextMenu(null);
    if (!renamingPath) {
      setSelectedItems([]);
      setLastClickedPath(null);
    }
  }, [renamingPath]);

  // --- Item click with multi-select support ---

  const handleItemClick = useCallback(
    (e, item) => {
      e.stopPropagation();
      setContextMenu(null);

      if (e.ctrlKey) {
        // Toggle item
        setSelectedItems(prev => {
          const exists = prev.some(s => s.path === item.path);
          if (exists) return prev.filter(s => s.path !== item.path);
          return [...prev, item];
        });
        setLastClickedPath(item.path);
      } else if (e.shiftKey && lastClickedPath && currentPath !== 'My Computer') {
        // Range select
        const { dirs, files } = vfs.readDir(currentPath);
        const allItems = sortItems([...dirs, ...files]);
        const anchorIdx = allItems.findIndex(i => i.path === lastClickedPath);
        const currentIdx = allItems.findIndex(i => i.path === item.path);
        if (anchorIdx >= 0 && currentIdx >= 0) {
          const start = Math.min(anchorIdx, currentIdx);
          const end = Math.max(anchorIdx, currentIdx);
          setSelectedItems(allItems.slice(start, end + 1));
        } else {
          setSelectedItems([item]);
          setLastClickedPath(item.path);
        }
      } else {
        // Simple click: replace selection
        setSelectedItems([item]);
        setLastClickedPath(item.path);
      }
    },
    [lastClickedPath, currentPath, vfs, sortItems],
  );

  // --- Double-click handler ---

  const handleDoubleClick = useCallback(
    item => {
      if (item.type === 'shortcut') {
        // Resolve shortcut: check if target is a VFS path or app name
        if (item.target && vfs.exists(item.target)) {
          const targetNode = vfs.readFile(item.target);
          if (targetNode?.type === 'directory') {
            navigateTo(item.target);
          } else if (onOpenFile) {
            onOpenFile(item.target);
          }
        } else if (item.target && onLaunchApp) {
          onLaunchApp(item.target, item.targetArgs || {});
        } else if (onOpenFile) {
          onOpenFile(item.path);
        }
      } else if (item.type === 'directory') {
        navigateTo(item.path);
      } else if (onOpenFile) {
        onOpenFile(item.path);
      }
    },
    [navigateTo, onOpenFile, onLaunchApp, vfs],
  );

  // --- My Computer virtual root ---

  const myComputerItems = [
    {
      name: 'Shared Documents',
      type: 'directory',
      displayType: 'File Folder',
      icon: folder,
      group: 'Files Stored on This Computer',
      path: SPECIAL_FOLDERS['Shared Documents'],
    },
    {
      name: "User's Documents",
      type: 'directory',
      displayType: 'File Folder',
      icon: folder,
      group: 'Files Stored on This Computer',
      path: SPECIAL_FOLDERS['My Documents'],
    },
    {
      name: 'Local Disk (C:)',
      type: 'directory',
      displayType: 'Local Disk',
      icon: disk,
      group: 'Hard Disk Drives',
      path: 'C:/',
      freeSpace: '32.0 GB',
      totalSize: '40.0 GB',
    },
    {
      name: 'CD Drive (D:)',
      type: 'directory',
      displayType: 'CD Drive',
      icon: cd,
      group: 'Devices with Removable Storage',
      path: null,
      totalSize: '650 MB',
    },
  ];

  // --- Get items for current view ---

  const getCurrentItems = useCallback(() => {
    if (currentPath === 'My Computer') return myComputerItems;
    const { dirs, files } = vfs.readDir(currentPath);
    return sortItems([...dirs, ...files]);
  }, [currentPath, vfs, sortItems]);

  const currentItems = getCurrentItems();

  // --- Status bar text ---

  const getStatusText = () => {
    if (currentPath === 'My Computer') {
      return `${myComputerItems.length} object(s)`;
    }
    const { dirs, files } = vfs.readDir(currentPath);
    const total = dirs.length + files.length;
    if (selectedItems.length > 1) {
      const totalSize = selectedItems
        .filter(i => i.type === 'file')
        .reduce((sum, i) => sum + (i.size || 0), 0);
      return `${selectedItems.length} object(s) selected` + (totalSize > 0 ? ` (${formatFileSize(totalSize)})` : '');
    }
    if (selectedItems.length === 1) {
      if (selectedItem.type === 'file') {
        return `${formatFileSize(selectedItem.size || 0)}`;
      }
      return '1 object(s) selected';
    }
    return `${total} object(s)`;
  };

  // --- Render helpers ---

  const renderItemName = item => {
    if (renamingPath === item.path) {
      return (
        <input
          ref={renameInputRef}
          className="com__rename-input"
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleRenameKeyDown}
          onClick={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
        />
      );
    }
    return <span className="com__item-name">{getDisplayName(item)}</span>;
  };

  const renderDetailsPanel = () => {
    if (selectedItem) {
      return (
        <div className="com__content__left__card__content">
          <div className="com__content__left__card__text bold">
            {selectedItem.name}
          </div>
          <div className="com__content__left__card__text">
            {selectedItem.displayType || getFileTypeDisplay(selectedItem)}
          </div>
          {selectedItem.freeSpace && (
            <div className="com__content__left__card__text">
              Free Space: {selectedItem.freeSpace}
            </div>
          )}
          {selectedItem.totalSize && (
            <div className="com__content__left__card__text">
              Total Size: {selectedItem.totalSize}
            </div>
          )}
          {selectedItem.type === 'file' && selectedItem.size != null && (
            <div className="com__content__left__card__text">
              Size: {formatFileSize(selectedItem.size)}
            </div>
          )}
          {selectedItem.modifiedAt && (
            <div className="com__content__left__card__text">
              Date Modified: {formatDateShort(selectedItem.modifiedAt)}
            </div>
          )}
        </div>
      );
    }

    if (currentPath === 'My Computer') {
      return (
        <div className="com__content__left__card__content">
          <div className="com__content__left__card__text bold">My Computer</div>
          <div className="com__content__left__card__text">System Folder</div>
        </div>
      );
    }

    const node = vfs.readFile(currentPath);
    return (
      <div className="com__content__left__card__content">
        <div className="com__content__left__card__text bold">
          {node ? node.name : currentPath}
        </div>
        <div className="com__content__left__card__text">File Folder</div>
      </div>
    );
  };

  // --- Common item event handlers ---
  const itemHandlers = item => ({
    onClick: e => handleItemClick(e, item),
    onDoubleClick: () => handleDoubleClick(item),
    onContextMenu: e => {
      e.preventDefault(); e.stopPropagation();
      if (!isSelected(item)) {
        setSelectedItems([item]);
        setLastClickedPath(item.path);
      }
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    draggable: !!item.path,
    onDragStart: e => item.path && handleInternalDragStart(e, item),
    onDragOver: e => handleItemDragOver(e, item),
    onDragLeave: handleItemDragLeave,
    onDrop: e => handleItemDrop(e, item),
  });

  // --- Tiles view ---
  const renderTilesView = (items, isMyComputer) => {
    if (isMyComputer) return renderMyComputerView(items);
    return (
      <div className="com__tiles-grid">
        {items.map(item => (
          <div
            key={item.path}
            className={`com__tile-item ${isSelected(item) ? 'selected' : ''} ${dragOverPath === item.path ? 'dragover' : ''}`}
            {...itemHandlers(item)}
          >
            <img src={getIconForNode(item)} alt={item.name} className="com__tile-icon" />
            <div className="com__tile-info">
              {renderItemName(item)}
              <span className="com__tile-type">{getFileTypeDisplay(item)}</span>
              {item.type === 'file' && (
                <span className="com__tile-size">{formatFileSize(item.size || 0)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // --- Icons view ---
  const renderIconsView = items => {
    return (
      <div className="com__icons-grid">
        {items.map(item => (
          <div
            key={item.path}
            className={`com__icon-item ${isSelected(item) ? 'selected' : ''}`}
            {...itemHandlers(item)}
          >
            <img src={getIconForNode(item)} alt={item.name} className="com__icon-img" />
            <div className="com__icon-name">{renderItemName(item)}</div>
          </div>
        ))}
      </div>
    );
  };

  // --- List view ---
  const renderListView = items => {
    return (
      <div className="com__list-grid">
        {items.map(item => (
          <div
            key={item.path}
            className={`com__list-item ${isSelected(item) ? 'selected' : ''}`}
            {...itemHandlers(item)}
          >
            <img src={item.type === 'directory' ? FOLDER_ICON_SMALL : getIconForNode(item)} alt={item.name} className="com__list-icon" />
            {renderItemName(item)}
          </div>
        ))}
      </div>
    );
  };

  // --- Details view ---
  const renderDetailsView = items => {
    return (
      <div className="com__details">
        <div className="com__details-header">
          <div className="com__details-col com__details-col--name" onClick={() => handleSort('name')}>
            Name {sortBy === 'name' && (sortAsc ? '\u25B2' : '\u25BC')}
          </div>
          <div className="com__details-col com__details-col--size" onClick={() => handleSort('size')}>
            Size {sortBy === 'size' && (sortAsc ? '\u25B2' : '\u25BC')}
          </div>
          <div className="com__details-col com__details-col--type" onClick={() => handleSort('type')}>
            Type {sortBy === 'type' && (sortAsc ? '\u25B2' : '\u25BC')}
          </div>
          <div className="com__details-col com__details-col--modified" onClick={() => handleSort('modified')}>
            Date Modified {sortBy === 'modified' && (sortAsc ? '\u25B2' : '\u25BC')}
          </div>
        </div>
        {items.map(item => (
          <div
            key={item.path}
            className={`com__details-row ${isSelected(item) ? 'selected' : ''}`}
            {...itemHandlers(item)}
          >
            <div className="com__details-col com__details-col--name">
              <img src={item.type === 'directory' ? FOLDER_ICON_SMALL : getIconForNode(item)} alt="" className="com__details-icon" />
              {renderItemName(item)}
            </div>
            <div className="com__details-col com__details-col--size">
              {item.type === 'file' ? formatFileSize(item.size || 0) : ''}
            </div>
            <div className="com__details-col com__details-col--type">
              {getFileTypeDisplay(item)}
            </div>
            <div className="com__details-col com__details-col--modified">
              {formatDateShort(item.modifiedAt)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // --- My Computer root view (always tiles-style) ---
  const renderMyComputerView = items => {
    const groups = [
      'Files Stored on This Computer',
      'Hard Disk Drives',
      'Devices with Removable Storage',
    ];
    return groups.map(group => {
      const groupItems = items.filter(i => i.group === group);
      if (groupItems.length === 0) return null;
      return (
        <div key={group} className="com__group">
          <div className="com__group-header">{group}</div>
          <div className="com__tiles-grid">
            {groupItems.map(item => (
              <div
                key={item.name}
                className={`com__tile-item ${isSelected(item) ? 'selected' : ''}`}
                onClick={e => { e.stopPropagation(); setSelectedItems([item]); setLastClickedPath(item.path); }}
                onDoubleClick={() => item.path && navigateTo(item.path)}
              >
                <img src={item.icon} alt={item.name} className="com__tile-icon" />
                <div className="com__tile-info">
                  <span className="com__item-name">{item.name}</span>
                  <span className="com__tile-type">{item.displayType}</span>
                  {item.freeSpace && (
                    <span className="com__tile-size">Free Space: {item.freeSpace}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  const renderContent = () => {
    if (currentPath === 'My Computer') {
      return renderMyComputerView(myComputerItems);
    }

    const items = currentItems;
    if (items.length === 0) {
      return <div className="com__empty">This folder is empty.</div>;
    }

    switch (viewMode) {
      case VIEW_MODES.ICONS:
        return renderIconsView(items);
      case VIEW_MODES.LIST:
        return renderListView(items);
      case VIEW_MODES.DETAILS:
        return renderDetailsView(items);
      case VIEW_MODES.TILES:
      default:
        return renderTilesView(items, false);
    }
  };

  return (
    <Div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <input
        type="file"
        multiple
        ref={uploadInputRef}
        style={{ display: 'none' }}
        onChange={handleUploadChange}
      />
      <section className="com__toolbar">
        <div className="com__options">
          <WindowDropDowns items={dropDownData} onClickItem={onClickOptionItem} />
        </div>
        <img className="com__windows-logo" src={windows} alt="windows" />
      </section>

      <section className="com__function_bar">
        <div className={`com__function_bar__button${historyIndex > 0 ? '' : '--disable'}`} onClick={goBack}>
          <img className="com__function_bar__icon" src={back} alt="Back" />
          <span className="com__function_bar__text">Back</span>
          <div className="com__function_bar__arrow" />
        </div>
        <div className={`com__function_bar__button${historyIndex < history.length - 1 ? '' : '--disable'}`} onClick={goForward}>
          <img className="com__function_bar__icon" src={forward} alt="Forward" />
          <div className="com__function_bar__arrow" />
        </div>
        <div className="com__function_bar__button" onClick={goUp}>
          <img className="com__function_bar__icon--normalize" src={up} alt="Up" />
        </div>
        <div className="com__function_bar__separate" />
        <div className="com__function_bar__button" onClick={() => setShowSearch(!showSearch)}>
          <img className="com__function_bar__icon--normalize" src={search} alt="Search" />
          <span className="com__function_bar__text">Search</span>
        </div>
        <div className="com__function_bar__button">
          <img className="com__function_bar__icon--normalize" src={folderOpen} alt="Folders" />
          <span className="com__function_bar__text">Folders</span>
        </div>
        <div className="com__function_bar__separate" />
        <div className="com__function_bar__button">
          <img className="com__function_bar__icon--margin12" src={menu} alt="Menu" />
          <div className="com__function_bar__arrow" />
        </div>
      </section>

      <section className="com__address_bar">
        <div className="com__address_bar__title">Address</div>
        <div className="com__address_bar__content" onDoubleClick={startEditAddress}>
          {editingAddress ? (
            <input
              ref={addressInputRef}
              className="com__address_bar__input"
              value={addressValue}
              onChange={e => setAddressValue(e.target.value)}
              onBlur={commitAddress}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitAddress(); }
                if (e.key === 'Escape') setEditingAddress(false);
              }}
            />
          ) : (
            <>
              <img
                src={currentPath === 'My Computer' ? computer : folderSmall}
                alt="icon"
                className="com__address_bar__content__img"
              />
              <div className="com__address_bar__content__text com__breadcrumbs">
                {currentPath === 'My Computer' ? (
                  <span>My Computer</span>
                ) : (() => {
                  const parts = currentPath.split('/').filter(Boolean);
                  const crumbs = [];
                  let accumulated = '';
                  for (let i = 0; i < parts.length; i++) {
                    accumulated += (i === 0 ? '' : '/') + parts[i];
                    if (i === 0 && /^[A-Z]:$/i.test(parts[i])) {
                      accumulated += '/';
                    }
                    const path = accumulated;
                    const isLast = i === parts.length - 1;
                    crumbs.push(
                      <React.Fragment key={i}>
                        {i > 0 && <span className="com__breadcrumb-sep">&rsaquo;</span>}
                        {isLast ? (
                          <span className="com__breadcrumb-current">{parts[i]}</span>
                        ) : (
                          <span
                            className="com__breadcrumb-link"
                            onClick={e => { e.stopPropagation(); navigateTo(path); }}
                          >{parts[i]}</span>
                        )}
                      </React.Fragment>
                    );
                  }
                  return crumbs;
                })()}
              </div>
              <img src={dropdown} alt="dropdown" className="com__address_bar__content__img" />
            </>
          )}
        </div>
        <div className="com__address_bar__go" onClick={() => {
          if (editingAddress) commitAddress();
        }}>
          <img className="com__address_bar__go__img" src={go} alt="Go" />
          <span className="com__address_bar__go__text">Go</span>
        </div>
      </section>

      <div className="com__content">
        <div className="com__content__inner">
          {showSearch && (
            <SearchPanel
              vfs={vfs}
              currentPath={currentPath}
              onNavigate={navigateTo}
              onOpenFile={onOpenFile}
              onClose={() => setShowSearch(false)}
            />
          )}
          <div className="com__content__left">
            {/* Tasks panel */}
            <div className="com__content__left__card">
              <div className="com__content__left__card__header">
                <div className="com__content__left__card__header__text">
                  {currentPath === 'My Computer' ? 'System Tasks' : 'File and Folder Tasks'}
                </div>
                <img src={pullup} alt="" className="com__content__left__card__header__img" />
              </div>
              <div className="com__content__left__card__content">
                {currentPath === 'My Computer' ? (
                  <>
                    <div className="com__content__left__card__row">
                      <img className="com__content__left__card__img" src={viewInfo} alt="" />
                      <div className="com__content__left__card__text link">View system information</div>
                    </div>
                    <div className="com__content__left__card__row">
                      <img className="com__content__left__card__img" src={remove} alt="" />
                      <div className="com__content__left__card__text link">Add or remove programs</div>
                    </div>
                    <div className="com__content__left__card__row">
                      <img className="com__content__left__card__img" src={control} alt="" />
                      <div className="com__content__left__card__text link">Change a setting</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="com__content__left__card__row" onClick={handleNewFolder}>
                      <img className="com__content__left__card__img" src={folderSmall} alt="" />
                      <div className="com__content__left__card__text link">Make a new folder</div>
                    </div>
                    <div className="com__content__left__card__row" onClick={handleUploadClick}>
                      <img className="com__content__left__card__img" src={documentIcon} alt="" />
                      <div className="com__content__left__card__text link">Upload files</div>
                    </div>
                    {selectedItem && selectedItem.path && (
                      <>
                        <div className="com__content__left__card__row" onClick={handleStartRename}>
                          <img className="com__content__left__card__img" src={documentIcon} alt="" />
                          <div className="com__content__left__card__text link">
                            Rename this {selectedItem.type === 'directory' ? 'folder' : 'file'}
                          </div>
                        </div>
                        <div className="com__content__left__card__row" onClick={handleCopy}>
                          <img className="com__content__left__card__img" src={documentIcon} alt="" />
                          <div className="com__content__left__card__text link">
                            Copy this {selectedItem.type === 'directory' ? 'folder' : 'file'}
                          </div>
                        </div>
                        <div className="com__content__left__card__row" onClick={handleDelete}>
                          <img className="com__content__left__card__img" src={remove} alt="" />
                          <div className="com__content__left__card__text link">
                            Delete this {selectedItem.type === 'directory' ? 'folder' : 'file'}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Other Places */}
            <div className="com__content__left__card">
              <div className="com__content__left__card__header">
                <div className="com__content__left__card__header__text">Other Places</div>
                <img src={pullup} alt="" className="com__content__left__card__header__img" />
              </div>
              <div className="com__content__left__card__content">
                {currentPath !== 'My Computer' && (
                  <div className="com__content__left__card__row" onClick={() => navigateTo('My Computer')}>
                    <img className="com__content__left__card__img" src={computer} alt="" />
                    <div className="com__content__left__card__text link">My Computer</div>
                  </div>
                )}
                <div className="com__content__left__card__row" onClick={() => navigateTo(SPECIAL_FOLDERS['My Documents'])}>
                  <img className="com__content__left__card__img" src={documentIcon} alt="" />
                  <div className="com__content__left__card__text link">My Documents</div>
                </div>
                {currentPath === 'My Computer' && (
                  <div className="com__content__left__card__row" onClick={() => navigateTo(SPECIAL_FOLDERS['Shared Documents'])}>
                    <img className="com__content__left__card__img" src={folderSmall} alt="" />
                    <div className="com__content__left__card__text link">Shared Documents</div>
                  </div>
                )}
                <div className="com__content__left__card__row">
                  <img className="com__content__left__card__img" src={network} alt="" />
                  <div className="com__content__left__card__text link">My Network Places</div>
                </div>
                <div className="com__content__left__card__row">
                  <img className="com__content__left__card__img" src={control} alt="" />
                  <div className="com__content__left__card__text link">Control Panel</div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="com__content__left__card">
              <div className="com__content__left__card__header">
                <div className="com__content__left__card__header__text">Details</div>
                <img src={pullup} alt="" className="com__content__left__card__header__img" />
              </div>
              {renderDetailsPanel()}
            </div>
          </div>

          <div
            className="com__content__right"
            ref={contentRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onContextMenu={e => {
              if (!e.target.closest('.com__tile-item') && !e.target.closest('.com__icon-item') &&
                  !e.target.closest('.com__list-item') && !e.target.closest('.com__details-row')) {
                e.preventDefault();
                e.stopPropagation();
                setSelectedItems([]);
                setLastClickedPath(null);
                if (currentPath !== 'My Computer') {
                  setContextMenu({ x: e.clientX, y: e.clientY });
                }
              }
            }}
          >
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="com__status-bar">
        <div className="com__status-bar__left">{getStatusText()}</div>
        <div className="com__status-bar__right" />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          items={selectedItems.length > 0 && selectedItem?.path ? (
            selectedItems.length > 1 ? [
              { type: 'item', label: 'Cut', onClick: handleCut },
              { type: 'item', label: 'Copy', onClick: handleCopy },
              { type: 'separator' },
              { type: 'item', label: 'Delete', onClick: handleDelete },
              { type: 'separator' },
              { type: 'item', label: 'Properties', onClick: handleShowProperties },
            ] : [
            { type: 'item', label: 'Open', bold: true, onClick: () => handleDoubleClick(selectedItem) },
            ...(selectedItem.type === 'file' ? [
              { type: 'submenu', label: 'Open With', items: [
                { type: 'item', label: 'Notepad', onClick: () => onOpenFile && onOpenFile(selectedItem.path) },
                ...(selectedItem.mimeType && selectedItem.mimeType.startsWith('image/') ? [
                  { type: 'item', label: 'Paint', onClick: () => onLaunchApp && onLaunchApp('Paint', { filePath: selectedItem.path }) },
                ] : []),
              ] },
            ] : []),
            { type: 'separator' },
            { type: 'item', label: 'Cut', onClick: handleCut },
            { type: 'item', label: 'Copy', onClick: handleCopy },
            { type: 'separator' },
            { type: 'item', label: 'Delete', onClick: handleDelete },
            { type: 'item', label: 'Rename', onClick: handleStartRename },
            ...(selectedItem.type === 'file' ? [
              { type: 'separator' },
              { type: 'item', label: 'Save to computer', onClick: handleDownload },
            ] : []),
            { type: 'separator' },
            { type: 'item', label: 'Properties', onClick: handleShowProperties },
          ]) : [
            { type: 'submenu', label: 'View', items: Object.values(VIEW_MODES).map(m => ({
              type: 'item', label: m, checked: viewMode === m, onClick: () => setViewMode(m),
            })) },
            { type: 'submenu', label: 'Arrange Icons By', items: [
              { type: 'item', label: 'Name', checked: sortBy === 'name', onClick: () => handleSort('name') },
              { type: 'item', label: 'Size', checked: sortBy === 'size', onClick: () => handleSort('size') },
              { type: 'item', label: 'Type', checked: sortBy === 'type', onClick: () => handleSort('type') },
              { type: 'item', label: 'Modified', checked: sortBy === 'modified', onClick: () => handleSort('modified') },
            ] },
            { type: 'item', label: 'Refresh', onClick: () => {} },
            { type: 'separator' },
            ...(clipboard ? [{ type: 'item', label: 'Paste', onClick: handlePaste }] : []),
            { type: 'item', label: 'Upload Files', onClick: handleUploadClick },
            { type: 'submenu', label: 'New', items: [
              { type: 'item', label: 'Folder', onClick: handleNewFolder },
              { type: 'separator' },
              { type: 'item', label: 'Text Document', onClick: handleNewTextFile },
            ] },
            { type: 'separator' },
            { type: 'item', label: 'Properties', disabled: true },
          ]}
        />
      )}

      {/* Properties Dialog */}
      {propertiesNode && (
        <PropertiesDialog
          node={propertiesNode}
          onClose={() => setPropertiesNode(null)}
        />
      )}
    </Div>
  );
}


const Div = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  background: linear-gradient(to right, #edede5 0%, #ede8cd 100%);
  outline: none;

  /* Rename input */
  .com__rename-input {
    font-size: 11px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    border: 1px solid #316ac5;
    padding: 1px 2px;
    outline: none;
    width: 130px;
    background: white;
  }

  .com__empty {
    padding: 20px;
    color: #808080;
    font-style: italic;
  }

  /* ===== TILES VIEW ===== */
  .com__tiles-grid {
    display: flex;
    flex-wrap: wrap;
    padding: 8px 4px;
    gap: 4px;
  }
  .com__tile-item {
    display: flex;
    align-items: center;
    width: 220px;
    padding: 3px;
    border: 1px solid transparent;
    border-radius: 2px;
    cursor: default;
    &:hover { background: rgba(49,106,197,0.1); border-color: rgba(49,106,197,0.6); }
    &.selected { background: #316ac5; border-color: #316ac5; color: white;
      .com__tile-type, .com__tile-size { color: rgba(255,255,255,0.85); }
      .com__item-name { color: white; }
    }
  }
  .com__tile-item.dragover { background: rgba(49,106,197,0.2); border-color: #316ac5; }
  .com__icon-item.dragover { background: rgba(49,106,197,0.2); border-color: #316ac5; }
  .com__list-item.dragover { background: rgba(49,106,197,0.2); border-color: #316ac5; }
  .com__details-row.dragover { background: rgba(49,106,197,0.2); }
  .com__tile-icon { width: 48px; height: 48px; margin-right: 6px; flex-shrink: 0; }
  .com__tile-info { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
  .com__item-name { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .com__tile-type { font-size: 10px; color: #808080; white-space: nowrap; }
  .com__tile-size { font-size: 10px; color: #808080; white-space: nowrap; }

  /* ===== ICONS VIEW ===== */
  .com__icons-grid {
    display: flex;
    flex-wrap: wrap;
    padding: 8px;
    gap: 4px;
  }
  .com__icon-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 70px;
    padding: 4px 2px;
    text-align: center;
    border: 1px solid transparent;
    border-radius: 2px;
    cursor: default;
    &:hover { background: rgba(49,106,197,0.1); border-color: rgba(49,106,197,0.6); }
    &.selected { background: #316ac5; border-color: #316ac5; color: white;
      .com__item-name { color: white; }
    }
  }
  .com__icon-img { width: 32px; height: 32px; margin-bottom: 2px; }
  .com__icon-name { font-size: 10px; word-break: break-word; line-height: 1.2; }

  /* ===== LIST VIEW ===== */
  .com__list-grid {
    display: flex;
    flex-direction: column;
    padding: 2px;
  }
  .com__list-item {
    display: flex;
    align-items: center;
    padding: 1px 4px;
    border: 1px solid transparent;
    cursor: default;
    &:hover { background: rgba(49,106,197,0.1); border-color: rgba(49,106,197,0.6); }
    &.selected { background: #316ac5; border-color: #316ac5; color: white;
      .com__item-name { color: white; }
    }
  }
  .com__list-icon { width: 16px; height: 16px; margin-right: 4px; flex-shrink: 0; }

  /* ===== DETAILS VIEW ===== */
  .com__details { font-size: 11px; }
  .com__details-header {
    display: flex;
    background: #ece9d8;
    border-bottom: 1px solid #aca899;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .com__details-col {
    padding: 2px 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
  }
  .com__details-header .com__details-col {
    cursor: pointer;
    border-right: 1px solid #aca899;
    font-weight: normal;
    &:hover { background: #d6d2c2; }
  }
  .com__details-col--name { width: 220px; flex-shrink: 0; }
  .com__details-col--size { width: 80px; flex-shrink: 0; justify-content: flex-end; }
  .com__details-col--type { width: 150px; flex-shrink: 0; }
  .com__details-col--modified { width: 150px; flex-shrink: 0; }
  .com__details-icon { width: 16px; height: 16px; margin-right: 4px; flex-shrink: 0; }
  .com__details-row {
    display: flex;
    border-bottom: 1px solid transparent;
    cursor: default;
    &:hover { background: rgba(49,106,197,0.1); }
    &.selected { background: #316ac5; color: white;
      .com__item-name { color: white; }
    }
  }

  /* ===== GROUPED HEADERS (My Computer view) ===== */
  .com__group { margin-bottom: 4px; }
  .com__group-header {
    font-weight: 700;
    padding: 2px 0 3px 12px;
    position: relative;
    &:after {
      content: '';
      display: block;
      background: linear-gradient(to right, #70bfff 0, #fff 100%);
      position: absolute;
      bottom: 0; left: 0;
      height: 1px;
      width: calc(100% - 12px);
    }
  }

  /* ===== STATUS BAR ===== */
  .com__status-bar {
    height: 22px;
    display: flex;
    align-items: center;
    border-top: 1px solid #808080;
    background: #ece9d8;
    font-size: 11px;
    flex-shrink: 0;
    padding: 0 4px;
  }
  .com__status-bar__left {
    flex: 1;
    padding: 0 4px;
    border-right: 1px solid #808080;
  }
  .com__status-bar__right {
    width: 120px;
    padding: 0 4px;
  }

  /* ===== TOOLBAR ===== */
  .com__toolbar {
    position: relative;
    display: flex;
    align-items: center;
    line-height: 100%;
    height: 24px;
    border-bottom: 1px solid rgba(255,255,255,0.7);
    flex-shrink: 0;
  }
  .com__options {
    height: 23px;
    border-bottom: 1px solid rgba(0,0,0,0.1);
    border-right: 1px solid rgba(0,0,0,0.1);
    padding: 1px 0 1px 2px;
    border-left: 0;
    flex: 1;
  }
  .com__windows-logo {
    height: 100%;
    border-left: 1px solid white;
    border-bottom: 1px solid rgba(0,0,0,0.1);
  }
  .com__function_bar {
    height: 36px;
    display: flex;
    align-items: center;
    font-size: 11px;
    padding: 1px 3px 0;
    border-bottom: 1px solid rgba(0,0,0,0.1);
    flex-shrink: 0;
  }
  .com__function_bar__button {
    display: flex;
    height: 100%;
    align-items: center;
    border: 1px solid rgba(0,0,0,0);
    border-radius: 3px;
    &:hover { border: 1px solid rgba(0,0,0,0.1); box-shadow: inset 0 -1px 1px rgba(0,0,0,0.1); }
    &:hover:active {
      border: 1px solid rgb(185,185,185);
      background-color: #dedede;
      box-shadow: inset 0 -1px 1px rgba(255,255,255,0.7);
      & > * { transform: translate(1px,1px); }
    }
  }
  .com__function_bar__button--disable {
    filter: grayscale(1);
    opacity: 0.7;
    display: flex;
    height: 100%;
    align-items: center;
    border: 1px solid rgba(0,0,0,0);
  }
  .com__function_bar__text { margin-right: 4px; }
  .com__function_bar__icon {
    height: 30px; width: 30px;
    &--normalize { height: 22px; width: 22px; margin: 0 4px 0 1px; }
    &--margin12 { height: 22px; width: 22px; margin: 0 1px 0 2px; }
  }
  .com__function_bar__separate { height: 90%; width: 1px; background-color: rgba(0,0,0,0.2); margin: 0 2px; }
  .com__function_bar__arrow {
    height: 100%; display: flex; align-items: center; margin: 0 4px;
    &:before { content: ''; display: block; border-width: 3px 3px 0; border-color: #000 transparent; border-style: solid; }
  }

  /* ===== ADDRESS BAR ===== */
  .com__address_bar {
    flex-shrink: 0;
    border-top: 1px solid rgba(255,255,255,0.7);
    height: 22px;
    font-size: 11px;
    display: flex;
    align-items: center;
    padding: 0 2px;
    box-shadow: inset 0 -2px 3px -1px #b0b0b0;
  }
  .com__address_bar__title { line-height: 100%; color: rgba(0,0,0,0.5); padding: 5px; }
  .com__address_bar__content {
    border: rgba(122,122,255,0.6) 1px solid;
    height: 100%;
    display: flex;
    flex: 1;
    align-items: center;
    background-color: white;
    position: relative;
    &__img { width: 14px; height: 14px; }
    &__img:last-child { width: 15px; height: 15px; right: 1px; position: absolute; }
    &__img:last-child:hover { filter: brightness(1.1); }
    &__text { white-space: nowrap; position: absolute; left: 16px; right: 17px; overflow: hidden; display: flex; align-items: center; }
  }
  .com__address_bar__input {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    font-size: 11px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    padding: 0 2px;
  }
  .com__address_bar__go {
    display: flex;
    align-items: center;
    padding: 0 18px 0 5px;
    height: 100%;
    position: relative;
    cursor: pointer;
    &__img { height: 95%; border: 1px solid rgba(255,255,255,0.2); margin-right: 3px; }
  }

  /* ===== BREADCRUMBS ===== */
  .com__breadcrumbs {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .com__breadcrumb-link {
    cursor: pointer;
    &:hover { color: #316ac5; text-decoration: underline; }
  }
  .com__breadcrumb-sep {
    color: #808080;
    margin: 0 1px;
    font-size: 10px;
  }
  .com__breadcrumb-current {
    font-weight: normal;
  }

  /* ===== CONTENT AREA ===== */
  .com__content {
    flex: 1;
    border: 1px solid rgba(0,0,0,0.4);
    border-top-width: 0;
    background-color: #f1f1f1;
    overflow: hidden;
    font-size: 11px;
    position: relative;
  }
  .com__content__inner { display: flex; height: 100%; overflow: hidden; }
  .com__content__left {
    width: 180px;
    background: linear-gradient(to bottom, #748aff 0%, #4057d3 100%);
    overflow-y: auto;
    padding: 10px;
    flex-shrink: 0;
  }
  .com__content__left__card {
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
    width: 100%;
    overflow: hidden;
  }
  .com__content__left__card:not(:last-child) { margin-bottom: 12px; }
  .com__content__left__card__header {
    display: flex;
    align-items: center;
    height: 23px;
    padding-left: 11px;
    padding-right: 2px;
    cursor: pointer;
    background: linear-gradient(to right, rgb(240,240,255) 0, rgb(240,240,255) 30%, rgb(168,188,255) 100%);
  }
  .com__content__left__card__header:hover {
    & .com__content__left__card__header__text { color: #1c68ff; }
  }
  .com__content__left__card__header__text { font-weight: 700; color: #0c327d; flex: 1; }
  .com__content__left__card__header__img { width: 18px; height: 18px; filter: drop-shadow(1px 1px 3px rgba(0,0,0,0.3)); }
  .com__content__left__card__content {
    padding: 5px 10px;
    background: linear-gradient(to right, rgb(180,200,251) 0%, rgb(164,185,251) 50%, rgb(180,200,251) 100%);
  }
  .com__content__left__card__row { display: flex; margin-bottom: 2px; cursor: pointer; }
  .com__content__left__card__img { width: 14px; height: 14px; margin-right: 5px; }
  .com__content__left__card__text {
    font-size: 10px;
    line-height: 14px;
    color: #0c327d;
    &.bold { font-weight: bold; }
    &.link:hover { color: #2b72ff; text-decoration: underline; }
  }
  .com__content__right {
    overflow-y: auto;
    background-color: #fff;
    flex: 1;
    padding: 0;
  }
`;
