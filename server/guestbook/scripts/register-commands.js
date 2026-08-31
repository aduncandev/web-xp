/*
 * Registers the /gb command with Discord. Run once, and again whenever the
 * commands below change:
 *
 *   node --env-file=.env scripts/register-commands.js
 *
 * With DISCORD_GUILD_ID set the commands register to that one server and
 * appear instantly, which is what you want. Without it they register
 * globally and can take up to an hour to show up.
 */
import { config } from '../src/config.js';
import { discord } from '../src/discord/api.js';

const INT = 4;
const STR = 3;
const SUB = 1;

const id = {
  type: INT,
  name: 'id',
  description: 'Entry number',
  required: true,
};

const commands = [
  {
    name: 'gb',
    description: 'Guest book moderation',
    options: [
      {
        type: SUB,
        name: 'list',
        description: 'List entries by status',
        options: [
          {
            type: STR,
            name: 'status',
            description: 'Which queue (default: pending)',
            required: false,
            choices: [
              { name: 'pending', value: 'pending' },
              { name: 'published', value: 'published' },
              { name: 'rejected', value: 'rejected' },
              { name: 'blocked', value: 'blocked' },
            ],
          },
        ],
      },
      {
        type: SUB,
        name: 'show',
        description: 'Show one entry in full',
        options: [id],
      },
      {
        type: SUB,
        name: 'approve',
        description: 'Publish an entry',
        options: [id],
      },
      {
        type: SUB,
        name: 'reject',
        description: 'Take an entry off the page (keeps the record)',
        options: [
          id,
          { type: STR, name: 'reason', description: 'Why', required: false },
        ],
      },
      {
        type: SUB,
        name: 'delete',
        description: 'Delete an entry permanently',
        options: [id],
      },
      {
        type: SUB,
        name: 'reply',
        description: 'Reply to an entry, shown under it on the page',
        options: [
          id,
          {
            type: STR,
            name: 'text',
            description: 'Your reply (leave empty to clear)',
            required: true,
          },
        ],
      },
      {
        type: SUB,
        name: 'ban',
        description: 'Ban the signer of an entry and pull their other entries',
        options: [
          id,
          { type: STR, name: 'reason', description: 'Why', required: false },
        ],
      },
      {
        type: SUB,
        name: 'unban',
        description: 'Lift a ban',
        options: [
          {
            type: STR,
            name: 'hash',
            description: 'Signer hash, or the first few characters of it',
            required: true,
          },
        ],
      },
      { type: SUB, name: 'bans', description: 'List current bans' },
      { type: SUB, name: 'stats', description: 'Counts by status' },
    ],
  },
];

if (!config.discord.applicationId || !config.discord.botToken) {
  console.error(
    'DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN must be set to register commands.',
  );
  process.exit(1);
}

try {
  const result = await discord.registerGuildCommands(commands);
  const scope = config.discord.guildId
    ? `guild ${config.discord.guildId}`
    : 'globally (may take up to an hour to appear)';
  console.log(`Registered ${result.length} command(s) ${scope}.`);
} catch (err) {
  console.error('Failed to register commands:', err.message);
  process.exit(1);
}
