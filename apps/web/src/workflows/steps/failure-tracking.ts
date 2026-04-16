/**
 * Step functions for delivery failure tracking and channel failure escalation.
 *
 * Each function uses the "use step" directive for automatic retry.
 * Steps create their own Supabase client — each is a fresh execution context.
 */

import {
  markChannelEmailSent,
  recordChannelFailure,
  recordDeliveryFailure,
  resetChannelFailures,
} from "@trainers/supabase";
import {
  DISCORD_NOTIFICATION_FAILED,
  DISCORD_NOTIFICATION_SENT,
  DISCORD_ROLE_SYNC_FAILED,
} from "@trainers/posthog";

import { captureServerEvent } from "@/lib/posthog/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Trigger dead-letter email after this many consecutive channel failures
const CHANNEL_FAILURE_EMAIL_THRESHOLD = 5;

/**
 * Log a permanent delivery failure to discord_delivery_failures and emit
 * a PostHog analytics event.
 */
export async function logDeliveryFailure(input: {
  discord_server_id: number;
  type: "channel" | "dm" | "role_sync";
  event_type: string;
  target: string;
  error_code?: string;
  error_reason: string;
  payload?: Record<string, unknown>;
  delivered_via_fallback?: boolean;
}) {
  "use step";
  console.log("[step:logDeliveryFailure] start", {
    type: input.type,
    event_type: input.event_type,
    target: input.target,
  });

  const supabase = createServiceRoleClient();
  await recordDeliveryFailure(supabase, input);

  const event =
    input.type === "role_sync"
      ? DISCORD_ROLE_SYNC_FAILED
      : DISCORD_NOTIFICATION_FAILED;

  void captureServerEvent({
    event,
    distinctId: "workflow",
    properties: {
      event_type: input.event_type,
      error_code: input.error_code,
      reason: input.error_reason,
      type: input.type,
    },
  });

  console.log("[step:logDeliveryFailure] complete", {
    type: input.type,
    target: input.target,
  });
}

/**
 * Increment the consecutive failure counter for a channel and, if the
 * threshold is reached, mark a dead-letter email as sent (one-shot guard).
 */
export async function trackChannelFailureAndCheckEmail(
  serverId: number,
  channelId: string
) {
  "use step";
  console.log("[step:trackChannelFailureAndCheckEmail] start", {
    serverId,
    channelId,
  });

  const supabase = createServiceRoleClient();
  const { consecutive_failures: count } = await recordChannelFailure(
    supabase,
    serverId,
    channelId
  );

  if (count >= CHANNEL_FAILURE_EMAIL_THRESHOLD) {
    const { data: row } = await supabase
      .from("discord_channel_failures")
      .select("email_sent_at")
      .eq("discord_server_id", serverId)
      .eq("channel_id", channelId)
      .maybeSingle();

    if (!row?.email_sent_at) {
      await markChannelEmailSent(supabase, serverId, channelId);
      // TODO: send dead-letter email (email sender out of scope for this task)
    }
  }

  console.log("[step:trackChannelFailureAndCheckEmail] complete", {
    serverId,
    channelId,
    count,
  });
}

/**
 * Reset the consecutive failure counter for a channel after a successful
 * send and emit a PostHog notification-sent event.
 */
export async function clearChannelFailures(
  serverId: number,
  channelId: string
) {
  "use step";
  console.log("[step:clearChannelFailures] start", { serverId, channelId });

  const supabase = createServiceRoleClient();
  await resetChannelFailures(supabase, serverId, channelId);

  void captureServerEvent({
    event: DISCORD_NOTIFICATION_SENT,
    distinctId: "workflow",
    properties: { channel_id: channelId },
  });

  console.log("[step:clearChannelFailures] complete", { serverId, channelId });
}
