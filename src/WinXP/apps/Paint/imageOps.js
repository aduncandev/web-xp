// The Image menu and the page's resize handles: operations on the whole
// picture. Each settles whatever was in progress first, as Paint did.
import { cloneCanvas } from './helpers';

export function resizeCanvasTo(paint, w, h) {
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  paint.settle();
  const c = paint.doc.canvasRef.current;
  if (w === c.width && h === c.height) return;
  paint.doc.pushUndo();
  const tmp = cloneCanvas(c);
  paint.doc.setPhysicalSize(w, h);
  const ctx = paint.doc.ctx2d();
  ctx.fillStyle = paint.live.current.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(tmp, 0, 0);
  paint.setDirty(true);
  paint.redrawOverlay();
}

/** A drag on one of the three handles; `dir` is 'r', 'b' or 'rb'. */
export function startCanvasResize(paint, e, dir) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const { w, h } = paint.live.current.canvasSize;
  const z = paint.live.current.zoom;
  const sx = e.clientX;
  const sy = e.clientY;
  let nw = w;
  let nh = h;
  const move = ev => {
    if (dir !== 'b') nw = Math.max(1, Math.round(w + (ev.clientX - sx) / z));
    if (dir !== 'r') nh = Math.max(1, Math.round(h + (ev.clientY - sy) / z));
    paint.setResizeGhost({ w: nw, h: nh });
    paint.setStatusSize(`${nw}x${nh}`);
  };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    paint.setResizeGhost(null);
    paint.setStatusSize('');
    if (nw !== w || nh !== h) resizeCanvasTo(paint, nw, nh);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

/** Flip/Rotate: 'fliph' | 'flipv' | 'rot90' | 'rot180' | 'rot270'. */
export function applyTransform(paint, kind) {
  paint.settle();
  paint.doc.pushUndo();
  const c = paint.doc.canvasRef.current;
  const w = c.width;
  const h = c.height;
  const tmp = cloneCanvas(c);
  const swap = kind === 'rot90' || kind === 'rot270';
  if (swap) paint.doc.setPhysicalSize(h, w);
  const ctx = paint.doc.ctx2d();
  ctx.save();
  if (kind === 'fliph') {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  } else if (kind === 'flipv') {
    ctx.translate(0, h);
    ctx.scale(1, -1);
  } else if (kind === 'rot90') {
    ctx.translate(h, 0);
    ctx.rotate(Math.PI / 2);
  } else if (kind === 'rot180') {
    ctx.translate(w, h);
    ctx.rotate(Math.PI);
  } else if (kind === 'rot270') {
    ctx.translate(0, w);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(tmp, 0, 0);
  ctx.restore();
  paint.setDirty(true);
  paint.redrawOverlay();
}

export function applyStretch(paint, hPct, vPct) {
  paint.settle();
  const c = paint.doc.canvasRef.current;
  const nw = Math.max(1, Math.round((c.width * hPct) / 100));
  const nh = Math.max(1, Math.round((c.height * vPct) / 100));
  if (nw === c.width && nh === c.height) return;
  paint.doc.pushUndo();
  const tmp = cloneCanvas(c);
  paint.doc.setPhysicalSize(nw, nh);
  const ctx = paint.doc.ctx2d();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, nw, nh);
  paint.setDirty(true);
  paint.redrawOverlay();
}

export function invertColors(paint) {
  paint.settle();
  paint.doc.pushUndo();
  const c = paint.doc.canvasRef.current;
  const ctx = paint.doc.ctx2d();
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
  ctx.putImageData(img, 0, 0);
  paint.setDirty(true);
  paint.redrawOverlay();
}

export function clearImage(paint) {
  paint.text.commitText();
  paint.selection.discard();
  paint.cancelInProgress();
  paint.doc.pushUndo();
  const c = paint.doc.canvasRef.current;
  const ctx = paint.doc.ctx2d();
  ctx.fillStyle = paint.live.current.bg;
  ctx.fillRect(0, 0, c.width, c.height);
  paint.setDirty(true);
  paint.redrawOverlay();
}
