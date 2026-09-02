import { useEffect, useMemo, useState } from 'react';

import { readScreenSaverConfig } from '../components/ScreenSaver';
import { profileFoldersFor } from '../context/vfsConstants';
import { getExtension } from '../context/vfsUtils';
import { WALLPAPER_EXTENSIONS } from './shell/fileTypes';

/**
 * The saver one session idles into, plus picture URLs for the slideshow
 * (resolved only while that saver is selected).
 */
export function useScreenSaver(vfs, userName) {
  // Re-read whenever the hive changes so Apply takes effect without a reload
  const config = useMemo(
    () => readScreenSaverConfig(vfs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vfs.version, vfs.initialized],
  );

  const [pictures, setPictures] = useState([]);
  useEffect(() => {
    if (!vfs.initialized || config.name !== 'My Pictures Slideshow') {
      setPictures([]);
      return undefined;
    }
    let live = true;
    (async () => {
      const dir = profileFoldersFor(userName).MY_PICTURES;
      const walk = d =>
        vfs
          .listDir(d)
          .flatMap(n =>
            n.type === 'folder'
              ? walk(n.path)
              : n.type === 'file' &&
                WALLPAPER_EXTENSIONS.includes(getExtension(n.path))
              ? [n.path]
              : [],
          );
      const paths = vfs.exists(dir) ? walk(dir) : [];
      const urls = [];
      for (const path of paths.slice(0, 60)) {
        // eslint-disable-next-line no-await-in-loop
        const url = await vfs.readFileUrl(path);
        if (url) urls.push({ url, name: path.split('/').pop() });
      }
      if (live) setPictures(urls);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, vfs.version, config.name, userName]);

  return { config, pictures };
}
