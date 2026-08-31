/**
 * The OpenGL screen savers, on the software renderer in engine3d.
 *
 * Behaviour follows the originals: Pipes grows a run through a lattice and
 * clears when it fills, Text spins/see-saws/wobbles/tumbles, FlowerBox
 * morphs a shaded solid, Flying Objects cycles the Windows logo and friends.
 */

import {
  mat,
  createRenderer,
  cylinder,
  sphere,
  elbowBetween,
  drawTexturedQuad,
  v3,
} from './engine3d';

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// The originals draw from a small saturated palette rather than a full wheel
const PIPE_COLORS = [
  [80, 130, 240],
  [230, 90, 90],
  [90, 210, 120],
  [235, 190, 70],
  [200, 110, 225],
  [90, 210, 220],
  [235, 235, 235],
];

// --- 3D Pipes ---------------------------------------------------------

// sspipes.scr dialog: Pipes {Single|Multiple}, Pipe Style {Joint Type},
// Surface Style {Solid|Textured}, Speed.
export const PIPES_DEFAULTS = {
  multiple: false,
  joint: 'elbow', // Elbow (default) | Ball | Mixed | Cycle
  surface: 'solid', // Solid | Textured
  texturePath: '', // Choose Texture...: a bitmap in the VFS; '' = the built-in candy cane
  speed: 10, // 1..20
};

const GRID = 10; // the lattice the originals grow through
const SPACING = 1.0;
const DIRS = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];

export function createPipes(w, h, s) {
  const o = { ...PIPES_DEFAULTS, ...(s || {}) };
  let W = w;
  let H = h;
  const seg = 12;
  const R = 0.26;
  const renderer = createRenderer();

  // Meshes are built once and re-used under different transforms
  const tube = cylinder(R, SPACING, seg, [255, 255, 255]);
  const ball = sphere(R * 1.9, Math.max(5, seg / 2), seg, [255, 255, 255]);
  // One bend mesh per (incoming, outgoing) pair, built on demand
  const bends = new Map();
  const bendFor = (a, b) => {
    const k = `${a.x}${a.y}${a.z}|${b.x}${b.y}${b.z}`;
    let hit = bends.get(k);
    if (!hit) {
      hit = elbowBetween(a, b, R, SPACING / 2, seg, Math.max(4, seg / 2), [
        255,
        255,
        255,
      ]);
      bends.set(k, hit);
    }
    return hit;
  };

  let pipes = [];
  let pieces = [];
  let cycle = 0;
  let spin = 0;
  let occupied = new Set();

  const key = c => `${c.x},${c.y},${c.z}`;
  const inBounds = c =>
    Math.abs(c.x) <= GRID / 2 &&
    Math.abs(c.y) <= GRID / 2 &&
    Math.abs(c.z) <= GRID / 2;

  const jointForCycle = () => {
    if (o.joint !== 'cycle') return o.joint;
    return ['elbow', 'ball', 'mixed'][cycle % 3];
  };

  const newPipe = () => {
    let cell;
    let guard = 0;
    do {
      cell = {
        x: Math.round(rand(-GRID / 2, GRID / 2)),
        y: Math.round(rand(-GRID / 2, GRID / 2)),
        z: Math.round(rand(-GRID / 2, GRID / 2)),
      };
      guard++;
    } while (occupied.has(key(cell)) && guard < 60);
    occupied.add(key(cell));
    return {
      cell,
      dir: pick(DIRS),
      color: pick(PIPE_COLORS),
      dead: false,
    };
  };

  const reset = () => {
    pieces = [];
    occupied = new Set();
    pipes = Array.from({ length: o.multiple ? 4 : 1 }, newPipe);
    cycle++;
  };
  reset();

  /** Grow one pipe by a single grid step. */
  const step = p => {
    if (p.dead) return;
    const joint = jointForCycle();
    // The originals turn often but not every step
    const turning = Math.random() < 0.28;
    let dir = p.dir;
    if (turning) {
      const options = DIRS.filter(
        d =>
          !(d.x === -p.dir.x && d.y === -p.dir.y && d.z === -p.dir.z) &&
          !(d.x === p.dir.x && d.y === p.dir.y && d.z === p.dir.z),
      );
      dir = pick(options);
    }
    const next = {
      x: p.cell.x + dir.x,
      y: p.cell.y + dir.y,
      z: p.cell.z + dir.z,
    };
    if (!inBounds(next) || occupied.has(key(next))) {
      // Boxed in: try any free neighbour, else this pipe is finished
      const free = DIRS.map(d => ({
        d,
        c: { x: p.cell.x + d.x, y: p.cell.y + d.y, z: p.cell.z + d.z },
      })).filter(n => inBounds(n.c) && !occupied.has(key(n.c)));
      if (free.length === 0) {
        p.dead = true;
        pieces.push({ kind: 'ball', cell: p.cell, color: p.color });
        return;
      }
      const chosen = pick(free);
      dir = chosen.d;
      next.x = chosen.c.x;
      next.y = chosen.c.y;
      next.z = chosen.c.z;
    }

    if (turning || dir !== p.dir) {
      const useBall =
        joint === 'ball' || (joint === 'mixed' && Math.random() < 0.5);
      pieces.push({
        kind: useBall ? 'ball' : 'elbow',
        cell: p.cell,
        from: p.dir,
        to: dir,
        color: p.color,
      });
    }
    pieces.push({ kind: 'tube', cell: p.cell, dir, color: p.color });
    occupied.add(key(next));
    p.cell = next;
    p.dir = dir;
  };

  /** Model matrix aiming +Z along `dir`. */
  const aim = dir => {
    if (dir.z === 1) return mat.identity();
    if (dir.z === -1) return mat.rotateY(Math.PI);
    if (dir.x === 1) return mat.rotateY(Math.PI / 2);
    if (dir.x === -1) return mat.rotateY(-Math.PI / 2);
    if (dir.y === 1) return mat.rotateX(-Math.PI / 2);
    return mat.rotateX(Math.PI / 2);
  };

  let acc = 0;
  return {
    resize(nw, nh) {
      W = nw;
      H = nh;
    },
    frame(ctx, dt) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      // Grow on a fixed tick so speed doesn't ride on frame rate
      acc += dt;
      const period = (o.multiple ? 0.06 : 0.05) * (10 / Math.max(1, o.speed));
      while (acc > period) {
        acc -= period;
        pipes.forEach(step);
        if (pipes.every(p => p.dead) || pieces.length > 1400) reset();
      }

      spin += dt * 0.12;
      const view = mat.multiply(
        mat.multiply(mat.rotateY(spin), mat.rotateX(0.42)),
        mat.translate(0, 0, GRID * 1.75),
      );

      renderer.begin();
      for (const piece of pieces) {
        const at = mat.translate(
          piece.cell.x * SPACING,
          piece.cell.y * SPACING,
          piece.cell.z * SPACING,
        );
        const place = mat.multiply(at, view);
        if (piece.kind === 'tube') {
          renderer.add(
            colored(tube, piece.color),
            mat.multiply(aim(piece.dir), place),
          );
        } else if (piece.kind === 'ball') {
          renderer.add(colored(ball, piece.color), place);
        } else {
          // The bend already carries its own orientation
          renderer.add(
            colored(bendFor(piece.from, piece.to), piece.color),
            place,
          );
        }
      }
      renderer.end(ctx, W, H, Math.min(W, H) * 0.9);
    },
  };
}

/** Cheap recolour of a shared mesh without rebuilding its geometry. */
const colorCache = new WeakMap();
function colored(m, color) {
  let byColor = colorCache.get(m);
  if (!byColor) {
    byColor = new Map();
    colorCache.set(m, byColor);
  }
  const k = color.join(',');
  let hit = byColor.get(k);
  if (!hit) {
    hit = { verts: m.verts, faces: m.faces.map(f => ({ ...f, color })) };
    byColor.set(k, hit);
  }
  return hit;
}

// --- 3D Text ----------------------------------------------------------

// sstext3d.scr dialog: Text {Time|Custom Text + Choose Font}, Resolution,
// Size, Motion {Rotation Type + Rotation Speed}, Surface Style
// {Solid Color|Texture|Reflection, each with a Custom option} and
// Show Specular Highlights. Defaults from its string table.
export const TEXT3D_DEFAULTS = {
  useTime: false,
  text: 'Microsoft Windows',
  fontFamily: 'Tahoma', // Choose Font...: Tahoma Regular is the original's default
  bold: false,
  italic: false,
  resolution: 10, // 1..20
  size: 10, // 1..20
  rotation: 'spin', // none | spin | seesaw | wobble | tumble
  speed: 10, // 1..20
  surface: 'solid', // solid | texture | reflection
  customColor: false, // off = a colour picked for the run, as the original does
  color: '#4d7fd6',
  customTexture: false, // off = the bitmap inside sstext3d.scr
  texturePath: '',
  customReflection: false, // off = the sphere map inside sstext3d.scr
  reflectionPath: '',
  specular: true,
};

// The Texture bitmap is the one inside sstext3d.scr (JPG resource 102).
// "tile" is the repeat size relative to the glyph height. The fallback
// cannot reach a custom bitmap in the VFS, so it always shows this one.
const TEXT3D_TEXTURE = { src: '/screensavers/text3d/texture.jpg', tile: 1.0 };

// The Reflection environments, as colour against the reflected ray's
// elevation (+1 straight up, -1 straight down) plus a little azimuthal
// variation — cloud bands for Sky, light streaks for Chrome — so a spin
// sweeps something across the face. Same palette as the three.js build.
const TEXT3D_ENVS = {
  // A flat face only ever mirrors a band around the horizon, so the horizon
  // is where the picture lives: sky above, ground below, a crisp line between.
  sky: {
    stops: [
      [1, [60, 110, 210]],
      [0.35, [120, 165, 235]],
      [0.08, [200, 220, 250]],
      [0, [236, 241, 250]],
      [-0.03, [72, 82, 96]],
      [-0.4, [40, 48, 60]],
      [-1, [18, 22, 30]],
    ],
    band: (az, y) =>
      1 + (y > 0 ? 0.12 * Math.sin(2 * az + 0.6) + 0.08 * Math.sin(5 * az) : 0),
  },
  chrome: {
    stops: [
      [1, [235, 235, 235]],
      [0.3, [255, 255, 255]],
      [0.04, [200, 200, 200]],
      [0, [150, 150, 150]],
      [-0.02, [55, 55, 55]],
      [-0.4, [30, 30, 30]],
      [-1, [12, 12, 12]],
    ],
    band: az => 1 + 0.35 * Math.pow(Math.max(0, Math.cos(2 * az)), 6),
  },
};

/** Writes the environment colour for elevation y / azimuth az into out. */
function envColor(env, y, az, out, at) {
  const st = env.stops;
  let a = st[0];
  let b = st[st.length - 1];
  if (y >= a[0]) b = a;
  else if (y <= b[0]) a = b;
  else
    for (let k = 0; k < st.length - 1; k++)
      if (y <= st[k][0] && y >= st[k + 1][0]) {
        a = st[k];
        b = st[k + 1];
        break;
      }
  const f = a[0] === b[0] ? 0 : (a[0] - y) / (a[0] - b[0]);
  const m = env.band(az, y);
  for (let i = 0; i < 3; i++) {
    const c = (a[1][i] + (b[1][i] - a[1][i]) * f) * m;
    out[at + i] = c < 0 ? 0 : c > 255 ? 255 : c;
  }
}

export function createText3D(w, h, s) {
  const o = { ...TEXT3D_DEFAULTS, ...(s || {}) };
  let W = w;
  let H = h;
  let t = 0;
  const DIST = 3.4;
  const LIGHT = v3.norm({ x: -0.45, y: 0.65, z: -0.85 }); // upper left, in front

  // No font outlines in Canvas 2D, so the glyphs are a raster mask: the lit
  // front face is composed over it each frame, and the extrusion is that same
  // mask in a darker shade stacked along the text's depth.
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d');
  const face = document.createElement('canvas');
  const fctx = face.getContext('2d');
  const side = document.createElement('canvas');
  const sctx = side.getContext('2d');
  // The reflection and the specular highlight vary smoothly over the face,
  // so they are computed on a coarse grid and scaled up with filtering.
  const FX = 48;
  const FY = 12;
  const env = document.createElement('canvas');
  env.width = FX;
  env.height = FY;
  const ectx = env.getContext('2d');
  const envData = ectx.createImageData(FX, FY);
  const spec = document.createElement('canvas');
  spec.width = FX;
  spec.height = FY;
  const pctx = spec.getContext('2d');
  const specData = pctx.createImageData(FX, FY);

  // Resolution: the original tessellates the outlines finer. Here it is the
  // raster the glyphs are drawn at, so Low reads blocky and High smooth.
  const res = Math.max(1, Math.min(20, Number(o.resolution) || 10));
  const px = 32 + res * 8;
  const font = `${o.italic ? 'italic ' : ''}${o.bold ? 'bold ' : ''}${px}px "${
    o.fontFamily
  }", sans-serif`;
  const envOf = TEXT3D_ENVS.sky;
  // Solid Color without a custom colour: one picked for the run
  const runHue = Math.floor(Math.random() * 360);
  const solidColor = o.customColor ? o.color : `hsl(${runHue}, 75%, 50%)`;

  let lastLabel = null;
  let sideDirty = true;
  let texImg = null;
  let pattern = null;
  if (o.surface === 'texture') {
    const img = new Image();
    img.onload = () => {
      texImg = img;
      pattern = null;
      sideDirty = true;
    };
    img.src = TEXT3D_TEXTURE.src;
  }

  const label = () =>
    o.useTime
      ? new Date().toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })
      : o.text || ' ';

  const paintMask = () => {
    const text = label();
    if (text === lastLabel) return;
    lastLabel = text;
    mctx.font = font;
    const wide = Math.max(
      16,
      Math.ceil(mctx.measureText(text).width + px * 0.2),
    );
    mask.width = face.width = side.width = wide;
    mask.height = face.height = side.height = Math.ceil(px * 1.4);
    mctx.font = font; // a resize clears the context state
    mctx.textBaseline = 'middle';
    mctx.fillStyle = '#fff';
    mctx.fillText(text, px * 0.1, mask.height / 2);
    sideDirty = true;
  };
  paintMask();

  /** The fill for the chosen surface; the texture until it loads is flat. */
  const surfaceFill = () => {
    if (o.surface === 'texture' && texImg) {
      if (!pattern) {
        pattern = fctx.createPattern(texImg, 'repeat');
        const tile = TEXT3D_TEXTURE.tile;
        const k = (px * tile) / texImg.height;
        if (pattern.setTransform && typeof DOMMatrix !== 'undefined')
          pattern.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
      }
      return pattern;
    }
    return solidColor;
  };

  const paintSide = () => {
    sideDirty = false;
    sctx.globalCompositeOperation = 'source-over';
    sctx.clearRect(0, 0, side.width, side.height);
    if (o.surface === 'reflection') {
      const c = [0, 0, 0];
      envColor(envOf, -0.3, 0, c, 0);
      sctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
    } else sctx.fillStyle = surfaceFill();
    sctx.fillRect(0, 0, side.width, side.height);
    sctx.fillStyle = 'rgba(0,0,0,0.5)';
    sctx.fillRect(0, 0, side.width, side.height);
    sctx.globalCompositeOperation = 'destination-in';
    sctx.drawImage(mask, 0, 0);
  };

  /**
   * Lights the visible cap: Lambert diffuse against the face normal, a
   * Blinn-Phong highlight when Show Specular Highlights is on, and for the
   * Reflection style the environment seen in the mirror direction — all of
   * which move over the face as the text turns.
   */
  const paintFace = (N, tl, tr, br, bl) => {
    const fw = face.width;
    const fh = face.height;
    const reflect = o.surface === 'reflection';
    const diffuse =
      (reflect ? 0.62 : 0.28) +
      (reflect ? 0.38 : 0.72) * Math.max(0, v3.dot(N, LIGHT));
    if (reflect || o.specular) {
      for (let j = 0; j < FY; j++) {
        const v = (j + 0.5) / FY;
        for (let i = 0; i < FX; i++) {
          const u = (i + 0.5) / FX;
          const P = {
            x:
              (tl.x * (1 - u) + tr.x * u) * (1 - v) +
              (bl.x * (1 - u) + br.x * u) * v,
            y:
              (tl.y * (1 - u) + tr.y * u) * (1 - v) +
              (bl.y * (1 - u) + br.y * u) * v,
            z:
              (tl.z * (1 - u) + tr.z * u) * (1 - v) +
              (bl.z * (1 - u) + br.z * u) * v,
          };
          const V = v3.norm({ x: -P.x, y: -P.y, z: -P.z });
          const at = (j * FX + i) * 4;
          if (reflect) {
            const nv = 2 * v3.dot(N, V);
            const R = {
              x: nv * N.x - V.x,
              y: nv * N.y - V.y,
              z: nv * N.z - V.z,
            };
            envColor(envOf, R.y, Math.atan2(R.x, R.z), envData.data, at);
            envData.data[at + 3] = 255;
          }
          if (o.specular) {
            const Hv = v3.norm({
              x: LIGHT.x + V.x,
              y: LIGHT.y + V.y,
              z: LIGHT.z + V.z,
            });
            const sp = Math.pow(Math.max(0, v3.dot(N, Hv)), 22) * 0.95;
            specData.data[at] = 255;
            specData.data[at + 1] = 255;
            specData.data[at + 2] = 255;
            specData.data[at + 3] = Math.min(255, sp * 255);
          }
        }
      }
      if (reflect) ectx.putImageData(envData, 0, 0);
      if (o.specular) pctx.putImageData(specData, 0, 0);
    }
    fctx.globalCompositeOperation = 'source-over';
    fctx.clearRect(0, 0, fw, fh);
    if (reflect) fctx.drawImage(env, 0, 0, fw, fh);
    else {
      fctx.fillStyle = surfaceFill();
      fctx.fillRect(0, 0, fw, fh);
    }
    fctx.fillStyle = `rgba(0,0,0,${1 - diffuse})`;
    fctx.fillRect(0, 0, fw, fh);
    if (o.specular) fctx.drawImage(spec, 0, 0, fw, fh);
    fctx.globalCompositeOperation = 'destination-in';
    fctx.drawImage(mask, 0, 0);
  };

  // Like the original, the text drifts about and bounces off the edges
  const pos = { x: 0, y: 0 };
  const vel = { x: 0.34, y: 0.22 };

  return {
    resize(nw, nh) {
      W = nw;
      H = nh;
    },
    frame(ctx, dt) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      if (o.useTime) paintMask();
      if (sideDirty) paintSide();
      t += dt * (o.speed / 10);

      let rx = 0;
      let ry = 0;
      let rz = 0;
      if (o.rotation === 'spin') ry = t;
      else if (o.rotation === 'seesaw') ry = Math.sin(t) * 1.15;
      else if (o.rotation === 'wobble') {
        ry = Math.sin(t) * 1.0;
        rx = Math.sin(t * 0.7) * 0.5;
      } else if (o.rotation === 'tumble') {
        ry = t;
        rx = t * 0.53;
        rz = t * 0.31;
      }
      const rot = mat.multiply(
        mat.multiply(mat.rotateZ(rz), mat.rotateX(rx)),
        mat.rotateY(ry),
      );

      const fov = Math.min(W, H) * 0.9;
      const aspect = mask.width / mask.height;
      // Fit the text to the frame: fix its width in world units and derive
      // the height, so a long string shrinks instead of running off-screen.
      const halfW = Math.min(
        1.35 * (o.size / 10),
        ((W / 2) * DIST * 0.96) / fov,
      );
      const halfH = halfW / aspect;
      const depth = halfH * 0.45;

      // Drift inside whatever the rotated text leaves of the screen
      let ex = 0;
      let ey = 0;
      let ez = 0;
      for (const c of [
        { x: halfW, y: halfH, z: 0 },
        { x: halfW, y: -halfH, z: 0 },
        { x: halfW, y: halfH, z: depth },
        { x: halfW, y: -halfH, z: depth },
      ]) {
        const q = mat.applyDir(rot, c);
        ex = Math.max(ex, Math.abs(q.x));
        ey = Math.max(ey, Math.abs(q.y));
        ez = Math.max(ez, Math.abs(q.z));
      }
      const near = Math.max(0.5, DIST - ez);
      const bx = Math.max(0, ((W / 2) * near) / fov - ex);
      const by = Math.max(0, ((H / 2) * near) / fov - ey);
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      if (pos.x < -bx) {
        pos.x = -bx;
        vel.x = Math.abs(vel.x);
      } else if (pos.x > bx) {
        pos.x = bx;
        vel.x = -Math.abs(vel.x);
      }
      if (pos.y < -by) {
        pos.y = -by;
        vel.y = Math.abs(vel.y);
      } else if (pos.y > by) {
        pos.y = by;
        vel.y = -Math.abs(vel.y);
      }
      const model = mat.multiply(rot, mat.translate(pos.x, pos.y, DIST));

      const cornersAt = z => [
        { x: -halfW, y: halfH, z },
        { x: halfW, y: halfH, z },
        { x: halfW, y: -halfH, z },
        { x: -halfW, y: -halfH, z },
      ];
      const project = q => {
        if (q.z <= 0.05) return null;
        const k = fov / q.z;
        return { x: W / 2 + q.x * k, y: H / 2 - q.y * k };
      };
      // An affine map over a quad in perspective balloons one half of the
      // text, so the quad goes down in strips cut in world space (which
      // keeps them perspective-correct) — each strip overlapping the next a
      // touch so the clip edges leave no hairline.
      const strips = (img, world, n) => {
        const lerp = (a, b, f) => ({
          x: a.x + (b.x - a.x) * f,
          y: a.y + (b.y - a.y) * f,
          z: a.z + (b.z - a.z) * f,
        });
        for (let i = 0; i < n; i++) {
          const u0 = i / n;
          const u1 = Math.min(1, (i + 1) / n + 0.01);
          const quad = [
            lerp(world[0], world[1], u0),
            lerp(world[0], world[1], u1),
            lerp(world[3], world[2], u1),
            lerp(world[3], world[2], u0),
          ].map(project);
          if (quad.some(q => !q)) return;
          drawTexturedQuad(ctx, img, quad, [
            { x: u0 * mask.width, y: 0 },
            { x: u1 * mask.width, y: 0 },
            { x: u1 * mask.width, y: mask.height },
            { x: u0 * mask.width, y: mask.height },
          ]);
        }
      };

      // The front face sits at z=0 and the extrusion runs to z=depth; which
      // end faces the eye decides the cap, and the rest is painted far to
      // near with enough layers that the sides read as solid.
      const front = mat.apply(model, { x: 0, y: 0, z: 0 });
      const back = mat.apply(model, { x: 0, y: 0, z: depth });
      const frontNearer = front.z <= back.z;
      const n0 = mat.applyDir(model, { x: 0, y: 0, z: -1 });
      const N = frontNearer ? n0 : { x: -n0.x, y: -n0.y, z: -n0.z };
      const pf = project(front);
      const pb = project(back);
      if (!pf || !pb) return;
      const K = Math.max(
        1,
        Math.min(24, Math.ceil(Math.hypot(pf.x - pb.x, pf.y - pb.y) / 2)),
      );
      // A coarse raster is shown as-is, so Low is jaggy rather than blurred
      ctx.imageSmoothingEnabled = res >= 8;
      for (let i = 0; i <= K; i++) {
        const step = frontNearer ? K - i : i;
        const z = (depth * step) / K;
        const world = cornersAt(z).map(c => mat.apply(model, c));
        if (i === K) {
          paintFace(N, world[0], world[1], world[2], world[3]);
          strips(face, world, 8);
        } else strips(side, world, 4);
      }
      ctx.imageSmoothingEnabled = true;
    },
  };
}

// --- 3D FlowerBox -----------------------------------------------------

// ssflwbox.scr dialog: Coloring {Checkerboard|Per Side|One Color} with
// Smooth/Slanted/Cycle, Shape {Cube, Tetrahedron, Pyramids, Cylinder,
// Spring}, Spin/Bloom/Two-sided, Complexity and Size.
export const FLOWERBOX_DEFAULTS = {
  coloring: 'perside',
  smooth: true,
  slanted: false,
  cycle: false,
  spin: true,
  bloom: true,
  twoSided: false,
  shape: 'cube',
  complexity: 10, // 1..20
  size: 10, // 1..20
};

// The six per-side colours of the original, front/left/back/right/top/bottom
const FB_SIDES = [
  [0, 255, 255],
  [255, 0, 255],
  [255, 255, 0],
  [0, 0, 255],
  [255, 0, 0],
  [0, 255, 0],
];

/**
 * The solids that "flower": each is a set of flat faces on the unit solid,
 * and every point on a face is morphed as p + m * (normalize(p) - p). At
 * m = 0 that is the solid itself; at m = 1 a sphere; above 1 the corners,
 * which lie furthest out, are pulled THROUGH the centre and out the other
 * side while the face middles stay put — so each face becomes a petal and
 * each corner a spike. Below 0 the corners are pushed outward instead: a
 * star. The original sweeps m up and down between those two.
 */
function solidFaces(shape) {
  if (shape === 'tetrahedron') {
    const s = 1 / Math.sqrt(3);
    const V = [
      [s, s, s],
      [s, -s, -s],
      [-s, s, -s],
      [-s, -s, s],
    ];
    return [
      [V[0], V[1], V[2]],
      [V[0], V[3], V[1]],
      [V[0], V[2], V[3]],
      [V[1], V[3], V[2]],
    ].map(tri => ({ tri }));
  }
  if (shape === 'pyramids') {
    // a square bipyramid: eight triangular faces
    const X = [1, 0, 0];
    const Y = [0, 1, 0];
    const Z = [0, 0, 1];
    const neg = v => v.map(c => -c);
    const faces = [];
    for (const top of [Y, neg(Y)])
      for (const [a, b] of [
        [X, Z],
        [Z, neg(X)],
        [neg(X), neg(Z)],
        [neg(Z), X],
      ])
        faces.push({ tri: top === Y ? [top, a, b] : [top, b, a] });
    return faces;
  }
  // the cube: six squares, each a centre and two edge axes
  return [
    { n: [0, 0, 1], a: [1, 0, 0], b: [0, 1, 0] },
    { n: [-1, 0, 0], a: [0, 0, 1], b: [0, 1, 0] },
    { n: [0, 0, -1], a: [-1, 0, 0], b: [0, 1, 0] },
    { n: [1, 0, 0], a: [0, 0, -1], b: [0, 1, 0] },
    { n: [0, 1, 0], a: [1, 0, 0], b: [0, 0, -1] },
    { n: [0, -1, 0], a: [1, 0, 0], b: [0, 0, 1] },
  ];
}

export function createFlowerBox(w, h, s) {
  const o = { ...FLOWERBOX_DEFAULTS, ...(s || {}) };
  let W = w;
  let H = h;
  let t = 0;
  const renderer = createRenderer();
  const N = Math.max(4, Math.round(4 + o.complexity * 0.9)); // grid per face
  const radius = 0.8 * (0.55 + (o.size / 10) * 0.45);
  const DIST = 5;
  // it wanders the screen, bouncing off the sides
  const pos = { x: 0, y: 0 };
  const vel = { x: 0.34, y: 0.26 };

  const morphAt = (p, m) => {
    const len = Math.hypot(p[0], p[1], p[2]) || 1;
    return {
      x: (p[0] + m * (p[0] / len - p[0])) * radius,
      y: (p[1] + m * (p[1] / len - p[1])) * radius,
      z: (p[2] + m * (p[2] / len - p[2])) * radius,
    };
  };
  const normalAt = (p, du, dv, m) => {
    // finite differences of the morph, oriented outward from the solid
    const e = 0.002;
    const at = (x, y, z) => morphAt([x, y, z], m);
    const a = at(p[0] + du[0] * e, p[1] + du[1] * e, p[2] + du[2] * e);
    const b = at(p[0] - du[0] * e, p[1] - du[1] * e, p[2] - du[2] * e);
    const c = at(p[0] + dv[0] * e, p[1] + dv[1] * e, p[2] + dv[2] * e);
    const d = at(p[0] - dv[0] * e, p[1] - dv[1] * e, p[2] - dv[2] * e);
    const n = v3.cross(v3.sub(a, b), v3.sub(c, d));
    const here = at(p[0], p[1], p[2]);
    const out = v3.dot(n, here) < 0 ? { x: -n.x, y: -n.y, z: -n.z } : n;
    return v3.norm(out);
  };

  const sideColor = (side, cell) => {
    const base = FB_SIDES[side % FB_SIDES.length];
    const shift = o.cycle ? t * 18 : 0;
    if (o.coloring === 'onecolor') return hsl((200 + shift) % 360, 1, 0.5);
    let col = base;
    if (o.cycle) {
      const hue = (side * 60 + shift) % 360;
      col = hsl(hue, 1, 0.5);
    }
    if (o.coloring === 'checkerboard' && cell % 2 === 0)
      col = col.map(c => Math.round(c * 0.55));
    return col;
  };

  const faces = solidFaces(o.shape).map(face => {
    if (!face.tri) return face;
    // scale the triangular solids so their face centres sit on the unit
    // sphere, as the cube's do: the morph leaves the centres be and works
    // on how far the corners lie beyond them
    const c = [0, 1, 2].map(
      k => (face.tri[0][k] + face.tri[1][k] + face.tri[2][k]) / 3,
    );
    const inr = Math.hypot(c[0], c[1], c[2]);
    return { tri: face.tri.map(v => v.map(x => x / inr)) };
  });
  // how far the corners lie from the centre sets how far the bloom can go
  // before the spikes run away: the cube's reach 1.73 and bloom to 5
  const corner = faces.reduce(
    (m, face) =>
      Math.max(
        m,
        ...(face.tri ? face.tri : [[1, 1, 1]]).map(v =>
          Math.hypot(v[0], v[1], v[2]),
        ),
      ),
    1,
  );
  const bloomMax = Math.min(5, (corner + 1.6) / (corner - 1));

  /** Build the morphed, coloured mesh for the solids. */
  const solidMesh = m => {
    const mesh = { verts: [], faces: [], vnormals: o.smooth ? [] : null };
    mesh.twoSided = true;
    mesh.specular = 0.8;
    const push = (p, du, dv) => {
      mesh.verts.push(morphAt(p, m));
      if (mesh.vnormals) mesh.vnormals.push(normalAt(p, du, dv, m));
      return mesh.verts.length - 1;
    };
    faces.forEach((face, side) => {
      if (face.tri) {
        const [A, B, C] = face.tri;
        const du = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
        const dv = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
        const at = (i, j) => [
          A[0] + (du[0] * i + dv[0] * j) / N,
          A[1] + (du[1] * i + dv[1] * j) / N,
          A[2] + (du[2] * i + dv[2] * j) / N,
        ];
        // triangle subdivision: row i has N - i cells of two triangles
        const rows = [];
        for (let i = 0; i <= N; i++) {
          const row = [];
          for (let j = 0; j <= N - i; j++) row.push(push(at(i, j), du, dv));
          rows.push(row);
        }
        let cell = 0;
        for (let i = 0; i < N; i++)
          for (let j = 0; j < N - i; j++) {
            mesh.faces.push({
              idx: [rows[i][j], rows[i + 1][j], rows[i][j + 1]],
              color: sideColor(side, cell++),
            });
            if (j < N - i - 1)
              mesh.faces.push({
                idx: [rows[i][j + 1], rows[i + 1][j], rows[i + 1][j + 1]],
                color: sideColor(side, cell++),
              });
          }
      } else {
        const { n, a, b } = face;
        const at = (u, v) => [
          n[0] + a[0] * u + b[0] * v,
          n[1] + a[1] * u + b[1] * v,
          n[2] + a[2] * u + b[2] * v,
        ];
        const grid = [];
        for (let i = 0; i <= N; i++) {
          const row = [];
          for (let j = 0; j <= N; j++)
            row.push(push(at((i / N) * 2 - 1, (j / N) * 2 - 1), a, b));
          grid.push(row);
        }
        for (let i = 0; i < N; i++)
          for (let j = 0; j < N; j++)
            mesh.faces.push({
              idx: [
                grid[i][j],
                grid[i + 1][j],
                grid[i + 1][j + 1],
                grid[i][j + 1],
              ],
              color: sideColor(side, i + j),
            });
      }
    });
    return mesh;
  };

  /** The cylinder and the spring keep a simpler in-and-out bloom. */
  const PARAM = {
    cylinder(u, v, bloom) {
      const th = v * Math.PI * 2;
      const y = (u - 0.5) * 2;
      const bulge = 1 + bloom * 0.4 * Math.cos(y * Math.PI * 0.5);
      return { x: Math.cos(th) * bulge, y, z: Math.sin(th) * bulge };
    },
    spring(u, v, bloom) {
      const coils = 3;
      const a = u * Math.PI * 2 * coils;
      const th = v * Math.PI * 2;
      const R = 0.75;
      const r = 0.22 + bloom * 0.12;
      return {
        x: (R + r * Math.cos(th)) * Math.cos(a),
        y: (u - 0.5) * 1.9 + r * Math.sin(th),
        z: (R + r * Math.cos(th)) * Math.sin(a),
      };
    },
  };
  const paramMesh = bloom => {
    const shape = PARAM[o.shape];
    const mesh = { verts: [], faces: [], vnormals: o.smooth ? [] : null };
    mesh.specular = 0.6;
    const NU = N * 2;
    const NV = N * 2;
    const at = (u, v) => {
      const p = shape(u, v, bloom);
      return { x: p.x * radius, y: p.y * radius, z: p.z * radius };
    };
    for (let iu = 0; iu < NU; iu++)
      for (let iv = 0; iv < NV; iv++) {
        const base = mesh.verts.length;
        const corners = [
          at(iu / NU, iv / NV),
          at(iu / NU, (iv + 1) / NV),
          at((iu + 1) / NU, (iv + 1) / NV),
          at((iu + 1) / NU, iv / NV),
        ];
        corners.forEach(p => mesh.verts.push(p));
        if (mesh.vnormals)
          corners.forEach(p => {
            const len = Math.hypot(p.x, p.y, p.z) || 1;
            mesh.vnormals.push({ x: p.x / len, y: p.y / len, z: p.z / len });
          });
        const side = Math.floor((iv / NV) * 6);
        mesh.faces.push({
          idx: [base, base + 1, base + 2, base + 3],
          color: sideColor(side, iu + iv),
        });
        if (o.twoSided)
          mesh.faces.push({
            idx: [base + 3, base + 2, base + 1, base],
            color: sideColor(side, iu + iv),
          });
      }
    return mesh;
  };

  return {
    resize(nw, nh) {
      W = nw;
      H = nh;
    },
    frame(ctx, dt) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      const step = Math.min(dt, 0.1);
      t += step * 0.6;

      const fov = Math.min(W, H) * 0.9;
      // how far the view reaches at the object's depth, so it can bounce
      const reach = radius * (o.bloom ? 1.9 : 1.4);
      const halfX = Math.max(0, (W / 2 / fov) * DIST - reach);
      const halfY = Math.max(0, (H / 2 / fov) * DIST - reach);
      pos.x += vel.x * step;
      pos.y += vel.y * step;
      if (pos.x > halfX || pos.x < -halfX) {
        pos.x = Math.max(-halfX, Math.min(halfX, pos.x));
        vel.x = -vel.x;
      }
      if (pos.y > halfY || pos.y < -halfY) {
        pos.y = Math.max(-halfY, Math.min(halfY, pos.y));
        vel.y = -vel.y;
      }

      let mesh;
      if (PARAM[o.shape]) {
        mesh = paramMesh(o.bloom ? (Math.sin(t) + 1) / 2 : 0.5);
      } else {
        // the bloom: a triangle wave, 12.5 s, from a slightly pointed cube
        // (the corners pushed out) up to the full flower at 5
        const phase = (t % 7.5) / 3.75;
        const m = o.bloom
          ? -0.35 + (bloomMax + 0.35) * (1 - Math.abs(phase - 1))
          : 0;
        mesh = solidMesh(m);
      }

      const spin = o.spin ? t * 1.55 : 0.5;
      const tilt = o.slanted ? 0.6 : 0;
      const view = mat.multiply(
        mat.multiply(
          mat.multiply(mat.rotateY(spin), mat.rotateZ(spin)),
          mat.rotateX(tilt),
        ),
        mat.translate(pos.x, pos.y, DIST),
      );
      renderer.begin();
      renderer.add(mesh, view);
      renderer.end(ctx, W, H, fov);
    },
  };
}

function hsl(hDeg, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = hDeg / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const mm = l - c / 2;
  return [
    Math.round((r + mm) * 255),
    Math.round((g + mm) * 255),
    Math.round((b + mm) * 255),
  ];
}

// --- 3D Flying Objects ------------------------------------------------

// ss3dfo.scr dialog: Object {Style}, Color Usage {Color-cycling, Smooth
// shading}, Resolution, Size. Style names come from its string table.
export const FLYING_DEFAULTS = {
  style: 'logo',
  colorCycling: false,
  smoothShading: true,
  resolution: 10,
  size: 10,
  texturePath: '', // Texture...: the bitmap for Textured Flag; '' = the built-in banner
};

// the four panes of the XP flag
const XP_FLAG = [
  [246, 83, 20], // red
  [124, 187, 0], // green
  [0, 161, 241], // blue
  [255, 187, 0], // yellow
];

/**
 * Every object here flies: it drifts about the screen, turning over as it
 * goes, and bounces off the edges — that is most of what the original's
 * styles have in common, and most of what the eye remembers.
 */
export function createFlyingObjects(w, h, s) {
  const o = { ...FLYING_DEFAULTS, ...(s || {}) };
  let W = w;
  let H = h;
  let t = 0;
  const renderer = createRenderer();
  const scale = 0.6 + (o.size / 10) * 0.4;
  const res = Math.max(6, Math.round(o.resolution * 1.4));
  const DIST = 5.2;
  const pos = { x: 0, y: 0 };
  const vel = { x: 0.3, y: 0.22 };
  // Colour-cycling walks every surface through the spectrum over time
  const cycled = (base, phase) =>
    o.colorCycling ? hsl(((phase || 0) + t * 60) % 360, 0.8, 0.55) : base;

  /** Vertex normals by finite differences of a parametric surface. */
  const surfaceMesh = (NU, NV, at, colorAt, twoSided) => {
    const m = { verts: [], faces: [], vnormals: o.smoothShading ? [] : null };
    m.twoSided = !!twoSided;
    const grid = [];
    for (let i = 0; i <= NU; i++) {
      const row = [];
      for (let j = 0; j <= NV; j++) {
        const u = i / NU;
        const v = j / NV;
        row.push(m.verts.length);
        m.verts.push(at(u, v));
        if (m.vnormals) {
          const e = 0.002;
          const du = v3.sub(at(u + e, v), at(u - e, v));
          const dv = v3.sub(at(u, v + e), at(u, v - e));
          m.vnormals.push(v3.norm(v3.cross(du, dv)));
        }
      }
      grid.push(row);
    }
    for (let i = 0; i < NU; i++)
      for (let j = 0; j < NV; j++) {
        const color = colorAt(i, j, NU, NV);
        if (!color) continue;
        m.faces.push({
          idx: [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]],
          color,
        });
      }
    if (m.vnormals) {
      // the differences do not know which side is out: side each vertex
      // normal with the winding of the faces that share it
      const acc = m.verts.map(() => ({ x: 0, y: 0, z: 0 }));
      for (const f of m.faces) {
        const [a, b, c] = f.idx.map(i => m.verts[i]);
        const n = v3.cross(v3.sub(b, a), v3.sub(c, a));
        for (const i of f.idx) {
          acc[i].x += n.x;
          acc[i].y += n.y;
          acc[i].z += n.z;
        }
      }
      m.vnormals = m.vnormals.map((n, i) =>
        v3.dot(n, acc[i]) < 0 ? { x: -n.x, y: -n.y, z: -n.z } : n,
      );
    }
    return m;
  };

  /**
   * The Windows logo: the XP flag, four rounded panes with a gap between,
   * on a surface that both holds the flag's curve and waves as it flies.
   */
  const flagAt = (u, v) => {
    const fx = (u - 0.5) * 2.2;
    const fy = (v - 0.5) * 1.7 + 0.2 * Math.sin(fx * 1.1 + 0.5);
    const fz = 0.22 * Math.sin(fx * 2.2 - t * 2.6);
    return { x: fx * scale, y: fy * scale, z: fz * scale };
  };
  const logoMesh = () => {
    const NU = 16;
    const NV = 12;
    return surfaceMesh(
      NU,
      NV,
      flagAt,
      (i, j) => {
        const u = (i + 0.5) / NU;
        const v = (j + 0.5) / NV;
        const gap = 0.05;
        if (Math.abs(u - 0.5) < gap || Math.abs(v - 0.5) < gap) return null;
        // rounded outer corners: drop cells outside a rounded square
        const cu = Math.abs(u - 0.5) * 2;
        const cv = Math.abs(v - 0.5) * 2;
        const r = 0.42;
        if (cu > 1 - r && cv > 1 - r) {
          const dx = cu - (1 - r);
          const dy = cv - (1 - r);
          if (dx * dx + dy * dy > r * r) return null;
        }
        const pane = (v >= 0.5 ? 0 : 2) + (u >= 0.5 ? 1 : 0);
        return cycled(XP_FLAG[pane], pane * 90);
      },
      true,
    );
  };

  /** Explode: a sphere of small shards that burst, hang, and come home. */
  const RINGS = Math.max(8, Math.round(res * 1.1));
  const SEGS = RINGS * 2;
  const shards = [];
  for (let i = 0; i < RINGS; i++)
    for (let j = 0; j < SEGS; j++) {
      const p0 = (i / RINGS) * Math.PI;
      const p1 = ((i + 1) / RINGS) * Math.PI;
      const a0 = (j / SEGS) * Math.PI * 2;
      const a1 = ((j + 1) / SEGS) * Math.PI * 2;
      const pt = (p, a) => ({
        x: Math.sin(p) * Math.cos(a),
        y: Math.cos(p),
        z: Math.sin(p) * Math.sin(a),
      });
      const quad = [pt(p0, a0), pt(p1, a0), pt(p1, a1), pt(p0, a1)];
      for (const tri of [
        [quad[0], quad[1], quad[2]],
        [quad[0], quad[2], quad[3]],
      ]) {
        const c = {
          x: (tri[0].x + tri[1].x + tri[2].x) / 3,
          y: (tri[0].y + tri[1].y + tri[2].y) / 3,
          z: (tri[0].z + tri[1].z + tri[2].z) / 3,
        };
        shards.push({
          tri,
          c: v3.norm(c),
          axis: v3.norm({
            x: Math.random() - 0.5,
            y: Math.random() - 0.5,
            z: Math.random() - 0.5,
          }),
          spin: (Math.random() - 0.5) * 8,
          far: 0.45 + Math.random() * 0.5,
        });
      }
    }
  const rotateAbout = (p, axis, ang) => {
    // Rodrigues' rotation
    const c = Math.cos(ang);
    const s2 = Math.sin(ang);
    const k = axis;
    const kxp = v3.cross(k, p);
    const kdp = v3.dot(k, p);
    return {
      x: p.x * c + kxp.x * s2 + k.x * kdp * (1 - c),
      y: p.y * c + kxp.y * s2 + k.y * kdp * (1 - c),
      z: p.z * c + kxp.z * s2 + k.z * kdp * (1 - c),
    };
  };
  const explodeMesh = () => {
    // 6 s cycle: whole for a moment, out fast, hang, then drawn back in
    const cyc = (t % 6) / 6;
    let burst;
    if (cyc < 0.07) burst = 0;
    else if (cyc < 0.4) burst = 1 - Math.pow(1 - (cyc - 0.07) / 0.33, 3);
    else if (cyc < 0.62) burst = 1;
    else burst = 1 - ease((cyc - 0.62) / 0.38);
    const m = { verts: [], faces: [] };
    m.twoSided = true;
    const color = cycled([230, 30, 30], 0);
    const R = 0.75 * scale;
    for (const sh of shards) {
      const out = burst * sh.far * scale;
      const ang = burst * sh.spin;
      const base = m.verts.length;
      for (const p of sh.tri) {
        // spin the shard about its own centre, then carry it outward
        const local = v3.sub(p, sh.c);
        const spun = rotateAbout(local, sh.axis, ang);
        m.verts.push({
          x: (sh.c.x + spun.x) * R + sh.c.x * out,
          y: (sh.c.y + spun.y) * R + sh.c.y * out,
          z: (sh.c.z + spun.z) * R + sh.c.z * out,
        });
      }
      m.faces.push({ idx: [base, base + 1, base + 2], color });
    }
    return m;
  };

  /** Ribbon: a band on an undulating loop; Twist: a strip twisted on its axis. */
  const ribbonMesh = (phase, color) =>
    Object.assign(
      surfaceMesh(
        res * 3,
        1,
        (u, v) => {
          const a = u * Math.PI * 2;
          const side = v * 2 - 1;
          const wob = Math.sin(a * 2 + phase) * 0.55;
          const width = 0.34 * scale;
          return {
            x: Math.cos(a) * 1.25 * scale + Math.cos(phase) * width * side,
            y: wob * scale,
            z:
              Math.sin(a) * 1.25 * scale +
              Math.sin(phase) * width * side * 0.35,
          };
        },
        () => color,
        true,
      ),
      { specular: 0.5 },
    );
  const twistMesh = () =>
    surfaceMesh(
      res * 3,
      1,
      (u, v) => {
        const x = (u - 0.5) * 3.2 * scale;
        const side = v * 2 - 1;
        const roll = u * Math.PI * 3 + t * 2.2;
        const width = 0.45 * scale;
        return {
          x,
          y: Math.cos(roll) * width * side,
          z: Math.sin(roll) * width * side,
        };
      },
      (i, j, NU) => cycled(hsl((i / NU) * 300, 0.85, 0.55), (i / NU) * 300),
      true,
    );

  /** Splash: a thick disc, a drop, and the ripple the drop makes. */
  const splashMesh = () => {
    const cyc = t % 3.6;
    const fall = Math.min(1, cyc / 1.1); // the drop falls for 1.1 s
    const since = Math.max(0, cyc - 1.1); // the ripple runs from the hit
    const Rd = 1.35 * scale;
    const Hd = 0.36 * scale;
    const ripple = r => {
      if (since <= 0) return 0;
      const front = since * 1.6; // the crest travels outward
      const d = r / Rd - front;
      const amp = 0.11 * Math.exp(-since * 1.1) * Math.exp(-(d * d) * 14);
      return amp * Math.cos(d * 22) * scale;
    };
    const top = surfaceMesh(
      10,
      res * 2,
      (u, v) => {
        const r = u * Rd;
        const a = -v * Math.PI * 2; // wound so the top's normal points up
        return {
          x: Math.cos(a) * r,
          y: Hd / 2 + ripple(r),
          z: Math.sin(a) * r,
        };
      },
      () => cycled([120, 80, 225], 0),
      true,
    );
    const side = surfaceMesh(
      1,
      res * 2,
      (u, v) => {
        const a = v * Math.PI * 2;
        return {
          x: Math.cos(a) * Rd,
          y: Hd / 2 - u * Hd,
          z: Math.sin(a) * Rd,
        };
      },
      () => cycled([35, 55, 215], 0),
      true,
    );
    const dropY = Hd / 2 + (1 - ease(fall)) * 1.7 * scale + 0.12 * scale;
    const drop = sphere(0.13 * scale, 6, 10, [240, 240, 255]);
    return { top, side, drop, dropY, dropShown: cyc < 1.15 };
  };

  return {
    resize(nw, nh) {
      W = nw;
      H = nh;
    },
    frame(ctx, dt) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      const step = Math.min(dt, 0.1);
      t += step;

      // the flight: a slow drift that turns around at the edges of the view
      const fov = Math.min(W, H) * 0.9;
      const reach = 1.9 * scale;
      const halfX = Math.max(0, (W / 2 / fov) * DIST - reach);
      const halfY = Math.max(0, (H / 2 / fov) * DIST - reach);
      pos.x += vel.x * step;
      pos.y += vel.y * step;
      if (pos.x > halfX || pos.x < -halfX) {
        pos.x = Math.max(-halfX, Math.min(halfX, pos.x));
        vel.x = -vel.x;
      }
      if (pos.y > halfY || pos.y < -halfY) {
        pos.y = Math.max(-halfY, Math.min(halfY, pos.y));
        vel.y = -vel.y;
      }
      const view = mat.multiply(
        mat.multiply(
          mat.rotateY(t * 0.7),
          mat.rotateX(Math.sin(t * 0.5) * 0.5),
        ),
        mat.translate(pos.x, pos.y, DIST),
      );
      renderer.begin();

      if (o.style === 'ribbon' || o.style === 'tworibbons') {
        const count = o.style === 'tworibbons' ? 2 : 1;
        const colors = [
          [110, 165, 255],
          [255, 120, 120],
        ];
        for (let i = 0; i < count; i++)
          renderer.add(
            ribbonMesh(t * 1.4 + i * Math.PI, cycled(colors[i], i * 180)),
            view,
          );
      } else if (o.style === 'twist') {
        renderer.add(twistMesh(), view);
      } else if (o.style === 'explode') {
        renderer.add(explodeMesh(), view);
      } else if (o.style === 'splash') {
        const { top, side, drop, dropY, dropShown } = splashMesh();
        // the disc turns as it flies but stays seen from above, as the
        // original presents it — no nodding
        const tilt = mat.multiply(
          mat.multiply(mat.rotateY(t * 0.7), mat.rotateX(-0.5)),
          mat.translate(pos.x, pos.y, DIST),
        );
        renderer.add(side, tilt);
        renderer.add(top, tilt);
        if (dropShown)
          renderer.add(drop, mat.multiply(mat.translate(0, dropY, 0), tilt));
      } else if (o.style === 'flag') {
        // the textured flag, shaded in the logo's colours for want of a bitmap
        renderer.add(
          surfaceMesh(
            res * 2,
            res,
            flagAt,
            (i, j) => cycled(XP_FLAG[(i + j) % 4], ((i + j) % 4) * 90),
            true,
          ),
          view,
        );
      } else {
        renderer.add(logoMesh(), view);
      }

      renderer.end(ctx, W, H, fov);
    },
  };
}
