/**
 * Discord Notification Delivery Cron
 *
 * Runs periodically (via Vercel cron) to drain the `discord_notification_queue`
 * (channel messages) and `discord_dm_queue` (per-user DMs) tables.
 *
 * Channel pass:
 *   - Items with attempts >= MAX_CHANNEL_ATTEMPTS are immediately marked failed.
 *   - Successful sends reset the channel failure counter.
 *   - Terminal errors (404, 50001 Missing Access, 50013 Missing Permissions)
 *     mark the item failed and increment the channel failure counter.
 *   - When consecutive failures reach CHANNEL_FAILURE_EMAIL_THRESHOLD and no
 *     alert email has been sent yet, markChannelEmailSent is called (email
 *     delivery is out of scope for this phase).
 *   - Rate-limit (429) and transient (5xx) errors leave the item pending.
 *
 * DM pass:
 *   - Opt-out check via isDmEnabledForUser — skipped items are marked "skipped".
 *   - delivery_mode=channel_only items are also skipped.
 *   - Error code 50007 (DMs closed) falls back to fallback_channel_id if set.
 *   - Rate-limit errors leave the item pending without any state mutation.
 *
 * Authorization: Vercel cron token via `CRON_SECRET` env var.
 * DB access: service-role client — RLS policies gate on auth.uid(), which
 * is not set in server-to-server cron context.
 *
 * GET  /api/discord/notify
 * POST /api/discord/notify
 */

import {
  getDiscordServerByChannelId,
  isDmEnabledForUser,
  listPendingDmNotifications,
  listPendingNotifications,
  type DiscordDmQueueItem,
  type DiscordNotificationQueueItem,
} from "@trainers/supabase";
import {
  markChannelEmailSent,
  markDmFailed,
  markDmSkipped,
  markDmSent,
  markNotificationFailed,
  markNotificationSent,
  recordChannelFailure,
  resetChannelFailures,
} from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  DiscordRateLimitError,
  getErrorCode,
  isMissingAccessError,
  isNotFoundError,
  sendChannelMessage,
  sendDM,
} from "@/lib/discord/api";
import { buildEmbed } from "@/lib/discord/embeds";

import { type TypedClient } from "@trainers/supabase";

// =============================================================================
// Constants
// =============================================================================

const CHANNEL_BATCH_LIMIT = 50;
const DM_BATCH_LIMIT = 50;
const CHANNEL_FAILURE_EMAIL_THRESHOLD = 5;
const MAX_CHANNEL_ATTEMPTS = 3;

// =============================================================================
// Route handlers
// =============================================================================

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}

// =============================================================================
// Core handler
// =============================================================================

async function handle(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const channelStats = await processChannelQueue(supabase);
  const dmStats = await processDmQueue(supabase);

  return Response.json({ ...channelStats, ...dmStats });
}

// =============================================================================
// Channel notification pass
// =============================================================================

interface ChannelError {
  id: number;
  reason: string;
  code?: number | string;
}

interface ChannelStats {
  channelsProcessed: number;
  channelsSent: number;
  channelsFailed: number;
  channelErrors: ChannelError[];
}

async function processChannelQueue(
  supabase: TypedClient
): Promise<ChannelStats> {
  const items = await listPendingNotifications(supabase, CHANNEL_BATCH_LIMIT);

  let processed = 0;
  let sent = 0;
  let failed = 0;
  const errors: ChannelError[] = [];

  for (const item of items) {
    processed++;

    // Items that have exceeded the retry budget are dead-lettered immediately
    if (item.attempts >= MAX_CHANNEL_ATTEMPTS) {
      await markNotificationFailed(supabase, item.id, "max_attempts_exceeded");
      failed++;
      continue;
    }

    try {
      await sendChannelMessage(item.channel_id, buildChannelPayload(item));
      await markNotificationSent(supabase, item.id);

      // Reset consecutive failure counter after a successful send
      const server = await getDiscordServerByChannelId(
        supabase,
        item.channel_id
      );
      if (server) {
        await resetChannelFailures(supabase, server.id, item.channel_id);
      }

      sent++;
    } catch (e: unknown) {
      if (e instanceof DiscordRateLimitError) {
        // Leave item pending — @discordjs/rest already queued a retry
        errors.push({ id: item.id, reason: "rate_limited" });
      } else if (
        isNotFoundError(e) ||
        isMissingAccessError(e) ||
        getErrorCode(e) === 50013
      ) {
        // Terminal: channel deleted, bot removed, or bot missing Send Messages
        await markNotificationFailed(
          supabase,
          item.id,
          `terminal:${getErrorCode(e)}`
        );
        failed++;

        const server = await getDiscordServerByChannelId(
          supabase,
          item.channel_id
        );
        if (server) {
          const { consecutive_failures: count } = await recordChannelFailure(
            supabase,
            server.id,
            item.channel_id
          );
          if (count >= CHANNEL_FAILURE_EMAIL_THRESHOLD) {
            // Check whether an alert email was already sent for this channel
            const { data: failureRow } = await supabase
              .from("discord_channel_failures")
              .select("email_sent_at")
              .eq("discord_server_id", server.id)
              .eq("channel_id", item.channel_id)
              .maybeSingle();

            if (!failureRow?.email_sent_at) {
              await markChannelEmailSent(supabase, server.id, item.channel_id);
              // TODO: send dead-letter email (email sender out of scope for phase 4)
            }
          }
        }
      } else {
        // 5xx or other transient error — leave item pending
        errors.push({
          id: item.id,
          reason: "transient",
          code: getErrorCode(e),
        });
      }
    }
  }

  return {
    channelsProcessed: processed,
    channelsSent: sent,
    channelsFailed: failed,
    channelErrors: errors,
  };
}

// =============================================================================
// DM notification pass
// =============================================================================

interface DmError {
  id: number;
  reason: string;
  code?: number | string;
}

interface DmStats {
  dmsProcessed: number;
  dmsSent: number;
  dmsSkipped: number;
  dmsFailed: number;
  dmErrors: DmError[];
}

async function processDmQueue(supabase: TypedClient): Promise<DmStats> {
  const items = await listPendingDmNotifications(supabase, DM_BATCH_LIMIT);

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: DmError[] = [];

  for (const item of items) {
    processed++;

    // Opt-in check: user must have explicitly enabled DMs for this event type
    const enabled = await isDmEnabledForUser(
      supabase,
      item.user_id,
      item.event_type
    );
    if (!enabled) {
      await markDmSkipped(supabase, item.id, "user_opted_out");
      skipped++;
      continue;
    }

    // Community-level delivery mode override
    if (item.delivery_mode === "channel_only") {
      await markDmSkipped(supabase, item.id, "community_disabled");
      skipped++;
      continue;
    }

    try {
      await sendDM(item.discord_user_id, buildDmPayload(item));
      await markDmSent(supabase, item.id);
      sent++;
    } catch (e: unknown) {
      if (getErrorCode(e) === 50007) {
        // DMs are closed — try fallback channel if configured
        if (item.fallback_channel_id) {
          try {
            await sendChannelMessage(
              item.fallback_channel_id,
              buildFallbackPayload(item)
            );
            await markDmSent(supabase, item.id); // delivered via fallback
            sent++;
          } catch {
            await markDmFailed(supabase, item.id, "dm_closed_fallback_failed");
            failed++;
          }
        } else {
          await markDmFailed(supabase, item.id, "dm_closed");
          failed++;
        }
      } else if (e instanceof DiscordRateLimitError) {
        // Leave pending — no state mutation
        errors.push({ id: item.id, reason: "rate_limited" });
      } else {
        // Transient — leave pending
        errors.push({
          id: item.id,
          reason: "transient",
          code: getErrorCode(e),
        });
      }
    }
  }

  return {
    dmsProcessed: processed,
    dmsSent: sent,
    dmsSkipped: skipped,
    dmsFailed: failed,
    dmErrors: errors,
  };
}

// =============================================================================
// Payload helpers
// =============================================================================

/**
 * Build the Discord message payload for a channel notification queue item.
 * Uses an embed constructed from the item's payload metadata.
 */
function buildChannelPayload(item: DiscordNotificationQueueItem): {
  embed: ReturnType<typeof buildEmbed>;
} {
  const payload = item.payload as Record<string, unknown>;
  const title =
    typeof payload.title === "string" ? payload.title : item.event_type;
  const description =
    typeof payload.description === "string" ? payload.description : undefined;

  return {
    embed: buildEmbed({ title, description }),
  };
}

/**
 * Build the Discord DM payload for a DM queue item.
 */
function buildDmPayload(item: DiscordDmQueueItem): {
  embed: ReturnType<typeof buildEmbed>;
} {
  const payload = item.payload as Record<string, unknown>;
  const title =
    typeof payload.title === "string" ? payload.title : item.event_type;
  const description =
    typeof payload.description === "string" ? payload.description : undefined;

  return {
    embed: buildEmbed({ title, description }),
  };
}

/**
 * Build the fallback channel message payload for when a user's DMs are closed.
 * Mentions the target user so they receive a notification in the channel.
 * Uses `allowed_mentions: { users: [userId] }` so only that user is pinged.
 */
function buildFallbackPayload(item: DiscordDmQueueItem): {
  content: string;
  allowed_mentions: { users: string[] };
} {
  return {
    content: `<@${item.discord_user_id}>`,
    allowed_mentions: { users: [item.discord_user_id] },
  };
}
