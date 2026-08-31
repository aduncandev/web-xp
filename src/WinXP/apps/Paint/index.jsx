import React, { useState, useEffect, useMemo, useRef } from 'react';

import { WindowDropDowns } from 'components';
import FileDialog from '../../../components/FileDialog';
import { useVFS } from '../../../context/VFSContext';
import { useDialog } from '../../../context/DialogContext';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { getBaseName, getExtension } from '../../../context/vfsUtils';
import * as usersApi from '../../../context/users';
import { displayName } from '../../shell/fileTypes';

import toolsStrip from 'assets/paint/tools.png';
import transparencyOptions from 'assets/paint/options-transparency.png';

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
  encodeBMP,
} from './raster';
import {
  DEFAULT_PALETTE,
  TOOLS,
  DEFAULT_SIZE,
  UNDO_LEVELS,
  OPEN_FILTERS,
  SAVE_FILTERS,
} from './constants';
import {
  cloneCanvas,
  pathFromPoints,
  wrapTextLines,
  normRect,
  constrainSquare,
  drawShape,
} from './helpers';
import {
  AttributesDialog,
  FlipRotateDialog,
  StretchSkewDialog,
} from './dialogs';
import { Div } from './styles';

export default function Paint({
  onClose,
  onSetHeader,
  registerCloseInterceptor,
  isFocus,
  filePath,
}) {
  const vfs = useVFS();
  const dlg = useDialog();

  // --- Document / file state ---
  const [currentPath, setCurrentPath] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [fileDialog, setFileDialog] = useState(null); // { mode, resolve }
  const [subDialog, setSubDialog] = useState(null); // attributes | fliprotate | stretch

  // --- Tool state ---
  const [tool, setTool] = useState('pencil');
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#FFFFFF');
  const [palette, setPalette] = useState(DEFAULT_PALETTE);
  const [lineWidth, setLineWidth] = useState(1);
  const [brush, setBrush] = useState({ shape: 'circle', size: 4 });
  const [eraserSize, setEraserSize] = useState(8);
  const [airbrushSize, setAirbrushSize] = useState(16);
  const [shapeMode, setShapeMode] = useState('outline'); // outline | both | fill
  const [transparentSelect, setTransparentSelect] = useState(false);
  const [magLevel, setMagLevel] = useState(8);
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState(DEFAULT_SIZE);

  // --- View state ---
  const [showToolBox, setShowToolBox] = useState(true);
  const [showColorBox, setShowColorBox] = useState(true);
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [statusPos, setStatusPos] = useState('');
  const [statusSize, setStatusSize] = useState('');

  // --- Interaction state ---
  const [marquee, setMarquee] = useState(null); // drag preview rect
  const [textBox, setTextBox] = useState(null); // { x, y, w, h }
  const [textValue, setTextValue] = useState('');
  const [resizeGhost, setResizeGhost] = useState(null);
  const [stackLen, setStackLen] = useState({ u: 0, r: 0 });
  const [hasClipboard, setHasClipboard] = useState(false);
  // Bumped whenever selRef changes so the marquee div re-renders
  const [, setSelVersion] = useState(0);

  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const textareaRef = useRef(null);
  const colorInputRef = useRef(null);
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const selRef = useRef(null);
  const clipRef = useRef(null);
  const curveRef = useRef(null);
  const polyRef = useRef(null);
  const dragRef = useRef(false);
  const prevToolRef = useRef('pencil');
  const editSlotRef = useRef(0);
  const apiRef = useRef({});

  // Live mirror of state for handlers attached to window (avoids staleness)
  const live = useRef({});
  live.current = {
    tool,
    zoom,
    fg,
    bg,
    transparentSelect,
    canvasSize,
    textBox,
    textValue,
    lineWidth,
    brush,
    eraserSize,
    airbrushSize,
    magLevel,
    shapeMode,
  };

  // 'Hide extensions for known file types' — XP default is on
  const hideExt = useMemo(() => {
    try {
      const view = vfs.getUserConfig('explorerView', null) || {};
      return view.hideExt !== false;
    } catch {
      return true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version, vfs.initialized]);

  const fileTitle = currentPath
    ? displayName(vfs.getNode(currentPath), hideExt) || getBaseName(currentPath)
    : 'untitled';

  useEffect(() => {
    if (onSetHeader) onSetHeader({ title: `${fileTitle} - Paint` });
  }, [fileTitle, onSetHeader]);

  // --- Canvas plumbing ---

  const ctx2d = () => canvasRef.current.getContext('2d');

  function setPhysicalSize(w, h) {
    canvasRef.current.width = w;
    canvasRef.current.height = h;
    overlayRef.current.width = w;
    overlayRef.current.height = h;
    ctx2d().imageSmoothingEnabled = false;
    setCanvasSize({ w, h });
  }

  // Blank white page on mount; an injected file may replace it right after
  useEffect(() => {
    setPhysicalSize(DEFAULT_SIZE.w, DEFAULT_SIZE.h);
    const ctx = ctx2d();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, DEFAULT_SIZE.w, DEFAULT_SIZE.h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadImageFromPath(path) {
    const node = vfs.getNode(path);
    if (!node || node.type !== 'file') return false;
    let blob = null;
    try {
      if (node.hasBinaryContent) {
        blob = await vfs.readBinaryFile(path);
      } else if (node.sourceUrl) {
        const res = await fetch(node.sourceUrl);
        if (res.ok) blob = await res.blob();
      }
      if (!blob) return false;
      const bmp = await createImageBitmap(blob);
      discardSelection();
      setTextBox(null);
      setTextValue('');
      curveRef.current = null;
      polyRef.current = null;
      undoRef.current = [];
      redoRef.current = [];
      setStackLen({ u: 0, r: 0 });
      setPhysicalSize(bmp.width, bmp.height);
      const ctx = ctx2d();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, bmp.width, bmp.height);
      ctx.drawImage(bmp, 0, 0);
      setZoom(1);
      setDirty(false);
      redrawOverlay();
      return true;
    } catch {
      return false;
    }
  }

  // --- Load injected file (double-clicked in Explorer / desktop) ---
  const loadedInjectedPath = useRef(null);
  useEffect(() => {
    if (!filePath || !vfs.initialized) return;
    if (loadedInjectedPath.current === filePath) return;
    loadedInjectedPath.current = filePath;
    (async () => {
      if (await loadImageFromPath(filePath)) {
        setCurrentPath(filePath);
        vfs.addRecentDocument(filePath);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, vfs.initialized]);

  // --- Undo / redo (snapshot stack) ---

  function snapshot() {
    const c = canvasRef.current;
    return {
      w: c.width,
      h: c.height,
      img: ctx2d().getImageData(0, 0, c.width, c.height),
    };
  }

  function syncStackLen() {
    setStackLen({ u: undoRef.current.length, r: redoRef.current.length });
  }

  function pushUndo() {
    undoRef.current.push(snapshot());
    if (undoRef.current.length > UNDO_LEVELS) undoRef.current.shift();
    redoRef.current = [];
    syncStackLen();
  }

  function restoreSnapshot(s) {
    setPhysicalSize(s.w, s.h);
    ctx2d().putImageData(s.img, 0, 0);
  }

  function doUndo() {
    cancelInProgress();
    discardSelection();
    if (!undoRef.current.length) return;
    redoRef.current.push(snapshot());
    restoreSnapshot(undoRef.current.pop());
    syncStackLen();
    setDirty(true);
    redrawOverlay();
  }

  function doRedo() {
    cancelInProgress();
    discardSelection();
    if (!redoRef.current.length) return;
    undoRef.current.push(snapshot());
    restoreSnapshot(redoRef.current.pop());
    syncStackLen();
    setDirty(true);
    redrawOverlay();
  }

  // --- Selection machinery ---

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

  function redrawOverlay(preview) {
    const o = overlayRef.current;
    if (!o) return;
    const octx = o.getContext('2d');
    octx.clearRect(0, 0, o.width, o.height);
    const sel = selRef.current;
    if (sel && sel.floating && sel.canvas) {
      octx.drawImage(drawableSelection(), Math.round(sel.x), Math.round(sel.y));
    }
    if (preview) preview(octx);
  }

  // Re-filter the floating selection when the transparency mode flips
  useEffect(() => {
    redrawOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transparentSelect, bg]);

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
      canvasRef.current,
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
    const ctx = ctx2d();
    ctx.fillStyle = live.current.bg;
    if (sel.maskPts) ctx.fill(pathFromPoints(sel.maskPts));
    else ctx.fillRect(sel.x, sel.y, sel.w, sel.h);
  }

  function liftSelection() {
    const sel = selRef.current;
    sel.canvas = extractSelection(sel);
    sel.filtered = null;
    fillSelectionRegion(sel);
    sel.floating = true;
    setDirty(true);
  }

  function commitSelection() {
    const sel = selRef.current;
    if (!sel) return;
    if (sel.floating && sel.canvas) {
      if (!sel.undoPushed) {
        // Pasted selections were never lifted, so no undo exists yet
        pushUndo();
        sel.undoPushed = true;
      }
      ctx2d().drawImage(
        drawableSelection(),
        Math.round(sel.x),
        Math.round(sel.y),
      );
      setDirty(true);
    }
    selRef.current = null;
    setSelVersion(v => v + 1);
    setStatusSize('');
    redrawOverlay();
  }

  function discardSelection() {
    if (!selRef.current) return;
    selRef.current = null;
    setSelVersion(v => v + 1);
    setStatusSize('');
    redrawOverlay();
  }

  function clearSelection() {
    const sel = selRef.current;
    if (!sel) return;
    if (sel.floating) {
      // Region was already filled with background at lift time
      discardSelection();
      return;
    }
    pushUndo();
    fillSelectionRegion(sel);
    setDirty(true);
    discardSelection();
  }

  function copySelection() {
    const sel = selRef.current;
    if (!sel) return;
    clipRef.current = extractSelection(sel);
    setHasClipboard(true);
  }

  function cutSelection() {
    const sel = selRef.current;
    if (!sel) return;
    copySelection();
    if (sel.floating) {
      discardSelection();
    } else {
      pushUndo();
      fillSelectionRegion(sel);
      setDirty(true);
      discardSelection();
    }
  }

  function pasteClipboard() {
    if (!clipRef.current) return;
    commitText();
    commitSelection();
    cancelInProgress();
    if (live.current.tool !== 'select' && live.current.tool !== 'freeform') {
      setTool('select');
    }
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
    setSelVersion(v => v + 1);
    setStatusSize(`${cnv.width}x${cnv.height}`);
    redrawOverlay();
  }

  function selectAll() {
    commitText();
    commitSelection();
    cancelInProgress();
    if (live.current.tool !== 'select' && live.current.tool !== 'freeform') {
      setTool('select');
    }
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
    setSelVersion(v => v + 1);
    setStatusSize(`${w}x${h}`);
    redrawOverlay();
  }

  // --- Text tool ---

  function commitText() {
    const tb = live.current.textBox;
    if (!tb) return;
    const val = live.current.textValue;
    setTextBox(null);
    setTextValue('');
    if (!val.trim()) return;
    pushUndo();
    const ctx = ctx2d();
    ctx.save();
    ctx.beginPath();
    ctx.rect(tb.x, tb.y, tb.w, tb.h);
    ctx.clip();
    if (!live.current.transparentSelect) {
      ctx.fillStyle = live.current.bg;
      ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
    }
    ctx.fillStyle = live.current.fg;
    ctx.font = '13px Arial';
    ctx.textBaseline = 'top';
    const lines = wrapTextLines(ctx, val, tb.w - 2);
    lines.forEach((line, i) => {
      ctx.fillText(line, tb.x + 1, tb.y + 1 + i * 15);
    });
    ctx.restore();
    setDirty(true);
  }

  function cancelText() {
    setTextBox(null);
    setTextValue('');
  }

  // --- Cancel any multi-step tool in progress ---

  function cancelInProgress() {
    curveRef.current = null;
    polyRef.current = null;
    redrawOverlay();
  }

  function selectTool(t) {
    if (t === live.current.tool) return;
    commitText();
    commitSelection();
    cancelInProgress();
    if (t === 'picker' && live.current.tool !== 'picker') {
      prevToolRef.current = live.current.tool;
    }
    setTool(t);
  }

  // --- Pointer helpers ---

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const z = live.current.zoom;
    return {
      x: Math.floor((e.clientX - rect.left) / z),
      y: Math.floor((e.clientY - rect.top) / z),
    };
  }

  function clampPos(p) {
    const { w, h } = live.current.canvasSize;
    return {
      x: Math.max(0, Math.min(w - 1, p.x)),
      y: Math.max(0, Math.min(h - 1, p.y)),
    };
  }

  function clampEdge(p) {
    const { w, h } = live.current.canvasSize;
    return {
      x: Math.max(0, Math.min(w, p.x)),
      y: Math.max(0, Math.min(h, p.y)),
    };
  }

  function startDrag(onMove, onUp) {
    const move = e => onMove(getPos(e), e);
    const up = e => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      dragRef.current = false;
      if (onUp) onUp(getPos(e), e);
    };
    dragRef.current = true;
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function drawEraserCursor(p) {
    redrawOverlay(o => {
      const s = live.current.eraserSize;
      const x = Math.round(p.x - s / 2);
      const y = Math.round(p.y - s / 2);
      o.fillStyle = live.current.bg;
      o.fillRect(x, y, s, s);
      o.fillStyle = '#000000';
      o.fillRect(x, y, s, 1);
      o.fillRect(x, y + s - 1, s, 1);
      o.fillRect(x, y, 1, s);
      o.fillRect(x + s - 1, y, 1, s);
    });
  }

  function sprayAt(p, color, size) {
    const ctx = ctx2d();
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

  // --- Selection move / marquee flows ---

  function startSelectionMove(pos) {
    const sel = selRef.current;
    if (!sel.floating) {
      pushUndo();
      sel.undoPushed = true;
      liftSelection();
    }
    const ox = pos.x - sel.x;
    const oy = pos.y - sel.y;
    startDrag(
      p => {
        sel.x = p.x - ox;
        sel.y = p.y - oy;
        setSelVersion(v => v + 1);
        redrawOverlay();
        setStatusPos(`${p.x},${p.y}`);
      },
      () => {},
    );
  }

  function insideSelection(pos) {
    const sel = selRef.current;
    return (
      sel &&
      pos.x >= sel.x &&
      pos.x < sel.x + sel.w &&
      pos.y >= sel.y &&
      pos.y < sel.y + sel.h
    );
  }

  // --- Curve tool (line, then up to two bends) ---

  function handleCurveDown(pos, primary) {
    const st = curveRef.current;
    const width = live.current.lineWidth;
    if (!st) {
      const p0 = [pos.x, pos.y];
      let p1 = [pos.x, pos.y];
      startDrag(
        p => {
          p1 = [p.x, p.y];
          redrawOverlay(o => {
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
        redrawOverlay(o => {
          o.fillStyle = st.color;
          stampPolyline(o, quadraticPoints(st.p0, c1, st.p1), width);
        });
      preview();
      startDrag(
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
        redrawOverlay(o => {
          o.fillStyle = st.color;
          stampPolyline(o, cubicPoints(st.p0, st.c1, c2, st.p1), width);
        });
      preview();
      startDrag(
        p => {
          c2 = [p.x, p.y];
          preview();
        },
        () => {
          pushUndo();
          const ctx = ctx2d();
          ctx.fillStyle = st.color;
          stampPolyline(ctx, cubicPoints(st.p0, st.c1, c2, st.p1), width);
          curveRef.current = null;
          setDirty(true);
          redrawOverlay();
        },
      );
    }
  }

  // --- Polygon tool ---

  function drawPolyPreview(extraPoint) {
    const st = polyRef.current;
    if (!st) return;
    redrawOverlay(o => {
      o.fillStyle = st.primary;
      const pts = extraPoint ? [...st.pts, extraPoint] : st.pts;
      stampPolyline(o, pts, live.current.lineWidth);
    });
  }

  function handlePolyDown(pos, primary, secondary) {
    const st = polyRef.current;
    const width = live.current.lineWidth;
    if (!st) {
      const start = [pos.x, pos.y];
      let cur = [pos.x, pos.y];
      startDrag(
        p => {
          cur = [p.x, p.y];
          redrawOverlay(o => {
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
        p => {
          cur[0] = p.x;
          cur[1] = p.y;
          drawPolyPreview();
        },
        () => drawPolyPreview(),
      );
    }
  }

  function commitPolygon() {
    const st = polyRef.current;
    if (!st || st.pts.length < 3) return;
    polyRef.current = null;
    pushUndo();
    const ctx = ctx2d();
    const mode = live.current.shapeMode;
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
      mode === 'fill' ? 1 : live.current.lineWidth,
      'circle',
      true,
    );
    setDirty(true);
    redrawOverlay();
  }

  // --- Main canvas mouse handling ---

  function onCanvasMouseDown(e) {
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    const right = e.button === 2;
    const L = live.current;
    const pos = getPos(e);
    if (L.textBox) {
      // Clicking outside the text box commits the text (textarea swallows
      // its own mousedowns, so reaching here means "outside")
      commitText();
      return;
    }
    const primary = right ? L.bg : L.fg;
    const secondary = right ? L.fg : L.bg;

    switch (L.tool) {
      case 'pencil':
      case 'brush': {
        pushUndo();
        setDirty(true);
        const size = L.tool === 'pencil' ? 1 : L.brush.size;
        const shape = L.tool === 'pencil' ? 'square' : L.brush.shape;
        const ctx = ctx2d();
        ctx.fillStyle = primary;
        stamp(ctx, pos.x, pos.y, size, shape);
        let last = pos;
        startDrag(p => {
          const c2 = ctx2d();
          c2.fillStyle = primary;
          stampLine(c2, last.x, last.y, p.x, p.y, size, shape);
          last = p;
        });
        break;
      }
      case 'eraser': {
        pushUndo();
        setDirty(true);
        const size = L.eraserSize;
        const ctx = ctx2d();
        ctx.fillStyle = L.bg;
        stamp(ctx, pos.x, pos.y, size, 'square');
        drawEraserCursor(pos);
        let last = pos;
        startDrag(
          p => {
            const c2 = ctx2d();
            c2.fillStyle = live.current.bg;
            stampLine(c2, last.x, last.y, p.x, p.y, size, 'square');
            last = p;
            drawEraserCursor(p);
          },
          p => drawEraserCursor(p),
        );
        break;
      }
      case 'airbrush': {
        pushUndo();
        setDirty(true);
        const size = L.airbrushSize;
        let at = pos;
        sprayAt(at, primary, size);
        const iv = setInterval(() => sprayAt(at, primary, size), 50);
        startDrag(
          p => {
            at = p;
            sprayAt(at, primary, size);
          },
          () => clearInterval(iv),
        );
        break;
      }
      case 'fill': {
        const c = canvasRef.current;
        const ctx = ctx2d();
        const img = ctx.getImageData(0, 0, c.width, c.height);
        const target = clampPos(pos);
        // Snapshot before the change so undo restores the pre-fill pixels
        const changed = floodFill(img, target.x, target.y, hexToRgb(primary));
        if (changed) {
          pushUndo();
          ctx.putImageData(img, 0, 0);
          setDirty(true);
        }
        break;
      }
      case 'picker': {
        const sample = p => {
          const cp = clampPos(p);
          const d = ctx2d().getImageData(cp.x, cp.y, 1, 1).data;
          const hex = rgbToHex(d[0], d[1], d[2]);
          if (right) setBg(hex);
          else setFg(hex);
        };
        sample(pos);
        startDrag(
          p => sample(p),
          () => setTool(prevToolRef.current || 'pencil'),
        );
        break;
      }
      case 'magnifier': {
        if (right) setZoom(1);
        else setZoom(L.zoom === 1 ? (L.magLevel > 1 ? L.magLevel : 8) : 1);
        break;
      }
      case 'line': {
        const start = pos;
        let end = pos;
        startDrag(
          (p, ev) => {
            if (ev.shiftKey) {
              const [sx, sy] = snap45(start.x, start.y, p.x, p.y);
              end = { x: sx, y: sy };
            } else {
              end = p;
            }
            redrawOverlay(o => {
              o.fillStyle = primary;
              stampLine(o, start.x, start.y, end.x, end.y, L.lineWidth);
            });
            setStatusSize(
              `${Math.abs(end.x - start.x) + 1}x${Math.abs(end.y - start.y) +
                1}`,
            );
          },
          () => {
            pushUndo();
            const ctx = ctx2d();
            ctx.fillStyle = primary;
            stampLine(ctx, start.x, start.y, end.x, end.y, L.lineWidth);
            setDirty(true);
            setStatusSize('');
            redrawOverlay();
          },
        );
        break;
      }
      case 'rect':
      case 'ellipse':
      case 'rounded': {
        const start = pos;
        let end = pos;
        startDrag(
          (p, ev) => {
            end = ev.shiftKey ? constrainSquare(start, p) : p;
            redrawOverlay(o =>
              drawShape(
                o,
                L.tool,
                start,
                end,
                primary,
                secondary,
                L.shapeMode,
                L.lineWidth,
              ),
            );
            setStatusSize(
              `${Math.abs(end.x - start.x) + 1}x${Math.abs(end.y - start.y) +
                1}`,
            );
          },
          () => {
            pushUndo();
            drawShape(
              ctx2d(),
              L.tool,
              start,
              end,
              primary,
              secondary,
              L.shapeMode,
              L.lineWidth,
            );
            setDirty(true);
            setStatusSize('');
            redrawOverlay();
          },
        );
        break;
      }
      case 'curve':
        handleCurveDown(pos, primary);
        break;
      case 'polygon':
        handlePolyDown(pos, primary, secondary);
        break;
      case 'text': {
        const start = clampEdge(pos);
        let cur = start;
        startDrag(
          p => {
            cur = clampEdge(p);
            setMarquee(normRect(start, cur));
            setStatusSize(
              `${Math.abs(cur.x - start.x)}x${Math.abs(cur.y - start.y)}`,
            );
          },
          () => {
            setMarquee(null);
            setStatusSize('');
            const r = normRect(start, cur);
            if (r.w >= 16 && r.h >= 12) {
              setTextBox(r);
              setTextValue('');
            }
          },
        );
        break;
      }
      case 'select':
      case 'freeform': {
        if (!right && insideSelection(pos)) {
          startSelectionMove(pos);
          break;
        }
        commitSelection();
        if (L.tool === 'select') {
          const start = clampEdge(pos);
          let cur = start;
          startDrag(
            p => {
              cur = clampEdge(p);
              setMarquee(normRect(start, cur));
              setStatusSize(
                `${Math.abs(cur.x - start.x)}x${Math.abs(cur.y - start.y)}`,
              );
            },
            () => {
              setMarquee(null);
              const r = normRect(start, cur);
              if (r.w > 0 && r.h > 0) {
                selRef.current = {
                  ...r,
                  floating: false,
                  canvas: null,
                  undoPushed: false,
                };
                setStatusSize(`${r.w}x${r.h}`);
              } else {
                setStatusSize('');
              }
              setSelVersion(v => v + 1);
            },
          );
        } else {
          const first = clampEdge(pos);
          const pts = [[first.x, first.y]];
          startDrag(
            p => {
              const cp = clampEdge(p);
              pts.push([cp.x, cp.y]);
              redrawOverlay(o => {
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
                selRef.current = {
                  x: minX,
                  y: minY,
                  w,
                  h,
                  floating: false,
                  canvas: null,
                  maskPts: pts,
                  undoPushed: false,
                };
                setStatusSize(`${w}x${h}`);
              }
              setSelVersion(v => v + 1);
              redrawOverlay();
            },
          );
        }
        break;
      }
      default:
    }
  }

  function onCanvasHover(e) {
    const p = getPos(e);
    const { w, h } = live.current.canvasSize;
    setStatusPos(
      p.x >= 0 && p.y >= 0 && p.x < w && p.y < h ? `${p.x},${p.y}` : '',
    );
    if (dragRef.current) return;
    if (live.current.tool === 'eraser') drawEraserCursor(p);
    if (polyRef.current) drawPolyPreview([p.x, p.y]);
  }

  function onCanvasLeave() {
    setStatusPos('');
    if (!dragRef.current && live.current.tool === 'eraser') redrawOverlay();
  }

  function onCanvasDoubleClick() {
    if (polyRef.current && polyRef.current.pts.length >= 3) commitPolygon();
  }

  // --- Canvas resizing (drag handles / Attributes) ---

  function resizeCanvasTo(w, h) {
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    commitText();
    commitSelection();
    cancelInProgress();
    const c = canvasRef.current;
    if (w === c.width && h === c.height) return;
    pushUndo();
    const tmp = cloneCanvas(c);
    setPhysicalSize(w, h);
    const ctx = ctx2d();
    ctx.fillStyle = live.current.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(tmp, 0, 0);
    setDirty(true);
    redrawOverlay();
  }

  function startCanvasResize(e, dir) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const { w, h } = live.current.canvasSize;
    const z = live.current.zoom;
    const sx = e.clientX;
    const sy = e.clientY;
    let nw = w;
    let nh = h;
    const move = ev => {
      if (dir !== 'b') nw = Math.max(1, Math.round(w + (ev.clientX - sx) / z));
      if (dir !== 'r') nh = Math.max(1, Math.round(h + (ev.clientY - sy) / z));
      setResizeGhost({ w: nw, h: nh });
      setStatusSize(`${nw}x${nh}`);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setResizeGhost(null);
      setStatusSize('');
      if (nw !== w || nh !== h) resizeCanvasTo(nw, nh);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  // --- Image menu operations ---

  function applyTransform(kind) {
    commitText();
    commitSelection();
    cancelInProgress();
    pushUndo();
    const c = canvasRef.current;
    const w = c.width;
    const h = c.height;
    const tmp = cloneCanvas(c);
    const swap = kind === 'rot90' || kind === 'rot270';
    if (swap) setPhysicalSize(h, w);
    const ctx = ctx2d();
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
    setDirty(true);
    redrawOverlay();
  }

  function applyStretch(hPct, vPct) {
    commitText();
    commitSelection();
    cancelInProgress();
    const c = canvasRef.current;
    const nw = Math.max(1, Math.round((c.width * hPct) / 100));
    const nh = Math.max(1, Math.round((c.height * vPct) / 100));
    if (nw === c.width && nh === c.height) return;
    pushUndo();
    const tmp = cloneCanvas(c);
    setPhysicalSize(nw, nh);
    const ctx = ctx2d();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, nw, nh);
    setDirty(true);
    redrawOverlay();
  }

  function invertColors() {
    commitText();
    commitSelection();
    cancelInProgress();
    pushUndo();
    const c = canvasRef.current;
    const ctx = ctx2d();
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 255 - d[i];
      d[i + 1] = 255 - d[i + 1];
      d[i + 2] = 255 - d[i + 2];
    }
    ctx.putImageData(img, 0, 0);
    setDirty(true);
    redrawOverlay();
  }

  function clearImage() {
    commitText();
    discardSelection();
    cancelInProgress();
    pushUndo();
    const c = canvasRef.current;
    const ctx = ctx2d();
    ctx.fillStyle = live.current.bg;
    ctx.fillRect(0, 0, c.width, c.height);
    setDirty(true);
    redrawOverlay();
  }

  // --- File machinery ---

  const openSaveDialog = () =>
    new Promise(resolve => setFileDialog({ mode: 'save', resolve }));
  const openOpenDialog = () =>
    new Promise(resolve => setFileDialog({ mode: 'open', resolve }));

  /** Save to current path or prompt. Resolves the saved path, or null. */
  async function doSave(forceDialog = false) {
    commitText();
    commitSelection();
    let targetPath = currentPath;
    if (!targetPath || forceDialog) {
      targetPath = await openSaveDialog();
      if (!targetPath) return null;
    }
    const ext = (getExtension(targetPath) || '.bmp').toLowerCase();
    const c = canvasRef.current;
    let blob;
    let mime;
    if (ext === '.png') {
      mime = 'image/png';
      blob = await new Promise(res => c.toBlob(res, 'image/png'));
    } else {
      mime = 'image/bmp';
      blob = encodeBMP(ctx2d().getImageData(0, 0, c.width, c.height));
    }
    if (!blob) return null;
    if (!vfs.exists(targetPath)) vfs.createFile(targetPath, '', mime);
    await vfs.writeBinaryFile(targetPath, blob, mime);
    vfs.addRecentDocument(targetPath);
    setCurrentPath(targetPath);
    setDirty(false);
    return targetPath;
  }

  /** Ask about unsaved changes. Resolves true when it's OK to proceed. */
  async function confirmDiscard() {
    if (!dirty) return true;
    const res = await dlg.confirm3(`Save changes to ${fileTitle}?`, 'Paint');
    if (res === 'cancel') return false;
    if (res === 'no') return true;
    return !!(await doSave());
  }

  const confirmDiscardRef = useRef(confirmDiscard);
  confirmDiscardRef.current = confirmDiscard;
  useEffect(() => {
    if (registerCloseInterceptor) {
      registerCloseInterceptor(() => confirmDiscardRef.current());
    }
  }, [registerCloseInterceptor]);

  async function doNew() {
    if (!(await confirmDiscard())) return;
    discardSelection();
    cancelText();
    cancelInProgress();
    undoRef.current = [];
    redoRef.current = [];
    setStackLen({ u: 0, r: 0 });
    setPhysicalSize(DEFAULT_SIZE.w, DEFAULT_SIZE.h);
    const ctx = ctx2d();
    ctx.fillStyle = live.current.bg;
    ctx.fillRect(0, 0, DEFAULT_SIZE.w, DEFAULT_SIZE.h);
    setCurrentPath(null);
    setDirty(false);
    setZoom(1);
    redrawOverlay();
  }

  async function doOpen() {
    if (!(await confirmDiscard())) return;
    const path = await openOpenDialog();
    if (!path) return;
    if (await loadImageFromPath(path)) {
      setCurrentPath(path);
      vfs.addRecentDocument(path);
    } else {
      await dlg.alert(
        `${path}\nPaint cannot read this file.\nThis is not a valid bitmap file, or its format is not currently supported.`,
        'Paint',
      );
    }
  }

  async function setAsBackground(position) {
    let path = currentPath;
    if (!path) return;
    if (dirty) {
      path = await doSave();
      if (!path) return;
    }
    try {
      usersApi.setUserSetting(usersApi.getCurrentUserName(), 'wallpaper', {
        kind: 'vfs',
        value: path,
        position,
      });
    } catch {
      // user settings unavailable — silently ignore, like a failed SPI call
    }
  }

  // --- Menu bar ---

  const menus = {
    File: [
      { type: 'item', text: 'New', hotkey: 'Ctrl+N' },
      { type: 'item', text: 'Open...', hotkey: 'Ctrl+O' },
      { type: 'item', text: 'Save', hotkey: 'Ctrl+S' },
      { type: 'item', text: 'Save As...' },
      { type: 'separator' },
      { type: 'item', text: 'From Scanner or Camera...', disable: true },
      { type: 'separator' },
      { type: 'item', text: 'Print Preview', disable: true },
      { type: 'item', text: 'Page Setup...', disable: true },
      { type: 'item', text: 'Print...', hotkey: 'Ctrl+P', disable: true },
      { type: 'separator' },
      { type: 'item', text: 'Send...', disable: true },
      { type: 'separator' },
      {
        type: 'item',
        text: 'Set As Background (Tiled)',
        disable: !currentPath,
      },
      {
        type: 'item',
        text: 'Set As Background (Centered)',
        disable: !currentPath,
      },
      { type: 'separator' },
      { type: 'item', text: 'Exit', hotkey: 'Alt+F4' },
    ],
    Edit: [
      {
        type: 'item',
        text: 'Undo',
        hotkey: 'Ctrl+Z',
        disable: stackLen.u === 0,
      },
      { type: 'item', text: 'Repeat', hotkey: 'F4', disable: stackLen.r === 0 },
      { type: 'separator' },
      { type: 'item', text: 'Cut', hotkey: 'Ctrl+X', disable: !selRef.current },
      {
        type: 'item',
        text: 'Copy',
        hotkey: 'Ctrl+C',
        disable: !selRef.current,
      },
      { type: 'item', text: 'Paste', hotkey: 'Ctrl+V', disable: !hasClipboard },
      {
        type: 'item',
        text: 'Clear Selection',
        hotkey: 'Del',
        disable: !selRef.current,
      },
      { type: 'item', text: 'Select All', hotkey: 'Ctrl+A' },
      { type: 'separator' },
      { type: 'item', text: 'Copy To...', disable: true },
      { type: 'item', text: 'Paste From...', disable: true },
    ],
    View: [
      {
        type: 'item',
        text: 'Tool Box',
        hotkey: 'Ctrl+T',
        symbol: showToolBox ? 'check' : undefined,
      },
      {
        type: 'item',
        text: 'Color Box',
        hotkey: 'Ctrl+L',
        symbol: showColorBox ? 'check' : undefined,
      },
      {
        type: 'item',
        text: 'Status Bar',
        symbol: showStatusBar ? 'check' : undefined,
      },
      { type: 'item', text: 'Text Toolbar', disable: true },
      { type: 'separator' },
      {
        type: 'menu',
        text: 'Zoom',
        position: { left: 'calc(100% - 4px)', top: '-3px' },
        items: [
          { type: 'item', text: 'Normal Size', hotkey: 'Ctrl+PgUp' },
          { type: 'item', text: 'Large Size', hotkey: 'Ctrl+PgDn' },
          { type: 'item', text: 'Custom...', disable: true },
          { type: 'separator' },
          { type: 'item', text: 'Show Grid', hotkey: 'Ctrl+G', disable: true },
          { type: 'item', text: 'Show Thumbnail', disable: true },
        ],
      },
      { type: 'item', text: 'View Bitmap', hotkey: 'Ctrl+F', disable: true },
    ],
    Image: [
      { type: 'item', text: 'Flip/Rotate...', hotkey: 'Ctrl+R' },
      { type: 'item', text: 'Stretch/Skew...', hotkey: 'Ctrl+W' },
      { type: 'item', text: 'Invert Colors', hotkey: 'Ctrl+I' },
      { type: 'item', text: 'Attributes...', hotkey: 'Ctrl+E' },
      { type: 'item', text: 'Clear Image', hotkey: 'Ctrl+Shft+N' },
      {
        type: 'item',
        text: 'Draw Opaque',
        symbol: !transparentSelect ? 'check' : undefined,
      },
    ],
    Colors: [{ type: 'item', text: 'Edit Colors...' }],
    Help: [
      { type: 'item', text: 'Help Topics', disable: true },
      { type: 'separator' },
      { type: 'item', text: 'About Paint' },
    ],
  };

  function openColorEditor(slot) {
    editSlotRef.current = slot;
    const input = colorInputRef.current;
    if (!input) return;
    input.value = palette[slot] || '#000000';
    input.click();
  }

  function onMenuItem(item) {
    switch (item) {
      case 'New':
        doNew();
        break;
      case 'Open...':
        doOpen();
        break;
      case 'Save':
        doSave();
        break;
      case 'Save As...':
        doSave(true);
        break;
      case 'Set As Background (Tiled)':
        setAsBackground('tile');
        break;
      case 'Set As Background (Centered)':
        setAsBackground('center');
        break;
      case 'Exit':
        onClose();
        break;
      case 'Undo':
        doUndo();
        break;
      case 'Repeat':
        doRedo();
        break;
      case 'Cut':
        cutSelection();
        break;
      case 'Copy':
        copySelection();
        break;
      case 'Paste':
        pasteClipboard();
        break;
      case 'Clear Selection':
        clearSelection();
        break;
      case 'Select All':
        selectAll();
        break;
      case 'Tool Box':
        setShowToolBox(!showToolBox);
        break;
      case 'Color Box':
        setShowColorBox(!showColorBox);
        break;
      case 'Status Bar':
        setShowStatusBar(!showStatusBar);
        break;
      case 'Normal Size':
        setZoom(1);
        break;
      case 'Large Size':
        setZoom(4);
        break;
      case 'Flip/Rotate...':
        setSubDialog('fliprotate');
        break;
      case 'Stretch/Skew...':
        setSubDialog('stretch');
        break;
      case 'Invert Colors':
        invertColors();
        break;
      case 'Attributes...':
        setSubDialog('attributes');
        break;
      case 'Clear Image':
        clearImage();
        break;
      case 'Draw Opaque':
        setTransparentSelect(!transparentSelect);
        break;
      case 'Edit Colors...':
        openColorEditor(editSlotRef.current);
        break;
      case 'About Paint':
        dlg.alert(
          'Paint for Windows XP\nVersion 2026 (Web Remake)',
          'About Paint',
        );
        break;
      default:
    }
  }

  // --- Keyboard shortcuts ---

  apiRef.current.handleKey = e => {
    const tag = e.target && e.target.tagName;
    const inField = tag === 'INPUT' || tag === 'TEXTAREA';
    if (e.key === 'Escape') {
      if (live.current.textBox) {
        cancelText();
        return;
      }
      if (inField) return;
      if (polyRef.current || curveRef.current) {
        cancelInProgress();
        return;
      }
      if (selRef.current) commitSelection();
      return;
    }
    if (inField) return;
    if (e.key === 'Delete') {
      clearSelection();
      return;
    }
    if (e.key === 'F4') {
      e.preventDefault();
      doRedo();
      return;
    }
    if (!e.ctrlKey) return;
    if (e.key === 'PageUp') {
      e.preventDefault();
      setZoom(1);
      return;
    }
    if (e.key === 'PageDown') {
      e.preventDefault();
      setZoom(4);
      return;
    }
    const k = e.key.toLowerCase();
    const actions = {
      z: doUndo,
      y: doRedo,
      a: selectAll,
      x: cutSelection,
      c: copySelection,
      v: pasteClipboard,
      n: () => (e.shiftKey ? clearImage() : doNew()),
      o: doOpen,
      s: () => doSave(e.shiftKey),
      e: () => setSubDialog('attributes'),
      r: () => setSubDialog('fliprotate'),
      w: () => setSubDialog('stretch'),
      i: invertColors,
      t: () => setShowToolBox(s => !s),
      l: () => setShowColorBox(s => !s),
    };
    if (actions[k]) {
      e.preventDefault();
      actions[k]();
    }
  };

  useEffect(() => {
    if (!isFocus) return undefined;
    const f = e => apiRef.current.handleKey(e);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [isFocus]);

  // --- Tool options box ---

  function renderOptions() {
    switch (tool) {
      case 'line':
      case 'curve':
        return (
          <div className="paint__opt-list">
            {[1, 2, 3, 4, 5].map(w => (
              <div
                key={w}
                className={`paint__opt-line${
                  lineWidth === w ? ' paint__opt--sel' : ''
                }`}
                onMouseDown={() => setLineWidth(w)}
              >
                <div style={{ height: w }} />
              </div>
            ))}
          </div>
        );
      case 'rect':
      case 'ellipse':
      case 'rounded':
      case 'polygon':
        return (
          <div className="paint__opt-list">
            {['outline', 'both', 'fill'].map(m => (
              <div
                key={m}
                className={`paint__opt-fill${
                  shapeMode === m ? ' paint__opt--sel' : ''
                }`}
                onMouseDown={() => setShapeMode(m)}
              >
                <div
                  className={`paint__opt-fill-pict paint__opt-fill-pict--${m}`}
                />
              </div>
            ))}
          </div>
        );
      case 'brush':
        return (
          <div className="paint__opt-grid">
            {['circle', 'square'].map(shape =>
              [8, 5, 2].map(size => (
                <div
                  key={`${shape}${size}`}
                  className={`paint__opt-cell${
                    brush.shape === shape && brush.size === size
                      ? ' paint__opt--sel'
                      : ''
                  }`}
                  onMouseDown={() => setBrush({ shape, size })}
                >
                  <div
                    className="paint__opt-dot"
                    style={{
                      width: size,
                      height: size,
                      borderRadius: shape === 'circle' ? '50%' : 0,
                    }}
                  />
                </div>
              )),
            )}
          </div>
        );
      case 'eraser':
        return (
          <div className="paint__opt-list">
            {[4, 6, 8, 10].map(s => (
              <div
                key={s}
                className={`paint__opt-eraser${
                  eraserSize === s ? ' paint__opt--sel' : ''
                }`}
                onMouseDown={() => setEraserSize(s)}
              >
                <div
                  className="paint__opt-dot"
                  style={{ width: s, height: s }}
                />
              </div>
            ))}
          </div>
        );
      case 'airbrush':
        return (
          <div className="paint__opt-grid paint__opt-grid--spray">
            {[8, 16, 24].map(s => (
              <div
                key={s}
                className={`paint__opt-cell${
                  airbrushSize === s ? ' paint__opt--sel' : ''
                }`}
                onMouseDown={() => setAirbrushSize(s)}
              >
                <div
                  className="paint__opt-spray"
                  style={{ width: s, height: s }}
                />
              </div>
            ))}
          </div>
        );
      case 'magnifier':
        return (
          <div className="paint__opt-list">
            {[1, 2, 6, 8].map(z => (
              <div
                key={z}
                className={`paint__opt-zoom${
                  zoom === z ? ' paint__opt--sel' : ''
                }`}
                onMouseDown={() => {
                  setMagLevel(z);
                  setZoom(z);
                }}
              >
                {z}x
              </div>
            ))}
          </div>
        );
      case 'select':
      case 'freeform':
      case 'text':
        return (
          <div className="paint__opt-list">
            {[false, true].map(mode => (
              <div
                key={String(mode)}
                className={`paint__opt-trans${
                  transparentSelect === mode ? ' paint__opt--sel' : ''
                }`}
                onMouseDown={() => setTransparentSelect(mode)}
              >
                <div
                  className="paint__opt-trans-img"
                  style={{
                    backgroundImage: `url(${transparencyOptions})`,
                    backgroundPosition: `0 ${mode ? '-23px' : '0'}`,
                  }}
                />
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  }

  // --- Render ---

  const W = canvasSize.w * zoom;
  const H = canvasSize.h * zoom;
  const sel = selRef.current;
  const cursorForTool =
    tool === 'text' ? 'text' : tool === 'magnifier' ? 'zoom-in' : 'crosshair';

  return (
    <Div>
      <input
        type="color"
        ref={colorInputRef}
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
        onChange={e => {
          const slot = editSlotRef.current;
          const color = e.target.value.toUpperCase();
          setPalette(p => p.map((c, i) => (i === slot ? color : c)));
          setFg(color);
        }}
        tabIndex={-1}
      />
      <section className="paint__menubar">
        <WindowDropDowns items={menus} onClickItem={onMenuItem} />
      </section>
      <div className="paint__mid">
        {showToolBox && (
          <div className="paint__toolbox">
            <div className="paint__tools">
              {TOOLS.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.name}
                  className={`paint__tool${
                    tool === t.id ? ' paint__tool--active' : ''
                  }`}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => selectTool(t.id)}
                >
                  <span
                    className="paint__tool-glyph"
                    style={{
                      backgroundImage: `url(${toolsStrip})`,
                      backgroundPosition: `-${i * 16}px 0`,
                    }}
                  />
                </button>
              ))}
            </div>
            <div className="paint__options">{renderOptions()}</div>
          </div>
        )}
        <div
          className="paint__canvas-area"
          onMouseDown={e => {
            // Clicking the gray surround commits pending text, like Paint
            if (e.target === e.currentTarget && live.current.textBox)
              commitText();
          }}
        >
          <div className="paint__sheet-wrap">
            <div
              className="paint__holder"
              style={{ width: W, height: H, cursor: cursorForTool }}
              onMouseDown={onCanvasMouseDown}
              onMouseMove={onCanvasHover}
              onMouseLeave={onCanvasLeave}
              onDoubleClick={onCanvasDoubleClick}
              onContextMenu={e => e.preventDefault()}
            >
              <canvas
                ref={canvasRef}
                className="paint__canvas"
                style={{ width: W, height: H }}
              />
              <canvas
                ref={overlayRef}
                className="paint__overlay"
                style={{ width: W, height: H }}
              />
              {sel && !marquee && (
                <div
                  className="paint__marquee"
                  style={{
                    left: sel.x * zoom - 1,
                    top: sel.y * zoom - 1,
                    width: sel.w * zoom + 2,
                    height: sel.h * zoom + 2,
                  }}
                />
              )}
              {marquee && (
                <div
                  className="paint__marquee"
                  style={{
                    left: marquee.x * zoom - 1,
                    top: marquee.y * zoom - 1,
                    width: marquee.w * zoom + 2,
                    height: marquee.h * zoom + 2,
                  }}
                />
              )}
              {textBox && (
                <textarea
                  ref={textareaRef}
                  className="paint__textbox"
                  autoFocus
                  spellCheck={false}
                  value={textValue}
                  onChange={e => setTextValue(e.target.value)}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    left: textBox.x * zoom,
                    top: textBox.y * zoom,
                    width: textBox.w * zoom,
                    height: textBox.h * zoom,
                    color: fg,
                    backgroundColor: transparentSelect ? 'transparent' : bg,
                    fontSize: 13 * zoom,
                    lineHeight: `${15 * zoom}px`,
                  }}
                />
              )}
            </div>
            {resizeGhost && (
              <div
                className="paint__resize-ghost"
                style={{
                  width: resizeGhost.w * zoom,
                  height: resizeGhost.h * zoom,
                }}
              />
            )}
            <div
              className="paint__handle"
              style={{ left: W + 3, top: H + 3, cursor: 'nwse-resize' }}
              onMouseDown={e => startCanvasResize(e, 'rb')}
            />
            <div
              className="paint__handle"
              style={{ left: W + 3, top: H / 2 + 2, cursor: 'ew-resize' }}
              onMouseDown={e => startCanvasResize(e, 'r')}
            />
            <div
              className="paint__handle"
              style={{ left: W / 2 + 2, top: H + 3, cursor: 'ns-resize' }}
              onMouseDown={e => startCanvasResize(e, 'b')}
            />
          </div>
        </div>
      </div>
      {showColorBox && (
        <div className="paint__colorbox">
          <div className="paint__indicator">
            <div className="paint__indicator-swatch paint__indicator-swatch--bg">
              <div style={{ backgroundColor: bg }} />
            </div>
            <div className="paint__indicator-swatch paint__indicator-swatch--fg">
              <div style={{ backgroundColor: fg }} />
            </div>
          </div>
          <div className="paint__swatches">
            {palette.map((color, i) => (
              <div
                key={i}
                className="paint__swatch"
                onMouseDown={e => {
                  if (e.button === 0) {
                    setFg(color);
                    editSlotRef.current = i;
                  }
                }}
                onContextMenu={e => {
                  e.preventDefault();
                  setBg(color);
                }}
                onDoubleClick={() => openColorEditor(i)}
              >
                <div style={{ backgroundColor: color }} />
              </div>
            ))}
          </div>
        </div>
      )}
      {showStatusBar && (
        <div className="paint__status">
          <div className="paint__status-help">
            For Help, click Help Topics on the Help Menu.
          </div>
          <div className="paint__status-pane">{statusPos}</div>
          <div className="paint__status-pane">{statusSize}</div>
        </div>
      )}
      {fileDialog && (
        <FileDialog
          mode={fileDialog.mode}
          initialPath={
            currentPath
              ? currentPath.slice(0, currentPath.lastIndexOf('/'))
              : SPECIAL_FOLDERS.MY_PICTURES || SPECIAL_FOLDERS.MY_DOCUMENTS
          }
          initialFileName={
            fileDialog.mode === 'save'
              ? currentPath
                ? getBaseName(currentPath)
                : 'untitled'
              : ''
          }
          filters={fileDialog.mode === 'save' ? SAVE_FILTERS : OPEN_FILTERS}
          defaultExtension=".bmp"
          onSelect={path => {
            fileDialog.resolve(path);
            setFileDialog(null);
          }}
          onCancel={() => {
            fileDialog.resolve(null);
            setFileDialog(null);
          }}
        />
      )}
      {subDialog === 'attributes' && (
        <AttributesDialog
          width={canvasSize.w}
          height={canvasSize.h}
          onOK={(w, h) => {
            setSubDialog(null);
            resizeCanvasTo(w, h);
          }}
          onCancel={() => setSubDialog(null)}
        />
      )}
      {subDialog === 'fliprotate' && (
        <FlipRotateDialog
          onOK={kind => {
            setSubDialog(null);
            applyTransform(kind);
          }}
          onCancel={() => setSubDialog(null)}
        />
      )}
      {subDialog === 'stretch' && (
        <StretchSkewDialog
          onOK={(hPct, vPct) => {
            setSubDialog(null);
            applyStretch(hPct, vPct);
          }}
          onCancel={() => setSubDialog(null)}
        />
      )}
    </Div>
  );
}

