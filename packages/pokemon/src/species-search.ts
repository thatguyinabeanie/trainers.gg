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

// Library tsconfig uses ES2022 without DOM/Node lib — declare console ambiently
// so silent-fallback warnings compile without pulling in @types/node.
declare const console: {
  warn(...data: unknown[]): void;
};

// Local Generations instance — supports any generation, not just gen9
const gens = new Generations(Dex);

// Gen 9 raw Dex — used to look up "Past" species that the @pkmn/data
// Generations wrapper omits from its iteration. Champions includes many
// older-generation Pokemon that are isNonstandard=Past in gen 9.
const gen9RawDex = Dex.forGen(9);

// Gen 6 raw Dex — fallback for standard Gen 6/7 mega forms that have
// exists:false in the Gen 9 dex. Mega evolution was removed in Gen 8+.
const gen6RawDex = Dex.forGen(6);

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
  if (legal === LEGALITY_UNAVAILABLE && !warnedLegalMovesUnavailable.has(formatId)) {
    warnedLegalMovesUnavailable.add(formatId);
    // Two distinct fallbacks, both surfaced in the warning:
    //  - free-text move-name matching (line ~445) is *skipped* — typing a
    //    move name yields zero hits because we can't validate learnsets
    //  - the structured `moves` filter (line ~510) is *skipped per-entry*
    //    so every species passes the filter (permissive)
    // Calling either of those "permissive move search" alone is misleading
    // when debugging, so describe both behaviors explicitly.
    console.warn(
      `[species-search] Legal moves unavailable for format "${formatId}" — skipping move-name search and structured move filtering.`
    );
  }
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

export type SpeciesSearchEntry = {
  readonly species: string;
  readonly types: readonly string[];
  readonly abilities: readonly string[]; // kept for back-compat
  readonly abilitySlot1: string | null;
  readonly abilitySlot2: string | null;
  readonly hiddenAbility: string | null;
  /** Role IDs this species fits — populated by buildSpeciesSearchIndex when
   *  a getRoles resolver is supplied. Empty otherwise. */
  readonly roles: readonly string[];
  readonly baseStats: Readonly<{
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  }>;
  readonly bst: number;
};

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
) => readonly string[];

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
    types: species.types,
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
// The role-aware cache is keyed by the `getRoles` function identity FIRST and
// `formatId` second. This guarantees that two callers passing different
// resolvers for the same format can never serve each other's role data —
// every resolver gets its own per-format submap. WeakMap so resolvers held
// only here don't leak; reassigned (not mutated) on clear because WeakMap
// has no `.clear()`.
//
// `speciesIndexCacheNoRoles` is a separate Map for the resolver-less build
// (callers like `getAllLegalAbilities` that pass `getRoles: undefined`),
// kept distinct so a no-roles build can't be served to a roles-aware caller.
let speciesIndexByResolver = new WeakMap<
  GetRolesFn,
  Map<string, SpeciesSearchEntry[]>
>();
const speciesIndexCacheNoRoles = new Map<string, SpeciesSearchEntry[]>();

// Format-wide enumerator caches — populated lazily by getAllLegalAbilities /
// getAllLegalMoves further below. Declared here (rather than next to those
// functions) so `clearSpeciesSearchIndexCache` can reset every species-derived
// cache in one place without forward-reference gymnastics.
const abilitySetCache = new Map<string, string[]>();
const moveSetCache = new Map<string, string[]>();

// Dedupe per-formatId silent-fallback warnings so a permissive build for one
// format only logs once instead of on every searchSpecies call.
const warnedLegalMovesUnavailable = new Set<string>();
const warnedLegalSpeciesUnavailable = new Set<string>();
const warnedMissingFromDex = new Set<string>();

/**
 * Evict the species-search index cache and every cache derived from it.
 *
 * Clears:
 *   - The role-aware index cache (`speciesIndexByResolver` — reassigned, not
 *     mutated, since WeakMap has no `.clear()`) and the no-roles index cache
 *     (`speciesIndexCacheNoRoles`)
 *   - The format-wide enumerator caches (`abilitySetCache`, `moveSetCache`)
 *     declared further down — those derive their arrays from the index, so
 *     leaving them in place would silently serve stale data after a refresh.
 *   - The per-species lowercased legal-moves cache used by free-text search
 *     and the structured `moves` filter — same staleness concern.
 *   - The fallback-warning dedupe sets so warnings can re-fire after a reset
 *     (important when tests intentionally trigger the same fallback path).
 *
 * Useful in tests and when an upstream dataset (e.g. `getRolesForSpecies`'s
 * registry) has been mutated and callers need a clean read.
 */
export function clearSpeciesSearchIndexCache(): void {
  speciesIndexByResolver = new WeakMap();
  speciesIndexCacheNoRoles.clear();
  abilitySetCache.clear();
  moveSetCache.clear();
  lowercaseLegalMovesCache.clear();
  warnedLegalMovesUnavailable.clear();
  warnedLegalSpeciesUnavailable.clear();
  warnedMissingFromDex.clear();
}

export function buildSpeciesSearchIndex(
  formatId: string,
  getRoles?: GetRolesFn
): SpeciesSearchEntry[] {
  // Look up the per-format submap for this resolver (or the no-roles map),
  // creating the resolver entry on miss. Read happens before the build so a
  // cache hit returns immediately without any work.
  let cache: Map<string, SpeciesSearchEntry[]>;
  if (getRoles) {
    let perFormat = speciesIndexByResolver.get(getRoles);
    if (!perFormat) {
      perFormat = new Map();
      speciesIndexByResolver.set(getRoles, perFormat);
    }
    cache = perFormat;
  } else {
    cache = speciesIndexCacheNoRoles;
  }
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
  if (
    staticLegalRaw === LEGALITY_UNAVAILABLE &&
    !warnedLegalSpeciesUnavailable.has(formatId)
  ) {
    warnedLegalSpeciesUnavailable.add(formatId);
    console.warn(
      `[species-search] Legal species unavailable for format "${formatId}" — falling back to all dex species.`
    );
  }
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
      if (!rawSpecies?.exists) {
        const dedupeKey = `${formatId}::${speciesName}`;
        if (!warnedMissingFromDex.has(dedupeKey)) {
          warnedMissingFromDex.add(dedupeKey);
          console.warn(
            `[species-search] Species "${speciesName}" listed in legal set but missing from raw dex (format "${formatId}").`
          );
        }
        continue;
      }

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
 * - `moves`: species must legally learn ALL specified moves (AND logic) — uses
 *    `getLegalMoves(species, formatId)` for actual learnset validation. Skipped
 *    permissively when `options.formatId` is omitted (no learnset data without
 *    a format) or when the format's legality is unavailable.
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
  index: readonly SpeciesSearchEntry[],
  query: string,
  options?: {
    /** Filter: species must have ALL of these types (AND logic). */
    types?: readonly string[];
    /** Filter: species must have at least one of these abilities */
    abilities?: readonly string[];
    /**
     * Filter: species must legally learn ALL of these moves (AND logic).
     * Format-aware via `getLegalMoves(species, formatId)`. Skipped
     * permissively when `formatId` is omitted or legality is unavailable —
     * a deprecated permissive fallback would silently match every species.
     */
    moves?: readonly string[];
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
    /** Filter: species must carry ALL of these role IDs (AND logic). */
    roles?: readonly string[];
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
    // Format-aware: validates against `getLegalMoves(species, formatId)` via
    // the lowercase cache. The picker always passes `formatId` in production.
    //
    // Without `formatId` we cannot check actual learnsets — `getLearnableMoves`
    // is deprecated and returns the entire gen-9 move pool for any valid
    // species, which would silently match every species and give the user a
    // broken filter. Skipping the filter here is the honest choice: a
    // formatId-less caller gets every species, not a misleading "all match".
    if (normalizedMoves && queryFormatId) {
      const legalMoves = getLowercaseLegalMoves(entry.species, queryFormatId);
      // legalMoves === undefined means legality is unavailable for this format
      // (LEGALITY_UNAVAILABLE upstream) — fall back to permissive (filter
      // skipped for this entry) so a transient sim hiccup doesn't blank the
      // picker. The console.warn inside getLowercaseLegalMoves already
      // surfaces the fallback once per format.
      if (legalMoves) {
        const learnsAllMoves = normalizedMoves.every((move) =>
          legalMoves.includes(move)
        );
        if (!learnsAllMoves) return false;
      }
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

// Note: `abilitySetCache` / `moveSetCache` are declared near the other module
// caches (above) so `clearSpeciesSearchIndexCache` can evict them. Keep the
// declarations there.

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
 *
 * Two fallback cases, kept distinct on purpose:
 *   - `undefined` (format not registered): expand to `getLearnableMoves(species)`
 *     since there's no legality data to enforce.
 *   - `LEGALITY_UNAVAILABLE` (validator threw): warn once per format and still
 *     expand permissively for that species, so a transient validator hiccup
 *     can't drop the whole format's enumerator. Without the per-format warn,
 *     a stuck validator silently inflates this list to the full gen move pool.
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
    const result = getLegalMoves(entry.species, formatId);
    if (result === LEGALITY_UNAVAILABLE) {
      // Validator threw for this species — keep building permissively so one
      // bad species can't drop the whole format's enumerator, but warn once
      // per format so a stuck validator doesn't silently inflate the cached
      // result to the full gen move pool.
      if (!warnedLegalMovesUnavailable.has(formatId)) {
        warnedLegalMovesUnavailable.add(formatId);
        console.warn(
          `[species-search] Legal moves unavailable for format "${formatId}" — getAllLegalMoves falling back to full learnable-move pool for affected species.`
        );
      }
      for (const m of getLearnableMoves(entry.species)) set.add(m);
      continue;
    }
    const moves = result ?? new Set(getLearnableMoves(entry.species));
    for (const m of moves) set.add(m);
  }
  const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
  moveSetCache.set(formatId, sorted);
  return sorted;
}
