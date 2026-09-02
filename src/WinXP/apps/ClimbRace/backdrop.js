// Painting the wall behind the climb from the church tileset: the baked
// church, a generated wall's bricks, the flood's repeating strip.
import { TILE, VIEW_H, VIEW_W } from './constants';

export function drawTileInto(game, g, ts, meta, val, dx, dy) {
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

export function buildBackdrop(game, level) {
  const cnv = document.createElement('canvas');
  cnv.width = level.w;
  cnv.height = level.h;
  const g = cnv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#000';
  g.fillRect(0, 0, level.w, level.h);
  const meta = {
    tileW: 40,
    tileH: 40,
    borderX: 2,
    borderY: 2,
    cols: 24,
  };
  const ts = game.sprites.churchTileset.img;
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
        if (wc >= c0 && wc < c1 && wr >= r0 && wr < r1) wall.add(`${wc},${wr}`);
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
    for (let r = boothTopRow; r <= boothTopRow + 3; r++) wall.add(`${c},${r}`);
    for (let r = ledgeRow - 1; r < r1; r++) wall.add(`${c},${r}`);
  }
  wall.forEach(k => {
    const [c, r] = k.split(',').map(Number);
    drawTileInto(game, g, ts, meta, BRICK, c * TILE, r * TILE);
  });
  // tile 273 = the church's own start/exit anchor brick
  const ANCHOR = 273;
  level.alwaysCells.forEach(k => {
    const [c, r] = k.split(',').map(Number);
    drawTileInto(game, g, ts, meta, ANCHOR, c * TILE, r * TILE);
  });
  const isBare = (cc, rr) => {
    const k = `${cc},${rr}`;
    return wall.has(k) && !level.glowCells.has(k) && !level.alwaysCells.has(k);
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
          drawTileInto(
            game,
            g,
            ts,
            meta,
            tileIdx,
            cc * TILE,
            (band + i) * TILE,
          ),
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
        game,
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

export function endlessBackdropStrip(game) {
  if (game.endlessStrip) return game.endlessStrip;
  const cnv = document.createElement('canvas');
  cnv.width = VIEW_W;
  cnv.height = 960;
  const g = cnv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const meta = {
    tileW: 40,
    tileH: 40,
    borderX: 2,
    borderY: 2,
    cols: 24,
  };
  const ts = game.sprites.churchTileset.img;
  const BRICK = 271;
  const WINDOW = [264, 270, 276];
  for (let c = 0; c < 16; c++)
    for (let r = 0; r < 24; r++)
      drawTileInto(game, g, ts, meta, BRICK, c * TILE, r * TILE);
  [
    [3, 4],
    [11, 15],
  ].forEach(([wc, wr]) => {
    [wc, wc + 3].forEach(cc =>
      WINDOW.forEach((idx, i) =>
        drawTileInto(game, g, ts, meta, idx, cc * TILE, (wr + i) * TILE),
      ),
    );
  });
  game.endlessStrip = cnv;
  return cnv;
}

export function drawEndlessBackdrop(game) {
  const strip = endlessBackdropStrip(game);
  const y0 = Math.floor(game.camY / 960) * 960;
  for (let y = y0; y < game.camY + VIEW_H; y += 960)
    game.ctx.drawImage(strip, 0, y);
  // tile 273 = the church's own start/exit anchor brick
  const meta = {
    tileW: 40,
    tileH: 40,
    borderX: 2,
    borderY: 2,
    cols: 24,
  };
  game.L.alwaysCells.forEach(k => {
    const [c, r] = k.split(',').map(Number);
    drawTileInto(
      game,
      game.ctx,
      game.sprites.churchTileset.img,
      meta,
      273,
      c * TILE,
      r * TILE,
    );
  });
}
