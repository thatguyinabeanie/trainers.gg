/**
 * Pokemon type effectiveness and coverage calculations
 */

export type PokemonType =
  | "Normal"
  | "Fire"
  | "Water"
  | "Electric"
  | "Grass"
  | "Ice"
  | "Fighting"
  | "Poison"
  | "Ground"
  | "Flying"
  | "Psychic"
  | "Bug"
  | "Rock"
  | "Ghost"
  | "Dragon"
  | "Dark"
  | "Steel"
  | "Fairy";

/** All 18 standard Pokemon types. */
export const ALL_TYPES: PokemonType[] = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
];

// Type effectiveness chart (attacking type -> defending type -> multiplier)
const TYPE_CHART: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: {
    Fire: 0.5,
    Water: 0.5,
    Grass: 2,
    Ice: 2,
    Bug: 2,
    Rock: 0.5,
    Dragon: 0.5,
    Steel: 2,
  },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: {
    Water: 2,
    Electric: 0.5,
    Grass: 0.5,
    Ground: 0,
    Flying: 2,
    Dragon: 0.5,
  },
  Grass: {
    Fire: 0.5,
    Water: 2,
    Grass: 0.5,
    Poison: 0.5,
    Ground: 2,
    Flying: 0.5,
    Bug: 0.5,
    Rock: 2,
    Dragon: 0.5,
    Steel: 0.5,
  },
  Ice: {
    Fire: 0.5,
    Water: 0.5,
    Grass: 2,
    Ice: 0.5,
    Ground: 2,
    Flying: 2,
    Dragon: 2,
    Steel: 0.5,
  },
  Fighting: {
    Normal: 2,
    Ice: 2,
    Poison: 0.5,
    Flying: 0.5,
    Psychic: 0.5,
    Bug: 0.5,
    Rock: 2,
    Ghost: 0,
    Dark: 2,
    Steel: 2,
    Fairy: 0.5,
  },
  Poison: {
    Grass: 2,
    Poison: 0.5,
    Ground: 0.5,
    Rock: 0.5,
    Ghost: 0.5,
    Steel: 0,
    Fairy: 2,
  },
  Ground: {
    Fire: 2,
    Electric: 2,
    Grass: 0.5,
    Poison: 2,
    Flying: 0,
    Bug: 0.5,
    Rock: 2,
    Steel: 2,
  },
  Flying: {
    Electric: 0.5,
    Grass: 2,
    Fighting: 2,
    Bug: 2,
    Rock: 0.5,
    Steel: 0.5,
  },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: {
    Fire: 0.5,
    Grass: 2,
    Fighting: 0.5,
    Poison: 0.5,
    Flying: 0.5,
    Psychic: 2,
    Ghost: 0.5,
    Dark: 2,
    Steel: 0.5,
    Fairy: 0.5,
  },
  Rock: {
    Fire: 2,
    Ice: 2,
    Fighting: 0.5,
    Ground: 0.5,
    Flying: 2,
    Bug: 2,
    Steel: 0.5,
  },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel: {
    Fire: 0.5,
    Water: 0.5,
    Electric: 0.5,
    Ice: 2,
    Rock: 2,
    Steel: 0.5,
    Fairy: 2,
  },
  Fairy: {
    Fire: 0.5,
    Fighting: 2,
    Poison: 0.5,
    Dragon: 2,
    Dark: 2,
    Steel: 0.5,
  },
};

// Get defensive type effectiveness (what damages this type)
const DEFENSIVE_CHART: Record<
  PokemonType,
  Partial<Record<PokemonType, number>>
> = {
  Normal: { Fighting: 2, Ghost: 0 },
  Fire: {
    Fire: 0.5,
    Water: 2,
    Grass: 0.5,
    Ice: 0.5,
    Ground: 2,
    Bug: 0.5,
    Rock: 2,
    Steel: 0.5,
    Fairy: 0.5,
  },
  Water: { Fire: 0.5, Water: 0.5, Electric: 2, Grass: 2, Ice: 0.5, Steel: 0.5 },
  Electric: { Electric: 0.5, Ground: 2, Flying: 0.5, Steel: 0.5 },
  Grass: {
    Fire: 2,
    Water: 0.5,
    Electric: 0.5,
    Grass: 0.5,
    Ice: 2,
    Poison: 2,
    Ground: 0.5,
    Flying: 2,
    Bug: 2,
  },
  Ice: { Fire: 2, Fighting: 2, Rock: 2, Steel: 2, Ice: 0.5 },
  Fighting: { Flying: 2, Psychic: 2, Bug: 0.5, Rock: 0.5, Dark: 0.5, Fairy: 2 },
  Poison: {
    Grass: 0.5,
    Fighting: 0.5,
    Poison: 0.5,
    Ground: 2,
    Psychic: 2,
    Bug: 0.5,
    Fairy: 0.5,
  },
  Ground: { Water: 2, Electric: 0, Grass: 2, Ice: 2, Poison: 0.5, Rock: 0.5 },
  Flying: {
    Electric: 2,
    Grass: 0.5,
    Ice: 2,
    Fighting: 0.5,
    Ground: 0,
    Bug: 0.5,
    Rock: 2,
  },
  Psychic: { Fighting: 0.5, Psychic: 0.5, Bug: 2, Ghost: 2, Dark: 2 },
  Bug: { Fire: 2, Grass: 0.5, Fighting: 0.5, Ground: 0.5, Flying: 2, Rock: 2 },
  Rock: {
    Normal: 0.5,
    Fire: 0.5,
    Water: 2,
    Grass: 2,
    Fighting: 2,
    Poison: 0.5,
    Ground: 2,
    Flying: 0.5,
    Steel: 2,
  },
  Ghost: { Normal: 0, Fighting: 0, Poison: 0.5, Bug: 0.5, Ghost: 2, Dark: 2 },
  Dragon: {
    Fire: 0.5,
    Water: 0.5,
    Electric: 0.5,
    Grass: 0.5,
    Ice: 2,
    Dragon: 2,
    Fairy: 2,
  },
  Dark: { Fighting: 2, Psychic: 0, Bug: 2, Ghost: 0.5, Dark: 0.5, Fairy: 2 },
  Steel: {
    Normal: 0.5,
    Fire: 2,
    Grass: 0.5,
    Ice: 0.5,
    Fighting: 2,
    Poison: 0,
    Ground: 2,
    Flying: 0.5,
    Psychic: 0.5,
    Bug: 0.5,
    Rock: 0.5,
    Dragon: 0.5,
    Steel: 0.5,
    Fairy: 0.5,
  },
  Fairy: { Fighting: 0.5, Poison: 2, Bug: 0.5, Dragon: 0, Dark: 0.5, Steel: 2 },
};

// Common Pokemon types (we'll expand this)
export const POKEMON_TYPES: Record<string, PokemonType[]> = {
  Pikachu: ["Electric"],
  Charizard: ["Fire", "Flying"],
  Garchomp: ["Dragon", "Ground"],
  Rillaboom: ["Grass"],
  Incineroar: ["Fire", "Dark"],
  Urshifu: ["Fighting", "Dark"],
  "Flutter Mane": ["Ghost", "Fairy"],
  "Iron Hands": ["Fighting", "Electric"],
  Gholdengo: ["Steel", "Ghost"],
  Kingambit: ["Dark", "Steel"],
  Annihilape: ["Fighting", "Ghost"],
  Dragapult: ["Dragon", "Ghost"],
  Amoonguss: ["Grass", "Poison"],
  Torkoal: ["Fire"],
  Pelipper: ["Water", "Flying"],
  Indeedee: ["Psychic", "Normal"],
  Dondozo: ["Water"],
  Tatsugiri: ["Dragon", "Water"],
};

/**
 * Get type effectiveness multiplier for an attack
 */
export function getTypeEffectiveness(
  attackType: PokemonType,
  defenderTypes: PokemonType[]
): number {
  let multiplier = 1;

  for (const defType of defenderTypes) {
    const effectiveness = TYPE_CHART[attackType]?.[defType];
    if (effectiveness !== undefined) {
      multiplier *= effectiveness;
    }
  }

  return multiplier;
}

/**
 * Get all type matchups for a Pokemon
 */
export function getDefensiveMatchups(types: PokemonType[]): {
  weaknesses: Record<PokemonType, number>;
  resistances: Record<PokemonType, number>;
  immunities: PokemonType[];
} {
  const matchups: Partial<Record<PokemonType, number>> = {};
  const allTypes: PokemonType[] = [
    "Normal",
    "Fire",
    "Water",
    "Electric",
    "Grass",
    "Ice",
    "Fighting",
    "Poison",
    "Ground",
    "Flying",
    "Psychic",
    "Bug",
    "Rock",
    "Ghost",
    "Dragon",
    "Dark",
    "Steel",
    "Fairy",
  ];

  // Calculate effectiveness for each type
  for (const attackType of allTypes) {
    let multiplier = 1;
    for (const defType of types) {
      const effectiveness = DEFENSIVE_CHART[defType]?.[attackType];
      if (effectiveness !== undefined) {
        multiplier *= effectiveness;
      }
    }
    if (multiplier !== 1) {
      matchups[attackType] = multiplier;
    }
  }

  // Categorize matchups
  const weaknesses: Partial<Record<PokemonType, number>> = {};
  const resistances: Partial<Record<PokemonType, number>> = {};
  const immunities: PokemonType[] = [];

  for (const [type, multiplier] of Object.entries(matchups)) {
    if (multiplier === 0) {
      immunities.push(type as PokemonType);
    } else if (multiplier > 1) {
      weaknesses[type as PokemonType] = multiplier;
    } else if (multiplier < 1) {
      resistances[type as PokemonType] = multiplier;
    }
  }

  return {
    weaknesses: weaknesses as Record<PokemonType, number>,
    resistances: resistances as Record<PokemonType, number>,
    immunities,
  };
}

/**
 * Calculate team type coverage
 */
export function calculateTeamCoverage(
  team: Array<{ species: string; moves: string[] }>
): {
  coverage: Set<PokemonType>;
  superEffective: Record<PokemonType, number>;
  notVeryEffective: Set<PokemonType>;
  unresisted: Set<PokemonType>;
} {
  const coverage = new Set<PokemonType>();
  const superEffective: Partial<Record<PokemonType, number>> = {};
  const hitCounts: Partial<Record<PokemonType, number[]>> = {};

  const allTypes: PokemonType[] = [
    "Normal",
    "Fire",
    "Water",
    "Electric",
    "Grass",
    "Ice",
    "Fighting",
    "Poison",
    "Ground",
    "Flying",
    "Psychic",
    "Bug",
    "Rock",
    "Ghost",
    "Dragon",
    "Dark",
    "Steel",
    "Fairy",
  ];

  // For simplicity, we'll assume moves match the Pokemon's type
  // In a real implementation, you'd have a move database
  for (const member of team) {
    const types = POKEMON_TYPES[member.species] || [];

    for (const attackType of types) {
      for (const defType of allTypes) {
        const effectiveness = getTypeEffectiveness(attackType as PokemonType, [
          defType,
        ]);

        if (!hitCounts[defType]) {
          hitCounts[defType] = [];
        }
        hitCounts[defType].push(effectiveness);

        if (effectiveness >= 2) {
          coverage.add(defType);
          superEffective[defType] = Math.max(
            superEffective[defType] || 0,
            effectiveness
          );
        }
      }
    }
  }

  // Find types that are not very effective against
  const notVeryEffective = new Set<PokemonType>();
  const unresisted = new Set<PokemonType>();

  for (const [type, hits] of Object.entries(hitCounts)) {
    const maxHit = Math.max(...hits);
    if (maxHit < 1) {
      notVeryEffective.add(type as PokemonType);
    }
    if (maxHit >= 1) {
      unresisted.add(type as PokemonType);
    }
  }

  return {
    coverage,
    superEffective: superEffective as Record<PokemonType, number>,
    notVeryEffective,
    unresisted,
  };
}

/**
 * Calculate team defensive synergy
 */
export function calculateTeamSynergy(team: Array<{ species: string }>): {
  sharedWeaknesses: Record<PokemonType, number>;
  uncoveredTypes: Set<PokemonType>;
  defensiveCore: boolean;
} {
  const sharedWeaknesses: Partial<Record<PokemonType, number>> = {};
  const teamResistances = new Set<PokemonType>();
  const teamImmunities = new Set<PokemonType>();

  // Analyze each team member's defensive profile
  for (const member of team) {
    const types = POKEMON_TYPES[member.species] || [];
    const { weaknesses, resistances, immunities } = getDefensiveMatchups(types);

    // Track shared weaknesses
    for (const [type, _multiplier] of Object.entries(weaknesses)) {
      sharedWeaknesses[type as PokemonType] =
        (sharedWeaknesses[type as PokemonType] || 0) + 1;
    }

    // Track team resistances and immunities
    for (const type of Object.keys(resistances)) {
      teamResistances.add(type as PokemonType);
    }
    for (const type of immunities) {
      teamImmunities.add(type);
    }
  }

  // Find types not covered by resistances/immunities
  const allTypes: PokemonType[] = [
    "Normal",
    "Fire",
    "Water",
    "Electric",
    "Grass",
    "Ice",
    "Fighting",
    "Poison",
    "Ground",
    "Flying",
    "Psychic",
    "Bug",
    "Rock",
    "Ghost",
    "Dragon",
    "Dark",
    "Steel",
    "Fairy",
  ];

  const uncoveredTypes = new Set<PokemonType>();
  for (const type of allTypes) {
    if (!teamResistances.has(type) && !teamImmunities.has(type)) {
      uncoveredTypes.add(type);
    }
  }

  // Check if team has good defensive synergy (no type hits more than half the team for super effective)
  const defensiveCore = Object.values(sharedWeaknesses).every(
    (count) => count <= Math.floor(team.length / 2)
  );

  return {
    sharedWeaknesses: sharedWeaknesses as Record<PokemonType, number>,
    uncoveredTypes,
    defensiveCore,
  };
}

/**
 * Get type color for UI display
 */
export function getTypeColor(type: PokemonType): string {
  const colors: Record<PokemonType, string> = {
    Normal: "#A8A878",
    Fire: "#F08030",
    Water: "#6890F0",
    Electric: "#F8D030",
    Grass: "#78C850",
    Ice: "#98D8D8",
    Fighting: "#C03028",
    Poison: "#A040A0",
    Ground: "#E0C068",
    Flying: "#A890F0",
    Psychic: "#F85888",
    Bug: "#A8B820",
    Rock: "#B8A038",
    Ghost: "#705898",
    Dragon: "#7038F8",
    Dark: "#705848",
    Steel: "#B8B8D0",
    Fairy: "#EE99AC",
  };
  return colors[type] || "#68A090";
}

/**
 * Get effectiveness color and label
 */
export function getEffectivenessDisplay(multiplier: number): {
  color: string;
  label: string;
} {
  if (multiplier === 0) return { color: "#666666", label: "Immune" };
  if (multiplier === 0.25) return { color: "#FF6B6B", label: "1/4x" };
  if (multiplier === 0.5) return { color: "#FFB366", label: "1/2x" };
  if (multiplier === 1) return { color: "#999999", label: "1x" };
  if (multiplier === 2) return { color: "#4ECDC4", label: "2x" };
  if (multiplier === 4) return { color: "#45B7D1", label: "4x" };
  return { color: "#999999", label: `${multiplier}x` };
}
