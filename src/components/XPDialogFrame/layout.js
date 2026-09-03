/**
 * Absolute layout for property sheets measured off Windows XP.
 *
 * Positions are taken from screenshots relative to the dialog's outer
 * top-left corner, so a sheet can be typed straight from the capture. The
 * frame's left edge and caption are subtracted here to place the element
 * inside the dialog's client area.
 */
export const DIALOG_FRAME = { x: 3, y: 29 };

/** An element at dialog coordinates (x, y), optionally w by h. */
export function dialogAt(x, y, w, h) {
  const s = { left: x - DIALOG_FRAME.x, top: y - DIALOG_FRAME.y };
  if (w != null) s.width = w;
  if (h != null) s.height = h;
  return s;
}

/** The client area's size for a dialog whose outer size is w by h. */
export function dialogClient(w, h) {
  return {
    width: w - DIALOG_FRAME.x * 2,
    height: h - DIALOG_FRAME.y - DIALOG_FRAME.x,
  };
}
