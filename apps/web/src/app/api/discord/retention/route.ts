/**
 * Discord Queue Retention Cron
 *
 * Runs weekly (via Vercel cron, Sunday 06:00 UTC — offset from uninstall-sweep's 07:00)
 * to purge terminal-state rows from Discord queue tables according to retention policies:
 *
 *   discord_notification_queue — status IN ('sent','failed') older than 30 days
 *   discord_dm_queue           — status IN ('sent','failed','skipped') older than 30 days
 *   discord_role_sync_queue    — status IN ('sent','failed') older than 7 days
 *   discord_channel_failures   — kept indefinitely (not purged)
 *
 * Each table is purged independently via Promise.all so a single failure does not
 * block the others. Partial success is acceptable and reported in the response.
 *
 * Authorization: Vercel cron token via `CRON_SECRET` env var.
 * DB access: service-role client — RLS policies gate on auth.uid(), which is
 * not set in server-to-server cron context.
 *
 * GET /api/discord/retention
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  purgeOldNotifications,
  purgeOldDmQueue,
  purgeOldRoleSyncQueue,
} from "@trainers/supabase";

// =============================================================================
// Retention policy constants
// =============================================================================

const NOTIFICATION_RETENTION_DAYS = 30;
const DM_RETENTION_DAYS = 30;
const ROLE_SYNC_RETENTION_DAYS = 7;

// =============================================================================
// Helpers
// =============================================================================

/** Compute a Date that is `days` days before now. */
function daysAgo(days: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

// =============================================================================
// Route handler
// =============================================================================

export async function GET(request: Request): Promise<Response> {
  // Verify Vercel cron authorization
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Run all three purges in parallel; catch individually for partial-success reporting
  const [notifResult, dmResult, roleSyncResult] = await Promise.all([
    purgeOldNotifications(supabase, daysAgo(NOTIFICATION_RETENTION_DAYS)).catch(
      (e: unknown) => e
    ),
    purgeOldDmQueue(supabase, daysAgo(DM_RETENTION_DAYS)).catch(
      (e: unknown) => e
    ),
    purgeOldRoleSyncQueue(supabase, daysAgo(ROLE_SYNC_RETENTION_DAYS)).catch(
      (e: unknown) => e
    ),
  ]);

  const errors: Array<{ table: string; error: string }> = [];

  const notificationsPurged =
    notifResult instanceof Error ||
    !(notifResult instanceof Object) ||
    !("deleted" in notifResult)
      ? (errors.push({
          table: "discord_notification_queue",
          error: String(notifResult),
        }),
        0)
      : notifResult.deleted;

  const dmsPurged =
    dmResult instanceof Error ||
    !(dmResult instanceof Object) ||
    !("deleted" in dmResult)
      ? (errors.push({ table: "discord_dm_queue", error: String(dmResult) }), 0)
      : dmResult.deleted;

  const roleSyncsPurged =
    roleSyncResult instanceof Error ||
    !(roleSyncResult instanceof Object) ||
    !("deleted" in roleSyncResult)
      ? (errors.push({
          table: "discord_role_sync_queue",
          error: String(roleSyncResult),
        }),
        0)
      : roleSyncResult.deleted;

  return Response.json({
    notifications_purged: notificationsPurged,
    dms_purged: dmsPurged,
    role_syncs_purged: roleSyncsPurged,
    errors,
  });
}
