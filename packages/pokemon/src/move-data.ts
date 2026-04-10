/**
 * Move data utilities for Pokemon team builder.
 * Wraps @pkmn/dex move lookups for type, category, and base power.
 */

import { Dex } from "@pkmn/dex";
import { Generations } from "@pkmn/data";

const gens = new Generations(Dex);
const gen9 = gens.get(9);

export type MoveCategory = "Physical" | "Special" | "Status";

/**
 * Get the type of a move (e.g., "Fire", "Water").
 * Returns null if the move is not found.
 */
export function getMoveType(moveName: string): string | null {
  try {
    const move = gen9.moves.get(moveName);
    if (!move?.exists) return null;
    return move.type;
  } catch {
    return null;
  }
}

/**
 * Get the category of a move (Physical, Special, or Status).
 * Returns null if the move is not found.
 */
export function getMoveCategory(moveName: string): MoveCategory | null {
  try {
    const move = gen9.moves.get(moveName);
    if (!move?.exists) return null;
    return move.category as MoveCategory;
  } catch {
    return null;
  }
}

/**
 * Get the base power of a move.
 * Returns null if the move is not found or has no base power (status moves).
 */
export function getMoveBP(moveName: string): number | null {
  try {
    const move = gen9.moves.get(moveName);
    if (!move?.exists) return null;
    return move.basePower || null;
  } catch {
    return null;
  }
}
