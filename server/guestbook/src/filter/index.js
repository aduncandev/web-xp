/*
 * The pipeline. Layers run cheapest-first and stop at the first one that
 * settles the submission, so a bot spraying the endpoint costs a few
 * microseconds of regex and never reaches the paid classifier.
 *
 *   1. shape        — field lengths and required values
 *   2. ban          — this signer is already blocked
 *   3. rate         — too many, too fast, from one place or overall
 *   4. trap         — honeypot field, form filled impossibly quickly
 *   5. proof        — the work challenge was solved and not replayed
 *   6. duplicate    — same text, or near enough, seen recently
 *   7. heuristics   — pattern lists and structural tells, scored
 *   8. classifier   — Claude reads it, if the layers above did not settle it
 *
 * Four outcomes:
 *   reject   never stored; the submitter sees a generic failure
 *   block    stored but invisible to everyone, and alerted on
 *   hold     stored, waiting for a human
 *   publish  live on the page
 */
import crypto from 'node:crypto';
import { config } from '../config.js';
import { store } from '../db.js';
import { classify } from './classify.js';
import { inspect, worstCategory } from './heuristics.js';
import { verifyChallenge } from './pow.js';
import { normalize, similarity } from './normalize.js';

/** Control characters, which no real guest book entry contains. */
const CONTROL_CHARS = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]');

const HOUR = 3600000;
const DAY = 86400000;

const contentHash = ({ name, message }) =>
  crypto
    .createHash('sha256')
    .update(`${normalize(name)}|${normalize(message)}`)
    .digest('hex')
    .slice(0, 32);

/** Field-level validation. Returns an error string, or null when fine. */
function checkShape({ name, message, location }) {
  if (typeof name !== 'string' || typeof message !== 'string') {
    return 'name and message are required';
  }
  const n = name.trim();
  const m = message.trim();
  if (!n) return 'Please enter a name.';
  if (n.length > config.maxNameLength) {
    return `Name must be ${config.maxNameLength} characters or fewer.`;
  }
  if (m.length < config.minMessageLength) return 'Please enter a message.';
  if (m.length > config.maxMessageLength) {
    return `Message must be ${config.maxMessageLength} characters or fewer.`;
  }
  if (location && String(location).length > config.maxLocationLength) {
    return `Location must be ${config.maxLocationLength} characters or fewer.`;
  }
  // Control characters have no business in a guest book entry and are a
  // reliable sign the submission did not come from the form.
  if (CONTROL_CHARS.test(`${n}${m}`)) {
    return 'Message contains invalid characters.';
  }
  return null;
}

/**
 * Runs one submission through every layer.
 *
 * `input` is the raw request body plus { ip, ipHash, userAgent }.
 * Returns { action, reason, status, score, signals, classifier, severity,
 *           redact, message }.
 */
export async function evaluate(input) {
  const {
    name = '',
    location = '',
    message = '',
    website = '', // honeypot
    challenge,
    solution,
    renderedAt,
    ipHash,
  } = input;

  const reject = reason => ({ action: 'reject', reason });

  // 1. shape
  const shapeError = checkShape({ name, message, location });
  if (shapeError) return { action: 'reject', reason: 'invalid', message: shapeError };

  // 2. ban
  if (store.isBanned(ipHash)) return reject('banned');

  // 3. rate limits
  const now = Date.now();
  if (store.countAttempts(ipHash, now - HOUR) >= config.perIpPerHour) {
    return reject('rate-hour');
  }
  if (store.countAttempts(ipHash, now - DAY) >= config.perIpPerDay) {
    return reject('rate-day');
  }
  if (store.countAttemptsGlobal(now - HOUR) >= config.globalPerHour) {
    return reject('rate-global');
  }

  // 4. traps. A hidden field that only a scraper would fill, and a form that
  //    came back faster than a person could have read it.
  if (String(website).trim() !== '') return reject('honeypot');
  const age = (now - Number(renderedAt)) / 1000;
  if (Number.isFinite(age) && age < config.minFillSeconds) {
    return reject('too-fast');
  }

  // 5. proof of work
  const pow = verifyChallenge(challenge, solution, (nonce, expiresAt) =>
    store.spendChallenge(nonce, expiresAt),
  );
  if (!pow.ok) return reject(pow.reason);

  /*
   * 6. duplicates
   *
   * Two questions the old version conflated. Is the text the same, and is
   * it the same person? Only the second makes it spam.
   *
   * Short messages are exempt entirely. "Nice site!" and "Hello!" are what
   * a guest book is mostly made of, any two of them match at similarity
   * 1.00, and there is no room in forty characters for the link and pitch
   * that make a duplicate worth stopping. Rejecting them told genuine
   * visitors they had already written something they never wrote.
   */
  const hash = contentHash({ name, message });
  if (message.length >= config.minDuplicateLength) {
    const exact = store.seenRecently(hash, now - 7 * DAY);
    if (exact) {
      // The same person sending it twice is a duplicate. Somebody else
      // arriving at the same words is a coincidence worth a human glance,
      // so it waits rather than vanishing.
      if (exact.ip_hash === ipHash) return reject('duplicate');
      return {
        action: 'hold',
        reason: 'identical to an existing entry from a different signer',
        score: 0,
        signals: [],
        severity: null,
        category: null,
      };
    }
    for (const row of store.recentBodies(now - DAY)) {
      if (similarity(message, row.message) <= 0.85) continue;
      if (row.ip_hash === ipHash) return reject('near-duplicate');
      return {
        action: 'hold',
        reason: 'very similar to a recent entry from a different signer',
        score: 0,
        signals: [],
        severity: null,
        category: null,
      };
    }
  }

  // 7. heuristics
  const { score, signals, severity } = inspect({ name, location, message });
  const category = worstCategory(signals);

  if (score >= config.blockScore) {
    return {
      action: 'block',
      reason: `filter: ${signals.map(s => s.id).join(', ')}`,
      score,
      signals,
      severity,
      category,
      // The worst category is not something to keep a copy of. Metadata is
      // retained so there is a record; the text itself is not stored.
      redact: category === 'csam',
    };
  }

  // 8. classifier
  let verdict = null;
  if (config.classifier.enabled) {
    verdict = await classify({ name, location, message });

    if (verdict.available) {
      if (verdict.verdict === 'block') {
        const modelCategory = (verdict.categories || []).find(c =>
          ['csam', 'drugs', 'weapons', 'fraud', 'violence', 'threat', 'doxxing'].includes(c),
        );
        return {
          action: 'block',
          reason: `classifier: ${verdict.reason}`,
          // The real heuristic score, not one inflated to the block
          // threshold. An entry the patterns scored 0 on and the model
          // blocked is exactly the case worth being able to see.
          score,
          signals,
          severity: 'illegal',
          category: modelCategory || category || 'other',
          classifier: verdict,
          redact: modelCategory === 'csam',
        };
      }
      if (verdict.verdict === 'review') {
        return {
          action: 'hold',
          reason: `classifier: ${verdict.reason}`,
          score,
          signals,
          severity,
          category,
          classifier: verdict,
        };
      }
    } else if (!config.classifier.failOpen) {
      // No judgement and we fail closed: queue it rather than publish it.
      return {
        action: 'hold',
        reason: `classifier unavailable (${verdict.reason})`,
        score,
        signals,
        severity,
        category,
        classifier: verdict,
      };
    }
  }

  // The heuristics' own hold threshold, applied after the model has had its
  // say — a clean "allow" does not override a pile of spam signals.
  if (score >= config.holdScore) {
    return {
      action: 'hold',
      reason: `score ${score}: ${signals.map(s => s.id).join(', ')}`,
      score,
      signals,
      severity,
      category,
      classifier: verdict,
    };
  }

  return {
    action: 'publish',
    reason: null,
    score,
    signals,
    severity,
    category,
    classifier: verdict,
  };
}

export { contentHash };
