/*
 * How tall the taskbar is, in pixels.
 *
 * The taskbar's own CSS, the desktop work area it leaves behind, and the
 * height a maximized window is given all have to agree, or windows park
 * under the bar or float above it. They used to be three separate 30s in
 * two files.
 */
export const TASKBAR_HEIGHT = 30;

// The frame around a window's content: XP's sizing border is 4px in Luna
// and Classic alike. A maximized window is pulled off-screen by this much
// on every side so only its content shows.
export const WINDOW_FRAME_PADDING = 4;

export const FOCUSING = {
  WINDOW: 'WINDOW',
  ICON: 'ICON',
  DESKTOP: 'DESKTOP',
};
export const POWER_STATE = {
  START: 'START',
  LOG_OFF: 'LOG_OFF',
  TURN_OFF: 'TURN_OFF',
};

// The power verbs: one vocabulary for the dialog, the Start menu, cmd's
// shutdown and Control Panel. The values travel over the shell bus.
export const POWER_ACTION = {
  LOG_OFF: 'logoff',
  SWITCH_USER: 'switch-user',
  TURN_OFF: 'shutdown',
  RESTART: 'restart',
};
