/*
 * Visualizations.
 *
 * The family and preset names come from WMPLOC.DLL 8.00.00.4477's string
 * table (Ambience #5515-#5527, Bars and Waves #5501-#5503, Plenoptic
 * #5532-#5539, Spikes #5506-#5507, Particle #5508-#5510) and WMPVIS.DLL's
 * twenty Musical Colors presets, so the menu reads like the real player's.
 *
 * Only ONE of these is a recreation. "Ambience: Water" is rebuilt from the two
 * reference captures of the stock player: both are greyscale multiplied by a
 * single slowly-shifting tint, and the rings, radial streaks and torn islands
 * are the signature of a feedback zoom — each frame is the previous one scaled
 * up about the centre and faded. Everything else below is our own, written to
 * look good rather than to match a preset nobody has a capture of. Do not
 * mistake them for reconstructions.
 *
 * "Dark Fountain" is the one guest: Deltarune's, rebuilt from the game's own
 * draw code and a capture of the scene — it lives in darkFountain.js.
 */

import {
  stateFor,
  claim,
  band,
  peak,
  at,
  hue,
  beat,
  advance,
  fade,
} from './vizCore';
import { darkFountain } from './darkFountain';

export const ALBUM_ART = 'Album Art';
export const NO_VIZ = 'No Visualization';

/* ---- shared bits --------------------------------------------------------- */

/*
 * The older presets step by frame (`state.t` ticks a sixtieth per draw). The
 * ones below step by wall time instead — `state.dt` is the seconds since the
 * last draw and `state.wall` the seconds elapsed — so they run at one speed
 * whatever the monitor refreshes at.
 */

/**
 * Wall-clock fade: `half` is the half-life, in seconds, of whatever is on
 * the canvas. A fill below about 3% leaves dim pixels where they are (8-bit
 * rounding), so small steps are saved up and applied together.
 */
function trail(ctx, w, h, state, half) {
  const a = 1 - Math.pow(0.5, state.dt / half);
  const pending = 1 - (1 - (state.fadeAcc || 0)) * (1 - a);
  if (pending < 0.03) {
    state.fadeAcc = pending;
    return;
  }
  state.fadeAcc = 0;
  fade(ctx, w, h, pending);
}

/**
 * Level of band `i` of `n`, the bands spaced logarithmically from `lo` to
 * `hi` of the spectrum so the treble gets as many as the bass. Wide bands
 * report their loudest bin; bands narrower than a bin interpolate, so the
 * bass end does not come out as a staircase. Tilted up a little toward the
 * treble, which sits lower in a byte spectrum than it sounds.
 */
function logBand(freq, i, n, lo = 0.003, hi = 0.5, tilt = 0.9) {
  if (!freq) return 0;
  const L = freq.length;
  const x0 = lo * Math.pow(hi / lo, i / n) * L;
  const x1 = lo * Math.pow(hi / lo, (i + 1) / n) * L;
  let v = 0;
  if (x1 - x0 < 1.5) {
    const x = (x0 + x1) / 2;
    const k = Math.max(0, Math.min(L - 2, Math.floor(x)));
    v = freq[k] + (freq[k + 1] - freq[k]) * (x - k);
  } else {
    const end = Math.min(L, Math.ceil(x1));
    for (let k = Math.floor(x0); k < end; k++) if (freq[k] > v) v = freq[k];
  }
  return Math.min(1, (v / 255) * (1 + (i / n) * tilt));
}

/** A rising edge in the low end, with the gap between hits in seconds. */
function kick(state, freq, gap = 0.15) {
  const bass = band(freq, 0, 0.1);
  const prev = state.kickPrev || 0;
  const hit =
    bass > 0.12 &&
    bass > prev * 1.06 &&
    state.wall - (state.kickAt || -9) > gap;
  state.kickPrev = prev + (bass - prev) * Math.min(1, state.dt * 30);
  if (hit) state.kickAt = state.wall;
  return { hit, bass };
}

/** The per-preset act, wiped whenever the canvas changes hands. */
function scene(state, init) {
  if (!state.scene) state.scene = init();
  return state.scene;
}

/* ---- Ambience: the feedback engine -------------------------------------- */

// The tint the whole frame is multiplied by. The reference frames catch it at
// a warm yellow and at a pale blue, so it travels between the two.
const TINTS = [
  [253, 253, 90], // the yellow frame
  [255, 236, 150],
  [235, 240, 250], // the pale blue frame
  [190, 215, 250],
  [225, 245, 240],
];

function waterTint(t) {
  const span = 9; // seconds per stop — slow enough to read as one colour
  const p = (t / span) % TINTS.length;
  const a = TINTS[Math.floor(p)];
  const b = TINTS[(Math.floor(p) + 1) % TINTS.length];
  const k = p - Math.floor(p);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
}

/**
 * Feedback zoom. `scale` above 1 pushes the image outward, below 1 sucks it
 * in; `spin` twists it as it goes; `tint` is the colour the greyscale buffer
 * is multiplied by.
 *
 * Warp and Down the Drain (`wall`) step by wall time and bring their own
 * light: Warp smears the feedback through three zooms and throws sparks out
 * of the centre, the Drain pours the spectrum in at the rim and lets the
 * inward pull wind it down the spiral.
 */
function ambience(ctx, freq, wave, w, h, o) {
  const state = stateFor(ctx.canvas);
  const f = state.fb.getContext('2d');
  const bass = band(freq, 0, 0.06);
  const mid = band(freq, 0.06, 0.25);
  const amp = peak(wave);
  const cx = w / 2;
  const cy = h / 2;
  const unit = Math.min(w, h);
  const k = o.wall ? state.dt * 60 : 1;
  let scale = Math.pow(o.scale || 1.033, k);
  const persist = Math.pow(o.persist || 0.93, k);
  const spin = (o.spin || 0) * k * (1 + bass);
  if (o.kickZoom) {
    const { hit } = kick(state, freq, 0.2);
    state.burst = Math.max(
      (state.burst || 0) * Math.pow(0.01, state.dt),
      hit ? 1 : 0,
    );
    scale *= 1 + state.burst * o.kickZoom * k;
  }
  if (o.pull) scale *= 1 - bass * o.pull * k;

  const pull = (s, alpha, turn = spin) => {
    f.save();
    f.globalAlpha = alpha;
    f.translate(cx, cy);
    if (turn) f.rotate(turn);
    f.scale(s, s);
    f.translate(-cx, -cy);
    f.drawImage(state.fb, 0, 0);
    f.restore();
  };
  f.globalCompositeOperation = 'source-over';
  pull(scale, persist);
  if (o.smear) {
    // two more copies, each zoomed a step further: a radial motion blur
    pull(1 + o.smear * k, 0.45);
    pull(1 + o.smear * 2.2 * k, 0.3);
  }
  if (o.soften) {
    // a copy either side of true size takes the crosshatch out of the
    // inward resampling
    pull(1 + o.soften, 0.3, 0);
    pull(1 - o.soften, 0.3, 0);
  }
  const fadeAmt = o.fadeAmt ?? 0.045;
  fade(f, w, h, o.wall ? 1 - Math.pow(1 - fadeAmt, k) : fadeAmt);

  f.globalCompositeOperation = 'lighter';

  if (o.streak !== false) {
    const barH = Math.max(0.8, 0.6 + amp * unit * 0.035);
    const streak = f.createLinearGradient(0, 0, w, 0);
    streak.addColorStop(0, 'rgba(255,255,255,0)');
    streak.addColorStop(0.5, `rgba(255,255,255,${0.18 + amp * 0.3})`);
    streak.addColorStop(1, 'rgba(255,255,255,0)');
    f.fillStyle = streak;
    f.fillRect(0, cy - barH, w, barH * 2);
  }

  if (o.core !== false) {
    const cg = o.coreGain || 1;
    const coreR = unit * (0.045 + bass * 0.045);
    const core = f.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
    core.addColorStop(0, `rgba(255,255,255,${(0.14 + bass * 0.16) * cg})`);
    core.addColorStop(0.5, `rgba(255,255,255,${(0.05 + bass * 0.08) * cg})`);
    core.addColorStop(1, 'rgba(255,255,255,0)');
    f.fillStyle = core;
    f.fillRect(cx - coreR * 2, cy - coreR * 2, coreR * 4, coreR * 4);
  }

  if (freq && o.rim !== true) {
    const steps = 96;
    const r0 = unit * (0.045 + bass * 0.045) * 1.9;
    f.strokeStyle = `rgba(255,255,255,${0.16 + mid * 0.4})`;
    f.lineWidth = 1 + mid * 2;
    f.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const r = r0 * (1 + at(freq, i / steps, 0.28) * 0.55);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) f.moveTo(x, y);
      else f.lineTo(x, y);
    }
    f.closePath();
    f.stroke();
  }

  if (o.sparks) {
    // sparks near the centre, for the zoom to tear into streaks
    const energy = band(freq, 0, 0.35);
    const count = Math.round((2 + energy * 10 + (state.burst || 0) * 20) * k);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = unit * (0.04 + Math.random() * 0.22);
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const v = 0.6 + Math.random() * 1.2;
      f.fillStyle = `rgba(255,255,255,${0.5 + Math.random() * 0.5})`;
      f.fillRect(x - v, y - v, v * 2, v * 2);
    }
  }

  if (o.rim) {
    // light poured in around the rim — a soft ring out at the corners, and
    // one blob per band, staggered in radius so every ring of the spiral
    // gets fed — for the inward pull to wind down the drain
    const R = Math.hypot(w, h) * 0.5;
    const ring = f.createRadialGradient(cx, cy, R * 0.62, cx, cy, R * 1.02);
    ring.addColorStop(0, 'rgba(255,255,255,0)');
    ring.addColorStop(0.55, `rgba(255,255,255,${(0.006 + mid * 0.02) * k})`);
    ring.addColorStop(1, 'rgba(255,255,255,0)');
    f.fillStyle = ring;
    f.fillRect(0, 0, w, h);
    const n = 40;
    for (let i = 0; i < n; i++) {
      const v = logBand(freq, i, n, 0.003, 0.45, 0.6);
      if (v < 0.08) continue;
      const a = (i / n) * Math.PI * 2 + state.wall * 0.35;
      const rr = R * (0.42 + 0.55 * ((i * 0.618034) % 1));
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      const rad = unit * (0.02 + v * 0.09);
      const g = f.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(255,255,255,${(0.012 + v * 0.1) * k})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      f.fillStyle = g;
      f.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // the eye of the drain stays dark
    f.globalCompositeOperation = 'source-over';
    const eye = unit * (0.05 + bass * 0.03);
    const hole = f.createRadialGradient(cx, cy, 0, cx, cy, eye);
    hole.addColorStop(0, 'rgba(0,0,0,0.9)');
    hole.addColorStop(0.7, 'rgba(0,0,0,0.5)');
    hole.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = hole;
    f.fillRect(cx - eye, cy - eye, eye * 2, eye * 2);
  }
  f.globalCompositeOperation = 'source-over';

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(state.fb, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  // Water walks the sampled warm/cool pair; Rainbow walks the whole wheel the
  // same way, one colour at a time.
  ctx.fillStyle =
    o.tint === 'rainbow' ? hue(state.t * 26, 100, 72) : waterTint(state.t);
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

/* ---- bars, scope, spikes ------------------------------------------------ */

// [gradient stops bottom -> top, peak cap, waveform]
const PALETTES = {
  bars: {
    stops: ['#08235c', '#1a6fcf', '#54c4ff', '#b8f0ff'],
    cap: '#e6fbff',
    wave: '#3ef0ff',
  },
  ocean: {
    stops: ['#052a3d', '#0f6f86', '#3fb8b8', '#a8f0e8'],
    cap: '#e4fffb',
    wave: 'rgba(160,240,232,0.55)',
    glow: 'rgba(90,200,210,0.1)',
  },
  fire: {
    stops: ['#4a0600', '#d81e00', '#ff8a00', '#ffe066', '#fff8c8'],
    cap: '#fff1a8',
    glow: 'rgba(255,90,0,0.22)',
  },
  acid: {
    stops: ['#0b3300', '#2e9e00', '#8ee000', '#e4ff4a', '#f6ffc0'],
    cap: '#f2ffb8',
    wave: '#8cff1e',
  },
};

/**
 * The stock player's bars: a row of chunky columns with falling peak caps,
 * and a thin waveform above. Levels are log-spaced so the treble is not a
 * dead strip; each one rises at once and falls at a set rate, the cap sits
 * on the peak and then drops under gravity. `mirror` folds the row about the
 * centre line (Fire Storm, Acid Rock).
 */
function bars(ctx, freq, wave, w, h, o) {
  const state = stateFor(ctx.canvas);
  const P = PALETTES[o.palette] || PALETTES.bars;
  if (o.mist) trail(ctx, w, h, state, 0.09);
  else fade(ctx, w, h, 1);
  const n = Math.max(40, Math.min(64, Math.round(w / 8)));
  const s = scene(state, () => ({
    n,
    level: new Float32Array(n),
    cap: new Float32Array(n),
    capV: new Float32Array(n),
  }));
  if (s.n !== n) {
    s.n = n;
    s.level = new Float32Array(n);
    s.cap = new Float32Array(n);
    s.capV = new Float32Array(n);
  }
  const dt = state.dt;
  const bw = w / n;
  const gap = bw > 6 ? 2 : 1;
  const floor = o.mirror ? h / 2 : h;
  const span = o.mirror ? h * 0.47 : h * 0.74;
  const fall = o.fall || 2.6;
  const amp = peak(wave);

  const gradient = dir => {
    const g = ctx.createLinearGradient(0, floor, 0, floor - dir * span);
    P.stops.forEach((c, i) => g.addColorStop(i / (P.stops.length - 1), c));
    return g;
  };
  const up = gradient(1);
  const down = o.mirror ? gradient(-1) : null;

  for (let i = 0; i < n; i++) {
    let raw = freq ? Math.pow(logBand(freq, i, n), 0.85) : 0;
    if (o.flicker) raw *= 0.92 + Math.random() * 0.16;
    s.level[i] = Math.max(raw, s.level[i] - dt * fall);
    if (s.level[i] >= s.cap[i]) {
      s.cap[i] = s.level[i];
      s.capV[i] = 0;
    } else {
      s.capV[i] += dt * 2.4;
      s.cap[i] = Math.max(s.level[i], s.cap[i] - s.capV[i] * dt);
    }
  }

  if (o.mist || o.flicker) {
    // a glow behind the bars: mist off the water, heat off the fire
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const v = s.level[i];
      if (v < 0.03) continue;
      const x = i * bw + bw / 2;
      const r = bw * (1.6 + v * 2);
      const g = ctx.createRadialGradient(x, floor, 0, x, floor, r + v * span);
      g.addColorStop(0, P.glow);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, floor - v * span - r, r * 2, (v * span + r) * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  for (let i = 0; i < n; i++) {
    const x = i * bw + gap / 2;
    const bwid = Math.max(1, bw - gap);
    const bh = s.level[i] * span;
    ctx.fillStyle = up;
    ctx.fillRect(x, floor - bh, bwid, bh);
    if (down) {
      ctx.fillStyle = down;
      ctx.fillRect(x, floor, bwid, bh);
    }
    const ch = s.cap[i] * span;
    if (ch > 1) {
      ctx.fillStyle = P.cap;
      ctx.fillRect(x, floor - ch - 2, bwid, 2);
      if (down) ctx.fillRect(x, floor + ch, bwid, 2);
    }
  }

  if (wave && P.wave) {
    const y0 = o.mirror ? h / 2 : h * 0.16;
    const reach = o.mirror ? h * 0.3 : h * 0.13;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = o.jitter ? 1.8 : 1.3;
    ctx.strokeStyle = P.wave;
    ctx.beginPath();
    const pts = 256;
    const step = (wave.length - 1) / (pts - 1);
    for (let i = 0; i < pts; i++) {
      const x = (i / (pts - 1)) * w;
      let y = y0 + ((wave[Math.floor(i * step)] - 128) / 128) * reach;
      if (o.jitter) y += (Math.random() - 0.5) * (2 + amp * 10);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
}

function scope(ctx, freq, wave, w, h) {
  fade(ctx, w, h, 1);
  if (!wave) return;
  waveLine(ctx, wave, w, h, '#54e07a', 2);
}

function waveLine(ctx, wave, w, h, color, lineWidth, offset = 0) {
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (let i = 0; i < wave.length; i++) {
    const x = (i / (wave.length - 1)) * w;
    const y = h / 2 + offset + ((wave[i] - 128) / 128) * (h / 2 - 4);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/**
 * Radial spikes out of the centre, one log-spaced band each so the ring is
 * complete round to the treble. The ring turns slowly, the spokes run the
 * wheel, and a bright tip holds at each spoke's peak before falling back.
 */
function spikes(ctx, freq, wave, w, h) {
  const state = stateFor(ctx.canvas);
  trail(ctx, w, h, state, 0.05);
  const n = 72;
  const s = scene(state, () => ({
    level: new Float32Array(n),
    tip: new Float32Array(n),
    tipV: new Float32Array(n),
  }));
  const cx = w / 2;
  const cy = h / 2;
  const unit = Math.min(w, h);
  const dt = state.dt;
  const bass = band(freq, 0, 0.08);
  const r0 = unit * 0.09;
  const reach = unit * 0.38;
  const rot = state.wall * 0.25;

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const v = freq ? logBand(freq, i, n, 0.003, 0.5, 1.4) : 0;
    s.level[i] = Math.max(v, s.level[i] - dt * 2.2);
    if (s.level[i] >= s.tip[i]) {
      s.tip[i] = s.level[i];
      s.tipV[i] = 0;
    } else {
      s.tipV[i] += dt * 5;
      s.tip[i] = Math.max(s.level[i], s.tip[i] - s.tipV[i] * dt);
    }
    const lv = s.level[i];
    const a = (i / n) * Math.PI * 2 + rot;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const r1 = r0 + (0.06 + lv) * reach;
    const H = (i / n) * 360 + state.wall * 30;
    ctx.strokeStyle = hue(H, 100, 55 + lv * 15, 0.55 + lv * 0.45);
    ctx.lineWidth = 1.5 + lv * 3.5;
    ctx.beginPath();
    ctx.moveTo(cx + ca * r0, cy + sa * r0);
    ctx.lineTo(cx + ca * r1, cy + sa * r1);
    ctx.stroke();
    const rt = r0 + (0.06 + s.tip[i]) * reach + 3;
    ctx.fillStyle = hue(H, 100, 88, 0.95);
    ctx.beginPath();
    ctx.arc(cx + ca * rt, cy + sa * rt, 1.2 + lv * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // the hub
  ctx.strokeStyle = hue(state.wall * 30, 100, 75, 0.6 + bass * 0.4);
  ctx.lineWidth = 1.5 + bass * 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r0 - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * A blob whose outline is the spectrum wrapped around a circle. The outline
 * eases toward the spectrum rather than snapping to it, so the rim wobbles;
 * the body is a soft, see-through cyan so the wobble is what you see.
 */
function amoeba(ctx, freq, wave, w, h) {
  const state = stateFor(ctx.canvas);
  trail(ctx, w, h, state, 0.12);
  const n = 64;
  const s = scene(state, () => ({ shape: new Float32Array(n) }));
  const cx = w / 2;
  const cy = h / 2;
  const unit = Math.min(w, h);
  const ease = Math.min(1, state.dt * 9);
  let mean = 0;
  for (let i = 0; i < n; i++) {
    const v = freq ? logBand(freq, i, n, 0.003, 0.4, 0.7) : 0;
    s.shape[i] += (v - s.shape[i]) * ease;
    mean += s.shape[i] / n;
  }
  const base = unit * 0.2;
  const steps = 128;
  const rot = state.wall * 0.3;
  const amp = peak(wave);

  const path = new Path2D();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2 + rot;
    // mirrored so the blob stays symmetrical
    const k = i < steps / 2 ? i : steps - i;
    const wob =
      Math.sin(a * 3 + state.wall * 2.2) * 0.07 +
      Math.sin(a * 5 - state.wall * 3.1) * 0.04;
    const dev = s.shape[Math.min(n - 1, k)] - mean;
    const r = base * (1 + mean * 0.7 + dev * 1.8 + wob);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();

  ctx.globalCompositeOperation = 'source-over';
  const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 2.2);
  fill.addColorStop(0, 'hsla(195,100%,75%,0.5)');
  fill.addColorStop(0.5, 'hsla(205,100%,50%,0.3)');
  fill.addColorStop(1, 'hsla(225,100%,35%,0.12)');
  ctx.fillStyle = fill;
  ctx.fill(path);

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'hsla(195,100%,60%,0.14)';
  ctx.lineWidth = 12 + amp * 8;
  ctx.stroke(path);
  ctx.strokeStyle = 'hsla(190,100%,65%,0.4)';
  ctx.lineWidth = 4 + amp * 3;
  ctx.stroke(path);
  ctx.strokeStyle = 'hsla(185,100%,88%,0.95)';
  ctx.lineWidth = 1.5;
  ctx.stroke(path);
  ctx.globalCompositeOperation = 'source-over';
}

/* ---- colour fields ------------------------------------------------------ */

/** Curtains of colour rising out of the spectrum. */
function aurora(ctx, freq, wave, w, h) {
  fade(ctx, w, h, 1);
  if (!freq) return;
  const state = stateFor(ctx.canvas);
  const bands = 48;
  const bw = w / bands;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < bands; i++) {
    const v = Math.pow(at(freq, i / bands, 0.4), 0.55);
    if (v < 0.02) continue;
    const height = (0.25 + v * 0.75) * h;
    const sway = Math.sin(state.t * 0.8 + i * 0.35) * bw * 0.5;
    const x = i * bw + sway - bw * 0.4;
    const g = ctx.createLinearGradient(0, h, 0, h - height);
    const base = state.t * 22 + i * 7;
    g.addColorStop(0, hue(base, 95, 60, 0.05));
    g.addColorStop(0.25, hue(base, 100, 62, 0.75 * v));
    g.addColorStop(0.7, hue(base + 35, 100, 68, 0.4 * v));
    g.addColorStop(1, hue(base + 60, 100, 78, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, h - height, bw * 1.8, height);
  }
  const foot = ctx.createLinearGradient(0, h, 0, h - h * 0.22);
  foot.addColorStop(0, hue(state.t * 22, 100, 55, 0.28));
  foot.addColorStop(1, hue(state.t * 22 + 50, 100, 60, 0));
  ctx.fillStyle = foot;
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
  ctx.globalCompositeOperation = 'source-over';
}

/** Rings shed on the beat — more of them, and wider, the louder it gets. */
function circles(ctx, freq, wave, w, h) {
  const state = stateFor(ctx.canvas);
  const cx = w / 2;
  const cy = h / 2;
  fade(ctx, w, h, 0.11);
  const { hit, bass } = beat(state, freq, 4);
  const energy = band(freq, 0, 0.35);

  // a beat throws out a whole burst; between beats they keep trickling at a
  // rate set by the level, so a busy track fills the frame with rings
  const burst = hit ? 1 + Math.round(energy * 5) : 0;
  const trickle = Math.random() < energy * 0.55 ? 1 : 0;
  for (let i = 0; i < burst + trickle && state.rings.length < 130; i++) {
    state.rings.push({
      r: 2 + Math.random() * 10,
      hue: state.t * 70 + Math.random() * 50,
      life: 1,
      power: Math.max(0.2, bass) * (0.7 + Math.random() * 0.6),
      // a little drift, so a burst reads as smoke rather than a bullseye
      dx: (Math.random() - 0.5) * 1.2,
      dy: (Math.random() - 0.5) * 1.2,
      x: cx,
      y: cy,
    });
  }

  ctx.globalCompositeOperation = 'lighter';
  for (const ring of state.rings) {
    ring.r += 0.4 + ring.power * 3.4 + energy * 2.5;
    ring.x += ring.dx;
    ring.y += ring.dy;
    ring.life -= 0.007;
    if (ring.life <= 0) continue;
    ctx.strokeStyle = hue(ring.hue, 90, 62, ring.life * 0.8);
    ctx.lineWidth = 1 + ring.life * 6 * ring.power;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  state.rings = state.rings.filter(r => r.life > 0 && r.r < Math.max(w, h));

  const glow = ctx.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    16 + peak(wave) * 70,
  );
  glow.addColorStop(0, hue(state.t * 70, 90, 78, 0.55 + energy * 0.4));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * A matrix of VU lamps. Each column is one log-spaced band and the rows are
 * its meter — a lamp lights when the column's level reaches it — so the
 * whole grid works. The level falls at a set rate, a white peak lamp lags
 * behind it, and the unlit bulbs stay faintly there so it reads as a grid.
 */
function grid(ctx, freq, wave, w, h) {
  const state = stateFor(ctx.canvas);
  trail(ctx, w, h, state, 0.07);
  const cols = 20;
  const rows = 12;
  const s = scene(state, () => ({
    level: new Float32Array(cols),
    hold: new Float32Array(cols),
  }));
  const cw = w / cols;
  const ch = h / rows;
  const r = Math.min(cw, ch) * 0.5;
  const dt = state.dt;

  ctx.globalCompositeOperation = 'lighter';
  for (let x = 0; x < cols; x++) {
    const raw = freq ? Math.pow(logBand(freq, x, cols), 0.8) : 0;
    s.level[x] = Math.max(raw, s.level[x] - dt * 1.7);
    s.hold[x] = s.level[x] >= s.hold[x] ? s.level[x] : s.hold[x] - dt * 0.45;
    const lit = s.level[x] * rows;
    const held = Math.floor(s.hold[x] * rows);
    const H = state.wall * 18 + (x / cols) * 320;
    const px = x * cw + cw / 2;
    for (let y = 0; y < rows; y++) {
      const k = rows - 1 - y; // 0 is the bottom row
      const py = y * ch + ch / 2;
      const a = Math.max(0, Math.min(1, lit - k));
      const peakLamp = held === k && k > 0 && a < 0.5;
      if (a < 0.03 && !peakLamp) {
        ctx.fillStyle = 'rgba(80,90,110,0.16)';
        ctx.beginPath();
        ctx.arc(px, py, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const warm = k / rows; // the top of the meter runs paler
      const col = peakLamp ? 'rgba(255,255,255,' : null;
      const glowR = r * (1.3 + a * 0.9);
      const g = ctx.createRadialGradient(px, py, 0, px, py, glowR);
      g.addColorStop(
        0,
        col ? `${col}0.55)` : hue(H, 95, 55 + warm * 10, 0.4 * a + 0.15),
      );
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);
      ctx.fillStyle = col
        ? `${col}0.85)`
        : hue(H, 100, 60 + warm * 14, 0.35 + a * 0.65);
      ctx.beginPath();
      ctx.arc(px, py, r * (0.36 + a * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** A wide ribbon of light, its shape traced from the waveform. */
function ribbon(ctx, freq, wave, w, h) {
  const state = stateFor(ctx.canvas);
  fade(ctx, w, h, 0.14);
  if (!wave) return;
  ctx.globalCompositeOperation = 'lighter';
  for (let layer = 0; layer < 4; layer++) {
    const phase = state.t * (0.5 + layer * 0.16);
    ctx.beginPath();
    for (let i = 0; i <= 128; i++) {
      const p = i / 128;
      const x = p * w;
      const swing = Math.sin(p * Math.PI * 2 + phase) * h * 0.22;
      const v =
        ((wave[Math.floor(p * (wave.length - 1))] - 128) / 128) * h * 0.2;
      const y = h / 2 + swing + v * (1 + layer * 0.3);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hue(state.t * 45 + layer * 45, 100, 65, 0.55);
    ctx.lineWidth = 2 + layer;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * The waveform as a thick band of rainbow — the hue sweeps along it and
 * cycles with time — that leaves an afterglow where it was. A kick sends a
 * charge through it: the line jitters and throws off forks of lightning.
 */
function electric(ctx, freq, wave, w, h) {
  const state = stateFor(ctx.canvas);
  trail(ctx, w, h, state, 0.13);
  if (!wave) return;
  const { hit } = kick(state, freq, 0.2);
  state.zap = Math.max(
    (state.zap || 0) * Math.pow(0.005, state.dt),
    hit ? 1 : 0,
  );
  const zap = state.zap;
  const amp = peak(wave);
  const pts = 256;
  const step = (wave.length - 1) / (pts - 1);
  const cy = h / 2;
  const reach = h * 0.4;

  const xs = new Float32Array(pts);
  const ys = new Float32Array(pts);
  for (let i = 0; i < pts; i++) {
    xs[i] = (i / (pts - 1)) * w;
    let y = cy + ((wave[Math.floor(i * step)] - 128) / 128) * reach;
    if (zap > 0.04)
      y +=
        (Math.random() - 0.5) *
        h *
        0.3 *
        zap *
        (Math.random() < 0.25 ? 1 : 0.15);
    ys[i] = y;
  }
  const path = new Path2D();
  for (let i = 0; i < pts; i++) {
    if (i === 0) path.moveTo(xs[i], ys[i]);
    else path.lineTo(xs[i], ys[i]);
  }

  const rainbow = alpha => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    const stops = 12;
    for (let i = 0; i <= stops; i++)
      g.addColorStop(
        i / stops,
        hue((i / stops) * 540 + state.wall * 140, 100, 60, alpha),
      );
    return g;
  };

  // the glow stacks up into the afterglow; the band itself is laid on top
  // fresh each frame so a held note does not bleach it white
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = rainbow(0.08);
  ctx.lineWidth = 28 + amp * 12 + zap * 10;
  ctx.stroke(path);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = rainbow(0.9);
  ctx.lineWidth = 10 + amp * 4;
  ctx.stroke(path);
  ctx.strokeStyle = `rgba(255,255,255,${0.45 + zap * 0.5})`;
  ctx.lineWidth = 1.5 + zap * 1.5;
  ctx.stroke(path);
  ctx.globalCompositeOperation = 'lighter';

  // forks of lightning off the line while the charge lasts
  const forks = Math.round(zap * 7);
  for (let f = 0; f < forks; f++) {
    const i = Math.floor(Math.random() * pts);
    let x = xs[i];
    let y = ys[i];
    const dir = Math.random() < 0.5 ? -1 : 1;
    ctx.strokeStyle = `rgba(200,230,255,${0.5 + zap * 0.5})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 4 + Math.floor(Math.random() * 4);
    for (let sgm = 0; sgm < segs; sgm++) {
      x += (Math.random() - 0.5) * 24;
      y += dir * (4 + Math.random() * 14) * zap;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* ---- particles ---------------------------------------------------------- */

/**
 * Stars rushing past, in perspective. Each one carries a depth, so it streaks
 * outward and grows as it comes at you. How many there are, how fast they
 * travel and how far they streak all come off the signal — quiet music leaves
 * a sparse, slow field; loud music fills the frame and tears past.
 */
function starfield(ctx, freq, wave, w, h, o) {
  const state = stateFor(ctx.canvas);
  fade(ctx, w, h, o.trail || 0.24);
  const cx = w / 2;
  const cy = h / 2;
  const energy = band(freq, 0, 0.35);
  const punch = band(freq, 0, 0.08);
  const amp = peak(wave);
  const reach = Math.min(w, h) * 0.62;

  const born = () => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z: 1,
    hue: 180 + Math.random() * 110,
  });
  // the field thickens with the music and thins out again as it dies away
  const target = 40 + Math.round(energy * 360);
  while (state.dots.length < target) state.dots.push(born());
  if (state.dots.length > target + 40) state.dots.length = target + 40;

  const speed = 0.0016 + energy * 0.03 + punch * 0.025;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const d of state.dots) {
    if (!Number.isFinite(d.z)) continue;
    if (o.rotate) {
      const turn = 0.0015 + energy * 0.02;
      const c = Math.cos(turn);
      const sn = Math.sin(turn);
      const nx = d.x * c - d.y * sn;
      d.y = d.x * sn + d.y * c;
      d.x = nx;
    }
    const was = d.z;
    d.z -= speed;
    if (d.z <= 0.03) {
      Object.assign(d, born());
      continue;
    }
    const x = cx + (d.x / d.z) * reach;
    const y = cy + (d.y / d.z) * reach;
    if (x < -50 || x > w + 50 || y < -50 || y > h + 50) {
      Object.assign(d, born());
      continue;
    }
    // the trailing end of the streak is where it was last frame
    const px = cx + (d.x / was) * reach;
    const py = cy + (d.y / was) * reach;
    const near = 1 - d.z;
    ctx.strokeStyle = hue(
      d.hue + energy * 120,
      60 + energy * 40,
      70 + near * 25,
      0.4 + near * 0.6,
    );
    ctx.lineWidth = 0.7 + near * near * (2.6 + amp * 4);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Sparks thrown up from the floor, falling back under gravity. */
function fountain(ctx, freq, wave, w, h) {
  const state = stateFor(ctx.canvas);
  fade(ctx, w, h, 0.18);
  const { hit, bass } = beat(state, freq, 3);
  const energy = band(freq, 0, 0.35);
  // Squared, so a loud passage throws up far more than a quiet one. The rate
  // has to stay under what the lifetimes can retire, though: spawning faster
  // than that pins the count at the ceiling, stops new sparks dead, and then
  // the whole cohort — all born in the same instant — expires together, which
  // is what made it cut out about once a second.
  // ~11/frame is what the lifetimes can retire at this ceiling, so the curve
  // is shaped to approach that at full tilt and stay lively in between
  const spawn = Math.round(Math.pow(energy, 1.5) * 13) + (hit ? 16 : 0);
  for (let i = 0; i < spawn && state.dots.length < 1400; i++) {
    const lift = 2 + Math.random() * 4 + bass * 20 + energy * 10;
    state.dots.push({
      x: w / 2 + (Math.random() - 0.5) * w * 0.12,
      y: h,
      vx: (Math.random() - 0.5) * (2 + energy * 7),
      vy: -lift,
      hue: state.t * 60 + Math.random() * 70,
      life: 1,
      // staggered so they thin out steadily instead of vanishing at once
      decay: 0.005 + Math.random() * 0.007,
    });
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const d of state.dots) {
    if (!Number.isFinite(d.x) || !Number.isFinite(d.y)) continue;
    const px = d.x;
    const py = d.y;
    d.vy += 0.16;
    d.x += d.vx;
    d.y += d.vy;
    d.life -= d.decay || 0.008;
    if (d.life <= 0) continue;
    // a short streak along its travel reads better than a dot
    ctx.strokeStyle = hue(d.hue, 95, 62 + d.life * 20, d.life);
    ctx.lineWidth = 1 + d.life * 1.6;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
  }
  state.dots = state.dots.filter(d => d.life > 0 && d.y < h + 20);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Fire licking up from the bottom edge.
 *
 * The buffer is treated as heat rather than as a picture: every frame it is
 * lifted, swayed and multiplied by a warm tint, so a patch of flame loses its
 * blue first, then its green, travelling white -> yellow -> orange -> red as
 * it climbs. Persistence is high enough that it reaches the top of the frame
 * when the track is loud, and embers are thrown clear of the flame on beats.
 */
function flame(ctx, freq, wave, w, h) {
  const state = stateFor(ctx.canvas);
  const f = state.fb.getContext('2d');
  const energy = band(freq, 0, 0.35);
  const { hit, bass } = beat(state, freq, 5);

  // the heat buffer has to start opaque, or the tint pass would flood the
  // transparent parts with colour instead of multiplying against them
  if (!state.fireReady) {
    f.globalCompositeOperation = 'source-over';
    f.globalAlpha = 1;
    f.fillStyle = '#000';
    f.fillRect(0, 0, w, h);
    state.fireReady = true;
  }

  // lift, with a slow sway either side so the column rolls as it rises
  const rise = 1.6 + energy * 5.5 + bass * 3;
  const sway = Math.sin(state.t * 1.1) * 1.6 + (Math.random() - 0.5) * 1.2;
  f.globalCompositeOperation = 'source-over';
  f.save();
  f.globalAlpha = 0.982; // the subtractive floor below does the culling
  f.drawImage(state.fb, sway, -rise);
  f.restore();

  // Cool it as it climbs: blue falls away fastest, then green, so a patch
  // travels white -> yellow -> orange -> red on the way up.
  f.globalCompositeOperation = 'multiply';
  f.fillStyle = 'rgb(252,232,196)';
  f.fillRect(0, 0, w, h);

  // Then take a flat amount off everything. Scaling alone decays the whole
  // sheet at one rate, which is why it rose as a solid wall — subtracting a
  // floor kills the weak areas outright and leaves the strong columns to
  // climb on their own as tongues.
  f.globalCompositeOperation = 'difference';
  f.fillStyle = 'rgb(4,3,2)';
  f.fillRect(0, 0, w, h);

  // feed new heat in along the bottom, one blob per band
  f.globalCompositeOperation = 'lighter';
  const cols = 44;
  const cw = w / cols;
  for (let i = 0; i < cols; i++) {
    const v = at(freq, i / cols, 0.35);
    if (v < 0.02) continue;
    const x = i * cw + cw / 2 + Math.sin(state.t * 2 + i) * cw * 0.4;
    const r = cw * (0.45 + v * 1.5);
    const g = f.createRadialGradient(x, h - 2, 0, x, h - 2, r);
    g.addColorStop(0, `rgba(255,255,238,${0.55 * v + 0.12})`);
    g.addColorStop(0.45, `rgba(255,176,48,${0.4 * v})`);
    g.addColorStop(1, 'rgba(150,20,0,0)');
    f.fillStyle = g;
    f.fillRect(x - r, h - r * 2, r * 2, r * 2);
  }

  // embers ride the draught, well clear of the flame body
  if (hit)
    for (let i = 0; i < 4 + Math.round(energy * 12); i++)
      state.dots.push({
        x: Math.random() * w,
        y: h - 6,
        vx: (Math.random() - 0.5) * 1.6,
        vy: -(1.5 + Math.random() * 3 + energy * 5),
        life: 1,
      });
  for (const e of state.dots) {
    if (!Number.isFinite(e.x)) continue;
    e.vy *= 0.99;
    e.vx += (Math.random() - 0.5) * 0.35;
    e.x += e.vx;
    e.y += e.vy;
    e.life -= 0.012;
    if (e.life <= 0) continue;
    f.fillStyle = `rgba(255,${190 + Math.round(e.life * 60)},120,${e.life})`;
    f.fillRect(e.x, e.y, 1.6, 1.6);
  }
  state.dots = state.dots.filter(e => e.life > 0 && e.y > -10);

  f.globalCompositeOperation = 'source-over';
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(state.fb, 0, 0);
}

/** Bubbles wobbling up through water. */
function bubbles(ctx, freq, wave, w, h) {
  const state = stateFor(ctx.canvas);
  const g0 = ctx.createLinearGradient(0, 0, 0, h);
  g0.addColorStop(0, '#01121f');
  g0.addColorStop(1, '#031f33');
  ctx.fillStyle = g0;
  ctx.fillRect(0, 0, w, h);
  const { hit, bass } = beat(state, freq, 4);
  const energy = band(freq, 0, 0.35);
  // a still glass when nothing plays; a rolling boil when it does
  if ((hit || Math.random() < energy * 0.9) && state.dots.length < 120)
    state.dots.push({
      x: Math.random() * w,
      y: h + 10,
      r: 2 + Math.random() * 6 + bass * 26,
      vy: -(0.2 + Math.random() * 0.6 + energy * 3.2),
      phase: Math.random() * 6,
    });
  for (const b of state.dots) {
    if (!Number.isFinite(b.r) || !Number.isFinite(b.y)) continue;
    b.y += b.vy * (0.4 + energy * 2);
    b.phase += 0.03 + energy * 0.12;
    const x = b.x + Math.sin(b.phase) * 8;
    ctx.strokeStyle = `rgba(190,235,255,0.55)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    const sheen = ctx.createRadialGradient(
      x - b.r * 0.3,
      b.y - b.r * 0.35,
      0,
      x,
      b.y,
      b.r,
    );
    sheen.addColorStop(0, 'rgba(255,255,255,0.35)');
    sheen.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.fillStyle = sheen;
    ctx.fill();
  }
  state.dots = state.dots.filter(b => b.y + b.r > 0);
}

/** A tunnel of rings rushing toward you. */
function tunnel(ctx, freq, wave, w, h) {
  const state = stateFor(ctx.canvas);
  fade(ctx, w, h, 0.25);
  const cx = w / 2;
  const cy = h / 2;
  const unit = Math.max(w, h);
  const energy = band(freq, 0, 0.25);
  const amp = peak(wave);
  const phase = advance(state, 'tunnel', energy, 0.0015, 0.035);
  const twist = advance(state, 'twist', band(freq, 0.2, 0.5), 0.001, 0.06);
  ctx.globalCompositeOperation = 'lighter';
  const count = 22;
  for (let i = 0; i < count; i++) {
    // each ring marches outward, wrapping when it leaves the frame
    const p = ((phase + i / count) % 1) ** 2.2;
    // the mouth of the tunnel opens and closes with the level
    const r = p * unit * (0.6 + amp * 0.6);
    if (r < 2) continue;
    const sides = 6;
    ctx.strokeStyle = hue(phase * 400 + i * 18, 95, 45 + energy * 40, 1 - p);
    ctx.lineWidth = 1 + (1 - p) * (2 + amp * 6);
    ctx.beginPath();
    for (let k = 0; k <= sides; k++) {
      const a = (k / sides) * Math.PI * 2 + twist + p * 1.2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.85;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Neon lines rushing off toward a vanishing point. */
function highway(ctx, freq, wave, w, h) {
  const state = stateFor(ctx.canvas);
  fade(ctx, w, h, 0.22);
  const cx = w / 2;
  const horizon = h * 0.45;
  const energy = band(freq, 0, 0.25);
  const phase = advance(state, 'road', energy, 0.002, 0.05);
  ctx.globalCompositeOperation = 'lighter';
  const lanes = 16;
  for (let i = 0; i <= lanes; i++) {
    const p = i / lanes - 0.5;
    ctx.strokeStyle = hue(state.t * 50 + i * 22, 100, 60, 0.5);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + p * 40, horizon);
    ctx.lineTo(cx + p * w * 2.2, h);
    ctx.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const p = ((phase + i / 14) % 1) ** 2.4;
    const y = horizon + p * (h - horizon);
    ctx.strokeStyle = hue(state.t * 70 + i * 25, 100, 65, 1 - p * 0.8);
    ctx.lineWidth = 1 + p * 3;
    ctx.beginPath();
    ctx.moveTo(cx - p * w, y);
    ctx.lineTo(cx + p * w, y);
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(cx, horizon, 0, cx, horizon, w * 0.35);
  glow.addColorStop(0, hue(state.t * 70, 100, 70, 0.35 + energy * 0.4));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Frost. A handful of six-armed crystals grow across the frame — the treble
 * drives the growth, arms first, then branches, then the branches' own — hold
 * for a while, melt back and seed again somewhere else. White to pale blue,
 * with a sparkle at the tips.
 */
const FLAKES = 5;

function crystals(ctx, freq, wave, w, h) {
  const state = stateFor(ctx.canvas);
  trail(ctx, w, h, state, 0.09);
  const unit = Math.min(w, h);
  const dt = state.dt;
  const s = scene(state, () => ({ flakes: [], seed: 0, treble: 0 }));

  const seedFlake = () => {
    // spread them over the frame with a golden-ratio walk, the first in the middle
    const i = s.seed++;
    const u = i === 0 ? 0.5 : (i * 0.618034) % 1;
    const v = i === 0 ? 0.5 : (i * 0.381966 + 0.25) % 1;
    return {
      x: w * (0.1 + u * 0.8),
      y: h * (0.12 + v * 0.76),
      size: unit * (i === 0 ? 0.42 : 0.2 + ((i * 0.7) % 1) * 0.18),
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      grow: 0,
      hold: 2 + Math.random() * 4,
      melting: false,
      tint: 185 + Math.random() * 30,
    };
  };
  while (s.flakes.length < FLAKES) s.flakes.push(seedFlake());

  const treble = Math.min(1, band(freq, 0.12, 0.5) * 3.5);
  s.treble += (treble - s.treble) * Math.min(1, dt * 5);
  const sparkleRate = 0.06 + s.treble * 0.4;

  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  const line = (x0, y0, x1, y1, width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  const sparkle = (x, y, size, a) => {
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();
  };

  for (let i = 0; i < s.flakes.length; i++) {
    const fl = s.flakes[i];
    if (fl.melting) {
      fl.grow -= dt * 0.5;
      if (fl.grow <= 0) {
        s.flakes[i] = seedFlake();
        continue;
      }
    } else if (fl.grow < 1) {
      fl.grow = Math.min(1, fl.grow + dt * (0.12 + s.treble * 0.8));
    } else {
      fl.hold -= dt;
      if (fl.hold <= 0) fl.melting = true;
    }
    fl.rot += fl.spin * dt;
    const g = fl.grow;
    const ease = g * g * (3 - 2 * g);
    const len = fl.size * ease;
    const alpha = Math.min(1, g * 3);
    const glow = `hsla(${fl.tint},100%,70%,${0.08 * alpha})`;
    const arm = `rgba(225,248,255,${0.85 * alpha})`;
    const branch = `hsla(${fl.tint},90%,78%,${0.75 * alpha})`;
    const twig = `hsla(${fl.tint + 15},90%,65%,${0.6 * alpha})`;

    for (let a = 0; a < 6; a++) {
      const ang = fl.rot + (a / 6) * Math.PI * 2;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const tx = fl.x + ca * len;
      const ty = fl.y + sa * len;
      line(fl.x, fl.y, tx, ty, 6, glow);
      line(fl.x, fl.y, tx, ty, 1.3, arm);
      // branches at three stations along the arm, each with two twigs
      for (let b = 0; b < 3; b++) {
        const at0 = 0.35 + b * 0.22;
        const show = Math.max(0, Math.min(1, (g - at0) / 0.2));
        if (show <= 0) continue;
        const bx = fl.x + ca * fl.size * at0 * ease;
        const by = fl.y + sa * fl.size * at0 * ease;
        const bl = fl.size * (0.3 - b * 0.07) * show;
        for (const side of [-1, 1]) {
          const ba = ang + side * (Math.PI / 3);
          const cb = Math.cos(ba);
          const sb = Math.sin(ba);
          const ex = bx + cb * bl;
          const ey = by + sb * bl;
          line(bx, by, ex, ey, 1, branch);
          if (show > 0.6) {
            const mx = bx + cb * bl * 0.55;
            const my = by + sb * bl * 0.55;
            const tl = bl * 0.35 * (show - 0.6) * 2.5;
            for (const side2 of [-1, 1]) {
              const ta = ba + side2 * (Math.PI / 3);
              line(
                mx,
                my,
                mx + Math.cos(ta) * tl,
                my + Math.sin(ta) * tl,
                0.8,
                twig,
              );
            }
          }
          if (Math.random() < sparkleRate * 0.3)
            sparkle(ex, ey, 2 + Math.random() * 2, 0.7 * alpha);
        }
      }
      if (Math.random() < sparkleRate)
        sparkle(tx, ty, 2.5 + Math.random() * 3, 0.9 * alpha);
    }
    // a soft cold glow at the heart
    const r = fl.size * 0.25 * ease;
    const core = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, r);
    core.addColorStop(0, `hsla(${fl.tint},100%,85%,${0.22 * alpha})`);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = core;
    ctx.fillRect(fl.x - r, fl.y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* ---- the catalogue ------------------------------------------------------ */

const V = (draw, opts = {}) => ({ draw, opts });

const REGISTRY = {
  'Ambience: Water': V(ambience, { tint: 'water' }),
  'Ambience: Rainbow': V(ambience, { tint: 'rainbow' }),
  'Ambience: Swirl': V(ambience, { tint: 'rainbow', spin: 0.012 }),
  'Ambience: Warp': V(ambience, {
    tint: 'water',
    wall: true,
    scale: 1.045,
    persist: 0.85,
    fadeAmt: 0.12,
    coreGain: 0.35,
    smear: 0.045,
    streak: false,
    sparks: true,
    kickZoom: 0.09,
  }),
  'Ambience: Down the Drain': V(ambience, {
    tint: 'water',
    wall: true,
    scale: 0.972,
    spin: -0.04,
    pull: 0.03,
    persist: 0.97,
    fadeAmt: 0.03,
    soften: 0.012,
    streak: false,
    core: false,
    rim: true,
  }),
  'Ambience: Bubble': V(bubbles),

  'Bars and Waves: Bars': V(bars, { palette: 'bars' }),
  'Bars and Waves: Ocean Mist': V(bars, {
    palette: 'ocean',
    mist: true,
    fall: 1.2,
  }),
  'Bars and Waves: Fire Storm': V(bars, {
    palette: 'fire',
    mirror: true,
    flicker: true,
  }),

  'Musical Colors: Aurora': V(aurora),
  'Musical Colors: Night Lights': V(grid),
  'Musical Colors: Silky Wave': V(ribbon),
  'Musical Colors: Electric Rainbow': V(electric),
  'Musical Colors: Neon Highway': V(highway),
  'Musical Colors: Ice Crystals': V(crystals),
  'Musical Colors: Rolling Fire': V(flame),
  'Musical Colors: Acid Rock': V(bars, {
    palette: 'acid',
    mirror: true,
    jitter: true,
  }),

  'Particle: Particle': V(starfield, {}),
  'Particle: Rotating Particle': V(starfield, { rotate: true, trail: 0.18 }),

  'Plenoptic: Smokey Circles': V(circles),
  'Plenoptic: Vox': V(tunnel),
  'Plenoptic: Fountain': V(fountain),

  'Spikes: Spike': V(spikes),
  'Spikes: Amoeba': V(amoeba),

  Scope: V(scope, {}),

  'Dark Fountain': V(darkFountain),
};

/** Menu shape: family -> presets, in the order the registry lists them. */
export const VIZ_FAMILIES = (() => {
  const out = [];
  for (const name of Object.keys(REGISTRY)) {
    const split = name.indexOf(': ');
    if (split < 0) {
      out.push({ name, presets: null });
      continue;
    }
    const family = name.slice(0, split);
    const preset = name.slice(split + 2);
    const found = out.find(f => f.name === family);
    if (found) found.presets.push(preset);
    else out.push({ name: family, presets: [preset] });
  }
  return out;
})();

export const VIZ_PRESETS = Object.keys(REGISTRY);
export const DEFAULT_VIZ = 'Ambience: Water';

export function resolveViz(name) {
  if (name === ALBUM_ART) return { kind: 'albumart', id: name };
  if (name === NO_VIZ) return { kind: 'none', id: name };
  const entry = REGISTRY[name] || REGISTRY[DEFAULT_VIZ];
  return { ...entry, id: name };
}

/**
 * Draw one frame. `freq` and `wave` are the analyser's byte arrays; either may
 * be null before playback has started, in which case the canvas is cleared to
 * black — the stock player's idle state. `info` carries what the player
 * knows and the spectrum cannot tell: `{ playing, eggs }`.
 */
export function drawViz(ctx, viz, freq, wave, info) {
  const { width: w, height: h } = ctx.canvas;
  if (!w || !h) return;
  if (!viz || viz.kind === 'none' || viz.kind === 'albumart') {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const state = stateFor(ctx.canvas);
  claim(state, viz.id);
  state.t += 1 / 60;
  // the wall clock, for the presets that step by time rather than by frame
  const now = performance.now();
  state.dt =
    state.lastNow == null
      ? 1 / 60
      : Math.min(0.1, Math.max(0.001, (now - state.lastNow) / 1000));
  state.lastNow = now;
  state.wall = (state.wall || 0) + state.dt;
  viz.draw(ctx, freq, wave, w, h, viz.opts || {}, info);
}
