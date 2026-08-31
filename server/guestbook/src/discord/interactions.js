/*
 * The interactions endpoint: everything a moderator does from Discord.
 *
 * Discord posts here for button presses and slash commands, signed with the
 * application's Ed25519 key. Signature checking happens in the route before
 * anything below runs — the URL is public, so an unsigned request is an
 * anonymous one.
 *
 * A valid signature only proves the request came from Discord, not that the
 * person clicking is allowed to moderate. DISCORD_MODERATOR_IDS is that
 * second check; with it unset, anyone who can see the channel could approve
 * entries, so an empty list refuses everything and says so.
 */
import { config } from '../config.js';
import { store } from '../db.js';
import { actions } from '../moderation.js';
import { buildEmbed } from './notify.js';

const TYPE = { PING: 1, COMMAND: 2, COMPONENT: 3, MODAL_SUBMIT: 5 };
const REPLY = { PONG: 1, MESSAGE: 4, UPDATE: 7, MODAL: 9 };
const EPHEMERAL = 64;

/*
 * A button cannot ask for text — the only way Discord lets one collect any is
 * to answer the click with a modal, which comes back as its own interaction.
 * So Reply and Ban are two-step: the button opens the form, the submit does
 * the work. The entry id rides along in the modal's custom_id, because that
 * is the only state carried between the two halves.
 */
function modal(customId, title, input) {
  return {
    type: REPLY.MODAL,
    data: {
      custom_id: customId,
      title: title.slice(0, 45),
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'value',
              style: input.paragraph ? 2 : 1,
              label: input.label.slice(0, 45),
              placeholder: input.placeholder,
              value: input.value || undefined,
              max_length: input.maxLength,
              required: false,
            },
          ],
        },
      ],
    },
  };
}

/** The single text value a submitted modal carries. */
const modalValue = body =>
  body.data?.components?.[0]?.components?.[0]?.value ?? '';

const ephemeral = content => ({
  type: REPLY.MESSAGE,
  data: { content, flags: EPHEMERAL, allowed_mentions: { parse: [] } },
});

/** The Discord user behind an interaction, in a channel or a DM. */
const actorOf = body => body.member?.user || body.user || null;

function authorise(body) {
  const user = actorOf(body);
  if (!user) return { ok: false, message: 'Could not identify you.' };

  const allowed = config.discord.moderatorIds;
  if (!allowed.length) {
    return {
      ok: false,
      message:
        'No moderators are configured, so nothing can be actioned from ' +
        'Discord. Set DISCORD_MODERATOR_IDS to your Discord user ID and ' +
        'restart the guest book.',
    };
  }
  if (!allowed.includes(user.id)) {
    return { ok: false, message: 'You are not a moderator of this guest book.' };
  }
  return { ok: true, actor: `discord:${user.username || user.id}` };
}

/* --- slash command payloads --- */

function optionMap(options = []) {
  const out = {};
  for (const opt of options) out[opt.name] = opt.value;
  return out;
}

function summarise(entry) {
  const withheld = entry.redacted || entry.severity === 'csam';
  const body = withheld ? '[content withheld]' : entry.message.replace(/\n+/g, ' ');
  const short = body.length > 90 ? `${body.slice(0, 89)}…` : body;
  return `\`#${entry.id}\` **${entry.status}** — ${entry.name}: ${short}`;
}

async function runCommand(body) {
  const data = body.data;
  const sub = data.options?.[0];
  const name = sub?.name || data.name;
  const opts = optionMap(sub?.options || data.options);

  /*
   * Authorise before dispatching to anything at all. Read-only commands
   * are not harmless here: /gb show renders the full embed, which carries
   * the submitter's IP and the text of entries that were blocked exactly
   * so nobody would read them, and /gb list quotes pending content. Anyone
   * who can invoke a command in the guild would otherwise see all of it.
   */
  const auth = authorise(body);
  if (!auth.ok) return ephemeral(auth.message);
  const actor = auth.actor;

  if (name === 'stats') {
    const s = store.stats();
    return ephemeral(
      `**Guest book**\n` +
        `published: ${s.published}\npending: ${s.pending}\n` +
        `rejected: ${s.rejected}\nblocked: ${s.blocked}\n` +
        `bans: ${store.listBans(500).length}`,
    );
  }

  if (name === 'list') {
    const status = opts.status || 'pending';
    const rows = store.byStatus(status, 10, 0);
    if (!rows.length) return ephemeral(`Nothing with status \`${status}\`.`);
    return ephemeral(
      `**${status}** (newest first)\n${rows.map(summarise).join('\n')}`,
    );
  }

  if (name === 'show') {
    const entry = store.get(opts.id);
    if (!entry) return ephemeral(`No entry #${opts.id}.`);
    return {
      type: REPLY.MESSAGE,
      data: { embeds: [buildEmbed(entry)], flags: EPHEMERAL },
    };
  }

  switch (name) {
    case 'approve': {
      const r = await actions.approve(opts.id, actor);
      return ephemeral(r.message);
    }
    case 'reject': {
      const r = await actions.reject(opts.id, actor, opts.reason || null);
      return ephemeral(r.message);
    }
    case 'delete': {
      const r = await actions.remove(opts.id, actor);
      return ephemeral(r.message);
    }
    case 'reply': {
      const r = await actions.reply(opts.id, opts.text, actor);
      return ephemeral(r.message);
    }
    case 'ban': {
      const r = await actions.ban(opts.id, actor, opts.reason || 'banned from Discord');
      return ephemeral(r.message);
    }
    case 'unban': {
      const r = actions.unban(String(opts.hash));
      return ephemeral(r.message);
    }
    case 'bans': {
      const bans = store.listBans(20);
      if (!bans.length) return ephemeral('No bans.');
      return ephemeral(
        bans
          .map(
            b =>
              `\`${b.ip_hash.slice(0, 12)}\` — ${b.reason || 'no reason'} ` +
              `(${new Date(b.created_at).toISOString().slice(0, 10)})`,
          )
          .join('\n'),
      );
    }
    default:
      return ephemeral(`Unknown command \`${name}\`.`);
  }
}

async function runComponent(body) {
  const [ns, action, rawId] = String(body.data.custom_id).split(':');
  if (ns !== 'gb') return ephemeral('Unrecognised control.');

  const auth = authorise(body);
  if (!auth.ok) return ephemeral(auth.message);

  const id = Number(rawId);
  const actor = auth.actor;

  // These two need words, so they open a form and finish in runModal.
  if (action === 'reply') {
    const entry = store.get(id);
    if (!entry) return ephemeral(`No entry #${id}.`);
    return modal(`gb:replysubmit:${id}`, `Reply to entry #${id}`, {
      label: 'Your reply',
      placeholder: 'Shown under their entry. Leave empty to clear it.',
      value: entry.reply_text,
      maxLength: 500,
      paragraph: true,
    });
  }
  if (action === 'ban') {
    return modal(`gb:bansubmit:${id}`, `Ban the signer of #${id}`, {
      label: 'Reason (optional)',
      placeholder: 'For your own records — the visitor never sees this.',
      maxLength: 200,
    });
  }

  let result;
  switch (action) {
    case 'approve':
      result = await actions.approve(id, actor);
      break;
    case 'reject':
      result = await actions.reject(id, actor);
      break;
    case 'delete':
      result = await actions.remove(id, actor);
      break;
    default:
      return ephemeral(`Unknown action \`${action}\`.`);
  }

  return ephemeral(result.message);
}

/** The second half of a Reply or Ban button press. */
async function runModal(body) {
  const [ns, action, rawId] = String(body.data.custom_id).split(':');
  if (ns !== 'gb') return ephemeral('Unrecognised form.');

  const auth = authorise(body);
  if (!auth.ok) return ephemeral(auth.message);

  const id = Number(rawId);
  const value = modalValue(body).trim();

  if (action === 'replysubmit') {
    const r = await actions.reply(id, value, auth.actor);
    return ephemeral(r.message);
  }
  if (action === 'bansubmit') {
    const r = await actions.ban(
      id,
      auth.actor,
      value || `banned by ${auth.actor}`,
    );
    return ephemeral(r.message);
  }
  return ephemeral(`Unknown form \`${action}\`.`);
}

/** Routes one verified interaction. */
export async function handleInteraction(body) {
  if (body.type === TYPE.PING) return { type: REPLY.PONG };
  try {
    if (body.type === TYPE.COMMAND) return await runCommand(body);
    if (body.type === TYPE.COMPONENT) return await runComponent(body);
    if (body.type === TYPE.MODAL_SUBMIT) return await runModal(body);
  } catch (err) {
    console.error('[discord] interaction failed:', err);
    return ephemeral(`Something went wrong: ${err.message}`);
  }
  return ephemeral('Unsupported interaction.');
}
