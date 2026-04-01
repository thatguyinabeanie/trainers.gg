/**
 * Pokemon competitive format registry
 *
 * Maps Showdown format IDs to display metadata for UI and analytics.
 * Showdown format IDs are the canonical identifiers stored in the database
 * (tournaments.game_format column). The UI uses the display fields to show
 * friendly names like "Scarlet & Violet" and "VGC 2026 Reg I".
 *
 * Format ID convention: gen{N}{format}{year}reg{letter}
 *   - gen9vgc2026regi = Generation 9, VGC 2026, Regulation I
 *   - Matches Pokemon Showdown's format IDs exactly
 *   - Source: https://github.com/smogon/pokemon-showdown/blob/master/config/formats.ts
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
  /** Generation number */
  generation: number;
  /** Competition format category (e.g., "VGC", "BSS", "Smogon OU") */
  category: string;
  /** Year the regulation applies to */
  year: number;
  /** Regulation set letter (e.g., "I", "F", "G") — null if no regulation */
  regulation: string | null;
  /** Short display label for lists and badges (e.g., "VGC 2026 Reg I") */
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
  scarletViolet: {
    name: "Scarlet & Violet",
    shortName: "SV",
    generation: 9,
  },
  swordShield: {
    name: "Sword & Shield",
    shortName: "SS",
    generation: 8,
  },
  sunMoon: {
    name: "Sun & Moon",
    shortName: "SM",
    generation: 7,
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
  // --- Scarlet & Violet (Gen 9) ---
  {
    id: "gen9vgc2026regi",
    game: "Scarlet & Violet",
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
    generation: 9,
    category: "VGC",
    year: 2023,
    regulation: "C",
    label: "SV: Reg C",
    showdownName: "[Gen 9] VGC 2023 Reg C",
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

/** Get all formats for a specific game (e.g., "Scarlet & Violet") */
export function getFormatsByGame(gameName: string): GameFormat[] {
  return VGC_FORMATS.filter((f) => f.game === gameName);
}

/** Get all currently active formats */
export function getActiveFormats(): GameFormat[] {
  return VGC_FORMATS.filter((f) => f.active);
}

/** Get all unique game names (for the game selector dropdown) */
export function getAvailableGames(): Array<{
  name: string;
  generation: number;
}> {
  const seen = new Set<string>();
  const games: Array<{ name: string; generation: number }> = [];

  for (const format of VGC_FORMATS) {
    if (!seen.has(format.game)) {
      seen.add(format.game);
      games.push({ name: format.game, generation: format.generation });
    }
  }

  return games;
}

/** Get all Showdown format IDs as a union type helper */
export const ALL_FORMAT_IDS = VGC_FORMATS.map((f) => f.id);
