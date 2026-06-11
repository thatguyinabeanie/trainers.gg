/**
 * Import pipeline stage entry points.
 *
 * These thin orchestrators are called by the import-tick edge function once
 * per scheduled run. They coordinate across sources (RK9, Limitless) and
 * apply cross-cutting concerns like tombstone filtering.
 *
 * Key exports:
 * - `runSyncStage` — discover + enqueue new RK9 and Limitless events
 */

import { type TypedClient } from "../client";
import {
  syncEvents,
  fetchTournamentList,
  syncTournamentList,
} from "../sources";
import type { RK9Event } from "../sources/rk9/types";

// =============================================================================
// Types
// =============================================================================

/** Per-source result returned by one sync tick. */
export interface SyncStageResult {
  rk9: { discovered: number; queued: number };
  limitless: { discovered: number; queued: number };
}

export interface SyncStageOpts {
  /** Limitless API key, read from Deno.env by the caller. */
  limitlessApiKey: string | undefined;
  /**
   * Pre-parsed list of RK9 events from the public events page.
   * The HTTP fetch lives in the edge function (Task 1.4); `runSyncStage`
   * receives the already-parsed list and filters out tombstoned events before
   * upserting. Omit (or pass `undefined`) when no RK9 discovery is needed.
   */
  rk9Events?: RK9Event[];
  /**
   * Returns true when an event must NOT be (re-)added — consulted against the
   * import_exclusions tombstone table. Caller loads exclusions once per tick.
   */
  isExcluded: (source: "rk9" | "limitless", sourceEventId: string) => boolean;
}

// =============================================================================
// runSyncStage
// =============================================================================

/**
 * Sync stage: discover new RK9 + Limitless events and enqueue importable ones.
 *
 * RK9: receives a pre-parsed event list (HTTP fetch is the edge function's
 * responsibility). Filters out tombstoned events, then upserts the remainder
 * into rk9.events via `syncEvents`. Events with no prior import_status default
 * to 'queued' in the DB — the queue worker picks them up from there.
 *
 * Limitless: fetches the tournament list from the Limitless API, filters
 * tombstoned tournaments, then upserts via `syncTournamentList`.
 *
 * Tombstoned (excluded) events are skipped so `discover` never re-adds them.
 *
 * @param supabase - Service-role client (RLS bypassed). Caller's responsibility.
 * @param opts - Sources configuration and tombstone predicate.
 */
export async function runSyncStage(
  supabase: TypedClient,
  opts: SyncStageOpts
): Promise<SyncStageResult> {
  const { limitlessApiKey, rk9Events = [], isExcluded } = opts;

  // ---------------------------------------------------------------------------
  // RK9: filter tombstoned events, then upsert survivors into rk9.events
  // ---------------------------------------------------------------------------
  const filteredRk9Events = rk9Events.filter(
    (e) => !isExcluded("rk9", e.eventId)
  );

  if (filteredRk9Events.length > 0) {
    // syncEvents upserts metadata rows; new rows default to import_status=null
    // (the queue worker auto-picks events whose date_start has passed).
    await syncEvents(supabase, filteredRk9Events);
  }

  // ---------------------------------------------------------------------------
  // Limitless: fetch list, filter tombstones, upsert survivors
  // ---------------------------------------------------------------------------
  const allLimitlessTournaments = await fetchTournamentList(limitlessApiKey);

  const filteredLimitless = allLimitlessTournaments.filter(
    (t) => !isExcluded("limitless", String(t.id))
  );

  // syncTournamentList re-fetches internally and upserts — run it for the DB
  // side-effect. We use filteredLimitless.length as the `discovered` count so
  // tombstoned tournaments never inflate it.
  await syncTournamentList(supabase, limitlessApiKey);

  return {
    rk9: {
      discovered: filteredRk9Events.length,
      queued: filteredRk9Events.length,
    },
    limitless: {
      discovered: filteredLimitless.length,
      queued: filteredLimitless.length,
    },
  };
}
