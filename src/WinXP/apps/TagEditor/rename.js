/*
 * Format strings, the way every tag editor of the period did them.
 *
 * A format is literal text with %field% placeholders — "%track% - %title%"
 * gives "01 - You Will Know Our Names". The same strings run backwards too, so
 * a folder full of "03 - Song.mp3" can be read back into tags by matching the
 * pattern against the name.
 *
 * Only substituted values are cleaned of characters Windows forbids in a file
 * name; the literal parts of the format are left exactly as typed, which is
 * what makes a backslash usable as a folder separator when organising.
 */

import { trackNumber } from '../../../context/mediaTags';

// The library and this app have to read a track tag the same way
export { trackNumber };

/** Fields a format string can name, in the order the app lists them. */
export const FIELDS = [
  'artist',
  'albumartist',
  'album',
  'title',
  'track',
  'year',
  'genre',
  'comment',
];

// \ / : * ? " < > | — the set the shell refuses, plus control characters
// eslint-disable-next-line no-control-regex
const ILLEGAL = /[\\/:*?"<>|\x00-\x1f]/g;

/** A tag value made safe to put in a file name. */
export function clean(value) {
  return String(value == null ? '' : value)
    .replace(ILLEGAL, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The value a placeholder stands for. Track numbers are padded to two digits,
 * which is what makes a folder sort in playing order.
 */
function valueFor(field, tags) {
  if (field === 'track') {
    const n = trackNumber(tags.track);
    return n ? n.padStart(2, '0') : '';
  }
  if (field === 'albumartist') return tags.albumArtist || tags.artist || '';
  return tags[field] == null ? '' : String(tags[field]);
}

/** Expand %fields% in `format` from a track's tags. */
export function expand(format, tags) {
  return String(format || '').replace(/%([a-z]+)%/gi, (whole, name) => {
    const field = name.toLowerCase();
    if (!FIELDS.includes(field)) return whole;
    return clean(valueFor(field, tags || {}));
  });
}

/** The placeholders a format uses, in order, ignoring unknown ones. */
export function fieldsIn(format) {
  const out = [];
  const re = /%([a-z]+)%/gi;
  let m = re.exec(String(format || ''));
  while (m) {
    const field = m[1].toLowerCase();
    if (FIELDS.includes(field)) out.push(field);
    m = re.exec(String(format || ''));
  }
  return out;
}

const escapeLiteral = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Read tags back out of a name using the same format string. Returns the
 * fields it could fill, or null when the name does not match the pattern.
 */
export function parse(format, name) {
  const fields = fieldsIn(format);
  if (!fields.length) return null;
  let pattern = '^';
  let rest = String(format || '');
  const re = /%([a-z]+)%/gi;
  let last = 0;
  let m = re.exec(rest);
  while (m) {
    pattern += escapeLiteral(rest.slice(last, m.index));
    // lazy, so the literal text between placeholders decides where each ends
    pattern += FIELDS.includes(m[1].toLowerCase())
      ? '(.*?)'
      : escapeLiteral(m[0]);
    last = m.index + m[0].length;
    m = re.exec(rest);
  }
  pattern += `${escapeLiteral(rest.slice(last))}$`;
  // the final placeholder should take everything that is left
  pattern = pattern.replace(/\(\.\*\?\)(?=\$$)/, '(.*)');
  let matched;
  try {
    matched = new RegExp(pattern).exec(String(name || ''));
  } catch {
    return null;
  }
  if (!matched) return null;
  const out = {};
  fields.forEach((field, i) => {
    const value = String(matched[i + 1] || '').trim();
    if (value) out[field] = field === 'track' ? trackNumber(value) : value;
  });
  return Object.keys(out).length ? out : null;
}

/**
 * Split an expanded folder format into path segments. Empty segments — an
 * album with no name, say — are dropped rather than leaving "Artist\\\\Title".
 */
export function segments(format, tags) {
  return expand(format, tags)
    .split(/[\\/]/)
    .map(part => part.trim())
    .filter(Boolean);
}

/** "song.mp3" -> ".mp3"; the extension is never part of a format. */
export function extensionOf(name) {
  const dot = String(name || '').lastIndexOf('.');
  return dot > 0 ? name.slice(dot) : '';
}

/** "song.mp3" -> "song" */
export function stemOf(name) {
  const ext = extensionOf(name);
  return ext ? String(name).slice(0, -ext.length) : String(name || '');
}

/**
 * Make `name` unique within `taken` the way the shell does, by adding " (2)",
 * " (3)" and so on before the extension.
 */
export function uniqueName(name, taken) {
  if (!taken.has(name.toLowerCase())) return name;
  const stem = stemOf(name);
  const ext = extensionOf(name);
  for (let n = 2; n < 1000; n++) {
    const candidate = `${stem} (${n})${ext}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return name;
}
