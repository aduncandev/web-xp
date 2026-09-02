// Rendering: sprite blits, the pixel fonts, the composed game frame, and
// `render`, which picks the screen.
import { VIEW_H, VIEW_W } from './constants';
import { drawEndlessBackdrop } from './backdrop';
import { endlessBest, loadBest, seedsCleared } from './save';
import { drawCoins, drawGlow, drawWater } from './hazards';
import { drawCup } from './cup';
import { drawWalker } from './walker';
import { drawKris } from './kris';
import { drawEndResults, drawFlood } from './endless';
import { drawBoard } from './board';
import { drawDialog } from './dialog';
import { drawCode, drawMenu, drawResults } from './menu';
import { drawSecret } from './secretDraw';

export function blit(game, name, frame, x, y, scale = 2, alpha = 1) {
  const s = game.sprites[name];
  if (!s || !s.img.width) return;
  game.ctx.save();
  game.ctx.imageSmoothingEnabled = false;
  game.ctx.globalAlpha = alpha;
  game.ctx.drawImage(
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
  game.ctx.restore();
}

export function fontAtlas(game, font, color) {
  const key = font.name + color;
  if (!game.fontTintCache.has(key)) {
    const c = document.createElement('canvas');
    c.width = font.img.width;
    c.height = font.img.height;
    const g = c.getContext('2d');
    g.drawImage(font.img, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    game.fontTintCache.set(key, c);
  }
  return game.fontTintCache.get(key);
}

export function pixelText(
  game,
  txt,
  x,
  y,
  size,
  color,
  align = 'left',
  alpha = 1,
  face,
) {
  if (!game.fonts) return;
  let font = game.fonts.main;
  let scale = 1;
  if (face === 'main2') {
    scale = 2;
  } else if (size >= 36) {
    font = game.fonts.big;
    scale = 2;
  } else if (size >= 17) {
    font = game.fonts.big;
  }
  const atlas = fontAtlas(game, font, color);
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
  game.ctx.save();
  game.ctx.imageSmoothingEnabled = false;
  game.ctx.globalAlpha = alpha;
  pen = 0;
  for (const ch of txt) {
    const g = font.glyphs.get(ch.charCodeAt(0)) || font.glyphs.get(63);
    if (!g) continue;
    if (g.w > 0 && g.h > 0)
      game.ctx.drawImage(
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
  game.ctx.restore();
}

export function drawSprite(game, name, frame, x, y, o = {}) {
  const s = game.sprites[name];
  if (!s) return;
  const f = Math.max(0, Math.min(s.frames - 1, Math.floor(frame)));
  const scale = o.scale || 2;
  game.ctx.save();
  if (o.alpha != null) game.ctx.globalAlpha = o.alpha;
  if (o.blend) game.ctx.globalCompositeOperation = o.blend;
  game.ctx.drawImage(
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
  game.ctx.restore();
}

export function drawGame(game) {
  const bg = game.L.bg >>> 0;
  game.ctx.fillStyle = `rgb(${(bg >> 16) & 255},${(bg >> 8) & 255},${bg &
    255})`;
  game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  game.ctx.save();
  game.ctx.translate(-Math.round(game.camX), -Math.round(game.camY));
  if (game.backdrop && game.backdrop.width) {
    const sx = Math.max(0, Math.floor(game.camX));
    const sy = Math.max(0, Math.floor(game.camY));
    const sw = Math.min(game.backdrop.width - sx, VIEW_W + 8);
    const sh = Math.min(game.backdrop.height - sy, VIEW_H + 8);
    if (sw > 0 && sh > 0)
      game.ctx.drawImage(game.backdrop, sx, sy, sw, sh, sx, sy, sw, sh);
  }
  if (game.L.kind === 'endless') drawEndlessBackdrop(game);
  if (game.L.kind === 'church') {
    const best = loadBest(game);
    const dec = game.L.decor;
    const gotChurch = best && best <= 170;
    const gotSeeds = seedsCleared(game) >= 5;
    if ((gotChurch || gotSeeds) && dec.table) {
      const ts = game.sprites.table;
      game.ctx.drawImage(
        ts.img,
        Math.round(dec.table.x),
        Math.round(dec.table.y),
        ts.w * dec.table.sx,
        ts.h * dec.table.sy,
      );
      const tr = game.sprites.trophy;
      const drawTrophy = (d, img) => {
        if (!d) return;
        game.ctx.drawImage(
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
      if (gotSeeds) drawTrophy(dec.trophies[0], game.tinted.trophyGreen);
      if (gotChurch)
        drawTrophy(
          dec.trophies[1] || dec.trophies[0],
          game.tinted.trophyYellow,
        );
    }
  }
  game.L.generators.forEach(g => drawSprite(game, 'dispenser', 0, g.x, g.y));
  if (game.L.kind !== 'church')
    game.L.buckets.forEach(b => drawSprite(game, 'bucket', 0, b.x, b.y));
  drawGlow(game);
  if (game.L.kind === 'generated') {
    for (const grp of game.L.appearGroups) {
      if (!grp.bell) continue;
      const bx = grp.bell.x;
      const by = grp.bell.y;
      game.ctx.save();
      if (grp.rung && !grp.ringT) game.ctx.globalAlpha = 0.7;
      const grad = game.ctx.createLinearGradient(0, by - 190, 0, by - 80);
      grad.addColorStop(0, 'rgba(180,214,202,0)');
      grad.addColorStop(1, 'rgba(180,214,202,1)');
      game.ctx.fillStyle = grad;
      game.ctx.fillRect(bx - 2, by - 190, 4, 110);
      game.ctx.fillStyle = '#B4D6CA';
      game.ctx.fillRect(bx - 2, by - 80, 4, 80);
      const swing =
        grp.ringT > 0
          ? Math.sin((24 - grp.ringT) * 0.9) * 16 * (grp.ringT / 24)
          : 0;
      game.ctx.translate(bx, by);
      game.ctx.rotate((-swing * Math.PI) / 180);
      game.ctx.drawImage(game.sprites.bell.img, 0, 0, 19, 20, -18, -4, 38, 40);
      game.ctx.restore();
    }
  }
  if (game.L.kind === 'church' && game.L.decor.wallswitch) {
    drawSprite(
      game,
      'wallswitch',
      game.switchLit ? 1 : 0,
      game.L.decor.wallswitch.x,
      game.L.decor.wallswitch.y,
      {
        scale: 2,
      },
    );
  }
  if (game.L.kind === 'church') drawCup(game);
  if (game.L.kind === 'generated' && game.L.def.wallswitchPos) {
    drawSprite(
      game,
      'wallswitch',
      game.switchLit ? 1 : 0,
      game.L.def.wallswitchPos.x,
      game.L.def.wallswitchPos.y,
      {
        scale: 2,
      },
    );
  }
  drawCoins(game);
  game.ghosts.forEach(g =>
    drawSprite(game, g.spr, g.frame, g.x, g.y, {
      alpha: g.alpha,
    }),
  );
  game.anims.forEach(a => drawSprite(game, a.spr, a.frame, a.x, a.y));
  if (game.mode === 'ground') drawWalker(game);
  else if (game.mode === 'mount')
    drawSprite(
      game,
      'krisBall',
      Math.floor(game.mount.t / 2) % 4,
      game.walker.x,
      game.walker.y,
    );
  else if (game.kris) drawKris(game);
  drawWater(game);
  if (game.L.kind === 'endless') drawFlood(game);
  drawBoard(game);
  game.confetti.forEach(p => {
    game.ctx.globalAlpha = Math.min(1, p.life / 15);
    game.ctx.fillStyle = p.col;
    game.ctx.fillRect(Math.round(p.x), Math.round(p.y), 4, 4);
    game.ctx.globalAlpha = 1;
  });
  game.ctx.restore();
  if (game.mode === 'wall' && game.running) {
    pixelText(
      game,
      'Hold [X]: Let go',
      VIEW_W - 12,
      VIEW_H - 14,
      16,
      game.holdExitT > 0 ? '#ffd93c' : '#fff',
      'right',
    );
    if (game.holdExitT > 0) {
      game.ctx.fillStyle = '#ffd93c';
      game.ctx.fillRect(
        VIEW_W - 126,
        VIEW_H - 8,
        (114 * game.holdExitT) / 30,
        3,
      );
    }
  }
  if (game.L.kind === 'generated') {
    pixelText(
      game,
      `SEED ${game.L.seed}`,
      VIEW_W - 12,
      22,
      14,
      '#9f9fc9',
      'right',
    );
    pixelText(
      game,
      `$ ${game.coinsTaken}`,
      VIEW_W - 12,
      42,
      14,
      'rgb(255,213,0)',
      'right',
    );
  }
  if (game.L.kind === 'endless' && game.endless && endlessBest(game) > 0) {
    pixelText(
      game,
      `BEST ${endlessBest(game)}m`,
      VIEW_W - 12,
      22,
      14,
      '#9f9fc9',
      'right',
    );
  }
  if (game.mode === 'ground') {
    const best = loadBest(game);
    if (best) {
      pixelText(
        game,
        `BEST ${(best / 10).toFixed(1)}s`,
        14,
        VIEW_H - 14,
        14,
        '#9f9fc9',
      );
    }
    pixelText(game, '[ESC] Menu', 14, VIEW_H - 34, 14, '#9f9fc9', 'left', 0.55);
  }
  if (game.L.kind === 'endless' && game.endless && game.endless.cd) {
    game.ctx.fillStyle = '#000';
    game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (game.endless.cd.text > 0 && game.fonts) {
      game.ctx.save();
      game.ctx.translate(VIEW_W / 2, VIEW_H / 2 - 50);
      game.ctx.scale(6, 6);
      pixelText(
        game,
        String(game.endless.cd.text),
        0,
        Math.round(game.fonts.main.em * 0.85),
        16,
        '#fff',
        'center',
      );
      game.ctx.restore();
    }
  }
  if (game.dialog) drawDialog(game);
}

export function render(game) {
  if (!game.sprites) return;
  if (game.phase === 'menu') drawMenu(game);
  else if (game.phase === 'codeentry') drawCode(game);
  else if (game.phase === 'results') drawResults(game);
  else if (game.phase === 'endresults') drawEndResults(game);
  else if (game.phase === 'secret') drawSecret(game);
  else if (game.L) drawGame(game);
}
