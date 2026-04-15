/**
 * Discord Role Sync Cron
 *
 * Drains pending items from `discord_role_sync_queue`, applying each
 * add/remove operation against the Discord API. Intended to be triggered
 * on a schedule (e.g. every minute via Vercel cron).
 *
 * Permanent failures (role deleted, hierarchy violation, user left) mark the
 * job as failed. A deleted role additionally disables the discord_role_mappings
 * row so future reconcile runs stop generating new jobs for it. Transient errors
 * (rate limits, 5xx) leave the job pending for the next cron pass.
 *
 * Authorization: Vercel cron token via `CRON_SECRET` env var.
 * DB access: service-role client — RLS policies gate on auth.uid(), which
 * is not set in server-to-server cron context.
 *
 * GET /api/discord/role-sync
 */

import { DISCORD_ROLE_SYNC_FAILED } from "@trainers/posthog";
import {
  listPendingRoleSyncs,
  markRoleSyncComplete,
  markRoleSyncFailed,
  toggleRoleMapping,
} from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  assignRole,
  removeRole,
  getErrorCode,
  DiscordRateLimitError,
} from "@/lib/discord/api";
import {
  isHierarchyViolation,
  isUnknownRole,
  isUnknownMember,
} from "@/lib/discord/role-sync-helpers";
import { captureServerEvent } from "@/lib/posthog/server";

// =============================================================================
// Constants
// =============================================================================

const ROLE_SYNC_BATCH_LIMIT = 100;

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

  const jobs = await listPendingRoleSyncs(supabase, ROLE_SYNC_BATCH_LIMIT);

  // Pre-load the guild_id for every discord_server_id referenced in this batch.
  // discord_role_sync_queue stores discord_server_id (FK to discord_servers.id),
  // not the Discord guild snowflake directly.
  const serverIds = [...new Set(jobs.map((j) => j.discord_server_id))];

  const servers =
    serverIds.length > 0
      ? ((
          await supabase
            .from("discord_servers")
            .select("id, guild_id")
            .in("id", serverIds)
        ).data ?? [])
      : [];

  const guildById = new Map(servers.map((s) => [s.id, s.guild_id]));

  // =============================================================================
  // Job loop
  // =============================================================================

  const stats = {
    processed: 0,
    completed: 0,
    failed: 0,
    errors: [] as Array<{
      jobId: number;
      reason: string;
      code?: number | string;
    }>,
  };

  for (const job of jobs) {
    stats.processed++;

    const guildId = guildById.get(job.discord_server_id);
    if (!guildId) {
      await markRoleSyncFailed(supabase, job.id, "server_not_found");
      stats.failed++;
      stats.errors.push({ jobId: job.id, reason: "server_not_found" });
      // Emit failure event — fire-and-forget
      void captureServerEvent({
        event: DISCORD_ROLE_SYNC_FAILED,
        distinctId: `server:${job.discord_server_id}`,
        properties: {
          community_id: null,
          role_type: job.discord_role_id,
          reason: "server_not_found",
        },
      });
      continue;
    }

    try {
      if (job.action === "add") {
        await assignRole(guildId, job.discord_user_id, job.discord_role_id);
      } else {
        await removeRole(guildId, job.discord_user_id, job.discord_role_id);
      }
      await markRoleSyncComplete(supabase, job.id);
      stats.completed++;
    } catch (e: unknown) {
      const code = getErrorCode(e);

      if (isHierarchyViolation(e)) {
        // Bot's role is below the target role — permanent failure for this job.
        // The mapping is still valid so do NOT disable it (admin may fix hierarchy).
        await markRoleSyncFailed(
          supabase,
          job.id,
          `hierarchy_violation:${code}`
        );
        stats.failed++;
        stats.errors.push({
          jobId: job.id,
          reason: "hierarchy_violation",
          code,
        });
        void captureServerEvent({
          event: DISCORD_ROLE_SYNC_FAILED,
          distinctId: `guild:${guildId}`,
          properties: {
            community_id: null,
            role_type: job.discord_role_id,
            reason: "hierarchy_violation",
          },
        });
      } else if (isUnknownRole(e)) {
        // Role was deleted from Discord — disable the mapping to stop retries.
        await markRoleSyncFailed(supabase, job.id, `role_deleted:${code}`);
        const { data: mapping } = await supabase
          .from("discord_role_mappings")
          .select("id")
          .eq("discord_server_id", job.discord_server_id)
          .eq("discord_role_id", job.discord_role_id)
          .maybeSingle();
        if (mapping) {
          await toggleRoleMapping(supabase, mapping.id, false);
        }
        stats.failed++;
        stats.errors.push({ jobId: job.id, reason: "role_deleted", code });
        void captureServerEvent({
          event: DISCORD_ROLE_SYNC_FAILED,
          distinctId: `guild:${guildId}`,
          properties: {
            community_id: null,
            role_type: job.discord_role_id,
            reason: "role_deleted",
          },
        });
      } else if (isUnknownMember(e)) {
        // User left the server — fail the job, no mapping change needed.
        await markRoleSyncFailed(supabase, job.id, `user_left:${code}`);
        stats.failed++;
        stats.errors.push({ jobId: job.id, reason: "user_left", code });
        void captureServerEvent({
          event: DISCORD_ROLE_SYNC_FAILED,
          distinctId: `guild:${guildId}`,
          properties: {
            community_id: null,
            role_type: job.discord_role_id,
            reason: "user_left",
          },
        });
      } else if (e instanceof DiscordRateLimitError) {
        // Rate limit exhausted — leave job pending for next cron pass.
        stats.errors.push({ jobId: job.id, reason: "rate_limited", code });
      } else {
        // Transient error (5xx, network) — leave job pending for next pass.
        stats.errors.push({ jobId: job.id, reason: "transient", code });
      }
    }
  }

  return Response.json(stats);
}
