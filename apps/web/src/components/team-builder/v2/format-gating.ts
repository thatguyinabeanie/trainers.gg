import {
  formatHasTera,
  isChampionsFormat,
  type GameFormat,
} from "@trainers/pokemon";

// =============================================================================
// format-gating.ts — format feature support helpers
// =============================================================================

/**
 * Returns true when Tera type is a legal mechanic in the given format.
 * Delegates to the @trainers/pokemon canonical implementation.
 */
export function formatSupportsTera(format: GameFormat | undefined): boolean {
  return !!format && formatHasTera(format);
}

/**
 * Returns true when Dynamax/Gigantamax is legal in the given format.
 * Dynamax was introduced in Sword/Shield (generation 8).
 */
export function formatSupportsDynamax(format: GameFormat | undefined): boolean {
  return !!format && format.generation === 8;
}

/**
 * Returns true when Mega Evolution is legal in the given format.
 * Mega Evolution was available in X/Y (gen 6) and Sun/Moon (gen 7).
 */
export function formatSupportsMega(format: GameFormat | undefined): boolean {
  return !!format && (format.generation === 6 || format.generation === 7);
}

/**
 * Returns true when Z-Moves are legal in the given format.
 * Z-Moves were introduced in Sun/Moon (generation 7).
 */
export function formatSupportsZMoves(format: GameFormat | undefined): boolean {
  return !!format && format.generation === 7;
}

/**
 * Returns true when IVs are a meaningful concept in the given format.
 * Champions replaces the IV/EV system with Splendor Points and has no IV
 * slider — every stat is treated as 31 IVs internally. Hide IV UI in
 * Champions; show it everywhere else.
 */
export function formatSupportsIvs(format: GameFormat | undefined): boolean {
  return !!format && !isChampionsFormat(format);
}
