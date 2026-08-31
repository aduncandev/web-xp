import { getExtension } from '../../context/vfsUtils';
import { readMediaTags } from '../../context/mediaTags';
import { applyTagEdits, tagEditsFor } from '../../context/tagOverrides';

// Tag → Summary row, in the order XP lists them under each group
const DESCRIPTION_ROWS = [
  ['title', 'Title'],
  ['comment', 'Comments'],
];
const ORIGIN_ROWS = [
  ['artist', 'Artist'],
  ['albumArtist', 'Album Artist'],
  ['album', 'Album Title'],
  ['year', 'Year'],
  ['track', 'Track Number'],
  ['genre', 'Genre'],
];
const CAMERA_ROWS = [
  ['cameraMaker', 'Camera Maker'],
  ['cameraModel', 'Camera Model'],
  ['dateTaken', 'Date Picture Taken'],
  ['artist', 'Author'],
  ['copyright', 'Copyright'],
];

const section = (label, rows, tags) => {
  const present = rows
    .filter(([key]) => tags && tags[key])
    .map(([key, name]) => [name, tags[key]]);
  return present.length ? { label, rows: present } : null;
};

/**
 * Real metadata for the Properties > Summary tab, read out of the file
 * itself — the RIFF header for waves, the decoder for everything else.
 * Returns { sections: [{ label, rows: [[name, value]] }] } or null when the
 * file carries nothing worth showing.
 */

const AUDIO_EXT = ['.wav', '.mp3', '.ogg', '.m4a', '.flac'];
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.ico'];
const VIDEO_EXT = ['.mp4', '.webm', '.avi', '.mov', '.mkv'];

const WAVE_FORMATS = {
  1: 'PCM',
  2: 'Microsoft ADPCM',
  3: 'IEEE Float',
  6: 'CCITT a-Law',
  7: 'CCITT u-Law',
  17: 'IMA ADPCM',
  85: 'MPEG Layer-3',
  65534: 'Extensible',
};

const fmtDuration = secs => {
  if (!isFinite(secs) || secs <= 0) return null;
  const total = Math.round(secs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

/** Parse a RIFF/WAVE fmt chunk. Gives exactly what XP's Summary lists. */
function parseWave(buffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 12) return null;
  const riff = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  const wave = String.fromCharCode(...new Uint8Array(buffer, 8, 4));
  if (riff !== 'RIFF' || wave !== 'WAVE') return null;

  let offset = 12;
  while (offset + 8 <= buffer.byteLength) {
    const id = String.fromCharCode(...new Uint8Array(buffer, offset, 4));
    const size = view.getUint32(offset + 4, true);
    if (id === 'fmt ' && offset + 8 + 16 <= buffer.byteLength) {
      const body = offset + 8;
      const formatTag = view.getUint16(body, true);
      const channels = view.getUint16(body + 2, true);
      const sampleRate = view.getUint32(body + 4, true);
      const byteRate = view.getUint32(body + 8, true);
      const bits = view.getUint16(body + 14, true);
      return {
        formatTag,
        channels,
        sampleRate,
        bitRate: byteRate * 8,
        bits,
      };
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}

const channelLabel = n =>
  n === 1 ? '1 (mono)' : n === 2 ? '2 (stereo)' : String(n);

/** Load a media element far enough to read its intrinsic properties. */
function probeMedia(url, kind) {
  return new Promise(resolve => {
    const el = document.createElement(kind);
    let settled = false;
    const done = value => {
      if (settled) return;
      settled = true;
      el.removeAttribute('src');
      resolve(value);
    };
    el.preload = 'metadata';
    el.onloadedmetadata = () =>
      done({
        duration: el.duration,
        width: el.videoWidth || 0,
        height: el.videoHeight || 0,
      });
    el.onerror = () => done(null);
    setTimeout(() => done(null), 4000);
    el.src = url;
  });
}

function probeImage(url) {
  return new Promise(resolve => {
    const img = new Image();
    let settled = false;
    const done = v => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    img.onload = () =>
      done({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => done(null);
    setTimeout(() => done(null), 4000);
    img.src = url;
  });
}

export async function readFileMetadata(vfs, node) {
  if (!node || node.type !== 'file') return null;
  const ext = getExtension(node.path).toLowerCase();
  const size = node.size || 0;
  const known =
    ext === '.wav' ||
    IMAGE_EXT.includes(ext) ||
    AUDIO_EXT.includes(ext) ||
    VIDEO_EXT.includes(ext);
  if (!known) return null;

  try {
    // Tags come first and independently: a file whose bytes the browser
    // cannot decode still has readable ID3/Vorbis/EXIF, and losing that to
    // a failed probe is what made dragged-in files look empty.
    let blob = null;
    try {
      // Only slices of it are read, so a file served as an asset need not be
      // downloaded whole just to show its properties.
      blob = await vfs.openBinaryFile(node.path);
    } catch {
      blob = null;
    }
    const fileTags = (blob && (await readMediaTags(blob, node.path))) || {};
    // Anything typed over the file's own tags wins, here as in the player
    const tags = applyTagEdits(fileTags, tagEditsFor(vfs, node.path));

    let technical = null;

    if (ext === '.wav' && blob) {
      const head = await blob.slice(0, 4096).arrayBuffer();
      const fmt = parseWave(head);
      if (fmt) {
        const rows = [
          ['Bit Rate', `${Math.round(fmt.bitRate / 1000)}kbps`],
          ['Audio sample size', `${fmt.bits} bit`],
          ['Channels', channelLabel(fmt.channels)],
          ['Audio sample rate', `${Math.round(fmt.sampleRate / 1000)} kHz`],
          [
            'Audio format',
            WAVE_FORMATS[fmt.formatTag] || `Tag ${fmt.formatTag}`,
          ],
        ];
        const duration = fmt.bitRate
          ? fmtDuration((size * 8) / fmt.bitRate)
          : null;
        if (duration) rows.unshift(['Duration', duration]);
        technical = { label: 'Audio', rows };
      }
    } else if (IMAGE_EXT.includes(ext)) {
      const url = await vfs.readFileUrl(node.path);
      const dim = url ? await probeImage(url) : null;
      if (dim) {
        technical = {
          label: 'Image',
          rows: [
            ['Width', `${dim.width} pixels`],
            ['Height', `${dim.height} pixels`],
          ],
        };
      }
    } else {
      const url = await vfs.readFileUrl(node.path);
      const isVideo = VIDEO_EXT.includes(ext);
      const info = url
        ? await probeMedia(url, isVideo ? 'video' : 'audio')
        : null;
      if (info) {
        const rows = [];
        const duration = fmtDuration(info.duration);
        if (duration) rows.push(['Duration', duration]);
        if (info.duration > 0 && size) {
          rows.push([
            'Bit Rate',
            `${Math.round((size * 8) / info.duration / 1000)}kbps`,
          ]);
        }
        if (isVideo && info.width) {
          rows.push(['Frame width', `${info.width} pixels`]);
          rows.push(['Frame height', `${info.height} pixels`]);
        }
        if (rows.length)
          technical = { label: isVideo ? 'Video' : 'Audio', rows };
      }
    }

    const sections = [
      section('Description', DESCRIPTION_ROWS, tags),
      technical,
      IMAGE_EXT.includes(ext)
        ? section('Camera', CAMERA_ROWS, tags)
        : section('Origin', ORIGIN_ROWS, tags),
    ].filter(Boolean);

    if (sections.length === 0) return null;
    return { tags, sections };
  } catch {
    // Unreadable — the Summary tab falls back to the editable fields
    return null;
  }
}
