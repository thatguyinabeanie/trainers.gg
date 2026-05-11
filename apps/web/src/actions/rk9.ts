"use server";

import { getErrorMessage } from "@trainers/utils";
import type { ActionResult } from "@trainers/validators";
import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import {
  parseEventsPage,
  parseRosterPage,
  parseTeamListPage,
} from "@/lib/rk9/scraper";
import { syncEvents, importEvent, seedSpeciesMap } from "@/lib/rk9/import";
import type { RK9Event } from "@/lib/rk9/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RK9_BASE_URL = "https://rk9.gg";
const FETCH_TIMEOUT_MS = 30_000;
const DELAY_TEAM_MS = 1500;
const DELAY_ROSTER_MS = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertSafeRk9Path(path: string): void {
  // Path must start with / and contain only safe URL characters
  if (!/^\/[\w\-/.]+$/.test(path)) {
    throw new Error(`Invalid RK9 path: ${path}`);
  }
}

async function fetchRk9Html(path: string): Promise<string> {
  assertSafeRk9Path(path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${RK9_BASE_URL}${path}`, {
      headers: {
        "User-Agent": "trainers.gg-rk9-scraper/1.0 (data import)",
        Accept: "text/html",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

/** RK9 event IDs are alphanumeric with hyphens */
function assertValidEventId(eventId: string): void {
  if (!/^[\w-]+$/.test(eventId)) {
    throw new Error(`Invalid event ID: ${eventId}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Action: Discover events from rk9.gg/events/pokemon
// ---------------------------------------------------------------------------

export async function discoverRk9Events(): Promise<
  ActionResult & { events?: RK9Event[] }
> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const html = await fetchRk9Html("/events/pokemon");
    const events = parseEventsPage(html);

    // Sync to database
    const supabase = createServiceRoleClient();
    await syncEvents(supabase, events);

    return { success: true, events };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to discover events"),
    };
  }
}

// ---------------------------------------------------------------------------
// Action: Scrape roster for a single event
// ---------------------------------------------------------------------------

export async function scrapeRk9Roster(
  eventId: string
): Promise<ActionResult & { playerCount?: number }> {
  try {
    assertValidEventId(eventId);
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const supabase = createServiceRoleClient();

    // Update status to "roster"
    await supabase
      .schema("rk9")
      .from("events")
      .update({ import_status: "roster", import_error: null })
      .eq("event_id", eventId);

    await sleep(DELAY_ROSTER_MS);
    const html = await fetchRk9Html(`/roster/${eventId}`);
    const roster = parseRosterPage(html);

    // Import roster (without teams)
    const result = await importEvent(supabase, eventId, roster, {});

    return { success: true, playerCount: result.standingsInserted };
  } catch (e) {
    // Mark event as failed
    const supabase = createServiceRoleClient();
    await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "failed",
        import_error: getErrorMessage(e, "Roster scrape failed"),
      })
      .eq("event_id", eventId);

    return {
      success: false,
      error: getErrorMessage(e, "Failed to scrape roster"),
    };
  }
}

// ---------------------------------------------------------------------------
// Action: Scrape teams for a single event (long-running)
// ---------------------------------------------------------------------------

export async function scrapeRk9Teams(
  eventId: string
): Promise<
  ActionResult & { teamsImported?: number; pokemonImported?: number }
> {
  try {
    assertValidEventId(eventId);
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const supabase = createServiceRoleClient();

    // Update status
    await supabase
      .schema("rk9")
      .from("events")
      .update({ import_status: "teams", import_error: null })
      .eq("event_id", eventId);

    // Get roster from DB to find roster_entry_ids
    const { data: standings, error: standingsErr } = await supabase
      .schema("rk9")
      .from("standings")
      .select("id, roster_entry_id")
      .eq("event_id", eventId)
      .not("roster_entry_id", "is", null);

    if (standingsErr) throw standingsErr;
    if (!standings || standings.length === 0) {
      return { success: true, teamsImported: 0, pokemonImported: 0 };
    }

    // Load species map for normalization
    const { data: speciesMapRows } = await supabase
      .schema("rk9")
      .from("species_map")
      .select("raw_name, species_slug");
    const speciesMap = new Map<string, string>();
    for (const row of speciesMapRows ?? []) {
      speciesMap.set(row.raw_name, row.species_slug);
    }

    // Scrape team lists one by one with rate limiting
    let teamsImported = 0;
    let pokemonImported = 0;
    const allSpecies = new Map<string, string>();

    for (const standing of standings) {
      const entryId = standing.roster_entry_id;
      if (!entryId) continue;

      try {
        await sleep(DELAY_TEAM_MS);
        const html = await fetchRk9Html(
          `/teamlist/public/${eventId}/${entryId}`
        );
        const pokemon = parseTeamListPage(html);

        if (pokemon.length > 0) {
          // Delete existing team_pokemon for this standing
          await supabase
            .schema("rk9")
            .from("team_pokemon")
            .delete()
            .eq("standing_id", standing.id);

          // Resolve species and insert
          const pokemonRows = pokemon.map((mon, i) => {
            // Track unique species for seeding
            if (!allSpecies.has(mon.speciesRaw)) {
              const slug =
                speciesMap.get(mon.speciesRaw) ??
                normalizeSpeciesInline(mon.speciesRaw);
              allSpecies.set(mon.speciesRaw, slug);
            }

            return {
              standing_id: standing.id,
              position: i + 1,
              species:
                speciesMap.get(mon.speciesRaw) ??
                normalizeSpeciesInline(mon.speciesRaw),
              species_raw: mon.speciesRaw,
              ability: mon.ability || null,
              held_item: mon.heldItem || null,
              tera_type: mon.teraType || null,
              moves: mon.moves.length > 0 ? mon.moves : null,
            };
          });

          const { error: pkErr } = await supabase
            .schema("rk9")
            .from("team_pokemon")
            .insert(pokemonRows);

          if (!pkErr) {
            teamsImported++;
            pokemonImported += pokemonRows.length;
          }
        }
      } catch {
        // Individual team fetch failures are non-fatal — continue
      }
    }

    // Seed species map with newly discovered species
    if (allSpecies.size > 0) {
      await seedSpeciesMap(supabase, allSpecies);
    }

    // Mark complete
    await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "complete",
        import_error: null,
        has_team_lists: teamsImported > 0,
        imported_at: new Date().toISOString(),
      })
      .eq("event_id", eventId);

    return { success: true, teamsImported, pokemonImported };
  } catch (e) {
    const supabase = createServiceRoleClient();
    await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "failed",
        import_error: getErrorMessage(e, "Team scrape failed"),
      })
      .eq("event_id", eventId);

    return {
      success: false,
      error: getErrorMessage(e, "Failed to scrape teams"),
    };
  }
}

// ---------------------------------------------------------------------------
// Inline species normalization (duplicated from import.ts to avoid
// importing the full module in the server action bundle)
// ---------------------------------------------------------------------------

function normalizeSpeciesInline(raw: string): string {
  const bracketMatch = raw.match(/^(.+?)\s*\[(.+?)\]$/);
  let species = bracketMatch ? bracketMatch[1].trim() : raw.trim();
  const form = bracketMatch ? bracketMatch[2].trim() : null;

  species = species.toLowerCase().replace(/[^a-z0-9-]/g, "");

  if (form) {
    const formLower = form.toLowerCase();
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
    if (skipForms.some((s) => formLower.includes(s))) return species;

    const formMap: Record<string, string> = {
      "hearthflame mask": "hearthflame",
      "wellspring mask": "wellspring",
      "cornerstone mask": "cornerstone",
      "teal mask": "",
      "rapid strike style": "rapid-strike",
      "single strike style": "",
      "therian forme": "therian",
      "blade forme": "blade",
      "sky forme": "sky",
      "origin forme": "origin",
      "altered forme": "",
      "heat rotom": "heat",
      "wash rotom": "wash",
      "frost rotom": "frost",
      "fan rotom": "fan",
      "mow rotom": "mow",
      "terastal form": "terastal",
      "stellar form": "stellar",
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

    const sluggedForm = formLower
      .replace(/\s*(forme?|style|mask|form)\s*/gi, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (sluggedForm) return `${species}-${sluggedForm}`;
  }

  return species;
}
