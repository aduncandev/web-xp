import React, {
  useReducer,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import styled, { keyframes } from 'styled-components';
import useMouse from 'react-use/lib/useMouse';

import {
  ADD_APP,
  DEL_APP,
  FOCUS_APP,
  MINIMIZE_APP,
  TOGGLE_MAXIMIZE_APP,
  FOCUS_ICON,
  SELECT_ICONS,
  FOCUS_DESKTOP,
  START_SELECT,
  END_SELECT,
  POWER_OFF,
  UPDATE_APP_HEADER,
  MINIMIZE_ALL,
  CASCADE_WINDOWS,
  TILE_WINDOWS_HORIZONTALLY,
  TILE_WINDOWS_VERTICALLY,
  SET_APP_GEOMETRY,
} from './constants/actions';
import { FOCUSING, POWER_STATE } from './constants';
import { SHELL_WINDOWS, getProgramByPath } from './apps';
import { isMobileUA } from './apps/compat';
import { resolveLaunchLayout } from './apps/layout';
import { reducer, initState } from './reducer';
import { WallpaperHijackContext } from './wallpaperHijack';
import Modal from './Modal';
import Footer from './Footer';
import Windows from './Windows';
import Icons from './Icons';

import bliss from 'assets/windowsIcons/wallpaper.jpeg';
import { useVolume } from '../context/VolumeContext';
import { SessionActiveContext } from './sessionAudio';
import { useVFS } from '../context/VFSContext';
import { useDialog } from '../context/DialogContext';
import { SPECIAL_FOLDERS, EXE_PATHS } from '../context/vfsConstants';
import RunDialog from '../components/RunDialog';
import OpenWithDialog from '../components/OpenWithDialog';
import useExtraction from '../components/ExtractionWizard/useExtraction';
import ScreenSaverHost from '../components/ScreenSaver';
import { createShellOpen } from './shell/open';
import { useWallpaper } from './useWallpaper';
import { useScreenSaver } from './useScreenSaver';
import { useStartMenuData } from './useStartMenuData';
import { useHostDrop } from './useHostDrop';
import { useOpenWith } from './useOpenWith';
import { usePowerFlow } from './usePowerFlow';
import {
  ARRANGE,
  publishWindows,
  registerWindowHandlers,
  unregisterWindowHandlers,
  getCloseInterceptor,
} from './shellBus';
import { lunaScrollbars } from '../components/lunaScrollbars';

// The reducer action each taskbar arrangement maps to
const ARRANGE_ACTIONS = {
  [ARRANGE.CASCADE]: CASCADE_WINDOWS,
  [ARRANGE.TILE_HORIZONTAL]: TILE_WINDOWS_HORIZONTALLY,
  [ARRANGE.TILE_VERTICAL]: TILE_WINDOWS_VERTICALLY,
  [ARRANGE.SHOW_DESKTOP]: MINIMIZE_ALL,
};

function WinXP({
  userName,
  onLogoff,
  onShutdown,
  onRestart,
  onSwitchUser,
  onOpenAppsChange,
  active = true,
}) {
  const [state, dispatch] = useReducer(reducer, initState);
  const ref = useRef(null);
  const mouse = useMouse(ref);

  // Right-clicks on the bare desktop land on this container (the icon layer
  // is pointer-events: none), so relay them to Icons for its context menu.
  // The sequence number is what makes each click a fresh event.
  const [desktopContextMenuEvent, setDesktopContextMenuEvent] = useState(null);
  const desktopMenuSeq = useRef(0);

  const { applyVolume } = useVolume();
  const vfs = useVFS();
  // This session's own desktop dressing and Start menu, read from its
  // user's profile rather than whoever happens to be on screen
  const screenSaver = useScreenSaver(vfs, userName);
  const wallpaper = useWallpaper(vfs, userName);
  const { allProgramsData, recentDocumentsData } = useStartMenuData(
    vfs,
    userName,
  );
  const dlg = useDialog();
  const [runOpen, setRunOpen] = useState(false);
  // Self-reference so shortcut resolution can recurse with a stable identity
  const shellOpenRef = useRef(null);
  // Extract All..., wherever it is started from
  const zipExtraction = useExtraction(vfs, path => shellOpenRef.current(path));
  const hostDrop = useHostDrop(vfs, dlg);

  // Fast user switching keeps this session mounted while another user is on
  // screen. Silence its <audio>/<video> while it is not the active session
  // (the console session owns the speakers in XP), and restore on return.
  // Web Audio apps can't be reached this way — they read SessionActiveContext.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll('audio, video').forEach(el => {
      if (active) {
        delete el.dataset.forceMute;
        applyVolume(el);
      } else {
        el.dataset.forceMute = '1';
        el.muted = true;
      }
    });
  }, [active, applyVolume]);

  const getFocusedAppId = useCallback(() => {
    if (state.focusing !== FOCUSING.WINDOW) return -1;
    const focusedApp = [...state.apps]
      .filter(app => !app.minimized)
      .sort((a, b) => b.zIndex - a.zIndex)[0];
    return focusedApp ? focusedApp.id : -1;
  }, [state.apps, state.focusing]);

  const focusedAppId = getFocusedAppId();

  const power = usePowerFlow({
    dispatch,
    dlg,
    openWindowCount: state.apps.length,
    onLogoff,
    onShutdown,
    onRestart,
    onSwitchUser,
  });
  const { runPowerAction } = power;

  // --- shellBus: expose windows to task-management UIs (Task Manager) ---
  // Only the ACTIVE session drives the (global) bus; a backgrounded Fast
  // User Switching session must not clobber the foreground one's handlers.
  useEffect(() => {
    if (!active) return undefined;
    const handlers = {
      // WM_CLOSE: the window's 'Save changes?' interceptor may cancel it —
      // unless force (Task Manager End Task), which kills it outright.
      close: (id, force) => {
        const interceptor = force ? null : getCloseInterceptor(id);
        if (interceptor) {
          Promise.resolve(interceptor()).then(ok => {
            if (ok) dispatch({ type: DEL_APP, payload: id });
          });
        } else {
          dispatch({ type: DEL_APP, payload: id });
        }
      },
      focus: id => dispatch({ type: FOCUS_APP, payload: id }),
      minimize: id => dispatch({ type: MINIMIZE_APP, payload: id }),
      toggleMaximize: id =>
        dispatch({ type: TOGGLE_MAXIMIZE_APP, payload: id }),
      arrange: (kind, workArea) => {
        const type = ARRANGE_ACTIONS[kind];
        if (type) dispatch({ type, payload: workArea });
      },
      // A program asked to shut down / restart / log off (cmd `shutdown`).
      power: runPowerAction,
    };
    registerWindowHandlers(handlers);
    // Only our own handlers come down with us: the session taking over may
    // already have installed its set by the time this cleanup runs.
    return () => unregisterWindowHandlers(handlers);
  }, [active, runPowerAction]);
  useEffect(() => {
    if (!active) return;
    publishWindows(
      state.apps.map(app => ({
        id: app.id,
        title: app.header.title,
        icon: app.header.icon,
        // Which program this window is. Shell surfaces (folder windows,
        // My Computer) have no registry entry and so carry none.
        exePath: app.exePath || null,
        minimized: !!app.minimized,
        maximized: !!app.maximized,
        // Error boxes and the Dog Virus keep off the taskbar; Task Manager
        // leaves them off its Applications tab too
        hidden: !!app.header.noFooterWindow,
        focused: app.id === focusedAppId,
      })),
    );
  }, [state.apps, focusedAppId, active]);

  // The Welcome screen shows "N programs running." under backgrounded
  // sessions (Fast User Switching), so report this session's count up.
  useEffect(() => {
    if (onOpenAppsChange) onOpenAppsChange(userName, state.apps.length);
  }, [state.apps.length, onOpenAppsChange, userName]);

  const onFocusApp = useCallback(
    id => dispatch({ type: FOCUS_APP, payload: id }),
    [],
  );
  const onMaximizeWindow = useCallback(
    id => dispatch({ type: TOGGLE_MAXIMIZE_APP, payload: id }),
    [],
  );
  const onMinimizeWindow = useCallback(
    id => dispatch({ type: MINIMIZE_APP, payload: id }),
    [],
  );
  const onCloseApp = useCallback(
    id => dispatch({ type: DEL_APP, payload: id }),
    [],
  );
  const onSetAppHeader = useCallback(
    (id, patch) =>
      dispatch({ type: UPDATE_APP_HEADER, payload: { id, patch } }),
    [],
  );
  // The frame reports where a drag or resize left the window
  const onSetAppGeometry = useCallback(
    (id, geometry) =>
      dispatch({ type: SET_APP_GEOMETRY, payload: { id, ...geometry } }),
    [],
  );

  /** Open a window for a registry entry; `overrides` ({ size, offset }) place it. */
  const launchProgram = useCallback(
    (entry, injectProps = {}, overrides = {}) => {
      dispatch({
        type: ADD_APP,
        payload: { ...resolveLaunchLayout(entry, overrides), injectProps },
      });
    },
    [],
  );

  const openErrorBox = useCallback(
    (message, title) => {
      launchProgram(
        {
          ...SHELL_WINDOWS.error,
          // The window chrome title comes from the header, not injectProps
          header: title
            ? { ...SHELL_WINDOWS.error.header, title }
            : SHELL_WINDOWS.error.header,
        },
        title ? { message, title } : { message },
      );
    },
    [launchProgram],
  );

  useEffect(() => {
    if (isMobileUA()) {
      openErrorBox(
        'Mobile Device Detected:\n\nThis application is designed for desktop use and may not function correctly on mobile devices or small screens.\n\nPlease access this page on a desktop computer for the best experience.',
        'Compatibility Warning',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openWithFlow = useOpenWith({
    vfs,
    userName,
    launchProgram,
    shellOpenRef,
  });
  const { openWith, setOpenWith } = openWithFlow;

  /**
   * The one launch path. Everything the shell opens — desktop icons, Start
   * Menu entries, file associations, the Run box, cmd's `start` — resolves
   * through the VFS: sentinels ('My Computer'/'RecycleBin'), web URLs,
   * folders (Explorer window), .exe nodes (program registry), documents
   * (association's program with { filePath }).
   */
  const shellOpen = useMemo(
    () =>
      createShellOpen({
        vfs,
        dlg,
        userName,
        launchProgram,
        openErrorBox,
        getProgramByPath,
        setOpenWith,
        reopen: (t, o) => shellOpenRef.current(t, o),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vfs, dlg, userName, launchProgram, openErrorBox],
  );
  shellOpenRef.current = shellOpen;

  function onMouseDownFooterApp(id) {
    const app = state.apps.find(a => a.id === id);
    if (app) {
      if (app.id === focusedAppId && !app.minimized) {
        dispatch({ type: MINIMIZE_APP, payload: id });
      } else {
        dispatch({ type: FOCUS_APP, payload: id });
      }
    }
  }

  function onMouseDownIcon(path) {
    dispatch({ type: FOCUS_ICON, payload: path });
  }

  function onDoubleClickIcon(path) {
    shellOpen(path);
  }

  function onMouseDownFooter() {
    dispatch({ type: FOCUS_DESKTOP });
  }

  function onClickMenuItem(itemName) {
    // Dynamic Start Menu entries carry 'open:<vfs path>' actions
    if (typeof itemName === 'string' && itemName.startsWith('open:')) {
      shellOpen(itemName.slice('open:'.length));
      return;
    }
    switch (itemName) {
      case 'My Computer':
        shellOpen('My Computer');
        break;
      case 'My Documents':
        shellOpen(SPECIAL_FOLDERS.MY_DOCUMENTS);
        break;
      case 'My Pictures':
        shellOpen(SPECIAL_FOLDERS.MY_PICTURES);
        break;
      case 'My Music':
        shellOpen(SPECIAL_FOLDERS.MY_MUSIC);
        break;
      case 'Control Panel':
        shellOpen(EXE_PATHS.CONTROL);
        break;
      case 'Run...':
        setRunOpen(true);
        break;
      case 'Log Off':
        dispatch({ type: POWER_OFF, payload: POWER_STATE.LOG_OFF });
        break;
      case 'Turn Off Computer':
        dispatch({ type: POWER_OFF, payload: POWER_STATE.TURN_OFF });
        break;
      default:
        openErrorBox(`C:\\\nApplication '${itemName}' not found`);
    }
  }

  function onMouseDownDesktop(e) {
    if (e.target === e.currentTarget && e.button === 0) {
      // Ctrl + rubber-band toggles against the existing selection, so the
      // start payload carries the modifier and the pre-drag selection
      dispatch({
        type: START_SELECT,
        payload: {
          x: mouse.docX,
          y: mouse.docY,
          ctrl: e.ctrlKey,
          base: e.ctrlKey ? state.focusedIconPaths : null,
        },
      });
    }
  }
  function onMouseUpDesktop() {
    if (state.selecting) {
      dispatch({ type: END_SELECT });
    }
  }
  const onIconsSelected = useCallback(
    iconIds => dispatch({ type: SELECT_ICONS, payload: iconIds }),
    [],
  );

  return (
    <SessionActiveContext.Provider value={active}>
      <WallpaperHijackContext.Provider value={wallpaper.hijack}>
        <Container
          ref={ref}
          onMouseUp={onMouseUpDesktop}
          onMouseDown={onMouseDownDesktop}
          onDragOver={hostDrop.onDragOver}
          onDrop={hostDrop.onDrop}
          onContextMenu={e => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              desktopMenuSeq.current += 1;
              setDesktopContextMenuEvent({
                x: e.clientX,
                y: e.clientY,
                id: desktopMenuSeq.current,
              });
            }
          }}
          state={state.powerState}
          style={wallpaper.style}
        >
          <Icons
            userName={userName}
            active={active}
            focusedIconPaths={state.focusedIconPaths}
            onMouseDown={onMouseDownIcon}
            onDoubleClick={onDoubleClickIcon}
            onShellOpen={shellOpen}
            onExtractZip={zipExtraction.extract}
            displayFocus={state.focusing === FOCUSING.ICON}
            mouse={mouse}
            selecting={state.selecting}
            setSelectedIcons={onIconsSelected}
            desktopContextMenuEvent={desktopContextMenuEvent}
          />
          {state.selecting && (
            <SelectionBox
              style={{
                left: Math.min(state.selecting.x, mouse.docX),
                top: Math.min(state.selecting.y, mouse.docY),
                width: Math.abs(state.selecting.x - mouse.docX),
                height: Math.abs(state.selecting.y - mouse.docY),
              }}
            />
          )}
          <Windows
            apps={state.apps}
            onMouseDown={onFocusApp}
            onClose={onCloseApp}
            onMinimize={onMinimizeWindow}
            onMaximize={onMaximizeWindow}
            onShellOpen={shellOpen}
            onSetAppHeader={onSetAppHeader}
            onSetGeometry={onSetAppGeometry}
            focusedAppId={focusedAppId}
          />
          <Footer
            userName={userName}
            apps={state.apps}
            onMouseDownApp={onMouseDownFooterApp}
            focusedAppId={focusedAppId}
            onMouseDown={onMouseDownFooter}
            onClickMenuItem={onClickMenuItem}
            allProgramsData={allProgramsData}
            recentDocumentsData={recentDocumentsData}
          />
          {/* Idles into the user's screen saver; only the live session arms */}
          <ScreenSaverHost
            config={screenSaver.config}
            pictures={screenSaver.pictures}
            active={active}
          />
          {runOpen && (
            <RunDialog onClose={() => setRunOpen(false)} onRun={shellOpen} />
          )}
          {zipExtraction.element}
          {openWith && (
            <OpenWithDialog
              path={openWith.path}
              unknown={openWith.unknown}
              onClose={() => setOpenWith(null)}
              onLaunch={openWithFlow.onLaunch}
            />
          )}
          {state.powerState !== POWER_STATE.START && (
            <Modal
              onClose={power.onDialogClose}
              onClickButton={power.onDialogButton}
              mode={state.powerState}
            />
          )}
        </Container>
      </WallpaperHijackContext.Provider>
    </SessionActiveContext.Provider>
  );
}

// Luna-style desktop rubber band (replaces the old dashed marquee)
const SelectionBox = styled.div`
  position: absolute;
  border: 1px solid #316ac5;
  background-color: rgba(49, 106, 197, 0.3);
  pointer-events: none;
`;

const powerOffAnimation = keyframes` 0% { filter: brightness(1) grayscale(0); } 100% { filter: brightness(0.6) grayscale(1); } `;
const animation = {
  [POWER_STATE.START]: '',
  [POWER_STATE.TURN_OFF]: powerOffAnimation,
  [POWER_STATE.LOG_OFF]: powerOffAnimation,
};

// Cursors stay native: url() cursors cannot follow portaled surfaces
// (menus, dialogs, tooltips render outside this container), so custom art
// flickers against the host arrow instead of replacing it.
const Container = styled.div`
  font-family: Tahoma, 'Noto Sans', sans-serif;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
  background: url(${bliss}) no-repeat center center fixed;
  background-size: cover;
  animation: ${({ state }) => animation[state]} 3s ease-out 0.8s forwards;
  cursor: default;
  *:not(input):not(textarea) {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }
  /* XP cursor defaults: I-beam only over text entry (the real XP beam is an
     XOR-inverting .cur browsers cannot render; the native 'text' beam is the
     same classic glyph), hand only over true hyperlinks. */
  & input:not([type]),
  & input[type='text'],
  & input[type='password'],
  & input[type='search'],
  & input[type='number'],
  & input[type='email'],
  & input[type='url'],
  & textarea,
  & [contenteditable='true'] {
    cursor: text;
  }
  /* Chrome's UA sheet pins form controls to the host arrow; XP shows its own */
  & button,
  & select,
  & input[type='button'],
  & input[type='submit'],
  & input[type='reset'],
  & input[type='checkbox'],
  & input[type='radio'],
  & input[type='range'] {
    cursor: default;
  }
  & a[href] {
    cursor: pointer;
  }
  & .xp-cursor-busy,
  & .xp-cursor-busy * {
    cursor: wait;
  }
  & .xp-cursor-appstarting,
  & .xp-cursor-appstarting * {
    cursor: progress;
  }
  /* Luna scrollbars, shared with the portaled dialogs */
  ${lunaScrollbars}
`;
export default WinXP;
