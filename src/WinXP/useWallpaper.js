import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import wallpaper from 'assets/windowsIcons/wallpaper.jpeg';

// Display Properties emits { kind, value, position: center|tile|stretch }
const styleFor = (url, position) => {
  const base = {
    backgroundImage: `url(${url})`,
    backgroundColor: 'var(--xp-desktop, #3a6ea5)',
    backgroundAttachment: 'scroll',
  };
  if (position === 'tile')
    return {
      ...base,
      backgroundRepeat: 'repeat',
      backgroundSize: 'auto',
      backgroundPosition: '0 0',
    };
  if (position === 'center')
    return {
      ...base,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'auto',
      backgroundPosition: 'center',
    };
  // stretch (XP default)
  return {
    ...base,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
  };
};

/**
 * One session's desktop background: the user's saved wallpaper, or a transient
 * hijack (the Dog Virus) painted over it. Returns { style, hijack }.
 */
export function useWallpaper(vfs, userName) {
  const [wallpaperOverride, setWallpaperOverride] = useState(null);
  const [transientWallpaper, setTransientWallpaper] = useState(null);
  const hijackCountRef = useRef(0);
  const acquireWallpaper = useCallback(style => {
    hijackCountRef.current += 1;
    setTransientWallpaper(style);
  }, []);
  const releaseWallpaper = useCallback(() => {
    hijackCountRef.current = Math.max(0, hijackCountRef.current - 1);
    if (hijackCountRef.current === 0) setTransientWallpaper(null);
  }, []);
  const hijack = useMemo(() => ({ acquireWallpaper, releaseWallpaper }), [
    acquireWallpaper,
    releaseWallpaper,
  ]);

  // The stored setting, serialized, so the effect below keys on its value
  let settingKey = '';
  try {
    settingKey = vfs.initialized
      ? JSON.stringify(vfs.getUserConfigFor(userName, 'wallpaper', null))
      : '';
  } catch {
    settingKey = '';
  }

  useEffect(() => {
    let cancelled = false;
    // A blob URL this effect created for a picture stored in the VFS, to
    // be revoked when it stops being painted
    let ownedUrl = null;
    const apply = async () => {
      let setting = null;
      try {
        setting = vfs.getUserConfigFor(userName, 'wallpaper', null);
      } catch {
        setting = null;
      }
      if (ownedUrl) {
        URL.revokeObjectURL(ownedUrl);
        ownedUrl = null;
      }
      if (!setting || !setting.kind || setting.kind === 'asset') {
        // Bliss default; honor an explicit non-default position
        if (!cancelled)
          setWallpaperOverride(
            setting && setting.kind === 'asset' && setting.position
              ? styleFor(wallpaper, setting.position)
              : null,
          );
        return;
      }
      if (setting.kind === 'color') {
        if (!cancelled)
          setWallpaperOverride({ background: setting.value || '#3A6EA5' });
        return;
      }
      if (setting.kind === 'vfs' && setting.value) {
        try {
          const url = await vfs.readFileUrl(setting.value);
          if (!url) {
            if (!cancelled) setWallpaperOverride(null);
            return;
          }
          const node = vfs.getNode(setting.value);
          if (url.startsWith('blob:') && (!node || url !== node.sourceUrl)) {
            ownedUrl = url;
          }
          if (cancelled) {
            if (ownedUrl) {
              URL.revokeObjectURL(ownedUrl);
              ownedUrl = null;
            }
            return;
          }
          setWallpaperOverride(styleFor(url, setting.position));
        } catch {
          if (!cancelled) setWallpaperOverride(null);
        }
      }
    };
    apply();
    return () => {
      cancelled = true;
      if (ownedUrl) URL.revokeObjectURL(ownedUrl);
    };
    // Re-reads when the setting itself changes (settingKey), not on every
    // filesystem write: a fresh blob URL per write would flash the desktop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, userName, settingKey]);

  return {
    style: transientWallpaper || wallpaperOverride || undefined,
    hijack,
  };
}
