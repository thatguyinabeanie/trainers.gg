/**
 * Pokemon competitive format registry
 *
 * Maps Showdown format IDs to display metadata for UI and analytics.
 * Showdown format IDs are the canonical identifiers stored in the database
 * (tournaments.game_format column). The UI uses the display fields to show
 * friendly names like "Scarlet & Violet" and "SV: Reg I".
 *
 * Format ID convention: gen{N}{format}{year}reg{letter}
 *   - gen9vgc2026regi = Generation 9, VGC 2026, Regulation I
 *   - Matches Pokemon Showdown's format IDs exactly
 *   - Source: https://github.com/smogon/pokemon-showdown/blob/master/config/formats.ts
 *
 * For Pokemon Champions (launching April 2026), Showdown hasn't assigned
 * format IDs yet. We use `championsvgc{year}reg{letter}` as a placeholder
 * convention until Showdown formalizes them.
 *
 * To add a new regulation: add an entry to VGC_FORMATS below.
 * Future: Can add Postgres LIST partitioning on tournament_team_sheets.format
 * if analytics queries get slow at scale.
 */

// =============================================================================
// Types
// =============================================================================

export interface GameFormat {
  /** Showdown format ID — stored in database, used as canonical identifier */
  id: string;
  /** Pokemon game title for UI selectors (e.g., "Scarlet & Violet") */
  game: string;
  /** Short game abbreviation for compact labels */
  gameShort: string;
  /** Generation number */
  generation: number;
  /** Competition format category (e.g., "VGC", "BSS", "Smogon OU") */
  category: string;
  /** Year the regulation applies to */
  year: number;
  /** Regulation set identifier (e.g., "I", "F", "M-A") — null if no regulation */
  regulation: string | null;
  /** Short display label for lists and badges (e.g., "SV: Reg I") */
  label: string;
  /** Full display name matching Showdown's format name */
  showdownName: string;
  /** Whether this is a doubles format */
  doubles: boolean;
  /** Whether this format is currently active/in-season */
  active: boolean;
}

// =============================================================================
// Game definitions
// =============================================================================

export const POKEMON_GAMES = {
  champions: {
    name: "Pokemon Champions",
    shortName: "Champions",
    generation: 10,
  },
  scarletViolet: {
    name: "Scarlet & Violet",
    shortName: "SV",
    generation: 9,
  },
  swordShield: {
    name: "Sword & Shield",
    shortName: "SwSh",
    generation: 8,
  },
  sunMoon: {
    name: "Sun & Moon",
    shortName: "SM",
    generation: 7,
  },
  xy: {
    name: "X & Y",
    shortName: "XY",
    generation: 6,
  },
  blackWhite: {
    name: "Black & White",
    shortName: "BW",
    generation: 5,
  },
  diamondPearl: {
    name: "Diamond & Pearl",
    shortName: "DP",
    generation: 4,
  },
} as const;

export type PokemonGame = keyof typeof POKEMON_GAMES;

// =============================================================================
// VGC Format Registry
// =============================================================================

/**
 * All known VGC formats. Ordered newest → oldest.
 * Add new regulations at the top of this list.
 */
export const VGC_FORMATS: GameFormat[] = [
  // =========================================================================
  // Pokemon Champions (Gen 10) — launching April 2026
  // =========================================================================
  // Showdown format IDs TBD — using placeholder convention until confirmed
  {
    id: "championsvgc2026regma",
    game: "Pokemon Champions",
    gameShort: "Champions",
    generation: 10,
    category: "VGC",
    year: 2026,
    regulation: "M-A",
    label: "Champions: Reg M-A",
    showdownName: "[Champions] VGC 2026 Reg M-A",
    doubles: true,
    active: true,
  },

  // =========================================================================
  // Scarlet & Violet (Gen 9) — 2023-2026
  // =========================================================================
  {
    id: "gen9vgc2026regi",
    game: "Scarlet & Violet",
    gameShort: "SV",
    generation: 9,
    category: "VGC",
    year: 2026,
    regulation: "I",
    label: "SV: Reg I",
    showdownName: "[Gen 9] VGC 2026 Reg I",
    doubles: true,
    active: true,
  },
  {
    id: "gen9vgc2026regf",
    game: "Scarlet & Violet",
    gameShort: "SV",
    generation: 9,
    category: "VGC",
    year: 2026,
    regulation: "F",
    label: "SV: Reg F",
    showdownName: "[Gen 9] VGC 2026 Reg F",
    doubles: true,
    active: false,
  },
  {
    id: "gen9vgc2025regj",
    game: "Scarlet & Violet",
    gameShort: "SV",
    generation: 9,
    category: "VGC",
    year: 2025,
    regulation: "J",
    label: "SV: Reg J",
    showdownName: "[Gen 9] VGC 2025 Reg J",
    doubles: true,
    active: false,
  },
  {
    id: "gen9vgc2025regi",
    game: "Scarlet & Violet",
    gameShort: "SV",
    generation: 9,
    category: "VGC",
    year: 2025,
    regulation: "I",
    label: "SV: Reg I",
    showdownName: "[Gen 9] VGC 2025 Reg I",
    doubles: true,
    active: false,
  },
  {
    id: "gen9vgc2025regh",
    game: "Scarlet & Violet",
    gameShort: "SV",
    generation: 9,
    category: "VGC",
    year: 2025,
    regulation: "H",
    label: "SV: Reg H",
    showdownName: "[Gen 9] VGC 2025 Reg H",
    doubles: true,
    active: false,
  },
  {
    id: "gen9vgc2024regg",
    game: "Scarlet & Violet",
    gameShort: "SV",
    generation: 9,
    category: "VGC",
    year: 2024,
    regulation: "G",
    label: "SV: Reg G",
    showdownName: "[Gen 9] VGC 2024 Reg G",
    doubles: true,
    active: false,
  },
  {
    id: "gen9vgc2024regf",
    game: "Scarlet & Violet",
    gameShort: "SV",
    generation: 9,
    category: "VGC",
    year: 2024,
    regulation: "F",
    label: "SV: Reg F",
    showdownName: "[Gen 9] VGC 2024 Reg F",
    doubles: true,
    active: false,
  },
  {
    id: "gen9vgc2024rege",
    game: "Scarlet & Violet",
    gameShort: "SV",
    generation: 9,
    category: "VGC",
    year: 2024,
    regulation: "E",
    label: "SV: Reg E",
    showdownName: "[Gen 9] VGC 2024 Reg E",
    doubles: true,
    active: false,
  },
  {
    id: "gen9vgc2023regd",
    game: "Scarlet & Violet",
    gameShort: "SV",
    generation: 9,
    category: "VGC",
    year: 2023,
    regulation: "D",
    label: "SV: Reg D",
    showdownName: "[Gen 9] VGC 2023 Reg D",
    doubles: true,
    active: false,
  },
  {
    id: "gen9vgc2023regc",
    game: "Scarlet & Violet",
    gameShort: "SV",
    generation: 9,
    category: "VGC",
    year: 2023,
    regulation: "C",
    label: "SV: Reg C",
    showdownName: "[Gen 9] VGC 2023 Reg C",
    doubles: true,
    active: false,
  },
  {
    id: "gen9vgc2023regb",
    game: "Scarlet & Violet",
    gameShort: "SV",
    generation: 9,
    category: "VGC",
    year: 2023,
    regulation: "B",
    label: "SV: Reg B",
    showdownName: "[Gen 9] VGC 2023 Reg B",
    doubles: true,
    active: false,
  },
  {
    id: "gen9vgc2023rega",
    game: "Scarlet & Violet",
    gameShort: "SV",
    generation: 9,
    category: "VGC",
    year: 2023,
    regulation: "A",
    label: "SV: Reg A",
    showdownName: "[Gen 9] VGC 2023 Reg A",
    doubles: true,
    active: false,
  },

  // =========================================================================
  // Sword & Shield (Gen 8) — 2020-2022
  // =========================================================================
  {
    id: "gen8vgc2022",
    game: "Sword & Shield",
    gameShort: "SwSh",
    generation: 8,
    category: "VGC",
    year: 2022,
    regulation: null,
    label: "SwSh: VGC 2022",
    showdownName: "[Gen 8] VGC 2022",
    doubles: true,
    active: false,
  },
  {
    id: "gen8vgc2021series11",
    game: "Sword & Shield",
    gameShort: "SwSh",
    generation: 8,
    category: "VGC",
    year: 2021,
    regulation: "Series 11",
    label: "SwSh: Series 11",
    showdownName: "[Gen 8] VGC 2021 Series 11",
    doubles: true,
    active: false,
  },
  {
    id: "gen8vgc2021series10",
    game: "Sword & Shield",
    gameShort: "SwSh",
    generation: 8,
    category: "VGC",
    year: 2021,
    regulation: "Series 10",
    label: "SwSh: Series 10",
    showdownName: "[Gen 8] VGC 2021 Series 10",
    doubles: true,
    active: false,
  },
  {
    id: "gen8vgc2021series9",
    game: "Sword & Shield",
    gameShort: "SwSh",
    generation: 8,
    category: "VGC",
    year: 2021,
    regulation: "Series 9",
    label: "SwSh: Series 9",
    showdownName: "[Gen 8] VGC 2021 Series 9",
    doubles: true,
    active: false,
  },
  {
    id: "gen8vgc2020",
    game: "Sword & Shield",
    gameShort: "SwSh",
    generation: 8,
    category: "VGC",
    year: 2020,
    regulation: null,
    label: "SwSh: VGC 2020",
    showdownName: "[Gen 8] VGC 2020",
    doubles: true,
    active: false,
  },

  // =========================================================================
  // Sun & Moon / Ultra Sun & Ultra Moon (Gen 7) — 2017-2019
  // =========================================================================
  {
    id: "gen7vgc2019ultraseries",
    game: "Sun & Moon",
    gameShort: "SM",
    generation: 7,
    category: "VGC",
    year: 2019,
    regulation: "Ultra Series",
    label: "SM: Ultra Series",
    showdownName: "[Gen 7] VGC 2019 Ultra Series",
    doubles: true,
    active: false,
  },
  {
    id: "gen7vgc2019sunseries",
    game: "Sun & Moon",
    gameShort: "SM",
    generation: 7,
    category: "VGC",
    year: 2019,
    regulation: "Sun Series",
    label: "SM: Sun Series",
    showdownName: "[Gen 7] VGC 2019 Sun Series",
    doubles: true,
    active: false,
  },
  {
    id: "gen7vgc2019moonseries",
    game: "Sun & Moon",
    gameShort: "SM",
    generation: 7,
    category: "VGC",
    year: 2019,
    regulation: "Moon Series",
    label: "SM: Moon Series",
    showdownName: "[Gen 7] VGC 2019 Moon Series",
    doubles: true,
    active: false,
  },
  {
    id: "gen7vgc2018",
    game: "Sun & Moon",
    gameShort: "SM",
    generation: 7,
    category: "VGC",
    year: 2018,
    regulation: null,
    label: "SM: VGC 2018",
    showdownName: "[Gen 7] VGC 2018",
    doubles: true,
    active: false,
  },
  {
    id: "gen7vgc2017",
    game: "Sun & Moon",
    gameShort: "SM",
    generation: 7,
    category: "VGC",
    year: 2017,
    regulation: null,
    label: "SM: VGC 2017",
    showdownName: "[Gen 7] VGC 2017",
    doubles: true,
    active: false,
  },

  // =========================================================================
  // X & Y / Omega Ruby & Alpha Sapphire (Gen 6) — 2014-2016
  // =========================================================================
  {
    id: "gen6vgc2016",
    game: "X & Y",
    gameShort: "XY",
    generation: 6,
    category: "VGC",
    year: 2016,
    regulation: null,
    label: "XY: VGC 2016",
    showdownName: "[Gen 6] VGC 2016",
    doubles: true,
    active: false,
  },
  {
    id: "gen6vgc2015",
    game: "X & Y",
    gameShort: "XY",
    generation: 6,
    category: "VGC",
    year: 2015,
    regulation: null,
    label: "XY: VGC 2015",
    showdownName: "[Gen 6] VGC 2015",
    doubles: true,
    active: false,
  },
  {
    id: "gen6vgc2014",
    game: "X & Y",
    gameShort: "XY",
    generation: 6,
    category: "VGC",
    year: 2014,
    regulation: null,
    label: "XY: VGC 2014",
    showdownName: "[Gen 6] VGC 2014",
    doubles: true,
    active: false,
  },

  // =========================================================================
  // Black & White (Gen 5) — 2011-2013
  // =========================================================================
  {
    id: "gen5vgc2013",
    game: "Black & White",
    gameShort: "BW",
    generation: 5,
    category: "VGC",
    year: 2013,
    regulation: null,
    label: "BW: VGC 2013",
    showdownName: "[Gen 5] VGC 2013",
    doubles: true,
    active: false,
  },
  {
    id: "gen5vgc2012",
    game: "Black & White",
    gameShort: "BW",
    generation: 5,
    category: "VGC",
    year: 2012,
    regulation: null,
    label: "BW: VGC 2012",
    showdownName: "[Gen 5] VGC 2012",
    doubles: true,
    active: false,
  },
  {
    id: "gen5vgc2011",
    game: "Black & White",
    gameShort: "BW",
    generation: 5,
    category: "VGC",
    year: 2011,
    regulation: null,
    label: "BW: VGC 2011",
    showdownName: "[Gen 5] VGC 2011",
    doubles: true,
    active: false,
  },

  // =========================================================================
  // Diamond & Pearl / HeartGold & SoulSilver (Gen 4) — 2009-2010
  // =========================================================================
  {
    id: "gen4vgc2010",
    game: "Diamond & Pearl",
    gameShort: "DP",
    generation: 4,
    category: "VGC",
    year: 2010,
    regulation: null,
    label: "DP: VGC 2010",
    showdownName: "[Gen 4] VGC 2010",
    doubles: true,
    active: false,
  },
  {
    id: "gen4vgc2009",
    game: "Diamond & Pearl",
    gameShort: "DP",
    generation: 4,
    category: "VGC",
    year: 2009,
    regulation: null,
    label: "DP: VGC 2009",
    showdownName: "[Gen 4] VGC 2009",
    doubles: true,
    active: false,
  },
];

// =============================================================================
// Lookup helpers
// =============================================================================

/** All formats indexed by Showdown ID for O(1) lookup */
const FORMAT_BY_ID = new Map<string, GameFormat>(
  VGC_FORMATS.map((f) => [f.id, f])
);

/** Get a format by its Showdown ID */
export function getFormatById(id: string): GameFormat | undefined {
  return FORMAT_BY_ID.get(id);
}

/** Get display label for a Showdown format ID (returns the ID itself if unknown) */
export function getFormatLabel(id: string): string {
  return FORMAT_BY_ID.get(id)?.label ?? id;
}

/** Pre-computed: formats grouped by game name */
const FORMATS_BY_GAME = new Map<string, GameFormat[]>();
for (const f of VGC_FORMATS) {
  const existing = FORMATS_BY_GAME.get(f.game);
  if (existing) {
    existing.push(f);
  } else {
    FORMATS_BY_GAME.set(f.game, [f]);
  }
}

/** Pre-computed: currently active formats */
const ACTIVE_FORMATS = VGC_FORMATS.filter((f) => f.active);

/** Pre-computed: unique games in order (newest first) */
const AVAILABLE_GAMES: Array<{
  name: string;
  shortName: string;
  generation: number;
}> = [];
{
  const seen = new Set<string>();
  for (const f of VGC_FORMATS) {
    if (!seen.has(f.game)) {
      seen.add(f.game);
      AVAILABLE_GAMES.push({
        name: f.game,
        shortName: f.gameShort,
        generation: f.generation,
      });
    }
  }
}

/** Get all formats for a specific game (e.g., "Scarlet & Violet") */
export function getFormatsByGame(gameName: string): GameFormat[] {
  return FORMATS_BY_GAME.get(gameName) ?? [];
}

/** Get all currently active formats */
export function getActiveFormats(): GameFormat[] {
  return ACTIVE_FORMATS;
}

/** Get all unique game names (for the game selector dropdown) */
export function getAvailableGames(): typeof AVAILABLE_GAMES {
  return AVAILABLE_GAMES;
}

/** Get all Showdown format IDs */
export const ALL_FORMAT_IDS = VGC_FORMATS.map((f) => f.id);
