/*
 * Nine-slice parts as single textures, for fractional device pixel ratios.
 *
 * The theme draws Luna's parts with CSS border-image: nine rectangles cut
 * from the style's bitmap. At a whole device pixel ratio that is exact. At
 * 1.25 or 1.5 (Windows display scaling) the browser rounds each of the nine
 * rectangles on its own, and a rectangle edge that falls on a half pixel is
 * drawn half covered: a one pixel line between two slices that lets the
 * background through, reading as a seam across the part.
 *
 * So on a fractional ratio every element that draws a border-image part is
 * given one texture instead: the same nine slices, composed here into a
 * canvas at device resolution with whole-pixel slice edges, painted as a
 * background stretched to the element. One image cannot seam. The
 * border-image rules stay in the stylesheets and keep describing each
 * state; this module reads them back from the computed style and
 * recomposes when the element resizes, when its class or hover state
 * changes, or when the style swaps its bitmaps. On a whole ratio it stays
 * out of the way entirely and the border-images draw as before.
 */

const TEXTURES = new Map(); // texture key -> data URL
const IMAGES = new Map(); // bitmap URL -> HTMLImageElement, or a loading promise
const state = new WeakMap(); // element -> { key } while a texture is applied

let root = null;
let running = false;
let mutations = null;
let resizes = null;
let queued = new Set();
let frame = 0;

const ratio = () => window.devicePixelRatio || 1;
const isFractional = () => Math.abs(ratio() - Math.round(ratio())) > 0.001;

/** "13 52 14 6 fill" or "10% 20%" -> {t, r, b, l, fill} in source pixels. */
function parseSlice(text, img) {
  const parts = text
    .replace(/\s*fill\s*/, ' ')
    .trim()
    .split(/\s+/);
  const fill = /\bfill\b/.test(text);
  const nums = parts.map((p, i) => {
    const v = parseFloat(p);
    if (Number.isNaN(v)) return 0;
    if (p.endsWith('%'))
      return (v / 100) * (i % 2 ? img.naturalWidth : img.naturalHeight);
    return v;
  });
  const [t, r = t, b = t, l = r] = nums;
  return { t, r, b, l, fill };
}

/** "13px 52px 14px 6px" -> {t, r, b, l} in CSS pixels; 'auto' falls back to the slice. */
function parseWidths(text, slice) {
  const parts = text.trim().split(/\s+/);
  const nums = parts.map((p, i) => {
    if (p === 'auto') return [slice.t, slice.r, slice.b, slice.l][i];
    const v = parseFloat(p);
    return Number.isNaN(v) ? 0 : v;
  });
  const [t, r = t, b = t, l = r] = nums;
  return { t, r, b, l };
}

function loadImage(url) {
  const known = IMAGES.get(url);
  if (known) return known;
  const p = new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      IMAGES.set(url, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  IMAGES.set(url, p);
  return p;
}

/**
 * The nine slices drawn into a canvas of the element's size in device
 * pixels. Corner sizes round to whole device pixels, so adjacent slices
 * share an edge exactly; the middles stretch or tile as the style asks.
 */
function compose(img, slice, widths, cssW, cssH, dpr, repeat) {
  const W = Math.max(1, Math.round(cssW * dpr));
  const H = Math.max(1, Math.round(cssH * dpr));
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  // destination edge sizes, clamped so the two sides never cross
  let L = Math.round(widths.l * dpr);
  let R = Math.round(widths.r * dpr);
  let T = Math.round(widths.t * dpr);
  let B = Math.round(widths.b * dpr);
  if (L + R > W) {
    const k = W / (L + R);
    L = Math.floor(L * k);
    R = W - L;
  }
  if (T + B > H) {
    const k = H / (T + B);
    T = Math.floor(T * k);
    B = H - T;
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const sMidW = sw - slice.l - slice.r;
  const sMidH = sh - slice.t - slice.b;
  const dMidW = W - L - R;
  const dMidH = H - T - B;
  const draw = (sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) => {
    if (sWidth <= 0 || sHeight <= 0 || dWidth <= 0 || dHeight <= 0) return;
    ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  };
  // an edge that repeats is tiled at the source size, scaled to the ratio
  const tiled = (
    sx,
    sy,
    sWidth,
    sHeight,
    dx,
    dy,
    dWidth,
    dHeight,
    horizontal,
  ) => {
    if (sWidth <= 0 || sHeight <= 0 || dWidth <= 0 || dHeight <= 0) return;
    if (repeat === 'stretch' || !repeat) {
      draw(sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, dy, dWidth, dHeight);
    ctx.clip();
    if (horizontal) {
      const step = Math.max(1, Math.round(sWidth * dpr));
      for (let x = dx; x < dx + dWidth; x += step) {
        draw(sx, sy, sWidth, sHeight, x, dy, step, dHeight);
      }
    } else {
      const step = Math.max(1, Math.round(sHeight * dpr));
      for (let y = dy; y < dy + dHeight; y += step) {
        draw(sx, sy, sWidth, sHeight, dx, y, dWidth, step);
      }
    }
    ctx.restore();
  };
  // corners
  draw(0, 0, slice.l, slice.t, 0, 0, L, T);
  draw(sw - slice.r, 0, slice.r, slice.t, W - R, 0, R, T);
  draw(0, sh - slice.b, slice.l, slice.b, 0, H - B, L, B);
  draw(sw - slice.r, sh - slice.b, slice.r, slice.b, W - R, H - B, R, B);
  // edges
  tiled(slice.l, 0, sMidW, slice.t, L, 0, dMidW, T, true);
  tiled(slice.l, sh - slice.b, sMidW, slice.b, L, H - B, dMidW, B, true);
  tiled(0, slice.t, slice.l, sMidH, 0, T, L, dMidH, false);
  tiled(sw - slice.r, slice.t, slice.r, sMidH, W - R, T, R, dMidH, false);
  // the middle
  if (slice.fill) {
    if (repeat === 'stretch' || !repeat) {
      draw(slice.l, slice.t, sMidW, sMidH, L, T, dMidW, dMidH);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(L, T, dMidW, dMidH);
      ctx.clip();
      const stepX = Math.max(1, Math.round(sMidW * dpr));
      const stepY = Math.max(1, Math.round(sMidH * dpr));
      for (let y = T; y < T + dMidH; y += stepY) {
        for (let x = L; x < L + dMidW; x += stepX) {
          draw(slice.l, slice.t, sMidW, sMidH, x, y, stepX, stepY);
        }
      }
      ctx.restore();
    }
  }
  return canvas.toDataURL();
}

const urlOf = source => {
  const m = /^url\(["']?(.*?)["']?\)$/.exec(source.trim());
  return m ? m[1] : null;
};

function clear(el) {
  if (!state.has(el)) return;
  state.delete(el);
  el.style.removeProperty('border-image-source');
  el.style.removeProperty('background-image');
  el.style.removeProperty('background-size');
  el.style.removeProperty('background-repeat');
  el.style.removeProperty('background-position');
  if (resizes) resizes.unobserve(el);
}

/** Read the element's border-image back from the stylesheets and texture it. */
function update(el) {
  if (!el.isConnected) {
    clear(el);
    return;
  }
  // the override must come off for the stylesheet's value to show
  const had = state.has(el);
  if (had) el.style.removeProperty('border-image-source');
  const cs = getComputedStyle(el);
  const url = urlOf(cs.borderImageSource);
  if (!url) {
    clear(el);
    return;
  }
  const loaded = IMAGES.get(url);
  if (!(loaded instanceof HTMLImageElement)) {
    // keep the border-image until the bitmap is here, then come back
    if (had) el.style.removeProperty('background-image');
    loadImage(url).then(img => img && queue(el));
    return;
  }
  const cssW = el.offsetWidth;
  const cssH = el.offsetHeight;
  if (!cssW || !cssH) return;
  const dpr = ratio();
  const slice = parseSlice(cs.borderImageSlice, loaded);
  const widths = parseWidths(cs.borderImageWidth, slice);
  const repeat = cs.borderImageRepeat.split(/\s+/)[0];
  const key = `${url}|${cssW}x${cssH}|${dpr}|${cs.borderImageSlice}|${cs.borderImageWidth}|${repeat}`;
  let tex = TEXTURES.get(key);
  if (!tex) {
    tex = compose(loaded, slice, widths, cssW, cssH, dpr, repeat);
    TEXTURES.set(key, tex);
    if (TEXTURES.size > 400) TEXTURES.delete(TEXTURES.keys().next().value);
  }
  el.style.setProperty('border-image-source', 'none');
  el.style.setProperty('background-image', `url(${tex})`);
  el.style.setProperty('background-size', '100% 100%');
  el.style.setProperty('background-repeat', 'no-repeat');
  el.style.setProperty('background-position', '0 0');
  if (!had && resizes) resizes.observe(el);
  state.set(el, { key });
}

function flush() {
  frame = 0;
  const batch = queued;
  queued = new Set();
  for (const el of batch) update(el);
}

function queue(el) {
  queued.add(el);
  if (!frame) frame = requestAnimationFrame(flush);
}

/** Every element in a subtree that draws, or drew, a border-image. */
function scan(node) {
  if (!(node instanceof Element)) return;
  const all = [node, ...node.querySelectorAll('*')];
  for (const el of all) {
    if (state.has(el) || urlOf(getComputedStyle(el).borderImageSource))
      queue(el);
  }
}

/** The hovered element and its ancestors: any of them may change state. */
function chain(target) {
  for (
    let el = target;
    el && el !== root.parentElement;
    el = el.parentElement
  ) {
    if (
      el instanceof Element &&
      (state.has(el) || urlOf(getComputedStyle(el).borderImageSource))
    )
      queue(el);
  }
}

const onPointer = e => chain(e.target);

function start() {
  if (running || !root) return;
  running = true;
  resizes = new ResizeObserver(entries => {
    for (const entry of entries) queue(entry.target);
  });
  mutations = new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'childList') {
        for (const n of r.addedNodes) scan(n);
      } else if (r.target instanceof Element) {
        // a class or style change can repaint a whole window: its focus, say
        scan(r.target);
      }
    }
  });
  mutations.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [
      'class',
      'style',
      'data-state',
      'disabled',
      'aria-selected',
    ],
  });
  for (const type of [
    'mouseover',
    'mouseout',
    'mousedown',
    'mouseup',
    'focusin',
    'focusout',
  ]) {
    root.addEventListener(type, onPointer, true);
  }
  scan(root);
}

function stop() {
  if (!running) return;
  running = false;
  mutations.disconnect();
  mutations = null;
  for (const type of [
    'mouseover',
    'mouseout',
    'mousedown',
    'mouseup',
    'focusin',
    'focusout',
  ]) {
    root.removeEventListener(type, onPointer, true);
  }
  // hand every element back to its border-image
  for (const el of root.querySelectorAll('*')) clear(el);
  clear(root);
  resizes.disconnect();
  resizes = null;
  TEXTURES.clear();
}

/** Called by the screen whenever the stage mounts or the ratio changes. */
export function syncSliceCompositor(stageElement) {
  root = stageElement || root;
  if (!root || typeof ResizeObserver === 'undefined') return;
  if (isFractional()) {
    if (running) {
      // a new ratio: every texture is stale
      TEXTURES.clear();
      scan(root);
    } else {
      start();
    }
  } else {
    stop();
  }
}
