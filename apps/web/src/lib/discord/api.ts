/**
 * Discord REST API client helpers.
 *
 * Every outbound call includes `Authorization: Bot <token>`. Calls that send
 * user-controlled content include `allowed_mentions: { parse: [] }` to prevent
 * accidental @everyone / @here pings.
 *
 * Rate limit handling: on HTTP 429, a `DiscordRateLimitError` is thrown with
 * `retryAfter` seconds so callers can requeue.
 */

import { type DiscordChannel } from "./types";
import { type DiscordCommandDefinition } from "./types";
import { type DiscordDMChannel } from "./types";
import { type DiscordEmbed } from "./types";
import { type DiscordMessage } from "./types";
import { type DiscordRole } from "./types";

const DISCORD_API_BASE = "https://discord.com/api/v10";

// =============================================================================
// Error types
// =============================================================================

/** Discord JSON error body shape (partial). */
interface DiscordErrorBody {
  code?: number;
  message?: string;
}

/** Base error for non-2xx Discord API responses. */
export class DiscordAPIError extends Error {
  readonly status: number;
  readonly body: DiscordErrorBody;

  constructor(status: number, body: DiscordErrorBody, message?: string) {
    super(
      message ??
        `Discord API error ${status}: ${body.message ?? "Unknown error"}`
    );
    this.name = "DiscordAPIError";
    this.status = status;
    this.body = body;
  }
}

/** Thrown when Discord returns HTTP 429 (rate limited). */
export class DiscordRateLimitError extends DiscordAPIError {
  /** Seconds to wait before retrying. */
  readonly retryAfter: number;

  constructor(retryAfter: number, body: DiscordErrorBody) {
    super(429, body, `Discord rate limited — retry after ${retryAfter}s`);
    this.name = "DiscordRateLimitError";
    this.retryAfter = retryAfter;
  }
}

/** Thrown when a DM could not be opened (Discord error code 50007). */
export class DiscordDMBlockedError extends DiscordAPIError {
  readonly discordUserId: string;

  constructor(discordUserId: string, body: DiscordErrorBody) {
    super(403, body, `Cannot send DM to user ${discordUserId} — DMs blocked`);
    this.name = "DiscordDMBlockedError";
    this.discordUserId = discordUserId;
  }
}

// =============================================================================
// Internal helpers
// =============================================================================

/** Content accepted by message-sending helpers. */
type MessageContent = { embed: DiscordEmbed } | { content: string };

function buildMessageBody(
  payload: MessageContent,
  flags?: number
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    allowed_mentions: { parse: [] },
  };

  if ("embed" in payload) {
    body.embeds = [payload.embed];
  } else {
    body.content = payload.content;
  }

  if (flags !== undefined) {
    body.flags = flags;
  }

  return body;
}

/** Shared fetch wrapper — throws typed errors on non-2xx responses. */
async function discordFetch(
  path: string,
  init: RequestInit,
  botToken: string
): Promise<Response> {
  const url = `${DISCORD_API_BASE}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, { ...init, headers });

  if (res.status === 429) {
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfter = retryAfterHeader ? parseFloat(retryAfterHeader) : 1;
    const body = (await res.json().catch(() => ({}))) as DiscordErrorBody;
    throw new DiscordRateLimitError(retryAfter, body);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as DiscordErrorBody;

    // Discord error code 50007: Cannot send messages to this user (DMs blocked)
    if (body.code === 50007) {
      // The discordUserId is extracted by the caller; we rethrow from sendDM
      throw new DiscordAPIError(res.status, body);
    }

    throw new DiscordAPIError(res.status, body);
  }

  return res;
}

/** Read the bot token from env. Throws if missing. */
function getBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error(
      "DISCORD_BOT_TOKEN is not set — cannot make Discord API calls"
    );
  }
  return token;
}

/** Read the application ID from env. Throws if missing. */
function getAppId(): string {
  const appId = process.env.DISCORD_APP_ID;
  if (!appId) {
    throw new Error(
      "DISCORD_APP_ID is not set — cannot make Discord API calls"
    );
  }
  return appId;
}

// =============================================================================
// Interaction response helpers
// =============================================================================

/**
 * Edit the original deferred interaction response.
 * Use after sending `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`.
 *
 * @param token - Interaction token from the inbound payload
 * @param payload - Embed or plain content to send
 */
export async function editInteractionResponse(
  token: string,
  payload: MessageContent
): Promise<void> {
  const appId = getAppId();
  const botToken = getBotToken();
  const body = buildMessageBody(payload);

  await discordFetch(
    `/webhooks/${appId}/${token}/messages/@original`,
    { method: "PATCH", body: JSON.stringify(body) },
    botToken
  );
}

/**
 * Send a followup message to an interaction webhook.
 *
 * @param token - Interaction token from the inbound payload
 * @param payload - Embed or plain content to send
 */
export async function sendFollowup(
  token: string,
  payload: MessageContent
): Promise<DiscordMessage> {
  const appId = getAppId();
  const botToken = getBotToken();
  const body = buildMessageBody(payload);

  const res = await discordFetch(
    `/webhooks/${appId}/${token}`,
    { method: "POST", body: JSON.stringify(body) },
    botToken
  );

  return res.json() as Promise<DiscordMessage>;
}

// =============================================================================
// Channel messaging
// =============================================================================

/**
 * Send a message to a Discord channel.
 *
 * @param channelId - Target channel ID
 * @param payload - Embed or plain content to send
 */
export async function sendChannelMessage(
  channelId: string,
  payload: MessageContent
): Promise<DiscordMessage> {
  const botToken = getBotToken();
  const body = buildMessageBody(payload);

  const res = await discordFetch(
    `/channels/${channelId}/messages`,
    { method: "POST", body: JSON.stringify(body) },
    botToken
  );

  return res.json() as Promise<DiscordMessage>;
}

/**
 * Delete a message from a channel.
 *
 * @param channelId - Channel the message is in
 * @param messageId - Message to delete
 */
export async function deleteMessage(
  channelId: string,
  messageId: string
): Promise<void> {
  const botToken = getBotToken();

  await discordFetch(
    `/channels/${channelId}/messages/${messageId}`,
    { method: "DELETE" },
    botToken
  );
}

// =============================================================================
// Direct messages
// =============================================================================

/**
 * Send a DM to a Discord user.
 *
 * Opens a DM channel first (idempotent), then sends the message.
 * Throws `DiscordDMBlockedError` when the user has DMs disabled.
 *
 * @param discordUserId - Target user's Discord ID
 * @param payload - Embed or plain content to send
 */
export async function sendDM(
  discordUserId: string,
  payload: MessageContent
): Promise<DiscordMessage> {
  const botToken = getBotToken();

  // Step 1: Open (or retrieve) the DM channel
  let dmChannel: DiscordDMChannel;
  try {
    const res = await discordFetch(
      `/users/@me/channels`,
      {
        method: "POST",
        body: JSON.stringify({ recipient_id: discordUserId }),
      },
      botToken
    );
    dmChannel = (await res.json()) as DiscordDMChannel;
  } catch (err) {
    if (err instanceof DiscordAPIError && err.body.code === 50007) {
      throw new DiscordDMBlockedError(discordUserId, err.body);
    }
    throw err;
  }

  // Step 2: Send the message in the DM channel
  try {
    return await sendChannelMessage(dmChannel.id, payload);
  } catch (err) {
    if (err instanceof DiscordAPIError && err.body.code === 50007) {
      throw new DiscordDMBlockedError(discordUserId, err.body);
    }
    throw err;
  }
}

// =============================================================================
// Guild utilities
// =============================================================================

/**
 * Retrieve all channels in a guild.
 *
 * @param guildId - Discord guild (server) ID
 */
export async function getGuildChannels(
  guildId: string
): Promise<DiscordChannel[]> {
  const botToken = getBotToken();

  const res = await discordFetch(
    `/guilds/${guildId}/channels`,
    { method: "GET" },
    botToken
  );

  return res.json() as Promise<DiscordChannel[]>;
}

/**
 * Retrieve all roles in a guild.
 *
 * @param guildId - Discord guild (server) ID
 */
export async function getGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const botToken = getBotToken();

  const res = await discordFetch(
    `/guilds/${guildId}/roles`,
    { method: "GET" },
    botToken
  );

  return res.json() as Promise<DiscordRole[]>;
}

/**
 * Assign a role to a guild member.
 *
 * @param guildId - Discord guild ID
 * @param userId - Target member's Discord user ID
 * @param roleId - Role to assign
 */
export async function assignRole(
  guildId: string,
  userId: string,
  roleId: string
): Promise<void> {
  const botToken = getBotToken();

  await discordFetch(
    `/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "PUT" },
    botToken
  );
}

/**
 * Remove a role from a guild member.
 *
 * @param guildId - Discord guild ID
 * @param userId - Target member's Discord user ID
 * @param roleId - Role to remove
 */
export async function removeRole(
  guildId: string,
  userId: string,
  roleId: string
): Promise<void> {
  const botToken = getBotToken();

  await discordFetch(
    `/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "DELETE" },
    botToken
  );
}

// =============================================================================
// Command registration
// =============================================================================

/**
 * Register (overwrite) global slash commands for the application.
 * This replaces all existing global commands — use for deploys.
 *
 * @param commandDefs - Array of command definition objects
 */
export async function registerGlobalCommands(
  commandDefs: DiscordCommandDefinition[]
): Promise<void> {
  const appId = getAppId();
  const botToken = getBotToken();

  await discordFetch(
    `/applications/${appId}/commands`,
    { method: "PUT", body: JSON.stringify(commandDefs) },
    botToken
  );
}

/**
 * Register (overwrite) guild-scoped slash commands for the application.
 * Guild commands update instantly — useful for testing before global rollout.
 *
 * @param guildId - Discord guild to register commands in
 * @param commandDefs - Array of command definition objects
 */
export async function registerGuildCommands(
  guildId: string,
  commandDefs: DiscordCommandDefinition[]
): Promise<void> {
  const appId = getAppId();
  const botToken = getBotToken();

  await discordFetch(
    `/applications/${appId}/guilds/${guildId}/commands`,
    { method: "PUT", body: JSON.stringify(commandDefs) },
    botToken
  );
}
