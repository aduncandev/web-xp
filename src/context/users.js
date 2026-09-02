// User account registry — localStorage-backed, shared by the login screen,
// OOBE setup, Control Panel (User Accounts) and the VFS profile seeder.

import { validateFileName } from './vfsUtils';

import chessAvatar from 'assets/userIcons/chess.bmp';
import guestAvatar from 'assets/userIcons/guest.bmp';
import duckAvatar from 'assets/userIcons/duck.bmp';
import airplaneAvatar from 'assets/userIcons/airplane.bmp';
import ballAvatar from 'assets/userIcons/ball.bmp';
import astronautAvatar from 'assets/userIcons/astronaut.bmp';
import carAvatar from 'assets/userIcons/car.bmp';
import catAvatar from 'assets/userIcons/cat.bmp';
import dogAvatar from 'assets/userIcons/dog.bmp';
import fishAvatar from 'assets/userIcons/fish.bmp';
import frogAvatar from 'assets/userIcons/frog.bmp';
import guitarAvatar from 'assets/userIcons/guitar.bmp';
import snowflakeAvatar from 'assets/userIcons/snowflake.bmp';
import skillzAvatar from 'assets/userIcons/skillz.bmp';

const USERS_KEY = 'winxp_users';
const ACTIVE_KEY = 'winxp_active_user';
const FASTBOOT_KEY = 'winxp_fastboot';
// Five accounts of your own, plus room for Guest — XP kept Guest out of
// the ordinary count too, and it should never cost somebody a slot.
export const MAX_USERS = 6;
/** How many accounts Setup lets someone name: everything but Guest's slot. */
export const MAX_SETUP_ACCOUNTS = MAX_USERS - 1;

/** XP account pictures, keyed by stable string (persisted per user). */
export const AVATARS = {
  chess: chessAvatar,
  duck: duckAvatar,
  airplane: airplaneAvatar,
  ball: ballAvatar,
  astronaut: astronautAvatar,
  car: carAvatar,
  cat: catAvatar,
  dog: dogAvatar,
  fish: fishAvatar,
  frog: frogAvatar,
  guitar: guitarAvatar,
  snowflake: snowflakeAvatar,
  skillz: skillzAvatar,
  // XP shipped a picture for the Guest account; the ?guest link uses it.
  // Deliberately absent from DEFAULT_AVATAR_ORDER so it is never handed
  // out to an ordinary account by the rotation.
  guest: guestAvatar,
};

/** Rotation used when accounts are created without an explicit picture. */
export const DEFAULT_AVATAR_ORDER = [
  'chess',
  'duck',
  'airplane',
  'ball',
  'astronaut',
  'guitar',
];

// A custom account picture is stored INLINE as its avatarKey — a small
// data URL (the picker downscales to 96x96 before saving), so it lives in
// the same localStorage registry as the account itself and survives
// filesystem rebuilds the way accounts do. Capped so five accounts of
// pictures can never crowd out the registry's storage.
export const CUSTOM_AVATAR_MAX_CHARS = 120 * 1024;

export function isCustomAvatar(avatarKey) {
  return (
    typeof avatarKey === 'string' &&
    avatarKey.startsWith('data:image/') &&
    avatarKey.length <= CUSTOM_AVATAR_MAX_CHARS
  );
}

export function getAvatar(avatarKey) {
  if (isCustomAvatar(avatarKey)) return avatarKey;
  return AVATARS[avatarKey] || AVATARS.chess;
}

// --- Storage helpers ---

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

// --- Subscriptions ---

const userListeners = new Set();

export function subscribeUsers(cb) {
  userListeners.add(cb);
  return () => userListeners.delete(cb);
}

function emitUsers() {
  userListeners.forEach(cb => {
    try {
      cb();
    } catch {
      // listener errors must not break the registry
    }
  });
}

// --- Users ---

export function listUsers() {
  const users = readJson(USERS_KEY, []);
  return Array.isArray(users)
    ? users.filter(u => u && typeof u.name === 'string')
    : [];
}

export function getUser(name) {
  if (!name) return null;
  const lower = String(name).toLowerCase();
  return listUsers().find(u => u.name.toLowerCase() === lower) || null;
}

export function getCurrentUserName() {
  try {
    const name = localStorage.getItem(ACTIVE_KEY);
    return name && getUser(name) ? getUser(name).name : null;
  } catch {
    return null;
  }
}

export function setActiveUser(name) {
  try {
    if (name == null) localStorage.removeItem(ACTIVE_KEY);
    else localStorage.setItem(ACTIVE_KEY, String(name));
  } catch {
    // storage unavailable
  }
  emitUsers();
}

export function createUser(name, avatarKey, extra) {
  const trimmed = String(name || '').trim();
  if (!trimmed || validateFileName(trimmed) !== null) {
    return { ok: false, error: 'invalid' };
  }
  const users = listUsers();
  if (users.length >= MAX_USERS) return { ok: false, error: 'limit' };
  if (users.some(u => u.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: 'exists' };
  }
  const key =
    avatarKey && (AVATARS[avatarKey] || isCustomAvatar(avatarKey))
      ? avatarKey
      : DEFAULT_AVATAR_ORDER[users.length % DEFAULT_AVATAR_ORDER.length];
  writeJson(USERS_KEY, [
    ...users,
    { name: trimmed, avatarKey: key, createdAt: Date.now(), ...extra },
  ]);
  emitUsers();
  return { ok: true };
}

export function renameUser(oldName, newName) {
  const user = getUser(oldName);
  if (!user) return { ok: false, error: 'not-found' };
  const trimmed = String(newName || '').trim();
  if (!trimmed || validateFileName(trimmed) !== null) {
    return { ok: false, error: 'invalid' };
  }
  const users = listUsers();
  if (
    users.some(
      u =>
        u.name.toLowerCase() === trimmed.toLowerCase() &&
        u.name.toLowerCase() !== user.name.toLowerCase(),
    )
  ) {
    return { ok: false, error: 'exists' };
  }
  writeJson(
    USERS_KEY,
    users.map(u => (u.name === user.name ? { ...u, name: trimmed } : u)),
  );
  // The active pointer follows the name; per-user settings live in the
  // profile hive, which Control Panel moves with vfs.renameUserProfile
  if (getCurrentUserName() === null) {
    try {
      if (localStorage.getItem(ACTIVE_KEY) === user.name) {
        localStorage.setItem(ACTIVE_KEY, trimmed);
      }
    } catch {
      // ignore
    }
  }
  emitUsers();
  return { ok: true };
}

// --- Passwords (sim-grade: stored as-is, like everything else here) ---

export function userHasPassword(name) {
  const user = getUser(name);
  return !!(user && user.password);
}

export function getPasswordHint(name) {
  const user = getUser(name);
  return (user && user.password && user.passwordHint) || '';
}

/** Set (or with an empty password, remove) an account's password. */
export function setUserPassword(name, password, hint) {
  const user = getUser(name);
  if (!user) return { ok: false, error: 'not-found' };
  writeJson(
    USERS_KEY,
    listUsers().map(u => {
      if (u.name !== user.name) return u;
      const next = { ...u };
      if (password) {
        next.password = String(password);
        if (hint) next.passwordHint = String(hint);
        else delete next.passwordHint;
      } else {
        delete next.password;
        delete next.passwordHint;
      }
      return next;
    }),
  );
  emitUsers();
  return { ok: true };
}

export function verifyUserPassword(name, password) {
  const user = getUser(name);
  if (!user) return false;
  if (!user.password) return !password;
  return user.password === String(password || '');
}

export function setUserAvatar(name, avatarKey) {
  const user = getUser(name);
  if (!user || !(AVATARS[avatarKey] || isCustomAvatar(avatarKey)))
    return { ok: false, error: 'invalid' };
  writeJson(
    USERS_KEY,
    listUsers().map(u => (u.name === user.name ? { ...u, avatarKey } : u)),
  );
  emitUsers();
  return { ok: true };
}

export function deleteUser(name) {
  const user = getUser(name);
  if (!user) return { ok: false, error: 'not-found' };
  const users = listUsers();
  if (users.length <= 1) return { ok: false, error: 'last-user' };
  // The profile folder stays on disk, exactly like real XP.
  writeJson(
    USERS_KEY,
    users.filter(u => u.name !== user.name),
  );
  try {
    if (localStorage.getItem(ACTIVE_KEY) === user.name) {
      localStorage.removeItem(ACTIVE_KEY);
    }
  } catch {
    // ignore
  }
  emitUsers();
  return { ok: true };
}

/*
 * Fast boot: skip the POST splash and the "Please wait..." status on
 * load, landing straight on the user list.
 *
 * It deliberately stops there rather than logging someone in. The click
 * on a user tile is the gesture browsers require before audio may play,
 * so skipping it would silence the startup sound — Firefox blocks
 * autoplay outright, and Chrome only allows it once an origin has built
 * up enough media engagement. One click buys back roughly six seconds
 * and keeps the sound.
 *
 * Machine-level, in localStorage, because it is read before the
 * filesystem is up and applies to whoever is sitting at the computer.
 */
export function getFastBoot() {
  try {
    return localStorage.getItem(FASTBOOT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setFastBoot(enabled) {
  try {
    if (enabled) localStorage.setItem(FASTBOOT_KEY, '1');
    else localStorage.removeItem(FASTBOOT_KEY);
  } catch {
    /* storage unavailable; the setting simply will not persist */
  }
  emitUsers();
}

/*
 * The Guest account, behind the ?guest link and the Control Panel switch.
 *
 * It is found by a `guest: true` flag on the record rather than by its
 * name, so somebody can rename it to anything they like and the link
 * still finds the same account instead of making a second one. renameUser
 * spreads the existing record, so the flag survives.
 */
export const GUEST_NAME = 'Guest';

/** The guest account, whatever it has since been renamed to. */
export function findGuestUser() {
  return listUsers().find(u => u.guest === true) || null;
}

export function isGuestEnabled() {
  return findGuestUser() !== null;
}

/**
 * Returns the guest account name, creating it if it is not there yet.
 *
 * Null when the machine is full: the visitor still lands on the user list
 * with the accounts that do exist, which is a better answer than an error
 * on a link somebody was handed.
 */
export function ensureGuestUser() {
  const existing = findGuestUser();
  if (existing) return existing.name;

  // A leftover account literally called "Guest" from before the flag
  // existed is adopted rather than duplicated.
  const byName = listUsers().find(
    u => u.name.toLowerCase() === GUEST_NAME.toLowerCase(),
  );
  if (byName) {
    writeJson(
      USERS_KEY,
      listUsers().map(u =>
        u.name === byName.name ? { ...u, guest: true } : u,
      ),
    );
    emitUsers();
    return byName.name;
  }

  const result = createUser(GUEST_NAME, 'guest', { guest: true });
  return result.ok ? GUEST_NAME : null;
}

/*
 * Which accounts have a live session right now.
 *
 * Fast user switching keeps every logged-in desktop mounted, so "logged
 * on" is a list, not just whoever is on screen. Deleting or renaming any
 * of them pulls the profile out from under a running session, and
 * checking only the active user missed the switched-out ones entirely.
 *
 * Deliberately in memory rather than localStorage: sessions last exactly
 * as long as the page does, and a stale list surviving a reload would
 * lock accounts nobody is using.
 */
let loggedOnUsers = [];

export function setLoggedOnUsers(names) {
  loggedOnUsers = Array.isArray(names) ? [...names] : [];
}

export function isUserLoggedOn(name) {
  if (!name) return false;
  const lower = String(name).toLowerCase();
  if (String(getCurrentUserName() || '').toLowerCase() === lower) return true;
  return loggedOnUsers.some(n => String(n).toLowerCase() === lower);
}
