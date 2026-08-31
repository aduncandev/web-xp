import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import XPDialogFrame from 'components/XPDialogFrame';
import XPButton from 'components/XPButton';
import XPSelect from 'components/XPSelect';
import XPTooltip from 'components/XPTooltip';
import useEditContextMenu from 'components/EditContextMenu';
import { useVFS } from '../../context/VFSContext';
import { useDialog } from '../../context/DialogContext';
import { SPECIAL_FOLDERS } from '../../context/vfsConstants';
import {
  normalizePath,
  getParentPath,
  getExtension,
  joinPath,
  validateFileName,
  INVALID_NAME_MESSAGE,
} from '../../context/vfsUtils';
import { displayName, hiddenExtension } from '../../WinXP/shell/fileTypes';
import {
  desktopIcon,
  documentsIcon,
  computerIcon32,
  recentIcon,
  networkIcon,
  LOC_MY_COMPUTER,
  LOC_RECENT,
  folderLoc,
  DEFAULT_FILTERS,
} from './helpers';
import { Body } from './styles';

import computerIcon16 from 'assets/windowsIcons/676(16x16).png';
import documentsIcon16 from 'assets/windowsIcons/308(16x16).png';
import upIcon from 'assets/windowsIcons/up.png';
import newFolderIcon from 'assets/windowsIcons/318(16x16).png';

/**
 * XP-style common file dialog (Open / Save As).
 *
 * Props:
 *  - mode: 'open' | 'save'
 *  - title: optional override ('Open' / 'Save As' by default)
 *  - initialPath: starting folder (defaults to My Documents)
 *  - initialFileName: prefilled name (save mode)
 *  - filters: [{ label, extensions: ['.txt'] | null }]
 *  - defaultExtension: appended on save when the name has none (e.g. '.txt')
 *  - onSelect(path): called with the chosen full VFS path
 *  - onCancel(): dismissed
 */
export default function FileDialog({
  mode = 'open',
  title,
  initialPath,
  initialFileName = '',
  filters = DEFAULT_FILTERS,
  defaultExtension,
  onSelect,
  onCancel,
}) {
  const vfs = useVFS();
  const dlg = useDialog();

  // Read per render — these SPECIAL_FOLDERS entries resolve against the
  // active user's profile, so they must not be captured at module scope.
  const { DESKTOP, MY_DOCUMENTS } = SPECIAL_FOLDERS;

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

  const [location, setLocation] = useState(() => {
    if (initialPath && vfs.exists(initialPath)) return folderLoc(initialPath);
    if (vfs.exists(MY_DOCUMENTS)) return folderLoc(MY_DOCUMENTS);
    return LOC_MY_COMPUTER;
  });
  const [fileName, setFileName] = useState(() => {
    // The prefilled name follows the shell's extension hiding ('Document',
    // not 'Document.rtf'); wildcard patterns like '*.txt' pass through
    if (initialFileName && !validateFileName(initialFileName)) {
      const ext = hiddenExtension(
        { name: initialFileName, type: 'file' },
        hideExt,
      );
      if (ext) return initialFileName.slice(0, -ext.length);
    }
    return initialFileName;
  });
  const [filterIndex, setFilterIndex] = useState(0);
  const [selectedPath, setSelectedPath] = useState(null);
  const nameInputRef = useRef(null);
  const { openEditContextMenu, editContextMenu } = useEditContextMenu();

  const dialogTitle = title || (mode === 'save' ? 'Save As' : 'Open');
  const activeFilter = filters[filterIndex] || filters[0];
  // The extension a save actually lands on: the chosen type's first pattern,
  // falling back to whatever the caller nominated.
  const activeExtension =
    (activeFilter && activeFilter.extensions && activeFilter.extensions[0]) ||
    defaultExtension ||
    '';

  /**
   * Picking a different "Save as type" rewrites the extension in the File
   * name box, the way the real common dialog does — leaving a .png named
   * file about to be written as a bitmap is exactly the confusion XP avoids.
   */
  const changeFilter = idx => {
    setFilterIndex(idx);
    if (mode !== 'save') return;
    const next = filters[idx];
    const ext = (next && next.extensions && next.extensions[0]) || '';
    if (!ext) return;
    setFileName(prev => {
      const trimmed = prev.trim();
      const current = getExtension(trimmed);
      // Only swap a real extension; a bare name stays bare and picks the
      // type up at save time.
      if (!current) return prev;
      if (current === ext) return prev;
      return `${trimmed.slice(0, -current.length)}${ext}`;
    });
  };

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, []);

  // --- Item listing for the current location ---

  const matchesFilter = useCallback(
    node => {
      if (!activeFilter || !activeFilter.extensions) return true;
      return activeFilter.extensions.includes(getExtension(node.path));
    },
    [activeFilter],
  );

  const items = useMemo(() => {
    if (!vfs.initialized) return [];
    if (location.kind === 'my-computer') {
      return [
        vfs.getNode(MY_DOCUMENTS) && {
          ...vfs.getNode(MY_DOCUMENTS),
          displayName: 'My Documents',
        },
        vfs.getNode('C:/Documents and Settings/All Users/Documents') && {
          ...vfs.getNode('C:/Documents and Settings/All Users/Documents'),
          displayName: 'Shared Documents',
        },
        vfs.getNode('C:/') && {
          ...vfs.getNode('C:/'),
          displayName: 'Local Disk (C:)',
        },
        vfs.getNode('D:/') && {
          ...vfs.getNode('D:/'),
          displayName: 'CD Drive (D:)',
        },
      ].filter(Boolean);
    }
    if (location.kind === 'recent') {
      return vfs.recentDocuments
        .map(p => vfs.getNode(p))
        .filter(Boolean)
        .filter(matchesFilter);
    }
    return vfs
      .listDir(location.path)
      .filter(node => !node.hidden)
      .filter(node => node.type !== 'shortcut')
      .filter(node =>
        node.type === 'folder' || node.type === 'drive'
          ? true
          : matchesFilter(node),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, matchesFilter, vfs.version, vfs.initialized]);

  // --- Navigation ---

  const navigate = useCallback(loc => {
    setLocation(loc);
    setSelectedPath(null);
  }, []);

  const goUp = useCallback(() => {
    if (location.kind !== 'folder') {
      navigate(folderLoc(DESKTOP));
      return;
    }
    const p = location.path;
    if (p === normalizePath(DESKTOP)) return;
    if (p === 'C:/' || p === 'D:/') {
      navigate(LOC_MY_COMPUTER);
      return;
    }
    const parent = getParentPath(p);
    if (parent && vfs.exists(parent)) navigate(folderLoc(parent));
    else navigate(LOC_MY_COMPUTER);
  }, [location, navigate, vfs, DESKTOP]);

  const onNewFolder = useCallback(() => {
    if (location.kind !== 'folder') return;
    let name = 'New Folder';
    let path = joinPath(location.path, name);
    let counter = 2;
    while (vfs.exists(path)) {
      name = `New Folder (${counter})`;
      path = joinPath(location.path, name);
      counter++;
    }
    vfs.createFolder(path);
  }, [location, vfs]);

  // --- Current location display ---

  const locationDisplay = useMemo(() => {
    if (location.kind === 'my-computer')
      return { label: 'My Computer', icon: computerIcon16 };
    if (location.kind === 'recent')
      return { label: 'My Recent Documents', icon: recentIcon };
    const node = vfs.getNode(location.path);
    if (!node) return { label: location.path, icon: newFolderIcon };
    if (node.type === 'drive')
      return {
        label: `${node.driveLabel || 'Local Disk'} (${node.name})`,
        icon: node.icon,
      };
    if (node.specialFolder === 'desktop')
      return { label: 'Desktop', icon: desktopIcon };
    return { label: node.name, icon: node.icon };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, vfs.version]);

  // --- Look-in dropdown entries ---

  const lookInEntries = useMemo(() => {
    const entries = [
      {
        id: 'desktop',
        label: 'Desktop',
        icon: desktopIcon,
        loc: folderLoc(DESKTOP),
        depth: 0,
      },
      {
        id: 'mydocs',
        label: 'My Documents',
        icon: documentsIcon16,
        loc: folderLoc(MY_DOCUMENTS),
        depth: 1,
      },
      {
        id: 'mycomputer',
        label: 'My Computer',
        icon: computerIcon16,
        loc: LOC_MY_COMPUTER,
        depth: 1,
      },
    ];
    const drives = ['C:/', 'D:/']
      .map(p => vfs.getNode(p))
      .filter(Boolean)
      .map(node => ({
        id: node.path,
        label: `${node.driveLabel || 'Local Disk'} (${node.name})`,
        icon: node.icon,
        loc: folderLoc(node.path),
        depth: 2,
      }));

    // Ancestor chain of the current folder, anchored under its root entry
    let chain = [];
    if (location.kind === 'folder') {
      const anchors = new Set([
        normalizePath(DESKTOP),
        normalizePath(MY_DOCUMENTS),
        'C:/',
        'D:/',
      ]);
      let p = location.path;
      while (p && !anchors.has(p)) {
        chain.unshift(p);
        p = getParentPath(p);
      }
      if (!p) chain = [];
      // orphaned path; skip chain
      else {
        const anchorId =
          p === normalizePath(DESKTOP)
            ? 'desktop'
            : p === normalizePath(MY_DOCUMENTS)
            ? 'mydocs'
            : p;
        const baseDepth =
          anchorId === 'desktop' ? 1 : anchorId === 'mydocs' ? 2 : 3;
        chain = chain
          .map((cp, i) => {
            const node = vfs.getNode(cp);
            return (
              node && {
                id: cp,
                label: node.name,
                icon: node.icon,
                loc: folderLoc(cp),
                depth: baseDepth + i,
                anchorId,
              }
            );
          })
          .filter(Boolean);
      }
    }

    const result = [...entries, ...drives];
    // Splice chain entries after their anchor
    if (chain.length > 0) {
      const idx = result.findIndex(e => e.id === chain[0].anchorId);
      if (idx >= 0) result.splice(idx + 1, 0, ...chain);
      else result.push(...chain);
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, vfs.version]);

  const lookInValue = useMemo(() => {
    if (location.kind === 'my-computer') return 'mycomputer';
    if (location.kind === 'recent') return null;
    if (location.path === normalizePath(DESKTOP)) return 'desktop';
    if (location.path === normalizePath(MY_DOCUMENTS)) return 'mydocs';
    return location.path;
  }, [location, DESKTOP, MY_DOCUMENTS]);

  // --- Item interaction ---

  const enterItem = useCallback(
    node => {
      if (node.type === 'folder' || node.type === 'drive') {
        navigate(folderLoc(node.path));
      } else if (node.type === 'file') {
        if (mode === 'open') {
          onSelect(node.path);
        } else {
          setFileName(displayName(node, hideExt));
          setSelectedPath(node.path);
        }
      }
    },
    [mode, navigate, onSelect, hideExt],
  );

  const clickItem = useCallback(
    node => {
      setSelectedPath(node.path);
      if (node.type === 'file') setFileName(displayName(node, hideExt));
    },
    [hideExt],
  );

  // --- Commit (Open / Save button or Enter) ---

  const commit = useCallback(async () => {
    let name = fileName.trim();
    if (!name) return;

    // Absolute path typed?
    let targetPath = null;
    if (/^[A-Za-z]:[\\/]/.test(name)) {
      targetPath = normalizePath(name);
    } else if (location.kind === 'folder') {
      targetPath = joinPath(location.path, name);
    } else {
      // Selecting from My Computer / Recent views requires a concrete item
      const sel = selectedPath && vfs.getNode(selectedPath);
      if (sel) targetPath = sel.path;
      else return;
    }

    let existing = vfs.getNode(targetPath);
    // With extensions hidden, a picked or typed name lacks its real
    // extension — resolve it against the parent folder's display names
    // (open only; saving appends defaultExtension instead)
    if (!existing && mode === 'open' && hideExt) {
      const dir = getParentPath(targetPath);
      const base = (targetPath.split('/').pop() || '').toLowerCase();
      if (dir) {
        existing =
          vfs
            .listDir(dir)
            .find(
              n =>
                n.type === 'file' &&
                displayName(n, true).toLowerCase() === base,
            ) || null;
      }
    }
    if (existing && (existing.type === 'folder' || existing.type === 'drive')) {
      navigate(folderLoc(existing.path));
      return;
    }

    if (mode === 'open') {
      if (existing && existing.type === 'file') {
        onSelect(existing.path);
      } else {
        await dlg.alert(
          `File '${name}' not found.\n\nPlease verify the correct file name was given.`,
          dialogTitle,
        );
      }
      return;
    }

    // Save mode
    const baseName = targetPath.split('/').pop();
    if (validateFileName(baseName)) {
      await dlg.alert(INVALID_NAME_MESSAGE, dialogTitle);
      return;
    }
    let finalPath = targetPath;
    // A bare name takes the selected type's extension
    if (!getExtension(finalPath) && activeExtension) {
      finalPath = `${finalPath}${activeExtension}`;
    }
    const clash = vfs.getNode(finalPath);
    if (clash && clash.type !== 'file') {
      await dlg.alert(
        `Cannot save as '${baseName}': an item with this name already exists.`,
        dialogTitle,
      );
      return;
    }
    if (clash) {
      const yes = await dlg.confirm(
        `${displayName(
          clash,
          hideExt,
        )} already exists.\nDo you want to replace it?`,
        'Save As',
      );
      if (!yes) return;
    }
    onSelect(finalPath);
  }, [
    fileName,
    location,
    selectedPath,
    mode,
    vfs,
    dlg,
    navigate,
    onSelect,
    activeExtension,
    dialogTitle,
    hideExt,
  ]);

  const upDisabled =
    location.kind === 'folder' && location.path === normalizePath(DESKTOP);

  return (
    <XPDialogFrame
      title={dialogTitle}
      width={570}
      onClose={onCancel}
      zIndex={99990}
      onKeyDown={e => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <Body>
        {/* Look in row */}
        <div className="fd-lookin-row">
          <div className="fd-lookin-label">
            {mode === 'save' ? 'Save in:' : 'Look in:'}
          </div>
          <XPSelect
            className="fd-lookin-select"
            options={lookInEntries.map(entry => ({
              value: entry.id,
              label: entry.label,
              icon: entry.icon,
              indent: entry.depth,
              loc: entry.loc,
            }))}
            value={lookInValue}
            display={locationDisplay}
            onChange={(v, option) => navigate(option.loc)}
          />
          <div className="fd-toolbar">
            <XPTooltip text="Up One Level">
              <button
                className="fd-tool-btn"
                onClick={goUp}
                disabled={upDisabled}
                type="button"
              >
                <img src={upIcon} alt="Up" />
              </button>
            </XPTooltip>
            <XPTooltip text="Create New Folder">
              <button
                className="fd-tool-btn"
                onClick={onNewFolder}
                disabled={location.kind !== 'folder'}
                type="button"
              >
                <img src={newFolderIcon} alt="New Folder" />
              </button>
            </XPTooltip>
          </div>
        </div>

        <div className="fd-main">
          {/* Places bar */}
          <div className="fd-places">
            <div
              className={`fd-place${
                location.kind === 'recent' ? ' active' : ''
              }`}
              onClick={() => navigate(LOC_RECENT)}
            >
              <img src={recentIcon} alt="" />
              <span>My Recent Documents</span>
            </div>
            <div
              className={`fd-place${
                location.kind === 'folder' &&
                location.path === normalizePath(DESKTOP)
                  ? ' active'
                  : ''
              }`}
              onClick={() => navigate(folderLoc(DESKTOP))}
            >
              <img src={desktopIcon} alt="" />
              <span>Desktop</span>
            </div>
            <div
              className={`fd-place${
                location.kind === 'folder' &&
                location.path === normalizePath(MY_DOCUMENTS)
                  ? ' active'
                  : ''
              }`}
              onClick={() => navigate(folderLoc(MY_DOCUMENTS))}
            >
              <img src={documentsIcon} alt="" />
              <span>My Documents</span>
            </div>
            <div
              className={`fd-place${
                location.kind === 'my-computer' ? ' active' : ''
              }`}
              onClick={() => navigate(LOC_MY_COMPUTER)}
            >
              <img src={computerIcon32} alt="" />
              <span>My Computer</span>
            </div>
            <div className="fd-place fd-place--disabled">
              <img src={networkIcon} alt="" />
              <span>My Network Places</span>
            </div>
          </div>

          {/* File list */}
          <div className="fd-list" onClick={() => setSelectedPath(null)}>
            {items.map(node => (
              <div
                key={node.path}
                className={`fd-item${
                  selectedPath === node.path ? ' selected' : ''
                }`}
                onClick={e => {
                  e.stopPropagation();
                  clickItem(node);
                }}
                onDoubleClick={() => enterItem(node)}
              >
                <img src={node.icon} alt="" />
                <span>{displayName(node, hideExt)}</span>
              </div>
            ))}
            {items.length === 0 && <div className="fd-empty" />}
          </div>
        </div>

        {/* Bottom rows */}
        <div className="fd-bottom">
          <div className="fd-bottom-row">
            <div className="fd-bottom-label">File name:</div>
            <input
              ref={nameInputRef}
              className="fd-name-input"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commit();
              }}
              onContextMenu={openEditContextMenu}
              spellCheck={false}
            />
            <XPButton
              className="fd-btn"
              onClick={commit}
              disabled={!fileName.trim()}
              type="button"
            >
              {mode === 'save' ? 'Save' : 'Open'}
            </XPButton>
          </div>
          <div className="fd-bottom-row">
            <div className="fd-bottom-label">
              {mode === 'save' ? 'Save as type:' : 'Files of type:'}
            </div>
            <XPSelect
              className="fd-type-select"
              options={filters.map((f, i) => ({ value: i, label: f.label }))}
              value={filterIndex}
              onChange={i => changeFilter(i)}
            />
            <XPButton className="fd-btn" onClick={onCancel} type="button">
              Cancel
            </XPButton>
          </div>
        </div>
        {editContextMenu}
      </Body>
    </XPDialogFrame>
  );
}

