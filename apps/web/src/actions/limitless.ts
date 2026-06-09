"use server";

import { getErrorMessage } from "@trainers/utils";
import type { ActionResult } from "@trainers/validators";
import {
  SKIP_FORMATS,
  fetchTournamentData,
  importTournament,
} from "@trainers/data-sources";
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

// Mirror of processOne's retry threshold — kept in sync manually.
// Source of truth: packages/data-sources/src/limitless/import.ts MAX_ATTEMPTS.
const MAX_IMPORT_ATTEMPTS = 3;

/**
 * Fully import ONE Limitless tournament in a single pass (fetch + insert) —
 * the same work the queue worker (processOne) does per item. Used by the manual
 * per-row Import action so the admin doesn't have to queue and wait.
 */
export async function importLimitlessTournament(
  tournamentId: string
): Promise<ActionResult<{ imported: boolean }>> {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const isAdmin = await isSiteAdmin();
  if (!isAdmin) return { success: false, error: "Requires site admin" };

  const apiKey = process.env.LIMITLESS_API_KEY;
  if (!apiKey) {
    return { success: false, error: "LIMITLESS_API_KEY not configured" };
  }

  // Captured inside the try so the catch block can use it for the failure write.
  let capturedAttempts = 0;
  let capturedSupabase: ReturnType<typeof createServiceRoleClient> | null =
    null;

  try {
    const supabase = createServiceRoleClient();
    capturedSupabase = supabase;

    // Look up format_id and current attempt count BEFORE marking importing —
    // if the row doesn't exist, we bail early without a phantom "importing" write.
    const { data: row, error: rowErr } = await supabase
      .schema("limitless")
      .from("tournaments")
      .select("format_id, import_attempts")
      .eq("tournament_id", tournamentId)
      .maybeSingle();

    if (rowErr)
      throw new Error(`Failed to fetch tournament: ${rowErr.message}`);
    if (!row) return { success: false, error: "Tournament not found" };

    if (!row.format_id)
      return {
        success: false,
        error: "Tournament has no format ID configured",
      };

    if (SKIP_FORMATS.has(row.format_id))
      return {
        success: false,
        error: `Format "${row.format_id}" is in the skip list`,
      };

    const formatId = row.format_id;
    capturedAttempts = row.import_attempts ?? 0;

    // Atomic claim: the UPDATE only fires when the row is NOT already "importing",
    // preventing two admins from double-importing the same tournament simultaneously.
    const { data: claimed, error: claimErr } = await supabase
      .schema("limitless")
      .from("tournaments")
      .update({
        import_status: "importing",
        import_started_at: new Date().toISOString(),
        import_requested_at: new Date().toISOString(),
        import_error: null,
      })
      .eq("tournament_id", tournamentId)
      .not("import_status", "eq", "importing")
      .select("tournament_id")
      .maybeSingle();

    if (claimErr)
      throw new Error(`Failed to claim tournament: ${claimErr.message}`);
    if (!claimed)
      return { success: false, error: "Import already in progress" };

    const data = await fetchTournamentData(tournamentId, apiKey);
    await importTournament(supabase, data, formatId);

    // Explicit success write — importTournament sets "completed" internally,
    // but this ensures the row is never stuck at "importing" if that contract changes.
    await supabase
      .schema("limitless")
      .from("tournaments")
      .update({
        import_status: "completed",
        data_imported_at: new Date().toISOString(),
        import_error: null,
      })
      .eq("tournament_id", tournamentId);

    return { success: true, data: { imported: true } };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown error";

    // Replicate processOne failure logic: increment attempt counter, escalate
    // to "failed" once MAX_IMPORT_ATTEMPTS is reached, else re-queue.
    const attempts = capturedAttempts + 1;
    const newStatus = attempts >= MAX_IMPORT_ATTEMPTS ? "failed" : "queued";

    if (capturedSupabase) {
      await capturedSupabase
        .schema("limitless")
        .from("tournaments")
        .update({
          import_status: newStatus,
          import_error: errorMsg,
          import_attempts: attempts,
        })
        .eq("tournament_id", tournamentId);
    }

    return {
      success: false,
      error: getErrorMessage(e, "Failed to import tournament"),
    };
  }
}
