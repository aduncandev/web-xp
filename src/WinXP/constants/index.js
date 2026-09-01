/*
 * How tall the taskbar is, in pixels.
 *
 * The taskbar's own CSS, the desktop work area it leaves behind, and the
 * height a maximized window is given all have to agree, or windows park
 * under the bar or float above it. They used to be three separate 30s in
 * two files.
 */
export const TASKBAR_HEIGHT = 30;

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
