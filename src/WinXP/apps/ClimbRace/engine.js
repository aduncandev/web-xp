import { loadAll } from './sprites';
import {
  createMixer,
  createMusicLoop,
  musClimbSrc,
  musCastletownSrc,
  musKikkySrc,
  musBirdnoiseSrc,
  smileSrc,
} from './sounds';
import { generateLevel } from './levelgen';
import { drawDarkBox, createCodeEntry } from './dialogue';
import { loadFonts } from './fonts';
import churchRoom from './rooms/churchclimb5';

const VIEW_W = 640;
const VIEW_H = 480;
const TILE = 40;
const STEP = 1 / 30;
const FULLTIME = 54000; // the original's 30 minute cap
const CHURCH_BEST_KEY = 'ch5'; // best-time slot, tenths like the game's flag

const DIRS = {
  down: { dx: 0, dy: 1 },
  right: { dx: 1, dy: 0 },
  up: { dx: 0, dy: -1 },
  left: { dx: -1, dy: 0 },
};
const DIR_ORDER = ['up', 'down', 'right', 'left'];
const easeInOut = t => t * t * (3 - 2 * t);
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
const lerp = (a, b, t) => a + (b - a) * t;

const STREAM_TILES = 4;
const MOVE_RATE = 4;
const WATER_GRAB_DELAY = 20;
const EMBER_HOLD = 45;
// the water column's cycling cyan tints (GameMaker BGR 15313408 etc.)
const WATER_COLS = [
  'rgb(0,172,233)',
  'rgb(0,172,233)',
  'rgb(14,189,233)',
  'rgb(0,172,233)',
];

const CHURCH_GENERATORS = [
  { x: 1320, y: 2840, waittime: 70, waitoff: 15, endY: 3200 },
  { x: 1400, y: 2440, waittime: 70, waitoff: 10, endY: 2720 },
  { x: 1280, y: 2320, waittime: 70, waitoff: 48, endY: 2640 },
  { x: 1120, y: 2280, waittime: 50, waitoff: 10, endY: 2600 },
  { x: 1080, y: 2280, waittime: 50, waitoff: 15, endY: 2600 },
  { x: 1040, y: 2280, waittime: 50, waitoff: 20, endY: 2600 },
  { x: 1000, y: 2280, waittime: 50, waitoff: 25, endY: 2600 },
  { x: 1160, y: 2640, waittime: 60, waitoff: 15, endY: 3000 },
];
const CHURCH_ZONES = {
  bottom: { xMin: 690, xMax: 1712, yMin: 3560, yMax: 3800, floorY: 3754 },
  top: { xMin: 720, xMax: 1160, yMin: 2044, yMax: 2108, floorY: 2096 },
};
const CHURCH_NO_GLOW = [
  { x: 1240, y: 3440 },
  { x: 920, y: 2120 },
];

const cellKey = (c, r) => `${c},${r}`;
const rectCells = (rc, out) => {
  const c0 = Math.floor(rc.x / TILE);
  const r0 = Math.floor(rc.y / TILE);
  const c1 = Math.ceil((rc.x + rc.w) / TILE) - 1;
  const r1 = Math.ceil((rc.y + rc.h) / TILE) - 1;
  for (let c = c0; c <= c1; c++)
    for (let rr = r0; rr <= r1; rr++) out.add(cellKey(c, rr));
};
const inRect = (rc, x, y) =>
  x > rc.x && x < rc.x + rc.w && y > rc.y && y < rc.y + rc.h;

function buildChurch() {
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

function buildGenerated(def) {
  const alwaysCells = new Set();
  const glowCells = new Set();
  def.noGlow.forEach(r => rectCells(r, alwaysCells));
  def.climb.forEach(r => rectCells(r, glowCells));
  alwaysCells.forEach(k => glowCells.delete(k));
  const glowCellList = [...glowCells].map(k => {
    const [c, r] = k.split(',').map(Number);
    return { c, r, x: c * TILE, y: r * TILE, k };
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
    appearGroups: def.appearGroups.map(g => ({ ...g, on: false, alpha: 0 })),
    coins: def.coins.map(cn => ({ ...cn, taken: false })),
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

export function createGame(canvas, opts) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const getVolume = opts.getVolume || (() => 0.5);
  const awardPoints = opts.awardPoints || (() => {});
  const store = opts.store || { load: () => null, save: () => {} };
  let saveData;
  try {
    saveData = store.load() || {};
  } catch (e) {
    saveData = {};
  }
  if (!saveData.best) saveData.best = {};
  if (!saveData.paid) saveData.paid = {};
  const persist = () => {
    try {
      store.save(saveData);
    } catch (e) {}
  };
  const mixer = createMixer(getVolume);
  let sprites = null;
  let bake = null; // the church's baked backdrop image
  let backdrop = null; // whichever backdrop the loaded level uses
  let tinted = null;
  let chargeTint = null;
  let destroyed = false;
  let raf = 0;
  const music = createMusicLoop(musClimbSrc, () => getVolume() * 0.5);
  const castleMusic = createMusicLoop(
    musCastletownSrc,
    () => getVolume() * 0.5,
  );
  const kikkyMusic = createMusicLoop(musKikkySrc, () => getVolume() * 0.5);
  const birdMusic = createMusicLoop(musBirdnoiseSrc, () => 0);
  const droneLoop = createMusicLoop(smileSrc, () => 0, 0.15);

  let phase = 'menu'; // menu | codeentry | game | results
  let menuSel = 0;
  let codeEntry = null;
  let lastSeed = '0000';
  let results = null;
  let L = null;

  let mode = 'ground'; // ground | mount | wall | finish
  let running = false;
  let elapsed = 0;
  let thisTime = -1;
  let glowAlpha = 0;
  let glowTarget = 0;
  let switchLit = false;
  let siner = 0;
  let holdExitT = 0;
  let finishT = 0;
  let camX = 0;
  let camY = 0;
  const board = { x: 40, y: 0, siner: 0 };
  let confetti = [];
  let anims = [];
  let ghosts = [];
  let fallingTiles = [];
  let coinMarker = null;
  let coinsTaken = 0;
  let kris = null;
  let walker = null;
  let mount = null;
  let zone = 'bottom';
  let streams = [];
  let dialog = null; // the cup's dialogue box, church only

  const seedsCleared = () => Object.keys(saveData.paid).length;

  const cupSpot = () => ({
    x: L.decor.cup ? L.decor.cup.x : 1108,
    y: L.decor.cup ? L.decor.cup.y : 3544,
  });
  const cupCenter = () => {
    const spot = cupSpot();
    return { x: spot.x + Math.sin(siner / 55) * 26 + 23, y: spot.y + 66 };
  };
  const nearCup = () =>
    L.kind === 'church' &&
    walker &&
    Math.abs(walker.x - cupCenter().x) < 64 &&
    Math.abs(walker.y - cupCenter().y) < 130;

  function cupLines() {
    const best = loadBest();
    const cleared = seedsCleared();
    const lines = [];
    if (!best) {
      lines.push('A climber!! Finally!!');
      lines.push(
        "Touch the switch and the whole wall lights up. Then it's just you and gravity.",
      );
      lines.push('I keep the times. All of them. Forever.');
    } else if (best <= 170) {
      lines.push('THAT time. You did THAT time.');
      lines.push(
        "The trophy's on the table. I polish it more than the others.",
      );
    } else {
      lines.push(`Your best is ${(best / 10).toFixed(1)}s.`);
      lines.push("Respectable. The wall's seen better. The wall talks to me.");
    }
    if (cleared >= 5)
      lines.push(
        `You've cleared ${cleared} of the strange walls, too. I don't know where those come from.`,
      );
    return lines;
  }

  // darkzone dialoguer metrics: box (24,312)-(616,478), writer (58,340),
  // 36px lines
  const DIALOG_TEXT_W = 500;
  function wrapStatement(s) {
    const words = s.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (cur && test.length * 15 > DIALOG_TEXT_W) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function openLines(statements, opts) {
    dialog = { pages: statements, idx: 0, chars: 0, sel: 0, ...(opts || {}) };
  }

  function openCupTalk() {
    openLines(cupLines());
  }

  function stepDialog() {
    if (dialog.choosing) {
      if (pressed.left || pressed.right) {
        dialog.sel = dialog.sel === 0 ? 1 : 0;
        play('menumove', 0.8, 1);
      }
      if (pressed.jump) {
        const cb = dialog.chosen;
        const sel = dialog.sel;
        dialog = null;
        if (cb) cb(sel);
      }
      return;
    }
    const statement = dialog.pages[dialog.idx] || '';
    const total = statement.length;
    if (dialog.chars < total) {
      dialog.chars += 1;
      const ch = statement[dialog.chars - 1];
      if (ch && ch !== ' ' && dialog.chars % 2 === 0) play('text', 0.55, 1);
    }
    if (pressed.jump) {
      if (dialog.chars < total) dialog.chars = total;
      else {
        dialog.idx += 1;
        dialog.chars = 0;
        if (dialog.idx >= dialog.pages.length) {
          if (dialog.choices) dialog.choosing = true;
          else closeDialog();
        }
      }
    }
    if (pressed.cancel && dialog.chars < total) dialog.chars = total;
  }

  function closeDialog() {
    const cb = dialog && dialog.onClose;
    dialog = null;
    if (cb) cb();
  }
  const held = {};
  const pressed = {};
  let acc = 0;
  let last = performance.now();

  const play = (n, g, r) => mixer.play(n, g, r);
  const loadBest = () => {
    const v = Number(saveData.best[L.bestKey]);
    return v > 0 ? v : null;
  };
  const saveBest = tenths => {
    const prev = Number(saveData.best[L.bestKey]);
    if (!prev || tenths < prev) {
      saveData.best[L.bestKey] = tenths;
      persist();
      return true;
    }
    return false;
  };
  let newBest = false;

  const climbableAt = (c, r) => {
    const k = cellKey(c, r);
    if (L.alwaysCells.has(k)) return true;
    if (!(running || mode === 'finish')) return false;
    if (!L.glowCells.has(k)) return false;
    if (hiddenCells.has(k) || brokenCells.has(k)) return false;
    return true;
  };
  const hiddenCells = new Set();
  const brokenCells = new Set();
  const cellAppearGroup = new Map();

  function resetWallState() {
    brokenCells.clear();
    fallingTiles = [];
    L.brittleMap.forEach(b => {
      b.con = 0;
      b.timer = 0;
    });
    hiddenCells.clear();
    cellAppearGroup.clear();
    L.appearGroups.forEach(g => {
      g.on = false;
      g.alpha = 0;
      g.rung = false;
      g.ringT = 0;
      g.cells.forEach(k => {
        hiddenCells.add(k);
        cellAppearGroup.set(k, g);
      });
    });
    L.coins.forEach(cn => {
      cn.taken = false;
    });
    coinsTaken = 0;
    coinMarker = null;
  }

  function resetToGround(x, whichZone, y) {
    mode = 'ground';
    kris = null;
    zone = whichZone || 'bottom';
    const z = L.zones[zone];
    walker = {
      x: Math.max(z.xMin, Math.min(z.xMax, x != null ? x : L.spawn.x)),
      y: Math.max(z.yMin, Math.min(z.yMax, y != null ? y : z.floorY)),
      dir: 'right',
      animT: 0,
      moving: false,
      runT: 0,
    };
  }

  function loadLevel(level) {
    L = level;
    running = false;
    elapsed = 0;
    thisTime = -1;
    glowAlpha = 0;
    glowTarget = 0;
    switchLit = false;
    holdExitT = 0;
    finishT = 0;
    streams = [];
    anims = [];
    ghosts = [];
    confetti = [];
    dialog = null;
    results = null;
    newBest = false;
    board.x = 40;
    board.y = L.h;
    board.siner = 0;
    resetWallState();
    resetToGround();
    camX = clampCamX(L.spawn.x - VIEW_W / 2);
    camY = clampCamY(L.spawn.y - VIEW_H / 2 - 80);
    backdrop = L.kind === 'church' ? bake : buildBackdrop(L);
    phase = 'game';
  }

  function drawTileInto(g, ts, meta, val, dx, dy) {
    const index = val & 0x7ffff;
    if (!index) return;
    const flipH = (val & 0x8000000) !== 0;
    const flipV = (val & 0x10000000) !== 0;
    const stride = meta.tileW + meta.borderX * 2;
    const sx = (index % meta.cols) * stride + meta.borderX;
    const sy = Math.floor(index / meta.cols) * stride + meta.borderY;
    if (!flipH && !flipV) {
      g.drawImage(ts, sx, sy, meta.tileW, meta.tileH, dx, dy, TILE, TILE);
      return;
    }
    g.save();
    g.translate(dx + (flipH ? TILE : 0), dy + (flipV ? TILE : 0));
    g.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    g.drawImage(ts, sx, sy, meta.tileW, meta.tileH, 0, 0, TILE, TILE);
    g.restore();
  }

  function buildBackdrop(level) {
    const cnv = document.createElement('canvas');
    cnv.width = level.w;
    cnv.height = level.h;
    const g = cnv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#000';
    g.fillRect(0, 0, level.w, level.h);
    const meta = { tileW: 40, tileH: 40, borderX: 2, borderY: 2, cols: 24 };
    const ts = sprites.churchTileset.img;
    const BRICK = 271;
    const WINDOW = [264, 270, 276];
    const WALL_EDGE = 346;
    const FLOOR_EDGE = 277;
    const COBBLE = 73;
    const COBBLE_ALT = 79;
    const FLOOR_LIP = 450;
    const slab = level.def.slab;
    const c0 = Math.floor(slab.x / TILE);
    const r0 = Math.floor(slab.y / TILE);
    const c1 = Math.floor((slab.x + slab.w) / TILE);
    const r1 = Math.floor((slab.y + slab.h) / TILE);
    const wall = new Set();
    const grow = (cc, rr, rad) => {
      for (let dc = -rad; dc <= rad; dc++)
        for (let dr = -rad; dr <= rad; dr++) {
          const wc = cc + dc;
          const wr = rr + dr;
          if (wc >= c0 && wc < c1 && wr >= r0 && wr < r1)
            wall.add(`${wc},${wr}`);
        }
    };
    const growKey = (k, rad) => {
      const [cc, rr] = k.split(',').map(Number);
      grow(cc, rr, rad);
    };
    level.alwaysCells.forEach(k => growKey(k, 2));
    level.glowCells.forEach(k => growKey(k, 2));
    level.coins.forEach(cn =>
      grow(Math.floor(cn.x / TILE), Math.floor(cn.y / TILE), 2),
    );
    level.generators.forEach(gen => {
      grow(Math.floor(gen.x / TILE), Math.floor(gen.y / TILE), 2);
      grow(Math.floor(gen.x / TILE), Math.floor(gen.endY / TILE), 2);
    });
    const boothTopRow = Math.floor(level.zones.top.yMin / TILE) - 1;
    const ledgeRow = Math.floor(level.landing.y / TILE);
    for (let c = c0; c < c1; c++) {
      for (let r = boothTopRow; r <= boothTopRow + 3; r++)
        wall.add(`${c},${r}`);
      for (let r = ledgeRow - 1; r < r1; r++) wall.add(`${c},${r}`);
    }
    wall.forEach(k => {
      const [c, r] = k.split(',').map(Number);
      drawTileInto(g, ts, meta, BRICK, c * TILE, r * TILE);
    });
    // tile 273 = the church's own start/exit anchor brick
    const ANCHOR = 273;
    level.alwaysCells.forEach(k => {
      const [c, r] = k.split(',').map(Number);
      drawTileInto(g, ts, meta, ANCHOR, c * TILE, r * TILE);
    });
    const isBare = (cc, rr) => {
      const k = `${cc},${rr}`;
      return (
        wall.has(k) && !level.glowCells.has(k) && !level.alwaysCells.has(k)
      );
    };
    for (let band = r0 + 6; band < ledgeRow - 5; band += 11) {
      for (let attempt = 0; attempt < 24; attempt++) {
        const c = c0 + 2 + ((band * 31 + attempt * 7) % (c1 - c0 - 7));
        let fits = true;
        for (let rr = band; rr < band + 3 && fits; rr++)
          if (!isBare(c, rr) || !isBare(c + 3, rr)) fits = false;
        if (!fits) continue;
        [c, c + 3].forEach(cc => {
          WINDOW.forEach((tileIdx, i) =>
            drawTileInto(g, ts, meta, tileIdx, cc * TILE, (band + i) * TILE),
          );
        });
        break;
      }
    }
    const sprinkle = (cc, rr) =>
      (((cc * 2654435761) ^ (rr * 97)) >>> 0) % 100 < 14;
    const drawRow = (row, idx, alt) => {
      for (let c = c0; c < c1; c++)
        drawTileInto(
          g,
          ts,
          meta,
          alt && sprinkle(c, row) ? alt : idx,
          c * TILE,
          row * TILE,
        );
    };
    for (let r = boothTopRow; r <= boothTopRow + 2; r++)
      drawRow(r, COBBLE, COBBLE_ALT);
    drawRow(boothTopRow + 3, WALL_EDGE);
    drawRow(ledgeRow, FLOOR_EDGE);
    for (let r = ledgeRow + 1; r < r1 - 1; r++) drawRow(r, COBBLE, COBBLE_ALT);
    drawRow(r1 - 1, FLOOR_LIP);
    g.fillStyle = 'rgba(0,0,0,0.55)';
    wall.forEach(k => {
      const [c, r] = k.split(',').map(Number);
      const x = c * TILE;
      const y = r * TILE;
      if (!wall.has(`${c},${r - 1}`)) g.fillRect(x, y, TILE, 3);
      if (!wall.has(`${c},${r + 1}`)) g.fillRect(x, y + TILE - 3, TILE, 3);
      if (!wall.has(`${c - 1},${r}`)) g.fillRect(x, y, 3, TILE);
      if (!wall.has(`${c + 1},${r}`)) g.fillRect(x + TILE - 3, y, 3, TILE);
    });
    return cnv;
  }

  function cancelRun() {
    running = false;
    glowTarget = 0;
    switchLit = false;
  }

  function endRunAndDrop() {
    cancelRun();
    play('ghost', 0.7, 0.9);
    play('ghost', 0.7, 1.3);
    if (kris && !L.alwaysCells.has(cellKey(kris.lastTile.c, kris.lastTile.r))) {
      mixer.stopCharge();
      kris.state = 'fall';
      kris.fallV = 0;
      kris.fallT = 0;
      kris.noGrab = true;
      kris.grabDelay = 10;
      play('fall', 0.5, 1.1);
    }
  }

  function startRun() {
    running = true;
    elapsed = 0;
    thisTime = -1;
    newBest = false;
    glowTarget = 1;
    switchLit = true;
    resetWallState();
    play('ghost', 0.7, 1.4);
    play('ghost', 0.7, 1.6);
  }

  function finishRun() {
    running = false;
    thisTime = elapsed;
    newBest = saveBest(Math.floor(elapsed / 3));
    switchLit = false;
    mode = 'finish';
    finishT = 0;
    mixer.stopCharge();
    if (kris) {
      if (kris.state === 'step' && kris.stepTo) {
        kris.x = kris.stepTo.x;
        kris.y = kris.stepTo.y;
      }
      kris.state = 'neutral';
      kris.arc = 0;
      kris.chargeAmt = 0;
    }
    play('victory', 0.9);
    if (L.kind === 'generated') {
      const bonus =
        elapsed <= L.par
          ? 10
          : Math.max(
              0,
              Math.min(
                10,
                Math.round((10 * (2.4 * L.par - elapsed)) / (1.4 * L.par)),
              ),
            );
      const xp = coinsTaken + bonus;
      const prev = saveData.paid[L.seed] || 0;
      const award = Math.max(0, xp - prev);
      if (award > 0) {
        saveData.paid[L.seed] = xp;
        persist();
        awardPoints(award);
      }
      results = {
        tenths: Math.floor(elapsed / 3),
        coins: coinsTaken,
        bonus,
        xp,
        award,
      };
    }
    for (let i = 0; i < 16; i++) {
      const ang = Math.random() * Math.PI - Math.PI;
      const sp = 3 + Math.random() * 4;
      confetti.push({
        x: board.x + 42,
        y: board.y + 16,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 2,
        col: ['#ff5a5a', '#ffd93c', '#7cff6b', '#6bc7ff', '#ff8bde', '#fff'][
          i % 6
        ],
        life: 40 + Math.random() * 25,
      });
    }
  }

  function startMusic() {
    music.start();
  }
  function stopMusic() {
    music.stop();
  }

  function keyDir(e) {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        return 'up';
      case 'ArrowDown':
      case 's':
      case 'S':
        return 'down';
      case 'ArrowLeft':
      case 'a':
      case 'A':
        return 'left';
      case 'ArrowRight':
      case 'd':
      case 'D':
        return 'right';
      default:
        return null;
    }
  }
  const isJumpKey = e => e.key === 'z' || e.key === 'Z' || e.key === 'Enter';
  const isCancelKey = e => e.key === 'x' || e.key === 'X' || e.key === 'Shift';

  function onKeyDown(e) {
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)
    )
      e.preventDefault();
    if (e.repeat) return;
    const d = keyDir(e);
    if (d) {
      held[d] = true;
      pressed[d] = true;
    }
    if (isJumpKey(e)) {
      held.jump = true;
      pressed.jump = true;
    }
    if (isCancelKey(e)) {
      held.cancel = true;
      pressed.cancel = true;
    }
    if (e.key === 'Escape') pressed.menu = true;
    if (phase !== 'game') return;
    if (mode === 'ground' && !dialog && isJumpKey(e)) {
      const wantsTalk =
        nearCup() &&
        (!nearMount() ||
          Math.abs(walker.x - cupCenter().x) <
            Math.abs(walker.x - (zoneStarter().x + 20)));
      if (wantsTalk) {
        openCupTalk();
        pressed.jump = false;
      } else if (nearMount()) beginMount();
    }
    if (mode === 'wall' && kris) {
      if (d) {
        const len = Math.min(4, Math.ceil(5 - kris.momentum * 2));
        Object.keys(kris.buffers).forEach(k => {
          if (k !== 'jump') kris.buffers[k] = 0;
        });
        kris.buffers[d] = len;
        if (kris.state === 'slip' && d === kris.bumped)
          kris.slipT = Math.min(kris.slipT, 2);
      }
      if (isJumpKey(e)) kris.buffers.jump = 3;
      if (isCancelKey(e) && kris.state === 'charge') cancelCharge();
    }
  }
  function onKeyUp(e) {
    const d = keyDir(e);
    if (d) held[d] = false;
    if (isJumpKey(e)) held.jump = false;
    if (isCancelKey(e)) held.cancel = false;
  }
  const clearPressed = () => {
    Object.keys(pressed).forEach(k => {
      pressed[k] = false;
    });
  };

  const zoneStarter = () => (zone === 'top' ? L.topStarter : L.mountStarter);
  const nearMount = () =>
    Math.abs(walker.x - (zoneStarter().x + 20)) < 70 &&
    Math.abs(walker.y - (zoneStarter().y + (zone === 'top' ? -20 : 120))) < 190;

  function beginMount() {
    const st = zoneStarter();
    const c = Math.round(st.x / TILE);
    const r = Math.round(st.y / TILE);
    mount = {
      fx: walker.x,
      fy: walker.y - 30,
      tx: c * TILE + 20,
      ty: r * TILE + 20,
      cell: { c, r },
      t: 0,
    };
    mode = 'mount';
    play('jump', 0.7);
  }

  function mountAt(cell) {
    kris = {
      x: cell.c * TILE + 20,
      y: cell.r * TILE + 20,
      state: 'neutral',
      dir: 'up',
      lastTile: { ...cell },
      climbIndex: 0,
      momentum: 0,
      stepFrom: null,
      stepTo: null,
      stepT: 0,
      stepRate: 10,
      jumping: false,
      chargeAmt: 0,
      chargeT: 0,
      slipT: 0,
      slipDir: 'left',
      bumped: null,
      relockT: 10,
      fallV: 0,
      fallT: 0,
      grab: null,
      hurtT: 0,
      buffers: { up: 0, down: 0, left: 0, right: 0, jump: 0 },
      arc: 0,
    };
  }

  function cancelCharge() {
    mixer.stopCharge();
    play('txttor', 0.5, 0.4);
    play('txtal', 0.5, 0.4);
    play('passing', 0.2, 1.8);
    kris.state = 'neutral';
    kris.chargeAmt = 0;
    kris.relockT = 10;
  }

  function reachableTiles(dir, amount) {
    const d = DIRS[dir];
    let found = 0;
    for (let i = 1; i <= amount; i++) {
      if (climbableAt(kris.lastTile.c + d.dx * i, kris.lastTile.r + d.dy * i))
        found = i;
    }
    return found;
  }

  function onCellSettled() {
    const k = cellKey(kris.lastTile.c, kris.lastTile.r);
    const brit = L.brittleMap.get(k);
    if (brit && brit.con === 0) {
      brit.con = 1;
      brit.timer = 0;
    }
  }

  function breakBrittle(brit, k) {
    brit.con = 2;
    brokenCells.add(k);
    play('heavyswing', 0.7);
    fallingTiles.push({
      x: brit.c * TILE,
      y: brit.r * TILE,
      t: 0,
      v: 0,
    });
  }

  function tryStep(dir, fromJump) {
    const d = DIRS[dir];
    const reach = fromJump ? kris.chargeAmt : 1;
    for (let i = reach; i >= 1; i--) {
      const c = kris.lastTile.c + d.dx * i;
      const r = kris.lastTile.r + d.dy * i;
      if (climbableAt(c, r)) {
        kris.stepFrom = { x: kris.x, y: kris.y };
        kris.stepTo = { x: c * TILE + 20, y: r * TILE + 20 };
        kris.lastTile = { c, r };
        kris.stepT = 0;
        kris.jumping = fromJump;
        kris.stepRate = fromJump ? 6 + kris.chargeAmt * 2 : 10;
        kris.state = 'step';
        kris.climbIndex = kris.climbIndex === 0 ? 2 : 0;
        kris.dir = dir;
        play('wing', 0.6, 1.1 + Math.random() * 0.1);
        const dustN = fromJump ? 5 : 1;
        for (let k = 0; k < dustN; k++) {
          anims.push({
            spr: 'dustSmall',
            frame: 0,
            speed: 0.5,
            x: kris.x + (fromJump ? Math.random() * 40 - 20 : 0),
            y: kris.y + (fromJump ? Math.random() * 40 - 20 : 10),
            vx: 0,
            vy: -2,
          });
        }
        return true;
      }
    }
    if (dir === 'down' && !fromJump && kris.y >= L.mountStarter.y - TILE) {
      beginDismount();
      return false;
    }
    kris.state = 'slip';
    kris.slipT = fromJump ? 8 + kris.chargeAmt * 3 : 8 + kris.momentum * 4;
    kris.slipDir = dir === 'right' ? 'right' : 'left';
    kris.bumped = dir;
    kris.momentum = 0;
    kris.jumping = false;
    kris.chargeAmt = 0;
    play('bump', 0.6);
    return false;
  }

  function beginDismount() {
    mixer.stopCharge();
    cancelRun();
    kris.state = 'fall';
    kris.fallV = 0;
    kris.fallT = 0;
    kris.noGrab = true;
    kris.grabDelay = 10;
    play('fall', 0.5, 1.1);
  }

  function tick() {
    siner += 1;
    if (phase === 'menu') {
      stepMenu();
      clearPressed();
      return;
    }
    if (phase === 'codeentry') {
      stepCode();
      clearPressed();
      return;
    }
    if (phase === 'results') {
      stepResults();
      clearPressed();
      return;
    }
    if (phase === 'secret') {
      stepSecret();
      clearPressed();
      return;
    }
    if (pressed.menu) {
      if (dialog) {
        dialog = null;
        clearPressed();
        return;
      }
      mixer.stopCharge();
      phase = 'menu';
      clearPressed();
      return;
    }
    glowAlpha = lerp(glowAlpha, glowTarget, 0.12);
    stepBoard();
    stepFx();
    stepWater();

    if (mode === 'ground') {
      if (dialog) {
        stepDialog();
        clearPressed();
        return;
      }
      stepWalker();
      clearPressed();
      return;
    }
    if (mode === 'mount') {
      mount.t += 1;
      const t = Math.min(1, mount.t / 22);
      walker.x = lerp(mount.fx, mount.tx, t);
      walker.y = lerp(mount.fy, mount.ty, t) - Math.sin(t * Math.PI) * 56;
      if (t >= 1) {
        play('noise', 0.6);
        if (mount.dismount) {
          walker.y = mount.ty;
          mode = 'ground';
          if (results) phase = 'results';
          else if (L.kind === 'church' && thisTime !== -1) {
            loadLevel(L);
          }
        } else {
          mountAt(mount.cell);
          mode = 'wall';
        }
      }
      clearPressed();
      return;
    }
    if (mode === 'finish') {
      finishT += 1;
      if (kris) {
        if (kris.state === 'step') {
          kris.stepT += 1;
          if (kris.stepT > kris.stepRate) kris.stepT = kris.stepRate;
          const t = kris.stepT / kris.stepRate;
          const e = easeInOut(t);
          kris.x = kris.stepFrom.x + (kris.stepTo.x - kris.stepFrom.x) * e;
          kris.y = kris.stepFrom.y + (kris.stepTo.y - kris.stepFrom.y) * e;
          if (kris.stepT >= kris.stepRate) {
            kris.x = kris.stepTo.x;
            kris.y = kris.stepTo.y;
            kris.state = 'neutral';
          }
          finishT = 0;
        } else if (climbableAt(kris.lastTile.c, kris.lastTile.r - 1)) {
          const c = kris.lastTile.c;
          const r = kris.lastTile.r - 1;
          kris.stepFrom = { x: kris.x, y: kris.y };
          kris.stepTo = { x: c * TILE + 20, y: r * TILE + 20 };
          kris.lastTile = { c, r };
          kris.stepT = 0;
          kris.stepRate = 10;
          kris.jumping = false;
          kris.state = 'step';
          kris.climbIndex = kris.climbIndex === 0 ? 2 : 0;
          kris.dir = 'up';
          play('wing', 0.6, 1.1 + Math.random() * 0.1);
          anims.push({
            spr: 'dustSmall',
            frame: 0,
            speed: 0.5,
            x: kris.x,
            y: kris.y + 10,
            vx: 0,
            vy: -2,
          });
          finishT = 0;
        }
      }
      if (finishT >= 2 && kris) {
        glowTarget = 0;
        play('jump', 0.6);
        const kx = kris.x;
        const ky = kris.y;
        resetToGround(kx, 'top');
        mode = 'mount';
        mount = {
          fx: kx,
          fy: ky,
          tx: Math.max(L.zones.top.xMin, Math.min(L.zones.top.xMax, kx)),
          ty: L.zones.top.floorY,
          t: 0,
          dismount: true,
        };
      }
      clearPressed();
      return;
    }

    if (running) {
      elapsed += 1;
      if (kris.state !== 'fall' && inRect(L.startTrig, kris.x, kris.y)) {
        if (elapsed > 2) {
          play('metalhit', 0.8, 0.85);
          play('swallow', 0.8, 1.3);
        }
        elapsed = 0;
      }
      if (elapsed >= FULLTIME) endRunAndDrop();
    }
    if (running && held.cancel && kris.state === 'neutral') {
      holdExitT += 1;
      if (holdExitT >= 30) {
        holdExitT = 0;
        endRunAndDrop();
        clearPressed();
        return;
      }
    } else {
      holdExitT = 0;
    }
    if (
      !running &&
      kris.state === 'neutral' &&
      kris.lastTile.r <= Math.floor(L.topStarter.y / TILE) &&
      held.up
    ) {
      play('jump', 0.6);
      const kx = kris.x;
      const ky = kris.y;
      resetToGround(kx, 'top');
      mode = 'mount';
      mount = {
        fx: kx,
        fy: ky,
        tx: Math.max(L.zones.top.xMin, Math.min(L.zones.top.xMax, kx)),
        ty: L.zones.top.floorY,
        t: 0,
        dismount: true,
      };
      clearPressed();
      return;
    }
    stepKris();
    if (kris && mode === 'wall') {
      stepHazards();
      stepCoins();
      if (
        (kris.state === 'neutral' ||
          kris.state === 'charge' ||
          kris.state === 'slip') &&
        !climbableAt(kris.lastTile.c, kris.lastTile.r)
      ) {
        mixer.stopCharge();
        kris.chargeAmt = 0;
        kris.state = 'fall';
        kris.fallV = 0;
        kris.fallT = 0;
        kris.noGrab = false;
        kris.grabDelay = 10;
      }
      if (
        !running &&
        kris.state !== 'fall' &&
        inRect(L.startTrig, kris.x, kris.y)
      )
        startRun();
      if (
        running &&
        (inRect(L.finishTrig, kris.x, kris.y) ||
          kris.lastTile.r <= Math.floor(L.topStarter.y / TILE))
      ) {
        finishRun();
      }
    }
    clearPressed();
  }

  const MENU_ITEMS = ['CHURCH WALL', 'RANDOM SEED', 'ENTER SEED'];
  function stepMenu() {
    if (pressed.up) {
      menuSel = (menuSel + MENU_ITEMS.length - 1) % MENU_ITEMS.length;
      play('menumove', 0.8, 1);
    }
    if (pressed.down) {
      menuSel = (menuSel + 1) % MENU_ITEMS.length;
      play('menumove', 0.8, 0.9);
    }
    if (pressed.jump) {
      play('menumove', 0.8, 1.2);
      if (menuSel === 0) {
        loadLevel(buildChurch());
      } else if (menuSel === 1) {
        lastSeed = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        loadLevel(buildGenerated(generateLevel(lastSeed)));
      } else {
        codeEntry = createCodeEntry(4, lastSeed);
        phase = 'codeentry';
      }
    }
  }

  function stepCode() {
    codeEntry.step(
      {
        left: pressed.left,
        right: pressed.right,
        upHeld: held.up,
        downHeld: held.down,
        confirm: pressed.jump,
        cancel: pressed.cancel,
      },
      play,
    );
    if (codeEntry.result === -2) {
      codeEntry = null;
      phase = 'menu';
    } else if (typeof codeEntry.result === 'string') {
      const code = codeEntry.result;
      codeEntry = null;
      if (code === '6453') enterSecret('mike');
      else if (code === '1225') enterSecret('shelter');
      else {
        lastSeed = code;
        loadLevel(buildGenerated(generateLevel(lastSeed)));
      }
    }
  }

  function stepResults() {
    if (pressed.jump) {
      play('menumove', 0.8, 1.2);
      loadLevel(buildGenerated(generateLevel(L.seed)));
    } else if (pressed.cancel || pressed.menu) {
      play('menumove', 0.8, 0.8);
      phase = 'menu';
    }
  }

  let secret = null;

  const MIKE_NPC_SOLIDS = [
    [118, 240, 80, 40],
    [261, 240, 100, 40],
    [408, 240, 80, 40],
    [525, 180, 60, 40],
  ];
  const MIKE_SPOTS = [
    { key: 'mikeS', r: [120, 237, 80, 20] },
    { key: 'mikeM', r: [281, 188, 60, 60] },
    { key: 'mikeL', r: [424, 155, 52, 120] },
    { key: 'statue', r: [525, 129, 60, 80] },
  ];
  const KIKKY_SPOTS = [
    { key: 'bomb', r: [470, 264, 110, 96] },
    { key: 'button', r: [56, 264, 78, 70] },
    { key: 'slot', r: [140, 264, 320, 70] },
  ];
  const SHELTER_SOLIDS = [
    [0, 1220, 320, 20],
    [82, 1148, 156, 18],
    [0, 1020, 20, 200],
    [300, 1020, 20, 200],
    [260, 1020, 20, 20],
    [220, 1000, 20, 20],
    [40, 1020, 20, 20],
    [80, 1000, 20, 20],
    [100, 0, 20, 1000],
    [200, 0, 20, 1000],
    [120, 1106, 80, 18],
    [20, 1040, 20, 20],
    [60, 1020, 20, 20],
    [240, 1020, 20, 20],
    [280, 1040, 20, 20],
    [200, 1000, 20, 20],
    [100, 1000, 20, 20],
    [240, 1146, 20, 20],
    [220, 1126, 20, 20],
    [200, 1106, 20, 20],
    [60, 1146, 20, 20],
    [80, 1126, 20, 20],
    [100, 1106, 20, 20],
  ];
  const SHELTER_DOOR = [110, 1126, 104, 44];

  function secretLines(key) {
    if (secret.zone === 'mike')
      return {
        mikeS: [
          'Oh. A visitor. To this room. Sure.',
          "I made a game, you know. It's back there. State of the art.",
          'Two people have played it. One was me.',
        ],
        mikeM: [
          '(It does its whole routine.)',
          '(...It does it again.)',
          "(It doesn't have a name yet.)",
        ],
        mikeL: ['Hey!! Good to see you!!', "That's all. Just good to see you."],
        statue: ["(It's a gold statue of a TV.)", '(Recently polished.)'],
      }[key];
    return {
      slot: [
        '(A coin slot runs the whole length of the machine.)',
        '(One play costs more money than has ever existed.)',
      ],
      debris: ['(Coolant.)'],
    }[key];
  }

  function enterSecret(kind) {
    stopMusic();
    dialog = null;
    secret = {
      zone: kind === 'mike' ? 'mike' : 'shelter',
      t: 0,
      fade: 0,
      leaving: false,
      seen: {},
      talking: null,
      bgSpeed: -88,
      bgSpeedY: 1,
      bgSpeedSlow: -88,
      bgSpeedYSlow: 1,
      transition: null,
      park: null,
      shelterSeq: 0,
      shelterHold: 0,
      doorT: 0,
      shake: 0,
      kris: null,
    };
    if (kind === 'mike') {
      castleMusic.start();
      secret.kris = {
        x: 320,
        y: 462,
        dir: 'up',
        animT: 0,
        moving: false,
        runT: 0,
      };
    } else {
      birdMusic.start();
      droneLoop.start();
      secret.kris = {
        x: 150,
        y: 40,
        dir: 'down',
        animT: 0,
        moving: false,
        runT: 0,
      };
    }
    phase = 'secret';
  }

  function stopParkSounds() {
    if (!secret || !secret.park) return;
    secret.park.toys.forEach(t => {
      if (t.sfx) {
        t.sfx.pause();
        t.sfx = null;
      }
    });
  }

  function leaveSecret() {
    stopParkSounds();
    castleMusic.stop();
    kikkyMusic.stop();
    kikkyMusic.setRate(1);
    birdMusic.stop();
    droneLoop.stop();
    dialog = null;
    secret = null;
    phase = 'menu';
    startMusic();
  }

  function secretGoto(zone) {
    secret.transition = { to: zone, t: 0 };
  }

  function makePark() {
    const tiger = Math.random() < 1 / 20;
    return {
      cats: [makeCat(320, 200)],
      toys: [],
      bomb: {
        state: 'here',
        x: 500,
        y: 310,
        tiger,
        shownTiger: tiger,
      },
      debris: false,
      explo: null,
      sparkles: [],
    };
  }

  function makeCat(x, y) {
    return {
      x,
      y,
      hspeed: 0,
      vx: 0,
      vy: 0,
      chasing: false,
      happiness: 100,
      active: false,
      bigTimer: 0,
      tummy: false,
      attackT: -1,
      target: null,
      face: Math.random() < 0.5 ? 1 : -1,
      animT: 0,
      timer: 0,
      reset: 1 + Math.floor(Math.random() * 4),
      xx: 0,
      yy: 0,
      shakeT: 0,
      vibration: 0,
      vibT: 0,
      meowT: 0,
      meowMax: 40 + Math.floor(Math.random() * 41),
      meowCut: 0,
      meowCutT: 0,
    };
  }

  function secretBlocked(x, y) {
    if (secret.zone === 'mike') {
      const inMain = x >= 47 && x <= 592 && y >= 207 && y <= 432;
      const inCorr = x >= 287 && x <= 352 && y >= 207 && y <= 478;
      const inDoor = x >= 291 && x <= 348 && y >= 150 && y <= 208;
      if (!inMain && !inCorr && !inDoor) return true;
      return MIKE_NPC_SOLIDS.some(
        r => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3],
      );
    }
    if (secret.zone === 'kikky') {
      const inStrip = x >= 47 && x <= 592 && y >= 326 && y <= 352;
      const inCorr = x >= 287 && x <= 352 && y >= 326 && y <= 478;
      if (!inStrip && !inCorr) return true;
      // obj_solidblocksized is 40x40 at (520,310); padded for walker width
      const b = secret.park && secret.park.bomb;
      return !!(
        b &&
        b.state === 'here' &&
        x >= 502 &&
        x <= 578 &&
        y >= 310 &&
        y <= 354
      );
    }
    if (x < 8 || x > 312 || y < 20 || y > 1198) return true;
    return SHELTER_SOLIDS.some(
      r =>
        x >= r[0] - 5 &&
        x <= r[0] + r[2] + 5 &&
        y >= r[1] &&
        y <= r[1] + r[3] + 2,
    );
  }

  function stepSecret() {
    const sec = secret;
    sec.t += 1;
    sec.bgSpeed -= 1;
    if (sec.bgSpeed < -800) sec.bgSpeed += 480;
    sec.bgSpeedY += 1;
    if (sec.bgSpeedY > -88) sec.bgSpeedY -= 88;
    if (sec.t % 2 === 0) {
      sec.bgSpeedSlow -= 1;
      if (sec.bgSpeedSlow < -800) sec.bgSpeedSlow += 480;
      sec.bgSpeedYSlow += 1;
      if (sec.bgSpeedYSlow > -88) sec.bgSpeedYSlow -= 88;
    }

    if (sec.zone === 'shelter') stepShelterAudio();
    if (sec.zone === 'kikky' && sec.park) stepPark();

    if (sec.transition) {
      sec.transition.t += 1;
      const tt = sec.transition.t;
      if (tt === 15) {
        sec.zone = sec.transition.to;
        if (sec.zone === 'kikky') {
          sec.park = makePark();
          castleMusic.stop();
          kikkyMusic.start();
          kikkyMusic.setRate(1);
          sec.kris = {
            x: 320,
            y: 462,
            dir: 'up',
            animT: 0,
            moving: false,
            runT: 0,
          };
        } else {
          stopParkSounds();
          sec.park = null;
          kikkyMusic.stop();
          kikkyMusic.setRate(1);
          castleMusic.start();
          sec.kris = {
            x: 320,
            y: 170,
            dir: 'down',
            animT: 0,
            moving: false,
            runT: 0,
          };
        }
      }
      if (tt >= 30) sec.transition = null;
      return;
    }
    if (sec.leaving) {
      sec.fade = Math.max(0, sec.fade - 0.05);
      if (sec.fade <= 0) leaveSecret();
      return;
    }
    if (sec.fade < 1) sec.fade = Math.min(1, sec.fade + 0.05);
    if (sec.shelterHold > 0) {
      sec.shelterHold -= 1;
      sec.doorT += 1;
      if (sec.doorT === 20) {
        play('dooropen', 1, 0.2);
        play('dooropen', 1, 0.3);
      }
      if (sec.doorT === 60) play('smile', 0.9);
      if (sec.shelterHold === 0) {
        sec.doorT = 0;
        sec.shake = 10;
        play('impact', 0.9);
        sec.shelterSeq = 2;
        openLines(['(The door slammed shut on its own...)'], {
          side: 0,
          box: 'ut',
        });
      }
      return;
    }
    if (sec.shake > 0) sec.shake -= 1;
    if (pressed.menu) {
      if (dialog) dialog = null;
      else sec.leaving = true;
      return;
    }
    if (dialog) {
      stepDialog();
      if (!dialog) sec.talking = null;
      return;
    }

    const k = sec.kris;
    const dark = sec.zone !== 'shelter';
    if (held.cancel) k.runT += 1;
    else k.runT = 0;
    let wspeed = dark ? 4 : 2;
    if (k.runT > 0) wspeed = dark ? 6 : 3;
    if (k.runT > 10) wspeed = dark ? 8 : 4;
    let px = 0;
    let py = 0;
    if (held.right) {
      px = wspeed;
      k.dir = 'right';
    }
    if (held.left) {
      px = -wspeed;
      k.dir = 'left';
    }
    if (held.down) {
      py = wspeed;
      k.dir = 'down';
    }
    if (held.up) {
      py = -wspeed;
      k.dir = 'up';
    }
    k.moving = px !== 0 || py !== 0;
    const sx = Math.sign(px);
    for (let g = Math.abs(px); g > 0; g--) {
      if (secretBlocked(k.x + sx, k.y)) break;
      k.x += sx;
    }
    const sy = Math.sign(py);
    for (let g = Math.abs(py); g > 0; g--) {
      if (secretBlocked(k.x, k.y + sy)) break;
      k.y += sy;
    }
    if (k.moving) k.animT += wspeed * (dark ? 0.045 : 0.09);

    if (sec.zone === 'mike') {
      if (k.y >= 474) {
        sec.leaving = true;
        return;
      }
      if (k.y <= 156) {
        secretGoto('kikky');
        return;
      }
    } else if (sec.zone === 'kikky') {
      if (k.y >= 474) {
        secretGoto('mike');
        return;
      }
    } else if (sec.zone === 'shelter' && k.y <= 26) {
      sec.leaving = true;
      return;
    }

    if (pressed.jump) secretInteract();
  }

  function secretInteract() {
    const sec = secret;
    const k = sec.kris;
    const dark = sec.zone !== 'shelter';
    const dirs = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    }[k.dir];
    const steps = dark ? [12, 28, 44, 60] : [8, 16, 26];
    const probes = steps.map(s => [
      k.x + dirs[0] * s,
      k.y - (dark ? 4 : 2) + dirs[1] * s,
    ]);
    const inZone = r =>
      probes.some(
        ([fx, fy]) =>
          fx >= r[0] && fx <= r[0] + r[2] && fy >= r[1] && fy <= r[1] + r[3],
      );

    if (sec.zone === 'mike') {
      const hit = MIKE_SPOTS.find(s => inZone(s.r));
      if (hit) {
        sec.seen[hit.key] = 1;
        sec.talking = hit.key;
        openLines(secretLines(hit.key), { side: 0 });
      }
      return;
    }
    if (sec.zone === 'kikky') {
      const park = sec.park;
      const hit = KIKKY_SPOTS.find(s => inZone(s.r));
      if (!hit) return;
      if (hit.key === 'button') {
        if (park.toys.length < 100) {
          // snd_kikkyshift loops for the fall, per obj_dentalchew
          const sfx = play('kikkyshift', 0.5, 0.8 + Math.random() * 0.4);
          if (sfx) sfx.loop = true;
          park.toys.push({
            x: 60 + Math.random() * 440,
            y: 40,
            vspeed: 1 + Math.random() * 4,
            travel: 60 + Math.random() * 140,
            action: 0,
            angle: 0,
            vx: 0,
            vy: 0,
            face: 1,
            sfx,
          });
          if (Math.random() < 1 / 7)
            play('kikkyspace', 0.6, 0.9 + Math.random() * 0.1);
        }
        return;
      }
      if (hit.key === 'slot') {
        openLines(secretLines('slot'), { side: 0 });
        return;
      }
      if (hit.key === 'bomb') {
        if (park.debris && park.bomb.state !== 'here') {
          openLines(secretLines('debris'), { side: 0 });
          return;
        }
        if (park.bomb.state !== 'here') return;
        if (park.bomb.tiger) {
          openLines(["(It's the TIGERBOMB.)"], {
            side: 0,
            onClose: () => detonateTiger(),
          });
        } else {
          openLines(["(It's the KIKKYBOMB.)"], {
            side: 0,
            choices: ['Use', "Don't"],
            chosen: i => {
              if (i === 0) park.bomb.state = 'rising';
            },
          });
        }
      }
      return;
    }
    if (inZone(SHELTER_DOOR)) {
      if (sec.shelterSeq >= 2) {
        openLines(["(It's locked.)"], { side: 0, box: 'ut' });
      } else if (sec.shelterSeq === 0) {
        openLines(
          [
            '(You try to open the door.)',
            "(It doesn't budge.)",
            '(But suddenly...)',
          ],
          {
            side: 0,
            box: 'ut',
            onClose: () => {
              sec.shelterSeq = 1;
              sec.shelterHold = 260;
              sec.doorT = 0;
            },
          },
        );
      }
    }
  }

  function detonateTiger() {
    const park = secret.park;
    play('badexplosion', 0.9);
    park.bomb.state = 'gone';
    park.explo = { t: 0 };
    park.debris = true;
  }

  function stepPark() {
    const park = secret.park;
    const bomb = park.bomb;
    if (bomb.state === 'rising') {
      bomb.y = Math.max(bomb.y - 4, 150);
      if (bomb.y <= 150) {
        play('kikkyspace', 0.8);
        for (let i = 0; i < 8; i++) {
          park.sparkles.push({
            x: bomb.x + 20,
            y: bomb.y + 20,
            vx: Math.cos((i / 8) * Math.PI * 2) * 6,
            vy: Math.sin((i / 8) * Math.PI * 2) * 6,
            t: 0,
          });
        }
        park.cats.push(makeCat(bomb.x + 20, bomb.y + 20));
        bomb.state = 'gone';
      }
    }
    if (park.explo) {
      park.explo.t += 1;
      if (park.explo.t > 16) park.explo = null;
    }
    park.sparkles = park.sparkles.filter(s => {
      s.t += 1;
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.85;
      s.vy *= 0.85;
      return s.t <= 20;
    });

    park.toys = park.toys.filter(t => {
      if (t.action === 0) {
        t.y += t.vspeed;
        t.travel -= t.vspeed;
        if (t.travel <= 0) {
          t.action = 1;
          if (t.sfx) {
            t.sfx.pause();
            t.sfx = null;
          }
        }
      } else if (t.action === 2) {
        t.x += t.vx;
        t.y += t.vy;
        t.angle += 120;
        if (t.x < 40 || t.x > 580 || t.y < 10 || t.y > 300) t.dead = true;
      }
      if (t.dead && t.sfx) {
        t.sfx.pause();
        t.sfx = null;
      }
      return !t.dead;
    });

    // cats, straight from obj_kikky
    const anyToy = park.toys.some(t => t.action !== 2);
    park.cats.forEach(c => {
      if (anyToy) c.bigTimer = 0;
      c.bigTimer += 1;
      if (c.bigTimer === 900) {
        play('kikkyexplosion', 0.8);
        c.tummy = true;
        c.hspeed = 0;
        c.vx = 0;
        c.vy = 0;
      }
      if (c.active) c.happiness -= 1;
      const negative = c.happiness < 0 && !anyToy;
      if (negative) {
        c.hspeed = 0;
        c.vx = 0;
        c.vy = 0;
        c.shakeT += 1;
        if (c.shakeT > 20) {
          c.xx =
            (2 + Math.random() * 2) *
            (Math.random() < 0.5 ? 1 : -1) *
            c.vibration;
          c.yy =
            (2 + Math.random() * 2) *
            (Math.random() < 0.5 ? 1 : -1) *
            c.vibration;
        }
        if (c.shakeT > 25) {
          c.xx = 0;
          c.yy = 0;
          c.shakeT = -Math.floor(Math.random() * 11);
        }
        c.vibT += 1;
        if (c.vibT >= 60 && c.vibration < 1) {
          c.vibT = 0;
          c.vibration += 0.1;
        }
        c.meowT += 1;
        if (c.meowT > Math.max(1, c.meowMax - c.meowCut)) {
          play('meow', 0.8, 0.3 + Math.random() * 0.3);
          c.meowT = 0;
          c.meowMax = 40 + Math.floor(Math.random() * 41);
        }
        if (c.happiness < -600) {
          c.meowCutT += 1;
          if (c.meowCutT > 59) {
            c.meowCutT = 0;
            c.meowCut = Math.min(60, c.meowCut + 1);
          }
        }
      } else {
        c.vibration = 0;
        c.meowCut = 0;
        c.meowCutT = 0;
        c.xx = 0;
        c.yy = 0;
      }
      if (c.tummy && (Math.abs(c.hspeed) > 0 || Math.abs(c.vx) > 0))
        c.tummy = false;
      if (!c.tummy && !anyToy && !negative) {
        c.vx = 0;
        c.vy = 0;
        c.timer += 1;
        if (c.hspeed === 0) {
          if (c.timer > c.reset) {
            c.hspeed = (Math.random() < 0.5 ? 1 : -1) * 2;
            c.reset = (1 + Math.floor(Math.random() * 8)) * 30;
            c.timer = 0;
          }
        } else if (c.timer > c.reset) {
          c.hspeed = 0;
          c.reset = (1 + Math.floor(Math.random() * 4)) * 30;
          c.timer = 0;
        }
      }
      if (c.attackT >= 0) {
        c.attackT += 1;
        c.animT += 1;
        if (c.attackT > 30) {
          if (c.target) c.target.dead = true;
          c.target = null;
          c.attackT = -1;
        }
      } else if (anyToy) {
        if (!c.target || c.target.dead || c.target.action === 2)
          c.target = park.toys.find(t => t.action === 1) || null;
        if (c.target && c.target.action === 1) {
          const dx = c.target.x - c.x;
          const dy = c.target.y - c.y;
          const d = Math.hypot(dx, dy) || 1;
          c.hspeed = (dx / d) * 8;
          c.vx = c.hspeed;
          c.vy = (dy / d) * 8;
          c.x += c.vx;
          c.y += c.vy;
          if (d < 20) {
            c.attackT = 0;
            c.animT = 0;
            c.vx = 0;
            c.vy = 0;
            c.hspeed = 0;
            park.cats.forEach(cc => {
              cc.happiness = 100;
            });
            c.active = true;
            play('kikkycan', 0.8);
            const t = c.target;
            t.action = 2;
            t.face = Math.random() < 0.5 ? 1 : -1;
            const kd = Math.hypot(t.x - c.x, t.y - c.y) || 1;
            t.vx = ((t.x - c.x) / kd) * 12;
            t.vy = ((t.y - c.y) / kd) * 12;
          }
        }
      } else if (c.hspeed !== 0) {
        c.x += c.hspeed;
      }
      if (c.hspeed !== 0) c.face = Math.sign(c.hspeed);
      if (c.attackT < 0) c.animT += Math.abs(c.hspeed) / 2;
      if (c.x < 80) {
        c.x = 80;
        c.hspeed = -c.hspeed;
      }
      if (c.x > 540) {
        c.x = 540;
        c.hspeed = -c.hspeed;
      }
      if (c.y < 40) {
        c.y = 40;
        c.vy = -c.vy;
      }
      if (c.y > 250) {
        c.y = 250;
        c.vy = -c.vy;
      }
    });

    const first = park.cats[0];
    kikkyMusic.setRate(first && first.happiness <= -500 ? 0.5 : 1);
  }

  function stepShelterAudio() {
    const y = secret.kris.y;
    let vol = 1;
    let vol2 = 0;
    if (y >= 420) {
      vol = 1 - (y - 620) / 400;
      vol2 = (y - 1100) / 300;
    }
    vol = Math.max(0, Math.min(1, vol));
    vol2 = Math.max(0, Math.min(1, vol2));
    if (secret.shelterSeq >= 2) vol2 = Math.min(1, vol2 + 0.2);
    birdMusic.setVolume(getVolume() * 0.5 * vol);
    droneLoop.setVolume(getVolume() * 0.55 * vol2);
  }

  function blit(name, frame, x, y, scale = 2, alpha = 1) {
    const s = sprites[name];
    if (!s || !s.img.width) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      s.img,
      frame * s.w,
      0,
      s.w,
      s.h,
      Math.round(x),
      Math.round(y),
      s.w * scale,
      s.h * scale,
    );
    ctx.restore();
  }

  let wallLattice = null;
  let wallScratch = null;
  function getWallLattice() {
    if (wallLattice) return wallLattice;
    const row = sprites.wallrow;
    if (!row || !row.img.width) return null;
    const half = document.createElement('canvas');
    half.width = 860;
    half.height = 244;
    const g = half.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let i = 0; i < 12; i++) {
      const rx = i * 40 - 200;
      const ry = 44 * i;
      [
        [0, 1],
        [720, 1],
        [1440, 1],
        [40, 0.5],
        [760, 0.5],
        [1480, 0.5],
      ].forEach(([ox, a]) => {
        g.globalAlpha = a;
        g.drawImage(row.img, (rx + ox) * 0.5, ry * 0.5);
      });
    }
    wallLattice = half;
    return half;
  }

  function drawGreenWall(x0, y0, w, h, patternOffset, slow) {
    const grad = ctx.createLinearGradient(0, y0, 0, y0 + h - 10);
    grad.addColorStop(0, 'rgb(99,142,152)');
    grad.addColorStop(1, 'rgb(168,228,131)');
    ctx.fillStyle = grad;
    ctx.fillRect(x0, y0, w, h - 10);
    const lattice = getWallLattice();
    if (lattice) {
      if (!wallScratch) {
        wallScratch = document.createElement('canvas');
        wallScratch.width = VIEW_W;
        wallScratch.height = VIEW_H;
      }
      const g = wallScratch.getContext('2d');
      g.save();
      g.clearRect(0, 0, VIEW_W, VIEW_H);
      g.imageSmoothingEnabled = false;
      g.beginPath();
      g.rect(x0, y0, w, h - 10);
      g.clip();
      g.drawImage(
        lattice,
        x0 + (slow ? secret.bgSpeedSlow : secret.bgSpeed),
        y0 + (slow ? secret.bgSpeedYSlow : secret.bgSpeedY) + patternOffset,
        1720,
        488,
      );
      g.globalCompositeOperation = 'source-in';
      const tint = g.createLinearGradient(0, y0, 0, y0 + h - 10);
      tint.addColorStop(0, 'rgb(117,151,155)');
      tint.addColorStop(1, 'rgb(140,180,151)');
      g.fillStyle = tint;
      g.fillRect(x0, y0, w, h - 10);
      g.restore();
      ctx.drawImage(wallScratch, 0, 0);
    }
    const v = sprites.vines;
    if (v && v.img.width) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, w, 32);
      ctx.clip();
      for (let vx = x0; vx < x0 + w; vx += 64) blit('vines', 0, vx, y0);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(159,216,134,0.3)';
    ctx.fillRect(x0, y0 + h - 10, w, 30);
  }

  // obj_dw_green_room_floor: a peach base with rotated light bars, drawn
  // beneath the checker tiles; the floor-mask object then blacks out
  // everything that isn't walkable room. Exact values from the dumps.
  const FLOOR_BARS = [
    [60, 512, 160, 50, 'rgb(219,252,199)', 1],
    [660, 552, 130, 50, 'rgb(219,252,199)', 1],
    [164, 522, 160, 14, 'rgb(161,219,134)', 1],
    [55, 512, 112, 2, 'rgb(235,206,158)', 0.5],
    [287, 562, 152, 2, 'rgb(235,206,158)', 0.5],
    [654, 552, 125, 2, 'rgb(235,206,158)', 0.5],
    [171, 512, 110, 1, 'rgb(187,235,164)', 0.5],
    [251, 512, 110, 1, 'rgb(187,235,164)', 0.5],
  ];
  const MIKE_MASK = [
    [0, 0, 640, 199],
    [0, 199, 39, 281],
    [600, 199, 40, 281],
    [39, 440, 240, 40],
    [360, 440, 280, 40],
  ];
  const KIKKY_MASK = [
    [0, 0, 640, 199],
    [0, 199, 39, 281],
    [600, 199, 40, 281],
    [39, 360, 240, 120],
    [360, 360, 280, 120],
  ];

  function drawGreenFloorBase(mask) {
    ctx.fillStyle = '#F4B688';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // the bars anchor at half-camera parallax; our camera is fixed at 0,
    // so base is (0, 72) exactly. spr_pixel_white is 4x4, corner origin,
    // so every scale unit is 4 pixels
    FLOOR_BARS.forEach(([bx, by, len, wid, col, alpha]) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.translate(bx, by);
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(0, 0, len * 4, wid * 4);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    mask.forEach(([mx, my, mw, mh]) => ctx.fillRect(mx, my, mw, mh));
  }

  const WALL_SPARKLES = Array.from({ length: 24 }, (_, i) => ({
    x: 50 + ((i * 131) % 540),
    y: 46 + ((i * 83) % 28),
    phase: (i * 47) % 140,
    plus: i % 2 === 0,
  }));

  function drawWallSparkles(x0, w) {
    WALL_SPARKLES.forEach(s => {
      const t = (secret.t + s.phase) % 140;
      if (t >= 50) return;
      const frame = Math.min(4, Math.floor(t / 10));
      const name = s.plus ? 'sparklePlus' : 'sparkleX';
      const spr = sprites[name];
      if (!spr || !spr.img.width) return;
      if (s.x < x0 || s.x > x0 + w) return;
      blit(name, frame, s.x - spr.ox * 2, s.y - spr.oy * 2);
    });
  }

  function drawSecret() {
    const sec = secret;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (sec.zone === 'mike') drawSecretMike(sec);
    else if (sec.zone === 'kikky') drawSecretKikky(sec);
    else drawSecretShelter(sec);
    if (dialog) drawDialog();
    let dark = 0;
    if (sec.transition)
      dark =
        sec.transition.t < 15
          ? sec.transition.t / 15
          : (30 - sec.transition.t) / 15;
    else if (sec.fade < 1) dark = 1 - sec.fade;
    if (dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dark)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  function drawKrisActor(k, dark) {
    const spr = dark
      ? {
          left: 'walkLeft',
          right: 'walkRight',
          up: 'walkUp',
          down: 'walkDown',
        }[k.dir]
      : {
          left: 'krisLwLeft',
          right: 'krisLwRight',
          up: 'krisLwUp',
          down: 'krisLwDown',
        }[k.dir];
    const s = sprites[spr];
    const frame = k.moving ? Math.floor(k.animT) % 4 : 0;
    return { spr, s, frame };
  }

  function drawSecretMike(sec) {
    drawGreenFloorBase(MIKE_MASK);
    const floor = sprites.mikeFloor;
    if (floor && floor.img.width) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(floor.img, 0, 0);
    }
    drawGreenWall(40, 40, 560, 160, 0);
    drawGreenWall(280, 40, 80, 160, 44, true);
    drawWallSparkles(40, 560);
    ctx.fillStyle = 'rgba(0,0,77,0.4)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const mFrames = { mikeS: 2, mikeM: 8, mikeMBashful: 5, mikeL: 7 };
    const actors = [
      {
        spr: sec.talking === 'mikeM' ? 'mikeMBashful' : 'mikeM',
        x: 251,
        y: 158,
        foot: 276,
      },
      { spr: 'mikeS', x: 100, y: 187, foot: 277 },
      { spr: 'mikeL', x: 394, y: 125, foot: 277 },
      { spr: 'tennaStatue', x: 525, y: 89, foot: 217 },
      { kris: true, foot: sec.kris.y },
    ];
    actors.sort((a, b) => a.foot - b.foot);
    actors.forEach(a => {
      if (a.kris) {
        const d = drawKrisActor(sec.kris, true);
        blit(d.spr, d.frame, sec.kris.x - d.s.w, sec.kris.y - d.s.h * 2 + 4);
        return;
      }
      const s = sprites[a.spr];
      const frames = mFrames[a.spr] || 1;
      const frame = frames > 1 ? Math.floor(sec.t * 0.2) % frames : 0;
      blit(a.spr, frame, a.x - s.ox * 2, a.y - s.oy * 2);
    });
  }

  function drawSecretKikky(sec) {
    const park = sec.park;
    drawGreenFloorBase(KIKKY_MASK);
    const floor = sprites.kikkyFloor;
    if (floor && floor.img.width) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(floor.img, 0, 0);
    }
    drawGreenWall(40, 40, 560, 280, 0);
    drawWallSparkles(40, 560);
    ctx.fillStyle = 'rgba(0,0,77,0.4)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#000';
    ctx.fillRect(60, 68, 500, 200);
    ctx.save();
    ctx.beginPath();
    ctx.rect(60, 68, 500, 200);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    park.toys.forEach(t => {
      const s = sprites.dentalchew;
      ctx.save();
      ctx.translate(Math.round(t.x), Math.round(t.y));
      ctx.rotate((t.angle * Math.PI) / 180);
      ctx.drawImage(s.img, 0, 0, s.w, s.h, -s.ox, -s.oy, s.w, s.h);
      ctx.restore();
    });
    park.cats.forEach(c => {
      let name = 'kikkyWalk';
      let frame = Math.floor(c.animT) % 12;
      if (c.tummy) {
        name = 'kikkyTummy';
        frame = 0;
      }
      if (c.attackT >= 0) {
        name = 'kikkyAttack';
        frame = Math.floor(c.animT) % 3;
      }
      const s = sprites[name];
      ctx.save();
      ctx.translate(Math.round(c.x + c.xx), Math.round(c.y + c.yy));
      ctx.scale(c.face, 1);
      ctx.drawImage(s.img, frame * s.w, 0, s.w, s.h, -s.ox, -s.oy, s.w, s.h);
      ctx.restore();
    });
    park.sparkles.forEach(sp => {
      const frame = Math.min(7, Math.floor(sp.t / 3));
      const s = sprites.heartSparkle;
      ctx.drawImage(
        s.img,
        frame * s.w,
        0,
        s.w,
        s.h,
        Math.round(sp.x - s.ox),
        Math.round(sp.y - s.oy),
        s.w,
        s.h,
      );
    });
    pixelText('Nagasagy Kikky Park', 310, 86, 14, '#fff', 'center');
    const hap = park.cats.length ? Math.round(park.cats[0].happiness) : 100;
    pixelText('Happiness: ' + hap, 440, 248, 14, '#fff', 'left');
    pixelText('Dental', 100, 238, 14, 'rgb(0,127,255)', 'center');
    pixelText('Toy', 100, 252, 14, 'rgb(0,127,255)', 'center');
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    for (let sy = 68 + ((sec.t >> 1) % 3); sy < 268; sy += 3)
      ctx.fillRect(60, sy, 500, 1);
    ctx.restore();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(60.5, 68.5, 499, 199);
    ctx.strokeRect(61.5, 69.5, 497, 197);
    ctx.fillStyle = '#808080';
    ctx.fillRect(140, 278, 459, 18);
    ctx.fillStyle = '#000';
    ctx.fillRect(140, 286, 459, 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(78, 274, 44, 26);
    ctx.fillStyle = '#000';
    ctx.fillRect(80, 276, 40, 22);
    {
      const s = sprites.dentalchew;
      ctx.drawImage(s.img, 0, 0, s.w, s.h, 101 - s.ox, 287 - s.oy, s.w, s.h);
    }
    if (park.debris) blit('coolantDebris', 0, 504, 310);
    if (park.bomb.state !== 'gone') {
      const bname = park.bomb.shownTiger ? 'tigerbomb' : 'kikkyBomb';
      blit(bname, Math.floor(sec.t * 0.1) % 2, park.bomb.x, park.bomb.y);
    }
    const d = drawKrisActor(sec.kris, true);
    blit(d.spr, d.frame, sec.kris.x - d.s.w, sec.kris.y - d.s.h * 2 + 4);
    if (park.explo) {
      const frame = Math.min(16, park.explo.t);
      const s = sprites.realExplosion;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        s.img,
        frame * s.w,
        0,
        s.w,
        s.h,
        320 - s.ox * 15,
        240 - s.oy * 15,
        s.w * 15,
        s.h * 15,
      );
      ctx.restore();
    }
  }

  function drawSecretShelter(sec) {
    const room = sprites.shelterRoom;
    if (!room || !room.img.width) return;
    let camTop = Math.max(0, Math.min(1240 * 2 - VIEW_H, sec.kris.y * 2 - 260));
    if (sec.shake > 0)
      camTop += Math.round((Math.random() * 2 - 1) * Math.min(6, sec.shake));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(room.img, 0, -camTop, 320 * 2, 1240 * 2);
    const shelterFoot = 1166;
    const drawShelter = () => {
      let name = 'shelter';
      let frame = 0;
      if (sec.shelterHold > 0 && sec.doorT >= 20) {
        name = 'shelterOpenDoor';
        frame = Math.min(3, Math.floor((sec.doorT - 20) / 8));
      }
      blit(name, frame, 54 * 2, 1046 * 2 - camTop);
    };
    const drawKris = () => {
      const d = drawKrisActor(sec.kris, false);
      blit(
        d.spr,
        d.frame,
        sec.kris.x * 2 - d.s.w,
        sec.kris.y * 2 - camTop - d.s.h * 2 + 4,
      );
    };
    if (sec.kris.y < shelterFoot) {
      drawKris();
      drawShelter();
    } else {
      drawShelter();
      drawKris();
    }
    const front = sprites.shelterFront;
    if (front && front.img.width)
      ctx.drawImage(front.img, 0, -camTop, 320 * 2, 1240 * 2);
    const deep = Math.max(0, Math.min(1, (sec.kris.y - 900) / 300));
    if (deep > 0) {
      ctx.fillStyle = `rgba(4,2,12,${0.32 * deep})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  function stepBoard() {
    board.siner += 1;
    if (running) {
      board.x = lerp(board.x, camX + 40, 0.125);
      board.y = lerp(
        board.y,
        camY + 340 + Math.sin(board.siner / 15) * 8,
        0.25,
      );
    } else if (thisTime !== -1) {
      board.x = lerp(board.x, camX + 30, 1 / 30);
      board.y = lerp(
        board.y,
        camY + 30 + Math.sin(board.siner / 15) * 4,
        1 / 12,
      );
    } else {
      board.x = lerp(board.x, camX - 40, 0.25);
      board.y = lerp(board.y, camY + 540, 0.25);
    }
  }

  function walkerBlocked(x, y) {
    const bx = x - 10;
    const by = y - 10;
    for (const s of L.solids) {
      if (bx < s.x + s.w && bx + 20 > s.x && by < s.y + s.h && by + 10 > s.y)
        return true;
    }
    if (L.kind === 'church' && L.decor.cup && walker) {
      const spot = cupSpot();
      const cx = spot.x + Math.sin(siner / 55) * 26;
      const cy = spot.y + 44;
      const wx = walker.x - 10;
      const wy = walker.y - 10;
      const inItNow =
        wx < cx + 46 && wx + 20 > cx && wy < cy + 24 && wy + 10 > cy;
      if (
        !inItNow &&
        bx < cx + 46 &&
        bx + 20 > cx &&
        by < cy + 24 &&
        by + 10 > cy
      )
        return true;
    }
    return false;
  }

  function stepWalker() {
    if (held.cancel) walker.runT += 1;
    else walker.runT = 0;
    let wspeed = 4;
    if (walker.runT > 0) {
      wspeed = 6;
      if (walker.runT > 10) wspeed = 8;
      if (walker.runT > 60) wspeed = 9;
    }
    let px = 0;
    let py = 0;
    if (held.right) {
      px = wspeed;
      walker.dir = 'right';
    }
    if (held.left) {
      px = -wspeed;
      walker.dir = 'left';
    }
    if (held.down) {
      py = wspeed;
      walker.dir = 'down';
    }
    if (held.up) {
      py = -wspeed;
      walker.dir = 'up';
    }
    walker.moving = px !== 0 || py !== 0;
    const z = L.zones[zone];
    const sx = Math.sign(px);
    for (let g = Math.abs(px); g > 0; g--) {
      const nx = Math.max(z.xMin, Math.min(z.xMax, walker.x + sx));
      if (nx === walker.x || walkerBlocked(nx, walker.y)) break;
      walker.x = nx;
    }
    const sy = Math.sign(py);
    for (let g = Math.abs(py); g > 0; g--) {
      const ny = Math.max(z.yMin, Math.min(z.yMax, walker.y + sy));
      if (ny === walker.y || walkerBlocked(walker.x, ny)) break;
      walker.y = ny;
    }
    if (walker.moving) walker.animT += wspeed * 0.045;
  }

  function stepKris() {
    const b = kris.buffers;
    Object.keys(b).forEach(k => {
      if (b[k] > 0) b[k] -= 1;
    });
    if (kris.relockT > 0) kris.relockT -= 1;
    if (kris.hurtT > 0) kris.hurtT -= 1;
    kris.momentum = Math.max(0, kris.momentum - 0.03);
    Object.keys(DIRS).forEach(d => {
      if (held[d])
        b[d] = Math.max(b[d], Math.min(4, Math.ceil(5 - kris.momentum * 2)));
    });
    const wantDir =
      DIR_ORDER.find(d => b[d] > 0 && held[d]) || DIR_ORDER.find(d => b[d] > 0);

    switch (kris.state) {
      case 'neutral': {
        if ((b.jump > 0 || held.jump) && kris.relockT <= 0) {
          kris.state = 'charge';
          kris.chargeAmt = 1;
          kris.chargeT = 0;
          kris.momentum = 0;
          mixer.startCharge();
          if (wantDir) kris.dir = wantDir;
          break;
        }
        if (wantDir) tryStep(wantDir, false);
        else kris.momentum *= 0.5;
        break;
      }
      case 'charge': {
        if (wantDir) kris.dir = wantDir;
        if (held.jump) {
          kris.chargeT += 1;
          if (kris.chargeT === 10) {
            kris.chargeAmt = 2;
            mixer.chargePitch(0.5);
          }
          if (kris.chargeT === 22) {
            kris.chargeAmt = 3;
            mixer.chargePitch(0.7);
          }
          if (kris.chargeAmt === 3 && kris.chargeT % 8 === 0) {
            ghosts.push({
              spr: chargeSprite(),
              frame: kris.chargeAmt - 1,
              x: kris.x,
              y: kris.y,
              alpha: 0.3,
            });
          }
        } else {
          mixer.stopCharge();
          const dir = wantDir || kris.dir;
          kris.state = 'neutral';
          tryStep(dir, true);
        }
        break;
      }
      case 'step': {
        const speed = kris.jumping ? 1 : 1 + kris.momentum;
        kris.stepT += speed;
        const rate = kris.stepRate;
        if (kris.jumping) {
          const clip = kris.chargeAmt >= 2 ? 2 : 4;
          if (kris.stepT >= rate - clip) kris.stepT = rate;
          ghosts.push({
            spr: jumpSprite(),
            frame: 0,
            x: kris.x,
            y: kris.y + kris.arc,
            alpha: 0.2,
          });
        }
        if (kris.stepT >= rate) kris.stepT = rate;
        const t = kris.stepT / rate;
        const e = kris.jumping ? easeOut(t) : easeInOut(t);
        kris.x = kris.stepFrom.x + (kris.stepTo.x - kris.stepFrom.x) * e;
        kris.y = kris.stepFrom.y + (kris.stepTo.y - kris.stepFrom.y) * e;
        kris.arc = kris.jumping
          ? -Math.sin(t * Math.PI) * 4 * (kris.chargeAmt - 1)
          : 0;
        if (kris.stepT >= rate) {
          kris.x = kris.stepTo.x;
          kris.y = kris.stepTo.y;
          kris.arc = 0;
          if (kris.jumping) kris.momentum = kris.chargeAmt / 2;
          kris.jumping = false;
          kris.chargeAmt = 0;
          kris.state = 'neutral';
          kris.bumped = null;
          onCellSettled();
        }
        break;
      }
      case 'slip': {
        kris.slipT -= 1;
        if (kris.slipT <= 0) kris.state = 'neutral';
        break;
      }
      case 'fall': {
        if (kris.y + 20 >= L.landing.y) {
          if (running) endRunAndDrop();
          else cancelRun();
          play('noise', 0.6);
          resetToGround(
            Math.max(
              L.landing.x + 20,
              Math.min(L.landing.x + L.landing.w - 20, kris.x),
            ),
            'bottom',
            L.landing.y + 20,
          );
          break;
        }
        kris.fallT += 1;
        kris.fallV = Math.min(20, kris.fallV + 0.5);
        kris.y += Math.ceil(kris.fallV);
        if (kris.fallT > (kris.grabDelay || 10) && !kris.noGrab) {
          const c = Math.round((kris.x - 20) / TILE);
          const r = Math.round((kris.y - 20) / TILE);
          if (climbableAt(c, r)) {
            kris.state = 'grab';
            kris.grab = {
              x: c * TILE + 20,
              y: r * TILE + 20,
              phase: 'scrape',
              v: Math.min(kris.fallV, 7),
              t: 0,
            };
            kris.lastTile = { c, r };
            play('wing', 0.7, 0.6 + Math.random() * 0.3);
          }
        }
        break;
      }
      case 'grab': {
        const g = kris.grab;
        if (g.phase === 'scrape') {
          if (siner % 2 === 0)
            anims.push({
              spr: 'slidedust',
              frame: 0,
              speed: 0.5,
              x: kris.x,
              y: kris.y,
              vx: Math.random() * 2 - 1,
              vy: -3,
            });
          g.v -= 1;
          if (g.v > 0) kris.y += g.v;
          if (g.v <= 0) {
            g.phase = 'pull';
            g.fx = kris.x;
            g.fy = kris.y;
            g.t = 0;
          }
        } else {
          g.t += 1;
          if (g.t >= 7) {
            const t = Math.min(1, (g.t - 7) / 8);
            kris.x = g.fx + (g.x - g.fx) * easeInOut(t);
            kris.y = g.fy + (g.y - g.fy) * easeInOut(t);
            if (t >= 1) {
              kris.x = g.x;
              kris.y = g.y;
              kris.state = 'neutral';
              onCellSettled();
            }
          }
        }
        break;
      }
      default:
        break;
    }
  }

  function stepHazards() {
    L.brittleMap.forEach((brit, k) => {
      if (brit.con !== 1 || brokenCells.has(k)) return;
      const onIt =
        kris &&
        kris.lastTile.c === brit.c &&
        kris.lastTile.r === brit.r &&
        kris.state !== 'fall' &&
        kris.state !== 'grab';
      if (onIt) brit.timer += 1;
      const limit = brit.dangerous ? 1 : EMBER_HOLD;
      if (brit.timer >= limit) {
        breakBrittle(brit, k);
        if (onIt && (kris.state === 'neutral' || kris.state === 'charge')) {
          mixer.stopCharge();
          kris.chargeAmt = 0;
          kris.state = 'fall';
          kris.fallV = 0;
          kris.fallT = 0;
          kris.noGrab = false;
          kris.grabDelay = 10;
        }
      }
    });
    for (const g of L.appearGroups) {
      if (!g.bell) continue;
      if (!g.rung && kris) {
        if (
          Math.abs(kris.x - g.bell.x) < 44 &&
          kris.y > g.bell.y &&
          kris.y < g.bell.y + 84
        ) {
          g.rung = true;
          g.ringT = 24;
          play('playablebell', 0.9);
          g.on = true;
          g.cells.forEach(k => hiddenCells.delete(k));
          play('ghost', 0.5, 1.8);
        }
      }
      if (g.ringT > 0) g.ringT -= 1;
      if (g.on && g.alpha < 1) g.alpha = Math.min(1, g.alpha + 0.08);
    }
  }

  const coinHidden = cn =>
    cn.hiddenBy != null && !L.appearGroups[cn.hiddenBy].on;

  function stepCoins() {
    if (!kris) return;
    for (const cn of L.coins) {
      if (cn.taken || coinHidden(cn)) continue;
      if (Math.abs(kris.x - cn.x) < 32 && Math.abs(kris.y - cn.y) < 44) {
        cn.taken = true;
        coinsTaken += 1;
        play('coin', 0.8);
        if (coinMarker && coinMarker.t < 30) {
          coinMarker.value += 1;
          coinMarker.t = 0;
          coinMarker.x = cn.x;
          coinMarker.y = cn.y - 16;
          coinMarker.v = -4;
        } else {
          coinMarker = { x: cn.x, y: cn.y - 16, v: -4, value: 1, t: 0 };
        }
      }
    }
    if (coinMarker) {
      coinMarker.t += 1;
      coinMarker.y += coinMarker.v;
      coinMarker.v = Math.min(0, coinMarker.v + 0.25);
      if (coinMarker.t > 30) coinMarker = null;
    }
  }

  function stepWater() {
    if (running) {
      const timber = FULLTIME - elapsed;
      for (const g of L.generators) {
        const t = timber + g.waitoff;
        if (t !== 0 && timber !== FULLTIME && t % g.waittime === 0) {
          streams.push({
            g,
            y: g.y - (STREAM_TILES - 1) * TILE,
            moveT: 0,
            animIdx: 0,
            triggered: false,
            ending: false,
            splashT: 0,
          });
        }
      }
    }
    streams = streams.filter(s => {
      s.moveT += 1;
      s.animIdx += 0.25;
      if (s.moveT >= MOVE_RATE) {
        s.moveT = 0;
        s.y += TILE;
        if (s.y > s.g.endY + 10) return false;
      }
      const drawy = (s.moveT / MOVE_RATE) * TILE;
      const gy = s.g.y;
      const endY = s.g.endY;
      const rawBot = s.y - TILE + STREAM_TILES * TILE + drawy;
      if (rawBot >= endY) {
        s.ending = true;
        s.splashT -= 1;
        if (s.splashT <= 0) {
          s.splashT = 15;
          anims.push({
            spr: 'bucketSplash',
            frame: 0,
            speed: 1 / 3,
            x: s.g.x,
            y: endY,
            vx: 0,
            vy: 0,
          });
        }
      }
      if (
        !s.triggered &&
        kris &&
        mode === 'wall' &&
        (kris.state === 'neutral' || kris.state === 'charge')
      ) {
        const topy = Math.max(gy, Math.min(s.y + drawy, endY));
        const boty = Math.max(gy, Math.min(rawBot, endY));
        if (
          boty - topy > 36 &&
          Math.abs(kris.x - (s.g.x + 20)) < 12 &&
          kris.y > topy - 20 &&
          kris.y < boty + 30
        ) {
          s.triggered = true;
          mixer.stopCharge();
          kris.chargeAmt = 0;
          kris.jumping = false;
          kris.arc = 0;
          kris.state = 'fall';
          kris.fallV = 0;
          kris.fallT = 0;
          kris.noGrab = false;
          kris.grabDelay = WATER_GRAB_DELAY;
          play('splash', 0.9);
          setTimeout(() => play('splash', 0.6, 0.75), 600);
        }
      }
      return true;
    });
  }

  function stepFx() {
    anims = anims.filter(a => {
      a.frame += a.speed;
      a.x += a.vx;
      a.y += a.vy;
      return a.frame < (sprites && sprites[a.spr] ? sprites[a.spr].frames : 5);
    });
    ghosts = ghosts.filter(g => {
      g.alpha -= 0.05;
      return g.alpha > 0;
    });
    confetti = confetti.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.life -= 1;
      return p.life > 0;
    });
    fallingTiles = fallingTiles.filter(ft => {
      ft.t += 1;
      ft.v += 1;
      ft.y += ft.v;
      return ft.t < 30;
    });
  }

  function chargeSprite() {
    if (kris.dir === 'right') return 'krisChargeR';
    if (kris.dir === 'left') return 'krisChargeL';
    return 'krisCharge';
  }
  function jumpSprite() {
    if (kris.dir === 'right') return 'krisJumpR';
    if (kris.dir === 'left') return 'krisJumpL';
    return 'krisJumpUp';
  }

  const clampCamX = v => Math.max(0, Math.min((L ? L.w : VIEW_W) - VIEW_W, v));
  const clampCamY = v => Math.max(0, Math.min((L ? L.h : VIEW_H) - VIEW_H, v));
  function updateCam() {
    if (phase === 'menu' || phase === 'codeentry' || !L) return;
    const onWall = mode === 'wall' || mode === 'finish';
    const fx = onWall ? kris.x : walker.x;
    const fy = onWall ? kris.y : walker.y;
    const k = onWall ? 0.16 : 0.45;
    camX += (clampCamX(fx - VIEW_W / 2) - camX) * k;
    camY += (clampCamY(fy - VIEW_H / 2 - 80) - camY) * k;
  }

  let fonts = null;
  const fontTintCache = new Map();
  function fontAtlas(font, color) {
    const key = font.name + color;
    if (!fontTintCache.has(key)) {
      const c = document.createElement('canvas');
      c.width = font.img.width;
      c.height = font.img.height;
      const g = c.getContext('2d');
      g.drawImage(font.img, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
      fontTintCache.set(key, c);
    }
    return fontTintCache.get(key);
  }
  function pixelText(txt, x, y, size, color, align = 'left', alpha = 1, face) {
    if (!fonts) return;
    let font = fonts.main;
    let scale = 1;
    if (face === 'main2') {
      scale = 2;
    } else if (size >= 36) {
      font = fonts.big;
      scale = 2;
    } else if (size >= 17) {
      font = fonts.big;
    }
    const atlas = fontAtlas(font, color);
    const fixedAdv = face === 'main2' ? 7.5 : 0;
    let pen = 0;
    let inkL = Infinity;
    let inkR = -Infinity;
    for (const ch of txt) {
      const g = font.glyphs.get(ch.charCodeAt(0)) || font.glyphs.get(63);
      if (!g) continue;
      if (g.w > 0) {
        inkL = Math.min(inkL, pen + g.off);
        inkR = Math.max(inkR, pen + g.off + g.w);
      }
      pen += fixedAdv || g.shift;
    }
    if (inkL === Infinity) return;
    let base = x - inkL * scale;
    if (align === 'center') base = x - ((inkL + inkR) / 2) * scale;
    if (align === 'right') base = x - inkR * scale;
    const top = y - Math.round(font.em * scale * 0.85);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha;
    pen = 0;
    for (const ch of txt) {
      const g = font.glyphs.get(ch.charCodeAt(0)) || font.glyphs.get(63);
      if (!g) continue;
      if (g.w > 0 && g.h > 0)
        ctx.drawImage(
          atlas,
          g.x,
          g.y,
          g.w,
          g.h,
          Math.round(base + (pen + g.off) * scale),
          Math.round(top),
          g.w * scale,
          g.h * scale,
        );
      pen += fixedAdv || g.shift;
    }
    ctx.restore();
  }

  function drawSprite(name, frame, x, y, o = {}) {
    const s = sprites[name];
    if (!s) return;
    const f = Math.max(0, Math.min(s.frames - 1, Math.floor(frame)));
    const scale = o.scale || 2;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.blend) ctx.globalCompositeOperation = o.blend;
    ctx.drawImage(
      (o.img || s).img,
      f * s.w,
      0,
      s.w,
      s.h,
      Math.round(x - s.ox * scale),
      Math.round(y - s.oy * scale),
      s.w * scale,
      s.h * scale,
    );
    ctx.restore();
  }

  function glowColor() {
    const remaining = running ? FULLTIME - elapsed : FULLTIME;
    const ind = easeOutQuart(Math.max(0, Math.min(1, remaining / 250)));
    return [
      Math.round(lerp(255, 0x4e, ind)),
      Math.round(lerp(0, 0x4e, ind)),
      Math.round(lerp(0, 0x73, ind)),
    ];
  }

  function drawGlow() {
    const s = sprites.ethereal;
    const [rr, gg, bb] = glowColor();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tint = tinted.glow(rr, gg, bb);
    const cellVisible = (bx, by) =>
      bx + TILE >= camX - 40 &&
      bx <= camX + VIEW_W + 40 &&
      by + TILE >= camY - 40 &&
      by <= camY + VIEW_H + 40;
    const drawCell = (bx, by, i, j, alphaMul, base, tc = tint) => {
      const amt = Math.abs(Math.sin((siner - j * 60) / 40)) + 0.5;
      const wob = Math.sin((siner + i * 40) / 5) * 2;
      const wob2 = Math.cos((siner + j * 40) / 5) * 2;
      ctx.globalAlpha = Math.min(1, base * amt * 0.125 * alphaMul);
      ctx.drawImage(tc, 0, 0, s.w, s.h, bx + wob, by + wob2, 40, 40);
      ctx.drawImage(tc, 0, 0, s.w, s.h, bx - wob2, by - wob, 40, 40);
      ctx.globalAlpha = Math.min(1, base * amt * alphaMul);
      ctx.drawImage(tc, 0, 0, s.w, s.h, bx, by, 40, 40);
    };
    const emberTint = tinted.glow(226, 150, 60);
    const dangerTint = tinted.glow(232, 88, 48);
    if (glowAlpha >= 0.01) {
      if (L.kind === 'church') {
        for (const rect of L.glowRects) {
          if (rect.x + rect.w < camX - 40 || rect.x > camX + VIEW_W + 40)
            continue;
          if (rect.y + rect.h < camY - 40 || rect.y > camY + VIEW_H + 40)
            continue;
          const cols = Math.max(1, Math.round(rect.w / TILE));
          const rows = Math.max(1, Math.round(rect.h / TILE));
          for (let i = 0; i < cols; i++)
            for (let j = 0; j < rows; j++)
              drawCell(
                rect.x + i * TILE,
                rect.y + j * TILE,
                i,
                j,
                1,
                glowAlpha,
              );
        }
      } else {
        for (const cell of L.glowCellList) {
          if (brokenCells.has(cell.k)) continue;
          if (!cellVisible(cell.x, cell.y)) continue;
          let alphaMul = 1;
          if (hiddenCells.has(cell.k)) continue;
          const grp = cellAppearGroup.get(cell.k);
          if (grp) alphaMul = grp.alpha;
          let tc = tint;
          let jx = 0;
          const brit = L.brittleMap.get(cell.k);
          if (brit) {
            tc = brit.dangerous ? dangerTint : emberTint;
            if (brit.con === 1 && brit.timer > 0 && !brit.dangerous) {
              jx =
                Math.sin(siner * 1.7 + cell.c) *
                (0.5 + 2.5 * Math.min(1, brit.timer / EMBER_HOLD));
            }
          }
          drawCell(
            cell.x + jx,
            cell.y,
            cell.c,
            cell.r,
            alphaMul,
            glowAlpha,
            tc,
          );
        }
      }
    }
    for (const ft of fallingTiles) {
      const fade = 1 - ft.t / 30;
      const wob = Math.sin((siner + ft.t) / 2) * 2 + ft.t / 3;
      ctx.globalAlpha = Math.min(1, Math.max(0, fade));
      ctx.drawImage(emberTint, 0, 0, s.w, s.h, ft.x + wob, ft.y, 40, 40);
      ctx.drawImage(emberTint, 0, 0, s.w, s.h, ft.x - wob, ft.y, 40, 40);
    }
    ctx.restore();
  }

  function drawCoins() {
    for (const cn of L.coins) {
      if (cn.taken || coinHidden(cn)) continue;
      drawSprite('coin', Math.floor(siner / 2) % 4, cn.x, cn.y);
    }
    if (coinMarker) {
      pixelText(
        `+${coinMarker.value}$`,
        coinMarker.x,
        coinMarker.y,
        20,
        'rgb(255,213,0)',
        'center',
        coinMarker.t > 20 ? 1 - (coinMarker.t - 20) / 10 : 1,
      );
    }
  }

  function drawWater() {
    if (!streams.length) return;
    const s = sprites.watertile;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const st of streams) {
      const drawy = (st.moveT / MOVE_RATE) * TILE;
      const gx = st.g.x;
      const endY = st.g.endY;
      const floor = st.g.y + 20;
      const topy = Math.max(floor, Math.min(st.y + drawy, endY));
      const boty = Math.max(
        floor,
        Math.min(st.y - TILE + STREAM_TILES * TILE + drawy, endY),
      );
      if (boty <= topy) continue;
      const alph = Math.max(
        0,
        Math.min(0.8, st.animIdx + Math.sin(st.animIdx * 4) * 0.25),
      );
      const colindex = Math.floor(st.animIdx) % 4;
      const offset = st.ending ? 0 : -8;
      ctx.globalAlpha = alph;
      ctx.drawImage(s.img, colindex * 20, 0, 20, 8, gx, topy - 16, 40, 16);
      ctx.fillStyle = WATER_COLS[colindex];
      const bodyH = boty - topy + offset;
      if (bodyH > 0) ctx.fillRect(gx, topy, 40, bodyH);
      if (!st.ending) {
        ctx.save();
        ctx.translate(gx, boty + 8);
        ctx.scale(1, -1);
        ctx.drawImage(s.img, colindex * 20, 0, 20, 8, 0, 0, 40, 16);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawCup() {
    const s = sprites.cup;
    const spot = cupSpot();
    const wob = Math.sin(siner / 55) * 26;
    const x = spot.x + wob;
    const facingLeft = Math.cos(siner / 55) < 0;
    const frame = Math.floor(siner / 10) % 2;
    ctx.save();
    if (facingLeft) {
      ctx.translate(x + 46, spot.y);
      ctx.scale(-1, 1);
      ctx.drawImage(s.img, frame * 23, 0, 23, 33, 0, 0, 46, 66);
    } else {
      ctx.drawImage(
        s.img,
        frame * 23,
        0,
        23,
        33,
        Math.round(x),
        spot.y,
        46,
        66,
      );
    }
    ctx.restore();
  }

  function drawWalker() {
    const spr = {
      left: 'walkLeft',
      right: 'walkRight',
      up: 'walkUp',
      down: 'walkDown',
    }[walker.dir];
    const s = sprites[spr];
    const frame = walker.moving ? Math.floor(walker.animT) % 4 : 0;
    drawSprite(spr, frame, walker.x - s.w, walker.y - s.h * 2 + 4);
    if (nearMount()) {
      const st = zoneStarter();
      pixelText(
        '[Z] CLIMB',
        st.x + 20,
        st.y + (zone === 'top' ? -50 : 100) + Math.sin(siner / 6) * 3,
        16,
        '#fff',
        'center',
      );
    }
  }

  function drawReticle() {
    if (kris.state !== 'charge') return;
    const found = reachableTiles(kris.dir, kris.chargeAmt);
    const alph = Math.max(0.1, Math.min(0.8, kris.chargeT / 14));
    const hint = found ? tinted.hintWarm : tinted.hintGray;
    const grow = Math.min(1, kris.chargeT / 22);
    const conf = {
      down: [-22, 18, 0],
      right: [18, 22, 90],
      up: [22, -18, 180],
      left: [-18, -22, 270],
    }[kris.dir];
    ctx.save();
    ctx.translate(kris.x + conf[0], kris.y + conf[1]);
    ctx.rotate((-conf[2] * Math.PI) / 180);
    ctx.globalAlpha = 0.85 * alph;
    const hFrame = Math.floor(siner / 2) % 4;
    const hh = Math.max(4, Math.round(62 * grow));
    ctx.drawImage(hint, hFrame * 22, 0, 22, hh, 0, 0, 44, hh * 2);
    ctx.restore();
    if (found) {
      const d = DIRS[kris.dir];
      const tc = kris.lastTile.c + d.dx * found;
      const tr = kris.lastTile.r + d.dy * found;
      const pulse = 0.5 + Math.sin(kris.chargeT / 3) * 0.5;
      ctx.save();
      ctx.globalAlpha = alph;
      ctx.drawImage(tinted.retYellow, tc * TILE - 4, tr * TILE - 4, 48, 48);
      ctx.globalAlpha = alph * pulse;
      ctx.drawImage(tinted.retWhite, tc * TILE - 4, tr * TILE - 4, 48, 48);
      ctx.restore();
    }
  }

  function drawKris() {
    drawReticle();
    const y = kris.y + (kris.arc || 0);
    if (kris.hurtT > 0 && kris.hurtT % 4 < 2) ctx.globalAlpha = 0.4;
    switch (kris.state) {
      case 'charge': {
        const name = chargeSprite();
        drawSprite(name, kris.chargeAmt - 1, kris.x, y);
        if (kris.chargeAmt >= 2) {
          const pulse =
            kris.chargeAmt === 3
              ? 0.25 + 0.2 * Math.abs(Math.sin(kris.chargeT / 2))
              : 0.15;
          drawSprite(name, kris.chargeAmt - 1, kris.x, y, {
            img: chargeTint[name],
            alpha: pulse,
            blend: 'lighter',
          });
        }
        break;
      }
      case 'step': {
        if (kris.jumping) {
          const t = kris.stepT / kris.stepRate;
          if (kris.dir === 'up' || kris.dir === 'down')
            drawSprite('krisJumpUp', Math.floor(t * 3), kris.x, y);
          else if (kris.dir === 'right')
            drawSprite(
              t > 0.5 ? 'krisLandR' : 'krisSlipR',
              t > 0.5 ? 1 : 0,
              kris.x,
              y,
            );
          else
            drawSprite(
              t > 0.5 ? 'krisLandL' : 'krisSlipL',
              t > 0.5 ? 1 : 0,
              kris.x,
              y,
            );
        } else {
          const moving = kris.stepT > 2 && kris.stepT < kris.stepRate - 1;
          drawSprite(
            'krisClimb',
            kris.climbIndex + (moving ? 1 : 0),
            kris.x,
            y,
          );
        }
        break;
      }
      case 'slip':
        drawSprite(
          kris.slipDir === 'right' ? 'krisSlipR' : 'krisSlipL',
          kris.slipT >= 3 ? 1 : 0,
          kris.x,
          y,
        );
        break;
      case 'fall':
        drawSprite('krisFall', Math.floor(siner / 4) % 3, kris.x, y);
        break;
      case 'grab':
        drawSprite('krisCharge', 2, kris.x, y);
        break;
      default:
        drawSprite('krisClimb', kris.climbIndex, kris.x, y);
    }
    ctx.globalAlpha = 1;
  }

  function formatDigits(tenthsTotal) {
    const v = Math.max(0, Math.min(999, tenthsTotal));
    return [Math.floor(v / 100) % 10, Math.floor(v / 10) % 10, v % 10];
  }

  function drawBoard() {
    let x = Math.round(board.x);
    let y = Math.round(board.y);
    if (y > camY + VIEW_H + 60) return;
    let time = 0;
    if (running) time = elapsed;
    if (thisTime !== -1) time = thisTime;
    const tenths = Math.floor(time / 3);
    const num = formatDigits(tenths);
    const pulse = Math.round((0.5 + Math.sin(board.siner / 15) * 0.5) * 8) / 8;
    let col = `rgb(255,255,${Math.round(lerp(194, 255, pulse))})`;
    if (tenths >= 999) {
      const prog =
        Math.round(
          Math.max(0, Math.min(1, (tenths - 999) / (9000 - 999))) * 16,
        ) / 16;
      col = `rgb(${Math.round(lerp(255, 135, prog))},${Math.round(
        lerp(0, 129, prog),
      )},${Math.round(lerp(0, 190, prog))})`;
    }
    if (tenths >= 9000) {
      x += Math.round(Math.random() * 2 - 1);
      y += Math.round(Math.random() * 2 - 1);
    }
    if (tenths === 0 && thisTime === -1) col = 'rgb(18,18,18)';
    if (thisTime !== -1) col = 'rgb(250,219,2)';
    const s = sprites.timerBox;
    ctx.drawImage(s.img, 0, 0, 42, 40, x, y, 84, 80);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + 9, y + 9, 66, 32);
    const digitTint = tinted.digits(col);
    for (let i = 0; i < 3; i++) {
      const bon = i === 2 ? 4 : 0;
      const f = num[i];
      ctx.drawImage(
        digitTint,
        f * 42,
        0,
        42,
        35,
        x - 24 + 20 * i + bon,
        y - 10,
        84,
        70,
      );
    }
    ctx.fillStyle = col;
    ctx.fillRect(x + 50, y + 36, 4, 4);
    const ff = Math.floor(board.siner / 2) % 2;
    ctx.drawImage(
      sprites.timerFire.img,
      ff * 7,
      0,
      7,
      10,
      x + 6,
      y + 50,
      14,
      20,
    );
    ctx.drawImage(
      sprites.timerFire.img,
      ff * 7,
      0,
      7,
      10,
      x + 64,
      y + 50,
      14,
      20,
    );
    if (thisTime !== -1 && newBest) {
      pixelText('NEW BEST!', x + 92, y + 30, 14, 'rgb(250,219,2)');
    }
  }

  function drawGame() {
    const bg = L.bg >>> 0;
    ctx.fillStyle = `rgb(${(bg >> 16) & 255},${(bg >> 8) & 255},${bg & 255})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.translate(-Math.round(camX), -Math.round(camY));
    if (backdrop && backdrop.width) {
      const sx = Math.max(0, Math.floor(camX));
      const sy = Math.max(0, Math.floor(camY));
      const sw = Math.min(backdrop.width - sx, VIEW_W + 8);
      const sh = Math.min(backdrop.height - sy, VIEW_H + 8);
      if (sw > 0 && sh > 0)
        ctx.drawImage(backdrop, sx, sy, sw, sh, sx, sy, sw, sh);
    }
    if (L.kind === 'church') {
      const best = loadBest();
      const dec = L.decor;
      const gotChurch = best && best <= 170;
      const gotSeeds = seedsCleared() >= 5;
      if ((gotChurch || gotSeeds) && dec.table) {
        const ts = sprites.table;
        ctx.drawImage(
          ts.img,
          Math.round(dec.table.x),
          Math.round(dec.table.y),
          ts.w * dec.table.sx,
          ts.h * dec.table.sy,
        );
        const tr = sprites.trophy;
        const drawTrophy = (d, img) => {
          if (!d) return;
          ctx.drawImage(
            img,
            0,
            0,
            tr.w,
            tr.h,
            Math.round(d.x),
            Math.round(d.y),
            tr.w * d.sx,
            tr.h * d.sy,
          );
        };
        if (gotSeeds) drawTrophy(dec.trophies[0], tinted.trophyGreen);
        if (gotChurch)
          drawTrophy(dec.trophies[1] || dec.trophies[0], tinted.trophyYellow);
      }
    }
    L.generators.forEach(g => drawSprite('dispenser', 0, g.x, g.y));
    if (L.kind === 'generated')
      L.buckets.forEach(b => drawSprite('bucket', 0, b.x, b.y));
    drawGlow();
    if (L.kind === 'generated') {
      for (const grp of L.appearGroups) {
        if (!grp.bell) continue;
        const bx = grp.bell.x;
        const by = grp.bell.y;
        ctx.save();
        if (grp.rung && !grp.ringT) ctx.globalAlpha = 0.7;
        const grad = ctx.createLinearGradient(0, by - 190, 0, by - 80);
        grad.addColorStop(0, 'rgba(180,214,202,0)');
        grad.addColorStop(1, 'rgba(180,214,202,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(bx - 2, by - 190, 4, 110);
        ctx.fillStyle = '#B4D6CA';
        ctx.fillRect(bx - 2, by - 80, 4, 80);
        const swing =
          grp.ringT > 0
            ? Math.sin((24 - grp.ringT) * 0.9) * 16 * (grp.ringT / 24)
            : 0;
        ctx.translate(bx, by);
        ctx.rotate((-swing * Math.PI) / 180);
        ctx.drawImage(sprites.bell.img, 0, 0, 19, 20, -18, -4, 38, 40);
        ctx.restore();
      }
    }
    if (L.kind === 'church' && L.decor.wallswitch) {
      drawSprite(
        'wallswitch',
        switchLit ? 1 : 0,
        L.decor.wallswitch.x,
        L.decor.wallswitch.y,
        { scale: 2 },
      );
    }
    if (L.kind === 'church') drawCup();
    if (L.kind === 'generated' && L.def.wallswitchPos) {
      drawSprite(
        'wallswitch',
        switchLit ? 1 : 0,
        L.def.wallswitchPos.x,
        L.def.wallswitchPos.y,
        { scale: 2 },
      );
    }
    drawCoins();
    ghosts.forEach(g =>
      drawSprite(g.spr, g.frame, g.x, g.y, { alpha: g.alpha }),
    );
    anims.forEach(a => drawSprite(a.spr, a.frame, a.x, a.y));
    if (mode === 'ground') drawWalker();
    else if (mode === 'mount')
      drawSprite('krisBall', Math.floor(mount.t / 2) % 4, walker.x, walker.y);
    else if (kris) drawKris();
    drawWater();
    drawBoard();
    confetti.forEach(p => {
      ctx.globalAlpha = Math.min(1, p.life / 15);
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 4, 4);
      ctx.globalAlpha = 1;
    });
    ctx.restore();
    if (mode === 'wall' && running) {
      pixelText(
        'Hold [X]: Let go',
        VIEW_W - 12,
        VIEW_H - 14,
        16,
        holdExitT > 0 ? '#ffd93c' : '#fff',
        'right',
      );
      if (holdExitT > 0) {
        ctx.fillStyle = '#ffd93c';
        ctx.fillRect(VIEW_W - 126, VIEW_H - 8, (114 * holdExitT) / 30, 3);
      }
    }
    if (L.kind === 'generated') {
      pixelText(`SEED ${L.seed}`, VIEW_W - 12, 22, 14, '#9f9fc9', 'right');
      pixelText(
        `$ ${coinsTaken}`,
        VIEW_W - 12,
        42,
        14,
        'rgb(255,213,0)',
        'right',
      );
    }
    if (mode === 'ground') {
      const best = loadBest();
      if (best) {
        pixelText(
          `BEST ${(best / 10).toFixed(1)}s`,
          14,
          VIEW_H - 14,
          14,
          '#9f9fc9',
        );
      }
      pixelText('[ESC] Menu', 14, VIEW_H - 34, 14, '#9f9fc9', 'left', 0.55);
    }
    if (dialog) drawDialog();
  }

  function drawDialog() {
    // dialoguer side 0 = box at the top of the screen
    const top = dialog.side === 0;
    const ut = dialog.box === 'ut';
    const boxX1 = ut ? 32 : 24;
    const boxX2 = ut ? 608 : 616;
    const boxY1 = top ? (ut ? 16 : 2) : ut ? 322 : 312;
    const boxY2 = top ? (ut ? 158 : 168) : ut ? 464 : 478;
    const textX = ut ? 62 : 58;
    const textY = top ? (ut ? 60 : 50) : ut ? 366 : 360;
    if (ut) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(boxX1, boxY1, boxX2 - boxX1, boxY2 - boxY1);
      ctx.fillStyle = '#000';
      ctx.fillRect(
        boxX1 + 5,
        boxY1 + 5,
        boxX2 - boxX1 - 10,
        boxY2 - boxY1 - 10,
      );
    } else {
      drawDarkBox(ctx, sprites, boxX1, boxY1, boxX2, boxY2, siner);
    }
    if (dialog.choosing) {
      const base = top ? 94 : 404;
      dialog.choices.forEach((c, i) => {
        const sel = dialog.sel === i;
        const cx = i === 0 ? 140 : 455;
        pixelText(
          c,
          cx,
          base,
          18,
          sel ? '#FFFF00' : '#fff',
          'left',
          1,
          'main2',
        );
        if (sel) blit('heart', 0, cx - 24, base - 12, 1);
      });
      return;
    }
    const statement = dialog.pages[dialog.idx] || '';
    const wrapped = wrapStatement(statement);
    const indent = 30; // "* " at the writer's fixed 15px per character
    let used = 0;
    wrapped.forEach((line, i) => {
      const visible = Math.max(0, Math.min(dialog.chars - used, line.length));
      used += line.length + 1; // the space the wrap swallowed
      if (!visible) return;
      const txt = line.slice(0, visible);
      if (i === 0)
        pixelText('* ' + txt, textX, textY, 18, '#fff', 'left', 1, 'main2');
      else
        pixelText(
          txt,
          textX + indent,
          textY + i * 36,
          18,
          '#fff',
          'left',
          1,
          'main2',
        );
    });
  }

  function drawMenu() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawDarkBox(ctx, sprites, 120, 70, 520, 180, siner);
    pixelText('DELTASCEND', VIEW_W / 2, 138, 40, '#fff', 'center');
    drawDarkBox(ctx, sprites, 160, 210, 480, 400, siner);
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const y = 265 + i * 44;
      const sel = i === menuSel;
      pixelText(MENU_ITEMS[i], 250, y, 20, sel ? '#FFFF00' : '#fff');
      if (sel) blit('heart', 0, 250 - 26, y - 11, 1);
    }
    pixelText(
      '[Z] SELECT   ARROWS MOVE',
      VIEW_W / 2,
      440,
      13,
      '#9f9fc9',
      'center',
    );
  }

  function drawCode() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawDarkBox(ctx, sprites, 120, 130, 520, 350, siner);
    pixelText('ENTER SEED', VIEW_W / 2, 185, 22, '#fff', 'center');
    codeEntry.draw(
      ctx,
      sprites,
      VIEW_W / 2,
      265,
      { upHeld: held.up, downHeld: held.down },
      pixelText,
    );
    pixelText(
      '[Z] CLIMB IT   [X] BACK',
      VIEW_W / 2,
      325,
      13,
      '#9f9fc9',
      'center',
    );
  }

  function drawResults() {
    drawGame();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawDarkBox(ctx, sprites, 110, 90, 530, 390, siner);
    pixelText(
      `SEED ${L.seed} CLEARED!`,
      VIEW_W / 2,
      145,
      24,
      'rgb(250,219,2)',
      'center',
    );
    const row = (label, value, y, col) => {
      pixelText(label, 170, y, 18, '#fff');
      pixelText(value, 470, y, 18, col || '#fff', 'right');
    };
    row('TIME', `${(results.tenths / 10).toFixed(1)}s`, 195);
    if (newBest)
      pixelText('NEW BEST!', 470, 212, 12, 'rgb(250,219,2)', 'right');
    row('COINS', `${results.coins} $`, 240, 'rgb(255,213,0)');
    row('SPEED BONUS', `+${results.bonus}`, 275);
    row(
      'XP POINTS',
      results.award > 0 ? `+${results.award}` : '+0',
      315,
      'rgb(124,255,107)',
    );
    if (results.award === 0) {
      pixelText(
        `this seed already paid ${results.xp}`,
        470,
        332,
        12,
        '#9f9fc9',
        'right',
      );
    }
    pixelText(
      '[Z] CLIMB AGAIN   [X] MENU',
      VIEW_W / 2,
      365,
      13,
      '#9f9fc9',
      'center',
    );
  }

  function render() {
    if (!sprites) return;
    if (phase === 'menu') drawMenu();
    else if (phase === 'codeentry') drawCode();
    else if (phase === 'results') drawResults();
    else if (phase === 'secret') drawSecret();
    else if (L) drawGame();
  }

  function frame(now) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      tick();
      updateCam();
    }
    render();
  }

  Promise.all([loadAll(), loadFonts()]).then(([loaded, loadedFonts]) => {
    if (destroyed) return;
    sprites = loaded.sprites;
    bake = loaded.bake;
    fonts = loadedFonts;
    const tintCopy = (name, color) => {
      const s = sprites[name];
      const c = document.createElement('canvas');
      c.width = s.w * s.frames;
      c.height = s.h;
      const g = c.getContext('2d');
      g.drawImage(s.img, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
      return c;
    };
    const blendCopy = (name, color) => {
      const s = sprites[name];
      const c = document.createElement('canvas');
      c.width = s.w * s.frames;
      c.height = s.h;
      const g = c.getContext('2d');
      g.drawImage(s.img, 0, 0);
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(s.img, 0, 0);
      return c;
    };
    const glowCache = {};
    const digitCache = {};
    tinted = {
      hintGray: tintCopy('reticleHint', 'rgb(200,200,200)'),
      hintWarm: tintCopy('reticleHint', 'rgb(255,200,132)'),
      retYellow: tintCopy('reticle', '#ffd93c'),
      retWhite: tintCopy('reticle', '#ffffff'),
      trophyGreen: blendCopy('trophy', '#A1FF82'),
      trophyYellow: blendCopy('trophy', '#CEFF3D'),
      glow(rr, gg, bb) {
        const key = `${rr},${gg},${bb}`;
        if (!glowCache[key]) {
          const s = sprites.ethereal;
          const c = document.createElement('canvas');
          c.width = s.w;
          c.height = s.h;
          const g = c.getContext('2d');
          g.drawImage(s.img, 0, 0);
          g.globalCompositeOperation = 'multiply';
          g.fillStyle = `rgb(${rr},${gg},${bb})`;
          g.fillRect(0, 0, c.width, c.height);
          g.globalCompositeOperation = 'destination-in';
          g.drawImage(s.img, 0, 0);
          glowCache[key] = c;
        }
        return glowCache[key];
      },
      digits(col) {
        if (!digitCache[col]) digitCache[col] = tintCopy('timerDigits', col);
        return digitCache[col];
      },
    };
    chargeTint = {
      krisCharge: { img: tintCopy('krisCharge', '#00c8c8') },
      krisChargeR: { img: tintCopy('krisChargeR', '#00c8c8') },
      krisChargeL: { img: tintCopy('krisChargeL', '#00c8c8') },
    };
    startMusic();
    raf = requestAnimationFrame(frame);
  });

  const keyTarget = opts.keyTarget || window;
  keyTarget.addEventListener('keydown', onKeyDown);
  keyTarget.addEventListener('keyup', onKeyUp);
  const onBlur = () => {
    Object.keys(held).forEach(k => {
      held[k] = false;
    });
    clearPressed();
    if (kris && kris.state === 'charge') cancelCharge();
  };
  keyTarget.addEventListener('blur', onBlur);

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      keyTarget.removeEventListener('keydown', onKeyDown);
      keyTarget.removeEventListener('keyup', onKeyUp);
      keyTarget.removeEventListener('blur', onBlur);
      mixer.stopAll();
      stopMusic();
      castleMusic.stop();
      kikkyMusic.stop();
      birdMusic.stop();
      droneLoop.stop();
    },
    refreshVolume() {
      music.setVolume(getVolume() * 0.5);
      castleMusic.setVolume(getVolume() * 0.5);
      kikkyMusic.setVolume(getVolume() * 0.5);
    },
  };
}
