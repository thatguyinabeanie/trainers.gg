/**
 * Pokemon stats calculator
 * Calculates actual stats based on base stats, level, nature, EVs, and IVs
 */

import { Dex } from "@pkmn/dex";

import { REG_MA_BUNDLE } from "./champions-reg-ma";
import { REG_MB_BUNDLE } from "./champions-reg-mb";

/**
 * Composed map of all Champions-exclusive mega base stats, drawn from
 * all registered regulation bundles (M-A + M-B). M-B is a superset of M-A,
 * but we compose manually from both leaf files to avoid importing from
 * format-legality (which would create a circular dependency).
 */
const CHAMPIONS_EXCLUSIVE_MEGA_STATS = new Map([
  ...REG_MA_BUNDLE.megaStats,
  ...REG_MB_BUNDLE.megaStats,
]);

/**
 * Composed map of all Champions-exclusive mega type overrides from all
 * registered bundles. M-B adds Staraptor-Mega and Barbaracle-Mega.
 */
const CHAMPIONS_MEGA_TYPE_OVERRIDES: ReadonlyMap<string, readonly string[]> =
  new Map([...REG_MA_BUNDLE.megaTypes, ...REG_MB_BUNDLE.megaTypes]);

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface NatureEffect {
  boost?: keyof Omit<BaseStats, "hp">;
  reduce?: keyof Omit<BaseStats, "hp">;
}

/**
 * Canonical 25-nature roster. Source of truth for the `Nature` type and the
 * `isNature` runtime guard. Order matches `NATURE_EFFECTS` and the picker's
 * preferred display order.
 */
export const ALL_NATURES = [
  "Hardy",
  "Lonely",
  "Brave",
  "Adamant",
  "Naughty",
  "Bold",
  "Docile",
  "Relaxed",
  "Impish",
  "Lax",
  "Timid",
  "Hasty",
  "Serious",
  "Jolly",
  "Naive",
  "Modest",
  "Mild",
  "Quiet",
  "Bashful",
  "Rash",
  "Calm",
  "Gentle",
  "Sassy",
  "Careful",
  "Quirky",
] as const;

/** 25-nature literal union. Derived from `ALL_NATURES`. */
export type Nature = (typeof ALL_NATURES)[number];

const ALL_NATURES_SET: ReadonlySet<string> = new Set(ALL_NATURES);

/** Runtime guard. Use at parse-time / DB-read boundaries. */
export function isNature(s: string | null | undefined): s is Nature {
  return s != null && ALL_NATURES_SET.has(s);
}

export const NATURE_EFFECTS: Record<string, NatureEffect> = {
  Hardy: {},
  Lonely: { boost: "attack", reduce: "defense" },
  Brave: { boost: "attack", reduce: "speed" },
  Adamant: { boost: "attack", reduce: "specialAttack" },
  Naughty: { boost: "attack", reduce: "specialDefense" },
  Bold: { boost: "defense", reduce: "attack" },
  Docile: {},
  Relaxed: { boost: "defense", reduce: "speed" },
  Impish: { boost: "defense", reduce: "specialAttack" },
  Lax: { boost: "defense", reduce: "specialDefense" },
  Timid: { boost: "speed", reduce: "attack" },
  Hasty: { boost: "speed", reduce: "defense" },
  Serious: {},
  Jolly: { boost: "speed", reduce: "specialAttack" },
  Naive: { boost: "speed", reduce: "specialDefense" },
  Modest: { boost: "specialAttack", reduce: "attack" },
  Mild: { boost: "specialAttack", reduce: "defense" },
  Quiet: { boost: "specialAttack", reduce: "speed" },
  Bashful: {},
  Rash: { boost: "specialAttack", reduce: "specialDefense" },
  Calm: { boost: "specialDefense", reduce: "attack" },
  Gentle: { boost: "specialDefense", reduce: "defense" },
  Sassy: { boost: "specialDefense", reduce: "speed" },
  Careful: { boost: "specialDefense", reduce: "specialAttack" },
  Quirky: {},
};

// Some example base stats for common Pokemon
export const POKEMON_BASE_STATS: Record<string, BaseStats> = {
  Pikachu: {
    hp: 35,
    attack: 55,
    defense: 40,
    specialAttack: 50,
    specialDefense: 50,
    speed: 90,
  },
  Charizard: {
    hp: 78,
    attack: 84,
    defense: 78,
    specialAttack: 109,
    specialDefense: 85,
    speed: 100,
  },
  Garchomp: {
    hp: 108,
    attack: 130,
    defense: 95,
    specialAttack: 80,
    specialDefense: 85,
    speed: 102,
  },
  Rillaboom: {
    hp: 100,
    attack: 125,
    defense: 90,
    specialAttack: 60,
    specialDefense: 70,
    speed: 85,
  },
  Incineroar: {
    hp: 95,
    attack: 115,
    defense: 90,
    specialAttack: 80,
    specialDefense: 90,
    speed: 60,
  },
  "Flutter Mane": {
    hp: 55,
    attack: 55,
    defense: 55,
    specialAttack: 135,
    specialDefense: 135,
    speed: 135,
  },
  "Iron Hands": {
    hp: 154,
    attack: 140,
    defense: 108,
    specialAttack: 50,
    specialDefense: 68,
    speed: 50,
  },
  Gholdengo: {
    hp: 87,
    attack: 60,
    defense: 95,
    specialAttack: 133,
    specialDefense: 91,
    speed: 84,
  },
};

/**
 * Look up a species' base stats from the Pokédex.
 * Returns null if the species is not found in the dex.
 *
 * Resolution order:
 *   1. Champions-exclusive mega forms (custom table — not in @pkmn/dex)
 *   2. Gen 9 dex (works for current-gen + Past-tagged species)
 *   3. Gen 6 dex fallback — standard Gen 6/7 mega forms have exists:false
 *      in Gen 9 since mega evolution was removed in Gen 8+
 */
export function getBaseStats(species: string): BaseStats | null {
  // 1. Champions-exclusive mega forms not in @pkmn/dex
  const customRaw = CHAMPIONS_EXCLUSIVE_MEGA_STATS.get(species);
  if (customRaw) {
    return {
      hp: customRaw.hp,
      attack: customRaw.atk,
      defense: customRaw.def,
      specialAttack: customRaw.spa,
      specialDefense: customRaw.spd,
      speed: customRaw.spe,
    };
  }
  try {
    // 2. Try Gen 9 first (works for current gen + Past-tagged species)
    let s = Dex.forGen(9).species.get(species);
    // 3. Standard Gen 6/7 megas have exists:false in Gen 9 — fall back to Gen 6
    if (!s?.exists) {
      s = Dex.forGen(6).species.get(species);
    }
    if (!s?.exists) return null;
    const { hp, atk, def, spa, spd, spe } = s.baseStats;
    return {
      hp,
      attack: atk,
      defense: def,
      specialAttack: spa,
      specialDefense: spd,
      speed: spe,
    };
  } catch {
    return null;
  }
}

/**
 * Look up any custom type override for a Champions mega species.
 *
 * M-A currently has no entries — `REG_MA_BUNDLE.megaTypes` is an empty Map.
 * This resolver is wired here so T5 (or any future regulation) can populate
 * `bundle.megaTypes` without touching the call-site in the damage calculator.
 *
 * Synthetic-mega TYPE resolution today:
 *   - Standard Gen 6/7 megas: types come from @pkmn/dex Gen 6 species data.
 *     `getBaseStats()` already falls back to Gen 6 for stats; the damage
 *     calculator reads `types` from the same dex entry via `Dex.forGen(6)`.
 *   - Champions-exclusive megas (e.g. Greninja-Mega): @pkmn/dex has no entry.
 *     The damage calculator currently derives types by stripping "-Mega" and
 *     reading the base species types. Type overrides in `bundle.megaTypes` are
 *     NOT yet wired into the damage calculator — that wiring is T5's job.
 *     Call this function from the damage calculator's type resolver to pick up
 *     overrides once they exist.
 *
 * Returns the override type array if present, or null to signal "use default
 * resolution" (strip "-Mega" → base species types from @pkmn/dex).
 */
export function getChampionsMegaTypeOverride(
  species: string
): readonly string[] | null {
  return CHAMPIONS_MEGA_TYPE_OVERRIDES.get(species) ?? null;
}

/**
 * Calculate HP stat
 */
export function calculateHP(
  base: number,
  iv: number,
  ev: number,
  level: number
): number {
  if (base === 1) return 1; // Shedinja special case
  return (
    Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) +
    level +
    10
  );
}

/**
 * Calculate non-HP stat
 */
export function calculateStat(
  base: number,
  iv: number,
  ev: number,
  level: number,
  natureMultiplier: number
): number {
  const stat =
    Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(stat * natureMultiplier);
}

// =============================================================================
// Pokemon Champions (Gen 10) — SP stat formulas
// =============================================================================

/**
 * Calculate HP stat for Pokemon Champions (Gen 10 SP system).
 *
 * Formula derived from the Nerd of Now damage calculator:
 *   floor((base * 2 + 31) * 50 / 100) + 50 + 10 + sp
 *
 * Champions always plays at level 50. There are no IVs — base IVs of 31 are
 * baked into the formula. SP is 0-32 and adds directly to the HP total.
 *
 * Special case: base=1 (Shedinja equivalent) always returns 1.
 */
export function calculateChampionsHP(base: number, sp: number): number {
  if (base === 1) return 1;
  return Math.floor(((base * 2 + 31) * 50) / 100) + 50 + 10 + sp;
}

/**
 * Calculate a non-HP stat for Pokemon Champions (Gen 10 SP system).
 *
 * Formula derived from the Nerd of Now damage calculator:
 *   floor(((floor((base * 2 + 31) * 50 / 100) + 5) + sp) * nature)
 *
 * Note: nature still applies to stats in Champions, but nature is optional —
 * pass 1.0 for neutral nature. SP is 0-32 and adds before the nature multiply.
 */
export function calculateChampionsStat(
  base: number,
  sp: number,
  natureMultiplier: number
): number {
  const inner = Math.floor(((base * 2 + 31) * 50) / 100) + 5;
  return Math.floor((inner + sp) * natureMultiplier);
}

/**
 * Get nature multiplier for a stat
 */
export function getNatureMultiplier(
  nature: string,
  stat: keyof Omit<BaseStats, "hp">
): number {
  const effect = NATURE_EFFECTS[nature];
  if (!effect) return 1.0;

  if (effect.boost === stat) return 1.1;
  if (effect.reduce === stat) return 0.9;
  return 1.0;
}

/**
 * Calculate all stats for a Pokemon
 */
export function calculateStats(
  species: string,
  level: number,
  nature: string,
  evs: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  },
  ivs: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  }
): BaseStats {
  // Prefer dex lookup; fall back to legacy hardcoded map then placeholder
  const baseStats =
    getBaseStats(species) ?? POKEMON_BASE_STATS[species] ?? null;
  if (!baseStats) {
    return {
      hp: 100,
      attack: 100,
      defense: 100,
      specialAttack: 100,
      specialDefense: 100,
      speed: 100,
    };
  }

  return {
    hp: calculateHP(baseStats.hp, ivs.hp, evs.hp, level),
    attack: calculateStat(
      baseStats.attack,
      ivs.attack,
      evs.attack,
      level,
      getNatureMultiplier(nature, "attack")
    ),
    defense: calculateStat(
      baseStats.defense,
      ivs.defense,
      evs.defense,
      level,
      getNatureMultiplier(nature, "defense")
    ),
    specialAttack: calculateStat(
      baseStats.specialAttack,
      ivs.specialAttack,
      evs.specialAttack,
      level,
      getNatureMultiplier(nature, "specialAttack")
    ),
    specialDefense: calculateStat(
      baseStats.specialDefense,
      ivs.specialDefense,
      evs.specialDefense,
      level,
      getNatureMultiplier(nature, "specialDefense")
    ),
    speed: calculateStat(
      baseStats.speed,
      ivs.speed,
      evs.speed,
      level,
      getNatureMultiplier(nature, "speed")
    ),
  };
}

/**
 * Get stat stage multipliers for in-battle stat changes
 */
export function getStatStageMultiplier(stage: number): number {
  const multipliers: Record<number, number> = {
    [-6]: 0.25,
    [-5]: 0.28,
    [-4]: 0.33,
    [-3]: 0.4,
    [-2]: 0.5,
    [-1]: 0.66,
    [0]: 1,
    [1]: 1.5,
    [2]: 2,
    [3]: 2.5,
    [4]: 3,
    [5]: 3.5,
    [6]: 4,
  };
  return multipliers[stage] || 1;
}

/**
 * Format stats for display
 */
export function formatStats(stats: BaseStats): string {
  return `HP: ${stats.hp} | Atk: ${stats.attack} | Def: ${stats.defense} | SpA: ${stats.specialAttack} | SpD: ${stats.specialDefense} | Spe: ${stats.speed}`;
}

/**
 * Get stat color based on value (for UI display)
 */
export function getStatColor(value: number): string {
  if (value >= 200) return "text-purple-500";
  if (value >= 150) return "text-blue-500";
  if (value >= 100) return "text-green-500";
  if (value >= 50) return "text-yellow-500";
  return "text-red-500";
}

/**
 * Calculate bulk (effective HP considering defenses)
 */
export function calculateBulk(
  hp: number,
  defense: number,
  specialDefense: number
): {
  physical: number;
  special: number;
  overall: number;
} {
  const physical = Math.floor((hp * defense) / 100);
  const special = Math.floor((hp * specialDefense) / 100);
  const overall = Math.floor((physical + special) / 2);

  return { physical, special, overall };
}
