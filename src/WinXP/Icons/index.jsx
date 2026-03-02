import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';

import { SPECIAL_FOLDERS } from '../../context/vfsDefaults';
import { getLargeIconForNode, getDisplayName, FOLDER_ICON } from '../../context/vfsConstants';

const DESKTOP_PATH = SPECIAL_FOLDERS['Desktop'];
const GRID_SIZE = 75;
const ICON_WIDTH = 70;
const ICON_HEIGHT = 70;
const STORAGE_KEY = 'desktopIconPositions';

function computeGridPositions(count) {
  const positions = {};
  const startX = 20;
  const startY = 20;
  const maxH = (typeof window !== 'undefined' ? window.innerHeight : 768) - 60;
  let x = startX;
  let y = startY;
  for (let i = 0; i < count; i++) {
    positions[i] = { x, y };
    y += GRID_SIZE;
    if (y + ICON_HEIGHT > maxH) {
      y = startY;
      x += GRID_SIZE;
    }
  }
  return positions;
}

function loadPositions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

function savePositions(positions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch { /* ignore */ }
}

function Icons({
  onDoubleClickShortcut,
  onDoubleClickDesktopFile,
  displayFocus,
  mouse,
  selecting,
  setSelectedIcons,
  vfs,
}) {
  const containerRef = useRef(null);

  const recycleBinFull = useMemo(() => vfs && !vfs.isRecycleBinEmpty(), [vfs]);

  // All desktop items come from VFS
  const allIcons = useMemo(() => {
    if (!vfs) return [];
    const { dirs, files } = vfs.readDir(DESKTOP_PATH);
    return [...dirs, ...files].map(node => ({
      id: `vfs_${node.path}`,
      icon: getLargeIconForNode(node),
      title: getDisplayName(node),
      vfsPath: node.path,
      nodeType: node.type,
      target: node.target || null,
      isRecycleBin: node.type === 'shortcut' && node.target === 'RecycleBin',
    }));
  }, [vfs]);

  // Track which icons are focused
  const [focusedIds, setFocusedIds] = useState(new Set());

  // Positions state: { [iconId]: { x, y } }
  const [positions, setPositions] = useState(() => {
    const saved = loadPositions();
    if (saved) return saved;
    const grid = computeGridPositions(allIcons.length);
    const result = {};
    allIcons.forEach((ic, i) => {
      result[ic.id] = grid[i] || { x: 20, y: 20 + i * GRID_SIZE };
    });
    return result;
  });

  // Assign positions for new icons that don't have one yet
  useEffect(() => {
    const missing = allIcons.filter(ic => !positions[ic.id]);
    if (missing.length === 0) return;
    const occupied = new Set(Object.values(positions).map(p => `${p.x},${p.y}`));
    const maxH = window.innerHeight - 60;
    let x = 20, y = 20;
    const newPositions = { ...positions };
    for (const ic of missing) {
      while (occupied.has(`${x},${y}`)) {
        y += GRID_SIZE;
        if (y + ICON_HEIGHT > maxH) {
          y = 20;
          x += GRID_SIZE;
        }
      }
      newPositions[ic.id] = { x, y };
      occupied.add(`${x},${y}`);
      y += GRID_SIZE;
      if (y + ICON_HEIGHT > maxH) {
        y = 20;
        x += GRID_SIZE;
      }
    }
    setPositions(newPositions);
  }, [allIcons, positions]);

  // Save positions to localStorage on change
  useEffect(() => {
    savePositions(positions);
  }, [positions]);

  // --- Drag state ---
  const [dragging, setDragging] = useState(null);

  const handleDragStart = useCallback((e, iconId) => {
    if (e.button !== 0) return;
    const pos = positions[iconId] || { x: 0, y: 0 };
    setDragging({
      id: iconId,
      startX: e.clientX,
      startY: e.clientY,
      iconStartX: pos.x,
      iconStartY: pos.y,
      moved: false,
    });
  }, [positions]);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = e => {
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      if (!dragging.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      dragging.moved = true;

      setPositions(prev => ({
        ...prev,
        [dragging.id]: {
          x: dragging.iconStartX + dx,
          y: dragging.iconStartY + dy,
        },
      }));
    };

    const handleMouseUp = e => {
      if (dragging.moved) {
        const dx = e.clientX - dragging.startX;
        const dy = e.clientY - dragging.startY;
        const rawX = dragging.iconStartX + dx;
        const rawY = dragging.iconStartY + dy;
        const snappedX = Math.max(0, Math.round(rawX / GRID_SIZE) * GRID_SIZE);
        const snappedY = Math.max(0, Math.round(rawY / GRID_SIZE) * GRID_SIZE);
        setPositions(prev => ({
          ...prev,
          [dragging.id]: { x: snappedX, y: snappedY },
        }));
      }
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  // Measure icons for selection rectangle
  const [iconsRect, setIconsRect] = useState([]);
  const measure = useCallback((rect) => {
    setIconsRect(prev => {
      const existing = prev.find(r => r.id === rect.id);
      if (existing) {
        if (existing.x === rect.x && existing.y === rect.y) return prev;
        return prev.map(r => r.id === rect.id ? rect : r);
      }
      return [...prev, rect];
    });
  }, []);

  useEffect(() => {
    if (!selecting) return;
    const sx = Math.min(selecting.x, mouse.docX);
    const sy = Math.min(selecting.y, mouse.docY);
    const sw = Math.abs(selecting.x - mouse.docX);
    const sh = Math.abs(selecting.y - mouse.docY);
    const selectedIds = iconsRect
      .filter(rect => {
        const { x, y, w, h } = rect;
        return x - sx < sw && sx - x < w && y - sy < sh && sy - y < h;
      })
      .map(icon => icon.id);
    setSelectedIcons(selectedIds);
    setFocusedIds(new Set(selectedIds));
  }, [iconsRect, setSelectedIcons, selecting, mouse.docX, mouse.docY]);

  const handleIconMouseDown = useCallback((e, iconData) => {
    setFocusedIds(new Set([iconData.id]));
    setSelectedIcons([iconData.id]);
    handleDragStart(e, iconData.id);
  }, [handleDragStart, setSelectedIcons]);

  const handleIconDoubleClick = useCallback((iconData) => {
    if (iconData.nodeType === 'shortcut' && iconData.target) {
      // Shortcut → resolve to app
      if (onDoubleClickShortcut) onDoubleClickShortcut(iconData.target, iconData.vfsPath);
    } else {
      // File or directory → open via VFS
      if (onDoubleClickDesktopFile) onDoubleClickDesktopFile(iconData.vfsPath);
    }
  }, [onDoubleClickShortcut, onDoubleClickDesktopFile]);

  // Clear focus when desktop is clicked (parent handles this)
  const clearFocus = useCallback(() => {
    setFocusedIds(new Set());
  }, []);

  // Expose clearFocus to parent via ref if needed
  useEffect(() => {
    if (!displayFocus) {
      // Not focused on icons — don't clear, just dim
    }
  }, [displayFocus]);

  return (
    <IconsContainer ref={containerRef}>
      {allIcons.map(iconData => {
        const pos = positions[iconData.id] || { x: 0, y: 0 };
        const isFocus = focusedIds.has(iconData.id);
        return (
          <StyledIcon
            key={iconData.id}
            id={iconData.id}
            icon={iconData.icon}
            title={iconData.title}
            isFocus={isFocus}
            displayFocus={displayFocus}
            onMouseDown={e => handleIconMouseDown(e, iconData)}
            onDoubleClick={() => handleIconDoubleClick(iconData)}
            measure={measure}
            recycleBinFull={iconData.isRecycleBin && recycleBinFull}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
            }}
          />
        );
      })}
    </IconsContainer>
  );
}

function Icon({
  title,
  onMouseDown,
  onDoubleClick,
  icon,
  className,
  id,
  measure,
  style,
  recycleBinFull,
}) {
  const ref = useRef(null);
  function _onMouseDown(e) {
    if (onMouseDown && typeof onMouseDown === 'function') {
      onMouseDown(e);
    }
  }
  function _onDoubleClick() {
    if (onDoubleClick && typeof onDoubleClick === 'function') {
      onDoubleClick();
    }
  }
  useEffect(() => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const posX = left + window.scrollX;
    const posY = top + window.scrollY;
    if (typeof measure === 'function') {
      measure({ id, x: posX, y: posY, w: width, h: height });
    }
  });
  return (
    <div
      className={className}
      onMouseDown={_onMouseDown}
      onDoubleClick={_onDoubleClick}
      ref={ref}
      style={style}
    >
      <div className={`${className}__img__container`}>
        <img src={icon} alt={title} className={`${className}__img`} draggable={false} />
        {recycleBinFull && <div className={`${className}__bin-full`} />}
      </div>
      <div className={`${className}__text__container`}>
        <div className={`${className}__text`}>{title}</div>
      </div>
    </div>
  );
}

const IconsContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 30px;
  pointer-events: none;
`;

const StyledIcon = styled(Icon)`
  width: 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  cursor: default;

  pointer-events: auto;

  &__text__container {
    width: 100%;
    font-size: 10px;
    color: white;
    text-shadow: 0 1px 1px black;
    margin-top: 5px;
    display: flex;
    justify-content: center;

    &:before {
      content: '';
      display: block;
      flex-grow: 1;
    }
    &:after {
      content: '';
      display: block;
      flex-grow: 1;
    }
  }
  &__text {
    padding: 0 3px 2px;
    background-color: ${({ isFocus, displayFocus }) =>
      isFocus && displayFocus ? '#0b61ff' : 'transparent'};
    text-align: center;
    flex-shrink: 1;
  }
  &__img__container {
    width: 30px;
    height: 30px;
    position: relative;
    filter: ${({ isFocus, displayFocus }) =>
      isFocus && displayFocus ? 'drop-shadow(0 0 blue)' : ''};
  }
  &__img {
    width: 30px;
    height: 30px;
    opacity: ${({ isFocus, displayFocus }) =>
      isFocus && displayFocus ? 0.5 : 1};
  }
  &__bin-full {
    position: absolute;
    top: 2px;
    left: 8px;
    width: 14px;
    height: 10px;
    background: linear-gradient(135deg, #e8e0d0 0%, #c8c0b0 60%, #a89880 100%);
    border: 1px solid #887858;
    border-radius: 1px;
    transform: rotate(-5deg);
    pointer-events: none;
    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 1px;
      width: 10px;
      height: 5px;
      background: linear-gradient(135deg, #f0e8d8 0%, #d0c8b0 100%);
      border: 1px solid #a08868;
      border-radius: 1px;
      transform: rotate(8deg);
    }
  }
`;

export default Icons;
