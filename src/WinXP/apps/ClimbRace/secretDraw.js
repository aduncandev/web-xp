// Drawing the hidden rooms: the green walls, the floors, the sparkles, and
// the three rooms themselves.
import { VIEW_H, VIEW_W } from './constants';
import { blit, pixelText } from './draw';
import { drawDialog } from './dialog';

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

const WALL_SPARKLES = Array.from(
  {
    length: 24,
  },
  (_, i) => ({
    x: 50 + ((i * 131) % 540),
    y: 46 + ((i * 83) % 28),
    phase: (i * 47) % 140,
    plus: i % 2 === 0,
  }),
);

export function getWallLattice(game) {
  if (game.wallLattice) return game.wallLattice;
  const row = game.sprites.wallrow;
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
  game.wallLattice = half;
  return half;
}

export function drawGreenWall(game, x0, y0, w, h, patternOffset, slow) {
  const grad = game.ctx.createLinearGradient(0, y0, 0, y0 + h - 10);
  grad.addColorStop(0, 'rgb(99,142,152)');
  grad.addColorStop(1, 'rgb(168,228,131)');
  game.ctx.fillStyle = grad;
  game.ctx.fillRect(x0, y0, w, h - 10);
  const lattice = getWallLattice(game);
  if (lattice) {
    if (!game.wallScratch) {
      game.wallScratch = document.createElement('canvas');
      game.wallScratch.width = VIEW_W;
      game.wallScratch.height = VIEW_H;
    }
    const g = game.wallScratch.getContext('2d');
    g.save();
    g.clearRect(0, 0, VIEW_W, VIEW_H);
    g.imageSmoothingEnabled = false;
    g.beginPath();
    g.rect(x0, y0, w, h - 10);
    g.clip();
    g.drawImage(
      lattice,
      x0 + (slow ? game.secret.bgSpeedSlow : game.secret.bgSpeed),
      y0 +
        (slow ? game.secret.bgSpeedYSlow : game.secret.bgSpeedY) +
        patternOffset,
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
    game.ctx.drawImage(game.wallScratch, 0, 0);
  }
  const v = game.sprites.vines;
  if (v && v.img.width) {
    game.ctx.save();
    game.ctx.beginPath();
    game.ctx.rect(x0, y0, w, 32);
    game.ctx.clip();
    for (let vx = x0; vx < x0 + w; vx += 64) blit(game, 'vines', 0, vx, y0);
    game.ctx.restore();
  }
  game.ctx.fillStyle = 'rgba(159,216,134,0.3)';
  game.ctx.fillRect(x0, y0 + h - 10, w, 30);
}

// obj_dw_green_room_floor: a peach base with rotated light bars, drawn
// beneath the checker tiles; the floor-mask object then blacks out
// everything that isn't walkable room. Exact values from the dumps.

export function drawGreenFloorBase(game, mask) {
  game.ctx.fillStyle = '#F4B688';
  game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // the bars anchor at half-camera parallax; our camera is fixed at 0,
  // so base is (0, 72) exactly. spr_pixel_white is 4x4, corner origin,
  // so every scale unit is 4 pixels
  FLOOR_BARS.forEach(([bx, by, len, wid, col, alpha]) => {
    game.ctx.save();
    game.ctx.globalAlpha = alpha;
    game.ctx.fillStyle = col;
    game.ctx.translate(bx, by);
    game.ctx.rotate(-Math.PI / 4);
    game.ctx.fillRect(0, 0, len * 4, wid * 4);
    game.ctx.restore();
  });
  game.ctx.globalAlpha = 1;
  game.ctx.fillStyle = '#000';
  mask.forEach(([mx, my, mw, mh]) => game.ctx.fillRect(mx, my, mw, mh));
}

export function drawWallSparkles(game, x0, w) {
  WALL_SPARKLES.forEach(s => {
    const t = (game.secret.t + s.phase) % 140;
    if (t >= 50) return;
    const frame = Math.min(4, Math.floor(t / 10));
    const name = s.plus ? 'sparklePlus' : 'sparkleX';
    const spr = game.sprites[name];
    if (!spr || !spr.img.width) return;
    if (s.x < x0 || s.x > x0 + w) return;
    blit(game, name, frame, s.x - spr.ox * 2, s.y - spr.oy * 2);
  });
}

export function drawSecret(game) {
  const sec = game.secret;
  game.ctx.fillStyle = '#000';
  game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (sec.zone === 'mike') drawSecretMike(game, sec);
  else if (sec.zone === 'kikky') drawSecretKikky(game, sec);
  else drawSecretShelter(game, sec);
  if (game.dialog) drawDialog(game);
  let dark = 0;
  if (sec.transition)
    dark =
      sec.transition.t < 15
        ? sec.transition.t / 15
        : (30 - sec.transition.t) / 15;
  else if (sec.fade < 1) dark = 1 - sec.fade;
  if (dark > 0) {
    game.ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dark)})`;
    game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

export function drawKrisActor(game, k, dark) {
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
  const s = game.sprites[spr];
  const frame = k.moving ? Math.floor(k.animT) % 4 : 0;
  return {
    spr,
    s,
    frame,
  };
}

export function drawSecretMike(game, sec) {
  drawGreenFloorBase(game, MIKE_MASK);
  const floor = game.sprites.mikeFloor;
  if (floor && floor.img.width) {
    game.ctx.imageSmoothingEnabled = false;
    game.ctx.drawImage(floor.img, 0, 0);
  }
  drawGreenWall(game, 40, 40, 560, 160, 0);
  drawGreenWall(game, 280, 40, 80, 160, 44, true);
  drawWallSparkles(game, 40, 560);
  game.ctx.fillStyle = 'rgba(0,0,77,0.4)';
  game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const mFrames = {
    mikeS: 2,
    mikeM: 8,
    mikeMBashful: 5,
    mikeL: 7,
  };
  const actors = [
    {
      spr: sec.talking === 'mikeM' ? 'mikeMBashful' : 'mikeM',
      x: 251,
      y: 158,
      foot: 276,
    },
    {
      spr: 'mikeS',
      x: 100,
      y: 187,
      foot: 277,
    },
    {
      spr: 'mikeL',
      x: 394,
      y: 125,
      foot: 277,
    },
    {
      spr: 'tennaStatue',
      x: 525,
      y: 89,
      foot: 217,
    },
    {
      kris: true,
      foot: sec.kris.y,
    },
  ];
  actors.sort((a, b) => a.foot - b.foot);
  actors.forEach(a => {
    if (a.kris) {
      const d = drawKrisActor(game, sec.kris, true);
      blit(
        game,
        d.spr,
        d.frame,
        sec.kris.x - d.s.w,
        sec.kris.y - d.s.h * 2 + 4,
      );
      return;
    }
    const s = game.sprites[a.spr];
    const frames = mFrames[a.spr] || 1;
    const frame = frames > 1 ? Math.floor(sec.t * 0.2) % frames : 0;
    blit(game, a.spr, frame, a.x - s.ox * 2, a.y - s.oy * 2);
  });
}

export function drawSecretKikky(game, sec) {
  const park = sec.park;
  drawGreenFloorBase(game, KIKKY_MASK);
  const floor = game.sprites.kikkyFloor;
  if (floor && floor.img.width) {
    game.ctx.imageSmoothingEnabled = false;
    game.ctx.drawImage(floor.img, 0, 0);
  }
  drawGreenWall(game, 40, 40, 560, 280, 0);
  drawWallSparkles(game, 40, 560);
  game.ctx.fillStyle = 'rgba(0,0,77,0.4)';
  game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  game.ctx.fillStyle = '#000';
  game.ctx.fillRect(60, 68, 500, 200);
  game.ctx.save();
  game.ctx.beginPath();
  game.ctx.rect(60, 68, 500, 200);
  game.ctx.clip();
  game.ctx.imageSmoothingEnabled = false;
  park.toys.forEach(t => {
    const s = game.sprites.dentalchew;
    game.ctx.save();
    game.ctx.translate(Math.round(t.x), Math.round(t.y));
    game.ctx.rotate((t.angle * Math.PI) / 180);
    game.ctx.drawImage(s.img, 0, 0, s.w, s.h, -s.ox, -s.oy, s.w, s.h);
    game.ctx.restore();
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
    const s = game.sprites[name];
    game.ctx.save();
    game.ctx.translate(Math.round(c.x + c.xx), Math.round(c.y + c.yy));
    game.ctx.scale(c.face, 1);
    game.ctx.drawImage(s.img, frame * s.w, 0, s.w, s.h, -s.ox, -s.oy, s.w, s.h);
    game.ctx.restore();
  });
  park.sparkles.forEach(sp => {
    const frame = Math.min(7, Math.floor(sp.t / 3));
    const s = game.sprites.heartSparkle;
    game.ctx.drawImage(
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
  pixelText(game, 'Nagasagy Kikky Park', 310, 86, 14, '#fff', 'center');
  const hap = park.cats.length ? Math.round(park.cats[0].happiness) : 100;
  pixelText(game, 'Happiness: ' + hap, 440, 248, 14, '#fff', 'left');
  pixelText(game, 'Dental', 100, 238, 14, 'rgb(0,127,255)', 'center');
  pixelText(game, 'Toy', 100, 252, 14, 'rgb(0,127,255)', 'center');
  game.ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let sy = 68 + ((sec.t >> 1) % 3); sy < 268; sy += 3)
    game.ctx.fillRect(60, sy, 500, 1);
  game.ctx.restore();
  game.ctx.strokeStyle = '#fff';
  game.ctx.lineWidth = 1;
  game.ctx.strokeRect(60.5, 68.5, 499, 199);
  game.ctx.strokeRect(61.5, 69.5, 497, 197);
  game.ctx.fillStyle = '#808080';
  game.ctx.fillRect(140, 278, 459, 18);
  game.ctx.fillStyle = '#000';
  game.ctx.fillRect(140, 286, 459, 2);
  game.ctx.fillStyle = '#fff';
  game.ctx.fillRect(78, 274, 44, 26);
  game.ctx.fillStyle = '#000';
  game.ctx.fillRect(80, 276, 40, 22);
  {
    const s = game.sprites.dentalchew;
    game.ctx.drawImage(s.img, 0, 0, s.w, s.h, 101 - s.ox, 287 - s.oy, s.w, s.h);
  }
  if (park.debris) blit(game, 'coolantDebris', 0, 504, 310);
  if (park.bomb.state !== 'gone') {
    const bname = park.bomb.shownTiger ? 'tigerbomb' : 'kikkyBomb';
    blit(game, bname, Math.floor(sec.t * 0.1) % 2, park.bomb.x, park.bomb.y);
  }
  const d = drawKrisActor(game, sec.kris, true);
  blit(game, d.spr, d.frame, sec.kris.x - d.s.w, sec.kris.y - d.s.h * 2 + 4);
  if (park.explo) {
    const frame = Math.min(16, park.explo.t);
    const s = game.sprites.realExplosion;
    game.ctx.save();
    game.ctx.imageSmoothingEnabled = false;
    game.ctx.drawImage(
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
    game.ctx.restore();
  }
}

export function drawSecretShelter(game, sec) {
  const room = game.sprites.shelterRoom;
  if (!room || !room.img.width) return;
  let camTop = Math.max(0, Math.min(1240 * 2 - VIEW_H, sec.kris.y * 2 - 260));
  if (sec.shake > 0)
    camTop += Math.round((Math.random() * 2 - 1) * Math.min(6, sec.shake));
  game.ctx.imageSmoothingEnabled = false;
  game.ctx.drawImage(room.img, 0, -camTop, 320 * 2, 1240 * 2);
  const shelterFoot = 1166;
  const drawShelter = () => {
    let name = 'shelter';
    let frame = 0;
    if (sec.shelterHold > 0 && sec.doorT >= 20) {
      name = 'shelterOpenDoor';
      frame = Math.min(3, Math.floor((sec.doorT - 20) / 8));
    }
    blit(game, name, frame, 54 * 2, 1046 * 2 - camTop);
  };
  const drawKris = () => {
    const d = drawKrisActor(game, sec.kris, false);
    blit(
      game,
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
  const front = game.sprites.shelterFront;
  if (front && front.img.width)
    game.ctx.drawImage(front.img, 0, -camTop, 320 * 2, 1240 * 2);
  const deep = Math.max(0, Math.min(1, (sec.kris.y - 900) / 300));
  if (deep > 0) {
    game.ctx.fillStyle = `rgba(4,2,12,${0.32 * deep})`;
    game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
