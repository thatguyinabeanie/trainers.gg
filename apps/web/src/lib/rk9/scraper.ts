/**
 * RK9 HTML Scraper
 *
 * Pure functions that parse RK9.gg HTML pages into structured data.
 * No I/O — accepts HTML strings and returns typed objects.
 *
 * Pages handled:
 * - /events/pokemon → event discovery (tournament IDs + metadata)
 * - /roster/{eventId} → player roster with standings
 * - /teamlist/public/{eventId}/{rosterEntryId} → team sheet (6 Pokemon)
 */

import * as cheerio from "cheerio";

import {
  getChampionsFormatForDate,
  getSvFormatForDate,
} from "@trainers/pokemon";

import type {
  RK9Division,
  RK9Event,
  RK9EventTier,
  RK9Pokemon,
  RK9RosterEntry,
} from "@trainers/data-sources";

// Use AnyNode type from cheerio's internal type system
type $API = cheerio.CheerioAPI;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type $Selection = cheerio.Cheerio<any>;

const TAG_PATTERN = /<\/?[a-z][^>]*>/gi;

function stripTagsLoop(input: string): string {
  let text = input;
  let previous: string;
  do {
    previous = text;
    text = text.replace(TAG_PATTERN, "");
  } while (text !== previous);
  return text;
}

// ---------------------------------------------------------------------------
// Events page parser (/events/pokemon)
// ---------------------------------------------------------------------------

/**
 * Parse the /events/pokemon page to discover all VGC tournament IDs.
 *
 * Strategy:
 * - Page has two tables: #dtUpcomingEvents and #dtPastEvents
 * - Each row has: Date | Tier Image | Event Name | Location | Links
 * - VG links identified by text content "VG" or pokemon-vg image
 * - Tournament ID extracted from href="/tournament/{id}"
 * - Tier derived from event name keywords
 */
export function parseEventsPage(html: string): RK9Event[] {
  const $ = cheerio.load(html);
  const events: RK9Event[] = [];

  // Process both upcoming and past event tables
  const tables: Array<{ selector: string; section: "upcoming" | "past" }> = [
    { selector: "#dtUpcomingEvents", section: "upcoming" },
    { selector: "#dtPastEvents", section: "past" },
  ];

  for (const { selector, section } of tables) {
    const $table = $(selector);
    if (!$table.length) continue;

    $table.find("tbody tr").each((_i, row) => {
      const $row = $(row);
      const $cells = $row.find("td");
      if ($cells.length < 5) return;

      // Find the VG tournament link in the Links column (last cell)
      const $linksCell = $cells.last();
      const $vgLink = $linksCell
        .find('a[href*="/tournament/"]')
        .filter((_j, el) => {
          const text = $(el).text().trim();
          // Match "VG" text (past events) or links containing VG/Champions image
          return (
            text === "VG" ||
            $(el).find('img[src*="pokemon-vg"]').length > 0
          );
        });

      if (!$vgLink.length) return;

      // Extract tournament ID from href
      const href = $vgLink.attr("href") ?? "";
      const tournamentIdMatch = href.match(/\/tournament\/([^/?#]+)/);
      if (!tournamentIdMatch?.[1]) return;
      const eventId = tournamentIdMatch[1];

      // Extract event metadata from other cells
      const dateRaw = $cells.eq(0).text().trim();
      const name = $cells.eq(2).find("a").first().text().trim();
      const locationRaw = $cells.eq(3).text().trim();

      // Parse location: "Toronto, CA" → city + country
      const locationParts = locationRaw.split(",").map((s) => s.trim());
      const locationCity = locationParts[0] ?? "";
      const locationCountry = locationParts[1] ?? "";

      // Derive tier from event name
      const tier = deriveTier(name);

      // Parse date range
      const { dateStart, dateEnd } = parseDateRange(dateRaw);

      events.push({
        eventId,
        name,
        dateRaw,
        dateStart,
        dateEnd,
        locationCity,
        locationCountry,
        tier,
        section,
      });
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Roster page parser (/roster/{eventId})
// ---------------------------------------------------------------------------

/**
 * Parse the roster page to extract all players with standings.
 *
 * HTML structure per row:
 *   <td>Player ID (masked)</td>
 *   <td>First name</td>
 *   <td>Last name</td>
 *   <td>Country</td>
 *   <td>Division</td>
 *   <td>Trainer name</td>
 *   <td>Team List (link with rosterEntryId)</td>
 *   <td>Standing</td>
 *
 * Note: Column count/order may vary if certain columns are hidden.
 * We identify columns by header text to be resilient.
 */
export function parseRosterPage(html: string): RK9RosterEntry[] {
  const $ = cheerio.load(html);
  const entries: RK9RosterEntry[] = [];

  const $table = $("#dtLiveRoster");
  if (!$table.length) return entries;

  // Determine column indexes from header
  const columnMap = buildColumnMap($, $table);

  $table.find("tbody tr").each((_i, row) => {
    const $row = $(row);
    const $cells = $row.find("td");
    if ($cells.length < 4) return;

    // Extract fields using column map
    const playerIdMasked = getCellText($, $cells, columnMap.playerIdMasked);
    const firstName = getCellText($, $cells, columnMap.firstName);
    const lastName = getCellText($, $cells, columnMap.lastName);
    const country = getCellText($, $cells, columnMap.country);
    const division = parseDivision(getCellText($, $cells, columnMap.division));
    const trainerName = getCellText($, $cells, columnMap.trainerName);

    // Extract roster entry ID from team list link
    let rosterEntryId: string | null = null;
    if (columnMap.teamList >= 0) {
      const $teamCell = $cells.eq(columnMap.teamList);
      const teamHref = $teamCell.find("a").attr("href") ?? "";
      // Pattern: /teamlist/public/{eventId}/{rosterEntryId}
      const entryMatch = teamHref.match(/\/teamlist\/public\/[^/]+\/(.+)$/);
      if (entryMatch?.[1]) {
        rosterEntryId = entryMatch[1];
      }
    }

    // Extract placement from standing column
    let placement: number | null = null;
    if (columnMap.standing >= 0) {
      const standingText = getCellText($, $cells, columnMap.standing);
      const parsed = parseInt(standingText, 10);
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
// Team list page parser (/teamlist/public/{eventId}/{rosterEntryId})
// ---------------------------------------------------------------------------

/**
 * Parse a team list page to extract 6 Pokemon.
 *
 * The page shows the team in multiple languages (EN, FR, IT, DE, ES, JP, KO, SC, TC).
 * We only parse the English section (div#lang-EN).
 *
 * HTML structure per Pokemon block:
 *   <div class="pokemon bg-light-green-50 p-3">
 *     <img src="...sprites/broadcast/XXX_XXX.png" ...>
 *     Species Name [Form]
 *     &nbsp; &nbsp;
 *     <b>EN</b> <br>
 *     <b>Tera Type:</b> Fairy<br>
 *     <b>Ability:</b> Good as Gold &nbsp;&nbsp;
 *     <b>Held Item:</b> Choice Specs<br>
 *     <h5>&nbsp;&nbsp;<span class="badge">Move1</span>
 *     <span class="badge">Move2</span>
 *     <span class="badge">Move3</span>
 *     <span class="badge">Move4</span></h5>
 *   </div>
 */
export function parseTeamListPage(html: string): RK9Pokemon[] {
  const $ = cheerio.load(html);
  const pokemon: RK9Pokemon[] = [];

  // Target only the English language section
  const $english = $("#lang-EN");
  if (!$english.length) {
    // No English section — return empty rather than risking non-English data
    return pokemon;
  }

  return parsePokemonBlocks($, $english);
}

/**
 * Parse all div.pokemon blocks within a language container.
 */
function parsePokemonBlocks($: $API, $container: $Selection): RK9Pokemon[] {
  const pokemon: RK9Pokemon[] = [];

  $container.find("div.pokemon").each((_i, block) => {
    const $block = $(block);

    // Extract species name: it's the bare text node after the <img> tag,
    // before the first <b> tag. We get the full HTML and parse it.
    const blockHtml = $block.html() ?? "";

    // Species is between the </img> close (or end of <img> tag) and the first <b>
    // Remove the img tag, then take text before first <b>
    const speciesRaw = extractSpeciesFromBlock(blockHtml);

    // Extract Tera Type from "<b>Tera Type:</b> value"
    const teraType = extractLabeledValue($block, $, "Tera Type");

    // Extract Ability from "<b>Ability:</b> value"
    const ability = extractLabeledValue($block, $, "Ability");

    // Extract Held Item from "<b>Held Item:</b> value"
    const heldItem = extractLabeledValue($block, $, "Held Item");

    // Extract moves from <span class="badge"> elements
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

/**
 * Extract the species name from a Pokemon block's innerHTML.
 *
 * The species is bare text between the <img> tag and the <b>EN</b> tag.
 * Example: "Urshifu [Rapid Strike Style]"
 */
function extractSpeciesFromBlock(html: string): string {
  // Remove the <img ...> tag (self-closing or not)
  const withoutImg = html.replace(/<img[^>]*>/gi, "");

  // Take text before the first <b> tag
  const beforeBold = withoutImg.split(/<b>/i)[0] ?? "";

  let text = stripTagsLoop(beforeBold);

  text = text
    .replace(/<[^>]*$/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

/**
 * Extract a labeled value from a Pokemon block.
 *
 * Looks for pattern: <b>Label:</b> Value
 * Returns the value text, or empty string if not found.
 */
function extractLabeledValue(
  $block: $Selection,
  $: $API,
  label: string
): string {
  // Get the full text content and search for the label pattern
  const blockHtml = $block.html() ?? "";

  // Pattern: <b>Label:</b> Value (terminated by <br>, <b>, <h5>, or end)
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<b>${escapedLabel}:?</b>\\s*([^<]+)`, "i");
  const match = blockHtml.match(regex);
  if (!match?.[1]) return "";

  // Clean up the value: remove &nbsp; and extra whitespace
  return match[1]
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Tournament detail page parser (/tournament/{eventId})
// ---------------------------------------------------------------------------

/**
 * Parse a tournament detail page to extract event metadata.
 *
 * This is used when manually adding a tournament by ID — the /events/pokemon
 * listing doesn't show older events, but their detail pages still exist.
 *
 * HTML structure:
 *   <h3>Event Name<br><small>Date Range</small></h3>
 *   <img src="...pokemon_regional_championships_100x100.png" ...>
 *   <dt>Venue</dt><dd>Venue Name<br>Address<br>City, ST ZIP</dd>
 */
export function parseTournamentPage(
  html: string,
  eventId: string
): RK9Event | null {
  const $ = cheerio.load(html);

  // Extract event name from the <h3> heading
  const $heading = $("h3").first();
  if (!$heading.length) return null;

  // Name is the text content of the h3 excluding the <small> child
  const $small = $heading.find("small");
  const dateRaw = $small.text().trim();
  $small.remove();
  const name = $heading.text().trim();

  if (!name) return null;

  // Parse date range from the <small> text
  // Normalize en-dash and em-dash to hyphen for the parser
  const normalizedDateRaw = dateRaw.replace(/[–—]/g, "-");
  const { dateStart, dateEnd } = parseDateRange(normalizedDateRaw);

  // Derive tier from event name and/or image
  let tier = deriveTier(name);

  // Also check image filename for tier hints
  const $tierImg = $('img[src*="pokemon_"]');
  if ($tierImg.length) {
    const imgSrc = $tierImg.attr("src") ?? "";
    if (imgSrc.includes("international")) tier = "international";
    else if (imgSrc.includes("world")) tier = "worlds";
    else if (imgSrc.includes("special")) tier = "special";
    // regional is already the default
  }

  // Extract location from venue section
  let locationCity = "";
  let locationCountry = "";

  // Find the Venue <dt> and get its corresponding <dd>
  $("dt").each((_i, dt) => {
    if ($(dt).text().trim().toLowerCase() === "venue") {
      const $dd = $(dt).next("dd");
      if ($dd.length) {
        // The venue dd contains lines separated by <br>
        // Last meaningful line typically has "City, ST ZIP" or "City, Country"
        const venueHtml = $dd.html() ?? "";
        const lines = venueHtml
          .split(/<br\s*\/?>/)
          .map((l) => stripTagsLoop(l).trim())
          .filter(Boolean);

        // Look for a line matching "City, ST ZIP" or "City, Country"
        for (const line of lines) {
          const cityStateZip = line.match(
            /^([^,]+),\s*([A-Z]{2})\s*\d{4,5}$/
          );
          if (cityStateZip?.[1]) {
            locationCity = cityStateZip[1]!.trim();
            locationCountry = "US";
            break;
          }
          // "City, Country" pattern (2-letter code at end)
          const cityCountry = line.match(/^([^,]+),\s*([A-Z]{2})$/);
          if (cityCountry?.[1] && cityCountry[2]) {
            locationCity = cityCountry[1]!.trim();
            locationCountry = cityCountry[2]!;
            break;
          }
        }
      }
    }
  });

  return {
    eventId,
    name,
    dateRaw,
    dateStart,
    dateEnd,
    locationCity,
    locationCountry,
    tier,
    section: "past",
  };
}

// ---------------------------------------------------------------------------
// Format detection from tournament page
// ---------------------------------------------------------------------------

/**
 * Detect the game format ID from a tournament page HTML.
 *
 * Detection logic:
 *   1. Check game image: `pokemon-vg-champions` = Champions, `pokemon-vg` = SV
 *   2. Look for alert/notice text mentioning regulation (e.g., "Regulation M-A")
 *   3. Fall back to date-based heuristics for regulation set
 *
 * Returns a canonical Showdown-compatible format ID (e.g., "gen9vgc2026regi")
 * or null if format cannot be determined.
 */
/**
 * Detect the format ID for an RK9 event.
 *
 * Primary strategy: use the static regulation calendar from @trainers/pokemon.
 * The calendar maps every known regulation period (date range) to its canonical
 * format ID — no HTML scraping needed for dates within the calendar.
 *
 * HTML-based detection is only needed to distinguish Champions vs SV during the
 * concurrent format era (May 2026+). For earlier dates, the calendar is
 * authoritative.
 *
 * @param html - Tournament detail page HTML (used for Champions detection)
 * @param dateStart - Event start date in ISO format (YYYY-MM-DD)
 * @returns The canonical format ID, or null if date is outside known periods
 */
export function detectEventFormat(
  html: string,
  dateStart: string
): string | null {
  if (!dateStart) return null;

  // Step 1: Check if this is a Champions event (image-based detection)
  // Only relevant from May 2026 onward — before that, all events are SV.
  const isChampionsEra = dateStart >= "2026-05-01";

  if (isChampionsEra && html) {
    const $ = cheerio.load(html);
    const isChampions = $('img[src*="pokemon-vg-champions"]').length > 0;

    if (isChampions) {
      return getChampionsFormatForDate(dateStart);
    }
  }

  // Step 2: SV format — use the authoritative regulation calendar
  return getSvFormatForDate(dateStart);
}

/**
 * Check whether format detection requires fetching the tournament page HTML.
 *
 * Returns false for dates before the Champions era (May 2026), meaning the
 * calendar alone is sufficient. Use this to skip unnecessary HTTP requests in
 * the cron worker.
 */
export function formatDetectionNeedsHtml(dateStart: string): boolean {
  return dateStart >= "2026-05-01";
}

// ---------------------------------------------------------------------------
// Archived events page parser (Wayback Machine snapshots)
// ---------------------------------------------------------------------------

/**
 * Parse a Wayback Machine archived /events/pokemon page to discover VG
 * tournament IDs and metadata.
 *
 * This is more permissive than `parseEventsPage` because:
 * - Table IDs changed over the years (2022: #dtOpenTournaments, later:
 *   #dtUpcomingEvents/#dtPastEvents)
 * - Wayback prefixes hrefs with /web/{timestamp}/... but the tournament ID
 *   regex still works on the suffix
 * - Some archived pages have slightly different column ordering
 *
 * Strategy: find ALL tables on the page, scan rows for VG tournament links,
 * extract metadata from sibling cells. This makes it resilient to any era's
 * table structure.
 */
export function parseArchivedEventsPage(html: string): RK9Event[] {
  const $ = cheerio.load(html);
  const events: RK9Event[] = [];
  const seenIds = new Set<string>();

  // Find all tables — don't rely on specific IDs
  $("table").each((_tableIdx, table) => {
    const $table = $(table);

    $table.find("tbody tr").each((_i, row) => {
      const $row = $(row);
      const $cells = $row.find("td");
      if ($cells.length < 3) return;

      // Look for any link containing "/tournament/" with "VG" text or VG image
      const $vgLinks = $row.find('a[href*="/tournament/"]').filter((_j, el) => {
        const text = $(el).text().trim();
        return (
          text === "VG" ||
          text === "VGC" ||
          $(el).find('img[src*="pokemon-vg"]').length > 0 ||
          $(el).find('img[src*="pokemon_vg"]').length > 0
        );
      });

      if (!$vgLinks.length) return;

      // Extract tournament ID from the first VG link
      const href = $vgLinks.first().attr("href") ?? "";
      // Handle Wayback prefix: /web/20220809/https://rk9.gg/tournament/ID
      // or direct: /tournament/ID
      const tournamentIdMatch = href.match(/\/tournament\/([^/?#]+)/);
      if (!tournamentIdMatch?.[1]) return;
      const eventId = tournamentIdMatch[1];

      // Skip duplicates (same event can appear in multiple tables)
      if (seenIds.has(eventId)) return;
      seenIds.add(eventId);

      // Extract metadata from cells.
      // Typical column order: Date | Tier (image) | Event Name | Location | Links
      // But some archives have fewer columns. We use heuristics.
      const cellTexts = $cells.toArray().map((c) => $(c).text().trim());

      // Find the event name: look for a cell with an <a> linking to /event/ or
      // containing the most text (excluding the links column)
      let name = "";
      let dateRaw = "";
      let locationRaw = "";

      // Try standard layout: cell[0]=date, cell[2]=name, cell[3]=location
      if ($cells.length >= 5) {
        dateRaw = cellTexts[0] ?? "";
        // Name: get from link text in cell[2], or fallback to cell text
        const $nameCell = $cells.eq(2);
        const $nameLink = $nameCell.find("a").first();
        name = $nameLink.length ? $nameLink.text().trim() : $nameCell.text().trim();
        locationRaw = cellTexts[3] ?? "";
      } else if ($cells.length >= 3) {
        // Smaller layout — best effort
        dateRaw = cellTexts[0] ?? "";
        name = cellTexts[1] ?? "";
        locationRaw = cellTexts[2] ?? "";
      }

      // Derive tier from image in the row (check all img srcs)
      let tier: RK9EventTier = "regional";
      $row.find("img").each((_k, img) => {
        const src = $(img).attr("src") ?? "";
        if (src.includes("international")) tier = "international";
        else if (src.includes("world")) tier = "worlds";
        else if (src.includes("special")) tier = "special";
      });
      // Also derive from name as fallback
      if (tier === "regional") {
        tier = deriveTier(name);
      }

      // Parse location: "City, CC" pattern
      const locationParts = locationRaw.split(",").map((s) => s.trim());
      const locationCity = locationParts[0] ?? "";
      const locationCountry = locationParts[1] ?? "";

      // Parse date range
      const normalizedDateRaw = dateRaw.replace(/[–—]/g, "-");
      const { dateStart, dateEnd } = parseDateRange(normalizedDateRaw);

      events.push({
        eventId,
        name: name || eventId,
        dateRaw,
        dateStart,
        dateEnd,
        locationCity,
        locationCountry,
        tier,
        section: "past",
      });
    });
  });

  return events;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Derive event tier from the event name */
function deriveTier(name: string): RK9EventTier {
  const lower = name.toLowerCase();
  if (lower.includes("world")) return "worlds";
  if (lower.includes("international")) return "international";
  if (lower.includes("special")) return "special";
  return "regional";
}

/**
 * Parse a date range string like "January 16-18, 2026" or "May 8-10, 2026"
 * into ISO date strings.
 */
function parseDateRange(raw: string): {
  dateStart: string;
  dateEnd: string | null;
} {
  // Common patterns:
  // "January 16-18, 2026" → single month, day range
  // "Feb 27-Mar 1, 2026" → cross-month range
  // "May 8, 2026" → single day
  // "April 25-26, 2026" → single month, day range

  const cleaned = raw.replace(/\s+/g, " ").trim();

  // Try: "Month Day-Day, Year"
  const singleMonthRange = cleaned.match(/^(\w+)\s+(\d+)-(\d+),?\s+(\d{4})$/);
  if (singleMonthRange) {
    const [, month, startDay, endDay, year] = singleMonthRange;
    const start = parseDate(month!, startDay!, year!);
    const end = parseDate(month!, endDay!, year!);
    return { dateStart: start, dateEnd: end };
  }

  // Try: "Month Day-Month Day, Year"
  const crossMonthRange = cleaned.match(
    /^(\w+)\s+(\d+)-(\w+)\s+(\d+),?\s+(\d{4})$/
  );
  if (crossMonthRange) {
    const [, month1, day1, month2, day2, year] = crossMonthRange;
    const start = parseDate(month1!, day1!, year!);
    const end = parseDate(month2!, day2!, year!);
    return { dateStart: start, dateEnd: end };
  }

  // Try: "Month Day, Year" (single day)
  const singleDay = cleaned.match(/^(\w+)\s+(\d+),?\s+(\d{4})$/);
  if (singleDay) {
    const [, month, day, year] = singleDay;
    const start = parseDate(month!, day!, year!);
    return { dateStart: start, dateEnd: null };
  }

  // Fallback: return empty strings (caller should handle)
  return { dateStart: "", dateEnd: null };
}

/** Convert month name + day + year to ISO date string */
function parseDate(month: string, day: string, year: string): string {
  const monthIndex = MONTH_NAMES.indexOf(month.toLowerCase().slice(0, 3));
  if (monthIndex === -1) return "";
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(parseInt(day, 10)).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/** Parse division string to normalized type */
function parseDivision(raw: string): RK9Division {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("senior")) return "senior";
  if (lower.includes("junior")) return "junior";
  if (lower.includes("master")) return "masters";
  // Unknown division text — log warning and default to masters
  if (lower.length > 0) {
    console.warn(`[rk9-scraper] Unknown division "${raw}", defaulting to masters`);
  }
  return "masters";
}

/** Column index map for the roster table */
interface ColumnMap {
  playerIdMasked: number;
  firstName: number;
  lastName: number;
  country: number;
  division: number;
  trainerName: number;
  teamList: number;
  standing: number;
}

/** Build a column index map from table headers */
function buildColumnMap($: $API, $table: $Selection): ColumnMap {
  const map: ColumnMap = {
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
    if (text.includes("player id")) map.playerIdMasked = i;
    else if (text.includes("first name")) map.firstName = i;
    else if (text.includes("last name")) map.lastName = i;
    else if (text === "country") map.country = i;
    else if (text === "division") map.division = i;
    else if (text.includes("trainer")) map.trainerName = i;
    else if (text.includes("team list")) map.teamList = i;
    else if (text.includes("standing")) map.standing = i;
  });

  // Fallback: if headers didn't match, use known positional layout
  // Standard layout: PlayerID(0), FirstName(1), LastName(2), Country(3),
  //                  Division(4), TrainerName(5), TeamList(6), Standing(7)
  if (map.playerIdMasked === -1) map.playerIdMasked = 0;
  if (map.firstName === -1) map.firstName = 1;
  if (map.lastName === -1) map.lastName = 2;
  if (map.country === -1) map.country = 3;
  if (map.division === -1) map.division = 4;
  if (map.trainerName === -1) map.trainerName = 5;
  if (map.teamList === -1) map.teamList = 6;
  if (map.standing === -1) map.standing = 7;

  return map;
}

/** Get trimmed text content of a cell by index */
function getCellText($: $API, $cells: $Selection, index: number): string {
  if (index < 0) return "";
  const el = $cells.get(index);
  if (!el) return "";
  return $(el).text().trim();
}
