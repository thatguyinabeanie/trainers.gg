/**
 * Pokemon Showdown format parser and exporter
 * Handles conversion between Showdown text format and our database structure
 */

import type { PokemonSet, PokemonSetFlat } from "@/lib/types/pokemon";
import { toFlat } from "@/lib/types/pokemon";

export interface ShowdownPokemon {
  species: string;
  nickname?: string;
  gender?: "M" | "F" | "";
  item?: string;
  ability: string;
  level?: number;
  shiny?: boolean;
  evs?: {
    hp?: number;
    atk?: number;
    def?: number;
    spa?: number;
    spd?: number;
    spe?: number;
  };
  ivs?: {
    hp?: number;
    atk?: number;
    def?: number;
    spa?: number;
    spd?: number;
    spe?: number;
  };
  nature: string;
  moves: string[];
  teraType?: string;
}

/**
 * Parse a single Pokemon from Showdown format text
 */
export function parsePokemon(text: string): ShowdownPokemon | null {
  const lines = text
    .trim()
    .split("\n")
    .map((line) => line.trim());
  if (lines.length === 0) return null;

  // Parse first line: Nickname (Species) @ Item or Species @ Item
  const firstLine = lines[0];
  if (!firstLine) return null;

  let nickname: string | undefined;
  let species: string;
  let gender: "M" | "F" | "" = "";
  let item: string | undefined;

  // Check for item
  const itemMatch = firstLine.match(/^(.+?)\s*@\s*(.+)$/);
  const baseInfo: string = itemMatch ? itemMatch[1]! : firstLine;
  if (itemMatch && itemMatch[2]) {
    item = itemMatch[2].trim();
  }

  // Check for nickname and species
  const nicknameMatch = baseInfo.match(/^(.+?)\s*\((.+?)\)(?:\s*\(([MF])\))?$/);
  if (nicknameMatch && nicknameMatch[1] && nicknameMatch[2]) {
    nickname = nicknameMatch[1].trim();
    species = nicknameMatch[2].trim();
    gender = (nicknameMatch[3] as "M" | "F") || "";
  } else {
    // Check for gender without nickname
    const genderMatch = baseInfo.match(/^(.+?)\s*\(([MF])\)$/);
    if (genderMatch && genderMatch[1] && genderMatch[2]) {
      species = genderMatch[1].trim();
      gender = genderMatch[2] as "M" | "F";
    } else {
      species = baseInfo.trim();
    }
  }

  // Initialize Pokemon data
  const pokemon: ShowdownPokemon = {
    species,
    nickname,
    gender,
    item,
    ability: "",
    nature: "Hardy",
    moves: [],
    evs: {},
    ivs: {},
  };

  // Parse remaining lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Ability
    if (line.startsWith("Ability:")) {
      pokemon.ability = line.replace("Ability:", "").trim();
    }
    // Level
    else if (line.startsWith("Level:")) {
      pokemon.level = parseInt(line.replace("Level:", "").trim()) || 50;
    }
    // Shiny
    else if (line === "Shiny: Yes") {
      pokemon.shiny = true;
    }
    // EVs
    else if (line.startsWith("EVs:")) {
      const evString = line.replace("EVs:", "").trim();
      const evParts = evString.split("/").map((part) => part.trim());
      for (const part of evParts) {
        const match = part.match(/^(\d+)\s+(.+)$/);
        if (match && match[1] && match[2]) {
          const value = parseInt(match[1]);
          const stat = match[2].toLowerCase();
          if (stat === "hp") pokemon.evs!.hp = value;
          else if (stat === "atk" || stat === "attack")
            pokemon.evs!.atk = value;
          else if (stat === "def" || stat === "defense")
            pokemon.evs!.def = value;
          else if (
            stat === "spa" ||
            stat === "spatk" ||
            stat === "special attack"
          )
            pokemon.evs!.spa = value;
          else if (
            stat === "spd" ||
            stat === "spdef" ||
            stat === "special defense"
          )
            pokemon.evs!.spd = value;
          else if (stat === "spe" || stat === "speed") pokemon.evs!.spe = value;
        }
      }
    }
    // IVs
    else if (line.startsWith("IVs:")) {
      const ivString = line.replace("IVs:", "").trim();
      const ivParts = ivString.split("/").map((part) => part.trim());
      for (const part of ivParts) {
        const match = part.match(/^(\d+)\s+(.+)$/);
        if (match && match[1] && match[2]) {
          const value = parseInt(match[1]);
          const stat = match[2].toLowerCase();
          if (stat === "hp") pokemon.ivs!.hp = value;
          else if (stat === "atk" || stat === "attack")
            pokemon.ivs!.atk = value;
          else if (stat === "def" || stat === "defense")
            pokemon.ivs!.def = value;
          else if (
            stat === "spa" ||
            stat === "spatk" ||
            stat === "special attack"
          )
            pokemon.ivs!.spa = value;
          else if (
            stat === "spd" ||
            stat === "spdef" ||
            stat === "special defense"
          )
            pokemon.ivs!.spd = value;
          else if (stat === "spe" || stat === "speed") pokemon.ivs!.spe = value;
        }
      }
    }
    // Nature
    else if (line.endsWith(" Nature")) {
      pokemon.nature = line.replace(" Nature", "").trim();
    }
    // Tera Type
    else if (line.startsWith("Tera Type:")) {
      pokemon.teraType = line.replace("Tera Type:", "").trim();
    }
    // Moves
    else if (line.startsWith("- ")) {
      pokemon.moves.push(line.substring(2).trim());
    }
  }

  // Set default IVs if not specified
  if (!pokemon.ivs!.hp) pokemon.ivs!.hp = 31;
  if (!pokemon.ivs!.atk) pokemon.ivs!.atk = 31;
  if (!pokemon.ivs!.def) pokemon.ivs!.def = 31;
  if (!pokemon.ivs!.spa) pokemon.ivs!.spa = 31;
  if (!pokemon.ivs!.spd) pokemon.ivs!.spd = 31;
  if (!pokemon.ivs!.spe) pokemon.ivs!.spe = 31;

  return pokemon;
}

/**
 * Parse a full team from Showdown format text
 */
export function parseTeam(text: string): ShowdownPokemon[] {
  const pokemonTexts = text.trim().split(/\n\n+/);
  const team: ShowdownPokemon[] = [];

  for (const pokemonText of pokemonTexts) {
    const pokemon = parsePokemon(pokemonText);
    if (pokemon) {
      team.push(pokemon);
    }
  }

  return team;
}

/**
 * Export a Pokemon to Showdown format (using flat format)
 */
export function exportPokemonToShowdown(pokemon: PokemonSetFlat): string {
  const lines: string[] = [];

  // First line: Name @ Item
  let firstLine = "";
  if (pokemon.nickname) {
    firstLine = `${pokemon.nickname} (${pokemon.species})`;
  } else {
    firstLine = pokemon.species;
  }

  if (pokemon.gender) {
    firstLine += ` (${pokemon.gender === "Male" ? "M" : "F"})`;
  }

  if (pokemon.heldItem) {
    firstLine += ` @ ${pokemon.heldItem}`;
  }
  lines.push(firstLine);

  // Ability
  lines.push(`Ability: ${pokemon.ability}`);

  // Level (only if not 50)
  if (pokemon.level && pokemon.level !== 50) {
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

  // EVs
  const evs: string[] = [];
  if (pokemon.evHp && pokemon.evHp > 0) evs.push(`${pokemon.evHp} HP`);
  if (pokemon.evAttack && pokemon.evAttack > 0)
    evs.push(`${pokemon.evAttack} Atk`);
  if (pokemon.evDefense && pokemon.evDefense > 0)
    evs.push(`${pokemon.evDefense} Def`);
  if (pokemon.evSpecialAttack && pokemon.evSpecialAttack > 0)
    evs.push(`${pokemon.evSpecialAttack} SpA`);
  if (pokemon.evSpecialDefense && pokemon.evSpecialDefense > 0)
    evs.push(`${pokemon.evSpecialDefense} SpD`);
  if (pokemon.evSpeed && pokemon.evSpeed > 0)
    evs.push(`${pokemon.evSpeed} Spe`);

  if (evs.length > 0) {
    lines.push(`EVs: ${evs.join(" / ")}`);
  }

  // Nature
  lines.push(`${pokemon.nature} Nature`);

  // IVs (only if not perfect)
  const ivs: string[] = [];
  if (pokemon.ivHp !== undefined && pokemon.ivHp !== 31)
    ivs.push(`${pokemon.ivHp} HP`);
  if (pokemon.ivAttack !== undefined && pokemon.ivAttack !== 31)
    ivs.push(`${pokemon.ivAttack} Atk`);
  if (pokemon.ivDefense !== undefined && pokemon.ivDefense !== 31)
    ivs.push(`${pokemon.ivDefense} Def`);
  if (pokemon.ivSpecialAttack !== undefined && pokemon.ivSpecialAttack !== 31)
    ivs.push(`${pokemon.ivSpecialAttack} SpA`);
  if (pokemon.ivSpecialDefense !== undefined && pokemon.ivSpecialDefense !== 31)
    ivs.push(`${pokemon.ivSpecialDefense} SpD`);
  if (pokemon.ivSpeed !== undefined && pokemon.ivSpeed !== 31)
    ivs.push(`${pokemon.ivSpeed} Spe`);

  if (ivs.length > 0) {
    lines.push(`IVs: ${ivs.join(" / ")}`);
  }

  // Moves
  if (pokemon.move1) lines.push(`- ${pokemon.move1}`);
  if (pokemon.move2) lines.push(`- ${pokemon.move2}`);
  if (pokemon.move3) lines.push(`- ${pokemon.move3}`);
  if (pokemon.move4) lines.push(`- ${pokemon.move4}`);

  return lines.join("\n");
}

/**
 * Export a Pokemon to Showdown format (using structured PokemonSet)
 */
export function exportPokemonSetToShowdown(pokemon: PokemonSet): string {
  return exportPokemonToShowdown(toFlat(pokemon));
}

/**
 * Export a full team to Showdown format
 */
export function exportTeamToShowdown(pokemon: PokemonSetFlat[]): string {
  return pokemon.map((p) => exportPokemonToShowdown(p)).join("\n\n");
}

/**
 * Export a full team of PokemonSets to Showdown format
 */
export function exportTeamSetToShowdown(pokemon: PokemonSet[]): string {
  return pokemon.map((p) => exportPokemonSetToShowdown(p)).join("\n\n");
}

/**
 * Convert Showdown Pokemon to our PokemonSet format
 */
export function convertShowdownToPokemonSet(
  showdownPokemon: ShowdownPokemon
): PokemonSet {
  return {
    species: showdownPokemon.species,
    nickname: showdownPokemon.nickname,
    level: showdownPokemon.level || 50,
    nature: showdownPokemon.nature,
    ability: showdownPokemon.ability,
    heldItem: showdownPokemon.item,
    gender:
      showdownPokemon.gender === "M"
        ? "Male"
        : showdownPokemon.gender === "F"
          ? "Female"
          : undefined,
    isShiny: showdownPokemon.shiny || false,
    teraType: showdownPokemon.teraType,
    formatLegal: true, // Will be validated separately
    moves: {
      move1: showdownPokemon.moves[0] || "",
      move2: showdownPokemon.moves[1],
      move3: showdownPokemon.moves[2],
      move4: showdownPokemon.moves[3],
    },
    evs: {
      hp: showdownPokemon.evs?.hp || 0,
      attack: showdownPokemon.evs?.atk || 0,
      defense: showdownPokemon.evs?.def || 0,
      specialAttack: showdownPokemon.evs?.spa || 0,
      specialDefense: showdownPokemon.evs?.spd || 0,
      speed: showdownPokemon.evs?.spe || 0,
    },
    ivs: {
      hp: showdownPokemon.ivs?.hp || 31,
      attack: showdownPokemon.ivs?.atk || 31,
      defense: showdownPokemon.ivs?.def || 31,
      specialAttack: showdownPokemon.ivs?.spa || 31,
      specialDefense: showdownPokemon.ivs?.spd || 31,
      speed: showdownPokemon.ivs?.spe || 31,
    },
  };
}

/**
 * Convert Showdown Pokemon to our flat database format
 */
export function convertShowdownToDbFormat(
  showdownPokemon: ShowdownPokemon
): PokemonSetFlat {
  const pokemonSet = convertShowdownToPokemonSet(showdownPokemon);
  return toFlat(pokemonSet);
}

/**
 * Convert a full Showdown team to PokemonSet array
 */
export function convertShowdownTeamToPokemonSets(text: string): PokemonSet[] {
  const showdownTeam = parseTeam(text);
  return showdownTeam.map((sp) => convertShowdownToPokemonSet(sp));
}

/**
 * Convert a full Showdown team to flat database format array
 */
export function convertShowdownTeamToDbFormat(text: string): PokemonSetFlat[] {
  const showdownTeam = parseTeam(text);
  return showdownTeam.map((sp) => convertShowdownToDbFormat(sp));
}
