import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  memo,
} from 'react';
import { useScreenSize } from '../screen';
import styled from 'styled-components';

import { useElementResize } from 'hooks';
import {
  getTaskbarRect,
  setCloseInterceptor,
  getCloseInterceptor,
} from '../shellBus';
import { TASKBAR_HEIGHT, WINDOW_FRAME_PADDING } from '../constants';
import HeaderButtons from './HeaderButtons';
import ProgramErrorBoundary from './ProgramErrorBoundary';
import { AppVolumeScope } from '../../context/VolumeContext';

const FLY_MS = 180;
const MAX_MS = 150;

function Windows({
  apps,
  onMouseDown,
  onClose,
  onMinimize,
  onMaximize,
  onShellOpen,
  onSetAppHeader,
  onSetGeometry,
  focusedAppId,
}) {
  return (
    <div style={{ position: 'relative', zIndex: 0 }}>
      {apps.map(app => (
        <StyledWindow
          show={!app.minimized}
          key={app.id}
          id={app.id}
          onMouseDown={onMouseDown}
          onMouseUpClose={onClose}
          onMouseUpMinimize={onMinimize}
          onMouseUpMaximize={onMaximize}
          onShellOpen={onShellOpen}
          onSetAppHeader={onSetAppHeader}
          onSetGeometry={onSetGeometry}
          isFocus={focusedAppId === app.id}
          {...app}
        />
      ))}
    </div>
  );
}

const Window = memo(function({
  injectProps,
  id,
  onMouseDown,
  onMouseUpClose,
  onMouseUpMinimize,
  onMouseUpMaximize,
  onShellOpen,
  onSetAppHeader,
  onSetGeometry,
  header,
  size: storedSize,
  offset: storedOffset,
  resizable,
  maximized,
  minimized,
  minWidth,
  minHeight,
  // The program's component, rendered as an element so its hooks belong to
  // its own fiber rather than the frame's
  component: Program,
  exePath,
  displayName,
  zIndex,
  isFocus,
  className,
}) {
  function _onMouseDown() {
    onMouseDown(id);
  }
  // Apps can register an async interceptor (e.g. "Save changes?") that
  // must resolve truthy before the window actually closes. It lives on the
  // shellBus so taskbar and Task Manager closes run it too (WM_CLOSE).
  const registerCloseInterceptor = useCallback(
    fn => setCloseInterceptor(id, fn),
    [id],
  );
  useEffect(() => () => setCloseInterceptor(id, null), [id]);
  function _onMouseUpClose() {
    const interceptor = getCloseInterceptor(id);
    if (interceptor) {
      Promise.resolve(interceptor()).then(ok => {
        if (ok) onMouseUpClose(id);
      });
    } else {
      onMouseUpClose(id);
    }
  }
  function _onMouseUpMinimize() {
    onMouseUpMinimize(id);
  }
  function _onMouseUpMaximize() {
    if (resizable) onMouseUpMaximize(id);
  }
  function onDoubleClickHeader(e) {
    if (e.target !== dragRef.current) return;
    _onMouseUpMaximize();
  }
  // Stable per-window callback letting the app set its own title/icon
  const onSetHeader = useCallback(
    patch => {
      if (onSetAppHeader) onSetAppHeader(id, patch);
    },
    [onSetAppHeader, id],
  );
  const dragRef = useRef(null);
  const ref = useRef(null);
  const { width: windowWidth, height: windowHeight } = useScreenSize();

  const onCommitGeometry = useCallback(
    geometry => onSetGeometry(id, geometry),
    [onSetGeometry, id],
  );
  // A program may size its own window (the mixer grows with its columns);
  // the position stays where the user left it
  const offsetRef = useRef(storedOffset);
  offsetRef.current = storedOffset;
  const onSetSize = useCallback(
    size => onSetGeometry(id, { offset: offsetRef.current, size }),
    [onSetGeometry, id],
  );
  const { offset, size } = useElementResize(ref, {
    dragRef,
    offset: storedOffset,
    size: storedSize,
    onCommit: onCommitGeometry,
    // Windows may be dragged anywhere above the taskbar
    boundary: {
      top: 1,
      right: windowWidth - 1,
      bottom: windowHeight - TASKBAR_HEIGHT - 1,
      left: 1,
    },
    resizable,
    resizeThreshold: 10,
    minWidth,
    minHeight,
  });

  let width, height, x, y;
  if (maximized) {
    // Fill the work area with the frame pulled just off-screen, so only
    // the content shows and the bottom edge lands on the taskbar
    width = windowWidth + 2 * WINDOW_FRAME_PADDING;
    height = windowHeight - TASKBAR_HEIGHT + 2 * WINDOW_FRAME_PADDING;
    x = -WINDOW_FRAME_PADDING;
    y = -WINDOW_FRAME_PADDING;
  } else {
    width = size.width;
    height = size.height;

    // 3. Safety Clamp: Ensure visual size never drops below minimum
    if (minWidth && width < minWidth) width = minWidth;
    if (minHeight && height < minHeight) height = minHeight;

    x = offset.x;
    y = offset.y;
  }

  const [fly, setFly] = useState(null);
  const [maxAnim, setMaxAnim] = useState(false);
  const prevMinimizedRef = useRef(minimized);
  const prevMaximizedRef = useRef(maximized);
  const flyRef = useRef(null);
  const flyKey = useRef(0);

  if (prevMaximizedRef.current !== maximized) {
    prevMaximizedRef.current = maximized;
    if (!minimized) setMaxAnim(true);
  }
  useEffect(() => {
    if (!maxAnim) return;
    const timer = setTimeout(() => setMaxAnim(false), MAX_MS + 30);
    return () => clearTimeout(timer);
  }, [maxAnim]);

  useLayoutEffect(() => {
    if (prevMinimizedRef.current === minimized) return;
    prevMinimizedRef.current = minimized;
    const node = ref.current;
    const button = getTaskbarRect(id);
    if (!node || !button || header.invisible) {
      setFly(null);
      return;
    }
    const parentRect = node.parentNode.getBoundingClientRect();
    const caption = { x, y, w: width };
    const target = {
      x: button.left - parentRect.left,
      y: button.top - parentRect.top,
      w: button.width,
    };
    flyKey.current += 1;
    setFly(
      minimized
        ? { key: flyKey.current, type: 'minimize', from: caption, to: target }
        : { key: flyKey.current, type: 'restore', from: target, to: caption },
    );
    // eslint-disable-next-line
  }, [minimized]);

  useLayoutEffect(() => {
    if (!fly) return;
    const el = flyRef.current;
    if (!el) return;
    el.getBoundingClientRect();
    el.style.transition = `left ${FLY_MS}ms linear, top ${FLY_MS}ms linear, width ${FLY_MS}ms linear`;
    el.style.left = `${fly.to.x}px`;
    el.style.top = `${fly.to.y}px`;
    el.style.width = `${fly.to.w}px`;
    const timer = setTimeout(() => setFly(null), FLY_MS + 20);
    return () => clearTimeout(timer);
  }, [fly]);
  return (
    <>
      <div
        className={`${className} xp-window`}
        ref={ref}
        onMouseDown={_onMouseDown}
        style={{
          transform: `translate(${x}px,${y}px)`,
          width: width ? `${width}px` : 'auto',
          height: height ? `${height}px` : 'auto',
          zIndex,
          ...(fly && fly.type === 'restore' ? { display: 'none' } : {}),
          ...(maxAnim
            ? {
                transition: `transform ${MAX_MS}ms ease-out, width ${MAX_MS}ms ease-out, height ${MAX_MS}ms ease-out`,
              }
            : {}),
        }}
      >
        <div className="header__bg" />
        {!header.invisible && (
          <>
            <div className="frame__left" />
            <div className="frame__right" />
            <div className="frame__bottom" />
          </>
        )}
        <header
          className="app__header"
          ref={dragRef}
          onDoubleClick={onDoubleClickHeader}
        >
          {header.icon && !header.noIcon && (
            <img
              onDoubleClick={_onMouseUpClose}
              src={header.icon}
              alt={header.title}
              className="app__header__icon"
              draggable={false}
            />
          )}
          <div className="app__header__title">{header.title}</div>
          <HeaderButtons
            buttons={header.buttons}
            onMaximize={_onMouseUpMaximize}
            onMinimize={_onMouseUpMinimize}
            onClose={_onMouseUpClose}
            maximized={maximized}
            resizable={resizable}
            isFocus={isFocus}
          />
        </header>
        <div className="app__content">
          <ProgramErrorBoundary title={header.title} onClose={_onMouseUpClose}>
            <AppVolumeScope
              appKey={exePath || displayName || header.title}
              name={displayName || header.title}
              icon={header.icon}
            >
              <Program
                onClose={_onMouseUpClose}
                onMinimize={_onMouseUpMinimize}
                onShellOpen={onShellOpen}
                onSetHeader={onSetHeader}
                onSetSize={onSetSize}
                registerCloseInterceptor={registerCloseInterceptor}
                isFocus={isFocus}
                {...injectProps}
              />
            </AppVolumeScope>
          </ProgramErrorBoundary>
        </div>
      </div>
      {fly && (
        <CaptionFly
          key={fly.key}
          ref={flyRef}
          style={{
            left: fly.from.x,
            top: fly.from.y,
            width: fly.from.w,
            transition: 'none',
          }}
        >
          {header.icon && <img src={header.icon} alt="" draggable={false} />}
          <div>{header.title}</div>
        </CaptionFly>
      )}
    </>
  );
});

const StyledWindow = styled(Window)`
  display: ${({ show }) => (show ? 'flex' : 'none')};
  /* property sheets wear the fixed 3px dialog frame instead of the sizing one */
  ${({ header }) =>
    header.dialogFrame
      ? `--xp-frame-w: var(--xp-dlg-frame-w, 3px);
         --xp-caption-total: var(--xp-dlg-caption-total, 29px);
         --xp-p-window-frameleft-1: var(--xp-p-window-frameleft-dlg-1, none);
         --xp-p-window-frameleft-2: var(--xp-p-window-frameleft-dlg-2, none);
         --xp-p-window-frameright-1: var(--xp-p-window-frameright-dlg-1, none);
         --xp-p-window-frameright-2: var(--xp-p-window-frameright-dlg-2, none);
         --xp-p-window-framebottom-1: var(--xp-p-window-framebottom-dlg-1, none);
         --xp-p-window-framebottom-2: var(--xp-p-window-framebottom-dlg-2, none);`
      : ''}
  position: absolute;
  image-rendering: pixelated;
  box-sizing: border-box;
  /* the caption band on top, the sizing border on the other three sides */
  padding: ${({ header }) =>
    header.invisible
      ? 0
      : 'var(--xp-caption-total, 29px) var(--xp-frame-w, 4px) var(--xp-frame-w, 4px)'};
  background-color: ${({ isFocus }) =>
    isFocus
      ? 'var(--xp-frame-active, transparent)'
      : 'var(--xp-frame-inactive, transparent)'};
  flex-direction: column;
  /* Luna: the style's caption bitmap; Classic: the scheme's gradient */
  .header__bg {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    height: var(--xp-caption-total, 29px);
    pointer-events: none;
    image-rendering: pixelated;
    background: ${({ isFocus }) =>
      isFocus
        ? 'var(--xp-caption-active, none)'
        : 'var(--xp-caption-inactive, none)'};
    border: 0 solid transparent;
    border-image: ${({ isFocus, maximized }) =>
      maximized
        ? `var(--xp-p-window-maxcaption-${isFocus ? 1 : 2}, none)`
        : `var(--xp-p-window-caption-${isFocus ? 1 : 2}, none)`};
  }
  .frame__left,
  .frame__right,
  .frame__bottom {
    position: absolute;
    pointer-events: none;
    border: 0 solid transparent;
    image-rendering: pixelated;
  }
  .frame__left,
  .frame__right {
    top: var(--xp-caption-total, 29px);
    bottom: var(--xp-frame-w, 4px);
    width: var(--xp-frame-w, 4px);
  }
  .frame__left {
    left: 0;
    border-image: ${({ isFocus }) =>
      `var(--xp-p-window-frameleft-${isFocus ? 1 : 2}, none)`};
  }
  .frame__right {
    right: 0;
    border-image: ${({ isFocus }) =>
      `var(--xp-p-window-frameright-${isFocus ? 1 : 2}, none)`};
  }
  .frame__bottom {
    left: 0;
    right: 0;
    bottom: 0;
    height: var(--xp-frame-w, 4px);
    border-image: ${({ isFocus }) =>
      `var(--xp-p-window-framebottom-${isFocus ? 1 : 2}, none)`};
  }
  .app__header {
    display: ${({ header }) => (header.invisible ? 'none' : 'flex')};
    position: absolute;
    top: var(--xp-frame-w, 4px);
    left: var(--xp-frame-w, 4px);
    right: var(--xp-frame-w, 4px);
    height: var(--xp-caption-h, 25px);
    line-height: var(--xp-caption-h, 25px);
    font-weight: 700;
    font-size: var(--xp-font-caption, 13px);
    font-family: var(--xp-caption-font, 'Trebuchet MS', Tahoma, sans-serif);
    text-shadow: 1px 1px var(--xp-caption-shadow, #000);
    color: ${({ isFocus }) =>
      isFocus
        ? 'var(--xp-caption-text, #fff)'
        : 'var(--xp-caption-text-inactive, #fff)'};
    align-items: center;
  }
  /* the system menu icon sits 10px in from the window's edge (SysButton) */
  .app__header__icon {
    width: 16px;
    height: 16px;
    margin-left: 6px;
    margin-right: 4px;
  }
  .app__header__title {
    flex: 1;
    pointer-events: none;
    padding-left: ${({ header }) => (header.icon ? 0 : 5)}px;
    padding-right: 5px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  /* the client area is opaque even where a program paints nothing */
  .app__content {
    flex: 1;
    background-color: var(--xp-face, #ece9d8);
    position: relative;
    min-height: 0;
  }
`;

const CaptionFly = styled.div`
  position: absolute;
  z-index: 100000;
  height: var(--xp-caption-total, 29px);
  padding: var(--xp-frame-w, 4px) 5px 0 10px;
  display: flex;
  align-items: center;
  overflow: hidden;
  pointer-events: none;
  box-sizing: border-box;
  background: var(--xp-caption-active, none);
  border: 0 solid transparent;
  border-image: var(--xp-p-window-caption-1, none);
  font-weight: 700;
  font-size: var(--xp-font-caption, 13px);
  font-family: var(--xp-caption-font, 'Trebuchet MS', Tahoma, sans-serif);
  text-shadow: 1px 1px var(--xp-caption-shadow, #000);
  color: var(--xp-caption-text, #fff);
  img {
    width: 16px;
    height: 16px;
    margin-right: 4px;
    flex-shrink: 0;
  }
  div {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

export default Windows;
