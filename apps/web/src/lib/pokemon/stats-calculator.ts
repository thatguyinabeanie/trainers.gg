/**
 * Pokemon stats calculator
 * Calculates actual stats based on base stats, level, nature, EVs, and IVs
 */

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
  const baseStats = POKEMON_BASE_STATS[species];
  if (!baseStats) {
    // Return placeholder stats if we don't have the base stats
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
