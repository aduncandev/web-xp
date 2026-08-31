/*
 * Dark Fountain — Deltarune's, as it towers over the party at the end of a
 * chapter when they walk up to seal it.
 *
 * The look IS the game's own fountain sprite: the six "Large" frames of
 * the ripped sheet, played as the flipbook they are — the column with its
 * wavy edge lines and a crescent that jumps up it frame by frame, the way
 * sprites move — scaled to the pane's height and stepping at the game's
 * own rate (image_speed 0.2 at 30 fps: six frames a second). The
 * frames are drawn in their own three colours, which the music retints:
 * the level lifts the indigo from the dark blue-grey of the arena frames
 * toward the sprite's own #413abe.
 *
 * It has a life, and both ends of it follow the game's decompiled code:
 *  - Made when the music starts (obj_kris_fountain, Chapter 2's ending): a
 *    white ellipse on the floor doubles in width every frame, then halves
 *    in width while tripling in height into a white pillar; it holds, its
 *    inside goes to black leaving white rims, flat flash-rings spread at its
 *    foot, and the rims open out into the walls.
 *  - Sealed when the music stops (obj_darkfountain_event, Chapter 1): the
 *    SOUL — the game's own 16x16 red heart, pixel for pixel from the sprite
 *    sheet, at the game's size — rises slowly into the fountain inside a white
 *    glow that blooms from three stacked copies (the event object's draw),
 *    while the fountain whitens and its flow fades; the scrolling winds
 *    down, eleven concentric white bands spread from the centre, then the
 *    whiteout and the fade to black.
 *  The making runs at about 3x the game's pace. The sealing runs at the
 *  game's OWN pace — 21 seconds, because its sound is the twelve-second
 *  snd_usefountain, fired at the event's frame 20, with snd_revival landing
 *  where the white bands begin (frame 390) right as it ends. The making has
 *  snd_fountain_make under it, stopped once the fountain stands.
 *
 * Music: the level lifts the colour; a kick glints the edge lines cyan and
 * the column breathes with the bass.
 *
 * And once the fountain is sealed and the dark has settled, every egg the
 * user has taken from ROOM_MAN drops in and lands in a heap at the foot.
 * Only then — never before something has played — and the heap is swept
 * away by the next fountain.
 */
import { stateFor, band, beat } from './vizCore';
import fountainStrip from 'assets/deltarune/fountain-large.png';
import { playSound } from '../../sounds';
import sndUseFountain from 'assets/sounds/deltarune/snd_usefountain.ogg';
import sndRevival from 'assets/sounds/deltarune/snd_revival.ogg';
import sndFountainMake from 'assets/sounds/deltarune/snd_fountain_make.ogg';
import eggImg from 'assets/windowsIcons/egg.png';

const DF = {
  black: [0, 0, 0],
  dark: [0x27, 0x29, 0x3f],
  purple: [0x2b, 0x24, 0x4d],
  indigo: [0x41, 0x3a, 0xbe],
  cyan: [0x79, 0xe6, 0xea],
  white: [255, 255, 255],
};
const TAU = Math.PI * 2;
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, a)})`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// The SOUL: spr_heart, 16x16, pixel for pixel from the game's sheet. It is
// drawn on the screen canvas, not the chunky buffer, at the game's own
// scale — one sprite pixel per 480 screen pixels of height, as the game
// scales its 640x480 room — so it stays small.
const SOUL = [
  '..XXX......XXX..',
  '.XXXXX....XXXXX.',
  'XXXXXXX..XXXXXXX',
  'XXXXXXX..XXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  '..XXXXXXXXXXXX..',
  '..XXXXXXXXXXXX..',
  '....XXXXXXXX....',
  '....XXXXXXXX....',
  '......XXXX......',
  '......XXXX......',
];
function drawSoul(ctx, x, y, px) {
  const left = Math.round(x - (SOUL[0].length * px) / 2);
  const top = Math.round(y - (SOUL.length * px) / 2);
  ctx.fillStyle = '#ff0000';
  SOUL.forEach((row, r) => {
    for (let c = 0; c < row.length; c++)
      if (row[c] === 'X') ctx.fillRect(left + c * px, top + r * px, px, px);
  });
}

/* ---- the eggs ----------------------------------------------------------- */
// ROOM_MAN's egg, 18x21, drawn at the same pixel scale as the SOUL
const EGG_W = 18;
const EGG_H = 21;
const eggSprite = new Image();
eggSprite.src = eggImg;

/**
 * The heap is physics, kept cheap: eggs are circles, gravity pulls them,
 * they bounce off the floor, the walls and each other (inelastically, so
 * they settle), and a uniform grid keeps the pair checks near-linear in
 * the count. Eggs that have come to rest go to sleep and cost nothing.
 * Hundreds of eggs are a few thousand distance checks a frame — a fraction
 * of what the 3D screensavers do.
 */
function stepHeap(heap, w, h, dt, pointer) {
  const { r, bodies } = heap;
  // Dragging: press on an egg to pick it up; it follows the pointer and
  // keeps the pointer's speed when let go, so it can be thrown.
  const held = bodies.find(b => b.held);
  if (pointer && pointer.down && pointer.inside) {
    if (!held) {
      let best = null;
      let bestD = r * 1.6;
      for (const b of bodies) {
        const d = Math.hypot(b.x - pointer.x, b.y - pointer.y);
        if (d < bestD) {
          bestD = d;
          best = b;
        }
      }
      if (best) {
        best.held = true;
        best.asleep = false;
        best.hx = pointer.x;
        best.hy = pointer.y;
      }
    } else {
      held.vx = (pointer.x - held.hx) / dt;
      held.vy = (pointer.y - held.hy) / dt;
      held.x = pointer.x;
      held.y = pointer.y;
      held.hx = pointer.x;
      held.hy = pointer.y;
    }
  } else if (held) {
    held.held = false;
  }
  const floor = h - 1;
  const G = h * 2.4; // px/s^2, scaled to the frame so the fall reads the same
  const sub = 2;
  const sdt = dt / sub;
  const cell = r * 2;
  const cols = Math.max(1, Math.ceil(w / cell));
  for (let k = 0; k < sub; k++) {
    // integrate
    for (const b of bodies) {
      if (b.asleep || b.held) continue;
      b.vy += G * sdt;
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;
      b.ground = false;
      if (b.y + r > floor) {
        b.y = floor - r;
        if (b.vy > 0) b.vy = -b.vy * 0.2;
        b.vx *= 0.8; // the floor is not slippery
        b.ground = true;
      }
      if (b.x - r < 0) {
        b.x = r;
        b.vx = Math.abs(b.vx) * 0.4;
      } else if (b.x + r > w) {
        b.x = w - r;
        b.vx = -Math.abs(b.vx) * 0.4;
      }
    }
    // collide: bucket by cell, then each egg against its 3x3 neighbourhood
    const grid = new Map();
    bodies.forEach((b, i) => {
      const key = Math.floor(b.x / cell) + cols * Math.floor(b.y / cell);
      const list = grid.get(key);
      if (list) list.push(i);
      else grid.set(key, [i]);
    });
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      const cx = Math.floor(a.x / cell);
      const cy = Math.floor(a.y / cell);
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          const list = grid.get(cx + ox + cols * (cy + oy));
          if (!list) continue;
          for (const j of list) {
            if (j <= i) continue;
            const b = bodies[j];
            const fixA = a.asleep || a.held;
            const fixB = b.asleep || b.held;
            if (fixA && fixB) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            const min = r * 2;
            if (d2 >= min * min || d2 === 0) continue;
            const d = Math.sqrt(d2);
            const nx = dx / d;
            const ny = dy / d;
            // push apart, half each (a sleeper stays put)
            const over = (min - d) * 0.5;
            const wa = fixA ? 0 : fixB ? 1 : 0.5;
            a.x -= nx * over * 2 * wa;
            a.y -= ny * over * 2 * wa;
            b.x += nx * over * 2 * (1 - wa);
            b.y += ny * over * 2 * (1 - wa);
            // exchange the closing velocity along the normal, losing most of it
            const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rel < 0) {
              const jn = -rel * (1 + 0.1) * 0.5;
              a.vx -= nx * jn;
              a.vy -= ny * jn;
              b.vx += nx * jn;
              b.vy += ny * jn;
              // and friction across the contact, so they heap rather than
              // skate off one another
              const tx = -ny;
              const ty = nx;
              const relT = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
              const jt = relT * 0.3 * 0.5;
              a.vx += tx * jt;
              a.vy += ty * jt;
              b.vx -= tx * jt;
              b.vy -= ty * jt;
              if (a.asleep && Math.abs(rel) > h * 0.1) a.asleep = false;
              if (b.asleep && Math.abs(rel) > h * 0.1) b.asleep = false;
            }
          }
        }
    }
    // roll: an egg on the ground turns with its travel; in the air it
    // keeps turning, slowing. Settling is just damping — the pile stays
    // live so it can be pushed about — unless the frame rate is hurting,
    // in which case resting eggs are put to sleep to save the work.
    for (const b of bodies) {
      if (b.held) continue;
      if (b.ground) b.spin += (b.vx / r - b.spin) * 0.4;
      else b.spin *= 0.995;
      b.ang += b.spin * sdt;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed < h * 0.02) {
        b.vx *= 0.9;
        b.vy *= 0.9;
        b.rest += sdt;
      } else b.rest = 0;
      if (heap.lagging && b.rest > 0.35 && !b.asleep) {
        b.asleep = true;
        b.vx = 0;
        b.vy = 0;
      }
    }
  }
}

/* ---- sound ------------------------------------------------------------ */
// The scene's sounds live on the scene. A watchdog quiets them if the draw
// loop stops (visualization switched, pane closed) — a plain module has no
// other way to hear about that.
function cue(sc, src, opts) {
  const audio = playSound(src, opts);
  if (!audio) return null;
  sc.audio.push(audio);
  if (!sc.watch)
    sc.watch = setInterval(() => {
      sc.audio = sc.audio.filter(a => !a.ended);
      if (performance.now() - sc.lastDraw > 400) hush(sc);
      if (!sc.audio.length) {
        clearInterval(sc.watch);
        sc.watch = null;
      }
    }, 250);
  return audio;
}
function hush(sc) {
  for (const a of sc.audio) {
    try {
      a.pause();
      a.src = '';
    } catch {
      // already gone
    }
  }
  sc.audio = [];
  sc.music = null;
  sc.spawn = null;
}
// ease a sound out and drop it once it is gone; true while still audible
function fadeOut(audio, by) {
  const g = Number(audio.dataset.gain) * by;
  audio.dataset.gain = String(g);
  audio.volume = Math.min(audio.volume, Math.max(0, g));
  if (g < 0.005) {
    audio.pause();
    return false;
  }
  return true;
}

// The making, in our frames. The game's event runs at 30fps and is over in
// a blink; this keeps its shape — the ellipse doubling, the pillar halving
// and tripling, the hold, the darkening, the opening — at an easier pace,
// with the stabbing flickers that precede it.
const CREATE = {
  ellipse: 30, // the flat ellipse on the floor, doubling every other frame
  pillar: 44, // halving in width, tripling in height
  hold: 56, // the white pillar stands
  darken: 150, // its inside goes to black
  open: 250, // the rims open out into the walls
  end: 360,
};

// The sealing, in our frames. snd_usefountain — the twelve-second sound of
// the scene — starts the moment the music is gone; under it the fountain
// flows on, the SOUL's glow blooms at the foot and it rises into the
// column; ten seconds in the SOUL seals it: snd_revival, the whitening,
// the flow winding down and the white bands all land together, then the
// whiteout and the dark follow at the event object's spacing (doubled
// for 60fps: white 120 after the revival, dark 260, over at 520).
const SEAL = {
  sound: 0, // snd_usefountain
  bloom: 120, // the SOUL's glow blooms at the foot
  riseFrom: 180,
  riseTo: 570, // ...and it is in the middle of the column by here
  seal: 600, // ten seconds in: snd_revival, the SOUL seals the fountain
  white: 720,
  black: 860,
};
const SEAL_END = 1120;

// The strip: six frames, 96x240 each, three colours. Split once into
// layers per frame — the black body, the indigo edge lines, the indigo
// inside (the crescent and specks), the purple flecks — each a white
// mask, so the music can tint them. The edge line is, on every row, the
// outermost run of indigo from each side: the crescent's curves reach the
// walls in places and sit right inside that run, and must stay body.
const FRAME_W = 96;
const FRAME_H = 240;
const FRAMES = 6;
const EDGE_RUN = 5; // an edge line is the outermost indigo run, this wide at most
let LAYERS = null;
function loadLayers() {
  if (LAYERS !== null) return;
  LAYERS = false;
  const img = new Image();
  img.onload = () => {
    const src = document.createElement('canvas');
    src.width = img.width;
    src.height = img.height;
    const g = src.getContext('2d');
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, img.width, img.height).data;
    const layers = { black: [], edge: [], body: [], purple: [], solid: [] };
    for (let fi = 0; fi < FRAMES; fi++) {
      const make = () => {
        const c = document.createElement('canvas');
        c.width = FRAME_W;
        c.height = FRAME_H;
        return { c, d: c.getContext('2d').createImageData(FRAME_W, FRAME_H) };
      };
      const L = {
        black: make(),
        edge: make(),
        body: make(),
        purple: make(),
        solid: make(), // the whole column, for the making
      };
      const kind = (x, y) => {
        const o = (fi * FRAME_W + x + y * img.width) * 4;
        if (data[o + 3] < 128) return null;
        if (data[o] === 0 && data[o + 2] === 0) return 'black';
        return data[o + 2] > 150 ? 'indigo' : 'purple';
      };
      for (let y = 0; y < FRAME_H; y++) {
        // the edge runs on this row: the first indigo from each side
        const edge = new Set();
        for (const dir of [1, -1]) {
          let x = dir > 0 ? 0 : FRAME_W - 1;
          while (x >= 0 && x < FRAME_W && kind(x, y) !== 'indigo') x += dir;
          for (let n = 0; n < EDGE_RUN && kind(x, y) === 'indigo'; n++) {
            edge.add(x);
            x += dir;
          }
        }
        for (let x = 0; x < FRAME_W; x++) {
          const k = kind(x, y);
          if (!k) continue;
          const which = k === 'indigo' ? (edge.has(x) ? 'edge' : 'body') : k;
          const q = (y * FRAME_W + x) * 4;
          for (const px of [L[which].d.data, L.solid.d.data]) {
            px[q] = 255;
            px[q + 1] = 255;
            px[q + 2] = 255;
            px[q + 3] = 255;
          }
        }
      }
      for (const k of Object.keys(L)) {
        L[k].c.getContext('2d').putImageData(L[k].d, 0, 0);
        layers[k].push(L[k].c);
      }
    }
    LAYERS = layers;
  };
  img.src = fountainStrip;
}
// start the strip loading as soon as the module does, so the first fountain
// made after the visualization is picked is not made blind
loadLayers();
// a mask, coloured: drawn into a scratch frame, then flooded through it
const scratch = document.createElement('canvas');
scratch.width = FRAME_W;
scratch.height = FRAME_H;
function tinted(mask, style) {
  const g = scratch.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, FRAME_W, FRAME_H);
  g.drawImage(mask, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = style;
  g.fillRect(0, 0, FRAME_W, FRAME_H);
  g.globalCompositeOperation = 'source-over';
  return scratch;
}

// Everything is sized in buffer pixels against this unit — the height of the
// buffer at the player's default pane — NOT as a fraction of the frame. A
// bigger window therefore shows more of the fountain (more curtains, dark
// either side of a column of fixed width) rather than the same picture blown
// up into blobs.
const R = 150;

export function darkFountain(ctx, freq, wave, w, h, opts, info) {
  const state = stateFor(ctx.canvas);
  const energy = band(freq, 0, 0.35);
  const treble = band(freq, 0.35, 0.8);
  const mids = band(freq, 0.1, 0.35);
  const { hit, bass } = beat(state, freq, 8);

  // the pixel buffer: a fraction of the canvas, blown up unsmoothed
  const S = clamp(Math.round(Math.min(w, h) / 150), 2, 3);
  const pw = Math.ceil(w / S);
  const ph = Math.ceil(h / S);
  if (!state.px) state.px = document.createElement('canvas');
  if (state.px.width !== pw || state.px.height !== ph) {
    state.px.width = pw;
    state.px.height = ph;
  }
  const p = state.px.getContext('2d');
  const cx = pw / 2;

  /* ---- lifecycle ----------------------------------------------------- */
  // Made when the music starts, sealed when it stops. The player says
  // whether it is playing — a quiet passage in a song is not the end of it;
  // the spectrum only stands in when the player has not said. A second and
  // a quarter's debounce covers the gap between tracks.
  const live =
    info && typeof info.playing === 'boolean'
      ? info.playing
      : !!freq && band(freq, 0, 0.6) > 0.004;
  // The scene's clock is wall time, counted in frames-at-60 so the tables
  // below read like the game's — requestAnimationFrame ticks at whatever
  // the monitor refreshes at (this was written against a 240 Hz one, where
  // a tick-counted ten seconds came out as two and a half).
  const now = performance.now();
  const step = state.scene
    ? clamp(((now - state.scene.lastDraw) / 1000) * 60, 0.2, 4)
    : 1;
  state.dfQuiet = live ? 0 : (state.dfQuiet || 0) + step;
  if (!state.scene)
    state.scene = {
      phase: live ? 'create' : 'void',
      f: 0, // frames into the phase
      flip: 0, // the flipbook's frame clock
      ghost: 0, // the edge ghosts' swing
      sway: 0, // the column's lean, a wave travelling up it
      swayPhase: 0,
      surge: 0, // how much taller the bass has pulled it
      echo: 0, // a kick's after-image of the crescent
      sparks: [],
      breath: 0,
      flashes: [],
      slow: 0,
      whiten: 0,
      flow: 1,
      gs: 0, // the glow's own clock
      rs: 0, // the revival bands' spread
      audio: [],
      heap: null, // the eggs, once the fountain is sealed
      music: null,
      spawn: null,
      watch: null,
      lastDraw: 0,
      abort: null,
    };
  const sc = state.scene;
  sc.lastDraw = now;
  sc.f += step;
  // did the clock pass this mark on this very tick? (a reset to 0 counts)
  const crossed = mark => sc.f >= mark && sc.f - step < mark;
  if (sc.phase === 'void' && live) {
    sc.heap = null; // a new fountain sweeps the heap away
    sc.phase = 'create';
    sc.f = 0;
    sc.flip = 0;
    sc.sparks = [];
    sc.whiten = 0;
    sc.flow = 1;
    sc.slow = 0;
    sc.flashes = [];
  } else if (sc.phase === 'create' && sc.f >= CREATE.end) {
    sc.phase = 'live';
    sc.f = 0;
  } else if (sc.phase === 'live' && state.dfQuiet > 75) {
    sc.phase = 'seal';
    sc.f = 0;
    sc.gs = 0;
    sc.rs = 0;
    sc.slow = 0;
    sc.whiten = 0;
    sc.flow = 1;
    sc.abort = null;
  } else if (sc.phase === 'seal' && sc.f >= SEAL_END) {
    sc.phase = 'void';
    sc.f = 0;
    hush(sc);
    // the dark has settled: the eggs come out
    const eggs = info && Number.isFinite(info.eggs) ? info.eggs : 0;
    sc.heap =
      eggs > 0 ? { eggs: Math.min(eggs, 1000), since: 0, bodies: [] } : null;
  }
  // a track starting mid-seal: the sound ducks and the scene cuts to dark,
  // and the fountain is made again from there
  if (sc.phase === 'seal' && live && sc.abort == null) sc.abort = 0;
  if (sc.abort != null) {
    sc.abort += step;
    if (sc.music && !fadeOut(sc.music, Math.pow(0.8, step))) sc.music = null;
    if (sc.abort >= 14) {
      sc.phase = 'void';
      sc.f = 0;
      sc.abort = null;
      hush(sc);
    }
  }
  const { phase, f } = sc;

  // the soundtrack of each end of the life, where the game fires it
  if (phase === 'create' && crossed(CREATE.ellipse))
    sc.spawn = cue(sc, sndFountainMake, { gain: 0.45 });
  if (
    phase !== 'create' &&
    sc.spawn &&
    !fadeOut(sc.spawn, Math.pow(0.93, step))
  )
    sc.spawn = null;
  if (phase === 'seal') {
    if (crossed(SEAL.sound)) sc.music = cue(sc, sndUseFountain, { gain: 0.7 });
    if (crossed(SEAL.seal)) cue(sc, sndRevival, { gain: 0.6 });
  }

  /* ---- colours ------------------------------------------------------- */
  // the level lifts the bands from the scene's blue-grey toward the indigo
  const lift = Math.min(1, energy * 1.5);
  const bg = DF.black;
  let ink = mix(DF.dark, DF.indigo, lift);

  // The sprite's column fills the pane's height and sits in the middle of
  // its width, the dark either side — the fountain as the game draws it.
  loadLayers();
  const kS = ph / FRAME_H;
  const colFull = FRAME_W * kS;
  let open = 1; // how far the column has opened out from the centre line
  let rim = 0; // 1 while the edges are still the new pillar's white rims
  let inner = null; // a flat fill between the rims, for the making
  let flowAlpha = 1; // the crescent's presence
  let shake = 0;
  const pillarHalf = 0.16 * colFull;

  if (phase === 'create') {
    // the pillar stands from `hold`; its inside goes dark from `darken`;
    // from `open` the rims open out into the walls and the flow starts up
    const o = ease((f - CREATE.open) / (CREATE.end - CREATE.open));
    open = (2 * pillarHalf) / colFull + (1 - (2 * pillarHalf) / colFull) * o;
    rim = 1 - o;
    flowAlpha = o;
    const dark = ease((f - CREATE.darken) / (CREATE.open - CREATE.darken));
    inner = f < CREATE.open ? mix(DF.white, DF.black, dark) : null;
    if (f < CREATE.ellipse) shake = 1;
    else if (f < CREATE.hold + 20) shake = 2;
  } else if (phase === 'seal') {
    // from the seal the fountain whitens (6% a game frame), its flow fades
    // (x0.98) and its motion winds down
    if (f > SEAL.seal) {
      sc.whiten = 1 - (1 - sc.whiten) * Math.pow(0.97, step);
      sc.flow *= Math.pow(0.975, step);
      sc.slow = Math.min(1, sc.slow + 0.01 * step);
    }
    flowAlpha = sc.flow; // the inside goes; only the sides whiten
  }
  // The column breathes with the bass; a kick glints its edge lines cyan
  // and snaps the flipbook on a frame, so the crescent jumps with the beat.
  sc.breath += (bass * 0.1 - sc.breath) * Math.min(1, 0.3 * step);
  state.dfGlint = (state.dfGlint || 0) * Math.pow(0.86, step);
  if (phase === 'live' && hit) {
    state.dfGlint = Math.max(state.dfGlint, Math.min(1, 0.35 + bass));
    sc.flip = Math.floor(sc.flip) + 1;
  }
  // The seal-room fountain draws its outline twice more, at +/-12px * sin,
  // at half alpha; here that swing is the bass's — a faint shimmer when it
  // is quiet, the edges ghosting well out on a heavy passage.
  sc.ghost += (0.08 + bass * 0.25) * step;
  const ghostPx = (2 + bass * 10) * Math.sin(sc.ghost);
  const ghostA = 0.25 + Math.min(0.5, bass * 0.9);
  // The mids lean the column into a wave that travels up it; the bass
  // pulls it taller for a moment; a strong kick leaves a fading echo of
  // the crescent a frame ahead.
  sc.sway += (mids * 1.0 - sc.sway) * Math.min(1, 0.2 * step);
  sc.swayPhase += (0.06 + mids * 0.12) * step;
  sc.surge += (bass * 0.08 - sc.surge) * Math.min(1, 0.35 * step);
  sc.echo *= Math.pow(0.88, step);
  if (phase === 'live' && hit && bass > 0.35) sc.echo = Math.min(1, bass);
  const colW = colFull * open * (1 + sc.breath);
  const rate =
    (phase === 'seal' ? 1 - sc.slow : 1) * (phase === 'void' ? 0 : 1);
  // The flipbook's rate. The game's castle fountain is drawn by
  // obj_ralsei_runevent with image_speed 0.2 at 30 fps — six frames a
  // second — and that is its rate under music of ordinary loudness, pushed
  // a few frames faster by a loud passage and let down to three by a quiet
  // one, the same three it idles at with nothing playing. The seal's
  // wind-down slows it to a stop.
  const wantFps = live ? 3 + Math.min(1, energy * 2.2) * 6.5 : 3;
  sc.fps =
    sc.fps == null
      ? wantFps
      : sc.fps + (wantFps - sc.fps) * Math.min(1, 0.08 * step);
  sc.flip += (sc.fps / 60) * step * rate;
  const frame = Math.floor(sc.flip) % FRAMES;

  /* ---- the scene ----------------------------------------------------- */
  p.fillStyle = rgb(bg);
  p.fillRect(0, 0, pw, ph);

  const drawn = phase !== 'void' && !(phase === 'create' && f < CREATE.hold);
  const x0 = cx - colW / 2;

  if (drawn && LAYERS) {
    // The column is the sprite's frame, layer by layer, each in the
    // music's colour. While it is being made it is that same silhouette,
    // squeezed to the pillar's width: all white, then dark inside with
    // white rims — the rims made by drawing the silhouette a pixel wider
    // underneath, so they follow its wavy sides at any width — and then
    // opening out, the rims giving way to the sprite's own edge lines.
    const dx = Math.round(x0);
    const dw = Math.max(2, Math.round(colW));
    p.imageSmoothingEnabled = false;
    // The frame is drawn in horizontal slices so the column can lean: each
    // slice shifts sideways on a wave running up the column, its reach set
    // by the mids. The surge stretches the whole thing up from its foot.
    const SLICES = 12;
    const lean = phase === 'live' ? sc.sway * 0.09 * colFull : 0;
    const tall = 1 + (phase === 'live' ? sc.surge : 0);
    const put = (img, x = dx, wdt = dw, up = 0) => {
      const sh = FRAME_H / SLICES;
      const dh = (ph * tall) / SLICES;
      for (let i = 0; i < SLICES; i++) {
        const yy = i / SLICES;
        const off = Math.round(
          lean * Math.sin(yy * 5 - sc.swayPhase) * (1 - yy),
        );
        p.drawImage(
          img,
          0,
          i * sh,
          FRAME_W,
          sh + 0.5,
          x + off,
          ph - (SLICES - i) * dh - up,
          wdt,
          dh + 0.5,
        );
      }
    };
    const rims = inner ? 1 : rim;
    if (rims > 0)
      put(tinted(LAYERS.solid[frame], rgba(DF.white, rims)), dx - 1, dw + 2);
    put(
      tinted(
        inner ? LAYERS.solid[frame] : LAYERS.black[frame],
        inner ? rgb(inner) : '#000',
      ),
    );
    if (!inner) {
      const edgeInk = mix(ink, DF.white, Math.max(rim, sc.whiten || 0));
      if (phase === 'live' && Math.abs(ghostPx) > 0.3) {
        const g = Math.round(ghostPx * kS);
        put(tinted(LAYERS.edge[frame], rgba(edgeInk, ghostA)), dx + g, dw);
        put(tinted(LAYERS.edge[frame], rgba(edgeInk, ghostA)), dx - g, dw);
      }
      put(tinted(LAYERS.edge[frame], rgb(edgeInk)));
      if (flowAlpha > 0.02) {
        // the crescent's colour tilts toward the cyan on bright highs
        const bodyInk = mix(ink, DF.cyan, Math.min(0.45, treble * 0.6));
        if (sc.echo > 0.05)
          put(
            tinted(
              LAYERS.body[(frame + 1) % FRAMES],
              rgba(bodyInk, sc.echo * 0.45 * flowAlpha),
            ),
            dx,
            dw,
            Math.round(ph * 0.04 * sc.echo),
          );
        put(tinted(LAYERS.body[frame], rgba(bodyInk, flowAlpha)));
        put(
          tinted(
            LAYERS.purple[frame],
            rgba(mix(ink, DF.purple, 0.6), flowAlpha),
          ),
        );
      }
      if (state.dfGlint > 0.04 && rim < 0.5)
        put(tinted(LAYERS.edge[frame], rgba(DF.cyan, state.dfGlint)));
    }
  }

  // Sparks off the foot of the column: the highs keep a steady rise of
  // them going, the level sets how many and how fast, and a kick throws a
  // burst. The brightest are the cyan of the sprite's inverted palette,
  // more of them the higher the top end.
  if (phase === 'live') {
    const want = Math.round(treble * 40 + energy * 14);
    const burst = hit ? 6 + Math.round(bass * 14) : 0;
    const spawn = (rate, vyBoost) => {
      const side = Math.random() < 0.5 ? -1 : 1;
      sc.sparks.push({
        x: cx + side * Math.random() * colW * 0.95,
        y: ph + 2,
        vy: -(0.5 + Math.random() * 1.2 + energy * 2.2 + vyBoost),
        vx: side * (0.05 + Math.random() * 0.3),
        life: 1,
        decay: 0.008 + Math.random() * 0.008,
        bright: Math.random() < 0.15 + treble * 0.7,
        big: Math.random() < rate,
      });
    };
    for (let i = sc.sparks.length; i < want && i < 90; i++) spawn(0.1, 0);
    for (let i = 0; i < burst && sc.sparks.length < 120; i++)
      spawn(0.4, 1.5 + bass * 2);
  }
  for (const sp of sc.sparks) {
    sp.y += sp.vy * step;
    sp.x += sp.vx * step;
    sp.vy *= Math.pow(0.995, step);
    sp.life -= sp.decay * step;
    if (sp.life <= 0) continue;
    p.fillStyle = rgba(sp.bright ? DF.cyan : ink, Math.min(1, sp.life * 1.2));
    const d = sp.big ? 2 : 1;
    p.fillRect(Math.round(sp.x), Math.round(sp.y), d, d);
  }
  sc.sparks = sc.sparks.filter(sp => sp.life > 0 && sp.y > -2);

  if (phase === 'create') {
    const baseY = ph - 1;
    if (f < CREATE.ellipse) {
      // the stabbing: flashes flicker about the foot before anything gives
      p.fillStyle = '#fff';
      for (let i = 0; i < 3; i++)
        if (Math.random() < 0.6)
          p.fillRect(
            Math.round(cx + (Math.random() - 0.5) * colFull * 0.5),
            Math.round(baseY - 2 - Math.random() * 0.1 * R),
            2 + Math.round(Math.random() * 3),
            1,
          );
    } else if (f < CREATE.pillar) {
      // the flat white ellipse on the floor, doubling every other frame
      const n = Math.floor((f - CREATE.ellipse) / 2);
      const hw = Math.min(0.45 * colFull, (Math.pow(2, n + 1) - 1) * 1.4);
      p.fillStyle = '#fff';
      p.beginPath();
      p.ellipse(cx, baseY, hw, 1.5, 0, 0, TAU);
      p.fill();
    } else if (f < CREATE.hold) {
      // halving in width, tripling in height: the pillar tears upward
      const n = (f - CREATE.pillar) / 2;
      const hw = Math.max(pillarHalf, 0.45 * colFull * Math.pow(0.5, n));
      const hh = Math.pow(3, n) * 1.4;
      p.fillStyle = '#fff';
      p.beginPath();
      p.ellipse(cx, baseY - hh / 2, hw + 2, hh / 2 + 1, 0, 0, TAU);
      p.fill();
    }
    // flash-rings spreading flat across the foot while the inside darkens
    if (f >= CREATE.darken && f < CREATE.open) {
      sc.flashTimer = (sc.flashTimer || 0) - step;
      if (sc.flashTimer <= 0) {
        sc.flashes.push({ age: 0 });
        sc.flashTimer = 6;
      }
    }
    for (const fl of sc.flashes) {
      fl.age += step;
      const a = 0.8 * Math.max(0, 1 - fl.age / 14);
      if (a <= 0) continue;
      p.fillStyle = rgba(DF.white, a);
      p.beginPath();
      p.ellipse(
        cx - 1,
        baseY - 1,
        0.15 * colFull * Math.pow(1.15, fl.age),
        Math.max(1, 0.03 * colFull * Math.pow(1.05, fl.age)),
        0,
        0,
        TAU,
      );
      p.fill();
    }
    sc.flashes = sc.flashes.filter(fl => fl.age < 14);
  }

  if (phase === 'seal') {
    // The SOUL rises from the foot of the frame to its middle — a distance
    // set by the frame, not the world unit, so a small pane does not throw
    // it off the top — inside the glow: three copies at the game's scales
    // and alphas, blooming out of nothing.
    if (f >= SEAL.bloom) sc.gs += 0.75 * step;
    const startY = ph - Math.min(0.1 * R, ph * 0.15);
    const endY = ph * 0.45;
    const span = SEAL.riseTo - SEAL.riseFrom;
    const rise =
      f > SEAL.riseFrom ? Math.min(f - SEAL.riseFrom, span) / span : 0;
    const gy =
      startY - (startY - endY) * rise - Math.max(0, f - SEAL.seal) * 0.02;
    // the glow sits just around the heart, whatever the pixel scale
    const soulPx = Math.max(1, Math.round(h / 480));
    const r0 = (10 * soulPx) / S;
    const orb = (scale, a) => {
      if (a <= 0 || scale <= 0) return;
      const r = r0 * scale;
      const grad = p.createRadialGradient(cx, gy, 0, cx, gy, r);
      grad.addColorStop(0, rgba(DF.white, Math.min(1, a)));
      grad.addColorStop(0.6, rgba(DF.white, Math.min(1, a) * 0.6));
      grad.addColorStop(1, rgba(DF.white, 0));
      p.fillStyle = grad;
      p.fillRect(cx - r, gy - r, r * 2, r * 2);
    };
    orb(1.6 + 0.1 * Math.sin(sc.gs / 4), sc.gs / 8);
    orb(sc.gs / 4, 1.6 - sc.gs / 16);
    orb(sc.gs / 8, 1.6 - sc.gs / 24);
    // the SOUL rides above the bands but under the white fade
    const under = clamp((f - SEAL.white) * 0.01, 0, 1);
    sc.soul =
      sc.gs > 4 && under < 1 ? { y: gy, px: soulPx, a: 1 - under } : null;
    if (f >= SEAL.seal) {
      // revival: concentric white bands spreading from the centre
      sc.rs += 0.25 * step;
      for (let i = 1; i < 12; i++) {
        const a = sc.rs / 16 - i / 12;
        if (a <= 0) continue;
        // the game's bands are sized to its 640-wide room: so to the pane
        const hw = (i * i + sc.rs * i) * (pw / 640);
        p.fillStyle = rgba(DF.white, Math.min(1, a));
        p.fillRect(cx - hw, 0, hw * 2, ph);
      }
    }
    const white = clamp((f - SEAL.white) * 0.01, 0, 1);
    if (white > 0) {
      p.fillStyle = rgba(DF.white, white);
      p.fillRect(0, 0, pw, ph);
    }
    let black = clamp((f - SEAL.black) * 0.005, 0, 1);
    if (sc.abort != null) black = Math.max(black, sc.abort / 12);
    if (black > 0) {
      p.fillStyle = rgba(DF.black, black);
      p.fillRect(0, 0, pw, ph);
    }
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgb(bg);
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  const sx = shake ? Math.round((Math.random() - 0.5) * shake * 2) * S : 0;
  const sy = shake ? Math.round((Math.random() - 0.5) * shake * 2) * S : 0;
  ctx.drawImage(state.px, 0, 0, pw, ph, sx, sy, w, h);
  ctx.imageSmoothingEnabled = true;
  if (phase === 'seal' && sc.soul) {
    ctx.globalAlpha = sc.soul.a;
    drawSoul(ctx, w / 2, sc.soul.y * S, sc.soul.px);
    ctx.globalAlpha = 1;
  }
  if (phase === 'void' && sc.heap && eggSprite.complete) {
    // the heap: eggs are let go one after another from above the frame,
    // around the middle, and the physics takes it from there
    const heap = sc.heap;
    const eh = 20; // a fixed size, whatever the pane
    const ew = Math.round((eh * EGG_W) / EGG_H);
    if (heap.w !== w || heap.h !== h) {
      // a resized pane: keep what has landed in proportion
      if (heap.w) {
        const kx = w / heap.w;
        const ky = h / heap.h;
        for (const b of heap.bodies) {
          b.x *= kx;
          b.y *= ky;
        }
      }
      heap.w = w;
      heap.h = h;
      heap.r = eh * 0.46;
    }
    const dt = Math.min(1 / 30, step / 60);
    heap.since += dt;
    while (
      heap.bodies.length < heap.eggs &&
      heap.bodies.length * 0.045 < heap.since
    )
      heap.bodies.push({
        x: w / 2 + (Math.random() - 0.5) * w * 0.12,
        y: -eh,
        vx: (Math.random() - 0.5) * w * 0.05,
        vy: 0,
        ang: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 6,
        rest: 0,
        asleep: false,
        ground: false,
        held: false,
      });
    // only a struggling frame rate earns the eggs a freeze
    heap.lagging = step > 2.5;
    stepHeap(heap, w, h, dt, info && info.pointer);
    ctx.imageSmoothingEnabled = false;
    for (const b of heap.bodies) {
      ctx.save();
      ctx.translate(Math.round(b.x), Math.round(b.y));
      ctx.rotate(b.ang);
      ctx.drawImage(eggSprite, -ew / 2, -eh / 2, ew, eh);
      ctx.restore();
    }
    ctx.imageSmoothingEnabled = true;
  }
}
