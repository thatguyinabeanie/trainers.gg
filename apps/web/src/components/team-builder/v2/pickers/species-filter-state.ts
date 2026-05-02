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

export interface SpeciesFilterState {
  types: string[];
  ability: string | null;
  moves: string[];
  roles: string[];
  megaOnly: boolean;
}

export const DEFAULT_SPECIES_FILTERS: SpeciesFilterState = {
  types: [],
  ability: null,
  moves: [],
  roles: [],
  megaOnly: false,
};
