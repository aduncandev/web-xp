// cmd.exe command engine — parses and executes commands against the VFS.
// executeInput() is async and returns:
//   { lines: string[], cwd, driveCwds, cls?: bool, prompt?: { message, onAnswer } }
// Effects (launching programs, closing, title, colors) go through env callbacks.

import {
  normalizePath,
  getParentPath,
  getBaseName,
  getExtension,
  joinPath,
  displayPath,
} from '../../../context/vfsUtils';
import { getCurrentUserName } from '../../../context/users';
import {
  STATIC_PROCESSES,
  mapWindowExe,
  seededMemK,
} from '../../system/TaskManager/data';

export const BANNER = [
  'Microsoft Windows XP [Version 5.1.2600]',
  '(C) Copyright 1985-2001 Microsoft Corp.',
  '',
];

export const DEFAULT_COLORS = { bg: '#000000', fg: '#C0C0C0' };

const VOLUME_SERIAL = '1CD8-9A2C';

// Classic 16-color console palette (color XY)
const PALETTE = {
  0: '#000000',
  1: '#000080',
  2: '#008000',
  3: '#008080',
  4: '#800000',
  5: '#800080',
  6: '#808000',
  7: '#C0C0C0',
  8: '#808080',
  9: '#0000FF',
  A: '#00FF00',
  B: '#00FFFF',
  C: '#FF0000',
  D: '#FF00FF',
  E: '#FFFF00',
  F: '#FFFFFF',
};

const NOT_RECOGNIZED = name =>
  `'${name}' is not recognized as an internal or external command,\noperable program or batch file.`;
const PATH_NOT_FOUND = 'The system cannot find the path specified.';
const FILE_NOT_FOUND = 'The system cannot find the file specified.';
const ACCESS_DENIED = 'Access is denied.';

const HELP_TABLE = [
  ['ASSOC', 'Displays or modifies file extension associations.'],
  ['ATTRIB', 'Displays file attributes.'],
  ['CD', 'Displays the name of or changes the current directory.'],
  ['CLS', 'Clears the screen.'],
  ['COLOR', 'Sets the default console foreground and background colors.'],
  ['COPY', 'Copies one or more files to another location.'],
  ['DATE', 'Displays the date.'],
  ['DEL', 'Deletes one or more files.'],
  ['DIR', 'Displays a list of files and subdirectories in a directory.'],
  ['ECHO', 'Displays messages. Supports > and >> redirection.'],
  ['EXIT', 'Quits the CMD.EXE program (command interpreter).'],
  ['FIND', 'Searches for a text string in files or piped input.'],
  ['FINDSTR', 'Searches for strings (regex) in files or piped input.'],
  ['FTYPE', 'Displays or modifies file types used in associations.'],
  ['GETMAC', 'Displays the MAC address of the network adapter.'],
  ['HELP', 'Provides Help information for Windows XP commands.'],
  ['HOSTNAME', 'Displays the name of the computer.'],
  ['IPCONFIG', 'Displays IP configuration. /ALL for full detail.'],
  ['MD', 'Creates a directory.'],
  ['MORE', 'Displays output one screen at a time (works with |).'],
  ['MOVE', 'Moves one or more files from one directory to another.'],
  ['NETSTAT', 'Displays active network connections.'],
  ['NSLOOKUP', 'Looks up the IP address of a host name.'],
  ['PATH', 'Displays the command search path.'],
  ['PING', 'Sends ICMP echo requests to a host.'],
  ['RD', 'Removes a directory.'],
  ['REN', 'Renames a file or files.'],
  ['SET', 'Displays Windows environment variables.'],
  ['SHUTDOWN', 'Shuts down, restarts, or logs off (/s /r /l /a).'],
  ['SORT', 'Sorts input alphabetically (works with |).'],
  ['START', 'Starts a separate window to run a specified program or command.'],
  ['SYSTEMINFO', 'Displays detailed system configuration.'],
  ['TASKKILL', 'Ends a task by PID (/PID) or image name (/IM). /F to force.'],
  ['TASKLIST', 'Lists the running processes.'],
  ['TIME', 'Displays the system time.'],
  ['TITLE', 'Sets the window title for a CMD.EXE session.'],
  ['TRACERT', 'Traces the route to a host.'],
  ['TREE', 'Graphically displays the directory structure of a drive or path.'],
  ['TYPE', 'Displays the contents of a text file.'],
  ['VER', 'Displays the Windows XP version.'],
  ['VOL', 'Displays a disk volume label and serial number.'],
  ['WHERE', 'Locates a program or file.'],
  ['WHOAMI', 'Displays the current user name.'],
];

// --- Path helpers ---

/** Internal "C:/x/y" → display "C:\x\y" */
export function toWin(p) {
  return displayPath(p);
}

/**
 * Resolve user input (relative/absolute, \ or /, quotes) to an absolute
 * normalized internal path, collapsing . and .. segments.
 */
export function resolveInputPath(sh, raw) {
  let p = String(raw || '')
    .replace(/"/g, '')
    .replace(/\\/g, '/')
    .trim();
  if (!p) return sh.cwd;
  if (/^[A-Za-z]:$/.test(p)) {
    const letter = p[0].toUpperCase();
    return sh.driveCwds[letter] || `${letter}:/`;
  }
  let abs;
  if (/^[A-Za-z]:\//.test(p)) {
    abs = p[0].toUpperCase() + p.slice(1);
  } else if (p.startsWith('/')) {
    abs = sh.cwd.slice(0, 2) + p;
  } else {
    abs = joinPath(sh.cwd, p);
  }
  abs = normalizePath(abs);
  const drive = abs.slice(0, 2);
  const parts = abs
    .slice(3)
    .split('/')
    .filter(s => s !== '' && s !== '.');
  const stack = [];
  for (const part of parts) {
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.length ? `${drive}/${stack.join('/')}` : `${drive}/`;
}

function hasWildcard(s) {
  return /[*?]/.test(s);
}

function wildcardToRegExp(pattern) {
  if (pattern === '*.*' || pattern === '*') return /^.*$/;
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `^${esc.replace(/\*/g, '[^/]*').replace(/\?/g, '.')}$`,
    'i',
  );
}

function isDirNode(node) {
  return node && (node.type === 'folder' || node.type === 'drive');
}

// --- Formatting helpers ---

function commas(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function fmtDate(ts) {
  const d = new Date(ts || Date.now());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function fmtTime(ts) {
  const d = new Date(ts || Date.now());
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(h).padStart(2, '0')}:${mm} ${ampm}`;
}

// --- Tokenizer ---

function tokenize(str) {
  const tokens = [];
  let cur = '';
  let inQ = false;
  let hadQ = false;
  for (const ch of str) {
    if (ch === '"') {
      inQ = !inQ;
      hadQ = true;
      continue;
    }
    if (!inQ && /\s/.test(ch)) {
      if (cur || hadQ) {
        tokens.push(cur);
        cur = '';
        hadQ = false;
      }
      continue;
    }
    cur += ch;
  }
  if (cur || hadQ) tokens.push(cur);
  return tokens;
}

/** Split "cmd args > target" (or >>) outside quotes. */
function splitRedirect(raw) {
  let inQ = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch === '>') {
      const append = raw[i + 1] === '>';
      return {
        cmd: raw.slice(0, i).trim(),
        target: raw.slice(i + (append ? 2 : 1)).trim(),
        append,
      };
    }
  }
  return { cmd: raw.trim(), target: null, append: false };
}

/** Split a line on & / && outside quotes. */
function splitCommands(raw) {
  const parts = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') inQ = !inQ;
    if (!inQ && ch === '&') {
      if (raw[i + 1] === '&') i++;
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map(s => s.trim()).filter(s => s.length > 0);
}

/** Split a command line on | outside quotes into pipeline stages. */
function splitPipes(raw) {
  const parts = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') inQ = !inQ;
    if (!inQ && ch === '|') {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map(s => s.trim()).filter(s => s.length > 0);
}

// --- Commands ---

function cmdCd(sh, rest) {
  const switchDrive = /^\/d(\s|$)/i.test(rest.trim());
  const arg = rest.trim().replace(/^\/d\s*/i, '');
  if (!arg) return [toWin(sh.cwd)];

  // `cd D:` prints that drive's current directory without switching
  const bare = arg.replace(/"/g, '').trim();
  if (/^[A-Za-z]:$/.test(bare)) {
    const letter = bare[0].toUpperCase();
    if (!sh.vfs.findNodeCI(`${letter}:/`))
      return ['The system cannot find the drive specified.'];
    return [toWin(sh.driveCwds[letter] || `${letter}:/`)];
  }

  const target = resolveInputPath(sh, arg);
  const node = sh.vfs.findNodeCI(target);
  if (!node) return [PATH_NOT_FOUND];
  if (!isDirNode(node)) return ['The directory name is invalid.'];

  const canonical = node.path;
  const drive = canonical[0].toUpperCase();
  const cwdDrive = sh.cwd[0].toUpperCase();
  sh.driveCwds[drive] = canonical;
  if (drive === cwdDrive || switchDrive) sh.cwd = canonical;
  return [];
}

function cmdDriveSwitch(sh, letterRaw) {
  const letter = letterRaw.toUpperCase();
  const root = `${letter}:/`;
  if (!sh.vfs.findNodeCI(root))
    return ['The system cannot find the drive specified.'];
  sh.cwd = sh.driveCwds[letter] || root;
  sh.driveCwds[letter] = sh.cwd;
  return [];
}

function driveHeaderLines(sh, dirPath) {
  const letter = dirPath.slice(0, 1).toUpperCase();
  const driveNode = sh.vfs.findNodeCI(`${letter}:/`);
  const label = driveNode?.driveLabel;
  return [
    label
      ? ` Volume in drive ${letter} is ${label}`
      : ` Volume in drive ${letter} has no label.`,
    ` Volume Serial Number is ${VOLUME_SERIAL}`,
  ];
}

function dirEntryLine(node) {
  const stamp = `${fmtDate(node.modifiedAt)}  ${fmtTime(node.modifiedAt)}`;
  if (isDirNode(node)) {
    return `${stamp}    <DIR>          ${node.name}`;
  }
  return `${stamp}    ${commas(node.size || 0).padStart(14)} ${node.name}`;
}

function freeBytes(sh, dirPath) {
  const letter = dirPath.slice(0, 1).toUpperCase();
  const driveNode = sh.vfs.findNodeCI(`${letter}:/`);
  return driveNode?.freeSpace ?? 0;
}

function cmdDir(sh, tokens) {
  const flags = tokens.filter(t => t.startsWith('/')).map(t => t.toLowerCase());
  const showHidden = flags.some(f => f.startsWith('/a'));
  const args = tokens.filter(t => !t.startsWith('/'));
  const arg = args[0] || '';

  let dirPath = sh.cwd;
  let pattern = '*';
  if (arg) {
    const resolved = resolveInputPath(sh, arg);
    const node = sh.vfs.findNodeCI(resolved);
    if (node && isDirNode(node)) {
      dirPath = node.path;
    } else if (node) {
      dirPath = getParentPath(node.path) || sh.cwd;
      pattern = node.name;
    } else {
      const parent = getParentPath(resolved);
      const parentNode = parent && sh.vfs.findNodeCI(parent);
      if (!parentNode || !isDirNode(parentNode)) {
        return ['File Not Found'];
      }
      dirPath = parentNode.path;
      pattern = getBaseName(resolved);
    }
  } else {
    const node = sh.vfs.findNodeCI(sh.cwd);
    if (node) dirPath = node.path;
  }

  const re = wildcardToRegExp(pattern);
  let entries = sh.vfs
    .listDir(dirPath)
    .filter(n => re.test(n.name))
    .filter(n => showHidden || !n.hidden);
  // cmd sorts by name with dirs interleaved (unlike Explorer)
  entries = entries
    .slice()
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );

  const lines = [...driveHeaderLines(sh, dirPath), ''];
  lines.push(` Directory of ${toWin(dirPath)}`);
  lines.push('');

  if (entries.length === 0) {
    lines.push('File Not Found');
    return lines;
  }

  const isRoot = /^[A-Za-z]:\/$/.test(dirPath);
  const dirNode = sh.vfs.findNodeCI(dirPath);
  if (!isRoot && pattern === '*') {
    const stamp = `${fmtDate(dirNode?.modifiedAt)}  ${fmtTime(
      dirNode?.modifiedAt,
    )}`;
    lines.push(`${stamp}    <DIR>          .`);
    lines.push(`${stamp}    <DIR>          ..`);
  }

  let fileCount = 0;
  let dirCount = isRoot || pattern !== '*' ? 0 : 2;
  let byteTotal = 0;
  for (const node of entries) {
    lines.push(dirEntryLine(node));
    if (isDirNode(node)) dirCount++;
    else {
      fileCount++;
      byteTotal += node.size || 0;
    }
  }
  lines.push(
    `${String(fileCount).padStart(16)} File(s) ${commas(byteTotal).padStart(
      14,
    )} bytes`,
  );
  lines.push(
    `${String(dirCount).padStart(16)} Dir(s)  ${commas(
      freeBytes(sh, dirPath),
    ).padStart(14)} bytes free`,
  );
  return lines;
}

function isTextNode(node) {
  return node && node.type === 'file' && node.content != null;
}

function cmdType(sh, args) {
  if (!args[0]) return ['The syntax of the command is incorrect.'];
  const node = sh.vfs.findNodeCI(resolveInputPath(sh, args[0]));
  if (!node) return [FILE_NOT_FOUND];
  if (isDirNode(node)) return [ACCESS_DENIED];
  if (!isTextNode(node)) {
    // Binary content prints garbage in real cmd
    return [
      'MZ\u2590\u0001\u2666 \u25ba\u2195\u2593L\u2593!This program cannot be run in DOS mode.',
    ];
  }
  return String(node.content).split(/\r?\n/);
}

function ensureFolderChain(sh, path) {
  // Create every missing level (XP command extensions behavior)
  const drive = path.slice(0, 2);
  const parts = path
    .slice(3)
    .split('/')
    .filter(Boolean);
  let cur = `${drive}/`;
  for (const part of parts) {
    const next = joinPath(cur, part);
    const node = sh.vfs.findNodeCI(next);
    if (node) {
      if (!isDirNode(node)) return null;
      cur = node.path;
    } else {
      sh.vfs.createFolder(next);
      cur = next;
    }
  }
  return cur;
}

function cmdMd(sh, args) {
  if (!args[0]) return ['The syntax of the command is incorrect.'];
  const out = [];
  for (const arg of args) {
    const target = resolveInputPath(sh, arg);
    const existing = sh.vfs.findNodeCI(target);
    if (existing) {
      out.push(
        `A subdirectory or file ${arg.replace(/\//g, '\\')} already exists.`,
      );
      continue;
    }
    if (!ensureFolderChain(sh, target)) out.push(PATH_NOT_FOUND);
  }
  return out;
}

function cmdRd(sh, args) {
  if (!args[0]) return ['The syntax of the command is incorrect.'];
  const out = [];
  for (const arg of args.filter(a => !a.startsWith('/'))) {
    const node = sh.vfs.findNodeCI(resolveInputPath(sh, arg));
    if (!node || !isDirNode(node)) {
      out.push(FILE_NOT_FOUND);
      continue;
    }
    if (node.type === 'drive' || node.system) {
      out.push(ACCESS_DENIED);
      continue;
    }
    if (sh.vfs.listDir(node.path).length > 0) {
      out.push('The directory is not empty.');
      continue;
    }
    sh.vfs.deleteNodePermanently(node.path);
  }
  return out;
}

function deletableFilesIn(sh, dirPath, re) {
  return sh.vfs
    .listDir(dirPath)
    .filter(n => !isDirNode(n))
    .filter(n => re.test(n.name));
}

function deleteFiles(sh, files) {
  const out = [];
  for (const node of files) {
    if (node.system || node.readOnly) {
      out.push(toWin(node.path));
      out.push(ACCESS_DENIED);
      continue;
    }
    sh.vfs.deleteNodePermanently(node.path);
  }
  return out;
}

function cmdDel(sh, args) {
  const targets = args.filter(a => !a.startsWith('/'));
  if (targets.length === 0)
    return { lines: ['The syntax of the command is incorrect.'] };

  const lines = [];
  for (const arg of targets) {
    const resolved = resolveInputPath(sh, arg);
    const node = sh.vfs.findNodeCI(resolved);

    // `del <folder>` and `del *` prompt like XP does
    let dirPath = null;
    let promptPattern = null;
    if (node && isDirNode(node)) {
      dirPath = node.path;
      promptPattern = '*';
    } else if (hasWildcard(arg)) {
      const parent = getParentPath(resolved);
      const parentNode = parent && sh.vfs.findNodeCI(parent);
      if (!parentNode || !isDirNode(parentNode)) {
        lines.push(`Could Not Find ${toWin(resolved)}`);
        continue;
      }
      const pattern = getBaseName(resolved);
      if (pattern === '*' || pattern === '*.*') {
        dirPath = parentNode.path;
        promptPattern = pattern;
      } else {
        const files = deletableFilesIn(
          sh,
          parentNode.path,
          wildcardToRegExp(pattern),
        );
        if (files.length === 0) lines.push(`Could Not Find ${toWin(resolved)}`);
        else lines.push(...deleteFiles(sh, files));
        continue;
      }
    } else if (node) {
      lines.push(...deleteFiles(sh, [node]));
      continue;
    } else {
      lines.push(`Could Not Find ${toWin(resolved)}`);
      continue;
    }

    // Prompted deletion of everything in a directory
    const promptDir = dirPath;
    const re = wildcardToRegExp(promptPattern);
    return {
      lines,
      prompt: {
        message: `${toWin(promptDir)}\\*, Are you sure (Y/N)? `,
        onAnswer: answer => {
          if (!/^y(es)?$/i.test(String(answer).trim())) return { lines: [] };
          const files = deletableFilesIn(sh, promptDir, re);
          return { lines: deleteFiles(sh, files) };
        },
      },
    };
  }
  return { lines };
}

async function copyOneFile(sh, srcNode, destPath) {
  // Text files: plain re-create (createFile overwrites case-insensitively)
  if (isTextNode(srcNode) && !srcNode.hasBinaryContent) {
    sh.vfs.createFile(destPath, srcNode.content, srcNode.mimeType);
    return true;
  }
  // Binary blob content
  if (srcNode.hasBinaryContent) {
    const blob = await sh.vfs.readBinaryFile(srcNode.path);
    if (!blob) return false;
    sh.vfs.createFile(destPath, '', srcNode.mimeType);
    await sh.vfs.writeBinaryFile(destPath, blob, srcNode.mimeType);
    return true;
  }
  // Static-asset files (sourceUrl): fetch the asset into a real blob copy
  if (srcNode.sourceUrl) {
    try {
      const res = await fetch(srcNode.sourceUrl);
      const blob = await res.blob();
      sh.vfs.createFile(destPath, '', srcNode.mimeType);
      await sh.vfs.writeBinaryFile(destPath, blob, srcNode.mimeType);
      return true;
    } catch {
      return false;
    }
  }
  // Empty/unknown files copy as empty
  sh.vfs.createFile(destPath, srcNode.content || '', srcNode.mimeType);
  return true;
}

async function cmdCopy(sh, args) {
  const targets = args.filter(a => !a.startsWith('/'));
  if (targets.length === 0)
    return [
      'The syntax of the command is incorrect.',
      '        0 file(s) copied.',
    ];

  const srcRaw = targets[0];
  const destRaw = targets[1] || '.';
  const srcResolved = resolveInputPath(sh, srcRaw);

  let srcFiles = [];
  if (hasWildcard(srcRaw)) {
    const parent = getParentPath(srcResolved);
    const parentNode = parent && sh.vfs.findNodeCI(parent);
    if (parentNode && isDirNode(parentNode)) {
      const re = wildcardToRegExp(getBaseName(srcResolved));
      srcFiles = sh.vfs
        .listDir(parentNode.path)
        .filter(n => !isDirNode(n) && re.test(n.name));
    }
  } else {
    const node = sh.vfs.findNodeCI(srcResolved);
    if (node && !isDirNode(node)) srcFiles = [node];
  }
  if (srcFiles.length === 0)
    return [FILE_NOT_FOUND, '        0 file(s) copied.'];

  const destResolved = resolveInputPath(sh, destRaw);
  const destNode = sh.vfs.findNodeCI(destResolved);
  const destIsDir = destNode && isDirNode(destNode);

  let copied = 0;
  const lines = [];
  for (const src of srcFiles) {
    const destPath = destIsDir
      ? joinPath(destNode.path, src.name)
      : destResolved;
    if (normalizePath(destPath).toLowerCase() === src.path.toLowerCase()) {
      lines.push('The file cannot be copied onto itself.');
      continue;
    }
    const destParent = getParentPath(destPath);
    const destParentNode = destParent && sh.vfs.findNodeCI(destParent);
    if (!destParentNode || !isDirNode(destParentNode)) {
      lines.push(PATH_NOT_FOUND);
      continue;
    }
    const ok = await copyOneFile(
      sh,
      src,
      joinPath(destParentNode.path, getBaseName(destPath)),
    );
    if (ok) copied++;
    else lines.push(ACCESS_DENIED);
  }
  lines.push(`${String(copied).padStart(9)} file(s) copied.`);
  return lines;
}

const DUP_NAME = 'A duplicate file name exists, or the file\ncannot be found.';

function cmdMove(sh, args) {
  const targets = args.filter(a => !a.startsWith('/'));
  if (targets.length < 2)
    return { lines: ['The syntax of the command is incorrect.'] };

  const srcNode = sh.vfs.findNodeCI(resolveInputPath(sh, targets[0]));
  if (!srcNode) return { lines: [FILE_NOT_FOUND] };
  if (srcNode.system || srcNode.readOnly) return { lines: [ACCESS_DENIED] };

  const destResolved = resolveInputPath(sh, targets[1]);
  const destNode = sh.vfs.findNodeCI(destResolved);

  // Work out the destination directory and the final name up front, so
  // collision checks run against the REQUESTED final path (not the
  // transient original-name path a naive move-then-rename would create).
  let destDirPath;
  let finalName;
  if (destNode && isDirNode(destNode)) {
    destDirPath = destNode.path;
    finalName = srcNode.name;
  } else {
    const destParent = getParentPath(destResolved);
    const destParentNode = destParent && sh.vfs.findNodeCI(destParent);
    if (!destParentNode || !isDirNode(destParentNode))
      return { lines: [PATH_NOT_FOUND] };
    destDirPath = destParentNode.path;
    finalName = getBaseName(destResolved);
  }
  const finalPath = joinPath(destDirPath, finalName);
  if (finalPath.toLowerCase() === srcNode.path.toLowerCase())
    return { lines: ['        1 file(s) moved.'] };

  const performMove = () => {
    // Same-directory move is a rename
    if (getParentPath(srcNode.path) === destDirPath) {
      const res = sh.vfs.rename(srcNode.path, finalName);
      return res.ok ? ['        1 file(s) moved.'] : [DUP_NAME];
    }
    // Cross-directory: rename to the final name first so the move lands
    // directly at the requested path; dodge sibling collisions via a temp
    // name, and roll back if the move itself fails.
    let workingPath = srcNode.path;
    let originalName = null;
    if (getBaseName(srcNode.path) !== finalName) {
      const srcDir = getParentPath(srcNode.path);
      const sibling = sh.vfs.findNodeCI(joinPath(srcDir, finalName));
      const tempName =
        sibling && sibling.path.toLowerCase() !== srcNode.path.toLowerCase()
          ? `~mv${Date.now().toString(36)}_${finalName}`
          : finalName;
      const r1 = sh.vfs.rename(srcNode.path, tempName);
      if (!r1.ok) return [DUP_NAME];
      originalName = srcNode.name;
      workingPath = r1.newPath || joinPath(srcDir, tempName);
      if (tempName !== finalName) {
        // Move under the temp name, then take the final name at the dest
        const mv = sh.vfs.move(workingPath, destDirPath, { replace: true });
        if (!mv.ok) {
          sh.vfs.rename(workingPath, originalName);
          return mv.error === 'system' ? [ACCESS_DENIED] : [PATH_NOT_FOUND];
        }
        const r2 = sh.vfs.rename(mv.newPath, finalName);
        return r2.ok ? ['        1 file(s) moved.'] : [DUP_NAME];
      }
    }
    const mv = sh.vfs.move(workingPath, destDirPath, { replace: true });
    if (!mv.ok) {
      if (originalName) sh.vfs.rename(workingPath, originalName);
      if (mv.error === 'system') return [ACCESS_DENIED];
      return [PATH_NOT_FOUND];
    }
    return ['        1 file(s) moved.'];
  };

  // XP move prompts before overwriting an existing file
  const existingAtFinal = sh.vfs.findNodeCI(finalPath);
  if (
    existingAtFinal &&
    existingAtFinal.path.toLowerCase() !== srcNode.path.toLowerCase()
  ) {
    if (isDirNode(existingAtFinal)) return { lines: [ACCESS_DENIED] };
    if (existingAtFinal.system || existingAtFinal.readOnly)
      return { lines: [ACCESS_DENIED] };
    return {
      lines: [],
      prompt: {
        message: `Overwrite ${toWin(finalPath)}? (Yes/No/All): `,
        onAnswer: answer =>
          /^(y(es)?|a(ll)?)$/i.test(String(answer).trim())
            ? { lines: performMove() }
            : { lines: ['        0 file(s) moved.'] },
      },
    };
  }
  return { lines: performMove() };
}

function cmdRen(sh, args) {
  if (args.length < 2) return ['The syntax of the command is incorrect.'];
  if (/[\\/]/.test(args[1])) return ['The syntax of the command is incorrect.'];
  const node = sh.vfs.findNodeCI(resolveInputPath(sh, args[0]));
  if (!node) return [FILE_NOT_FOUND];
  if (node.system) return [ACCESS_DENIED];
  const res = sh.vfs.rename(node.path, args[1]);
  if (!res.ok) {
    if (res.error === 'invalid')
      return [
        'The filename, directory name, or volume label syntax is incorrect.',
      ];
    return ['A duplicate file name exists, or the file\ncannot be found.'];
  }
  return [];
}

function cmdTree(sh, args) {
  const showFiles = args.some(a => /^\/f$/i.test(a));
  const pathArg = args.find(a => !a.startsWith('/'));
  const rootResolved = resolveInputPath(sh, pathArg || '.');
  const rootNode = sh.vfs.findNodeCI(rootResolved);
  if (!rootNode || !isDirNode(rootNode))
    return [
      'Invalid path - ' + toWin(rootResolved),
      'No subfolders exist ',
      '',
    ];

  const lines = [
    'Folder PATH listing',
    `Volume serial number is ${VOLUME_SERIAL}`,
  ];
  const isCwd = rootNode.path === sh.cwd;
  lines.push(isCwd ? `${rootNode.path.slice(0, 2)}.` : toWin(rootNode.path));

  const walk = (dirPath, prefix) => {
    const kids = sh.vfs.listDir(dirPath).filter(n => !n.hidden);
    const dirs = kids.filter(isDirNode);
    const files = kids.filter(n => !isDirNode(n));
    if (showFiles) {
      for (const f of files) {
        lines.push(`${prefix}${dirs.length ? '|' : ' '}       ${f.name}`);
      }
      if (files.length) lines.push(`${prefix}${dirs.length ? '|' : ' '}`);
    }
    dirs.forEach((d, i) => {
      const last = i === dirs.length - 1;
      lines.push(`${prefix}${last ? '\\---' : '+---'}${d.name}`);
      walk(d.path, prefix + (last ? '    ' : '|   '));
    });
  };
  walk(rootNode.path, '');
  return lines;
}

function cmdAttrib(sh, args) {
  const pathArg = args.find(a => !a.startsWith('/'));
  let dirPath = sh.cwd;
  let re = /^.*$/;
  if (pathArg) {
    const resolved = resolveInputPath(sh, pathArg);
    const node = sh.vfs.findNodeCI(resolved);
    if (node && isDirNode(node)) dirPath = node.path;
    else {
      const parent = getParentPath(resolved);
      const parentNode = parent && sh.vfs.findNodeCI(parent);
      if (!parentNode) return [`File not found - ${toWin(resolved)}`];
      dirPath = parentNode.path;
      re = wildcardToRegExp(getBaseName(resolved));
    }
  }
  const files = sh.vfs
    .listDir(dirPath)
    .filter(n => !isDirNode(n) && re.test(n.name));
  if (files.length === 0) return [`File not found - ${toWin(dirPath)}`];
  return files.map(n => {
    const s = n.system ? 'S' : ' ';
    const h = n.hidden ? 'H' : ' ';
    const r = n.readOnly ? 'R' : ' ';
    return `A  ${s}${h}${r}     ${toWin(n.path)}`;
  });
}

function fakeEnvVars() {
  const user = getCurrentUserName() || 'Skillz';
  // DOS 8.3 short name, like the real TEMP path shows
  const short =
    user.length > 8
      ? `${user.slice(0, 6).toUpperCase()}~1`
      : user.toUpperCase();
  return [
    'ALLUSERSPROFILE=C:\\Documents and Settings\\All Users',
    `APPDATA=C:\\Documents and Settings\\${user}\\Application Data`,
    'CommonProgramFiles=C:\\Program Files\\Common Files',
    'COMPUTERNAME=SKILLZ-XP',
    'ComSpec=C:\\WINDOWS\\system32\\cmd.exe',
    'HOMEDRIVE=C:',
    `HOMEPATH=\\Documents and Settings\\${user}`,
    'NUMBER_OF_PROCESSORS=1',
    'OS=Windows_NT',
    'Path=C:\\WINDOWS\\system32;C:\\WINDOWS',
    'PATHEXT=.COM;.EXE;.BAT;.CMD;.VBS;.JS',
    'ProgramFiles=C:\\Program Files',
    'PROMPT=$P$G',
    'SystemDrive=C:',
    'SystemRoot=C:\\WINDOWS',
    `TEMP=C:\\DOCUME~1\\${short}\\LOCALS~1\\Temp`,
    `TMP=C:\\DOCUME~1\\${short}\\LOCALS~1\\Temp`,
    'USERDOMAIN=SKILLZ-XP',
    `USERNAME=${user}`,
    `USERPROFILE=C:\\Documents and Settings\\${user}`,
    'windir=C:\\WINDOWS',
  ];
}

function cmdSet(sh, rest) {
  const vars = fakeEnvVars();
  const q = rest.trim();
  if (!q) return vars;
  const matches = vars.filter(v => v.toLowerCase().startsWith(q.toLowerCase()));
  if (matches.length === 0) return [`Environment variable ${q} not defined`];
  return matches;
}

/** Resolve a bare program name / exe path → node path, or null. */
function resolveProgram(sh, token) {
  const tries = [];
  const clean = token.replace(/"/g, '');
  const withExe = getExtension(clean) ? [clean] : [clean, `${clean}.exe`];
  for (const t of withExe) {
    tries.push(resolveInputPath(sh, t));
    if (!/[\\/]/.test(t)) {
      tries.push(`C:/WINDOWS/system32/${t}`);
      tries.push(`C:/WINDOWS/${t}`);
    }
  }
  for (const p of tries) {
    const node = sh.vfs.findNodeCI(p);
    if (node && node.type === 'file' && getExtension(node.path) === '.exe') {
      return node.path;
    }
  }
  return null;
}

function cmdStart(sh, args, env) {
  const targets = args.filter(a => !a.startsWith('/'));
  if (targets.length === 0) {
    if (env.onShellOpen) env.onShellOpen('C:/WINDOWS/system32/cmd.exe');
    return [];
  }
  const arg = targets[0];
  if (/^https?:\/\//i.test(arg)) {
    if (env.onShellOpen) env.onShellOpen(arg);
    return [];
  }
  const resolved = resolveInputPath(sh, arg);
  const node = sh.vfs.findNodeCI(resolved);
  if (node) {
    if (env.onShellOpen) env.onShellOpen(node.path);
    return [];
  }
  const program = resolveProgram(sh, arg);
  if (program) {
    if (env.onShellOpen) env.onShellOpen(program);
    return [];
  }
  return [`The system cannot find the file ${arg}.`];
}

function cmdHelp(args) {
  const q = (args[0] || '').toUpperCase();
  if (q) {
    const row = HELP_TABLE.find(([name]) => name === q);
    if (row) return [row[1]];
    return [
      `This command is not supported by the help utility.  Try "${q.toLowerCase()} /?".`,
    ];
  }
  return [
    'For more information on a specific command, type HELP command-name',
    ...HELP_TABLE.map(([name, desc]) => `${name.padEnd(12)}${desc}`),
  ];
}

function weekday(d) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

function cmdDate(args) {
  const d = new Date();
  const stamp = `${weekday(d)} ${fmtDate(d.getTime())}`;
  if (args.some(a => /^\/t$/i.test(a))) return { lines: [stamp] };
  return {
    lines: [`The current date is: ${stamp}`],
    prompt: {
      message: 'Enter the new date: (mm-dd-yy) ',
      onAnswer: ans =>
        String(ans).trim()
          ? { lines: ['The system cannot accept the date entered.'] }
          : { lines: [] },
    },
  };
}

function cmdTime(args) {
  const d = new Date();
  if (args.some(a => /^\/t$/i.test(a)))
    return { lines: [fmtTime(d.getTime())] };
  const h = d.getHours();
  const stamp = `${h}:${String(d.getMinutes()).padStart(2, '0')}:${String(
    d.getSeconds(),
  ).padStart(2, '0')}.${String(Math.floor(d.getMilliseconds() / 10)).padStart(
    2,
    '0',
  )}`;
  return {
    lines: [`The current time is: ${stamp}`],
    prompt: {
      message: 'Enter the new time: ',
      onAnswer: ans =>
        String(ans).trim()
          ? { lines: ['The system cannot accept the time entered.'] }
          : { lines: [] },
    },
  };
}

// ===================================================================
// System / network / process commands + pipe filters (added 2026-08-23)
// ===================================================================

const COMPUTER_NAME = 'SKILLZ-XP';
const LOCAL_IP = '192.168.1.101';
const GATEWAY = '192.168.1.1';
const SUBNET = '255.255.255.0';
const DHCP_SERVER = '192.168.1.1';
const DNS1 = '192.168.1.1';
const MAC = '00-1A-4B-7C-9D-2E';

/** Deterministic public-looking IP for a host name (so ping "resolves"). */
function resolveHostIp(host) {
  const h = String(host || '').toLowerCase();
  if (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === COMPUTER_NAME.toLowerCase()
  )
    return '127.0.0.1';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return h;
  let a = 0;
  for (let i = 0; i < h.length; i++) a = (a * 31 + h.charCodeAt(i)) >>> 0;
  const o1 = [142, 172, 173, 204, 216, 74][a % 6];
  return `${o1}.${(a >> 8) % 250}.${(a >> 16) % 250}.${(a % 250) + 1}`;
}

function cmdHostname() {
  return [COMPUTER_NAME];
}

function cmdWhoami(args) {
  const user = (getCurrentUserName() || 'user').toLowerCase();
  if (args.some(a => /^\/user$/i.test(a))) {
    return [
      '',
      'USER INFORMATION',
      '----------------',
      '',
      'User Name        SID',
      '================ =============================================',
      `${COMPUTER_NAME.toLowerCase()}\\${user} S-1-5-21-1409082233-1364589140-1177238915-1003`,
    ];
  }
  return [`${COMPUTER_NAME.toLowerCase()}\\${user}`];
}

function cmdIpconfig(args) {
  const all = args.some(a => /^\/all$/i.test(a));
  if (!all) {
    return [
      '',
      'Windows IP Configuration',
      '',
      '',
      'Ethernet adapter Local Area Connection:',
      '',
      '        Connection-specific DNS Suffix  . : ',
      `        IP Address. . . . . . . . . . . . : ${LOCAL_IP}`,
      `        Subnet Mask . . . . . . . . . . . : ${SUBNET}`,
      `        Default Gateway . . . . . . . . . : ${GATEWAY}`,
      '',
    ];
  }
  const now = new Date();
  const lease = t => `${fmtDate(t)} ${fmtTime(t).replace(/\.\d+$/, '')}`;
  return [
    '',
    'Windows IP Configuration',
    '',
    `        Host Name . . . . . . . . . . . . : ${COMPUTER_NAME.toLowerCase()}`,
    '        Primary Dns Suffix  . . . . . . . : ',
    '        Node Type . . . . . . . . . . . . : Unknown',
    '        IP Routing Enabled. . . . . . . . : No',
    '        WINS Proxy Enabled. . . . . . . . : No',
    '',
    'Ethernet adapter Local Area Connection:',
    '',
    '        Connection-specific DNS Suffix  . : ',
    '        Description . . . . . . . . . . . : Realtek RTL8139 Family PCI Fast Ethernet NIC',
    `        Physical Address. . . . . . . . . : ${MAC}`,
    '        Dhcp Enabled. . . . . . . . . . . : Yes',
    '        Autoconfiguration Enabled . . . . : Yes',
    `        IP Address. . . . . . . . . . . . : ${LOCAL_IP}`,
    `        Subnet Mask . . . . . . . . . . . : ${SUBNET}`,
    `        Default Gateway . . . . . . . . . : ${GATEWAY}`,
    `        DHCP Server . . . . . . . . . . . : ${DHCP_SERVER}`,
    `        DNS Servers . . . . . . . . . . . : ${DNS1}`,
    `        Lease Obtained. . . . . . . . . . : ${lease(
      now.getTime() - 36e5,
    )}`,
    `        Lease Expires . . . . . . . . . . : ${lease(
      now.getTime() + 6 * 36e5,
    )}`,
    '',
  ];
}

function cmdPing(sh, args) {
  const host = args.find(a => !a.startsWith('-') && !a.startsWith('/'));
  if (!host) {
    return ['', 'Usage: ping [-t] [-a] [-n count] [-l size] target_name', ''];
  }
  const nArg = args.findIndex(a => /^-n$/i.test(a));
  let count = 4;
  if (nArg >= 0 && args[nArg + 1])
    count = Math.min(20, Math.max(1, parseInt(args[nArg + 1], 10) || 4));
  const ip = resolveHostIp(host);
  const times = [];
  const out = ['', `Pinging ${host} [${ip}] with 32 bytes of data:`, ''];
  for (let i = 0; i < count; i++) {
    const t = ip === '127.0.0.1' ? 0 : Math.floor(Math.random() * 4);
    times.push(t);
    out.push(
      `Reply from ${ip}: bytes=32 time${t === 0 ? '<1ms' : `=${t}ms`} TTL=128`,
    );
  }
  const min = Math.min(...times);
  const max = Math.max(...times);
  const avg = Math.round(times.reduce((s, x) => s + x, 0) / times.length);
  out.push(
    '',
    `Ping statistics for ${ip}:`,
    `    Packets: Sent = ${count}, Received = ${count}, Lost = 0 (0% loss),`,
    'Approximate round trip times in milli-seconds:',
    `    Minimum = ${min}ms, Maximum = ${max}ms, Average = ${avg}ms`,
    '',
  );
  return out;
}

function cmdTracert(args) {
  const host = args.find(a => !a.startsWith('-') && !a.startsWith('/'));
  if (!host)
    return ['', 'Usage: tracert [-d] [-h maximum_hops] target_name', ''];
  const ip = resolveHostIp(host);
  const out = [
    '',
    `Tracing route to ${host} [${ip}]`,
    'over a maximum of 30 hops:',
    '',
  ];
  const hops = [GATEWAY, '10.0.0.1', '68.87.64.1', '4.68.63.157', ip];
  hops.forEach((hop, i) => {
    const t = () => `${1 + Math.floor(Math.random() * 40)} ms`;
    out.push(
      `${String(i + 1).padStart(3)}    ${t().padStart(5)}  ${t().padStart(
        5,
      )}  ${t().padStart(5)}  ${hop}`,
    );
  });
  out.push('', 'Trace complete.', '');
  return out;
}

function cmdNslookup(args) {
  const host = args.find(a => !a.startsWith('-'));
  if (!host) return ['Default Server:  UnKnown', `Address:  ${DNS1}`, ''];
  return [
    'Server:  UnKnown',
    `Address:  ${DNS1}`,
    '',
    'Non-authoritative answer:',
    `Name:    ${String(host).toLowerCase()}`,
    `Address:  ${resolveHostIp(host)}`,
    '',
  ];
}

function cmdNetstat(args) {
  const out = [
    '',
    'Active Connections',
    '',
    '  Proto  Local Address          Foreign Address        State',
  ];
  const conns = [
    ['TCP', `${LOCAL_IP}:1039`, '64.233.187.104:80', 'ESTABLISHED'],
    ['TCP', `${LOCAL_IP}:1040`, '207.46.19.190:443', 'ESTABLISHED'],
    ['TCP', `${LOCAL_IP}:1041`, '17.253.144.10:80', 'TIME_WAIT'],
    [
      'TCP',
      `${COMPUTER_NAME.toLowerCase()}:epmap`,
      `${COMPUTER_NAME.toLowerCase()}:0`,
      'LISTENING',
    ],
  ];
  conns.forEach(([p, l, f, s]) => {
    out.push(`  ${p.padEnd(6)} ${l.padEnd(22)} ${f.padEnd(22)} ${s}`);
  });
  out.push('');
  return out;
}

function cmdGetmac() {
  return [
    '',
    'Physical Address    Transport Name',
    '=================== ==========================================================',
    `${MAC}   \\Device\\Tcpip_{2F8A1B3C-4D5E-6789-ABCD-EF0123456789}`,
    '',
  ];
}

function cmdVol(sh, args) {
  const letter = (args[0] || sh.cwd[0]).toUpperCase().replace(':', '');
  const drive = sh.vfs.findNodeCI(`${letter}:/`);
  const label = drive && drive.driveLabel ? drive.driveLabel : '';
  return [
    ` Volume in drive ${letter} is ${label || 'Local Disk'}`,
    ` Volume Serial Number is 1C4D-93A7`,
  ];
}

function cmdPath() {
  return ['PATH=C:\\WINDOWS\\system32;C:\\WINDOWS;C:\\WINDOWS\\System32\\Wbem'];
}

function cmdSysteminfo() {
  const now = new Date();
  const install = new Date(now.getTime() - 47 * 864e5);
  const boot = new Date(now.getTime() - 3 * 36e5 - 12 * 6e4);
  const up = now.getTime() - boot.getTime();
  const upH = Math.floor(up / 36e5);
  const upM = Math.floor((up % 36e5) / 6e4);
  const stamp = d =>
    `${fmtDate(d.getTime())}, ${fmtTime(d.getTime()).replace(/\.\d+$/, '')}`;
  return [
    '',
    `Host Name:                 ${COMPUTER_NAME}`,
    'OS Name:                   Microsoft Windows XP Professional',
    'OS Version:                5.1.2600 Service Pack 3 Build 2600',
    'OS Manufacturer:           Microsoft Corporation',
    'OS Configuration:          Standalone Workstation',
    'OS Build Type:             Uniprocessor Free',
    `Registered Owner:          ${getCurrentUserName() || 'user'}`,
    'Registered Organization:   ',
    'Product ID:                55274-640-8177041-23837',
    `Original Install Date:     ${stamp(install)}`,
    `System Up Time:            0 Days, ${upH} Hours, ${upM} Minutes, 0 Seconds`,
    'System Manufacturer:       System manufacturer',
    'System Model:              System Product Name',
    'System Type:               X86-based PC',
    'Processor(s):              1 Processor(s) Installed.',
    '                           [01]: x86 Family 15 Model 2 Stepping 9 GenuineIntel ~2400 Mhz',
    'BIOS Version:              American Megatrends Inc. 080012 , 4/2/2004',
    'Windows Directory:         C:\\WINDOWS',
    'System Directory:          C:\\WINDOWS\\system32',
    'Boot Device:               \\Device\\HarddiskVolume1',
    'System Locale:             en-us;English (United States)',
    'Input Locale:              en-us;English (United States)',
    'Time Zone:                 (GMT-08:00) Pacific Time (US & Canada)',
    'Total Physical Memory:     2,048 MB',
    'Available Physical Memory: 1,417 MB',
    'Virtual Memory: Max Size:  2,433 MB',
    'Virtual Memory: Available: 2,140 MB',
    'Virtual Memory: In Use:    293 MB',
    'Page File Location(s):     C:\\pagefile.sys',
    'Domain:                    WORKGROUP',
    `Logon Server:              \\\\${COMPUTER_NAME}`,
    'Hotfix(s):                 N/A',
    'NetWork Card(s):           1 NIC(s) Installed.',
    '                           [01]: Realtek RTL8139 Family PCI Fast Ethernet NIC',
    `                                 Connection Name: Local Area Connection`,
    `                                 DHCP Enabled:    Yes`,
    `                                 IP address(es)`,
    `                                 [01]: ${LOCAL_IP}`,
    '',
  ];
}

// --- Live process table (static XP processes + open windows) ---

/** A stable PID for an open window. */
function windowPid(id) {
  return 2000 + (Number(id) % 8000) * 4;
}

const STATIC_PIDS = [
  0,
  4,
  520,
  596,
  620,
  664,
  676,
  856,
  924,
  1024,
  1096,
  1164,
  1384,
  1520,
  1873,
  1932,
];

function processRows(env) {
  const rows = STATIC_PROCESSES.map((p, i) => ({
    name: p.name,
    pid: STATIC_PIDS[i] != null ? STATIC_PIDS[i] : 1000 + i,
    user: p.user || getCurrentUserName() || 'user',
    memK: p.memK,
    windowId: null,
  }));
  const wins = (env.windows || []).filter(
    w => !/task manager/i.test(w.title || ''),
  );
  for (const w of wins) {
    const name = mapWindowExe(w);
    if (!name) continue;
    rows.push({
      name,
      pid: windowPid(w.id),
      user: getCurrentUserName() || 'user',
      memK: seededMemK(w.id),
      windowId: w.id,
    });
  }
  return rows;
}

function cmdTasklist(env) {
  const rows = processRows(env);
  const out = [
    '',
    'Image Name                   PID Session Name     Session#    Mem Usage',
    '========================= ======== ================ ========== ============',
  ];
  for (const r of rows) {
    const mem = `${commas(r.memK)} K`;
    out.push(
      `${r.name.slice(0, 25).padEnd(25)} ${String(r.pid).padStart(
        8,
      )} Console          ${'0'.padStart(10)} ${mem.padStart(12)}`,
    );
  }
  out.push('');
  return out;
}

function cmdTaskkill(env, args) {
  const force = args.some(a => /^\/f$/i.test(a));
  const pidIdx = args.findIndex(a => /^\/pid$/i.test(a));
  const imIdx = args.findIndex(a => /^\/im$/i.test(a));
  const rows = processRows(env);

  if (pidIdx >= 0) {
    const pid = parseInt(args[pidIdx + 1], 10);
    const row = rows.find(r => r.pid === pid);
    if (!row) return [`ERROR: The process "${args[pidIdx + 1]}" not found.`];
    if (row.windowId == null)
      return [
        `ERROR: The process with PID ${pid} could not be terminated.`,
        'Reason: Access is denied.',
      ];
    if (env.killWindow) env.killWindow(row.windowId, force);
    return force
      ? [`SUCCESS: The process with PID ${pid} has been terminated.`]
      : [`SUCCESS: Sent termination signal to the process with PID ${pid}.`];
  }

  if (imIdx >= 0) {
    const im = (args[imIdx + 1] || '').toLowerCase();
    if (!im) return ['ERROR: Invalid argument/option - specify an image name.'];
    const re = new RegExp(
      '^' + im.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
      'i',
    );
    const matches = rows.filter(r => re.test(r.name));
    if (matches.length === 0)
      return [`ERROR: The process "${args[imIdx + 1]}" not found.`];
    const out = [];
    for (const row of matches) {
      if (row.windowId == null) {
        out.push(
          `ERROR: The process "${row.name}" with PID ${row.pid} could not be terminated.`,
          'Reason: Access is denied.',
        );
        continue;
      }
      if (env.killWindow) env.killWindow(row.windowId, force);
      out.push(
        force
          ? `SUCCESS: The process "${row.name}" with PID ${row.pid} has been terminated.`
          : `SUCCESS: Sent termination signal to the process "${row.name}" with PID ${row.pid}.`,
      );
    }
    return out;
  }

  return [
    '',
    "ERROR: Invalid syntax. Value expected for '/pid' or '/im'.",
    'Type "TASKKILL /?" for usage.',
    '',
    'TASKKILL [/F] { /PID processid | /IM imagename }',
    '',
  ];
}

function cmdShutdown(env, args) {
  const has = re => args.some(a => re.test(a));
  if (args.length === 0 || has(/^\/\?$/)) {
    return [
      '',
      'Usage: shutdown [-i | -l | -s | -r | -a] [-t xx] [-c "comment"]',
      '',
      '        -l          Log off',
      '        -s          Shutdown the computer',
      '        -r          Shutdown and restart the computer',
      '        -a          Abort a system shutdown',
      '        -t xx       Set timeout for shutdown to xx seconds',
      '',
    ];
  }
  if (has(/^[-/]a$/i)) {
    return [
      'Unable to abort the system shutdown because no timeout is in progress.',
    ];
  }
  let action = null;
  if (has(/^[-/]l$/i)) action = 'logoff';
  else if (has(/^[-/]r$/i)) action = 'restart';
  else if (has(/^[-/]s$/i)) action = 'shutdown';
  if (action && env.onPower) {
    env.onPower(action);
    return [];
  }
  return ['Usage: shutdown [-i | -l | -s | -r | -a] [-t xx] [-c "comment"]'];
}

// --- where / assoc / ftype ---

function cmdWhere(sh, args) {
  const term = args.find(a => !a.startsWith('/'));
  if (!term) return ['WHERE: Invalid syntax.'];
  const searchDirs = [sh.cwd, 'C:/WINDOWS/system32', 'C:/WINDOWS'];
  const names = /\./.test(term)
    ? [term]
    : ['.exe', '.com', '.bat', '.cmd', ''].map(e => term + e);
  const found = [];
  for (const dir of searchDirs) {
    for (const nm of names) {
      const node = sh.vfs.findNodeCI(joinPath(dir, nm));
      if (node && !isDirNode(node)) found.push(toWin(node.path));
    }
  }
  if (found.length === 0)
    return [`INFO: Could not find files for the given pattern(s).`];
  return [...new Set(found)];
}

const ASSOC_TABLE = [
  ['.txt', 'txtfile'],
  ['.bmp', 'Paint.Picture'],
  ['.exe', 'exefile'],
  ['.jpg', 'jpegfile'],
  ['.wav', 'WMP11.AssocFile.WAV'],
  ['.mp3', 'WMP11.AssocFile.MP3'],
  ['.zip', 'CompressedFolder'],
  ['.rtf', 'rtffile'],
];
const FTYPE_TABLE = [
  ['txtfile', '%SystemRoot%\\system32\\NOTEPAD.EXE %1'],
  ['exefile', '"%1" %*'],
  ['Paint.Picture', '%SystemRoot%\\system32\\mspaint.exe "%1"'],
  ['rtffile', '%SystemRoot%\\system32\\write.exe "%1"'],
];

function cmdAssoc(args) {
  const q = (args[0] || '').toLowerCase();
  if (!q) return ASSOC_TABLE.map(([e, t]) => `${e}=${t}`);
  const row = ASSOC_TABLE.find(([e]) => e.toLowerCase() === q);
  return row
    ? [`${row[0]}=${row[1]}`]
    : [`File association not found for extension ${args[0]}`];
}

function cmdFtype(args) {
  const q = (args[0] || '').toLowerCase();
  if (!q) return FTYPE_TABLE.map(([t, c]) => `${t}=${c}`);
  const row = FTYPE_TABLE.find(([t]) => t.toLowerCase() === q);
  return row
    ? [`${row[0]}=${row[1]}`]
    : [
        `File type '${args[0]}' not found or no open command associated with it.`,
      ];
}

// --- Text filters: find / findstr / sort (work standalone or piped) ---

/** Get the lines to filter: piped stdin, or the contents of file args. */
function filterInput(sh, fileArgs, stdin) {
  if (stdin != null) return stdin;
  const lines = [];
  for (const fa of fileArgs) {
    const node = sh.vfs.findNodeCI(resolveInputPath(sh, fa));
    if (node && !isDirNode(node) && node.content != null)
      lines.push(...String(node.content).split(/\r?\n/));
  }
  return lines;
}

function cmdFind(sh, args, stdin) {
  // find "string" [file...] with /I /V /N /C
  const opts = args.filter(a => a.startsWith('/')).map(a => a.toUpperCase());
  const rest = args.filter(a => !a.startsWith('/'));
  let needle = rest.shift();
  if (needle == null) return ['FIND: Parameter format not correct'];
  needle = needle.replace(/^"|"$/g, '');
  const ci = opts.includes('/I');
  const inv = opts.includes('/V');
  const num = opts.includes('/N');
  const cnt = opts.includes('/C');
  const src = filterInput(sh, rest, stdin);
  const hay = ci ? needle.toLowerCase() : needle;
  const out = [];
  let n = 0;
  let matched = 0;
  for (const line of src) {
    n++;
    const has = (ci ? line.toLowerCase() : line).includes(hay);
    if (has !== inv) {
      matched++;
      if (!cnt) out.push(num ? `[${n}]${line}` : line);
    }
  }
  if (cnt) return [`${matched}`];
  return out;
}

function cmdFindstr(sh, args, stdin) {
  const opts = args.filter(a => a.startsWith('/')).map(a => a.toUpperCase());
  const rest = args.filter(a => !a.startsWith('/'));
  let pat = rest.shift();
  if (pat == null) return ['FINDSTR: Bad command line'];
  pat = pat.replace(/^"|"$/g, '');
  const ci = opts.includes('/I');
  const num = opts.includes('/N');
  const literal = opts.includes('/L') || opts.includes('/C');
  let re;
  try {
    re = literal
      ? new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ci ? 'i' : '')
      : new RegExp(pat, ci ? 'i' : '');
  } catch {
    re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ci ? 'i' : '');
  }
  const src = filterInput(sh, rest, stdin);
  const out = [];
  src.forEach((line, i) => {
    if (re.test(line)) out.push(num ? `${i + 1}:${line}` : line);
  });
  return out;
}

function cmdSort(sh, args, stdin) {
  const reverse = args.some(a => /^\/r$/i.test(a));
  const files = args.filter(a => !a.startsWith('/'));
  const src = filterInput(sh, files, stdin);
  const sorted = [...src].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
  if (reverse) sorted.reverse();
  return sorted;
}

function cmdClip(stdin) {
  try {
    if (stdin && navigator.clipboard)
      navigator.clipboard.writeText(stdin.join('\r\n')).catch(() => {});
  } catch {
    /* ignore */
  }
  return [];
}

// --- Main dispatcher ---

async function runCommand(cmd, sh, env, stdin) {
  if (!cmd) return { lines: [] };

  // Forms without whitespace: cd.., cd\, drive letters
  const cdShort = cmd.match(/^(cd|chdir)([\\/.].*)$/i);
  // `echo.` prints a blank line; `echo.text` prints 'text' (tokenize would
  // otherwise treat 'echo.text' as an unknown command name)
  const echoShort = cmd.match(/^echo\.(.*)$/i);
  const driveSwitch = cmd.match(/^([A-Za-z]):$/);

  const tokens = tokenize(cmd);
  const name = (tokens[0] || '').toLowerCase();
  const args = tokens.slice(1);
  // Raw text after the command word (for cd/echo/set/title which keep spacing)
  const rest = cmd.replace(/^\S+\s?/, '');

  let result;
  if (driveSwitch) {
    result = { lines: cmdDriveSwitch(sh, driveSwitch[1]) };
  } else if (cdShort) {
    result = { lines: cmdCd(sh, cdShort[2]) };
  } else if (echoShort) {
    result = { lines: [echoShort[1]] };
  } else {
    switch (name) {
      case 'cd':
      case 'chdir':
        result = { lines: cmdCd(sh, rest) };
        break;
      case 'dir':
        result = { lines: cmdDir(sh, args) };
        break;
      case 'cls':
        return { lines: [], cls: true };
      case 'echo': {
        // Space form: text is printed verbatim (a leading '.' is kept —
        // `echo .hidden` prints '.hidden'). The `echo.` dot form is handled
        // by echoShort before tokenizing.
        const echoRaw = cmd.replace(/^echo(\s|$)/i, '');
        if (!echoRaw.trim()) result = { lines: ['ECHO is on.'] };
        else if (/^(on|off)$/i.test(echoRaw.trim())) result = { lines: [] };
        else result = { lines: [echoRaw] };
        break;
      }
      case 'type':
        result = { lines: cmdType(sh, args) };
        break;
      case 'more':
        result = { lines: stdin != null ? stdin : cmdType(sh, args) };
        break;
      case 'md':
      case 'mkdir':
        result = { lines: cmdMd(sh, args) };
        break;
      case 'rd':
      case 'rmdir':
        result = { lines: cmdRd(sh, args) };
        break;
      case 'del':
      case 'erase':
        result = cmdDel(sh, args);
        break;
      case 'copy':
        result = { lines: await cmdCopy(sh, args) };
        break;
      case 'move':
        result = cmdMove(sh, args);
        break;
      case 'ren':
      case 'rename':
        result = { lines: cmdRen(sh, args) };
        break;
      case 'tree':
        result = { lines: cmdTree(sh, args) };
        break;
      case 'attrib':
        result = { lines: cmdAttrib(sh, args) };
        break;
      case 'set':
        result = { lines: cmdSet(sh, rest) };
        break;
      case 'ver':
        result = { lines: ['', 'Microsoft Windows XP [Version 5.1.2600]'] };
        break;
      case 'help':
        result = { lines: cmdHelp(args) };
        break;
      case 'title':
        if (env.onSetTitle) env.onSetTitle(rest || 'cmd.exe');
        result = { lines: [] };
        break;
      case 'color': {
        const code = (args[0] || '').toUpperCase();
        if (!code) {
          if (env.onSetColors) env.onSetColors({ ...DEFAULT_COLORS });
        } else if (/^[0-9A-F]{1,2}$/.test(code)) {
          const bg = code.length === 2 ? PALETTE[code[0]] : PALETTE['0'];
          const fg = code.length === 2 ? PALETTE[code[1]] : PALETTE[code[0]];
          if (bg !== fg && env.onSetColors) env.onSetColors({ bg, fg });
        }
        result = { lines: [] };
        break;
      }
      case 'date':
        result = cmdDate(args);
        break;
      case 'time':
        result = cmdTime(args);
        break;
      case 'start':
        result = { lines: cmdStart(sh, args, env) };
        break;
      case 'pause':
        result = {
          lines: [],
          prompt: {
            message: 'Press any key to continue . . . ',
            onAnswer: () => ({ lines: [] }),
          },
        };
        break;
      case 'rem':
        result = { lines: [] };
        break;
      case 'hostname':
        result = { lines: cmdHostname() };
        break;
      case 'whoami':
        result = { lines: cmdWhoami(args) };
        break;
      case 'ipconfig':
        result = { lines: cmdIpconfig(args) };
        break;
      case 'ping':
        result = { lines: cmdPing(sh, args) };
        break;
      case 'tracert':
        result = { lines: cmdTracert(args) };
        break;
      case 'nslookup':
        result = { lines: cmdNslookup(args) };
        break;
      case 'netstat':
        result = { lines: cmdNetstat(args) };
        break;
      case 'getmac':
        result = { lines: cmdGetmac() };
        break;
      case 'systeminfo':
        result = { lines: cmdSysteminfo() };
        break;
      case 'vol':
        result = { lines: cmdVol(sh, args) };
        break;
      case 'path':
        result = { lines: cmdPath() };
        break;
      case 'tasklist':
        result = { lines: cmdTasklist(env) };
        break;
      case 'taskkill':
        result = { lines: cmdTaskkill(env, args) };
        break;
      case 'shutdown':
        result = { lines: cmdShutdown(env, args) };
        break;
      case 'where':
        result = { lines: cmdWhere(sh, args) };
        break;
      case 'assoc':
        result = { lines: cmdAssoc(args) };
        break;
      case 'ftype':
        result = { lines: cmdFtype(args) };
        break;
      case 'find':
        result = { lines: cmdFind(sh, args, stdin) };
        break;
      case 'findstr':
        result = { lines: cmdFindstr(sh, args, stdin) };
        break;
      case 'sort':
        result = { lines: cmdSort(sh, args, stdin) };
        break;
      case 'clip':
        result = { lines: cmdClip(stdin) };
        break;
      case 'exit':
        if (env.onExit) env.onExit();
        return { lines: [] };
      default: {
        // Try to run it as a program (cwd, then system32, then WINDOWS)
        const program = resolveProgram(sh, tokens[0]);
        if (program) {
          if (env.onShellOpen) env.onShellOpen(program);
          result = { lines: [] };
        } else {
          result = { lines: [NOT_RECOGNIZED(tokens[0])] };
        }
      }
    }
  }

  return result;
}

/**
 * Run one input line: a pipeline of |-separated stages, with optional > / >>
 * redirection applied to the final output.
 */
async function executeSingle(raw, sh, env) {
  const { cmd, target, append } = splitRedirect(raw);
  if (!cmd) return { lines: [] };
  const stages = splitPipes(cmd);
  let result = await runCommand(stages[0], sh, env, null);
  for (let i = 1; i < stages.length; i++) {
    if (result.cls || result.prompt) break;
    result = await runCommand(stages[i], sh, env, result.lines || []);
  }

  // Output redirection (> / >>)
  if (target && result && !result.prompt && !result.cls) {
    const destToken = tokenize(target)[0];
    if (!destToken)
      return { lines: ['The syntax of the command is incorrect.'] };
    const destPath = resolveInputPath(sh, destToken);
    const parent = getParentPath(destPath);
    const parentNode = parent && sh.vfs.findNodeCI(parent);
    if (!parentNode || !isDirNode(parentNode))
      return { lines: [PATH_NOT_FOUND] };
    const existing = sh.vfs.findNodeCI(destPath);
    if (existing && isDirNode(existing)) return { lines: [ACCESS_DENIED] };
    if (existing && (existing.system || existing.readOnly))
      return { lines: [ACCESS_DENIED] };
    const text =
      result.lines.join('\r\n') + (result.lines.length ? '\r\n' : '');
    const finalPath = existing
      ? existing.path
      : joinPath(parentNode.path, getBaseName(destPath));
    if (append && existing && existing.content != null) {
      sh.vfs.writeFile(existing.path, existing.content + text);
    } else if (existing) {
      sh.vfs.writeFile(existing.path, text);
    } else {
      sh.vfs.createFile(finalPath, text);
    }
    return { lines: [] };
  }

  return result;
}

/**
 * Execute one input line (may contain several &-separated commands).
 * env: { vfs, cwd, driveCwds, onShellOpen, onSetTitle, onSetColors, onExit }
 */
export async function executeInput(rawLine, env) {
  const sh = {
    vfs: env.vfs,
    cwd: env.cwd,
    driveCwds: { ...env.driveCwds },
  };
  const lines = [];
  let cls = false;
  let prompt = null;

  const parts = splitCommands(rawLine);
  for (let i = 0; i < parts.length; i++) {
    const result = await executeSingle(parts[i], sh, env);
    if (result.cls) {
      cls = true;
      lines.length = 0;
      continue;
    }
    lines.push(...result.lines);
    if (result.prompt) {
      // Wrap so the prompt answer inherits shell state mutations
      const inner = result.prompt;
      prompt = {
        message: inner.message,
        onAnswer: async answer => {
          const res = inner.onAnswer(answer) || { lines: [] };
          return {
            lines: res.lines || [],
            cwd: sh.cwd,
            driveCwds: sh.driveCwds,
            prompt: res.prompt || null,
          };
        },
      };
      break; // remaining &-commands are dropped once a prompt takes over
    }
  }

  return { lines, cwd: sh.cwd, driveCwds: sh.driveCwds, cls, prompt };
}
