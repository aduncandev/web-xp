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
import { defaultIconState, defaultAppState, appSettings } from './apps';
import Modal from './Modal';
import Footer from './Footer';
import Windows from './Windows';
import Icons from './Icons';
import { DashedBox } from 'components';

// --- Sound Imports ---
// Assuming sounds are in src/assets/sounds/ and jsconfig.json has baseUrl: "src"
import xpLogoffSoundSrc from 'assets/sounds/xp_logoff.wav';
import xpShutdownSoundSrc from 'assets/sounds/xp_shutdown.wav'; // Assuming restart uses the same sound

const playSound = soundSrc => {
  if (!soundSrc) {
    console.warn('playSound called with no soundSrc in WinXP');
    return;
  }
  try {
    const audio = new Audio(soundSrc);
    audio.play().catch(error => {
      console.warn(`Audio playback failed for ${soundSrc} in WinXP:`, error);
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

const initState = {
  apps: defaultAppState,
  nextAppID: defaultAppState.length,
  nextZIndex: defaultAppState.length,
  focusing: FOCUSING.WINDOW,
  icons: defaultIconState,
  selecting: null,
  powerState: POWER_STATE.START,
};

const reducer = (state, action = { type: '' }) => {
  // Reducer logic (remains unchanged from your provided version)
  switch (action.type) {
    case ADD_APP: {
      const existingApp = state.apps.find(
        _app =>
          _app.component === action.payload.component && !_app.multiInstance,
      );
      if (action.payload.multiInstance || !existingApp) {
        return {
          ...state,
          apps: [
            ...state.apps,
            {
              ...action.payload,
              id: state.nextAppID,
              zIndex: state.nextZIndex,
              minimized: false,
            },
          ],
          nextAppID: state.nextAppID + 1,
          nextZIndex: state.nextZIndex + 1,
          focusing: FOCUSING.WINDOW,
        };
      }
      const appsWithFocus = state.apps.map(app =>
        app.component === action.payload.component
          ? { ...app, zIndex: state.nextZIndex, minimized: false }
          : app,
      );
      return {
        ...state,
        apps: appsWithFocus,
        nextZIndex: state.nextZIndex + 1,
        focusing: FOCUSING.WINDOW,
      };
    }
    case DEL_APP: {
      const remainingApps = state.apps.filter(app => app.id !== action.payload);
      let nextFocusing = FOCUSING.DESKTOP;
      if (remainingApps.length > 0) {
        nextFocusing = FOCUSING.WINDOW;
      } else if (state.icons.find(icon => icon.isFocus)) {
        nextFocusing = FOCUSING.ICON;
      }
      return {
        ...state,
        apps: remainingApps,
        focusing: nextFocusing,
      };
    }
    case FOCUS_APP: {
      const apps = state.apps.map(app =>
        app.id === action.payload
          ? { ...app, zIndex: state.nextZIndex, minimized: false }
          : app,
      );
      return {
        ...state,
        apps,
        nextZIndex: state.nextZIndex + 1,
        focusing: FOCUSING.WINDOW,
      };
    }
    case MINIMIZE_APP: {
      const apps = state.apps.map(app =>
        app.id === action.payload ? { ...app, minimized: true } : app,
      );
      const openWindows = apps.filter(app => !app.minimized);
      let nextFocusing = FOCUSING.DESKTOP;
      if (openWindows.length > 0) {
        nextFocusing = FOCUSING.WINDOW;
      } else if (state.icons.find(icon => icon.isFocus)) {
        nextFocusing = FOCUSING.ICON;
      }
      return {
        ...state,
        apps,
        focusing: nextFocusing,
      };
    }
    case TOGGLE_MAXIMIZE_APP: {
      const apps = state.apps.map(app =>
        app.id === action.payload ? { ...app, maximized: !app.maximized } : app,
      );
      return {
        ...state,
        apps,
        focusing: FOCUSING.WINDOW,
      };
    }
    case FOCUS_ICON: {
      const icons = state.icons.map(icon => ({
        ...icon,
        isFocus: icon.id === action.payload,
      }));
      return {
        ...state,
        focusing: FOCUSING.ICON,
        icons,
      };
    }
    case SELECT_ICONS: {
      const icons = state.icons.map(icon => ({
        ...icon,
        isFocus: action.payload.includes(icon.id),
      }));
      return {
        ...state,
        icons,
        focusing: FOCUSING.ICON,
      };
    }
    case FOCUS_DESKTOP:
      return {
        ...state,
        focusing: FOCUSING.DESKTOP,
        icons: state.icons.map(icon => ({
          ...icon,
          isFocus: false,
        })),
      };
    case START_SELECT:
      return {
        ...state,
        focusing: FOCUSING.DESKTOP,
        icons: state.icons.map(icon => ({
          ...icon,
          isFocus: false,
        })),
        selecting: action.payload,
      };
    case END_SELECT:
      return {
        ...state,
        selecting: null,
      };
    case POWER_OFF:
      return {
        ...state,
        powerState: action.payload,
      };
    case CANCEL_POWER_OFF:
      return {
        ...state,
        powerState: POWER_STATE.START,
      };
    default:
      return state;
  }
};

// Accept onSwitchUser prop
function WinXP({ onLogoff, onShutdown, onRestart, onSwitchUser }) {
  const [state, dispatch] = useReducer(reducer, initState);
  const ref = useRef(null);
  const mouse = useMouse(ref);

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
        playSound(xpLogoffSoundSrc); // Play logoff sound
        if (onLogoff) onLogoff();
        dispatch({ type: CANCEL_POWER_OFF });
      } else if (buttonText === 'Switch User') {
        playSound(xpLogoffSoundSrc); // MODIFIED: Play logoff sound for Switch User as well
        if (onSwitchUser) onSwitchUser();
        dispatch({ type: CANCEL_POWER_OFF });
      } else {
        // Cancel
        dispatch({ type: CANCEL_POWER_OFF });
      }
    } else if (state.powerState === POWER_STATE.TURN_OFF) {
      if (buttonText === 'Turn Off') {
        playSound(xpShutdownSoundSrc);
        if (onShutdown) onShutdown();
        // No CANCEL_POWER_OFF here, App.js handles screen change
      } else if (buttonText === 'Restart') {
        playSound(xpShutdownSoundSrc);
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
  background: url(https://i.imgur.com/Zk6TR5k.jpg) no-repeat center center fixed;
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
