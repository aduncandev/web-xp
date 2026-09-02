// One attempt on the wall: loading a level, the timer and the switch, and
// `tick`, the game step that hands off to everything else.
import {
  FULLTIME,
  TILE,
  VIEW_H,
  VIEW_W,
  cellKey,
  easeInOut,
  inRect,
  lerp,
} from './constants';
import { buildBackdrop } from './backdrop';
import { persist, saveBest } from './save';
import { stepCode, stepMenu, stepResults } from './menu';
import { clearPressed } from './input';
import { stepCountdown, stepEndResults, stepEndless } from './endless';
import { stepSecret } from './secret';
import { stepBoard } from './board';
import { stepCoins, stepFx, stepHazards, stepWater } from './hazards';
import { stepDialog } from './dialog';
import { stepWalker } from './walker';
import { mountAt, stepKris } from './kris';

export function play(game, n, g, r) {
  return game.mixer.play(n, g, r);
}

export function climbableAt(game, c, r) {
  const k = cellKey(c, r);
  if (game.L.alwaysCells.has(k)) return true;
  if (!(game.running || game.mode === 'finish')) return false;
  if (!game.L.glowCells.has(k)) return false;
  if (game.hiddenCells.has(k) || game.brokenCells.has(k)) return false;
  return true;
}

export function resetWallState(game) {
  game.brokenCells.clear();
  game.fallingTiles = [];
  game.L.brittleMap.forEach(b => {
    b.con = 0;
    b.timer = 0;
  });
  game.hiddenCells.clear();
  game.cellAppearGroup.clear();
  game.L.appearGroups.forEach(g => {
    g.on = false;
    g.alpha = 0;
    g.rung = false;
    g.ringT = 0;
    g.cells.forEach(k => {
      game.hiddenCells.add(k);
      game.cellAppearGroup.set(k, g);
    });
  });
  game.L.coins.forEach(cn => {
    cn.taken = false;
  });
  game.coinsTaken = 0;
  game.coinMarker = null;
}

export function resetToGround(game, x, whichZone, y) {
  game.mode = 'ground';
  game.kris = null;
  game.zone = whichZone || 'bottom';
  const z = game.L.zones[game.zone];
  game.walker = {
    x: Math.max(z.xMin, Math.min(z.xMax, x != null ? x : game.L.spawn.x)),
    y: Math.max(z.yMin, Math.min(z.yMax, y != null ? y : z.floorY)),
    dir: 'right',
    animT: 0,
    moving: false,
    runT: 0,
  };
}

export function loadLevel(game, level) {
  game.L = level;
  game.running = false;
  game.elapsed = 0;
  game.thisTime = -1;
  game.glowAlpha = 0;
  game.glowTarget = 0;
  game.switchLit = false;
  game.holdExitT = 0;
  game.finishT = 0;
  game.streams = [];
  game.anims = [];
  game.ghosts = [];
  game.confetti = [];
  game.dialog = null;
  game.results = null;
  game.newBest = false;
  game.board.x = 40;
  game.board.y = game.L.h;
  game.board.siner = 0;
  resetWallState(game);
  resetToGround(game);
  game.camX = clampCamX(game, game.L.spawn.x - VIEW_W / 2);
  game.camY = clampCamY(game, game.L.spawn.y - VIEW_H / 2 - 80);
  game.backdrop =
    game.L.kind === 'church'
      ? game.bake
      : game.L.kind === 'endless'
      ? null
      : buildBackdrop(game, game.L);
  game.phase = 'game';
}

export function cancelRun(game) {
  game.running = false;
  game.glowTarget = 0;
  game.switchLit = false;
}

export function endRunAndDrop(game) {
  cancelRun(game);
  play(game, 'ghost', 0.7, 0.9);
  play(game, 'ghost', 0.7, 1.3);
  if (
    game.kris &&
    !game.L.alwaysCells.has(cellKey(game.kris.lastTile.c, game.kris.lastTile.r))
  ) {
    game.mixer.stopCharge();
    game.kris.state = 'fall';
    game.kris.fallV = 0;
    game.kris.fallT = 0;
    game.kris.noGrab = true;
    game.kris.grabDelay = 10;
    play(game, 'fall', 0.5, 1.1);
  }
}

export function startRun(game) {
  game.running = true;
  game.elapsed = 0;
  game.thisTime = -1;
  game.newBest = false;
  game.glowTarget = 1;
  game.switchLit = true;
  resetWallState(game);
  play(game, 'ghost', 0.7, 1.4);
  play(game, 'ghost', 0.7, 1.6);
}

export function finishRun(game) {
  game.running = false;
  game.thisTime = game.elapsed;
  game.newBest = saveBest(game, Math.floor(game.elapsed / 3));
  game.switchLit = false;
  game.mode = 'finish';
  game.finishT = 0;
  game.mixer.stopCharge();
  if (game.kris) {
    if (game.kris.state === 'step' && game.kris.stepTo) {
      game.kris.x = game.kris.stepTo.x;
      game.kris.y = game.kris.stepTo.y;
    }
    game.kris.state = 'neutral';
    game.kris.arc = 0;
    game.kris.chargeAmt = 0;
  }
  play(game, 'victory', 0.9);
  if (game.L.kind === 'generated') {
    const bonus =
      game.elapsed <= game.L.par
        ? 10
        : Math.max(
            0,
            Math.min(
              10,
              Math.round(
                (10 * (2.4 * game.L.par - game.elapsed)) / (1.4 * game.L.par),
              ),
            ),
          );
    const xp = game.coinsTaken + bonus;
    const prev = game.saveData.paid[game.L.seed] || 0;
    const award = Math.max(0, xp - prev);
    if (award > 0) {
      game.saveData.paid[game.L.seed] = xp;
      persist(game);
      game.awardPoints(award);
    }
    game.results = {
      tenths: Math.floor(game.elapsed / 3),
      coins: game.coinsTaken,
      bonus,
      xp,
      award,
    };
  }
  for (let i = 0; i < 16; i++) {
    const ang = Math.random() * Math.PI - Math.PI;
    const sp = 3 + Math.random() * 4;
    game.confetti.push({
      x: game.board.x + 42,
      y: game.board.y + 16,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 2,
      col: ['#ff5a5a', '#ffd93c', '#7cff6b', '#6bc7ff', '#ff8bde', '#fff'][
        i % 6
      ],
      life: 40 + Math.random() * 25,
    });
  }
}

export function startMusic(game) {
  game.music.start();
}

export function stopMusic(game) {
  game.music.stop();
}

export function tick(game) {
  game.siner += 1;
  if (game.phase === 'menu') {
    stepMenu(game);
    clearPressed(game);
    return;
  }
  if (game.phase === 'codeentry') {
    stepCode(game);
    clearPressed(game);
    return;
  }
  if (game.phase === 'results') {
    stepResults(game);
    clearPressed(game);
    return;
  }
  if (game.phase === 'endresults') {
    stepEndResults(game);
    clearPressed(game);
    return;
  }
  if (game.phase === 'secret') {
    stepSecret(game);
    clearPressed(game);
    return;
  }
  if (game.pressed.menu) {
    if (game.dialog) {
      game.dialog = null;
      clearPressed(game);
      return;
    }
    game.mixer.stopCharge();
    if (game.endless) {
      game.raceMusic.stop();
      startMusic(game);
      game.endless = null;
    }
    game.phase = 'menu';
    clearPressed(game);
    return;
  }
  game.glowAlpha = lerp(game.glowAlpha, game.glowTarget, 0.12);
  stepBoard(game);
  stepFx(game);
  stepWater(game);
  if (game.mode === 'ground') {
    if (game.dialog) {
      stepDialog(game);
      clearPressed(game);
      return;
    }
    stepWalker(game);
    clearPressed(game);
    return;
  }
  if (game.mode === 'mount') {
    game.mount.t += 1;
    const t = Math.min(1, game.mount.t / 22);
    game.walker.x = lerp(game.mount.fx, game.mount.tx, t);
    game.walker.y =
      lerp(game.mount.fy, game.mount.ty, t) - Math.sin(t * Math.PI) * 56;
    if (t >= 1) {
      play(game, 'noise', 0.6);
      if (game.mount.dismount) {
        game.walker.y = game.mount.ty;
        game.mode = 'ground';
        if (game.results) game.phase = 'results';
        else if (game.L.kind === 'church' && game.thisTime !== -1) {
          loadLevel(game, game.L);
        }
      } else {
        mountAt(game, game.mount.cell);
        game.mode = 'wall';
      }
    }
    clearPressed(game);
    return;
  }
  if (game.mode === 'finish') {
    game.finishT += 1;
    if (game.kris) {
      if (game.kris.state === 'step') {
        game.kris.stepT += 1;
        if (game.kris.stepT > game.kris.stepRate)
          game.kris.stepT = game.kris.stepRate;
        const t = game.kris.stepT / game.kris.stepRate;
        const e = easeInOut(t);
        game.kris.x =
          game.kris.stepFrom.x +
          (game.kris.stepTo.x - game.kris.stepFrom.x) * e;
        game.kris.y =
          game.kris.stepFrom.y +
          (game.kris.stepTo.y - game.kris.stepFrom.y) * e;
        if (game.kris.stepT >= game.kris.stepRate) {
          game.kris.x = game.kris.stepTo.x;
          game.kris.y = game.kris.stepTo.y;
          game.kris.state = 'neutral';
        }
        game.finishT = 0;
      } else if (
        climbableAt(game, game.kris.lastTile.c, game.kris.lastTile.r - 1)
      ) {
        const c = game.kris.lastTile.c;
        const r = game.kris.lastTile.r - 1;
        game.kris.stepFrom = {
          x: game.kris.x,
          y: game.kris.y,
        };
        game.kris.stepTo = {
          x: c * TILE + 20,
          y: r * TILE + 20,
        };
        game.kris.lastTile = {
          c,
          r,
        };
        game.kris.stepT = 0;
        game.kris.stepRate = 10;
        game.kris.jumping = false;
        game.kris.state = 'step';
        game.kris.climbIndex = game.kris.climbIndex === 0 ? 2 : 0;
        game.kris.dir = 'up';
        play(game, 'wing', 0.6, 1.1 + Math.random() * 0.1);
        game.anims.push({
          spr: 'dustSmall',
          frame: 0,
          speed: 0.5,
          x: game.kris.x,
          y: game.kris.y + 10,
          vx: 0,
          vy: -2,
        });
        game.finishT = 0;
      }
    }
    if (game.finishT >= 2 && game.kris) {
      game.glowTarget = 0;
      play(game, 'jump', 0.6);
      const kx = game.kris.x;
      const ky = game.kris.y;
      resetToGround(game, kx, 'top');
      game.mode = 'mount';
      game.mount = {
        fx: kx,
        fy: ky,
        tx: Math.max(
          game.L.zones.top.xMin,
          Math.min(game.L.zones.top.xMax, kx),
        ),
        ty: game.L.zones.top.floorY,
        t: 0,
        dismount: true,
      };
    }
    clearPressed(game);
    return;
  }
  if (game.L.kind === 'endless' && game.endless && game.endless.cd) {
    stepCountdown(game);
    clearPressed(game);
    return;
  }
  if (game.running) {
    game.elapsed += 1;
    if (
      game.kris.state !== 'fall' &&
      inRect(game.L.startTrig, game.kris.x, game.kris.y)
    ) {
      if (game.elapsed > 2) {
        play(game, 'metalhit', 0.8, 0.85);
        play(game, 'swallow', 0.8, 1.3);
      }
      game.elapsed = 0;
    }
    if (game.elapsed >= FULLTIME && game.L.kind !== 'endless')
      endRunAndDrop(game);
  }
  if (game.running && game.held.cancel && game.kris.state === 'neutral') {
    game.holdExitT += 1;
    if (game.holdExitT >= 30) {
      game.holdExitT = 0;
      if (game.L.kind === 'endless') {
        // letting go here can't end the run: just drop into the water
        game.mixer.stopCharge();
        game.kris.chargeAmt = 0;
        game.kris.state = 'fall';
        game.kris.fallV = 0;
        game.kris.fallT = 0;
        game.kris.noGrab = true;
        game.kris.grabDelay = 10;
        play(game, 'fall', 0.5, 1.1);
      } else {
        endRunAndDrop(game);
      }
      clearPressed(game);
      return;
    }
  } else {
    game.holdExitT = 0;
  }
  if (
    !game.running &&
    game.kris.state === 'neutral' &&
    game.kris.lastTile.r <= Math.floor(game.L.topStarter.y / TILE) &&
    game.held.up
  ) {
    play(game, 'jump', 0.6);
    const kx = game.kris.x;
    const ky = game.kris.y;
    resetToGround(game, kx, 'top');
    game.mode = 'mount';
    game.mount = {
      fx: kx,
      fy: ky,
      tx: Math.max(game.L.zones.top.xMin, Math.min(game.L.zones.top.xMax, kx)),
      ty: game.L.zones.top.floorY,
      t: 0,
      dismount: true,
    };
    clearPressed(game);
    return;
  }
  stepKris(game);
  if (game.kris && game.mode === 'wall') {
    stepHazards(game);
    stepCoins(game);
    if (game.L.kind === 'endless') stepEndless(game);
    if (
      (game.kris.state === 'neutral' ||
        game.kris.state === 'charge' ||
        game.kris.state === 'slip') &&
      !climbableAt(game, game.kris.lastTile.c, game.kris.lastTile.r)
    ) {
      game.mixer.stopCharge();
      game.kris.chargeAmt = 0;
      game.kris.state = 'fall';
      game.kris.fallV = 0;
      game.kris.fallT = 0;
      game.kris.noGrab = false;
      game.kris.grabDelay = 10;
    }
    if (
      !game.running &&
      game.kris.state !== 'fall' &&
      inRect(game.L.startTrig, game.kris.x, game.kris.y)
    )
      startRun(game);
    if (
      game.running &&
      (inRect(game.L.finishTrig, game.kris.x, game.kris.y) ||
        game.kris.lastTile.r <= Math.floor(game.L.topStarter.y / TILE))
    ) {
      finishRun(game);
    }
  }
  clearPressed(game);
}

export function clampCamX(game, v) {
  return Math.max(0, Math.min((game.L ? game.L.w : VIEW_W) - VIEW_W, v));
}

export function clampCamY(game, v) {
  return Math.max(0, Math.min((game.L ? game.L.h : VIEW_H) - VIEW_H, v));
}

export function updateCam(game) {
  if (game.phase === 'menu' || game.phase === 'codeentry' || !game.L) return;
  // the camera stays at the surface while kris sinks
  if (game.L.kind === 'endless' && game.endless && game.endless.over) return;
  const onWall = game.mode === 'wall' || game.mode === 'finish';
  const fx = onWall ? game.kris.x : game.walker.x;
  const fy = onWall ? game.kris.y : game.walker.y;
  const k = onWall ? 0.16 : 0.45;
  game.camX += (clampCamX(game, fx - VIEW_W / 2) - game.camX) * k;
  game.camY += (clampCamY(game, fy - VIEW_H / 2 - 80) - game.camY) * k;
}
