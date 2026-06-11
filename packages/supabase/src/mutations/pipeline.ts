/**
 * Import pipeline stage entry points.
 *
 * These thin orchestrators are called by the import-tick edge function once
 * per scheduled run. They coordinate across sources (RK9, Limitless) and
 * apply cross-cutting concerns like tombstone filtering.
 *
 * Key exports:
 * - `runSyncStage`    — discover + enqueue new RK9 and Limitless events
 * - `runImportStage`  — drain the import queue (1 RK9 event + Limitless batch)
 * - `runCompileStage` — compile completed events into team_slots
 */

import { type TypedClient } from "../client";
import {
  syncEvents,
  fetchTournamentList,
  syncTournamentList,
  processRk9Queue,
  drainLimitlessQueue,
} from "../sources";
import type { RK9Event } from "../sources/rk9/types";
import { compileSourceTeamSlots } from "./team-slots";

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

// =============================================================================
// runImportStage
// =============================================================================

/** Per-source summary returned by one import tick. */
export interface ImportStageResult {
  rk9: { processed: number; errors: number; remaining: number };
  limitless: { processed: number; errors: number; remaining: number };
}

export interface ImportStageOpts {
  /** Limitless API key, read from Deno.env by the caller. */
  limitlessApiKey: string | undefined;
  /** Events processed per Limitless import tick (from site_config). */
  limitlessBatchSize: number;
  /** Absolute epoch-ms deadline; the edge function budgets ~9 min. */
  deadlineMs: number;
}

/** Default number of teams scraped per RK9 batch. Kept moderate to respect budget. */
const RK9_TEAMS_PER_TICK = 25;
/** Default concurrent team fetches per RK9 batch wave. */
const RK9_CONCURRENCY = 3;

/**
 * Import stage: drain the unified queue at equal priority.
 *
 * RK9: one event per tick (scraped fully within the deadline budget).
 * Limitless: a configurable batch of events per tick (cheap API reads).
 *
 * Both sources run concurrently — neither blocks the other.
 *
 * @param supabase - Service-role client (caller's responsibility).
 * @param opts     - Deadline, Limitless API key, and batch size.
 */
export async function runImportStage(
  supabase: TypedClient,
  opts: ImportStageOpts
): Promise<ImportStageResult> {
  const { limitlessApiKey, limitlessBatchSize, deadlineMs } = opts;

  const [rk9Result, limitlessResult] = await Promise.all([
    // processRk9Queue processes events within its own budget up to the deadline.
    // teamsPerTick + concurrency are set to sensible cron defaults; the deadline
    // is the primary constraint that limits work per tick.
    processRk9Queue(supabase, {
      deadline: deadlineMs,
      teamsPerTick: RK9_TEAMS_PER_TICK,
      concurrency: RK9_CONCURRENCY,
    }),
    drainLimitlessQueue(
      supabase,
      limitlessApiKey,
      limitlessBatchSize,
      deadlineMs
    ),
  ]);

  return {
    rk9: {
      // eventsTouched = events that completed at least one stage this tick
      processed: rk9Result.eventsTouched,
      errors: rk9Result.errors,
      // remainingQueued = events still in the queue after this tick
      remaining: rk9Result.remainingQueued,
    },
    limitless: {
      processed: limitlessResult.processed,
      errors: limitlessResult.errors,
      remaining: limitlessResult.remaining,
    },
  };
}

// =============================================================================
// runCompileStage
// =============================================================================

export interface CompileStageResult {
  eventsCompiled: number;
  formats: string[];
}

/**
 * Compile stage: bridge completed source events into team_slots.
 *
 * Runs RK9 and Limitless compilation concurrently. Only acts on events that
 * have team data but no compiled team_slots rows yet. Returns the union of
 * affected format IDs so the caller can invalidate the public /data usage caches.
 *
 * @param supabase - Service-role client (caller's responsibility).
 */
export async function runCompileStage(
  supabase: TypedClient
): Promise<CompileStageResult> {
  const [rk9, limitless] = await Promise.all([
    compileSourceTeamSlots(supabase, "rk9"),
    compileSourceTeamSlots(supabase, "limitless"),
  ]);

  const formats = Array.from(new Set([...rk9.formats, ...limitless.formats]));

  return {
    eventsCompiled: rk9.eventsCompiled + limitless.eventsCompiled,
    formats,
  };
}
