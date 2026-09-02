import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CELL_W,
  CELL_H,
  GRID_X,
  GRID_Y,
  TASKBAR_H,
  ICON_HIT_H,
  EMPTY_LAYOUT,
  clamp,
  cellKey,
  nearestFreeCell,
} from './helpers';

// XP flow order: top to bottom, then the next column
const flowCell = (i, rows) => ({ col: Math.floor(i / rows), row: i % rows });

/**
 * Where each desktop icon sits. The layout is stored in the user's hive as
 * { positions, autoArrange, alignToGrid }; a stored position is either a
 * grid cell {col,row} or free pixels {x,y}, and icons without one take the
 * first free cell in flow order. Only the on-screen session writes the hive:
 * fast user switching keeps the others mounted, and their listings track
 * the active user.
 */
export function useDesktopLayout({
  vfs,
  userName,
  active,
  icons,
  winWidth,
  winHeight,
}) {
  const [layout, setLayout] = useState(EMPTY_LAYOUT);
  const layoutReadyRef = useRef(false);

  const cols = Math.max(1, Math.floor((winWidth - GRID_X) / CELL_W));
  // A row exists wherever an icon fits, not wherever a whole cell does:
  // the 75px cell is padding around a 62px icon, so the last band above
  // the taskbar holds a row at sizes where it cannot hold a full cell
  const rows = Math.max(
    1,
    Math.floor((winHeight - TASKBAR_H - GRID_Y - ICON_HIT_H) / CELL_H) + 1,
  );

  const cellToXy = useCallback(
    c => ({ x: GRID_X + c.col * CELL_W, y: GRID_Y + c.row * CELL_H }),
    [],
  );
  const xyToCell = useCallback(
    (x, y) => ({
      col: clamp(Math.round((x - GRID_X) / CELL_W), 0, cols - 1),
      row: clamp(Math.round((y - GRID_Y) / CELL_H), 0, rows - 1),
    }),
    [cols, rows],
  );

  // Load this user's layout from their hive once the VFS is up
  useEffect(() => {
    if (!vfs.initialized || layoutReadyRef.current) return;
    let cfg = null;
    try {
      cfg = vfs.getUserConfigFor(userName, 'desktopLayout', null);
    } catch {
      cfg = null;
    }
    layoutReadyRef.current = true;
    if (cfg && typeof cfg === 'object') {
      setLayout({
        positions: cfg.positions || {},
        autoArrange: !!cfg.autoArrange,
        alignToGrid: cfg.alignToGrid !== false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, userName]);

  // Persist every change, from the active session only
  useEffect(() => {
    if (!layoutReadyRef.current || !vfs.initialized) return;
    if (!active) return;
    try {
      vfs.setUserConfigFor(userName, 'desktopLayout', layout);
    } catch {
      // hive write failed, the layout stays session-only
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // Drop entries for icons no longer on the desktop. A hidden session's
  // listing is the active user's, so pruning against it would gut this
  // user's stored layout.
  useEffect(() => {
    if (!vfs.initialized || icons.length === 0) return;
    if (!active) return;
    const ids = new Set(icons.map(i => i.id));
    setLayout(l => {
      const stale = Object.keys(l.positions).filter(k => !ids.has(k));
      if (stale.length === 0) return l;
      const positions = { ...l.positions };
      stale.forEach(k => delete positions[k]);
      return { ...l, positions };
    });
  }, [icons, vfs.initialized, active]);

  // Every icon resolved to pixels
  const placements = useMemo(() => {
    const out = {};
    const occupied = new Set();
    const order = icons.map(i => i.id);
    const recycleIds = new Set(icons.filter(i => i.isRecycle).map(i => i.id));

    if (layout.autoArrange) {
      order.forEach((id, i) => {
        out[id] = cellToXy(flowCell(i, rows));
      });
      return out;
    }

    for (const id of order) {
      const e = layout.positions[id];
      if (!e) continue;
      if (e.col != null) {
        const c = nearestFreeCell(
          {
            col: clamp(e.col, 0, cols - 1),
            row: clamp(e.row, 0, rows - 1),
          },
          occupied,
          cols,
          rows,
        );
        occupied.add(cellKey(c));
        out[id] = cellToXy(c);
      } else if (e.x != null) {
        if (layout.alignToGrid) {
          const c = nearestFreeCell(xyToCell(e.x, e.y), occupied, cols, rows);
          occupied.add(cellKey(c));
          out[id] = cellToXy(c);
        } else {
          // Clamped on the way out, not on the way into storage: a window
          // that shrinks must not strand an icon past its edge, but the
          // spot the user dropped it at is kept, so widening puts it back
          out[id] = {
            x: clamp(e.x, 0, Math.max(0, winWidth - CELL_W)),
            y: clamp(e.y, 0, Math.max(0, winHeight - TASKBAR_H - ICON_HIT_H)),
          };
        }
      }
    }
    for (const id of order) {
      if (out[id]) continue;
      // An unpositioned Recycle Bin takes XP's stock spot, hugging the
      // bottom-right corner off the flow grid. With Align to Grid on it
      // takes the corner cell instead, which the user can drag it back to.
      if (recycleIds.has(id)) {
        const corner = { col: cols - 1, row: rows - 1 };
        occupied.add(cellKey(corner));
        out[id] = layout.alignToGrid
          ? cellToXy(corner)
          : {
              x: winWidth - CELL_W - 2,
              y: winHeight - TASKBAR_H - CELL_H - 5,
            };
        continue;
      }
      for (let i = 0; i < cols * rows + 1; i++) {
        const c = flowCell(i, rows);
        if (c.col >= cols) break;
        if (!occupied.has(cellKey(c))) {
          occupied.add(cellKey(c));
          out[id] = cellToXy(c);
          break;
        }
      }
      if (!out[id]) out[id] = cellToXy({ col: cols - 1, row: rows - 1 });
    }
    return out;
  }, [icons, layout, cols, rows, cellToXy, xyToCell, winWidth, winHeight]);

  /**
   * Land a drag of `paths` moved by (dx, dy). The whole arrangement is
   * materialized on every drop: resting icons keep exactly the cell they
   * are rendered in, so the stored layout can never disagree with the
   * screen. Under Auto Arrange the icons snap back into the flow.
   */
  const dropAt = useCallback(
    (paths, dx, dy) => {
      if (layout.autoArrange) return;
      const dragged = new Set(paths);
      const positions = {};
      if (layout.alignToGrid) {
        const occupied = new Set();
        icons.forEach(i => {
          if (dragged.has(i.id)) return;
          const p = placements[i.id];
          if (!p) return;
          const c = xyToCell(p.x, p.y);
          occupied.add(cellKey(c));
          positions[i.id] = c;
        });
        for (const p of paths) {
          const orig = placements[p];
          if (!orig) continue;
          const c = nearestFreeCell(
            xyToCell(orig.x + dx, orig.y + dy),
            occupied,
            cols,
            rows,
          );
          occupied.add(cellKey(c));
          positions[p] = c;
        }
      } else {
        icons.forEach(i => {
          if (dragged.has(i.id)) return;
          const p = placements[i.id];
          if (p) positions[i.id] = { x: p.x, y: p.y };
        });
        for (const p of paths) {
          const orig = placements[p];
          if (!orig) continue;
          positions[p] = {
            x: clamp(orig.x + dx, 0, winWidth - CELL_W),
            y: clamp(orig.y + dy, 0, winHeight - TASKBAR_H - ICON_HIT_H),
          };
        }
      }
      setLayout(l => ({ ...l, positions }));
    },
    [icons, layout, placements, xyToCell, cols, rows, winWidth, winHeight],
  );

  /** Free the cells of icons that left the desktop. */
  const forget = useCallback(paths => {
    setLayout(l => {
      const positions = { ...l.positions };
      let changed = false;
      paths.forEach(p => {
        if (positions[p]) {
          delete positions[p];
          changed = true;
        }
      });
      return changed ? { ...l, positions } : l;
    });
  }, []);

  /** Keep an icon's spot under its new path after a rename. */
  const repath = useCallback((oldPath, newPath) => {
    setLayout(l => {
      if (!l.positions[oldPath]) return l;
      const positions = { ...l.positions };
      positions[newPath] = positions[oldPath];
      delete positions[oldPath];
      return { ...l, positions };
    });
  }, []);

  // Arrange Icons By: shortcuts and namespace icons first, then folders,
  // then files, each group in the chosen order
  const arrangeBy = useCallback(
    key => {
      const nodes = icons.map(i => vfs.getNode(i.id)).filter(Boolean);
      const rank = n =>
        n.type === 'shortcut' || n.type === 'special'
          ? 0
          : n.type === 'folder'
          ? 1
          : 2;
      const ext = n => {
        const idx = n.name.lastIndexOf('.');
        return idx > 0 ? n.name.slice(idx + 1).toLowerCase() : '';
      };
      const byName = (a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      const cmp = {
        name: byName,
        size: (a, b) => (a.size || 0) - (b.size || 0),
        type: (a, b) => ext(a).localeCompare(ext(b)) || byName(a, b),
        modified: (a, b) => (a.modifiedAt || 0) - (b.modifiedAt || 0),
      }[key];
      const sorted = [...nodes].sort((a, b) => rank(a) - rank(b) || cmp(a, b));
      const positions = {};
      sorted.forEach((n, i) => {
        positions[n.path] = flowCell(i, rows);
      });
      setLayout(l => ({ ...l, positions }));
    },
    [icons, vfs, rows],
  );

  const toggleAutoArrange = useCallback(() => {
    setLayout(l => {
      if (!l.autoArrange) return { ...l, autoArrange: true };
      // Turning off: keep icons where the flow put them
      const positions = {};
      icons.forEach((icon, i) => {
        positions[icon.id] = flowCell(i, rows);
      });
      return { ...l, autoArrange: false, positions };
    });
  }, [icons, rows]);

  const toggleAlignToGrid = useCallback(() => {
    setLayout(l => {
      if (l.alignToGrid) {
        // Turning off: materialize current pixel spots so nothing moves
        const positions = {};
        icons.forEach(icon => {
          const p = placements[icon.id];
          if (p) positions[icon.id] = { x: p.x, y: p.y };
        });
        return { ...l, alignToGrid: false, positions };
      }
      // Turning on: snap every icon to its nearest free cell right away so
      // later renders can't shuffle them (order-dependent re-snapping)
      const occupied = new Set();
      const positions = {};
      icons.forEach(icon => {
        const p = placements[icon.id];
        if (!p) return;
        const c = nearestFreeCell(xyToCell(p.x, p.y), occupied, cols, rows);
        occupied.add(cellKey(c));
        positions[icon.id] = c;
      });
      return { ...l, alignToGrid: true, positions };
    });
  }, [icons, placements, xyToCell, cols, rows]);

  return {
    layout,
    placements,
    dropAt,
    forget,
    repath,
    arrangeBy,
    toggleAutoArrange,
    toggleAlignToGrid,
  };
}
