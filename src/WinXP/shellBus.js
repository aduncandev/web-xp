// A tiny bus between the shell and task-management UIs (Task Manager,
// taskbar tools): the shell publishes its window list here and registers
// handlers for close/focus/minimize/maximize requests.

let windows = [];
const subscribers = new Set();
let handlers = {
  close: null,
  focus: null,
  minimize: null,
  toggleMaximize: null,
  power: null,
};
const taskbarButtons = new Map();
const closeInterceptors = new Map();

function sameWindow(a, b) {
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.icon === b.icon &&
    a.minimized === b.minimized &&
    a.focused === b.focused
  );
}

/** Shell-side: publish the current window list (identity-stable). */
export function publishWindows(next) {
  if (
    next.length === windows.length &&
    next.every((w, i) => sameWindow(w, windows[i]))
  ) {
    return;
  }
  windows = next;
  subscribers.forEach(cb => {
    try {
      cb(windows);
    } catch {
      // subscriber errors must not break the shell
    }
  });
}

/** Shell-side: register the dispatchers request* calls route to. */
export function registerWindowHandlers(next) {
  handlers = { ...handlers, ...next };
}

/** -> [{ id, title, icon, minimized, focused }] */
export function getWindows() {
  return windows;
}

export function subscribe(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

/** WM_CLOSE — the window's close interceptor ('Save changes?') may cancel it
 * (title-bar X and taskbar Close). Task Manager's End Task passes force=true,
 * which real XP treats as a kill: the interceptor is bypassed. */
export function requestClose(id, force = false) {
  if (handlers.close) handlers.close(id, force);
}

/** Power flow from a program (e.g. cmd `shutdown`): 'logoff'|'restart'|'shutdown'. */
export function requestPower(action) {
  if (handlers.power) handlers.power(action);
}

/** Focus by id; taskbar menus may pass a whole { type, payload } action. */
export function requestFocus(id) {
  if (handlers.focus) handlers.focus(id);
}

export function requestMinimize(id) {
  if (handlers.minimize) handlers.minimize(id);
}

/** Maximize <-> restore. */
export function requestToggleMaximize(id) {
  if (handlers.toggleMaximize) handlers.toggleMaximize(id);
}

/** Window-side: register the app's async close interceptor (WM_CLOSE veto). */
export function setCloseInterceptor(id, fn) {
  if (fn) closeInterceptors.set(id, fn);
  else closeInterceptors.delete(id);
}

/** -> the window's close interceptor, or null if it has none. */
export function getCloseInterceptor(id) {
  return closeInterceptors.get(id) || null;
}

/** Taskbar-side: register an app's taskbar button element for minimize targeting. */
export function setTaskbarButton(id, el) {
  if (el) taskbarButtons.set(id, el);
  else taskbarButtons.delete(id);
}

/** -> DOMRect of the app's taskbar button, or null if it has none. */
export function getTaskbarRect(id) {
  const el = taskbarButtons.get(id);
  return el ? el.getBoundingClientRect() : null;
}
