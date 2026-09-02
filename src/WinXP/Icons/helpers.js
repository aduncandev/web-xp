// Pure constants and grid math for the desktop icon layer. Nothing here
// closes over component state.
import { TASKBAR_HEIGHT } from '../constants';
import { MY_COMPUTER_TARGET } from '../shell/location';

// Shell-namespace infotips, keyed by shortcut target. Only strings verified
// against the reference kit are listed; unverified icons show no infotip.
export const INFOTIPS = {
  [MY_COMPUTER_TARGET]: 'Displays the files and folders on your computer',
};

// XP-like desktop grid: icons flow top->bottom then left->right.
export const CELL_W = 75;
export const CELL_H = 75;
export const GRID_X = 2;
export const GRID_Y = 2;
export const TASKBAR_H = TASKBAR_HEIGHT;
export const ICON_HIT_H = 62; // visual height of an icon (image + label) for hit tests
// XP wraps a desktop label over at most two lines and ellipsizes what's left
export const LABEL_LINES = 2;
export const LABEL_LINE_H = 13;
export const DRAG_THRESHOLD = 4;
export const EMPTY_LAYOUT = {
  positions: {},
  autoArrange: false,
  alignToGrid: true,
};

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
export const cellKey = c => `${c.col},${c.row}`;

export function nearestFreeCell(target, occupied, cols, rows) {
  if (!occupied.has(cellKey(target))) return target;
  let best = null;
  let bestD = Infinity;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      if (occupied.has(`${col},${row}`)) continue;
      const d = (col - target.col) ** 2 + (row - target.row) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { col, row };
      }
    }
  }
  return best || target;
}
