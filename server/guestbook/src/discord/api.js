/*
 * The small slice of the Discord HTTP API this needs: post a message, edit
 * one, and verify that an incoming interaction really came from Discord.
 *
 * No library. The bot posts alerts into one channel and answers button
 * presses over the interactions endpoint, which is four calls in total.
 */
import crypto from 'node:crypto';
import { config } from '../config.js';

const API = 'https://discord.com/api/v10';

async function call(method, path, body) {
  const { botToken } = config.discord;
  if (!botToken) throw new Error('DISCORD_BOT_TOKEN is not set');

  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord ${method} ${path} -> ${res.status} ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

export const discord = {
  enabled: () => Boolean(config.discord.botToken && config.discord.channelId),

  postToChannel: payload =>
    call('POST', `/channels/${config.discord.channelId}/messages`, payload),

  editMessage: (messageId, payload) =>
    call(
      'PATCH',
      `/channels/${config.discord.channelId}/messages/${messageId}`,
      payload,
    ),

  registerGuildCommands: commands => {
    const { applicationId, guildId } = config.discord;
    const path = guildId
      ? `/applications/${applicationId}/guilds/${guildId}/commands`
      : `/applications/${applicationId}/commands`;
    return call('PUT', path, commands);
  },
};

/**
 * Posts the alert through a plain incoming webhook. Used only when no bot is
 * configured — components are silently dropped by Discord in that case, so
 * the moderator gets the text and has to use the in-app panel to act.
 */
export async function postViaWebhook(payload) {
  const url = config.discord.webhookUrl;
  if (!url) return null;
  const { components, ...rest } = payload;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rest),
  });
  if (!res.ok) {
    throw new Error(`Discord webhook -> ${res.status}`);
  }
  return null;
}

/**
 * Verifies the Ed25519 signature Discord puts on every interaction request.
 *
 * This is the whole security model of the interactions endpoint: the URL is
 * public, so an unsigned request is an anonymous one and must be refused.
 * `rawBody` has to be the exact bytes received — re-serialising the parsed
 * JSON changes the signature.
 */
export function verifyInteractionSignature(rawBody, signature, timestamp) {
  const { publicKey } = config.discord;
  if (!publicKey || !signature || !timestamp) return false;

  try {
    const key = crypto.createPublicKey({
      key: Buffer.concat([
        // SPKI prefix for a raw Ed25519 public key.
        Buffer.from('302a300506032b6570032100', 'hex'),
        Buffer.from(publicKey, 'hex'),
      ]),
      format: 'der',
      type: 'spki',
    });
    return crypto.verify(
      null,
      Buffer.concat([Buffer.from(timestamp), Buffer.from(rawBody)]),
      key,
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}
