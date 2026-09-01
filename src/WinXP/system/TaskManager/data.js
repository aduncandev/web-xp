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

/*
 * Title keywords for the windows that are NOT registered programs.
 *
 * Every registered program's window carries its own exe path now, so this
 * is only reached by the shell's own surfaces — folder windows, My
 * Computer, the Recycle Bin — which live inside explorer.exe and get no
 * process row of their own. There used to be a row here for each program
 * too, which meant adding an app also meant teaching Task Manager to
 * recognise its window title.
 */
const EXE_KEYWORDS = [
  ['my computer', null],
  ['recycle bin', null],
  ['local disk', null],
  ['documents', null],
];

// Programs that already appear in the static process list above, so an
// open window of theirs must not add a second row.
const ALREADY_LISTED = new Set(['taskmgr.exe']);

/**
 * Map an open window to a process image name (null = no own row).
 *
 * Prefers the exe path the shell publishes with each window. The title
 * keywords below are the fallback for shell surfaces — folder windows, My
 * Computer, the Recycle Bin — which are not registry programs and live
 * inside explorer.exe. Accepts a bare title string too, for callers that
 * only have one.
 */
export function mapWindowExe(win) {
  const w = typeof win === 'string' ? { title: win } : win || {};
  const t = String(w.title || '');

  // cmd windows are titled with the full path (or a custom `title` string)
  if (/\\/.test(t) && /\.exe$/i.test(t)) {
    return t
      .split('\\')
      .pop()
      .toLowerCase();
  }

  if (w.exePath) {
    const image = String(w.exePath)
      .split('/')
      .pop();
    return ALREADY_LISTED.has(image.toLowerCase()) ? null : image;
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
