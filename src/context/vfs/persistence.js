// What survives a reload: node records and blobs in IndexedDB, written a
// few hundred milliseconds after they change. With no database (private
// mode, a blocked origin) everything lives in memory for the session.
import {
  saveManyMeta,
  deleteManyMeta,
  loadBlob,
  saveBlob,
  deleteBlob,
} from '../vfsStorage';

const PERSIST_DELAY_MS = 300;

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export const newBlobId = () =>
  `bin_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;

export class Persistence {
  constructor(store, notify) {
    this.store = store;
    this.notify = notify;
    // The IndexedDB handle; null in memory-only mode
    this.db = null;
    // Blobs handed to createFile/writeBinaryFile that IndexedDB hasn't
    // finished (or can't finish) persisting. readBinaryFile serves these
    // first, so a file is readable the moment it is written.
    this.pendingBlobs = new Map();
    this.dirty = new Set();
    this.deleted = new Set();
    this.schedule = debounce(() => this.persistDirty(), PERSIST_DELAY_MS);
  }

  get hasPendingWrites() {
    return this.dirty.size > 0 || this.deleted.size > 0;
  }

  markDirty(path) {
    this.dirty.add(path);
    this.deleted.delete(path);
    this.schedule();
  }

  markDeleted(path) {
    this.deleted.add(path);
    this.dirty.delete(path);
    this.schedule();
  }

  async persistDirty() {
    const { db } = this;
    if (!db) return;

    const toSave = [];
    for (const p of this.dirty) {
      const node = this.store.get(p);
      if (node) toSave.push(node);
    }
    const toDelete = [...this.deleted];
    const claimed = [...this.dirty];
    // Cleared before the write so mutations arriving during it are kept
    this.dirty.clear();
    this.deleted.clear();

    try {
      if (toSave.length > 0) await saveManyMeta(db, toSave);
      if (toDelete.length > 0) await deleteManyMeta(db, toDelete);
    } catch (err) {
      // Quota exhausted, private-mode eviction: put the work back so the
      // next persist, including the one on unload, tries again
      for (const p of claimed) this.dirty.add(p);
      for (const p of toDelete) this.deleted.add(p);
      console.warn('VFS: IDB persist failed, changes re-queued', err);
    }
    this.refreshDriveStats();
  }

  /** Write now rather than after the delay (tab hidden, page closing). */
  flush() {
    if (this.hasPendingWrites) this.persistDirty();
  }

  /**
   * Keep a blob, in memory at once and in the database when there is one.
   * Returns the save promise, or null in memory-only mode.
   */
  storeBlob(blobId, blob, mimeType) {
    this.pendingBlobs.set(blobId, blob);
    if (!this.db) return null;
    return saveBlob(this.db, blobId, blob, mimeType).then(() => {
      this.pendingBlobs.delete(blobId);
    });
  }

  async loadBlob(key) {
    if (!this.db) return null;
    return loadBlob(this.db, key);
  }

  /** Forget a file's bytes: the stored blob and any copy still waiting to be stored. */
  dropBlob(node) {
    if (!node) return;
    if (node.blobId) this.pendingBlobs.delete(node.blobId);
    if ((node.hasBinaryContent || node.blobId) && this.db) {
      deleteBlob(this.db, node.blobId || node.path).catch(() => {});
    }
  }

  /** Duplicate stored binary content under a new blob id, in the background. */
  duplicateBlob(srcId, destId, mimeType) {
    const { db } = this;
    if (!db || !srcId) return;
    loadBlob(db, srcId)
      .then(blob => {
        if (blob) return saveBlob(db, destId, blob, mimeType);
      })
      .catch(() => {});
  }

  // C:'s capacity mirrors the browser's storage quota for this origin, so
  // My Computer and drive Properties tell the truth. Rewrites only on >1 MB
  // movement; the record rides along with the next persist.
  async refreshDriveStats() {
    try {
      if (!(navigator.storage && navigator.storage.estimate)) return;
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      if (!quota) return;
      const c = this.store.get('C:/');
      if (!c) return;
      const free = Math.max(0, quota - usage);
      const MB = 1024 * 1024;
      if (
        Math.abs((c.totalSpace || 0) - quota) < MB &&
        Math.abs((c.freeSpace || 0) - free) < MB
      ) {
        return;
      }
      this.store.set({ ...c, totalSpace: quota, freeSpace: free });
      this.dirty.add(c.path);
      this.notify();
    } catch {
      // estimate unavailable, the seeded numbers stand
    }
  }
}
