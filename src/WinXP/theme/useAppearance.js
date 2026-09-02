// The user's Appearance setting (Windows and buttons, colour scheme, font
// size) from the profile hive; vfs re-renders on writes, so reading during
// render stays fresh.
import { useMemo } from 'react';

import { DEFAULT_APPEARANCE } from './tokens';

export const APPEARANCE_KEY = 'appearance';

export function readAppearance(vfs, userName) {
  try {
    const v = vfs.getUserConfigFor(userName, APPEARANCE_KEY, null);
    return v && typeof v === 'object'
      ? { ...DEFAULT_APPEARANCE, ...v }
      : { ...DEFAULT_APPEARANCE };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function useAppearance(vfs, userName) {
  const key = vfs.initialized
    ? JSON.stringify(readAppearance(vfs, userName))
    : '';
  return useMemo(() => (key ? JSON.parse(key) : { ...DEFAULT_APPEARANCE }), [
    key,
  ]);
}
