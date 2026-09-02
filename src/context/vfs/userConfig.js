// Per-user settings: JSON inside the real ntuser.dat file at the root of
// each profile, so they are per account, browsable, and persisted with the
// filesystem.
import { getProfileRootFor } from '../vfsConstants';

// Stores that file things by path: maps keyed by a file's path, and lists
// that hold paths outright. `lower` marks a store whose keys are lower-cased.
const PATH_KEYED_CONFIG = [
  { key: 'fileSummaries', lower: false },
  { key: 'mediaTagEdits', lower: true },
];
const PATH_LIST_CONFIG = ['mediaLibrary', 'mediaLibraryDeleted'];

export class UserConfig {
  constructor(fs) {
    this.fs = fs;
    // path -> { modifiedAt, data } so reads don't re-parse per render
    this.cache = new Map();
  }

  pathFor(name) {
    return `${getProfileRootFor(name)}/ntuser.dat`;
  }

  readMap(name) {
    if (!name) return {};
    const node = this.fs.store.get(this.pathFor(name));
    if (!node || node.type !== 'file' || node.content == null) return {};
    const cached = this.cache.get(node.path);
    if (cached && cached.modifiedAt === node.modifiedAt) return cached.data;
    let data = {};
    try {
      data = JSON.parse(node.content) || {};
    } catch {
      data = {};
    }
    this.cache.set(node.path, { modifiedAt: node.modifiedAt, data });
    return data;
  }

  getFor(name, key, def) {
    const data = this.readMap(name);
    return data[key] !== undefined ? data[key] : def;
  }

  setFor(name, key, value) {
    if (!name) return false;
    const path = this.pathFor(name);
    const data = { ...this.readMap(name), [key]: value };
    const json = JSON.stringify(data);
    const node = this.fs.store.get(path);
    if (!node || node.type !== 'file') {
      // The user deleted their hive: recreate it silently
      const created = this.fs.createFile(path, json);
      if (created) this.fs.setNode({ ...created, hidden: true });
    } else {
      this.fs.writeFile(node.path, json);
    }
    // Refresh the cache eagerly so same-tick reads see the write
    const after = this.fs.store.get(path);
    if (after) {
      this.cache.set(after.path, { modifiedAt: after.modifiedAt, data });
    }
    return true;
  }

  /**
   * Rewrite every setting of one account that files things by path, after
   * `oldPath` moved to `newPath`. Desktop icon positions are included only
   * when asked: renaming an account moves the whole profile root behind
   * the desktop's back, but a single file rename is repathed by the desktop
   * itself, and doing it here too would race it.
   */
  repathFor(name, oldPath, newPath, { withDesktopLayout = true } = {}) {
    const fromLc = String(oldPath).toLowerCase();
    const prefixLc = `${fromLc}/`;
    const moved = (entry, to) => {
      const entryLc = String(entry).toLowerCase();
      if (entryLc === fromLc) return to;
      if (entryLc.startsWith(prefixLc)) return to + entry.slice(oldPath.length);
      return null;
    };
    const rekey = (map, to) => {
      let changed = false;
      const next = {};
      for (const [entry, value] of Object.entries(map)) {
        const target = moved(entry, to);
        if (target !== null) changed = true;
        next[target !== null ? target : entry] = value;
      }
      return changed ? next : null;
    };

    for (const { key, lower } of PATH_KEYED_CONFIG) {
      const map = this.getFor(name, key, null);
      if (!map || typeof map !== 'object' || Array.isArray(map)) continue;
      const next = rekey(map, lower ? String(newPath).toLowerCase() : newPath);
      if (next) this.setFor(name, key, next);
    }

    for (const key of PATH_LIST_CONFIG) {
      const list = this.getFor(name, key, null);
      if (!Array.isArray(list)) continue;
      let changed = false;
      const next = list.map(entry => {
        if (typeof entry !== 'string') return entry;
        const target = moved(entry, newPath);
        if (target !== null) changed = true;
        return target !== null ? target : entry;
      });
      if (changed) this.setFor(name, key, next);
    }

    if (!withDesktopLayout) return;

    // The hive holds { positions, autoArrange, alignToGrid }; the paths are
    // the keys of `positions`
    const layout = this.getFor(name, 'desktopLayout', null);
    const positions =
      layout && typeof layout === 'object' && !Array.isArray(layout)
        ? layout.positions
        : null;
    if (positions && typeof positions === 'object') {
      const next = rekey(positions, newPath);
      if (next)
        this.setFor(name, 'desktopLayout', { ...layout, positions: next });
    }
  }
}
