// Kris on foot: walking the floors, and the hop onto the wall.
import { TILE } from './constants';
import { play } from './run';
import { cupSpot } from './cup';
import { drawSprite, pixelText } from './draw';

export function zoneStarter(game) {
  return game.zone === 'top' ? game.L.topStarter : game.L.mountStarter;
}

export function nearMount(game) {
  return (
    Math.abs(game.walker.x - (zoneStarter(game).x + 20)) < 70 &&
    Math.abs(
      game.walker.y - (zoneStarter(game).y + (game.zone === 'top' ? -20 : 120)),
    ) < 190
  );
}

export function beginMount(game) {
  const st = zoneStarter(game);
  const c = Math.round(st.x / TILE);
  const r = Math.round(st.y / TILE);
  game.mount = {
    fx: game.walker.x,
    fy: game.walker.y - 30,
    tx: c * TILE + 20,
    ty: r * TILE + 20,
    cell: {
      c,
      r,
    },
    t: 0,
  };
  game.mode = 'mount';
  play(game, 'jump', 0.7);
}

export function walkerBlocked(game, x, y) {
  const bx = x - 10;
  const by = y - 10;
  for (const s of game.L.solids) {
    if (bx < s.x + s.w && bx + 20 > s.x && by < s.y + s.h && by + 10 > s.y)
      return true;
  }
  if (game.L.kind === 'church' && game.L.decor.cup && game.walker) {
    const spot = cupSpot(game);
    const cx = spot.x + Math.sin(game.siner / 55) * 26;
    const cy = spot.y + 44;
    const wx = game.walker.x - 10;
    const wy = game.walker.y - 10;
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

export function stepWalker(game) {
  if (game.held.cancel) game.walker.runT += 1;
  else game.walker.runT = 0;
  let wspeed = 4;
  if (game.walker.runT > 0) {
    wspeed = 6;
    if (game.walker.runT > 10) wspeed = 8;
    if (game.walker.runT > 60) wspeed = 9;
  }
  let px = 0;
  let py = 0;
  if (game.held.right) {
    px = wspeed;
    game.walker.dir = 'right';
  }
  if (game.held.left) {
    px = -wspeed;
    game.walker.dir = 'left';
  }
  if (game.held.down) {
    py = wspeed;
    game.walker.dir = 'down';
  }
  if (game.held.up) {
    py = -wspeed;
    game.walker.dir = 'up';
  }
  game.walker.moving = px !== 0 || py !== 0;
  const z = game.L.zones[game.zone];
  const sx = Math.sign(px);
  for (let g = Math.abs(px); g > 0; g--) {
    const nx = Math.max(z.xMin, Math.min(z.xMax, game.walker.x + sx));
    if (nx === game.walker.x || walkerBlocked(game, nx, game.walker.y)) break;
    game.walker.x = nx;
  }
  const sy = Math.sign(py);
  for (let g = Math.abs(py); g > 0; g--) {
    const ny = Math.max(z.yMin, Math.min(z.yMax, game.walker.y + sy));
    if (ny === game.walker.y || walkerBlocked(game, game.walker.x, ny)) break;
    game.walker.y = ny;
  }
  if (game.walker.moving) game.walker.animT += wspeed * 0.045;
}

export function drawWalker(game) {
  const spr = {
    left: 'walkLeft',
    right: 'walkRight',
    up: 'walkUp',
    down: 'walkDown',
  }[game.walker.dir];
  const s = game.sprites[spr];
  const frame = game.walker.moving ? Math.floor(game.walker.animT) % 4 : 0;
  drawSprite(
    game,
    spr,
    frame,
    game.walker.x - s.w,
    game.walker.y - s.h * 2 + 4,
  );
  if (nearMount(game)) {
    const st = zoneStarter(game);
    pixelText(
      game,
      '[Z] CLIMB',
      st.x + 20,
      st.y + (game.zone === 'top' ? -50 : 100) + Math.sin(game.siner / 6) * 3,
      16,
      '#fff',
      'center',
    );
  }
}
