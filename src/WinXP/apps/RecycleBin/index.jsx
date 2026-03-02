import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { useVFS } from '../../../context/VFSContext';
import { useDialog } from '../../../context/DialogContext';
import { useVolume } from '../../../context/VolumeContext';
import ContextMenu from 'components/ContextMenu';
import { getIconForNode, FOLDER_ICON_SMALL } from '../../../context/vfsConstants';
import { formatFileSize, getFileTypeDisplay, formatDateShort } from '../../../context/vfsUtils';

import folderSmall from 'assets/windowsIcons/318(16x16).png';
import remove from 'assets/windowsIcons/302(16x16).png';
import pullup from 'assets/windowsIcons/pullup.png';

import recycleSoundSrc from 'assets/sounds/recycle.wav';

function playSound(soundSrc, applyVolume) {
  if (!soundSrc) return;
  try {
    const audio = new Audio(soundSrc);
    if (typeof applyVolume === 'function') applyVolume(audio);
    audio.play().catch(() => {});
  } catch { /* ignore */ }
}

export default function RecycleBin({ onClose }) {
  const vfs = useVFS();
  const dialog = useDialog();
  const { applyVolume } = useVolume();
  const [selectedItem, setSelectedItem] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const items = vfs.getRecycleBinItems();

  const totalSize = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.type === 'file' ? (item.size || 0) : 0), 0);
  }, [items]);

  const handleEmptyBin = useCallback(async () => {
    if (items.length === 0) return;
    const yes = await dialog.confirm({
      title: 'Confirm Multiple File Delete',
      message: `Are you sure you want to delete these ${items.length} item(s)?`,
      icon: 'question',
    });
    if (yes) {
      vfs.emptyRecycleBin();
      playSound(recycleSoundSrc, applyVolume);
      setSelectedItem(null);
    }
  }, [dialog, vfs, items.length, applyVolume]);

  const handleRestoreAll = useCallback(() => {
    if (items.length === 0) return;
    for (const item of items) {
      vfs.restoreNode(item.path);
    }
    setSelectedItem(null);
  }, [items, vfs]);

  const handleRestore = useCallback(() => {
    if (!selectedItem) return;
    vfs.restoreNode(selectedItem.path);
    setSelectedItem(null);
  }, [selectedItem, vfs]);

  const handleDeletePermanently = useCallback(async () => {
    if (!selectedItem) return;
    const yes = await dialog.confirm({
      title: 'Confirm File Delete',
      message: `Are you sure you want to permanently delete '${selectedItem.name}'?`,
      icon: 'question',
    });
    if (yes) {
      vfs.deleteNode(selectedItem.path);
      playSound(recycleSoundSrc, applyVolume);
      setSelectedItem(null);
    }
  }, [selectedItem, dialog, vfs, applyVolume]);

  const handleContextMenu = useCallback((e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedItem(item);
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  }, []);

  const handleBackgroundContext = useCallback(e => {
    if (e.target.closest('.rb__row')) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedItem(null);
    setContextMenu({ x: e.clientX, y: e.clientY, item: null });
  }, []);

  // Strip the unique prefix from recycled item names for display
  const getDisplayName = item => {
    const name = item.name;
    // Names are stored as "timestamp_random_originalName"
    const underscoreIdx = name.indexOf('_');
    if (underscoreIdx >= 0) {
      const secondUnderscore = name.indexOf('_', underscoreIdx + 1);
      if (secondUnderscore >= 0) {
        return name.slice(secondUnderscore + 1);
      }
    }
    return name;
  };

  return (
    <Div
      onClick={() => { setContextMenu(null); setSelectedItem(null); }}
      onContextMenu={handleBackgroundContext}
    >
      <div className="rb__toolbar">
        <div className="rb__toolbar__btn" onClick={handleEmptyBin}>
          <img src={remove} alt="" className="rb__toolbar__icon" />
          <span>Empty Recycle Bin</span>
        </div>
        {items.length > 0 && (
          <div className="rb__toolbar__btn" onClick={handleRestoreAll}>
            <img src={folderSmall} alt="" className="rb__toolbar__icon" />
            <span>Restore All Items</span>
          </div>
        )}
      </div>

      <div className="rb__content">
        <div className="rb__sidebar">
          <div className="rb__card">
            <div className="rb__card__header">
              <span className="rb__card__header__text">Recycle Bin Tasks</span>
              <img src={pullup} alt="" className="rb__card__header__img" />
            </div>
            <div className="rb__card__body">
              <div className="rb__card__row" onClick={handleEmptyBin}>
                <img className="rb__card__img" src={remove} alt="" />
                <span className="rb__card__link">Empty the Recycle Bin</span>
              </div>
              {items.length > 0 && (
                <div className="rb__card__row" onClick={handleRestoreAll}>
                  <img className="rb__card__img" src={folderSmall} alt="" />
                  <span className="rb__card__link">Restore all items</span>
                </div>
              )}
              {selectedItem && (
                <>
                  <div className="rb__card__row" onClick={handleRestore}>
                    <img className="rb__card__img" src={folderSmall} alt="" />
                    <span className="rb__card__link">Restore this item</span>
                  </div>
                  <div className="rb__card__row" onClick={handleDeletePermanently}>
                    <img className="rb__card__img" src={remove} alt="" />
                    <span className="rb__card__link">Delete this item</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="rb__main" onContextMenu={handleBackgroundContext}>
          <div className="rb__header">
            <div className="rb__col rb__col--name">Name</div>
            <div className="rb__col rb__col--original">Original Location</div>
            <div className="rb__col rb__col--date">Date Deleted</div>
            <div className="rb__col rb__col--type">Type</div>
            <div className="rb__col rb__col--size">Size</div>
          </div>
          {items.length === 0 ? (
            <div className="rb__empty">Recycle Bin is empty.</div>
          ) : (
            items.map(item => (
              <div
                key={item.path}
                className={`rb__row ${selectedItem?.path === item.path ? 'selected' : ''}`}
                onClick={e => { e.stopPropagation(); setSelectedItem(item); }}
                onContextMenu={e => handleContextMenu(e, item)}
              >
                <div className="rb__col rb__col--name">
                  <img src={item.type === 'directory' ? FOLDER_ICON_SMALL : getIconForNode(item)} alt="" className="rb__icon" />
                  {getDisplayName(item)}
                </div>
                <div className="rb__col rb__col--original">{item.originalPath || ''}</div>
                <div className="rb__col rb__col--date">{formatDateShort(item.deletedAt)}</div>
                <div className="rb__col rb__col--type">{getFileTypeDisplay(item)}</div>
                <div className="rb__col rb__col--size">
                  {item.type === 'file' ? formatFileSize(item.size || 0) : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rb__statusbar">
        <span className="rb__statusbar__left">
          {items.length} object(s){totalSize > 0 ? ` (${formatFileSize(totalSize)})` : ''}
        </span>
        <span className="rb__statusbar__right" />
      </div>

      {contextMenu && (
        <ContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          items={contextMenu.item ? [
            { type: 'item', label: 'Restore', onClick: handleRestore },
            { type: 'separator' },
            { type: 'item', label: 'Delete', onClick: handleDeletePermanently },
          ] : [
            { type: 'item', label: 'Empty Recycle Bin', onClick: handleEmptyBin, disabled: items.length === 0 },
          ]}
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
  flex-direction: column;
  background: linear-gradient(to right, #edede5 0%, #ede8cd 100%);
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;

  .rb__toolbar {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 2px 4px;
    border-bottom: 1px solid rgba(0,0,0,0.1);
    flex-shrink: 0;
  }
  .rb__toolbar__btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    &:hover { border-color: rgba(0,0,0,0.1); background: rgba(255,255,255,0.4); }
  }
  .rb__toolbar__icon { width: 16px; height: 16px; }

  .rb__content { display: flex; flex: 1; overflow: hidden; }

  .rb__sidebar {
    width: 180px;
    background: linear-gradient(to bottom, #748aff 0%, #4057d3 100%);
    padding: 10px;
    flex-shrink: 0;
    overflow-y: auto;
  }

  .rb__card {
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
    overflow: hidden;
  }
  .rb__card__header {
    display: flex;
    align-items: center;
    height: 23px;
    padding: 0 2px 0 11px;
    background: linear-gradient(to right, rgb(240,240,255) 0, rgb(240,240,255) 30%, rgb(168,188,255) 100%);
  }
  .rb__card__header__text { font-weight: 700; color: #0c327d; flex: 1; }
  .rb__card__header__img { width: 18px; height: 18px; }
  .rb__card__body {
    padding: 5px 10px;
    background: linear-gradient(to right, rgb(180,200,251) 0%, rgb(164,185,251) 50%, rgb(180,200,251) 100%);
  }
  .rb__card__row { display: flex; margin-bottom: 2px; cursor: pointer; align-items: center; }
  .rb__card__img { width: 14px; height: 14px; margin-right: 5px; }
  .rb__card__link {
    font-size: 10px;
    color: #0c327d;
    &:hover { color: #2b72ff; text-decoration: underline; }
  }

  .rb__main {
    flex: 1;
    background: white;
    overflow-y: auto;
  }

  .rb__header {
    display: flex;
    background: #ece9d8;
    border-bottom: 1px solid #aca899;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .rb__header .rb__col {
    cursor: pointer;
    border-right: 1px solid #aca899;
    padding: 2px 6px;
    font-weight: normal;
    &:hover { background: #d6d2c2; }
  }

  .rb__col {
    padding: 2px 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
  }
  .rb__col--name { width: 180px; flex-shrink: 0; }
  .rb__col--original { width: 200px; flex-shrink: 0; }
  .rb__col--date { width: 140px; flex-shrink: 0; }
  .rb__col--type { width: 120px; flex-shrink: 0; }
  .rb__col--size { width: 80px; flex-shrink: 0; justify-content: flex-end; }

  .rb__icon { width: 16px; height: 16px; margin-right: 4px; flex-shrink: 0; }

  .rb__row {
    display: flex;
    border-bottom: 1px solid transparent;
    cursor: default;
    &:hover { background: rgba(49,106,197,0.1); }
    &.selected { background: #316ac5; color: white; }
  }

  .rb__empty {
    padding: 20px;
    color: #808080;
    font-style: italic;
  }

  .rb__statusbar {
    height: 22px;
    display: flex;
    align-items: center;
    border-top: 1px solid #808080;
    background: #ece9d8;
    padding: 0 4px;
    flex-shrink: 0;
  }
  .rb__statusbar__left {
    flex: 1;
    padding: 0 4px;
    border-right: 1px solid #808080;
  }
  .rb__statusbar__right {
    width: 120px;
    padding: 0 4px;
  }
`;
