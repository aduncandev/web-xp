// Window geometry, decided at launch so a resized viewport places windows right.
// Entry fields read here:
//   defaultSize    { width, height }; 0 means auto
//   defaultOffset  { x, y } fixed position; absent means centred
//   centerAs       the box to centre when it differs from defaultSize
//   maximized      true/false forces it; absent means "when the screen is too small"
//   layout()       evaluated at launch; its fields win over the static ones

import { screenSize } from '../screen';

const getWinState = () => {
  if (typeof window === 'undefined')
    return { w: 1024, h: 768, isMobile: false };
  const { width, height } = screenSize();
  return { w: width, h: height, isMobile: width < 800 };
};

export const getCenter = (appW, appH) => {
  const { w, h } = getWinState();
  const targetW = appW || 300;
  const targetH = appH || 300;
  return {
    x: Math.max(0, Math.round(w / 2 - targetW / 2)),
    y: Math.max(0, Math.round(h / 2 - targetH / 2)),
  };
};

export const shouldMaximize = (appW, appH, isResizable) => {
  const { w, h, isMobile } = getWinState();
  if (isResizable) return isMobile;
  return w < appW || h < appH;
};

/**
 * The registry entry with its geometry filled in for a window opened right
 * now. `overrides` ({ size, offset }) come from callers that place windows
 * themselves, like the Dog Virus scattering its children.
 */
export function resolveLaunchLayout(entry, overrides = {}) {
  const dynamic =
    (typeof entry.layout === 'function' ? entry.layout() : null) || {};
  const defaultSize = overrides.size ||
    dynamic.defaultSize ||
    entry.defaultSize || { width: 300, height: 300 };
  const centerAs = dynamic.centerAs || entry.centerAs || defaultSize;
  const defaultOffset =
    overrides.offset ||
    dynamic.defaultOffset ||
    entry.defaultOffset ||
    getCenter(centerAs.width, centerAs.height);
  const forced = 'maximized' in dynamic ? dynamic.maximized : entry.maximized;
  const maximized =
    typeof forced === 'boolean'
      ? forced
      : shouldMaximize(defaultSize.width, defaultSize.height, entry.resizable);
  return { ...entry, defaultSize, defaultOffset, maximized };
}
