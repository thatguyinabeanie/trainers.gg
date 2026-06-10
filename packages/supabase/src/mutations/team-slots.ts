/**
 * DB I/O for compiling and persisting per-event Pokemon slot facts into the
 * team_slots fact table.
 *
 * WHY this module exists: Three data sources (RK9, Limitless, trainers.gg
 * tournament_team_sheets) all feed the same team_slots table via the same
 * compilation logic, but each source has a different DB schema for its
 * event/team data. This module owns the source-specific branching and all
 * Supabase interaction; the pure mapping logic lives in usage/compile.ts
 * where it is unit-testable without any DB dependency.
 *
 * REPLACE strategy: per-event facts are immutable once the raw data is
 * committed, so recomputing via DELETE + bulk-INSERT is safe and correct.
 * It handles re-runs, corrected imports, and partial-data situations without
 * drift between the raw source tables and the compiled fact store.
 *
 * PAGINATION: every source read uses .range() loops (page size 1000) to
 * avoid the PostgREST default 1000-row response cap. RK9 regionals can
 * exceed this limit (6 slots × hundreds of players × multiple divisions).
 *
 * Only called with a service-role client (caller's responsibility).
 */

import { type TypedClient } from "../client";
import { type TablesInsert } from "../types";
import {
  buildTeamSlotRows,
  type EventMeta,
  type RawSlotRow,
  type TeamSlotRow,
  type TeamSlotSource,
} from "../usage/compile";

// =============================================================================
// Public API
// =============================================================================

/**
 * Compile team_slots rows for one imported event from one source.
 *
 * Steps:
 * 1. Resolve EventMeta from the source's event/tournament table.
 * 2. Read raw slot rows (with standings/players joins) in paginated batches.
 * 3. Map into TeamSlotRow[] via buildTeamSlotRows().
 * 4. Replace: DELETE existing rows for (source, event_key), then bulk-INSERT
 *    in 500-row chunks.
 *
 * @param supabase - Service-role Supabase client (bypasses RLS for writes).
 * @param source   - Which pipeline produced this event.
 * @param eventId  - Native event ID in the source's schema.
 * @returns rowCount — number of team_slots rows written.
 */
export async function compileEventTeamSlots(
  supabase: TypedClient,
  source: TeamSlotSource,
  eventId: string
): Promise<{ rowCount: number }> {
  // ---------------------------------------------------------------------------
  // Step 1: Resolve EventMeta
  // ---------------------------------------------------------------------------
  const meta = await resolveEventMeta(supabase, source, eventId);

  // ---------------------------------------------------------------------------
  // Step 2: Read raw slot rows
  // ---------------------------------------------------------------------------
  const raw = await readRawSlotRows(supabase, source, eventId);

  // ---------------------------------------------------------------------------
  // Step 3: Compile
  // ---------------------------------------------------------------------------
  const rows = buildTeamSlotRows(meta, raw);

  // ---------------------------------------------------------------------------
  // Step 4: Replace (DELETE + bulk INSERT in 500-row chunks)
  // NOTE: Upsert is not used here because the unique index on team_slots
  // (source, event_key, player_key, position) requires PostgREST to know the
  // exact onConflict target. DELETE + INSERT is always safe: if insert fails
  // after delete, the next retry will recompile and reinsert cleanly.
  // ---------------------------------------------------------------------------
  const { error: deleteError } = await supabase
    .from("team_slots")
    .delete()
    .eq("source", source)
    .eq("event_key", meta.eventKey);

  if (deleteError) {
    throw new Error(
      `compileEventTeamSlots: failed to delete existing rows for ${meta.eventKey}: ${deleteError.message}`
    );
  }

  if (rows.length > 0) {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const inserts: TablesInsert<"team_slots">[] = chunk.map(
        (r: TeamSlotRow) => ({
          source: r.source,
          event_key: r.event_key,
          format: r.format,
          event_date: r.event_date,
          event_tier: r.event_tier,
          is_online: r.is_online,
          total_players: r.total_players,
          player_key: r.player_key,
          division: r.division,
          placement: r.placement,
          wins: r.wins,
          losses: r.losses,
          ties: r.ties,
          country: r.country,
          position: r.position,
          species: r.species,
          held_item: r.held_item,
          ability: r.ability,
          tera_type: r.tera_type,
          moves: r.moves,
          nature: r.nature,
        })
      );

      const { error: insertError } = await supabase
        .from("team_slots")
        .insert(inserts);

      if (insertError) {
        throw new Error(
          `compileEventTeamSlots: failed to insert rows ${i}–${i + chunk.length - 1} for ${meta.eventKey}: ${insertError.message}`
        );
      }
    }
  }

  return { rowCount: rows.length };
}

// =============================================================================
// compileSourceTeamSlots — per-source batch event compilation
// =============================================================================

/**
 * Compile team_slots for every NOT-YET-COMPILED event of a source, then
 * return the distinct formats those events touched.
 *
 * "New" = an imported event (with team data) that has no team_slots rows yet.
 * Already-compiled events are skipped for efficiency. compileEventTeamSlots
 * uses replace semantics, so a one-off re-run is still safe.
 *
 * Best-effort per event: a single failing event is logged and skipped; the
 * rest still compile. Only rk9 and limitless are supported (trainers.gg stays
 * auto-compiled in its tournament flow).
 *
 * @param supabase Service-role Supabase client (bypasses RLS).
 * @param source   Which third-party source to process.
 * @returns eventsCompiled — number of newly compiled events;
 *          formats        — distinct format IDs those events belong to.
 */
export async function compileSourceTeamSlots(
  supabase: TypedClient,
  source: "rk9" | "limitless"
): Promise<{ eventsCompiled: number; formats: string[] }> {
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
          `compileSourceTeamSlots[rk9]: failed to fetch events: ${pageErr.message}`
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
    const allTournaments: Array<{
      tournament_id: string;
      format_id: string;
    }> = [];
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
          `compileSourceTeamSlots[limitless]: failed to fetch tournaments: ${pageErr.message}`
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
    return { eventsCompiled: 0, formats: [] };
  }

  // ─── Step 2: Find which candidates are already compiled ──────────────────
  // Paginate team_slots by source to collect all existing event_keys.
  // A single source can have far more than 1000 team_slots rows (6 slots ×
  // many players × many events), so we page through DISTINCT event_keys.
  const PAGE_SIZE = 1000;
  const existingKeys = new Set<string>();
  let from = 0;

  for (;;) {
    const { data: page, error: pageError } = await supabase
      .from("team_slots")
      .select("event_key")
      .eq("source", source)
      .range(from, from + PAGE_SIZE - 1);

    if (pageError) {
      throw new Error(
        `compileSourceTeamSlots[${source}]: failed to read existing team_slots keys (range ${from}-${from + PAGE_SIZE - 1}): ${pageError.message}`
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

  // ─── Step 3: Compile the new ones, accumulate touched formats ────────────
  let eventsCompiled = 0;
  const touchedFormats = new Set<string>();

  for (const candidate of candidates) {
    const eventKey = `${source}:${candidate.id}`;

    if (existingKeys.has(eventKey)) {
      // Already compiled — skip
      continue;
    }

    try {
      await compileEventTeamSlots(supabase, source, candidate.id);
      eventsCompiled++;
      touchedFormats.add(candidate.format);
    } catch (e) {
      // Best-effort: log and continue so one bad event doesn't abort the batch.
      // Keep the dynamic (DB-derived) values out of the first console arg —
      // a tainted format string trips CodeQL js/tainted-format-string.
      console.error(
        "compileSourceTeamSlots: failed to compile event — skipping",
        { source, eventId: candidate.id },
        e
      );
    }
  }

  return { eventsCompiled, formats: Array.from(touchedFormats) };
}

// =============================================================================
// Private helpers
// =============================================================================

/**
 * Resolve EventMeta for a source event.
 * Throws a descriptive error if the event is not found or is missing required fields.
 */
async function resolveEventMeta(
  supabase: TypedClient,
  source: TeamSlotSource,
  eventId: string
): Promise<EventMeta> {
  switch (source) {
    case "rk9": {
      const { data, error } = await supabase
        .schema("rk9")
        .from("events")
        .select("format_id, date_start, tier")
        .eq("event_id", eventId)
        .maybeSingle();

      if (error) {
        throw new Error(
          `compileEventTeamSlots[rk9]: failed to fetch event ${eventId}: ${error.message}`
        );
      }
      if (!data) {
        throw new Error(
          `compileEventTeamSlots[rk9]: event ${eventId} not found in rk9.events`
        );
      }
      if (!data.format_id) {
        throw new Error(
          `compileEventTeamSlots[rk9]: event ${eventId} has no format_id — cannot compile`
        );
      }

      return {
        source: "rk9",
        eventKey: `rk9:${eventId}`,
        format: data.format_id,
        eventDate: data.date_start,
        // tier is an enum stored as text; cast to string for EventMeta
        eventTier: (data.tier as string) ?? null,
        isOnline: false,
      };
    }

    case "limitless": {
      const { data, error } = await supabase
        .schema("limitless")
        .from("tournaments")
        .select("format_id, date, is_online")
        .eq("tournament_id", eventId)
        .maybeSingle();

      if (error) {
        throw new Error(
          `compileEventTeamSlots[limitless]: failed to fetch tournament ${eventId}: ${error.message}`
        );
      }
      if (!data) {
        throw new Error(
          `compileEventTeamSlots[limitless]: tournament ${eventId} not found in limitless.tournaments`
        );
      }
      if (!data.format_id) {
        throw new Error(
          `compileEventTeamSlots[limitless]: tournament ${eventId} has no format_id — cannot compile`
        );
      }

      return {
        source: "limitless",
        eventKey: `limitless:${eventId}`,
        format: data.format_id,
        eventDate: data.date,
        eventTier: null,
        isOnline: data.is_online,
      };
    }

    case "trainers.gg": {
      if (!Number.isFinite(Number(eventId))) {
        throw new Error(
          `compileEventTeamSlots[trainers.gg]: eventId must be a numeric tournament id, got "${eventId}"`
        );
      }
      // tournament_team_sheets.format is on each row; get it + the tournament start_date
      // via the first sheet row for this tournament.
      // tournaments.start_date is a timestamptz — slice to date string.
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
          `compileEventTeamSlots[trainers.gg]: failed to fetch team sheets for tournament ${eventId}: ${error.message}`
        );
      }
      if (!data) {
        throw new Error(
          `compileEventTeamSlots[trainers.gg]: no team sheets found for tournament ${eventId}`
        );
      }

      // tournaments join returns an array or object depending on relationship cardinality
      const tournament = Array.isArray(data.tournaments)
        ? data.tournaments[0]
        : data.tournaments;

      if (!tournament?.start_date) {
        throw new Error(
          `compileEventTeamSlots[trainers.gg]: tournament ${eventId} has no start_date`
        );
      }

      // start_date is a timestamptz — take only the date portion
      const eventDate = tournament.start_date.slice(0, 10);

      return {
        source: "trainers.gg",
        eventKey: `trainers.gg:${eventId}`,
        format: data.format,
        eventDate,
        eventTier: null,
        isOnline: true,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Raw slot reads — paginated
// ---------------------------------------------------------------------------

const READ_PAGE_SIZE = 1000;

/**
 * Read all team slot rows for an event, paginated to avoid the PostgREST
 * 1000-row default cap. Each page is checked for errors; throws on failure.
 */
async function readRawSlotRows(
  supabase: TypedClient,
  source: TeamSlotSource,
  eventId: string
): Promise<RawSlotRow[]> {
  switch (source) {
    case "rk9":
      return readRk9SlotRows(supabase, eventId);
    case "limitless":
      return readLimitlessSlotRows(supabase, eventId);
    case "trainers.gg":
      return readTrainersSlotRows(supabase, eventId);
  }
}

async function readRk9SlotRows(
  supabase: TypedClient,
  eventId: string
): Promise<RawSlotRow[]> {
  const allRows: RawSlotRow[] = [];
  let offset = 0;

  for (;;) {
    const { data: page, error: pageErr } = await supabase
      .schema("rk9")
      .from("team_pokemon")
      .select(
        "standing_id, position, species, ability, held_item, tera_type, moves, stat_alignment, standings!inner(id, division, placement, players(country))"
      )
      .eq("standings.event_id", eventId)
      .eq("is_legal", true)
      .range(offset, offset + READ_PAGE_SIZE - 1);

    if (pageErr) {
      throw new Error(
        `compileEventTeamSlots[rk9]: failed to read team_pokemon page at offset ${offset} for event ${eventId}: ${pageErr.message}`
      );
    }

    const rows = page ?? [];

    for (const row of rows) {
      const standing = Array.isArray(row.standings)
        ? row.standings[0]
        : row.standings;

      // players is embedded in the standing
      const player = standing?.players
        ? Array.isArray(standing.players)
          ? standing.players[0]
          : standing.players
        : null;

      allRows.push({
        playerKey: `rk9:${String(row.standing_id)}`,
        division: (standing?.division as string) ?? null,
        placement: (standing?.placement as number | null) ?? null,
        wins: null, // rk9 does not expose W/L/T in standings
        losses: null,
        ties: null,
        country: (player?.country as string | null) ?? null,
        position: row.position,
        species: row.species,
        heldItem: row.held_item,
        ability: row.ability,
        teraType: row.tera_type,
        moves: row.moves ?? [],
        // stat_alignment is RK9's nature field (Champions M-A only; null for older events)
        nature: row.stat_alignment ?? null,
      });
    }

    if (rows.length < READ_PAGE_SIZE) break;
    offset += READ_PAGE_SIZE;
  }

  return allRows;
}

async function readLimitlessSlotRows(
  supabase: TypedClient,
  eventId: string
): Promise<RawSlotRow[]> {
  const allRows: RawSlotRow[] = [];
  let offset = 0;

  for (;;) {
    const { data: page, error: pageErr } = await supabase
      .schema("limitless")
      .from("team_pokemon")
      .select(
        "standing_id, position, species, ability, held_item, tera_type, moves, standings!inner(id, placement, record_wins, record_losses, record_ties, players(country))"
      )
      .eq("standings.tournament_id", eventId)
      .range(offset, offset + READ_PAGE_SIZE - 1);

    if (pageErr) {
      throw new Error(
        `compileEventTeamSlots[limitless]: failed to read team_pokemon page at offset ${offset} for tournament ${eventId}: ${pageErr.message}`
      );
    }

    const rows = page ?? [];

    for (const row of rows) {
      const standing = Array.isArray(row.standings)
        ? row.standings[0]
        : row.standings;

      const player = standing?.players
        ? Array.isArray(standing.players)
          ? standing.players[0]
          : standing.players
        : null;

      allRows.push({
        playerKey: `limitless:${String(row.standing_id)}`,
        division: null, // Limitless has no age divisions
        placement: (standing?.placement as number | null) ?? null,
        wins: (standing?.record_wins as number | null) ?? null,
        losses: (standing?.record_losses as number | null) ?? null,
        ties: (standing?.record_ties as number | null) ?? null,
        country: (player?.country as string | null) ?? null,
        position: row.position,
        species: row.species,
        heldItem: row.held_item,
        ability: row.ability,
        teraType: row.tera_type,
        moves: row.moves ?? [],
        nature: null, // limitless.team_pokemon has no nature column
      });
    }

    if (rows.length < READ_PAGE_SIZE) break;
    offset += READ_PAGE_SIZE;
  }

  return allRows;
}

async function readTrainersSlotRows(
  supabase: TypedClient,
  eventId: string
): Promise<RawSlotRow[]> {
  if (!Number.isFinite(Number(eventId))) {
    throw new Error(
      `compileEventTeamSlots[trainers.gg]: eventId must be a numeric tournament id, got "${eventId}"`
    );
  }

  const allRows: RawSlotRow[] = [];
  let offset = 0;

  for (;;) {
    const { data: page, error: pageErr } = await supabase
      .from("tournament_team_sheets")
      .select(
        "registration_id, position, species, ability, held_item, tera_type, move1, move2, move3, move4, nature"
      )
      .eq("tournament_id", Number(eventId))
      .range(offset, offset + READ_PAGE_SIZE - 1);

    if (pageErr) {
      throw new Error(
        `compileEventTeamSlots[trainers.gg]: failed to read team sheets page at offset ${offset} for tournament ${eventId}: ${pageErr.message}`
      );
    }

    const rows = page ?? [];

    for (const row of rows) {
      allRows.push({
        playerKey: `trainers.gg:${String(row.registration_id)}`,
        division: null, // first-party has no age divisions
        // v1: trainers.gg sheets have no placement; placement/W-L enrichment
        // lands with the standings join in a future task.
        placement: null,
        wins: null,
        losses: null,
        ties: null,
        country: null, // not available on team_sheets rows
        position: row.position,
        species: row.species,
        heldItem: row.held_item,
        ability: row.ability,
        teraType: row.tera_type,
        moves: [row.move1, row.move2, row.move3, row.move4],
        // nature is non-null only for Champions formats; null for standard VGC (kept private)
        nature: row.nature ?? null,
      });
    }

    if (rows.length < READ_PAGE_SIZE) break;
    offset += READ_PAGE_SIZE;
  }

  return allRows;
}
