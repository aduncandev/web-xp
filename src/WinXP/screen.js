/*
 * The screen, as Display Properties' Settings tab sets it. The desktop is
 * laid out on a stage of the chosen resolution and the stage is scaled
 * down, never up, to fit the browser window, centred, with black around
 * it where the shapes differ: a 1024x768 desktop in a wide window sits
 * between two black bars, like a 4:3 picture on a modern monitor.
 * Fullscreen is the browser window itself. The DPI setting draws fewer,
 * larger logical pixels on the same stage.
 *
 * The shell lays out in stage pixels; pointer events and client rects
 * arrive in screen pixels. Gesture code converts: toLogicalX/Y for a
 * point, toLogical for a delta, screenSize() for the stage's size.
 *
 * Machine state, like the volume's machine copy: XP keeps the resolution,
 * colour depth and DPI per display, not per user.
 */
import { useEffect, useState } from 'react';

const KEY = 'xpDisplay';
export const STAGE_ID = 'xp-stage';
export const PORTAL_ID = 'xp-portal';
export const MODES = [
  [640, 480],
  [800, 600],
  [1024, 768],
  [1152, 864],
  [1280, 960],
  [1280, 1024],
  [1600, 1200],
];
export const DEFAULT_DISPLAY = { mode: null, depth: 32, dpi: 96 };

const listeners = new Set();
let current = readDisplay();
let active = false;
let geometry = { width: 1024, height: 768, scale: 1, x: 0, y: 0 };

export function readDisplay() {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    const d = { ...DEFAULT_DISPLAY, ...(v && typeof v === 'object' ? v : {}) };
    if (!Array.isArray(d.mode) || d.mode.length !== 2) d.mode = null;
    return d;
  } catch {
    return { ...DEFAULT_DISPLAY };
  }
}

export const getDisplay = () => current;
export const getGeometry = () => geometry;

/**
 * One stage pixel has to cover a whole number of device pixels, or the
 * browser lands element edges and bitmap slices on half pixels and the
 * chrome shows seams: Windows at 125% or 150% display scaling reports a
 * device pixel ratio of 1.25 or 1.5, where a macOS retina display reports
 * 2 and never shows them. Snapping down keeps the desktop crisp; it only
 * gives up when the window is smaller than the stage in device pixels,
 * where there is nothing to snap to.
 */
function snapScale(raw, dpr) {
  const steps = Math.floor(raw * dpr + 1e-6);
  return steps >= 1 ? steps / dpr : raw;
}

const ratio = () =>
  (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

/** Where a setting puts the stage on the current browser window. */
export function layoutFor(
  d,
  vw = window.innerWidth,
  vh = window.innerHeight,
  dpr = ratio(),
) {
  // Large DPI draws fewer, bigger logical pixels, which is a scale of its
  // own and stays out of the snapping
  const dpi = (d.dpi || 96) / 96;
  if (!d.mode) {
    const scale = snapScale(1, dpr) * dpi;
    return {
      width: Math.round(vw / scale),
      height: Math.round(vh / scale),
      scale,
      x: 0,
      y: 0,
    };
  }
  const [mw, mh] = d.mode;
  const width = Math.round(mw / dpi);
  const height = Math.round(mh / dpi);
  const fit = Math.min(vw / mw, vh / mh, 1);
  const scale = snapScale(fit, dpr) * dpi;
  return {
    width,
    height,
    scale,
    x: Math.round((vw - width * scale) / 2),
    y: Math.round((vh - height * scale) / 2),
  };
}

/** What the Settings tab prints for a setting. */
export function modeLabel(d) {
  const [w, h] = d.mode || [window.innerWidth, window.innerHeight];
  return `${w} by ${h} pixels`;
}

/** Screen pixels to stage pixels: a delta, or a point's x or y. */
export const toLogical = v => v / geometry.scale;
export const toLogicalX = x => (x - geometry.x) / geometry.scale;
export const toLogicalY = y => (y - geometry.y) / geometry.scale;

/** The stage's size, in the pixels the shell lays out in. */
export function screenSize() {
  return { width: geometry.width, height: geometry.height };
}

const stage = () => document.getElementById(STAGE_ID);

function paint() {
  geometry = active
    ? layoutFor(current)
    : {
        width: window.innerWidth,
        height: window.innerHeight,
        scale: 1,
        x: 0,
        y: 0,
      };
  const el = stage();
  if (el) {
    el.style.width = `${geometry.width}px`;
    el.style.height = `${geometry.height}px`;
    el.style.transform =
      geometry.scale === 1 && !geometry.x && !geometry.y
        ? ''
        : `translate(${geometry.x}px, ${geometry.y}px) scale(${geometry.scale})`;
    el.style.filter = active && current.depth === 16 ? 'url(#xp-16bit)' : '';
    if (active && current.depth === 16) ensureDepthFilter();
  }
  document.documentElement.dataset.xpLetterbox =
    active && (geometry.x || geometry.y) ? '1' : '';
  for (const fn of listeners) fn();
}

/** Put a display setting into effect and remember it. */
export function applyDisplay(d) {
  current = { ...DEFAULT_DISPLAY, ...d };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // storage unavailable
  }
  paint();
}

/** The desktop is on screen: lay it out at the chosen resolution. */
export function enterScreen() {
  active = true;
  paint();
}

/** The logon and boot screens draw at the browser's own size. */
export function leaveScreen() {
  active = false;
  paint();
}

/** Called once the stage element exists, so its size is right from the start. */
export function stageMounted() {
  paint();
}

export function subscribeScreen(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', paint);
  // moving the window to a display with another scaling factor changes the
  // device pixel ratio without always resizing the window
  let watch = null;
  const watchRatio = () => {
    if (watch) watch.removeEventListener('change', onRatio);
    watch = window.matchMedia(`(resolution: ${ratio()}dppx)`);
    watch.addEventListener('change', onRatio);
  };
  const onRatio = () => {
    paint();
    watchRatio();
  };
  watchRatio();
}

export function useScreenSize() {
  const [size, setSize] = useState(() => screenSize());
  useEffect(() => {
    const update = () => setSize(screenSize());
    const off = subscribeScreen(update);
    update();
    return off;
  }, []);
  return size;
}

/** Where portals mount: inside the stage, so fixed positions are stage positions. */
export function portalRoot() {
  return document.getElementById(PORTAL_ID) || document.body;
}

// Medium (16 bit): red and blue in 32 steps, green in 64, the 5-6-5 look
function ensureDepthFilter() {
  if (document.getElementById('xp-16bit')) return;
  const steps = n =>
    Array.from({ length: n }, (_, i) => (i / (n - 1)).toFixed(4)).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML = `<filter id="xp-16bit" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="discrete" tableValues="${steps(
    32,
  )}"/><feFuncG type="discrete" tableValues="${steps(
    64,
  )}"/><feFuncB type="discrete" tableValues="${steps(
    32,
  )}"/></feComponentTransfer></filter>`;
  document.body.appendChild(svg);
}
