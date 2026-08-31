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
  MINIMIZE_ALL,
  CASCADE_WINDOWS,
  TILE_WINDOWS_HORIZONTALLY,
  TILE_WINDOWS_VERTICALLY,
} from './constants/actions';
import { FOCUSING, POWER_STATE } from './constants';
import { defaultAppState } from './apps';

const TASKBAR_HEIGHT = 30;

// Desktop work area for window-arrangement actions; dispatchers may pass
// their own { width, height } payload
const getWorkArea = payload => ({
  width: (payload && payload.width) || window.innerWidth,
  height: (payload && payload.height) || window.innerHeight - TASKBAR_HEIGHT,
});

const getArrangeTargets = state =>
  state.apps
    .filter(app => !app.minimized && !app.header.noFooterWindow)
    .sort((a, b) => a.zIndex - b.zIndex);

const cascadeWindows = (state, payload) => {
  const area = getWorkArea(payload);
  const targets = getArrangeTargets(state);
  if (targets.length === 0) return state;
  const step = 26;
  const size = {
    width: Math.min(area.width, Math.max(320, Math.round(area.width * 0.6))),
    height: Math.min(area.height, Math.max(240, Math.round(area.height * 0.6))),
  };
  const placed = new Map(
    targets.map((app, i) => [
      app.id,
      {
        offset: {
          x: (i * step) % Math.max(step, area.width - size.width),
          y: (i * step) % Math.max(step, area.height - size.height),
        },
        zIndex: state.nextZIndex + i,
      },
    ]),
  );
  const apps = state.apps.map(app => {
    const p = placed.get(app.id);
    if (!p) return app;
    const next = {
      ...app,
      maximized: false,
      zIndex: p.zIndex,
      defaultOffset: p.offset,
    };
    if (app.resizable) {
      next.defaultSize = {
        width: Math.max(app.minWidth || 0, size.width),
        height: Math.max(app.minHeight || 0, size.height),
      };
    }
    return next;
  });
  return {
    ...state,
    apps,
    nextZIndex: state.nextZIndex + targets.length,
    focusing: FOCUSING.WINDOW,
  };
};

// Tile Windows Horizontally stacks full-width bands; Vertically stands
// windows side by side. Extra windows split the first bands, like Win32
// TileWindows.
const tileWindows = (state, payload, vertical) => {
  const area = getWorkArea(payload);
  const targets = getArrangeTargets(state);
  const n = targets.length;
  if (n === 0) return state;
  const bandCount = Math.max(1, Math.floor(Math.sqrt(n)));
  const base = Math.floor(n / bandCount);
  const extra = n % bandCount;
  const placed = new Map();
  let index = 0;
  for (let band = 0; band < bandCount; band += 1) {
    const cells = band < extra ? base + 1 : base;
    const bandSize = (vertical ? area.height : area.width) / bandCount;
    const cellSize = (vertical ? area.width : area.height) / cells;
    for (let cell = 0; cell < cells; cell += 1) {
      placed.set(targets[index].id, {
        offset: vertical
          ? { x: Math.round(cell * cellSize), y: Math.round(band * bandSize) }
          : { x: Math.round(band * bandSize), y: Math.round(cell * cellSize) },
        size: vertical
          ? { width: Math.round(cellSize), height: Math.round(bandSize) }
          : { width: Math.round(bandSize), height: Math.round(cellSize) },
      });
      index += 1;
    }
  }
  const apps = state.apps.map(app => {
    const p = placed.get(app.id);
    if (!p) return app;
    const next = {
      ...app,
      maximized: false,
      defaultOffset: p.offset,
    };
    if (app.resizable) {
      next.defaultSize = {
        width: Math.max(app.minWidth || 0, p.size.width),
        height: Math.max(app.minHeight || 0, p.size.height),
      };
    }
    return next;
  });
  return {
    ...state,
    apps,
    focusing: FOCUSING.WINDOW,
  };
};

export const initState = {
  apps: defaultAppState,
  nextAppID: defaultAppState.length,
  nextZIndex: defaultAppState.length,
  focusing: FOCUSING.WINDOW,
  focusedIconPaths: [], // VFS paths of focused desktop icons
  selecting: null,
  powerState: POWER_STATE.START,
};

// Window ids must be unique ACROSS sessions: Fast User Switching keeps several
// <WinXP> reducers mounted at once and the GLOBAL shellBus keys close
// interceptors and taskbar buttons by id, so per-session counters would
// collide. The sequence lives on window (not a module `let`) because Fast
// Refresh re-evaluates this module mid-session — a reset counter hands out
// ids already owned by live windows, whose interceptors then veto other
// windows' closes and whose focus lights up every id twin.
if (window.__winxpWindowIdSeq == null) window.__winxpWindowIdSeq = 1;

export const reducer = (state, action = { type: '' }) => {
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
              id: window.__winxpWindowIdSeq++,
              zIndex: state.nextZIndex,
              minimized: false,
            },
          ],
          nextAppID: state.nextAppID + 1,
          nextZIndex: state.nextZIndex + 1,
          focusing: FOCUSING.WINDOW,
        };
      }
      const hasNewProps =
        action.payload.injectProps &&
        Object.keys(action.payload.injectProps).length > 0;
      const appsWithFocus = state.apps.map(app =>
        app.component === action.payload.component
          ? {
              ...app,
              zIndex: state.nextZIndex,
              minimized: false,
              // Re-launching a single-instance app with fresh props (e.g. a
              // file to open) updates the running instance's props
              injectProps: hasNewProps
                ? { ...app.injectProps, ...action.payload.injectProps }
                : app.injectProps,
            }
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
      } else if (state.focusedIconPaths.length > 0) {
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
      } else if (state.focusedIconPaths.length > 0) {
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
    case FOCUS_ICON:
      return {
        ...state,
        focusing: FOCUSING.ICON,
        focusedIconPaths: [action.payload],
      };
    case SELECT_ICONS:
      return {
        ...state,
        focusedIconPaths: action.payload,
        focusing: action.payload.length > 0 ? FOCUSING.ICON : state.focusing,
      };
    case FOCUS_DESKTOP:
      return {
        ...state,
        focusing: FOCUSING.DESKTOP,
        focusedIconPaths: [],
      };
    case START_SELECT:
      return {
        ...state,
        focusing: FOCUSING.DESKTOP,
        focusedIconPaths: [],
        selecting: action.payload,
      };
    case END_SELECT:
      return {
        ...state,
        selecting: null,
      };
    case UPDATE_APP_HEADER: {
      const { id, patch } = action.payload;
      let changed = false;
      const apps = state.apps.map(app => {
        if (app.id !== id) return app;
        const newHeader = { ...app.header, ...patch };
        if (
          newHeader.title === app.header.title &&
          newHeader.icon === app.header.icon
        ) {
          return app;
        }
        changed = true;
        return { ...app, header: newHeader };
      });
      return changed ? { ...state, apps } : state;
    }
    case MINIMIZE_ALL: {
      // Windows flagged noMinimize (the Dog Virus) resist Show Desktop /
      // Minimize All — they stay put.
      const apps = state.apps.map(app =>
        app.minimized || app.header.noMinimize
          ? app
          : { ...app, minimized: true },
      );
      return {
        ...state,
        apps,
        focusing:
          state.focusedIconPaths.length > 0 ? FOCUSING.ICON : FOCUSING.DESKTOP,
      };
    }
    case CASCADE_WINDOWS:
      return cascadeWindows(state, action.payload);
    case TILE_WINDOWS_HORIZONTALLY:
      return tileWindows(state, action.payload, false);
    case TILE_WINDOWS_VERTICALLY:
      return tileWindows(state, action.payload, true);
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
