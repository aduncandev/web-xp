import { useCallback, useEffect, useRef, useState } from 'react';

// Which edges a grip moves. A grip on the left or top edge changes the
// offset as well as the size, so the opposite edge stays put.
const GRIPS = {
  top: { dx: 0, dy: -1 },
  topRight: { dx: 1, dy: -1 },
  right: { dx: 1, dy: 0 },
  bottomRight: { dx: 1, dy: 1 },
  bottom: { dx: 0, dy: 1 },
  bottomLeft: { dx: -1, dy: 1 },
  left: { dx: -1, dy: 0 },
  topLeft: { dx: -1, dy: -1 },
};

const CURSORS = {
  top: 'n-resize',
  topRight: 'ne-resize',
  right: 'e-resize',
  bottomRight: 'se-resize',
  bottom: 's-resize',
  bottomLeft: 'sw-resize',
  left: 'w-resize',
  topLeft: 'nw-resize',
};

// Enough of the caption to grab when the viewport shrinks under a window
const REACHABLE = { x: 60, y: 30 };

/** A full-screen sheet that keeps a gesture's pointer events (and cursor) away from whatever is under it. */
function makeCover() {
  const cover = document.createElement('div');
  Object.assign(cover.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  });
  return cover;
}

const clampPoint = (e, b) => ({
  x: b ? Math.min(Math.max(e.pageX, b.left), b.right) : e.pageX,
  y: b ? Math.min(Math.max(e.pageY, b.top), b.bottom) : e.pageY,
});

/** Where a gesture puts the window for the pointer at `e`. */
function geometryFor(g, e, minWidth, minHeight) {
  const p = clampPoint(e, g.bounds);
  const deltaX = p.x - g.origin.x;
  const deltaY = p.y - g.origin.y;
  const { offset, size } = g.start;
  if (g.move) {
    return {
      offset: { x: offset.x + deltaX, y: offset.y + deltaY },
      size,
    };
  }
  let { x, y } = offset;
  let { width, height } = size;
  if (g.dx < 0) {
    width = Math.max(size.width - deltaX, minWidth);
    x = offset.x + size.width - width;
  } else if (g.dx > 0) {
    width = Math.max(size.width + deltaX, minWidth);
  }
  if (g.dy < 0) {
    height = Math.max(size.height - deltaY, minHeight);
    y = offset.y + size.height - height;
  } else if (g.dy > 0) {
    height = Math.max(size.height + deltaY, minHeight);
  }
  return { offset: { x, y }, size: { width, height } };
}

/**
 * Which grip of the frame the pointer is over, kept in a ref since only the
 * mousedown handler reads it. Sets the matching cursor on the frame, and
 * holds it (over a cover) while a resize is under way.
 */
function useGrip(ref, threshold, resizable) {
  const grip = useRef('');
  useEffect(() => {
    const target = ref.current;
    if (!target || !resizable) return undefined;
    const cover = makeCover();
    let locked = false;
    const set = p => {
      grip.current = p;
      target.style.cursor = CURSORS[p] || 'auto';
      cover.style.cursor = CURSORS[p] || 'auto';
    };
    const onHover = e => {
      if (locked) return;
      if (e.target !== target) {
        set('');
        return;
      }
      const { offsetX, offsetY } = e;
      const { width, height } = target.getBoundingClientRect();
      const v =
        offsetY < threshold
          ? 'top'
          : height - offsetY < threshold
          ? 'bottom'
          : '';
      const h =
        offsetX < threshold
          ? 'left'
          : width - offsetX < threshold
          ? 'right'
          : '';
      set(v && h ? `${v}${h[0].toUpperCase()}${h.slice(1)}` : v || h);
    };
    const onLeave = () => {
      if (!locked) set('');
    };
    const onUp = () => {
      locked = false;
      cover.remove();
      window.removeEventListener('mouseup', onUp);
    };
    const onDown = e => {
      if (e.target !== target) return;
      onHover(e);
      locked = true;
      document.body.appendChild(cover);
      window.addEventListener('mouseup', onUp);
    };
    target.addEventListener('mousemove', onHover);
    target.addEventListener('mouseleave', onLeave);
    target.addEventListener('mousedown', onDown);
    return () => {
      cover.remove();
      target.removeEventListener('mousemove', onHover);
      target.removeEventListener('mouseleave', onLeave);
      target.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, [ref, threshold, resizable]);
  return grip;
}

/**
 * Move a window by its caption (`dragRef`) and resize it by the edges of
 * its frame (`ref`). The store owns the geometry: `offset` and `size` come
 * in as props, the hook shows the pointer's transient geometry while a
 * gesture is under way, and `onCommit({ offset, size })` reports where it
 * ended. The pointer is kept inside `boundary` while dragging, and during a
 * resize also short of the point where the window would be narrower than
 * `constraintSize`.
 */
function useElementResize(ref, options) {
  const {
    dragRef,
    offset,
    size,
    onCommit,
    boundary,
    resizable = true,
    resizeThreshold = 10,
    constraintSize = 200,
    minWidth = 0,
    minHeight = 0,
  } = options;
  // What the frame shows mid-gesture; null when the store's geometry stands
  const [transient, setTransient] = useState(null);
  const current = transient || { offset, size };

  // The store caught up with the last commit: show its geometry again. A
  // commit that changed nothing leaves the (equal) transient in place.
  useEffect(() => {
    setTransient(null);
  }, [offset, size]);

  // The gesture handlers run outside React's render, so they read the
  // current geometry, boundary and commit callback from refs
  const live = useRef(current);
  useEffect(() => {
    live.current = current;
  });
  const boundsRef = useRef(boundary);
  const commitRef = useRef(onCommit);
  useEffect(() => {
    boundsRef.current = boundary;
    commitRef.current = onCommit;
  });

  const commit = useCallback(geometry => {
    live.current = geometry;
    setTransient(geometry);
    if (commitRef.current) commitRef.current(geometry);
  }, []);

  // A window near the edge is pulled back in when the viewport shrinks
  const edgeRight = boundary ? boundary.right : null;
  const edgeBottom = boundary ? boundary.bottom : null;
  useEffect(() => {
    if (edgeRight == null || edgeBottom == null) return;
    const { offset: o, size: s } = live.current;
    const x = Math.min(o.x, edgeRight - REACHABLE.x);
    const y = Math.min(o.y, edgeBottom - REACHABLE.y);
    if (x !== o.x || y !== o.y) commit({ offset: { x, y }, size: s });
  }, [edgeRight, edgeBottom, commit]);

  const grip = useGrip(ref, resizeThreshold, resizable);

  useEffect(() => {
    const target = ref.current;
    if (!target) return undefined;
    const dragTarget = dragRef && dragRef.current;
    const cover = makeCover();
    let gesture = null;

    const onMove = e => {
      if (!gesture) return;
      // Only a caption drag hides the page: content under the pointer
      // (iframes) would otherwise swallow the moves
      if (gesture.move && !cover.isConnected) document.body.appendChild(cover);
      const next = geometryFor(gesture, e, minWidth, minHeight);
      live.current = next;
      setTransient(next);
    };
    const onUp = e => {
      if (gesture) commit(geometryFor(gesture, e, minWidth, minHeight));
      gesture = null;
      cover.remove();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    const onDown = e => {
      const origin = { x: e.pageX, y: e.pageY };
      const start = live.current;
      const bounds = { ...boundsRef.current };
      if (dragTarget && e.target === dragTarget) {
        gesture = { move: true, origin, start, bounds };
      } else {
        const g = resizable && e.target === target ? GRIPS[grip.current] : null;
        if (!g) return;
        const { width, height } = start.size;
        if (g.dx < 0) bounds.right = origin.x + width - constraintSize;
        if (g.dx > 0) bounds.left = origin.x - width + constraintSize;
        if (g.dy < 0) bounds.bottom = origin.y + height - constraintSize;
        if (g.dy > 0) bounds.top = origin.y - height + constraintSize;
        gesture = { ...g, origin, start, bounds };
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };
    target.addEventListener('mousedown', onDown);
    return () => {
      target.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      cover.remove();
    };
  }, [
    ref,
    dragRef,
    grip,
    commit,
    resizable,
    constraintSize,
    minWidth,
    minHeight,
  ]);

  return current;
}

export default useElementResize;
