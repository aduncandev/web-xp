/**
 * The 2D screen savers.
 *
 * Settings names, ranges and defaults come from the DIALOG resources of the
 * real .scr binaries, so e.g. Beziers genuinely has "Beziers in each loop
 * (1-10)" and "Repeat each loop (1-100)" rather than invented options.
 */

import xpLogo from 'assets/windowsIcons/xplogo.png';

const rand = (lo, hi) => lo + Math.random() * (hi - lo);

/** The 16-entry palette XP's colour combo boxes offer. */
export const VGA_PALETTE = [
  ['Black', '#000000'],
  ['Maroon', '#800000'],
  ['Green', '#008000'],
  ['Olive', '#808000'],
  ['Navy', '#000080'],
  ['Purple', '#800080'],
  ['Teal', '#008080'],
  ['Silver', '#c0c0c0'],
  ['Gray', '#808080'],
  ['Red', '#ff0000'],
  ['Lime', '#00ff00'],
  ['Yellow', '#ffff00'],
  ['Blue', '#0000ff'],
  ['Fuchsia', '#ff00ff'],
  ['Aqua', '#00ffff'],
  ['White', '#ffffff'],
];
const paletteHex = i => (VGA_PALETTE[i] || VGA_PALETTE[15])[1];

function makeWanderer(w, h, speed) {
  return {
    x: rand(0, w),
    y: rand(0, h),
    dx: (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 1) * speed,
    dy: (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 1) * speed,
    step(width, height, dt) {
      this.x += this.dx * dt;
      this.y += this.dy * dt;
      if (this.x < 0) {
        this.x = 0;
        this.dx = Math.abs(this.dx);
      } else if (this.x > width) {
        this.x = width;
        this.dx = -Math.abs(this.dx);
      }
      if (this.y < 0) {
        this.y = 0;
        this.dy = Math.abs(this.dy);
      } else if (this.y > height) {
        this.y = height;
        this.dy = -Math.abs(this.dy);
      }
    },
  };
}

const TRAIL_INTERVAL = 0.075; // seconds between trail copies

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const m = (sa, sb) => Math.round(sa + (sb - sa) * t);
  return `rgb(${m((pa >> 16) & 255, (pb >> 16) & 255)},${m(
    (pa >> 8) & 255,
    (pb >> 8) & 255,
  )},${m(pa & 255, pb & 255)})`;
}

/**
 * Shared skeleton for Mystify: shapes whose corners bounce, each keeping
 * `lines` past positions drawn oldest-first. Colour is either a pair of
 * palette entries blended along the trail, or a walking hue.
 *
 * Clear Screen (ssmyst.scr): checked, the screen is blanked to black first.
 * Unchecked, the saver never blanks — it draws straight over whatever was on
 * screen and rubs out each retired line with the black background brush, so
 * the desktop slowly gets eaten by black streaks. Here "whatever was on
 * screen" is whatever the host shows behind a transparent canvas (the
 * Display Properties monitor has the real desktop bitmap there).
 */
function polySaver({ polys, draw, hueStep, clearScreen }) {
  let W = 1;
  let H = 1;
  let acc = 0;
  let drawn = false;
  const groups = polys.map(p => ({
    ...p,
    pts: null,
    history: [],
    hue: rand(0, 360),
  }));

  const paint = ctx => {
    ctx.lineWidth = 1;
    for (const g of groups) {
      if (!g.active || !g.pts) continue;
      g.history.forEach((snap, i) => {
        const t = i / Math.max(1, g.history.length - 1);
        if (g.twoColors) {
          ctx.strokeStyle = mixHex(g.colorA, g.colorB, t);
        } else {
          ctx.strokeStyle = `hsl(${snap.hue}, 100%, ${12 + t * 48}%)`;
        }
        draw(ctx, snap.pts);
      });
    }
  };

  // Rub out what the last paint() put down, with the background brush. A
  // touch wider than the line so the anti-aliased fringe goes with it.
  const erase = ctx => {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    for (const g of groups) {
      if (!g.active || !g.pts) continue;
      g.history.forEach(snap => draw(ctx, snap.pts));
    }
  };

  return {
    resize(w, h) {
      W = w;
      H = h;
      // The host resets the bitmap on resize, so there is nothing to erase
      drawn = false;
      groups.forEach(g => {
        if (!g.pts) {
          g.pts = Array.from({ length: g.points }, () =>
            makeWanderer(w, h, g.speed),
          );
        } else {
          g.pts.forEach(p => {
            p.x = Math.min(p.x, w);
            p.y = Math.min(p.y, h);
          });
        }
      });
    },
    frame(ctx, dt) {
      acc += dt;
      const record = acc >= TRAIL_INTERVAL;
      if (record) acc = 0;
      for (const g of groups) {
        if (!g.active || !g.pts) continue;
        for (const p of g.pts) p.step(W, H, dt);
        g.hue = (g.hue + hueStep * dt) % 360;
      }
      if (clearScreen) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
      } else if (drawn && record) {
        erase(ctx);
      }
      for (const g of groups) {
        if (!g.active || !g.pts) continue;
        if (record || g.history.length === 0) {
          g.history.push({
            pts: g.pts.map(p => ({ x: p.x, y: p.y })),
            hue: g.hue,
          });
        }
        while (g.history.length > g.lines) g.history.shift();
      }
      // Without a blank each frame the picture only changes when the trail
      // steps, so there is nothing to repaint in between.
      if (clearScreen || record || !drawn) {
        paint(ctx);
        drawn = true;
      }
    },
  };
}

// --- Mystify (ssmyst.scr) --------------------------------------------
// Dialog: Object { Shape combo, Active, Lines } + Colors To Use
// { Two Colors + 2 combos | Multiple Random Colors }, and Clear Screen.

export const MYSTIFY_DEFAULTS = {
  poly1Active: true,
  poly1Lines: 5,
  poly1TwoColors: false,
  poly1ColorA: 12,
  poly1ColorB: 15,
  poly2Active: true,
  poly2Lines: 5,
  poly2TwoColors: false,
  poly2ColorA: 9,
  poly2ColorB: 11,
  clearScreen: true,
  speed: 90,
};

export function createMystify(w, h, s) {
  const o = { ...MYSTIFY_DEFAULTS, ...(s || {}) };
  const saver = polySaver({
    hueStep: 40,
    clearScreen: o.clearScreen,
    polys: [1, 2].map(n => ({
      active: o[`poly${n}Active`],
      points: 4,
      lines: Math.min(15, Math.max(1, o[`poly${n}Lines`])),
      speed: o.speed * (n === 1 ? 1 : 0.85),
      twoColors: o[`poly${n}TwoColors`],
      colorA: paletteHex(o[`poly${n}ColorA`]),
      colorB: paletteHex(o[`poly${n}ColorB`]),
    })),
    draw(ctx, pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.stroke();
    },
  });
  saver.resize(w, h);
  return saver;
}

// --- Beziers (ssbezier.scr) ------------------------------------------
// Dialog: Length "Beziers in each loop (1-10)", Width "Repeat each loop
// (1-100)", Speed.

export const BEZIERS_DEFAULTS = { length: 3, width: 10, speed: 80 };

/**
 * Beziers draws a closed LOOP built from `length` cubic segments chained end
 * to end — the bends come from each segment's two control points wandering
 * independently — and keeps `width` older copies of the loop trailing behind
 * it. It is one continuous figure, not a scatter of separate curves.
 */
export function createBeziers(w, h, s) {
  const o = { ...BEZIERS_DEFAULTS, ...(s || {}) };
  const segs = Math.min(10, Math.max(1, o.length));
  const keep = Math.min(100, Math.max(1, o.width));
  let W = w;
  let H = h;
  let acc = 0;
  let hue = rand(0, 360);
  const history = [];

  // Three points per segment: an anchor plus its two controls. The next
  // segment starts at the following anchor, so the chain stays closed.
  const pts = Array.from({ length: segs * 3 }, () =>
    makeWanderer(w, h, o.speed),
  );

  return {
    resize(nw, nh) {
      W = nw;
      H = nh;
      pts.forEach(p => {
        p.x = Math.min(p.x, nw);
        p.y = Math.min(p.y, nh);
      });
    },
    frame(ctx, dt) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1;

      pts.forEach(p => p.step(W, H, dt));
      hue = (hue + 30 * dt) % 360;

      acc += dt;
      if (acc >= TRAIL_INTERVAL || history.length === 0) {
        acc = 0;
        history.push({ pts: pts.map(p => ({ x: p.x, y: p.y })), hue });
        while (history.length > keep) history.shift();
      }

      history.forEach((snap, i) => {
        const t = i / Math.max(1, history.length - 1);
        ctx.strokeStyle = `hsl(${snap.hue}, 100%, ${12 + t * 48}%)`;
        const q = snap.pts;
        ctx.beginPath();
        ctx.moveTo(q[0].x, q[0].y);
        for (let seg = 0; seg < segs; seg++) {
          const c1 = q[seg * 3 + 1];
          const c2 = q[seg * 3 + 2];
          // Last segment closes back onto the first anchor
          const end = q[((seg + 1) % segs) * 3];
          ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
        }
        ctx.stroke();
      });
    },
  };
}

// --- Starfield (ssstars.scr) -----------------------------------------
// Dialog: Warp Speed slider, Starfield Density "Number of stars (10-200)".

export const STARFIELD_DEFAULTS = { warp: 6, density: 60 };

export function createStarfield(w, h, s) {
  const o = { ...STARFIELD_DEFAULTS, ...(s || {}) };
  let W = w;
  let H = h;
  const count = Math.min(200, Math.max(10, o.density));
  const spawn = () => ({ x: rand(-1, 1), y: rand(-1, 1), z: rand(0.05, 1) });
  const stars = Array.from({ length: count }, spawn);
  return {
    resize(nw, nh) {
      W = nw;
      H = nh;
    },
    frame(ctx, dt) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;
      const scale = Math.min(W, H);
      for (const st of stars) {
        st.z -= (o.warp / 60) * dt;
        if (st.z <= 0.02) {
          const fresh = spawn();
          st.x = fresh.x;
          st.y = fresh.y;
          st.z = 1;
        }
        const px = cx + (st.x / st.z) * scale * 0.5;
        const py = cy + (st.y / st.z) * scale * 0.5;
        if (px < 0 || px > W || py < 0 || py > H) continue;
        const size = Math.max(1, (1 - st.z) * 3);
        const bright = Math.round(120 + (1 - st.z) * 135);
        ctx.fillStyle = `rgb(${bright},${bright},${bright})`;
        ctx.fillRect(px, py, size, size);
      }
    },
  };
}

// --- Marquee (ssmarque.scr) ------------------------------------------
// Dialog: Position (Centered/Random), Background Color combo, Speed, Text,
// and a Format Text... font chooser.

export const MARQUEE_DEFAULTS = {
  text: 'I Love Windows XP!',
  speed: 8,
  position: 'centered',
  backgroundColor: 0, // palette index — Black
  color: '#ff0000',
  fontSize: 48,
  bold: true,
  italic: false,
  fontFamily: 'Times New Roman',
};

export function createMarquee(w, h, s) {
  const o = { ...MARQUEE_DEFAULTS, ...(s || {}) };
  let W = w;
  let H = h;
  let x = w;
  let y = h / 2;
  let width = 0;
  const bg = paletteHex(o.backgroundColor);
  const font = () =>
    `${o.italic ? 'italic ' : ''}${o.bold ? 'bold ' : ''}${o.fontSize}px "${
      o.fontFamily
    }", serif`;
  const reset = ctx => {
    ctx.font = font();
    width = ctx.measureText(o.text).width || 1;
    x = W;
    y =
      o.position === 'random'
        ? rand(o.fontSize, Math.max(o.fontSize + 1, H - o.fontSize))
        : H / 2;
  };
  return {
    resize(nw, nh) {
      W = nw;
      H = nh;
      if (o.position !== 'random') y = nh / 2;
    },
    frame(ctx, dt) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      if (!width) reset(ctx);
      ctx.font = font();
      ctx.fillStyle = o.color;
      ctx.textBaseline = 'middle';
      ctx.fillText(o.text, x, y);
      x -= o.speed * 12 * dt;
      if (x + width < 0) reset(ctx);
    },
  };
}

// --- My Pictures Slideshow (ssmypics.scr) ----------------------------

export const MYPICS_DEFAULTS = {
  seconds: 6,
  sizePercent: 90,
  stretchSmall: false,
  showFileNames: false,
  transition: true,
  keyboardScroll: true,
};

/**
 * `images` is a list of picture URLs, or of `{ url, name }` objects when the
 * caller knows the real file name (object and blob URLs carry none).
 */
export function createMyPictures(w, h, s, images) {
  const o = { ...MYPICS_DEFAULTS, ...(s || {}) };
  let W = w;
  let H = h;
  let canvas = null;
  const list = (images || []).map(entry =>
    typeof entry === 'string' || !entry
      ? { url: String(entry || ''), name: null }
      : { url: entry.url || entry.src || '', name: entry.name || null },
  );
  const loaded = list.map(({ url }) => {
    const img = new Image();
    img.src = url;
    return img;
  });
  let i = 0;
  let prev = -1;
  let hold = 0;
  let fade = 1;

  const nameOf = n =>
    list[n].name || decodeURIComponent(list[n].url.split('/').pop() || '');

  const goTo = n => {
    prev = i;
    i = n;
    hold = 0;
    fade = o.transition ? 0 : 1;
  };

  // "Allow scrolling through pictures with the keyboard": left/right step
  // through the pictures instead of quitting the saver, every other key
  // still quits. Only the full-screen run takes the keys — the little
  // monitor preview on the Screen Saver tab must not hijack the desktop's
  // arrow keys.
  const onKey = e => {
    if (canvas && !canvas.isConnected) {
      // The host tore the canvas down without calling destroy()
      window.removeEventListener('keydown', onKey, true);
      return;
    }
    if (
      loaded.length === 0 ||
      !canvas ||
      W < window.innerWidth * 0.9 ||
      H < window.innerHeight * 0.9
    ) {
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      goTo((i + 1) % loaded.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      goTo((i - 1 + loaded.length) % loaded.length);
    } else {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  if (o.keyboardScroll) window.addEventListener('keydown', onKey, true);
  const detach = () => window.removeEventListener('keydown', onKey, true);

  const place = img => {
    const boxW = (W * o.sizePercent) / 100;
    const boxH = (H * o.sizePercent) / 100;
    let k = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
    // Without "Stretch small pictures", a small image keeps its own size
    if (!o.stretchSmall) k = Math.min(1, k);
    const dw = img.naturalWidth * k;
    const dh = img.naturalHeight * k;
    return [(W - dw) / 2, (H - dh) / 2, dw, dh];
  };
  const ready = img => img && img.complete && img.naturalWidth > 0;

  return {
    destroy: detach,
    resize(nw, nh) {
      W = nw;
      H = nh;
    },
    frame(ctx, dt) {
      canvas = ctx.canvas;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      if (loaded.length === 0) {
        ctx.fillStyle = '#888';
        ctx.font = '16px Tahoma, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No pictures in My Pictures', W / 2, H / 2);
        ctx.textAlign = 'left';
        return;
      }
      hold += dt;
      if (hold > o.seconds) goTo((i + 1) % loaded.length);
      if (fade < 1) fade = Math.min(1, fade + dt * 1.6);
      const img = loaded[i];
      if (!ready(img)) return;
      // "Use transition effects between pictures": the outgoing picture
      // stays underneath while the new one fades up over it
      if (fade < 1 && prev >= 0 && prev !== i && ready(loaded[prev])) {
        ctx.drawImage(loaded[prev], ...place(loaded[prev]));
      }
      ctx.globalAlpha = fade;
      ctx.drawImage(img, ...place(img));
      ctx.globalAlpha = 1;
      if (o.showFileNames) {
        ctx.fillStyle = '#fff';
        ctx.font = '14px Tahoma, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(nameOf(i), W / 2, H - 18);
        ctx.textAlign = 'left';
      }
    },
  };
}

// --- Windows XP (logon.scr) / Blank (scrnsave.scr) -------------------

export function createWindowsXP(w, h) {
  let W = w;
  let H = h;
  const img = new Image();
  img.src = xpLogo;
  const drift = makeWanderer(w, h, 26);
  let t = 0;
  return {
    resize(nw, nh) {
      W = nw;
      H = nh;
    },
    frame(ctx, dt) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      t += dt;
      if (!img.complete || !img.naturalWidth) return;
      const logoW = Math.min(W, H) * 0.45;
      const logoH = (img.naturalHeight / img.naturalWidth) * logoW;
      drift.step(Math.max(1, W - logoW), Math.max(1, H - logoH), dt);
      ctx.globalAlpha = 0.75 + Math.sin(t * 1.2) * 0.25;
      ctx.drawImage(img, drift.x, drift.y, logoW, logoH);
      ctx.globalAlpha = 1;
    },
  };
}

export function createBlank(w, h) {
  let W = w;
  let H = h;
  return {
    resize(nw, nh) {
      W = nw;
      H = nh;
    },
    frame(ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    },
  };
}
