// The filesystem's operations, on a NodeStore, with no React in them. The
// provider in VFSContext wraps one of these, hands out its `api`, and
// re-renders consumers when `notify` fires.
import {
  normalizePath,
  getParentPath,
  getBaseName,
  getExtension,
  joinPath,
  isDescendantOf,
  guessMimeType,
  validateFileName,
  makeVfsNode,
} from '../vfsUtils';
import {
  getProfileRootFor,
  isProtectedShellFolder,
  SPECIAL_FOLDERS,
} from '../vfsConstants';
import { resolveNodeIcons, finishIcons } from '../vfsIcons';
import { buildUserProfile } from '../vfsDefaults';
import { openRemoteFile } from '../remoteFile';
import { getCurrentUserName } from '../users';
import { hiddenExtension } from '../../WinXP/shell/fileTypes';
import { UserConfig } from './userConfig';
import { newBlobId } from './persistence';

/** A folder or a drive: anything that can hold children. */
const isContainer = node => node.type === 'folder' || node.type === 'drive';

// What consumers get, in this order. The CI names are the same functions
// as their plain counterparts, kept for callers written when they were not.
const API = [
  'getNode',
  'exists',
  'listDir',
  'readFile',
  'readBinaryFile',
  'openBinaryFile',
  'readFileUrl',
  'createFile',
  'createRemoteFile',
  'createFolder',
  'createShortcut',
  'createShortcutTo',
  'updateShortcut',
  'writeFile',
  'writeBinaryFile',
  'rename',
  'move',
  'copy',
  'uniqueNameIn',
  'isProtectedPath',
  'setNodeAttributes',
  'deleteNode',
  'deleteNodePermanently',
  'getRecycleBinContents',
  'restoreFromRecycleBin',
  'emptyRecycleBin',
  'getUserConfig',
  'setUserConfig',
  'getUserConfigFor',
  'setUserConfigFor',
  'getDirSize',
  'createUserProfile',
  'renameUserProfile',
  'deleteUserProfile',
];

export class FileSystem {
  /**
   * @param store        NodeStore
   * @param persistence  Persistence (dirty tracking and blobs)
   * @param notify       called after every change consumers should see
   */
  constructor({ store, persistence, notify }) {
    this.store = store;
    this.persistence = persistence;
    this.notify = notify;
    this.config = new UserConfig(this);
    this.api = Object.fromEntries(API.map(k => [k, this[k].bind(this)]));
    this.api.existsCI = this.api.exists;
    this.api.findNodeCI = this.api.getNode;
  }

  // --- Reads ---

  /** The node at a path, or null. Lookups are case-insensitive, like Windows. */
  getNode(path) {
    return this.store.get(path);
  }

  exists(path) {
    return this.store.get(path) !== null;
  }

  /** True if the node at `path`, or any descendant, is a system item. */
  hasSystemNodes(path) {
    const node = this.store.get(path);
    if (!node) return false;
    if (node.system) return true;
    if (!isContainer(node)) return false;
    return this.store.descendantsOf(node.path).some(child => child.system);
  }

  /** Direct children: folders first, then alphabetical. */
  listDir(path) {
    const children = this.store.childrenOf(path);
    children.sort((a, b) => {
      const aIsDir = isContainer(a) ? 0 : 1;
      const bIsDir = isContainer(b) ? 0 : 1;
      if (aIsDir !== bIsDir) return aIsDir - bIsDir;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return children;
  }

  readFile(path) {
    const node = this.store.get(path);
    if (!node || node.type !== 'file') return null;
    return node.content;
  }

  async readBinaryFile(path) {
    const node = this.store.get(path);
    const { pendingBlobs } = this.persistence;
    // A blob still in flight to (or unstorable in) IndexedDB
    if (node?.blobId && pendingBlobs.has(node.blobId))
      return pendingBlobs.get(node.blobId);
    try {
      // Blobs are keyed by stable blobId (survives moves/renames); legacy
      // entries were keyed by path
      const stored = await this.persistence.loadBlob(
        node?.blobId || (node ? node.path : normalizePath(String(path))),
      );
      if (stored) return stored;
    } catch {
      // fall through to the asset copy, if there is one
    }
    // Files that came with the image live as static assets
    if (node && node.sourceUrl) {
      try {
        const res = await fetch(node.sourceUrl);
        return res.ok ? await res.blob() : null;
      } catch {
        return null;
      }
    }
    // A file written as text has no blob, but it still has contents
    if (node && node.content != null)
      return new Blob([node.content], { type: node.mimeType || 'text/plain' });
    return null;
  }

  /**
   * Open a file for reading without committing to downloading all of it: a
   * Blob for stored content, or a Blob-alike over the asset URL that fetches
   * only the ranges asked for (cheap tag reads over large media).
   */
  async openBinaryFile(path) {
    const node = this.store.get(path);
    if (node && node.sourceUrl && !node.hasBinaryContent)
      return openRemoteFile(node.sourceUrl, node.mimeType);
    return this.readBinaryFile(path);
  }

  /** A URL for <img>/<audio>/<video>/iframe: the asset URL, an object URL, or a data URL for text. */
  async readFileUrl(path) {
    const node = this.store.get(path);
    if (!node || node.type !== 'file') return null;
    if (node.sourceUrl) return node.sourceUrl;
    if (node.hasBinaryContent) {
      const blob = await this.readBinaryFile(node.path);
      return blob ? URL.createObjectURL(blob) : null;
    }
    if (node.content != null) {
      const blob = new Blob([node.content], {
        type: node.mimeType || 'text/plain',
      });
      return URL.createObjectURL(blob);
    }
    return null;
  }

  // --- Per-user configuration (the profile's ntuser.dat) ---

  getUserConfigFor(name, key, def) {
    return this.config.getFor(name, key, def);
  }

  setUserConfigFor(name, key, value) {
    return this.config.setFor(name, key, value);
  }

  getUserConfig(key, def) {
    return this.config.getFor(getCurrentUserName(), key, def);
  }

  setUserConfig(key, value) {
    return this.config.setFor(getCurrentUserName(), key, value);
  }

  // --- Protected system folders ---
  // Moving, renaming or deleting Windows' own folders (WINDOWS, Program
  // Files, profile roots and the shell folders in SHELL_FOLDERS) breaks the
  // machine, so those operations are refused with 'protected' unless Folder
  // Options' "Allow changes to protected operating system folders" is on.
  // The table covers profiles created before these folders carried system
  // flags.

  isProtectedSystemNode(node) {
    if (!node) return false;
    if (node.system) return true;
    // A profile root
    const p = String(node.path || '').toLowerCase();
    if (/^c:\/documents and settings\/[^/]+$/.test(p)) return true;
    return isProtectedShellFolder(node);
  }

  systemChangesAllowed() {
    try {
      const cfg = this.getUserConfig('explorerView', null) || {};
      return !!cfg.allowSystemChanges;
    } catch {
      return false;
    }
  }

  /** A protected node the current settings refuse to touch. Surfaces use this for their error dialogs. */
  isProtectedPath(path) {
    return (
      this.isProtectedSystemNode(this.store.get(path)) &&
      !this.systemChangesAllowed()
    );
  }

  guard(node) {
    return this.isProtectedSystemNode(node) && !this.systemChangesAllowed();
  }

  // --- Writes ---

  setNode(node) {
    this.store.set(node);
    this.persistence.markDirty(node.path);
    this.notify();
  }

  makeNode(path, type) {
    return makeVfsNode(normalizePath(path), type, { at: Date.now() });
  }

  /**
   * The first name `nameFor(n)` (n = 1, 2, 3...) not already taken in `dir`,
   * any case: "New Folder (2)", "Copy of x", "x (1).txt".
   */
  uniqueNameIn(dir, nameFor) {
    let n = 1;
    let name = nameFor(n);
    while (this.store.get(joinPath(dir, name))) {
      n += 1;
      name = nameFor(n);
    }
    return name;
  }

  createFile(path, content = '', mimeType) {
    // Writing over an existing file that differs only by case overwrites
    // it rather than creating a case-variant twin
    const existing = this.store.get(path);
    const overwriting = existing && existing.type === 'file' ? existing : null;
    if (overwriting) this.persistence.dropBlob(overwriting);
    const node = this.makeNode(overwriting ? overwriting.path : path, 'file');
    if (content instanceof Blob) {
      // Binary content goes to the blob store, never into `content`: a Blob
      // stored there reads back as "[object Blob]" once anything coerces it
      node.content = null;
      node.hasBinaryContent = true;
      node.blobId = newBlobId();
      node.mimeType = mimeType || content.type || guessMimeType(node.path);
      node.size = content.size;
      const saved = this.persistence.storeBlob(
        node.blobId,
        content,
        node.mimeType,
      );
      if (saved) saved.catch(err => console.warn('VFS: blob save failed', err));
    } else {
      node.content = content;
      node.mimeType = mimeType || guessMimeType(node.path);
      node.size = content ? new Blob([content]).size : 0;
    }
    if (overwriting) {
      node.createdAt = overwriting.createdAt;
      node.system = overwriting.system;
      node.readOnly = overwriting.readOnly;
      node.hidden = overwriting.hidden;
    }
    this.setNode(finishIcons(node));
    return node;
  }

  /**
   * A server-hosted file: the node lives in the tree (browsable, playable,
   * deletable) but its bytes stay on the server behind `sourceUrl`, so it
   * costs the user none of their storage.
   */
  createRemoteFile(path, sourceUrl, opts = {}) {
    const existing = this.store.get(path);
    if (existing && existing.type !== 'file') return null;
    if (existing) this.persistence.dropBlob(existing);
    const node = this.makeNode(existing ? existing.path : path, 'file');
    node.sourceUrl = sourceUrl;
    node.mimeType = opts.mimeType || guessMimeType(node.path);
    node.size = opts.sizeBytes || 0;
    if (existing) node.createdAt = existing.createdAt;
    this.setNode(finishIcons(node));
    return node;
  }

  createFolder(path) {
    // mkdir over an existing folder (any case) is a no-op, like Windows
    const existing = this.store.get(path);
    if (existing && isContainer(existing)) return existing;
    const node = this.makeNode(path, 'folder');
    this.setNode(finishIcons(node));
    return node;
  }

  createShortcut(path, target, opts = {}) {
    const existing = this.store.get(path);
    const node = this.makeNode(
      existing && existing.type === 'shortcut' ? existing.path : path,
      'shortcut',
    );
    node.target = target;
    node.targetArgs = opts.targetArgs ?? null;
    node.iconKey = opts.iconKey ?? null;
    this.setNode(finishIcons(node));
    return node;
  }

  /**
   * XP "Create Shortcut": places `Shortcut to <name>` in destDirPath,
   * pointing at the target's canonical path and mirroring its icons.
   */
  createShortcutTo(targetPath, destDirPath) {
    const target = this.store.get(targetPath);
    if (!target) return { ok: false, error: 'not-found' };
    const destDir = this.store.get(destDirPath);
    if (!destDir || !isContainer(destDir))
      return { ok: false, error: 'invalid' };
    // Named after the target's shell display name, so a hidden known
    // extension stays out of it ('Shortcut to notes')
    let hideExt = true;
    try {
      const view = this.getUserConfig('explorerView', null) || {};
      hideExt = view.hideExt !== false;
    } catch {
      hideExt = true;
    }
    const hiddenExt = hiddenExtension(target, hideExt);
    const base = `Shortcut to ${
      hiddenExt ? target.name.slice(0, -hiddenExt.length) : target.name
    }`;
    const name = this.uniqueNameIn(destDir.path, n =>
      n === 1 ? base : `${base} (${n})`,
    );
    const node = this.makeNode(joinPath(destDir.path, name), 'shortcut');
    // Shortcutting a shortcut copies its target rather than chaining, or a
    // link to a shell object (the Recycle Bin) would point at another link
    node.target = target.type === 'shortcut' ? target.target : target.path;
    node.iconKey = target.iconKey ?? null;
    finishIcons(node);
    // Mirror the target's current look even when its icons come from
    // type/extension resolution rather than a registry key
    node.icon = target.icon;
    node.iconLarge = target.iconLarge;
    this.setNode(node);
    return { ok: true, path: node.path };
  }

  /**
   * Edit a shortcut from its Properties > Shortcut tab. `target` repoints
   * the link (re-mirroring the new target's icons unless a custom one was
   * picked); comment / startIn / runMode are the other .lnk fields.
   */
  updateShortcut(path, patch = {}) {
    const node = this.store.get(path);
    if (!node || node.type !== 'shortcut')
      return { ok: false, error: 'not-found' };
    const updated = { ...node };
    if (typeof patch.target === 'string') {
      const target = this.store.get(patch.target);
      if (!target) return { ok: false, error: 'bad-target' };
      updated.target = target.path;
      if (!updated.customIcon) {
        updated.iconKey = target.iconKey ?? null;
        updated.icon = target.icon;
        updated.iconLarge = target.iconLarge;
      }
    }
    if (typeof patch.comment === 'string') updated.comment = patch.comment;
    if (typeof patch.startIn === 'string') updated.startIn = patch.startIn;
    if (typeof patch.runMode === 'string') updated.runMode = patch.runMode;
    if (patch.icon) {
      updated.icon = patch.icon;
      updated.iconLarge = patch.iconLarge || patch.icon;
      updated.iconKey = null;
      updated.customIcon = true;
    }
    updated.modifiedAt = Date.now();
    this.setNode(updated);
    return { ok: true };
  }

  writeFile(path, content) {
    const existing = this.store.get(path);
    if (!existing || existing.type !== 'file') return false;
    // A text write supersedes any previous binary/asset content
    this.persistence.dropBlob(existing);
    this.setNode({
      ...existing,
      content,
      hasBinaryContent: false,
      blobId: null,
      sourceUrl: null,
      mimeType: guessMimeType(existing.path),
      size: content ? new Blob([content]).size : 0,
      modifiedAt: Date.now(),
    });
    return true;
  }

  async writeBinaryFile(path, blob, mimeType) {
    const existing = this.store.get(path);
    if (!existing) return false;
    const updated = {
      ...existing,
      content: null,
      hasBinaryContent: true,
      blobId: existing.blobId || newBlobId(),
      sourceUrl: null,
      mimeType: mimeType || blob.type || 'application/octet-stream',
      size: blob.size,
      modifiedAt: Date.now(),
    };
    this.setNode(updated);
    const saved = this.persistence.storeBlob(
      updated.blobId,
      blob,
      updated.mimeType,
    );
    if (!saved) return true;
    try {
      await saved;
      this.persistence.refreshDriveStats();
    } catch (err) {
      // Usually QuotaExceededError. The node was marked binary before the
      // save, so roll it back rather than leave a file claiming bytes that
      // exist nowhere; most callers ignore the false.
      console.warn('VFS: blob save failed, file left unchanged', err);
      this.persistence.pendingBlobs.delete(updated.blobId);
      this.setNode(existing);
      return false;
    }
    return true;
  }

  /** Set the user-visible attributes from the Properties dialog (and the shop's icon/size dressing). */
  setNodeAttributes(path, attrs = {}) {
    const node = this.store.get(path);
    if (!node) return { ok: false, error: 'not-found' };
    if (node.system || node.type === 'drive')
      return { ok: false, error: 'system' };
    const updated = { ...node };
    if (typeof attrs.readOnly === 'boolean') updated.readOnly = attrs.readOnly;
    if (typeof attrs.hidden === 'boolean') updated.hidden = attrs.hidden;
    if (typeof attrs.iconKey === 'string') {
      updated.iconKey = attrs.iconKey;
      const icons = resolveNodeIcons(updated);
      updated.icon = icons.icon;
      updated.iconLarge = icons.iconLarge;
    }
    // A direct icon URL (must be a STABLE url: public/, not a hashed bundle
    // asset); customIcon makes it survive load-time re-resolution
    if (typeof attrs.icon === 'string') {
      updated.icon = attrs.icon;
      updated.iconLarge = attrs.iconLarge || attrs.icon;
      updated.iconKey = null;
      updated.customIcon = true;
    }
    if (Number.isFinite(attrs.size)) updated.size = attrs.size;
    this.setNode(updated);
    return { ok: true };
  }

  // --- Moving things around ---

  /**
   * Move every descendant of `fromPath` (a node's own spelling) under
   * `toPath`. `decorate(oldKey)` adds fields to each moved node: the bin
   * records where every piece came from, and restoring clears that again.
   */
  relocateDescendants(fromPath, toPath, decorate) {
    const moving = this.store.descendantsOf(fromPath);
    for (const child of moving) {
      const key = child.path;
      this.store.delete(key);
      this.persistence.markDeleted(key);
      const newKey = toPath + key.slice(fromPath.length);
      this.store.set({
        ...child,
        path: newKey,
        name: getBaseName(newKey),
        ...(decorate ? decorate(key) : null),
      });
      this.persistence.markDirty(newKey);
    }
    return moving.length;
  }

  relocate(oldPath, newPath, extraPatch = {}) {
    const node = this.store.get(oldPath);
    if (!node) return;
    const from = node.path;
    this.store.delete(from);
    this.persistence.markDeleted(from);
    this.store.set({
      ...node,
      path: newPath,
      name: getBaseName(newPath),
      modifiedAt: Date.now(),
      ...extraPatch,
    });
    this.persistence.markDirty(newPath);
    if (isContainer(node)) this.relocateDescendants(from, newPath);
    // Settings filed under the old path have to follow it there
    this.config.repathFor(getCurrentUserName(), from, newPath, {
      withDesktopLayout: false,
    });
  }

  /** Returns { ok: true } or { ok: false, error: 'not-found'|'protected'|'invalid'|'exists' }. */
  rename(oldPath, newName) {
    const node = this.store.get(oldPath);
    if (!node) return { ok: false, error: 'not-found' };
    if (this.guard(node)) return { ok: false, error: 'protected' };
    if (validateFileName(newName)) return { ok: false, error: 'invalid' };

    const op = node.path;
    const parent = getParentPath(op);
    if (!parent) return { ok: false, error: 'not-found' };
    const np = joinPath(parent, newName);
    if (np === op) return { ok: true };
    // A case-only rename of the SAME node is allowed; colliding with any
    // different node, even one differing only by case, is not
    const collision = this.store.get(np);
    if (collision && collision.path !== op)
      return { ok: false, error: 'exists' };

    this.relocate(op, np);
    this.notify();
    return { ok: true };
  }

  deleteNodePermanently(path) {
    const node = this.store.get(path);
    if (!node) return false;
    if (this.guard(node)) return false;
    const doomed = isContainer(node)
      ? [node, ...this.store.descendantsOf(node.path)]
      : [node];
    for (const n of doomed) {
      this.store.delete(n.path);
      this.persistence.markDeleted(n.path);
      this.persistence.dropBlob(n);
    }
    this.notify();
    return true;
  }

  /**
   * Move a node into a destination directory. Returns { ok: true, newPath }
   * or { ok: false, error: 'not-found'|'protected'|'same'|'cycle'|'exists'|
   * 'system', conflictPath? }. Pass { replace: true } to overwrite an
   * existing item of the same name.
   */
  move(srcPath, destDirPath, opts = {}) {
    const node = this.store.get(srcPath);
    if (!node) return { ok: false, error: 'not-found' };
    if (this.guard(node)) return { ok: false, error: 'protected' };

    const sp = node.path;
    const destNode = this.store.get(destDirPath);
    const dp = destNode ? destNode.path : normalizePath(destDirPath);
    const same = (a, b) => a.toLowerCase() === b.toLowerCase();
    if (same(getParentPath(sp), dp)) return { ok: false, error: 'same' };
    if (same(dp, sp) || isDescendantOf(dp.toLowerCase(), sp.toLowerCase()))
      return { ok: false, error: 'cycle' };

    const newPath = joinPath(dp, node.name);
    const existing = this.store.get(newPath);
    if (existing && existing.path !== sp) {
      if (!opts.replace)
        return { ok: false, error: 'exists', conflictPath: existing.path };
      // Never replace system or read-only items (or folders containing
      // system ones): a replace-move would delete them permanently
      if (this.hasSystemNodes(existing.path) || existing.readOnly)
        return { ok: false, error: 'system', conflictPath: existing.path };
      this.deleteNodePermanently(existing.path);
    }

    this.relocate(sp, newPath);
    this.notify();
    return { ok: true, newPath };
  }

  /**
   * Copy a node into a destination directory, renaming on collision like
   * XP ("Copy of x", "Copy (2) of x"). Returns { ok: true, newPath } or
   * { ok: false, error: 'not-found'|'cycle' }.
   */
  copy(srcPath, destDirPath) {
    const node = this.store.get(srcPath);
    if (!node) return { ok: false, error: 'not-found' };

    const sp = node.path;
    const destNode = this.store.get(destDirPath);
    const dp = destNode ? destNode.path : normalizePath(destDirPath);
    if (
      dp.toLowerCase() === sp.toLowerCase() ||
      isDescendantOf(dp.toLowerCase(), sp.toLowerCase())
    )
      return { ok: false, error: 'cycle' };

    const destName = this.uniqueNameIn(dp, n =>
      n === 1
        ? node.name
        : n === 2
        ? `Copy of ${node.name}`
        : `Copy (${n - 1}) of ${node.name}`,
    );
    const newPath = joinPath(dp, destName);
    const now = Date.now();
    // A copy of a system item is an ordinary item
    const duplicate = (src, path) => {
      const copied = {
        ...src,
        path,
        name: getBaseName(path),
        system: false,
        createdAt: now,
        modifiedAt: now,
      };
      if (copied.hasBinaryContent) {
        copied.blobId = newBlobId();
        this.persistence.duplicateBlob(
          src.blobId || src.path,
          copied.blobId,
          src.mimeType,
        );
      }
      this.store.set(copied);
      this.persistence.markDirty(path);
    };
    duplicate(node, newPath);
    if (isContainer(node)) {
      for (const child of this.store.descendantsOf(sp)) {
        duplicate(child, newPath + child.path.slice(sp.length));
      }
    }
    this.notify();
    return { ok: true, newPath };
  }

  /** Send a node to the Recycle Bin. False when refused (missing, protected, read-only). */
  deleteNode(path) {
    const node = this.store.get(path);
    if (!node) return false;
    if (this.guard(node)) return false;
    // The read-only attribute blocks deletion like the system flag does;
    // clear it in Properties to delete
    if (node.readOnly) return false;

    const p = node.path;
    const recyclerPath = SPECIAL_FOLDERS.RECYCLER;
    const now = Date.now();
    // A name the bin does not already hold: 'notes (1).txt', 'notes (2).txt'
    const ext = getExtension(node.name);
    const stem = ext ? node.name.slice(0, -ext.length) : node.name;
    const destName = this.uniqueNameIn(recyclerPath, n =>
      n === 1 ? node.name : `${stem} (${n - 1})${ext}`,
    );
    const destPath = joinPath(recyclerPath, destName);

    this.store.delete(p);
    this.persistence.markDeleted(p);
    this.store.set({
      ...node,
      path: destPath,
      name: destName,
      originalPath: p,
      deletedAt: now,
    });
    this.persistence.markDirty(destPath);
    // The bin remembers where each piece of the subtree came from
    if (isContainer(node)) {
      this.relocateDescendants(p, destPath, key => ({
        originalPath: key,
        deletedAt: now,
      }));
    }
    this.notify();
    return true;
  }

  // --- Recycle Bin ---

  /** Only what the shell itself deleted; a node written straight into C:/RECYCLER is not a bin item. */
  getRecycleBinContents() {
    return this.listDir(SPECIAL_FOLDERS.RECYCLER).filter(
      node => node.originalPath !== null,
    );
  }

  /**
   * Ensure every ancestor folder of `path` exists (used on restore),
   * creating missing ones and canonicalizing case against existing nodes.
   * Returns the canonical path of the immediate parent, or null when the
   * chain is blocked by a file.
   */
  ensureAncestors(path) {
    const chain = [];
    let parent = getParentPath(normalizePath(path));
    while (parent) {
      chain.push(parent);
      const up = getParentPath(parent);
      if (up === parent) break; // drive roots are their own parent
      parent = up;
    }
    chain.reverse(); // topmost (drive) first

    let canonical = null;
    for (const level of chain) {
      const levelPath = canonical
        ? joinPath(canonical, getBaseName(level))
        : level;
      const existingNode = this.store.get(levelPath);
      if (existingNode) {
        if (!isContainer(existingNode)) return null;
        canonical = existingNode.path;
      } else {
        this.store.set(finishIcons(this.makeNode(levelPath, 'folder')));
        this.persistence.markDirty(levelPath);
        canonical = levelPath;
      }
    }
    return canonical;
  }

  /**
   * Restore an item to its original location. Returns { ok: true } or
   * { ok: false, error: 'not-found'|'exists'|'blocked'|'system' }; pass
   * { replace: true } to overwrite what now occupies the path. 'blocked'
   * means an ancestor of the original path is now a file.
   */
  restoreFromRecycleBin(path, opts = {}) {
    const node = this.store.get(path);
    if (!node || !node.originalPath) return { ok: false, error: 'not-found' };
    const p = node.path;

    // Ancestors deleted since are recreated (XP does this too)
    const parentPath = this.ensureAncestors(node.originalPath);
    if (!parentPath) return { ok: false, error: 'blocked' };
    const restorePath = joinPath(parentPath, getBaseName(node.originalPath));

    const occupied = this.store.get(restorePath);
    if (occupied && occupied.path !== p) {
      if (!opts.replace)
        return { ok: false, error: 'exists', conflictPath: occupied.path };
      if (this.hasSystemNodes(occupied.path))
        return { ok: false, error: 'system', conflictPath: occupied.path };
      this.deleteNodePermanently(occupied.path);
    }

    this.store.delete(p);
    this.persistence.markDeleted(p);
    this.store.set({
      ...node,
      path: restorePath,
      name: getBaseName(restorePath),
      originalPath: null,
      deletedAt: null,
    });
    this.persistence.markDirty(restorePath);
    // Out of the bin, so the descendants stop being recycled items
    if (isContainer(node)) {
      this.relocateDescendants(p, restorePath, () => ({
        originalPath: null,
        deletedAt: null,
      }));
    }
    this.notify();
    return { ok: true };
  }

  emptyRecycleBin() {
    for (const node of this.store.descendantsOf(SPECIAL_FOLDERS.RECYCLER)) {
      this.store.delete(node.path);
      this.persistence.markDeleted(node.path);
      this.persistence.dropBlob(node);
    }
    this.notify();
  }

  getDirSize(path) {
    let total = 0;
    for (const node of this.store.descendantsOf(path)) {
      if (node.type === 'file') total += node.size || 0;
    }
    return total;
  }

  // --- Accounts ---

  /**
   * Seed a profile tree (Desktop, My Documents, Start Menu, Favorites) for
   * an account. Existing nodes are left alone, so re-running for an old
   * profile only fills in what a later seed added; a seeded item sitting in
   * the Recycle Bin still counts as occupying its old path, or it would
   * come back on every logon.
   */
  createUserProfile(name) {
    if (!name || !String(name).trim()) return { ok: false, error: 'invalid' };
    const profile = buildUserProfile(String(name).trim());
    const recycledFrom = new Set();
    for (const node of this.store.values()) {
      if (node.originalPath)
        recycledFrom.add(normalizePath(node.originalPath).toLowerCase());
    }
    let added = 0;
    for (const node of profile) {
      if (this.store.get(node.path)) continue;
      if (recycledFrom.has(normalizePath(node.path).toLowerCase())) continue;
      this.store.set(node);
      this.persistence.markDirty(node.path);
      added += 1;
    }
    if (added > 0) this.notify();
    return { ok: true, added };
  }

  // Both account operations bypass the protection check on purpose: a
  // profile root is protected so nobody drags their own folder into the
  // bin, but renaming and deleting an account are the sanctioned ways for
  // it to move or go.

  /**
   * Moves an account's profile tree when the account is renamed. False when
   * there is nothing to move (an account that never logged in has no
   * profile yet; one is built under the new name on first login).
   */
  renameUserProfile(oldName, newName) {
    const oldRoot = getProfileRootFor(oldName);
    const newRoot = getProfileRootFor(newName);
    if (oldRoot === newRoot) return true;
    const node = this.store.get(oldRoot);
    if (!node) return false;
    // A case-only rename finds the same profile under the new spelling
    const occupied = this.store.get(newRoot);
    if (occupied && occupied.path !== node.path) return false;

    this.relocate(node.path, newRoot);
    // After the move, so it reads the hive at its new home
    this.config.repathFor(newName, node.path, newRoot);
    this.notify();
    return true;
  }

  /** Removes an account's profile tree and everything in it. */
  deleteUserProfile(name) {
    const node = this.store.get(getProfileRootFor(name));
    if (!node) return false;
    for (const n of [node, ...this.store.descendantsOf(node.path)]) {
      this.store.delete(n.path);
      this.persistence.markDeleted(n.path);
      this.persistence.dropBlob(n);
    }
    this.notify();
    return true;
  }
}
