/*
 * Every moderation action, in one place.
 *
 * Discord buttons, Discord slash commands and the in-app admin panel all call
 * these — so "approve" means exactly the same thing however it was triggered,
 * and there is one place to change if it should mean something else.
 *
 * Each returns { ok, message, entry } so the caller only has to render it.
 */
import { store } from './db.js';
import { refresh } from './discord/notify.js';

const notFound = id => ({ ok: false, message: `No entry #${id}.` });

/** Publishes an entry, whether it was held, rejected, or filter-blocked. */
export async function approve(id, actor) {
  const entry = store.get(id);
  if (!entry) return notFound(id);
  if (entry.redacted) {
    return {
      ok: false,
      message:
        `Entry #${id} was redacted on arrival — its text was never stored, ` +
        `so there is nothing to publish.`,
      entry,
    };
  }
  if (entry.status === 'published') {
    return { ok: true, message: `Entry #${id} is already published.`, entry };
  }
  store.setStatus(id, 'published', actor);
  const updated = store.get(id);
  await refresh(updated, `Published by ${actor}`);
  return { ok: true, message: `Published entry #${id}.`, entry: updated };
}

/** Takes an entry off the page without destroying it. */
export async function reject(id, actor, reason = null) {
  const entry = store.get(id);
  if (!entry) return notFound(id);
  store.setStatus(id, 'rejected', actor, reason);
  const updated = store.get(id);
  await refresh(updated, `Rejected by ${actor}`);
  return { ok: true, message: `Rejected entry #${id}.`, entry: updated };
}

/** Destroys the row outright. */
export async function remove(id, actor) {
  const entry = store.get(id);
  if (!entry) return notFound(id);
  store.delete(id);
  await refresh(
    { ...entry, status: 'rejected', message: '[deleted]', redacted: 1 },
    `Deleted by ${actor}`,
  );
  return { ok: true, message: `Deleted entry #${id}.`, entry };
}

/**
 * Bans the signer behind an entry and pulls everything else they left.
 * Matching is on the hashed identifier, so this works after the raw IP has
 * been purged.
 */
export async function ban(id, actor, reason = 'banned from Discord') {
  const entry = store.get(id);
  if (!entry) return notFound(id);
  store.addBan(entry.ip_hash, reason, actor);

  let alsoPulled = 0;
  for (const other of store.allRecent(500, 0)) {
    if (other.ip_hash === entry.ip_hash && other.status === 'published') {
      store.setStatus(other.id, 'rejected', actor, 'signer banned');
      alsoPulled++;
    }
  }

  const updated = store.get(id) || entry;
  await refresh(updated, `Signer banned by ${actor}`);
  return {
    ok: true,
    message:
      `Banned \`${entry.ip_hash.slice(0, 12)}\`` +
      (alsoPulled ? ` and unpublished ${alsoPulled} other entr${alsoPulled === 1 ? 'y' : 'ies'}.` : '.'),
    entry: updated,
  };
}

export function unban(ipHashPrefix) {
  const match = store
    .listBans(500)
    .find(b => b.ip_hash.startsWith(ipHashPrefix));
  if (!match) return { ok: false, message: `No ban matching \`${ipHashPrefix}\`.` };
  store.removeBan(match.ip_hash);
  return { ok: true, message: `Unbanned \`${match.ip_hash.slice(0, 12)}\`.` };
}

/** Adds or clears the owner's reply shown under an entry. */
export async function reply(id, text, actor) {
  const entry = store.get(id);
  if (!entry) return notFound(id);
  const value = String(text || '').trim();
  if (value.length > 500) {
    return { ok: false, message: 'Reply must be 500 characters or fewer.', entry };
  }
  store.setReply(id, value || null);
  const updated = store.get(id);
  await refresh(updated, value ? `Replied by ${actor}` : `Reply cleared by ${actor}`);
  return {
    ok: true,
    message: value ? `Replied to entry #${id}.` : `Cleared the reply on #${id}.`,
    entry: updated,
  };
}

export const actions = { approve, reject, remove, ban, unban, reply };
