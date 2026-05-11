"use server";

import { getErrorMessage } from "@trainers/utils";
import type { ActionResult } from "@trainers/validators";
import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import { syncTournamentList } from "@/lib/limitless";

/**
 * Queue a single tournament for import.
 */
export async function queueTournamentForImport(
  tournamentId: string
): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .schema("limitless")
      .from("tournaments")
      .update({
        import_requested_at: new Date().toISOString(),
        import_status: "queued",
        import_error: null,
      })
      .eq("tournament_id", tournamentId);

    if (error) throw error;
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: getErrorMessage(e, "Failed to queue") };
  }
}

/**
 * Batch queue tournaments for import.
 * Chunks into groups of 100 to avoid PostgREST limits.
 */
export async function batchQueueTournaments(
  tournamentIds: string[]
): Promise<ActionResult<{ queued: number }>> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    if (tournamentIds.length === 0) {
      return { success: true, data: { queued: 0 } };
    }

    const supabase = createServiceRoleClient();
    const CHUNK_SIZE = 100;
    let totalQueued = 0;

    for (let i = 0; i < tournamentIds.length; i += CHUNK_SIZE) {
      const chunk = tournamentIds.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .schema("limitless")
        .from("tournaments")
        .update({
          import_requested_at: new Date().toISOString(),
          import_status: "queued",
          import_error: null,
        })
        .in("tournament_id", chunk);

      if (error) throw error;
      totalQueued += chunk.length;
    }

    return { success: true, data: { queued: totalQueued } };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to batch queue"),
    };
  }
}

/**
 * Trigger a manual sync of the Limitless tournament list.
 * Admin-only — same logic as the cron route.
 */
export async function triggerLimitlessSync(): Promise<
  ActionResult<{ synced: number }>
> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const apiKey = process.env.LIMITLESS_API_KEY;
    if (!apiKey) {
      return { success: false, error: "LIMITLESS_API_KEY not configured" };
    }

    const supabase = createServiceRoleClient();
    const result = await syncTournamentList(supabase, apiKey);

    return { success: true, data: { synced: result.synced } };
  } catch (e) {
    return { success: false, error: getErrorMessage(e, "Sync failed") };
  }
}
