"""Find one-pixel lines that differ from both neighbours: the slice grid."""
import sys
from PIL import Image

def scan(path, box=None, thr=18):
    im = Image.open(path).convert('RGB')
    if box: im = im.crop(box)
    W, H = im.size; px = im.load()
    d = lambda a, b: abs(a[0]-b[0]) + abs(a[1]-b[1]) + abs(a[2]-b[2])
    cols, rows = {}, {}
    for y in range(H):
        for x in range(1, W - 1):
            a, b, c = px[x-1, y], px[x, y], px[x+1, y]
            if d(b, a) > thr and d(b, c) > thr and d(a, c) < thr // 2: cols[x] = cols.get(x, 0) + 1
    for x in range(W):
        for y in range(1, H - 1):
            a, b, c = px[x, y-1], px[x, y], px[x, y+1]
            if d(b, a) > thr and d(b, c) > thr and d(a, c) < thr // 2: rows[y] = rows.get(y, 0) + 1
    vlines = [(x, n) for x, n in sorted(cols.items()) if n > H * 0.5]
    hlines = [(y, n) for y, n in sorted(rows.items()) if n > W * 0.5]
    return vlines, hlines, (W, H)

if __name__ == '__main__':
    path = sys.argv[1]
    box = tuple(int(v) for v in sys.argv[2].split(',')) if len(sys.argv) > 2 else None
    v, h, size = scan(path, box)
    print(path, size, 'vertical hairlines', v, 'horizontal hairlines', h)
