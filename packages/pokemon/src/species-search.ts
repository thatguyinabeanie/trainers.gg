/**
 * Species search utilities for the Pokemon team builder species picker.
 *
 * Provides a searchable index of format-legal species with multi-field
 * filtering across species name, abilities, types, moves, and base stats.
 */

import { Dex } from "@pkmn/dex";
import { Generations } from "@pkmn/data";

import { getFormatById } from "./formats";
import {
  getLegalMoves,
  getLegalSpecies,
  getMegaStoneForSpecies,
  LEGALITY_UNAVAILABLE,
  legalSetOrPermissive,
} from "./format-legality";
import { getLearnableMoves } from "./validation";

// Local Generations instance — supports any generation, not just gen9
const gens = new Generations(Dex);

// Gen 9 raw Dex — used to look up "Past" species that the @pkmn/data
// Generations wrapper omits from its iteration. Champions includes many
// older-generation Pokemon that are isNonstandard=Past in gen 9.
const gen9RawDex = Dex.forGen(9);

// Gen 6 raw Dex — fallback for standard Gen 6/7 mega forms that have
// exists:false in the Gen 9 dex. Mega evolution was removed in Gen 8+.
const gen6RawDex = Dex.forGen(6);

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
  // Treat the LEGALITY_UNAVAILABLE sentinel like undefined here — read-path
  // search shouldn't break the autocomplete UI on a transient sim hiccup.
  const lowered =
    legal && legal !== LEGALITY_UNAVAILABLE
      ? Array.from(legal, (m) => m.toLowerCase())
      : undefined;
  lowercaseLegalMovesCache.set(cacheKey, lowered);
  return lowered;
}

// =============================================================================
// Types
// =============================================================================

export interface SpeciesSearchEntry {
  species: string;
  types: string[];
  abilities: string[]; // kept for back-compat
  abilitySlot1: string | null;
  abilitySlot2: string | null;
  hiddenAbility: string | null;
  /** Role IDs this species fits — populated by buildSpeciesSearchIndex when
   *  a getRoles resolver is supplied. Empty otherwise. */
  roles: string[];
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

/**
 * Resolver function type for mapping a species to a list of role IDs.
 * Supplied optionally to `buildSpeciesSearchIndex`.
 */
export type GetRolesFn = (
  abilities: {
    slot1: string | null;
    slot2: string | null;
    hidden: string | null;
  },
  speciesName: string,
  formatId: string
) => string[];

// =============================================================================
// Public API
// =============================================================================

/**
 * Build a SpeciesSearchEntry from a raw @pkmn/dex species object.
 * Shared by the Generations-wrapper path and the raw-dex path below.
 */
function makeEntry(
  species: {
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
  },
  getRoles?: GetRolesFn,
  formatId?: string
): SpeciesSearchEntry {
  // Cast abilities to an indexable record for per-slot access
  const abilitiesRecord = species.abilities as Record<
    string,
    string | undefined
  >;
  const abilities = Object.values(abilitiesRecord).filter(
    (a): a is string => typeof a === "string" && a.length > 0
  );
  const abilitySlot1 = abilitiesRecord["0"] ?? null;
  const abilitySlot2 = abilitiesRecord["1"] ?? null;
  const hiddenAbility = abilitiesRecord["H"] ?? null;
  const { hp, atk, def, spa, spd, spe } = species.baseStats;
  const roles =
    getRoles && formatId
      ? getRoles(
          { slot1: abilitySlot1, slot2: abilitySlot2, hidden: hiddenAbility },
          species.name,
          formatId
        )
      : [];
  return {
    species: species.name,
    types: species.types as string[],
    abilities,
    abilitySlot1,
    abilitySlot2,
    hiddenAbility,
    roles,
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
 * @param getRoles - Optional resolver to populate role IDs per species
 * @returns Array of SpeciesSearchEntry objects for every species in the generation
 */
// Module-level cache of fully-built species indexes. The build is expensive
// (iterates every species, runs validation + role inference per entry) and
// pickers commonly mount/unmount inside dialogs, so caching across mounts
// avoids redoing the work every time the picker opens.
//
// Keyed by formatId. The cache is keyed only by formatId because
// `getRoles` (when provided) is the stable, module-level `getRolesForSpecies`
// resolver — a different role function would warrant a different cache key,
// but in practice we only call this with that one resolver. If a caller ever
// needs a different resolver, pass `getRoles: undefined` to bypass the cache
// path that includes role data, or evict via `clearSpeciesSearchIndexCache()`.
const speciesIndexCache = new Map<string, SpeciesSearchEntry[]>();
const speciesIndexCacheNoRoles = new Map<string, SpeciesSearchEntry[]>();

/**
 * Evict the species-search index cache. Useful in tests and when an upstream
 * dataset (e.g. `getRolesForSpecies`'s registry) has been mutated.
 */
export function clearSpeciesSearchIndexCache(): void {
  speciesIndexCache.clear();
  speciesIndexCacheNoRoles.clear();
}

export function buildSpeciesSearchIndex(
  formatId: string,
  getRoles?: GetRolesFn
): SpeciesSearchEntry[] {
  const cache = getRoles ? speciesIndexCache : speciesIndexCacheNoRoles;
  const cached = cache.get(formatId);
  if (cached) return cached;

  // Determine generation from format registry; default to 9 if unknown
  const format = getFormatById(formatId);
  const generation = format?.generation ?? 9;

  // Clamp to max supported generation by @pkmn/dex (currently 9)
  const safeGen = Math.min(generation, 9) as Parameters<typeof gens.get>[0];
  const gen = gens.get(safeGen);

  // Static legal-species whitelist for this format (undefined = no static
  // list; LEGALITY_UNAVAILABLE = validator threw, treat like undefined for
  // search to avoid breaking autocomplete on a transient sim hiccup).
  const staticLegalRaw = getLegalSpecies(formatId);
  const staticLegal =
    staticLegalRaw && staticLegalRaw !== LEGALITY_UNAVAILABLE
      ? staticLegalRaw
      : undefined;

  const index: SpeciesSearchEntry[] = [];

  // Track which species names we've added to avoid duplicates when the static
  // legal set is merged below.
  const addedNames = new Set<string>();

  for (const species of gen.species) {
    // Only include species that are real and not non-standard (e.g., Pokestar)
    if (!species.exists || species.isNonstandard) continue;

    index.push(makeEntry(species, getRoles, formatId));
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

      // Try Gen 9 raw dex first (handles Past-tagged base species like Aerodactyl)
      let rawSpecies = gen9RawDex.species.get(speciesName);

      // Standard Gen 6/7 mega forms have exists:false in Gen 9 — try Gen 6
      if (!rawSpecies?.exists) {
        rawSpecies = gen6RawDex.species.get(speciesName);
      }

      // Custom Champions mega forms (e.g. Greninja-Mega, Chandelure-Mega) are
      // not present in either @pkmn/dex gen and will be skipped here.
      // They will not appear in the search index in v1 — a follow-up can add
      // synthetic entries using the CHAMPIONS_EXCLUSIVE_MEGA_STATS table.
      if (!rawSpecies?.exists) continue;

      index.push(makeEntry(rawSpecies, getRoles, formatId));
      addedNames.add(rawSpecies.name);
    }
  }

  cache.set(formatId, index);
  return index;
}

/**
 * Search a species index built by `buildSpeciesSearchIndex`.
 *
 * Filtering rules:
 * - `query`: case-insensitive substring match against species name, ability
 *    names, type names, and — when `options.formatId` is supplied —
 *    learnable-move names for that format
 * - `types`: species must have ALL specified types (AND logic — useful for
 *    finding dual-type species like Fire/Grass)
 * - `abilities`: species must have at least one of the specified abilities (OR logic)
 * - `roles`: species must carry ALL specified roles (AND logic)
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
    /** Filter: species must have this exact ability in any slot */
    ability?: string | null;
    /** Filter: include only species that have at least one Mega form */
    megaOnly?: boolean;
    /** Filter: species must have at least one of these role IDs */
    roles?: string[];
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

    // -- Types filter (AND: species must have ALL selected types) --
    if (normalizedTypes) {
      const entryTypesLower = entry.types.map((t) => t.toLowerCase());
      const matchesAll = normalizedTypes.every((t) =>
        entryTypesLower.includes(t)
      );
      if (!matchesAll) return false;
    }

    // -- Abilities filter (OR: species must have at least one matching ability) --
    if (normalizedAbilities) {
      const hasMatchingAbility = entry.abilities.some((a) =>
        normalizedAbilities.includes(a.toLowerCase())
      );
      if (!hasMatchingAbility) return false;
    }

    // -- Ability filter (exact match against any ability slot) --
    if (options?.ability) {
      const target = options.ability.toLowerCase();
      const match =
        entry.abilitySlot1?.toLowerCase() === target ||
        entry.abilitySlot2?.toLowerCase() === target ||
        entry.hiddenAbility?.toLowerCase() === target;
      if (!match) return false;
    }

    // -- megaOnly filter — show ONLY Mega-form species --
    // Champions M-A picker context: the user wants to see Charizard-Mega-X,
    // Venusaur-Mega, etc., not the base species that have Megas. We surface
    // entries whose form name is a recognized Mega (its own mega stone is
    // non-null).
    if (options?.megaOnly) {
      if (getMegaStoneForSpecies(entry.species) === null) return false;
    }

    // -- Roles filter (AND: species must carry ALL specified roles) --
    if (options?.roles && options.roles.length > 0) {
      const hasAll = options.roles.every((roleId) =>
        entry.roles.includes(roleId)
      );
      if (!hasAll) return false;
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

// =============================================================================
// Format-wide enumerators
// =============================================================================

const abilitySetCache = new Map<string, string[]>();
const moveSetCache = new Map<string, string[]>();

/**
 * Return a sorted, deduplicated list of all abilities that appear on any
 * species in the given format's legal index.
 *
 * Results are cached per formatId — subsequent calls with the same formatId
 * return the same array reference.
 */
export function getAllLegalAbilities(formatId: string): string[] {
  const cached = abilitySetCache.get(formatId);
  if (cached) return cached;
  const index = buildSpeciesSearchIndex(formatId);
  const set = new Set<string>();
  for (const entry of index) {
    if (entry.abilitySlot1) set.add(entry.abilitySlot1);
    if (entry.abilitySlot2) set.add(entry.abilitySlot2);
    if (entry.hiddenAbility) set.add(entry.hiddenAbility);
  }
  const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
  abilitySetCache.set(formatId, sorted);
  return sorted;
}

/**
 * Return a sorted, deduplicated list of all moves that any species in the
 * given format can legally learn.
 *
 * Uses `getLegalMoves(species, formatId)` for format-aware filtering.
 * Falls back to `getLearnableMoves(species)` when legality is not registered
 * (matches the pattern used in `role-registry.ts`).
 *
 * Results are cached per formatId — subsequent calls with the same formatId
 * return the same array reference.
 */
export function getAllLegalMoves(formatId: string): string[] {
  const cached = moveSetCache.get(formatId);
  if (cached) return cached;
  const index = buildSpeciesSearchIndex(formatId);
  const set = new Set<string>();
  for (const entry of index) {
    const legalSet = legalSetOrPermissive(
      getLegalMoves(entry.species, formatId)
    );
    const moves = legalSet ?? new Set(getLearnableMoves(entry.species));
    for (const m of moves) set.add(m);
  }
  const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
  moveSetCache.set(formatId, sorted);
  return sorted;
}
