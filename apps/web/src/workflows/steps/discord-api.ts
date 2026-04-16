/**
 * Shared step functions wrapping Discord REST API calls.
 *
 * Each function uses the "use step" directive for automatic retry.
 * FatalError is thrown for terminal Discord errors (404, 403, 50013).
 * RetryableError is thrown for transient errors (429, 5xx).
 */

import { FatalError, RetryableError } from "workflow";

import {
  assignRole as restAssignRole,
  DiscordRateLimitError,
  getErrorCode,
  isMissingAccessError,
  isNotFoundError,
  removeRole as restRemoveRole,
  sendChannelMessage as restSendChannelMessage,
  sendDM as restSendDM,
} from "@/lib/discord/api";
import { type DiscordEmbed } from "@/lib/discord/types";

// MessageContent mirrors the private type in @/lib/discord/api
type MessageContent = { embed: DiscordEmbed } | { content: string };

/**
 * Send a message to a Discord channel. Retries on transient errors.
 * Throws FatalError on terminal Discord errors (404, 403, 50013).
 */
export async function sendChannelMessage(
  channelId: string,
  payload: Record<string, unknown>
) {
  "use step";
  console.log("[step:sendChannelMessage] start", { channelId });
  try {
    // The workflow runtime serializes payload as JSON; cast back to typed form
    await restSendChannelMessage(channelId, payload as MessageContent);
    console.log("[step:sendChannelMessage] success", { channelId });
  } catch (e: unknown) {
    if (e instanceof DiscordRateLimitError) {
      throw new RetryableError("Rate limited by Discord", {
        retryAfter: "30s",
      });
    }
    if (
      isNotFoundError(e) ||
      isMissingAccessError(e) ||
      getErrorCode(e) === 50013
    ) {
      throw new FatalError(`Terminal Discord error: ${getErrorCode(e)}`);
    }
    // 5xx or unknown — transient
    throw new RetryableError(`Transient Discord error: ${getErrorCode(e)}`);
  }
}

/**
 * Send a DM to a Discord user. Throws FatalError on 50007 (DMs closed).
 */
export async function sendDm(
  discordUserId: string,
  payload: Record<string, unknown>
) {
  "use step";
  console.log("[step:sendDm] start", { discordUserId });
  try {
    await restSendDM(discordUserId, payload as MessageContent);
    console.log("[step:sendDm] success", { discordUserId });
  } catch (e: unknown) {
    if (getErrorCode(e) === 50007) {
      throw new FatalError("dm_closed");
    }
    if (e instanceof DiscordRateLimitError) {
      throw new RetryableError("Rate limited by Discord", {
        retryAfter: "30s",
      });
    }
    throw new RetryableError(`Transient Discord error: ${getErrorCode(e)}`);
  }
}

/**
 * Assign a Discord role. Throws typed FatalErrors for terminal failures.
 */
export async function assignDiscordRole(
  guildId: string,
  discordUserId: string,
  roleId: string
) {
  "use step";
  console.log("[step:assignDiscordRole] start", {
    guildId,
    discordUserId,
    roleId,
  });
  try {
    await restAssignRole(guildId, discordUserId, roleId);
    console.log("[step:assignDiscordRole] success", {
      guildId,
      discordUserId,
      roleId,
    });
  } catch (e: unknown) {
    const code = getErrorCode(e);
    if (code === 50013) throw new FatalError("hierarchy_violation");
    if (code === 10011) throw new FatalError("role_deleted");
    if (code === 10007) throw new FatalError("user_left");
    if (e instanceof DiscordRateLimitError) {
      throw new RetryableError("Rate limited", { retryAfter: "30s" });
    }
    throw new RetryableError(`Transient: ${code}`);
  }
}

/**
 * Remove a Discord role. Same error classification as assign.
 */
export async function removeDiscordRole(
  guildId: string,
  discordUserId: string,
  roleId: string
) {
  "use step";
  console.log("[step:removeDiscordRole] start", {
    guildId,
    discordUserId,
    roleId,
  });
  try {
    await restRemoveRole(guildId, discordUserId, roleId);
    console.log("[step:removeDiscordRole] success", {
      guildId,
      discordUserId,
      roleId,
    });
  } catch (e: unknown) {
    const code = getErrorCode(e);
    if (code === 50013) throw new FatalError("hierarchy_violation");
    if (code === 10011) throw new FatalError("role_deleted");
    if (code === 10007) throw new FatalError("user_left");
    if (e instanceof DiscordRateLimitError) {
      throw new RetryableError("Rate limited", { retryAfter: "30s" });
    }
    throw new RetryableError(`Transient: ${code}`);
  }
}
