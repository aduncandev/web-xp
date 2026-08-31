/*
 * Proof of work, hashcash style.
 *
 * A visitor asks for a challenge, their browser burns a few hundred
 * milliseconds finding a nonce whose SHA-256 starts with N zero bits, and the
 * solution comes back with the form. One person never notices. Somebody
 * spraying a million guest books has to spend a million times that, which is
 * exactly the asymmetry we want and costs nothing in privacy, no third party,
 * and no puzzle for the visitor to solve by hand.
 *
 * Challenges are HMAC-signed rather than stored, so the server keeps no state
 * between issuing and verifying. Spent nonces are remembered (in SQLite) only
 * long enough to stop a solution being replayed.
 */
import crypto from 'node:crypto';
import { config } from '../config.js';

const sign = payload =>
  crypto
    .createHmac('sha256', config.hmacSecret)
    .update(payload)
    .digest('base64url');

/** A fresh challenge: `<nonce>.<issuedAt>.<bits>.<signature>`. */
export function issueChallenge() {
  const nonce = crypto.randomBytes(16).toString('base64url');
  const issuedAt = Date.now();
  const bits = config.powBits;
  const payload = `${nonce}.${issuedAt}.${bits}`;
  return {
    challenge: `${payload}.${sign(payload)}`,
    bits,
    issuedAt,
    expiresIn: config.challengeTtlMs,
  };
}

/** Leading zero bits of a digest. */
function leadingZeroBits(buf) {
  let bits = 0;
  for (const byte of buf) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}

/**
 * Verifies a solved challenge. `spend` is called with (nonce, expiresAt) and
 * must return false if that nonce was already used.
 *
 * Returns { ok: true } or { ok: false, reason }.
 */
export function verifyChallenge(challenge, solution, spend) {
  if (typeof challenge !== 'string' || typeof solution !== 'string') {
    return { ok: false, reason: 'missing-pow' };
  }
  const parts = challenge.split('.');
  if (parts.length !== 4) return { ok: false, reason: 'malformed-pow' };

  const [nonce, issuedAtRaw, bitsRaw, sig] = parts;
  const payload = `${nonce}.${issuedAtRaw}.${bitsRaw}`;
  const expected = sign(payload);

  // Constant-time compare; timingSafeEqual throws on a length mismatch.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad-signature' };
  }

  const issuedAt = Number(issuedAtRaw);
  const bits = Number(bitsRaw);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(bits)) {
    return { ok: false, reason: 'malformed-pow' };
  }
  const expiresAt = issuedAt + config.challengeTtlMs;
  if (Date.now() > expiresAt) return { ok: false, reason: 'expired-pow' };

  // A challenge minted by an older config must still meet today's bar.
  if (bits < config.powBits) return { ok: false, reason: 'weak-pow' };

  const digest = crypto
    .createHash('sha256')
    .update(`${challenge}${solution}`)
    .digest();
  if (leadingZeroBits(digest) < bits) {
    return { ok: false, reason: 'unsolved-pow' };
  }

  if (!spend(nonce, expiresAt)) return { ok: false, reason: 'replayed-pow' };
  return { ok: true };
}
