import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RK9Event,
  RK9RosterEntry,
  RK9Pokemon,
  DivisionRoundPairings,
} from "./types.js";
import { normalizeSpeciesInline } from "./normalize.js";

// =============================================================================
// Events sync
// =============================================================================

export async function syncEvents(
  supabase: SupabaseClient,
  events: RK9Event[]
): Promise<void> {
  const rows = events.map((e) => ({
    event_id: e.eventId,
    name: e.name,
    tier: e.tier,
    date_start: e.dateStart,
    date_end: e.dateEnd,
    location_city: e.locationCity || null,
    location_country: e.locationCountry || null,
  }));

  // Batch upsert (500 at a time)
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase
      .schema("rk9")
      .from("events")
      .upsert(batch, { onConflict: "event_id" });
    if (error) throw new Error(`Events sync batch at ${i}: ${error.message}`);
  }
}

// =============================================================================
// Roster import
// =============================================================================

export async function importRoster(
  supabase: SupabaseClient,
  eventId: string,
  roster: RK9RosterEntry[]
): Promise<{ playersUpserted: number; standingsInserted: number }> {
  // Delete existing standings for idempotency (cascade deletes team_pokemon)
  await supabase
    .schema("rk9")
    .from("standings")
    .delete()
    .eq("event_id", eventId);

  // -------------------------------------------------------------------------
  // Batch 1: Upsert all unique players in one go
  // -------------------------------------------------------------------------

  const seen = new Set<string>();
  const uniquePlayerRows: Record<string, unknown>[] = [];

  for (const entry of roster) {
    if (!entry.firstName || !entry.lastName) continue;

    const key = `${entry.playerIdMasked}|${entry.firstName}|${entry.lastName}|${entry.country}`;
    if (seen.has(key)) continue;
    seen.add(key);

    uniquePlayerRows.push({
      player_id_masked: entry.playerIdMasked || "",
      first_name: entry.firstName,
      last_name: entry.lastName,
      country: entry.country || null,
      trainer_name: entry.trainerName || null,
    });
  }

  const playerIdCache = new Map<string, number>();

  if (uniquePlayerRows.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < uniquePlayerRows.length; i += BATCH_SIZE) {
      const batch = uniquePlayerRows.slice(i, i + BATCH_SIZE);
      const { data: inserted, error } = await supabase
        .schema("rk9")
        .from("players")
        .upsert(batch, {
          onConflict: "player_id_masked,first_name,last_name,country",
        })
        .select("id, player_id_masked, first_name, last_name, country");

      if (error) throw new Error(`Player batch upsert: ${error.message}`);

      for (const row of inserted ?? []) {
        const key = `${row.player_id_masked}|${row.first_name}|${row.last_name}|${row.country}`;
        playerIdCache.set(key, row.id);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Batch 2: Upsert all standings in one go
  // -------------------------------------------------------------------------

  const standingRows: Record<string, unknown>[] = [];

  for (const entry of roster) {
    if (!entry.firstName || !entry.lastName) continue;

    const key = `${entry.playerIdMasked}|${entry.firstName}|${entry.lastName}|${entry.country}`;
    const playerId = playerIdCache.get(key);
    if (!playerId) continue;

    standingRows.push({
      event_id: eventId,
      player_id: playerId,
      division: entry.division,
      placement: entry.placement,
      roster_entry_id: entry.rosterEntryId,
    });
  }

  let standingsInserted = 0;
  if (standingRows.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < standingRows.length; i += BATCH_SIZE) {
      const batch = standingRows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .schema("rk9")
        .from("standings")
        .upsert(batch, { onConflict: "event_id,player_id,division" });

      if (error) {
        console.warn(
          `[import] Standing batch upsert error at ${i}: ${error.message}`
        );
      } else {
        standingsInserted += batch.length;
      }
    }
  }

  // Update event metadata
  await supabase
    .schema("rk9")
    .from("events")
    .update({ player_count: roster.length })
    .eq("event_id", eventId);

  return { playersUpserted: uniquePlayerRows.length, standingsInserted };
}

// =============================================================================
// Species map seed
// =============================================================================

export async function seedSpeciesMap(
  supabase: SupabaseClient,
  mappings: Map<string, string>
): Promise<void> {
  const rows = Array.from(mappings.entries()).map(([raw, slug]) => ({
    raw_name: raw,
    species_slug: slug,
    verified: false,
  }));

  if (rows.length === 0) return;

  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase
      .schema("rk9")
      .from("species_map")
      .upsert(batch, { onConflict: "raw_name", ignoreDuplicates: true });
    if (error)
      throw new Error(`Species map seed batch at ${i}: ${error.message}`);
  }
}

// =============================================================================
// Teams import (from pre-scraped data)
// =============================================================================

/**
 * Import team pokemon for one event from pre-scraped data (rosterEntryId → pokemon[]).
 * Loads standing IDs from DB, maps rosterEntryId → standingId, bulk-inserts.
 */
export async function importTeams(
  supabase: SupabaseClient,
  eventId: string,
  teams: Array<{ rosterEntryId: string; pokemon: RK9Pokemon[] }>,
  speciesMap: Map<string, string>
): Promise<number> {
  // 1. Load standings for this event (we need id ↔ roster_entry_id mapping)
  const { data: standings, error: standErr } = await supabase
    .schema("rk9")
    .from("standings")
    .select("id, roster_entry_id")
    .eq("event_id", eventId)
    .not("roster_entry_id", "is", null);

  if (standErr) throw new Error(`Load standings: ${standErr.message}`);
  if (!standings || standings.length === 0) return 0;

  const entryToStanding = new Map<string, number>();
  for (const s of standings) {
    if (s.roster_entry_id) entryToStanding.set(s.roster_entry_id, s.id);
  }

  // 2. Build all team_pokemon rows
  const allRows: Record<string, unknown>[] = [];
  for (const team of teams) {
    const standingId = entryToStanding.get(team.rosterEntryId);
    if (!standingId) continue;

    for (const [i, mon] of team.pokemon.entries()) {
      const species =
        speciesMap.get(mon.speciesRaw) ?? normalizeSpeciesInline(mon.speciesRaw);
      allRows.push({
        standing_id: standingId,
        position: i + 1,
        species,
        species_raw: mon.speciesRaw,
        ability: mon.ability || null,
        held_item: mon.heldItem || null,
        tera_type: mon.teraType || null,
        moves: mon.moves.length > 0 ? mon.moves : null,
      });
    }
  }

  if (allRows.length === 0) return 0;

  // 3. Bulk-insert in chunks of 200
  const BULK_CHUNK = 200;
  let total = 0;
  for (let i = 0; i < allRows.length; i += BULK_CHUNK) {
    const chunk = allRows.slice(i, i + BULK_CHUNK);
    const { error } = await supabase
      .schema("rk9")
      .from("team_pokemon")
      .insert(chunk);
    if (error) throw new Error(`Team pokemon bulk insert: ${error.message}`);
    total += chunk.length;
  }
  return total;
}

// =============================================================================
// Match results import (from pre-scraped pairings data)
// =============================================================================

/**
 * Import match results for all divisions of one event.
 * Handles Masters, Senior, and Junior independently — each gets its own
 * phase entry and name→ID lookup scoped to that division's standings.
 */
export async function importMatchResults(
  supabase: SupabaseClient,
  eventId: string,
  divisionPairings: DivisionRoundPairings[]
): Promise<{ matches: number; rounds: number }> {
  if (divisionPairings.length === 0) return { matches: 0, rounds: 0 };

  let totalMatches = 0;
  let totalRounds = 0;

  for (const { division, rounds } of divisionPairings) {
    if (rounds.size === 0) continue;

    // Load players for this specific division
    const { data: standingPlayers } = await supabase
      .schema("rk9")
      .from("standings")
      .select("player_id")
      .eq("event_id", eventId)
      .eq("division", division);

    if (!standingPlayers || standingPlayers.length === 0) continue;

    const playerIds = standingPlayers.map((s) => s.player_id);
    const { data: eventPlayers } = await supabase
      .schema("rk9")
      .from("players")
      .select("id, first_name, last_name")
      .in("id", playerIds);

    if (!eventPlayers || eventPlayers.length === 0) continue;

    const nameToId = new Map<string, number>();
    for (const p of eventPlayers) {
      nameToId.set(`${p.first_name} ${p.last_name}`.toLowerCase().trim(), p.id);
      nameToId.set(
        `${p.last_name}, ${p.first_name}`.toLowerCase().trim(),
        p.id
      );
    }

    // Upsert phase entry for this division
    await supabase
      .schema("rk9")
      .from("phases")
      .upsert(
        {
          event_id: eventId,
          division,
          phase_number: 1,
          type: "swiss",
          rounds: rounds.size,
        },
        { onConflict: "event_id,division,phase_number" }
      );

    for (const [round, pairings] of rounds) {
      const matchRows: Record<string, unknown>[] = [];

      for (const p of pairings) {
        const player1Id = nameToId.get(p.player1.toLowerCase().trim());
        if (!player1Id) continue;

        const player2Id = p.player2
          ? (nameToId.get(p.player2.toLowerCase().trim()) ?? null)
          : null;

        let winnerId: number | null = null;
        if (p.player1Won === true) winnerId = player1Id;
        else if (p.player1Won === false) winnerId = player2Id;

        matchRows.push({
          event_id: eventId,
          division,
          phase_number: 1,
          round,
          table_number: p.tableNumber,
          player1_id: player1Id,
          player2_id: player2Id,
          winner_id: winnerId,
        });
      }

      if (matchRows.length > 0) {
        const { error } = await supabase
          .schema("rk9")
          .from("match_results")
          .insert(matchRows);
        if (error) {
          console.warn(
            `[import] Match results ${division} round ${round}: ${error.message}`
          );
          continue;
        }
        totalMatches += matchRows.length;
        totalRounds++;
      }
    }
  }

  return { matches: totalMatches, rounds: totalRounds };
}
