// The desktop icon layer's presentational pieces: the single-icon component
// (image, shortcut badge, label, rename box) and the styled-components that
// place it on the desktop grid.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';

import XPTooltip from '../../components/XPTooltip';
import { getArt } from '../../xpArt';
import { CELL_W, TASKBAR_H, LABEL_LINES, LABEL_LINE_H } from './helpers';

// Genuine XP shortcut-arrow badge (bottom-left of shortcut icons)
const shortcutOverlay = getArt('shortcut-overlay', null);

function Icon({
  title,
  onMouseDown,
  onDoubleClick,
  onContextMenu,
  icon,
  className,
  id,
  isRenaming,
  onRename,
  isFocus,
  displayFocus,
  isDropTarget,
  hasArrow,
  infoTip,
  selectBaseOnRename,
  style,
}) {
  const inputRef = useRef(null);
  const [renameValue, setRenameValue] = useState(title);

  // XP's desktop rename box wraps and grows downward to fit the whole name,
  // however long it is — that edit box is the only place the full name shows.
  const autoGrow = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (isRenaming) {
      setRenameValue(title);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          autoGrow();
          // With a visible extension, select only the base name (like XP)
          const dot = selectBaseOnRename ? title.lastIndexOf('.') : -1;
          if (dot > 0) inputRef.current.setSelectionRange(0, dot);
          else inputRef.current.select();
        }
      }, 0);
    }
  }, [isRenaming, title, selectBaseOnRename, autoGrow]);

  function _onMouseDown(e) {
    if (isRenaming) return;
    if (onMouseDown && typeof onMouseDown === 'function') {
      onMouseDown(id, e);
    }
  }
  function _onDoubleClick() {
    if (isRenaming) return;
    if (onDoubleClick && typeof onDoubleClick === 'function') {
      onDoubleClick(id);
    }
  }
  function _onContextMenu(e) {
    if (onContextMenu && typeof onContextMenu === 'function') {
      onContextMenu(e, id);
    }
  }

  const finishRename = () => {
    if (onRename) onRename(id, renameValue.trim());
  };

  const handleRenameKeyDown = e => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault(); // the box wraps, but Enter still commits
      finishRename();
    } else if (e.key === 'Escape') {
      if (onRename) onRename(id, title); // cancel = pass original name
    }
  };

  const highlighted = (isFocus && displayFocus) || isDropTarget;

  const iconEl = (
    <div
      className={className}
      style={style}
      onMouseDown={_onMouseDown}
      onDoubleClick={_onDoubleClick}
      onContextMenu={_onContextMenu}
      onDragStart={e => e.preventDefault()}
    >
      <div className={`${className}__img__container`}>
        <img
          src={icon}
          alt={title}
          className={`${className}__img`}
          draggable={false}
        />
        {hasArrow && shortcutOverlay && (
          <img
            src={shortcutOverlay}
            alt=""
            className="icon-shortcut-arrow"
            draggable={false}
          />
        )}
        {highlighted && (
          <div
            className="icon-tint"
            style={{
              WebkitMaskImage: `url(${icon})`,
              maskImage: `url(${icon})`,
            }}
          />
        )}
      </div>
      <div className={`${className}__text__container`}>
        {isRenaming ? (
          <textarea
            ref={inputRef}
            className="icon-rename-input"
            rows={1}
            value={renameValue}
            onChange={e => {
              setRenameValue(e.target.value);
              autoGrow();
            }}
            onKeyDown={handleRenameKeyDown}
            onBlur={finishRename}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onDoubleClick={e => e.stopPropagation()}
            spellCheck={false}
          />
        ) : (
          <div className={`${className}__text`}>{title}</div>
        )}
      </div>
    </div>
  );

  if (!infoTip) return iconEl;
  return (
    <XPTooltip text={infoTip} disabled={isRenaming}>
      {iconEl}
    </XPTooltip>
  );
}

// Hosts the icons being dragged, portaled to <body> so they draw over app
// windows (the icon layer itself stacks below them). Same inset as
// IconsContainer so the two coordinate spaces line up; below menus (99999).
export const DragGhostLayer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: ${TASKBAR_H}px;
  overflow: hidden;
  pointer-events: none;
  z-index: 90000;
`;

export const IconsContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: ${TASKBAR_H}px;
  overflow: hidden;
  pointer-events: none;
  /* Keeps the icons' own stacking (selected labels over their neighbours)
     from competing with the window layer above the desktop */
  isolation: isolate;
`;

export const StyledIcon = styled(Icon)`
  position: absolute;
  width: ${CELL_W}px;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* A selected icon's unfurled label draws over its neighbours, like XP */
  z-index: ${({ isFocus, displayFocus }) => (isFocus && displayFocus ? 2 : 1)};

  pointer-events: auto;
  user-select: none;

  &__text__container {
    width: 100%;
    font-size: 11px;
    line-height: ${LABEL_LINE_H}px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    color: white;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.9);
    margin-top: 4px;
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
    background-color: ${({ isFocus, displayFocus, isDropTarget }) =>
      (isFocus && displayFocus) || isDropTarget ? '#316ac5' : 'transparent'};
    text-shadow: ${({ isFocus, displayFocus, isDropTarget }) =>
      (isFocus && displayFocus) || isDropTarget
        ? 'none'
        : '1px 1px 1px rgba(0, 0, 0, 0.9)'};
    outline: ${({ isFocus, displayFocus }) =>
      isFocus && displayFocus
        ? '1px dotted rgba(255, 255, 255, 0.65)'
        : 'none'};
    outline-offset: -1px;
    text-align: center;
    flex-shrink: 1;
    max-width: ${CELL_W}px;
    overflow-wrap: break-word;
    /* XP caps a desktop label at two lines and ellipsizes the rest, then
       unfurls the whole name once the icon is selected. */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: ${({ isFocus, displayFocus }) =>
      isFocus && displayFocus ? 'none' : LABEL_LINES};
    line-clamp: ${({ isFocus, displayFocus }) =>
      isFocus && displayFocus ? 'none' : LABEL_LINES};
    overflow: hidden;
  }
  &__img__container {
    position: relative;
    width: 32px;
    height: 32px;
  }
  &__img {
    width: 32px;
    height: 32px;
    /* Cut-to-clipboard and ghosted hidden items both dim the icon */
    opacity: ${({ isCut, isHidden }) => (isCut ? 0.5 : isHidden ? 0.55 : 1)};
  }
  .icon-shortcut-arrow {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 13px;
    height: 13px;
    pointer-events: none;
  }
  .icon-tint {
    position: absolute;
    left: 0;
    top: 0;
    width: 32px;
    height: 32px;
    background-color: rgba(49, 106, 197, 0.45);
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    pointer-events: none;
  }

  .icon-rename-input {
    width: 80px;
    user-select: text;
    font-size: 11px;
    line-height: ${LABEL_LINE_H}px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    text-align: center;
    border: 1px solid #316ac5;
    padding: 1px 2px;
    outline: none;
    background: #fff;
    color: #000;
    text-shadow: none;
    /* Wraps and auto-grows so the whole name is visible while editing */
    resize: none;
    overflow: hidden;
    overflow-wrap: break-word;
    display: block;
  }
`;


