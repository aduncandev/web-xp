import { getBaseName, getExtension } from '../../context/vfsUtils';
import { getProgramByPath } from '../../WinXP/apps';

/**
 * The VERSIONINFO block Properties > Version reads out of an executable.
 * Nothing here is stored on the node, so it is derived the way the real
 * resource would read for a file at that location: Windows' own binaries
 * report Microsoft and the OS build, everything else reports its program.
 */

const WINDOWS_BUILD = '5.1.2600.5512';
const WINDOWS_PRODUCT = 'Microsoft® Windows® Operating System';
const MS = 'Microsoft Corporation';

const isWindowsBinary = path => /^C:\/WINDOWS\//i.test(path);

/**
 * The egg's version resource. Present, well-formed, and says nothing —
 * every field answers with the same shrug the shortcut does.
 */
const MYSTERY = /\/ROOM_MAN\.exe$/i;
const mysteryVersion = fileName => ({
  fileVersion: '0.0.0.0',
  description: '???',
  copyright: '???',
  items: [
    ['Company', '???'],
    ['File Version', '0.0.0.0'],
    ['Internal Name', 'room_man'],
    ['Language', 'Language Neutral'],
    ['Original File name', fileName],
    ['Product Name', '???'],
    ['Product Version', '0.0.0.0'],
  ],
});

/**
 * A shortcut has no version resource of its own; XP shows the description of
 * whatever it points at. Pass the resolved target node as `via`.
 */
export function versionInfoFor(node, via) {
  const subject = via || node;
  if (!subject || subject.type !== 'file') return null;
  return readVersion(subject);
}

const BINARY_EXT = ['.exe', '.dll', '.cpl', '.scr', '.msc', '.com', '.sys'];

/** True for anything the shell calls an Application — no "Opens with" row. */
export function isBinary(node) {
  if (!node || node.type !== 'file') return false;
  return BINARY_EXT.includes(getExtension(node.path).toLowerCase());
}

function readVersion(node) {
  const ext = getExtension(node.path).toLowerCase();
  if (!BINARY_EXT.includes(ext)) return null;

  const program = getProgramByPath(node.path);
  const fileName = getBaseName(node.path);
  if (MYSTERY.test(node.path)) return mysteryVersion(fileName);
  const windows = isWindowsBinary(node.path);
  const description =
    (program && (program.description || program.displayName)) || fileName;
  const company = windows ? MS : (program && program.publisher) || MS;
  const version = windows ? WINDOWS_BUILD : '1.0.0.0';
  const productName = windows
    ? WINDOWS_PRODUCT
    : (program && program.displayName) || fileName;

  return {
    fileVersion: version,
    description,
    copyright: `© ${company}. All rights reserved.`,
    // XP lists these alphabetically in the "Other version information" box
    items: [
      ['Company', company],
      ['File Version', version],
      ['Internal Name', fileName.replace(/\.[^.]+$/, '')],
      ['Language', 'English (United States)'],
      ['Original File name', fileName],
      ['Product Name', productName],
      ['Product Version', version],
    ],
  };
}

export default versionInfoFor;
