/**
 * Pure legality guard for format-change validation.
 *
 * Extracted as a standalone module so it can be unit-tested without
 * needing a Supabase client or a running Server Action context.
 */

import { getLegalSpecies } from "@trainers/pokemon";

// =============================================================================
// Types
// =============================================================================

/** Minimal pokemon shape needed for the legality check. */
export interface TeamPokemonSlot {
  pokemon: { species: string | null } | null;
}

export type FormatGuardResult = { ok: true } | { ok: false; illegal: string[] };

// =============================================================================
// Guard
// =============================================================================

/**
 * Check whether all species on the team are legal in `targetFormat`.
 *
 * Returns `{ ok: true }` when:
 * - `targetFormat` is the same as `currentFormat` (no-op)
 * - the format has no registered legality list (permissive default)
 * - all species pass the legality check
 *
 * Returns `{ ok: false, illegal: string[] }` with the offending species
 * names when at least one species is illegal in the target format.
 */
export function checkFormatChangeLegality(
  teamPokemon: TeamPokemonSlot[],
  currentFormat: string | null,
  targetFormat: string
): FormatGuardResult {
  // If the format isn't actually changing, nothing to check.
  if (targetFormat === currentFormat) {
    return { ok: true };
  }

  const legalSet = getLegalSpecies(targetFormat);

  // No legality list registered for this format — treat as permissive.
  if (legalSet === undefined) {
    return { ok: true };
  }

  const illegal = teamPokemon
    .map((slot) => slot.pokemon?.species ?? null)
    .filter(
      (species): species is string => species !== null && !legalSet.has(species)
    );

  if (illegal.length > 0) {
    return { ok: false, illegal };
  }

  return { ok: true };
}
