import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  memo,
} from 'react';
import useWindowSize from 'react-use/lib/useWindowSize';
import styled from 'styled-components';

import { useElementResize } from 'hooks';
import {
  getTaskbarRect,
  setCloseInterceptor,
  getCloseInterceptor,
} from '../shellBus';
import HeaderButtons from './HeaderButtons';

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
  header,
  defaultSize,
  defaultOffset,
  resizable,
  maximized,
  minimized,
  minWidth,
  minHeight,
  component,
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
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  const { offset, size } = useElementResize(ref, {
    dragRef,
    defaultOffset,
    defaultSize,
    boundary: {
      top: 1,
      right: windowWidth - 1,
      bottom: windowHeight - 31,
      left: 1,
    },
    resizable,
    resizeThreshold: 10,
    minWidth,
    minHeight,
  });

  let width, height, x, y;
  if (maximized) {
    width = windowWidth + 6;
    height = windowHeight - 24;
    x = -3;
    y = -3;
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
        className={className}
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
        <header
          className="app__header"
          ref={dragRef}
          onDoubleClick={onDoubleClickHeader}
        >
          {header.icon && (
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
          {component({
            onClose: _onMouseUpClose,
            onMinimize: _onMouseUpMinimize,
            onShellOpen,
            onSetHeader,
            registerCloseInterceptor,
            isFocus,
            ...injectProps,
          })}
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
  position: absolute;
  padding: ${({ header }) => (header.invisible ? 0 : 3)}px;
  background-color: ${({ isFocus }) => (isFocus ? '#0831d9' : '#6582f5')};
  flex-direction: column;
  border-top-left-radius: ${({ maximized }) => (maximized ? 0 : 8)}px;
  border-top-right-radius: ${({ maximized }) => (maximized ? 0 : 8)}px;
  .header__bg {
    background: ${({ isFocus }) =>
      isFocus
        ? 'linear-gradient(to bottom,#0058ee 0%,#3593ff 4%,#288eff 6%,#127dff 8%,#036ffc 10%,#0262ee 14%,#0057e5 20%,#0054e3 24%,#0055eb 56%,#005bf5 66%,#026afe 76%,#0062ef 86%,#0052d6 92%,#0040ab 94%,#003092 100%)'
        : 'linear-gradient(to bottom, #7697e7 0%,#7e9ee3 3%,#94afe8 6%,#97b4e9 8%,#82a5e4 14%,#7c9fe2 17%,#7996de 25%,#7b99e1 56%,#82a9e9 81%,#80a5e7 89%,#7b96e1 94%,#7a93df 97%,#abbae3 100%)'};
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    height: 28px;
    pointer-events: none;
    border-top-left-radius: ${({ maximized }) => (maximized ? 0 : 8)}px;
    border-top-right-radius: ${({ maximized }) => (maximized ? 0 : 8)}px;
    overflow: hidden;
  }
  .header__bg:before {
    content: '';
    display: block;
    position: absolute;
    left: 0;
    opacity: ${({ isFocus }) => (isFocus ? 1 : 0.3)};
    background: linear-gradient(to right, #1638e6 0%, transparent 100%);
    top: 0;
    bottom: 0;
    width: 15px;
  }
  .header__bg:after {
    content: '';
    opacity: ${({ isFocus }) => (isFocus ? 1 : 0.4)};
    display: block;
    position: absolute;
    right: 0;
    background: linear-gradient(to left, #1638e6 0%, transparent 100%);
    top: 0;
    bottom: 0;
    width: 15px;
  }
  .app__header {
    display: ${({ header }) => (header.invisible ? 'none' : 'flex')};
    height: 25px;
    line-height: 25px;
    font-weight: 700;
    font-size: 13px;
    font-family: 'Trebuchet MS', Tahoma, sans-serif;
    text-shadow: 1px 1px #000;
    color: white;
    position: absolute;
    left: 3px;
    right: 3px;
    align-items: center;
  }
  .app__header__icon {
    width: 15px;
    height: 15px;
    margin-left: 1px;
    margin-right: 3px;
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
  .app__content {
    flex: 1;
    position: relative;
    margin-top: 25px;
    height: calc(100% - 25px);
  }
`;

const CaptionFly = styled.div`
  position: absolute;
  z-index: 100000;
  height: 28px;
  padding: 3px 5px 0 4px;
  display: flex;
  align-items: center;
  overflow: hidden;
  pointer-events: none;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
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
  font-weight: 700;
  font-size: 13px;
  font-family: 'Trebuchet MS', Tahoma, sans-serif;
  text-shadow: 1px 1px #000;
  color: white;
  img {
    width: 15px;
    height: 15px;
    margin-right: 3px;
    flex-shrink: 0;
  }
  div {
    overflow: hidden;
    white-space: nowrap;
  }
`;

export default Windows;
