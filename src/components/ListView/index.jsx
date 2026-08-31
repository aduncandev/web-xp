/*
 * Details-view plumbing shared by every list with column headers — Explorer,
 * the Recycle Bin, Task Manager and the Media Player's library.
 *
 * Windows' list view lets you drag the divider between two headers to resize
 * the column on its left, double-click a divider to size that column to its
 * contents, and remembers what you chose. All of that lives here so the views
 * only have to supply their own chrome.
 *
 * Nothing clamps a column except a sliver at the bottom end: a column dragged
 * shut keeps just enough width to grab its divider again, otherwise it would
 * vanish with no way back.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useVFS } from '../../context/VFSContext';

/** Wide enough to still catch the divider once a column is dragged shut. */
export const GRIP_WIDTH = 6;

const COLUMN_CONFIG = 'listViewColumns';
const SPLITTER_CONFIG = 'listViewSplitters';

/** Reads and writes a per-user setting, once the file system is up. */
function useStoredSetting(configKey, itemKey, fallback) {
  const vfs = useVFS();
  const [value, setValue] = useState(fallback);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current || !vfs.initialized || !vfs.getUserConfig) return;
    loaded.current = true;
    const saved = vfs.getUserConfig(configKey, {}) || {};
    if (saved[itemKey]) setValue(prev => ({ ...prev, ...saved[itemKey] }));
  }, [vfs, configKey, itemKey]);

  const store = useCallback(
    next => {
      if (!vfs.initialized || !vfs.setUserConfig) return;
      const all = vfs.getUserConfig(configKey, {}) || {};
      vfs.setUserConfig(configKey, { ...all, [itemKey]: next });
    },
    [vfs, configKey, itemKey],
  );

  return [value, setValue, store];
}

/**
 * Column widths with drag-to-resize, remembered per user.
 *
 * `viewKey` names the list in the user's settings; `defs` is [{ id, width }]
 * where `width` is only the starting point.
 */
export function useColumns(viewKey, defs) {
  const initial = useRef(Object.fromEntries(defs.map(d => [d.id, d.width])))
    .current;
  const [widths, setWidths, store] = useStoredSetting(
    COLUMN_CONFIG,
    viewKey,
    initial,
  );

  // A column added since the settings were written picks up its default.
  useEffect(() => {
    setWidths(prev => {
      const missing = defs.filter(d => prev[d.id] == null);
      if (!missing.length) return prev;
      const next = { ...prev };
      for (const d of missing) next[d.id] = d.width;
      return next;
    });
  }, [defs, setWidths]);

  const setWidth = useCallback(
    (id, width) => {
      setWidths(prev => ({
        ...prev,
        [id]: Math.max(GRIP_WIDTH, Math.round(width)),
      }));
    },
    [setWidths],
  );

  /** Called from a divider's mousedown; resizes the column to its left. */
  const beginResize = useCallback(
    (id, event) => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startW = widths[id];
      let latest = widths;
      const move = e => {
        const width = Math.max(
          GRIP_WIDTH,
          Math.round(startW + (e.clientX - startX)),
        );
        latest = { ...latest, [id]: width };
        setWidths(prev => ({ ...prev, [id]: width }));
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        document.body.style.cursor = '';
        store(latest); // one write per drag, not one per pixel
      };
      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    },
    [widths, setWidths, store],
  );

  /** Double-clicking a divider sizes that column to its widest cell. */
  const autoSize = useCallback(
    (id, container) => {
      if (!container) return;
      let widest = 0;
      for (const cell of container.querySelectorAll(`[data-col="${id}"]`)) {
        // scrollWidth ignores the ellipsis, so it is the untruncated width
        widest = Math.max(widest, cell.scrollWidth + 10);
      }
      if (!widest) return;
      const width = Math.max(GRIP_WIDTH, Math.round(widest));
      setWidths(prev => {
        const next = { ...prev, [id]: width };
        store(next);
        return next;
      });
    },
    [setWidths, store],
  );

  return { widths, beginResize, autoSize, setWidth };
}

/**
 * Total width of a set of columns. A fixed-layout table needs this as a
 * definite width, or the browser reinterprets the column widths.
 */
export function sumWidths(defs, widths) {
  return defs.reduce((total, d) => total + (widths[d.id] || 0), 0);
}

/**
 * The grab strip on a header's trailing edge. Sits over the divider the
 * header already draws, so it needs no appearance of its own; flush inside
 * the cell, because a grip straddling the border is clipped away by headers
 * that set overflow: hidden.
 */
export const ResizeGrip = styled.div.attrs({ 'data-resize-grip': true })`
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: ${GRIP_WIDTH}px;
  cursor: col-resize;
  z-index: 2;
`;

/** A header cell's divider. */
export function ColumnDivider({ columnId, onResize, onAutoSize }) {
  return (
    <ResizeGrip
      onMouseDown={e => onResize(columnId, e)}
      onClick={e => {
        // a click that never left the divider must not also sort the column
        e.preventDefault();
        e.stopPropagation();
      }}
      onDoubleClick={e => {
        e.preventDefault();
        e.stopPropagation();
        if (onAutoSize) onAutoSize(columnId);
      }}
    />
  );
}

/**
 * Draggable split between two panes, remembered per user.
 *
 * `edge: 'end'` means the pane being sized is on the far side of the handle
 * (the Media Player's playlist), so dragging left makes it bigger.
 */
export function useSplitter({ key, initial, edge = 'start', boundsRef }) {
  const [state, setState, store] = useStoredSetting(SPLITTER_CONFIG, key, {
    size: initial,
  });
  const [bounds, setBounds] = useState(Infinity);

  // Track how much room there is, but ignore a width of zero — a minimised
  // window reports one, and clamping to it would throw away the size the
  // user chose instead of restoring it when the window comes back.
  useEffect(() => {
    const el = boundsRef && boundsRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const width = el.clientWidth;
      if (width > 0) setBounds(width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [boundsRef]);

  // The stored size is what was asked for; what gets rendered is that, or as
  // much of it as currently fits.
  const size = Math.max(0, Math.min(state.size, bounds));

  const beginDrag = useCallback(
    event => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startSize = size;
      let latest = size;
      const move = e => {
        const delta = e.clientX - startX;
        const next = edge === 'end' ? startSize - delta : startSize + delta;
        latest = Math.max(0, Math.min(bounds, Math.round(next)));
        setState({ size: latest });
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        document.body.style.cursor = '';
        store({ size: latest });
      };
      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    },
    [size, bounds, edge, setState, store],
  );

  return { size, beginDrag };
}
