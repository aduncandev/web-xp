import React, { useReducer, useRef, useCallback, useEffect } from 'react';
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
} from './constants/actions';
import { FOCUSING, POWER_STATE } from './constants';
import { appSettings } from './apps';
import { reducer, initState } from './reducer';
import Modal from './Modal';
import Footer from './Footer';
import Windows from './Windows';
import Icons from './Icons';
import { DashedBox } from 'components';

// --- Sound Imports ---
import xpLogoffSoundSrc from 'assets/sounds/xp_logoff.wav';
import xpShutdownSoundSrc from 'assets/sounds/xp_shutdown.wav';
import wallpaper from 'assets/windowsIcons/wallpaper.jpeg';

// --- Volume Import ---
import { useVolume } from '../context/VolumeContext'; // Correct path from src/WinXP/

/**
 * Plays a sound file.
 * We've added applyVolume as an argument.
 * @param {string} soundSrc - The imported sound source.
 * @param {function} applyVolume - The function from our context to apply volume.
 */
const playSound = (soundSrc, applyVolume) => {
  if (!soundSrc) {
    console.warn('playSound called with no soundSrc in WinXP');
    return;
  }
  try {
    const audio = new Audio(soundSrc);

    // --- APPLY VOLUME FIX ---
    if (typeof applyVolume === 'function') {
      applyVolume(audio);
    } else {
      console.warn('applyVolume function not provided to playSound in WinXP');
    }
    // -------------------------

    audio.play().catch(error => {
      // Ignore errors caused by user not interacting with the page yet
      if (error.name !== 'NotAllowedError') {
        console.warn(`Audio playback failed for ${soundSrc} in WinXP:`, error);
      }
    });
  } catch (error) {
    console.error(`Error loading/playing audio ${soundSrc} in WinXP:`, error);
  }
};

const isMobile = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return (
    /android/i.test(userAgent) ||
    (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream)
  );
};

// Accept onSwitchUser prop
function WinXP({ onLogoff, onShutdown, onRestart, onSwitchUser }) {
  const [state, dispatch] = useReducer(reducer, initState);
  const ref = useRef(null);
  const mouse = useMouse(ref);

  // --- VOLUME FIX: Get applyVolume from hook ---
  const { applyVolume } = useVolume();

  // --- VOLUME FIX: Create a memoized playSound function ---
  const playSoundWithVolume = useCallback(
    soundSrc => {
      playSound(soundSrc, applyVolume);
    },
    [applyVolume],
  );
  // --------------------------------------------------

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

  function onMouseDownIcon(id) {
    dispatch({ type: FOCUS_ICON, payload: id });
  }
  function onDoubleClickIcon(component) {
    const appSetting = Object.values(appSettings).find(
      setting => setting.component === component,
    );
    if (appSetting) {
      dispatch({ type: ADD_APP, payload: appSetting });
    }
  }
  function onMouseDownFooter() {
    dispatch({ type: FOCUS_DESKTOP });
  }

  function onClickMenuItem(itemName) {
    switch (itemName) {
      case 'Internet':
        dispatch({ type: ADD_APP, payload: appSettings['Internet Explorer'] });
        break;
      case 'Minesweeper':
        dispatch({ type: ADD_APP, payload: appSettings.Minesweeper });
        break;
      case 'My Computer':
        dispatch({ type: ADD_APP, payload: appSettings['My Computer'] });
        break;
      case 'Notepad':
        dispatch({ type: ADD_APP, payload: appSettings.Notepad });
        break;
      case 'Winamp':
        dispatch({ type: ADD_APP, payload: appSettings.Winamp });
        break;
      case 'Paint':
        dispatch({ type: ADD_APP, payload: appSettings.Paint });
        break;
      case 'About Me':
        dispatch({ type: ADD_APP, payload: appSettings.AboutMe });
        break;
      case 'Voltorb Flip':
        dispatch({ type: ADD_APP, payload: appSettings.VoltorbFlip });
        break;
      case 'Pinball':
        dispatch({ type: ADD_APP, payload: appSettings.Pinball });
        break;
      case 'PictoChat':
        dispatch({ type: ADD_APP, payload: appSettings.PictoChat });
        break;
      case 'Log Off':
        dispatch({ type: POWER_OFF, payload: POWER_STATE.LOG_OFF });
        break;
      case 'Turn Off Computer':
        dispatch({ type: POWER_OFF, payload: POWER_STATE.TURN_OFF });
        break;
      default:
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

  function onMouseDownDesktop(e) {
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
        // --- VOLUME FIX: Use new function ---
        playSoundWithVolume(xpLogoffSoundSrc);
        if (onLogoff) onLogoff();
        dispatch({ type: CANCEL_POWER_OFF });
      } else if (buttonText === 'Switch User') {
        // --- VOLUME FIX: Use new function ---
        playSoundWithVolume(xpLogoffSoundSrc);
        if (onSwitchUser) onSwitchUser();
        dispatch({ type: CANCEL_POWER_OFF });
      } else {
        // Cancel
        dispatch({ type: CANCEL_POWER_OFF });
      }
    } else if (state.powerState === POWER_STATE.TURN_OFF) {
      if (buttonText === 'Turn Off') {
        // --- VOLUME FIX: Use new function ---
        playSoundWithVolume(xpShutdownSoundSrc);
        if (onShutdown) onShutdown();
        // No CANCEL_POWER_OFF here, App.js handles screen change
      } else if (buttonText === 'Restart') {
        // --- VOLUME FIX: Use new function ---
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
    <Container
      ref={ref}
      onMouseUp={onMouseUpDesktop}
      onMouseDown={onMouseDownDesktop}
      state={state.powerState}
    >
      <Icons
        icons={state.icons}
        onMouseDown={onMouseDownIcon}
        onDoubleClick={onDoubleClickIcon}
        displayFocus={state.focusing === FOCUSING.ICON}
        appSettings={appSettings}
        mouse={mouse}
        selecting={state.selecting}
        setSelectedIcons={onIconsSelected}
      />
      <DashedBox startPos={state.selecting} mouse={mouse} />
      <Windows
        apps={state.apps}
        onMouseDown={onFocusApp}
        onClose={onCloseApp}
        onMinimize={onMinimizeWindow}
        onMaximize={onMaximizeWindow}
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
  @import url('https://fonts.googleapis.com/css?family=Noto+Sans');
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
