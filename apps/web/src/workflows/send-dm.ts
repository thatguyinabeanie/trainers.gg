import { FatalError } from "workflow";
import { type DiscordDmEventType } from "@trainers/supabase";

import { sendChannelMessage, sendDm } from "./steps/discord-api";
import { logDeliveryFailure } from "./steps/failure-tracking";
import {
  checkDmPreference,
  setDmWarnFlag,
  clearDmWarnFlag,
} from "./steps/user-prefs";

/**
 * Durable workflow: deliver a DM notification to a Discord user.
 *
 * Flow:
 * 1. Check user's DM preference — skip if opted out
 * 2. Skip immediately if community delivery_mode is "channel_only"
 * 3. Attempt DM send with step-level retry on transient errors
 * 4. On success — clear the DM warn flag
 * 5. On 50007 (DMs closed) — set warn flag, attempt fallback channel, log failure
 */
export async function sendDmWorkflow(
  discordUserId: string,
  userId: string,
  eventType: DiscordDmEventType,
  payload: Record<string, unknown>,
  deliveryMode: string,
  fallbackChannelId: string | null,
  communityId: number,
  serverId: number
) {
  "use workflow";

  console.log("[workflow:sendDm] started", {
    discordUserId,
    userId,
    eventType,
    deliveryMode,
    hasFallback: !!fallbackChannelId,
    serverId,
    communityId,
  });

  // Check user preference — opt-in model, false by default
  const enabled = await checkDmPreference(userId, eventType);
  if (!enabled) {
    console.log("[workflow:sendDm] skipped — user opted out", {
      userId,
      eventType,
    });
    return { status: "skipped" as const, reason: "user_opted_out" };
  }

  // Community-level override: channel_only means no DMs at all
  if (deliveryMode === "channel_only") {
    console.log("[workflow:sendDm] skipped — community channel_only mode", {
      serverId,
    });
    return { status: "skipped" as const, reason: "community_channel_only" };
  }

  try {
    await sendDm(discordUserId, payload);
    await clearDmWarnFlag(userId);
    console.log("[workflow:sendDm] DM sent successfully", { discordUserId });
    return { status: "sent" as const };
  } catch (e) {
    if (e instanceof FatalError && e.message === "dm_closed") {
      console.log("[workflow:sendDm] DMs closed (50007), setting warn flag", {
        userId,
      });
      await setDmWarnFlag(userId);

      // Attempt fallback channel delivery if configured
      if (fallbackChannelId) {
        try {
          const fallbackPayload = {
            ...payload,
            content: `<@${discordUserId}> ${(payload.content as string) || "You have a notification on trainers.gg"}`,
            allowed_mentions: { users: [discordUserId] },
          };
          await sendChannelMessage(fallbackChannelId, fallbackPayload);
          await logDeliveryFailure({
            discord_server_id: serverId,
            type: "dm",
            event_type: eventType,
            target: discordUserId,
            error_code: "50007",
            error_reason: "dm_closed",
            delivered_via_fallback: true,
          });
          console.log("[workflow:sendDm] fallback channel delivery succeeded", {
            discordUserId,
            fallbackChannelId,
          });
          return { status: "fallback_delivered" as const };
        } catch {
          // Fallback also failed — log and return failed
          await logDeliveryFailure({
            discord_server_id: serverId,
            type: "dm",
            event_type: eventType,
            target: discordUserId,
            error_code: "50007",
            error_reason: "dm_closed_fallback_failed",
            payload,
          });
          console.log(
            "[workflow:sendDm] fallback channel delivery also failed",
            {
              discordUserId,
              fallbackChannelId,
            }
          );
          return {
            status: "failed" as const,
            reason: "dm_closed_fallback_failed",
          };
        }
      }

      // No fallback configured — log and return failed
      await logDeliveryFailure({
        discord_server_id: serverId,
        type: "dm",
        event_type: eventType,
        target: discordUserId,
        error_code: "50007",
        error_reason: "dm_closed",
        payload,
      });
      console.log("[workflow:sendDm] no fallback configured, DM failed", {
        discordUserId,
      });
      return { status: "failed" as const, reason: "dm_closed" };
    }

    // Re-throw RetryableError for the workflow runtime to handle
    throw e;
  }
}
