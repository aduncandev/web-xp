/*
 * A Blob-alike over an HTTP URL.
 *
 * Files that ship with the image are served as static assets rather than held
 * in IndexedDB, so there is no Blob to hand a reader. Downloading the whole
 * thing is not an option either — the tag readers want a few kilobytes from
 * the front or the back of a file, and one of the sample tracks is a 48 MB
 * wave. This exposes `size` and `slice()`, which is the entire surface they
 * use, and fetches each range as it is asked for.
 *
 * A server that ignores Range headers answers the probe with the whole file;
 * that reply is kept and sliced locally, so correctness never depends on range
 * support, only speed does.
 */

/** The part of a remote file a `slice()` refers to. Read when awaited. */
class RemoteSlice {
  constructor(file, start, end) {
    this.file = file;
    this.start = start;
    this.end = end;
  }

  get size() {
    return this.end - this.start;
  }

  arrayBuffer() {
    return this.file.read(this.start, this.end);
  }

  slice(start, end) {
    const clamp = (v, fallback) => {
      if (v == null) return fallback;
      const abs = v < 0 ? this.size + v : v;
      return Math.max(0, Math.min(this.size, abs));
    };
    const from = clamp(start, 0);
    const to = Math.max(from, clamp(end, this.size));
    return new RemoteSlice(this.file, this.start + from, this.start + to);
  }
}

class RemoteFile {
  constructor(url, size, ranged, mimeType, whole) {
    this.url = url;
    this.size = size;
    this.type = mimeType || '';
    this.ranged = ranged;
    this.whole = whole || null; // a full copy, once one has been fetched
  }

  /** Blob.slice semantics: negative offsets count back from the end. */
  slice(start, end) {
    return new RemoteSlice(this, 0, this.size).slice(start, end);
  }

  arrayBuffer() {
    return this.read(0, this.size);
  }

  async read(start, end) {
    if (end <= start) return new ArrayBuffer(0);
    if (this.ranged) {
      const res = await fetch(this.url, {
        headers: { Range: `bytes=${start}-${end - 1}` },
      });
      if (res.status === 206) return res.arrayBuffer();
      // The server changed its mind about ranges; take the full body instead.
      this.ranged = false;
      this.whole = await res.arrayBuffer();
    }
    if (!this.whole) {
      const res = await fetch(this.url);
      this.whole = await res.arrayBuffer();
    }
    return this.whole.slice(start, Math.min(end, this.whole.byteLength));
  }
}

/**
 * Open `url` for reading. One tiny request settles both the real length and
 * whether ranges are honoured — the length recorded in the file system is a
 * rounded-off approximation, and reading the last 128 bytes of a file needs
 * the true one.
 */
export async function openRemoteFile(url, mimeType) {
  let res;
  try {
    res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const type = res.headers.get('content-type') || mimeType || '';
  if (res.status === 206) {
    // "bytes 0-0/2366258" — the part after the slash is what we came for
    const total = Number(
      (res.headers.get('content-range') || '').split('/')[1],
    );
    if (Number.isFinite(total) && total > 0)
      return new RemoteFile(url, total, true, type);
  }
  // No range support: this reply is the whole file, so keep it.
  const whole = await res.arrayBuffer();
  return new RemoteFile(url, whole.byteLength, false, type, whole);
}
