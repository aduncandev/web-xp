/*
 * What lands in Discord when somebody signs the book.
 *
 * One rule shapes all of this: an alert about illegal material must not
 * itself republish that material, and must not describe it either. A
 * redacted entry produces a bare "an entry was blocked, see the panel" —
 * no text, no name, no category, no reason, nothing that names what was
 * caught. Discord polices what passes through it, and a bot narrating the
 * category is a bot getting banned for the abuse it just stopped.
 *
 * Everything else carries the message, the signals and the classifier's
 * verdict, so a decision can be made without opening anything.
 */
import { config } from '../config.js';
import { discord, postViaWebhook } from './api.js';

const COLORS = {
  published: 0x4f9e4f,
  pending: 0xd9a441,
  blocked: 0xb14141,
  rejected: 0x777777,
};

const LABEL = {
  published: 'Published',
  pending: 'Held for review',
  blocked: 'Blocked',
  rejected: 'Rejected',
};

const clip = (s, n) =>
  !s ? '' : s.length <= n ? s : `${s.slice(0, n - 1)}…`;

/** True when the entry must never be echoed anywhere, Discord included. */
const isUnquotable = entry => entry.redacted || entry.severity === 'csam';

function buttons(entry) {
  if (isUnquotable(entry)) {
    // Nothing to approve. The only sensible actions are containment.
    return [
      {
        type: 1,
        components: [
          { type: 2, style: 4, label: 'Ban signer', custom_id: `gb:ban:${entry.id}` },
          { type: 2, style: 2, label: 'Delete record', custom_id: `gb:delete:${entry.id}` },
        ],
      },
    ];
  }

  const row = [];
  if (entry.status !== 'published') {
    row.push({
      type: 2,
      style: 3,
      label: entry.status === 'blocked' ? 'Publish anyway' : 'Approve',
      custom_id: `gb:approve:${entry.id}`,
    });
  }
  if (entry.status === 'pending') {
    row.push({ type: 2, style: 2, label: 'Reject', custom_id: `gb:reject:${entry.id}` });
  }
  if (entry.status === 'published') {
    row.push({ type: 2, style: 4, label: 'Unpublish', custom_id: `gb:reject:${entry.id}` });
  }
  // Reply and Ban open a modal rather than acting straight away — both want
  // text, and a modal is the only way Discord lets a button ask for any.
  row.push({ type: 2, style: 1, label: 'Reply', custom_id: `gb:reply:${entry.id}` });
  row.push({ type: 2, style: 4, label: 'Ban', custom_id: `gb:ban:${entry.id}` });
  row.push({ type: 2, style: 4, label: 'Delete', custom_id: `gb:delete:${entry.id}` });

  // Five components is the hard limit for one action row.
  return [{ type: 1, components: row.slice(0, 5) }];
}

export function buildEmbed(entry) {
  const fields = [];

  /*
   * A redacted entry gets a deliberately empty alert.
   *
   * Discord enforces its own rules on what passes through it, and an
   * automated message naming the category — even to say something was
   * blocked because of it — is a bot getting actioned for describing the
   * abuse it just prevented. So nothing about *why* leaves this server: no
   * category, no classifier reason, no signals, no name, no text.
   *
   * The ping still fires, because knowing an entry was blocked is the point.
   * Everything that explains it lives in the moderation panel, which is
   * behind the admin token and answerable to nobody but the owner.
   */
  if (isUnquotable(entry)) {
    return {
      title: `Blocked · entry #${entry.id}`,
      color: COLORS.blocked,
      description:
        'An entry was blocked automatically and its content was not stored. ' +
        'Details are in the moderation panel.',
      fields: [
        {
          name: 'Signer',
          value: `\`${entry.ip_hash.slice(0, 12)}\``,
          inline: true,
        },
      ],
      timestamp: new Date(entry.created_at).toISOString(),
    };
  }

  if (entry.location) {
    fields.push({ name: 'From', value: clip(entry.location, 100), inline: true });
  }
  /*
   * The hash only — never the address.
   *
   * Discord keeps messages indefinitely and this server cannot delete them,
   * so anything put here outlives the 30-day retention the privacy notice
   * promises. An address in an embed would quietly make that promise false.
   *
   * Nothing is lost by leaving it out: bans match on the hash, and the hash
   * separates signers just as well. The address stays in the database where
   * the purge can reach it, and shows in the moderation panel until then.
   */
  fields.push({
    name: 'Signer',
    value: `\`${entry.ip_hash.slice(0, 12)}\``,
    inline: true,
  });
  fields.push({
    name: 'Score',
    value: `${entry.score}${entry.severity ? ` (${entry.severity})` : ''}`,
    inline: true,
  });

  const signals = entry.signals ? JSON.parse(entry.signals) : [];
  if (signals.length) {
    fields.push({
      name: 'Signals',
      value: clip(signals.map(s => `\`${s.id}\` +${s.weight}`).join(', '), 1024),
    });
  }

  const verdict = entry.classifier ? JSON.parse(entry.classifier) : null;
  if (verdict && verdict.available) {
    fields.push({
      name: 'Claude',
      value: clip(
        `**${verdict.verdict}** (${Math.round((verdict.confidence || 0) * 100)}%)` +
          `${verdict.categories?.length ? ` · ${verdict.categories.join(', ')}` : ''}` +
          `\n${verdict.reason || ''}`,
        1024,
      ),
    });
  } else if (verdict && !verdict.available) {
    fields.push({ name: 'Claude', value: `unavailable (${verdict.reason})` });
  }

  /*
   * When the classifier decided, its reason is already rendered in the
   * Claude field above and `entry.reason` is just "classifier: <same
   * sentence>". Printing it twice is noise; the heuristics' own reason
   * (which signals fired, why it was held) is not shown anywhere else.
   */
  const fromClassifier = String(entry.reason || '').startsWith('classifier:');
  if (entry.reason && !(fromClassifier && verdict?.available)) {
    fields.push({ name: 'Reason', value: clip(entry.reason, 1024) });
  }

  // Redacted entries returned above, so everything here has content.
  return {
    title: `${LABEL[entry.status]} · entry #${entry.id}`,
    color: COLORS[entry.status] ?? 0x888888,
    description: clip(entry.message, 3800),
    author: { name: clip(entry.name, 100) || 'anonymous' },
    fields,
    timestamp: new Date(entry.created_at).toISOString(),
    footer: {
      text: clip(entry.user_agent || 'no user agent', 200),
    },
  };
}

/**
 * Announces an entry. Never throws into the request path — a Discord outage
 * must not stop somebody signing the guest book.
 */
export async function notify(entry, { store } = {}) {
  if (entry.status === 'published' && !config.discord.notifyOnPublished) {
    return;
  }

  const payload = {
    embeds: [buildEmbed(entry)],
    components: buttons(entry),
    allowed_mentions: { parse: [] },
  };

  try {
    if (discord.enabled()) {
      const message = await discord.postToChannel(payload);
      if (message?.id && store) store.setDiscordMessage(message.id, entry.id);
    } else {
      await postViaWebhook(payload);
    }
  } catch (err) {
    console.error('[discord] notify failed:', err.message);
  }
}

/** Re-renders an alert after a moderator acted on it. */
export async function refresh(entry, note) {
  if (!entry.discord_message_id || !discord.enabled()) return;
  const embed = buildEmbed(entry);
  if (note) embed.fields.push({ name: 'Action', value: clip(note, 1024) });
  try {
    await discord.editMessage(entry.discord_message_id, {
      embeds: [embed],
      components: buttons(entry),
    });
  } catch (err) {
    console.error('[discord] refresh failed:', err.message);
  }
}
