/**
 * RK9 background worker helpers.
 *
 * Pure library functions for scraping RK9 events — no auth checks, no
 * "use server" directive. Designed to be called by cron routes (service-role
 * client, no user session) and by thin auth-gated server action wrappers.
 *
 * Key exports:
 * - `runRosterStage`  — fetch + insert the player roster for one event
 * - `runTeamsBatch`   — scrape one batch of team lists for one event
 * - `processRk9Queue` — drain the full import queue within a deadline
 */

import { getErrorMessage } from "@trainers/utils";
import type { TypedClient } from "@trainers/supabase";
// Import from the package directly, not via the @/lib/rk9 barrel — index.ts
// re-exports this file, so going through the barrel would create a circular
// import (it breaks under Jest's requireActual and leaves these undefined).
import { importEvent, seedSpeciesMap } from "@trainers/data-sources";

import {
  parseRosterPage,
  parseTeamListPage,
  detectEventFormat,
  formatDetectionNeedsHtml,
} from "@/lib/rk9/scraper";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RK9_BASE_URL = "https://rk9.gg";
/** Abort fetch after 30 s to avoid hanging the worker. */
export const FETCH_TIMEOUT_MS = 30_000;
/** Wait between roster-related HTTP calls so we don't hammer RK9. */
export const DELAY_ROSTER_MS = 1000;
/** Default number of team lists to scrape per batch (overridden by site config). */
export const TEAMS_BATCH_SIZE = 25;

// ---------------------------------------------------------------------------
// Internal helpers (HTTP, validation)
// ---------------------------------------------------------------------------

/** Validate and build a full rk9.gg URL from a path. */
export function buildRk9Url(path: string): string {
  if (!/^\/[\w\-/.]+$/.test(path)) {
    throw new Error(`Invalid RK9 path: ${path}`);
  }
  // Reject path-traversal segments before URL normalization
  if (path.split("/").some((seg) => seg === "." || seg === "..")) {
    throw new Error(`Invalid RK9 path: ${path}`);
  }
  const url = new URL(path, RK9_BASE_URL);
  if (url.origin !== RK9_BASE_URL) {
    throw new Error(`URL origin mismatch: ${url.origin}`);
  }
  return url.href;
}

/** Fetch an RK9 page and return its HTML as a string. */
export async function fetchRk9Html(path: string): Promise<string> {
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

/** Assert the event ID is safe (alphanumeric + hyphens). */
export function assertValidEventId(eventId: string): void {
  if (!/^[\w-]+$/.test(eventId)) {
    throw new Error(`Invalid event ID: ${eventId}`);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Inline species normalization
//
// Single authoritative copy — the actions/rk9.ts duplicate is removed.
// ---------------------------------------------------------------------------

/**
 * Normalize a raw species name from RK9 into a URL-safe species slug.
 * Handles form suffixes (Therian Forme, Alolan, Hisui, etc.) and
 * special cases like Rotom appliances and Ogerpon masks.
 */
export function normalizeSpeciesInline(raw: string): string {
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

// ---------------------------------------------------------------------------
// runRosterStage
// ---------------------------------------------------------------------------

export interface RosterStageResult {
  /** True when the roster was successfully fetched and imported. */
  success: boolean;
  playerCount?: number;
  error?: string;
}

/**
 * Fetch and import the player roster for one RK9 event.
 *
 * Advances import_status:
 * - On entry:  sets status → 'roster'
 * - On success: leaves status as-is (caller or next stage advances further)
 * - On failure: sets status → 'failed', writes import_error, increments import_attempts
 *
 * No auth checks — caller is responsible for ensuring this runs in a trusted context.
 */
export async function runRosterStage(
  supabase: TypedClient,
  eventId: string
): Promise<RosterStageResult> {
  try {
    assertValidEventId(eventId);

    // Mark as in-progress
    const { error: rosterStatusErr } = await supabase
      .schema("rk9")
      .from("events")
      .update({ import_status: "roster", import_error: null })
      .eq("event_id", eventId);
    if (rosterStatusErr) {
      throw new Error(
        `Failed to set roster status for ${eventId}: ${rosterStatusErr.message}`
      );
    }

    // Detect format — only fetch HTML for Champions-era events
    const { data: eventRow, error: dateErr } = await supabase
      .schema("rk9")
      .from("events")
      .select("date_start")
      .eq("event_id", eventId)
      .single();
    if (dateErr) {
      throw new Error(
        `Failed to read date_start for ${eventId}: ${dateErr.message}`
      );
    }
    const dateStart = eventRow?.date_start ?? "";
    let formatId: string | null = null;

    if (formatDetectionNeedsHtml(dateStart)) {
      await sleep(DELAY_ROSTER_MS);
      const tournamentHtml = await fetchRk9Html(`/tournament/${eventId}`);
      formatId = detectEventFormat(tournamentHtml, dateStart);
    } else {
      formatId = detectEventFormat("", dateStart);
    }

    if (formatId) {
      const { error: formatErr } = await supabase
        .schema("rk9")
        .from("events")
        .update({ format_id: formatId })
        .eq("event_id", eventId);
      if (formatErr) {
        throw new Error(
          `Failed to update format_id for ${eventId}: ${formatErr.message}`
        );
      }
    }

    // Fetch and import the roster
    await sleep(DELAY_ROSTER_MS);
    const html = await fetchRk9Html(`/roster/${eventId}`);
    const roster = parseRosterPage(html);
    const result = await importEvent(supabase, eventId, roster, {});

    return { success: true, playerCount: result.standingsInserted };
  } catch (e) {
    const errorMsg = getErrorMessage(e, "Roster scrape failed");

    // Increment attempt counter and mark failed
    const { data: evtRow } = await supabase
      .schema("rk9")
      .from("events")
      .select("import_attempts")
      .eq("event_id", eventId)
      .maybeSingle();

    const prevAttempts = evtRow?.import_attempts ?? 0;

    const { error: statusErr } = await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "failed",
        import_error: errorMsg,
        import_attempts: prevAttempts + 1,
      })
      .eq("event_id", eventId);

    if (statusErr) {
      console.error(
        `[rk9-worker] Failed to write failed status for ${eventId}: ${statusErr.message}`
      );
    }

    return { success: false, error: errorMsg };
  }
}

// ---------------------------------------------------------------------------
// runTeamsBatch
// ---------------------------------------------------------------------------

export interface TeamsBatchOpts {
  batchSize: number;
  concurrency: number;
  force?: boolean;
  /**
   * Unix epoch ms. If set, the worker will not start new fetches after this
   * time. Prevents a single event from consuming the entire cron budget.
   * Worst case without a deadline: 100 teams × 30 s timeout / 3 concurrency ≈ 17 min.
   */
  deadline?: number;
}

export interface TeamsBatchResult {
  done: boolean;
  /** Cumulative standings scraped for the event (includes prior runs). */
  scraped: number;
  /** Standings newly scraped by THIS call — drives progress/no-progress checks. */
  batchScraped: number;
  total: number;
  failed: number;
}

/**
 * Scrape one batch of team lists for a single RK9 event.
 *
 * Call repeatedly until `done === true`. Each call scrapes up to
 * `opts.batchSize` teams (skipping standings with a prior attempt unless
 * `force` is true). Returns progress so the caller can show a progress bar.
 *
 * If `opts.deadline` is set, each concurrent wave is skipped once
 * `Date.now() >= opts.deadline` — returns `done: false` for early exit.
 *
 * No auth checks — caller is responsible.
 */
export async function runTeamsBatch(
  supabase: TypedClient,
  eventId: string,
  opts: TeamsBatchOpts
): Promise<TeamsBatchResult> {
  const { batchSize, concurrency, force = false, deadline } = opts;

  assertValidEventId(eventId);

  // -------------------------------------------------------------------------
  // Fetch all standings (paginated — some events have 1000+ entries)
  // -------------------------------------------------------------------------
  const PAGE_SIZE = 1000;
  const allStandings: Array<{
    id: number;
    roster_entry_id: string | null;
    team_scrape_attempted_at: string | null;
  }> = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error: pageErr } = await supabase
      .schema("rk9")
      .from("standings")
      .select("id, roster_entry_id, team_scrape_attempted_at")
      .eq("event_id", eventId)
      .not("roster_entry_id", "is", null)
      .range(offset, offset + PAGE_SIZE - 1);
    if (pageErr) throw pageErr;
    if (!page?.length) break;
    allStandings.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  // No standings linked yet — decide based on player_count
  if (allStandings.length === 0) {
    const { data: evt, error: evtErr } = await supabase
      .schema("rk9")
      .from("events")
      .select("player_count")
      .eq("event_id", eventId)
      .maybeSingle();

    if (evtErr) {
      console.error(
        `[rk9-worker] player_count lookup failed for ${eventId}: ${evtErr.message}`
      );
      return { done: false, scraped: 0, batchScraped: 0, total: 0, failed: 0 };
    }

    const statusWhenNoStandings =
      (evt?.player_count ?? 0) > 0 ? "teams" : "complete";

    const { error: updateErr } = await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: statusWhenNoStandings,
        import_error: null,
        has_team_lists: false,
        ...(statusWhenNoStandings === "complete"
          ? { imported_at: new Date().toISOString() }
          : {}),
        teams_imported_count: 0,
      })
      .eq("event_id", eventId);

    if (updateErr) {
      console.error(
        `[rk9-worker] Failed to write no-standings status for ${eventId}: ${updateErr.message}`
      );
    }

    return { done: true, scraped: 0, batchScraped: 0, total: 0, failed: 0 };
  }

  // -------------------------------------------------------------------------
  // Determine which standings still need scraping
  // -------------------------------------------------------------------------
  const remaining = force
    ? allStandings
    : allStandings.filter((s) => s.team_scrape_attempted_at == null);

  const total = allStandings.length;
  const alreadyScraped = total - remaining.length;

  // Everything already attempted — finalize the event status
  if (remaining.length === 0) {
    const importedSet = new Set<number>();
    const allIds = allStandings.map((s) => s.id);
    for (let i = 0; i < allIds.length; i += 100) {
      const { data: chunk, error: chunkErr } = await supabase
        .schema("rk9")
        .from("team_pokemon")
        .select("standing_id")
        .in("standing_id", allIds.slice(i, i + 100))
        .limit(1000);
      if (chunkErr) {
        throw new Error(`team_pokemon count query failed: ${chunkErr.message}`);
      }
      for (const row of chunk ?? []) importedSet.add(row.standing_id);
    }
    const importedCount = importedSet.size;
    const allImported = importedCount === total;

    const { error: finalStatusErr } = await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: allImported ? "complete" : "teams",
        import_error: null,
        has_team_lists: importedCount > 0,
        ...(allImported ? { imported_at: new Date().toISOString() } : {}),
        teams_imported_count: importedCount,
      })
      .eq("event_id", eventId);

    if (finalStatusErr) {
      console.error(
        `[rk9-worker] Failed to update final event status: ${finalStatusErr.message}`
      );
    }

    return { done: true, scraped: total, batchScraped: 0, total, failed: 0 };
  }

  // Mark status as "teams" if not already
  const { error: teamsStatusErr } = await supabase
    .schema("rk9")
    .from("events")
    .update({ import_status: "teams", import_error: null })
    .eq("event_id", eventId);
  if (teamsStatusErr) {
    console.error(
      `[rk9-worker] Failed to update event status to teams: ${teamsStatusErr.message}`
    );
  }

  // -------------------------------------------------------------------------
  // Load the species map for normalization
  // -------------------------------------------------------------------------
  const { data: speciesMapRows, error: speciesMapErr } = await supabase
    .schema("rk9")
    .from("species_map")
    .select("raw_name, species_slug");
  if (speciesMapErr) {
    console.warn(
      `[rk9-worker] species_map load failed: ${speciesMapErr.message}`
    );
  }
  const speciesMap = new Map<string, string>();
  for (const row of speciesMapRows ?? []) {
    speciesMap.set(row.raw_name, row.species_slug);
  }

  // -------------------------------------------------------------------------
  // Scrape this batch
  // -------------------------------------------------------------------------
  const batch = remaining.slice(0, batchSize);
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
    stat_alignment: string | null;
    moves: string[] | null;
  }[] = [];
  const processedIds = new Set<number>();

  for (let i = 0; i < batch.length; i += concurrency) {
    // Deadline check — skip this wave if we're past the budget
    if (deadline !== undefined && Date.now() >= deadline) {
      break;
    }

    const chunk = batch.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (standing) => {
        const entryId = standing.roster_entry_id;
        if (!entryId) {
          return {
            rows: [] as typeof allTeamRows,
            newSpeciesEntries: new Map<string, string>(),
            scraped: 0,
            failed: 0,
          };
        }
        if (!/^[\w-]+$/.test(entryId)) {
          console.warn(
            `[rk9-worker] Invalid roster_entry_id for standing ${standing.id}: ${entryId}`
          );
          return {
            rows: [] as typeof allTeamRows,
            newSpeciesEntries: new Map<string, string>(),
            scraped: 0,
            failed: 1,
          };
        }

        try {
          const html = await fetchRk9Html(
            `/teamlist/public/${eventId}/${entryId}`
          );
          const pokemon = parseTeamListPage(html);
          const rows: typeof allTeamRows = [];
          const newSpeciesEntries = new Map<string, string>();

          if (pokemon.length === 0) {
            // Player didn't submit a team list — stamp attempt but no rows
            return { rows, newSpeciesEntries, scraped: 1, failed: 0 };
          }

          for (const [idx, mon] of pokemon.entries()) {
            if (
              !newSpecies.has(mon.speciesRaw) &&
              !speciesMap.has(mon.speciesRaw)
            ) {
              newSpeciesEntries.set(
                mon.speciesRaw,
                normalizeSpeciesInline(mon.speciesRaw)
              );
            }
            rows.push({
              standing_id: standing.id,
              position: idx + 1,
              species:
                speciesMap.get(mon.speciesRaw) ??
                newSpecies.get(mon.speciesRaw) ??
                newSpeciesEntries.get(mon.speciesRaw) ??
                normalizeSpeciesInline(mon.speciesRaw),
              species_raw: mon.speciesRaw,
              ability: mon.ability || null,
              held_item: mon.heldItem || null,
              tera_type: mon.teraType || null,
              stat_alignment: mon.statAlignment ?? null,
              moves: mon.moves.length > 0 ? mon.moves : null,
            });
          }

          return { rows, newSpeciesEntries, scraped: 1, failed: 0 };
        } catch (err) {
          console.warn(
            `[rk9-worker] Fetch failed for standing ${standing.id} (entry ${entryId}): ${err instanceof Error ? err.message : String(err)}`
          );
          return {
            rows: [] as typeof allTeamRows,
            newSpeciesEntries: new Map<string, string>(),
            scraped: 0,
            failed: 1,
          };
        }
      })
    );

    for (let j = 0; j < chunkResults.length; j++) {
      const result = chunkResults[j]!;
      const standing = chunk[j]!;
      allTeamRows.push(...result.rows);
      for (const [raw, slug] of result.newSpeciesEntries) {
        newSpecies.set(raw, slug);
      }
      batchScraped += result.scraped;
      batchFailed += result.failed;
      // Mark this standing as processed whether scrape succeeded or failed
      if (result.scraped > 0 || result.failed > 0) {
        processedIds.add(standing.id);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Bulk insert collected team rows
  // -------------------------------------------------------------------------
  if (allTeamRows.length > 0) {
    const BULK_CHUNK = 200;
    for (let i = 0; i < allTeamRows.length; i += BULK_CHUNK) {
      const chunk = allTeamRows.slice(i, i + BULK_CHUNK);
      const { error } = await supabase
        .schema("rk9")
        .from("team_pokemon")
        .upsert(chunk, { onConflict: "standing_id,position" });
      if (error) {
        throw new Error(
          `[rk9-worker] Team pokemon bulk insert failed: ${error.message}`
        );
      }
    }
  }

  // Stamp attempt timestamp only for standings that were actually processed
  // (not those skipped by deadline). This ensures unprocessed standings are
  // retried on the next pass rather than being silently abandoned.
  const processedIdsList = [...processedIds];
  if (processedIdsList.length === 0) {
    // All standings were skipped by deadline — nothing to stamp
    return {
      done: false,
      scraped: alreadyScraped,
      batchScraped: 0,
      total,
      failed: 0,
    };
  }
  const { error: stampErr } = await supabase
    .schema("rk9")
    .from("standings")
    .update({ team_scrape_attempted_at: new Date().toISOString() })
    .in("id", processedIdsList);
  if (stampErr) {
    throw new Error(
      `Failed to stamp standings as attempted: ${stampErr.message}`
    );
  }

  // Seed new species
  if (newSpecies.size > 0) {
    await seedSpeciesMap(supabase, newSpecies);
  }

  // -------------------------------------------------------------------------
  // Count standings with real team data (accurate import count)
  // -------------------------------------------------------------------------
  const importedSet = new Set<number>();
  const allIds = allStandings.map((s) => s.id);
  for (let i = 0; i < allIds.length; i += 100) {
    const { data: chunk, error: chunkErr } = await supabase
      .schema("rk9")
      .from("team_pokemon")
      .select("standing_id")
      .in("standing_id", allIds.slice(i, i + 100))
      .limit(1000);
    if (chunkErr) {
      console.error(
        `[rk9-worker] team_pokemon count query failed: ${chunkErr.message}`
      );
      break;
    }
    for (const row of chunk ?? []) importedSet.add(row.standing_id);
  }
  const importedCount = importedSet.size;

  const totalScraped = alreadyScraped + batchScraped;
  const allAttempted = totalScraped + batchFailed >= total;
  const allImported = importedCount === total;
  const done = allAttempted;

  const { error: batchStatusErr } = await supabase
    .schema("rk9")
    .from("events")
    .update({
      import_status: allImported ? "complete" : "teams",
      import_error: null,
      has_team_lists: importedCount > 0,
      ...(allImported ? { imported_at: new Date().toISOString() } : {}),
      teams_imported_count: importedCount,
    })
    .eq("event_id", eventId);
  if (batchStatusErr) {
    console.error(
      `[rk9-worker] Failed to update event status: ${batchStatusErr.message}`
    );
  }

  return {
    done,
    scraped: totalScraped,
    batchScraped,
    total,
    failed: batchFailed,
  };
}

// ---------------------------------------------------------------------------
// processRk9Queue
// ---------------------------------------------------------------------------

export interface ProcessRk9QueueOpts {
  /**
   * Unix epoch ms. The loop will not start new work after this time.
   * Set to `Date.now() + 240_000` for a 4-minute cron budget.
   */
  deadline: number;
  /** Teams to scrape per runTeamsBatch call. */
  teamsPerTick: number;
  /** Concurrent team fetches per wave inside runTeamsBatch. */
  concurrency: number;
}

export interface ProcessRk9QueueResult {
  eventsTouched: number;
  teamsScraped: number;
  errors: number;
  remainingQueued: number;
}

/**
 * Drain the RK9 import queue until the deadline or the queue is empty.
 *
 * Pick order:
 * 1. Events with import_status='queued' (import_requested_at ASC, oldest first)
 * 2. Fallback: events with import_status IN ('roster','teams') that need resuming
 *
 * Each event is atomically leased via a conditional UPDATE on worker_claimed_at
 * so two concurrent cron invocations cannot process the same event simultaneously.
 * Stale leases (>10 min old) are automatically reclaimed.
 */
export async function processRk9Queue(
  supabase: TypedClient,
  opts: ProcessRk9QueueOpts
): Promise<ProcessRk9QueueResult> {
  const { deadline, teamsPerTick, concurrency } = opts;
  const stats = { eventsTouched: 0, teamsScraped: 0, errors: 0 };

  const staleCutoff = () => new Date(Date.now() - 10 * 60_000).toISOString();

  while (Date.now() < deadline) {
    // ------------------------------------------------------------------
    // 1. Pick next event from queue
    // ------------------------------------------------------------------
    let pickedEventId: string | null = null;
    let pickedStatus: string | null = null;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Primary: explicitly queued events
    {
      const { data, error } = await supabase
        .schema("rk9")
        .from("events")
        .select("event_id, import_status")
        .eq("import_status", "queued")
        .lte("date_start", today)
        .or(`worker_claimed_at.is.null,worker_claimed_at.lt.${staleCutoff()}`)
        .order("import_requested_at", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(`[rk9-queue] Queue query failed: ${error.message}`);
        stats.errors++;
        break;
      }

      if (data) {
        pickedEventId = data.event_id;
        pickedStatus = data.import_status;
      }
    }

    // Fallback: in-flight roster/teams events
    if (!pickedEventId) {
      const { data, error } = await supabase
        .schema("rk9")
        .from("events")
        .select("event_id, import_status")
        .in("import_status", ["roster", "teams"])
        .or(`worker_claimed_at.is.null,worker_claimed_at.lt.${staleCutoff()}`)
        .order("import_requested_at", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          `[rk9-queue] Fallback queue query failed: ${error.message}`
        );
        stats.errors++;
        break;
      }

      if (data) {
        pickedEventId = data.event_id;
        pickedStatus = data.import_status;
      }
    }

    if (!pickedEventId) {
      // Queue is empty
      break;
    }

    // ------------------------------------------------------------------
    // 2. Atomic lease claim — conditional UPDATE prevents double-processing
    // ------------------------------------------------------------------
    const { data: claimed, error: claimErr } = await supabase
      .schema("rk9")
      .from("events")
      .update({ worker_claimed_at: new Date().toISOString() })
      .eq("event_id", pickedEventId)
      .or(`worker_claimed_at.is.null,worker_claimed_at.lt.${staleCutoff()}`)
      .select("event_id")
      .maybeSingle();

    if (claimErr) {
      console.error(
        `[rk9-queue] Claim failed for ${pickedEventId}: ${claimErr.message}`
      );
      stats.errors++;
      continue;
    }

    if (!claimed) {
      // Contested — another worker grabbed it, try next
      continue;
    }

    const eventId = pickedEventId;

    try {
      // ------------------------------------------------------------------
      // 3. Roster stage (only for freshly queued events)
      // ------------------------------------------------------------------
      if (pickedStatus === "queued") {
        // Check attempt count — give up after 3 failures
        const { data: evtRow } = await supabase
          .schema("rk9")
          .from("events")
          .select("import_attempts")
          .eq("event_id", eventId)
          .maybeSingle();

        const attempts = evtRow?.import_attempts ?? 0;
        if (attempts >= 3) {
          await supabase
            .schema("rk9")
            .from("events")
            .update({
              import_status: "failed",
              import_error: "Gave up after 3 attempts",
              worker_claimed_at: null,
            })
            .eq("event_id", eventId);
          stats.errors++;
          continue;
        }

        const rosterResult = await runRosterStage(supabase, eventId);

        if (!rosterResult.success) {
          // runRosterStage already wrote the failed status — release lease
          await supabase
            .schema("rk9")
            .from("events")
            .update({ worker_claimed_at: null })
            .eq("event_id", eventId);
          stats.errors++;
          continue;
        }

        // Re-read status after roster stage
        const { data: afterRoster } = await supabase
          .schema("rk9")
          .from("events")
          .select("import_status")
          .eq("event_id", eventId)
          .maybeSingle();

        if (afterRoster?.import_status === "failed") {
          await supabase
            .schema("rk9")
            .from("events")
            .update({ worker_claimed_at: null })
            .eq("event_id", eventId);
          stats.errors++;
          continue;
        }
      }

      // ------------------------------------------------------------------
      // 4. Teams stage loop
      // ------------------------------------------------------------------
      let noProgress = 0;

      while (Date.now() < deadline) {
        const r = await runTeamsBatch(supabase, eventId, {
          batchSize: teamsPerTick,
          concurrency,
          deadline,
        });

        // batchScraped is the per-call count; `scraped` is cumulative for the
        // event (includes prior runs), so it can never hit 0 on a resumed
        // event and must not drive the progress checks.
        stats.teamsScraped += r.batchScraped;

        // Heartbeat — extend the lease so it doesn't go stale mid-scrape
        await supabase
          .schema("rk9")
          .from("events")
          .update({ worker_claimed_at: new Date().toISOString() })
          .eq("event_id", eventId);

        if (r.done) break;

        // Track no-progress passes (all-failure or completely stuck)
        if (r.batchScraped === 0) {
          noProgress++;
          if (noProgress >= 3) {
            // No team-scrape progress after 3 consecutive batches. This is a
            // terminal condition for the current attempt — mirror the queued-stage
            // max-attempts ceiling (3) used above: if attempts has reached the cap,
            // mark the event 'failed' (retryable via failed→queued requeue);
            // otherwise leave the row at 'teams' so the next tick can retry.
            const { data: stuckRow, error: stuckReadErr } = await supabase
              .schema("rk9")
              .from("events")
              .select("import_attempts")
              .eq("event_id", eventId)
              .maybeSingle();

            if (stuckReadErr) {
              console.error(
                `[rk9-queue] Failed to read import_attempts for stuck event ${eventId}: ${stuckReadErr.message}`
              );
            }

            const prevAttempts = stuckRow?.import_attempts ?? 0;
            const newAttempts = prevAttempts + 1;

            const noProgressError =
              "No team-scrape progress after 3 consecutive batches";

            const noProgressStatus = newAttempts >= 3 ? "failed" : "teams";

            const { error: noProgressUpdateErr } = await supabase
              .schema("rk9")
              .from("events")
              .update({
                import_status: noProgressStatus,
                import_error: noProgressError,
                import_attempts: newAttempts,
              })
              .eq("event_id", eventId);

            if (noProgressUpdateErr) {
              console.error(
                `[rk9-queue] Failed to write no-progress status for ${eventId}: ${noProgressUpdateErr.message}`
              );
            }

            break;
          }
        } else {
          noProgress = 0;
        }
      }
    } finally {
      // Always release the lease
      await supabase
        .schema("rk9")
        .from("events")
        .update({ worker_claimed_at: null })
        .eq("event_id", eventId);
    }

    stats.eventsTouched++;
  }

  // Count remaining queued events for the response summary
  const { count: remainingCount, error: countErr } = await supabase
    .schema("rk9")
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("import_status", "queued");

  if (countErr) {
    console.error(
      `[rk9-queue] Remaining count query failed: ${countErr.message}`
    );
  }

  return {
    ...stats,
    remainingQueued: remainingCount ?? 0,
  };
}
