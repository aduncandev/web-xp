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
import { defaultIconState, defaultAppState } from './apps';

export const initState = {
    apps: defaultAppState,
    nextAppID: defaultAppState.length,
    nextZIndex: defaultAppState.length,
    focusing: FOCUSING.WINDOW,
    icons: defaultIconState,
    selecting: null,
    powerState: POWER_STATE.START,
};

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
