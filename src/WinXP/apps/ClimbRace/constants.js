// Shared numbers and tiny helpers: the view, the tile grid, the fixed step,
// easings, and the cell key the wall's sets are built on.
export const VIEW_W = 640;

export const VIEW_H = 480;

export const TILE = 40;

export const STEP = 1 / 30;

export const FULLTIME = 54000; // the original's 30 minute cap
export const CHURCH_BEST_KEY = 'ch5'; // best-time slot, tenths like the game's flag

export const DIRS = {
  down: {
    dx: 0,
    dy: 1,
  },
  right: {
    dx: 1,
    dy: 0,
  },
  up: {
    dx: 0,
    dy: -1,
  },
  left: {
    dx: -1,
    dy: 0,
  },
};

export const DIR_ORDER = ['up', 'down', 'right', 'left'];

export const easeInOut = t => t * t * (3 - 2 * t);

export const easeOut = t => 1 - (1 - t) * (1 - t);

export const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

export const lerp = (a, b, t) => a + (b - a) * t;

export const STREAM_TILES = 4;

export const MOVE_RATE = 4;

export const WATER_GRAB_DELAY = 20;

export const EMBER_HOLD = 45;
// the water column's cycling cyan tints (GameMaker BGR 15313408 etc.)
// the water column's cycling cyan tints (GameMaker BGR 15313408 etc.)
export const WATER_COLS = [
  'rgb(0,172,233)',
  'rgb(0,172,233)',
  'rgb(14,189,233)',
  'rgb(0,172,233)',
];

export const cellKey = (c, r) => `${c},${r}`;

export const rectCells = (rc, out) => {
  const c0 = Math.floor(rc.x / TILE);
  const r0 = Math.floor(rc.y / TILE);
  const c1 = Math.ceil((rc.x + rc.w) / TILE) - 1;
  const r1 = Math.ceil((rc.y + rc.h) / TILE) - 1;
  for (let c = c0; c <= c1; c++)
    for (let rr = r0; rr <= r1; rr++) out.add(cellKey(c, rr));
};

export const inRect = (rc, x, y) =>
  x > rc.x && x < rc.x + rc.w && y > rc.y && y < rc.y + rc.h;
