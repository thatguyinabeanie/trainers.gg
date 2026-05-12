/**
 * RK9 Worker Cron
 *
 * Single smart cron that processes RK9 event data one step at a time.
 * Runs every 5 minutes. Each invocation performs ONE unit of work:
 *
 *   Priority 1: Discover events (if last discovery > 24h ago)
 *   Priority 2: Scrape roster for oldest eligible event
 *              (date_end < today AND status = 'pending')
 *   Priority 3: Scrape one team batch (25 teams) for oldest event
 *              (status = 'roster' OR status = 'teams')
 *   Priority 4: Nothing to do — exit
 *
 * This gradual approach is respectful to RK9 servers and fits within
 * Vercel's 300s execution limit. A full event (roster + ~800 teams)
 * takes roughly 32 cron invocations (~2.5 hours at 5min intervals).
 *
 * Authorization: Vercel cron token via `CRON_SECRET` env var.
 *
 * GET /api/cron/rk9-worker
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCronAuth } from "@/lib/cron-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  parseEventsPage,
  parseRosterPage,
  parseTeamListPage,
  detectEventFormat,
  formatDetectionNeedsHtml,
} from "@/lib/rk9/scraper";
import { syncEvents, importEvent, seedSpeciesMap, normalizeSpecies } from "@/lib/rk9/import";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RK9_BASE_URL = "https://rk9.gg";
const FETCH_TIMEOUT_MS = 30_000;
const DELAY_TEAM_MS = 1500;
const DELAY_ROSTER_MS = 1000;
const TEAMS_BATCH_SIZE = 25;

// How often to re-discover events (24 hours)
const DISCOVERY_INTERVAL_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRk9Url(path: string): string {
  if (!/^\/[\w\-/.]+$/.test(path)) {
    throw new Error(`Invalid RK9 path: ${path}`);
  }
  const url = new URL(path, RK9_BASE_URL);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Work units
// ---------------------------------------------------------------------------

type WorkResult =
  | { action: "discover"; eventsFound: number }
  | { action: "roster"; eventId: string; eventName: string; players: number }
  | { action: "teams"; eventId: string; eventName: string; scraped: number; total: number; done: boolean; failed: number }
  | { action: "idle" };

/**
 * Priority 1: Discover events if last discovery was > 24h ago.
 * Uses the most recently imported_at timestamp on any event as a proxy.
 */
async function tryDiscoverEvents(
  supabase: SupabaseClient
): Promise<WorkResult | null> {
  // Check when we last synced events — use the latest imported_at across all events
  // If no events exist at all, always discover
  const { data: latestEvent } = await supabase
    .schema("rk9")
    .from("events")
    .select("imported_at")
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestEvent) {
    const lastSync = new Date(latestEvent.imported_at).getTime();
    const now = Date.now();
    if (now - lastSync < DISCOVERY_INTERVAL_MS) {
      return null; // Discovery not needed yet
    }
  }

  // Fetch events page and sync
  const html = await fetchRk9Html("/events/pokemon");
  const events = parseEventsPage(html);
  await syncEvents(supabase, events);

  console.log(`[rk9-worker] Discovered ${events.length} events`);
  return { action: "discover", eventsFound: events.length };
}

/**
 * Priority 2: Scrape roster for the oldest event that has ended
 * and hasn't been imported yet.
 */
async function tryImportRoster(
  supabase: SupabaseClient
): Promise<WorkResult | null> {
  // Find oldest event where:
  //   - date_start has passed (event has started — use date_end if available)
  //   - import_status is 'pending'
  const today = new Date().toISOString().slice(0, 10);

  const { data: event } = await supabase
    .schema("rk9")
    .from("events")
    .select("event_id, name, date_start, date_end")
    .eq("import_status", "pending")
    .lte("date_start", today)
    .order("date_start", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!event) return null;

  // If event has a date_end, don't scrape until after it ends
  if (event.date_end && event.date_end > today) {
    return null; // Event still in progress
  }

  console.log(`[rk9-worker] Importing roster for: ${event.name}`);

  // Mark as in-progress
  await supabase
    .schema("rk9")
    .from("events")
    .update({ import_status: "roster", import_error: null })
    .eq("event_id", event.event_id);

  try {
    // Detect format — use calendar directly when possible, only fetch
    // tournament page HTML for Champions-era events that need disambiguation
    let formatId: string | null = null;

    if (formatDetectionNeedsHtml(event.date_start)) {
      // Champions era — need HTML to distinguish SV vs Champions
      await sleep(DELAY_ROSTER_MS);
      const tournamentHtml = await fetchRk9Html(`/tournament/${event.event_id}`);
      formatId = detectEventFormat(tournamentHtml, event.date_start);
    } else {
      // Pre-Champions — calendar is authoritative, no HTTP needed
      formatId = detectEventFormat("", event.date_start);
    }

    // Store format_id on the event
    if (formatId) {
      await supabase
        .schema("rk9")
        .from("events")
        .update({ format_id: formatId })
        .eq("event_id", event.event_id);
    }

    // Fetch roster page
    await sleep(DELAY_ROSTER_MS);
    const html = await fetchRk9Html(`/roster/${event.event_id}`);
    const roster = parseRosterPage(html);

    // Import roster (no teams)
    const result = await importEvent(supabase, event.event_id, roster, {});

    console.log(
      `[rk9-worker] Roster imported: ${event.name} — ${result.playersUpserted} players, ${result.standingsInserted} standings`
    );

    return {
      action: "roster",
      eventId: event.event_id,
      eventName: event.name,
      players: result.standingsInserted,
    };
  } catch (err) {
    // Mark event as failed so the worker moves on to the next event
    const errorMsg = err instanceof Error ? err.message : "Roster import failed";
    console.error(`[rk9-worker] Roster failed for ${event.name}: ${errorMsg}`);
    await supabase
      .schema("rk9")
      .from("events")
      .update({ import_status: "failed", import_error: errorMsg })
      .eq("event_id", event.event_id);

    return {
      action: "roster",
      eventId: event.event_id,
      eventName: event.name,
      players: 0,
    };
  }
}

/**
 * Priority 3: Scrape one batch of teams for the oldest event
 * that has roster data but incomplete team data.
 */
async function tryImportTeamBatch(
  supabase: SupabaseClient
): Promise<WorkResult | null> {
  // Find oldest event where status is 'roster' or 'teams' (team scraping eligible)
  const { data: event } = await supabase
    .schema("rk9")
    .from("events")
    .select("event_id, name")
    .in("import_status", ["roster", "teams"])
    .order("date_start", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!event) return null;

  console.log(`[rk9-worker] Scraping team batch for: ${event.name}`);

  // Get all standings with roster_entry_ids
  const { data: allStandings, error: standingsErr } = await supabase
    .schema("rk9")
    .from("standings")
    .select("id, roster_entry_id")
    .eq("event_id", event.event_id)
    .not("roster_entry_id", "is", null);

  if (standingsErr) throw standingsErr;
  if (!allStandings || allStandings.length === 0) {
    // No standings with entry IDs — mark complete
    await supabase
      .schema("rk9")
      .from("events")
      .update({ import_status: "complete", import_error: null, has_team_lists: false })
      .eq("event_id", event.event_id);
    return { action: "teams", eventId: event.event_id, eventName: event.name, scraped: 0, total: 0, done: true, failed: 0 };
  }

  // Find standings that don't have team_pokemon yet (batch in chunks to avoid long URLs)
  const standingsWithTeams = new Set<number>();
  const standingIds = allStandings.map((s) => s.id);
  for (let i = 0; i < standingIds.length; i += 100) {
    const chunk = standingIds.slice(i, i + 100);
    const { data: withTeams } = await supabase
      .schema("rk9")
      .from("team_pokemon")
      .select("standing_id")
      .in("standing_id", chunk);

    for (const row of withTeams ?? []) {
      standingsWithTeams.add(row.standing_id);
    }
  }

  const remaining = allStandings.filter((s) => !standingsWithTeams.has(s.id));

  const total = allStandings.length;
  const alreadyScraped = total - remaining.length;

  // If nothing remaining, mark complete
  if (remaining.length === 0) {
    await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "complete",
        import_error: null,
        has_team_lists: true,
        imported_at: new Date().toISOString(),
      })
      .eq("event_id", event.event_id);

    return { action: "teams", eventId: event.event_id, eventName: event.name, scraped: total, total, done: true, failed: 0 };
  }

  // Update status to "teams" if not already
  await supabase
    .schema("rk9")
    .from("events")
    .update({ import_status: "teams", import_error: null })
    .eq("event_id", event.event_id);

  // Load species map
  const { data: speciesMapRows } = await supabase
    .schema("rk9")
    .from("species_map")
    .select("raw_name, species_slug");
  const speciesMap = new Map<string, string>();
  for (const row of speciesMapRows ?? []) {
    speciesMap.set(row.raw_name, row.species_slug);
  }

  // Process batch
  const batch = remaining.slice(0, TEAMS_BATCH_SIZE);
  let batchScraped = 0;
  let batchFailed = 0;
  const newSpecies = new Map<string, string>();

  for (const standing of batch) {
    const entryId = standing.roster_entry_id;
    if (!entryId) continue;

    try {
      await sleep(DELAY_TEAM_MS);
      const html = await fetchRk9Html(
        `/teamlist/public/${event.event_id}/${entryId}`
      );
      const pokemon = parseTeamListPage(html);

      if (pokemon.length > 0) {
        const pokemonRows = pokemon.map((mon, i) => {
          if (!newSpecies.has(mon.speciesRaw) && !speciesMap.has(mon.speciesRaw)) {
            newSpecies.set(mon.speciesRaw, normalizeSpecies(mon.speciesRaw));
          }
          return {
            standing_id: standing.id,
            position: i + 1,
            species:
              speciesMap.get(mon.speciesRaw) ??
              newSpecies.get(mon.speciesRaw) ??
              normalizeSpecies(mon.speciesRaw),
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

        if (!pkErr) batchScraped++;
        else batchFailed++;
      }
    } catch {
      batchFailed++;
    }
  }

  // Seed new species into species_map
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
      .eq("event_id", event.event_id);
  }

  console.log(
    `[rk9-worker] Teams batch: ${event.name} — ${totalScraped}/${total} (${batchFailed} failed this batch)${done ? " — COMPLETE" : ""}`
  );

  return {
    action: "teams",
    eventId: event.event_id,
    eventName: event.name,
    scraped: totalScraped,
    total,
    done,
    failed: batchFailed,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const maxDuration = 300; // Vercel Pro: 5 minutes max

export async function GET(request: Request): Promise<Response> {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();

  try {
    // Try work in priority order
    let result: WorkResult;

    const discoverResult = await tryDiscoverEvents(supabase);
    if (discoverResult) {
      result = discoverResult;
    } else {
      const rosterResult = await tryImportRoster(supabase);
      if (rosterResult) {
        result = rosterResult;
      } else {
        const teamsResult = await tryImportTeamBatch(supabase);
        if (teamsResult) {
          result = teamsResult;
        } else {
          result = { action: "idle" };
          console.log("[rk9-worker] Nothing to do — idle");
        }
      }
    }

    return Response.json({ success: true, data: result });
  } catch (err) {
    console.error("[rk9-worker]", err);

    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Worker failed",
      },
      { status: 500 }
    );
  }
}
