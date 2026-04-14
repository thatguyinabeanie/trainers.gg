/**
 * Discord Reconcile Roles Cron
 *
 * Compares the trainers.gg role membership for each enabled role mapping
 * against the current Discord guild state, then enqueues add/remove jobs
 * into `discord_role_sync_queue` for the role-sync cron to apply.
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
  enqueueRoleSync,
} from "@trainers/supabase";

// =============================================================================
// Constants
// =============================================================================

/** Maximum number of role mappings to reconcile per cron pass. */
const MAPPING_BATCH = 20;

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
  // Mapping loop
  // =============================================================================

  for (const mapping of mappings) {
    stats.mappings++;

    try {
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
        default:
          // Exhaustive check — if a new role_type is added to the enum this
          // will surface as a TypeScript error in strict mode.
          userIds = [];
      }

      // -----------------------------------------------------------------------
      // 2. Resolve trainers.gg user IDs → Discord snowflake IDs
      // -----------------------------------------------------------------------
      const discordIds = new Set(
        await getDiscordIdsByUserIds(supabase, userIds)
      );

      // -----------------------------------------------------------------------
      // 3. Fetch the current role holders from Discord
      // -----------------------------------------------------------------------
      const current = await getGuildMembersWithRole(
        mapping.guild_id,
        mapping.discord_role_id
      );

      // -----------------------------------------------------------------------
      // 4. Compute diff
      // -----------------------------------------------------------------------
      const shouldAdd = new Set(
        [...discordIds].filter((id) => !current.has(id))
      );
      // Winner roles are honorific — never remove them, only add.
      const shouldRemove =
        mapping.role_type === "winner"
          ? new Set<string>()
          : new Set([...current].filter((id) => !discordIds.has(id)));

      // -----------------------------------------------------------------------
      // 5. Enqueue deltas
      // -----------------------------------------------------------------------
      for (const userId of shouldAdd) {
        await enqueueRoleSync(supabase, {
          discord_server_id: mapping.discord_server_id,
          discord_user_id: userId,
          discord_role_id: mapping.discord_role_id,
          action: "add",
          source_event: "reconcile",
        });
        stats.adds++;
      }

      for (const userId of shouldRemove) {
        await enqueueRoleSync(supabase, {
          discord_server_id: mapping.discord_server_id,
          discord_user_id: userId,
          discord_role_id: mapping.discord_role_id,
          action: "remove",
          source_event: "reconcile",
        });
        stats.removes++;
      }
    } catch (e: unknown) {
      // Surface per-mapping errors without aborting the entire batch.
      stats.errors.push({ mappingId: mapping.id, code: getErrorCode(e) });
    }
  }

  return Response.json(stats);
}
