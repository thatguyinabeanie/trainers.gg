/**
 * Discord REST API client helpers built on @discordjs/rest.
 *
 * @discordjs/rest handles bucket-based rate limiting natively: it tracks
 * X-RateLimit-Bucket / X-RateLimit-Remaining per route and queues requests
 * proactively before hitting 429s, eliminating the need for our hand-rolled
 * 429-reactive approach.
 *
 * Calls that send user-controlled content include `allowed_mentions: { parse: [] }`
 * to prevent accidental @everyone / @here pings.
 *
 * Rate limit policy: @discordjs/rest auto-queues and retries within its
 * configured retry budget. Hard failures (retries exhausted) surface as a
 * DiscordAPIError with status 429 — DiscordRateLimitError is kept as a
 * convenience subclass for callers that want to distinguish the status code.
 */

import { REST, type RequestData } from "@discordjs/rest";
import {
  Routes,
  type APIGuildChannel,
  type APIMessage,
  type APIRole,
  type GuildChannelType,
} from "discord-api-types/v10";

import { type DiscordCommandDefinition, type DiscordEmbed } from "./types";

// =============================================================================
// REST instance (module-level, lazy token injection)
// =============================================================================

/**
 * Lazily-created REST instance. Token is set on the first call to `getRest()`
 * so the environment variable is read at call time, not at module import time.
 */
let _rest: REST | null = null;

function getRest(): REST {
  if (!_rest) {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      throw new Error(
        "DISCORD_BOT_TOKEN is not set — cannot make Discord API calls"
      );
    }
    _rest = new REST({ version: "10" }).setToken(token);
  }
  return _rest;
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

/**
 * Thrown when Discord returns HTTP 429 (rate limited) after @discordjs/rest
 * exhausts its retry budget. Under normal conditions the library queues
 * preemptively and this error is rare.
 */
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

/**
 * Wrap @discordjs/rest errors into our typed error hierarchy.
 *
 * @discordjs/rest throws its own `DiscordAPIError` class (from the library)
 * on non-2xx responses. We inspect the status and code to re-throw the
 * appropriate local subclass. Unknown shapes are re-thrown as-is.
 */
function mapRestError(err: unknown, discordUserId?: string): never {
  // @discordjs/rest throws objects with a `status` and `rawError` property
  if (
    err !== null &&
    typeof err === "object" &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    const restErr = err as { status: number; rawError?: DiscordErrorBody };
    const body: DiscordErrorBody = restErr.rawError ?? {};
    const status = restErr.status;

    if (status === 429) {
      const retryAfter =
        "retryAfter" in restErr &&
        typeof (restErr as { retryAfter: unknown }).retryAfter === "number"
          ? (restErr as { retryAfter: number }).retryAfter
          : 1;
      throw new DiscordRateLimitError(retryAfter, body);
    }

    if (body.code === 50007 && discordUserId !== undefined) {
      throw new DiscordDMBlockedError(discordUserId, body);
    }

    throw new DiscordAPIError(status, body);
  }

  throw err;
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
  const body = buildMessageBody(payload);

  try {
    await getRest().patch(Routes.webhookMessage(appId, token, "@original"), {
      body,
    } as RequestData);
  } catch (err) {
    mapRestError(err);
  }
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
): Promise<APIMessage> {
  const appId = getAppId();
  const body = buildMessageBody(payload);

  try {
    return (await getRest().post(Routes.webhook(appId, token), {
      body,
    } as RequestData)) as APIMessage;
  } catch (err) {
    mapRestError(err);
  }
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
): Promise<APIMessage> {
  const body = buildMessageBody(payload);

  try {
    return (await getRest().post(Routes.channelMessages(channelId), {
      body,
    } as RequestData)) as APIMessage;
  } catch (err) {
    mapRestError(err);
  }
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
  try {
    await getRest().delete(Routes.channelMessage(channelId, messageId));
  } catch (err) {
    mapRestError(err);
  }
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
): Promise<APIMessage> {
  // Step 1: Open (or retrieve) the DM channel
  let dmChannelId: string;
  try {
    const dmChannel = (await getRest().post(Routes.userChannels(), {
      body: { recipient_id: discordUserId },
    } as RequestData)) as { id: string };
    dmChannelId = dmChannel.id;
  } catch (err) {
    mapRestError(err, discordUserId);
  }

  // Step 2: Send the message in the DM channel
  try {
    return await sendChannelMessage(dmChannelId, payload);
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
): Promise<APIGuildChannel<GuildChannelType>[]> {
  try {
    return (await getRest().get(
      Routes.guildChannels(guildId)
    )) as APIGuildChannel<GuildChannelType>[];
  } catch (err) {
    mapRestError(err);
  }
}

/**
 * Retrieve all roles in a guild.
 *
 * @param guildId - Discord guild (server) ID
 */
export async function getGuildRoles(guildId: string): Promise<APIRole[]> {
  try {
    return (await getRest().get(Routes.guildRoles(guildId))) as APIRole[];
  } catch (err) {
    mapRestError(err);
  }
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
  try {
    await getRest().put(Routes.guildMemberRole(guildId, userId, roleId));
  } catch (err) {
    mapRestError(err);
  }
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
  try {
    await getRest().delete(Routes.guildMemberRole(guildId, userId, roleId));
  } catch (err) {
    mapRestError(err);
  }
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

  try {
    await getRest().put(Routes.applicationCommands(appId), {
      body: commandDefs,
    } as RequestData);
  } catch (err) {
    mapRestError(err);
  }
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

  try {
    await getRest().put(Routes.applicationGuildCommands(appId, guildId), {
      body: commandDefs,
    } as RequestData);
  } catch (err) {
    mapRestError(err);
  }
}

// =============================================================================
// Module-level test seam
// =============================================================================

/**
 * Replace the internal REST instance. For use in tests only.
 * @internal
 */
export function _setRestInstance(instance: REST): void {
  _rest = instance;
}
