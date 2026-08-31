/**
 * Tag readers for the media the VFS can hold. Everything is parsed straight
 * out of the file's bytes — no libraries, no network — so a dragged-in MP3
 * shows the same Artist/Album the real shell would read off it.
 *
 * Covered: ID3v2 and ID3v1 (mp3), Vorbis comments (ogg/flac), iTunes-style
 * MP4 atoms (m4a/mp4), RIFF LIST INFO (wav/avi), and EXIF IFD0 (jpeg).
 *
 * Embedded cover art comes back as `picture: { mime, bytes }` from the
 * formats that can carry it — ID3's APIC/PIC frames, FLAC's PICTURE block,
 * Vorbis METADATA_BLOCK_PICTURE and MP4's 'covr' atom.
 */

import { getExtension } from './vfsUtils';

const ascii = (view, off, len) => {
  let s = '';
  for (let i = 0; i < len; i++)
    s += String.fromCharCode(view.getUint8(off + i));
  return s;
};

const clean = s => (typeof s === 'string' ? s.replace(/\0+$/, '').trim() : '');

// --- ID3 --------------------------------------------------------------

const ID3_FRAMES = {
  TIT2: 'title',
  TPE1: 'artist',
  TALB: 'album',
  TYER: 'year',
  TDRC: 'year',
  TRCK: 'track',
  TCON: 'genre',
  TPE2: 'albumArtist',
  COMM: 'comment',
  // ID3v2.2 uses three-character ids
  TT2: 'title',
  TP1: 'artist',
  TAL: 'album',
  TYE: 'year',
  TRK: 'track',
  TCO: 'genre',
};

/** Decode an ID3 text frame body, honouring its encoding byte. */
function id3Text(bytes) {
  if (bytes.length === 0) return '';
  const encoding = bytes[0];
  const body = bytes.subarray(1);
  try {
    if (encoding === 1 || encoding === 2) {
      // UTF-16, with or without BOM
      const le = body[0] === 0xff && body[1] === 0xfe;
      const be = body[0] === 0xfe && body[1] === 0xff;
      const data = le || be ? body.subarray(2) : body;
      return clean(new TextDecoder(be ? 'utf-16be' : 'utf-16le').decode(data));
    }
    if (encoding === 3) return clean(new TextDecoder('utf-8').decode(body));
    return clean(new TextDecoder('iso-8859-1').decode(body));
  } catch {
    return '';
  }
}

const synchsafe = (view, off) =>
  (view.getUint8(off) << 21) |
  (view.getUint8(off + 1) << 14) |
  (view.getUint8(off + 2) << 7) |
  view.getUint8(off + 3);

function parseID3v2(buffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 10 || ascii(view, 0, 3) !== 'ID3') return null;
  const major = view.getUint8(3);
  const size = synchsafe(view, 6);
  const end = Math.min(10 + size, buffer.byteLength);
  const idLen = major === 2 ? 3 : 4;
  const headerLen = major === 2 ? 6 : 10;

  const out = {};
  let off = 10;
  while (off + headerLen <= end) {
    const id = ascii(view, off, idLen);
    if (!/^[A-Z0-9]+$/.test(id)) break; // padding
    let frameSize;
    if (major === 2) {
      frameSize =
        (view.getUint8(off + 3) << 16) |
        (view.getUint8(off + 4) << 8) |
        view.getUint8(off + 5);
    } else if (major === 4) {
      frameSize = synchsafe(view, off + 4);
    } else {
      frameSize = view.getUint32(off + 4, false);
    }
    const bodyAt = off + headerLen;
    if (frameSize <= 0 || bodyAt + frameSize > end) break;
    if ((id === 'APIC' || id === 'PIC') && !out.picture) {
      const pic = id3Picture(buffer, bodyAt, frameSize, major);
      if (pic) out.picture = pic;
    }
    const key = ID3_FRAMES[id];
    if (key && !out[key]) {
      const bytes = new Uint8Array(buffer, bodyAt, frameSize);
      const text = id3Text(bytes);
      if (text) out[key] = text;
    }
    off = bodyAt + frameSize;
  }
  return Object.keys(out).length ? out : null;
}

/** APIC (2.3/2.4) and PIC (2.2) both end in the raw image bytes. */
function id3Picture(buffer, bodyAt, frameSize, major) {
  const bytes = new Uint8Array(buffer, bodyAt, frameSize);
  const encoding = bytes[0];
  let at = 1;
  let mime;
  if (major === 2) {
    // three-character format code rather than a mime type
    const code = String.fromCharCode(
      bytes[1],
      bytes[2],
      bytes[3],
    ).toUpperCase();
    mime = code === 'PNG' ? 'image/png' : 'image/jpeg';
    at = 4;
  } else {
    let end = at;
    while (end < bytes.length && bytes[end] !== 0) end++;
    mime = String.fromCharCode(...bytes.slice(at, end)).toLowerCase();
    at = end + 1;
  }
  at += 1; // picture type
  // description, terminated by one null byte or two for the UTF-16 encodings
  const wide = encoding === 1 || encoding === 2;
  if (wide) {
    while (at + 1 < bytes.length && !(bytes[at] === 0 && bytes[at + 1] === 0))
      at += 2;
    at += 2;
  } else {
    while (at < bytes.length && bytes[at] !== 0) at++;
    at += 1;
  }
  if (at >= bytes.length) return null;
  if (!mime || mime === 'image/') mime = 'image/jpeg';
  if (!mime.includes('/')) mime = `image/${mime}`;
  return { mime, bytes: bytes.slice(at) };
}

function parseID3v1(buffer) {
  const len = buffer.byteLength;
  if (len < 128) return null;
  const view = new DataView(buffer);
  const at = len - 128;
  if (ascii(view, at, 3) !== 'TAG') return null;
  const out = {
    title: clean(ascii(view, at + 3, 30)),
    artist: clean(ascii(view, at + 33, 30)),
    album: clean(ascii(view, at + 63, 30)),
    year: clean(ascii(view, at + 93, 4)),
  };
  Object.keys(out).forEach(k => {
    if (!out[k]) delete out[k];
  });
  return Object.keys(out).length ? out : null;
}

// --- Vorbis comments (ogg / flac) ------------------------------------

const VORBIS_KEYS = {
  TITLE: 'title',
  ARTIST: 'artist',
  ALBUM: 'album',
  DATE: 'year',
  TRACKNUMBER: 'track',
  GENRE: 'genre',
  ALBUMARTIST: 'albumArtist',
  DESCRIPTION: 'comment',
  COMMENT: 'comment',
};

/** Read a Vorbis comment block: vendor string then count then KEY=VALUE. */
function readVorbisComments(view, start, limit) {
  let off = start;
  if (off + 4 > limit) return null;
  const vendorLen = view.getUint32(off, true);
  off += 4 + vendorLen;
  if (off + 4 > limit) return null;
  const count = view.getUint32(off, true);
  off += 4;
  if (count > 1000) return null;
  const out = {};
  const decoder = new TextDecoder('utf-8');
  for (let i = 0; i < count; i++) {
    if (off + 4 > limit) break;
    const len = view.getUint32(off, true);
    off += 4;
    if (len < 0 || off + len > limit) break;
    const bytes = new Uint8Array(view.buffer, view.byteOffset + off, len);
    const entry = decoder.decode(bytes);
    off += len;
    const eq = entry.indexOf('=');
    if (eq <= 0) continue;
    const name = entry.slice(0, eq).toUpperCase();
    if (name === 'METADATA_BLOCK_PICTURE' && !out.picture) {
      const pic = decodePictureComment(entry.slice(eq + 1));
      if (pic) out.picture = pic;
      continue;
    }
    const key = VORBIS_KEYS[name];
    if (key && !out[key]) out[key] = clean(entry.slice(eq + 1));
  }
  return Object.keys(out).length ? out : null;
}

function decodePictureComment(base64) {
  try {
    const binary = atob(base64.trim());
    const buf = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return readPictureBlock(new DataView(buf), buf, 0, buf.byteLength);
  } catch {
    return null;
  }
}

function parseOgg(buffer) {
  const view = new DataView(buffer);
  // Find the \x03vorbis comment packet inside the first pages
  const limit = Math.min(buffer.byteLength, 128 * 1024);
  for (let i = 0; i + 7 < limit; i++) {
    if (view.getUint8(i) === 0x03 && ascii(view, i + 1, 6) === 'vorbis') {
      return readVorbisComments(view, i + 7, limit);
    }
    // Opus streams carry the same comment layout behind a different magic
    if (ascii(view, i, 8) === 'OpusTags') {
      return readVorbisComments(view, i + 8, limit);
    }
  }
  return null;
}

/**
 * The FLAC PICTURE payload, which Vorbis also uses base64-encoded inside a
 * METADATA_BLOCK_PICTURE comment: type, mime, description, geometry, data.
 */
function readPictureBlock(view, buffer, start, end) {
  let off = start + 4; // picture type
  if (off + 4 > end) return null;
  const mimeLen = view.getUint32(off, false);
  off += 4;
  if (off + mimeLen > end) return null;
  const mime = ascii(view, off, mimeLen).toLowerCase();
  off += mimeLen;
  const descLen = view.getUint32(off, false);
  off += 4 + descLen;
  off += 16; // width, height, depth, colour count
  if (off + 4 > end) return null;
  const dataLen = view.getUint32(off, false);
  off += 4;
  if (off + dataLen > end) return null;
  return {
    mime: mime || 'image/jpeg',
    bytes: new Uint8Array(buffer, off, dataLen),
  };
}

function parseFlac(buffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 8 || ascii(view, 0, 4) !== 'fLaC') return null;
  let off = 4;
  let out = null;
  let picture = null;
  while (off + 4 <= buffer.byteLength) {
    const header = view.getUint8(off);
    const last = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const size =
      (view.getUint8(off + 1) << 16) |
      (view.getUint8(off + 2) << 8) |
      view.getUint8(off + 3);
    const body = off + 4;
    if (body + size > buffer.byteLength) break;
    if (type === 4 && !out) out = readVorbisComments(view, body, body + size);
    if (type === 6 && !picture)
      picture = readPictureBlock(view, buffer, body, body + size);
    if (last) break;
    off = body + size;
  }
  if (picture) out = { ...(out || {}), picture };
  return out;
}

// --- MP4 / M4A atoms --------------------------------------------------

const MP4_KEYS = {
  '©nam': 'title',
  '©ART': 'artist',
  '©alb': 'album',
  '©day': 'year',
  '©gen': 'genre',
  '©cmt': 'comment',
  aART: 'albumArtist',
  trkn: 'track',
  covr: 'picture',
};

const MP4_CONTAINERS = new Set(['moov', 'udta', 'meta', 'ilst']);

function parseMp4(buffer) {
  const view = new DataView(buffer);
  const out = {};

  const walk = (start, end, depth) => {
    let off = start;
    while (off + 8 <= end && depth < 8) {
      let size = view.getUint32(off, false);
      const type = ascii(view, off + 4, 4);
      let body = off + 8;
      if (size === 1) {
        // 64-bit size; the high word is always 0 for anything we handle
        if (off + 16 > end) break;
        size = view.getUint32(off + 12, false);
        body = off + 16;
      }
      if (size < 8 || off + size > end) break;
      if (MP4_CONTAINERS.has(type)) {
        // 'meta' carries a 4-byte version/flags before its children
        walk(type === 'meta' ? body + 4 : body, off + size, depth + 1);
      } else if (MP4_KEYS[type]) {
        // value lives in a nested 'data' atom
        let d = body;
        while (d + 8 <= off + size) {
          const dSize = view.getUint32(d, false);
          const dType = ascii(view, d + 4, 4);
          if (dSize < 16 || d + dSize > off + size) break;
          if (dType === 'data') {
            const flags = view.getUint32(d + 8, false) & 0xffffff;
            const payload = d + 16;
            const len = d + dSize - payload;
            const key = MP4_KEYS[type];
            if (type === 'covr') {
              // flags say which image format the payload is in
              if (!out.picture && len > 0)
                out.picture = {
                  mime: flags === 14 ? 'image/png' : 'image/jpeg',
                  bytes: new Uint8Array(buffer, payload, len),
                };
            } else if (flags === 1) {
              const bytes = new Uint8Array(buffer, payload, len);
              const text = clean(new TextDecoder('utf-8').decode(bytes));
              if (text && !out[key]) out[key] = text;
            } else if (type === 'trkn' && len >= 4) {
              out.track = String(view.getUint16(payload + 2, false));
            }
            break;
          }
          d += dSize;
        }
      }
      off += size;
    }
  };

  walk(0, buffer.byteLength, 0);
  return Object.keys(out).length ? out : null;
}

// --- RIFF LIST INFO (wav / avi) --------------------------------------

const RIFF_KEYS = {
  INAM: 'title',
  IART: 'artist',
  IPRD: 'album',
  ICRD: 'year',
  IGNR: 'genre',
  ICMT: 'comment',
  ITRK: 'track',
};

function parseRiffInfo(buffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 12 || ascii(view, 0, 4) !== 'RIFF') return null;
  const out = {};
  let off = 12;
  while (off + 8 <= buffer.byteLength) {
    const id = ascii(view, off, 4);
    const size = view.getUint32(off + 4, true);
    const body = off + 8;
    if (size < 0 || body + size > buffer.byteLength) break;
    if (id === 'LIST' && ascii(view, body, 4) === 'INFO') {
      let i = body + 4;
      while (i + 8 <= body + size) {
        const key = ascii(view, i, 4);
        const len = view.getUint32(i + 4, true);
        if (len < 0 || i + 8 + len > body + size) break;
        const mapped = RIFF_KEYS[key];
        if (mapped && !out[mapped]) {
          out[mapped] = clean(ascii(view, i + 8, len));
        }
        i += 8 + len + (len % 2);
      }
    }
    off = body + size + (size % 2);
  }
  return Object.keys(out).length ? out : null;
}

// --- EXIF (jpeg) ------------------------------------------------------

const EXIF_TAGS = {
  0x010f: 'cameraMaker',
  0x0110: 'cameraModel',
  0x0132: 'dateTaken',
  0x9003: 'dateTaken',
  0x8298: 'copyright',
  0x010e: 'comment',
  0x013b: 'artist',
};

function parseExif(buffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return null;
  let off = 2;
  // Find the APP1 segment holding "Exif\0\0"
  while (off + 4 <= buffer.byteLength) {
    if (view.getUint8(off) !== 0xff) break;
    const marker = view.getUint8(off + 1);
    const len = view.getUint16(off + 2, false);
    if (marker === 0xe1 && ascii(view, off + 4, 4) === 'Exif') {
      const tiff = off + 10;
      if (tiff + 8 > buffer.byteLength) return null;
      const little = ascii(view, tiff, 2) === 'II';
      const ifd0 = tiff + view.getUint32(tiff + 4, little);
      const out = {};

      const readIFD = at => {
        if (at + 2 > buffer.byteLength) return;
        const count = view.getUint16(at, little);
        if (count > 200) return;
        for (let i = 0; i < count; i++) {
          const entry = at + 2 + i * 12;
          if (entry + 12 > buffer.byteLength) return;
          const tag = view.getUint16(entry, little);
          const type = view.getUint16(entry + 2, little);
          const num = view.getUint32(entry + 4, little);
          if (tag === 0x8769) {
            // pointer to the Exif sub-IFD
            readIFD(tiff + view.getUint32(entry + 8, little));
            continue;
          }
          const name = EXIF_TAGS[tag];
          if (!name || type !== 2) continue; // ASCII only
          const valueAt =
            num <= 4 ? entry + 8 : tiff + view.getUint32(entry + 8, little);
          if (valueAt + num > buffer.byteLength) continue;
          const text = clean(ascii(view, valueAt, num));
          if (text && !out[name]) out[name] = text;
        }
      };
      readIFD(ifd0);
      return Object.keys(out).length ? out : null;
    }
    if (marker === 0xda) break; // start of scan — no more metadata
    off += 2 + len;
  }
  return null;
}

// --- Entry point ------------------------------------------------------

const HEAD_BYTES = 512 * 1024;

/** Track tags come as "3", "03" or "3/12"; the leading number is the one. */
export function trackNumber(value) {
  const match = /^\s*(\d+)/.exec(String(value == null ? '' : value));
  return match ? match[1] : '';
}

/**
 * Read whatever tags `blob` carries, chosen by the file's extension.
 * Returns a flat object ({title, artist, album, year, genre, track, ...})
 * or null when the file carries nothing.
 */
export async function readMediaTags(blob, path) {
  if (!blob) return null;
  const ext = getExtension(path || '').toLowerCase();
  try {
    if (ext === '.mp3') {
      const head = await blob.slice(0, HEAD_BYTES).arrayBuffer();
      const v2 = parseID3v2(head);
      if (v2) return v2;
      const tail = await blob.slice(Math.max(0, blob.size - 128)).arrayBuffer();
      return parseID3v1(tail);
    }
    if (ext === '.ogg' || ext === '.opus') {
      return parseOgg(await blob.slice(0, HEAD_BYTES).arrayBuffer());
    }
    if (ext === '.flac') {
      return parseFlac(await blob.slice(0, HEAD_BYTES).arrayBuffer());
    }
    if (['.m4a', '.mp4', '.m4v', '.mov'].includes(ext)) {
      // Tags live in moov, which may sit at either end of the file
      const head = await blob.slice(0, HEAD_BYTES).arrayBuffer();
      const fromHead = parseMp4(head);
      if (fromHead) return fromHead;
      if (blob.size > HEAD_BYTES) {
        const tail = await blob.slice(blob.size - HEAD_BYTES).arrayBuffer();
        return parseMp4(tail);
      }
      return null;
    }
    if (ext === '.wav' || ext === '.avi') {
      return parseRiffInfo(await blob.slice(0, HEAD_BYTES).arrayBuffer());
    }
    if (ext === '.jpg' || ext === '.jpeg') {
      return parseExif(await blob.slice(0, 128 * 1024).arrayBuffer());
    }
  } catch {
    // Malformed or truncated — the caller falls back to the file name
    return null;
  }
  return null;
}
