/*
 * Checks the Discord wiring without posting anything.
 *
 *   node --env-file=.env scripts/check-discord.js
 *
 * Discord setup fails silently in a lot of small ways — a token for the wrong
 * application, a channel the bot was never invited to, a user ID copied from
 * the wrong right-click menu. This says which one, using read-only calls.
 */
import { config } from '../src/config.js';

const d = config.discord;
const API = 'https://discord.com/api/v10';

const ok = m => console.log(`  ok    ${m}`);
const bad = m => console.log(`  FAIL  ${m}`);
const warn = m => console.log(`  note  ${m}`);

const get = path =>
  fetch(`${API}${path}`, {
    headers: { Authorization: `Bot ${d.botToken}` },
  });

let fatal = false;

console.log('\nEnvironment');
for (const [label, value, required] of [
  ['DISCORD_BOT_TOKEN', d.botToken, true],
  ['DISCORD_CHANNEL_ID', d.channelId, true],
  ['DISCORD_APPLICATION_ID', d.applicationId, true],
  ['DISCORD_PUBLIC_KEY', d.publicKey, true],
  ['DISCORD_MODERATOR_IDS', d.moderatorIds.join(','), true],
  ['DISCORD_GUILD_ID', d.guildId, false],
]) {
  if (value) ok(`${label} is set`);
  else if (required) {
    bad(`${label} is NOT set`);
    fatal = true;
  } else warn(`${label} is not set (commands will register globally, slower)`);
}

if (!d.botToken) {
  console.log('\nNo bot token, so nothing further can be checked.\n');
  process.exit(1);
}

console.log('\nBot identity');
try {
  const res = await get('/users/@me');
  if (res.ok) {
    const me = await res.json();
    ok(`token belongs to ${me.username} (id ${me.id})`);
    if (d.applicationId && me.id !== d.applicationId) {
      warn(
        `bot user id ${me.id} differs from DISCORD_APPLICATION_ID ` +
          `${d.applicationId} — usually these match; check you copied the ` +
          `Application ID from General Information`,
      );
    }
  } else {
    bad(`token rejected (${res.status}) — is it the Bot token, not the client secret?`);
    fatal = true;
  }
} catch (err) {
  bad(`could not reach Discord: ${err.message}`);
  fatal = true;
}

console.log('\nChannel access');
if (d.channelId) {
  try {
    const res = await get(`/channels/${d.channelId}`);
    if (res.ok) {
      const ch = await res.json();
      ok(`can see #${ch.name}${ch.guild_id ? ` in guild ${ch.guild_id}` : ''}`);
      if (d.guildId && ch.guild_id && ch.guild_id !== d.guildId) {
        warn(`channel is in guild ${ch.guild_id}, but DISCORD_GUILD_ID is ${d.guildId}`);
      }
    } else if (res.status === 403 || res.status === 404) {
      bad(
        `cannot access channel ${d.channelId} (${res.status}) — invite the ` +
          `bot to that server and give it access to the channel`,
      );
      fatal = true;
    } else {
      bad(`channel check failed (${res.status})`);
      fatal = true;
    }
  } catch (err) {
    bad(`channel check failed: ${err.message}`);
    fatal = true;
  }
}

console.log('\nModerators');
if (!d.moderatorIds.length) {
  bad('DISCORD_MODERATOR_IDS is empty — every button and command will refuse');
  fatal = true;
} else {
  for (const id of d.moderatorIds) {
    if (!/^\d{17,20}$/.test(id)) {
      bad(`"${id}" is not a Discord user ID (should be 17-20 digits)`);
      fatal = true;
      continue;
    }
    try {
      const res = await get(`/users/${id}`);
      if (res.ok) {
        const u = await res.json();
        ok(`${id} is ${u.username}`);
      } else {
        warn(`${id} could not be looked up (${res.status}); the id may still be fine`);
      }
    } catch {
      warn(`${id} could not be looked up`);
    }
  }
}

console.log('\nInteractions endpoint');
if (config.publicBaseUrl) {
  ok(`set this in the Discord portal: ${config.publicBaseUrl}/api/discord/interactions`);
} else {
  warn(
    'PUBLIC_BASE_URL is not set. Whatever your public URL is, the portal ' +
      'wants <that>/api/discord/interactions',
  );
}

console.log(
  fatal
    ? '\nSomething above needs fixing before Discord will work.\n'
    : '\nDiscord looks correctly configured. Register commands with:\n' +
        '  node --env-file=.env scripts/register-commands.js\n',
);
process.exit(fatal ? 1 : 0);
