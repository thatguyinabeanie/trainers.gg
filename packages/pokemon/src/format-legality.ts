/**
 * Format species legality.
 *
 * - Champions: VGC 2026 Reg M-A uses a static port of NCP VGC Damage
 *   Calculator's POKEDEX_CHAMPIONS list (pokedex.js lines 18378–18409,
 *   captured 2026-04-14), because Champions' synthetic-mega + Stat Points
 *   ruleset isn't expressible via @pkmn/sim's gen-9 format definitions.
 * - Other formats will be resolved via @pkmn/sim in Task 2.
 *
 * Return-shape contract for `getLegal*`:
 *   - `ReadonlySet<string>` — the legal set (caller checks `.has(value)`)
 *   - `undefined` — format not registered; legitimately "we don't know
 *     the rules." Read-path callers (pickers / autocomplete) and gate-path
 *     callers (team submission / import) all treat this as permissive.
 *   - `LEGALITY_UNAVAILABLE` (Symbol) — format IS registered but the
 *     `@pkmn/sim` validator threw mid-iteration. Read-path callers stay
 *     permissive (don't break the UI on transient sim hiccups). Gate-path
 *     callers MUST fail closed — better to surface "legality check
 *     unavailable, please retry" than silently approve a possibly-illegal
 *     team.
 */

import { logError } from "@trainers/utils";

import {
  type ChampionsRegBundle,
  type MegaSpeciesWithAbilityFromBundle,
  type MegaSpeciesWithStoneFromBundle,
  REG_MA_BUNDLE,
} from "./champions-reg-ma";
import {
  type MegaSpeciesWithAbilityFromMBBundle,
  type MegaSpeciesWithStoneFromMBBundle,
  REG_MB_BUNDLE,
} from "./champions-reg-mb";

/**
 * Sentinel returned by `getLegal*` when the underlying validator threw
 * mid-iteration — distinct from `undefined` (format not registered) so
 * gate-path callers can fail closed without breaking pickers.
 *
 * Exported as a Symbol with a stable description so tests / debuggers can
 * recognise it and so it can never collide with a hypothetical legal-set
 * value of "legality-unavailable".
 */
export const LEGALITY_UNAVAILABLE: unique symbol = Symbol(
  "legality-unavailable"
);

/**
 * Return type for the family of `getLegal*` lookups. See the file header
 * for how each branch should be handled by read- vs gate-path callers.
 */
export type LegalityResult =
  | ReadonlySet<string>
  | undefined
  | typeof LEGALITY_UNAVAILABLE;

/**
 * Helper for read-path callers (pickers, autocomplete, format guards).
 * Collapses both "format not registered" (`undefined`) and "validator
 * threw" (`LEGALITY_UNAVAILABLE`) into a single permissive `undefined`,
 * so the call site can keep the simple "use the set if we have one,
 * otherwise allow anything" branching.
 *
 * Gate-path callers (team submission, import) should NOT use this — they
 * need the distinction so they can fail closed on the sentinel.
 */
export function legalSetOrPermissive(
  result: LegalityResult
): ReadonlySet<string> | undefined {
  if (result === undefined || result === LEGALITY_UNAVAILABLE) return undefined;
  return result;
}

// =============================================================================
// Format ID Constants
// =============================================================================

/** Format ID for Champions VGC 2026 Regulation M-A. */
export const CHAMPIONS_MA_FORMAT_ID = "gen9championsvgc2026regma";

/** Format ID for Champions VGC 2026 Regulation M-B. */
export const CHAMPIONS_MB_FORMAT_ID = "gen9championsvgc2026regmb";

// =============================================================================
// Champions format registry
// =============================================================================

/**
 * Registry mapping Champions format IDs to their legality bundles.
 * Adding a new Champions regulation requires only: (1) a new bundle file
 * (parallel to champions-reg-ma.ts), and (2) a new entry here.
 *
 * Stored as a Map (not a plain Record) to prevent prototype-key collisions —
 * a formatId like "constructor" or "toString" would resolve an inherited
 * Object.prototype member and be mis-treated as a registered bundle.
 */
const CHAMPIONS_LEGALITY_BY_ID = new Map<string, ChampionsRegBundle>([
  [CHAMPIONS_MA_FORMAT_ID, REG_MA_BUNDLE],
  [CHAMPIONS_MB_FORMAT_ID, REG_MB_BUNDLE],
]);

// =============================================================================
// @pkmn/sim-backed legality
// =============================================================================

import { Dex as SimDex, TeamValidator } from "@pkmn/sim";
import type { PokemonSet, Species } from "@pkmn/sim";
import { buildVgcShowdownNameMap } from "./formats";

/**
 * Map our format IDs to the Showdown format display name that
 * `@pkmn/sim` registers. VGC entries are derived from the VGC_FORMATS
 * registry (filtered to sim-supported formats). Formats not listed here
 * fall back to `undefined` (permissive) until someone adds them.
 */
const SIM_FORMAT_NAME_BY_ID: Record<string, string> = {
  // VGC formats — sourced from VGC_FORMATS registry (excludes gen-10 Champions)
  ...buildVgcShowdownNameMap(),

  // Smogon Singles
  gen9ou: "[Gen 9] OU",
  gen9uu: "[Gen 9] UU",
  gen9ru: "[Gen 9] RU",
  gen9nu: "[Gen 9] NU",
  gen9pu: "[Gen 9] PU",
  gen9lc: "[Gen 9] LC",
  gen9monotype: "[Gen 9] Monotype",
  gen9anythinggoes: "[Gen 9] Anything Goes",
  gen9ubers: "[Gen 9] Ubers",
};

// Module-level cache — computed once per process (worker) lifetime.
// First call per format iterates ~900 gen-9 species through the validator
// (~100ms); subsequent calls are synchronous.
const simSetCache = new Map<string, ReadonlySet<string>>();

/**
 * Build a minimal valid-looking PokemonSet for a species. Used as a
 * probe for `TeamValidator.validateSet` — only the species matters for
 * the species-legality check; other fields are filled with safe defaults.
 *
 * We use "Protect" as the probe move because it is learnable by virtually
 * all pokemon in Gen 9 via TM, avoiding false-negative move-legality errors.
 * A single HP EV avoids the "0 EVs" validator warning.
 */
function probeSet(species: Species): PokemonSet {
  return {
    name: species.name,
    species: species.name,
    // Use a required item when the form enforces one (e.g. Ogerpon-Wellspring
    // needs Wellspring Mask). Probing with "" causes a false species-ban.
    item: species.requiredItems?.[0] ?? species.requiredItem ?? "",
    ability: species.abilities[0] ?? species.abilities.H ?? "No Ability",
    moves: ["Protect"],
    nature: "Hardy",
    gender: "",
    evs: { hp: 1, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    level: 50,
    shiny: false,
  };
}

/**
 * Compute the legal-species set for a format registered in @pkmn/sim.
 * Iterates the gen-9 species table and filters via TeamValidator.
 *
 * Issues that are purely move-legality errors (e.g. "can't learn X") are
 * excluded from the species-ban check — only species-level bans (Mythical,
 * Min Source Gen, etc.) cause a species to be excluded from the result set.
 *
 * Returns the set of _individually_-legal species. Team-composition rules
 * like "Limit 2 Restricted" (Reg I) are NOT enforced here — `teamHas` is
 * `{}` so the validator only sees a single-species probe. A species that
 * can appear as 1 of 6 on a valid team will be marked legal.
 *
 * Nonstandard filter: species with `isNonstandard === "Unobtainable"` are
 * kept (legacy/transfer-only Pokémon that still see competitive use);
 * other nonstandard values ("Future", "LGPE", "Gigantamax", "Past",
 * "CAP", "Custom") are excluded.
 */
function computeLegalSpeciesFromSim(formatId: string): LegalityResult {
  const cached = simSetCache.get(formatId);
  if (cached) return cached;

  const simName = SIM_FORMAT_NAME_BY_ID[formatId];
  if (!simName) return undefined;

  const format = SimDex.formats.get(simName);
  if (!format?.exists) return undefined;

  const validator = new TeamValidator(format, SimDex);
  const gen = SimDex.forGen(9);
  const legal = new Set<string>();

  try {
    for (const species of gen.species.all()) {
      if (!species.exists) continue;
      if (species.isNonstandard && species.isNonstandard !== "Unobtainable") {
        continue;
      }
      const issues = validator.validateSet(probeSet(species), {});
      if (issues === null) {
        legal.add(species.name);
        continue;
      }
      // Accept species whose only issues are move-legality errors — those
      // stem from our probe move choice, not a species-level ban.
      const speciesIssues = issues.filter(
        (issue) =>
          !issue.includes("can't learn") &&
          !issue.includes("can not learn") &&
          !issue.includes("EVs") &&
          !issue.includes("moves")
      );
      if (speciesIssues.length === 0) {
        legal.add(species.name);
      }
    }
  } catch (error) {
    logError("format-legality.computeSpecies", error, { formatId });
    // Validator threw — surface via the sentinel so gate-path callers can
    // fail closed. Read-path callers stay permissive. Don't cache the
    // error result so a transient sim hiccup doesn't poison the lookup.
    return LEGALITY_UNAVAILABLE;
  }

  simSetCache.set(formatId, legal);
  return legal;
}

// =============================================================================
// Mega stone / ability maps (composed from all registered bundles)
// =============================================================================

/**
 * All mega species that appear in `MEGA_SPECIES_TO_STONE`.
 * Re-exported under the original public name for backward compatibility.
 */
export type MegaSpeciesWithStone =
  | MegaSpeciesWithStoneFromBundle
  | MegaSpeciesWithStoneFromMBBundle;

/**
 * All mega species the calculator knows a post-evolution ability for.
 * Strictly broader than `MegaSpeciesWithStone` (e.g. Rayquaza-Mega gates
 * on Dragon Ascent rather than a stone item, so it appears here only).
 * Re-exported under the original public name for backward compatibility.
 */
export type MegaSpeciesWithAbility =
  | MegaSpeciesWithAbilityFromBundle
  | MegaSpeciesWithAbilityFromMBBundle;

/**
 * All registered Champions bundles, in order. When composing global mega maps,
 * later bundles (M-B) override earlier ones (M-A) for any duplicate keys — but
 * in practice the same mega never appears in two bundles with different data.
 * M-B's stone/ability arrays already include all M-A entries (via spread).
 */
const ALL_CHAMPIONS_BUNDLES: readonly ChampionsRegBundle[] = [
  REG_MA_BUNDLE,
  REG_MB_BUNDLE,
];

/**
 * Maps mega species names to their required mega stone.
 * Composed from ALL registered bundles — M-B is a superset of M-A so its
 * megaStones array already covers both regulations.
 */
const MEGA_SPECIES_TO_STONE: ReadonlyMap<string, string> = new Map(
  ALL_CHAMPIONS_BUNDLES.flatMap((b) => b.megaStones)
);

/**
 * Runtime guard: is `species` one of the known mega forms with a mega
 * stone? Drives picker UI and the team-builder mega toggle.
 */
export function isMegaSpeciesWithStone(
  species: string | null | undefined
): species is MegaSpeciesWithStone {
  return species != null && MEGA_SPECIES_TO_STONE.has(species);
}

/**
 * Maps mega species → post-evolution ability.
 * Composed from ALL registered bundles.
 */
const MEGA_SPECIES_TO_ABILITY: ReadonlyMap<string, string> = new Map(
  ALL_CHAMPIONS_BUNDLES.flatMap((b) => b.megaAbilities)
);

/** Runtime guard: does the calculator know a mega ability for `species`? */
export function isMegaSpeciesWithAbility(
  species: string | null | undefined
): species is MegaSpeciesWithAbility {
  return species != null && MEGA_SPECIES_TO_ABILITY.has(species);
}

// Module-level cache — computed once per process (worker) lifetime, mirroring
// `simSetCache` for species. First call per format probes ~250 gen-9 items
// through the validator; subsequent calls are synchronous.
const simItemCache = new Map<string, ReadonlySet<string>>();

/**
 * Compute the legal-item set for a format registered in @pkmn/sim.
 * Iterates the gen-9 item table and probes each via TeamValidator.checkItem,
 * which returns:
 *   - `null`           — no rule matched (legal)
 *   - `""` (empty)     — whitelist rule matched (legal)
 *   - non-empty string — banned (illegal)
 *
 * Pikachu is the probe species: unbanned in every supported format and
 * subject to no item-specific restrictions, so its checkItem result reflects
 * format-level rules only.
 *
 * Nonstandard filter: items with `isNonstandard === "Unobtainable"` are kept
 * (legacy/transfer-only items that still see competitive use); other
 * nonstandard values ("Future", "LGPE", "Past", "CAP", "Custom") are excluded
 * — same convention as the species path.
 */
function computeLegalItemsFromSim(formatId: string): LegalityResult {
  const cached = simItemCache.get(formatId);
  if (cached) return cached;

  const simName = SIM_FORMAT_NAME_BY_ID[formatId];
  if (!simName) return undefined;

  const format = SimDex.formats.get(simName);
  if (!format?.exists) return undefined;

  const validator = new TeamValidator(format, SimDex);
  const gen = SimDex.forGen(9);

  // Use a known-legal species as the probe base. Pikachu is unbanned in
  // every format we target and has no item restriction that could skew
  // the result.
  const probeSpecies = gen.species.get("Pikachu");
  if (!probeSpecies?.exists) return undefined;
  const baseSet = probeSet(probeSpecies);

  const legal = new Set<string>();

  try {
    for (const item of gen.items.all()) {
      if (!item.exists) continue;
      if (item.isNonstandard && item.isNonstandard !== "Unobtainable") {
        continue;
      }
      const issue = validator.checkItem(
        { ...baseSet, item: item.name },
        item,
        {}
      );
      // checkItem returns null for unmatched rules (legal), '' for a
      // whitelist match (legal), or a non-empty string for a ban (illegal).
      if (issue === null || issue === "") legal.add(item.name);
    }
  } catch (error) {
    logError("format-legality.computeItems", error, { formatId });
    // Validator threw — surface via the sentinel so gate-path callers can
    // fail closed. Read-path callers stay permissive. Don't cache the
    // error result so a transient sim hiccup doesn't poison the lookup.
    return LEGALITY_UNAVAILABLE;
  }

  simItemCache.set(formatId, legal);
  return legal;
}

// =============================================================================
// Moves
// =============================================================================

// Cache key: `${species}::${formatId}`. Iterating the full move list per
// species is expensive (~800 moves per call); cache on first request per
// combination.
const simMoveCache = new Map<string, ReadonlySet<string>>();

/**
 * Compute the legal-move set for a species in a format registered in
 * @pkmn/sim. Uses `TeamValidator.checkCanLearn` which is purely
 * learnset-based (format-level move bans like OU's Shed Tail ban are
 * NOT reflected — `checkCanLearn` returns null as long as the species
 * can learn the move via any legal source).
 *
 * Nonstandard filter: moves with `isNonstandard !== null` are skipped
 * unless the value is `"Unobtainable"` (legacy/transfer-only moves
 * that still see competitive use).
 */
function computeLegalMovesFromSim(
  species: string,
  formatId: string
): LegalityResult {
  const cacheKey = `${species}::${formatId}`;
  const cached = simMoveCache.get(cacheKey);
  if (cached) return cached;

  const simName = SIM_FORMAT_NAME_BY_ID[formatId];
  if (!simName) return undefined;

  const format = SimDex.formats.get(simName);
  if (!format?.exists) return undefined;

  const gen = SimDex.forGen(9);
  const speciesObj = gen.species.get(species);
  if (!speciesObj?.exists) return undefined;

  const validator = new TeamValidator(format, SimDex);
  const legal = new Set<string>();

  try {
    for (const move of gen.moves.all()) {
      if (!move.exists) continue;
      if (move.isNonstandard && move.isNonstandard !== "Unobtainable") continue;

      const issues = validator.checkCanLearn(move, speciesObj);
      if (issues === null) legal.add(move.name);
    }
  } catch (error) {
    logError("format-legality.computeMoves", error, { species, formatId });
    // Validator threw — surface via the sentinel so gate-path callers can
    // fail closed. Read-path callers stay permissive. Don't cache the
    // error result so a transient sim hiccup doesn't poison the lookup.
    return LEGALITY_UNAVAILABLE;
  }

  simMoveCache.set(cacheKey, legal);
  return legal;
}

// Champions move cache: outer key = bundle identity (WeakMap), inner key = species.
// Using a WeakMap ensures different regulation bundles never share cached results —
// previously a single Map keyed by species would return M-A results for M-B
// queries (or vice versa) if both bundles share a species.
const championsMoveCache = new WeakMap<
  ChampionsRegBundle,
  Map<string, ReadonlySet<string>>
>();

/**
 * Some Champions-exclusive megas derive from a base form whose canonical
 * name in @pkmn/sim differs from the mega's name minus "-Mega". We redirect
 * the learnset lookup to the correct base so moves like Light of Ruin (which
 * belongs to Floette-Eternal, not regular Floette) are recognized as legal.
 */
const CHAMPIONS_MEGA_LEARNSET_BASE: Readonly<Record<string, string>> = {
  "Floette-Mega": "Floette-Eternal",
};

/**
 * Compute the legal-move set for a Champions species using the given regulation bundle.
 *
 * All Champions-roster species exist in the gen-9 pokedex (including
 * Hisui/Paldea/Galar regional forms), so `checkCanLearn` works against
 * gen-9 sim data.
 *
 * Uses Anything Goes as the base validator — it has an empty banlist,
 * so `checkCanLearn` operates purely on learnset data with no format-
 * level move bans leaking through. Champions-specific bans are applied
 * on top via the bundle's moveBanlist.
 */
function computeLegalMovesForChampions(
  species: string,
  bundle: ChampionsRegBundle
): LegalityResult {
  // Two-level cache: bundle identity (WeakMap) → species (Map).
  // This prevents a species shared between M-A and M-B from receiving the
  // wrong cached set when the two bundles differ in moveBanlist.
  let bundleMoveCache = championsMoveCache.get(bundle);
  if (!bundleMoveCache) {
    bundleMoveCache = new Map();
    championsMoveCache.set(bundle, bundleMoveCache);
  }
  const cached = bundleMoveCache.get(species);
  if (cached) return cached;

  // For mega species, look up learnset from the base form.
  // Special cases (e.g. Floette-Mega → Floette-Eternal) override the default.
  const lookupSpecies =
    CHAMPIONS_MEGA_LEARNSET_BASE[species] ??
    (MEGA_SPECIES_TO_STONE.has(species)
      ? getCanonicalBaseSpecies(species)
      : species);

  const gen = SimDex.forGen(9);
  const speciesObj = gen.species.get(lookupSpecies);
  if (!speciesObj?.exists) return undefined;

  // Use AG as a permissive base validator — empty banlist, purely
  // learnset-based checkCanLearn with no format-specific restrictions.
  // Champions includes transfer Pokémon (e.g. Aerodactyl, Metagross) that
  // aren't natively in the Gen 9 Paldea dex. "Min Source Gen = 9" would
  // incorrectly reject moves these mons learn via older-gen TMs/tutors that
  // are valid in Gen 9. No Min Source Gen restriction is applied — the Gen 9
  // learnset data + bundle.moveBanlist is the source of truth.
  const format = SimDex.formats.get("[Gen 9] Anything Goes");
  if (!format?.exists) return undefined;
  const validator = new TeamValidator(format, SimDex);

  const legal = new Set<string>();

  try {
    for (const move of gen.moves.all()) {
      if (!move.exists) continue;
      if (move.isNonstandard && move.isNonstandard !== "Unobtainable") continue;
      if (bundle.moveBanlist.has(move.name)) continue;
      if (validator.checkCanLearn(move, speciesObj) === null) {
        legal.add(move.name);
      }
    }
  } catch (error) {
    logError("format-legality.computeChampionsMoves", error, { species });
    // Validator threw — surface via the sentinel so gate-path callers can
    // fail closed. Read-path callers stay permissive. Don't cache the
    // error result so a transient sim hiccup doesn't poison the lookup.
    return LEGALITY_UNAVAILABLE;
  }

  // Append per-species overrides — moves that @pkmn/sim can't derive from
  // Gen 9 learnsets (e.g. Past-tagged moves like Light of Ruin).
  const overrides = bundle.moveOverrides.get(species);
  if (overrides) {
    for (const moveName of overrides) {
      legal.add(moveName);
    }
  }

  bundleMoveCache.set(species, legal);
  return legal;
}

// =============================================================================
// Abilities
// =============================================================================

// Cache key: `${species}::${formatId}`. Species have 1-3 abilities; cache on
// first request per combination.
const simAbilityCache = new Map<string, ReadonlySet<string>>();

/**
 * Extract the ability names from a Species object's `abilities` record.
 * The record may contain keys like `0`, `1`, `H` (Hidden), `S` (Special).
 */
function speciesAbilityNames(speciesObj: Species): string[] {
  return Object.values(speciesObj.abilities ?? {}).filter(Boolean) as string[];
}

/**
 * Compute the legal-ability set for a species in a format registered in
 * @pkmn/sim. For each of the species' 1-3 abilities, probes via
 * `TeamValidator.checkAbility` which returns:
 *   - `null`           — no rule matched (legal)
 *   - `""` (empty)     — whitelist rule matched (legal)
 *   - non-empty string — banned (illegal)
 *
 * This catches format-level ability bans (e.g. "Moody" banned in Gen 9 OU)
 * while naturally restricting to only the species' own abilities.
 */
function computeLegalAbilitiesFromSim(
  species: string,
  formatId: string
): LegalityResult {
  const cacheKey = `${species}::${formatId}`;
  const cached = simAbilityCache.get(cacheKey);
  if (cached) return cached;

  const simName = SIM_FORMAT_NAME_BY_ID[formatId];
  if (!simName) return undefined;

  const format = SimDex.formats.get(simName);
  if (!format?.exists) return undefined;

  const gen = SimDex.forGen(9);
  const speciesObj = gen.species.get(species);
  if (!speciesObj?.exists) return undefined;

  const validator = new TeamValidator(format, SimDex);
  const legal = new Set<string>();

  try {
    for (const name of speciesAbilityNames(speciesObj)) {
      const ability = gen.abilities.get(name);
      if (!ability?.exists) continue;
      const baseSet = probeSet(speciesObj);
      const issue = validator.checkAbility(
        { ...baseSet, ability: ability.name },
        ability,
        {}
      );
      // checkAbility returns null for unmatched rules (legal), '' for a
      // whitelist match (legal), or a non-empty string for a ban (illegal).
      if (issue === null || issue === "") legal.add(ability.name);
    }
  } catch (error) {
    logError("format-legality.computeAbilities", error, { species, formatId });
    // Validator threw — surface via the sentinel so gate-path callers can
    // fail closed. Read-path callers stay permissive. Don't cache the
    // error result so a transient sim hiccup doesn't poison the lookup.
    return LEGALITY_UNAVAILABLE;
  }

  simAbilityCache.set(cacheKey, legal);
  return legal;
}

/**
 * Champions ability cache: outer key = bundle identity (WeakMap), inner key = species.
 * Mirrors the move cache fix — different bundles may have different abilityBanlist
 * values, so keying by species alone would return stale results across bundles.
 */
const championsAbilityCache = new WeakMap<
  ChampionsRegBundle,
  Map<string, ReadonlySet<string>>
>();

/**
 * Compute the legal-ability set for a Champions species.
 * Returns the species' own abilities filtered through the bundle's ability
 * banlist (currently empty for all regulations — all abilities legal).
 */
function computeLegalAbilitiesForChampions(
  species: string,
  bundle: ChampionsRegBundle
): LegalityResult {
  // Two-level cache: bundle identity (WeakMap) → species (Map).
  let bundleAbilityCache = championsAbilityCache.get(bundle);
  if (!bundleAbilityCache) {
    bundleAbilityCache = new Map();
    championsAbilityCache.set(bundle, bundleAbilityCache);
  }
  const cached = bundleAbilityCache.get(species);
  if (cached) return cached;

  const gen = SimDex.forGen(9);
  const speciesObj = gen.species.get(species);
  if (!speciesObj?.exists) return undefined;
  const legal: ReadonlySet<string> = new Set(
    speciesAbilityNames(speciesObj).filter(
      (name) => !bundle.abilityBanlist.has(name)
    )
  );
  bundleAbilityCache.set(species, legal);
  return legal;
}

// =============================================================================
// Tera Types
// =============================================================================

/** All 18 standard Tera types. */
const ALL_TERA_TYPES: readonly string[] = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
];

/** Cached empty tera set for Champions format (no Terastallization). */
const EMPTY_TERA_SET: ReadonlySet<string> = new Set();

/** Cached full tera types set for standard formats. */
const ALL_TERA_SET: ReadonlySet<string> = new Set(ALL_TERA_TYPES);

/**
 * Check whether a format's ruleset includes the Terastal Clause, which
 * bans Terastallization entirely. Formats like [Gen 9] Monotype use this.
 */
function formatUsesTerastalClause(formatId: string): boolean {
  const simName = SIM_FORMAT_NAME_BY_ID[formatId];
  if (!simName) return false;
  const format = SimDex.formats.get(simName);
  if (!format?.exists) return false;
  // The @pkmn/sim TS types don't expose `ruleset` directly — access via
  // unknown cast with type narrowing per project code-style rules.
  const ruleset = (format as unknown as { ruleset?: string[] }).ruleset;
  return ruleset?.some((r: string) => r === "Terastal Clause") ?? false;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Returns the set of species legal in the given format, or `undefined`
 * if legality cannot be determined (treat as permissive).
 */
export function getLegalSpecies(formatId: string): LegalityResult {
  const bundle = CHAMPIONS_LEGALITY_BY_ID.get(formatId);
  if (bundle) return bundle.legalSpecies;
  return computeLegalSpeciesFromSim(formatId);
}

/**
 * True when `species` is legal in `formatId`. Returns true for any
 * format without computable legality (permissive default).
 */
export function isLegalSpecies(species: string, formatId: string): boolean {
  const legal = getLegalSpecies(formatId);
  // Permissive on unknown format (undefined) AND on validator-threw
  // sentinel — read-path callers don't break the UI on transient sim
  // errors. Gate-path callers must check the sentinel themselves before
  // calling this helper.
  if (legal === undefined || legal === LEGALITY_UNAVAILABLE) return true;
  return legal.has(species);
}

/**
 * Returns the set of held items legal in the given format, or `undefined`
 * if legality cannot be determined (treat as permissive — caller allows
 * any item).
 */
export function getLegalItems(formatId: string): LegalityResult {
  const bundle = CHAMPIONS_LEGALITY_BY_ID.get(formatId);
  if (bundle) return bundle.legalItems;
  return computeLegalItemsFromSim(formatId);
}

/**
 * True when `item` is legal in `formatId`. Returns true for the empty
 * string (no held item is always legal) and for any format without
 * computable legality (permissive default).
 */
export function isLegalItem(item: string, formatId: string): boolean {
  if (!item) return true;
  const legal = getLegalItems(formatId);
  if (legal === undefined || legal === LEGALITY_UNAVAILABLE) return true;
  return legal.has(item);
}

/**
 * Returns the set of moves that `species` can legally use in `formatId`,
 * or `undefined` if legality cannot be determined (treat as permissive).
 *
 * First call per (species, format) pair is expensive (~800 moves iterated
 * through `TeamValidator.checkCanLearn`); subsequent calls return a
 * cached `ReadonlySet`.
 */
export function getLegalMoves(
  species: string,
  formatId: string
): LegalityResult {
  const bundle = CHAMPIONS_LEGALITY_BY_ID.get(formatId);
  if (bundle) return computeLegalMovesForChampions(species, bundle);
  return computeLegalMovesFromSim(species, formatId);
}

/**
 * True when `move` is legal for `species` in `formatId`. Returns true
 * for the empty string (no move is always legal) and for any format
 * without computable legality (permissive default).
 */
export function isLegalMove(
  move: string,
  species: string,
  formatId: string
): boolean {
  if (!move) return true;
  const legal = getLegalMoves(species, formatId);
  if (legal === undefined || legal === LEGALITY_UNAVAILABLE) return true;
  return legal.has(move);
}

/**
 * Returns the set of abilities legal for `species` in `formatId`, or
 * `undefined` if legality cannot be determined (treat as permissive).
 *
 * Abilities are scoped to the species (1-3 abilities) AND the format
 * (format-level ability bans like "Moody" in Gen 9 OU).
 */
export function getLegalAbilities(
  species: string,
  formatId: string
): LegalityResult {
  const bundle = CHAMPIONS_LEGALITY_BY_ID.get(formatId);
  if (bundle) return computeLegalAbilitiesForChampions(species, bundle);
  return computeLegalAbilitiesFromSim(species, formatId);
}

/**
 * True when `ability` is legal for `species` in `formatId`. Returns true
 * for the empty string (no ability is always legal) and for any format
 * without computable legality (permissive default).
 *
 * Mega forms are normalized to their base species before the lookup —
 * tournament submissions store the pre-mega base ability (e.g. Charizard
 * with Solar Power that becomes Drought on mega-evolve), so the stored
 * value must be validated against the base form's ability pool, not the
 * mega's intrinsic ability.
 */
export function isLegalAbility(
  ability: string,
  species: string,
  formatId: string
): boolean {
  if (!ability) return true;
  const lookupSpecies = MEGA_SPECIES_TO_STONE.has(species)
    ? getCanonicalBaseSpecies(species)
    : species;
  const legal = getLegalAbilities(lookupSpecies, formatId);
  if (legal === undefined || legal === LEGALITY_UNAVAILABLE) return true;
  return legal.has(ability);
}

/**
 * Returns the set of Tera types legal in the given format, or `undefined`
 * if legality cannot be determined (treat as permissive).
 *
 * - Champions: VGC 2026 Reg M-A → empty set (no Tera — only Mega Evolutions).
 * - Formats with Terastal Clause (e.g. Monotype) → empty set.
 * - Other registered sim formats → all 18 standard types.
 * - Unknown formats → `undefined` (permissive).
 */
export function getLegalTeraTypes(formatId: string): LegalityResult {
  // Champions formats have no Tera — only Mega Evolutions.
  if (CHAMPIONS_LEGALITY_BY_ID.has(formatId)) {
    return EMPTY_TERA_SET;
  }
  // Unknown / unregistered formats → permissive.
  if (!SIM_FORMAT_NAME_BY_ID[formatId]) return undefined;
  // Formats that explicitly ban Terastallization → empty set.
  if (formatUsesTerastalClause(formatId)) return EMPTY_TERA_SET;
  // All other registered formats → full 18-type set.
  return ALL_TERA_SET;
}

/**
 * True when `type` is a legal Tera type in `formatId`. Returns true for
 * the empty string (no Tera is always legal) and for any format without
 * computable legality (permissive default).
 */
export function isLegalTeraType(type: string, formatId: string): boolean {
  if (!type) return true;
  const legal = getLegalTeraTypes(formatId);
  if (legal === undefined || legal === LEGALITY_UNAVAILABLE) return true;
  return legal.has(type);
}

/**
 * Returns the mega stone required for the given mega species in Champions M-A,
 * or null if the species is not a mega form.
 */
export function getMegaStoneForSpecies(species: string): string | null {
  return MEGA_SPECIES_TO_STONE.get(species) ?? null;
}

/**
 * Map of mega species → the ability that activates after mega evolution.
 *
 * The team sheet stores the base form's ability (what's submitted at
 * registration); this map lets the damage calculator override that with
 * the post-evolution ability when computing damage. Keep in sync with the
 * @smogon/calc species data (calc/src/data/species.ts) — each mega's
 * `abilities[0]` field is the source of truth.
 */
export function getMegaAbilityForSpecies(species: string): string | null {
  return MEGA_SPECIES_TO_ABILITY.get(species) ?? null;
}

/**
 * Reverse lookup: given a base species + held item, return the mega species
 * name if the item is its mega stone. Returns null otherwise.
 *
 * Example: getMegaSpeciesForBaseAndItem("Floette-Eternal", "Floettite") → "Floette-Mega"
 *          getMegaSpeciesForBaseAndItem("Charizard", "Charizardite Y") → "Charizard-Mega-Y"
 */
const STONE_TO_MEGA: ReadonlyMap<string, string> = new Map(
  ALL_CHAMPIONS_BUNDLES.flatMap((b) =>
    b.megaStones.map(([mega, stone]) => [stone, mega] as const)
  )
);

export function getMegaSpeciesForBaseAndItem(
  species: string,
  item: string
): string | null {
  if (!species || !item) return null;
  const megaSpecies = STONE_TO_MEGA.get(item);
  if (!megaSpecies) return null;
  // Verify the mega's base form matches the given species
  if (getCanonicalBaseSpecies(megaSpecies) === species) return megaSpecies;
  return null;
}

// =============================================================================
// Form switching
// =============================================================================

/**
 * Map of base-species name → list of every form in display order. Each entry
 * starts with the canonical base form so UI defaults to "regular" when
 * resolving from a mega/alt form back to the picker.
 *
 * Includes: regular, all megas (gen 6/7 + Champions-exclusive), Eternal/AZ
 * Floette, Aegislash-Blade, Wishiwashi-School, Greninja-Ash, Mimikyu-Busted,
 * Eternatus-Eternamax (where applicable). Regional forms (Vulpix-Alola,
 * etc.) are intentionally excluded — they're separate species, not mode
 * toggles for the same Pokemon.
 */
const FORMS_BY_BASE: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, string[]>();
  // Seed every mega species's base into the map. Each base's first entry is
  // the base itself; megas are appended in MEGA_SPECIES_TO_STONE order.
  for (const megaName of MEGA_SPECIES_TO_STONE.keys()) {
    // "Charizard-Mega-X" → "Charizard"; "Floette-Mega" → "Floette" (then
    // re-mapped to Floette-Eternal below for Champions).
    const base = megaName.replace(/-Mega(?:-[XYZ])?$/, "");
    if (!map.has(base)) map.set(base, [base]);
    map.get(base)!.push(megaName);
  }
  // Floette-Mega's canonical base in Champions is Floette-Eternal, not
  // Floette. Re-anchor manually.
  if (map.has("Floette")) {
    const formes = map.get("Floette")!;
    const megas = formes.filter((f) => f !== "Floette");
    map.delete("Floette");
    map.set("Floette-Eternal", ["Floette-Eternal", ...megas]);
  }
  // Battle-mode alt forms not in MEGA_SPECIES_TO_STONE.
  map.set("Aegislash", ["Aegislash", "Aegislash-Blade"]);
  map.set("Wishiwashi", ["Wishiwashi", "Wishiwashi-School"]);
  map.set("Greninja", [
    ...(map.get("Greninja") ?? ["Greninja"]),
    "Greninja-Ash",
  ]);
  map.set("Mimikyu", ["Mimikyu", "Mimikyu-Busted"]);
  map.set("Eternatus", ["Eternatus", "Eternatus-Eternamax"]);
  return map;
})();

/**
 * Resolve any species variant (form, mega, alt) to its canonical base used
 * by `FORMS_BY_BASE`. Returns the input untouched when no transformation
 * applies — that lets callers safely pass either base or variant names.
 */
export function getCanonicalBaseSpecies(species: string): string {
  if (!species) return species;
  // Mega forms strip suffix.
  if (MEGA_SPECIES_TO_STONE.has(species)) {
    if (species === "Floette-Mega") return "Floette-Eternal";
    return species.replace(/-Mega(?:-[XYZ])?$/, "");
  }
  // Battle-mode alt forms.
  if (species === "Aegislash-Blade") return "Aegislash";
  if (species === "Wishiwashi-School") return "Wishiwashi";
  if (species === "Greninja-Ash") return "Greninja";
  if (species === "Mimikyu-Busted") return "Mimikyu";
  if (species === "Eternatus-Eternamax") return "Eternatus";
  return species;
}

/**
 * Return the list of selectable forms for a species, in display order.
 * Returns `[species]` when the species has no alternate forms.
 *
 * The first element is always the canonical base form; consumers can
 * highlight that as the "default" in a UI picker.
 *
 * Pass either a base species ("Charizard") or any variant
 * ("Charizard-Mega-Y") — both resolve to the same form list.
 */
export function getFormsForSpecies(species: string): readonly string[] {
  if (!species) return [];
  const base = getCanonicalBaseSpecies(species);
  return FORMS_BY_BASE.get(base) ?? [base];
}

/**
 * True when the species has at least one alternate form (mega, blade,
 * school, ash, busted, eternamax, etc.).
 */
export function speciesHasForms(species: string): boolean {
  return getFormsForSpecies(species).length > 1;
}

// =============================================================================
// Import-time legality validation
// =============================================================================

/**
 * Result of a single-Pokemon format-legality check used by data-import
 * pipelines (RK9, Limitless). Flags whether the entry is legal in the given
 * format and, when not, the first reason it failed.
 */
export interface PokemonLegalityResult {
  isLegal: boolean;
  reason: string | null;
}

/**
 * Validate one Pokemon's species/item/ability/moves against a format, in
 * first-failure-wins order. Used at data-import time to flag illegal entries
 * WITHOUT dropping them.
 *
 * Fail-open by design: this composes the boolean `isLegal*` helpers, which
 * already collapse "unknown format" and "validator threw" into `true`. That
 * means an unrecognized or unavailable format yields `{ isLegal: true }`.
 * This intentionally diverges from this file's header note that gate-path
 * callers fail closed — the import requirement is "never drop data," so an
 * un-validatable entry is imported as legal rather than blocking the import.
 *
 * Empty / null item, ability, and moves are skipped (the helpers already
 * treat empty string as legal).
 *
 * Validation order: species, then held item, then ability, then each move.
 */
export function validatePokemonLegality(
  species: string,
  ability: string | null,
  heldItem: string | null,
  moves: string[] | null,
  formatId: string
): PokemonLegalityResult {
  // Canonicalize to the PascalCase display name the legality sets use
  // (e.g. "ogerpon-wellspring" -> "Ogerpon-Wellspring"). The isLegal* helpers
  // do an exact Set.has() against canonical names, but data-import callers pass
  // a normalized slug. Fall back to the raw input when @pkmn can't resolve it
  // so a genuinely-unknown species still flags illegal rather than silently
  // passing.
  const resolved = SimDex.species.get(species);
  const canonical = resolved.exists ? resolved.name : species;

  // 1. Species
  if (!isLegalSpecies(canonical, formatId)) {
    return { isLegal: false, reason: `Illegal species: ${canonical}` };
  }

  // 2. Held item (skip when empty/null — isLegalItem also treats "" as legal)
  if (heldItem && !isLegalItem(heldItem, formatId)) {
    return { isLegal: false, reason: `Illegal item: ${heldItem}` };
  }

  // 3. Ability (skip when empty/null)
  if (ability && !isLegalAbility(ability, canonical, formatId)) {
    return { isLegal: false, reason: `Illegal ability: ${ability}` };
  }

  // 4. Moves (skip empty strings)
  for (const move of moves ?? []) {
    if (move && !isLegalMove(move, canonical, formatId)) {
      return { isLegal: false, reason: `Illegal move: ${move}` };
    }
  }

  return { isLegal: true, reason: null };
}
