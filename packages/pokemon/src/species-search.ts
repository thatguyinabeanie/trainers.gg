/**
 * Species search utilities for the Pokemon team builder species picker.
 *
 * Provides a searchable index of format-legal species with multi-field
 * filtering across species name, abilities, types, moves, and base stats.
 */

import { Dex } from "@pkmn/dex";
import { Generations } from "@pkmn/data";

import { getFormatById } from "./formats";
import { getLegalMoves, getLegalSpecies } from "./format-legality";
import { getLearnableMoves } from "./validation";

// Local Generations instance — supports any generation, not just gen9
const gens = new Generations(Dex);

// Gen 9 raw Dex — used to look up "Past" species that the @pkmn/data
// Generations wrapper omits from its iteration. Champions includes many
// older-generation Pokemon that are isNonstandard=Past in gen 9.
const gen9RawDex = Dex.forGen(9);

// Module-level cache for learnable moves — avoids recomputing on every search keystroke
const learnableMovesCache = new Map<string, string[]>();

function getCachedLearnableMoves(species: string): string[] {
  let moves = learnableMovesCache.get(species);
  if (!moves) {
    moves = getLearnableMoves(species);
    learnableMovesCache.set(species, moves);
  }
  return moves;
}

/**
 * Lowercase, format-aware learnable-move lookup used by the free-text search.
 *
 * Wraps `getLegalMoves(species, formatId)` with a per-(species, format) cache
 * of the lowercased move-name array. The underlying `getLegalMoves` already
 * caches its `ReadonlySet<string>` result, but query-time substring matching
 * needs the array form lowercased once — caching avoids re-lowercasing
 * hundreds of moves per species on every keystroke.
 *
 * Returns `undefined` when learnset legality is not computable (e.g. a format
 * outside the simulator), signalling the caller to skip move matching for
 * that species rather than treating an empty set as "no moves".
 */
const lowercaseLegalMovesCache = new Map<string, string[] | undefined>();

function getLowercaseLegalMoves(
  species: string,
  formatId: string
): string[] | undefined {
  const cacheKey = `${formatId}::${species}`;
  if (lowercaseLegalMovesCache.has(cacheKey)) {
    return lowercaseLegalMovesCache.get(cacheKey);
  }
  const legal = getLegalMoves(species, formatId);
  const lowered = legal ? Array.from(legal, (m) => m.toLowerCase()) : undefined;
  lowercaseLegalMovesCache.set(cacheKey, lowered);
  return lowered;
}

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
 * Build a SpeciesSearchEntry from a raw @pkmn/dex species object.
 * Shared by the Generations-wrapper path and the raw-dex path below.
 */
function makeEntry(species: {
  name: string;
  types: readonly string[];
  abilities: object;
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
}): SpeciesSearchEntry {
  const abilities = Object.values(species.abilities).filter(
    (a): a is string => typeof a === "string" && a.length > 0
  );
  const { hp, atk, def, spa, spd, spe } = species.baseStats;
  return {
    species: species.name,
    types: species.types as string[],
    abilities,
    baseStats: { hp, atk, def, spa, spd, spe },
    bst: hp + atk + def + spa + spd + spe,
  };
}

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
 * **Champions / static-roster formats:** When `getLegalSpecies(formatId)`
 * returns a static whitelist (e.g. Champions Reg M-A), all species in that
 * whitelist are appended regardless of `isNonstandard`. This is necessary
 * because the `@pkmn/data` Generations wrapper excludes `isNonstandard=Past`
 * species from its iteration entirely — Champions includes many Gen 1–6 Pokemon
 * (Aerodactyl, Beedrill, Kangaskhan, etc.) that @pkmn/dex tags as "Past" and
 * would otherwise be silently absent from the picker even though
 * `isLegalSpecies` returns `true` for them.
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

  // Static legal-species whitelist for this format (undefined = no static list).
  const staticLegal = getLegalSpecies(formatId);

  const index: SpeciesSearchEntry[] = [];

  // Track which species names we've added to avoid duplicates when the static
  // legal set is merged below.
  const addedNames = new Set<string>();

  for (const species of gen.species) {
    // Only include species that are real and not non-standard (e.g., Pokestar)
    if (!species.exists || species.isNonstandard) continue;

    index.push(makeEntry(species));
    addedNames.add(species.name);
  }

  // For formats with a static legal whitelist (e.g. Champions Reg M-A), look up
  // each legal species directly from the raw gen-9 dex and add any that the
  // Generations wrapper iteration missed. This captures isNonstandard=Past
  // species (Aerodactyl, Beedrill, Kangaskhan, all Gen 1–6 Champions picks)
  // which the @pkmn/data wrapper excludes from its iteration entirely.
  if (staticLegal) {
    for (const speciesName of staticLegal) {
      if (addedNames.has(speciesName)) continue;
      const rawSpecies = gen9RawDex.species.get(speciesName);
      if (!rawSpecies?.exists) continue;
      index.push(makeEntry(rawSpecies));
      addedNames.add(rawSpecies.name);
    }
  }

  return index;
}

/**
 * Search a species index built by `buildSpeciesSearchIndex`.
 *
 * Filtering rules:
 * - `query`: case-insensitive substring match against species name, ability
 *    names, type names, and — when `options.formatId` is supplied —
 *    learnable-move names for that format
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
    minBaseStat?: Partial<
      Record<keyof SpeciesSearchEntry["baseStats"], number>
    >;
    /** Filter: species base stats must be <= these values */
    maxBaseStat?: Partial<
      Record<keyof SpeciesSearchEntry["baseStats"], number>
    >;
    /**
     * Active format ID. When set, the free-text `query` additionally matches
     * against learnable move names (e.g. "tail" surfaces Tailwind learners).
     * Move-name matching is skipped for formats whose legality is not
     * computable (the function falls back to name/type/ability matching).
     */
    formatId?: string;
  }
): SpeciesSearchEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  const queryFormatId = options?.formatId;

  // Precompute normalized filter arrays once (outside the per-entry loop)
  const normalizedTypes =
    options?.types && options.types.length > 0
      ? options.types.map((t) => t.toLowerCase())
      : undefined;
  const normalizedAbilities =
    options?.abilities && options.abilities.length > 0
      ? options.abilities.map((a) => a.toLowerCase())
      : undefined;
  const normalizedMoves =
    options?.moves && options.moves.length > 0
      ? options.moves.map((m) => m.toLowerCase())
      : undefined;

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

      // Move-name matching only runs when the caller passed a formatId so
      // we know which learnsets are in scope. The lookup is cached per
      // (species, format) — first keystroke per species is the only slow
      // call, subsequent keystrokes are O(moves) string scans.
      let inMoves = false;
      if (!inName && !inAbilities && !inTypes && queryFormatId) {
        const lowerMoves = getLowercaseLegalMoves(entry.species, queryFormatId);
        if (lowerMoves) {
          inMoves = lowerMoves.some((m) => m.includes(normalizedQuery));
        }
      }

      if (!inName && !inAbilities && !inTypes && !inMoves) return false;
    }

    // -- Types filter (OR: species must have at least one matching type) --
    if (normalizedTypes) {
      const hasMatchingType = entry.types.some((t) =>
        normalizedTypes.includes(t.toLowerCase())
      );
      if (!hasMatchingType) return false;
    }

    // -- Abilities filter (OR: species must have at least one matching ability) --
    if (normalizedAbilities) {
      const hasMatchingAbility = entry.abilities.some((a) =>
        normalizedAbilities.includes(a.toLowerCase())
      );
      if (!hasMatchingAbility) return false;
    }

    // -- Moves filter (AND: species must learn ALL specified moves) --
    if (normalizedMoves) {
      const learnableMoves = getCachedLearnableMoves(entry.species).map((m) =>
        m.toLowerCase()
      );
      const learnsAllMoves = normalizedMoves.every((move) =>
        learnableMoves.includes(move)
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
