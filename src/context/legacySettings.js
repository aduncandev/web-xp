// Settings from before the per-user hive existed. Each old localStorage key is
// read once when the filesystem comes up, moved into the first registered
// account's ntuser.dat (the machine had one user then) and removed.

const RECENT_DOCS_PREFIX = 'winxp_recent_docs_';
// The per-user settings bucket that predates the hive; only the wallpaper
// ever lived in it, keyed by account name
const USER_SETTINGS_KEY = 'winxp_user_settings';

/** The one-user keys, with how each becomes a hive value. */
const MACHINE_KEYS = [
  { legacyKey: 'winxp_run_history', hiveKey: 'runHistory' },
  { legacyKey: 'winxp_solitaire_opts', hiveKey: 'solitaireOptions' },
  { legacyKey: 'winxp_desktop_icon_layout', hiveKey: 'desktopLayout' },
  { legacyKey: 'eggData', hiveKey: 'eggData' },
  // Older still: only how many eggs had been found. They reappear at
  // random spots, which is all the first collector ever knew about them.
  {
    legacyKey: 'eggCount',
    hiveKey: 'eggData',
    parse: raw => {
      const count = parseInt(raw, 10);
      if (!Number.isFinite(count) || count <= 0) return null;
      return Array.from({ length: count }).map((_, i) => ({
        x: Math.random() * window.screen.width,
        y: Math.random() * window.screen.height,
        id: Date.now() + i,
      }));
    },
  },
  {
    legacyKey: 'lastEggTime',
    hiveKey: 'lastEggTime',
    parse: raw => {
      const t = parseInt(raw, 10);
      return Number.isFinite(t) && t > 0 ? t : null;
    },
  },
];

function readLegacy(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function forgetLegacy(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // storage unavailable
  }
}

/** Move one legacy key into the hive unless it is already set; drop the key either way. */
function adopt(hive, userName, { legacyKey, hiveKey, parse }) {
  const raw = readLegacy(legacyKey);
  if (raw == null) return;
  if (hive.getUserConfigFor(userName, hiveKey, null) == null) {
    let value = null;
    try {
      value = parse ? parse(raw) : JSON.parse(raw);
    } catch {
      value = null;
    }
    if (value != null) hive.setUserConfigFor(userName, hiveKey, value);
  }
  forgetLegacy(legacyKey);
}

/** Run once the filesystem is up; `userNames` in registration order. */
export function migrateLegacySettings(hive, userNames) {
  if (!userNames.length) return;
  for (const spec of MACHINE_KEYS) adopt(hive, userNames[0], spec);
  // Recent documents were already filed per account name
  for (const name of userNames) {
    adopt(hive, name, {
      legacyKey: `${RECENT_DOCS_PREFIX}${String(name).toLowerCase()}`,
      hiveKey: 'recentDocuments',
    });
  }
  // So was the wallpaper, in one shared bucket
  const raw = readLegacy(USER_SETTINGS_KEY);
  if (raw != null) {
    let bucket = {};
    try {
      bucket = JSON.parse(raw) || {};
    } catch {
      bucket = {};
    }
    for (const name of userNames) {
      const wallpaper = bucket[name] && bucket[name].wallpaper;
      if (wallpaper && hive.getUserConfigFor(name, 'wallpaper', null) == null)
        hive.setUserConfigFor(name, 'wallpaper', wallpaper);
    }
    forgetLegacy(USER_SETTINGS_KEY);
  }
}
