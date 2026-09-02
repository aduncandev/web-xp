import React, {
  cloneElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { menuFade } from '../menuFade';
import {
  portalRoot,
  screenSize,
  toLogical,
  toLogicalX,
  toLogicalY,
} from '../../WinXP/screen';

const SHOW_DELAY_MS = 500;
const AUTO_HIDE_MS = 5000;
const RESHOW_WINDOW_MS = 200;
const FADE_MS = 150;
const CURSOR_OFFSET_Y = 21;

// Shared across all tooltips: moving between adjacent controls right after
// a tip hides shows the next one without the initial delay, like Win32
let lastHiddenAt = 0;

/**
 * XP-style tooltip. Wraps a single element and shows the classic
 * #FFFFE1 box slightly below-right of the cursor after a hover delay.
 *
 *   <XPTooltip text="Volume"><img ... /></XPTooltip>
 */
export default function XPTooltip({ text, disabled, children }) {
  const [anchor, setAnchor] = useState(null);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const liveProps = useRef({ text, disabled });
  liveProps.current = { text, disabled };

  const hide = useCallback(() => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    setAnchor(a => {
      if (a) lastHiddenAt = Date.now();
      return null;
    });
  }, []);

  const show = useCallback(() => {
    if (liveProps.current.disabled || !liveProps.current.text) return;
    setAnchor({ ...mousePos.current });
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(hide, AUTO_HIDE_MS);
  }, [hide]);

  const onMouseEnter = useCallback(
    e => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      clearTimeout(showTimer.current);
      const delay =
        Date.now() - lastHiddenAt < RESHOW_WINDOW_MS ? 0 : SHOW_DELAY_MS;
      showTimer.current = setTimeout(show, delay);
    },
    [show],
  );

  const onMouseMove = useCallback(e => {
    mousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(
    () => () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    },
    [],
  );

  const child = React.Children.only(children);
  const chain = (theirs, ours) => e => {
    if (theirs) theirs(e);
    ours(e);
  };

  return (
    <>
      {cloneElement(child, {
        onMouseEnter: chain(child.props.onMouseEnter, onMouseEnter),
        onMouseMove: chain(child.props.onMouseMove, onMouseMove),
        onMouseLeave: chain(child.props.onMouseLeave, hide),
        onMouseDown: chain(child.props.onMouseDown, hide),
      })}
      {anchor && !disabled && text
        ? createPortal(
            <Tip x={anchor.x} y={anchor.y} text={text} />,
            portalRoot(),
          )
        : null}
    </>
  );
}

function Tip({ x, y, text }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = toLogical(rect.width);
    const h = toLogical(rect.height);
    const screen = screenSize();
    const lx = toLogicalX(x);
    const ly = toLogicalY(y);
    let left = lx + 2;
    let top = ly + CURSOR_OFFSET_Y;
    if (left + w > screen.width - 2) {
      left = screen.width - 2 - w;
    }
    if (left < 0) left = 0;
    if (top + h > screen.height - 2) {
      top = ly - h - 2;
    }
    if (top < 0) top = 0;
    setPos({ left, top });
  }, [x, y, text]);

  return (
    <Bubble
      ref={ref}
      style={
        pos
          ? { left: pos.left, top: pos.top }
          : { left: x + 2, top: y + CURSOR_OFFSET_Y, visibility: 'hidden' }
      }
    >
      {text}
    </Bubble>
  );
}

const Bubble = styled.div`
  position: fixed;
  z-index: 100000;
  padding: 2px 4px 3px;
  background: var(--xp-info, #ffffe1);
  border: 1px solid #000;
  color: var(--xp-info-text, #000);
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: var(--xp-font-ui, 11px);
  line-height: 13px;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
  box-shadow: 2px 2px 3px rgba(0, 0, 0, 0.3);
  animation: ${menuFade} ${FADE_MS}ms;
`;
