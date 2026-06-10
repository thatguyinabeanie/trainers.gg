"use server";

import { getErrorMessage } from "@trainers/utils";
import type { ActionResult } from "@trainers/validators";
import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import { getSiteConfig } from "@/actions/site-config";
import {
  parseEventsPage,
  parseArchivedEventsPage,
  parseTeamListPage,
} from "@/lib/rk9/scraper";
import { syncEvents } from "@/lib/rk9";
import type { RK9Event } from "@/lib/rk9";
import {
  fetchRk9Html,
  assertValidEventId,
  normalizeSpeciesInline,
  runRosterStage,
  runTeamsBatch,
  FETCH_TIMEOUT_MS,
  TEAMS_BATCH_SIZE,
} from "@/lib/rk9/worker";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WAYBACK_BASE_URL = "https://web.archive.org";
const WAYBACK_CDX_URL = "https://web.archive.org/cdx/search/cdx";

// ---------------------------------------------------------------------------
// Helpers (Wayback-specific — only used by discoverRk9Events)
// ---------------------------------------------------------------------------

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
  if (!/^\d{8,14}$/.test(timestamp)) {
    throw new Error(`Invalid Wayback timestamp: ${timestamp}`);
  }
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
      throw new Error(
        `CDX API HTTP ${response.status}: ${response.statusText}`
      );
    }

    const rows = (await response.json()) as string[][];
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
 */
function pickSnapshotsPerSeason(timestamps: string[]): string[] {
  const bySeason = new Map<string, string[]>();

  for (const ts of timestamps) {
    const year = parseInt(ts.slice(0, 4), 10);
    const month = parseInt(ts.slice(4, 6), 10);
    const season = month >= 9 ? String(year + 1) : String(year);
    const existing = bySeason.get(season) ?? [];
    existing.push(ts);
    bySeason.set(season, existing);
  }

  const picks: string[] = [];
  for (const [, seasonTimestamps] of bySeason) {
    seasonTimestamps.sort();
    picks.push(seasonTimestamps[seasonTimestamps.length - 1]!);
  }

  return picks.sort();
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
  ActionResult<void> & {
    events?: RK9Event[];
    sources?: { live: number; archive: number };
  }
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
      console.warn(
        "[discoverRk9Events] Live RK9 fetch failed:",
        getErrorMessage(e, "unknown")
      );
    }

    // Source 2: Wayback Machine (all historical seasons)
    const FALLBACK_SNAPSHOTS: string[] = [
      "20220801120000",
      "20230801120000",
      "20240801120000",
      "20250601120000",
    ];

    let snapshotPicks: string[] = [];
    try {
      const snapshots = await fetchWaybackSnapshots();
      snapshotPicks = pickSnapshotsPerSeason(snapshots);
    } catch (e) {
      console.warn(
        "[discoverRk9Events] Wayback CDX query failed, using fallback timestamps:",
        getErrorMessage(e, "unknown")
      );
      snapshotPicks = FALLBACK_SNAPSHOTS;
    }

    if (snapshotPicks.length > 0) {
      const coveredSeasons = new Set(
        snapshotPicks.map((ts) => {
          const year = parseInt(ts.slice(0, 4), 10);
          const month = parseInt(ts.slice(4, 6), 10);
          return month >= 9 ? String(year + 1) : String(year);
        })
      );
      for (const fallback of FALLBACK_SNAPSHOTS) {
        const year = parseInt(fallback.slice(0, 4), 10);
        const month = parseInt(fallback.slice(4, 6), 10);
        const season = month >= 9 ? String(year + 1) : String(year);
        if (!coveredSeasons.has(season)) {
          snapshotPicks.push(fallback);
        }
      }
    }

    for (const timestamp of snapshotPicks) {
      try {
        const html = await fetchWaybackHtml(timestamp, "/events/pokemon");
        const archivedEvents = parseArchivedEventsPage(html);
        allEvents.push(...archivedEvents);
        archiveCount += archivedEvents.length;
      } catch (e) {
        console.warn(
          `[discoverRk9Events] Wayback snapshot ${timestamp} failed:`,
          getErrorMessage(e, "unknown")
        );
      }
    }

    if (allEvents.length === 0) {
      return {
        success: false,
        error: "No events discovered from either live RK9 or Wayback archive",
      };
    }

    // Deduplicate by eventId — live data wins (first-seen)
    const deduped = new Map<string, RK9Event>();
    for (const event of allEvents) {
      if (!deduped.has(event.eventId)) {
        deduped.set(event.eventId, event);
      }
    }
    const uniqueEvents = Array.from(deduped.values());

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
// Action: Scrape roster for a single event (thin wrapper over runRosterStage)
// ---------------------------------------------------------------------------

export async function scrapeRk9Roster(
  eventId: string
): Promise<ActionResult<void> & { playerCount?: number }> {
  try {
    assertValidEventId(eventId);
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();
    const result = await runRosterStage(supabase, eventId);

    if (!result.success) {
      return { success: false, error: result.error ?? "Roster scrape failed" };
    }

    return { success: true, data: undefined, playerCount: result.playerCount };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to scrape roster"),
    };
  }
}

// ---------------------------------------------------------------------------
// Action: Scrape teams for a single event (thin wrapper over runTeamsBatch)
// ---------------------------------------------------------------------------

/**
 * Scrape a batch of team lists for an event.
 *
 * Call this repeatedly until `done === true`. Each call scrapes up to
 * batchSize teams (read from site config, defaulting to TEAMS_BATCH_SIZE),
 * skipping standings that already have team_pokemon.
 * Returns progress so the client can show a progress bar.
 */
export async function scrapeRk9TeamsBatch(
  eventId: string,
  options?: { force?: boolean }
): Promise<
  ActionResult<void> & {
    done?: boolean;
    scraped?: number;
    total?: number;
    failed?: number;
  }
> {
  const { force = false } = options ?? {};

  try {
    assertValidEventId(eventId);
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    // Read batch size and concurrency from site config, fall back to defaults
    const [batchSizeResult, concurrencyResult] = await Promise.all([
      getSiteConfig<number>("rk9_max_teams_per_tick"),
      getSiteConfig<number>("rk9_team_concurrency"),
    ]);
    const batchSize = Math.max(
      1,
      batchSizeResult.success && batchSizeResult.data
        ? batchSizeResult.data
        : TEAMS_BATCH_SIZE
    );
    const concurrency = Math.max(
      1,
      concurrencyResult.success && concurrencyResult.data
        ? concurrencyResult.data
        : 3
    );

    const supabase = createServiceRoleClient();
    const result = await runTeamsBatch(supabase, eventId, {
      batchSize,
      concurrency,
      force,
    });

    return {
      success: true,
      data: undefined,
      done: result.done,
      scraped: result.scraped,
      total: result.total,
      failed: result.failed,
    };
  } catch (e) {
    const supabase = createServiceRoleClient();
    const { error: statusErr } = await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "failed",
        import_error: getErrorMessage(e, "Team scrape failed"),
      })
      .eq("event_id", eventId);
    if (statusErr) {
      console.error(
        `[rk9-teams] Failed to update event status to failed: ${statusErr.message}`
      );
    }

    return {
      success: false,
      error: getErrorMessage(e, "Failed to scrape teams"),
    };
  }
}

// ---------------------------------------------------------------------------
// Action: Scrape team list for a single standing
// ---------------------------------------------------------------------------

/**
 * Scrape one player's team list by standing ID and roster entry ID.
 * Useful for retrying failed or empty individual scrapes.
 */
export async function scrapeRk9TeamForStanding(
  eventId: string,
  standingId: number,
  rosterEntryId: string
): Promise<ActionResult<void>> {
  try {
    assertValidEventId(eventId);
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };
    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();

    // Load species map for normalization
    const { data: speciesMapRows, error: speciesMapErr } = await supabase
      .schema("rk9")
      .from("species_map")
      .select("raw_name, species_slug");
    if (speciesMapErr) {
      console.warn(
        `[rk9-teams] species_map load failed: ${speciesMapErr.message}`
      );
    }
    const speciesMap = new Map<string, string>();
    for (const row of speciesMapRows ?? []) {
      speciesMap.set(row.raw_name, row.species_slug);
    }

    const html = await fetchRk9Html(
      `/teamlist/public/${eventId}/${rosterEntryId}`
    );
    const pokemon = parseTeamListPage(html);

    if (pokemon.length > 0) {
      const rows = pokemon.map((mon, i) => ({
        standing_id: standingId,
        position: i + 1,
        species:
          speciesMap.get(mon.speciesRaw) ??
          normalizeSpeciesInline(mon.speciesRaw),
        species_raw: mon.speciesRaw,
        ability: mon.ability || null,
        held_item: mon.heldItem || null,
        tera_type: mon.teraType || null,
        stat_alignment: mon.statAlignment ?? null,
        moves: mon.moves.length > 0 ? mon.moves : null,
      }));

      const { error: upsertErr } = await supabase
        .schema("rk9")
        .from("team_pokemon")
        .upsert(rows, { onConflict: "standing_id,position" });
      if (upsertErr) {
        throw new Error(`team_pokemon upsert failed: ${upsertErr.message}`);
      }
    }

    await supabase
      .schema("rk9")
      .from("standings")
      .update({ team_scrape_attempted_at: new Date().toISOString() })
      .eq("id", standingId);

    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to scrape team"),
    };
  }
}

// ---------------------------------------------------------------------------
// Action: Queue management
// ---------------------------------------------------------------------------

/**
 * Queue a single RK9 event for background import.
 *
 * Applies a conditional update: only events currently at `import_status IN
 * ('pending', 'failed')` are moved to `'queued'`. Events already at
 * `'roster'`, `'teams'`, or `'completed'` are left untouched — the worker
 * handles in-flight states, and there is no benefit to re-queuing them.
 *
 * @returns `{ queued: 1 }` when the event was queued, `{ queued: 0 }` if it
 *   was already in-flight/completed or not found.
 */
export async function queueRk9Event(
  eventId: string
): Promise<ActionResult<{ queued: number }>> {
  try {
    assertValidEventId(eventId);
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();

    const { data: updated, error } = await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "queued",
        import_requested_at: new Date().toISOString(),
        import_error: null,
        import_attempts: 0,
      })
      .eq("event_id", eventId)
      .in("import_status", ["pending", "failed"])
      .select("event_id");

    if (error) throw error;
    return { success: true, data: { queued: updated?.length ?? 0 } };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to queue event"),
    };
  }
}

/**
 * Batch-queue multiple RK9 events for background import.
 *
 * Same conditional semantics as `queueRk9Event`: only events at
 * `'pending'` or `'failed'` are moved to `'queued'`. Events already
 * in-flight (`'roster'`, `'teams'`) or `'completed'` are untouched.
 *
 * Chunks IDs into batches of ≤100 to stay under the PostgREST URI limit.
 * Throws on any chunk error so the caller sees a hard failure rather than
 * a silent partial-update.
 */
export async function batchQueueRk9Events(
  eventIds: string[]
): Promise<ActionResult<{ queued: number }>> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    if (eventIds.length === 0) {
      return { success: true, data: { queued: 0 } };
    }

    const supabase = createServiceRoleClient();
    const CHUNK_SIZE = 100; // PostgREST .in() filter is encoded in the URL — keep under 100
    let totalQueued = 0;

    for (let i = 0; i < eventIds.length; i += CHUNK_SIZE) {
      const chunk = eventIds.slice(i, i + CHUNK_SIZE);

      const { data: updated, error } = await supabase
        .schema("rk9")
        .from("events")
        .update({
          import_status: "queued",
          import_requested_at: new Date().toISOString(),
          import_error: null,
          import_attempts: 0,
        })
        .in("event_id", chunk)
        .in("import_status", ["pending", "failed"])
        .select("event_id");

      if (error) throw error;
      totalQueued += updated?.length ?? 0;
    }

    return { success: true, data: { queued: totalQueued } };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to batch queue events"),
    };
  }
}

/**
 * Un-queue RK9 events by resetting their import state back to `'pending'`.
 *
 * - When `eventIds` is provided: only un-queue the given IDs (chunked into
 *   batches of ≤100 to stay under the PostgREST URI limit). Only rows
 *   currently at `import_status = 'queued'` are affected.
 * - When `eventIds` is omitted: un-queue ALL rows with `import_status = 'queued'`
 *   in a single update.
 */
export async function unqueueRk9Events(
  eventIds?: string[]
): Promise<ActionResult<{ unqueued: number }>> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();
    const CHUNK_SIZE = 100; // PostgREST .in() filter is encoded in the URL — keep under 100

    if (!eventIds) {
      // No ids given — un-queue everything currently queued in one shot.
      const { data: updated, error } = await supabase
        .schema("rk9")
        .from("events")
        .update({
          import_status: "pending",
          import_requested_at: null,
        })
        .eq("import_status", "queued")
        .select("event_id");

      if (error) throw error;
      return { success: true, data: { unqueued: updated?.length ?? 0 } };
    }

    if (eventIds.length === 0) {
      return { success: true, data: { unqueued: 0 } };
    }

    let totalUnqueued = 0;

    for (let i = 0; i < eventIds.length; i += CHUNK_SIZE) {
      const chunk = eventIds.slice(i, i + CHUNK_SIZE);

      const { data: updated, error } = await supabase
        .schema("rk9")
        .from("events")
        .update({
          import_status: "pending",
          import_requested_at: null,
        })
        .in("event_id", chunk)
        .eq("import_status", "queued")
        .select("event_id");

      if (error) throw error;
      totalUnqueued += updated?.length ?? 0;
    }

    return { success: true, data: { unqueued: totalUnqueued } };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to un-queue events"),
    };
  }
}

/**
 * Recover RK9 events stuck mid-import due to worker crashes or timeouts.
 *
 * "Stuck" means one of two conditions:
 * (a) `worker_claimed_at` is older than 10 minutes — the lease has expired.
 *     These rows have their lease cleared (`worker_claimed_at = null`) so the
 *     next worker poll can re-claim them.
 * (b) Events at `import_status = 'roster'` with `import_requested_at` set and
 *     a now-cleared or stale lease — they were partially imported and abandoned.
 *     These are moved back to `'queued'` so the worker re-enters the roster stage.
 *
 * Returns the total number of rows affected across both updates.
 */
export async function resetStuckRk9Events(): Promise<
  ActionResult<{ reset: number }>
> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // (a) Clear stale leases — worker_claimed_at older than 10 minutes
    const { data: clearedLeases, error: leaseErr } = await supabase
      .schema("rk9")
      .from("events")
      .update({ worker_claimed_at: null })
      .lt("worker_claimed_at", tenMinutesAgo)
      .select("event_id");

    if (leaseErr) throw leaseErr;

    // (b) Move stuck 'roster' events (import_requested_at set, no active lease)
    // back to 'queued' so the worker re-picks them up
    const { data: requeued, error: requeueErr } = await supabase
      .schema("rk9")
      .from("events")
      .update({ import_status: "queued" })
      .eq("import_status", "roster")
      .not("import_requested_at", "is", null)
      .is("worker_claimed_at", null)
      .select("event_id");

    if (requeueErr) throw requeueErr;

    const total = (clearedLeases?.length ?? 0) + (requeued?.length ?? 0);
    return { success: true, data: { reset: total } };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to reset stuck events"),
    };
  }
}

/**
 * Re-queue all permanently-failed RK9 events for a fresh import attempt.
 *
 * Use this after a scraping bug is fixed or RK9 was temporarily unreachable.
 * Clears the failure state and resets the attempt counter so the worker gives
 * each event a full retry budget from scratch.
 */
export async function requeueFailedRk9Events(): Promise<
  ActionResult<{ requeued: number }>
> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();

    const { data: updated, error } = await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "queued",
        import_attempts: 0,
        import_error: null,
        import_requested_at: new Date().toISOString(),
      })
      .eq("import_status", "failed")
      .select("event_id");

    if (error) throw error;
    return { success: true, data: { requeued: updated?.length ?? 0 } };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to re-queue failed events"),
    };
  }
}

// ---------------------------------------------------------------------------
// Action: Reset all roster and team data for an event
// ---------------------------------------------------------------------------

/**
 * Delete all standings (cascades to team_pokemon) and reset the event back
 * to pending so it can be re-imported from scratch.
 */
export async function resetRk9EventData(
  eventId: string
): Promise<ActionResult<void>> {
  try {
    assertValidEventId(eventId);
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };
    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();

    const { error: standingsErr } = await supabase
      .schema("rk9")
      .from("standings")
      .delete()
      .eq("event_id", eventId);
    if (standingsErr) throw standingsErr;

    const { error: resetErr } = await supabase
      .schema("rk9")
      .from("events")
      .update({
        import_status: "pending",
        has_team_lists: false,
        teams_imported_count: 0,
        import_error: null,
      })
      .eq("event_id", eventId);
    if (resetErr) {
      throw new Error(`Failed to reset event status: ${resetErr.message}`);
    }

    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to reset event"),
    };
  }
}
