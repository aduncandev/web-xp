#!/usr/bin/env python3
"""Export the Luna visual style's parts as PNGs for the web shell.

usage: tools/luna-export.py <luna.msstyles> <out dir>

For each colour scheme (Blue, Olive Green, Silver) the NormalSize theme INI
inside the .msstyles names every themed part and its bitmap. This writes,
under <out dir>/<scheme>/, one PNG per bitmap with its transparent colour
keyed out (or its own alpha kept), one PNG per image state when a bitmap is
a strip of states, and parts.json: every INI section with its properties
(SizingMargins, ContentMargins, ImageCount, colours, fonts) plus SysMetrics,
which the theme code turns into CSS.

Needs: pip install pefile pillow. The .msstyles itself stays out of the repo.
"""
import io
import json
import os
import re
import struct
import sys

import pefile
from PIL import Image

RT_BITMAP = 2
MID_SLICES = {'ScrollThumbVertical', 'ScrollThumbHorizontal'}
DIALOG_FRAMES = {'frameLeft': (1, 3, 4), 'frameRight': (0, 1, 3)}  # checked below against captures
SCHEMES = {
    'blue': ('NORMALBLUE_INI', 'BLUE'),
    'olive': ('NORMALHOMESTEAD_INI', 'HOMESTEAD'),
    'silver': ('NORMALMETALLIC_INI', 'METALLIC'),
}


def read_resources(pe):
    """{name: bytes} for the bitmaps and the text files."""
    out = {}
    for top in pe.DIRECTORY_ENTRY_RESOURCE.entries:
        tname = pefile.RESOURCE_TYPE.get(top.id, str(top.name) if top.name else str(top.id))
        if top.id != RT_BITMAP and tname != 'TEXTFILE':
            continue
        for entry in top.directory.entries:
            name = str(entry.name) if entry.name is not None else str(entry.id)
            lang = entry.directory.entries[0]
            data = pe.get_data(lang.data.struct.OffsetToData, lang.data.struct.Size)
            out[name] = data
    return out


def dib_to_image(dib):
    """A resource DIB (no file header) as an RGBA image."""
    hdr = struct.unpack_from('<I', dib, 0)[0]
    bpp = struct.unpack_from('<H', dib, 14)[0]
    width, height = struct.unpack_from('<ii', dib, 4)
    if bpp == 32:
        pixels = dib[hdr:hdr + width * abs(height) * 4]
        im = Image.frombytes('RGBA', (width, abs(height)), pixels, 'raw', 'BGRA', 0, -1 if height > 0 else 1)
        if not any(im.getchannel('A').getdata()):
            im.putalpha(255)
        return im, bpp
    colors = struct.unpack_from('<I', dib, 32)[0] if hdr >= 40 else 0
    if bpp <= 8 and colors == 0:
        colors = 1 << bpp
    offset = 14 + hdr + colors * 4
    bmp = b'BM' + struct.pack('<IHHI', 14 + len(dib), 0, 0, offset) + dib
    im = Image.open(io.BytesIO(bmp))
    im.load()
    return im.convert('RGBA'), bpp


def parse_ini(text):
    data, cur = {}, None
    for raw in text.splitlines():
        line = raw.split(';', 1)[0].strip()
        if not line:
            continue
        m = re.match(r'^\[(.+)\]$', line)
        if m:
            cur = m.group(1).strip()
            data.setdefault(cur, {})
            continue
        if '=' in line and cur is not None:
            k, v = line.split('=', 1)
            # the INIs spell keys in mixed case (imageCount, ImageCount)
            data[cur][k.strip().lower()] = v.strip()
    return data


def decode_text(raw):
    if raw[:2] == b'\xff\xfe':
        text = raw[2:].decode('utf-16-le')
    elif b'\x00' in raw[:64]:
        text = raw.decode('utf-16-le', 'replace')
    else:
        text = raw.decode('latin-1')
    return text.replace('\x00', '')


def resource_name(image_file):
    # Blue\FrameCaption.bmp -> BLUE_FRAMECAPTION_BMP
    return re.sub(r'[\\.]', '_', image_file).upper()


def key_color(im, color):
    r, g, b = color
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            pr, pg, pb, pa = px[x, y]
            if pr == r and pg == g and pb == b:
                px[x, y] = (pr, pg, pb, 0)
    return im


def triple(s, default):
    try:
        t = tuple(int(v) for v in s.split())
    except Exception:
        return default
    return t if len(t) == 3 else default


def export_scheme(res, scheme, ini_name, out):
    ini = parse_ini(decode_text(res[ini_name]))
    os.makedirs(out, exist_ok=True)
    written = {}
    for section, props in ini.items():
        for key, value in props.items():
            if not re.match(r'^(glyph)?imagefile\d*$', key, re.I):
                continue
            if not value.lower().endswith('.bmp'):
                continue
            base = os.path.splitext(os.path.basename(value.replace('\\', '/')))[0]
            if base in written:
                continue
            rname = resource_name(value)
            if rname not in res:
                print(f'  missing bitmap {rname} for [{section}]')
                continue
            im, bpp = dib_to_image(res[rname])
            transparent = props.get('transparent', props.get('glyphtransparent', '')).lower() == 'true'
            if bpp < 32 and (transparent or key.startswith('glyph') or 'glyph' in base.lower()):
                im = key_color(im, triple(props.get('transparentcolor', ''), (255, 0, 255)))
            im.save(os.path.join(out, base + '.png'))
            count = int(props.get('imagecount', '1') or 1)
            layout = props.get('imagelayout', 'vertical').lower()
            if count > 1:
                w, h = im.size
                for i in range(count):
                    if layout.startswith('horiz'):
                        box = (i * w // count, 0, (i + 1) * w // count, h)
                    else:
                        box = (0, i * h // count, w, (i + 1) * h // count)
                    state = im.crop(box)
                    state.save(os.path.join(out, f'{base}-{i + 1}.png'))
                    if base in DIALOG_FRAMES:
                        # XP draws dialogs with a 3px fixed frame: the sizable
                        # frame's bitmap with its outermost and middle columns
                        # dropped (verified against captures)
                        keep = DIALOG_FRAMES[base]
                        dlg = Image.new('RGBA', (len(keep), state.height))
                        for k, c in enumerate(keep):
                            dlg.paste(state.crop((c, 0, c + 1, state.height)), (k, 0))
                        dlg.save(os.path.join(out, f'{base}-dlg-{i + 1}.png'))
                    if base in MID_SLICES:
                        # the stretchable middle of a nine-sliced bitmap on its
                        # own, for chrome CSS cannot nine-slice (scrollbar thumbs)
                        l, r, t, b = [int(v) for v in props.get('sizingmargins', '0,0,0,0').split(',')]
                        sw, sh = state.size
                        state.crop((l, t, sw - r, sh - b)).save(os.path.join(out, f'{base}-{i + 1}-mid.png'))
            written[base] = {'size': im.size, 'states': count, 'layout': layout, 'bpp': bpp}
    # the frame's inner column: what a hairline between the window's frame
    # pieces should show when the browser lands an edge on a half pixel
    edge = {}
    for state, name in ((1, 'active'), (2, 'inactive')):
        f = os.path.join(out, f'frameLeft-{state}.png')
        if os.path.exists(f):
            im = Image.open(f).convert('RGB')
            edge[name] = list(im.getpixel((im.width - 1, im.height // 2)))
    json.dump({'scheme': scheme, 'parts': ini, 'images': written, 'frameEdge': edge}, open(os.path.join(out, 'parts.json'), 'w'), indent=1)
    print(f'{scheme}: {len(written)} bitmaps, {len(ini)} sections')


def main(msstyles, out):
    pe = pefile.PE(msstyles)
    res = read_resources(pe)
    for scheme, (ini_name, _prefix) in SCHEMES.items():
        export_scheme(res, scheme, ini_name, os.path.join(out, scheme))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
