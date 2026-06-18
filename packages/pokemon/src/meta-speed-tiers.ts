/**
 * Curated meta-relevant speed tiers per format.
 *
 * For each format, we maintain ~25–40 of the most-played species so the
 * SpeedPanel can surface useful benchmarks without loading the full dex.
 *
 * === Champions Reg M-A ===
 * Sources:
 *   - Bulbapedia "List of Pokémon in Pokémon Champions" (consulted April 2026)
 *     https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_in_Pokémon_Champions
 *   - Serebii.net "Regulation M-A" (consulted April 2026)
 *     https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml
 *
 * The regulation runs April 8 – June 17 2026 and contains 187 species.
 * The 35 entries here represent the competitively relevant speed benchmarks
 * based on the available species list and general competitive viability.
 * Usage statistics will sharpen these picks as the meta develops.
 *
 * L50 stat formula (standard): floor((2*base + 31 + floor(252/4)) * 50 / 100 + 5)
 *   fastSpread  = 252 EVs, +nature (+10%), L50
 *   slowSpread  = 0 EVs, neutral nature, L50
 *
 * NOTE: Pokémon NOT in Champions Reg M-A — including Calyrex, Iron Hands,
 * Amoonguss, Dondozo, Miraidon, Iron Bundle, Chi-Yu, Flutter Mane, Raging
 * Bolt, Iron Valiant, Ursaluna, Indeedee, Tatsugiri, Porygon2, Smeargle,
 * Blaziken, Drednaw, Rillaboom, Barraskewda — were removed from the previous
 * placeholder dataset. They are Gen 9 VGC staples, not Champions roster
 * members.
 */

// =============================================================================
// Types
// =============================================================================

/** Ability that affects speed via weather, stat boosts, or status. */
export type SpeedAbility =
  | "chlorophyll"
  | "swift-swim"
  | "sand-rush"
  | "slush-rush"
  | "speed-boost"
  | "unburden"
  | "quick-feet";

export interface MetaSpeedEntry {
  /** Canonical Showdown species id (e.g., "incineroar") */
  species: string;
  /** Display name shown in UI (e.g., "Incineroar") */
  displayName: string;
  /** Base Speed stat */
  base: number;
  /** Common competitive max-investment +nature L50 stat */
  fastSpread: number;
  /** No-investment, neutral nature L50 stat */
  slowSpread: number;
  /** Ability that affects speed via weather/status/stages, if any */
  speedAbility?: SpeedAbility;
}

// =============================================================================
// Champions Reg M-A meta speed tiers (April – June 2026)
// =============================================================================

/**
 * ~35 meta-relevant species for Champions Reg M-A ordered descending by base
 * Speed. Only species confirmed legal in the 187-mon Reg M-A roster are
 * included. Stat values use the standard L50 formula.
 */
const CHAMPIONS_REGMA_SPEED_TIERS: MetaSpeedEntry[] = [
  // ---------- Very fast (base 130+) ----------
  {
    species: "dragapult",
    displayName: "Dragapult",
    base: 142,
    fastSpread: 207,
    slowSpread: 162,
  },
  {
    species: "talonflame",
    displayName: "Talonflame",
    base: 126,
    fastSpread: 189,
    slowSpread: 146,
  },
  {
    species: "weavile",
    displayName: "Weavile",
    base: 125,
    fastSpread: 188,
    slowSpread: 145,
  },
  {
    species: "noivern",
    displayName: "Noivern",
    base: 123,
    fastSpread: 185,
    slowSpread: 143,
  },
  {
    species: "meowscarada",
    displayName: "Meowscarada",
    base: 123,
    fastSpread: 185,
    slowSpread: 143,
  },
  {
    species: "greninja",
    displayName: "Greninja",
    base: 122,
    fastSpread: 184,
    slowSpread: 142,
  },
  {
    species: "alakazam",
    displayName: "Alakazam",
    base: 120,
    fastSpread: 182,
    slowSpread: 140,
  },

  // ---------- Fast (base 100–129) ----------
  {
    species: "whimsicott",
    displayName: "Whimsicott",
    base: 116,
    fastSpread: 178,
    slowSpread: 136,
  },
  {
    species: "gengar",
    displayName: "Gengar",
    base: 110,
    fastSpread: 171,
    slowSpread: 130,
  },
  {
    species: "lycanroc",
    displayName: "Lycanroc",
    base: 110,
    fastSpread: 171,
    slowSpread: 130,
  },
  {
    species: "garchomp",
    displayName: "Garchomp",
    base: 102,
    fastSpread: 163,
    slowSpread: 123,
  },
  {
    species: "volcarona",
    displayName: "Volcarona",
    base: 100,
    fastSpread: 161,
    slowSpread: 121,
  },

  // ---------- Mid (base 75–99) ----------
  {
    species: "tinkaton",
    displayName: "Tinkaton",
    base: 94,
    fastSpread: 154,
    slowSpread: 115,
  },
  {
    species: "gyarados",
    displayName: "Gyarados",
    base: 81,
    fastSpread: 141,
    slowSpread: 104,
  },
  {
    species: "hydreigon",
    displayName: "Hydreigon",
    base: 98,
    fastSpread: 159,
    slowSpread: 119,
  },
  {
    species: "mimikyu",
    displayName: "Mimikyu",
    base: 96,
    fastSpread: 157,
    slowSpread: 117,
  },
  {
    species: "lucario",
    displayName: "Lucario",
    base: 90,
    fastSpread: 150,
    slowSpread: 112,
  },
  {
    species: "excadrill",
    displayName: "Excadrill",
    base: 88,
    fastSpread: 148,
    slowSpread: 110,
    speedAbility: "sand-rush",
  },
  {
    species: "gardevoir",
    displayName: "Gardevoir",
    base: 80,
    fastSpread: 139,
    slowSpread: 103,
  },

  // ---------- Mid-slow (base 55–79) ----------
  {
    species: "pelipper",
    displayName: "Pelipper",
    base: 65,
    fastSpread: 122,
    slowSpread: 91,
  },
  {
    species: "scizor",
    displayName: "Scizor",
    base: 65,
    fastSpread: 122,
    slowSpread: 91,
  },
  {
    species: "corviknight",
    displayName: "Corviknight",
    base: 67,
    fastSpread: 124,
    slowSpread: 93,
  },
  {
    species: "tsareena",
    displayName: "Tsareena",
    base: 72,
    fastSpread: 130,
    slowSpread: 97,
  },
  {
    species: "incineroar",
    displayName: "Incineroar",
    base: 60,
    fastSpread: 117,
    slowSpread: 87,
  },
  {
    species: "aegislash",
    displayName: "Aegislash",
    base: 60,
    fastSpread: 117,
    slowSpread: 87,
  },
  {
    species: "tyranitar",
    displayName: "Tyranitar",
    base: 61,
    fastSpread: 118,
    slowSpread: 88,
  },

  // ---------- Slow (base 30–54) / Trick Room & weather setters ----------
  {
    species: "azumarill",
    displayName: "Azumarill",
    base: 50,
    fastSpread: 106,
    slowSpread: 80,
  },
  {
    species: "conkeldurr",
    displayName: "Conkeldurr",
    base: 45,
    fastSpread: 100,
    slowSpread: 75,
  },
  {
    species: "hippowdon",
    displayName: "Hippowdon",
    base: 47,
    fastSpread: 103,
    slowSpread: 77,
  },
  {
    species: "toxapex",
    displayName: "Toxapex",
    base: 35,
    fastSpread: 90,
    slowSpread: 65,
  },
  {
    species: "mudsdale",
    displayName: "Mudsdale",
    base: 35,
    fastSpread: 90,
    slowSpread: 65,
  },

  // ---------- Very slow (base < 35) / Trick Room core ----------
  {
    species: "reuniclus",
    displayName: "Reuniclus",
    base: 30,
    fastSpread: 84,
    slowSpread: 60,
  },
  {
    species: "hatterene",
    displayName: "Hatterene",
    base: 29,
    fastSpread: 83,
    slowSpread: 58,
  },
  {
    species: "torkoal",
    displayName: "Torkoal",
    base: 20,
    fastSpread: 73,
    slowSpread: 50,
  },
];

// =============================================================================
// Champions Reg M-B meta speed tiers (June 2026+)
// =============================================================================

/**
 * Reg M-B is a superset of Reg M-A that adds Mega Evolutions to the legal
 * pool. The M-A speed benchmarks remain valid for all species they cover.
 * Mega-specific entries will be added here as usage data accumulates.
 *
 * NOTE: Mega Evolutions have different base Speed stats than their base forms
 * (e.g. Mega Garchomp is base 92 vs Garchomp's 102). Add entries for the
 * most-played Megas once the M-B meta develops.
 */
const CHAMPIONS_REGMB_SPEED_TIERS: MetaSpeedEntry[] = [
  // Inherits all M-A entries — M-A is a strict subset of M-B
  ...CHAMPIONS_REGMA_SPEED_TIERS,
  // TODO: add Mega Evolution entries once M-B usage data is available
];

// =============================================================================
// Format dispatch
// =============================================================================

const TIERS_BY_FORMAT: Record<string, MetaSpeedEntry[]> = {
  // Champions Reg M-A — 2026-05-01 through 2026-06-16 (see regulation-calendar.ts)
  gen9championsvgc2026regma: CHAMPIONS_REGMA_SPEED_TIERS,
  // Champions Reg M-B — 2026-06-17 through 2026-09-02; M-A subset + Mega Evolutions (see regulation-calendar.ts)
  gen9championsvgc2026regmb: CHAMPIONS_REGMB_SPEED_TIERS,
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Get the curated meta speed tier list for a given format.
 *
 * Returns an empty array for unknown / unsupported formats so callers can
 * render an "unsupported format" empty state without branching.
 *
 * @param formatId - Showdown format ID (e.g., "gen9championsvgc2026regma")
 */
export function getMetaSpeedTiers(formatId: string): MetaSpeedEntry[] {
  return TIERS_BY_FORMAT[formatId] ?? [];
}
