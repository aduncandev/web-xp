/*
 * Talking to the guest book server.
 *
 * The only interesting part is the proof of work. The server hands out a
 * signed challenge and the browser has to find a string whose SHA-256, when
 * appended, starts with N zero bits. At the default 18 bits that is about a
 * quarter of a second here and about a quarter of a second times however many
 * thousand sites a spam run is hitting, which is the entire point.
 *
 * It runs in a worker built from a blob so the desktop never stutters while
 * it searches, with a main-thread fallback for anywhere Worker or blob URLs
 * are unavailable. crypto.subtle is not usable for this — it is async per
 * call, and a quarter of a million awaited digests takes seconds — so the
 * worker carries a small synchronous SHA-256.
 */

const BASE = (
  import.meta.env?.VITE_GUESTBOOK_API || 'https://aduncan.dev/gb'
).replace(/\/$/, '');

/* ---- proof of work ------------------------------------------------------ */

/*
 * Kept as source text so it can be both compiled into a worker and called
 * directly on this thread. `solveChallenge` returns the first solution found.
 */
const SOLVER_SOURCE = `
const K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
]);

/** SHA-256 over bytes, returning the first four bytes' worth of leading zeros. */
function leadingZeroBits(bytes) {
  const len = bytes.length;
  const withPad = (((len + 8) >> 6) + 1) << 6;
  const m = new Uint8Array(withPad);
  m.set(bytes);
  m[len] = 0x80;
  const bitLen = len * 8;
  m[withPad - 4] = (bitLen >>> 24) & 0xff;
  m[withPad - 3] = (bitLen >>> 16) & 0xff;
  m[withPad - 2] = (bitLen >>> 8) & 0xff;
  m[withPad - 1] = bitLen & 0xff;

  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,
      h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
  const w = new Uint32Array(64);

  for (let off = 0; off < withPad; off += 64) {
    for (let i = 0; i < 16; i++) {
      const j = off + i * 4;
      w[i] = (m[j] << 24) | (m[j+1] << 16) | (m[j+2] << 8) | m[j+3];
    }
    for (let i = 16; i < 64; i++) {
      const a = w[i-15], b = w[i-2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h=g; g=f; f=e; e=(d + t1) | 0; d=c; c=b; b=a; a=(t1 + t2) | 0;
    }
    h0=(h0+a)|0; h1=(h1+b)|0; h2=(h2+c)|0; h3=(h3+d)|0;
    h4=(h4+e)|0; h5=(h5+f)|0; h6=(h6+g)|0; h7=(h7+h)|0;
  }

  // Only the first word can matter: 32 zero bits is far beyond any difficulty
  // this will ever be set to.
  if (h0 !== 0) return Math.clz32(h0);
  return 32 + (h1 === 0 ? 32 : Math.clz32(h1));
}

function solveChallenge(challenge, bits, budget) {
  const enc = new TextEncoder();
  const prefix = enc.encode(challenge);
  const limit = budget || 50000000;
  for (let n = 0; n < limit; n++) {
    const tail = enc.encode(String(n));
    const buf = new Uint8Array(prefix.length + tail.length);
    buf.set(prefix);
    buf.set(tail, prefix.length);
    if (leadingZeroBits(buf) >= bits) return String(n);
  }
  return null;
}
`;

const WORKER_SOURCE = `${SOLVER_SOURCE}
self.onmessage = e => {
  const { challenge, bits } = e.data;
  try {
    self.postMessage({ solution: solveChallenge(challenge, bits) });
  } catch (err) {
    self.postMessage({ error: String(err && err.message ? err.message : err) });
  }
};
`;

let fallbackSolver = null;

/** Solves on this thread. Only used when a worker cannot be created. */
function solveInline(challenge, bits) {
  if (!fallbackSolver) {
    // eslint-disable-next-line no-new-func
    fallbackSolver = new Function(`${SOLVER_SOURCE}; return solveChallenge;`)();
  }
  return fallbackSolver(challenge, bits);
}

export function solve(challenge, bits) {
  return new Promise(resolve => {
    let worker;
    try {
      const blob = new Blob([WORKER_SOURCE], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      worker = new Worker(url);
      // A challenge is worth at most its TTL; well before that, something is
      // wrong and the inline path is a better answer than hanging.
      const timer = setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(url);
        resolve(solveInline(challenge, bits));
      }, 30000);

      worker.onmessage = e => {
        clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
        resolve(e.data.solution ?? solveInline(challenge, bits));
      };
      worker.onerror = () => {
        clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
        resolve(solveInline(challenge, bits));
      };
      worker.postMessage({ challenge, bits });
    } catch {
      resolve(solveInline(challenge, bits));
    }
  });
}

/* ---- requests ----------------------------------------------------------- */

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* an empty or non-JSON body is not fatal for any call here */
  }

  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  base: BASE,

  listEntries: (limit = 50, offset = 0) =>
    request(`/api/entries?limit=${limit}&offset=${offset}`),

  challenge: () => request('/api/challenge'),

  /** Signs the book: fetch a challenge, solve it, post the entry. */
  async sign({ name, location, message, renderedAt, website, onProgress }) {
    const { challenge, bits } = await this.challenge();
    onProgress?.('Verifying...');
    const solution = await solve(challenge, bits);
    if (!solution) throw new Error('Could not complete the check. Try again.');
    onProgress?.('Signing...');
    return request('/api/entries', {
      method: 'POST',
      body: JSON.stringify({
        name,
        location,
        message,
        challenge,
        solution,
        renderedAt,
        // Whatever ended up in the hidden field. Empty from a person, filled
        // by anything that walks the form and completes every input.
        website: website || '',
      }),
    });
  },

  /* --- moderation --- */
  adminEntries: (token, status) =>
    request(
      `/api/admin/entries${
        status ? `?status=${encodeURIComponent(status)}` : ''
      }`,
      { token },
    ),
  adminStats: token => request('/api/admin/stats', { token }),
  bans: token => request('/api/admin/bans', { token }),
  unban: (token, hash) =>
    request('/api/admin/unban', {
      method: 'POST',
      token,
      body: JSON.stringify({ hash }),
    }),
  approve: (token, id) =>
    request(`/api/admin/entries/${id}/approve`, { method: 'POST', token }),
  reject: (token, id) =>
    request(`/api/admin/entries/${id}/reject`, { method: 'POST', token }),
  remove: (token, id) =>
    request(`/api/admin/entries/${id}`, { method: 'DELETE', token }),
  ban: (token, id, reason) =>
    request(`/api/admin/entries/${id}/ban`, {
      method: 'POST',
      token,
      body: JSON.stringify({ reason: reason || undefined }),
    }),
  reply: (token, id, text) =>
    request(`/api/admin/entries/${id}/reply`, {
      method: 'POST',
      token,
      body: JSON.stringify({ text }),
    }),
};
