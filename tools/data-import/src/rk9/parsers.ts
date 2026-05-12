import * as cheerio from "cheerio";
import type {
  RK9Event,
  RK9RosterEntry,
  RK9Pokemon,
  PairingsEntry,
  RK9EventTier,
  RK9Division,
} from "./types.js";

// =============================================================================
// Events page parser (/events/pokemon)
// =============================================================================

export function parseEventsPage(html: string): RK9Event[] {
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

// =============================================================================
// Roster page parser (/roster/{eventId})
// =============================================================================

export function parseRosterPage(html: string): RK9RosterEntry[] {
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

// =============================================================================
// Team list page parser (/teamlist/public/{eventId}/{rosterEntryId})
// =============================================================================

export function parseTeamListPage(html: string): RK9Pokemon[] {
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

export function extractSpeciesFromBlock(html: string): string {
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

export function extractLabeledValue(blockHtml: string, label: string): string {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<b>${escapedLabel}:?</b>\\s*([^<]+)`, "i");
  const match = blockHtml.match(regex);
  if (!match?.[1]) return "";
  return match[1].replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// =============================================================================
// Date parsing helpers
// =============================================================================

const MONTH_NAMES = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

export function parseDate(month: string, day: string, year: string): string {
  const monthIndex = MONTH_NAMES.indexOf(month.toLowerCase().slice(0, 3));
  if (monthIndex === -1) return "";
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(parseInt(day, 10)).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function parseDateRange(raw: string): {
  dateStart: string;
  dateEnd: string | null;
} {
  const cleaned = raw.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();

  // "Month Day-Day, Year"
  const singleMonthRange = cleaned.match(/^(\w+)\s+(\d+)-(\d+),?\s+(\d{4})$/);
  if (singleMonthRange) {
    const [, month, startDay, endDay, year] = singleMonthRange;
    return {
      dateStart: parseDate(month!, startDay!, year!),
      dateEnd: parseDate(month!, endDay!, year!),
    };
  }

  // "Month Day-Month Day, Year"
  const crossMonthRange = cleaned.match(
    /^(\w+)\s+(\d+)-(\w+)\s+(\d+),?\s+(\d{4})$/
  );
  if (crossMonthRange) {
    const [, month1, day1, month2, day2, year] = crossMonthRange;
    return {
      dateStart: parseDate(month1!, day1!, year!),
      dateEnd: parseDate(month2!, day2!, year!),
    };
  }

  // "Month Day, Year"
  const singleDay = cleaned.match(/^(\w+)\s+(\d+),?\s+(\d{4})$/);
  if (singleDay) {
    const [, month, day, year] = singleDay;
    return { dateStart: parseDate(month!, day!, year!), dateEnd: null };
  }

  return { dateStart: "", dateEnd: null };
}

export function deriveTier(name: string): RK9EventTier {
  const lower = name.toLowerCase();
  if (lower.includes("world")) return "worlds";
  if (lower.includes("international")) return "international";
  if (lower.includes("special")) return "special";
  return "regional";
}

// =============================================================================
// Pairings page parser (/pairings/{eventId}/{round})
// =============================================================================

export function parsePairingsPage(html: string): PairingsEntry[] {
  const $ = cheerio.load(html);
  const entries: PairingsEntry[] = [];

  const $table = $("table").first();
  if (!$table.length) return entries;

  $table.find("tbody tr").each((_i, row) => {
    const $cells = $(row).find("td");
    if ($cells.length < 3) return;

    const tableNumber = parseInt($cells.eq(0).text().trim(), 10) || null;
    const player1 = $cells.eq(1).text().trim();
    const player2Raw = $cells.eq(2).text().trim();
    const player2 =
      player2Raw && player2Raw.toUpperCase() !== "BYE" ? player2Raw : null;

    let winner: string | null = null;
    if ($cells.length >= 4) {
      const w = $cells.eq(3).text().trim();
      if (w && w !== "—" && w !== "-") winner = w;
    }

    if (player1) entries.push({ tableNumber, player1, player2, winner });
  });

  return entries;
}
