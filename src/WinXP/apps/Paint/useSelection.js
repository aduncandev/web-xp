// The selection: a rectangle or free-form region of the picture, lifted
// off it while it moves, committed back when done, and the clipboard it
// is cut and copied through. Also owns the overlay, since the floating
// selection is what the overlay mostly shows.
import { useRef, useState } from 'react';
import { hexToRgb } from './raster';
import { cloneCanvas, pathFromPoints } from './helpers';

export function useSelection({ doc, live, setDirty, setStatusSize }) {
  const selRef = useRef(null);
  const clipRef = useRef(null);
  const [hasClipboard, setHasClipboard] = useState(false);
  // Bumped whenever selRef changes so the marquee re-renders
  const [, setSelVersion] = useState(0);
  const changed = () => setSelVersion(v => v + 1);

  /** The floating selection's pixels, with the background made transparent when asked. */
  function drawableSelection() {
    const sel = selRef.current;
    if (!sel || !sel.canvas) return null;
    if (!live.current.transparentSelect) return sel.canvas;
    const key = live.current.bg;
    if (sel.filtered && sel.filteredKey === key) return sel.filtered;
    const c = cloneCanvas(sel.canvas);
    const cctx = c.getContext('2d');
    const img = cctx.getImageData(0, 0, c.width, c.height);
    const [br, bgr, bb] = hexToRgb(key);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] === br && d[i + 1] === bgr && d[i + 2] === bb) d[i + 3] = 0;
    }
    cctx.putImageData(img, 0, 0);
    sel.filtered = c;
    sel.filteredKey = key;
    return c;
  }

  /** Repaint the overlay: the floating selection, then a tool's preview. */
  function redrawOverlay(preview) {
    const o = doc.overlayRef.current;
    if (!o) return;
    const octx = o.getContext('2d');
    octx.clearRect(0, 0, o.width, o.height);
    const sel = selRef.current;
    if (sel && sel.floating && sel.canvas) {
      octx.drawImage(drawableSelection(), Math.round(sel.x), Math.round(sel.y));
    }
    if (preview) preview(octx);
  }

  function extractSelection(sel) {
    const c = document.createElement('canvas');
    c.width = sel.w;
    c.height = sel.h;
    const cctx = c.getContext('2d');
    if (sel.floating && sel.canvas) {
      cctx.drawImage(sel.canvas, 0, 0);
      return c;
    }
    cctx.drawImage(
      doc.canvasRef.current,
      sel.x,
      sel.y,
      sel.w,
      sel.h,
      0,
      0,
      sel.w,
      sel.h,
    );
    if (sel.maskPts) {
      cctx.globalCompositeOperation = 'destination-in';
      cctx.fillStyle = '#000';
      cctx.fill(pathFromPoints(sel.maskPts, -sel.x, -sel.y));
      cctx.globalCompositeOperation = 'source-over';
    }
    return c;
  }

  function fillSelectionRegion(sel) {
    const ctx = doc.ctx2d();
    ctx.fillStyle = live.current.bg;
    if (sel.maskPts) ctx.fill(pathFromPoints(sel.maskPts));
    else ctx.fillRect(sel.x, sel.y, sel.w, sel.h);
  }

  /** Take the selected pixels off the picture so they can move. */
  function lift() {
    const sel = selRef.current;
    sel.canvas = extractSelection(sel);
    sel.filtered = null;
    fillSelectionRegion(sel);
    sel.floating = true;
    setDirty(true);
  }

  /** Paint a floating selection back down and drop the selection. */
  function commit() {
    const sel = selRef.current;
    if (!sel) return;
    if (sel.floating && sel.canvas) {
      if (!sel.undoPushed) {
        // Pasted selections were never lifted, so no undo exists yet
        doc.pushUndo();
        sel.undoPushed = true;
      }
      doc
        .ctx2d()
        .drawImage(drawableSelection(), Math.round(sel.x), Math.round(sel.y));
      setDirty(true);
    }
    selRef.current = null;
    changed();
    setStatusSize('');
    redrawOverlay();
  }

  /** Drop the selection without painting it anywhere. */
  function discard() {
    if (!selRef.current) return;
    selRef.current = null;
    changed();
    setStatusSize('');
    redrawOverlay();
  }

  /** Edit > Clear Selection: the region takes the background colour. */
  function clear() {
    const sel = selRef.current;
    if (!sel) return;
    if (sel.floating) {
      // Region was already filled with background at lift time
      discard();
      return;
    }
    doc.pushUndo();
    fillSelectionRegion(sel);
    setDirty(true);
    discard();
  }

  function copy() {
    const sel = selRef.current;
    if (!sel) return;
    clipRef.current = extractSelection(sel);
    setHasClipboard(true);
  }

  function cut() {
    const sel = selRef.current;
    if (!sel) return;
    copy();
    if (sel.floating) {
      discard();
    } else {
      doc.pushUndo();
      fillSelectionRegion(sel);
      setDirty(true);
      discard();
    }
  }

  /** Float the clipboard at the top-left corner. Callers settle first. */
  function paste() {
    if (!clipRef.current) return;
    const cnv = cloneCanvas(clipRef.current);
    selRef.current = {
      x: 0,
      y: 0,
      w: cnv.width,
      h: cnv.height,
      floating: true,
      canvas: cnv,
      undoPushed: false,
    };
    changed();
    setStatusSize(`${cnv.width}x${cnv.height}`);
    redrawOverlay();
  }

  /** Select the whole picture. Callers settle first. */
  function selectAll() {
    const { w, h } = live.current.canvasSize;
    selRef.current = {
      x: 0,
      y: 0,
      w,
      h,
      floating: false,
      canvas: null,
      undoPushed: false,
    };
    changed();
    setStatusSize(`${w}x${h}`);
    redrawOverlay();
  }

  /** A new selection straight from a tool; `sel` carries x, y, w, h and maybe maskPts. */
  function set(sel) {
    selRef.current = sel
      ? { ...sel, floating: false, canvas: null, undoPushed: false }
      : null;
    changed();
  }

  function inside(pos) {
    const sel = selRef.current;
    return (
      sel &&
      pos.x >= sel.x &&
      pos.x < sel.x + sel.w &&
      pos.y >= sel.y &&
      pos.y < sel.y + sel.h
    );
  }

  return {
    selRef,
    hasClipboard,
    hasSelection: !!selRef.current,
    changed,
    redrawOverlay,
    lift,
    commit,
    discard,
    clear,
    copy,
    cut,
    paste,
    selectAll,
    set,
    inside,
  };
}
