// The picture itself: the two canvases (the image and the overlay drawn
// over it), their size, and the undo history of pixel snapshots.
import { useRef, useState } from 'react';
import { DEFAULT_SIZE, UNDO_LEVELS } from './constants';

export function useDocument() {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState(DEFAULT_SIZE);
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const [stackLen, setStackLen] = useState({ u: 0, r: 0 });

  const ctx2d = () => canvasRef.current.getContext('2d');

  function setPhysicalSize(w, h) {
    canvasRef.current.width = w;
    canvasRef.current.height = h;
    overlayRef.current.width = w;
    overlayRef.current.height = h;
    ctx2d().imageSmoothingEnabled = false;
    setCanvasSize({ w, h });
  }

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

  /** Remember the picture as it is, before a change. */
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

  /** Step back one change; false when there is none. */
  function undo() {
    if (!undoRef.current.length) return false;
    redoRef.current.push(snapshot());
    restoreSnapshot(undoRef.current.pop());
    syncStackLen();
    return true;
  }

  function redo() {
    if (!redoRef.current.length) return false;
    undoRef.current.push(snapshot());
    restoreSnapshot(redoRef.current.pop());
    syncStackLen();
    return true;
  }

  function resetHistory() {
    undoRef.current = [];
    redoRef.current = [];
    setStackLen({ u: 0, r: 0 });
  }

  return {
    canvasRef,
    overlayRef,
    canvasSize,
    ctx2d,
    setPhysicalSize,
    pushUndo,
    undo,
    redo,
    resetHistory,
    stackLen,
  };
}
