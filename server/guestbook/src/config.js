/*
 * Every knob the guest book has, read once from the environment.
 *
 * The defaults are the ones I would want running unattended on a personal
 * site: strict enough that nothing embarrassing can appear without a human
 * seeing it, loose enough that a real visitor signing the book gets their
 * entry on the page immediately.
 */
import crypto from 'node:crypto';

const bool = (v, fallback) => {
  if (v == null || v === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(v).trim());
};

const int = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const list = (v, fallback = []) =>
  v == null || v === ''
    ? fallback
    : String(v)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

/**
 * A secret that must survive restarts. Generating one silently would quietly
 * invalidate every outstanding challenge and every stored IP hash on each
 * deploy, so an unset secret is fatal rather than convenient.
 */
function required(name) {
  const v = process.env[name];
  if (!v || v.length < 16) {
    throw new Error(
      `${name} must be set to a random string of at least 16 characters. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }
  return v;
}

export const config = {
  // 8787 because 8080 is AMP on the box this deploys to. Check for a
  // collision before changing it: `ss -tlnp | grep <port>`.
  port: int(process.env.PORT, 8787),
  host: process.env.HOST || '127.0.0.1',
  dbPath: process.env.DB_PATH || './data/guestbook.db',

  /* Secrets */
  adminToken: required('ADMIN_TOKEN'),
  hmacSecret: required('HMAC_SECRET'),

  /* Who may call the API from a browser. */
  allowedOrigins: list(process.env.ALLOWED_ORIGINS, [
    'https://aduncan.dev',
    'http://localhost:3000',
  ]),

  /*
   * Only trust X-Forwarded-For when something we control sets it. Behind
   * nginx/Caddy this is on; exposed directly to the internet it must be off,
   * or every rate limit and ban is trivially bypassed by sending the header.
   */
  trustProxy: bool(process.env.TRUST_PROXY, false),

  /* Field limits, enforced before anything else looks at the text. */
  maxNameLength: int(process.env.MAX_NAME_LENGTH, 32),
  maxMessageLength: int(process.env.MAX_MESSAGE_LENGTH, 800),
  maxLocationLength: int(process.env.MAX_LOCATION_LENGTH, 40),
  minMessageLength: int(process.env.MIN_MESSAGE_LENGTH, 2),
  /*
   * Below this, duplicate detection is skipped. Short guest book messages
   * are legitimately identical to each other, and too small to carry the
   * payload that makes a repeat worth blocking.
   */
  minDuplicateLength: int(process.env.MIN_DUPLICATE_LENGTH, 40),

  /* Anti-bot */
  powBits: int(process.env.POW_BITS, 18), // ~0.2-0.5s in a browser
  challengeTtlMs: int(process.env.CHALLENGE_TTL_MS, 15 * 60 * 1000),
  minFillSeconds: num(process.env.MIN_FILL_SECONDS, 3),

  /* Rate limits, per hashed IP. */
  perIpPerHour: int(process.env.PER_IP_PER_HOUR, 3),
  perIpPerDay: int(process.env.PER_IP_PER_DAY, 8),
  globalPerHour: int(process.env.GLOBAL_PER_HOUR, 120),

  /*
   * Scoring thresholds. Anything at or above holdScore waits for a human;
   * anything at or above blockScore never becomes visible at all.
   */
  holdScore: num(process.env.HOLD_SCORE, 3),
  blockScore: num(process.env.BLOCK_SCORE, 8),

  /*
   * Links are the entire economic motive for guest book spam. Off means a URL
   * in a message is a strong signal and the text renders inert either way.
   */
  allowLinks: bool(process.env.ALLOW_LINKS, false),

  /*
   * Claude moderation classifier — the strongest layer, and the only one
   * that costs money. Entirely optional: with it off, the pattern and
   * structural layers still run and still catch everything they catch.
   *
   * Default is "on only if a key is present", so nothing is spent unless
   * you deliberately provide one, and having no key never means a broken
   * guest book.
   */
  classifier: {
    enabled: bool(
      process.env.CLASSIFIER_ENABLED,
      Boolean(process.env.ANTHROPIC_API_KEY),
    ),
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    // Haiku is the right tier for a yes/no call on a few hundred words,
    // and about a fifth the price of Opus for it.
    model: process.env.CLASSIFIER_MODEL || 'claude-haiku-4-5',
    effort: process.env.CLASSIFIER_EFFORT || 'low',
    timeoutMs: int(process.env.CLASSIFIER_TIMEOUT_MS, 12000),
    /*
     * A hard ceiling on calls per day. The cheap layers reject the vast
     * majority of a flood long before this point, but a determined one
     * could still push a few thousand submissions past them in a day, and
     * the bill for that should not be open-ended. Past the cap, entries
     * take the same path as an outage: held, not published.
     */
    maxPerDay: int(process.env.CLASSIFIER_MAX_PER_DAY, 200),
    /*
     * What to do when the classifier cannot answer (no key, API down,
     * timeout, cap reached). Failing closed means an outage turns the
     * guest book into a queue rather than into an open wall.
     */
    failOpen: bool(process.env.CLASSIFIER_FAIL_OPEN, false),
  },

  /*
   * Discord. Buttons are message components, and only an application can send
   * those — a plain incoming webhook cannot. So the bot token plus a channel
   * id is the real path; webhookUrl is a fallback that still delivers the
   * alert text when no bot is configured, just without the buttons.
   */
  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    channelId: process.env.DISCORD_CHANNEL_ID || '',
    publicKey: process.env.DISCORD_PUBLIC_KEY || '',
    applicationId: process.env.DISCORD_APPLICATION_ID || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
    webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
    /* Only these Discord user IDs may act on buttons and commands. */
    moderatorIds: list(process.env.DISCORD_MODERATOR_IDS),
    /* Ping on every entry, or only ones that need a decision. */
    notifyOnPublished: bool(process.env.DISCORD_NOTIFY_ON_PUBLISHED, true),
  },

  /* Data retention, in days. 0 disables the purge for that class. */
  retention: {
    rawIpDays: int(process.env.RETAIN_RAW_IP_DAYS, 30),
    rejectedDays: int(process.env.RETAIN_REJECTED_DAYS, 30),
    attemptsDays: int(process.env.RETAIN_ATTEMPTS_DAYS, 7),
  },

  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
};

/** Stable pseudonymous identifier for an IP. Survives the raw-IP purge. */
export function hashIp(ip) {
  return crypto
    .createHmac('sha256', config.hmacSecret)
    .update(String(ip))
    .digest('hex')
    .slice(0, 32);
}
