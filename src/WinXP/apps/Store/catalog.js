/*
 * The Store catalog: the non-stock (third-party / fan-made) apps a user can
 * add or remove so the base install stays lean. Each app is ALREADY in the
 * program registry (so it's launchable); the store just toggles its VFS
 * footprint — the Program Files folder + exe node, plus a Start-menu shortcut
 * per user profile — so it shows up (or vanishes) across Explorer, the Start
 * menu and the desktop live.
 */
import { EXE_PATHS, getProfileRootFor } from '../../../context/vfsConstants';
import { listUsers } from '../../../context/users';
import { START_MENU_DEFAULTS } from '../../startMenuConfig';

import pictochatIcon from 'assets/windowsIcons/pictochat.png';
import voltorbIcon from 'assets/windowsIcons/voltorb.png';
import tagEditorIcon from 'assets/windowsIcons/shell32-2(32x32).png';
import winampIcon from 'assets/windowsIcons/winamp.png';
import tourIcon from 'assets/windowsIcons/touricon.png';
import mediaPlayerIcon from 'assets/windowsIcons/846(32x32).png';
import mvlIcon from 'assets/windowsIcons/mariovsluigi.png';
import climbRaceIcon from 'assets/windowsIcons/climbrace.gif';

/** The shop's shelves; software shelves double as the Start menu folder
 *  names under Shop Apps. Games hold games, XPWare holds ALL software, and
 *  Extras holds content — songs, pictures, other files — seeded into the
 *  buyer's profile as server-hosted nodes (kind: 'media'), so they never
 *  spend the user's own storage. */
export const SHELF_LABELS = {
  games: 'Games',
  xpware: 'XPWare',
  extras: 'Extras',
};

export const CATALOG = [
  {
    id: 'pictochat',
    name: 'PictoChat',
    publisher: 'aduncan.dev',
    category: 'Communication',
    icon: pictochatIcon,
    sizeBytes: 524288,
    blurb: 'Doodle & message pad',
    description:
      'A recreation of the Nintendo DS messaging app. Pick a room and say it in doodles.',
    exePath: EXE_PATHS.PICTOCHAT,
    folder: 'C:/Program Files/PictoChat',
    shortcutName: 'PictoChat',
    shortcutIconKey: 'desk-pictochat',
    shelf: 'xpware',
    released: '11/2004',
    players: 'For 1-16 players',
    isNew: false,
  },
  {
    id: 'voltorb',
    name: 'Voltorb Flip',
    publisher: 'aduncan.dev',
    category: 'Puzzle',
    icon: voltorbIcon,
    sizeBytes: 786432,
    blurb: 'Luck-and-logic card game',
    description:
      'The coin-flipping puzzle game from Pokémon HeartGold and SoulSilver. Find the multipliers. Do not find the Voltorbs.',
    exePath: EXE_PATHS.VOLTORB,
    folder: 'C:/Program Files/Voltorb Flip',
    shortcutName: 'Voltorb Flip',
    shortcutIconKey: 'desk-voltorb',
    shelf: 'games',
    released: '03/2010',
    players: 'For 1 player',
    isNew: false,
  },
  {
    id: 'tageditor',
    name: 'Media Tag Editor',
    publisher: 'aduncan.dev',
    category: 'Multimedia',
    icon: tagEditorIcon,
    sizeBytes: 372736,
    blurb: 'Batch-edit music tags',
    description:
      'Batch-edit music tags: title, artist, album and cover art for a whole folder at once.',
    exePath: EXE_PATHS.TAGEDITOR,
    folder: 'C:/Program Files/Media Tag Editor',
    shortcutName: 'Media Tag Editor',
    shortcutIconKey: 'desk-tageditor',
    shelf: 'xpware',
    released: '05/2026',
    players: 'For 1 player',
    isNew: false,
  },
  {
    id: 'winamp',
    name: 'Winamp',
    publisher: 'Nullsoft',
    category: 'Multimedia',
    icon: winampIcon,
    sizeBytes: 1198592,
    blurb: 'Classic skinnable player',
    description:
      "The classic media player, complete with skins and a visualizer. It really whips the llama's ass.",
    exePath: EXE_PATHS.WINAMP,
    folder: 'C:/Program Files/Winamp',
    shortcutName: 'Winamp',
    shortcutIconKey: 'desk-winamp',
    shelf: 'xpware',
    released: '04/1997',
    players: 'For 1 player',
    isNew: false,
  },
  {
    id: 'mplayer2',
    name: 'Media Player',
    publisher: 'Microsoft',
    category: 'Multimedia',
    icon: mediaPlayerIcon,
    sizeBytes: 917504,
    blurb: 'The old media player',
    description:
      "The media player that Windows Media Player replaced. You don't need it, but it deserved to survive.",
    exePath: EXE_PATHS.MPLAYER2,
    folder: 'C:/Program Files/Windows Media Player',
    // shared with Windows Media Player — uninstall must never delete it
    keepFolder: true,
    shortcutName: 'Media Player',
    shortcutIconKey: 'desk-media',
    price: 100,
    shelf: 'xpware',
    released: '03/1999',
    players: 'For 1 player',
    isNew: false,
  },
  {
    id: 'tour',
    name: 'aduncan.dev Tour',
    publisher: 'aduncan.dev',
    category: 'Internet',
    icon: tourIcon,
    sizeBytes: 425984,
    blurb: 'A guided tour of the site',
    description: 'A guided tour of aduncan.dev and how it works.',
    exePath: EXE_PATHS.TOUR,
    folder: 'C:/Program Files/aduncan.dev',
    shortcutName: 'About Me',
    shortcutIconKey: 'sm-aboutme',
    shelf: 'xpware',
    released: '01/2026',
    players: 'For 1 player',
    isNew: false,
  },
  {
    id: 'mariovsluigi',
    name: 'Mario vs Luigi',
    publisher: 'ipodtouch0218',
    category: 'Action',
    icon: mvlIcon,
    sizeBytes: 53500000,
    blurb: 'Online NSMB multiplayer',
    description:
      'A fan remake of the New Super Mario Bros. multiplayer mode. Collect the most stars before your friends do, up to 10 players online.',
    exePath: EXE_PATHS.MVL,
    folder: 'C:/Program Files/Mario vs Luigi',
    shortcutName: 'Mario vs Luigi',
    shortcutIconKey: 'desk-mariovsluigi',
    shelf: 'games',
    released: '04/2026',
    players: 'For 1-10 players',
    isNew: false,
  },
  {
    id: 'deltascend',
    name: 'DELTASCEND',
    publisher: 'aduncan.dev',
    category: 'Action',
    icon: climbRaceIcon,
    sizeBytes: 2097152,
    blurb: 'Deltarune wall-climbing with randomly generated walls.',
    description:
      "A seed-based recreation of deltarune's climbing puzzles. Enter " +
      'any 4-digit seed and climb whatever the bargain-bin level ' +
      'generator coughs up. Coins pay real XP Points at the top.',
    exePath: EXE_PATHS.DELTASCEND,
    folder: 'C:/Program Files/DELTASCEND',
    shortcutName: 'DELTASCEND',
    shortcutIconKey: 'desk-deltascend',
    shelf: 'games',
    released: '08/2026',
    players: 'For 1 player',
    isNew: true,
  },
  {
    id: 'gamecorner',
    kind: 'media',
    name: 'Game Corner',
    publisher: 'Game Freak',
    category: 'Music',
    // media titles wear their cover art in the shop
    icon: `${import.meta.env.BASE_URL}voltorb_flip/images/voltorb_full.png`,
    sizeBytes: 6209480,
    blurb: 'The Voltorb Flip theme',
    description:
      'The Goldenrod Game Corner theme from Voltorb Flip. Catchy enough to make losing coins feel fine.',
    dest: 'music',
    cover: 'voltorb_flip/images/voltorb_full.png',
    files: [
      {
        name: 'Game Corner.mp3',
        url: 'voltorb_flip/voltorbflipsounds/gamecorner.mp3',
        sizeBytes: 6209480,
      },
    ],
    shelf: 'extras',
    released: '03/2010',
    isNew: false,
  },
  {
    id: 'audiowaves',
    kind: 'media',
    name: 'Audio Waves of Pain and Suffering',
    publisher: 'Skillz Productions',
    category: 'Music',
    icon: `${import.meta.env.BASE_URL}shop/audio-waves/cover.png`,
    price: 50,
    sizeBytes: 14236240 + 1921625 + 550510,
    blurb: 'The Skillz Productions album',
    description:
      'Three original lo-fi tracks: Music, Eternal Depths of Hell, and the title track. Exactly what it says on the tin.',
    dest: 'music',
    cover: 'shop/audio-waves/cover.png',
    coverSizeBytes: 11400,
    playlist: true,
    albumTags: {
      artist: 'Skillz Productions',
      album: 'Audio Waves of Pain and Suffering',
      year: '2025',
      genre: 'Lo-Fi',
    },
    files: [
      {
        name: 'music1.wav',
        url: 'music/music1.wav',
        sizeBytes: 14236240,
        tags: { title: 'Music', track: '1' },
      },
      {
        name: 'EternalDepthsOfHell.mp3',
        url: 'music/EternalDepthsOfHell.mp3',
        sizeBytes: 1921625,
        tags: { title: 'Eternal Depths of Hell', track: '2' },
      },
      {
        name: 'AudioWavesOfPainAndSuffering.mp3',
        url: 'music/AudioWavesOfPainAndSuffering.mp3',
        sizeBytes: 550510,
        tags: { title: 'Audio Waves of Pain and Suffering', track: '3' },
      },
    ],
    shelf: 'extras',
    released: '2025',
    isNew: true,
  },
];

/**
 * Shop news, newest first. The welcome page's Important Info panel shows
 * the two pinned rows (welcome + how-to) and then one of these at a time,
 * with little arrows to page back through the older ones.
 */
export const SHOP_NEWS = [
  {
    id: 'browse-launch',
    title: 'New ways to browse the shop',
    body:
      'Each catalog now has its own front page: Popular Titles, Newest ' +
      'Additions, and search by category or by name. The welcome screen ' +
      'rotates through a few themed shelves now too. Have a look around.',
  },
  {
    id: 'extras-launch',
    title: 'Extras: music and more on the shop',
    body:
      'The shop now sells more than software. Extras are things like ' +
      'music albums and picture packs. They get saved into your own ' +
      'folders (albums go to My Music with proper tags and a playlist) ' +
      "and they don't use up any of your storage. The first few are " +
      'up now.',
  },
];

/** The welcome screen's themed shelves, four titles each; the side arrows
 *  page through them. */
export const WELCOME_GROUPS = [
  {
    id: 'new',
    heading: 'New on the Shop',
    ids: ['deltascend', 'audiowaves', 'mariovsluigi', 'gamecorner'],
  },
  {
    id: 'picks',
    heading: 'Recommended Titles',
    ids: ['pictochat', 'mariovsluigi', 'voltorb', 'tour'],
  },
  {
    id: 'music',
    heading: 'Turn It Up',
    ids: ['winamp', 'mplayer2', 'audiowaves', 'gamecorner'],
  },
  {
    id: 'homegrown',
    heading: 'Made Around Here',
    ids: ['pictochat', 'voltorb', 'audiowaves', 'tageditor'],
  },
];

/** The subtitle line on each catalog's front page. */
export const SHELF_INFO = {
  games: 'Games to play on this computer',
  xpware: 'Software and tools for Windows XP',
  extras: 'Music, pictures and other extras',
};

/** What the title-search button calls the goods on each shelf. */
export const SHELF_SEARCH = {
  games: 'Search by Game Title',
  xpware: 'Search by Software Title',
  extras: 'Search by Title',
};

/** A title's price in XP Points (titles without one are free). */
export function priceOf(app) {
  return app.price || 0;
}

function registeredUsers() {
  let users = [];
  try {
    users = listUsers();
  } catch {
    users = [];
  }
  return users.length ? users : [{ name: 'Skillz' }];
}

/** The Shop Apps folder chain for a profile, deepest last. */
function shopFolderChain(root, app) {
  const shop = `${root}/Start Menu/Programs/Shop Apps`;
  return [shop, `${shop}/${SHELF_LABELS[app.shelf] || 'XPWare'}`];
}

/** Where the store puts a new Start-menu shortcut (one per profile):
 *  Programs/Shop Apps/<Shelf>/<name>, keeping All Programs uncluttered. */
function startShortcutPaths(app) {
  return registeredUsers().map(u => {
    const chain = shopFolderChain(getProfileRootFor(u.name), app);
    return `${chain[chain.length - 1]}/${app.shortcutName}`;
  });
}

/** Make sure the Shop Apps category folders exist for every profile. */
function ensureShopFolders(vfs, app) {
  for (const u of registeredUsers()) {
    for (const dir of shopFolderChain(getProfileRootFor(u.name), app)) {
      if (!vfs.findNodeCI(dir)) {
        vfs.createFolder(dir);
        vfs.setNodeAttributes(dir, { iconKey: 'menu-folder' });
      }
    }
  }
}

/** Every shortcut node (any profile, Start Menu or Desktop) pointing at the
 *  app's exe — so uninstall never leaves a dead shortcut behind, wherever the
 *  seeder happened to place it (Programs, Games, desktop…). */
function shortcutsTargeting(vfs, app) {
  const out = [];
  const target = app.exePath.toLowerCase();
  const walk = dirPath => {
    let kids;
    try {
      kids = vfs.listDir(dirPath);
    } catch {
      return;
    }
    if (!Array.isArray(kids)) return;
    for (const n of kids) {
      if (n.type === 'folder') walk(n.path);
      else if (
        n.type === 'shortcut' &&
        (n.target || '').toLowerCase() === target
      )
        out.push(n.path);
    }
  };
  for (const u of registeredUsers()) {
    const root = getProfileRootFor(u.name);
    walk(`${root}/Start Menu`);
    walk(`${root}/Desktop`);
  }
  return out;
}

/** Where each media dest lands inside a profile. */
const MEDIA_DESTS = {
  music: root => `${root}/My Documents/My Music`,
  pictures: root => `${root}/My Documents/My Pictures`,
  documents: root => `${root}/My Documents`,
};

/** Human name for where a media title's files go (completion screens). */
export function mediaDestLabel(app) {
  return (
    { music: 'My Music', pictures: 'My Pictures' }[app.dest] || 'My Documents'
  );
}

/** A public (server) URL, honoring the deploy's base path. */
export function publicUrl(rel) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${rel}`;
}

/** The pack's own folder inside one user's dest (media installs are
 *  per-profile and always land in a folder named after the title). */
export function mediaPackDir(app, userName) {
  const root = getProfileRootFor(userName);
  const destDir = (MEDIA_DESTS[app.dest] || MEDIA_DESTS.documents)(root);
  return `${destDir}/${app.name}`;
}

/** The cover file the pack ships alongside its tracks, if it has one. */
function coverFileName(app) {
  if (!app.cover) return null;
  const ext = (app.cover.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0];
  return `Folder${ext}`;
}

/** Every file the pack installs (cover included) for one user. */
export function mediaFilePaths(app, userName) {
  const dir = mediaPackDir(app, userName);
  const out = (app.files || []).map(f => `${dir}/${f.name}`);
  const cover = coverFileName(app);
  if (cover) out.push(`${dir}/${cover}`);
  if (app.playlist) out.push(`${dir}/${app.name}.m3u`);
  return out;
}

/** Merge an album's tag overrides into the buyer's hive, so WMP, Winamp,
 *  the Tag Editor and Explorer's Summary page all show the real credits.
 *  (Same 'mediaTagEdits' store the Tag Editor writes; keyed by path.) */
function writeAlbumTags(vfs, app, userName) {
  if (!app.albumTags && !(app.files || []).some(f => f.tags)) return;
  const dir = mediaPackDir(app, userName);
  try {
    const all = vfs.getUserConfigFor(userName, 'mediaTagEdits', {}) || {};
    for (const f of app.files || []) {
      const key = `${dir}/${f.name}`.toLowerCase();
      all[key] = { ...all[key], ...(app.albumTags || {}), ...(f.tags || {}) };
    }
    vfs.setUserConfigFor(userName, 'mediaTagEdits', all);
  } catch {
    // tags are polish; the files themselves matter more
  }
}

function clearAlbumTags(vfs, app, userName) {
  const dir = mediaPackDir(app, userName).toLowerCase();
  try {
    const all = vfs.getUserConfigFor(userName, 'mediaTagEdits', {}) || {};
    let changed = false;
    for (const key of Object.keys(all)) {
      if (key.startsWith(`${dir}/`)) {
        delete all[key];
        changed = true;
      }
    }
    if (changed) vfs.setUserConfigFor(userName, 'mediaTagEdits', all);
  } catch {
    // nothing to tidy
  }
}

/** The album's .m3u, in track order, in the exact shape WMP reads and
 *  writes (full VFS paths; EXTINF labels of "Artist - Title"). */
function playlistText(app, userName) {
  const dir = mediaPackDir(app, userName);
  const artist = (app.albumTags && app.albumTags.artist) || app.publisher;
  const lines = ['#EXTM3U'];
  for (const f of app.files || []) {
    const title = (f.tags && f.tags.title) || f.name.replace(/\.[^.]+$/, '');
    lines.push(`#EXTINF:0,${artist ? `${artist} - ` : ''}${title}`);
    lines.push(`${dir}/${f.name}`);
  }
  return `${lines.join('\n')}\n`;
}

/** The files' public URLs, for the title page's preview. */
export function mediaFileUrls(app) {
  return (app.files || []).map(f => publicUrl(f.url));
}

/** Installed == the exe exists (software) or every file does (media),
 *  media being per-profile where software is machine-wide. */
export function isInstalled(vfs, app, userName) {
  if (app.kind === 'media') {
    if (!userName) return false;
    const dir = mediaPackDir(app, userName);
    if (!vfs.findNodeCI(dir)) return false;
    return mediaFilePaths(app, userName).every(p => !!vfs.findNodeCI(p));
  }
  return !!vfs.findNodeCI(app.exePath);
}

/** Seed a media title's files into the buyer's profile as server-hosted
 *  nodes (no storage cost). A name collision with the user's own file is
 *  left alone rather than clobbered. */
function installMedia(vfs, app, userName) {
  const dir = mediaPackDir(app, userName);
  if (!vfs.findNodeCI(dir)) vfs.createFolder(dir);
  for (const f of app.files || []) {
    const path = `${dir}/${f.name}`;
    const existing = vfs.findNodeCI(path);
    if (existing && existing.sourceUrl !== publicUrl(f.url)) continue;
    vfs.createRemoteFile(path, publicUrl(f.url), { sizeBytes: f.sizeBytes });
  }
  // the cover rides along as Folder.jpg/png, and the pack folder wears it
  const cover = coverFileName(app);
  if (cover) {
    vfs.createRemoteFile(`${dir}/${cover}`, publicUrl(app.cover), {
      sizeBytes: app.coverSizeBytes || 0,
    });
    vfs.setNodeAttributes(dir, { icon: publicUrl(app.cover) });
  }
  // albums carry proper credits and a ready-made playlist
  writeAlbumTags(vfs, app, userName);
  if (app.playlist) {
    const m3u = `${dir}/${app.name}.m3u`;
    if (!vfs.findNodeCI(m3u)) vfs.createFile(m3u, playlistText(app, userName));
  }
}

function uninstallMedia(vfs, app, userName) {
  const dir = mediaPackDir(app, userName);
  for (const p of mediaFilePaths(app, userName)) {
    const n = vfs.findNodeCI(p);
    // only ever delete what the shop itself put there (server-hosted
    // files, plus the playlist it generated)
    if (n && (n.sourceUrl || /\.m3u$/i.test(n.path)))
      vfs.deleteNodePermanently(n.path);
  }
  clearAlbumTags(vfs, app, userName);
  // the pack folder goes too, unless the user tucked their own files in it
  const folder = vfs.findNodeCI(dir);
  if (folder && vfs.listDir(folder.path).length === 0) {
    vfs.deleteNodePermanently(folder.path);
  }
}

/** Create the folder + exe + a Start-menu shortcut per profile (idempotent). */
export function installApp(vfs, app, userName) {
  if (app.kind === 'media') {
    installMedia(vfs, app, userName);
    return;
  }
  if (!vfs.findNodeCI(app.folder)) vfs.createFolder(app.folder);
  if (!vfs.findNodeCI(app.exePath)) {
    vfs.createFile(app.exePath, '', 'application/x-msdownload');
  }
  // Dress the exe like a real installed program: its icon, its advertised
  // size, and the read-only attribute (idempotent for re-installs).
  vfs.setNodeAttributes(app.exePath, {
    readOnly: true,
    iconKey: app.shortcutIconKey,
    size: app.sizeBytes,
  });
  ensureShopFolders(vfs, app);
  for (const p of startShortcutPaths(app)) {
    if (!vfs.findNodeCI(p))
      vfs.createShortcut(p, app.exePath, { iconKey: app.shortcutIconKey });
  }
}

/* Uninstalled apps must not linger in the Start menu (pins, launch
   counts, Quick Launch slots) or in "always open with" associations. */
function scrubUserRefs(vfs, app) {
  const lower = app.exePath.toLowerCase();
  const matches = v => typeof v === 'string' && v.toLowerCase() === lower;
  for (const u of registeredUsers()) {
    try {
      const sm = vfs.getUserConfigFor(u.name, 'startMenu', null);
      if (sm && typeof sm === 'object') {
        const next = { ...sm };
        let changed = false;
        if (Array.isArray(sm.pinned) && sm.pinned.some(matches)) {
          next.pinned = sm.pinned.filter(v => !matches(v));
          changed = true;
        }
        if (sm.usage && Object.keys(sm.usage).some(matches)) {
          next.usage = Object.fromEntries(
            Object.entries(sm.usage).filter(([k]) => !matches(k)),
          );
          changed = true;
        }
        const ql = sm.taskbar && sm.taskbar.quickLaunch;
        if (Array.isArray(ql) && ql.some(matches)) {
          next.taskbar = {
            ...sm.taskbar,
            quickLaunch: ql.map((v, i) =>
              matches(v) ? START_MENU_DEFAULTS.taskbar.quickLaunch[i] : v,
            ),
          };
          changed = true;
        }
        if (changed) vfs.setUserConfigFor(u.name, 'startMenu', next);
      }
      const ov = vfs.getUserConfigFor(u.name, 'fileAssocOverrides', null);
      if (ov && typeof ov === 'object' && Object.values(ov).some(matches)) {
        vfs.setUserConfigFor(
          u.name,
          'fileAssocOverrides',
          Object.fromEntries(Object.entries(ov).filter(([, v]) => !matches(v))),
        );
      }
    } catch {
      // hive unavailable for this user
    }
  }
}

/** Remove EVERY shortcut to the app, then the program folder (unless it's
 *  shared with other software) and the exe. */
export function uninstallApp(vfs, app, userName) {
  if (app.kind === 'media') {
    uninstallMedia(vfs, app, userName);
    return;
  }
  scrubUserRefs(vfs, app);
  for (const p of shortcutsTargeting(vfs, app)) {
    const n = vfs.findNodeCI(p);
    if (n) vfs.deleteNodePermanently(n.path);
  }
  if (!app.keepFolder) {
    const folder = vfs.findNodeCI(app.folder);
    if (folder) vfs.deleteNodePermanently(folder.path);
  }
  const exe = vfs.findNodeCI(app.exePath);
  if (exe) {
    // installs mark the exe read-only; lift that before deleting
    vfs.setNodeAttributes(exe.path, { readOnly: false });
    vfs.deleteNodePermanently(exe.path);
  }
}

export function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * One-time repairs for profiles created before the current shop layout:
 * bare exes get their icon/size back, the shop's own shortcuts pick up the
 * "XP Shop" name, and shop-app shortcuts left flat in All Programs (or the
 * old Games folder) move into Shop Apps/<Shelf>.
 */
export function repairShopState(vfs, userName) {
  let root;
  try {
    root = getProfileRootFor(userName);
  } catch {
    return;
  }
  const programs = `${root}/Start Menu/Programs`;
  // the shop itself: "Store" -> "XP Shop"; if the login-time profile
  // repair already seeded the new shortcut, drop the old one outright
  for (const p of [`${root}/Desktop/Store`, `${programs}/Store`]) {
    const n = vfs.findNodeCI(p);
    if (!n || n.type !== 'shortcut') continue;
    if ((n.target || '').toLowerCase() !== EXE_PATHS.STORE.toLowerCase())
      continue;
    if (vfs.findNodeCI(`${p.slice(0, p.lastIndexOf('/'))}/XP Shop`))
      vfs.deleteNodePermanently(n.path);
    else vfs.rename(n.path, 'XP Shop');
  }
  for (const app of CATALOG) {
    if (app.kind === 'media') continue; // media has no exe or shortcuts
    // exes installed before the shop dressed them (no icon, 0 bytes)
    const exe = vfs.findNodeCI(app.exePath);
    if (exe && !exe.system && (!exe.iconKey || !exe.size)) {
      vfs.setNodeAttributes(exe.path, {
        iconKey: app.shortcutIconKey,
        size: app.sizeBytes,
      });
    }
    // shortcuts stranded outside Shop Apps
    const target = app.exePath.toLowerCase();
    for (const op of [
      `${programs}/${app.shortcutName}`,
      `${programs}/Games/${app.shortcutName}`,
      // Utility was a software shelf before it became Extras (content)
      `${programs}/Shop Apps/Utility/${app.shortcutName}`,
    ]) {
      const n = vfs.findNodeCI(op);
      if (!n || n.type !== 'shortcut') continue;
      if ((n.target || '').toLowerCase() !== target) continue;
      ensureShopFolders(vfs, app);
      const chain = shopFolderChain(root, app);
      const dest = chain[chain.length - 1];
      if (vfs.findNodeCI(`${dest}/${app.shortcutName}`)) {
        vfs.deleteNodePermanently(n.path);
      } else {
        vfs.move(n.path, dest);
      }
    }
  }
  // the emptied Utility shelf folder retires
  const oldShelf = vfs.findNodeCI(`${programs}/Shop Apps/Utility`);
  if (oldShelf && vfs.listDir(oldShelf.path).length === 0) {
    vfs.deleteNodePermanently(oldShelf.path);
  }
}
