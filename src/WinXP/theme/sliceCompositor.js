/*
 * The theme's bitmaps as single, pixel-aligned textures on a fractional
 * device pixel ratio.
 *
 * The theme draws Luna's parts with CSS border-image: nine rectangles cut
 * from the style's bitmap. At a whole device pixel ratio that is exact. At
 * 1.25 or 1.5 (Windows display scaling) the browser rounds each of the nine
 * rectangles on its own and lands the element itself on a half pixel, so
 * slice edges leak hairlines and every edge is resampled soft.
 *
 * So on a fractional ratio every element that draws a border-image part is
 * given one texture instead: the same nine slices, composed here into a
 * canvas at device resolution with whole-pixel slice edges and no
 * interpolation, then painted as a background at its own device size and
 * shifted by the element's sub-pixel offset, so each texture pixel lands on
 * one device pixel and the browser copies it rather than resampling. The
 * bitmaps drawn at their natural size as plain backgrounds (caption
 * buttons, check boxes) get the same treatment. The stylesheets keep
 * describing every state; this module reads the computed style back and
 * recomposes when an element resizes, moves, changes class or hover state,
 * or when the style swaps its bitmaps. On a whole ratio it stays out of the
 * way entirely and the stylesheets draw as before.
 */

const TEXTURES = new Map(); // texture key -> data URL
const IMAGES = new Map(); // bitmap URL -> HTMLImageElement, or a loading promise
const state = new WeakMap(); // element -> { key } while a texture is applied

// plain background sprites larger than this are pictures, not chrome
const SPRITE_LIMIT = 64;
const MAX_TEXTURE = 4096;

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

/** A comma separated CSS list, leaving commas inside parentheses alone. */
function splitList(text) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const urlOf = source => {
  const m = /^url\(["']?(.*?)["']?\)$/.exec((source || '').trim());
  return m ? m[1] : null;
};

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

const loaded = url => {
  const v = IMAGES.get(url);
  return v instanceof HTMLImageElement ? v : null;
};

function canvasFor(W, H) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  // every source pixel becomes whole device pixels: a 1px outline comes out
  // one or two pixels wide, never a soft smear
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/**
 * The nine slices drawn into a canvas of the element's size in device
 * pixels. Corner sizes round to whole device pixels, so adjacent slices
 * share an edge exactly; the middles stretch or tile as the style asks.
 */
function composeSlices(img, slice, widths, W, H, dpr, repeat) {
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
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
  const { canvas, ctx } = canvasFor(W, H);
  const sMidW = sw - slice.l - slice.r;
  const sMidH = sh - slice.t - slice.b;
  const dMidW = W - L - R;
  const dMidH = H - T - B;
  const draw = (sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) => {
    if (sWidth <= 0 || sHeight <= 0 || dWidth <= 0 || dHeight <= 0) return;
    ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  };
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
  draw(0, 0, slice.l, slice.t, 0, 0, L, T);
  draw(sw - slice.r, 0, slice.r, slice.t, W - R, 0, R, T);
  draw(0, sh - slice.b, slice.l, slice.b, 0, H - B, L, B);
  draw(sw - slice.r, sh - slice.b, slice.r, slice.b, W - R, H - B, R, B);
  tiled(slice.l, 0, sMidW, slice.t, L, 0, dMidW, T, true);
  tiled(slice.l, sh - slice.b, sMidW, slice.b, L, H - B, dMidW, B, true);
  tiled(0, slice.t, slice.l, sMidH, 0, T, L, dMidH, false);
  tiled(sw - slice.r, slice.t, slice.r, sMidH, W - R, T, R, dMidH, false);
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

/**
 * Plain background sprites, each at its natural size scaled to the ratio,
 * bottom layer first, placed as the stylesheet positions them.
 */
function composeSprites(layers, W, H, dpr) {
  const { canvas, ctx } = canvasFor(W, H);
  for (let i = layers.length - 1; i >= 0; i--) {
    const { img, position } = layers[i];
    const w = Math.round(img.naturalWidth * dpr);
    const h = Math.round(img.naturalHeight * dpr);
    const x = position === 'center' ? Math.round((W - w) / 2) : 0;
    const y = position === 'center' ? Math.round((H - h) / 2) : 0;
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, x, y, w, h);
  }
  return canvas.toDataURL();
}

/** A background made only of the theme's small bitmaps, or null. */
function spriteLayers(cs) {
  const images = splitList(cs.backgroundImage);
  if (!images.length || images.some(v => !urlOf(v) || v.includes('data:'))) {
    return null;
  }
  const repeats = splitList(cs.backgroundRepeat);
  const positions = splitList(cs.backgroundPosition);
  const sizes = splitList(cs.backgroundSize);
  const layers = [];
  for (let i = 0; i < images.length; i++) {
    const url = urlOf(images[i]);
    const repeat = repeats[i % repeats.length] || 'repeat';
    const size = sizes[i % sizes.length] || 'auto';
    const pos = (positions[i % positions.length] || '0% 0%').trim();
    if (!/^no-repeat/.test(repeat) || !/^auto/.test(size)) return null;
    let position;
    if (pos === '50% 50%' || pos === 'center') position = 'center';
    else if (pos === '0% 0%' || pos === '0px 0px') position = 'start';
    else return null;
    layers.push({ url, position });
  }
  return layers;
}

const OVERRIDES = [
  'border-image-source',
  'background-image',
  'background-size',
  'background-repeat',
  'background-position',
  'image-rendering',
];

function clear(el) {
  if (!state.has(el)) return;
  state.delete(el);
  for (const p of OVERRIDES) el.style.removeProperty(p);
  if (resizes) resizes.unobserve(el);
}

/**
 * Paint a device-sized texture so that its pixels land one to one: sized in
 * the element's own pixels (undoing any stage scale) and shifted by the
 * element's sub-pixel offset on the device grid.
 */
function apply(el, tex, W, H, dpr, rect) {
  const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1;
  const unit = dpr * scale; // device pixels per element pixel
  const devX = rect.left * dpr;
  const devY = rect.top * dpr;
  const offX = (Math.round(devX) - devX) / unit;
  const offY = (Math.round(devY) - devY) / unit;
  el.style.setProperty('border-image-source', 'none');
  el.style.setProperty('background-image', `url(${tex})`);
  el.style.setProperty('background-size', `${W / unit}px ${H / unit}px`);
  el.style.setProperty('background-repeat', 'no-repeat');
  el.style.setProperty('background-position', `${offX}px ${offY}px`);
  // the stylesheet interpolates bitmaps on this ratio; a texture already
  // laid on the device grid must be copied, not resampled
  el.style.setProperty('image-rendering', 'pixelated', 'important');
}

function keep(key, tex) {
  TEXTURES.set(key, tex);
  if (TEXTURES.size > 400) TEXTURES.delete(TEXTURES.keys().next().value);
  return tex;
}

/** Read the element's chrome back from the stylesheets and texture it. */
function update(el) {
  if (!el.isConnected) {
    clear(el);
    return;
  }
  // the overrides must come off for the stylesheet's values to show
  const had = state.has(el);
  if (had) for (const p of OVERRIDES) el.style.removeProperty(p);
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const dpr = ratio();
  const W = Math.round(rect.width * dpr);
  const H = Math.round(rect.height * dpr);
  if (!W || !H || W > MAX_TEXTURE || H > MAX_TEXTURE) {
    clear(el);
    return;
  }
  const sliceUrl = urlOf(cs.borderImageSource);
  if (sliceUrl) {
    const img = loaded(sliceUrl);
    if (!img) {
      loadImage(sliceUrl).then(ok => ok && queue(el));
      return;
    }
    const slice = parseSlice(cs.borderImageSlice, img);
    const widths = parseWidths(cs.borderImageWidth, slice);
    const repeat = cs.borderImageRepeat.split(/\s+/)[0];
    const key = `slice|${sliceUrl}|${W}x${H}|${dpr}|${cs.borderImageSlice}|${cs.borderImageWidth}|${repeat}`;
    const tex =
      TEXTURES.get(key) ||
      keep(key, composeSlices(img, slice, widths, W, H, dpr, repeat));
    apply(el, tex, W, H, dpr, rect);
    if (!had && resizes) resizes.observe(el);
    state.set(el, { key });
    return;
  }
  const layers = spriteLayers(cs);
  if (layers) {
    const imgs = layers.map(l => loaded(l.url));
    if (imgs.some(i => !i)) {
      Promise.all(layers.map(l => loadImage(l.url))).then(() => queue(el));
      return;
    }
    if (
      imgs.some(
        i => i.naturalWidth > SPRITE_LIMIT || i.naturalHeight > SPRITE_LIMIT,
      )
    ) {
      clear(el);
      return;
    }
    const key = `sprite|${layers
      .map(l => `${l.url}@${l.position}`)
      .join(',')}|${W}x${H}|${dpr}`;
    const tex =
      TEXTURES.get(key) ||
      keep(
        key,
        composeSprites(
          layers.map((l, i) => ({ img: imgs[i], position: l.position })),
          W,
          H,
          dpr,
        ),
      );
    apply(el, tex, W, H, dpr, rect);
    if (!had && resizes) resizes.observe(el);
    state.set(el, { key });
    return;
  }
  clear(el);
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

/** Whether an element draws any of the theme's bitmaps itself. */
function draws(el) {
  if (state.has(el)) return true;
  const cs = getComputedStyle(el);
  if (urlOf(cs.borderImageSource)) return true;
  return cs.backgroundImage.includes('url(') && !!spriteLayers(cs);
}

/** Every element in a subtree that draws, or drew, the theme's bitmaps. */
function scan(node) {
  if (!(node instanceof Element)) return;
  const all = [node, ...node.querySelectorAll('*')];
  for (const el of all) if (draws(el)) queue(el);
}

/** The hovered element and its ancestors: any of them may change state. */
function chain(target) {
  for (
    let el = target;
    el && el !== root.parentElement;
    el = el.parentElement
  ) {
    if (el instanceof Element && draws(el)) queue(el);
  }
}

const onPointer = e => chain(e.target);
const EVENTS = [
  'mouseover',
  'mouseout',
  'mousedown',
  'mouseup',
  'focusin',
  'focusout',
];

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
        // a class or style change can repaint or move a whole window
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
  for (const type of EVENTS) root.addEventListener(type, onPointer, true);
  scan(root);
}

function stop() {
  if (!running) return;
  running = false;
  mutations.disconnect();
  mutations = null;
  for (const type of EVENTS) root.removeEventListener(type, onPointer, true);
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
      TEXTURES.clear();
      scan(root);
    } else {
      start();
    }
  } else {
    stop();
  }
}
