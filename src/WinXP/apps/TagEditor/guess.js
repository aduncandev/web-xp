/*
 * Working out an album from what the files are already called.
 *
 * Nobody types a format string for a folder they just downloaded — they want
 * the obvious reading of "01 - Artist - Title.mp3" without describing it
 * first. This takes the whole folder at once, because that is what makes the
 * guess reliable: the folders above the files usually name the artist and the
 * album, and a segment that is identical across every file is a far better
 * candidate for the artist than the same segment read on its own.
 *
 * Nothing here is certain, so everything it returns is shown before it is
 * applied, and by default it only fills fields that are empty.
 */
import { extensionOf, trackNumber } from './rename';

/** Folder names that say nothing about the music inside them. */
const GENERIC_FOLDERS = [
  'my music',
  'music',
  'my documents',
  'documents',
  'desktop',
  'downloads',
  'download',
  'shared music',
  'sample music',
  'new folder',
  'mp3',
  'mp3s',
  'songs',
  'audio',
  'media',
  'various',
  'unsorted',
  'temp',
];

// Noise people leave in file names. Only these known phrases are removed —
// stripping every bracket would eat "(Definitive Edition ver.)" too.
const NOISE = [
  /\(\s*official\s*(music\s*)?(video|audio|lyric[s]?\s*video)?\s*\)/gi,
  /\[\s*official\s*(music\s*)?(video|audio)?\s*\]/gi,
  /\(\s*lyric[s]?\s*\)/gi,
  /\[\s*lyric[s]?\s*\]/gi,
  /\(\s*audio\s*\)/gi,
  /\(\s*hd\s*\)/gi,
  /\[\s*hd\s*\]/gi,
  /\[\s*\d{2,3}\s*k?bps\s*\]/gi,
  /\(\s*\d{2,3}\s*k?bps\s*\)/gi,
  /\[[^\]]*\.(com|net|org|ru)[^\]]*\]/gi,
  /^\s*www\.[^\s-]+\s*[-_]\s*/i,
  /\s*-\s*copy$/i,
];

const DASHES = /[‐-―−]/g; // ‐ ‑ ‒ – — ― −

/** Strip the extension, the known noise, and the separator characters. */
export function cleanStem(name) {
  let stem = name.slice(0, name.length - extensionOf(name).length);
  stem = stem.replace(DASHES, '-');
  for (const pattern of NOISE) stem = stem.replace(pattern, ' ');
  // Underscores and dots stand in for spaces when a name has no real ones
  if (!/\s/.test(stem)) stem = stem.replace(/[_]+/g, ' ');
  if (!/\s/.test(stem) && /\w\.\w/.test(stem)) stem = stem.replace(/\./g, ' ');
  return stem.replace(/\s+/g, ' ').replace(/^[\s\-_.]+|[\s\-_.]+$/g, '');
}

/**
 * "AudioWavesOfPain" -> "Audio Waves Of Pain".
 *
 * Only names that are cleanly camel- or Pascal-cased are split: every word a
 * capital followed by lower case. Anything with runs of capitals in it —
 * "MIKEtheBOARDpleasey" — is left alone, because there is no reading of it
 * that is not a guess, and a wrong split reads far worse than no split.
 */
const CLEAN_RUN = /^[A-Z]?[a-z]+(?:[A-Z][a-z]+)+[0-9]*$/;

export function splitRun(text) {
  if (/\s/.test(text)) return text;
  if (!CLEAN_RUN.test(text)) return text;
  return text.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
}

const capitalise = text =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

/** A year hiding in brackets or on its own, if it is a plausible one. */
function yearIn(text) {
  const match = /(?:^|[([\s.\-_])((?:19|20)\d{2})(?=$|[)\]\s.\-_])/.exec(
    text || '',
  );
  return match ? match[1] : '';
}

/**
 * Pull a leading track number off, returning [track, rest].
 *
 * Covers what people actually end up with: "01 - Title", "01. Title",
 * "01 Title", "01_Title", "[01] Title", "(01) Title", "Track 01 - Title" and
 * the disc-and-track form "1-04 Title", where the second number is the track.
 * Never more than three digits, so a year at the front is left alone.
 */
function leadingTrack(stem) {
  const text = stem.replace(/^(?:track|trk|#)[\s.]*/i, '');
  const forms = [
    // disc and track: "1-04 Title", "1.04 Title"
    [/^(\d{1,2})[-.](\d{1,3})\s*(?:[-._)\]]\s*|\s+)(?=\D)/, 2],
    // bracketed: "[01] Title", "(01) Title"
    [/^[[(](\d{1,3})[\])]\s*[-._]?\s*(?=\D)/, 1],
    // plain: "01 - Title", "01. Title", "01 Title"
    [/^(\d{1,3})\s*(?:[-._)\]]\s*|\s+)(?=\D)/, 1],
  ];
  for (const [pattern, group] of forms) {
    const match = pattern.exec(text);
    if (match)
      return [String(Number(match[group])), text.slice(match[0].length).trim()];
  }
  return ['', stem];
}

/**
 * What a folder name says about the music in it. "Artist - Album (2003)" and
 * "(2003) Album" are both common; a bare name is taken as-is.
 */
function readFolderName(name) {
  if (!name) return null;
  const lower = name.trim().toLowerCase();
  if (GENERIC_FOLDERS.includes(lower)) return null;
  if (/^[a-z]:$/i.test(name.trim())) return null;
  let text = name.replace(DASHES, '-').trim();
  const year = yearIn(text);
  if (year)
    text = text
      .replace(new RegExp(`[([]?\\s*${year}\\s*[)\\]]?`), ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[-\s]+|[-\s]+$/g, '');
  const parts = text
    .split(/\s+-\s+/)
    .map(p => p.trim())
    .filter(Boolean);
  if (parts.length >= 2)
    return { artist: parts[0], album: parts.slice(1).join(' - '), year };
  return { album: text, year };
}

/**
 * Guess tags for a folder of files.
 *
 * `files` is [{ path, name, tags }] and `folder` the directory holding them.
 * Returns a Map of path -> patch, holding only fields that were worked out.
 */
export function guessFolder(files, folder) {
  if (!files || !files.length) return new Map();

  const dirs = String(folder || '').split('/');
  const here = readFolderName(dirs[dirs.length - 1]);
  const above = readFolderName(dirs[dirs.length - 2]);

  // "Artist/Album/01 Title.mp3" — the folder above the album names the artist
  const folderAlbum = here ? here.album : '';
  const folderArtist = (here && here.artist) || (above && above.album) || '';
  const folderYear = (here && here.year) || '';

  // First pass: clean each name and take the track number off the front
  const parsed = files.map(file => {
    const stem = cleanStem(file.name);
    let [track, rest] = leadingTrack(stem);
    const parts = rest
      .split(/\s+-\s+|\s+-|-\s+/)
      .map(p => p.trim())
      .filter(Boolean);
    // "Artist - Album - 01 - Title" puts the number in the middle. A number
    // in the last position is left alone — that is a title like "21".
    if (!track && parts.length > 2) {
      const at = parts.findIndex(
        (part, i) => i < parts.length - 1 && /^\d{1,3}$/.test(part),
      );
      if (at >= 0) {
        track = String(Number(parts[at]));
        parts.splice(at, 1);
      }
    }
    return { file, track, rest, parts };
  });

  // A first segment every file shares is the artist, not part of the title
  const firstParts = parsed
    .filter(p => p.parts.length > 1)
    .map(p => p.parts[0].toLowerCase());
  const sharedFirst =
    firstParts.length === parsed.length &&
    firstParts.length > 1 &&
    firstParts.every(p => p === firstParts[0])
      ? parsed[0].parts[0]
      : '';

  const out = new Map();
  for (const item of parsed) {
    const patch = {};
    if (item.track) patch.track = item.track;

    const { parts } = item;
    if (parts.length >= 3) {
      // Artist - Album - Title
      [patch.artist, patch.album] = parts;
      patch.title = parts.slice(2).join(' - ');
    } else if (parts.length === 2) {
      // Artist - Title, unless the folder says the first half is the album
      const [left, right] = parts;
      if (folderArtist && left.toLowerCase() === folderArtist.toLowerCase()) {
        patch.artist = left;
        patch.title = right;
      } else if (
        folderAlbum &&
        left.toLowerCase() === folderAlbum.toLowerCase()
      ) {
        patch.album = left;
        patch.title = right;
      } else {
        patch.artist = left;
        patch.title = right;
      }
    } else if (parts.length === 1) {
      patch.title = capitalise(splitRun(parts[0]));
    }

    // A bare number in front is a year or a track, never the artist
    if (patch.artist && /^\d{1,4}$/.test(patch.artist)) delete patch.artist;
    if (sharedFirst && patch.artist) patch.artist = sharedFirst;
    if (!patch.artist && folderArtist) patch.artist = folderArtist;
    if (!patch.album && folderAlbum) patch.album = folderAlbum;

    const year = yearIn(item.rest) || folderYear;
    if (year) {
      patch.year = year;
      // a year taken out of the title should not stay in it
      if (patch.title && patch.title.includes(year))
        patch.title = patch.title
          .replace(new RegExp(`[([]?\\s*${year}\\s*[)\\]]?`), ' ')
          .replace(/\s+/g, ' ')
          .trim();
    }
    // "Artist - 01. Title" hides the number inside a segment, so a title that
    // still starts with one gets the same treatment as a whole name would.
    if (!patch.track && patch.title) {
      const [track, rest] = leadingTrack(patch.title);
      if (track && rest) {
        patch.track = track;
        patch.title = rest;
      }
    }
    if (patch.title) patch.title = splitRun(patch.title);
    if (patch.artist) patch.artist = splitRun(patch.artist);

    for (const key of Object.keys(patch)) if (!patch[key]) delete patch[key];
    if (Object.keys(patch).length) out.set(item.file.path, patch);
  }
  return out;
}

/** Drop anything the file already knows, so a guess never overwrites a tag. */
export function onlyMissing(patch, tags) {
  const out = {};
  for (const [key, value] of Object.entries(patch)) {
    const have = key === 'track' ? trackNumber(tags[key]) : tags[key];
    if (!have) out[key] = value;
  }
  return out;
}
