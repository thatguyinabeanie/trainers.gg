/**
 * Core Pokemon information shared across all formats
 */
export interface PokemonCore {
  // Basic Info
  species: string;
  nickname?: string;
  level: number;

  // Battle Stats
  nature: string;
  ability: string;
  heldItem?: string;

  // Appearance
  gender?: "Male" | "Female";
  isShiny: boolean;

  // Generation 9 (Scarlet/Violet) features
  teraType?: string;

  // Meta
  formatLegal: boolean;
}

/**
 * Pokemon stats in structured format
 */
export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

/**
 * Pokemon moves in structured format
 */
export interface PokemonMoves {
  move1: string;
  move2?: string;
  move3?: string;
  move4?: string;
}

/**
 * Represents a complete Pokemon set configuration
 * This is the standard format used throughout the application
 */
export interface PokemonSet extends PokemonCore {
  // Moves (up to 4) in structured format
  moves: PokemonMoves;

  // Effort Values (0-252 each, max 510 total)
  evs: PokemonStats;

  // Individual Values (0-31 each)
  ivs: PokemonStats;
}

/**
 * Flattened Pokemon set matching database schema
 * Extends core with flattened moves and stats
 */
export interface PokemonSetFlat extends PokemonCore, PokemonMoves {
  // EVs flattened with db naming convention
  evHp: number;
  evAttack: number;
  evDefense: number;
  evSpecialAttack: number;
  evSpecialDefense: number;
  evSpeed: number;

  // IVs flattened with db naming convention
  ivHp: number;
  ivAttack: number;
  ivDefense: number;
  ivSpecialAttack: number;
  ivSpecialDefense: number;
  ivSpeed: number;
}

/**
 * Simplified Pokemon set for team composition
 */
export interface TeamPokemonSlot {
  pokemonId: string;
  teamPosition: number; // 1-6
}

/**
 * Pokemon set with database metadata
 */
export interface PokemonSetWithMeta extends PokemonSet {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Team composition with Pokemon sets (local interface)
 */
export interface TeamComposition {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  formatLegal: boolean;
  tags: string[];
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  pokemon: Array<{
    teamPosition: number;
    pokemon: PokemonSetWithMeta;
  }>;
}

/**
 * Utility functions for converting between formats
 */
/**
 * Convert flat database format to structured PokemonSet
 */
export function fromFlat(flat: PokemonSetFlat): PokemonSet {
  // Extract core properties
  const {
    move1,
    move2,
    move3,
    move4,
    evHp,
    evAttack,
    evDefense,
    evSpecialAttack,
    evSpecialDefense,
    evSpeed,
    ivHp,
    ivAttack,
    ivDefense,
    ivSpecialAttack,
    ivSpecialDefense,
    ivSpeed,
    ...core
  } = flat;

  return {
    ...core,
    moves: { move1, move2, move3, move4 },
    evs: {
      hp: evHp,
      attack: evAttack,
      defense: evDefense,
      specialAttack: evSpecialAttack,
      specialDefense: evSpecialDefense,
      speed: evSpeed,
    },
    ivs: {
      hp: ivHp,
      attack: ivAttack,
      defense: ivDefense,
      specialAttack: ivSpecialAttack,
      specialDefense: ivSpecialDefense,
      speed: ivSpeed,
    },
  };
}

/**
 * Convert structured PokemonSet to flat database format
 */
export function toFlat(pokemonSet: PokemonSet): PokemonSetFlat {
  const { moves, evs, ivs, ...core } = pokemonSet;

  return {
    ...core,
    ...moves,
    evHp: evs.hp,
    evAttack: evs.attack,
    evDefense: evs.defense,
    evSpecialAttack: evs.specialAttack,
    evSpecialDefense: evs.specialDefense,
    evSpeed: evs.speed,
    ivHp: ivs.hp,
    ivAttack: ivs.attack,
    ivDefense: ivs.defense,
    ivSpecialAttack: ivs.specialAttack,
    ivSpecialDefense: ivs.specialDefense,
    ivSpeed: ivs.speed,
  };
}

/**
 * Convert to Pokemon Showdown export format
 */
export function toShowdownFormat(pokemonSet: PokemonSet): string {
  let result = "";

  // Name line
  if (pokemonSet.nickname && pokemonSet.nickname !== pokemonSet.species) {
    result += `${pokemonSet.nickname} (${pokemonSet.species})`;
  } else {
    result += pokemonSet.species;
  }

  if (pokemonSet.gender) {
    result += ` (${pokemonSet.gender.charAt(0)})`;
  }

  if (pokemonSet.heldItem) {
    result += ` @ ${pokemonSet.heldItem}`;
  }

  result += "\n";

  // Ability
  result += `Ability: ${pokemonSet.ability}\n`;

  // Level (if not 50)
  if (pokemonSet.level !== 50) {
    result += `Level: ${pokemonSet.level}\n`;
  }

  // Shiny
  if (pokemonSet.isShiny) {
    result += "Shiny: Yes\n";
  }

  // Tera Type
  if (pokemonSet.teraType) {
    result += `Tera Type: ${pokemonSet.teraType}\n`;
  }

  // EVs (only non-zero values)
  const evs = pokemonSet.evs;
  const evArray = [];
  if (evs.hp > 0) evArray.push(`${evs.hp} HP`);
  if (evs.attack > 0) evArray.push(`${evs.attack} Atk`);
  if (evs.defense > 0) evArray.push(`${evs.defense} Def`);
  if (evs.specialAttack > 0) evArray.push(`${evs.specialAttack} SpA`);
  if (evs.specialDefense > 0) evArray.push(`${evs.specialDefense} SpD`);
  if (evs.speed > 0) evArray.push(`${evs.speed} Spe`);

  if (evArray.length > 0) {
    result += `EVs: ${evArray.join(" / ")}\n`;
  }

  // Nature
  result += `${pokemonSet.nature} Nature\n`;

  // IVs (only non-31 values)
  const ivs = pokemonSet.ivs;
  const ivArray = [];
  if (ivs.hp < 31) ivArray.push(`${ivs.hp} HP`);
  if (ivs.attack < 31) ivArray.push(`${ivs.attack} Atk`);
  if (ivs.defense < 31) ivArray.push(`${ivs.defense} Def`);
  if (ivs.specialAttack < 31) ivArray.push(`${ivs.specialAttack} SpA`);
  if (ivs.specialDefense < 31) ivArray.push(`${ivs.specialDefense} SpD`);
  if (ivs.speed < 31) ivArray.push(`${ivs.speed} Spe`);

  if (ivArray.length > 0) {
    result += `IVs: ${ivArray.join(" / ")}\n`;
  }

  // Moves
  const moves = [
    pokemonSet.moves.move1,
    pokemonSet.moves.move2,
    pokemonSet.moves.move3,
    pokemonSet.moves.move4,
  ].filter(Boolean);

  for (const move of moves) {
    result += `- ${move}\n`;
  }

  return result;
}

/**
 * Create a default PokemonSet
 */
export function createDefault(): PokemonSet {
  return {
    species: "",
    level: 50,
    nature: "Hardy",
    ability: "",
    isShiny: false,
    formatLegal: true,
    moves: {
      move1: "",
    },
    evs: {
      hp: 0,
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
    },
    ivs: {
      hp: 31,
      attack: 31,
      defense: 31,
      specialAttack: 31,
      specialDefense: 31,
      speed: 31,
    },
  };
}

/**
 * Create default stats (for EVs or IVs)
 */
export function createDefaultEvs(): PokemonStats {
  return {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  };
}

export function createDefaultIvs(): PokemonStats {
  return {
    hp: 31,
    attack: 31,
    defense: 31,
    specialAttack: 31,
    specialDefense: 31,
    speed: 31,
  };
}

/**
 * Create default moves
 */
export function createDefaultMoves(): PokemonMoves {
  return {
    move1: "",
  };
}
