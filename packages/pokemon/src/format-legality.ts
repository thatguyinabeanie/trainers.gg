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
