/**
 * RK9 Database Import
 *
 * Imports scraped RK9.gg data (JSON files from rk9-download.ts) into the
 * rk9 schema in Supabase. Uses the service_role client to bypass RLS.
 *
 * Import flow:
 *   1. Upsert event metadata (from events.json)
 *   2. Upsert players from roster (dedup by player_id_masked + first_name + last_name + country)
 *   3. Create standings (linking players to events with placement)
 *   4. Insert team_pokemon (species, ability, item, tera, moves)
 *
 * Idempotent: safe to re-run — uses delete-then-insert for child tables,
 * upsert for events and players.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RK9Event, RK9Pokemon, RK9RosterEntry } from "./types";

import { normalizeSpecies } from "./normalize";

export { collectUniqueSpecies } from "./normalize";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of importing a single event */
export interface ImportEventResult {
  eventId: string;
  playersUpserted: number;
  standingsInserted: number;
  teamsInserted: number;
  pokemonInserted: number;
}

/** Result of syncing the events list */
export interface SyncEventsResult {
  synced: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Sync events metadata
// ---------------------------------------------------------------------------

/**
 * Sync discovered events into the rk9.events table.
 *
 * Upserts event rows — safe to call repeatedly.
 */
export async function syncEvents(
  supabase: SupabaseClient,
  events: RK9Event[]
): Promise<SyncEventsResult> {
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
  let synced = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase
      .schema("rk9")
      .from("events")
      .upsert(batch, { onConflict: "event_id" });
    if (error) throw new Error(`Events sync batch at ${i}: ${error.message}`);
    synced += batch.length;
  }

  return { synced, total: events.length };
}

// ---------------------------------------------------------------------------
// Import a single event (roster + teams)
// ---------------------------------------------------------------------------

/**
 * Import full event data (roster + teams) into the rk9 schema.
 *
 * Idempotent: deletes existing standings + team_pokemon for the event
 * before re-inserting. Players are upserted (never deleted).
 */
export async function importEvent(
  supabase: SupabaseClient,
  eventId: string,
  roster: RK9RosterEntry[],
  teams: Record<string, RK9Pokemon[]>,
  speciesMapOverrides?: Map<string, string>
): Promise<ImportEventResult> {
  const result: ImportEventResult = {
    eventId,
    playersUpserted: 0,
    standingsInserted: 0,
    teamsInserted: 0,
    pokemonInserted: 0,
  };

  // 1. Delete existing child data and load species_map in parallel
  const [delErr, speciesMap] = await Promise.all([
    // Delete standings (team_pokemon cascades via ON DELETE CASCADE)
    supabase
      .schema("rk9")
      .from("standings")
      .delete()
      .eq("event_id", eventId)
      .then(({ error }) => error),

    // Load species_map for normalization overrides
    speciesMapOverrides
      ? Promise.resolve(speciesMapOverrides)
      : loadSpeciesMap(supabase),
  ]);

  if (delErr) throw new Error(`Delete standings: ${delErr.message}`);

  // 3. Batch upsert all players first
  const playerIdCache = new Map<string, number>();
  const uniquePlayers = new Map<
    string,
    {
      playerIdMasked: string;
      firstName: string;
      lastName: string;
      country: string | null;
      trainerName: string | null;
    }
  >();

  for (const entry of roster) {
    if (!entry.firstName || !entry.lastName) continue;
    const key = `${entry.playerIdMasked ?? ""}|${entry.firstName}|${entry.lastName}|${entry.country ?? ""}`;
    if (!uniquePlayers.has(key)) {
      uniquePlayers.set(key, {
        playerIdMasked: entry.playerIdMasked ?? "",
        firstName: entry.firstName,
        lastName: entry.lastName,
        country: entry.country ?? null,
        trainerName: entry.trainerName ?? null,
      });
    }
  }

  // Batch upsert players (500 at a time) and build cache
  const playerRows = Array.from(uniquePlayers.values());
  for (let i = 0; i < playerRows.length; i += 500) {
    const batch = playerRows.slice(i, i + 500);
    const { data: upserted, error: pErr } = await supabase
      .schema("rk9")
      .from("players")
      .upsert(
        batch.map((p) => ({
          player_id_masked: p.playerIdMasked,
          first_name: p.firstName,
          last_name: p.lastName,
          country: p.country,
          trainer_name: p.trainerName,
        })),
        { onConflict: "player_id_masked,first_name,last_name,country" }
      )
      .select("id, player_id_masked, first_name, last_name, country");

    if (pErr) throw new Error(`Player batch upsert: ${pErr.message}`);

    for (const row of upserted ?? []) {
      const key = `${row.player_id_masked ?? ""}|${row.first_name}|${row.last_name}|${row.country ?? ""}`;
      playerIdCache.set(key, row.id);
    }
  }

  result.playersUpserted = playerIdCache.size;

  // 4. Batch upsert standings, then batch insert team_pokemon
  const standingBatch: Array<{
    event_id: string;
    player_id: number;
    division: string;
    placement: number | null;
    roster_entry_id: string | null;
    index: number;
  }> = [];

  for (const [idx, entry] of roster.entries()) {
    if (!entry.firstName || !entry.lastName) continue;
    const key = `${entry.playerIdMasked ?? ""}|${entry.firstName}|${entry.lastName}|${entry.country ?? ""}`;
    const playerId = playerIdCache.get(key);
    if (!playerId) {
      console.warn(
        `[rk9-import] No player ID for ${entry.firstName} ${entry.lastName}`
      );
      continue;
    }
    standingBatch.push({
      event_id: eventId,
      player_id: playerId,
      division: entry.division,
      placement: entry.placement,
      roster_entry_id: entry.rosterEntryId ?? null,
      index: idx,
    });
  }

  // Upsert standings in batches (500 at a time) with SELECT to get IDs
  const standingIdByIndex = new Map<number, number>();
  for (let i = 0; i < standingBatch.length; i += 500) {
    const batch = standingBatch.slice(i, i + 500);
    const { data: inserted, error: sErr } = await supabase
      .schema("rk9")
      .from("standings")
      .upsert(
        batch.map((s) => ({
          event_id: s.event_id,
          player_id: s.player_id,
          division: s.division,
          placement: s.placement,
          roster_entry_id: s.roster_entry_id,
        })),
        { onConflict: "event_id,player_id,division" }
      )
      .select("id");

    if (sErr) throw new Error(`Standings batch upsert: ${sErr.message}`);

    for (let j = 0; j < (inserted ?? []).length; j++) {
      const standingId = inserted![j]?.id;
      if (standingId) {
        standingIdByIndex.set(batch[j]!.index, standingId);
      }
    }
  }

  result.standingsInserted = standingIdByIndex.size;

  // 5. Batch insert team_pokemon
  const allPokemonRows: Array<{
    standing_id: number;
    position: number;
    species: string;
    species_raw: string;
    ability: string | null;
    held_item: string | null;
    tera_type: string | null;
    moves: string[] | null;
  }> = [];

  for (const [idx, entry] of roster.entries()) {
    if (!entry.firstName || !entry.lastName) continue;
    const standingId = standingIdByIndex.get(idx);
    if (!standingId) continue;

    if (entry.rosterEntryId && teams[entry.rosterEntryId]) {
      const pokemon = teams[entry.rosterEntryId]!;
      if (pokemon.length > 0) {
        for (let pos = 0; pos < pokemon.length; pos++) {
          const mon = pokemon[pos];
          if (!mon) continue;
          allPokemonRows.push({
            standing_id: standingId,
            position: pos + 1,
            species: resolveSpeciesSlug(mon.speciesRaw, speciesMap),
            species_raw: mon.speciesRaw,
            ability: mon.ability || null,
            held_item: mon.heldItem || null,
            tera_type: mon.teraType || null,
            moves: mon.moves.length > 0 ? mon.moves : null,
          });
        }
      }
    }
  }

  for (let i = 0; i < allPokemonRows.length; i += 500) {
    const batch = allPokemonRows.slice(i, i + 500);
    const { error: pkErr } = await supabase
      .schema("rk9")
      .from("team_pokemon")
      .insert(batch);

    if (pkErr) throw new Error(`Team pokemon batch: ${pkErr.message}`);
  }

  result.pokemonInserted = allPokemonRows.length;
  result.teamsInserted = new Set(allPokemonRows.map((r) => r.standing_id)).size;

  // 4. Update event metadata
  // Status depends on what was actually imported:
  //   - "roster" = roster done, teams not yet scraped
  //   - "complete" = roster + teams both done
  const newStatus = result.teamsInserted > 0 ? "complete" : "roster";
  const { error: updateErr } = await supabase
    .schema("rk9")
    .from("events")
    .update({
      player_count: roster.length,
      has_team_lists: result.teamsInserted > 0,
      import_status: newStatus,
      import_error: null,
      imported_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);

  if (updateErr) throw new Error(`Event status update: ${updateErr.message}`);

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a species display name to a normalized slug.
 * Checks the species_map first (verified overrides), then falls back
 * to heuristic normalization.
 */
function resolveSpeciesSlug(
  raw: string,
  speciesMap: Map<string, string>
): string {
  // Check map for verified override
  const override = speciesMap.get(raw);
  if (override) return override;

  // Heuristic normalization
  return normalizeSpecies(raw);
}

/**
 * Load the species_map table into a Map for fast lookups.
 */
export async function loadSpeciesMap(
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  const { data, error } = await supabase
    .schema("rk9")
    .from("species_map")
    .select("raw_name, species_slug");

  if (error) {
    // species_map might be empty — not a fatal error
    console.warn(`Warning: could not load species_map: ${error.message}`);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.raw_name, row.species_slug);
  }

  return map;
}

/**
 * Seed the species_map table with raw_name → slug mappings.
 * Uses ON CONFLICT DO NOTHING so it won't overwrite verified entries.
 */
export async function seedSpeciesMap(
  supabase: SupabaseClient,
  mappings: Map<string, string>
): Promise<number> {
  const rows = Array.from(mappings.entries()).map(([raw, slug]) => ({
    raw_name: raw,
    species_slug: slug,
    verified: false,
  }));

  if (rows.length === 0) return 0;

  // Batch insert with ON CONFLICT DO NOTHING (don't overwrite verified entries)
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase
      .schema("rk9")
      .from("species_map")
      .upsert(batch, {
        onConflict: "raw_name",
        ignoreDuplicates: true,
      });
    if (error)
      throw new Error(`Species map seed batch at ${i}: ${error.message}`);
    inserted += batch.length;
  }

  return inserted;
}
