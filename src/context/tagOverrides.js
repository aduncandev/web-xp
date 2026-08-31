/*
 * Tags the user has typed over the ones in a file.
 *
 * Windows XP let you change a track's Artist, Album, Genre and the rest in two
 * places: the Media Library list, where right-clicking a row offers "Edit" and
 * "Edit Selected Items" (WMPLOC menu 1650), and Explorer's Properties >
 * Summary page, whose Simple view is exactly the fields below.
 *
 * The edits are kept in the profile hive rather than written back into the
 * file, the same way the document summary fields already are: half the sample
 * media is served as a read-only static asset, and several of the formats here
 * have no tag block that can be rewritten in place. Everything that reads tags
 * merges these on top, so an edit made in one place shows up in the other.
 */

const CONFIG_KEY = 'mediaTagEdits';

/**
 * The editable fields, in the order and under the names XP's Summary page
 * used for audio — SHELL32 strings 9136, 9152, 9153, 9154, 9155, 8539, 9140.
 */
export const EDITABLE_TAGS = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'album', label: 'Album Title' },
  { key: 'year', label: 'Year' },
  { key: 'track', label: 'Track Number' },
  { key: 'genre', label: 'Genre' },
  { key: 'comment', label: 'Comments' },
];

/** The subset the Media Library shows as columns, so can edit in place. */
export const LIBRARY_EDITABLE = ['title', 'artist', 'album', 'track'];

/** File types whose Summary page XP filled in from the media tags. */
const TAGGED_EXT = /\.(mp3|wma|wav|ogg|opus|flac|m4a|m4v|mp4|mov|avi|wmv|asf|mpe?g|aac|mid|midi)$/i;

export const isTaggedMedia = name => TAGGED_EXT.test(String(name || ''));

const keyFor = path => String(path || '').toLowerCase();

/** Every edit in the profile, keyed by lower-cased path. */
export function readAllTagEdits(vfs) {
  if (!vfs || !vfs.getUserConfig) return {};
  try {
    return vfs.getUserConfig(CONFIG_KEY, {}) || {};
  } catch {
    return {};
  }
}

/** The edits for one file, or an empty object. */
export function tagEditsFor(vfs, path) {
  return readAllTagEdits(vfs)[keyFor(path)] || {};
}

/** Persist a whole edit map. */
export function saveTagEdits(vfs, all) {
  if (vfs && vfs.setUserConfig) vfs.setUserConfig(CONFIG_KEY, all);
}

/**
 * Merge `patch` into the edits for each of `paths`, returning a new map. A
 * field set to an empty string is dropped, which restores whatever the file
 * itself says; a file with nothing left over is forgotten entirely.
 */
export function applyEditsTo(all, paths, patch) {
  const next = { ...(all || {}) };
  for (const path of paths) {
    const key = keyFor(path);
    const entry = { ...(next[key] || {}) };
    for (const [field, value] of Object.entries(patch)) {
      const text = value == null ? '' : String(value).trim();
      if (text) entry[field] = text;
      else delete entry[field];
    }
    if (Object.keys(entry).length) next[key] = entry;
    else delete next[key];
  }
  return next;
}

/** Merge `patch` into one file's edits and save. */
export function writeTagEdits(vfs, path, patch) {
  const next = applyEditsTo(readAllTagEdits(vfs), [path], patch);
  saveTagEdits(vfs, next);
  return next;
}

/** A file's tags with the user's edits laid over them. */
export function applyTagEdits(tags, edits) {
  if (!edits || !Object.keys(edits).length) return tags || {};
  return { ...(tags || {}), ...edits };
}
