/*
 * ZIP archives — reading, writing, and the traditional PKWARE encryption that
 * Windows XP's Compressed Folders used for password-protected entries.
 *
 * XP shipped this as a shell extension (zipfldr.dll), so a .zip was a folder
 * you could open, and it understood exactly two storage methods — stored and
 * deflated — plus ZipCrypto passwords. That is the whole of what is here: the
 * later AES scheme WinZip introduced is deliberately absent, because XP could
 * not read it either and would tell you so.
 *
 * Deflate itself is the platform's, through CompressionStream, so there is no
 * compressor to carry around.
 */

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

/* ---- CRC-32 ------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

export function crc32(bytes, seed = 0) {
  let c = ~seed;
  for (let i = 0; i < bytes.length; i++)
    c = (c >>> 8) ^ CRC_TABLE[(c ^ bytes[i]) & 0xff];
  return ~c >>> 0;
}

const crcByte = (crc, byte) =>
  ((crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]) >>> 0;

/* ---- traditional PKWARE encryption -------------------------------------- */

/**
 * The three-key cipher from the original PKZIP. Weak by any modern measure,
 * and the only thing Compressed Folders could produce or read.
 */
function makeKeys(password) {
  const keys = [0x12345678, 0x23456789, 0x34567890];
  const update = byte => {
    keys[0] = crcByte(keys[0], byte);
    keys[1] = (keys[1] + (keys[0] & 0xff)) >>> 0;
    keys[1] = (Math.imul(keys[1], 134775813) + 1) >>> 0;
    keys[2] = crcByte(keys[2], keys[1] >>> 24);
  };
  for (const ch of new TextEncoder().encode(password)) update(ch);
  const streamByte = () => {
    const temp = (keys[2] | 2) >>> 0;
    return (Math.imul(temp, temp ^ 1) >>> 8) & 0xff;
  };
  return { update, streamByte };
}

function decryptBytes(bytes, password) {
  const { update, streamByte } = makeKeys(password);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const plain = bytes[i] ^ streamByte();
    update(plain);
    out[i] = plain;
  }
  return out;
}

function encryptBytes(bytes, password, checkByte) {
  const { update, streamByte } = makeKeys(password);
  // 12 bytes of header, the last of which is what a reader checks the
  // password against before wasting time inflating the rest
  const header = new Uint8Array(12);
  for (let i = 0; i < 11; i++) header[i] = (i * 37 + 11) & 0xff;
  header[11] = checkByte & 0xff;
  const out = new Uint8Array(12 + bytes.length);
  const all = new Uint8Array(12 + bytes.length);
  all.set(header, 0);
  all.set(bytes, 12);
  for (let i = 0; i < all.length; i++) {
    const k = streamByte();
    out[i] = all[i] ^ k;
    update(all[i]);
  }
  return out;
}

/* ---- deflate, via the platform ------------------------------------------ */

async function through(bytes, stream) {
  const blob = new Blob([bytes]);
  const piped = blob.stream().pipeThrough(stream);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

const inflateRaw = bytes =>
  through(bytes, new DecompressionStream('deflate-raw'));
const deflateRaw = bytes =>
  through(bytes, new CompressionStream('deflate-raw'));

/* ---- dates -------------------------------------------------------------- */

function fromDosDate(time, date) {
  const year = 1980 + ((date >> 9) & 0x7f);
  const month = ((date >> 5) & 0x0f) - 1;
  const day = date & 0x1f;
  const hours = (time >> 11) & 0x1f;
  const minutes = (time >> 5) & 0x3f;
  const seconds = (time & 0x1f) * 2;
  return new Date(year, month, day, hours, minutes, seconds).getTime();
}

function toDosDate(ms) {
  const d = new Date(ms);
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/* ---- reading ------------------------------------------------------------ */

const utf8 = new TextDecoder('utf-8');
// Names written before anyone agreed on UTF-8 are code page 437 in practice;
// for the ASCII range — which is nearly all of them — it agrees with latin1.
const latin1 = new TextDecoder('latin1');

function findEocd(view, length) {
  const limit = Math.min(length, 0xffff + 22);
  for (let i = 22; i <= limit; i++) {
    const at = length - i;
    if (view.getUint32(at, true) === EOCD_SIG) return at;
  }
  return -1;
}

/**
 * Read an archive's table of contents. Takes the whole file as bytes and
 * returns { entries, comment }, or throws with one of XP's own messages.
 */
export function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 22)
    throw new Error('The Compressed (zipped) Folder is invalid or corrupted.');
  const eocd = findEocd(view, bytes.length);
  if (eocd < 0)
    throw new Error('The Compressed (zipped) Folder is invalid or corrupted.');

  const count = view.getUint16(eocd + 10, true);
  let at = view.getUint32(eocd + 16, true);
  const commentLength = view.getUint16(eocd + 20, true);
  const comment = commentLength
    ? latin1.decode(bytes.subarray(eocd + 22, eocd + 22 + commentLength))
    : '';

  const entries = [];
  for (let i = 0; i < count; i++) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== CENTRAL_SIG)
      break;
    const flags = view.getUint16(at + 8, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLen = view.getUint16(at + 32, true);
    const external = view.getUint32(at + 38, true);
    const raw = bytes.subarray(at + 46, at + 46 + nameLength);
    // Bit 11 promises UTF-8; otherwise fall back to the old code page
    const name = (flags & 0x800 ? utf8 : latin1)
      .decode(raw)
      .replace(/\\/g, '/');
    entries.push({
      name,
      flags,
      encrypted: !!(flags & 1),
      method: view.getUint16(at + 10, true),
      time: view.getUint16(at + 12, true),
      date: view.getUint16(at + 14, true),
      modified: fromDosDate(
        view.getUint16(at + 12, true),
        view.getUint16(at + 14, true),
      ),
      crc: view.getUint32(at + 16, true) >>> 0,
      packedSize: view.getUint32(at + 20, true) >>> 0,
      size: view.getUint32(at + 24, true) >>> 0,
      offset: view.getUint32(at + 42, true) >>> 0,
      directory: name.endsWith('/') || !!(external & 0x10),
    });
    at += 46 + nameLength + extraLength + commentLen;
  }
  return { entries, comment };
}

/** Wrong password, so the caller can offer to type it again. */
export class BadPasswordError extends Error {
  constructor() {
    super('Bad or missing password.');
    this.name = 'BadPasswordError';
  }
}

/**
 * The bytes of one entry, decrypted and inflated. `password` is only looked at
 * when the entry needs one.
 */
export async function extractEntry(bytes, entry, password) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(entry.offset, true) !== LOCAL_SIG)
    throw new Error('The Compressed (zipped) Folder is invalid or corrupted.');
  const nameLength = view.getUint16(entry.offset + 26, true);
  const extraLength = view.getUint16(entry.offset + 28, true);
  const start = entry.offset + 30 + nameLength + extraLength;
  let data = bytes.subarray(start, start + entry.packedSize);

  if (entry.encrypted) {
    if (!password) throw new BadPasswordError();
    if (data.length < 12) throw new BadPasswordError();
    const clear = decryptBytes(data, password);
    // The last header byte is the high byte of the CRC, or of the mod time
    // when the sizes went into a trailing descriptor instead.
    const expected =
      entry.flags & 8 ? (entry.time >> 8) & 0xff : (entry.crc >>> 24) & 0xff;
    if (clear[11] !== expected) throw new BadPasswordError();
    data = clear.subarray(12);
  }

  let out;
  if (entry.method === 0) out = data;
  else if (entry.method === 8) out = await inflateRaw(data);
  else throw new Error('File skipped unknown compression method.');

  if (entry.crc && crc32(out) !== entry.crc) {
    // A wrong password can pass the one-byte check about once in 256 tries
    if (entry.encrypted) throw new BadPasswordError();
    throw new Error('The Compressed (zipped) Folder is invalid or corrupted.');
  }
  return out;
}

/* ---- writing ------------------------------------------------------------ */

const encoder = new TextEncoder();

function pushUint16(out, value) {
  out.push(value & 0xff, (value >> 8) & 0xff);
}
function pushUint32(out, value) {
  out.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

/**
 * Build an archive.
 *
 * `files` is [{ name, bytes, modified, directory }]; names use forward
 * slashes and directories end with one. A `password` encrypts every entry
 * with the same scheme XP's "Add a password" used.
 */
export async function writeZip(files, { password = '', level } = {}) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const isDir = file.directory || file.name.endsWith('/');
    const raw = isDir ? new Uint8Array(0) : file.bytes || new Uint8Array(0);
    const name = encoder.encode(
      isDir && !file.name.endsWith('/') ? `${file.name}/` : file.name,
    );
    const crc = crc32(raw);
    const { time, date } = toDosDate(file.modified || Date.now());

    // Compress unless it makes the entry bigger, which is what every writer
    // does for already-compressed content and tiny files
    let method = 0;
    let body = raw;
    if (!isDir && raw.length > 0 && level !== 0) {
      const deflated = await deflateRaw(raw);
      if (deflated.length < raw.length) {
        method = 8;
        body = deflated;
      }
    }
    const encrypted = !!password && !isDir;
    if (encrypted) body = encryptBytes(body, password, (crc >>> 24) & 0xff);

    const flags = 0x800 | (encrypted ? 1 : 0); // 0x800: the name is UTF-8
    const local = [];
    pushUint32(local, LOCAL_SIG);
    pushUint16(local, 20);
    pushUint16(local, flags);
    pushUint16(local, method);
    pushUint16(local, time);
    pushUint16(local, date);
    pushUint32(local, crc);
    pushUint32(local, body.length);
    pushUint32(local, raw.length);
    pushUint16(local, name.length);
    pushUint16(local, 0);
    chunks.push(new Uint8Array(local), name, body);

    const entry = [];
    pushUint32(entry, CENTRAL_SIG);
    pushUint16(entry, 20);
    pushUint16(entry, 20);
    pushUint16(entry, flags);
    pushUint16(entry, method);
    pushUint16(entry, time);
    pushUint16(entry, date);
    pushUint32(entry, crc);
    pushUint32(entry, body.length);
    pushUint32(entry, raw.length);
    pushUint16(entry, name.length);
    pushUint16(entry, 0);
    pushUint16(entry, 0);
    pushUint16(entry, 0);
    pushUint16(entry, 0);
    pushUint32(entry, isDir ? 0x10 : 0x20);
    pushUint32(entry, offset);
    central.push(new Uint8Array(entry), name);

    offset += local.length + name.length + body.length;
  }

  const centralSize = central.reduce((n, part) => n + part.length, 0);
  const end = [];
  pushUint32(end, EOCD_SIG);
  pushUint16(end, 0);
  pushUint16(end, 0);
  pushUint16(end, files.length);
  pushUint16(end, files.length);
  pushUint32(end, centralSize);
  pushUint32(end, offset);
  pushUint16(end, 0);

  return new Blob([...chunks, ...central, new Uint8Array(end)], {
    type: 'application/zip',
  });
}
