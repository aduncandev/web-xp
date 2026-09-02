// Bringing the filesystem up: open the database, keep a current store (with
// its migrations), or wipe and reseed an outdated one, holding the boot on
// the Windows Error Recovery screen first when that would erase the user's
// own files. Falls back to a memory-only seed when IndexedDB is unusable.
import {
  openVFSDatabase,
  loadAllMeta,
  saveManyMeta,
  saveBlob,
  loadBlob,
  clearAllStores,
} from '../vfsStorage';
import { buildDefaultFileSystem, buildMachineFileSystem } from '../vfsDefaults';
import { resolveNodeIcons } from '../vfsIcons';
import { listUsers } from '../users';
import { getBaseName } from '../vfsUtils';
import { EXE_PATHS } from '../vfsConstants';
import { buildBackupZip, isUserFile, storedNodeBytes } from '../vfsBackup';
import { newBlobId } from './persistence';

// Bump when the seeded filesystem layout changes incompatibly (shortcut
// target format, system tree, per-user profiles): mismatched stores are
// wiped and reseeded. The authoritative marker lives INSIDE IndexedDB as a
// sentinel meta record; localStorage only keeps a secondary copy.
// 2: added guestbook.exe under Program Files/aduncan.dev. Machine-wide nodes
// only appear on a fresh seed, so an existing disk had the Start menu
// shortcut (profiles rebuild per user) pointing at an exe that was never
// created, which the shell reports as a broken shortcut.
// 3: privacy.txt under system32. Machine-wide nodes only appear on a fresh
// seed, so without this an existing disk never gets the file.
// 4: privacy.txt moved from system32 to My Documents, beside readme.txt,
// and its wording corrected. Both the location and the contents are baked
// in at seed time, so an existing disk keeps the old copy without this.
// 5: Program Files/aduncan.dev renamed to Program Files/webxp.net (site
// rebrand). tour.exe and guestbook.exe live there, and every seeded
// shortcut carries the old absolute target, so an existing disk would
// keep launching into a folder the code no longer knows about.
// 6: tour.exe, tourstart.exe and their shortcuts unseeded (the tour is
// shelved for a rework; the app code stays). An existing disk keeps the
// exes and shortcuts without this.
export const VFS_SCHEMA_VERSION = '6';

// System exes that moved (the joke programs relocated to D:). Persisted
// shortcuts still point at the old paths; repoint them so e.g. the desktop
// '???' keeps opening after the move.
const MIGRATED_TARGETS = new Map([
  ['c:/windows/system32/room_man.exe', EXE_PATHS.MISSINGNO],
  ['c:/windows/system32/dogwindow.exe', EXE_PATHS.DOGWINDOW],
]);

// System nodes that have since been renamed away. Without this the
// additive seeding pass adds the new name and leaves the old one orphaned
// in system32 forever.
const RETIRED_SYSTEM_PATHS = [
  'c:/windows/system32/missingno.exe',
  // was seeded before the legacy player became a Store title; a
  // Store-installed copy is system: false and survives this pass
  'c:/program files/windows media player/mplayer2.exe',
  // the joke programs moved to the D: "CD" (see MIGRATED_TARGETS)
  'c:/windows/system32/room_man.exe',
  'c:/windows/system32/dogwindow.exe',
];
const SCHEMA_KEY = 'winxp_vfs_schema';
const SCHEMA_SENTINEL = '::schema';

// The one-off repairs a current store may still need, by name. The sentinel
// records which have run, so each can be retired once every store that
// needed it has been through. Runs are idempotent regardless.
const MIGRATIONS = {
  // shortcuts to the joke programs before they moved to D:
  'shortcut-targets-1': (node, { persistence }) => {
    if (node.type === 'shortcut' && node.target) {
      const moved = MIGRATED_TARGETS.get(node.target.toLowerCase());
      if (moved) {
        node.target = moved;
        persistence.markDirty(node.path);
      }
    }
  },
  // files written before createFile knew about Blobs kept the Blob in
  // `content`, which reads back as "[object Blob]"
  'blob-in-content': (node, { db, persistence }) => {
    if (node.type === 'file' && node.content instanceof Blob) {
      const blob = node.content;
      node.content = null;
      node.hasBinaryContent = true;
      node.blobId = node.blobId || newBlobId();
      node.mimeType = node.mimeType || blob.type || null;
      node.size = blob.size;
      persistence.pendingBlobs.set(node.blobId, blob);
      saveBlob(db, node.blobId, blob, node.mimeType)
        .then(() => persistence.pendingBlobs.delete(node.blobId))
        .catch(() => {});
    }
  },
  // nodes persisted before iconKey existed adopt the default tree's key
  'icon-keys': (node, { def }) => {
    if (!node.iconKey && def?.iconKey) node.iconKey = def.iconKey;
  },
  // a seeded binary the seeder has since made a system file (the Store,
  // the guest book, the virus) becomes one on disk too, so a deleted copy
  // comes back through the additive pass
  'system-programs-1': (node, { def }) => {
    if (def?.system && !node.system && node.type === 'file' && !node.content)
      node.system = true;
  },
};

/** Names of registered accounts, in registration order. */
export function registeredUserNames() {
  return listUsers().map(u => u.name);
}

/** Default filesystem for this machine: profiles for every account, or the
 *  machine tree alone before OOBE has created any. */
export function buildSeedNodes() {
  const names = registeredUserNames();
  return names.length > 0
    ? buildDefaultFileSystem(names)
    : buildMachineFileSystem();
}

/** Bring a current store up to date and load it into `store`. */
async function loadCurrentStore({ db, store, persistence, stored, marker }) {
  const defaultsByPath = new Map(
    buildDefaultFileSystem(registeredUserNames()).map(n => [n.path, n]),
  );
  // Retired system nodes come out first, so the additive pass below cannot
  // count them as present. Recorded like the other migrations, but always
  // run: a retired node re-added by an old build would otherwise stay.
  const retired = n =>
    n.system && RETIRED_SYSTEM_PATHS.includes(n.path.toLowerCase());
  for (const n of stored) if (retired(n)) persistence.markDeleted(n.path);
  const kept = stored.filter(n => !retired(n));

  const applied = new Set(
    Array.isArray(marker?.migrations) ? marker.migrations : [],
  );
  const pending = Object.entries(MIGRATIONS).filter(
    ([name]) => !applied.has(name),
  );

  for (const node of kept) {
    const def = defaultsByPath.get(node.path);
    for (const [, run] of pending) run(node, { db, persistence, def });
    // A bundled file still pointing at its seeded asset takes the real
    // byte count (the sizes were once typed in by hand)
    if (
      def &&
      node.sourceUrl &&
      node.sourceUrl === def.sourceUrl &&
      def.size &&
      node.size !== def.size
    ) {
      node.size = def.size;
    }
    // Icon URLs from a previous build are stale (hashed asset paths)
    const icons = resolveNodeIcons(node);
    node.icon = icons.icon;
    node.iconLarge = icons.iconLarge;
    store.set(node);
  }
  // Additive migration: system nodes added to the defaults after this store
  // was seeded (new exes, .cpl applets) are missing from it. The shell never
  // lets system items be deleted, so a missing one is newer than the store.
  const storedLower = new Set(kept.map(n => n.path.toLowerCase()));
  const missingSystem = [];
  for (const def of defaultsByPath.values()) {
    if (def.system && !storedLower.has(def.path.toLowerCase())) {
      store.set(def);
      missingSystem.push(def);
    }
  }
  await saveManyMeta(db, kept);
  if (missingSystem.length > 0) await saveManyMeta(db, missingSystem);
  // The sentinel now also says which migrations this store has been through
  const migrations = [...new Set([...applied, ...Object.keys(MIGRATIONS)])];
  if (!marker || pending.length > 0) {
    await saveManyMeta(db, [
      { path: SCHEMA_SENTINEL, schemaVersion: VFS_SCHEMA_VERSION, migrations },
    ]);
  }
}

/**
 * Whether an outdated store holds anything the user made. The seeder plants
 * ordinary files (readme.txt, privacy.txt, two Favorites) that isUserFile
 * cannot tell from the user's own; a file still at its seeded path with its
 * seeded timestamp is untouched. ntuser.dat is excluded too: the system
 * rewrites it on its own, so its timestamp always differs.
 */
function usersOwnFiles(stored) {
  const untouchedSeed = new Set(
    buildDefaultFileSystem(registeredUserNames())
      .filter(n => n.type === 'file')
      .map(n => `${n.path.toLowerCase()}|${n.modifiedAt}`),
  );
  return stored.filter(
    n =>
      isUserFile(n) &&
      getBaseName(n.path).toLowerCase() !== 'ntuser.dat' &&
      !untouchedSeed.has(`${n.path.toLowerCase()}|${n.modifiedAt}`),
  );
}

/**
 * Load the filesystem into `store`. `requestRecovery({ fileCount,
 * buildBackup, proceed })` shows the Windows Error Recovery screen and
 * resolves once the user has chosen to proceed (it may never resolve: the
 * user can close the page and keep the old store).
 * Resolves to 'indexeddb', or 'memory' when the database is unusable.
 */
export async function bootFileSystem({ store, persistence, requestRecovery }) {
  try {
    const db = await openVFSDatabase();
    persistence.db = db;

    let stored = await loadAllMeta(db);
    const marker = stored.find(n => n.path === SCHEMA_SENTINEL);
    stored = stored.filter(n => n.path !== SCHEMA_SENTINEL);
    const idbSchema = marker ? marker.schemaVersion : null;
    let lsSchema = null;
    try {
      lsSchema = localStorage.getItem(SCHEMA_KEY);
    } catch {
      // storage unavailable
    }

    // The in-store marker is authoritative (localStorage can be cleared
    // independently of IndexedDB); stores predating the marker fall back to
    // the localStorage copy. Either way, a store only counts as current
    // when the seeded tree is actually present.
    const hasTree = stored.some(n => n.path === 'C:/');
    const current =
      hasTree &&
      (idbSchema === VFS_SCHEMA_VERSION ||
        (idbSchema === null && lsSchema === VFS_SCHEMA_VERSION));

    if (current) {
      await loadCurrentStore({ db, store, persistence, stored, marker });
    } else {
      if (hasTree) {
        console.info(
          `VFS: rebuilding filesystem (schema ${idbSchema ||
            lsSchema ||
            'unknown'} -> ${VFS_SCHEMA_VERSION})`,
        );
      }
      const wipeAndSeed = async () => {
        await clearAllStores(db);
        const defaults = buildSeedNodes();
        for (const node of defaults) store.set(node);
        await saveManyMeta(db, defaults);
        // Stamp the version only after the seed write has committed, so a
        // failure mid-seed leaves an unstamped store that reseeds cleanly
        // A fresh seed needs none of the repairs; record them as done
        await saveManyMeta(db, [
          {
            path: SCHEMA_SENTINEL,
            schemaVersion: VFS_SCHEMA_VERSION,
            migrations: Object.keys(MIGRATIONS),
          },
        ]);
      };
      const userFiles = hasTree ? usersOwnFiles(stored) : [];
      if (userFiles.length > 0) {
        console.info(
          `VFS: offering recovery backup (${userFiles.length} user files)`,
        );
        await requestRecovery({
          fileCount: userFiles.length,
          buildBackup: () =>
            buildBackupZip(stored, node =>
              storedNodeBytes(node, n => loadBlob(db, n.blobId || n.path)),
            ),
          proceed: wipeAndSeed,
        });
      } else {
        await wipeAndSeed();
      }
    }
    try {
      localStorage.setItem(SCHEMA_KEY, VFS_SCHEMA_VERSION);
    } catch {
      // ignore
    }
    // Anything marked before the database was ready is still queued
    if (persistence.hasPendingWrites) persistence.schedule();
    return 'indexeddb';
  } catch (err) {
    console.warn('VFS: IndexedDB unavailable, using memory only', err);
    // Never keep writing into a store that may be half-wiped/half-seeded
    persistence.db = null;
    store.clear();
    for (const node of buildSeedNodes()) store.set(node);
    return 'memory';
  }
}
