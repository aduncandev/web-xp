import { getTypeLabel } from './menus';

const dirRank = n => (n.type === 'folder' || n.type === 'drive' ? 0 : 1);
const ratio = n => (n.size ? 1 - (n.packedSize || 0) / n.size : 0);

// One comparator per sortable column; name is the tiebreak for all of them
const COMPARE = {
  size: (a, b) => (a.size || 0) - (b.size || 0),
  type: (a, b) => getTypeLabel(a).localeCompare(getTypeLabel(b)),
  modified: (a, b) => (a.modifiedAt || 0) - (b.modifiedAt || 0),
  location: (a, b) =>
    (a.originalPath || '').localeCompare(b.originalPath || ''),
  packed: (a, b) => (a.packedSize || 0) - (b.packedSize || 0),
  password: (a, b) => (a.encrypted ? 1 : 0) - (b.encrypted ? 1 : 0),
  ratio: (a, b) => ratio(a) - ratio(b),
  deleted: (a, b) => (a.deletedAt || 0) - (b.deletedAt || 0),
};

/**
 * Folders first, then by the chosen column, then by name. `asc` false flips
 * the whole order, tiebreak included, the way the shell does.
 */
export function sortItems(list, sortBy, asc) {
  const by = COMPARE[sortBy];
  return [...list].sort((a, b) => {
    if (dirRank(a) !== dirRank(b)) return dirRank(a) - dirRank(b);
    let r = by ? by(a, b) : 0;
    if (r === 0)
      r = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    return asc ? r : -r;
  });
}
