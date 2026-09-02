// What the wall does to Kris: brittle cells, bells, coins, the water
// streams, the glow, and the particle effects.
import {
  EMBER_HOLD,
  FULLTIME,
  MOVE_RATE,
  STREAM_TILES,
  TILE,
  VIEW_H,
  VIEW_W,
  WATER_COLS,
  WATER_GRAB_DELAY,
  easeOutQuart,
  lerp,
} from './constants';
import { breakBrittle } from './kris';
import { play } from './run';
import { drawSprite, pixelText } from './draw';

export function stepHazards(game) {
  game.L.brittleMap.forEach((brit, k) => {
    if (brit.con !== 1 || game.brokenCells.has(k)) return;
    const onIt =
      game.kris &&
      game.kris.lastTile.c === brit.c &&
      game.kris.lastTile.r === brit.r &&
      game.kris.state !== 'fall' &&
      game.kris.state !== 'grab';
    if (onIt) brit.timer += 1;
    const limit = brit.dangerous ? 1 : EMBER_HOLD;
    if (brit.timer >= limit) {
      breakBrittle(game, brit, k);
      if (
        onIt &&
        (game.kris.state === 'neutral' || game.kris.state === 'charge')
      ) {
        game.mixer.stopCharge();
        game.kris.chargeAmt = 0;
        game.kris.state = 'fall';
        game.kris.fallV = 0;
        game.kris.fallT = 0;
        game.kris.noGrab = false;
        game.kris.grabDelay = 10;
      }
    }
  });
  for (const g of game.L.appearGroups) {
    if (!g.bell) continue;
    if (!g.rung && game.kris) {
      if (
        Math.abs(game.kris.x - g.bell.x) < 44 &&
        game.kris.y > g.bell.y &&
        game.kris.y < g.bell.y + 84
      ) {
        g.rung = true;
        g.ringT = 24;
        play(game, 'playablebell', 0.9);
        g.on = true;
        g.cells.forEach(k => game.hiddenCells.delete(k));
        play(game, 'ghost', 0.5, 1.8);
      }
    }
    if (g.ringT > 0) g.ringT -= 1;
    if (g.on && g.alpha < 1) g.alpha = Math.min(1, g.alpha + 0.08);
  }
}

export function coinHidden(game, cn) {
  return cn.hiddenBy != null && !game.L.appearGroups[cn.hiddenBy].on;
}

export function stepCoins(game) {
  if (!game.kris) return;
  for (const cn of game.L.coins) {
    if (cn.taken || coinHidden(game, cn)) continue;
    if (
      Math.abs(game.kris.x - cn.x) < 32 &&
      Math.abs(game.kris.y - cn.y) < 44
    ) {
      cn.taken = true;
      game.coinsTaken += 1;
      play(game, 'coin', 0.8);
      if (game.coinMarker && game.coinMarker.t < 30) {
        game.coinMarker.value += 1;
        game.coinMarker.t = 0;
        game.coinMarker.x = cn.x;
        game.coinMarker.y = cn.y - 16;
        game.coinMarker.v = -4;
      } else {
        game.coinMarker = {
          x: cn.x,
          y: cn.y - 16,
          v: -4,
          value: 1,
          t: 0,
        };
      }
    }
  }
  if (game.coinMarker) {
    game.coinMarker.t += 1;
    game.coinMarker.y += game.coinMarker.v;
    game.coinMarker.v = Math.min(0, game.coinMarker.v + 0.25);
    if (game.coinMarker.t > 30) game.coinMarker = null;
  }
}

export function stepWater(game) {
  if (game.running) {
    const timber = FULLTIME - game.elapsed;
    for (const g of game.L.generators) {
      const t = timber + g.waitoff;
      if (t !== 0 && timber !== FULLTIME && t % g.waittime === 0) {
        game.streams.push({
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
  game.streams = game.streams.filter(s => {
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
        game.anims.push({
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
      game.kris &&
      game.mode === 'wall' &&
      (game.kris.state === 'neutral' || game.kris.state === 'charge')
    ) {
      const topy = Math.max(gy, Math.min(s.y + drawy, endY));
      const boty = Math.max(gy, Math.min(rawBot, endY));
      if (
        boty - topy > 36 &&
        Math.abs(game.kris.x - (s.g.x + 20)) < 12 &&
        game.kris.y > topy - 20 &&
        game.kris.y < boty + 30
      ) {
        s.triggered = true;
        game.mixer.stopCharge();
        game.kris.chargeAmt = 0;
        game.kris.jumping = false;
        game.kris.arc = 0;
        game.kris.state = 'fall';
        game.kris.fallV = 0;
        game.kris.fallT = 0;
        game.kris.noGrab = false;
        game.kris.grabDelay = WATER_GRAB_DELAY;
        play(game, 'splash', 0.9);
        setTimeout(() => play(game, 'splash', 0.6, 0.75), 600);
      }
    }
    return true;
  });
}

export function stepFx(game) {
  game.anims = game.anims.filter(a => {
    a.frame += a.speed;
    a.x += a.vx;
    a.y += a.vy;
    return (
      a.frame <
      (game.sprites && game.sprites[a.spr] ? game.sprites[a.spr].frames : 5)
    );
  });
  game.ghosts = game.ghosts.filter(g => {
    g.alpha -= 0.05;
    return g.alpha > 0;
  });
  game.confetti = game.confetti.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25;
    p.life -= 1;
    return p.life > 0;
  });
  game.fallingTiles = game.fallingTiles.filter(ft => {
    ft.t += 1;
    ft.v += 1;
    ft.y += ft.v;
    return ft.t < 30;
  });
}

export function glowColor(game) {
  const remaining = game.running ? FULLTIME - game.elapsed : FULLTIME;
  const ind = easeOutQuart(Math.max(0, Math.min(1, remaining / 250)));
  return [
    Math.round(lerp(255, 0x4e, ind)),
    Math.round(lerp(0, 0x4e, ind)),
    Math.round(lerp(0, 0x73, ind)),
  ];
}

export function drawGlow(game) {
  const s = game.sprites.ethereal;
  const [rr, gg, bb] = glowColor(game);
  game.ctx.save();
  game.ctx.globalCompositeOperation = 'lighter';
  const tint = game.tinted.glow(rr, gg, bb);
  const cellVisible = (bx, by) =>
    bx + TILE >= game.camX - 40 &&
    bx <= game.camX + VIEW_W + 40 &&
    by + TILE >= game.camY - 40 &&
    by <= game.camY + VIEW_H + 40;
  const drawCell = (bx, by, i, j, alphaMul, base, tc = tint) => {
    const amt = Math.abs(Math.sin((game.siner - j * 60) / 40)) + 0.5;
    const wob = Math.sin((game.siner + i * 40) / 5) * 2;
    const wob2 = Math.cos((game.siner + j * 40) / 5) * 2;
    game.ctx.globalAlpha = Math.min(1, base * amt * 0.125 * alphaMul);
    game.ctx.drawImage(tc, 0, 0, s.w, s.h, bx + wob, by + wob2, 40, 40);
    game.ctx.drawImage(tc, 0, 0, s.w, s.h, bx - wob2, by - wob, 40, 40);
    game.ctx.globalAlpha = Math.min(1, base * amt * alphaMul);
    game.ctx.drawImage(tc, 0, 0, s.w, s.h, bx, by, 40, 40);
  };
  const emberTint = game.tinted.glow(226, 150, 60);
  const dangerTint = game.tinted.glow(232, 88, 48);
  if (game.glowAlpha >= 0.01) {
    if (game.L.kind === 'church') {
      for (const rect of game.L.glowRects) {
        if (
          rect.x + rect.w < game.camX - 40 ||
          rect.x > game.camX + VIEW_W + 40
        )
          continue;
        if (
          rect.y + rect.h < game.camY - 40 ||
          rect.y > game.camY + VIEW_H + 40
        )
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
              game.glowAlpha,
            );
      }
    } else {
      for (const cell of game.L.glowCellList) {
        if (game.brokenCells.has(cell.k)) continue;
        if (!cellVisible(cell.x, cell.y)) continue;
        let alphaMul = 1;
        if (game.hiddenCells.has(cell.k)) continue;
        const grp = game.cellAppearGroup.get(cell.k);
        if (grp) alphaMul = grp.alpha;
        let tc = tint;
        let jx = 0;
        const brit = game.L.brittleMap.get(cell.k);
        if (brit) {
          tc = brit.dangerous ? dangerTint : emberTint;
          if (brit.con === 1 && brit.timer > 0 && !brit.dangerous) {
            jx =
              Math.sin(game.siner * 1.7 + cell.c) *
              (0.5 + 2.5 * Math.min(1, brit.timer / EMBER_HOLD));
          }
        }
        drawCell(
          cell.x + jx,
          cell.y,
          cell.c,
          cell.r,
          alphaMul,
          game.glowAlpha,
          tc,
        );
      }
    }
  }
  for (const ft of game.fallingTiles) {
    const fade = 1 - ft.t / 30;
    const wob = Math.sin((game.siner + ft.t) / 2) * 2 + ft.t / 3;
    game.ctx.globalAlpha = Math.min(1, Math.max(0, fade));
    game.ctx.drawImage(emberTint, 0, 0, s.w, s.h, ft.x + wob, ft.y, 40, 40);
    game.ctx.drawImage(emberTint, 0, 0, s.w, s.h, ft.x - wob, ft.y, 40, 40);
  }
  game.ctx.restore();
}

export function drawCoins(game) {
  for (const cn of game.L.coins) {
    if (cn.taken || coinHidden(game, cn)) continue;
    drawSprite(game, 'coin', Math.floor(game.siner / 2) % 4, cn.x, cn.y);
  }
  if (game.coinMarker) {
    pixelText(
      game,
      `+${game.coinMarker.value}$`,
      game.coinMarker.x,
      game.coinMarker.y,
      20,
      'rgb(255,213,0)',
      'center',
      game.coinMarker.t > 20 ? 1 - (game.coinMarker.t - 20) / 10 : 1,
    );
  }
}

export function drawWater(game) {
  if (!game.streams.length) return;
  const s = game.sprites.watertile;
  game.ctx.save();
  game.ctx.globalCompositeOperation = 'lighter';
  for (const st of game.streams) {
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
    game.ctx.globalAlpha = alph;
    game.ctx.drawImage(s.img, colindex * 20, 0, 20, 8, gx, topy - 16, 40, 16);
    game.ctx.fillStyle = WATER_COLS[colindex];
    const bodyH = boty - topy + offset;
    if (bodyH > 0) game.ctx.fillRect(gx, topy, 40, bodyH);
    if (!st.ending) {
      game.ctx.save();
      game.ctx.translate(gx, boty + 8);
      game.ctx.scale(1, -1);
      game.ctx.drawImage(s.img, colindex * 20, 0, 20, 8, 0, 0, 40, 16);
      game.ctx.restore();
    }
  }
  game.ctx.restore();
}
