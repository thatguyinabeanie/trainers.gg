/**
 * Format species legality.
 *
 * - Champions: VGC 2026 Reg M-A uses a static port of NCP VGC Damage
 *   Calculator's POKEDEX_CHAMPIONS list (pokedex.js lines 18378–18409,
 *   captured 2026-04-14), because @pkmn/sim doesn't know gen 10.
 * - Other formats will be resolved via @pkmn/sim in Task 2.
 * - Unknown / unresolvable formats return `undefined` and callers treat
 *   that as "permissive — all legal."
 */

// =============================================================================
// Champions: VGC 2026 Reg M-A
// =============================================================================

/**
 * Every species selectable in Champions: VGC 2026 Reg M-A.
 *
 * Ported from NCP calc (pokedex.js lines 18378–18409). Megas are
 * item-driven battle transformations, not separately selectable species,
 * so every "Mega X" entry from NCP is dropped here. Distinct battle
 * forms (Rotom-Heat, Tauros-Paldea-Combat, Aegislash-Blade, etc.)
 * are retained.
 */
const CHAMPIONS_MA_LEGAL_SPECIES: ReadonlySet<string> = new Set([
  // Base forms — Pokemon available from launch of Champions
  "Venusaur",
  "Charizard",
  "Blastoise",
  "Beedrill",
  "Pidgeot",
  "Arbok",
  "Pikachu",
  "Raichu",
  "Clefable",
  "Ninetales",
  "Arcanine",
  "Alakazam",
  "Machamp",
  "Victreebel",
  "Slowbro",
  "Gengar",
  "Kangaskhan",
  "Starmie",
  "Pinsir",
  "Tauros",
  "Gyarados",
  "Ditto",
  "Vaporeon",
  "Jolteon",
  "Flareon",
  "Aerodactyl",
  "Snorlax",
  "Dragonite",
  "Meganium",
  "Typhlosion",
  "Feraligatr",
  "Ariados",
  "Ampharos",
  "Azumarill",
  "Politoed",
  "Espeon",
  "Umbreon",
  "Slowking",
  "Forretress",
  "Steelix",
  "Scizor",
  "Heracross",
  "Skarmory",
  "Houndoom",
  "Tyranitar",
  "Pelipper",
  "Gardevoir",
  "Sableye",
  "Aggron",
  "Medicham",
  "Manectric",
  "Sharpedo",
  "Camerupt",
  "Torkoal",
  "Altaria",
  "Milotic",
  "Castform",
  "Banette",
  "Chimecho",
  "Absol",
  "Glalie",
  "Torterra",
  "Infernape",
  "Empoleon",
  "Luxray",
  "Roserade",
  "Rampardos",
  "Bastiodon",
  "Lopunny",
  "Spiritomb",
  "Garchomp",
  "Lucario",
  "Hippowdon",
  "Toxicroak",
  "Abomasnow",
  "Weavile",
  "Rhyperior",
  "Leafeon",
  "Glaceon",
  "Gliscor",
  "Mamoswine",
  "Gallade",
  "Froslass",
  "Rotom",
  "Serperior",
  "Emboar",
  "Samurott",
  "Watchog",
  "Liepard",
  "Simisage",
  "Simisear",
  "Simipour",
  "Excadrill",
  "Audino",
  "Conkeldurr",
  "Whimsicott",
  "Krookodile",
  "Cofagrigus",
  "Garbodor",
  "Zoroark",
  "Reuniclus",
  "Vanilluxe",
  "Emolga",
  "Chandelure",
  "Beartic",
  "Stunfisk",
  "Golurk",
  "Hydreigon",
  "Volcarona",
  "Chesnaught",
  "Delphox",
  "Greninja",
  "Diggersby",
  "Talonflame",
  "Vivillon",
  "Floette-Eternal",
  "Florges",
  "Pangoro",
  "Furfrou",
  "Meowstic",
  "Aegislash",
  "Aromatisse",
  "Slurpuff",
  "Clawitzer",
  "Heliolisk",
  "Tyrantrum",
  "Aurorus",
  "Sylveon",
  "Hawlucha",
  "Dedenne",
  "Goodra",
  "Klefki",
  "Trevenant",
  "Gourgeist-Average",
  "Avalugg",
  "Noivern",
  "Decidueye",
  "Incineroar",
  "Primarina",
  "Toucannon",
  "Crabominable",
  "Lycanroc-Midday",
  "Toxapex",
  "Mudsdale",
  "Araquanid",
  "Tsareena",
  "Oranguru",
  "Passimian",
  "Mimikyu",
  "Drampa",
  "Kommo-o",
  "Corviknight",
  "Flapple",
  "Appletun",
  "Sandaconda",
  "Polteageist",
  "Hatterene",
  "Mr. Rime",
  "Runerigus",
  "Alcremie",
  "Morpeko",
  "Dragapult",
  "Wyrdeer",
  "Kleavor",
  "Basculegion",
  "Sneasler",
  "Meowscarada",
  "Skeledirge",
  "Quaquaval",
  "Maushold",
  "Garganacl",
  "Armarouge",
  "Ceruledge",
  "Bellibolt",
  "Scovillain",
  "Espathra",
  "Tinkaton",
  "Palafin",
  "Orthworm",
  "Glimmora",
  "Farigiraf",
  "Kingambit",
  "Sinistcha",
  "Archaludon",
  "Hydrapple",
  // Regional / battle-distinct alt forms
  "Raichu-Alola",
  "Ninetales-Alola",
  "Arcanine-Hisui",
  "Slowbro-Galar",
  "Tauros-Paldea-Combat",
  "Tauros-Paldea-Aqua",
  "Tauros-Paldea-Blaze",
  "Typhlosion-Hisui",
  "Slowking-Galar",
  "Samurott-Hisui",
  "Zoroark-Hisui",
  "Stunfisk-Galar",
  "Meowstic-F",
  "Aegislash-Shield",
  "Aegislash-Blade",
  "Goodra-Hisui",
  "Gourgeist-Small",
  "Gourgeist-Large",
  "Gourgeist-Super",
  "Avalugg-Hisui",
  "Decidueye-Hisui",
  "Lycanroc-Midnight",
  "Lycanroc-Dusk",
  "Morpeko-Hangry",
  "Basculegion-F",
  "Maushold-Three",
  "Palafin-Hero",
  "Rotom-Heat",
  "Rotom-Wash",
  "Rotom-Frost",
  "Rotom-Fan",
  "Rotom-Mow",
]);

// =============================================================================
// @pkmn/sim-backed legality
// =============================================================================

import { Dex as SimDex, TeamValidator } from "@pkmn/sim";
import type { PokemonSet, Species } from "@pkmn/sim";

/**
 * Map our format IDs to the Showdown format display name that
 * `@pkmn/sim` registers. Formats not listed here fall back to
 * `undefined` (permissive) until someone adds them.
 */
const SIM_FORMAT_NAME_BY_ID: Record<string, string> = {
  gen9vgc2026regi: "[Gen 9] VGC 2026 Reg I",
  gen9vgc2026regf: "[Gen 9] VGC 2026 Reg F",
  gen9vgc2024regg: "[Gen 9] VGC 2024 Reg G",
  gen9vgc2024regh: "[Gen 9] VGC 2024 Reg H",
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
    item: "",
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
function computeLegalSpeciesFromSim(
  formatId: string
): ReadonlySet<string> | undefined {
  const cached = simSetCache.get(formatId);
  if (cached) return cached;

  const simName = SIM_FORMAT_NAME_BY_ID[formatId];
  if (!simName) return undefined;

  const format = SimDex.formats.get(simName);
  if (!format?.exists) return undefined;

  const validator = new TeamValidator(format, SimDex);
  const gen = SimDex.forGen(9);
  const legal = new Set<string>();

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

  simSetCache.set(formatId, legal);
  return legal;
}

// =============================================================================
// Items
// =============================================================================

// TODO(champions-items): No authoritative VGC 2026 Reg M-A held-item legality
// list has been published yet. The videogameschronicle "all items" guide only
// enumerates the in-game shop pool (47 items, mostly type-boosting items and
// Pinch Berries) and does not address competitive legality (no Life Orb,
// Focus Sash, Choice items, Leftovers, Sitrus Berry, etc.). The official
// pokemon.com tournaments page redirects to championships.pokemon.com which
// does not surface item rules either. Until an authoritative source ships,
// Champions returns `undefined` from `getLegalItems` (permissive — all items
// allowed) so we don't fabricate a list. Re-source when rules drop and
// replace this with a `CHAMPIONS_MA_LEGAL_ITEMS` static port.

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
function computeLegalItemsFromSim(
  formatId: string
): ReadonlySet<string> | undefined {
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

  simItemCache.set(formatId, legal);
  return legal;
}

// =============================================================================
// Moves
// =============================================================================

// TODO(champions-moves-banlist): No VGC 2026 Reg M-A move banlist has been
// published as of 2026-04-15. Sources checked:
//   1. pokemon.com/us/play-pokemon/about/tournaments-rules/ — 404
//   2. championships.pokemon.com/en-us/tournaments/ — 404
//   3. smogon.com/forums/forums/vgc.199/ — no Champions / Reg M-A threads
//   4. pikalytics.com — usage stats only, no move banlist
//   5. serebii.net/vgc/ — no Champions info on overview page
//   6. videogameschronicle.com/guide/pokemon-champions-all-items-in-pokemon-champions/ — item guide only
//   7. reddit.com/r/VGC/.json — unable to fetch (blocked)
//   8. old.reddit.com/r/PokemonChampions/ — unable to fetch (blocked)
// Revisit when official rules drop. Empty set means Champions goes through the
// sim-backed learnset path with no format-level move bans applied on top.
const CHAMPIONS_MA_MOVE_BANLIST: ReadonlySet<string> = new Set();

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
): ReadonlySet<string> | undefined {
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

  for (const move of gen.moves.all()) {
    if (!move.exists) continue;
    if (move.isNonstandard && move.isNonstandard !== "Unobtainable") continue;

    const issues = validator.checkCanLearn(move, speciesObj);
    if (issues === null) legal.add(move.name);
  }

  simMoveCache.set(cacheKey, legal);
  return legal;
}

// Champions move cache is keyed by species only — all Champions species
// use the same gen-9 AG base validator and the same (currently empty)
// format-level banlist.
const championsMoveCache = new Map<string, ReadonlySet<string>>();

/**
 * Compute the legal-move set for a Champions: VGC 2026 Reg M-A species.
 *
 * All Champions-roster species exist in the gen-9 pokedex (including
 * Hisui/Paldea/Galar regional forms), so `checkCanLearn` works against
 * gen-9 sim data.
 *
 * Uses Anything Goes as the base validator — it has an empty banlist,
 * so `checkCanLearn` operates purely on learnset data with no format-
 * level move bans leaking through. Champions-specific bans are applied
 * on top via `CHAMPIONS_MA_MOVE_BANLIST`.
 */
function computeLegalMovesForChampions(
  species: string
): ReadonlySet<string> | undefined {
  const cached = championsMoveCache.get(species);
  if (cached) return cached;

  const gen = SimDex.forGen(9);
  const speciesObj = gen.species.get(species);
  if (!speciesObj?.exists) return undefined;

  // Use AG as a permissive base validator — empty banlist, purely
  // learnset-based checkCanLearn with no format-specific restrictions.
  const format = SimDex.formats.get("[Gen 9] Anything Goes");
  if (!format?.exists) return undefined;
  const validator = new TeamValidator(format, SimDex);

  const legal = new Set<string>();
  for (const move of gen.moves.all()) {
    if (!move.exists) continue;
    if (move.isNonstandard && move.isNonstandard !== "Unobtainable") continue;
    if (CHAMPIONS_MA_MOVE_BANLIST.has(move.name)) continue;
    if (validator.checkCanLearn(move, speciesObj) === null) {
      legal.add(move.name);
    }
  }

  championsMoveCache.set(species, legal);
  return legal;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Returns the set of species legal in the given format, or `undefined`
 * if legality cannot be determined (treat as permissive).
 */
export function getLegalSpecies(
  formatId: string
): ReadonlySet<string> | undefined {
  if (formatId === "championsvgc2026regma") {
    return CHAMPIONS_MA_LEGAL_SPECIES;
  }
  return computeLegalSpeciesFromSim(formatId);
}

/**
 * True when `species` is legal in `formatId`. Returns true for any
 * format without computable legality (permissive default).
 */
export function isLegalSpecies(species: string, formatId: string): boolean {
  const legal = getLegalSpecies(formatId);
  return legal === undefined || legal.has(species);
}

/**
 * Returns the set of held items legal in the given format, or `undefined`
 * if legality cannot be determined (treat as permissive — caller allows
 * any item).
 *
 * Champions: VGC 2026 Reg M-A currently returns `undefined` because no
 * authoritative item-legality source has been published; see the
 * `TODO(champions-items)` note above.
 */
export function getLegalItems(
  formatId: string
): ReadonlySet<string> | undefined {
  // Champions M-A: permissive until a source publishes item rules.
  if (formatId === "championsvgc2026regma") return undefined;
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
  return legal === undefined || legal.has(item);
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
): ReadonlySet<string> | undefined {
  if (formatId === "championsvgc2026regma") {
    return computeLegalMovesForChampions(species);
  }
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
  return legal === undefined || legal.has(move);
}
