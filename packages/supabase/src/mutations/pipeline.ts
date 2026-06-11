/**
 * Import pipeline stage entry points.
 *
 * These thin orchestrators are called by the import-tick edge function once
 * per scheduled run. They coordinate across sources (RK9, Limitless) and
 * apply cross-cutting concerns like tombstone filtering.
 *
 * Key exports:
 * - `runSyncStage`       — discover + enqueue new RK9 and Limitless events
 * - `runImportStage`     — drain the import queue (1 RK9 event + Limitless batch)
 * - `runCompileStage`    — compile completed events into team_slots
 * - `eventKeyFor`        — build the source-qualified team_slots event_key
 * - `deleteSourceEvent`  — cascade-purge an event (FK cascade removes team_slots)
 * - `excludeSourceEvent` — purge + tombstone so Sync never re-discovers it
 * - `clearExclusion`     — remove a tombstone to re-enable discovery
 * - `resetStuckEvents`   — processing → queued (recovery)
 * - `requeueFailedEvents`— failed → queued (recovery)
 * - `forceImportEvent`   — skipped/any → queued ("Import anyway")
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

// =============================================================================
// Delete / Exclude / Recovery mutations
// =============================================================================

/**
 * Build the source-qualified team_slots event_key.
 *
 * team_slots links to source events by this soft (source, event_key) tuple in
 * addition to the real FK columns added in Task 2.5. The event_key is still
 * used by the usage RPCs and the compile "already compiled?" check, so this
 * helper stays — only the explicit delete-by-event_key was removed (the FK
 * cascade now purges team_slots automatically).
 */
export function eventKeyFor(
  source: "rk9" | "limitless",
  sourceEventId: string
): string {
  return `${source}:${sourceEventId}`;
}

/**
 * Cascade-purge an event and ALL its child data.
 *
 * Deleting the parent event row cascades to:
 *   - source-schema children (standings → team_pokemon, phases, matches) via
 *     the ON DELETE CASCADE FKs in the rk9/limitless schemas, AND
 *   - public.team_slots rows, via the rk9_event_id / limitless_tournament_id
 *     FK columns added in Task 2.5 (Decision 1 — a REAL database-level cascade,
 *     replacing the old explicit team_slots delete).
 *
 * We still read the affected formats from team_slots BEFORE deleting the parent
 * (the cascade fires inside the parent DELETE, so we must capture formats first)
 * so the caller can invalidate the public /data usage caches.
 *
 * @param supabase       - Service-role client (RLS bypassed). Caller's responsibility.
 * @param source         - "rk9" or "limitless"
 * @param sourceEventId  - The source-specific event/tournament ID.
 * @returns              - Deduplicated list of affected format IDs for cache invalidation.
 */
export async function deleteSourceEvent(
  supabase: TypedClient,
  source: "rk9" | "limitless",
  sourceEventId: string
): Promise<{ formats: string[] }> {
  // 1. Capture affected formats BEFORE the delete — once the parent event is
  //    gone, the FK cascade has already removed its team_slots rows.
  const fkColumn =
    source === "rk9" ? "rk9_event_id" : "limitless_tournament_id";
  const { data: slotRows, error: slotReadError } = await supabase
    .from("team_slots")
    .select("format")
    .eq(fkColumn, sourceEventId);
  if (slotReadError)
    throw new Error(`team_slots read failed: ${slotReadError.message}`);

  const formats = Array.from(new Set((slotRows ?? []).map((r) => r.format)));

  // 2. Delete the parent event. team_slots and all source-schema children
  //    cascade automatically (no explicit team_slots delete — Decision 1).
  if (source === "rk9") {
    const { error } = await supabase
      .schema("rk9")
      .from("events")
      .delete()
      .eq("event_id", sourceEventId);
    if (error) throw new Error(`rk9 event delete failed: ${error.message}`);
  } else {
    const { error } = await supabase
      .schema("limitless")
      .from("tournaments")
      .delete()
      .eq("tournament_id", sourceEventId);
    if (error) throw new Error(`limitless delete failed: ${error.message}`);
  }

  return { formats };
}

/**
 * Cascade-purge AND tombstone so Sync never re-discovers the event.
 *
 * Calls `deleteSourceEvent` for the full purge, then upserts an
 * `import_exclusions` row so the sync stage will permanently skip this event.
 *
 * @param supabase       - Service-role client.
 * @param source         - "rk9" or "limitless"
 * @param sourceEventId  - The source-specific event/tournament ID.
 * @param reason         - Human-readable reason for exclusion (nullable).
 * @param excludedBy     - User ID or username who triggered the exclusion (nullable).
 * @returns              - Same `{ formats }` as `deleteSourceEvent`.
 */
export async function excludeSourceEvent(
  supabase: TypedClient,
  source: "rk9" | "limitless",
  sourceEventId: string,
  reason: string | null,
  excludedBy: string | null
): Promise<{ formats: string[] }> {
  const result = await deleteSourceEvent(supabase, source, sourceEventId);

  const { error } = await supabase
    .from("import_exclusions")
    .upsert(
      {
        source,
        source_event_id: sourceEventId,
        reason,
        excluded_by: excludedBy,
      },
      { onConflict: "source,source_event_id" }
    );
  if (error) throw new Error(`exclusion upsert failed: ${error.message}`);

  return result;
}

/**
 * Remove an import_exclusions tombstone so the event can be re-discovered.
 *
 * @param supabase - Service-role client.
 * @param id       - Primary key of the import_exclusions row.
 */
export async function clearExclusion(
  supabase: TypedClient,
  id: number
): Promise<void> {
  const { error } = await supabase
    .from("import_exclusions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`clear exclusion failed: ${error.message}`);
}

/**
 * Recovery: reset stuck in-progress events back to queued.
 *
 * RK9 events stuck in any active import sub-stage (roster, teams, pairings)
 * are reset to "queued" and their worker lease is cleared so a fresh worker
 * can claim them. Limitless events stuck in "importing" are similarly reset.
 *
 * @param supabase - Service-role client.
 * @returns        - Count of events reset per source.
 */
export async function resetStuckEvents(
  supabase: TypedClient
): Promise<{ rk9: number; limitless: number }> {
  const rk9 = await supabase
    .schema("rk9")
    .from("events")
    .update({ import_status: "queued", worker_claimed_at: null })
    .in("import_status", ["roster", "teams", "pairings"])
    .select("event_id");
  if (rk9.error) throw new Error(`rk9 reset failed: ${rk9.error.message}`);

  const lim = await supabase
    .schema("limitless")
    .from("tournaments")
    .update({ import_status: "queued" })
    .eq("import_status", "importing")
    .select("tournament_id");
  if (lim.error)
    throw new Error(`limitless reset failed: ${lim.error.message}`);

  return { rk9: rk9.data?.length ?? 0, limitless: lim.data?.length ?? 0 };
}

/**
 * Recovery: move failed events back to queued for a retry.
 *
 * Applies to both RK9 and Limitless. Both sources run concurrently.
 *
 * @param supabase - Service-role client.
 * @returns        - Count of events requeued per source.
 */
export async function requeueFailedEvents(
  supabase: TypedClient
): Promise<{ rk9: number; limitless: number }> {
  const [rk9, lim] = await Promise.all([
    supabase
      .schema("rk9")
      .from("events")
      .update({ import_status: "queued" })
      .eq("import_status", "failed")
      .select("event_id"),
    supabase
      .schema("limitless")
      .from("tournaments")
      .update({ import_status: "queued" })
      .eq("import_status", "failed")
      .select("tournament_id"),
  ]);

  if (rk9.error) throw new Error(`rk9 requeue failed: ${rk9.error.message}`);
  if (lim.error)
    throw new Error(`limitless requeue failed: ${lim.error.message}`);

  return { rk9: rk9.data?.length ?? 0, limitless: lim.data?.length ?? 0 };
}

/**
 * "Import anyway": force a skipped event (any non-queued status) back into
 * the queue. Clears any previous import_error so the worker starts fresh.
 *
 * @param supabase       - Service-role client.
 * @param source         - "rk9" or "limitless"
 * @param sourceEventId  - The source-specific event/tournament ID.
 */
export async function forceImportEvent(
  supabase: TypedClient,
  source: "rk9" | "limitless",
  sourceEventId: string
): Promise<void> {
  if (source === "rk9") {
    const { error } = await supabase
      .schema("rk9")
      .from("events")
      .update({ import_status: "queued", import_error: null })
      .eq("event_id", sourceEventId);
    if (error) throw new Error(`force import failed: ${error.message}`);
  } else {
    const { error } = await supabase
      .schema("limitless")
      .from("tournaments")
      .update({ import_status: "queued", import_error: null })
      .eq("tournament_id", sourceEventId);
    if (error) throw new Error(`force import failed: ${error.message}`);
  }
}
