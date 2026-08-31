/*
 * The guest book server.
 *
 * Plain node:http — the whole surface is nine routes, and a framework would
 * be more code to audit than the thing it wraps.
 *
 * Public:
 *   GET  /api/health
 *   GET  /api/challenge                    proof-of-work challenge
 *   GET  /api/entries                      published entries
 *   POST /api/entries                      sign the book
 *   POST /api/discord/interactions         Discord buttons and commands
 *
 * Admin (Authorization: Bearer <ADMIN_TOKEN>):
 *   GET    /api/admin/entries?status=
 *   GET    /api/admin/stats
 *   GET    /api/admin/bans
 *   POST   /api/admin/entries/:id/:action   approve|reject|reply|ban
 *   DELETE /api/admin/entries/:id
 *   POST   /api/admin/unban
 */
import crypto from 'node:crypto';
import http from 'node:http';
import { config, hashIp } from './config.js';
import { purge, store } from './db.js';
import { evaluate, contentHash } from './filter/index.js';
import { issueChallenge } from './filter/pow.js';
import { handleInteraction } from './discord/interactions.js';
import { verifyInteractionSignature } from './discord/api.js';
import { notify } from './discord/notify.js';
import { actions } from './moderation.js';

const MAX_BODY = 64 * 1024;

/* --- helpers --- */

function send(res, status, body, extraHeaders = {}) {
  const payload = body == null ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  res.end(payload);
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin || !config.allowedOrigins.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * The client's address. X-Forwarded-For is only believed when TRUST_PROXY is
 * set, because otherwise anyone can send the header and walk past every rate
 * limit and ban in the place.
 */
function clientIp(req) {
  if (config.trustProxy) {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
    const real = req.headers['x-real-ip'];
    if (real) return String(real).trim();
  }
  return req.socket.remoteAddress || '0.0.0.0';
}

function isAdmin(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(token);
  const b = Buffer.from(config.adminToken);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** What the public sees. Never the IP, the score, or the filter's reasoning. */
const publicView = row => ({
  id: row.id,
  name: row.name,
  location: row.location || null,
  message: row.message,
  createdAt: row.created_at,
  reply: row.reply_text || null,
  replyAt: row.reply_at || null,
});

/* --- routes --- */

async function handlePublicEntries(req, res, url) {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 25, 1), 100);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
  send(res, 200, {
    entries: store.published(limit, offset).map(publicView),
    total: store.countPublished(),
    limit,
    offset,
  });
}

async function handleSign(req, res, rawBody) {
  let body;
  try {
    body = JSON.parse(rawBody.toString('utf8') || '{}');
  } catch {
    return send(res, 400, { error: 'Malformed request.' });
  }

  const ip = clientIp(req);
  const ipHash = hashIp(ip);
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 300);

  const verdict = await evaluate({ ...body, ipHash });
  store.addAttempt(ipHash, verdict.action);

  if (verdict.action === 'reject') {
    // Deliberately vague. Telling a bot which layer caught it is free tuning
    // data for whoever wrote it. Genuine mistakes (too long, empty) do get a
    // real message, because a person needs to know what to fix.
    /*
     * Vague on purpose for the detection layers: naming the one that fired
     * hands whoever wrote the bot a free tuning signal. A ban is different —
     * it is a decision a person made, it will not change on a retry, and
     * leaving someone to guess is just rude. The reason is still withheld,
     * since those are notes to self and not always diplomatic.
     */
    const message =
      verdict.reason === 'invalid'
        ? verdict.message
        : verdict.reason === 'banned'
          ? 'You are no longer able to sign this guest book.'
          : verdict.reason === 'duplicate' || verdict.reason === 'near-duplicate'
            ? 'You have already left that message.'
            : verdict.reason.startsWith('rate')
              ? 'You have signed the guest book recently. Please try again later.'
              : 'Your entry could not be accepted. Please try again.';
    const status =
      verdict.reason === 'banned'
        ? 403
        : verdict.reason.startsWith('rate')
          ? 429
          : 400;
    return send(res, status, {
      error: message,
    });
  }

  const status =
    verdict.action === 'publish'
      ? 'published'
      : verdict.action === 'hold'
        ? 'pending'
        : 'blocked';

  const name = String(body.name || '').trim();
  const message = String(body.message || '').trim();
  const location = body.location ? String(body.location).trim() : null;

  const entry = store.insertEntry({
    created_at: Date.now(),
    /*
     * The highest-severity category is recorded but never kept, and that
     * has to mean every field the visitor typed — not just the body.
     * A name or a "from" is as capable of carrying the content as the
     * message is, and redacting only the message left it stored in full.
     *
     * Nothing is lost by taking all three: a redacted entry can never be
     * published, and a ban matches on the hash rather than the name.
     */
    name: verdict.redact ? '[redacted]' : name,
    location: verdict.redact ? null : location,
    message: verdict.redact ? '[redacted]' : message,
    status,
    reason: verdict.reason || null,
    score: verdict.score ?? 0,
    signals: JSON.stringify(verdict.signals || []),
    classifier: verdict.classifier ? JSON.stringify(verdict.classifier) : null,
    severity: verdict.category || verdict.severity || null,
    redacted: verdict.redact ? 1 : 0,
    // Kept for redacted entries too, and deliberately: the address is the
    // only useful thing left once the content is gone.
    ip,
    ip_hash: ipHash,
    user_agent: userAgent,
    content_hash: contentHash({ name, message }),
  });

  notify(entry, { store });

  if (status === 'published') {
    return send(res, 201, { status: 'published', entry: publicView(entry) });
  }
  // A held entry and a blocked one look identical from outside. Saying
  // "blocked" would tell a spammer their payload was recognised.
  return send(res, 202, {
    status: 'pending',
    message: 'Thanks! Your entry will appear once it has been reviewed.',
  });
}

async function handleAdmin(req, res, url, rawBody) {
  if (!isAdmin(req)) return send(res, 401, { error: 'Unauthorized' });

  const parts = url.pathname.split('/').filter(Boolean); // api admin ...
  const section = parts[2];

  if (req.method === 'GET' && section === 'stats') {
    return send(res, 200, { stats: store.stats() });
  }
  if (req.method === 'GET' && section === 'bans') {
    return send(res, 200, { bans: store.listBans(200) });
  }
  if (req.method === 'GET' && section === 'entries') {
    const status = url.searchParams.get('status');
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 200);
    const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
    const rows = status
      ? store.byStatus(status, limit, offset)
      : store.allRecent(limit, offset);
    return send(res, 200, {
      entries: rows.map(r => ({
        ...r,
        signals: r.signals ? JSON.parse(r.signals) : [],
        classifier: r.classifier ? JSON.parse(r.classifier) : null,
      })),
      stats: store.stats(),
    });
  }

  let body = {};
  if (rawBody?.length) {
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return send(res, 400, { error: 'Malformed request.' });
    }
  }

  if (req.method === 'POST' && section === 'unban') {
    return send(res, 200, actions.unban(String(body.hash || '')));
  }

  if (section === 'entries' && parts[3]) {
    const id = Number(parts[3]);
    const action = parts[4];
    const actor = 'admin-panel';

    if (req.method === 'DELETE') {
      return send(res, 200, await actions.remove(id, actor));
    }
    if (req.method === 'POST') {
      switch (action) {
        case 'approve':
          return send(res, 200, await actions.approve(id, actor));
        case 'reject':
          return send(res, 200, await actions.reject(id, actor, body.reason));
        case 'reply':
          return send(res, 200, await actions.reply(id, body.text, actor));
        case 'ban':
          return send(res, 200, await actions.ban(id, actor, body.reason));
        default:
          return send(res, 404, { error: 'Unknown action' });
      }
    }
  }

  return send(res, 404, { error: 'Not found' });
}

async function handleDiscord(req, res, rawBody) {
  const ok = verifyInteractionSignature(
    rawBody,
    req.headers['x-signature-ed25519'],
    req.headers['x-signature-timestamp'],
  );
  // Discord requires exactly 401 here, and checks it when you save the URL.
  if (!ok) {
    // Discord shows the user "the application did not respond" and says
    // nothing about why, so this is the only place the reason exists.
    console.warn(
      '[discord] refused an interaction: ' +
        (!config.discord.publicKey
          ? 'DISCORD_PUBLIC_KEY is not set in this process (restart after editing .env)'
          : !req.headers['x-signature-ed25519']
            ? 'no signature headers - is something stripping them?'
            : 'signature did not verify - DISCORD_PUBLIC_KEY likely belongs to a different application'),
    );
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    return res.end('invalid request signature');
  }

  let body;
  try {
    body = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return send(res, 400, { error: 'Malformed request.' });
  }
  send(res, 200, await handleInteraction(body));
}

/* --- server --- */

const server = http.createServer(async (req, res) => {
  // Set once, up front, so every path below answers with the same policy —
  // including the error paths, which are the easy ones to forget.
  for (const [key, value] of Object.entries(corsHeaders(req))) {
    res.setHeader(key, value);
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    return send(res, 400, { error: 'Bad request' });
  }

  try {
    if (url.pathname === '/api/health') {
      return send(res, 200, { ok: true, stats: store.stats() });
    }

    if (url.pathname === '/api/challenge' && req.method === 'GET') {
      return send(res, 200, issueChallenge());
    }

    if (url.pathname === '/api/entries' && req.method === 'GET') {
      return handlePublicEntries(req, res, url);
    }

    const needsBody = req.method === 'POST' || req.method === 'DELETE';
    const rawBody = needsBody ? await readBody(req) : Buffer.alloc(0);

    if (url.pathname === '/api/entries' && req.method === 'POST') {
      return handleSign(req, res, rawBody);
    }

    if (url.pathname === '/api/discord/interactions' && req.method === 'POST') {
      return handleDiscord(req, res, rawBody);
    }

    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdmin(req, res, url, rawBody);
    }

    return send(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) send(res, 500, { error: 'Internal error' });
  }
});

server.listen(config.port, config.host, () => {
  console.log(
    `guest book listening on http://${config.host}:${config.port}\n` +
      `  origins:     ${config.allowedOrigins.join(', ')}\n` +
      `  trust proxy: ${config.trustProxy}\n` +
      `  classifier:  ${config.classifier.enabled ? config.classifier.model : 'off'}` +
      `${config.classifier.enabled && !config.classifier.apiKey ? ' (NO API KEY — entries will queue)' : ''}\n` +
      `  discord:     ${config.discord.botToken && config.discord.channelId ? 'bot' : config.discord.webhookUrl ? 'webhook (no buttons)' : 'off'}` +
      `
  interactions: ${
        !config.discord.publicKey
          ? 'OFF - no DISCORD_PUBLIC_KEY'
          : !config.discord.moderatorIds.length
            ? 'OFF - no DISCORD_MODERATOR_IDS'
            : `ready (${config.discord.moderatorIds.length} moderator)`
      }`,
  );
});

// Retention is a background chore, not a cron job to forget to install.
setInterval(() => {
  try {
    purge();
  } catch (err) {
    console.error('[purge]', err.message);
  }
}, 6 * 3600000).unref();
purge();
