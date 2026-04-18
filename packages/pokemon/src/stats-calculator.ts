/**
 * Pokemon stats calculator
 * Calculates actual stats based on base stats, level, nature, EVs, and IVs
 */

import { Dex } from "@pkmn/dex";

/** Base stats for Champions-exclusive mega forms not present in @pkmn/dex. */
const CHAMPIONS_EXCLUSIVE_MEGA_STATS: ReadonlyMap<
  string,
  {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  }
> = new Map([
  [
    "Chandelure-Mega",
    { hp: 60, atk: 75, def: 110, spa: 175, spd: 110, spe: 90 },
  ],
  [
    "Chesnaught-Mega",
    { hp: 88, atk: 147, def: 162, spa: 74, spd: 95, spe: 84 },
  ],
  ["Chimecho-Mega", { hp: 75, atk: 50, def: 110, spa: 135, spd: 120, spe: 65 }],
  ["Clefable-Mega", { hp: 95, atk: 80, def: 93, spa: 135, spd: 110, spe: 70 }],
  [
    "Crabominable-Mega",
    { hp: 97, atk: 157, def: 122, spa: 62, spd: 107, spe: 33 },
  ],
  ["Delphox-Mega", { hp: 75, atk: 69, def: 72, spa: 159, spd: 125, spe: 134 }],
  [
    "Dragonite-Mega",
    { hp: 91, atk: 124, def: 115, spa: 145, spd: 125, spe: 100 },
  ],
  ["Drampa-Mega", { hp: 78, atk: 85, def: 110, spa: 160, spd: 116, spe: 36 }],
  ["Emboar-Mega", { hp: 110, atk: 148, def: 75, spa: 110, spd: 110, spe: 75 }],
  [
    "Excadrill-Mega",
    { hp: 110, atk: 165, def: 100, spa: 65, spd: 65, spe: 103 },
  ],
  [
    "Feraligatr-Mega",
    { hp: 85, atk: 160, def: 125, spa: 89, spd: 93, spe: 78 },
  ],
  ["Froslass-Mega", { hp: 70, atk: 80, def: 70, spa: 140, spd: 100, spe: 120 }],
  ["Glimmora-Mega", { hp: 83, atk: 90, def: 105, spa: 150, spd: 96, spe: 101 }],
  ["Golurk-Mega", { hp: 89, atk: 159, def: 105, spa: 70, spd: 105, spe: 55 }],
  ["Greninja-Mega", { hp: 72, atk: 125, def: 77, spa: 133, spd: 81, spe: 142 }],
  ["Hawlucha-Mega", { hp: 78, atk: 137, def: 100, spa: 74, spd: 93, spe: 118 }],
  ["Meganium-Mega", { hp: 80, atk: 92, def: 115, spa: 143, spd: 115, spe: 80 }],
  ["Meowstic-Mega", { hp: 74, atk: 65, def: 85, spa: 121, spd: 95, spe: 115 }],
  [
    "Scovillain-Mega",
    { hp: 65, atk: 138, def: 85, spa: 138, spd: 85, spe: 75 },
  ],
  [
    "Skarmory-Mega",
    { hp: 65, atk: 140, def: 110, spa: 40, spd: 100, spe: 110 },
  ],
  [
    "Starmie-Mega",
    { hp: 60, atk: 100, def: 105, spa: 130, spd: 105, spe: 120 },
  ],
  [
    "Victreebel-Mega",
    { hp: 80, atk: 125, def: 85, spa: 135, spd: 95, spe: 70 },
  ],
]);

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
