/**
 * VGC Regulation Calendar
 *
 * Complete historical record of every Play! Pokemon VGC competitive regulation
 * period from VGC 2009 (Gen 4) through the present day.
 *
 * This serves two purposes:
 * 1. Authoritative date-range → format ID lookup for the RK9 scraping pipeline
 * 2. Historical reference of all VGC competitive periods
 *
 * Notes:
 * - Some regulations have two non-contiguous active periods (G, I). Each period
 *   maps to a different format ID because the VGC season year differs.
 * - The VGC season year in the format ID corresponds to the Worlds Championship
 *   that events in that period qualify for (Worlds 2024, 2025, 2026, etc.).
 * - Champions (launching May 2026) runs concurrently with SV — the caller must
 *   determine the game type separately (e.g., from tournament page imagery).
 * - Gaps between generations (e.g., Aug-Nov when a new game launches) have no
 *   calendar entries — lookups during gaps return null.
 *
 * Sources:
 * - https://www.serebii.net/scarletviolet/rankedbattle/regulations.shtml
 * - https://bulbapedia.bulbagarden.net/wiki/Video_Game_Championships
 * - Official Play! Pokemon regulation announcements
 *
 * To add a new regulation period: append an entry to REGULATION_CALENDAR.
 */

// =============================================================================
// Types
// =============================================================================

export interface RegulationPeriod {
  /** Start date (inclusive), ISO format YYYY-MM-DD */
  start: string;
  /** End date (inclusive), ISO format YYYY-MM-DD */
  end: string;
  /** The canonical format ID for events in this period */
  formatId: string;
  /** Regulation/series identifier for display purposes */
  regulation: string;
  /** Human-readable label */
  label: string;
}

// =============================================================================
// VGC Regulation Calendar — Complete History
// =============================================================================

/**
 * Ordered chronologically. Each entry represents a contiguous date range
 * where a specific regulation was active for Play! Pokemon VGC events.
 *
 * Covers every generation from Gen 4 (2009) to present.
 */
export const REGULATION_CALENDAR: readonly RegulationPeriod[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // Generation 4 — Diamond & Pearl / Platinum / HGSS (2009-2010)
  // ═══════════════════════════════════════════════════════════════════════════
  // VGC debuted in 2009 (US only). Double battles, level 50, no restricted.
  // VGC 2010 expanded internationally. Both used Gen 4 mechanics.
  {
    start: "2009-03-01",
    end: "2009-08-31",
    formatId: "gen4vgc2009",
    regulation: "VGC 2009",
    label: "DP: VGC 2009",
  },
  {
    start: "2009-09-01",
    end: "2010-08-31",
    formatId: "gen4vgc2010",
    regulation: "VGC 2010",
    label: "DP: VGC 2010",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Generation 5 — Black & White / BW2 (2011-2013)
  // ═══════════════════════════════════════════════════════════════════════════
  // BW launched March 2011 (NA). VGC 2011 used Gen 5 from the start.
  // Each year was one continuous format with no sub-regulation breakdown.
  {
    start: "2011-03-01",
    end: "2011-08-31",
    formatId: "gen5vgc2011",
    regulation: "VGC 2011",
    label: "BW: VGC 2011",
  },
  {
    start: "2011-09-01",
    end: "2012-08-31",
    formatId: "gen5vgc2012",
    regulation: "VGC 2012",
    label: "BW: VGC 2012",
  },
  {
    start: "2012-09-01",
    end: "2013-08-31",
    formatId: "gen5vgc2013",
    regulation: "VGC 2013",
    label: "BW: VGC 2013",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Generation 6 — X & Y / ORAS (2014-2016)
  // ═══════════════════════════════════════════════════════════════════════════
  // XY launched October 2013. VGC 2014 was the first Gen 6 season.
  // ORAS launched November 2014 — expanded the dex for VGC 2015-2016.
  {
    start: "2013-10-01",
    end: "2014-08-31",
    formatId: "gen6vgc2014",
    regulation: "VGC 2014",
    label: "XY: VGC 2014",
  },
  {
    start: "2014-09-01",
    end: "2015-08-31",
    formatId: "gen6vgc2015",
    regulation: "VGC 2015",
    label: "XY: VGC 2015",
  },
  {
    start: "2015-09-01",
    end: "2016-08-31",
    formatId: "gen6vgc2016",
    regulation: "VGC 2016",
    label: "XY: VGC 2016",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Generation 7 — Sun & Moon / USUM (2017-2019)
  // ═══════════════════════════════════════════════════════════════════════════
  // SM launched November 2016. USUM launched November 2017.
  // VGC 2017 and 2018 were each one continuous format.
  // VGC 2019 introduced the first sub-format split: Sun/Moon/Ultra Series.
  {
    start: "2016-11-01",
    end: "2017-08-31",
    formatId: "gen7vgc2017",
    regulation: "VGC 2017",
    label: "SM: VGC 2017",
  },
  {
    start: "2017-09-01",
    end: "2018-08-31",
    formatId: "gen7vgc2018",
    regulation: "VGC 2018",
    label: "SM: VGC 2018",
  },
  // VGC 2019 — three sub-formats within one season
  {
    start: "2019-01-04",
    end: "2019-04-01",
    formatId: "gen7vgc2019sunseries",
    regulation: "Sun Series",
    label: "SM: Sun Series",
  },
  {
    start: "2019-04-02",
    end: "2019-07-14",
    formatId: "gen7vgc2019moonseries",
    regulation: "Moon Series",
    label: "SM: Moon Series",
  },
  {
    start: "2019-07-15",
    end: "2019-11-14",
    formatId: "gen7vgc2019ultraseries",
    regulation: "Ultra Series",
    label: "SM: Ultra Series",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Generation 8 — Sword & Shield (2020-2022)
  // ═══════════════════════════════════════════════════════════════════════════
  // SwSh launched November 2019. VGC 2020 started January 2020.
  // COVID-19 cancelled in-person events March 2020 — play moved online.
  // Series system introduced for ruleset rotation during COVID era.
  // In-person events resumed February 2022.
  //
  // Note: Series 7-8 (Oct 2020–Apr 2021) are not in our format registry.
  // VGC 2020 covers the initial format through the early COVID period.
  {
    start: "2020-01-01",
    end: "2021-04-30",
    formatId: "gen8vgc2020",
    regulation: "VGC 2020",
    label: "SwSh: VGC 2020",
  },
  {
    start: "2021-05-01",
    end: "2021-07-31",
    formatId: "gen8vgc2021series9",
    regulation: "Series 9",
    label: "SwSh: Series 9",
  },
  {
    start: "2021-08-01",
    end: "2021-10-31",
    formatId: "gen8vgc2021series10",
    regulation: "Series 10",
    label: "SwSh: Series 10",
  },
  {
    start: "2021-11-01",
    end: "2022-01-31",
    formatId: "gen8vgc2021series11",
    regulation: "Series 11",
    label: "SwSh: Series 11",
  },
  {
    start: "2022-02-01",
    end: "2022-12-01",
    formatId: "gen8vgc2022",
    regulation: "Series 12/13",
    label: "SwSh: VGC 2022",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Generation 9 — Scarlet & Violet (2022-2026)
  // ═══════════════════════════════════════════════════════════════════════════
  // SV launched November 18, 2022. Competitive play (Reg A) started Dec 2.
  // Letter-based regulation system with defined date ranges.
  // Some regulations repeat in split periods across VGC season boundaries.

  // ─── VGC 2023 Season ───────────────────────────────────────────────────────
  {
    start: "2022-12-02",
    end: "2023-01-31",
    formatId: "gen9vgc2023rega",
    regulation: "A",
    label: "Reg A",
  },
  {
    start: "2023-02-01",
    end: "2023-03-31",
    formatId: "gen9vgc2023regb",
    regulation: "B",
    label: "Reg B",
  },
  {
    start: "2023-04-01",
    end: "2023-05-30",
    formatId: "gen9vgc2023regc",
    regulation: "C",
    label: "Reg C",
  },
  {
    start: "2023-06-01",
    end: "2023-09-30",
    formatId: "gen9vgc2023regd",
    regulation: "D",
    label: "Reg D",
  },

  // ─── VGC 2024 Season ───────────────────────────────────────────────────────
  {
    start: "2023-10-01",
    end: "2024-01-03",
    formatId: "gen9vgc2024rege",
    regulation: "E",
    label: "Reg E",
  },
  {
    start: "2024-01-04",
    end: "2024-04-30",
    formatId: "gen9vgc2024regf",
    regulation: "F",
    label: "Reg F",
  },
  {
    start: "2024-05-01",
    end: "2024-08-31",
    formatId: "gen9vgc2024regg",
    regulation: "G",
    label: "Reg G (period 1)",
  },

  // ─── VGC 2025 Season ───────────────────────────────────────────────────────
  {
    start: "2024-09-01",
    end: "2025-01-05",
    formatId: "gen9vgc2025regh",
    regulation: "H",
    label: "Reg H",
  },
  {
    start: "2025-01-06",
    end: "2025-04-30",
    formatId: "gen9vgc2025regg",
    regulation: "G",
    label: "Reg G (period 2)",
  },
  {
    start: "2025-05-01",
    end: "2025-08-31",
    formatId: "gen9vgc2025regi",
    regulation: "I",
    label: "Reg I (period 1)",
  },

  // ─── VGC 2026 Season ───────────────────────────────────────────────────────
  {
    start: "2025-09-01",
    end: "2026-01-04",
    formatId: "gen9vgc2025regj",
    regulation: "J",
    label: "Reg J",
  },
  {
    start: "2026-01-05",
    end: "2026-08-31",
    formatId: "gen9vgc2026regi",
    regulation: "I",
    label: "Reg I (period 2)",
  },
] as const;

// =============================================================================
// Champions Calendar
// =============================================================================

/**
 * Champions format periods. Champions launches May 2026 and runs concurrently
 * with SV during the 2026 season. Add new entries as new Champions regulations
 * are announced.
 */
export const CHAMPIONS_CALENDAR: readonly RegulationPeriod[] = [
  {
    start: "2026-05-01",
    end: "2026-08-31",
    formatId: "championsvgc2026regma",
    regulation: "M-A",
    label: "Champions: Reg M-A",
  },
] as const;

// =============================================================================
// Lookup Functions
// =============================================================================

/**
 * Find the VGC format ID for an event given its start date.
 * Searches the full historical calendar (Gen 4 through present).
 *
 * @param dateStart - Tournament start date in ISO format (YYYY-MM-DD)
 * @returns The format ID if the date falls within a known regulation period, null otherwise
 */
export function getSvFormatForDate(dateStart: string): string | null {
  if (!dateStart) return null;

  // Compare as simple strings — ISO dates sort lexicographically
  for (const period of REGULATION_CALENDAR) {
    if (dateStart >= period.start && dateStart <= period.end) {
      return period.formatId;
    }
  }

  return null;
}

/**
 * Find the Champions format ID for an event given its start date.
 *
 * @param dateStart - Tournament start date in ISO format (YYYY-MM-DD)
 * @returns The format ID if the date falls within a known Champions period, null otherwise
 */
export function getChampionsFormatForDate(dateStart: string): string | null {
  if (!dateStart) return null;

  for (const period of CHAMPIONS_CALENDAR) {
    if (dateStart >= period.start && dateStart <= period.end) {
      return period.formatId;
    }
  }

  return null;
}

/**
 * Determine the format ID for a tournament given its date and game type.
 *
 * This is the primary entry point for format detection. Callers should determine
 * the game type (SV vs Champions) from external signals (e.g., tournament page
 * imagery) and pass it here to get the correct format ID.
 *
 * @param dateStart - Tournament start date in ISO format (YYYY-MM-DD)
 * @param game - The game type: "sv" for Scarlet & Violet, "champions" for Pokemon Champions
 * @returns The format ID, or null if the date is outside known regulation periods
 */
export function getFormatForDate(
  dateStart: string,
  game: "sv" | "champions"
): string | null {
  if (game === "champions") {
    return getChampionsFormatForDate(dateStart);
  }
  return getSvFormatForDate(dateStart);
}

/**
 * Get the regulation period details for an event date.
 * Useful when you need the regulation letter or label, not just the format ID.
 *
 * @param dateStart - Tournament start date in ISO format (YYYY-MM-DD)
 * @returns The full RegulationPeriod if found, null otherwise
 */
export function getRegulationPeriodForDate(
  dateStart: string
): RegulationPeriod | null {
  if (!dateStart) return null;

  for (const period of REGULATION_CALENDAR) {
    if (dateStart >= period.start && dateStart <= period.end) {
      return period;
    }
  }

  return null;
}
