import React, { useReducer, useRef, useCallback, useEffect, useState } from 'react';
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
  SET_HEADER_TITLE,
} from './constants/actions';
import { FOCUSING, POWER_STATE } from './constants';
import { appSettings } from './apps';
import { reducer, initState } from './reducer';
import Modal from './Modal';
import Footer from './Footer';
import Windows from './Windows';
import Icons from './Icons';
import { DashedBox } from 'components';
import ContextMenu from 'components/ContextMenu';

import xpLogoffSoundSrc from 'assets/sounds/xp_logoff.wav';
import xpShutdownSoundSrc from 'assets/sounds/xp_shutdown.wav';
import wallpaper from 'assets/windowsIcons/wallpaper.jpeg';
import { useVolume } from '../context/VolumeContext';
import { useVFS } from '../context/VFSContext';
import { SPECIAL_FOLDERS } from '../context/vfsDefaults';
import { normalizePath, generateUniqueName, getMimeType } from '../context/vfsUtils';

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

const DESKTOP_PATH = SPECIAL_FOLDERS['Desktop'];

function WinXP({ onLogoff, onShutdown, onRestart, onSwitchUser }) {
  const [state, dispatch] = useReducer(reducer, initState);
  const ref = useRef(null);
  const mouse = useMouse(ref);
  const [desktopMenu, setDesktopMenu] = useState(null);

  const { applyVolume } = useVolume();
  const vfs = useVFS();

  const playSoundWithVolume = useCallback(
    soundSrc => {
      playSound(soundSrc, applyVolume);
    },
    [applyVolume],
  );

  const getFocusedAppId = useCallback(() => {
    if (state.focusing !== FOCUSING.WINDOW) return -1;
    const focusedApp = [...state.apps]
      .filter(app => !app.minimized)
      .sort((a, b) => b.zIndex - a.zIndex)[0];
    return focusedApp ? focusedApp.id : -1;
  }, [state.apps, state.focusing]);

  const focusedAppId = getFocusedAppId();

  useEffect(() => {
    if (isMobile()) {
      dispatch({
        type: ADD_APP,
        payload: {
          ...appSettings.Error,
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

  const onOpenFile = useCallback(
    filePath => {
      const appName = vfs.getAssociatedApp(filePath);
      const setting = appSettings[appName];
      if (setting) {
        dispatch({
          type: ADD_APP,
          payload: {
            ...setting,
            injectProps: { filePath },
            multiInstance: true,
          },
        });
      } else {
        dispatch({
          type: ADD_APP,
          payload: {
            ...appSettings.Notepad,
            injectProps: { filePath },
            multiInstance: true,
          },
        });
      }
    },
    [vfs],
  );

  // --- Launch an app by name (used for shortcuts) ---
  const launchApp = useCallback(
    (appName, extraProps = {}) => {
      const setting = appSettings[appName];
      if (setting) {
        const payload = appName === 'My Computer'
          ? { ...setting, injectProps: { onOpenFile, onLaunchApp: launchApp, ...extraProps } }
          : { ...setting, injectProps: extraProps };
        dispatch({ type: ADD_APP, payload });
      } else {
        dispatch({
          type: ADD_APP,
          payload: {
            ...appSettings.Error,
            injectProps: {
              message: `C:\\\nApplication '${appName}' not found`,
            },
          },
        });
      }
    },
    [onOpenFile],
  );

  // --- Desktop-level file drop from OS ---
  const handleDesktopDragOver = useCallback(e => {
    e.preventDefault();
  }, []);

  const handleDesktopDrop = useCallback(e => {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();

    // Handle VFS internal drag (from My Computer explorer → desktop)
    const pathsJson = e.dataTransfer.getData('application/vfs-paths');
    const vfsPaths = pathsJson ? JSON.parse(pathsJson) : [];
    if (vfsPaths.length === 0) {
      const single = e.dataTransfer.getData('application/vfs-path');
      if (single) vfsPaths.push(single);
    }
    if (vfsPaths.length > 0) {
      const operation = e.dataTransfer.getData('application/vfs-operation') || 'move';
      for (const srcPath of vfsPaths) {
        if (srcPath.startsWith(normalizePath(DESKTOP_PATH) + '/')) continue; // already on desktop
        const srcNode = vfs.readFile(srcPath);
        if (!srcNode) continue;
        const destName = generateUniqueName(vfs.fs, DESKTOP_PATH, srcNode.name);
        const destPath = normalizePath(`${DESKTOP_PATH}/${destName}`);
        if (srcNode.type === 'file') {
          vfs.writeFile(destPath, srcNode.content || '', srcNode.mimeType);
        } else {
          vfs.copyTree(srcPath, destPath);
        }
        if (operation === 'move') {
          vfs.deleteNode(srcPath);
        }
      }
      return;
    }

    // Handle OS file drop
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    Array.from(e.dataTransfer.files).forEach(file => {
      const reader = new FileReader();
      const isText = file.type.startsWith('text/') || /\.(txt|log|ini|cfg|html?|css|js|json|xml|csv|md)$/i.test(file.name);
      const mimeType = file.type || getMimeType(file.name);
      if (isText) {
        reader.onload = ev => {
          const name = generateUniqueName(vfs.fs, DESKTOP_PATH, file.name);
          vfs.writeFile(normalizePath(`${DESKTOP_PATH}/${name}`), ev.target.result, mimeType);
        };
        reader.readAsText(file);
      } else {
        reader.onload = ev => {
          const name = generateUniqueName(vfs.fs, DESKTOP_PATH, file.name);
          vfs.writeFile(normalizePath(`${DESKTOP_PATH}/${name}`), ev.target.result, mimeType);
        };
        reader.readAsArrayBuffer(file);
      }
    });
  }, [vfs]);

  const handleDesktopNewFolder = useCallback(() => {
    const name = generateUniqueName(vfs.fs, DESKTOP_PATH, 'New Folder');
    vfs.createDir(normalizePath(`${DESKTOP_PATH}/${name}`));
  }, [vfs]);

  const handleDesktopNewTextFile = useCallback(() => {
    const name = generateUniqueName(vfs.fs, DESKTOP_PATH, 'New Text Document.txt');
    vfs.writeFile(normalizePath(`${DESKTOP_PATH}/${name}`), '');
  }, [vfs]);

  const handleDesktopContextMenu = useCallback(
    e => {
      if (e.target !== e.currentTarget) return;
      e.preventDefault();
      setDesktopMenu({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  // Handle double-click on VFS desktop file/directory (non-shortcut)
  const onDoubleClickDesktopFile = useCallback(
    filePath => {
      const node = vfs.readFile(filePath);
      if (!node) return;
      if (node.type === 'directory') {
        dispatch({
          type: ADD_APP,
          payload: {
            ...appSettings['My Computer'],
            injectProps: { onOpenFile, onLaunchApp: launchApp, initialPath: filePath },
            multiInstance: true,
          },
        });
      } else {
        onOpenFile(filePath);
      }
    },
    [vfs, onOpenFile, launchApp],
  );

  // Handle double-click on a shortcut → resolve to app
  const onDoubleClickShortcut = useCallback(
    (targetAppName, shortcutPath) => {
      const node = shortcutPath ? vfs.readFile(shortcutPath) : null;
      const extraProps = node?.targetArgs || {};

      // Check if the target is a VFS path (directory or file)
      if (targetAppName && vfs.exists(targetAppName)) {
        const targetNode = vfs.readFile(targetAppName);
        if (targetNode?.type === 'directory') {
          dispatch({
            type: ADD_APP,
            payload: {
              ...appSettings['My Computer'],
              injectProps: { onOpenFile, initialPath: targetAppName },
              multiInstance: true,
            },
          });
          return;
        } else if (targetNode) {
          onOpenFile(targetAppName);
          return;
        }
      }

      // Otherwise treat as app name
      launchApp(targetAppName, extraProps);
    },
    [vfs, onOpenFile, launchApp],
  );

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
  const onSetTitle = useCallback(
    (id, title) => dispatch({ type: SET_HEADER_TITLE, payload: { id, title } }),
    [],
  );

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

  function onMouseDownFooter() {
    dispatch({ type: FOCUS_DESKTOP });
  }

  function onClickMenuItem(itemName) {
    switch (itemName) {
      case 'Internet':
        launchApp('Internet Explorer');
        break;
      case 'Minesweeper':
        launchApp('Minesweeper');
        break;
      case 'My Computer':
        launchApp('My Computer');
        break;
      case 'Notepad':
        launchApp('Notepad');
        break;
      case 'Winamp':
        launchApp('Winamp');
        break;
      case 'Paint':
        launchApp('Paint');
        break;
      case 'About Me':
        launchApp('AboutMe');
        break;
      case 'Voltorb Flip':
        launchApp('VoltorbFlip');
        break;
      case 'Pinball':
        launchApp('Pinball');
        break;
      case 'PictoChat':
        launchApp('PictoChat');
        break;
      case 'Media Player':
        launchApp('MediaPlayer');
        break;
      case 'Log Off':
        dispatch({ type: POWER_OFF, payload: POWER_STATE.LOG_OFF });
        break;
      case 'Turn Off Computer':
        dispatch({ type: POWER_OFF, payload: POWER_STATE.TURN_OFF });
        break;
      default:
        // Try to launch by appName directly (for VFS-based Start Menu)
        if (appSettings[itemName]) {
          launchApp(itemName);
        } else {
          dispatch({
            type: ADD_APP,
            payload: {
              ...appSettings.Error,
              injectProps: {
                message: `C:\\\nApplication '${itemName}' not found`,
              },
            },
          });
        }
    }
  }

  function onMouseDownDesktop(e) {
    setDesktopMenu(null);
    if (e.target === e.currentTarget) {
      dispatch({ type: FOCUS_DESKTOP });
      dispatch({
        type: START_SELECT,
        payload: { x: mouse.docX, y: mouse.docY },
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

  function onClickModalButton(buttonText) {
    if (state.powerState === POWER_STATE.LOG_OFF) {
      if (buttonText === 'Log Off') {
        playSoundWithVolume(xpLogoffSoundSrc);
        if (onLogoff) onLogoff();
        dispatch({ type: CANCEL_POWER_OFF });
      } else if (buttonText === 'Switch User') {
        playSoundWithVolume(xpLogoffSoundSrc);
        if (onSwitchUser) onSwitchUser();
        dispatch({ type: CANCEL_POWER_OFF });
      } else {
        dispatch({ type: CANCEL_POWER_OFF });
      }
    } else if (state.powerState === POWER_STATE.TURN_OFF) {
      if (buttonText === 'Turn Off') {
        playSoundWithVolume(xpShutdownSoundSrc);
        if (onShutdown) onShutdown();
      } else if (buttonText === 'Restart') {
        playSoundWithVolume(xpShutdownSoundSrc);
        if (onRestart) onRestart();
      } else {
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
    <Container
      ref={ref}
      onMouseUp={onMouseUpDesktop}
      onMouseDown={onMouseDownDesktop}
      onContextMenu={handleDesktopContextMenu}
      onDragOver={handleDesktopDragOver}
      onDrop={handleDesktopDrop}
      state={state.powerState}
    >
      <Icons
        onDoubleClickShortcut={onDoubleClickShortcut}
        onDoubleClickDesktopFile={onDoubleClickDesktopFile}
        displayFocus={state.focusing === FOCUSING.ICON}
        mouse={mouse}
        selecting={state.selecting}
        setSelectedIcons={onIconsSelected}
        vfs={vfs}
      />
      <DashedBox startPos={state.selecting} mouse={mouse} />
      <Windows
        apps={state.apps}
        onMouseDown={onFocusApp}
        onClose={onCloseApp}
        onMinimize={onMinimizeWindow}
        onMaximize={onMaximizeWindow}
        onSetTitle={onSetTitle}
        focusedAppId={focusedAppId}
      />
      <Footer
        apps={state.apps}
        onMouseDownApp={onMouseDownFooterApp}
        focusedAppId={focusedAppId}
        onMouseDown={onMouseDownFooter}
        onClickMenuItem={onClickMenuItem}
      />
      {state.powerState !== POWER_STATE.START && (
        <Modal
          onClose={onModalClose}
          onClickButton={onClickModalButton}
          mode={state.powerState}
        />
      )}
      {desktopMenu && (
        <ContextMenu
          position={{ x: desktopMenu.x, y: desktopMenu.y }}
          onClose={() => setDesktopMenu(null)}
          items={[
            { type: 'submenu', label: 'Arrange Icons By', items: [
              { type: 'item', label: 'Name', onClick: () => {} },
              { type: 'item', label: 'Size', onClick: () => {} },
              { type: 'item', label: 'Type', onClick: () => {} },
              { type: 'item', label: 'Modified', onClick: () => {} },
              { type: 'separator' },
              { type: 'item', label: 'Auto Arrange', checked: true, onClick: () => {} },
            ] },
            { type: 'item', label: 'Refresh', onClick: () => {} },
            { type: 'separator' },
            { type: 'submenu', label: 'New', items: [
              { type: 'item', label: 'Folder', onClick: handleDesktopNewFolder },
              { type: 'separator' },
              { type: 'item', label: 'Text Document', onClick: handleDesktopNewTextFile },
            ] },
            { type: 'separator' },
            { type: 'item', label: 'Properties', disabled: true },
          ]}
        />
      )}
    </Container>
  );
}

const powerOffAnimation = keyframes` 0% { filter: brightness(1) grayscale(0); } 30% { filter: brightness(1) grayscale(0); } 100% { filter: brightness(0.6) grayscale(1); } `;
const animation = {
  [POWER_STATE.START]: '',
  [POWER_STATE.TURN_OFF]: powerOffAnimation,
  [POWER_STATE.LOG_OFF]: powerOffAnimation,
};
const Container = styled.div`
  font-family: Tahoma, 'Noto Sans', sans-serif;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
  background: url(${wallpaper}) no-repeat center center fixed;
  background-size: cover;
  animation: ${({ state }) => animation[state]} 5s forwards;
  *:not(input):not(textarea) {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }
`;
export default WinXP;
