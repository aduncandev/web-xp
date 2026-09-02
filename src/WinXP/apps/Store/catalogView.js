// The catalog as this user sees it: what is installed, what is owned and
// therefore free again, and how a title's price reads on a row.
import {
  CATALOG,
  isInstalled,
  priceOf,
  mediaFilePaths,
  mediaPackDir,
} from './catalog';

export function liveCatalog(vfs, userName, ownedIds) {
  return CATALOG.map(a => ({
    ...a,
    installed: isInstalled(vfs, a, userName),
    // once a title is purchased it stays free to re-download
    owned: ownedIds.includes(a.id),
    price: ownedIds.includes(a.id) ? 0 : priceOf(a),
  }));
}

export function priceLabel(app) {
  if (app.installed) return 'Downloaded';
  if (app.owned) return 'Owned';
  return app.price === 0 ? 'Free' : `${app.price} XP Points`;
}

/** What the title page's button does once a title is installed. */
export function launchVerb(app) {
  if (app.kind !== 'media') return 'Start';
  return app.dest === 'music' ? 'Play' : 'Open';
}

/** The path that button opens: music plays its first track, other packs open their folder. */
export function launchTarget(app, userName) {
  if (app.kind !== 'media') return app.exePath;
  return app.dest === 'music'
    ? mediaFilePaths(app, userName)[0]
    : mediaPackDir(app, userName);
}
