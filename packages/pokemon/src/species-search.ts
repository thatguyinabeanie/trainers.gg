/**
 * Species search utilities for the Pokemon team builder species picker.
 *
 * Provides a searchable index of format-legal species with multi-field
 * filtering across species name, abilities, types, moves, and base stats.
 */

import { Dex } from "@pkmn/dex";
import { Generations } from "@pkmn/data";

import { getFormatById } from "./formats";
import { getLearnableMoves } from "./validation";

// Local Generations instance — supports any generation, not just gen9
const gens = new Generations(Dex);

// =============================================================================
// Types
// =============================================================================

export interface SpeciesSearchEntry {
  species: string;
  types: string[];
  abilities: string[];
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  bst: number;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Build a searchable index of all species in a format's generation.
 *
 * Iterates all existing species in the format's generation and collects
 * display name, types, abilities, base stats, and BST (base stat total).
 * Note: this returns all generation-legal species, not regulation-filtered.
 * Format-specific legality (e.g., VGC Reg I banlist) is not applied here.
 *
 * Falls back to generation 9 if the format ID is not found in the registry.
 *
 * @param formatId - Showdown format ID (e.g., "gen9vgc2026regi")
 * @returns Array of SpeciesSearchEntry objects for every species in the generation
 */
export function buildSpeciesSearchIndex(
  formatId: string
): SpeciesSearchEntry[] {
  // Determine generation from format registry; default to 9 if unknown
  const format = getFormatById(formatId);
  const generation = format?.generation ?? 9;

  // Clamp to max supported generation by @pkmn/dex (currently 9)
  const safeGen = Math.min(generation, 9) as Parameters<typeof gens.get>[0];
  const gen = gens.get(safeGen);

  const index: SpeciesSearchEntry[] = [];

  for (const species of gen.species) {
    // Only include species that are real and not non-standard (e.g., Pokestar)
    if (!species.exists || species.isNonstandard) continue;

    // Extract ability values from the abilities object { "0": "...", "1": "...", H: "..." }
    const abilities = Object.values(species.abilities).filter(
      (a): a is string => typeof a === "string" && a.length > 0
    );

    const { hp, atk, def, spa, spd, spe } = species.baseStats;

    // BST is the sum of all six base stats
    const bst = hp + atk + def + spa + spd + spe;

    index.push({
      species: species.name,
      types: species.types as string[],
      abilities,
      baseStats: { hp, atk, def, spa, spd, spe },
      bst,
    });
  }

  return index;
}

/**
 * Search a species index built by `buildSpeciesSearchIndex`.
 *
 * Filtering rules:
 * - `query`: case-insensitive substring match against species name, ability names, and type names
 * - `types`: species must have at least one of the specified types (OR logic)
 * - `abilities`: species must have at least one of the specified abilities (OR logic)
 * - `moves`: species must be able to learn ALL specified moves (AND logic) — uses `getLearnableMoves()`
 * - `minBaseStat` / `maxBaseStat`: inclusive range filter per individual stat
 *
 * Results are returned in the same order as the input index.
 *
 * @param index - Pre-built index from `buildSpeciesSearchIndex`
 * @param query - Free-text search string (empty string matches everything)
 * @param options - Optional structured filters
 * @returns Filtered array of SpeciesSearchEntry objects
 */
export function searchSpecies(
  index: SpeciesSearchEntry[],
  query: string,
  options?: {
    /** Filter: species must have at least one of these types */
    types?: string[];
    /** Filter: species must have at least one of these abilities */
    abilities?: string[];
    /** Filter: species must be able to learn ALL of these moves */
    moves?: string[];
    /** Filter: species base stats must be >= these values */
    minBaseStat?: Partial<Record<string, number>>;
    /** Filter: species base stats must be <= these values */
    maxBaseStat?: Partial<Record<string, number>>;
  }
): SpeciesSearchEntry[] {
  const normalizedQuery = query.trim().toLowerCase();

  return index.filter((entry) => {
    // -- Query filter --
    if (normalizedQuery.length > 0) {
      const inName = entry.species.toLowerCase().includes(normalizedQuery);
      const inAbilities = entry.abilities.some((a) =>
        a.toLowerCase().includes(normalizedQuery)
      );
      const inTypes = entry.types.some((t) =>
        t.toLowerCase().includes(normalizedQuery)
      );

      if (!inName && !inAbilities && !inTypes) return false;
    }

    // -- Types filter (OR: species must have at least one matching type) --
    if (options?.types && options.types.length > 0) {
      const normalizedFilter = options.types.map((t) => t.toLowerCase());
      const hasMatchingType = entry.types.some((t) =>
        normalizedFilter.includes(t.toLowerCase())
      );
      if (!hasMatchingType) return false;
    }

    // -- Abilities filter (OR: species must have at least one matching ability) --
    if (options?.abilities && options.abilities.length > 0) {
      const normalizedFilter = options.abilities.map((a) => a.toLowerCase());
      const hasMatchingAbility = entry.abilities.some((a) =>
        normalizedFilter.includes(a.toLowerCase())
      );
      if (!hasMatchingAbility) return false;
    }

    // -- Moves filter (AND: species must learn ALL specified moves) --
    if (options?.moves && options.moves.length > 0) {
      const learnableMoves = getLearnableMoves(entry.species).map((m) =>
        m.toLowerCase()
      );
      const learnsAllMoves = options.moves.every((move) =>
        learnableMoves.includes(move.toLowerCase())
      );
      if (!learnsAllMoves) return false;
    }

    // -- Min base stat filter --
    if (options?.minBaseStat) {
      for (const [stat, minValue] of Object.entries(options.minBaseStat)) {
        if (minValue === undefined) continue;
        const statKey = stat as keyof SpeciesSearchEntry["baseStats"];
        if (entry.baseStats[statKey] < minValue) return false;
      }
    }

    // -- Max base stat filter --
    if (options?.maxBaseStat) {
      for (const [stat, maxValue] of Object.entries(options.maxBaseStat)) {
        if (maxValue === undefined) continue;
        const statKey = stat as keyof SpeciesSearchEntry["baseStats"];
        if (entry.baseStats[statKey] > maxValue) return false;
      }
    }

    return true;
  });
}
