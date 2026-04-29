// =============================================================================
// move-effectiveness.ts
//
// Computes type effectiveness multiplier for a move against a defender.
// Delegates to the shared @trainers/pokemon type chart so no logic is
// duplicated here.
// =============================================================================

import {
  getMoveData,
  getSpeciesTypes,
  getTypeEffectiveness,
  type PokemonType,
} from "@trainers/pokemon";

/**
 * Returns the type effectiveness multiplier (e.g. 2, 0.5, 0) for a named
 * move against a named defender species.  Returns 1 when data is unavailable.
 *
 * If `defenderSpecies` is empty the function returns 1 (no information).
 */
export function getMoveEffectiveness(
  moveName: string,
  defenderSpecies: string
): number {
  if (!moveName || !defenderSpecies) return 1;

  const moveData = getMoveData(moveName);
  if (!moveData) return 1;

  // Status moves don't have type effectiveness
  if (moveData.category === "Status") return 1;

  const moveType = moveData.type as PokemonType;
  const defenderTypes = getSpeciesTypes(defenderSpecies);
  if (defenderTypes.length === 0) return 1;

  return getTypeEffectiveness(moveType, defenderTypes);
}
