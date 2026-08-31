// Pure canvas/geometry helpers for Paint. Nothing here touches React state:
// every function closes over nothing and works only on its arguments.

import { stampPolyline, ellipsePoints, roundedRectPoints } from './raster';

export function cloneCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

export function pathFromPoints(pts, dx = 0, dy = 0) {
  const p = new Path2D();
  p.moveTo(pts[0][0] + dx, pts[0][1] + dy);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0] + dx, pts[i][1] + dy);
  p.closePath();
  return p;
}

export function wrapTextLines(ctx, text, maxWidth) {
  const lines = [];
  for (const para of text.split('\n')) {
    if (!para) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function normRect(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

export function constrainSquare(start, p) {
  const dx = p.x - start.x;
  const dy = p.y - start.y;
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: start.x + (dx < 0 ? -m : m), y: start.y + (dy < 0 ? -m : m) };
}

export function drawShape(
  g,
  kind,
  start,
  end,
  primary,
  secondary,
  mode,
  width,
) {
  const x0 = Math.min(start.x, end.x);
  const x1 = Math.max(start.x, end.x);
  const y0 = Math.min(start.y, end.y);
  const y1 = Math.max(start.y, end.y);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  if (kind === 'rect') {
    if (mode === 'both') {
      g.fillStyle = secondary;
      g.fillRect(x0, y0, w, h);
    } else if (mode === 'fill') {
      g.fillStyle = primary;
      g.fillRect(x0, y0, w, h);
    }
    if (mode !== 'fill') {
      g.fillStyle = primary;
      const t = Math.min(width, Math.floor(Math.min(w, h) / 2)) || 1;
      g.fillRect(x0, y0, w, t);
      g.fillRect(x0, y1 - t + 1, w, t);
      g.fillRect(x0, y0, t, h);
      g.fillRect(x1 - t + 1, y0, t, h);
    }
    return;
  }
  let outline;
  let fillPath;
  if (kind === 'ellipse') {
    const rx = (x1 - x0) / 2;
    const ry = (y1 - y0) / 2;
    const cx = x0 + rx;
    const cy = y0 + ry;
    outline = ellipsePoints(cx, cy, rx, ry);
    fillPath = new Path2D();
    fillPath.ellipse(cx + 0.5, cy + 0.5, rx + 0.5, ry + 0.5, 0, 0, Math.PI * 2);
  } else {
    // rounded rectangle — Paint uses a small fixed corner radius
    outline = roundedRectPoints(x0, y0, x1, y1, 8);
    fillPath = pathFromPoints(outline.map(([px, py]) => [px + 0.5, py + 0.5]));
  }
  if (mode === 'both') {
    g.fillStyle = secondary;
    g.fill(fillPath);
  } else if (mode === 'fill') {
    g.fillStyle = primary;
    g.fill(fillPath);
  }
  // Stamped outline keeps edges crisp in every mode
  g.fillStyle = primary;
  stampPolyline(g, outline, mode === 'fill' ? 1 : width, 'circle', true);
}
