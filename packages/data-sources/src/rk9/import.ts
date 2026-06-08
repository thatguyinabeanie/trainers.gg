/**
 * RK9 Database Import
 *
 * Imports scraped RK9.gg data (JSON files from rk9-download.ts) into the
 * rk9 schema in Supabase. Uses the service_role client to bypass RLS.
 *
 * Import flow:
 *   1. Upsert event metadata (from events.json)
 *   2. Match or create players per roster entry (sequential, with import_flag)
 *   3. Create standings (linking players to events with placement)
 *   4. Insert team_pokemon (species, ability, item, tera, moves)
 *
 * Idempotent: safe to re-run — uses delete-then-insert for child tables,
 * upsert for events and players.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { validatePokemonLegality } from "@trainers/pokemon";

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
 *
 * Player matching algorithm:
 *   - Phase 1: Pre-scan roster for conflict groups (same identity, 2+ entries)
 *   - Phase 2: Per-entry sequential matching — find/create players, set import_flag
 *   - Phase 3: Update trainer_names on existing players when a new name is discovered
 *   - Phase 4: Batch upsert standings on (event_id, roster_entry_id)
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

  // Step 1. Delete existing child data and load species_map in parallel
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

  // Fetch the event's format so we can flag each Pokemon's legality at import
  // time. If this fails or is null, we treat every row as legal (fail open) —
  // we never block the import on a missing/unreadable format.
  let formatId: string | null = null;
  {
    const { data: eventRow, error: eventErr } = await supabase
      .schema("rk9")
      .from("events")
      .select("format_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (eventErr) {
      console.warn(
        `importEvent: could not load format_id for event ${eventId}: ${eventErr.message}`
      );
    } else {
      formatId = eventRow?.format_id ?? null;
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 1: Pre-scan for conflict groups
  //
  // Group entries by (playerIdMasked, firstName, lastName, country).
  // Any identity key with 2+ entries in this event is a "conflict group" —
  // we cannot pick a single player for them without ambiguity.
  // ---------------------------------------------------------------------------
  const identityCount = new Map<string, number>();
  for (const entry of roster) {
    if (!entry.firstName || !entry.lastName) continue;
    const key = `${entry.playerIdMasked ?? ""}|${entry.firstName}|${entry.lastName}|${entry.country ?? ""}`;
    identityCount.set(key, (identityCount.get(key) ?? 0) + 1);
  }

  // ---------------------------------------------------------------------------
  // Phase 2 + 3: Sequential per-entry player matching
  //
  // Process entries one at a time so that players created in earlier iterations
  // are visible to later lookups (Phase A re-queries the DB each time).
  // ---------------------------------------------------------------------------

  // Resolved match for each roster index: playerId (null when unlinked) + flag
  const entryMatches: Array<{
    idx: number;
    playerId: number | null;
    importFlag: string | null;
  }> = [];

  for (const [idx, entry] of roster.entries()) {
    // Skip entries with no real name — cannot create a meaningful player record
    if (!entry.firstName || !entry.lastName) continue;

    const identityKey = `${entry.playerIdMasked ?? ""}|${entry.firstName}|${entry.lastName}|${entry.country ?? ""}`;
    const isConflictGroup = (identityCount.get(identityKey) ?? 0) >= 2;

    let playerId: number | null = null;
    let importFlag: string | null = null;

    try {
      // Phase A: Look up existing players matching this identity
      const baseQuery = supabase
        .schema("rk9")
        .from("players")
        .select("id, trainer_names")
        .eq("player_id_masked", entry.playerIdMasked ?? "")
        .eq("first_name", entry.firstName)
        .eq("last_name", entry.lastName);

      const { data: candidates, error: lookupErr } = await (entry.country
        ? baseQuery.eq("country", entry.country)
        : baseQuery.is("country", null));

      if (lookupErr) throw new Error(`Player lookup: ${lookupErr.message}`);

      const trainerName = entry.trainerName ?? null;

      // Phase B: Match by trainer_name — check if any candidate already knows this name
      const exactMatch = (candidates ?? []).find(
        (c) =>
          trainerName !== null &&
          Array.isArray(c.trainer_names) &&
          (c.trainer_names as string[]).includes(trainerName)
      );

      if (exactMatch) {
        // Existing player with a known trainer name — use them as-is
        playerId = exactMatch.id as number;
        importFlag = null;
      } else {
        // Phase C: No trainer name match — decide based on conflict status
        if (isConflictGroup) {
          // Multiple roster entries share this identity in this event.
          // We cannot reliably pick one player, so create a new isolated record.
          const { data: created, error: createErr } = await supabase
            .schema("rk9")
            .from("players")
            .insert({
              player_id_masked: entry.playerIdMasked ?? "",
              first_name: entry.firstName,
              last_name: entry.lastName,
              country: entry.country ?? null,
              trainer_names: trainerName !== null ? [trainerName] : [],
            })
            .select("id")
            .single();

          if (createErr)
            throw new Error(`Player create (collision): ${createErr.message}`);
          playerId = (created as { id: number }).id;
          importFlag = "name_collision";
        } else {
          const candidateList = candidates ?? [];

          if (candidateList.length === 0) {
            // No existing player — create a brand-new record
            const { data: created, error: createErr } = await supabase
              .schema("rk9")
              .from("players")
              .insert({
                player_id_masked: entry.playerIdMasked ?? "",
                first_name: entry.firstName,
                last_name: entry.lastName,
                country: entry.country ?? null,
                trainer_names: trainerName !== null ? [trainerName] : [],
              })
              .select("id")
              .single();

            if (createErr)
              throw new Error(`Player create (new): ${createErr.message}`);
            playerId = (created as { id: number }).id;
            importFlag = "new_player";
          } else if (candidateList.length === 1) {
            // Exactly one candidate — link this entry to them and learn the new trainer name
            const candidate = candidateList[0]!;
            playerId = candidate.id as number;
            importFlag = "new_trainer";

            // Phase 3: Append trainer_name to the player's known names
            if (trainerName !== null) {
              const existingNames = Array.isArray(candidate.trainer_names)
                ? (candidate.trainer_names as string[])
                : [];
              if (!existingNames.includes(trainerName)) {
                const { error: updateErr } = await supabase
                  .schema("rk9")
                  .from("players")
                  .update({ trainer_names: [...existingNames, trainerName] })
                  .eq("id", playerId);

                if (updateErr)
                  throw new Error(
                    `Player trainer_names update: ${updateErr.message}`
                  );
              }
            }
          } else {
            // Multiple candidates but none match the trainer name — ambiguous
            const { data: created, error: createErr } = await supabase
              .schema("rk9")
              .from("players")
              .insert({
                player_id_masked: entry.playerIdMasked ?? "",
                first_name: entry.firstName,
                last_name: entry.lastName,
                country: entry.country ?? null,
                trainer_names: trainerName !== null ? [trainerName] : [],
              })
              .select("id")
              .single();

            if (createErr)
              throw new Error(
                `Player create (multi-candidate): ${createErr.message}`
              );
            playerId = (created as { id: number }).id;
            importFlag = "name_collision";
          }
        }
      }
    } catch (err) {
      // Phase D: Matching failed entirely — record the standing as unlinked
      // so team_pokemon can still be linked and the import is not aborted.
      console.warn(
        `[rk9-import] Player match failed for ${entry.firstName} ${entry.lastName} (idx ${idx}): ${err instanceof Error ? err.message : String(err)}`
      );
      playerId = null;
      importFlag = "unlinked";
    }

    entryMatches.push({ idx, playerId, importFlag });
  }

  result.playersUpserted = entryMatches.filter(
    (m) => m.playerId !== null
  ).length;

  // ---------------------------------------------------------------------------
  // Phase 4: Build standings batch and upsert
  //
  // Unique constraint is now (event_id, roster_entry_id) — no deduplication
  // needed since roster_entry_id is always unique per entry.
  // ---------------------------------------------------------------------------
  const standingBatch: Array<{
    event_id: string;
    player_id: number | null;
    division: string;
    placement: number | null;
    roster_entry_id: string | null;
    trainer_name: string | null;
    import_flag: string | null;
    index: number;
  }> = [];

  for (const { idx, playerId, importFlag } of entryMatches) {
    const entry = roster[idx]!;
    standingBatch.push({
      event_id: eventId,
      player_id: playerId,
      division: entry.division,
      placement: entry.placement,
      roster_entry_id: entry.rosterEntryId ?? null,
      trainer_name: entry.trainerName ?? null,
      import_flag: importFlag,
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
      .insert(
        batch.map((s) => ({
          event_id: s.event_id,
          player_id: s.player_id,
          division: s.division,
          placement: s.placement,
          roster_entry_id: s.roster_entry_id,
          trainer_name: s.trainer_name,
          import_flag: s.import_flag,
        }))
      )
      .select("id");

    if (sErr) throw new Error(`Standings batch insert: ${sErr.message}`);

    // PostgREST does not guarantee upsert return order matches input order.
    // This mapping works in practice for inserts, but keying off roster_entry_id
    // would be more robust if this ever breaks.
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
    stat_alignment: string | null;
    moves: string[] | null;
    is_legal: boolean;
    legality_reason: string | null;
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

          const species = resolveSpeciesSlug(mon.speciesRaw, speciesMap);
          const ability = mon.ability || null;
          const heldItem = mon.heldItem || null;
          const moves = mon.moves.length > 0 ? mon.moves : null;

          // Validate using speciesRaw (display name, e.g. "Garchomp") — the
          // legality sets use PascalCase display names, not normalized slugs.
          // Bracket-notation forms (e.g. "Landorus [Therian Forme]") won't
          // match the validator's set and will be flagged as illegal; that is
          // a known limitation that is strictly better than the alternative
          // (slug lookup which flags every species illegal).
          // Fail open when we have no format (formatId === null): everything legal.
          const legality = formatId
            ? validatePokemonLegality(
                mon.speciesRaw,
                ability,
                heldItem,
                moves,
                formatId
              )
            : { isLegal: true, reason: null };

          allPokemonRows.push({
            standing_id: standingId,
            position: pos + 1,
            species,
            species_raw: mon.speciesRaw,
            ability,
            held_item: heldItem,
            tera_type: mon.teraType || null,
            stat_alignment: mon.statAlignment ?? null,
            moves,
            is_legal: legality.isLegal,
            legality_reason: legality.reason,
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
