/**
 * Curated meta-relevant speed tiers per format.
 *
 * For v1 we ship Champions Reg M-A only — a focused cross-section of the
 * format's most-played species (fast threats, mid-tier flex, slow trick-room
 * pieces, weather setters). Other formats can be added as-needed.
 *
 * The L50 stat values for fastSpread / slowSpread are the standard competitive
 * benchmarks (252+ Spe Timid/Jolly vs 0/-).
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
// Champions Reg M-A meta speed tiers
// =============================================================================

/**
 * Curated cross-section of ~30 meta-relevant species for Champions Reg M-A.
 * Ordered descending by base Speed for easy scanning.
 */
const CHAMPIONS_REGMA_SPEED_TIERS: MetaSpeedEntry[] = [
  // ---------- Very fast (base 130+) ----------
  {
    species: "ironbundle",
    displayName: "Iron Bundle",
    base: 136,
    fastSpread: 200,
    slowSpread: 156,
  },
  {
    species: "dragapult",
    displayName: "Dragapult",
    base: 142,
    fastSpread: 207,
    slowSpread: 162,
  },
  {
    species: "ironvaliant",
    displayName: "Iron Valiant",
    base: 116,
    fastSpread: 178,
    slowSpread: 136,
  },
  {
    species: "miraidon",
    displayName: "Miraidon",
    base: 135,
    fastSpread: 199,
    slowSpread: 155,
  },
  {
    species: "chiyu",
    displayName: "Chi-Yu",
    base: 100,
    fastSpread: 161,
    slowSpread: 121,
  },

  // ---------- Fast (base 100–129) ----------
  {
    species: "tornadus",
    displayName: "Tornadus",
    base: 121,
    fastSpread: 184,
    slowSpread: 141,
  },
  {
    species: "whimsicott",
    displayName: "Whimsicott",
    base: 116,
    fastSpread: 178,
    slowSpread: 136,
  },
  {
    species: "raginbolt",
    displayName: "Raging Bolt",
    base: 75,
    fastSpread: 134,
    slowSpread: 100,
  },
  {
    species: "flutter mane",
    displayName: "Flutter Mane",
    base: 135,
    fastSpread: 199,
    slowSpread: 155,
  },
  {
    species: "barraskewda",
    displayName: "Barraskewda",
    base: 136,
    fastSpread: 200,
    slowSpread: 156,
    speedAbility: "swift-swim",
  },

  // ---------- Mid (base 80–99) ----------
  {
    species: "volcarona",
    displayName: "Volcarona",
    base: 100,
    fastSpread: 161,
    slowSpread: 121,
  },
  {
    species: "calyrex-shadow",
    displayName: "Calyrex-Shadow",
    base: 150,
    fastSpread: 216,
    slowSpread: 170,
  },
  {
    species: "calyrex-ice",
    displayName: "Calyrex-Ice",
    base: 50,
    fastSpread: 106,
    slowSpread: 80,
  },
  {
    species: "tinkaton",
    displayName: "Tinkaton",
    base: 94,
    fastSpread: 154,
    slowSpread: 115,
  },
  {
    species: "garchomp",
    displayName: "Garchomp",
    base: 102,
    fastSpread: 163,
    slowSpread: 123,
  },
  {
    species: "rillaboom",
    displayName: "Rillaboom",
    base: 85,
    fastSpread: 145,
    slowSpread: 107,
  },

  // ---------- Mid-slow (base 60–79) ----------
  {
    species: "ironhands",
    displayName: "Iron Hands",
    base: 50,
    fastSpread: 106,
    slowSpread: 80,
  },
  {
    species: "amoonguss",
    displayName: "Amoonguss",
    base: 30,
    fastSpread: 84,
    slowSpread: 60,
  },
  {
    species: "pelipper",
    displayName: "Pelipper",
    base: 65,
    fastSpread: 122,
    slowSpread: 91,
  },
  {
    species: "venusaur",
    displayName: "Venusaur",
    base: 80,
    fastSpread: 139,
    slowSpread: 103,
    speedAbility: "chlorophyll",
  },
  {
    species: "tatsugiri",
    displayName: "Tatsugiri",
    base: 82,
    fastSpread: 142,
    slowSpread: 105,
  },

  // ---------- Slow (base 40–59) ----------
  {
    species: "incineroar",
    displayName: "Incineroar",
    base: 60,
    fastSpread: 117,
    slowSpread: 87,
  },
  {
    species: "indeedee-f",
    displayName: "Indeedee-F",
    base: 85,
    fastSpread: 145,
    slowSpread: 107,
  },
  {
    species: "ursalunabloodmoon",
    displayName: "Ursaluna-Bloodmoon",
    base: 52,
    fastSpread: 108,
    slowSpread: 81,
  },
  {
    species: "ursaluna",
    displayName: "Ursaluna",
    base: 55,
    fastSpread: 111,
    slowSpread: 83,
  },
  {
    species: "drifblim",
    displayName: "Drifblim",
    base: 80,
    fastSpread: 139,
    slowSpread: 103,
    speedAbility: "unburden",
  },

  // ---------- Very slow (base < 40) / Trick Room core ----------
  {
    species: "torkoal",
    displayName: "Torkoal",
    base: 20,
    fastSpread: 73,
    slowSpread: 50,
  },
  {
    species: "dondozo",
    displayName: "Dondozo",
    base: 35,
    fastSpread: 90,
    slowSpread: 65,
  },
  {
    species: "porygon2",
    displayName: "Porygon2",
    base: 60,
    fastSpread: 117,
    slowSpread: 87,
  },
  {
    species: "smeargle",
    displayName: "Smeargle",
    base: 75,
    fastSpread: 134,
    slowSpread: 100,
  },

  // ---------- Speed-boost / sand abilities ----------
  {
    species: "blaziken",
    displayName: "Blaziken",
    base: 80,
    fastSpread: 139,
    slowSpread: 103,
    speedAbility: "speed-boost",
  },
  {
    species: "drednaw",
    displayName: "Drednaw",
    base: 74,
    fastSpread: 132,
    slowSpread: 98,
    speedAbility: "swift-swim",
  },
];

const TIERS_BY_FORMAT: Record<string, MetaSpeedEntry[]> = {
  championsvgc2026regma: CHAMPIONS_REGMA_SPEED_TIERS,
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
 * @param formatId - Showdown format ID (e.g., "championsvgc2026regma")
 */
export function getMetaSpeedTiers(formatId: string): MetaSpeedEntry[] {
  return TIERS_BY_FORMAT[formatId] ?? [];
}
