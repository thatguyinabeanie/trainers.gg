/**
 * Import pipeline recovery + admin mutations.
 *
 * Pure-database operations for the import pipeline's recovery/admin verbs
 * (delete, exclude, clear exclusion, reset stuck, requeue failed, force import)
 * plus the `eventKeyFor` helper. Split out of `pipeline.ts` so web server
 * actions and Jest consumers can import these WITHOUT pulling in the scraper
 * graph (cheerio, @pkmn/sim) that pipeline.ts's stage runners depend on.
 */

import { type TypedClient } from "../client";

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

  const { error } = await supabase.from("import_exclusions").upsert(
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
