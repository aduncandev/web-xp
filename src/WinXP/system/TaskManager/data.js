// Task Manager static data + helpers: the classic XP process table, the
// window-title → image-name mapping, and number formatting.

export const SPEEDS = { High: 500, Normal: 1000, Low: 4000 };

export const TABS = [
  { key: 'applications', label: 'Applications' },
  { key: 'processes', label: 'Processes' },
  { key: 'performance', label: 'Performance' },
  { key: 'networking', label: 'Networking' },
  { key: 'users', label: 'Users' },
];

// The processes every XP box shows, whether or not anything is running.
export const STATIC_PROCESSES = [
  { name: 'System Idle Process', user: 'SYSTEM', memK: 28 },
  { name: 'System', user: 'SYSTEM', memK: 236 },
  { name: 'smss.exe', user: 'SYSTEM', memK: 388 },
  { name: 'csrss.exe', user: 'SYSTEM', memK: 3844 },
  { name: 'winlogon.exe', user: 'SYSTEM', memK: 4620 },
  { name: 'services.exe', user: 'SYSTEM', memK: 4144 },
  { name: 'lsass.exe', user: 'SYSTEM', memK: 6240 },
  { name: 'svchost.exe', user: 'SYSTEM', memK: 4996 },
  { name: 'svchost.exe', user: 'NETWORK SERVICE', memK: 4232 },
  { name: 'svchost.exe', user: 'SYSTEM', memK: 21284 },
  { name: 'svchost.exe', user: 'NETWORK SERVICE', memK: 3448 },
  { name: 'svchost.exe', user: 'LOCAL SERVICE', memK: 4736 },
  { name: 'spoolsv.exe', user: 'SYSTEM', memK: 5732 },
  { name: 'explorer.exe', user: null, memK: 18664 },
  { name: 'wuauclt.exe', user: null, memK: 6244 },
  { name: 'taskmgr.exe', user: null, memK: 4576 },
];

// Keyword → image name for windows the shell has open. Explorer windows and
// the Recycle Bin live inside explorer.exe, so they map to null (no own row).
const EXE_KEYWORDS = [
  ['notepad', 'notepad.exe'],
  ['paint', 'mspaint.exe'],
  ['minesweeper', 'winmine.exe'],
  ['internet explorer', 'iexplore.exe'],
  ['internetexplorer', 'iexplore.exe'],
  ['windows media player', 'wmplayer.exe'],
  ['media player', 'mplayer2.exe'],
  ['winamp', 'winamp.exe'],
  ['pinball', 'pinball.exe'],
  ['voltorb', 'voltorbflip.exe'],
  ['pictochat', 'pictochat.exe'],
  ['tour', 'tour.exe'],
  ['???', 'ROOM_MAN.exe'],
  ['task manager', null],
  ['my computer', null],
  ['recycle bin', null],
  ['local disk', null],
  ['documents', null],
];

/** Map an open window's title to a process image name (null = no own row). */
export function mapWindowExe(title) {
  const t = String(title || '');
  // cmd windows are titled with the full path (or a custom `title` string)
  if (/\\/.test(t) && /\.exe$/i.test(t)) {
    return t
      .split('\\')
      .pop()
      .toLowerCase();
  }
  const lower = t.toLowerCase();
  for (const [kw, exe] of EXE_KEYWORDS) {
    if (lower.includes(kw)) return exe;
  }
  const word = (lower.match(/[a-z0-9]+/g) || []).pop();
  return word ? `${word}.exe` : null;
}

export function fmtK(n) {
  return Math.max(0, Math.round(n)).toLocaleString('en-US');
}

/** Stable pseudo-random memory footprint for a window id. */
export function seededMemK(id) {
  const h = (Number(id) + 7) * 2654435761;
  return 3200 + (Math.abs(h) % 18000);
}
