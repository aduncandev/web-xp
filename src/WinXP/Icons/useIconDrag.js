import { useRef, useState } from 'react';
import { CELL_W, ICON_HIT_H, DRAG_THRESHOLD } from './helpers';
import { toLogicalX, toLogicalY } from '../screen';

/**
 * Dragging desktop icons, XP style: the originals hold their cells while
 * translucent copies follow the pointer, folders and the Recycle Bin light
 * up as drop targets, and Escape, losing the window or releasing the
 * button off-window put everything back.
 *
 * `onClick(id, { collapse, rename })` runs for a press that never moved;
 * `onDropIntoWindow(paths, dir)` when the release lands on an Explorer
 * window's file area; `onDrop(paths, dx, dy, target)` for every other drop.
 */
export function useIconDrag({
  icons,
  placements,
  onClick,
  onDropIntoWindow,
  onDrop,
}) {
  const [dragState, setDragState] = useState(null); // {paths, dx, dy}
  const [dropTarget, setDropTarget] = useState(null); // hovered folder/bin
  const cancelledRef = useRef(false);

  const startDrag = (primaryId, paths, collapse, rename, e) => {
    const startX = toLogicalX(e.clientX);
    const startY = toLogicalY(e.clientY);
    // The icon under the cursor is the anchor: it claims its target cell first
    const ordered = [primaryId, ...paths.filter(p => p !== primaryId)];
    let moved = false;
    let curDx = 0;
    let curDy = 0;
    let curTarget = null;
    cancelledRef.current = false;

    const dragged = new Set(ordered);
    const targets = icons
      .filter(i => !dragged.has(i.id) && (i.isFolder || i.isRecycle))
      .map(i => ({ id: i.id, p: placements[i.id] }))
      .filter(t => t.p);

    const onMove = ev => {
      if ((ev.buttons & 1) === 0) {
        // The button was released outside the window: XP restores the icon
        onCancel();
        return;
      }
      const lx = toLogicalX(ev.clientX);
      const ly = toLogicalY(ev.clientY);
      curDx = lx - startX;
      curDy = ly - startY;
      if (!moved) {
        if (
          Math.abs(curDx) < DRAG_THRESHOLD &&
          Math.abs(curDy) < DRAG_THRESHOLD
        )
          return;
        moved = true;
      }
      const hit = targets.find(
        t =>
          lx >= t.p.x &&
          lx <= t.p.x + CELL_W &&
          ly >= t.p.y &&
          ly <= t.p.y + ICON_HIT_H,
      );
      const nextTarget = hit ? hit.id : null;
      if (nextTarget !== curTarget) {
        curTarget = nextTarget;
        setDropTarget(nextTarget);
      }
      setDragState({ paths: ordered, dx: curDx, dy: curDy });
    };
    const cleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onCancel);
      setDragState(null);
      setDropTarget(null);
    };
    const onUp = ev => {
      cleanup();
      if (cancelledRef.current) return;
      if (!moved) {
        onClick(primaryId, { collapse, rename });
        return;
      }
      // Released over an Explorer window's file area? Then this is a move
      // into that folder, not a desktop rearrangement
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      const drop = under && under.closest && under.closest('[data-drop-path]');
      if (drop) {
        onDropIntoWindow(ordered, drop.getAttribute('data-drop-path'));
        return;
      }
      onDrop(ordered, curDx, curDy, curTarget);
    };
    const onCancel = () => {
      cancelledRef.current = true;
      cleanup();
    };
    const onKey = ev => {
      if (ev.key === 'Escape') onCancel();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keydown', onKey);
    window.addEventListener('blur', onCancel);
  };

  return { dragState, dropTarget, startDrag };
}
