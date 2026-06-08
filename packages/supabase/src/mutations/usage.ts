/**
 * DB I/O for computing and persisting per-event Pokemon usage statistics
 * and time-bucketed rollups.
 *
 * WHY this module exists: Three data sources (RK9, Limitless, first-party
 * tournament_team_sheets) all feed the same event_usage table via the same
 * aggregation logic, but each source has a different DB schema for its
 * event/team data. This module owns the source-specific branching and all
 * Supabase interaction; the pure math lives in usage/aggregate.ts and
 * usage/rollup.ts where it is unit-testable without any DB dependency.
 *
 * REPLACE strategy: per-event facts are immutable once the raw data is
 * committed, so recomputing via DELETE + bulk-INSERT is safe and correct.
 * It handles re-runs, corrected imports, and partial-data situations without
 * drift between the raw source tables and the aggregated fact store.
 *
 * ROLLUP STRATEGY: computeUsageRollups is driven by usage_dirty flags.
 * When any source marks a format dirty, we recompute all time-period buckets
 * from dirty_since forward — replacing (not appending) each affected
 * format_meta_stats row and its children. The combined 'all' source is always
 * recomputed whenever any concrete source for a format is dirty, so the
 * combined view stays consistent. Deltas (7d / 30d change) are computed by
 * looking up the prior bucket's usagePct for each species.
 *
 * Only called with a service-role client (caller's responsibility, Phase 3).
 */

import { type TypedClient } from "../client";
import { type Json } from "../types";
import { aggregateEventUsage, type TeamMonInput } from "../usage/aggregate";
import {
  bucketStart,
  bucketEnd,
  rollupBucket,
  computeDelta,
  type PeriodType,
  type FactRow,
} from "../usage/rollup";

// =============================================================================
// Public API
// =============================================================================

/** Which data source triggered this compute run. */
export type UsageSource = "rk9" | "limitless" | "first_party";

/**
 * Recompute event_usage rows for one imported event from one source.
 *
 * Steps:
 * 1. Resolve format + event_date from the source's event/tournament table.
 * 2. Read team pokemon rows (join standings ↔ team_pokemon for rk9/limitless;
 *    read tournament_team_sheets for first_party).
 * 3. Map into TeamMonInput[] and call aggregateEventUsage().
 * 4. Replace: DELETE existing rows for (source, event_key), then bulk-INSERT.
 * 5. Upsert usage_dirty with the minimum dirty_since date.
 *
 * @param supabase - Service-role Supabase client (bypasses RLS for writes).
 * @param source   - Which pipeline produced this event.
 * @param eventId  - Native event ID in the source's schema.
 * @returns rowCount — number of event_usage rows written.
 */
export async function computeEventUsage(
  supabase: TypedClient,
  source: UsageSource,
  eventId: string
): Promise<{ rowCount: number }> {
  const eventKey = `${source}:${eventId}`;

  // ---------------------------------------------------------------------------
  // Step 1: Resolve format + event_date
  // ---------------------------------------------------------------------------
  const { format, eventDate } = await resolveEventMeta(
    supabase,
    source,
    eventId
  );

  // ---------------------------------------------------------------------------
  // Step 2: Read team rows and map to TeamMonInput[]
  // ---------------------------------------------------------------------------
  const mons = await readTeamMons(supabase, source, eventId);

  // ---------------------------------------------------------------------------
  // Step 3: Aggregate
  // ---------------------------------------------------------------------------
  const rows = aggregateEventUsage(mons);

  // ---------------------------------------------------------------------------
  // Step 4: Replace (DELETE + bulk INSERT)
  // NOTE: Could not use .upsert() here because the unique index on event_usage
  // uses a COALESCE expression (COALESCE(division, '')) which PostgREST cannot
  // reference in an onConflict target without schema changes. The delete+insert
  // pattern is intentional; if insert fails after delete, the next retry will
  // re-compute and re-insert cleanly.
  // ---------------------------------------------------------------------------
  const { error: deleteError } = await supabase
    .from("event_usage")
    .delete()
    .eq("source", source)
    .eq("event_key", eventKey);

  if (deleteError) {
    throw new Error(
      `computeEventUsage: failed to delete existing rows for ${eventKey}: ${deleteError.message}`
    );
  }

  if (rows.length > 0) {
    const inserts = rows.map((r) => ({
      source,
      event_key: eventKey,
      format,
      division: r.division,
      event_date: eventDate,
      species: r.species,
      team_count: r.teamCount,
      total_teams: r.sampleSize,
      details: r.details as unknown as Json,
    }));

    const { error: insertError } = await supabase
      .from("event_usage")
      .insert(inserts);

    if (insertError) {
      throw new Error(
        `computeEventUsage: failed to insert rows for ${eventKey}: ${insertError.message}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Step 5: Upsert usage_dirty (dirty_since = min(existing, eventDate))
  // ---------------------------------------------------------------------------
  await upsertUsageDirty(supabase, format, source, eventDate);

  return { rowCount: rows.length };
}

// =============================================================================
// computeSourceUsage — per-source batch event computation
// =============================================================================

/**
 * Compute per-event usage facts for every NOT-YET-COMPUTED event of a source,
 * then return the distinct formats those new events touched so the caller can
 * scope a rollup to just those formats.
 *
 * "New" = an imported event (with team data) that has no event_usage rows yet.
 * Already-computed events are skipped (efficiency — we never redo work).
 * computeEventUsage uses replace semantics, so a one-off re-run is still safe.
 *
 * Best-effort per event: a single failing event is logged and skipped; the
 * rest still compute. Only rk9 and limitless are supported (first-party stays
 * auto-computed in its tournament flow).
 *
 * @param supabase Service-role Supabase client (bypasses RLS).
 * @param source   Which third-party source to process.
 * @returns eventsComputed — number of newly computed events;
 *          formats        — distinct format IDs those events belong to.
 */
export async function computeSourceUsage(
  supabase: TypedClient,
  source: "rk9" | "limitless"
): Promise<{ eventsComputed: number; formats: string[] }> {
  // ─── Step 1: List candidate events with team data + their format ──────────
  type Candidate = { id: string; format: string };

  let candidates: Candidate[];

  const CANDIDATE_PAGE_SIZE = 500;

  if (source === "rk9") {
    const allEvents: Array<{ event_id: string; format_id: string }> = [];
    let offset = 0;
    while (true) {
      const { data: page, error: pageErr } = await supabase
        .schema("rk9")
        .from("events")
        .select("event_id, format_id")
        .gt("teams_imported_count", 0)
        .not("format_id", "is", null)
        .range(offset, offset + CANDIDATE_PAGE_SIZE - 1);

      if (pageErr) {
        throw new Error(
          `computeSourceUsage[rk9]: failed to fetch events: ${pageErr.message}`
        );
      }
      if (!page || page.length === 0) break;
      allEvents.push(
        ...page.map((e) => ({
          event_id: String(e.event_id),
          // format_id is non-null due to .not("format_id", "is", null) filter above
          format_id: e.format_id as string,
        }))
      );
      if (page.length < CANDIDATE_PAGE_SIZE) break;
      offset += CANDIDATE_PAGE_SIZE;
    }

    candidates = allEvents.map((row) => ({
      id: row.event_id,
      format: row.format_id,
    }));
  } else {
    // limitless
    const allTournaments: Array<{ tournament_id: string; format_id: string }> =
      [];
    let offset = 0;
    while (true) {
      const { data: page, error: pageErr } = await supabase
        .schema("limitless")
        .from("tournaments")
        .select("tournament_id, format_id")
        .not("data_imported_at", "is", null)
        .not("format_id", "is", null)
        .range(offset, offset + CANDIDATE_PAGE_SIZE - 1);

      if (pageErr) {
        throw new Error(
          `computeSourceUsage[limitless]: failed to fetch tournaments: ${pageErr.message}`
        );
      }
      if (!page || page.length === 0) break;
      allTournaments.push(
        ...page.map((t) => ({
          tournament_id: String(t.tournament_id),
          // format_id is non-null due to .not("format_id", "is", null) filter above
          format_id: t.format_id as string,
        }))
      );
      if (page.length < CANDIDATE_PAGE_SIZE) break;
      offset += CANDIDATE_PAGE_SIZE;
    }

    candidates = allTournaments.map((row) => ({
      id: row.tournament_id,
      format: row.format_id,
    }));
  }

  if (candidates.length === 0) {
    return { eventsComputed: 0, formats: [] };
  }

  // ─── Step 2: Find which candidates are already computed ───────────────────
  // Paginate event_usage by source to collect all existing event_keys.
  // This guards against the PostgREST default 1000-row cap: a single source
  // can have far more than 1000 event_usage rows (many rows per event), so
  // we page through in chunks of 1000 until a page returns fewer than 1000.
  const PAGE_SIZE = 1000;
  const existingKeys = new Set<string>();
  let from = 0;

  for (;;) {
    const { data: page, error: pageError } = await supabase
      .from("event_usage")
      .select("event_key")
      .eq("source", source)
      .range(from, from + PAGE_SIZE - 1);

    if (pageError) {
      throw new Error(
        `computeSourceUsage[${source}]: failed to read existing event_usage keys (range ${from}-${from + PAGE_SIZE - 1}): ${pageError.message}`
      );
    }

    const rows = page ?? [];
    for (const row of rows) {
      existingKeys.add(row.event_key);
    }

    if (rows.length < PAGE_SIZE) {
      // Last page — no more rows to fetch
      break;
    }

    from += PAGE_SIZE;
  }

  // ─── Step 3: Compute the new ones, accumulate touched formats ────────────
  let eventsComputed = 0;
  const touchedFormats = new Set<string>();

  for (const candidate of candidates) {
    const eventKey = `${source}:${candidate.id}`;

    if (existingKeys.has(eventKey)) {
      // Already computed — skip
      continue;
    }

    try {
      await computeEventUsage(supabase, source, candidate.id);
      eventsComputed++;
      touchedFormats.add(candidate.format);
    } catch (e) {
      // Best-effort: log and continue so one bad event doesn't abort the batch.
      // Keep the dynamic (DB-derived) values out of the first console arg —
      // a tainted format string trips CodeQL js/tainted-format-string.
      console.error(
        "computeSourceUsage: failed to compute event — skipping",
        { source, eventId: candidate.id },
        e
      );
    }
  }

  return { eventsComputed, formats: Array.from(touchedFormats) };
}

// =============================================================================
// Private helpers
// =============================================================================

interface EventMeta {
  format: string;
  eventDate: string; // ISO date string 'YYYY-MM-DD'
}

/**
 * Resolve the canonical format id and event date for a source event.
 * Throws a descriptive error if the event is not found.
 */
async function resolveEventMeta(
  supabase: TypedClient,
  source: UsageSource,
  eventId: string
): Promise<EventMeta> {
  switch (source) {
    case "rk9": {
      const { data, error } = await supabase
        .schema("rk9")
        .from("events")
        .select("format_id, date_start")
        .eq("event_id", eventId)
        .maybeSingle();

      if (error) {
        throw new Error(
          `computeEventUsage[rk9]: failed to fetch event ${eventId}: ${error.message}`
        );
      }
      if (!data) {
        throw new Error(
          `computeEventUsage[rk9]: event ${eventId} not found in rk9.events`
        );
      }
      if (!data.format_id) {
        throw new Error(
          `computeEventUsage[rk9]: event ${eventId} has no format_id — cannot compute usage`
        );
      }
      return { format: data.format_id, eventDate: data.date_start };
    }

    case "limitless": {
      const { data, error } = await supabase
        .schema("limitless")
        .from("tournaments")
        .select("format_id, date")
        .eq("tournament_id", eventId)
        .maybeSingle();

      if (error) {
        throw new Error(
          `computeEventUsage[limitless]: failed to fetch tournament ${eventId}: ${error.message}`
        );
      }
      if (!data) {
        throw new Error(
          `computeEventUsage[limitless]: tournament ${eventId} not found in limitless.tournaments`
        );
      }
      if (!data.format_id) {
        throw new Error(
          `computeEventUsage[limitless]: tournament ${eventId} has no format_id — cannot compute usage`
        );
      }
      return { format: data.format_id, eventDate: data.date };
    }

    case "first_party": {
      if (!Number.isFinite(Number(eventId))) {
        throw new Error(
          `computeEventUsage[first_party]: eventId must be a numeric tournament id, got "${eventId}"`
        );
      }
      // tournament_team_sheets.format is on each row; get it + the tournament start_date
      // via the first sheet row for this tournament.
      // tournaments.start_date is a timestamptz — cast to date string.
      const { data, error } = await supabase
        .from("tournament_team_sheets")
        .select(
          "format, tournaments!tournament_team_sheets_tournament_id_fkey(start_date)"
        )
        .eq("tournament_id", Number(eventId))
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(
          `computeEventUsage[first_party]: failed to fetch team sheets for tournament ${eventId}: ${error.message}`
        );
      }
      if (!data) {
        throw new Error(
          `computeEventUsage[first_party]: no team sheets found for tournament ${eventId}`
        );
      }

      // tournaments join returns an array or object depending on relationship cardinality
      const tournament = Array.isArray(data.tournaments)
        ? data.tournaments[0]
        : data.tournaments;

      if (!tournament?.start_date) {
        throw new Error(
          `computeEventUsage[first_party]: tournament ${eventId} has no start_date`
        );
      }

      // start_date is a timestamptz — take only the date portion
      const eventDate = tournament.start_date.slice(0, 10);
      return { format: data.format, eventDate };
    }
  }
}

// ---------------------------------------------------------------------------
// Row shapes returned by source-specific reads
// ---------------------------------------------------------------------------

interface RawTeamRow {
  teamKey: string;
  division: string | null;
  species: string;
  ability: string | null;
  heldItem: string | null;
  nature: string | null;
  teraType: string | null;
  moves: string[] | null;
}

/**
 * Read all team pokemon rows for an event and map them to TeamMonInput[].
 */
async function readTeamMons(
  supabase: TypedClient,
  source: UsageSource,
  eventId: string
): Promise<TeamMonInput[]> {
  const raw = await readRawTeamRows(supabase, source, eventId);
  return raw.map((r) => ({
    teamKey: r.teamKey,
    division: r.division,
    species: r.species,
    ability: r.ability,
    heldItem: r.heldItem,
    nature: r.nature,
    teraType: r.teraType,
    moves: (r.moves ?? []).filter((m): m is string => m != null && m !== ""),
  }));
}

async function readRawTeamRows(
  supabase: TypedClient,
  source: UsageSource,
  eventId: string
): Promise<RawTeamRow[]> {
  switch (source) {
    case "rk9": {
      // Join rk9.standings → rk9.team_pokemon for the event
      const { data, error } = await supabase
        .schema("rk9")
        .from("team_pokemon")
        .select(
          "standing_id, species, ability, held_item, tera_type, moves, stat_alignment, standings!inner(id, division, event_id)"
        )
        .eq("standings.event_id", eventId)
        // Exclude illegal team-sheet entries (flagged at import time) from
        // usage stats. The underlying rows are kept in the table — we only
        // filter them out of the computed meta.
        .eq("is_legal", true);

      if (error) {
        throw new Error(
          `computeEventUsage[rk9]: failed to read team_pokemon for event ${eventId}: ${error.message}`
        );
      }

      return (data ?? []).map((row) => {
        const standing = Array.isArray(row.standings)
          ? row.standings[0]
          : row.standings;
        return {
          teamKey: String(row.standing_id),
          division: standing?.division ?? null,
          species: row.species,
          ability: row.ability,
          heldItem: row.held_item,
          // stat_alignment is RK9's nature field (Champions M-A only; null for older events)
          nature: row.stat_alignment ?? null,
          teraType: row.tera_type,
          moves: row.moves ?? [],
        };
      });
    }

    case "limitless": {
      // Join limitless.standings → limitless.team_pokemon for the tournament
      const { data, error } = await supabase
        .schema("limitless")
        .from("team_pokemon")
        .select(
          "standing_id, species, ability, held_item, tera_type, moves, standings!inner(id, tournament_id)"
        )
        .eq("standings.tournament_id", eventId);

      if (error) {
        throw new Error(
          `computeEventUsage[limitless]: failed to read team_pokemon for tournament ${eventId}: ${error.message}`
        );
      }

      return (data ?? []).map((row) => ({
        teamKey: String(row.standing_id),
        division: null, // Limitless has no age divisions
        species: row.species,
        ability: row.ability,
        heldItem: row.held_item,
        nature: null, // limitless.team_pokemon has no nature column
        teraType: row.tera_type,
        moves: row.moves ?? [],
      }));
    }

    case "first_party": {
      if (!Number.isFinite(Number(eventId))) {
        throw new Error(
          `computeEventUsage[first_party]: eventId must be a numeric tournament id, got "${eventId}"`
        );
      }
      // tournament_team_sheets — one row per Pokemon slot per registration.
      // move1..move4 columns instead of a moves[] array.
      // nature is populated only for Champions formats (null for standard VGC — privacy).
      const { data, error } = await supabase
        .from("tournament_team_sheets")
        .select(
          "registration_id, species, ability, held_item, tera_type, move1, move2, move3, move4, nature"
        )
        .eq("tournament_id", Number(eventId));

      if (error) {
        throw new Error(
          `computeEventUsage[first_party]: failed to read team sheets for tournament ${eventId}: ${error.message}`
        );
      }

      return (data ?? []).map((row) => ({
        teamKey: String(row.registration_id),
        division: null, // first-party has no age divisions
        species: row.species,
        ability: row.ability,
        heldItem: row.held_item,
        // nature is non-null only for Champions formats; null for standard VGC (kept private)
        nature: row.nature ?? null,
        teraType: row.tera_type,
        moves: [row.move1, row.move2, row.move3, row.move4].filter(
          (m): m is string => m != null && m !== ""
        ),
      }));
    }
  }
}

/**
 * Upsert a usage_dirty row: set dirty_since = min(existing dirty_since, newDate).
 *
 * WHY min(): The worker recomputes all periods from dirty_since forward.
 * If an older event is re-imported, we push dirty_since back so earlier
 * periods get re-rolled up — critical for accuracy.
 */
async function upsertUsageDirty(
  supabase: TypedClient,
  format: string,
  source: UsageSource,
  newDate: string
): Promise<void> {
  // Read the existing row (if any) to determine the correct dirty_since.
  const { data: existing, error: readError } = await supabase
    .from("usage_dirty")
    .select("dirty_since")
    .eq("format", format)
    .eq("source", source)
    .maybeSingle();

  if (readError) {
    throw new Error(
      `computeEventUsage: failed to read usage_dirty for ${format}/${source}: ${readError.message}`
    );
  }

  // Use the earlier of the existing dirty_since and the new event date.
  const dirtySince =
    existing?.dirty_since != null && existing.dirty_since < newDate
      ? existing.dirty_since
      : newDate;

  const { error: upsertError } = await supabase.from("usage_dirty").upsert(
    {
      format,
      source,
      dirty_since: dirtySince,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "format,source" }
  );

  if (upsertError) {
    throw new Error(
      `computeEventUsage: failed to upsert usage_dirty for ${format}/${source}: ${upsertError.message}`
    );
  }
}

// =============================================================================
// computeUsageRollups — time-bucketed rollup orchestration
// =============================================================================

/** All period types that rollups are computed for. */
const PERIOD_TYPES: PeriodType[] = ["day", "week", "month"];

/**
 * Recompute time-bucketed usage rollups for all dirty formats.
 *
 * WHY dirty-flag-driven: Rather than recomputing everything on every run,
 * we track which formats have changed (via usage_dirty) and only recompute
 * buckets from the earliest dirty date forward. This keeps the job fast
 * even as the data set grows.
 *
 * WHY 'all' is always recomputed with concrete sources: The combined source
 * must stay consistent with its constituent parts. If rk9 dirties a format,
 * the 'all' rollup for that format may now be stale, so we always include
 * 'all' in the recompute set.
 *
 * WHY replace semantics: Each bucket is DELETE-children + DELETE-meta +
 * INSERT-fresh. This is safe because the raw event_usage facts are
 * authoritative; the rollup tables are derived views. Incremental updates
 * would accumulate drift; a clean replace is always accurate.
 *
 * @param supabase Service-role Supabase client (bypasses RLS).
 * @param opts.formats Optional list of format IDs to scope the rollup to.
 *   When provided and non-empty, only dirty rows for those formats are read
 *   and recomputed; all other dirty formats are left untouched. Omit (or
 *   pass an empty array) to recompute all dirty formats as usual.
 * @returns formatsProcessed — number of formats that had dirty rows;
 *          bucketsWritten  — total (format, source, period, bucket) rows written.
 */
export async function computeUsageRollups(
  supabase: TypedClient,
  opts?: { formats?: string[] }
): Promise<{ formatsProcessed: number; bucketsWritten: number }> {
  // ─── Step 1: Read usage_dirty rows (scoped to formats when provided) ──────
  let dirtyQuery = supabase
    .from("usage_dirty")
    .select("format, source, dirty_since, updated_at");

  if (opts?.formats && opts.formats.length > 0) {
    dirtyQuery = dirtyQuery.in("format", opts.formats);
  }

  const { data: dirtyRows, error: dirtyReadError } = await dirtyQuery;

  if (dirtyReadError) {
    throw new Error(
      `computeUsageRollups: failed to read usage_dirty: ${dirtyReadError.message}`
    );
  }

  if (!dirtyRows || dirtyRows.length === 0) {
    return { formatsProcessed: 0, bucketsWritten: 0 };
  }

  // ─── Step 2: Group dirty rows by format ───────────────────────────────────
  // Map<format, { sources: Set<UsageSource>, dirtySince: string, capturedUpdatedAt: Map<UsageSource, string> }>
  const byFormat = new Map<
    string,
    {
      dirtySources: Set<string>;
      dirtySince: string;
      capturedUpdatedAt: Map<string, string>;
    }
  >();

  for (const row of dirtyRows) {
    const existing = byFormat.get(row.format);
    if (!existing) {
      byFormat.set(row.format, {
        dirtySources: new Set([row.source]),
        dirtySince: row.dirty_since,
        capturedUpdatedAt: new Map([[row.source, row.updated_at]]),
      });
    } else {
      existing.dirtySources.add(row.source);
      // Track minimum dirty_since across sources for this format
      if (row.dirty_since < existing.dirtySince) {
        existing.dirtySince = row.dirty_since;
      }
      existing.capturedUpdatedAt.set(row.source, row.updated_at);
    }
  }

  let bucketsWritten = 0;

  // ─── Step 3: For each dirty format, recompute rollups ─────────────────────
  for (const [format, { dirtySources, dirtySince }] of byFormat) {
    // Sources to recompute: all dirty concrete sources + 'all'
    const sourcesToRecompute = new Set([...dirtySources, "all"]);

    for (const source of sourcesToRecompute) {
      for (const periodType of PERIOD_TYPES) {
        // Step 3a: Read event_usage rows for this format from dirtySince forward
        const dirtyBucketStart = bucketStart(dirtySince, periodType);

        // For 'all', read all sources; for concrete sources, filter by source
        let query = supabase
          .from("event_usage")
          .select(
            "source, event_key, division, species, team_count, total_teams, details, event_date"
          )
          .eq("format", format)
          .gte("event_date", dirtyBucketStart);

        if (source !== "all") {
          query = query.eq("source", source);
        }

        const { data: eventUsageRows, error: euReadError } = await query;

        if (euReadError) {
          throw new Error(
            `computeUsageRollups: failed to read event_usage for ${format}/${source}/${periodType}: ${euReadError.message}`
          );
        }

        if (!eventUsageRows || eventUsageRows.length === 0) {
          continue;
        }

        // Map event_usage DB rows to FactRow[] + keep event_date for bucketing.
        // We pair each FactRow with its event_date so we can bucket correctly
        // without needing a secondary lookup.
        const factsWithDate: { fact: FactRow; eventDate: string }[] =
          eventUsageRows.map((r) => {
            const details = r.details as {
              moves?: { v: string; n: number }[];
              tera?: { v: string; n: number }[];
              item?: { v: string; n: number }[];
              ability?: { v: string; n: number }[];
              nature?: { v: string; n: number }[];
              abilityItem?: { v: string; n: number }[];
            } | null;
            return {
              fact: {
                source: r.source,
                eventKey: r.event_key,
                division: r.division,
                species: r.species,
                teamCount: r.team_count,
                sampleSize: r.total_teams,
                details: {
                  moves: details?.moves ?? [],
                  tera: details?.tera ?? [],
                  item: details?.item ?? [],
                  ability: details?.ability ?? [],
                  nature: details?.nature ?? [],
                  abilityItem: details?.abilityItem ?? [],
                },
              },
              eventDate: r.event_date,
            };
          });

        // Step 3b: Group facts by bucket start date (derived from event_date)
        const factsByBucket = new Map<string, FactRow[]>();
        for (const { fact, eventDate } of factsWithDate) {
          const bStart = bucketStart(eventDate, periodType);
          if (!factsByBucket.has(bStart)) factsByBucket.set(bStart, []);
          factsByBucket.get(bStart)!.push(fact);
        }

        // Step 3c & 3d: For each bucket, compute rollup, look up deltas, write to DB
        // Sort bucket starts ascending so prior-bucket lookups see already-written data.
        for (const bStart of Array.from(factsByBucket.keys()).sort()) {
          const bucketFacts = factsByBucket.get(bStart)!;
          const rollup = rollupBucket(bucketFacts);
          const bEnd = bucketEnd(bStart, periodType);

          // Compute prior-bucket dates for deltas
          const prior7dStart = bucketStart(subtractDays(bStart, 7), periodType);
          const prior30dStart = bucketStart(
            subtractDays(bStart, 30),
            periodType
          );

          // Build a map of species → usagePct for each prior bucket.
          // We may have already computed the prior bucket in this run (if it
          // falls within the dirty range), so first check if we have a
          // format_meta_stats row for it; if so, read its pokemon_usage_stats.
          const prior7dPctBySpecies = await getPriorPctMap(
            supabase,
            format,
            source,
            periodType,
            prior7dStart
          );
          const prior30dPctBySpecies = await getPriorPctMap(
            supabase,
            format,
            source,
            periodType,
            prior30dStart
          );

          // Step 3d: Replace-write the bucket
          // Delete existing children + meta row (explicit, no cascade)
          const { data: existingMeta, error: metaReadError } = await supabase
            .from("format_meta_stats")
            .select("id")
            .eq("format", format)
            .eq("source", source)
            .eq("period_type", periodType)
            .eq("period_start", bStart)
            .maybeSingle();

          if (metaReadError) {
            throw new Error(
              `computeUsageRollups: failed to read format_meta_stats for ${format}/${source}/${periodType}/${bStart}: ${metaReadError.message}`
            );
          }

          if (existingMeta) {
            // Delete children explicitly (no CASCADE on FK by design)
            const { error: delUsageErr } = await supabase
              .from("pokemon_usage_stats")
              .delete()
              .eq("meta_id", existingMeta.id);
            if (delUsageErr) {
              throw new Error(
                `computeUsageRollups: failed to delete pokemon_usage_stats for meta_id=${existingMeta.id}: ${delUsageErr.message}`
              );
            }

            const { error: delDetailErr } = await supabase
              .from("pokemon_detail_stats")
              .delete()
              .eq("meta_id", existingMeta.id);
            if (delDetailErr) {
              throw new Error(
                `computeUsageRollups: failed to delete pokemon_detail_stats for meta_id=${existingMeta.id}: ${delDetailErr.message}`
              );
            }

            const { error: delMetaErr } = await supabase
              .from("format_meta_stats")
              .delete()
              .eq("id", existingMeta.id);
            if (delMetaErr) {
              throw new Error(
                `computeUsageRollups: failed to delete format_meta_stats id=${existingMeta.id}: ${delMetaErr.message}`
              );
            }
          }

          // Insert fresh meta row
          const { data: newMeta, error: metaInsertErr } = await supabase
            .from("format_meta_stats")
            .insert({
              format,
              source,
              period_type: periodType,
              period_start: bStart,
              period_end: bEnd,
              total_teams: rollup.totalTeams,
              total_tournaments: rollup.totalTournaments,
              computed_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (metaInsertErr || !newMeta) {
            throw new Error(
              `computeUsageRollups: failed to insert format_meta_stats for ${format}/${source}/${periodType}/${bStart}: ${metaInsertErr?.message ?? "no id returned"}`
            );
          }

          const metaId = newMeta.id;

          if (rollup.species.length > 0) {
            // Bulk-insert pokemon_usage_stats
            const usageInserts = rollup.species.map((s) => ({
              meta_id: metaId,
              species: s.species,
              usage_pct: s.usagePct,
              rank: s.rank,
              sample_size: rollup.totalTeams,
              usage_change_7d: computeDelta(
                s.usagePct,
                prior7dPctBySpecies.get(s.species) ?? null
              ),
              usage_change_30d: computeDelta(
                s.usagePct,
                prior30dPctBySpecies.get(s.species) ?? null
              ),
              // Remaining columns left null — populated in later phases
              usage_pct_top_cut: null,
              usage_pct_top8: null,
              conversion_rate: null,
            }));

            const { error: usageInsertErr } = await supabase
              .from("pokemon_usage_stats")
              .insert(usageInserts);

            if (usageInsertErr) {
              throw new Error(
                `computeUsageRollups: failed to insert pokemon_usage_stats for meta_id=${metaId}: ${usageInsertErr.message}`
              );
            }

            // Bulk-insert pokemon_detail_stats
            const detailInserts = rollup.species.map((s) => ({
              meta_id: metaId,
              species: s.species,
              moves: s.moves as unknown as Json,
              tera_types: s.tera as unknown as Json,
              items: s.item as unknown as Json,
              abilities: s.ability as unknown as Json,
              natures: s.nature as unknown as Json,
              ability_items: s.abilityItems as unknown as Json,
              // spreads, teammates left as default []
            }));

            const { error: detailInsertErr } = await supabase
              .from("pokemon_detail_stats")
              .insert(detailInserts);

            if (detailInsertErr) {
              throw new Error(
                `computeUsageRollups: failed to insert pokemon_detail_stats for meta_id=${metaId}: ${detailInsertErr.message}`
              );
            }
          }

          bucketsWritten++;
        }
      }
    }
  }

  // ─── Step 4: Delete processed usage_dirty rows (optimistic concurrency) ───
  // Delete WHERE format + source match AND updated_at equals the captured value.
  // A concurrent re-dirty with a newer updated_at will survive for the next run.
  for (const [format, { dirtySources, capturedUpdatedAt }] of byFormat) {
    for (const source of dirtySources) {
      const capturedAt = capturedUpdatedAt.get(source);
      if (!capturedAt) continue;

      const { error: deleteErr } = await supabase
        .from("usage_dirty")
        .delete()
        .eq("format", format)
        .eq("source", source)
        .eq("updated_at", capturedAt);

      if (deleteErr) {
        throw new Error(
          `computeUsageRollups: failed to delete usage_dirty for ${format}/${source}: ${deleteErr.message}`
        );
      }
    }
  }

  return { formatsProcessed: byFormat.size, bucketsWritten };
}

// =============================================================================
// computeUsageRollups private helpers
// =============================================================================

/**
 * Subtract N days from an ISO date string 'YYYY-MM-DD'. UTC-safe.
 */
function subtractDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${String(y)}-${m}-${day}`;
}

/**
 * Read a map of species → usagePct from an existing rollup bucket.
 * Used for delta (7d / 30d change) calculations.
 *
 * Returns an empty map if no rollup exists for the given parameters.
 */
async function getPriorPctMap(
  supabase: TypedClient,
  format: string,
  source: string,
  periodType: PeriodType,
  periodStart: string
): Promise<Map<string, number>> {
  const { data: meta, error: metaErr } = await supabase
    .from("format_meta_stats")
    .select("id")
    .eq("format", format)
    .eq("source", source)
    .eq("period_type", periodType)
    .eq("period_start", periodStart)
    .maybeSingle();

  if (metaErr) {
    console.error(
      `getPriorPctMap: failed to read format_meta_stats for ${format}/${source}/${periodType}/${periodStart}: ${metaErr.message}`
    );
    return new Map();
  }

  if (!meta) return new Map();

  const { data: stats, error: statsErr } = await supabase
    .from("pokemon_usage_stats")
    .select("species, usage_pct")
    .eq("meta_id", meta.id);

  if (statsErr) {
    console.error(
      `getPriorPctMap: failed to read pokemon_usage_stats for meta ${meta.id}: ${statsErr.message}`
    );
    return new Map();
  }
  if (!stats) return new Map();

  const map = new Map<string, number>();
  for (const row of stats) {
    map.set(row.species, Number(row.usage_pct));
  }
  return map;
}
