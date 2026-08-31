/*
 * Playlists, stored where you can actually get at them.
 *
 * The real player kept its playlists in the library database, which is opaque.
 * Here they are plain .m3u files in My Music\My Playlists, so they show up in
 * Explorer, survive a reload with everything else in the virtual file system,
 * and can be opened by anything else that understands the format.
 */
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';

/*
 * A function, for the same reason as the scan roots: MY_MUSIC resolves
 * against whoever is logged on now, and a module-level constant would
 * file every account's playlists under the first one's folder.
 */
export const playlistDir = () => `${SPECIAL_FOLDERS.MY_MUSIC}/My Playlists`;

const EXT = /\.m3u$/i;

/** -> [{ name, path }] sorted by name, the way the library listed them. */
export function listPlaylists(vfs) {
  const dir = vfs.findNodeCI(playlistDir());
  if (!dir) return [];
  return vfs
    .listDir(dir.path)
    .filter(n => n.type === 'file' && EXT.test(n.name))
    .map(n => ({ name: n.name.replace(EXT, ''), path: n.path }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The media paths a playlist names, in order. */
export function readPlaylist(vfs, path) {
  const text = vfs.readFile(path);
  if (typeof text !== 'string') return [];
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

function serialise(tracks) {
  const lines = ['#EXTM3U'];
  for (const t of tracks) {
    const label = t.artist ? `${t.artist} - ${t.title}` : t.title;
    lines.push(`#EXTINF:${Math.round(t.duration || 0)},${label}`);
    lines.push(t.path);
  }
  return `${lines.join('\n')}\n`;
}

export function savePlaylist(vfs, path, tracks) {
  const text = serialise(tracks);
  if (vfs.findNodeCI(path)) vfs.writeFile(path, text);
  else vfs.createFile(path, text, 'audio/x-mpegurl');
}

/** Windows rejects these in a file name, so the player does too. */
const ILLEGAL = /[\\/:*?"<>|]/;

export function validatePlaylistName(vfs, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'Please type a name for the playlist.';
  if (ILLEGAL.test(trimmed))
    return 'A playlist name cannot contain any of the following characters:\n\n            \\ / : * ? " < > |';
  if (vfs.findNodeCI(`${playlistDir()}/${trimmed}.m3u`))
    return `There is already a playlist named "${trimmed}".`;
  return null;
}

/** Creates an empty playlist and returns its { name, path }. */
export function createPlaylist(vfs, name) {
  const trimmed = String(name).trim();
  vfs.createFolder(playlistDir());
  const path = `${playlistDir()}/${trimmed}.m3u`;
  savePlaylist(vfs, path, []);
  return { name: trimmed, path };
}

export function addToPlaylist(vfs, path, trackPaths, library) {
  const existing = readPlaylist(vfs, path);
  const merged = [...existing];
  for (const p of trackPaths) if (!merged.includes(p)) merged.push(p);
  savePlaylist(
    vfs,
    path,
    merged.map(p => resolve(library, p)),
  );
}

export function removeFromPlaylist(vfs, path, trackPath, library) {
  const kept = readPlaylist(vfs, path).filter(p => p !== trackPath);
  savePlaylist(
    vfs,
    path,
    kept.map(p => resolve(library, p)),
  );
}

/** A playlist entry the library no longer has still round-trips by path. */
function resolve(library, path) {
  return (
    library.find(t => t.path === path) || { path, title: path, duration: 0 }
  );
}

/** The library rows a playlist points at, skipping anything since removed. */
export function playlistTracks(vfs, path, library) {
  const byPath = new Map(library.map(t => [t.path.toLowerCase(), t]));
  return readPlaylist(vfs, path)
    .map(p => byPath.get(p.toLowerCase()))
    .filter(Boolean);
}
