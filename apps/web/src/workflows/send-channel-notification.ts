/**
 * Durable workflow: deliver a channel notification to Discord.
 *
 * Steps auto-retry on RetryableError (429, 5xx). FatalError (404, 403,
 * 50013) triggers the failure tracking path immediately without retrying.
 */

import { FatalError } from "workflow";

import { sendChannelMessage } from "./steps/discord-api";
import {
  clearChannelFailures,
  logDeliveryFailure,
  trackChannelFailureAndCheckEmail,
} from "./steps/failure-tracking";

/**
 * Send a channel notification workflow.
 *
 * @param channelId  - Target Discord channel snowflake ID
 * @param eventType  - Notification event type (e.g. "tournament.registration_open")
 * @param payload    - Pre-built Discord message body (embed or content)
 * @param serverId   - trainers.gg discord_servers.id (bigint) for failure tracking
 */
export async function sendChannelNotificationWorkflow(
  channelId: string,
  eventType: string,
  payload: Record<string, unknown>,
  serverId: number
): Promise<{ status: "sent" | "failed"; reason?: string }> {
  "use workflow";

  console.log("[workflow:sendChannelNotification] start", {
    channelId,
    eventType,
    serverId,
  });

  try {
    await sendChannelMessage(channelId, payload);
    await clearChannelFailures(serverId, channelId);

    console.log("[workflow:sendChannelNotification] delivered", {
      channelId,
      eventType,
    });
    return { status: "sent" };
  } catch (e) {
    if (e instanceof FatalError) {
      console.warn("[workflow:sendChannelNotification] fatal error", {
        channelId,
        eventType,
        reason: e.message,
      });

      await logDeliveryFailure({
        discord_server_id: serverId,
        type: "channel",
        event_type: eventType,
        target: channelId,
        error_code: e.message.replace("Terminal Discord error: ", ""),
        error_reason: e.message,
        payload,
      });

      await trackChannelFailureAndCheckEmail(serverId, channelId);

      return { status: "failed", reason: e.message };
    }

    // Re-throw RetryableError — the workflow runtime will handle retry scheduling
    throw e;
  }
}
