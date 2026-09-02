// THE FLOOD: an endless wall grown ahead of the camera, with the water
// rising behind Kris.
import {
  TILE,
  VIEW_H,
  VIEW_W,
  WATER_COLS,
  WATER_GRAB_DELAY,
  cellKey,
} from './constants';
import {
  clampCamX,
  clampCamY,
  loadLevel,
  play,
  startMusic,
  stopMusic,
} from './run';
import { buildEndless } from './levels';
import { mountAt } from './kris';
import { endlessBest, persist } from './save';
import { drawGame, pixelText } from './draw';
import { drawDarkBox } from './dialogue';

export function endlessRng(game, seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function endlessAddCell(game, c, r, canEmber) {
  c = Math.max(1, Math.min(14, c));
  const k = cellKey(c, r);
  if (game.L.glowCells.has(k) || game.L.alwaysCells.has(k)) return c;
  game.L.glowCells.add(k);
  game.L.glowCellList.push({
    c,
    r,
    k,
    x: c * TILE,
    y: r * TILE,
  });
  // ambers roll here; reds are promoted afterwards, only onto cells the
  // line provably continues past (never a jump's sole landing)
  if (canEmber && game.endless.rng() < 0.14) {
    game.L.brittleMap.set(k, {
      c,
      r,
      dangerous: false,
      con: 0,
      timer: 0,
    });
  }
  return c;
}

export function endlessStepTrack(game, t, other) {
  const e = game.endless;
  const depth = e.baseRow - t.r;
  const canEmber = depth > 14;
  const roll = e.rng();
  if (roll < 0.38) {
    t.r -= 1;
    t.c = endlessAddCell(game, t.c, t.r, canEmber);
    // with the line contiguous above and below, the previous cell may go
    // red: a charge jump clears it, it is never the only landing
    if (t.run >= 1 && t.prev && canEmber && e.rng() < 0.22) {
      game.L.brittleMap.set(cellKey(t.prev.c, t.prev.r), {
        c: t.prev.c,
        r: t.prev.r,
        dangerous: true,
        con: 0,
        timer: 0,
      });
      t.prev = null;
    } else {
      t.prev = {
        c: t.c,
        r: t.r,
      };
    }
    t.run += 1;
  } else if (roll < 0.68 && depth > 6) {
    // a vertical gap sized for a charge jump, so the landing stays in line
    t.r -= e.rng() < 0.68 ? 2 : 3;
    t.c = endlessAddCell(game, t.c, t.r, canEmber);
    t.run = 0;
    t.prev = null;
  } else {
    let dir = e.rng() < 0.5 ? 1 : -1;
    if (Math.abs(t.c - other.c) < 3) dir = t.c >= other.c ? 1 : -1;
    if (t.c + dir * 2 < 1 || t.c + dir * 2 > 14) dir = -dir;
    const len = 1 + Math.floor(e.rng() * 2);
    for (let i = 1; i <= len; i++)
      endlessAddCell(game, t.c + dir * i, t.r, canEmber);
    t.c = Math.max(1, Math.min(14, t.c + dir * len));
    t.r -= 1;
    t.c = endlessAddCell(game, t.c, t.r, canEmber);
    t.run = 0;
    t.prev = null;
  }
}

export function endlessEnsureRows(game, targetRow) {
  const e = game.endless;
  let guard = 0;
  while (
    (e.tracks[0].r > targetRow || e.tracks[1].r > targetRow) &&
    guard++ < 4000
  ) {
    for (const t of e.tracks) {
      if (t.r > targetRow)
        endlessStepTrack(
          game,
          t,
          t === e.tracks[0] ? e.tracks[1] : e.tracks[0],
        );
    }
    if (e.rng() < 0.1 && Math.abs(e.tracks[0].r - e.tracks[1].r) <= 1) {
      const r = Math.min(e.tracks[0].r, e.tracks[1].r);
      const [a, b] = [e.tracks[0].c, e.tracks[1].c].sort((x, y) => x - y);
      if (b - a > 2 && b - a < 9)
        for (let c = a; c <= b; c++) endlessAddCell(game, c, r, false);
    }
    const highest = Math.min(e.tracks[0].r, e.tracks[1].r);
    if (highest <= e.nextGenRow) {
      // a dispenser pouring straight down one of the climbing lines,
      // bucket at the bottom, timed like the generated walls
      const t = e.tracks[Math.floor(e.rng() * 2)];
      const span = 4 + Math.floor(e.rng() * 3);
      const spoutRow = t.r - 1;
      const bucketRow = t.r + span;
      game.L.generators.push({
        x: t.c * TILE,
        y: spoutRow * TILE,
        endY: bucketRow * TILE + 20,
        waittime: 90 + Math.floor(e.rng() * 40),
        waitoff: 5 + Math.floor(e.rng() * 40),
      });
      game.L.buckets.push({
        x: t.c * TILE,
        y: bucketRow * TILE + 20,
      });
      e.nextGenRow = highest - (12 + Math.floor(e.rng() * 8));
    }
  }
}

export function endlessPrune(game) {
  const cutRow = Math.floor(game.endless.floodY / TILE) + 1;
  if (game.L.glowCellList.some(cell => cell.r > cutRow)) {
    game.L.glowCellList = game.L.glowCellList.filter(cell => {
      if (cell.r <= cutRow) return true;
      game.L.glowCells.delete(cell.k);
      game.L.brittleMap.delete(cell.k);
      game.brokenCells.delete(cell.k);
      return false;
    });
  }
  game.L.generators = game.L.generators.filter(g => g.y <= game.endless.floodY);
  game.L.buckets = game.L.buckets.filter(b => b.y <= game.endless.floodY + 40);
}

export function startEndless(game) {
  loadLevel(game, buildEndless((Math.random() * 0x7fffffff) | 0));
  const baseRow = Math.round(game.L.h / TILE) - 8;
  stopMusic(game);
  game.raceMusic.stop();
  game.endless = {
    rng: endlessRng(game, game.L.seed),
    baseRow,
    tracks: [
      {
        c: 7,
        r: baseRow,
        run: 0,
        prev: null,
      },
      {
        c: 9,
        r: baseRow,
        run: 0,
        prev: null,
      },
    ],
    nextGenRow: baseRow - 14,
    floodY: (baseRow + 3) * TILE,
    cd: {
      t: 0,
      text: 3,
    },
    started: false,
    t: 0,
    maxRow: baseRow,
    height: 0,
    over: false,
    overT: 0,
    splashT: 0,
    knockT: 0,
    finalBest: false,
  };
  mountAt(game, {
    c: 8,
    r: baseRow,
  });
  game.mode = 'wall';
  game.running = true;
  game.glowTarget = 1;
  game.glowAlpha = 1;
  endlessEnsureRows(game, baseRow - 30);
  game.camX = clampCamX(game, game.kris.x - VIEW_W / 2);
  game.camY = clampCamY(game, game.kris.y - VIEW_H / 2 - 40);
}

// obj_dw_countdown: a number every 30 frames with a rising orchestra
// hit, the bell at zero, then 30 more black frames before the reveal
// obj_dw_countdown: a number every 30 frames with a rising orchestra
// hit, the bell at zero, then 30 more black frames before the reveal
export function stepCountdown(game) {
  const cd = game.endless.cd;
  cd.t += 1;
  if (cd.t === 1) play(game, 'orchhit', 0.9, 1);
  if (cd.t % 30 === 0 && cd.text > 0) {
    cd.text -= 1;
    if (cd.text <= 0) play(game, 'bell', 0.9);
    else play(game, 'orchhit', 0.9, 1 + (4 - cd.text - 1) / 16);
  }
  if (cd.t >= 120) {
    game.endless.cd = null;
    game.endless.started = true;
    game.raceMusic.start();
  }
}

export function stepEndless(game) {
  const e = game.endless;
  if (!e) return;
  e.t += 1;
  if (e.over) {
    e.overT += 1;
    // mus_volume(song, 0, 30): the gameover fades the track, no hard cut
    if (e.musFade > 0) {
      e.musFade -= 1;
      game.raceMusic.setVolume(game.getVolume() * 0.35 * (e.musFade / 30));
      if (e.musFade === 0) game.raceMusic.stop();
    }
    if (e.overT === 10) play(game, 'swallow', 0.8, 0.5);
    if (e.overT === 55) game.phase = 'endresults';
    return;
  }
  if (game.kris.lastTile.r < e.maxRow && game.kris.state !== 'fall') {
    e.maxRow = game.kris.lastTile.r;
    e.height = e.baseRow - e.maxRow;
  }
  if (e.started) {
    // rubber band: the chase speed saturates below a good climber's pace,
    // but banking a big lead makes the water surge back to the leash
    const gap = e.floodY - game.kris.y;
    const chase = Math.min(2.7, 0.9 + e.height * 0.004);
    const catchup = Math.min(6, Math.max(0, (gap - 360) * 0.012));
    e.floodY -= chase + catchup;
  }
  endlessEnsureRows(game, Math.floor(game.camY / TILE) - 8);
  if (e.t % 32 === 0) endlessPrune(game);
  e.splashT -= 1;
  if (e.started && e.splashT <= 0) {
    e.splashT = 12 + Math.floor(Math.random() * 16);
    game.anims.push({
      spr: 'bucketSplash',
      frame: 0,
      speed: 1 / 3,
      x: Math.random() * (VIEW_W - 40),
      y: e.floodY,
      vx: 0,
      vy: 0,
    });
  }
  if (e.knockT > 0) e.knockT -= 1;
  // the water only takes you in neutral or charge, same as the streams
  if (
    (game.kris.state === 'neutral' || game.kris.state === 'charge') &&
    game.kris.y + 14 > e.floodY
  ) {
    game.mixer.stopCharge();
    game.kris.chargeAmt = 0;
    game.kris.jumping = false;
    game.kris.arc = 0;
    game.kris.state = 'fall';
    game.kris.fallV = 0;
    game.kris.fallT = 0;
    game.kris.noGrab = false;
    game.kris.grabDelay = WATER_GRAB_DELAY;
    if (e.knockT === 0) {
      play(game, 'splash', 0.9);
      e.knockT = 30;
    }
  }
  if (game.kris.y > e.floodY + 26) {
    e.over = true;
    e.overT = 0;
    e.musFade = 30;
    game.mixer.stopCharge();
    game.kris.noGrab = true;
    game.running = false;
    play(game, 'splash', 0.9, 0.8);
    for (let i = 0; i < 6; i++) {
      game.anims.push({
        spr: 'bucketSplash',
        frame: 0,
        speed: 1 / 3,
        x: game.kris.x - 20 + (Math.random() * 80 - 40),
        y: e.floodY,
        vx: 0,
        vy: 0,
      });
    }
    const prev = endlessBest(game);
    e.finalBest = e.height > prev;
    if (e.finalBest) {
      game.saveData.best.endless = e.height;
      persist(game);
    }
  }
}

export function stepEndResults(game) {
  if (game.pressed.jump) {
    play(game, 'menumove', 0.8, 1.2);
    startEndless(game);
  } else if (game.pressed.cancel || game.pressed.menu) {
    play(game, 'menumove', 0.8, 0.8);
    game.raceMusic.stop();
    startMusic(game);
    game.endless = null;
    game.phase = 'menu';
  }
}

export function drawFlood(game) {
  if (!game.endless) return;
  const s = game.sprites.watertile;
  const fy = game.endless.floodY;
  const viewBot = game.camY + VIEW_H;
  if (fy > viewBot + 20) return;
  const colindex = Math.floor(game.siner / 3) % 4;
  game.ctx.save();
  game.ctx.globalCompositeOperation = 'lighter';
  game.ctx.globalAlpha = Math.max(
    0,
    Math.min(0.8, 0.62 + Math.sin(game.siner / 6) * 0.12),
  );
  game.ctx.fillStyle = WATER_COLS[colindex];
  const bodyTop = Math.max(fy, game.camY - 8);
  if (viewBot - bodyTop > 0)
    game.ctx.fillRect(0, bodyTop, VIEW_W, viewBot - bodyTop + 8);
  if (fy > game.camY - 20)
    for (let x = 0; x < VIEW_W; x += 40)
      game.ctx.drawImage(s.img, colindex * 20, 0, 20, 8, x, fy - 16, 40, 16);
  game.ctx.restore();
}

export function drawEndResults(game) {
  drawGame(game);
  game.ctx.fillStyle = 'rgba(0,0,0,0.35)';
  game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawDarkBox(game.ctx, game.sprites, 110, 90, 530, 390, game.siner);
  pixelText(game, 'THE FLOOD', VIEW_W / 2, 145, 24, 'rgb(250,219,2)', 'center');
  const row = (label, value, y, col) => {
    pixelText(game, label, 170, y, 18, '#fff');
    pixelText(game, value, 470, y, 18, col || '#fff', 'right');
  };
  row('HEIGHT', `${game.endless ? game.endless.height : 0}m`, 210);
  if (game.endless && game.endless.finalBest)
    pixelText(game, 'NEW BEST!', 470, 227, 12, 'rgb(250,219,2)', 'right');
  row('BEST', `${endlessBest(game)}m`, 260, '#9f9fc9');
  pixelText(
    game,
    '[Z] CLIMB AGAIN   [X] MENU',
    VIEW_W / 2,
    355,
    13,
    '#9f9fc9',
    'center',
  );
}
