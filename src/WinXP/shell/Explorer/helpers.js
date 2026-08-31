// Pure, stateless helpers for Explorer: static column defs, drag-and-drop
// plumbing that closes over nothing, and small formatters.

/* Explorer's Details view columns. Dragging a divider resizes the column to
   its left and double-clicking one sizes it to its contents, as in Windows;
   the list scrolls sideways rather than squeezing a column. */
// Starting widths, chosen to fit the window Explorer opens at so the view
// does not begin already scrolled sideways. Everything past that is the
// user's, and is remembered per user.
export const DETAIL_COLUMNS = [
  { id: 'name', label: 'Name', sort: 'name', width: 150 },
  { id: 'size', label: 'Size', sort: 'size', width: 60, num: true },
  { id: 'type', label: 'Type', sort: 'type', width: 110 },
  { id: 'modified', label: 'Date Modified', sort: 'modified', width: 115 },
];

// The Recycle Bin's details view: what got deleted, from where, when —
// the columns the real bin showed instead of Date Modified.
export const RECYCLE_COLUMNS = [
  { id: 'name', label: 'Name', sort: 'name', width: 140 },
  { id: 'location', label: 'Original Location', sort: 'location', width: 160 },
  { id: 'deleted', label: 'Date Deleted', sort: 'deleted', width: 115 },
  { id: 'size', label: 'Size', sort: 'size', width: 60, num: true },
  { id: 'type', label: 'Type', sort: 'type', width: 100 },
];

// Inside an archive, the columns zipfldr's own listing used — including
// "Has a password", which is the visible proof that adding one worked.
export const ARCHIVE_COLUMNS = [
  { id: 'name', label: 'Name', sort: 'name', width: 150 },
  { id: 'type', label: 'Type', sort: 'type', width: 100 },
  { id: 'packed', label: 'Packed Size', sort: 'packed', width: 72, num: true },
  { id: 'password', label: 'Has a password', sort: 'password', width: 84 },
  { id: 'size', label: 'Size', sort: 'size', width: 60, num: true },
  { id: 'ratio', label: 'Ratio', sort: 'ratio', width: 44, num: true },
  { id: 'modified', label: 'Date', sort: 'modified', width: 115 },
];

// Every details column either view can show, for one shared width store
export const ALL_DETAIL_COLUMNS = [
  ...DETAIL_COLUMNS,
  ...RECYCLE_COLUMNS.filter(c => DETAIL_COLUMNS.every(d => d.id !== c.id)),
  ...ARCHIVE_COLUMNS.filter(c =>
    [...DETAIL_COLUMNS, ...RECYCLE_COLUMNS].every(d => d.id !== c.id),
  ),
];

// MIME type carried by internal drags (moves between Explorer views)
export const DND_TYPE = 'application/x-webxp-paths';

export const readDndPaths = e => {
  try {
    const raw = e.dataTransfer.getData(DND_TYPE);
    const paths = raw ? JSON.parse(raw) : null;
    return Array.isArray(paths) && paths.length > 0 ? paths : null;
  } catch {
    return null;
  }
};

export const isDndFolder = node =>
  !!node && (node.type === 'folder' || node.type === 'drive');

export const fmtDate = ts =>
  ts
    ? new Date(ts).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';
