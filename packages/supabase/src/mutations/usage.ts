/**
 * DB I/O for computing and persisting per-event Pokemon usage statistics.
 *
 * WHY this module exists: Three data sources (RK9, Limitless, first-party
 * tournament_team_sheets) all feed the same event_usage table via the same
 * aggregation logic, but each source has a different DB schema for its
 * event/team data. This module owns the source-specific branching and all
 * Supabase interaction; the pure math lives in usage/aggregate.ts where it
 * is unit-testable without any DB dependency.
 *
 * REPLACE strategy: per-event facts are immutable once the raw data is
 * committed, so recomputing via DELETE + bulk-INSERT is safe and correct.
 * It handles re-runs, corrected imports, and partial-data situations without
 * drift between the raw source tables and the aggregated fact store.
 *
 * Only called with a service-role client (caller's responsibility, Phase 3).
 */

import { type TypedClient } from "../client";
import { type Json } from "../types";
import { aggregateEventUsage, type TeamMonInput } from "../usage/aggregate";

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
  const { format, eventDate } = await resolveEventMeta(supabase, source, eventId);

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
      sample_size: r.sampleSize,
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
      return { format: data.format_id, eventDate: data.date };
    }

    case "first_party": {
      // tournament_team_sheets.format is on each row; get it + the tournament start_date
      // via the first sheet row for this tournament.
      // tournaments.start_date is a timestamptz — cast to date string.
      const { data, error } = await supabase
        .from("tournament_team_sheets")
        .select("format, tournaments!tournament_team_sheets_tournament_id_fkey(start_date)")
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
    heldItem: r.heldItem,
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
          "standing_id, species, ability, held_item, tera_type, moves, standings!inner(id, division, event_id)"
        )
        .eq("standings.event_id", eventId);

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
        teraType: row.tera_type,
        moves: row.moves ?? [],
      }));
    }

    case "first_party": {
      // tournament_team_sheets — one row per Pokemon slot per registration
      // move1..move4 columns instead of a moves[] array
      const { data, error } = await supabase
        .from("tournament_team_sheets")
        .select(
          "registration_id, species, ability, held_item, tera_type, move1, move2, move3, move4"
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

  const { error: upsertError } = await supabase
    .from("usage_dirty")
    .upsert(
      { format, source, dirty_since: dirtySince, updated_at: new Date().toISOString() },
      { onConflict: "format,source" }
    );

  if (upsertError) {
    throw new Error(
      `computeEventUsage: failed to upsert usage_dirty for ${format}/${source}: ${upsertError.message}`
    );
  }
}
