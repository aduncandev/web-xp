// The node table behind the VFS. Paths are case-insensitive but case-preserving,
// like NTFS: nodes keep their own spelling and a lower-cased index answers lookups.
// A second index groups children by parent, so listings need no scan.
import { getParentPath, normalizePath } from '../vfsUtils';

/** Lower-cased parent key, or null for drive roots and shell specials. */
function lowerParentOf(lowerPath) {
  if (/^[a-z]:\/$/.test(lowerPath)) return null;
  return getParentPath(lowerPath);
}

export class NodeStore {
  constructor() {
    this.byPath = new Map();
    this.byLower = new Map();
    this.children = new Map();
  }

  get size() {
    return this.byPath.size;
  }

  /** The node at `path`, any case, or null. */
  get(path) {
    if (!path) return null;
    const p = normalizePath(String(path));
    return this.byPath.get(p) || this.byLower.get(p.toLowerCase()) || null;
  }

  has(path) {
    return this.get(path) !== null;
  }

  /**
   * Add or replace a node, keyed by its own `path`. A node already stored
   * under a case variant of that path is the same file to this filesystem
   * and is replaced.
   */
  set(node) {
    const { path } = node;
    const lower = path.toLowerCase();
    const twin = this.byLower.get(lower);
    if (twin && twin.path !== path) this.delete(twin.path);
    this.byPath.set(path, node);
    this.byLower.set(lower, node);
    const parent = lowerParentOf(lower);
    if (parent !== null) {
      let set = this.children.get(parent);
      if (!set) {
        set = new Set();
        this.children.set(parent, set);
      }
      set.add(path);
    }
  }

  /** Remove the node at `path`, any case. True when something was removed. */
  delete(path) {
    const node = this.get(path);
    if (!node) return false;
    const lower = node.path.toLowerCase();
    this.byPath.delete(node.path);
    this.byLower.delete(lower);
    const parent = lowerParentOf(lower);
    const siblings = parent !== null ? this.children.get(parent) : null;
    if (siblings) {
      siblings.delete(node.path);
      if (siblings.size === 0) this.children.delete(parent);
    }
    return true;
  }

  clear() {
    this.byPath.clear();
    this.byLower.clear();
    this.children.clear();
  }

  values() {
    return this.byPath.values();
  }

  /** Iterates [path, node] pairs, like the Map this replaced. */
  [Symbol.iterator]() {
    return this.byPath.entries();
  }

  /** Direct children of a folder, any case, in no particular order. */
  childrenOf(path) {
    const set = this.children.get(normalizePath(String(path)).toLowerCase());
    if (!set) return [];
    return [...set].map(p => this.byPath.get(p));
  }

  /**
   * Everything under a folder at any depth, parents before their children.
   * Collected before returning, so the caller may move or delete nodes
   * while walking the result.
   */
  descendantsOf(path) {
    const out = [];
    const stack = [normalizePath(String(path)).toLowerCase()];
    while (stack.length) {
      const set = this.children.get(stack.pop());
      if (!set) continue;
      for (const childPath of set) {
        out.push(this.byPath.get(childPath));
        stack.push(childPath.toLowerCase());
      }
    }
    return out;
  }
}
