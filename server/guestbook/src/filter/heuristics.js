/*
 * The cheap layer: pattern lists plus structural tells, run over the
 * normalised forms. No network, no state, roughly a millisecond.
 *
 * Everything returns a list of {id, weight, category} signals rather than a
 * verdict, so the pipeline decides what a total means and the moderation UI
 * can show exactly which rules fired.
 */
import { config } from '../config.js';
import {
  aggressive,
  extractUrls,
  longestRun,
  longestToken,
  nonLatinRatio,
  normalize,
  shoutRatio,
  uniqueWordRatio,
} from './normalize.js';
import {
  BAD_DOMAINS,
  BAD_TLDS,
  CSAM_COMBINATION,
  ILLEGAL_PATTERNS,
  SPAM_PATTERNS,
} from './patterns.js';

function runList(list, forms, out) {
  for (const p of list) {
    const subject = forms[p.target] ?? forms.normal;
    if (p.re.test(subject)) {
      out.push({
        id: p.id,
        weight: p.weight,
        category: p.category || 'spam',
      });
    }
  }
}

/**
 * Scores one submission. `fields` is the raw user input; nothing here mutates
 * it. Returns { score, signals, severity }.
 */
export function inspect({ name = '', location = '', message = '' }) {
  const raw = `${name}\n${location}\n${message}`;
  const forms = {
    raw,
    normal: normalize(raw),
    aggressive: aggressive(raw),
  };
  const signals = [];

  runList(SPAM_PATTERNS, forms, signals);
  runList(ILLEGAL_PATTERNS, forms, signals);

  // CSAM combination: both halves, or nothing.
  if (
    CSAM_COMBINATION.minor.test(forms.normal) &&
    CSAM_COMBINATION.sexual.test(forms.normal)
  ) {
    signals.push({
      id: CSAM_COMBINATION.id,
      weight: CSAM_COMBINATION.weight,
      category: CSAM_COMBINATION.category,
    });
  }

  // --- Links ---
  const urls = extractUrls(raw);
  if (urls.length) {
    signals.push({
      id: 'has-link',
      weight: config.allowLinks ? 1 : 3,
      category: 'spam',
      detail: urls.join(', '),
    });
    if (urls.length >= 3) {
      signals.push({ id: 'many-links', weight: 3, category: 'spam' });
    }
    for (const host of urls) {
      if (BAD_DOMAINS.includes(host)) {
        signals.push({
          id: 'shortener',
          weight: 4,
          category: 'spam',
          detail: host,
        });
        break;
      }
    }
    for (const host of urls) {
      const tld = host.split('.').pop();
      if (BAD_TLDS.includes(tld)) {
        signals.push({
          id: 'bad-tld',
          weight: 2,
          category: 'spam',
          detail: host,
        });
        break;
      }
    }
  }

  // --- Shape ---
  const foreign = nonLatinRatio(message);
  const shout = shoutRatio(message);
  if (shout > 0.7) {
    signals.push({ id: 'all-caps', weight: 1.5, category: 'spam' });
  }
  const run = longestRun(message);
  if (run >= 15) {
    signals.push({ id: 'char-flood', weight: 2, category: 'spam' });
  }
  if (foreign > 0.6 && message.length > 40) {
    // Scored, never blocking on its own — plenty of real visitors do not
    // write in Latin script, and the classifier reads any language.
    signals.push({ id: 'non-latin', weight: 1, category: 'spam' });
  }
  if (/(.{10,}?)\1{2,}/.test(normalize(message))) {
    signals.push({ id: 'repeated-block', weight: 3, category: 'spam' });
  }

  /*
   * Repetition, which the block check above misses whenever the repeating
   * unit is short. "overandoverandover..." and "buy buy buy ..." both used
   * to score 2 and publish.
   *
   * Both measures are shape, not content, so they cost nothing and cannot
   * be dodged by changing words. Each is worth a hold on its own, since
   * neither fires on anything a person would actually write.
   */
  const unique = uniqueWordRatio(message);
  if (unique < 0.35) {
    signals.push({
      id: 'repetitive',
      weight: 3,
      category: 'spam',
      detail: `${Math.round(unique * 100)}% unique words`,
    });
  }

  // Skipped for scripts written without spaces, where one long token is
  // simply what a sentence looks like.
  const token = longestToken(message);
  if (token > 30 && foreign < 0.3) {
    signals.push({
      id: 'long-token',
      weight: token > 60 ? 4 : 3,
      category: 'spam',
      detail: `${token} characters unbroken`,
    });
  }
  if (name.length > 24 && !name.includes(' ')) {
    signals.push({ id: 'odd-name', weight: 1, category: 'spam' });
  }
  if (/\bhttps?:|www\./i.test(name) || /\bhttps?:|www\./i.test(location)) {
    signals.push({ id: 'link-in-name', weight: 4, category: 'spam' });
  }

  const score = signals.reduce((n, s) => n + s.weight, 0);
  const severity = signals.some(s =>
    ['csam', 'drugs', 'weapons', 'fraud', 'violence'].includes(s.category),
  )
    ? 'illegal'
    : signals.length
      ? 'spam'
      : null;

  return { score, signals, severity, urls };
}

/** The single worst category present, for routing and alerting. */
export function worstCategory(signals) {
  const order = ['csam', 'violence', 'weapons', 'drugs', 'fraud', 'spam'];
  for (const cat of order) {
    if (signals.some(s => s.category === cat)) return cat;
  }
  return null;
}
