import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

import { playSystemSound } from 'WinXP/sounds';
import { TASKBAR_HEIGHT } from 'WinXP/constants';
import { lunaScrollbars } from '../lunaScrollbars';

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
  children,
}) {
  const frameRef = useRef(null);
  const dragOffsetRef = useRef({ dx: 0, dy: 0 });
  const [pos, setPos] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  const onHeaderMouseDown = e => {
    if (e.button !== 0 || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
    };
    setPos({ x: rect.left, y: rect.top });
    setDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (!dragging) return undefined;
    const onMove = e => {
      const { dx, dy } = dragOffsetRef.current;
      const w = frameRef.current ? frameRef.current.offsetWidth : 200;
      let x = e.clientX - dx;
      let y = e.clientY - dy;
      // Title bar must stay reachable, above the taskbar
      y = Math.max(0, Math.min(y, window.innerHeight - TASKBAR_HEIGHT));
      x = Math.max(60 - w, Math.min(x, window.innerWidth - 60));
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
        <header className="xpdlg-header" onMouseDown={onHeaderMouseDown}>
          <div className="xpdlg-title">{title}</div>
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
    document.body,
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
`;

const Frame = styled.div`
  position: fixed;
  display: flex;
  flex-direction: column;
  padding: 3px;
  background-color: #0831d9;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
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
    height: 28px;
    pointer-events: none;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    overflow: hidden;
    background: linear-gradient(
      to bottom,
      #0058ee 0%,
      #3593ff 4%,
      #288eff 6%,
      #127dff 8%,
      #036ffc 10%,
      #0262ee 14%,
      #0057e5 20%,
      #0054e3 24%,
      #0055eb 56%,
      #005bf5 66%,
      #026afe 76%,
      #0062ef 86%,
      #0052d6 92%,
      #0040ab 94%,
      #003092 100%
    );
    &:before {
      content: '';
      display: block;
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 15px;
      background: linear-gradient(to right, #1638e6 0%, transparent 100%);
    }
    &:after {
      content: '';
      display: block;
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 15px;
      background: linear-gradient(to left, #1638e6 0%, transparent 100%);
    }
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
    position: relative;
    height: 25px;
    display: flex;
    align-items: center;
    z-index: 1;
  }
  .xpdlg-title {
    flex: 1;
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    font-family: 'Trebuchet MS', Tahoma, sans-serif;
    text-shadow: 1px 1px #000;
    padding-left: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
  }
  .xpdlg-close {
    width: 22px;
    height: 22px;
    border: 1px solid white;
    border-radius: 3px;
    position: relative;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    box-shadow: inset 0 -1px 2px 1px #da4600;
    background-image: radial-gradient(
      circle at 90% 90%,
      #cc4600 0%,
      #dc6527 55%,
      #cd7546 70%,
      #ffccb2 90%,
      white 100%
    );
    &:hover {
      filter: brightness(120%);
    }
    &:active {
      filter: brightness(90%);
    }
    &:before,
    &:after {
      content: '';
      position: absolute;
      left: 9px;
      top: 2px;
      height: 16px;
      width: 2px;
      background-color: white;
    }
    &:before {
      transform: rotate(45deg);
    }
    &:after {
      transform: rotate(-45deg);
    }
  }
  .xpdlg-content {
    flex: 1;
    background-color: #ece9d8;
  }
`;
