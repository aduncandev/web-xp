import { createContext, useContext } from 'react';

// A per-session, ref-counted wallpaper hijack: a program can temporarily paint
// over ITS OWN desktop (not other users' sessions) without disturbing the
// saved wallpaper, and the real one returns once the last holder releases.
// Provided by each WinXP session; consumed by e.g. the Dog Virus.
export const WallpaperHijackContext = createContext({
  acquireWallpaper: () => {},
  releaseWallpaper: () => {},
});

export const useWallpaperHijack = () => useContext(WallpaperHijackContext);
