// Level records: the church from its room dump, a generated wall from
// levelgen's plan, and the endless flood wall. All three carry the same
// fields, so the rest of the game branches only on `kind`.
import churchRoom from './rooms/churchclimb5';
import { CHURCH_BEST_KEY, TILE, VIEW_W, cellKey, rectCells } from './constants';

export const CHURCH_GENERATORS = [
  {
    x: 1320,
    y: 2840,
    waittime: 70,
    waitoff: 15,
    endY: 3200,
  },
  {
    x: 1400,
    y: 2440,
    waittime: 70,
    waitoff: 10,
    endY: 2720,
  },
  {
    x: 1280,
    y: 2320,
    waittime: 70,
    waitoff: 48,
    endY: 2640,
  },
  {
    x: 1120,
    y: 2280,
    waittime: 50,
    waitoff: 10,
    endY: 2600,
  },
  {
    x: 1080,
    y: 2280,
    waittime: 50,
    waitoff: 15,
    endY: 2600,
  },
  {
    x: 1040,
    y: 2280,
    waittime: 50,
    waitoff: 20,
    endY: 2600,
  },
  {
    x: 1000,
    y: 2280,
    waittime: 50,
    waitoff: 25,
    endY: 2600,
  },
  {
    x: 1160,
    y: 2640,
    waittime: 60,
    waitoff: 15,
    endY: 3000,
  },
];

export const CHURCH_ZONES = {
  bottom: {
    xMin: 690,
    xMax: 1712,
    yMin: 3560,
    yMax: 3800,
    floorY: 3754,
  },
  top: {
    xMin: 720,
    xMax: 1160,
    yMin: 2044,
    yMax: 2108,
    floorY: 2096,
  },
};

export const CHURCH_NO_GLOW = [
  {
    x: 1240,
    y: 3440,
  },
  {
    x: 920,
    y: 2120,
  },
];

export function buildChurch() {
  const room = churchRoom;
  const starters = [...room.starters].sort((a, b) => b.y - a.y);
  const findTrig = (x, y) => room.triggers.find(t => t.x === x && t.y === y);
  const alwaysCells = new Set();
  const glowCells = new Set();
  room.climb.forEach(r =>
    rectCells(
      r,
      CHURCH_NO_GLOW.some(n => n.x === r.x && n.y === r.y)
        ? alwaysCells
        : glowCells,
    ),
  );
  return {
    kind: 'church',
    w: room.w,
    h: room.h,
    bg: room.bg,
    solids: room.solids.filter(s => !(s.w === 24 && s.h === 32)),
    alwaysCells,
    glowCells,
    glowRects: room.climb.filter(
      r => !CHURCH_NO_GLOW.some(n => n.x === r.x && n.y === r.y),
    ),
    glowCellList: [],
    brittleMap: new Map(),
    appearGroups: [],
    coins: [],
    generators: CHURCH_GENERATORS,
    buckets: [],
    landing: room.landing[0],
    zones: CHURCH_ZONES,
    spawn: room.spawn,
    mountStarter: starters[0],
    topStarter: starters[starters.length - 1],
    startTrig: findTrig(1240, 3440) || room.triggers[0],
    finishTrig: findTrig(880, 2200) || room.triggers[0],
    decor: {
      wallswitch: room.decor.find(d => d.spr.includes('wallswitch')),
      table: room.decor.find(d => d.spr.includes('_climb_table')),
      trophies: room.decor.filter(d => d.spr.includes('trophy')),
      cup: room.decor.find(d => d.spr.includes('npc_cup')),
    },
    bestKey: CHURCH_BEST_KEY,
    par: 0,
  };
}

export function buildGenerated(def) {
  const alwaysCells = new Set();
  const glowCells = new Set();
  def.noGlow.forEach(r => rectCells(r, alwaysCells));
  def.climb.forEach(r => rectCells(r, glowCells));
  alwaysCells.forEach(k => glowCells.delete(k));
  const glowCellList = [...glowCells].map(k => {
    const [c, r] = k.split(',').map(Number);
    return {
      c,
      r,
      x: c * TILE,
      y: r * TILE,
      k,
    };
  });
  const brittleMap = new Map();
  def.brittle.forEach(b =>
    brittleMap.set(cellKey(b.c, b.r), {
      c: b.c,
      r: b.r,
      dangerous: b.dangerous,
      con: 0,
      timer: 0,
    }),
  );
  return {
    kind: 'generated',
    seed: def.seed,
    def,
    w: def.w,
    h: def.h,
    bg: 4278190080,
    solids: [],
    alwaysCells,
    glowCells,
    glowRects: [],
    glowCellList,
    brittleMap,
    appearGroups: def.appearGroups.map(g => ({
      ...g,
      on: false,
      alpha: 0,
    })),
    coins: def.coins.map(cn => ({
      ...cn,
      taken: false,
    })),
    generators: def.generators,
    buckets: def.buckets,
    landing: def.landing,
    zones: def.zones,
    spawn: def.spawn,
    mountStarter: def.mountStarter,
    topStarter: def.topStarter,
    startTrig: def.startTrig,
    finishTrig: def.finishTrig,
    decor: {},
    bestKey: String(def.seed),
    par: def.par,
  };
}

// the flood mode: an endless wall grown on the fly, cells added to the
// live sets as the camera rises
// the flood mode: an endless wall grown on the fly, cells added to the
// live sets as the camera rises
export const ENDLESS_ROWS = 2200;

export function buildEndless(seed) {
  const h = (ENDLESS_ROWS + 8) * TILE;
  const baseRow = ENDLESS_ROWS;
  const alwaysCells = new Set();
  for (let c = 6; c <= 10; c++) alwaysCells.add(cellKey(c, baseRow));
  return {
    kind: 'endless',
    seed,
    w: VIEW_W,
    h,
    bg: 4278190080,
    solids: [],
    alwaysCells,
    glowCells: new Set(),
    glowRects: [],
    glowCellList: [],
    brittleMap: new Map(),
    appearGroups: [],
    coins: [],
    generators: [],
    buckets: [],
    landing: {
      x: 0,
      y: Infinity,
      w: 0,
    },
    zones: {
      bottom: {
        xMin: 0,
        xMax: VIEW_W,
        yMin: h - 80,
        yMax: h,
        floorY: h - 40,
      },
      top: {
        xMin: 0,
        xMax: VIEW_W,
        yMin: 0,
        yMax: 40,
        floorY: 20,
      },
    },
    spawn: {
      x: 8 * TILE + 20,
      y: h - 60,
    },
    // no ground under this wall: park the dismount line out of reach
    mountStarter: {
      x: 8 * TILE,
      y: 1e9,
    },
    topStarter: {
      x: 0,
      y: -1e9,
    },
    startTrig: {
      x: -9999,
      y: -9999,
      w: 1,
      h: 1,
    },
    finishTrig: {
      x: -9999,
      y: -9999,
      w: 1,
      h: 1,
    },
    decor: {},
    bestKey: 'endless',
    par: 0,
  };
}
