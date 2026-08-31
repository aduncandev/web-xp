/*
 * Text normalisation for *matching only*. Nothing here ever touches what gets
 * displayed — an entry is always shown exactly as it was typed.
 *
 * The point is that a word list is worthless against anyone who tries even
 * slightly. "vi agra" with a Cyrillic i, "v-i-a-g-r-a", the fullwidth form,
 * and the plain spelling are one word to a reader and four different strings
 * to a naive includes(). Everything below collapses those back together
 * before any pattern is applied.
 */

/**
 * Characters that carry no visible weight but break substring matching:
 * soft hyphen, Mongolian vowel separator, the zero-width set, the bidi
 * overrides, the invisible maths operators, and the BOM.
 */
const INVISIBLE = new RegExp(
  '[\\u00AD\\u180E\\u200B-\\u200F\\u202A-\\u202E' +
    '\\u2060-\\u2064\\u206A-\\u206F\\uFEFF]',
  'g',
);

/** Combining marks — stripped so Zalgo text and accented letters collapse. */
const COMBINING = new RegExp(
  '[\\u0300-\\u036F\\u0483-\\u0489\\u1AB0-\\u1AFF' +
    '\\u1DC0-\\u1DFF\\u20D0-\\u20F0\\uFE20-\\uFE2F]',
  'g',
);

/** Anything outside ASCII, for the confusable sweep. */
const NON_ASCII = new RegExp('[^\\u0000-\\u007F]', 'gu');

/**
 * Latin, Latin Extended, general punctuation and currency. What is left after
 * removing these is genuinely another script.
 */
const LATINISH = new RegExp(
  '[\\u0000-\\u024F\\u2000-\\u206F\\u20A0-\\u20CF]',
  'g',
);

/**
 * Homoglyphs that survive NFKC because they are genuinely distinct letters in
 * their own scripts. Cyrillic and Greek supply almost every one that matters.
 */
const CONFUSABLES = {
  'а': 'a', 'б': 'b', 'в': 'b', 'г': 'r', 'д': 'd',
  'е': 'e', 'ж': 'x', 'з': '3', 'и': 'u', 'к': 'k',
  'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c',
  'т': 't', 'у': 'y', 'х': 'x', 'ѕ': 's', 'і': 'i',
  'ї': 'i', 'ј': 'j', 'ԁ': 'd', 'ѵ': 'v', 'ց': 'g',
  'ᴏ': 'o', 'ⅰ': 'i', 'α': 'a', 'β': 'b', 'ε': 'e',
  'ι': 'i', 'κ': 'k', 'ν': 'v', 'ο': 'o', 'ρ': 'p',
  'τ': 't', 'υ': 'u', 'χ': 'x', 'ѡ': 'w', 'ʟ': 'l',
  'ɢ': 'g', 'ʀ': 'r', 'ɪ': 'i', 'ʏ': 'y', 'ᴠ': 'v',
};

/** Leetspeak, applied only in the aggressive form. */
const LEET = {
  '4': 'a', '@': 'a', '8': 'b', '3': 'e', '1': 'i', '!': 'i', '|': 'i',
  '0': 'o', '5': 's', $: 's', '7': 't', '+': 't', '9': 'g',
};

/**
 * Conservative pass: canonical composition, invisibles gone, accents folded,
 * homoglyphs mapped home, whitespace collapsed, lowercased.
 *
 * Word boundaries survive this, so it is what word-shaped patterns run against.
 */
export function normalize(input) {
  let s = String(input == null ? '' : input);
  s = s.normalize('NFKC');
  s = s.replace(INVISIBLE, '');
  s = s
    .normalize('NFD')
    .replace(COMBINING, '')
    .normalize('NFC');
  s = s.toLowerCase();
  s = s.replace(NON_ASCII, ch => CONFUSABLES[ch] || ch);
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Aggressive pass: everything above, plus leetspeak folded, every separator
 * between letters removed, and runs of a repeated letter squashed to two.
 *
 * This turns "f.r.e.e v-i-a-g-r-4!!!" into "freeviagra", which is the only way
 * a list of words catches deliberate obfuscation. It also destroys word
 * boundaries, so patterns matched against it must be specific enough not to
 * fire inside innocent text.
 */
export function aggressive(input) {
  let s = normalize(input);
  s = s.replace(/[0-9@$!|+]/g, ch => LEET[ch] || ch);
  s = s.replace(/[^a-z]/g, '');
  s = s.replace(/(.)\1{2,}/g, '$1$1');
  return s;
}

/** Fraction of characters that are neither Latin, digits, nor punctuation. */
export function nonLatinRatio(input) {
  const s = String(input || '').replace(/\s/g, '');
  if (!s.length) return 0;
  return s.replace(LATINISH, '').length / s.length;
}

/** Fraction of letters that are upper case, ignoring messages with few letters. */
export function shoutRatio(input) {
  const letters = String(input || '').replace(/[^a-zA-Z]/g, '');
  if (letters.length < 12) return 0;
  return letters.replace(/[^A-Z]/g, '').length / letters.length;
}

/**
 * Longest run of characters with no space in it.
 *
 * "overandoverandover..." is a single 98-character token, and no natural
 * language produces those — the longest words anyone actually writes sit
 * around 30. Scripts written without spaces would trip this on every
 * message, so the caller skips it when the text is mostly non-Latin.
 */
export function longestToken(input) {
  const tokens = String(input || '').split(/\s+/).filter(Boolean);
  return tokens.reduce((n, t) => Math.max(n, t.length), 0);
}

/**
 * Distinct words as a fraction of total words.
 *
 * "buy buy buy buy ..." is one unique word over thirty, which no real
 * message looks like. Returns 1 for anything too short to judge, so a
 * brief message is never penalised for having few words.
 */
export function uniqueWordRatio(input) {
  const words = normalize(input)
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 1);
  if (words.length < 8) return 1;
  return new Set(words).size / words.length;
}

/** Longest run of one repeated character. */
export function longestRun(input) {
  const m = String(input || '').match(/(.)\1*/g);
  return m ? Math.max(...m.map(r => r.length)) : 0;
}

/*
 * Final labels that count as a domain.
 *
 * Without this, collapsing the spaces around a dot — which is what catches
 * "example . com" — also turns every sentence boundary into a domain:
 * "my first PC. The startup sound" becomes "pc.the", and a perfectly ordinary
 * entry gets held for review. Requiring a real TLD is what separates the two.
 *
 * Failing to recognise an obscure TLD only means a link goes unscored, which
 * is the right direction to be wrong in — the content patterns still apply.
 * Holding somebody's normal message is not.
 */
const KNOWN_TLDS = new Set(
  ('com org net int edu gov mil info biz name pro mobi io ai app dev co me ' +
    'tv cc ly sh gg xyz top site online store shop club live life world ' +
    'space website tech cloud digital media news blog wiki art design ' +
    'studio agency solutions services systems network email link click ' +
    'download stream host press fun icu buzz work bid win review party ' +
    'science date racing loan country kim cf ga gq ml tk su ru ua cn jp ' +
    'kr in au nz ca us br mx ar za ie pt gr tr il ae sa sg hk tw th vn id ' +
    'my ph hu ro bg hr si sk lt lv ee is lu mt cy rs ba md ge am az kz by ' +
    'uk de fr es it nl be ch at se no dk fi pl cz eu').split(' '),
);


/**
 * URLs, including the forms people use to dodge a naive http check: bare
 * domains, "example .com", "example(dot)com", and "hxxp://".
 */
export function extractUrls(input) {
  const s = normalize(input)
    .replace(/\s*[([{]\s*dot\s*[)\]}]\s*/g, '.')
    .replace(/\s+dot\s+/g, '.')
    .replace(/hxxp/g, 'http')
    /*
     * Only collapse a dot that has whitespace BEFORE it.
     *
     * "example . com" and "example .com" are somebody hiding a domain.
     * "reach out. My team" is a sentence, and collapsing that produces
     * "out.my" — which is a real TLD, so every message with a sentence
     * starting My, In, It, Is, At, No, Us or Me looked like a link.
     * A space before the dot is what separates the two.
     */
    .replace(/\s+\.\s*/g, '.');

  const out = new Set();
  const re = /\b(?:https?:\/\/)?((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24})(?:\/\S*)?/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (/^\d+(\.\d+)*$/.test(m[1])) continue; // version numbers, not hosts
    const tld = m[1].split('.').pop();
    if (!KNOWN_TLDS.has(tld)) continue; // a sentence boundary, not a host
    out.add(m[1]);
  }
  return [...out];
}

/** Cheap similarity for near-duplicate detection: shared 4-gram ratio. */
export function similarity(a, b) {
  const grams = str => {
    const s = aggressive(str);
    const set = new Set();
    for (let i = 0; i + 4 <= s.length; i++) set.add(s.slice(i, i + 4));
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return shared / Math.min(A.size, B.size);
}
