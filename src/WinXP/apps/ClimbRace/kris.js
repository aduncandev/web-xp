// Kris on the wall: the climb state machine (neutral, charge, step, slip,
// fall, grab) and how each state draws.
import {
  DIRS,
  DIR_ORDER,
  TILE,
  cellKey,
  easeInOut,
  easeOut,
} from './constants';
import {
  cancelRun,
  climbableAt,
  endRunAndDrop,
  play,
  resetToGround,
} from './run';
import { drawSprite } from './draw';

export function mountAt(game, cell) {
  game.kris = {
    x: cell.c * TILE + 20,
    y: cell.r * TILE + 20,
    state: 'neutral',
    dir: 'up',
    lastTile: {
      ...cell,
    },
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
    buffers: {
      up: 0,
      down: 0,
      left: 0,
      right: 0,
      jump: 0,
    },
    arc: 0,
  };
}

export function cancelCharge(game) {
  game.mixer.stopCharge();
  play(game, 'txttor', 0.5, 0.4);
  play(game, 'txtal', 0.5, 0.4);
  play(game, 'passing', 0.2, 1.8);
  game.kris.state = 'neutral';
  game.kris.chargeAmt = 0;
  game.kris.relockT = 10;
}

export function reachableTiles(game, dir, amount) {
  const d = DIRS[dir];
  let found = 0;
  for (let i = 1; i <= amount; i++) {
    if (
      climbableAt(
        game,
        game.kris.lastTile.c + d.dx * i,
        game.kris.lastTile.r + d.dy * i,
      )
    )
      found = i;
  }
  return found;
}

export function onCellSettled(game) {
  const k = cellKey(game.kris.lastTile.c, game.kris.lastTile.r);
  const brit = game.L.brittleMap.get(k);
  if (brit && brit.con === 0) {
    brit.con = 1;
    brit.timer = 0;
  }
}

export function breakBrittle(game, brit, k) {
  brit.con = 2;
  game.brokenCells.add(k);
  play(game, 'heavyswing', 0.7);
  game.fallingTiles.push({
    x: brit.c * TILE,
    y: brit.r * TILE,
    t: 0,
    v: 0,
  });
}

export function tryStep(game, dir, fromJump) {
  const d = DIRS[dir];
  const reach = fromJump ? game.kris.chargeAmt : 1;
  for (let i = reach; i >= 1; i--) {
    const c = game.kris.lastTile.c + d.dx * i;
    const r = game.kris.lastTile.r + d.dy * i;
    if (climbableAt(game, c, r)) {
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
      game.kris.jumping = fromJump;
      game.kris.stepRate = fromJump ? 6 + game.kris.chargeAmt * 2 : 10;
      game.kris.state = 'step';
      game.kris.climbIndex = game.kris.climbIndex === 0 ? 2 : 0;
      game.kris.dir = dir;
      play(game, 'wing', 0.6, 1.1 + Math.random() * 0.1);
      const dustN = fromJump ? 5 : 1;
      for (let k = 0; k < dustN; k++) {
        game.anims.push({
          spr: 'dustSmall',
          frame: 0,
          speed: 0.5,
          x: game.kris.x + (fromJump ? Math.random() * 40 - 20 : 0),
          y: game.kris.y + (fromJump ? Math.random() * 40 - 20 : 10),
          vx: 0,
          vy: -2,
        });
      }
      return true;
    }
  }
  if (
    dir === 'down' &&
    !fromJump &&
    game.kris.y >= game.L.mountStarter.y - TILE
  ) {
    beginDismount(game);
    return false;
  }
  game.kris.state = 'slip';
  game.kris.slipT = fromJump
    ? 8 + game.kris.chargeAmt * 3
    : 8 + game.kris.momentum * 4;
  game.kris.slipDir = dir === 'right' ? 'right' : 'left';
  game.kris.bumped = dir;
  game.kris.momentum = 0;
  game.kris.jumping = false;
  game.kris.chargeAmt = 0;
  play(game, 'bump', 0.6);
  return false;
}

export function beginDismount(game) {
  game.mixer.stopCharge();
  cancelRun(game);
  game.kris.state = 'fall';
  game.kris.fallV = 0;
  game.kris.fallT = 0;
  game.kris.noGrab = true;
  game.kris.grabDelay = 10;
  play(game, 'fall', 0.5, 1.1);
}

export function stepKris(game) {
  const b = game.kris.buffers;
  Object.keys(b).forEach(k => {
    if (b[k] > 0) b[k] -= 1;
  });
  if (game.kris.relockT > 0) game.kris.relockT -= 1;
  if (game.kris.hurtT > 0) game.kris.hurtT -= 1;
  game.kris.momentum = Math.max(0, game.kris.momentum - 0.03);
  Object.keys(DIRS).forEach(d => {
    if (game.held[d])
      b[d] = Math.max(b[d], Math.min(4, Math.ceil(5 - game.kris.momentum * 2)));
  });
  const wantDir =
    DIR_ORDER.find(d => b[d] > 0 && game.held[d]) ||
    DIR_ORDER.find(d => b[d] > 0);
  switch (game.kris.state) {
    case 'neutral': {
      if ((b.jump > 0 || game.held.jump) && game.kris.relockT <= 0) {
        game.kris.state = 'charge';
        game.kris.chargeAmt = 1;
        game.kris.chargeT = 0;
        game.kris.momentum = 0;
        game.mixer.startCharge();
        if (wantDir) game.kris.dir = wantDir;
        break;
      }
      if (wantDir) tryStep(game, wantDir, false);
      else game.kris.momentum *= 0.5;
      break;
    }
    case 'charge': {
      if (wantDir) game.kris.dir = wantDir;
      if (game.held.jump) {
        game.kris.chargeT += 1;
        if (game.kris.chargeT === 10) {
          game.kris.chargeAmt = 2;
          game.mixer.chargePitch(0.5);
        }
        if (game.kris.chargeT === 22) {
          game.kris.chargeAmt = 3;
          game.mixer.chargePitch(0.7);
        }
        if (game.kris.chargeAmt === 3 && game.kris.chargeT % 8 === 0) {
          game.ghosts.push({
            spr: chargeSprite(game),
            frame: game.kris.chargeAmt - 1,
            x: game.kris.x,
            y: game.kris.y,
            alpha: 0.3,
          });
        }
      } else {
        game.mixer.stopCharge();
        const dir = wantDir || game.kris.dir;
        game.kris.state = 'neutral';
        tryStep(game, dir, true);
      }
      break;
    }
    case 'step': {
      const speed = game.kris.jumping ? 1 : 1 + game.kris.momentum;
      game.kris.stepT += speed;
      const rate = game.kris.stepRate;
      if (game.kris.jumping) {
        const clip = game.kris.chargeAmt >= 2 ? 2 : 4;
        if (game.kris.stepT >= rate - clip) game.kris.stepT = rate;
        game.ghosts.push({
          spr: jumpSprite(game),
          frame: 0,
          x: game.kris.x,
          y: game.kris.y + game.kris.arc,
          alpha: 0.2,
        });
      }
      if (game.kris.stepT >= rate) game.kris.stepT = rate;
      const t = game.kris.stepT / rate;
      const e = game.kris.jumping ? easeOut(t) : easeInOut(t);
      game.kris.x =
        game.kris.stepFrom.x + (game.kris.stepTo.x - game.kris.stepFrom.x) * e;
      game.kris.y =
        game.kris.stepFrom.y + (game.kris.stepTo.y - game.kris.stepFrom.y) * e;
      game.kris.arc = game.kris.jumping
        ? -Math.sin(t * Math.PI) * 4 * (game.kris.chargeAmt - 1)
        : 0;
      if (game.kris.stepT >= rate) {
        game.kris.x = game.kris.stepTo.x;
        game.kris.y = game.kris.stepTo.y;
        game.kris.arc = 0;
        if (game.kris.jumping) game.kris.momentum = game.kris.chargeAmt / 2;
        game.kris.jumping = false;
        game.kris.chargeAmt = 0;
        game.kris.state = 'neutral';
        game.kris.bumped = null;
        onCellSettled(game);
      }
      break;
    }
    case 'slip': {
      game.kris.slipT -= 1;
      if (game.kris.slipT <= 0) game.kris.state = 'neutral';
      break;
    }
    case 'fall': {
      if (game.kris.y + 20 >= game.L.landing.y) {
        if (game.running) endRunAndDrop(game);
        else cancelRun(game);
        play(game, 'noise', 0.6);
        resetToGround(
          game,
          Math.max(
            game.L.landing.x + 20,
            Math.min(game.L.landing.x + game.L.landing.w - 20, game.kris.x),
          ),
          'bottom',
          game.L.landing.y + 20,
        );
        break;
      }
      game.kris.fallT += 1;
      game.kris.fallV = Math.min(20, game.kris.fallV + 0.5);
      game.kris.y += Math.ceil(game.kris.fallV);
      if (game.kris.fallT > (game.kris.grabDelay || 10) && !game.kris.noGrab) {
        const c = Math.round((game.kris.x - 20) / TILE);
        const r = Math.round((game.kris.y - 20) / TILE);
        if (climbableAt(game, c, r)) {
          game.kris.state = 'grab';
          game.kris.grab = {
            x: c * TILE + 20,
            y: r * TILE + 20,
            phase: 'scrape',
            v: Math.min(game.kris.fallV, 7),
            t: 0,
          };
          game.kris.lastTile = {
            c,
            r,
          };
          play(game, 'wing', 0.7, 0.6 + Math.random() * 0.3);
        }
      }
      break;
    }
    case 'grab': {
      const g = game.kris.grab;
      if (g.phase === 'scrape') {
        if (game.siner % 2 === 0)
          game.anims.push({
            spr: 'slidedust',
            frame: 0,
            speed: 0.5,
            x: game.kris.x,
            y: game.kris.y,
            vx: Math.random() * 2 - 1,
            vy: -3,
          });
        g.v -= 1;
        if (g.v > 0) game.kris.y += g.v;
        if (g.v <= 0) {
          g.phase = 'pull';
          g.fx = game.kris.x;
          g.fy = game.kris.y;
          g.t = 0;
        }
      } else {
        g.t += 1;
        if (g.t >= 7) {
          const t = Math.min(1, (g.t - 7) / 8);
          game.kris.x = g.fx + (g.x - g.fx) * easeInOut(t);
          game.kris.y = g.fy + (g.y - g.fy) * easeInOut(t);
          if (t >= 1) {
            game.kris.x = g.x;
            game.kris.y = g.y;
            game.kris.state = 'neutral';
            onCellSettled(game);
          }
        }
      }
      break;
    }
    default:
      break;
  }
}

export function chargeSprite(game) {
  if (game.kris.dir === 'right') return 'krisChargeR';
  if (game.kris.dir === 'left') return 'krisChargeL';
  return 'krisCharge';
}

export function jumpSprite(game) {
  if (game.kris.dir === 'right') return 'krisJumpR';
  if (game.kris.dir === 'left') return 'krisJumpL';
  return 'krisJumpUp';
}

export function drawReticle(game) {
  if (game.kris.state !== 'charge') return;
  const found = reachableTiles(game, game.kris.dir, game.kris.chargeAmt);
  const alph = Math.max(0.1, Math.min(0.8, game.kris.chargeT / 14));
  const hint = found ? game.tinted.hintWarm : game.tinted.hintGray;
  const grow = Math.min(1, game.kris.chargeT / 22);
  const conf = {
    down: [-22, 18, 0],
    right: [18, 22, 90],
    up: [22, -18, 180],
    left: [-18, -22, 270],
  }[game.kris.dir];
  game.ctx.save();
  game.ctx.translate(game.kris.x + conf[0], game.kris.y + conf[1]);
  game.ctx.rotate((-conf[2] * Math.PI) / 180);
  game.ctx.globalAlpha = 0.85 * alph;
  const hFrame = Math.floor(game.siner / 2) % 4;
  const hh = Math.max(4, Math.round(62 * grow));
  game.ctx.drawImage(hint, hFrame * 22, 0, 22, hh, 0, 0, 44, hh * 2);
  game.ctx.restore();
  if (found) {
    const d = DIRS[game.kris.dir];
    const tc = game.kris.lastTile.c + d.dx * found;
    const tr = game.kris.lastTile.r + d.dy * found;
    const pulse = 0.5 + Math.sin(game.kris.chargeT / 3) * 0.5;
    game.ctx.save();
    game.ctx.globalAlpha = alph;
    game.ctx.drawImage(
      game.tinted.retYellow,
      tc * TILE - 4,
      tr * TILE - 4,
      48,
      48,
    );
    game.ctx.globalAlpha = alph * pulse;
    game.ctx.drawImage(
      game.tinted.retWhite,
      tc * TILE - 4,
      tr * TILE - 4,
      48,
      48,
    );
    game.ctx.restore();
  }
}

export function drawKris(game) {
  drawReticle(game);
  const y = game.kris.y + (game.kris.arc || 0);
  if (game.kris.hurtT > 0 && game.kris.hurtT % 4 < 2)
    game.ctx.globalAlpha = 0.4;
  switch (game.kris.state) {
    case 'charge': {
      const name = chargeSprite(game);
      drawSprite(game, name, game.kris.chargeAmt - 1, game.kris.x, y);
      if (game.kris.chargeAmt >= 2) {
        const pulse =
          game.kris.chargeAmt === 3
            ? 0.25 + 0.2 * Math.abs(Math.sin(game.kris.chargeT / 2))
            : 0.15;
        drawSprite(game, name, game.kris.chargeAmt - 1, game.kris.x, y, {
          img: game.chargeTint[name],
          alpha: pulse,
          blend: 'lighter',
        });
      }
      break;
    }
    case 'step': {
      if (game.kris.jumping) {
        const t = game.kris.stepT / game.kris.stepRate;
        if (game.kris.dir === 'up' || game.kris.dir === 'down')
          drawSprite(game, 'krisJumpUp', Math.floor(t * 3), game.kris.x, y);
        else if (game.kris.dir === 'right')
          drawSprite(
            game,
            t > 0.5 ? 'krisLandR' : 'krisSlipR',
            t > 0.5 ? 1 : 0,
            game.kris.x,
            y,
          );
        else
          drawSprite(
            game,
            t > 0.5 ? 'krisLandL' : 'krisSlipL',
            t > 0.5 ? 1 : 0,
            game.kris.x,
            y,
          );
      } else {
        const moving =
          game.kris.stepT > 2 && game.kris.stepT < game.kris.stepRate - 1;
        drawSprite(
          game,
          'krisClimb',
          game.kris.climbIndex + (moving ? 1 : 0),
          game.kris.x,
          y,
        );
      }
      break;
    }
    case 'slip':
      drawSprite(
        game,
        game.kris.slipDir === 'right' ? 'krisSlipR' : 'krisSlipL',
        game.kris.slipT >= 3 ? 1 : 0,
        game.kris.x,
        y,
      );
      break;
    case 'fall':
      drawSprite(
        game,
        'krisFall',
        Math.floor(game.siner / 4) % 3,
        game.kris.x,
        y,
      );
      break;
    case 'grab':
      drawSprite(game, 'krisCharge', 2, game.kris.x, y);
      break;
    default:
      drawSprite(game, 'krisClimb', game.kris.climbIndex, game.kris.x, y);
  }
  game.ctx.globalAlpha = 1;
}
