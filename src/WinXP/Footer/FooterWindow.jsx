import React, { useEffect, useRef, useState } from 'react';
import XPTooltip from 'components/XPTooltip';
import { setTaskbarButton } from '../shellBus';

/** One window's taskbar button. Registers its box so minimize can fly to it. */
export default function FooterWindow({
  id,
  icon,
  title,
  onMouseDown,
  onContextMenu,
  isFocus,
}) {
  const textRef = useRef(null);
  const buttonRef = useRef(null);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    setTaskbarButton(id, buttonRef.current);
    return () => setTaskbarButton(id, null);
  }, [id]);
  function _onMouseDown(e) {
    if (e.button !== 0) return;
    onMouseDown(id);
  }
  function _onContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(id, e.clientX, e.clientY);
  }
  function _onMouseEnter() {
    const el = textRef.current;
    setTruncated(!!el && el.scrollWidth > el.clientWidth);
  }
  return (
    <XPTooltip text={title} disabled={!truncated}>
      <div
        ref={buttonRef}
        onMouseDown={_onMouseDown}
        onContextMenu={_onContextMenu}
        onMouseEnter={_onMouseEnter}
        className={`footer__window ${isFocus ? 'focus' : 'cover'}`}
      >
        <img className="footer__icon" src={icon} alt={title} />
        <div ref={textRef} className="footer__text">
          {title}
        </div>
      </div>
    </XPTooltip>
  );
}
