/**
 * Discord Reconcile Roles Cron
 *
 * Compares the trainers.gg role membership for each enabled role mapping
 * against the current Discord guild state, then starts a syncRoleWorkflow
 * for each add/remove delta.
 *
 * Processes up to MAPPING_BATCH enabled role mappings per run (oldest first).
 * Winner roles are honorific and are never removed, only added.
 *
 * Authorization: Vercel cron token via `CRON_SECRET` env var.
 * DB access: service-role client — RLS policies gate on auth.uid(), which
 * is not set in server-to-server cron context.
 *
 * GET /api/discord/reconcile-roles
 */

import { start } from "workflow/api";

import { requireCronAuth } from "@/lib/cron-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getGuildMembersWithRole, getErrorCode } from "@/lib/discord/api";
import {
  listAllEnabledRoleMappingsWithServer,
  getDiscordIdsByUserIds,
  getCommunityStaffUserIds,
  getCommunityParticipantUserIds,
  getCommunityWinnerUserIds,
  getCommunityCurrentlyPlayingUserIds,
  getCommunityMemberUserIds,
} from "@trainers/supabase";

import { syncRoleWorkflow } from "@/workflows/sync-role";

// =============================================================================
// Constants
// =============================================================================

/** Maximum number of role mappings to reconcile per cron pass. */
const MAPPING_BATCH = 20;

/**
 * Maximum workflows started concurrently per mapping. Each mapping can
 * produce add/remove deltas for many members; without a cap the 20-mapping
 * batch could fan out into hundreds of concurrent workflow starts and hit
 * Discord rate limits or saturate the Workflow backend.
 */
const WORKFLOW_CONCURRENCY_PER_MAPPING = 5;

/**
 * Run `tasks` in parallel with at most `limit` active at once. Results are
 * returned via `Promise.allSettled` semantics so one failure doesn't stop
 * the rest — the caller decides what to do with the settled results.
 */
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < tasks.length) {
      const i = cursor++;
      const task = tasks[i];
      if (!task) return;
      try {
        results[i] = { status: "fulfilled", value: await task() };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };
  const workerCount = Math.min(limit, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

// =============================================================================
// Route handler
// =============================================================================

export async function GET(request: Request): Promise<Response> {
  // Verify Vercel cron authorization. Fails closed if CRON_SECRET is unset.
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();

  // TODO: Track last_reconciled_at per mapping for fair rotation so that all
  // mappings are visited evenly across cron passes rather than always
  // processing the oldest-created ones first. Requires a followup migration to
  // add last_reconciled_at to discord_role_mappings.
  const mappings = await listAllEnabledRoleMappingsWithServer(
    supabase,
    MAPPING_BATCH
  );

  const stats = {
    mappings: 0,
    adds: 0,
    removes: 0,
    errors: [] as Array<{ mappingId: number; code: number | string }>,
  };

  // =============================================================================
  // Mapping fan-out (concurrent across the batch)
  // =============================================================================
  //
  // Each mapping is independent — resolved user IDs, Discord guild reads, and
  // workflow starts share no per-mapping state. Running them in parallel with
  // Promise.allSettled collapses the batch latency from N × (DB + Discord RTT)
  // down to the slowest single mapping.

  type ReconcileMapping = (typeof mappings)[number];

  async function reconcileMapping(mapping: ReconcileMapping): Promise<void> {
    // -----------------------------------------------------------------------
    // 1. Resolve trainers.gg user IDs for this role type
    // -----------------------------------------------------------------------
    let userIds: string[];

    switch (mapping.role_type) {
      case "staff":
        userIds = await getCommunityStaffUserIds(
          supabase,
          mapping.community_id
        );
        break;
      case "participant":
        userIds = await getCommunityParticipantUserIds(
          supabase,
          mapping.community_id
        );
        break;
      case "winner":
        userIds = await getCommunityWinnerUserIds(
          supabase,
          mapping.community_id
        );
        break;
      case "currently_playing":
        userIds = await getCommunityCurrentlyPlayingUserIds(
          supabase,
          mapping.community_id
        );
        break;
      case "member":
        userIds = await getCommunityMemberUserIds(
          supabase,
          mapping.community_id
        );
        break;
      default: {
        // Exhaustive check — TypeScript will error here if a new role_type
        // is added to the enum without being handled above.
        const _exhaustive: never = mapping.role_type as never;
        console.error(
          `[reconcile-roles] Unknown role_type: ${mapping.role_type}`
        );
        userIds = [];
      }
    }

    // -----------------------------------------------------------------------
    // 2. Resolve trainers.gg user IDs → Discord snowflake IDs
    //    Run in parallel with the Discord guild-member fetch — the two are
    //    independent lookups and together dominate per-mapping latency.
    // -----------------------------------------------------------------------
    const [discordIdList, current] = await Promise.all([
      getDiscordIdsByUserIds(supabase, userIds),
      getGuildMembersWithRole(mapping.guild_id, mapping.discord_role_id),
    ]);
    const discordIds = new Set(discordIdList);

    // -----------------------------------------------------------------------
    // 3. Compute diff
    // -----------------------------------------------------------------------
    const shouldAdd = new Set([...discordIds].filter((id) => !current.has(id)));
    // Winner roles are honorific — never remove them, only add.
    const shouldRemove =
      mapping.role_type === "winner"
        ? new Set<string>()
        : new Set([...current].filter((id) => !discordIds.has(id)));

    // -----------------------------------------------------------------------
    // 4. Start workflows for each delta (bounded concurrency per mapping)
    //    Hundreds of members can be in a single mapping; cap in-flight
    //    starts so we don't trip Discord rate limits or saturate the
    //    Workflow backend.
    // -----------------------------------------------------------------------
    const addTasks = [...shouldAdd].map(
      (userId) => () =>
        start(syncRoleWorkflow, [
          mapping.guild_id,
          userId,
          mapping.discord_role_id,
          "add",
          mapping.discord_server_id,
          mapping.role_type,
        ])
    );

    const removeTasks = [...shouldRemove].map(
      (userId) => () =>
        start(syncRoleWorkflow, [
          mapping.guild_id,
          userId,
          mapping.discord_role_id,
          "remove",
          mapping.discord_server_id,
          mapping.role_type,
        ])
    );

    await runWithConcurrency(
      [...addTasks, ...removeTasks],
      WORKFLOW_CONCURRENCY_PER_MAPPING
    );
    stats.adds += shouldAdd.size;
    stats.removes += shouldRemove.size;
  }

  const results = await Promise.allSettled(mappings.map(reconcileMapping));
  stats.mappings = mappings.length;
  results.forEach((result, idx) => {
    if (result.status === "rejected") {
      const mapping = mappings[idx];
      if (mapping) {
        // Surface per-mapping errors without aborting the entire batch.
        stats.errors.push({
          mappingId: mapping.id,
          code: getErrorCode(result.reason),
        });
      }
    }
  });

  return Response.json(stats);
}
