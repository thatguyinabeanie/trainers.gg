"use server";

import { getErrorMessage } from "@trainers/utils";
import type { ActionResult } from "@trainers/validators";
import { SKIP_FORMATS } from "@trainers/data-sources";
import { pgInList } from "@trainers/supabase";
import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import { syncTournamentList, processImportQueue } from "@/lib/limitless";

const SKIP_FORMATS_ARRAY = Array.from(SKIP_FORMATS);

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

    let query = supabase
      .schema("limitless")
      .from("tournaments")
      .update({
        import_requested_at: new Date().toISOString(),
        import_status: "queued",
        import_error: null,
        import_attempts: 0,
      })
      .eq("tournament_id", tournamentId);

    if (SKIP_FORMATS_ARRAY.length > 0) {
      query = query.not("format_id", "in", pgInList(SKIP_FORMATS_ARRAY));
    }

    const { data: updated, error } = await query
      .select("tournament_id")
      .maybeSingle();

    if (error) throw error;
    if (!updated) {
      return {
        success: false,
        error: "Tournament not found, or its format is in the skip list",
      };
    }
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
    const CHUNK_SIZE = 100; // PostgREST .in() filter is encoded in the URL — keep under 100
    let totalQueued = 0;

    for (let i = 0; i < tournamentIds.length; i += CHUNK_SIZE) {
      const chunk = tournamentIds.slice(i, i + CHUNK_SIZE);

      let query = supabase
        .schema("limitless")
        .from("tournaments")
        .update({
          import_requested_at: new Date().toISOString(),
          import_status: "queued",
          import_error: null,
          import_attempts: 0,
        })
        .in("tournament_id", chunk);

      if (SKIP_FORMATS_ARRAY.length > 0) {
        query = query.not("format_id", "in", pgInList(SKIP_FORMATS_ARRAY));
      }

      const { data: updated, error } = await query.select("tournament_id");

      if (error) throw error;
      totalQueued += updated?.length ?? 0;
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

/**
 * Trigger the import queue processor.
 * Processes up to `batchSize` queued tournaments (fetches data from Limitless API).
 */
export async function triggerImportQueue(
  batchSize: number = 5
): Promise<
  ActionResult<{ processed: number; errors: number; remaining: number }>
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
    const result = await processImportQueue(supabase, apiKey, batchSize);

    return {
      success: true,
      data: {
        processed: result.totalProcessed,
        errors: result.totalErrors,
        remaining: result.remaining,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Queue processing failed"),
    };
  }
}
