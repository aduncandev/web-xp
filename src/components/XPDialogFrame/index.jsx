import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

import { playSystemSound } from 'WinXP/sounds';
import { TASKBAR_HEIGHT } from 'WinXP/constants';
import { lunaScrollbars } from '../lunaScrollbars';
import {
  portalRoot,
  screenSize,
  toLogical,
  toLogicalX,
  toLogicalY,
} from '../../WinXP/screen';

/**
 * Draggable modal XP dialog window (no taskbar entry, close button only).
 * Chrome matches the real app windows (StyledWindow in WinXP/Windows).
 *
 * Props:
 *  - title: title bar text
 *  - width: fixed width in px (optional; content decides otherwise)
 *  - onClose: called when the close (X) button is clicked
 *  - onKeyDown: key handler attached to the frame (Escape/Enter handling)
 *  - zIndex: overlay z-index (default 99990)
 *
 * Clicking outside the dialog flashes the title bar and dings, like a
 * real modal dialog blocking its owner window.
 */
export default function XPDialogFrame({
  title,
  width,
  onClose,
  onKeyDown,
  zIndex = 99990,
  help = false,
  children,
}) {
  const frameRef = useRef(null);
  const dragOffsetRef = useRef({ dx: 0, dy: 0 });
  const [pos, setPos] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  // pin the centred position to whole pixels, or the bitmaps blur
  useLayoutEffect(() => {
    if (pos || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    setPos({
      x: Math.round(toLogicalX(rect.left)),
      y: Math.round(toLogicalY(rect.top)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onHeaderMouseDown = e => {
    if (e.button !== 0 || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      dx: toLogical(e.clientX - rect.left),
      dy: toLogical(e.clientY - rect.top),
    };
    setPos({ x: toLogicalX(rect.left), y: toLogicalY(rect.top) });
    setDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (!dragging) return undefined;
    const onMove = e => {
      const { dx, dy } = dragOffsetRef.current;
      const w = frameRef.current ? frameRef.current.offsetWidth : 200;
      const screen = screenSize();
      let x = Math.round(toLogicalX(e.clientX) - dx);
      let y = Math.round(toLogicalY(e.clientY) - dy);
      // Title bar must stay reachable, above the taskbar
      y = Math.max(0, Math.min(y, screen.height - TASKBAR_HEIGHT));
      x = Math.max(60 - w, Math.min(x, screen.width - 60));
      setPos({ x, y });
    };
    const onUp = () => setDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const onBlockedClick = useCallback(e => {
    if (e.target !== e.currentTarget) return;
    setFlashKey(k => k + 1);
    playSystemSound('ding');
  }, []);

  const posStyle = pos
    ? { left: pos.x, top: pos.y }
    : { left: '50%', top: '45%', transform: 'translate(-50%, -50%)' };

  return createPortal(
    <Overlay style={{ zIndex }} onMouseDown={onBlockedClick}>
      <Frame
        ref={frameRef}
        style={{ ...posStyle, width }}
        onKeyDown={onKeyDown}
      >
        <div
          key={flashKey}
          className={
            flashKey ? 'xpdlg-header-bg xpdlg-flash' : 'xpdlg-header-bg'
          }
        />
        <div className="xpdlg-frame xpdlg-frame--l" />
        <div className="xpdlg-frame xpdlg-frame--r" />
        <div className="xpdlg-frame xpdlg-frame--b" />
        <header className="xpdlg-header" onMouseDown={onHeaderMouseDown}>
          <div className="xpdlg-title">{title}</div>
          {help && (
            <button
              className="xpdlg-close xpdlg-help"
              type="button"
              onMouseDown={e => e.stopPropagation()}
            />
          )}
          <button
            className="xpdlg-close"
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={onClose}
          />
        </header>
        <div className="xpdlg-content">{children}</div>
      </Frame>
    </Overlay>,
    portalRoot(),
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
`;

const Frame = styled.div.attrs({ className: 'xpdlg' })`
  /* the fixed dialog frame: 3px sides, and Luna's frame bitmaps cut for it */
  --xp-frame-w: var(--xp-dlg-frame-w, 4px);
  --xp-caption-total: var(--xp-dlg-caption-total, 29px);
  --xp-p-window-frameleft-1: var(--xp-p-window-frameleft-dlg-1, none);
  --xp-p-window-frameright-1: var(--xp-p-window-frameright-dlg-1, none);
  --xp-p-window-framebottom-1: var(--xp-p-window-framebottom-dlg-1, none);
  position: fixed;
  image-rendering: pixelated;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: var(--xp-caption-total, 29px) var(--xp-frame-w, 4px)
    var(--xp-frame-w, 4px);
  background-color: var(--xp-frame-active, transparent);
  box-shadow: 2px 4px 8px rgba(0, 0, 0, 0.5);
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  user-select: none;
  /* Portaled dialogs sit outside the desktop container, so they carry
     their own copy of the Luna scrollbar chrome */
  ${lunaScrollbars}

  .xpdlg-header-bg {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    height: var(--xp-caption-total, 29px);
    pointer-events: none;
    background: var(--xp-caption-active, none);
    image-rendering: pixelated;
    border: 0 solid transparent;
    border-image: var(--xp-p-window-caption-1, none);
  }
  .xpdlg-frame {
    position: absolute;
    pointer-events: none;
    border: 0 solid transparent;
    image-rendering: pixelated;
  }
  .xpdlg-frame--l,
  .xpdlg-frame--r {
    top: var(--xp-caption-total, 29px);
    bottom: var(--xp-frame-w, 4px);
    width: var(--xp-frame-w, 4px);
  }
  .xpdlg-frame--l {
    left: 0;
    border-image: var(--xp-p-window-frameleft-1, none);
  }
  .xpdlg-frame--r {
    right: 0;
    border-image: var(--xp-p-window-frameright-1, none);
  }
  .xpdlg-frame--b {
    left: 0;
    right: 0;
    bottom: 0;
    height: var(--xp-frame-w, 4px);
    border-image: var(--xp-p-window-framebottom-1, none);
  }
  .xpdlg-flash {
    animation: xpdlgTitleFlash 0.12s linear 4;
  }
  @keyframes xpdlgTitleFlash {
    0%,
    100% {
      filter: none;
    }
    50% {
      filter: saturate(0.25) brightness(1.4);
    }
  }

  .xpdlg-header {
    position: absolute;
    top: var(--xp-frame-w, 4px);
    left: var(--xp-frame-w, 4px);
    right: var(--xp-frame-w, 4px);
    height: var(--xp-caption-h, 25px);
    display: flex;
    align-items: center;
    z-index: 1;
  }
  .xpdlg-title {
    flex: 1;
    color: var(--xp-caption-text, #fff);
    font-weight: 700;
    font-size: var(--xp-font-caption, 13px);
    font-family: var(--xp-caption-font, 'Trebuchet MS', Tahoma, sans-serif);
    text-shadow: 1px 1px var(--xp-caption-shadow, #000);
    padding-left: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
  }
  .xpdlg-close {
    width: 21px;
    height: 21px;
    align-self: flex-start;
    margin-top: 1px;
    position: relative;
    cursor: default;
    padding: 0;
    flex-shrink: 0;
    border: 0 solid transparent;
    border-image: var(--xp-p-window-closebutton-1, none);
    background: transparent;
    image-rendering: pixelated;
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--xp-g-window-closebutton-1, none) center no-repeat;
      image-rendering: pixelated;
      pointer-events: none;
    }
    &:hover {
      border-image: var(--xp-p-window-closebutton-2, none);
    }
    &:hover::after {
      background-image: var(--xp-g-window-closebutton-2, none);
    }
    &:hover:active {
      border-image: var(--xp-p-window-closebutton-3, none);
    }
    &:hover:active::after {
      background-image: var(--xp-g-window-closebutton-3, none);
    }
  }
  .xpdlg-help {
    margin-right: 2px;
    border-image: var(--xp-p-window-helpbutton-1, none);
  }
  .xpdlg-help::after {
    background-image: var(--xp-g-window-helpbutton-1, none);
  }
  .xpdlg-help:hover {
    border-image: var(--xp-p-window-helpbutton-2, none);
  }
  .xpdlg-help:hover::after {
    background-image: var(--xp-g-window-helpbutton-2, none);
  }
  .xpdlg-help:hover:active {
    border-image: var(--xp-p-window-helpbutton-3, none);
  }
  .xpdlg-help:hover:active::after {
    background-image: var(--xp-g-window-helpbutton-3, none);
  }
  .xpdlg-content {
    flex: 1;
    background-color: var(--xp-face, #ece9d8);
  }
`;
