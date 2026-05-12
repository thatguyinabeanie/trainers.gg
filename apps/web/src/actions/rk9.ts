"use server";

import { getErrorMessage } from "@trainers/utils";
import type { ActionResult } from "@trainers/validators";
import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import {
  parseEventsPage,
  parseArchivedEventsPage,
  parseRosterPage,
  parseTeamListPage,
  detectEventFormat,
  formatDetectionNeedsHtml,
} from "@/lib/rk9/scraper";
import { syncEvents, importEvent, seedSpeciesMap } from "@/lib/rk9/import";
import type { RK9Event } from "@/lib/rk9/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RK9_BASE_URL = "https://rk9.gg";
const WAYBACK_BASE_URL = "https://web.archive.org";
const WAYBACK_CDX_URL = "https://web.archive.org/cdx/search/cdx";
const FETCH_TIMEOUT_MS = 30_000;
const DELAY_TEAM_MS = 1500;
const DELAY_ROSTER_MS = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRk9Url(path: string): string {
  // Path must start with / and contain only safe URL characters
  if (!/^\/[\w\-/.]+$/.test(path)) {
    throw new Error(`Invalid RK9 path: ${path}`);
  }
  const url = new URL(path, RK9_BASE_URL);
  // Verify the constructed URL still points to rk9.gg (prevents open-redirect SSRF)
  if (url.origin !== RK9_BASE_URL) {
    throw new Error(`URL origin mismatch: ${url.origin}`);
  }
  return url.href;
}

async function fetchRk9Html(path: string): Promise<string> {
  const url = buildRk9Url(path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
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

/**
 * Fetch an archived page from the Wayback Machine.
 *
 * Uses the `id_` flag in the URL to get raw content without the Wayback
 * toolbar wrapper, which would interfere with HTML parsing.
 *
 * @param timestamp - Wayback snapshot timestamp (e.g., "20220809")
 * @param path - Original path on rk9.gg (e.g., "/events/pokemon")
 */
async function fetchWaybackHtml(
  timestamp: string,
  path: string
): Promise<string> {
  // Validate timestamp is numeric
  if (!/^\d{8,14}$/.test(timestamp)) {
    throw new Error(`Invalid Wayback timestamp: ${timestamp}`);
  }
  // Validate path starts with /
  if (!path.startsWith("/")) {
    throw new Error(`Path must start with /: ${path}`);
  }

  const url = `${WAYBACK_BASE_URL}/web/${timestamp}id_/https://rk9.gg${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "trainers.gg-rk9-scraper/1.0 (archival data recovery)",
        Accept: "text/html",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Wayback HTTP ${response.status}: ${response.statusText} (timestamp=${timestamp})`
      );
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

/**
 * Query the Wayback CDX API to discover all available snapshots of
 * rk9.gg/events/pokemon. Returns timestamps (14-digit strings) for
 * successful (HTTP 200) captures.
 */
async function fetchWaybackSnapshots(): Promise<string[]> {
  const params = new URLSearchParams({
    url: "rk9.gg/events/pokemon",
    output: "json",
    fl: "timestamp,statuscode",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${WAYBACK_CDX_URL}?${params}`, {
      headers: {
        "User-Agent": "trainers.gg-rk9-scraper/1.0 (archival data recovery)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`CDX API HTTP ${response.status}: ${response.statusText}`);
    }

    const rows = (await response.json()) as string[][];
    // First row is headers ["timestamp", "statuscode"], rest are data
    return rows
      .slice(1)
      .filter(([, status]) => status === "200")
      .map(([ts]) => ts!);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Pick one representative snapshot per competitive season from a list of
 * timestamps. Maximizes coverage by selecting the latest snapshot in each
 * season window (Sep–Aug).
 *
 * A competitive season runs Sep of year N to Aug of year N+1.
 * We label it by the ending year (e.g., "2023" = Sep 2022 – Aug 2023).
 */
function pickSnapshotsPerSeason(timestamps: string[]): string[] {
  // Group by season
  const bySeason = new Map<string, string[]>();

  for (const ts of timestamps) {
    const year = parseInt(ts.slice(0, 4), 10);
    const month = parseInt(ts.slice(4, 6), 10);
    // Season label: if month >= 9, it's the NEXT year's season
    const season = month >= 9 ? String(year + 1) : String(year);
    const existing = bySeason.get(season) ?? [];
    existing.push(ts);
    bySeason.set(season, existing);
  }

  // Pick the latest timestamp from each season (most complete data)
  const picks: string[] = [];
  for (const [, seasonTimestamps] of bySeason) {
    seasonTimestamps.sort();
    picks.push(seasonTimestamps[seasonTimestamps.length - 1]!);
  }

  return picks.sort();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Action: Discover events from live RK9 + Wayback Machine archive
// ---------------------------------------------------------------------------

/**
 * Discover all VG tournament events by fetching from two sources:
 * 1. Live rk9.gg/events/pokemon (current season)
 * 2. Wayback Machine archived snapshots (all historical seasons via CDX API)
 *
 * Fully re-runnable for disaster recovery — no hardcoded IDs or timestamps.
 * The CDX API dynamically discovers available archive snapshots, then we pick
 * one per season for maximum coverage with minimal requests.
 */
export async function discoverRk9Events(): Promise<
  ActionResult & { events?: RK9Event[]; sources?: { live: number; archive: number } }
> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const allEvents: RK9Event[] = [];
    let liveCount = 0;
    let archiveCount = 0;

    // Source 1: Live RK9 events page (current season)
    try {
      const html = await fetchRk9Html("/events/pokemon");
      const liveEvents = parseEventsPage(html);
      allEvents.push(...liveEvents);
      liveCount = liveEvents.length;
    } catch (e) {
      // Live fetch failing shouldn't block archive recovery
      console.warn("[discoverRk9Events] Live RK9 fetch failed:", getErrorMessage(e, "unknown"));
    }

    // Source 2: Wayback Machine (all historical seasons)
    try {
      const snapshots = await fetchWaybackSnapshots();
      const picks = pickSnapshotsPerSeason(snapshots);

      for (const timestamp of picks) {
        try {
          const html = await fetchWaybackHtml(timestamp, "/events/pokemon");
          const archivedEvents = parseArchivedEventsPage(html);
          allEvents.push(...archivedEvents);
          archiveCount += archivedEvents.length;
        } catch (e) {
          // Individual snapshot failure shouldn't abort the whole process
          console.warn(
            `[discoverRk9Events] Wayback snapshot ${timestamp} failed:`,
            getErrorMessage(e, "unknown")
          );
        }
      }
    } catch (e) {
      // CDX API failure shouldn't block if live succeeded
      console.warn("[discoverRk9Events] Wayback CDX query failed:", getErrorMessage(e, "unknown"));
    }

    if (allEvents.length === 0) {
      return {
        success: false,
        error: "No events discovered from either live RK9 or Wayback archive",
      };
    }

    // Deduplicate by eventId (later entries win — live data takes priority
    // over archive since allEvents has live first, then archive appended)
    // Actually reverse: archive is appended after live, so live should win.
    // Use a Map that preserves first-seen (live data).
    const deduped = new Map<string, RK9Event>();
    for (const event of allEvents) {
      if (!deduped.has(event.eventId)) {
        deduped.set(event.eventId, event);
      }
    }
    const uniqueEvents = Array.from(deduped.values());

    // Upsert to database
    const supabase = createServiceRoleClient();
    await syncEvents(supabase, uniqueEvents);

    return {
      success: true,
      data: undefined,
      events: uniqueEvents,
      sources: { live: liveCount, archive: archiveCount },
    };
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

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();

    // Update status to "roster"
    await supabase
      .schema("rk9")
      .from("events")
      .update({ import_status: "roster", import_error: null })
      .eq("event_id", eventId);

    // Detect format — use calendar directly when possible, only fetch
    // tournament page HTML for Champions-era events that need disambiguation
    const { data: eventRow } = await supabase
      .schema("rk9")
      .from("events")
      .select("date_start")
      .eq("event_id", eventId)
      .single();
    const dateStart = eventRow?.date_start ?? "";
    let formatId: string | null = null;

    if (formatDetectionNeedsHtml(dateStart)) {
      // Champions era — need HTML to distinguish SV vs Champions
      await sleep(DELAY_ROSTER_MS);
      const tournamentHtml = await fetchRk9Html(`/tournament/${eventId}`);
      formatId = detectEventFormat(tournamentHtml, dateStart);
    } else {
      // Pre-Champions — calendar is authoritative, no HTTP needed
      formatId = detectEventFormat("", dateStart);
    }
    if (formatId) {
      await supabase
        .schema("rk9")
        .from("events")
        .update({ format_id: formatId })
        .eq("event_id", eventId);
    }

    // Fetch roster page
    await sleep(DELAY_ROSTER_MS);
    const html = await fetchRk9Html(`/roster/${eventId}`);
    const roster = parseRosterPage(html);

    // Import roster (without teams)
    const result = await importEvent(supabase, eventId, roster, {});

    return {
      success: true,
      data: undefined,
      playerCount: result.standingsInserted,
    };
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
// Action: Scrape teams for a single event (chunked — call repeatedly)
// ---------------------------------------------------------------------------

const TEAMS_BATCH_SIZE = 25;

/**
 * Scrape a batch of team lists for an event.
 *
 * Call this repeatedly until `done === true`. Each call scrapes up to
 * TEAMS_BATCH_SIZE teams, skipping standings that already have team_pokemon.
 * Returns progress so the client can show a progress bar.
 */
export async function scrapeRk9TeamsBatch(eventId: string): Promise<
  ActionResult & {
    done?: boolean;
    scraped?: number;
    total?: number;
    failed?: number;
  }
> {
  try {
    assertValidEventId(eventId);
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();

    // Get all standings with roster_entry_ids
    const { data: allStandings, error: standingsErr } = await supabase
      .schema("rk9")
      .from("standings")
      .select("id, roster_entry_id")
      .eq("event_id", eventId)
      .not("roster_entry_id", "is", null);

    if (standingsErr) throw standingsErr;
    if (!allStandings || allStandings.length === 0) {
      await supabase
        .schema("rk9")
        .from("events")
        .update({
          import_status: "complete",
          import_error: null,
          has_team_lists: false,
          imported_at: new Date().toISOString(),
        })
        .eq("event_id", eventId);
      return { success: true, data: undefined, done: true, scraped: 0, total: 0, failed: 0 };
    }

    // Find standings that DON'T have team_pokemon yet
    const { data: withTeams } = await supabase
      .schema("rk9")
      .from("team_pokemon")
      .select("standing_id")
      .in(
        "standing_id",
        allStandings.map((s) => s.id)
      );

    const standingsWithTeams = new Set(
      (withTeams ?? []).map((t) => t.standing_id)
    );
    const remaining = allStandings.filter((s) => !standingsWithTeams.has(s.id));

    const total = allStandings.length;
    const alreadyScraped = total - remaining.length;

    // If nothing remaining, we're done
    if (remaining.length === 0) {
      // Mark event complete
      await supabase
        .schema("rk9")
        .from("events")
        .update({
          import_status: "complete",
          import_error: null,
          has_team_lists: true,
          imported_at: new Date().toISOString(),
        })
        .eq("event_id", eventId);

      return { success: true, data: undefined, done: true, scraped: total, total, failed: 0 };
    }

    // Update status to "teams" if not already
    await supabase
      .schema("rk9")
      .from("events")
      .update({ import_status: "teams", import_error: null })
      .eq("event_id", eventId);

    // Load species map
    const { data: speciesMapRows } = await supabase
      .schema("rk9")
      .from("species_map")
      .select("raw_name, species_slug");
    const speciesMap = new Map<string, string>();
    for (const row of speciesMapRows ?? []) {
      speciesMap.set(row.raw_name, row.species_slug);
    }

    // Process this batch
    const batch = remaining.slice(0, TEAMS_BATCH_SIZE);
    let batchScraped = 0;
    let batchFailed = 0;
    const newSpecies = new Map<string, string>();
    const allTeamRows: {
      standing_id: number;
      position: number;
      species: string;
      species_raw: string;
      ability: string | null;
      held_item: string | null;
      tera_type: string | null;
      moves: string[] | null;
    }[] = [];

    for (const standing of batch) {
      const entryId = standing.roster_entry_id;
      if (!entryId) continue;

      try {
        await sleep(DELAY_TEAM_MS);
        const html = await fetchRk9Html(
          `/teamlist/public/${eventId}/${entryId}`
        );
        const pokemon = parseTeamListPage(html);

        if (pokemon.length > 0) {
          const pokemonRows = pokemon.map((mon, i) => {
            if (
              !newSpecies.has(mon.speciesRaw) &&
              !speciesMap.has(mon.speciesRaw)
            ) {
              newSpecies.set(
                mon.speciesRaw,
                normalizeSpeciesInline(mon.speciesRaw)
              );
            }
            return {
              standing_id: standing.id,
              position: i + 1,
              species:
                speciesMap.get(mon.speciesRaw) ??
                newSpecies.get(mon.speciesRaw) ??
                normalizeSpeciesInline(mon.speciesRaw),
              species_raw: mon.speciesRaw,
              ability: mon.ability || null,
              held_item: mon.heldItem || null,
              tera_type: mon.teraType || null,
              moves: mon.moves.length > 0 ? mon.moves : null,
            };
          });

          allTeamRows.push(...pokemonRows);
          batchScraped++;
        } else {
          batchScraped++;
        }
      } catch {
        batchFailed++;
      }
    }

    // Bulk-insert all collected team pokemon rows
    if (allTeamRows.length > 0) {
      const BULK_CHUNK = 200;
      for (let i = 0; i < allTeamRows.length; i += BULK_CHUNK) {
        const chunk = allTeamRows.slice(i, i + BULK_CHUNK);
        const { error } = await supabase
          .schema("rk9")
          .from("team_pokemon")
          .insert(chunk);
        if (error) {
          console.error(`Team pokemon bulk insert chunk failed: ${error.message}`);
        }
      }
    }

    // Seed new species
    if (newSpecies.size > 0) {
      await seedSpeciesMap(supabase, newSpecies);
    }

    const totalScraped = alreadyScraped + batchScraped;
    const done = totalScraped >= total;

    // If this batch finished everything, mark complete
    if (done) {
      await supabase
        .schema("rk9")
        .from("events")
        .update({
          import_status: "complete",
          import_error: null,
          has_team_lists: true,
          imported_at: new Date().toISOString(),
        })
        .eq("event_id", eventId);
    }

    return {
      success: true,
      data: undefined,
      done,
      scraped: totalScraped,
      total,
      failed: batchFailed,
    };
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
  let species = bracketMatch ? bracketMatch[1]!.trim() : raw.trim();
  const form = bracketMatch ? bracketMatch[2]!.trim() : null;

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
