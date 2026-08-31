// Pure constants and formatters for the Properties dialog — nothing here
// closes over component state.

// The six document fields XP's Simple summary exposes, stored per path in
// the profile hive since the VFS has no property stream. Media files get a
// different set — see EDITABLE_TAGS — because that is what XP showed for
// them: Artist, Album Title, Year, Track Number, Genre and Comments, all of
// them typed into rather than merely read.
export const SUMMARY_FIELDS = [
  { key: 'title', label: 'Title:' },
  { key: 'subject', label: 'Subject:' },
  { key: 'author', label: 'Author:' },
  { key: 'category', label: 'Category:' },
  { key: 'keywords', label: 'Keywords:' },
  { key: 'comments', label: 'Comments:' },
];

// NTFS rounds every file up to a whole 4 KB cluster for "Size on disk".
const CLUSTER = 4096;
export const sizeOnDisk = bytes =>
  bytes ? Math.ceil(bytes / CLUSTER) * CLUSTER : 0;

export const RUN_MODES = [
  { value: 'normal', label: 'Normal window' },
  { value: 'minimized', label: 'Minimized' },
  { value: 'maximized', label: 'Maximized' },
];

// The long date format General's Created/Modified/Accessed rows use.
export const fmtLong = ts =>
  ts
    ? new Date(ts).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      })
    : '';
