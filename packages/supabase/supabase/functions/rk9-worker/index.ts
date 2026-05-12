/**
 * RK9 Worker Edge Function
 *
 * Single smart cron that processes RK9 event data one step at a time.
 * Called every 5 minutes via pg_cron. Each invocation performs ONE unit of work:
 *
 *   Priority 1: Discover events (if last discovery > 24h ago)
 *   Priority 2: Scrape roster for oldest eligible event
 *              (date_end < today AND status = 'pending')
 *   Priority 3: Scrape one team batch (25 teams) for oldest event
 *              (status = 'roster' OR status = 'teams')
 *   Priority 4: Nothing to do — exit
 *
 * Auth: Requires service role key (called by pg_cron, not user-facing).
 *
 * POST /functions/v1/rk9-worker
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  getChampionsFormatForDate,
  getSvFormatForDate,
} from "@trainers/pokemon/regulation-calendar";

// ---------------------------------------------------------------------------
// Environment & clients
// ---------------------------------------------------------------------------

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RK9_BASE_URL = "https://rk9.gg";
const FETCH_TIMEOUT_MS = 30_000;
const DELAY_TEAM_MS = 1500;
const DELAY_ROSTER_MS = 1000;
const DEFAULT_MAX_TEAMS_PER_TICK = 100;
const DEFAULT_TEAM_CONCURRENCY = 3;
const DISCOVERY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

async function getConfigNumber(
  supabase: SupabaseClient,
  key: string,
  fallback: number
): Promise<number> {
  const { data } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (data && typeof data.value === "number") return data.value;
  return fallback;
}

// ---------------------------------------------------------------------------
// HTTP helpers
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
// Types
// ---------------------------------------------------------------------------

type RK9EventTier = "regional" | "international" | "special" | "worlds";
type RK9Division = "masters" | "senior" | "junior";

interface RK9Event {
  eventId: string;
  name: string;
  dateStart: string;
  dateEnd: string | null;
  locationCity: string;
  locationCountry: string;
  tier: RK9EventTier;
}

interface RK9RosterEntry {
  playerIdMasked: string;
  firstName: string;
  lastName: string;
  country: string;
  division: RK9Division;
  trainerName: string;
  rosterEntryId: string | null;
  placement: number | null;
}

interface RK9Pokemon {
  speciesRaw: string;
  teraType: string | null;
  ability: string;
  heldItem: string;
  moves: string[];
}

type WorkResult =
  | { action: "discover"; eventsFound: number }
  | { action: "roster"; eventId: string; eventName: string; players: number }
  | {
      action: "teams";
      eventId: string;
      eventName: string;
      scraped: number;
      total: number;
      done: boolean;
      failed: number;
    }
  | { action: "idle" }
  | { action: "skipped"; reason: string };

// ---------------------------------------------------------------------------
// Cron interval helper
// ---------------------------------------------------------------------------

/**
 * Check whether enough time has passed since the last cron run.
 * If the interval hasn't elapsed, returns a skipped WorkResult.
 * If it has (or last_run is null), updates last_run_at and returns null.
 */
async function checkCronInterval(
  supabase: SupabaseClient,
  intervalKey: string,
  lastRunKey: string,
  defaultIntervalSeconds: number,
  sourceLabel: string
): Promise<WorkResult | null> {
  const intervalSeconds = await getConfigNumber(supabase, intervalKey, defaultIntervalSeconds);
  const { data: lastRunRow } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", lastRunKey)
    .maybeSingle();

  if (lastRunRow && typeof lastRunRow.value === "string") {
    const lastRun = new Date(lastRunRow.value).getTime();
    const elapsed = Date.now() - lastRun;
    if (elapsed < intervalSeconds * 1000) {
      const remaining = Math.round(intervalSeconds - elapsed / 1000);
      console.log(`[${sourceLabel}] Skipping — next run in ~${remaining}s (interval: ${intervalSeconds}s)`);
      return { action: "skipped", reason: `interval not elapsed (${remaining}s remaining)` };
    }
  }

  // Update last_run_at
  await supabase.from("site_config").upsert(
    { key: lastRunKey, value: new Date().toISOString() },
    { onConflict: "key" }
  );

  return null;
}

// ---------------------------------------------------------------------------
// Scraper: Events page (/events/pokemon)
// ---------------------------------------------------------------------------

function parseEventsPage(html: string): RK9Event[] {
  const $ = cheerio.load(html);
  const events: RK9Event[] = [];

  const tables: Array<{ selector: string }> = [
    { selector: "#dtUpcomingEvents" },
    { selector: "#dtPastEvents" },
  ];

  for (const { selector } of tables) {
    const $table = $(selector);
    if (!$table.length) continue;

    $table.find("tbody tr").each((_i, row) => {
      const $row = $(row);
      const $cells = $row.find("td");
      if ($cells.length < 5) return;

      const $linksCell = $cells.last();
      const $vgLink = $linksCell
        .find('a[href*="/tournament/"]')
        .filter((_j, el) => {
          const text = $(el).text().trim();
          return text === "VG" || $(el).find('img[src*="pokemon-vg"]').length > 0;
        });

      if (!$vgLink.length) return;

      const href = $vgLink.attr("href") ?? "";
      const tournamentIdMatch = href.match(/\/tournament\/(.+)$/);
      if (!tournamentIdMatch?.[1]) return;
      const eventId = tournamentIdMatch[1];

      const dateRaw = $cells.eq(0).text().trim();
      const name = $cells.eq(2).find("a").first().text().trim();
      const locationRaw = $cells.eq(3).text().trim();

      const locationParts = locationRaw.split(",").map((s) => s.trim());
      const locationCity = locationParts[0] ?? "";
      const locationCountry = locationParts[1] ?? "";

      const tier = deriveTier(name);
      const { dateStart, dateEnd } = parseDateRange(dateRaw);

      events.push({
        eventId,
        name,
        dateStart,
        dateEnd,
        locationCity,
        locationCountry,
        tier,
      });
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Scraper: Roster page (/roster/{eventId})
// ---------------------------------------------------------------------------

function parseRosterPage(html: string): RK9RosterEntry[] {
  const $ = cheerio.load(html);
  const entries: RK9RosterEntry[] = [];

  const $table = $("#dtLiveRoster");
  if (!$table.length) return entries;

  // Build column map from headers
  const colMap = {
    playerIdMasked: -1,
    firstName: -1,
    lastName: -1,
    country: -1,
    division: -1,
    trainerName: -1,
    teamList: -1,
    standing: -1,
  };

  $table.find("thead th").each((i, th) => {
    const text = $(th).text().trim().toLowerCase();
    if (text.includes("player id")) colMap.playerIdMasked = i;
    else if (text.includes("first name")) colMap.firstName = i;
    else if (text.includes("last name")) colMap.lastName = i;
    else if (text === "country") colMap.country = i;
    else if (text === "division") colMap.division = i;
    else if (text.includes("trainer")) colMap.trainerName = i;
    else if (text.includes("team list")) colMap.teamList = i;
    else if (text.includes("standing")) colMap.standing = i;
  });

  // Fallback positional layout
  if (colMap.playerIdMasked === -1) colMap.playerIdMasked = 0;
  if (colMap.firstName === -1) colMap.firstName = 1;
  if (colMap.lastName === -1) colMap.lastName = 2;
  if (colMap.country === -1) colMap.country = 3;
  if (colMap.division === -1) colMap.division = 4;
  if (colMap.trainerName === -1) colMap.trainerName = 5;
  if (colMap.teamList === -1) colMap.teamList = 6;
  if (colMap.standing === -1) colMap.standing = 7;

  $table.find("tbody tr").each((_i, row) => {
    const $row = $(row);
    const $cells = $row.find("td");
    if ($cells.length < 4) return;

    const getCellText = (idx: number): string => {
      if (idx < 0) return "";
      const el = $cells.get(idx);
      if (!el) return "";
      return $(el).text().trim();
    };

    const playerIdMasked = getCellText(colMap.playerIdMasked);
    const firstName = getCellText(colMap.firstName);
    const lastName = getCellText(colMap.lastName);
    const country = getCellText(colMap.country);
    const divisionRaw = getCellText(colMap.division);
    const trainerName = getCellText(colMap.trainerName);

    // Parse division
    const divLower = divisionRaw.toLowerCase().trim();
    let division: RK9Division = "masters";
    if (divLower.includes("senior")) division = "senior";
    else if (divLower.includes("junior")) division = "junior";

    // Extract roster entry ID from team list link
    let rosterEntryId: string | null = null;
    if (colMap.teamList >= 0) {
      const $teamCell = $cells.eq(colMap.teamList);
      const teamHref = $teamCell.find("a").attr("href") ?? "";
      const entryMatch = teamHref.match(/\/teamlist\/public\/[^/]+\/(.+)$/);
      if (entryMatch?.[1]) rosterEntryId = entryMatch[1];
    }

    // Extract placement
    let placement: number | null = null;
    if (colMap.standing >= 0) {
      const parsed = parseInt(getCellText(colMap.standing), 10);
      if (!isNaN(parsed)) placement = parsed;
    }

    if (!firstName || !lastName) return;

    entries.push({
      playerIdMasked,
      firstName,
      lastName,
      country,
      division,
      trainerName,
      rosterEntryId,
      placement,
    });
  });

  return entries;
}

// ---------------------------------------------------------------------------
// Scraper: Team list page (/teamlist/public/{eventId}/{rosterEntryId})
// ---------------------------------------------------------------------------

function parseTeamListPage(html: string): RK9Pokemon[] {
  const $ = cheerio.load(html);
  const pokemon: RK9Pokemon[] = [];

  const $english = $("#lang-EN");
  if (!$english.length) return pokemon;

  $english.find("div.pokemon").each((_i, block) => {
    const $block = $(block);
    const blockHtml = $block.html() ?? "";

    // Extract species: text between </img> and first <b>
    const speciesRaw = extractSpeciesFromBlock(blockHtml);

    // Extract labeled values
    const teraType = extractLabeledValue(blockHtml, "Tera Type");
    const ability = extractLabeledValue(blockHtml, "Ability");
    const heldItem = extractLabeledValue(blockHtml, "Held Item");

    // Extract moves
    const moves: string[] = [];
    $block.find("span.badge").each((_j, badge) => {
      const moveText = $(badge).text().trim();
      if (moveText) moves.push(moveText);
    });

    if (!speciesRaw) return;

    pokemon.push({
      speciesRaw,
      teraType: teraType || null,
      ability: ability || "",
      heldItem: heldItem || "",
      moves,
    });
  });

  return pokemon;
}

function extractSpeciesFromBlock(html: string): string {
  const withoutImg = html.replace(/<img[^>]*>/gi, "");
  const beforeBold = withoutImg.split(/<b>/i)[0] ?? "";

  let text = beforeBold;
  const TAG_PATTERN = /<\/?[a-z][^>]*>/gi;
  let previous: string;
  do {
    previous = text;
    text = text.replace(TAG_PATTERN, "");
  } while (text !== previous);

  text = text
    .replace(/<[^>]*$/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

function extractLabeledValue(blockHtml: string, label: string): string {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<b>${escapedLabel}:?</b>\\s*([^<]+)`, "i");
  const match = blockHtml.match(regex);
  if (!match?.[1]) return "";
  return match[1].replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

function formatDetectionNeedsHtml(dateStart: string): boolean {
  return dateStart >= "2026-05-01";
}

function detectEventFormat(html: string, dateStart: string): string | null {
  if (!dateStart) return null;

  const isChampionsEra = dateStart >= "2026-05-01";
  if (isChampionsEra && html) {
    const $ = cheerio.load(html);
    const isChampions = $('img[src*="pokemon-vg-champions"]').length > 0;
    if (isChampions) {
      return getChampionsFormatForDate(dateStart);
    }
  }

  return getSvFormatForDate(dateStart);
}

// ---------------------------------------------------------------------------
// Species normalization
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

// ---------------------------------------------------------------------------
// Date parsing helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function parseDate(month: string, day: string, year: string): string {
  const monthIndex = MONTH_NAMES.indexOf(month.toLowerCase().slice(0, 3));
  if (monthIndex === -1) return "";
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(parseInt(day, 10)).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function parseDateRange(raw: string): { dateStart: string; dateEnd: string | null } {
  const cleaned = raw.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();

  // "Month Day-Day, Year"
  const singleMonthRange = cleaned.match(/^(\w+)\s+(\d+)-(\d+),?\s+(\d{4})$/);
  if (singleMonthRange) {
    const [, month, startDay, endDay, year] = singleMonthRange;
    return { dateStart: parseDate(month!, startDay!, year!), dateEnd: parseDate(month!, endDay!, year!) };
  }

  // "Month Day-Month Day, Year"
  const crossMonthRange = cleaned.match(/^(\w+)\s+(\d+)-(\w+)\s+(\d+),?\s+(\d{4})$/);
  if (crossMonthRange) {
    const [, month1, day1, month2, day2, year] = crossMonthRange;
    return { dateStart: parseDate(month1!, day1!, year!), dateEnd: parseDate(month2!, day2!, year!) };
  }

  // "Month Day, Year"
  const singleDay = cleaned.match(/^(\w+)\s+(\d+),?\s+(\d{4})$/);
  if (singleDay) {
    const [, month, day, year] = singleDay;
    return { dateStart: parseDate(month!, day!, year!), dateEnd: null };
  }

  return { dateStart: "", dateEnd: null };
}

function deriveTier(name: string): RK9EventTier {
  const lower = name.toLowerCase();
  if (lower.includes("world")) return "worlds";
  if (lower.includes("international")) return "international";
  if (lower.includes("special")) return "special";
  return "regional";
}

// ---------------------------------------------------------------------------
// DB import helpers
// ---------------------------------------------------------------------------

async function syncEvents(supabase: SupabaseClient, events: RK9Event[]): Promise<void> {
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

async function importRoster(
  supabase: SupabaseClient,
  eventId: string,
  roster: RK9RosterEntry[]
): Promise<{ playersUpserted: number; standingsInserted: number }> {
  let playersUpserted = 0;
  let standingsInserted = 0;

  // Delete existing standings for idempotency (cascade deletes team_pokemon)
  await supabase.schema("rk9").from("standings").delete().eq("event_id", eventId);

  const playerIdCache = new Map<string, number>();

  for (const entry of roster) {
    if (!entry.firstName || !entry.lastName) continue;

    // Upsert player
    const cacheKey = `${entry.playerIdMasked}|${entry.firstName}|${entry.lastName}|${entry.country}`;
    let playerId = playerIdCache.get(cacheKey);

    if (playerId === undefined) {
      const { data: row, error } = await supabase
        .schema("rk9")
        .from("players")
        .upsert(
          {
            player_id_masked: entry.playerIdMasked || "",
            first_name: entry.firstName,
            last_name: entry.lastName,
            country: entry.country || null,
            trainer_name: entry.trainerName || null,
          },
          { onConflict: "player_id_masked,first_name,last_name,country" }
        )
        .select("id")
        .single();

      if (error) throw new Error(`Player upsert "${entry.firstName} ${entry.lastName}": ${error.message}`);
      playerId = row.id;
      playerIdCache.set(cacheKey, playerId);
    }

    playersUpserted++;

    // Insert standing
    const { error: sErr } = await supabase
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
      );

    if (sErr) {
      console.warn(`[rk9-worker] Skipping standing for ${entry.firstName} ${entry.lastName}: ${sErr.message}`);
      continue;
    }
    standingsInserted++;
  }

  // Update event metadata
  await supabase
    .schema("rk9")
    .from("events")
    .update({ player_count: roster.length })
    .eq("event_id", eventId);

  return { playersUpserted, standingsInserted };
}

async function seedSpeciesMap(
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
    if (error) throw new Error(`Species map seed batch at ${i}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Work units
// ---------------------------------------------------------------------------

/**
 * Priority 1: Discover events if last discovery was > 24h ago.
 */
async function tryDiscoverEvents(supabase: SupabaseClient): Promise<WorkResult | null> {
  const { data: latestEvent } = await supabase
    .schema("rk9")
    .from("events")
    .select("imported_at")
    .order("imported_at", { ascending: false })
    .limit(1)
    .single();

  if (latestEvent) {
    const lastSync = new Date(latestEvent.imported_at).getTime();
    if (Date.now() - lastSync < DISCOVERY_INTERVAL_MS) {
      return null; // Not needed yet
    }
  }

  const html = await fetchRk9Html("/events/pokemon");
  const events = parseEventsPage(html);
  await syncEvents(supabase, events);

  console.log(`[rk9-worker] Discovered ${events.length} events`);
  return { action: "discover", eventsFound: events.length };
}

/**
 * Priority 2: Scrape roster for the oldest event that has ended and is pending.
 */
async function tryImportRoster(supabase: SupabaseClient): Promise<WorkResult | null> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: event } = await supabase
    .schema("rk9")
    .from("events")
    .select("event_id, name, date_start, date_end")
    .eq("import_status", "pending")
    .lte("date_start", today)
    .order("date_start", { ascending: true })
    .limit(1)
    .single();

  if (!event) return null;

  // Don't scrape if event still in progress
  if (event.date_end && event.date_end > today) return null;

  console.log(`[rk9-worker] Importing roster for: ${event.name}`);

  // Mark as in-progress
  await supabase
    .schema("rk9")
    .from("events")
    .update({ import_status: "roster", import_error: null })
    .eq("event_id", event.event_id);

  try {
    // Detect format
    let formatId: string | null = null;
    if (formatDetectionNeedsHtml(event.date_start)) {
      await sleep(DELAY_ROSTER_MS);
      const tournamentHtml = await fetchRk9Html(`/tournament/${event.event_id}`);
      formatId = detectEventFormat(tournamentHtml, event.date_start);
    } else {
      formatId = detectEventFormat("", event.date_start);
    }

    // Store format_id
    if (formatId) {
      await supabase
        .schema("rk9")
        .from("events")
        .update({ format_id: formatId })
        .eq("event_id", event.event_id);
    }

    // Fetch and parse roster
    await sleep(DELAY_ROSTER_MS);
    const html = await fetchRk9Html(`/roster/${event.event_id}`);
    const roster = parseRosterPage(html);

    // Import roster
    const result = await importRoster(supabase, event.event_id, roster);

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
 * Priority 3: Scrape one batch of teams (25) for the oldest eligible event.
 */
async function tryImportTeamBatch(supabase: SupabaseClient, maxTeams: number = DEFAULT_MAX_TEAMS_PER_TICK, concurrency: number = DEFAULT_TEAM_CONCURRENCY): Promise<WorkResult | null> {
  const { data: event } = await supabase
    .schema("rk9")
    .from("events")
    .select("event_id, name")
    .in("import_status", ["roster", "teams"])
    .order("date_start", { ascending: true })
    .limit(1)
    .single();

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
    await supabase
      .schema("rk9")
      .from("events")
      .update({ import_status: "complete", import_error: null, has_team_lists: false })
      .eq("event_id", event.event_id);
    return { action: "teams", eventId: event.event_id, eventName: event.name, scraped: 0, total: 0, done: true, failed: 0 };
  }

  // Find standings without team_pokemon yet
  const { data: withTeams } = await supabase
    .schema("rk9")
    .from("team_pokemon")
    .select("standing_id")
    .in("standing_id", allStandings.map((s) => s.id));

  const standingsWithTeams = new Set((withTeams ?? []).map((t) => t.standing_id));
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

  // Update status to "teams"
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

  // Process up to maxTeams in concurrent batches
  const batch = remaining.slice(0, maxTeams);
  let batchScraped = 0;
  let batchFailed = 0;
  const newSpecies = new Map<string, string>();
  const allTeamRows: Record<string, unknown>[] = [];

  console.log(`[rk9-worker] Scraping up to ${batch.length} teams across ${concurrency} concurrent workers (${remaining.length} remaining total)`);

  async function scrapeOneTeam(standing: { id: number; roster_entry_id: string | null }): Promise<{ ok: boolean; rows?: Record<string, unknown>[] }> {
    const entryId = standing.roster_entry_id;
    if (!entryId) return { ok: false };

    try {
      const html = await fetchRk9Html(`/teamlist/public/${event.event_id}/${entryId}`);
      const pokemon = parseTeamListPage(html);

      if (pokemon.length > 0) {
        const pokemonRows = pokemon.map((mon, i) => {
          if (!newSpecies.has(mon.speciesRaw) && !speciesMap.has(mon.speciesRaw)) {
            newSpecies.set(mon.speciesRaw, normalizeSpeciesInline(mon.speciesRaw));
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

        return { ok: true, rows: pokemonRows };
      }
      return { ok: true, rows: [] };
    } catch {
      return { ok: false };
    }
  }

  // Process in parallel chunks with delay between chunks
  for (let i = 0; i < batch.length; i += concurrency) {
    const chunk = batch.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map(scrapeOneTeam));
    for (const r of results) {
      if (r.ok) {
        batchScraped++;
        if (r.rows && r.rows.length > 0) {
          allTeamRows.push(...r.rows);
        }
      } else {
        batchFailed++;
      }
    }
    if (i + concurrency < batch.length) {
      await sleep(DELAY_TEAM_MS);
    }
  }

  // Bulk-insert all collected team pokemon rows
  if (allTeamRows.length > 0) {
    const BULK_CHUNK_SIZE = 200;
    for (let i = 0; i < allTeamRows.length; i += BULK_CHUNK_SIZE) {
      const chunk = allTeamRows.slice(i, i + BULK_CHUNK_SIZE);
      try {
        const { error } = await supabase
          .schema("rk9")
          .from("team_pokemon")
          .insert(chunk);
        if (error) {
          console.error(`[rk9-worker] Bulk insert chunk failed (${chunk.length} rows):`, error.message);
        }
      } catch (err) {
        console.error(`[rk9-worker] Bulk insert chunk error (${chunk.length} rows):`, err);
      }
    }
  }

  // Seed new species into species_map
  if (newSpecies.size > 0) {
    await seedSpeciesMap(supabase, newSpecies);
  }

  const totalScraped = alreadyScraped + batchScraped;
  const done = totalScraped >= total;

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
// Auth helper
// ---------------------------------------------------------------------------

function requireServiceRole(req: Request, cors: Record<string, string>): Response | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ success: false, error: "Missing authorization" }, 401, cors);
  }
  const token = authHeader.replace("Bearer ", "");
  if (token !== SUPABASE_SERVICE_ROLE_KEY) {
    return json({ success: false, error: "Invalid service role key" }, 403, cors);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405, cors);
  }

  try {
    // Auth: only service role (called by pg_cron, not user-facing)
    const authErr = requireServiceRole(req, cors);
    if (authErr) return authErr;

    // Check auto_import_rk9_enabled in site_config
    const supabase = adminClient();
    const { data: configRow } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", "auto_import_rk9_enabled")
      .single();

    const autoImportEnabled = configRow?.value === true || configRow?.value === "true";
    if (!autoImportEnabled) {
      return json({ success: true, data: { action: "skipped", reason: "auto_import_rk9_enabled is false" } }, 200, cors);
    }

    // Check cron interval (dynamic skip — user configures via admin UI)
    const intervalResult = await checkCronInterval(supabase, "rk9_cron_interval_seconds", "rk9_last_run_at", 60, "rk9-worker");
    if (intervalResult) {
      return json({ success: true, data: intervalResult }, 200, cors);
    }

    // Try work in priority order:
    // 1. Discover events (if stale)
    // 2. Finish in-progress events (teams) before starting new ones (roster)
    //
    // SYNC: This priority order is mirrored in the client-side auto-import loop
    // (apps/web/src/components/admin/external-data.tsx).
    // Update both locations when changing the processing order.

    // Read runtime config from site_config
    const maxTeams = await getConfigNumber(supabase, "rk9_max_teams_per_tick", DEFAULT_MAX_TEAMS_PER_TICK);
    const teamConcurrency = await getConfigNumber(supabase, "rk9_team_concurrency", DEFAULT_TEAM_CONCURRENCY);

    let result: WorkResult;

    const discoverResult = await tryDiscoverEvents(supabase);
    if (discoverResult) {
      result = discoverResult;
    } else {
      const teamsResult = await tryImportTeamBatch(supabase, maxTeams, teamConcurrency);
      if (teamsResult) {
        result = teamsResult;
      } else {
        const rosterResult = await tryImportRoster(supabase);
        if (rosterResult) {
          result = rosterResult;
        } else {
          result = { action: "idle" };
          console.log("[rk9-worker] Nothing to do — idle");
        }
      }
    }

    return json({ success: true, data: result }, 200, cors);
  } catch (err) {
    console.error("[rk9-worker]", err);
    return json(
      { success: false, error: err instanceof Error ? err.message : "Worker failed" },
      500,
      cors
    );
  }
});
