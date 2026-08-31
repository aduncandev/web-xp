import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

import { useVFS } from '../../../context/VFSContext';
import { SPECIAL_FOLDERS, computerIcon } from '../../../context/vfsConstants';
import { getParentPath } from '../../../context/vfsUtils';
import { getArt } from '../../../xpArt';

import desktopIconSvg from 'assets/windowsIcons/desktop.svg';
import networkIconPng from 'assets/windowsIcons/693(16x16).png';
import recycleIconSvg from 'assets/windowsIcons/recycle-empty.svg';

// Real shell namespace icons where we hold them
const desktopIcon = getArt('Desktop16', getArt('Desktop', desktopIconSvg));
const networkIcon = getArt('MyNetworkPlaces', networkIconPng);
const recycleIcon = getArt('recycle-empty', recycleIconSvg);
// Genuine Luna tree expanders (9x9)
const treePlus = getArt('tree-plus', null);
const treeMinus = getArt('tree-minus', null);

const MY_COMPUTER = 'My Computer';
const MC_ID = '::my-computer';

/**
 * XP Explorer "Folders" pane — an expandable tree of the folder hierarchy.
 * Props: { currentPath, onNavigate(pathOrMyComputer), onClose }
 */
export default function FolderTree({
  currentPath,
  onNavigate,
  onShellOpen,
  onClose,
}) {
  const vfs = useVFS();
  const [expanded, setExpanded] = useState(
    () => new Set([SPECIAL_FOLDERS.DESKTOP, MC_ID]),
  );

  // Auto-expand the ancestors of the current folder
  useEffect(() => {
    if (!currentPath || currentPath === MY_COMPUTER) return;
    const toExpand = [MC_ID, SPECIAL_FOLDERS.DESKTOP];
    let p = currentPath;
    while (p) {
      toExpand.push(p);
      const parent = getParentPath(p);
      if (!parent || parent === p) break;
      p = parent;
    }
    setExpanded(prev => new Set([...prev, ...toExpand]));
  }, [currentPath]);

  const toggle = useCallback(id => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const subFolders = useCallback(
    path => {
      // Hidden-folder visibility follows Folder Options (per-user hive)
      let view = {};
      try {
        view = vfs.getUserConfig('explorerView', null) || {};
      } catch {
        view = {};
      }
      const showHidden = !!view.showHidden;
      const hideProtectedOS = view.hideProtectedOS !== false;
      return vfs
        .listDir(path)
        .filter(
          n =>
            n.type === 'folder' &&
            (!n.hidden || (showHidden && !(n.system && hideProtectedOS))),
        );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vfs.version],
  );

  const renderFolder = (node, depth) => {
    const children = subFolders(node.path);
    const hasChildren = children.length > 0;
    const isOpen = expanded.has(node.path);
    return (
      <React.Fragment key={node.path}>
        <TreeRow
          depth={depth}
          hasChildren={hasChildren}
          isOpen={isOpen}
          isActive={currentPath === node.path}
          icon={node.icon}
          label={node.name}
          onToggle={() => toggle(node.path)}
          onSelect={() => {
            onNavigate(node.path);
            if (hasChildren) setExpanded(prev => new Set(prev).add(node.path));
          }}
        />
        {isOpen && children.map(child => renderFolder(child, depth + 1))}
      </React.Fragment>
    );
  };

  const desktop = vfs.getNode(SPECIAL_FOLDERS.DESKTOP);
  const myDocs = vfs.getNode(SPECIAL_FOLDERS.MY_DOCUMENTS);
  const drives = ['C:/', 'D:/'].map(p => vfs.getNode(p)).filter(Boolean);
  const desktopFolders = desktop ? subFolders(desktop.path) : [];
  const mcOpen = expanded.has(MC_ID);

  return (
    <Pane>
      <div className="ft-header">
        <span className="ft-header__title">Folders</span>
        <button className="ft-header__close" onClick={onClose} type="button">
          ×
        </button>
      </div>
      <div className="ft-tree">
        {desktop && (
          <>
            {/* Desktop is the namespace root: no expander, always open.
                Clicking it goes to the Desktop folder, but the rows beneath
                are shell children, not that folder's subfolders. */}
            <TreeRow
              depth={0}
              hasChildren={false}
              isOpen
              isActive={currentPath === desktop.path}
              icon={desktopIcon}
              label="Desktop"
              onToggle={() => {}}
              onSelect={() => onNavigate(desktop.path)}
            />
            <>
              {myDocs && renderFolder({ ...myDocs, name: 'My Documents' }, 1)}
              <TreeRow
                depth={1}
                hasChildren={drives.length > 0}
                isOpen={mcOpen}
                isActive={currentPath === MY_COMPUTER}
                icon={computerIcon}
                label="My Computer"
                onToggle={() => toggle(MC_ID)}
                onSelect={() => onNavigate(MY_COMPUTER)}
              />
              {mcOpen &&
                drives.map(drive => {
                  const children = subFolders(drive.path);
                  const isOpen = expanded.has(drive.path);
                  return (
                    <React.Fragment key={drive.path}>
                      <TreeRow
                        depth={2}
                        hasChildren={children.length > 0}
                        isOpen={isOpen}
                        isActive={currentPath === drive.path}
                        icon={drive.icon}
                        label={`${drive.driveLabel || 'Local Disk'} (${
                          drive.name
                        })`}
                        onToggle={() => toggle(drive.path)}
                        onSelect={() => onNavigate(drive.path)}
                      />
                      {isOpen && children.map(child => renderFolder(child, 3))}
                    </React.Fragment>
                  );
                })}
              <TreeRow
                depth={1}
                hasChildren={false}
                isOpen={false}
                isActive={false}
                icon={networkIcon}
                label="My Network Places"
                onToggle={() => {}}
                onSelect={() => {}}
              />
              <TreeRow
                depth={1}
                hasChildren={false}
                isOpen={false}
                isActive={currentPath === 'Recycle Bin'}
                icon={recycleIcon}
                label="Recycle Bin"
                onToggle={() => {}}
                onSelect={() => onNavigate('Recycle Bin')}
              />
              {desktopFolders
                .filter(f => f.path !== SPECIAL_FOLDERS.MY_DOCUMENTS)
                .map(child => renderFolder(child, 1))}
            </>
          </>
        )}
      </div>
    </Pane>
  );
}

function TreeRow({
  depth,
  hasChildren,
  isOpen,
  isActive,
  icon,
  label,
  onToggle,
  onSelect,
}) {
  return (
    <div className="ft-row" style={{ paddingLeft: depth * 16 + 2 }}>
      <span
        className="ft-expander"
        onClick={e => {
          e.stopPropagation();
          if (hasChildren) onToggle();
        }}
      >
        {hasChildren && (
          <img src={isOpen ? treeMinus : treePlus} alt="" draggable={false} />
        )}
      </span>
      <span
        className={`ft-label${isActive ? ' active' : ''}`}
        onClick={onSelect}
        onDoubleClick={() => hasChildren && onToggle()}
      >
        <img src={icon} alt="" />
        <span className="ft-label__text">{label}</span>
      </span>
    </div>
  );
}

const Pane = styled.div`
  width: 200px;
  background: #fff;
  border-right: 1px solid #d8d8d8;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .ft-header {
    height: 23px;
    display: flex;
    align-items: center;
    padding: 0 4px 0 8px;
    background: linear-gradient(to bottom, #fcfcfe 0%, #d6d6ce 100%);
    border-bottom: 1px solid #d8d8d8;
    flex-shrink: 0;
  }
  .ft-header__title {
    flex: 1;
    font-weight: 700;
  }
  .ft-header__close {
    width: 16px;
    height: 16px;
    border: 1px solid transparent;
    background: transparent;
    font-size: 12px;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    &:hover {
      border: 1px solid #999;
      background: #eee;
    }
  }
  .ft-tree {
    flex: 1;
    overflow: auto;
    padding: 4px 2px;
    font-size: 11px;
  }
  .ft-row {
    display: flex;
    align-items: center;
    height: 18px;
    white-space: nowrap;
  }
  /* The real 9x9 Luna expander bitmaps, cropped from XP */
  .ft-expander {
    width: 9px;
    height: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 5px;
    flex-shrink: 0;
    cursor: default;
    img {
      width: 9px;
      height: 9px;
      display: block;
    }
  }
  .ft-label {
    display: inline-flex;
    align-items: center;
    padding: 1px 2px;
    cursor: default;
    min-width: 0;
    img {
      width: 16px;
      height: 16px;
      margin-right: 4px;
      flex-shrink: 0;
    }
    &:hover .ft-label__text {
      text-decoration: underline;
      color: #316ac5;
    }
    &.active {
      .ft-label__text {
        background: #316ac5;
        color: #fff;
      }
    }
  }
  .ft-label__text {
    padding: 0 2px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
