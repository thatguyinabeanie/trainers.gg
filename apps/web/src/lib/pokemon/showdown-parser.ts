import type { PokemonSet } from "@/lib/types/pokemon";

// Types for Showdown text parsing
export interface ShowdownParseResult {
  success: boolean;
  pokemon: PokemonSet[];
  errors: string[];
  warnings: string[];
}

interface ParsedPokemon {
  nickname?: string;
  species: string;
  gender?: string;
  item?: string;
  ability?: string;
  level?: number;
  shiny?: boolean;
  teraType?: string;
  nature?: string;
  moves: string[];
  evs: { [stat: string]: number };
  ivs: { [stat: string]: number };
}

/**
 * Parse Pokemon Showdown team text format into structured data
 *
 * Example Showdown format:
 * Pikachu @ Light Ball
 * Ability: Static
 * Level: 50
 * Shiny: Yes
 * Tera Type: Electric
 * EVs: 252 Atk / 252 Spe / 4 HP
 * Adamant Nature
 * - Thunderbolt
 * - Quick Attack
 * - Iron Tail
 * - Substitute
 */
export function parseShowdownTeam(text: string): ShowdownParseResult {
  const result: ShowdownParseResult = {
    success: false,
    pokemon: [],
    errors: [],
    warnings: [],
  };

  try {
    // Split text into individual Pokemon blocks
    const pokemonBlocks = text
      .trim()
      .split(/\n\s*\n/)
      .filter((block) => block.trim());

    if (pokemonBlocks.length === 0) {
      result.errors.push("No Pokemon found in the provided text");
      return result;
    }

    if (pokemonBlocks.length > 6) {
      result.errors.push("Teams cannot have more than 6 Pokemon");
      return result;
    }

    for (const [index, block] of pokemonBlocks.entries()) {
      try {
        const pokemon = parsePokemonBlock(block.trim(), index + 1);
        const converted = convertToInternalFormat(pokemon);
        result.pokemon.push(converted);
      } catch (error) {
        result.errors.push(
          `Pokemon ${index + 1}: ${error instanceof Error ? error.message : "Parse error"}`
        );
      }
    }

    // Validate team composition
    if (result.pokemon.length < 1) {
      result.errors.push("Team must have at least 1 Pokemon");
    }

    // Check for duplicate species
    const speciesCount = new Map<string, number>();
    result.pokemon.forEach((pokemon, index) => {
      const species = pokemon.species.toLowerCase();
      speciesCount.set(species, (speciesCount.get(species) || 0) + 1);
      if (speciesCount.get(species)! > 1) {
        result.warnings.push(
          `Pokemon ${index + 1}: Duplicate species "${pokemon.species}" detected`
        );
      }
    });

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(
      `Parse error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return result;
  }
}

/**
 * Parse a single Pokemon block from Showdown format
 */
function parsePokemonBlock(
  block: string,
  pokemonNumber: number
): ParsedPokemon {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  if (lines.length === 0) {
    throw new Error(`Pokemon ${pokemonNumber} has no data`);
  }

  const pokemon: ParsedPokemon = {
    species: "",
    moves: [],
    evs: {},
    ivs: {},
  };

  // Parse the first line (species, nickname, item, gender)
  const firstLine = lines[0];
  if (!firstLine) {
    throw new Error("Missing first line");
  }
  const { species, nickname, item, gender } = parseFirstLine(firstLine);

  pokemon.species = species;
  if (nickname) pokemon.nickname = nickname;
  if (item) pokemon.item = item;
  if (gender) pokemon.gender = gender;

  // Parse remaining lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Skip empty lines
    if (!line.trim()) continue;

    // Moves (start with -)
    if (line.startsWith("-")) {
      const move = line.substring(1).trim();
      if (move) {
        pokemon.moves.push(move);
      }
      continue;
    }

    // Ability
    if (line.toLowerCase().startsWith("ability:")) {
      pokemon.ability = line.substring(8).trim();
      continue;
    }

    // Level
    if (line.toLowerCase().startsWith("level:")) {
      const levelStr = line.substring(6).trim();
      const level = parseInt(levelStr);
      if (!isNaN(level) && level >= 1 && level <= 100) {
        pokemon.level = level;
      }
      continue;
    }

    // Shiny
    if (line.toLowerCase().startsWith("shiny:")) {
      const shinyStr = line.substring(6).trim().toLowerCase();
      pokemon.shiny = shinyStr === "yes" || shinyStr === "true";
      continue;
    }

    // Tera Type
    if (line.toLowerCase().startsWith("tera type:")) {
      pokemon.teraType = line.substring(10).trim();
      continue;
    }

    // EVs
    if (line.toLowerCase().startsWith("evs:")) {
      const evsStr = line.substring(4).trim();
      pokemon.evs = parseStats(evsStr);
      continue;
    }

    // IVs
    if (line.toLowerCase().startsWith("ivs:")) {
      const ivsStr = line.substring(4).trim();
      pokemon.ivs = parseStats(ivsStr);
      continue;
    }

    // Nature (ends with "Nature")
    if (line.toLowerCase().endsWith(" nature")) {
      pokemon.nature = line.substring(0, line.length - 7).trim();
      continue;
    }
  }

  // Validate required fields
  if (!pokemon.species) {
    throw new Error("Species is required");
  }

  if (pokemon.moves.length > 4) {
    throw new Error(`Too many moves (${pokemon.moves.length}). Maximum is 4.`);
  }

  return pokemon;
}

/**
 * Parse the first line containing species, nickname, item, and gender
 * Examples:
 * - "Pikachu @ Light Ball"
 * - "Raichu (M) @ Assault Vest"
 * - "Sparky (Pikachu) (F) @ Leftovers"
 */
function parseFirstLine(line: string): {
  species: string;
  nickname?: string;
  item?: string;
  gender?: string;
} {
  let species = "";
  let nickname: string | undefined;
  let item: string | undefined;
  let gender: string | undefined;
  let workingLine = line;

  // Extract item (after @)
  const itemMatch = workingLine.match(/(.+?)\s*@\s*(.+)/);
  if (itemMatch) {
    workingLine = itemMatch[1]?.trim() ?? "";
    item = itemMatch[2]?.trim();
  }

  // Extract gender (M) or (F)
  const genderMatch = workingLine.match(/(.+?)\s*\(([MF])\)\s*$/);
  if (genderMatch) {
    workingLine = genderMatch[1]?.trim() ?? "";
    gender = genderMatch[2] === "M" ? "Male" : "Female";
  }

  // Extract nickname and species
  // Format: "Nickname (Species)" or just "Species"
  const nicknameMatch = workingLine.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (nicknameMatch) {
    nickname = nicknameMatch[1]?.trim();
    species = nicknameMatch[2]?.trim() ?? "";
  } else {
    species = workingLine.trim();
  }

  return { species, nickname, item, gender };
}

/**
 * Parse stat distribution (EVs/IVs)
 * Example: "252 Atk / 252 Spe / 4 HP"
 */
function parseStats(statsStr: string): { [stat: string]: number } {
  const stats: { [stat: string]: number } = {};

  const statMappings: { [key: string]: string } = {
    hp: "hp",
    atk: "attack",
    attack: "attack",
    def: "defense",
    defense: "defense",
    spa: "specialAttack",
    "sp. atk": "specialAttack",
    "special attack": "specialAttack",
    spd: "specialDefense",
    "sp. def": "specialDefense",
    "special defense": "specialDefense",
    spe: "speed",
    speed: "speed",
  };

  // Split by / and parse each stat
  const statPairs = statsStr.split("/").map((s) => s.trim());

  for (const pair of statPairs) {
    const match = pair.match(/(\d+)\s+(.+)/);
    if (match) {
      const value = parseInt(match[1] ?? "0");
      const statName = match[2]?.trim().toLowerCase() ?? "";
      const mappedStat = statMappings[statName];

      if (mappedStat && !isNaN(value)) {
        stats[mappedStat] = value;
      }
    }
  }

  return stats;
}

/**
 * Convert parsed Pokemon to internal PokemonSet format
 */
function convertToInternalFormat(parsed: ParsedPokemon): PokemonSet {
  // Default stats (0 for EVs, 31 for IVs)
  const defaultEvs = {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  };

  const defaultIvs = {
    hp: 31,
    attack: 31,
    defense: 31,
    specialAttack: 31,
    specialDefense: 31,
    speed: 31,
  };

  return {
    species: parsed.species,
    nickname: parsed.nickname || undefined,
    level: parsed.level || 50, // Default to level 50 for VGC
    gender: ["Male", "Female"].includes(parsed.gender || "")
      ? (parsed.gender as "Male" | "Female")
      : undefined,
    isShiny: parsed.shiny || false,
    heldItem: parsed.item || undefined,
    ability: parsed.ability || "",
    nature: parsed.nature || "Hardy",
    teraType: parsed.teraType || undefined,
    formatLegal: true, // Default to format legal
    moves: {
      move1: parsed.moves[0] || "",
      move2: parsed.moves[1] || undefined,
      move3: parsed.moves[2] || undefined,
      move4: parsed.moves[3] || undefined,
    },
    evs: {
      ...defaultEvs,
      ...parsed.evs,
    },
    ivs: {
      ...defaultIvs,
      ...parsed.ivs,
    },
  };
}

/**
 * Export Pokemon team to Showdown format
 */
export function exportToShowdownFormat(pokemon: PokemonSet[]): string {
  return pokemon.map((p) => formatPokemonForShowdown(p)).join("\n\n");
}

/**
 * Format a single Pokemon for Showdown export
 */
function formatPokemonForShowdown(pokemon: PokemonSet): string {
  const lines: string[] = [];

  // First line: Nickname (Species) (Gender) @ Item
  let firstLine = "";

  if (pokemon.nickname && pokemon.nickname !== pokemon.species) {
    firstLine += `${pokemon.nickname} (${pokemon.species})`;
  } else {
    firstLine += pokemon.species;
  }

  if (pokemon.gender) {
    const genderCode =
      pokemon.gender === "Male" ? "M" : pokemon.gender === "Female" ? "F" : "";
    if (genderCode) {
      firstLine += ` (${genderCode})`;
    }
  }

  if (pokemon.heldItem) {
    firstLine += ` @ ${pokemon.heldItem}`;
  }

  lines.push(firstLine);

  // Ability
  if (pokemon.ability) {
    lines.push(`Ability: ${pokemon.ability}`);
  }

  // Level (if not 50)
  if (pokemon.level !== 50) {
    lines.push(`Level: ${pokemon.level}`);
  }

  // Shiny
  if (pokemon.isShiny) {
    lines.push("Shiny: Yes");
  }

  // Tera Type
  if (pokemon.teraType) {
    lines.push(`Tera Type: ${pokemon.teraType}`);
  }

  // EVs (only non-zero values)
  const evs = [];
  if (pokemon.evs.hp > 0) evs.push(`${pokemon.evs.hp} HP`);
  if (pokemon.evs.attack > 0) evs.push(`${pokemon.evs.attack} Atk`);
  if (pokemon.evs.defense > 0) evs.push(`${pokemon.evs.defense} Def`);
  if (pokemon.evs.specialAttack > 0)
    evs.push(`${pokemon.evs.specialAttack} SpA`);
  if (pokemon.evs.specialDefense > 0)
    evs.push(`${pokemon.evs.specialDefense} SpD`);
  if (pokemon.evs.speed > 0) evs.push(`${pokemon.evs.speed} Spe`);

  if (evs.length > 0) {
    lines.push(`EVs: ${evs.join(" / ")}`);
  }

  // IVs (only non-31 values)
  const ivs = [];
  if (pokemon.ivs.hp !== 31) ivs.push(`${pokemon.ivs.hp} HP`);
  if (pokemon.ivs.attack !== 31) ivs.push(`${pokemon.ivs.attack} Atk`);
  if (pokemon.ivs.defense !== 31) ivs.push(`${pokemon.ivs.defense} Def`);
  if (pokemon.ivs.specialAttack !== 31)
    ivs.push(`${pokemon.ivs.specialAttack} SpA`);
  if (pokemon.ivs.specialDefense !== 31)
    ivs.push(`${pokemon.ivs.specialDefense} SpD`);
  if (pokemon.ivs.speed !== 31) ivs.push(`${pokemon.ivs.speed} Spe`);

  if (ivs.length > 0) {
    lines.push(`IVs: ${ivs.join(" / ")}`);
  }

  // Nature
  if (pokemon.nature && pokemon.nature !== "Hardy") {
    lines.push(`${pokemon.nature} Nature`);
  }

  // Moves
  const moves = [
    pokemon.moves.move1,
    pokemon.moves.move2,
    pokemon.moves.move3,
    pokemon.moves.move4,
  ].filter(Boolean);

  for (const move of moves) {
    lines.push(`- ${move}`);
  }

  return lines.join("\n");
}
