/*
 * The Luna visual style's own bitmaps, exported from luna.msstyles by
 * tools/luna-export.py into assets/xp/luna/<scheme>/. parts.json there is
 * the style's INI: every part ([Window.Caption], [Start::Button], ...) with
 * its bitmap, sizing margins (left, right, top, bottom), content margins and
 * colours. A part's bitmap is a vertical strip of states; the exporter also
 * wrote one PNG per state as <name>-<n>.png, which is what the CSS uses.
 */
import blue from '../../assets/xp/luna/blue/parts.json';
import olive from '../../assets/xp/luna/olive/parts.json';
import silver from '../../assets/xp/luna/silver/parts.json';

const files = import.meta.glob('../../assets/xp/luna/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const PARTS = { blue, olive, silver };
const urls = {};
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/luna\/(\w+)\/([^/]+)\.png$/);
  if (m) urls[`${m[1]}/${m[2]}`] = url;
}

/** The URL of a part bitmap, or of one state of it (1-based). */
export function lunaImage(scheme, name, state) {
  return urls[`${scheme}/${name}${state ? `-${state}` : ''}`] || null;
}

/** The frame's inner colour, for hairlines between the frame's pieces. */
export function lunaFrameEdge(scheme) {
  const e = (PARTS[scheme] || {}).frameEdge || {};
  const css = v => (Array.isArray(v) ? `rgb(${v.join(',')})` : null);
  return { active: css(e.active), inactive: css(e.inactive) };
}

/** "l, r, t, b" from the INI to numbers. */
const margins = s => (s || '0,0,0,0').split(',').map(v => parseInt(v, 10) || 0);

const baseName = file =>
  file
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/\.bmp$/i, '');

/**
 * A part's definition: image name, state count, sizing and content margins
 * as { l, r, t, b }, colours and fonts, all from the INI section.
 */
export function lunaPart(scheme, section) {
  const props = PARTS[scheme].parts[section];
  if (!props) return null;
  const name = props.imagefile ? baseName(props.imagefile) : null;
  const image = name ? PARTS[scheme].images[name] : null;
  const [sl, sr, st, sb] = margins(props.sizingmargins);
  const [cl, cr, ct, cb] = margins(props.contentmargins);
  return {
    name,
    states: image ? image.states : 1,
    size: image ? image.size : null,
    sizing: { l: sl, r: sr, t: st, b: sb },
    content: { l: cl, r: cr, t: ct, b: cb },
    tile: (props.sizingtype || '').toLowerCase() === 'tile',
    props,
  };
}

/**
 * CSS for drawing a part's state as the element's border image: the nine
 * slices the style declares, stretched or tiled between them. The element
 * needs no other background.
 */
export function nineSlice(scheme, section, state = 1) {
  const part = lunaPart(scheme, section);
  if (!part || !part.name) return '';
  const url = lunaImage(scheme, part.name, part.states > 1 ? state : 0);
  if (!url) return '';
  const { l, r, t, b } = part.sizing;
  const repeat = part.tile ? 'repeat' : 'stretch';
  return `border-style: solid; border-color: transparent; border-width: ${t}px ${r}px ${b}px ${l}px; border-image: url(${url}) ${t} ${r} ${b} ${l} fill ${repeat};`;
}

/** The scheme's system colours and fonts, [SysMetrics] as "r g b" strings etc. */
export function lunaMetrics(scheme) {
  return PARTS[scheme].parts.SysMetrics || {};
}

export const LUNA_SCHEMES = [
  { id: 'blue', name: 'Default (blue)' },
  { id: 'olive', name: 'Olive Green' },
  { id: 'silver', name: 'Silver' },
];
