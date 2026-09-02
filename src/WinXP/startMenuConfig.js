// Per-user Start menu state: pinned programs, launch counts for the
// most-frequently-used list, and the Taskbar and Start Menu Properties /
// Customize Start Menu settings. Stored in the profile hive under
// 'startMenu' via vfs.getUserConfigFor/setUserConfigFor.

import { EXE_PATHS } from '../context/vfsConstants';

// Quick Launch's special first slot: not a program, minimizes everything.
export const QUICK_LAUNCH_SHOW_DESKTOP = 'shell:show-desktop';

// Pre-seeded most-frequently-used programs (a fresh install's list).
// Removable like anything else; launching one again brings it back.
export const MFU_SEEDS = [
  EXE_PATHS.WINMINE,
  EXE_PATHS.NOTEPAD,
  EXE_PATHS.WINAMP,
  EXE_PATHS.MSPAINT,
  EXE_PATHS.WMPLAYER,
  EXE_PATHS.PICTOCHAT,
];

export const START_MENU_DEFAULTS = {
  // Programs pinned above the separator: array of program exe paths
  // (PROGRAMS registry keys), in pin order.
  pinned: [],
  // Launch counts per exe path, feeding the MFU list.
  usage: {},
  // Programs removed from the MFU ("Remove from This List") — keeps the
  // seeds out too. A fresh launch clears an entry (like real XP).
  mfuRemoved: [],
  settings: {
    iconSize: 'large', // 'large' | 'small' — left-column program icons
    mfuCount: 6, // "Number of programs on Start menu"
    showInternet: true, // Internet (Internet Explorer) slot
    showEmail: true, // the shop slot (key kept from its E-mail days)
    hoverSubmenus: true, // "Open submenus when I pause on them..."
    recentDocs: true, // "List my most recently opened documents"
    // Right-column items: 'link' | 'hide' ('menu' is not implemented)
    items: {
      myDocuments: 'link',
      myPictures: 'link',
      myMusic: 'link',
      myComputer: 'link',
      controlPanel: 'link',
      printers: 'link',
      helpSupport: 'link',
      search: 'link',
      run: 'link',
    },
  },
  taskbar: {
    showClock: true, // Notification area: "Show the clock"
    showQuickLaunch: false, // the Quick Launch toolbar next to Start; off, as XP ships
    // Three Quick Launch slots — the sentinel is the Show Desktop button;
    // any slot can be reassigned to a program (our one deliberate
    // departure from stock XP).
    quickLaunch: [
      QUICK_LAUNCH_SHOW_DESKTOP,
      EXE_PATHS.IEXPLORE,
      EXE_PATHS.WMPLAYER,
    ],
  },
};

function mergeConfig(stored) {
  const s = stored || {};
  return {
    pinned: Array.isArray(s.pinned) ? s.pinned : [],
    usage: s.usage && typeof s.usage === 'object' ? s.usage : {},
    mfuRemoved: Array.isArray(s.mfuRemoved) ? s.mfuRemoved : [],
    settings: {
      ...START_MENU_DEFAULTS.settings,
      ...(s.settings || {}),
      items: {
        ...START_MENU_DEFAULTS.settings.items,
        ...((s.settings && s.settings.items) || {}),
      },
    },
    taskbar: { ...START_MENU_DEFAULTS.taskbar, ...(s.taskbar || {}) },
  };
}

export function getStartMenuConfig(vfs, userName) {
  try {
    return mergeConfig(vfs.getUserConfigFor(userName, 'startMenu', null));
  } catch {
    return mergeConfig(null);
  }
}

export function setStartMenuConfig(vfs, userName, patch) {
  try {
    const current = getStartMenuConfig(vfs, userName);
    const next = mergeConfig({
      ...current,
      ...patch,
      settings: { ...current.settings, ...(patch.settings || {}) },
      taskbar: { ...current.taskbar, ...(patch.taskbar || {}) },
    });
    vfs.setUserConfigFor(userName, 'startMenu', next);
    return next;
  } catch {
    return null;
  }
}

/** Bump a program's launch count (drives the MFU list). */
export function recordProgramLaunch(vfs, userName, exePath) {
  if (!exePath) return;
  try {
    const cfg = getStartMenuConfig(vfs, userName);
    const key = String(exePath);
    setStartMenuConfig(vfs, userName, {
      usage: { ...cfg.usage, [key]: (cfg.usage[key] || 0) + 1 },
      // Launching a removed program earns it back onto the list
      mfuRemoved: cfg.mfuRemoved.filter(p => p !== key),
    });
  } catch {
    // hive unavailable
  }
}

export function isPinned(vfs, userName, exePath) {
  return getStartMenuConfig(vfs, userName).pinned.includes(String(exePath));
}

/** Pin/unpin a program. Returns the new pinned array. */
export function togglePinned(vfs, userName, exePath) {
  const cfg = getStartMenuConfig(vfs, userName);
  const key = String(exePath);
  const pinned = cfg.pinned.includes(key)
    ? cfg.pinned.filter(p => p !== key)
    : [...cfg.pinned, key];
  setStartMenuConfig(vfs, userName, { pinned });
  return pinned;
}

/** "Remove from This List" on an MFU entry (seeds included). */
export function removeFromMfu(vfs, userName, exePath) {
  const cfg = getStartMenuConfig(vfs, userName);
  const key = String(exePath);
  const usage = { ...cfg.usage };
  delete usage[key];
  setStartMenuConfig(vfs, userName, {
    usage,
    mfuRemoved: cfg.mfuRemoved.includes(key)
      ? cfg.mfuRemoved
      : [...cfg.mfuRemoved, key],
  });
}

/**
 * Forget a program everywhere the Start menu and taskbar refer to it, when
 * it is uninstalled: pins, launch counts and Quick Launch slots (which fall
 * back to their stock button). Returns true if anything changed.
 */
export function scrubProgramRefs(vfs, userName, exePath) {
  const lower = String(exePath).toLowerCase();
  const matches = v => typeof v === 'string' && v.toLowerCase() === lower;
  const cfg = getStartMenuConfig(vfs, userName);
  const patch = {};
  if (cfg.pinned.some(matches))
    patch.pinned = cfg.pinned.filter(v => !matches(v));
  if (Object.keys(cfg.usage).some(matches))
    patch.usage = Object.fromEntries(
      Object.entries(cfg.usage).filter(([k]) => !matches(k)),
    );
  if (cfg.mfuRemoved.some(matches))
    patch.mfuRemoved = cfg.mfuRemoved.filter(v => !matches(v));
  if (cfg.taskbar.quickLaunch.some(matches))
    patch.taskbar = {
      quickLaunch: cfg.taskbar.quickLaunch.map((v, i) =>
        matches(v) ? START_MENU_DEFAULTS.taskbar.quickLaunch[i] : v,
      ),
    };
  if (Object.keys(patch).length === 0) return false;
  setStartMenuConfig(vfs, userName, patch);
  return true;
}

/** "Clear List" in Customize Start Menu (General) — empties everything,
 *  seed programs included, like the real thing. */
export function clearMfu(vfs, userName) {
  const cfg = getStartMenuConfig(vfs, userName);
  setStartMenuConfig(vfs, userName, {
    usage: {},
    mfuRemoved: [...new Set([...cfg.mfuRemoved, ...MFU_SEEDS])],
  });
}
