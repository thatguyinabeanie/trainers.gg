/**
 * Filter state for the species picker.
 *
 * Holds every active filter dimension (types, ability, moves, roles, mega-only)
 * as a flat value object. Components read from this shape and dispatch updates;
 * the picker itself derives filtered results from it on every render.
 *
 * `DEFAULT_SPECIES_FILTERS` is the canonical empty/reset value — spread it to
 * clear any subset of filters without losing the shape.
 */

import { type RoleId } from "./role-registry";

export type SpeciesFilterState = {
  types: readonly string[];
  ability: string | null;
  moves: readonly string[];
  roles: readonly RoleId[];
  megaOnly: boolean;
};

export const DEFAULT_SPECIES_FILTERS: SpeciesFilterState = {
  types: [],
  ability: null,
  moves: [],
  roles: [],
  megaOnly: false,
};
