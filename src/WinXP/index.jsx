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
  CANCEL_POWER_OFF,
  UPDATE_APP_HEADER,
} from './constants/actions';
import { FOCUSING, POWER_STATE } from './constants';
import { SHELL_WINDOWS, getProgramByPath } from './apps';
import { recordProgramLaunch } from './startMenuConfig';
import { reducer, initState } from './reducer';
import { WallpaperHijackContext } from './wallpaperHijack';
import Modal from './Modal';
import Footer from './Footer';
import Windows from './Windows';
import Icons from './Icons';

import xpLogoffSoundSrc from 'assets/sounds/xp_logoff.wav';
import xpShutdownSoundSrc from 'assets/sounds/xp_shutdown.wav';
import wallpaper from 'assets/windowsIcons/wallpaper.jpeg';
import emptyIcon from 'assets/empty.png';
import { getArt } from '../xpArt';
import { useVolume } from '../context/VolumeContext';
import { SessionActiveContext } from './sessionAudio';
import { useVFS } from '../context/VFSContext';
import { useDialog } from '../context/DialogContext';
import {
  getCurrentUserName,
  getUserSetting,
  subscribeUserSettings,
} from '../context/users';
import {
  getFileAssociation,
  SPECIAL_FOLDERS,
  EXE_PATHS,
  isExecutablePath,
} from '../context/vfsConstants';
import RunDialog from '../components/RunDialog';
import OpenWithDialog from '../components/OpenWithDialog';
import useExtraction from '../components/ExtractionWizard/useExtraction';
import ScreenSaverHost, {
  readScreenSaverConfig,
} from '../components/ScreenSaver';
import { getExtension } from '../context/vfsUtils';
import { createShellOpen } from './shell/open';
import { playSystemSound, registerVolumeAdapter } from './sounds';
import {
  publishWindows,
  registerWindowHandlers,
  getCloseInterceptor,
} from './shellBus';
import { extractOsFiles, importOsFiles } from './osImport';
import { DND_TYPE, readDndPaths } from './shell/Explorer/helpers';
import { dropMoveInto } from './shell/move';

const playSound = (soundSrc, applyVolume) => {
  if (!soundSrc) return;
  try {
    const audio = new Audio(soundSrc);
    if (typeof applyVolume === 'function') {
      applyVolume(audio);
    }
    audio.play().catch(() => {});
  } catch (error) {
    // Failed to play sound
  }
};

const isMobile = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return (
    /android/i.test(userAgent) ||
    (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream)
  );
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
  const [desktopContextMenuEvent, setDesktopContextMenuEvent] = useState(null);

  const { applyVolume } = useVolume();
  // Refs so the shellBus power handler (registered once) always calls the
  // current App power callbacks (cmd `shutdown` routes through here).
  const powerRef = useRef({ onLogoff, onShutdown, onRestart });
  powerRef.current = { onLogoff, onShutdown, onRestart };
  const vfs = useVFS();
  // The saver config, re-read whenever the hive changes so Apply takes
  // effect without a reload
  const screenSaverConfig = useMemo(
    () => readScreenSaverConfig(vfs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vfs.version, vfs.initialized],
  );
  // My Pictures Slideshow needs real image URLs; resolve them only while
  // that saver is the selected one.
  const [saverPictures, setSaverPictures] = useState([]);
  useEffect(() => {
    if (
      !vfs.initialized ||
      screenSaverConfig.name !== 'My Pictures Slideshow'
    ) {
      setSaverPictures([]);
      return undefined;
    }
    let live = true;
    (async () => {
      const exts = ['.bmp', '.png', '.jpg', '.jpeg', '.gif'];
      const dir = SPECIAL_FOLDERS.MY_PICTURES;
      const walk = d =>
        vfs
          .listDir(d)
          .flatMap(n =>
            n.type === 'folder'
              ? walk(n.path)
              : n.type === 'file' &&
                exts.includes(getExtension(n.path).toLowerCase())
              ? [n.path]
              : [],
          );
      const paths = vfs.exists(dir) ? walk(dir) : [];
      const urls = [];
      for (const path of paths.slice(0, 60)) {
        // eslint-disable-next-line no-await-in-loop
        const url = await vfs.readFileUrl(path);
        if (url) urls.push({ url, name: path.split('/').pop() });
      }
      if (live) setSaverPictures(urls);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, vfs.version, screenSaverConfig.name]);
  const dlg = useDialog();
  const [runOpen, setRunOpen] = useState(false);
  // { path, unknown } while the Open With picker is up
  const [openWith, setOpenWith] = useState(null);
  // Extract All..., wherever it is started from
  const zipExtraction = useExtraction(vfs, path => shellOpenRef.current(path));

  const playSoundWithVolume = useCallback(
    soundSrc => {
      playSound(soundSrc, applyVolume);
    },
    [applyVolume],
  );

  // System sounds honor the master volume/mute
  useEffect(() => {
    registerVolumeAdapter(applyVolume);
    return () => registerVolumeAdapter(null);
  }, [applyVolume]);

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

  // --- shellBus: expose windows to task-management UIs (Task Manager) ---
  // Only the ACTIVE session drives the (global) bus; a backgrounded Fast
  // User Switching session must not clobber the foreground one's handlers.
  useEffect(() => {
    if (!active) return undefined;
    registerWindowHandlers({
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
      // Taskbar menus have no dispatch of their own; the focus line doubles
      // as their command channel, carrying whole { type, payload } actions
      // (Cascade/Tile, Minimize All, maximize toggles)
      focus: target => {
        if (target && target.type) dispatch(target);
        else dispatch({ type: FOCUS_APP, payload: target });
      },
      minimize: id => dispatch({ type: MINIMIZE_APP, payload: id }),
      toggleMaximize: id =>
        dispatch({ type: TOGGLE_MAXIMIZE_APP, payload: id }),
      // A program asked to shut down / restart / log off (cmd `shutdown`).
      power: action => {
        const p = powerRef.current;
        if (action === 'logoff') {
          playSoundWithVolume(xpLogoffSoundSrc);
          if (p.onLogoff) p.onLogoff();
        } else if (action === 'restart') {
          playSoundWithVolume(xpShutdownSoundSrc);
          if (p.onRestart) p.onRestart();
        } else if (action === 'shutdown') {
          playSoundWithVolume(xpShutdownSoundSrc);
          if (p.onShutdown) p.onShutdown();
        }
      },
    });
    return undefined;
  }, [active]);
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
        focused: app.id === focusedAppId,
      })),
    );
  }, [state.apps, focusedAppId, active]);

  // The Welcome screen shows "N programs running." under backgrounded
  // sessions (Fast User Switching), so report this session's count up.
  useEffect(() => {
    if (onOpenAppsChange) onOpenAppsChange(state.apps.length);
  }, [state.apps.length, onOpenAppsChange]);

  // --- Per-user wallpaper (written by Display Properties) ---
  const [wallpaperOverride, setWallpaperOverride] = useState(null);
  // A transient hijack (e.g. the Dog Virus) paints over THIS session's desktop
  // while it runs, without disturbing the saved wallpaper — and without
  // leaking onto other users' sessions.
  const [transientWallpaper, setTransientWallpaper] = useState(null);
  const hijackCountRef = useRef(0);
  const acquireWallpaper = useCallback(style => {
    hijackCountRef.current += 1;
    setTransientWallpaper(style);
  }, []);
  const releaseWallpaper = useCallback(() => {
    hijackCountRef.current = Math.max(0, hijackCountRef.current - 1);
    if (hijackCountRef.current === 0) setTransientWallpaper(null);
  }, []);
  const wallpaperHijack = useMemo(
    () => ({ acquireWallpaper, releaseWallpaper }),
    [acquireWallpaper, releaseWallpaper],
  );
  useEffect(() => {
    let cancelled = false;
    let ownedUrl = null;
    const apply = async () => {
      let setting = null;
      try {
        setting = getUserSetting(getCurrentUserName(), 'wallpaper', null);
      } catch {
        setting = null;
      }
      if (ownedUrl) {
        URL.revokeObjectURL(ownedUrl);
        ownedUrl = null;
      }
      // Display Properties emits { kind, value, position: center|tile|stretch }
      const styleFor = (url, position) => {
        const base = {
          backgroundImage: `url(${url})`,
          backgroundColor: '#3A6EA5',
          backgroundAttachment: 'scroll',
        };
        if (position === 'tile')
          return {
            ...base,
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto',
            backgroundPosition: '0 0',
          };
        if (position === 'center')
          return {
            ...base,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'auto',
            backgroundPosition: 'center',
          };
        // stretch (XP default)
        return {
          ...base,
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
        };
      };
      if (!setting || !setting.kind || setting.kind === 'asset') {
        // Bliss default; honor an explicit non-default position
        if (!cancelled)
          setWallpaperOverride(
            setting && setting.kind === 'asset' && setting.position
              ? styleFor(wallpaper, setting.position)
              : null,
          );
        return;
      }
      if (setting.kind === 'color') {
        if (!cancelled)
          setWallpaperOverride({ background: setting.value || '#3A6EA5' });
        return;
      }
      if (setting.kind === 'vfs' && setting.value) {
        try {
          const url = await vfs.readFileUrl(setting.value);
          if (!url) {
            if (!cancelled) setWallpaperOverride(null);
            return;
          }
          const node = vfs.findNodeCI(setting.value);
          if (url.startsWith('blob:') && (!node || url !== node.sourceUrl)) {
            ownedUrl = url;
          }
          if (cancelled) {
            if (ownedUrl) {
              URL.revokeObjectURL(ownedUrl);
              ownedUrl = null;
            }
            return;
          }
          setWallpaperOverride(styleFor(url, setting.position));
        } catch {
          if (!cancelled) setWallpaperOverride(null);
        }
      }
    };
    apply();
    let unsub = () => {};
    try {
      unsub = subscribeUserSettings(() => apply()) || (() => {});
    } catch {
      // user settings module unavailable — keep the default wallpaper
    }
    return () => {
      cancelled = true;
      try {
        unsub();
      } catch {
        // ignore
      }
      if (ownedUrl) URL.revokeObjectURL(ownedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized]);

  // --- Importing files dragged in from the host OS ---
  // Only the bare desktop / icon layer accepts these drops; drops over app
  // windows, dialogs or the taskbar are left to their own handlers.
  const isDesktopDropSurface = e => {
    const t = e.target;
    if (!(t instanceof Element)) return false;
    return t === e.currentTarget || !!t.closest('.desktop-icons-layer');
  };
  const onDesktopDragOver = e => {
    if (!e.dataTransfer) return;
    if (!isDesktopDropSurface(e)) return;
    const types = Array.from(e.dataTransfer.types || []);
    if (types.includes(DND_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      return;
    }
    if (!types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDesktopDrop = e => {
    if (!e.dataTransfer) return;
    if (!isDesktopDropSurface(e)) return;
    // A drag out of an Explorer window moves the items onto the desktop
    const paths = readDndPaths(e);
    if (paths && paths.length) {
      e.preventDefault();
      // Namespace icons are not files and stay put; everything else runs the
      // same move an Explorer window would, replace prompt and error dialogs
      // included. This used to call vfs.move and throw the result away, so a
      // name already taken on the desktop failed in silence — the mirror of
      // the bug on the desktop side.
      dropMoveInto(
        paths.filter(p => {
          const node = vfs.getNode(p);
          return node && !node.system;
        }),
        SPECIAL_FOLDERS.DESKTOP,
        { vfs, dlg },
      );
      return;
    }
    const files = extractOsFiles(e.dataTransfer);
    if (files.length === 0) return;
    e.preventDefault();
    importOsFiles(vfs, dlg, files, SPECIAL_FOLDERS.DESKTOP);
  };

  useEffect(() => {
    if (isMobile()) {
      dispatch({
        type: ADD_APP,
        payload: {
          ...SHELL_WINDOWS.error,
          injectProps: {
            message:
              'Mobile Device Detected:\n\nThis application is designed for desktop use and may not function correctly on mobile devices or small screens.\n\nPlease access this page on a desktop computer for the best experience.',
            title: 'Compatibility Warning',
          },
          multiInstance: true,
        },
      });
    }
  }, []);

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
  const openErrorBox = useCallback((message, title) => {
    dispatch({
      type: ADD_APP,
      payload: {
        ...SHELL_WINDOWS.error,
        // The window chrome title comes from the header, not injectProps
        header: title
          ? { ...SHELL_WINDOWS.error.header, title }
          : SHELL_WINDOWS.error.header,
        injectProps: title ? { message, title } : { message },
      },
    });
  }, []);

  const launchProgram = useCallback(
    (entry, injectProps = {}, overrides = {}) => {
      const payload = { ...entry, injectProps };
      if (overrides.size) payload.defaultSize = overrides.size;
      if (overrides.offset) payload.defaultOffset = overrides.offset;
      dispatch({ type: ADD_APP, payload });
    },
    [],
  );

  // Self-reference so shortcut resolution can recurse with a stable identity
  const shellOpenRef = useRef(null);

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

  // --- Start Menu data built from the VFS ---

  const allProgramsData = useMemo(() => {
    if (!vfs.initialized) return null;
    const buildDir = (dirPath, depth) => {
      const out = [];
      for (const child of vfs.listDir(dirPath)) {
        if (child.hidden) continue;
        if (child.type === 'folder') {
          const sub = buildDir(child.path, depth + 1);
          out.push({
            type: 'menu',
            icon: child.icon,
            text: child.name,
            items: sub.length
              ? sub
              : [
                  {
                    type: 'item',
                    icon: emptyIcon,
                    text: '(Empty)',
                    disable: true,
                  },
                ],
            ...(depth >= 1 ? { bottom: 'initial' } : {}),
          });
        } else if (child.type === 'shortcut' || child.type === 'file') {
          out.push({
            type: 'item',
            icon: child.icon,
            text: child.name,
            action: `open:${child.path}`,
          });
        }
      }
      return out;
    };
    const items = buildDir(SPECIAL_FOLDERS.PROGRAMS, 0);
    // Pinned system entries at the top, then a separator, like real XP
    const pinnedNames = [
      'Set Program Access and Defaults',
      'Windows Catalog',
      'Windows Update',
    ];
    const pinned = [];
    const rest = [];
    for (const item of items) {
      if (item.type === 'item' && pinnedNames.includes(item.text))
        pinned.push(item);
      else rest.push(item);
    }
    if (pinned.length > 0) {
      pinned.sort(
        (a, b) => pinnedNames.indexOf(a.text) - pinnedNames.indexOf(b.text),
      );
      return [...pinned, { type: 'separator' }, ...rest];
    }
    return rest;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version, vfs.initialized]);

  const recentDocumentsData = useMemo(() => {
    const docs = (vfs.recentDocuments || [])
      .map(p => vfs.getNode(p))
      .filter(Boolean)
      .map(n => ({
        type: 'item',
        icon: n.icon,
        text: n.name,
        action: `open:${n.path}`,
      }));
    return docs.length > 0 ? docs : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version, vfs.recentDocuments]);
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
        shellOpen('C:/WINDOWS/system32/control.exe');
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

  async function onClickModalButton(buttonText) {
    if (state.powerState === POWER_STATE.LOG_OFF) {
      if (buttonText === 'Log Off') {
        // Programs still open will be closed and unsaved work lost — warn.
        if (state.apps.length > 0) {
          const ok = await dlg.confirm(
            'Some programs are still running. If you log off, Windows will ' +
              'close them and you may lose any unsaved work.\n\n' +
              'Are you sure you want to log off?',
            'Log Off Windows',
            { icon: 'warning' },
          );
          if (!ok) return;
        }
        // Full log off is the "Exit Windows" event — the shutdown sound
        playSoundWithVolume(xpShutdownSoundSrc);
        if (onLogoff) onLogoff();
        dispatch({ type: CANCEL_POWER_OFF });
      } else if (buttonText === 'Switch User') {
        // Fast user switching gets the short logoff chime
        playSoundWithVolume(xpLogoffSoundSrc);
        if (onSwitchUser) onSwitchUser();
        dispatch({ type: CANCEL_POWER_OFF });
      } else {
        // Cancel
        dispatch({ type: CANCEL_POWER_OFF });
      }
    } else if (state.powerState === POWER_STATE.TURN_OFF) {
      if (buttonText === 'Turn Off') {
        playSoundWithVolume(xpShutdownSoundSrc);
        if (onShutdown) onShutdown();
        // No CANCEL_POWER_OFF here, App.js handles screen change
      } else if (buttonText === 'Restart') {
        playSoundWithVolume(xpShutdownSoundSrc);
        if (onRestart) onRestart();
        // No CANCEL_POWER_OFF here
      } else {
        // Cancel or Stand By
        dispatch({ type: CANCEL_POWER_OFF });
      }
    } else {
      dispatch({ type: CANCEL_POWER_OFF });
    }
  }

  function onModalClose() {
    dispatch({ type: CANCEL_POWER_OFF });
  }

  return (
    <SessionActiveContext.Provider value={active}>
      <WallpaperHijackContext.Provider value={wallpaperHijack}>
        <Container
          ref={ref}
          onMouseUp={onMouseUpDesktop}
          onMouseDown={onMouseDownDesktop}
          onDragOver={onDesktopDragOver}
          onDrop={onDesktopDrop}
          onContextMenu={e => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              setDesktopContextMenuEvent({
                x: e.clientX,
                y: e.clientY,
                id: Date.now(),
              });
            }
          }}
          state={state.powerState}
          style={transientWallpaper || wallpaperOverride || undefined}
        >
          <Icons
            userName={userName}
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
            focusedAppId={focusedAppId}
          />
          <Footer
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
            config={screenSaverConfig}
            pictures={saverPictures}
            active={getCurrentUserName() === userName}
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
              onLaunch={(exePath, always) => {
                const isShellZip =
                  exePath.toLowerCase() === EXE_PATHS.ZIPFLDR.toLowerCase();
                const program = getProgramByPath(exePath);
                if (isShellZip) {
                  if (always) {
                    const ext = getExtension(openWith.path).toLowerCase();
                    if (ext) {
                      try {
                        const ov =
                          vfs.getUserConfigFor(
                            userName,
                            'fileAssocOverrides',
                            null,
                          ) || {};
                        vfs.setUserConfigFor(userName, 'fileAssocOverrides', {
                          ...ov,
                          [ext]: exePath,
                        });
                      } catch {
                        // hive unavailable — open once anyway
                      }
                    }
                  }
                  const target = openWith.path;
                  setOpenWith(null);
                  shellOpenRef.current(target);
                  return;
                }
                if (program) {
                  if (always) {
                    const ext = getExtension(openWith.path).toLowerCase();
                    if (ext) {
                      try {
                        const ov =
                          vfs.getUserConfigFor(
                            userName,
                            'fileAssocOverrides',
                            null,
                          ) || {};
                        vfs.setUserConfigFor(userName, 'fileAssocOverrides', {
                          ...ov,
                          [ext]: exePath,
                        });
                      } catch {
                        // hive unavailable — open once anyway
                      }
                    }
                  }
                  launchProgram(program, { filePath: openWith.path });
                  vfs.addRecentDocument(openWith.path);
                }
                setOpenWith(null);
              }}
            />
          )}
          {state.powerState !== POWER_STATE.START && (
            <Modal
              onClose={onModalClose}
              onClickButton={onClickModalButton}
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

// Real Luna scrollbar bitmaps resolve through the xpArt registry; missing
// files degrade to 'none'. Cursors stay native: url() cursors cannot follow
// portaled surfaces (menus, dialogs, tooltips render outside this container),
// so custom art flickers against the host arrow instead of replacing it.
const sbUrl = name => {
  const url = getArt(name, null);
  return url ? `url(${url})` : 'none';
};

const Container = styled.div`
  font-family: Tahoma, 'Noto Sans', sans-serif;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
  background: url(${wallpaper}) no-repeat center center fixed;
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
  /* Luna scrollbars (bitmaps cropped from real XP SP-era screenshots) */
  & ::-webkit-scrollbar {
    width: 17px;
    height: 17px;
  }
  & ::-webkit-scrollbar-track:vertical {
    background: ${sbUrl('scroll-track-v')} repeat-y;
  }
  & ::-webkit-scrollbar-track:horizontal {
    background: ${sbUrl('scroll-track-h')} repeat-x;
  }
  & ::-webkit-scrollbar-thumb:vertical {
    background-image: ${sbUrl('scroll-thumb-v-grip')},
      ${sbUrl('scroll-thumb-v-top')}, ${sbUrl('scroll-thumb-v-bottom')},
      ${sbUrl('scroll-thumb-v-mid')};
    background-repeat: no-repeat, no-repeat, no-repeat, repeat-y;
    background-position: center, left top, left bottom, left top;
  }
  & ::-webkit-scrollbar-thumb:horizontal {
    background-image: ${sbUrl('scroll-thumb-h-grip')},
      ${sbUrl('scroll-thumb-h-left')}, ${sbUrl('scroll-thumb-h-right')},
      ${sbUrl('scroll-thumb-h-mid')};
    background-repeat: no-repeat, no-repeat, no-repeat, repeat-x;
    background-position: center, left top, right top, left top;
  }
  & ::-webkit-scrollbar-button {
    width: 17px;
    height: 17px;
    background-repeat: no-repeat;
  }
  & ::-webkit-scrollbar-button:vertical:decrement {
    background-image: ${sbUrl('scroll-up')};
  }
  & ::-webkit-scrollbar-button:vertical:increment {
    background-image: ${sbUrl('scroll-down')};
  }
  & ::-webkit-scrollbar-button:horizontal:decrement {
    background-image: ${sbUrl('scroll-left')};
  }
  & ::-webkit-scrollbar-button:horizontal:increment {
    background-image: ${sbUrl('scroll-right')};
  }
  & ::-webkit-scrollbar-button:vertical:start:increment,
  & ::-webkit-scrollbar-button:vertical:end:decrement,
  & ::-webkit-scrollbar-button:horizontal:start:increment,
  & ::-webkit-scrollbar-button:horizontal:end:decrement {
    display: none;
  }
  & ::-webkit-scrollbar-thumb:hover,
  & ::-webkit-scrollbar-button:hover {
    box-shadow: inset 0 0 0 17px rgba(255, 255, 255, 0.3);
  }
  & ::-webkit-scrollbar-thumb:active,
  & ::-webkit-scrollbar-button:active {
    box-shadow: inset 0 0 0 17px rgba(40, 73, 135, 0.2);
  }
  & ::-webkit-scrollbar-corner {
    background: #ece9d8;
  }
`;
export default WinXP;
