/**
 * Aliased (GDI-style) rasterization helpers for Paint.
 *
 * Real MS Paint never antialiases: every stroke is hard pixels. Canvas 2D
 * vector strokes antialias, so lines/curves/ellipses are rendered here by
 * sampling them into polylines and stamping square/round pens along a
 * Bresenham walk with fillRect, which stays pixel-crisp.
 */

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r, g, b) {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}

/** Walk a line with Bresenham's algorithm, calling plot(x, y) per pixel. */
export function bresenham(x0, y0, x1, y1, plot) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** Stamp a pen tip (square or aliased circle) centered near (x, y). */
export function stamp(ctx, x, y, size, shape = 'circle') {
  x = Math.round(x);
  y = Math.round(y);
  if (size <= 1) {
    ctx.fillRect(x, y, 1, 1);
    return;
  }
  const half = Math.floor(size / 2);
  if (shape === 'square') {
    ctx.fillRect(x - half, y - half, size, size);
    return;
  }
  // Aliased filled circle: horizontal spans per row
  const r = size / 2;
  for (let iy = 0; iy < size; iy++) {
    const dy = iy - r + 0.5;
    const span = Math.round(2 * Math.sqrt(Math.max(0, r * r - dy * dy)));
    if (span <= 0) continue;
    ctx.fillRect(x - Math.floor(span / 2), y - half + iy, span, 1);
  }
}

/** Stamp the pen along the line from (x0,y0) to (x1,y1). */
export function stampLine(ctx, x0, y0, x1, y1, size, shape = 'circle') {
  bresenham(x0, y0, x1, y1, (x, y) => stamp(ctx, x, y, size, shape));
}

/** Stamp the pen along a polyline of [x, y] points. */
export function stampPolyline(ctx, points, size, shape = 'circle', close) {
  if (!points.length) return;
  if (points.length === 1) {
    stamp(ctx, points[0][0], points[0][1], size, shape);
    return;
  }
  for (let i = 1; i < points.length; i++) {
    stampLine(
      ctx,
      points[i - 1][0],
      points[i - 1][1],
      points[i][0],
      points[i][1],
      size,
      shape,
    );
  }
  if (close) {
    const a = points[points.length - 1];
    const b = points[0];
    stampLine(ctx, a[0], a[1], b[0], b[1], size, shape);
  }
}

/** Sample an axis-aligned ellipse outline into a closed polyline. */
export function ellipsePoints(cx, cy, rx, ry) {
  const steps = Math.max(16, Math.ceil((rx + ry) * 1.5));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }
  return pts;
}

/** Sample a rounded-rectangle outline into a closed polyline. */
export function roundedRectPoints(x0, y0, x1, y1, radius) {
  const w = x1 - x0;
  const h = y1 - y0;
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const arc = (cx, cy, from, to) => {
    const pts = [];
    const steps = Math.max(4, Math.ceil(r));
    for (let i = 0; i <= steps; i++) {
      const t = from + ((to - from) * i) / steps;
      pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
    return pts;
  };
  const HP = Math.PI / 2;
  return [
    ...arc(x0 + r, y0 + r, Math.PI, Math.PI + HP), // top-left
    ...arc(x1 - r, y0 + r, -HP, 0), // top-right
    ...arc(x1 - r, y1 - r, 0, HP), // bottom-right
    ...arc(x0 + r, y1 - r, HP, Math.PI), // bottom-left
  ];
}

/** Sample a quadratic bezier into a polyline. */
export function quadraticPoints(p0, c, p1) {
  const pts = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
      u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
    ]);
  }
  return pts;
}

/** Sample a cubic bezier into a polyline. */
export function cubicPoints(p0, c1, c2, p1) {
  const pts = [];
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] +
        3 * u * u * t * c1[0] +
        3 * u * t * t * c2[0] +
        t * t * t * p1[0],
      u * u * u * p0[1] +
        3 * u * u * t * c1[1] +
        3 * u * t * t * c2[1] +
        t * t * t * p1[1],
    ]);
  }
  return pts;
}

/** Snap the endpoint of a line to 45-degree increments (Shift+Line). */
export function snap45(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  const len = Math.sqrt(dx * dx + dy * dy);
  return [
    Math.round(x0 + Math.cos(angle) * len),
    Math.round(y0 + Math.sin(angle) * len),
  ];
}

/**
 * Scanline flood fill with exact color match (tolerance 0), like Paint.
 * Mutates the ImageData in place; returns true if any pixel changed.
 */
export function floodFill(imageData, startX, startY, fillRgb) {
  const { width: w, height: h, data: d } = imageData;
  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return false;
  const start = (startY * w + startX) * 4;
  const tr = d[start];
  const tg = d[start + 1];
  const tb = d[start + 2];
  const [fr, fg, fb] = fillRgb;
  if (tr === fr && tg === fg && tb === fb) return false;

  const matches = i => d[i] === tr && d[i + 1] === tg && d[i + 2] === tb;
  const paint = i => {
    d[i] = fr;
    d[i + 1] = fg;
    d[i + 2] = fb;
    d[i + 3] = 255;
  };

  const stack = [[startX, startY]];
  while (stack.length) {
    let [x, y] = stack.pop();
    let i = (y * w + x) * 4;
    if (!matches(i)) continue;
    // Walk to the left edge of this span
    while (x > 0 && matches(i - 4)) {
      x--;
      i -= 4;
    }
    let spanAbove = false;
    let spanBelow = false;
    while (x < w && matches(i)) {
      paint(i);
      if (y > 0) {
        const above = i - w * 4;
        if (matches(above)) {
          if (!spanAbove) {
            stack.push([x, y - 1]);
            spanAbove = true;
          }
        } else {
          spanAbove = false;
        }
      }
      if (y < h - 1) {
        const below = i + w * 4;
        if (matches(below)) {
          if (!spanBelow) {
            stack.push([x, y + 1]);
            spanBelow = true;
          }
        } else {
          spanBelow = false;
        }
      }
      x++;
      i += 4;
    }
  }
  return true;
}

/**
 * Encode canvas pixels as an uncompressed 24-bit Windows bitmap
 * (BITMAPFILEHEADER + BITMAPINFOHEADER + bottom-up BGR rows).
 */
export function encodeBMP(imageData) {
  const { width: w, height: h, data } = imageData;
  const rowSize = Math.floor((24 * w + 31) / 32) * 4; // rows pad to 4 bytes
  const pixelBytes = rowSize * h;
  const fileSize = 54 + pixelBytes;
  const buf = new ArrayBuffer(fileSize);
  const dv = new DataView(buf);
  // BITMAPFILEHEADER
  dv.setUint8(0, 0x42); // 'B'
  dv.setUint8(1, 0x4d); // 'M'
  dv.setUint32(2, fileSize, true);
  dv.setUint32(6, 0, true); // reserved
  dv.setUint32(10, 54, true); // pixel data offset
  // BITMAPINFOHEADER
  dv.setUint32(14, 40, true);
  dv.setInt32(18, w, true);
  dv.setInt32(22, h, true); // positive = bottom-up
  dv.setUint16(26, 1, true); // planes
  dv.setUint16(28, 24, true); // bpp
  dv.setUint32(30, 0, true); // BI_RGB, no compression
  dv.setUint32(34, pixelBytes, true);
  dv.setInt32(38, 2835, true); // 72 DPI
  dv.setInt32(42, 2835, true);
  dv.setUint32(46, 0, true);
  dv.setUint32(50, 0, true);
  const bytes = new Uint8Array(buf);
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w * 4;
    const dst = 54 + y * rowSize;
    for (let x = 0; x < w; x++) {
      bytes[dst + x * 3] = data[src + x * 4 + 2]; // B
      bytes[dst + x * 3 + 1] = data[src + x * 4 + 1]; // G
      bytes[dst + x * 3 + 2] = data[src + x * 4]; // R
    }
  }
  return new Blob([buf], { type: 'image/bmp' });
}
