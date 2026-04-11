/**
 * Move data utilities for Pokemon team builder.
 * Wraps @pkmn/dex move lookups for type, category, base power, and full move data.
 */

import { Dex } from "@pkmn/dex";
import { Generations } from "@pkmn/data";

const gens = new Generations(Dex);
const gen9 = gens.get(9);

/** The dex instance used for direct move lookups (full Move object access). */
const gen9Dex = Dex.forGen(9);

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

/** Full move data for UI rendering. */
export interface MoveData {
  name: string;
  type: string;
  category: MoveCategory;
  basePower: number;
  /** Accuracy as a number (e.g. 100), or true if always hits, or 0 if unknown. */
  accuracy: number | true;
  shortDesc: string;
}

/**
 * Get full move data by name for UI rendering.
 * Returns null if the move does not exist.
 */
export function getMoveData(moveName: string): MoveData | null {
  const move = gen9Dex.moves.get(moveName);
  if (!move?.exists) return null;
  return {
    name: move.name,
    type: move.type,
    category: move.category as MoveCategory,
    basePower: move.basePower,
    accuracy: move.accuracy,
    shortDesc: move.shortDesc,
  };
}
