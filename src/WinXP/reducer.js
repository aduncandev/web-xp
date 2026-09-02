import {
  ADD_APP,
  DEL_APP,
  FOCUS_APP,
  MINIMIZE_APP,
  TOGGLE_MAXIMIZE_APP,
  SET_APP_GEOMETRY,
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
import { FOCUSING, POWER_STATE, TASKBAR_HEIGHT } from './constants';
import { screenSize } from './screen';

// Desktop work area for window-arrangement actions; dispatchers may pass
// their own { width, height } payload
const getWorkArea = payload => ({
  width: (payload && payload.width) || screenSize().width,
  height: (payload && payload.height) || screenSize().height - TASKBAR_HEIGHT,
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
      offset: p.offset,
    };
    if (app.resizable) {
      next.size = {
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
        // Restacked in their existing order, so whatever was on top stays
        // on top where tiles overlap (a window wider than its cell)
        zIndex: state.nextZIndex + index,
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
      zIndex: p.zIndex,
      offset: p.offset,
    };
    if (app.resizable) {
      next.size = {
        width: Math.max(app.minWidth || 0, p.size.width),
        height: Math.max(app.minHeight || 0, p.size.height),
      };
    }
    return next;
  });
  return {
    ...state,
    apps,
    nextZIndex: state.nextZIndex + n,
    focusing: FOCUSING.WINDOW,
  };
};

/**
 * What holds focus once the windows changed: a visible window, else the
 * selected icons, else the desktop.
 */
const focusAfterChange = (apps, focusedIconPaths) => {
  if (apps.some(app => !app.minimized)) return FOCUSING.WINDOW;
  return focusedIconPaths.length > 0 ? FOCUSING.ICON : FOCUSING.DESKTOP;
};

/** Same program, for the single-instance rule: by exe path where there is one. */
const sameProgram = (a, b) =>
  a.exePath || b.exePath
    ? a.exePath === b.exePath
    : a.component === b.component;

export const initState = {
  apps: [],
  nextZIndex: 0,
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
        _app => sameProgram(_app, action.payload) && !_app.multiInstance,
      );
      if (action.payload.multiInstance || !existingApp) {
        // The launch layout becomes the window's live geometry, which the
        // frame reports back into as it is dragged and resized
        const { defaultOffset, defaultSize, ...entry } = action.payload;
        return {
          ...state,
          apps: [
            ...state.apps,
            {
              ...entry,
              offset: defaultOffset,
              size: defaultSize,
              id: window.__winxpWindowIdSeq++,
              zIndex: state.nextZIndex,
              minimized: false,
            },
          ],
          nextZIndex: state.nextZIndex + 1,
          focusing: FOCUSING.WINDOW,
        };
      }
      const hasNewProps =
        action.payload.injectProps &&
        Object.keys(action.payload.injectProps).length > 0;
      const appsWithFocus = state.apps.map(app =>
        sameProgram(app, action.payload)
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
      return {
        ...state,
        apps: remainingApps,
        focusing: focusAfterChange(remainingApps, state.focusedIconPaths),
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
      return {
        ...state,
        apps,
        focusing: focusAfterChange(apps, state.focusedIconPaths),
      };
    }
    case SET_APP_GEOMETRY: {
      const { id, offset, size } = action.payload;
      const apps = state.apps.map(app =>
        app.id === id ? { ...app, offset, size } : app,
      );
      return { ...state, apps };
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
        // The header also carries the window's behaviour flags (buttons,
        // noMinimize...), so any field may change it, not just the title
        // and icon. Apps that set their header on every render still get a
        // no-op when nothing differs, which is what keeps them from looping.
        const newHeader = { ...app.header, ...patch };
        const same = Object.keys(newHeader).every(
          key => newHeader[key] === app.header[key],
        );
        if (same) return app;
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
        focusing: focusAfterChange(apps, state.focusedIconPaths),
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
