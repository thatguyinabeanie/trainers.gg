import { Dex } from "@pkmn/dex";
import { Generations } from "@pkmn/data";
import type { PokemonSet, PokemonSetFlat } from "@/lib/types/pokemon";
import { fromFlat } from "@/lib/types/pokemon";

// Initialize Pokemon data for the current generation (9 = Scarlet/Violet)
const gens = new Generations(Dex);
const currentGen = gens.get(9);

export interface PokemonValidationError {
  field: string;
  message: string;
}

export interface PokemonValidationResult {
  isValid: boolean;
  errors: PokemonValidationError[];
}

// Re-export types for convenience
export type {
  PokemonSet,
  PokemonSetFlat,
  PokemonCore,
  PokemonStats,
  PokemonMoves,
} from "@/lib/types/pokemon";

/**
 * Validates a Pokemon's data against the current generation's rules
 */
export function validatePokemon(
  pokemon: PokemonSetFlat | PokemonSet
): PokemonValidationResult {
  const errors: PokemonValidationError[] = [];

  // Convert to structured format if flat
  const pokemonSet: PokemonSet =
    "moves" in pokemon ? pokemon : fromFlat(pokemon);

  try {
    // Validate species exists
    const species = currentGen.species.get(pokemonSet.species);
    if (!species?.exists) {
      errors.push({
        field: "species",
        message: `Pokemon species "${pokemonSet.species}" does not exist`,
      });
      // If species doesn't exist, we can't validate further
      return { isValid: false, errors };
    }

    // Validate nature
    const nature = currentGen.natures.get(pokemonSet.nature);
    if (!nature?.exists) {
      errors.push({
        field: "nature",
        message: `Nature "${pokemonSet.nature}" does not exist`,
      });
    }

    // Validate ability
    const ability = currentGen.abilities.get(pokemonSet.ability);
    if (!ability?.exists) {
      errors.push({
        field: "ability",
        message: `Ability "${pokemonSet.ability}" does not exist`,
      });
    } else {
      // Check if Pokemon can have this ability
      const validAbilities = Object.values(species.abilities || {}).filter(
        Boolean
      );
      if (!validAbilities.includes(pokemonSet.ability)) {
        errors.push({
          field: "ability",
          message: `${pokemonSet.species} cannot have ability "${pokemonSet.ability}"`,
        });
      }
    }

    // Validate held item if provided
    if (pokemonSet.heldItem) {
      const item = currentGen.items.get(pokemonSet.heldItem);
      if (!item?.exists) {
        errors.push({
          field: "heldItem",
          message: `Item "${pokemonSet.heldItem}" does not exist`,
        });
      }
    }

    // Validate gender if provided
    if (pokemonSet.gender) {
      const genderRatio = species.genderRatio;
      if (genderRatio?.M === 0 && pokemonSet.gender === "Male") {
        errors.push({
          field: "gender",
          message: `${pokemonSet.species} cannot be male`,
        });
      } else if (genderRatio?.F === 0 && pokemonSet.gender === "Female") {
        errors.push({
          field: "gender",
          message: `${pokemonSet.species} cannot be female`,
        });
      } else if (genderRatio === null && pokemonSet.gender !== undefined) {
        errors.push({
          field: "gender",
          message: `${pokemonSet.species} is genderless`,
        });
      }
    }

    // Validate moves using structured format
    const moves = [
      pokemonSet.moves.move1,
      pokemonSet.moves.move2,
      pokemonSet.moves.move3,
      pokemonSet.moves.move4,
    ].filter(Boolean);

    const uniqueMoves = new Set(moves);
    if (moves.length !== uniqueMoves.size) {
      errors.push({
        field: "moves",
        message: "Pokemon cannot have duplicate moves",
      });
    }

    for (const [index, moveId] of moves.entries()) {
      if (moveId) {
        const move = currentGen.moves.get(moveId);
        if (!move?.exists) {
          errors.push({
            field: `move${index + 1}`,
            message: `Move "${moveId}" does not exist`,
          });
        } else {
          // Check if Pokemon can learn this move
          // TODO: Learnset validation requires async operations
          // const learnset = await currentGen.learnsets.get(species.id);
          // if (learnset && !learnset.can(move.id)) {
          //   errors.push({
          //     field: `move${index + 1}`,
          //     message: `${pokemonSet.species} cannot learn "${moveId}"`,
          //   });
          // }
        }
      }
    }

    // Validate EVs using structured format
    const totalEvs = Object.values(pokemonSet.evs).reduce(
      (sum, ev) => sum + ev,
      0
    );
    if (totalEvs > 510) {
      errors.push({
        field: "evs",
        message: `Total EVs (${totalEvs}) cannot exceed 510`,
      });
    }

    // Validate individual EV values
    for (const [stat, value] of Object.entries(pokemonSet.evs)) {
      if (value < 0 || value > 252) {
        errors.push({
          field: `ev${stat.charAt(0).toUpperCase() + stat.slice(1)}`,
          message: `${stat} EVs must be between 0 and 252`,
        });
      }
    }

    // Validate IVs using structured format
    for (const [stat, value] of Object.entries(pokemonSet.ivs)) {
      if (value < 0 || value > 31) {
        errors.push({
          field: `iv${stat.charAt(0).toUpperCase() + stat.slice(1)}`,
          message: `${stat} IVs must be between 0 and 31`,
        });
      }
    }

    // Validate Tera Type if provided
    if (pokemonSet.teraType) {
      const types = currentGen.types;
      const teraType = types.get(pokemonSet.teraType);
      if (!teraType?.exists) {
        errors.push({
          field: "teraType",
          message: `Tera Type "${pokemonSet.teraType}" does not exist`,
        });
      }
    }

    // Validate level
    if (pokemonSet.level < 1 || pokemonSet.level > 100) {
      errors.push({
        field: "level",
        message: "Level must be between 1 and 100",
      });
    }
  } catch (error) {
    errors.push({
      field: "general",
      message: `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get all valid abilities for a Pokemon species
 */
export function getValidAbilities(speciesName: string): string[] {
  try {
    const species = currentGen.species.get(speciesName);
    if (!species?.exists) return [];

    return Object.values(species.abilities || {}).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

/**
 * Get all valid types for Tera Type
 */
export function getValidTeraTypes(): string[] {
  try {
    return Array.from(currentGen.types)
      .map((type) => type.name)
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Get all valid natures
 */
export function getValidNatures(): string[] {
  try {
    return Array.from(currentGen.natures)
      .map((nature) => nature.name)
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Check if a Pokemon species exists
 */
export function isValidSpecies(speciesName: string): boolean {
  try {
    const species = currentGen.species.get(speciesName);
    return !!species?.exists;
  } catch {
    return false;
  }
}

/**
 * Check if a move exists
 */
export function isValidMove(moveName: string): boolean {
  try {
    const move = currentGen.moves.get(moveName);
    return !!move?.exists;
  } catch {
    return false;
  }
}

/**
 * Get moves that a Pokemon can learn
 */
export function getLearnableMoves(speciesName: string): string[] {
  try {
    const species = currentGen.species.get(speciesName);
    if (!species?.exists) return [];

    // TODO: Learnset validation requires async operations
    // const learnset = await currentGen.learnsets.get(species.id);
    // if (!learnset) return [];

    // For now, return all moves (no filtering)
    const moves: string[] = [];
    for (const move of currentGen.moves) {
      moves.push(move.name);
    }

    return moves.sort();
  } catch {
    return [];
  }
}
