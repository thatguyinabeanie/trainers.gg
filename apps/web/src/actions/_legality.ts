/**
 * Pokemon legality guard for server actions.
 *
 * Validates species, item, ability, moves, and tera type against the
 * team's format before allowing writes to the database. Used by both
 * `addPokemonToTeamAction` and `updatePokemonAction` as defense-in-depth.
 */

import {
  isLegalSpecies,
  isLegalItem,
  isLegalMove,
  isLegalAbility,
  isLegalTeraType,
} from "@trainers/pokemon";

// =============================================================================
// Types
// =============================================================================

/** Minimal shape covering the fields that legality checks need. */
export interface PokemonLegalityCheck {
  species?: string | null;
  ability?: string | null;
  held_item?: string | null;
  move1?: string | null;
  move2?: string | null;
  move3?: string | null;
  move4?: string | null;
  tera_type?: string | null;
}

// =============================================================================
// Guard
// =============================================================================

/**
 * Return the first legality violation found, or `null` when all provided
 * fields are legal in `formatId`.
 *
 * Empty/null fields are always treated as legal (no-item, no-ability,
 * no-tera all pass). Checks run in order: species, item, ability, moves,
 * tera type.
 */
export function findLegalityViolation(
  p: PokemonLegalityCheck,
  formatId: string
): string | null {
  // Species check
  if (p.species && !isLegalSpecies(p.species, formatId)) {
    return `${p.species} isn't legal in this format.`;
  }

  // Item check
  if (p.held_item && !isLegalItem(p.held_item, formatId)) {
    return `${p.held_item} isn't a legal item in this format.`;
  }

  // Ability check (requires species context)
  if (
    p.species &&
    p.ability &&
    !isLegalAbility(p.ability, p.species, formatId)
  ) {
    return `${p.species} can't legally have ${p.ability} in this format.`;
  }

  // Move checks (require species context)
  if (p.species) {
    for (const slot of ["move1", "move2", "move3", "move4"] as const) {
      const move = p[slot];
      if (move && !isLegalMove(move, p.species, formatId)) {
        return `${p.species} can't legally use ${move} in this format.`;
      }
    }
  }

  // Tera type check
  if (p.tera_type && !isLegalTeraType(p.tera_type, formatId)) {
    return `Tera type ${p.tera_type} isn't allowed in this format.`;
  }

  return null;
}
