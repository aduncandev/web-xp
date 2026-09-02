// The picture for the current track: embedded art first, then a cover in
// its folder. Resolved once per path and kept for the player's lifetime.
import { useEffect, useState } from 'react';
import { resolveAlbumArt } from './albumArt';

export function useAlbumArt({ vfs, current, tags, createdUrls }) {
  const [artUrls, setArtUrls] = useState({});
  useEffect(() => {
    if (!current || !vfs.initialized) return undefined;
    if (current.path in artUrls) return undefined;
    // wait for the tags, so an embedded picture wins over a folder cover
    if (!(current.path in tags)) return undefined;
    let cancelled = false;
    (async () => {
      const url = await resolveAlbumArt(vfs, current, tags, created =>
        createdUrls.current.add(created),
      );
      if (!cancelled) setArtUrls(prev => ({ ...prev, [current.path]: url }));
    })();
    return () => {
      cancelled = true;
    };
  }, [current, tags, artUrls, vfs, createdUrls]);
  return current ? artUrls[current.path] : undefined;
}
