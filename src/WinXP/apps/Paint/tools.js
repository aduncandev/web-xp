// What each tool does with the mouse. Every handler takes `paint`, the
// bag index.jsx builds each render: the document, the selection, the text
// box, the live state mirror, the in-progress refs, and the setters.
import {
  hexToRgb,
  rgbToHex,
  stamp,
  stampLine,
  stampPolyline,
  quadraticPoints,
  cubicPoints,
  snap45,
  floodFill,
} from './raster';
import {
  pathFromPoints,
  normRect,
  constrainSquare,
  drawShape,
} from './helpers';

/* ---- pointer helpers ---------------------------------------------------- */

export function getPos(paint, e) {
  const rect = paint.doc.canvasRef.current.getBoundingClientRect();
  const z = paint.live.current.zoom;
  return {
    x: Math.floor((e.clientX - rect.left) / z),
    y: Math.floor((e.clientY - rect.top) / z),
  };
}

function clampPos(paint, p) {
  const { w, h } = paint.live.current.canvasSize;
  return {
    x: Math.max(0, Math.min(w - 1, p.x)),
    y: Math.max(0, Math.min(h - 1, p.y)),
  };
}

function clampEdge(paint, p) {
  const { w, h } = paint.live.current.canvasSize;
  return {
    x: Math.max(0, Math.min(w, p.x)),
    y: Math.max(0, Math.min(h, p.y)),
  };
}

/** Follow the mouse until it is released, in canvas coordinates. */
export function startDrag(paint, onMove, onUp) {
  const move = e => onMove(getPos(paint, e), e);
  const up = e => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    paint.dragRef.current = false;
    if (onUp) onUp(getPos(paint, e), e);
  };
  paint.dragRef.current = true;
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

function drawEraserCursor(paint, p) {
  paint.redrawOverlay(o => {
    const s = paint.live.current.eraserSize;
    const x = Math.round(p.x - s / 2);
    const y = Math.round(p.y - s / 2);
    o.fillStyle = paint.live.current.bg;
    o.fillRect(x, y, s, s);
    o.fillStyle = '#000000';
    o.fillRect(x, y, s, 1);
    o.fillRect(x, y + s - 1, s, 1);
    o.fillRect(x, y, 1, s);
    o.fillRect(x + s - 1, y, 1, s);
  });
}

function sprayAt(paint, p, color, size) {
  const ctx = paint.doc.ctx2d();
  ctx.fillStyle = color;
  const r = size / 2;
  const dots = Math.max(4, Math.round(size * 0.6));
  for (let i = 0; i < dots; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * r;
    ctx.fillRect(
      Math.round(p.x + Math.cos(a) * d),
      Math.round(p.y + Math.sin(a) * d),
      1,
      1,
    );
  }
}

const sizeText = (a, b, plusOne) =>
  `${Math.abs(b.x - a.x) + (plusOne ? 1 : 0)}x${Math.abs(b.y - a.y) +
    (plusOne ? 1 : 0)}`;

/* ---- selection moves ---------------------------------------------------- */

function startSelectionMove(paint, pos) {
  const { selection } = paint;
  const sel = selection.selRef.current;
  if (!sel.floating) {
    paint.doc.pushUndo();
    sel.undoPushed = true;
    selection.lift();
  }
  const ox = pos.x - sel.x;
  const oy = pos.y - sel.y;
  startDrag(
    paint,
    p => {
      sel.x = p.x - ox;
      sel.y = p.y - oy;
      selection.changed();
      paint.redrawOverlay();
      paint.setStatusPos(`${p.x},${p.y}`);
    },
    () => {},
  );
}

/* ---- the curve: a line, then up to two bends ---------------------------- */

function handleCurveDown(paint, pos, primary) {
  const { curveRef } = paint;
  const st = curveRef.current;
  const width = paint.live.current.lineWidth;
  if (!st) {
    const p0 = [pos.x, pos.y];
    let p1 = [pos.x, pos.y];
    startDrag(
      paint,
      p => {
        p1 = [p.x, p.y];
        paint.redrawOverlay(o => {
          o.fillStyle = primary;
          stampLine(o, p0[0], p0[1], p1[0], p1[1], width);
        });
      },
      () => {
        curveRef.current = { phase: 1, p0, p1, color: primary };
      },
    );
  } else if (st.phase === 1) {
    let c1 = [pos.x, pos.y];
    const preview = () =>
      paint.redrawOverlay(o => {
        o.fillStyle = st.color;
        stampPolyline(o, quadraticPoints(st.p0, c1, st.p1), width);
      });
    preview();
    startDrag(
      paint,
      p => {
        c1 = [p.x, p.y];
        preview();
      },
      () => {
        st.c1 = c1;
        st.phase = 2;
      },
    );
  } else {
    let c2 = [pos.x, pos.y];
    const preview = () =>
      paint.redrawOverlay(o => {
        o.fillStyle = st.color;
        stampPolyline(o, cubicPoints(st.p0, st.c1, c2, st.p1), width);
      });
    preview();
    startDrag(
      paint,
      p => {
        c2 = [p.x, p.y];
        preview();
      },
      () => {
        paint.doc.pushUndo();
        const ctx = paint.doc.ctx2d();
        ctx.fillStyle = st.color;
        stampPolyline(ctx, cubicPoints(st.p0, st.c1, c2, st.p1), width);
        curveRef.current = null;
        paint.setDirty(true);
        paint.redrawOverlay();
      },
    );
  }
}

/* ---- the polygon: click out the vertices, double-click to close --------- */

export function drawPolyPreview(paint, extraPoint) {
  const st = paint.polyRef.current;
  if (!st) return;
  paint.redrawOverlay(o => {
    o.fillStyle = st.primary;
    const pts = extraPoint ? [...st.pts, extraPoint] : st.pts;
    stampPolyline(o, pts, paint.live.current.lineWidth);
  });
}

function handlePolyDown(paint, pos, primary, secondary) {
  const { polyRef } = paint;
  const st = polyRef.current;
  const width = paint.live.current.lineWidth;
  if (!st) {
    const start = [pos.x, pos.y];
    let cur = [pos.x, pos.y];
    startDrag(
      paint,
      p => {
        cur = [p.x, p.y];
        paint.redrawOverlay(o => {
          o.fillStyle = primary;
          stampLine(o, start[0], start[1], cur[0], cur[1], width);
        });
      },
      () => {
        polyRef.current = { pts: [start, cur], primary, secondary };
      },
    );
  } else {
    const cur = [pos.x, pos.y];
    st.pts.push(cur);
    startDrag(
      paint,
      p => {
        cur[0] = p.x;
        cur[1] = p.y;
        drawPolyPreview(paint);
      },
      () => drawPolyPreview(paint),
    );
  }
}

export function commitPolygon(paint) {
  const st = paint.polyRef.current;
  if (!st || st.pts.length < 3) return;
  paint.polyRef.current = null;
  paint.doc.pushUndo();
  const ctx = paint.doc.ctx2d();
  const mode = paint.live.current.shapeMode;
  const path = pathFromPoints(st.pts);
  if (mode === 'both') {
    ctx.fillStyle = st.secondary;
    ctx.fill(path);
  } else if (mode === 'fill') {
    ctx.fillStyle = st.primary;
    ctx.fill(path);
  }
  ctx.fillStyle = st.primary;
  stampPolyline(
    ctx,
    st.pts,
    mode === 'fill' ? 1 : paint.live.current.lineWidth,
    'circle',
    true,
  );
  paint.setDirty(true);
  paint.redrawOverlay();
}

/* ---- one tool per entry -------------------------------------------------- */

const TOOL_DOWN = {
  pencil: (paint, pos, { primary }) => TOOL_DOWN.brush(paint, pos, { primary }),
  brush: (paint, pos, { primary }) => {
    const L = paint.live.current;
    paint.doc.pushUndo();
    paint.setDirty(true);
    const size = L.tool === 'pencil' ? 1 : L.brush.size;
    const shape = L.tool === 'pencil' ? 'square' : L.brush.shape;
    const ctx = paint.doc.ctx2d();
    ctx.fillStyle = primary;
    stamp(ctx, pos.x, pos.y, size, shape);
    let last = pos;
    startDrag(paint, p => {
      const c2 = paint.doc.ctx2d();
      c2.fillStyle = primary;
      stampLine(c2, last.x, last.y, p.x, p.y, size, shape);
      last = p;
    });
  },
  eraser: (paint, pos) => {
    const L = paint.live.current;
    paint.doc.pushUndo();
    paint.setDirty(true);
    const size = L.eraserSize;
    const ctx = paint.doc.ctx2d();
    ctx.fillStyle = L.bg;
    stamp(ctx, pos.x, pos.y, size, 'square');
    drawEraserCursor(paint, pos);
    let last = pos;
    startDrag(
      paint,
      p => {
        const c2 = paint.doc.ctx2d();
        c2.fillStyle = paint.live.current.bg;
        stampLine(c2, last.x, last.y, p.x, p.y, size, 'square');
        last = p;
        drawEraserCursor(paint, p);
      },
      p => drawEraserCursor(paint, p),
    );
  },
  airbrush: (paint, pos, { primary }) => {
    paint.doc.pushUndo();
    paint.setDirty(true);
    const size = paint.live.current.airbrushSize;
    let at = pos;
    sprayAt(paint, at, primary, size);
    const iv = setInterval(() => sprayAt(paint, at, primary, size), 50);
    startDrag(
      paint,
      p => {
        at = p;
        sprayAt(paint, at, primary, size);
      },
      () => clearInterval(iv),
    );
  },
  fill: (paint, pos, { primary }) => {
    const c = paint.doc.canvasRef.current;
    const ctx = paint.doc.ctx2d();
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const target = clampPos(paint, pos);
    // Snapshot before the change so undo restores the pre-fill pixels
    const changed = floodFill(img, target.x, target.y, hexToRgb(primary));
    if (changed) {
      paint.doc.pushUndo();
      ctx.putImageData(img, 0, 0);
      paint.setDirty(true);
    }
  },
  picker: (paint, pos, { right }) => {
    const sample = p => {
      const cp = clampPos(paint, p);
      const d = paint.doc.ctx2d().getImageData(cp.x, cp.y, 1, 1).data;
      const hex = rgbToHex(d[0], d[1], d[2]);
      if (right) paint.setBg(hex);
      else paint.setFg(hex);
    };
    sample(pos);
    startDrag(
      paint,
      p => sample(p),
      () => paint.setTool(paint.prevToolRef.current || 'pencil'),
    );
  },
  magnifier: (paint, pos, { right }) => {
    const L = paint.live.current;
    if (right) paint.setZoom(1);
    else paint.setZoom(L.zoom === 1 ? (L.magLevel > 1 ? L.magLevel : 8) : 1);
  },
  line: (paint, pos, { primary }) => {
    const L = paint.live.current;
    const start = pos;
    let end = pos;
    startDrag(
      paint,
      (p, ev) => {
        if (ev.shiftKey) {
          const [sx, sy] = snap45(start.x, start.y, p.x, p.y);
          end = { x: sx, y: sy };
        } else {
          end = p;
        }
        paint.redrawOverlay(o => {
          o.fillStyle = primary;
          stampLine(o, start.x, start.y, end.x, end.y, L.lineWidth);
        });
        paint.setStatusSize(sizeText(start, end, true));
      },
      () => {
        paint.doc.pushUndo();
        const ctx = paint.doc.ctx2d();
        ctx.fillStyle = primary;
        stampLine(ctx, start.x, start.y, end.x, end.y, L.lineWidth);
        paint.setDirty(true);
        paint.setStatusSize('');
        paint.redrawOverlay();
      },
    );
  },
  rect: (paint, pos, colors) => TOOL_DOWN.shape(paint, pos, colors),
  ellipse: (paint, pos, colors) => TOOL_DOWN.shape(paint, pos, colors),
  rounded: (paint, pos, colors) => TOOL_DOWN.shape(paint, pos, colors),
  shape: (paint, pos, { primary, secondary }) => {
    const L = paint.live.current;
    const start = pos;
    let end = pos;
    const draw = target =>
      drawShape(
        target,
        L.tool,
        start,
        end,
        primary,
        secondary,
        L.shapeMode,
        L.lineWidth,
      );
    startDrag(
      paint,
      (p, ev) => {
        end = ev.shiftKey ? constrainSquare(start, p) : p;
        paint.redrawOverlay(o => draw(o));
        paint.setStatusSize(sizeText(start, end, true));
      },
      () => {
        paint.doc.pushUndo();
        draw(paint.doc.ctx2d());
        paint.setDirty(true);
        paint.setStatusSize('');
        paint.redrawOverlay();
      },
    );
  },
  curve: (paint, pos, { primary }) => handleCurveDown(paint, pos, primary),
  polygon: (paint, pos, { primary, secondary }) =>
    handlePolyDown(paint, pos, primary, secondary),
  text: (paint, pos) => {
    const start = clampEdge(paint, pos);
    let cur = start;
    startDrag(
      paint,
      p => {
        cur = clampEdge(paint, p);
        paint.setMarquee(normRect(start, cur));
        paint.setStatusSize(sizeText(start, cur, false));
      },
      () => {
        paint.setMarquee(null);
        paint.setStatusSize('');
        const r = normRect(start, cur);
        if (r.w >= 16 && r.h >= 12) {
          paint.text.setTextBox(r);
          paint.text.setTextValue('');
        }
      },
    );
  },
  select: (paint, pos, { right }) => {
    const { selection } = paint;
    if (!right && selection.inside(pos)) {
      startSelectionMove(paint, pos);
      return;
    }
    selection.commit();
    const start = clampEdge(paint, pos);
    let cur = start;
    startDrag(
      paint,
      p => {
        cur = clampEdge(paint, p);
        paint.setMarquee(normRect(start, cur));
        paint.setStatusSize(sizeText(start, cur, false));
      },
      () => {
        paint.setMarquee(null);
        const r = normRect(start, cur);
        if (r.w > 0 && r.h > 0) {
          selection.set(r);
          paint.setStatusSize(`${r.w}x${r.h}`);
        } else {
          selection.set(null);
          paint.setStatusSize('');
        }
      },
    );
  },
  freeform: (paint, pos, { right }) => {
    const { selection } = paint;
    if (!right && selection.inside(pos)) {
      startSelectionMove(paint, pos);
      return;
    }
    selection.commit();
    const first = clampEdge(paint, pos);
    const pts = [[first.x, first.y]];
    startDrag(
      paint,
      p => {
        const cp = clampEdge(paint, p);
        pts.push([cp.x, cp.y]);
        paint.redrawOverlay(o => {
          o.save();
          o.strokeStyle = '#000000';
          o.lineWidth = 1;
          o.setLineDash([2, 2]);
          o.beginPath();
          o.moveTo(pts[0][0] + 0.5, pts[0][1] + 0.5);
          for (let i = 1; i < pts.length; i++)
            o.lineTo(pts[i][0] + 0.5, pts[i][1] + 0.5);
          o.stroke();
          o.restore();
        });
      },
      () => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const [px, py] of pts) {
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
        const w = maxX - minX;
        const h = maxY - minY;
        if (w > 1 && h > 1) {
          selection.set({ x: minX, y: minY, w, h, maskPts: pts });
          paint.setStatusSize(`${w}x${h}`);
        } else {
          selection.changed();
        }
        paint.redrawOverlay();
      },
    );
  },
};

/** A press on the picture. */
export function onCanvasMouseDown(paint, e) {
  if (e.button !== 0 && e.button !== 2) return;
  e.preventDefault();
  const right = e.button === 2;
  const L = paint.live.current;
  const pos = getPos(paint, e);
  if (L.textBox) {
    // Clicking outside the text box commits the text (the textarea swallows
    // its own mousedowns, so reaching here means "outside")
    paint.text.commitText();
    return;
  }
  const colors = {
    right,
    primary: right ? L.bg : L.fg,
    secondary: right ? L.fg : L.bg,
  };
  const handler = TOOL_DOWN[L.tool];
  if (handler) handler(paint, pos, colors);
}

export function onCanvasHover(paint, e) {
  const p = getPos(paint, e);
  const { w, h } = paint.live.current.canvasSize;
  paint.setStatusPos(
    p.x >= 0 && p.y >= 0 && p.x < w && p.y < h ? `${p.x},${p.y}` : '',
  );
  if (paint.dragRef.current) return;
  if (paint.live.current.tool === 'eraser') drawEraserCursor(paint, p);
  if (paint.polyRef.current) drawPolyPreview(paint, [p.x, p.y]);
}

export function onCanvasLeave(paint) {
  paint.setStatusPos('');
  if (!paint.dragRef.current && paint.live.current.tool === 'eraser')
    paint.redrawOverlay();
}

export function onCanvasDoubleClick(paint) {
  if (paint.polyRef.current && paint.polyRef.current.pts.length >= 3)
    commitPolygon(paint);
}
