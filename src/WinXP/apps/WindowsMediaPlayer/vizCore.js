/*
 * What every visualization shares: the per-canvas scratch state, the
 * spectrum helpers, and the beat detector. Renderers live in
 * visualizations.js (the catalogue) and darkFountain.js (the one big scene).
 */

// Each canvas keeps its own feedback buffer, clock and particles.
const scratch = new WeakMap();

export function stateFor(canvas) {
  let state = scratch.get(canvas);
  if (!state) {
    state = {
      fb: document.createElement('canvas'),
      t: 0,
      rings: [],
      dots: [],
      lastBass: 0,
      since: 0,
    };
    scratch.set(canvas, state);
  }
  if (state.fb.width !== canvas.width || state.fb.height !== canvas.height) {
    state.fb.width = canvas.width;
    state.fb.height = canvas.height;
  }
  return state;
}

/**
 * Hand the canvas over to a different visualization.
 *
 * The scratch state is shared per canvas, and the renderers do not agree on
 * what a particle looks like — the fountain's have velocities, the bubbles'
 * have radii. Switching without clearing hands the new one the old one's
 * particles and it reads fields that were never there, so this wipes the
 * buffers and the feedback image on every change. `scene` is where a
 * scene-driven renderer keeps its act; it starts over too.
 */
export function claim(state, id) {
  if (state.owner === id) return;
  state.owner = id;
  state.rings = [];
  state.dots = [];
  state.lastBass = 0;
  state.since = 0;
  state.fireReady = false;
  state.scene = null;
  const f = state.fb.getContext('2d');
  f.setTransform(1, 0, 0, 1, 0, 0);
  f.globalAlpha = 1;
  f.globalCompositeOperation = 'source-over';
  f.clearRect(0, 0, state.fb.width, state.fb.height);
}

/** Average of a slice of the spectrum, 0..1. */
export function band(freq, from, to) {
  if (!freq) return 0;
  const a = Math.floor(freq.length * from);
  const b = Math.max(a + 1, Math.floor(freq.length * to));
  let sum = 0;
  for (let i = a; i < b; i++) sum += freq[i];
  return sum / ((b - a) * 255);
}

export function peak(wave) {
  if (!wave) return 0;
  let amp = 0;
  for (let i = 0; i < wave.length; i += 4)
    amp = Math.max(amp, Math.abs(wave[i] - 128) / 128);
  return amp;
}

/** Spectrum value 0..1 at a position along the audible range. */
export function at(freq, p, spread = 0.42) {
  if (!freq) return 0;
  return freq[Math.floor(p * freq.length * spread)] / 255;
}

export const hue = (h, s = 100, l = 50, a = 1) =>
  `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;

/** A rising edge in the low end, for anything that wants to fire on a beat. */
export function beat(state, freq, gap = 6) {
  const bass = band(freq, 0, 0.1);
  state.since += 1;
  const hit = bass > 0.12 && bass > state.lastBass * 1.04 && state.since > gap;
  state.lastBass = bass * 0.5 + state.lastBass * 0.5;
  if (hit) state.since = 0;
  return { hit, bass };
}

/**
 * A phase that advances with the audio rather than the wall clock. The
 * effects that travel — the tunnel, the highway — were reading `t` directly,
 * which meant they moved at the same rate through silence as through a
 * chorus. This crawls when it is quiet and races when it is loud.
 */
export function advance(state, name, energy, idle = 0.02, gain = 1) {
  const key = `ph_${name}`;
  state[key] = (state[key] || 0) + idle + energy * gain;
  return state[key];
}

export const fade = (ctx, w, h, alpha) => {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, w, h);
};
