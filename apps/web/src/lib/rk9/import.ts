/**
 * RK9 Database Import
 *
 * Imports scraped RK9.gg data (JSON files from rk9-download.ts) into the
 * rk9 schema in Supabase. Uses the service_role client to bypass RLS.
 *
 * Import flow:
 *   1. Upsert event metadata (from events.json)
 *   2. Upsert players from roster (dedup by player_id_masked + first_name + last_name + country + division)
 *   3. Create standings (linking players to events with placement)
 *   4. Insert team_pokemon (species, ability, item, tera, moves)
 *
 * Idempotent: safe to re-run — uses delete-then-insert for child tables,
 * upsert for events and players.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  RK9Event,
  RK9Pokemon,
  RK9RosterEntry,
} from "./types";

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
// Species normalization
// ---------------------------------------------------------------------------

/**
 * Normalize an RK9 species display name to a Showdown-compatible slug.
 *
 * RK9 uses display names like:
 *   "Ogerpon [Hearthflame Mask]" → "ogerpon-hearthflame"
 *   "Urshifu [Rapid Strike Style]" → "urshifu-rapid-strike"
 *   "Landorus [Incarnate Forme]" → "landorus"
 *   "Roaring Moon" → "roaringmoon"
 *   "Flutter Mane" → "fluttermane"
 *
 * This does a best-effort normalization. The species_map table provides
 * verified overrides for cases where heuristics fail.
 */
export function normalizeSpecies(raw: string): string {
  // Extract form from brackets: "Species [Form]" → species = "Species", form = "Form"
  const bracketMatch = raw.match(/^(.+?)\s*\[(.+?)\]$/);
  let species = bracketMatch ? bracketMatch[1]!.trim() : raw.trim();
  const form = bracketMatch ? bracketMatch[2]!.trim() : null;

  // Remove all non-alphanumeric except hyphens, lowercase
  species = species.toLowerCase().replace(/[^a-z0-9-]/g, "");

  // Handle form suffixes
  if (form) {
    const formLower = form.toLowerCase();

    // Skip "Incarnate Forme" / "Male" / standard forms (these are the default)
    const skipForms = [
      "incarnate forme",
      "male",
      "standard",
      "normal",
      "aria forme",
      "shield forme",
      "average size",
      "50% forme",
      "land forme",
      "solo form",
    ];
    if (skipForms.some((s) => formLower.includes(s))) {
      return species;
    }

    // Extract the key part of form names for slugs
    const formMap: Record<string, string> = {
      // Ogerpon masks
      "hearthflame mask": "hearthflame",
      "wellspring mask": "wellspring",
      "cornerstone mask": "cornerstone",
      "teal mask": "", // default form
      // Urshifu styles
      "rapid strike style": "rapid-strike",
      "single strike style": "", // default form
      // Therian/alternate formes
      "therian forme": "therian",
      "blade forme": "blade",
      "sky forme": "sky",
      "origin forme": "origin",
      "altered forme": "", // default
      "heat rotom": "heat",
      "wash rotom": "wash",
      "frost rotom": "frost",
      "fan rotom": "fan",
      "mow rotom": "mow",
      // Terapagos
      "terastal form": "terastal",
      "stellar form": "stellar",
      // Other
      "alolan form": "alola",
      "galarian form": "galar",
      "hisuian form": "hisui",
      "paldean form": "paldea",
      bloodmoon: "bloodmoon",
      female: "f",
    };

    const formSuffix = formMap[formLower];
    if (formSuffix !== undefined) {
      return formSuffix ? `${species}-${formSuffix}` : species;
    }

    // Fallback: slugify the form and append
    const sluggedForm = formLower
      .replace(/\s*(forme?|style|mask|form)\s*/gi, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (sluggedForm) {
      return `${species}-${sluggedForm}`;
    }
  }

  return species;
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

  // 1. Delete existing child data for idempotency
  //    (team_pokemon cascades from standings via ON DELETE CASCADE)
  const { error: delStandingsErr } = await supabase
    .schema("rk9")
    .from("standings")
    .delete()
    .eq("event_id", eventId);
  if (delStandingsErr)
    throw new Error(`Delete standings: ${delStandingsErr.message}`);

  // 2. Load species_map for normalization overrides
  const speciesMap = speciesMapOverrides ?? (await loadSpeciesMap(supabase));

  // 3. Upsert players and create standings + team_pokemon
  const playerIdCache = new Map<string, number>();

  for (const entry of roster) {
    // Skip entries without names
    if (!entry.firstName || !entry.lastName) continue;

    // Upsert player — dedup by (player_id_masked, first_name, last_name, country, division)
    const playerId = await resolvePlayer(
      supabase,
      playerIdCache,
      entry.playerIdMasked,
      entry.firstName,
      entry.lastName,
      entry.country,
      entry.division,
      entry.trainerName
    );
    result.playersUpserted++;

    // Insert standing — use upsert to handle duplicate name collisions
    // (two players with same first_name + last_name + country = same player_id,
    // which can violate the standings unique constraint on event_id + player_id + division)
    const { data: standingRow, error: sErr } = await supabase
      .schema("rk9")
      .from("standings")
      .upsert(
        {
          event_id: eventId,
          player_id: playerId,
          division: entry.division,
          placement: entry.placement,
          roster_entry_id: entry.rosterEntryId,
        },
        { onConflict: "event_id,player_id,division" }
      )
      .select("id")
      .single();

    if (sErr) {
      // Skip this entry gracefully — log but don't abort the entire import
      console.warn(
        `[rk9-import] Skipping standing for ${entry.firstName} ${entry.lastName}: ${sErr.message}`
      );
      continue;
    }
    result.standingsInserted++;

    // Insert team_pokemon if we have a team for this player
    if (entry.rosterEntryId && teams[entry.rosterEntryId]) {
      const pokemon = teams[entry.rosterEntryId]!;
      if (pokemon.length > 0) {
        const pokemonRows = pokemon.map((mon, i) => ({
          standing_id: standingRow.id,
          position: i + 1,
          species: resolveSpeciesSlug(mon.speciesRaw, speciesMap),
          species_raw: mon.speciesRaw,
          ability: mon.ability || null,
          held_item: mon.heldItem || null,
          tera_type: mon.teraType || null,
          moves: mon.moves.length > 0 ? mon.moves : null,
        }));

        const { error: pkErr } = await supabase
          .schema("rk9")
          .from("team_pokemon")
          .insert(pokemonRows);

        if (pkErr)
          throw new Error(
            `Team pokemon for ${entry.firstName} ${entry.lastName}: ${pkErr.message}`
          );
        result.pokemonInserted += pokemonRows.length;
        result.teamsInserted++;
      }
    }
  }

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
 * Upsert a player and return the database ID.
 * Uses a local cache to avoid redundant DB round-trips.
 * Dedup key: (player_id_masked, first_name, last_name, country, division)
 */
async function resolvePlayer(
  supabase: SupabaseClient,
  cache: Map<string, number>,
  playerIdMasked: string,
  firstName: string,
  lastName: string,
  country: string,
  division: string,
  trainerName: string
): Promise<number> {
  // Cache key mirrors the unique constraint
  const cacheKey = `${playerIdMasked}|${firstName}|${lastName}|${country}|${division}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const { data: row, error } = await supabase
    .schema("rk9")
    .from("players")
    .upsert(
      {
        player_id_masked: playerIdMasked || "",
        first_name: firstName,
        last_name: lastName,
        country: country || null,
        division: division || "masters",
        trainer_name: trainerName || null,
      },
      { onConflict: "player_id_masked,first_name,last_name,country,division" }
    )
    .select("id")
    .single();

  if (error)
    throw new Error(
      `Player upsert "${firstName} ${lastName}": ${error.message}`
    );

  cache.set(cacheKey, row.id);
  return row.id;
}

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
async function loadSpeciesMap(
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
 * Collect all unique species_raw values from a teams record.
 * Useful for seeding the species_map table.
 */
export function collectUniqueSpecies(
  teams: Record<string, RK9Pokemon[]>
): Map<string, string> {
  const unique = new Map<string, string>();

  for (const pokemon of Object.values(teams).flat()) {
    if (!unique.has(pokemon.speciesRaw)) {
      unique.set(pokemon.speciesRaw, normalizeSpecies(pokemon.speciesRaw));
    }
  }

  return unique;
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
