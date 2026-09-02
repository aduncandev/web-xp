/*
 * The Media Library is a list the user builds, held in their profile — the
 * real player asked before it went looking, and only ever contained what had
 * been added to it. Searching the machine (Tools > Search for Media Files)
 * looks in My Music / My Videos and the shared equivalents; opening a file
 * plays it without filing it away.
 */
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { trackNumber } from '../../../context/mediaTags';

const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|wma|flac)$/i;
const VIDEO_EXT = /\.(mp4|webm|ogv|mkv|avi|wmv|mpg|mpeg|mov)$/i;

export const MEDIA_EXTENSIONS = new RegExp(
  `${AUDIO_EXT.source}|${VIDEO_EXT.source}`,
  'i',
);

const SHARED_MUSIC = SPECIAL_FOLDERS.SHARED_MUSIC;
const SHARED_VIDEO = SPECIAL_FOLDERS.SHARED_VIDEOS;

/*
 * Resolved per scan, never captured.
 *
 * SPECIAL_FOLDERS.MY_MUSIC is a getter over the current account name, so
 * reading it into a module-level array freezes whoever happened to be
 * logged on when this module was first imported. Every later session then
 * scanned that first account's folder instead of its own — which is why
 * the shared folders always worked and the personal ones only sometimes
 * did: SHARED_MUSIC is a plain string and has nothing to go stale.
 */
const scanRoots = () => [
  SPECIAL_FOLDERS.MY_MUSIC,
  SPECIAL_FOLDERS.MY_VIDEOS,
  SHARED_MUSIC,
  SHARED_VIDEO,
];

export const mediaKind = name => (VIDEO_EXT.test(name) ? 'video' : 'audio');

const stripExtension = name => name.replace(/\.[^.]+$/, '');

/** Recursively collect media files under a folder, alphabetical per level. */
function collect(vfs, dirPath, out) {
  for (const child of vfs.listDir(dirPath)) {
    if (child.type === 'folder') collect(vfs, child.path, out);
    else if (child.type === 'file' && MEDIA_EXTENSIONS.test(child.name)) {
      out.push({
        path: child.path,
        name: child.name,
        title: stripExtension(child.name),
        kind: mediaKind(child.name),
      });
    }
  }
  return out;
}

/**
 * Every media file a search of the machine turns up, de-duplicated by path.
 *
 * This is NOT the library — the real player never quietly adopted whatever
 * was lying in My Music. It asks the first time you open the Media Library
 * (RT_STRING #1706) and otherwise waits to be told, so this only supplies
 * candidates for Tools > Search for Media Files.
 */
export function searchForMedia(vfs) {
  const seen = new Set();
  const out = [];
  for (const root of scanRoots()) {
    const node = vfs.findNodeCI(root);
    if (!node) continue;
    for (const track of collect(vfs, node.path, [])) {
      const key = track.path.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(track);
    }
  }
  return out;
}

/** Rebuild a track record from a path the library remembers. */
export function trackForPath(vfs, path) {
  const node = vfs.findNodeCI(path);
  if (!node || node.type !== 'file') return null;
  return {
    path: node.path,
    name: node.name,
    title: stripExtension(node.name),
    kind: mediaKind(node.name),
  };
}

/** A file's own tags win over its name, the way the real library did. */
export function decorate(track, tags) {
  const t = tags && tags[track.path];
  return {
    ...track,
    id: track.path,
    title: (t && t.title) || track.title,
    artist: (t && t.artist) || '',
    album: (t && t.album) || '',
    genre: (t && t.genre) || '',
    track: trackNumber(t && t.track),
    duration: (t && t.duration) || 0,
  };
}

/** "Unknown Artist" and friends — the library never shows a blank cell. */
export const UNKNOWN = {
  artist: 'Unknown Artist',
  album: 'Unknown Album',
  genre: 'Unknown Genre',
};

export const orUnknown = (value, field) => value || UNKNOWN[field];

export function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** The deck's elapsed-time readout is zero-padded to two digits. */
export function formatElapsed(seconds) {
  if (!seconds || !isFinite(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(
      2,
      '0',
    )}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
