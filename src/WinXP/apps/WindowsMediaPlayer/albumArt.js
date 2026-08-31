/*
 * Cover art for a track.
 *
 * First choice is the picture embedded in the file's own tags. Failing that,
 * the folder is searched for a cover image, the way Windows did it — XP's
 * shell wrote Folder.jpg and AlbumArt_*.jpg beside the music, and the usual
 * names people rip to are checked alongside them.
 */
import { getParentPath } from '../../../context/vfsUtils';

const IMAGE_EXT = /\.(jpe?g|png|gif|bmp)$/i;

// Best first: the shell's own names, then what rippers and downloads use.
const PREFERRED = [
  /^folder\./i,
  /^albumart.*large\./i,
  /^albumart(?!.*small)/i,
  /^cover\./i,
  /^front\./i,
  /^album\./i,
  /^artwork\./i,
  /^albumart.*small\./i,
];

/** The best cover image sitting next to `path`, or null. */
export function findFolderCover(vfs, path) {
  const dir = getParentPath(path);
  if (!dir) return null;
  const node = vfs.findNodeCI(dir);
  if (!node) return null;
  let images;
  try {
    images = vfs
      .listDir(node.path)
      .filter(c => c.type === 'file' && IMAGE_EXT.test(c.name));
  } catch {
    return null;
  }
  if (!images.length) return null;
  for (const pattern of PREFERRED) {
    const hit = images.find(c => pattern.test(c.name));
    if (hit) return hit.path;
  }
  // A folder holding exactly one picture is almost certainly the sleeve.
  return images.length === 1 ? images[0].path : null;
}

/**
 * Resolve a track's artwork to a URL, or null if it has none. Any object URL
 * it creates is handed to `onCreated` so the caller can revoke it later.
 */
export async function resolveAlbumArt(vfs, track, tags, onCreated) {
  const tag = tags && tags[track.path];
  if (tag && tag.picture && tag.picture.bytes && tag.picture.bytes.length) {
    const blob = new Blob([tag.picture.bytes], {
      type: tag.picture.mime || 'image/jpeg',
    });
    const url = URL.createObjectURL(blob);
    if (onCreated) onCreated(url);
    return url;
  }
  const cover = findFolderCover(vfs, track.path);
  if (!cover) return null;
  const url = await vfs.readFileUrl(cover);
  if (url && url.startsWith('blob:') && onCreated) onCreated(url);
  return url || null;
}
