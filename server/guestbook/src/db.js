/*
 * SQLite storage. One file, no migrations framework — the schema is applied
 * with CREATE TABLE IF NOT EXISTS, which is all a single-table-plus-change-log
 * app needs.
 *
 * Two identifiers are kept for each signer. `ip_hash` is an HMAC and lives
 * forever: bans and rate limits match on it, so blocking someone never
 * requires keeping their address. `ip` is the real thing, kept only for the
 * retention window, because that is the part actually useful if something
 * ever has to be reported to somebody.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

fs.mkdirSync(path.dirname(path.resolve(config.dbPath)), { recursive: true });

// node:sqlite ships with Node itself (22+), so there is no native module to
// compile — the server drops onto a box with nothing but a Node runtime.
export const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
// WAL defaults to synchronous=NORMAL, which does not fsync on commit — a
// hard kill can lose the last few writes, and one of those could be the
// record of something worth having a record of. This is a guest book: it
// writes a handful of rows a day, so paying for a sync per commit costs
// nothing that matters.
db.exec('PRAGMA synchronous = FULL');

db.exec(`
CREATE TABLE IF NOT EXISTS entries (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at         INTEGER NOT NULL,
  name               TEXT    NOT NULL,
  location           TEXT,
  message            TEXT    NOT NULL,
  -- published: on the page. pending: waiting for a human.
  -- rejected: a human said no. blocked: the filter said no, never shown.
  status             TEXT    NOT NULL,
  reason             TEXT,
  score              REAL    NOT NULL DEFAULT 0,
  signals            TEXT,
  classifier         TEXT,
  severity           TEXT,
  redacted           INTEGER NOT NULL DEFAULT 0,
  ip                 TEXT,
  ip_hash            TEXT    NOT NULL,
  user_agent         TEXT,
  content_hash       TEXT    NOT NULL,
  reply_text         TEXT,
  reply_at           INTEGER,
  discord_message_id TEXT,
  moderated_by       TEXT,
  moderated_at       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_entries_status  ON entries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_iphash  ON entries(ip_hash);
CREATE INDEX IF NOT EXISTS idx_entries_hash    ON entries(content_hash);
CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(created_at DESC);

CREATE TABLE IF NOT EXISTS bans (
  ip_hash    TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  reason     TEXT,
  created_by TEXT
);

-- Every submission that reached the server, content-free. Rate limits read
-- this, so a bot that trips the honeypot a thousand times still gets counted
-- without a thousand rows of its payload being kept.
CREATE TABLE IF NOT EXISTS attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash    TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  outcome    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_ip ON attempts(ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_at ON attempts(created_at DESC);

-- Proof-of-work challenges are stateless (HMAC-signed), but a solved one must
-- not be replayable, so spent nonces are remembered until they expire.
CREATE TABLE IF NOT EXISTS spent_challenges (
  nonce      TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_spent_exp ON spent_challenges(expires_at);

-- One row per day, counting paid classifier calls. This is what makes the
-- API bill bounded rather than a function of how hard someone floods us.
CREATE TABLE IF NOT EXISTS classifier_usage (
  day   TEXT PRIMARY KEY,
  calls INTEGER NOT NULL
);
`);

const S = {
  insertEntry: db.prepare(`
    INSERT INTO entries (created_at, name, location, message, status, reason,
                         score, signals, classifier, severity, redacted,
                         ip, ip_hash, user_agent, content_hash)
    VALUES (@created_at, @name, @location, @message, @status, @reason,
            @score, @signals, @classifier, @severity, @redacted,
            @ip, @ip_hash, @user_agent, @content_hash)
  `),
  getEntry: db.prepare(`SELECT * FROM entries WHERE id = ?`),
  published: db.prepare(`
    SELECT id, created_at, name, location, message, reply_text, reply_at
    FROM entries WHERE status = 'published'
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `),
  countPublished: db.prepare(
    `SELECT COUNT(*) AS n FROM entries WHERE status = 'published'`,
  ),
  byStatus: db.prepare(`
    SELECT * FROM entries WHERE status = ?
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `),
  allRecent: db.prepare(
    `SELECT * FROM entries ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  ),
  setStatus: db.prepare(`
    UPDATE entries
    SET status = ?, moderated_by = ?, moderated_at = ?, reason = COALESCE(?, reason)
    WHERE id = ?
  `),
  setReply: db.prepare(
    `UPDATE entries SET reply_text = ?, reply_at = ? WHERE id = ?`,
  ),
  setDiscordMessage: db.prepare(
    `UPDATE entries SET discord_message_id = ? WHERE id = ?`,
  ),
  // Every field the visitor supplied, for the same reason the insert
  // path takes all three: the content can be in any of them.
  redact: db.prepare(`
    UPDATE entries
    SET name = '[redacted]', location = NULL, message = '[redacted]',
        redacted = 1
    WHERE id = ?
  `),
  deleteEntry: db.prepare(`DELETE FROM entries WHERE id = ?`),

  // Both carry ip_hash: whether the match is the same person matters as
  // much as whether there is one.
  recentByHash: db.prepare(`
    SELECT id, ip_hash FROM entries
    WHERE content_hash = ? AND created_at > ? LIMIT 1
  `),
  recentBodies: db.prepare(`
    SELECT message, ip_hash FROM entries
    WHERE created_at > ? AND redacted = 0
    ORDER BY created_at DESC LIMIT 60
  `),

  addAttempt: db.prepare(
    `INSERT INTO attempts (ip_hash, created_at, outcome) VALUES (?, ?, ?)`,
  ),
  countAttempts: db.prepare(
    `SELECT COUNT(*) AS n FROM attempts WHERE ip_hash = ? AND created_at > ?`,
  ),
  countAttemptsGlobal: db.prepare(
    `SELECT COUNT(*) AS n FROM attempts WHERE created_at > ?`,
  ),

  isBanned: db.prepare(`SELECT 1 FROM bans WHERE ip_hash = ?`),
  addBan: db.prepare(`
    INSERT INTO bans (ip_hash, created_at, reason, created_by)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(ip_hash) DO UPDATE SET reason = excluded.reason
  `),
  removeBan: db.prepare(`DELETE FROM bans WHERE ip_hash = ?`),
  listBans: db.prepare(`SELECT * FROM bans ORDER BY created_at DESC LIMIT ?`),

  spend: db.prepare(
    `INSERT OR IGNORE INTO spent_challenges (nonce, expires_at) VALUES (?, ?)`,
  ),
  isSpent: db.prepare(`SELECT 1 FROM spent_challenges WHERE nonce = ?`),

  bumpClassifier: db.prepare(`
    INSERT INTO classifier_usage (day, calls) VALUES (?, 1)
    ON CONFLICT(day) DO UPDATE SET calls = calls + 1
  `),
  classifierCalls: db.prepare(
    `SELECT calls FROM classifier_usage WHERE day = ?`,
  ),
  statusCounts: db.prepare(
    `SELECT status, COUNT(*) AS n FROM entries GROUP BY status`,
  ),
};

export const store = {
  insertEntry(row) {
    const info = S.insertEntry.run(row);
    return S.getEntry.get(info.lastInsertRowid);
  },
  get: id => S.getEntry.get(id),
  published: (limit, offset) => S.published.all(limit, offset),
  countPublished: () => S.countPublished.get().n,
  byStatus: (status, limit, offset) => S.byStatus.all(status, limit, offset),
  allRecent: (limit, offset) => S.allRecent.all(limit, offset),
  setStatus: (id, status, by, reason = null) =>
    S.setStatus.run(status, by, Date.now(), reason, id).changes > 0,
  setReply: (id, text) => S.setReply.run(text, Date.now(), id).changes > 0,
  setDiscordMessage: (id, messageId) => S.setDiscordMessage.run(messageId, id),
  redact: id => S.redact.run(id),
  delete: id => S.deleteEntry.run(id).changes > 0,

  /** The matching row, or null — callers need its ip_hash. */
  seenRecently: (hash, since) => S.recentByHash.get(hash, since) || null,
  recentBodies: since => S.recentBodies.all(since),

  addAttempt: (ipHash, outcome) => S.addAttempt.run(ipHash, Date.now(), outcome),
  countAttempts: (ipHash, since) => S.countAttempts.get(ipHash, since).n,
  countAttemptsGlobal: since => S.countAttemptsGlobal.get(since).n,

  isBanned: ipHash => !!S.isBanned.get(ipHash),
  addBan: (ipHash, reason, by) => S.addBan.run(ipHash, Date.now(), reason, by),
  removeBan: ipHash => S.removeBan.run(ipHash).changes > 0,
  listBans: (limit = 50) => S.listBans.all(limit),

  /** True if this challenge nonce had not been spent before. */
  spendChallenge(nonce, expiresAt) {
    if (S.isSpent.get(nonce)) return false;
    S.spend.run(nonce, expiresAt);
    return true;
  },

  /** Paid classifier calls made today (UTC). */
  classifierCallsToday() {
    const day = new Date().toISOString().slice(0, 10);
    return S.classifierCalls.get(day)?.calls ?? 0;
  },
  countClassifierCall() {
    S.bumpClassifier.run(new Date().toISOString().slice(0, 10));
  },

  stats() {
    const out = { published: 0, pending: 0, rejected: 0, blocked: 0 };
    for (const row of S.statusCounts.all()) out[row.status] = row.n;
    return out;
  },
};

/** Drops data past its retention window. Safe to call as often as you like. */
export function purge() {
  const now = Date.now();
  const day = 86400000;
  const r = config.retention;
  const result = { rawIps: 0, rejected: 0, attempts: 0, challenges: 0 };

  if (r.rawIpDays > 0) {
    result.rawIps = db
      .prepare(
        `UPDATE entries SET ip = NULL WHERE ip IS NOT NULL AND created_at < ?`,
      )
      .run(now - r.rawIpDays * day).changes;
  }
  if (r.rejectedDays > 0) {
    result.rejected = db
      .prepare(
        `DELETE FROM entries
         WHERE status IN ('rejected','blocked') AND created_at < ?`,
      )
      .run(now - r.rejectedDays * day).changes;
  }
  if (r.attemptsDays > 0) {
    result.attempts = db
      .prepare(`DELETE FROM attempts WHERE created_at < ?`)
      .run(now - r.attemptsDays * day).changes;
  }
  result.challenges = db
    .prepare(`DELETE FROM spent_challenges WHERE expires_at < ?`)
    .run(now).changes;
  return result;
}
