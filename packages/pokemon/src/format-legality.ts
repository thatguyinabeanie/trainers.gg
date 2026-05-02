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

// Library tsconfig uses ES2022 without DOM — ambient console declaration
// so warn calls compile without adding @types/node or DOM lib.
declare const console: { warn(...data: unknown[]): void };

// =============================================================================
// Champions: VGC 2026 Reg M-A
// =============================================================================

/**
 * Every species selectable in Champions: VGC 2026 Reg M-A.
 *
 * Ported from NCP calc (pokedex.js lines 18378–18409). Mega forms are
 * also selectable — the species picker auto-assigns the matching mega
 * stone on select. Distinct battle forms (Rotom-Heat,
 * Tauros-Paldea-Combat, Aegislash-Blade, etc.) are retained.
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
  "Gourgeist", // canonical base-form name (@pkmn/dex resolves Gourgeist-Average → Gourgeist)
  "Avalugg",
  "Noivern",
  "Decidueye",
  "Incineroar",
  "Primarina",
  "Toucannon",
  "Crabominable",
  "Lycanroc", // canonical base-form name (@pkmn/dex resolves Lycanroc-Midday → Lycanroc)
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
  // Aegislash-Shield resolves to "Aegislash" in @pkmn/dex (base form is Shield).
  // "Aegislash" is already listed above in the base forms section, so it is
  // intentionally omitted here to avoid a duplicate in the Set.
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
  // Maushold-Three resolves to "Maushold" in @pkmn/dex (base form = 3-person family).
  // "Maushold" is already listed above in base forms, so omitted here.
  "Maushold-Four",
  "Palafin-Hero",
  "Rotom-Heat",
  "Rotom-Wash",
  "Rotom-Frost",
  "Rotom-Fan",
  "Rotom-Mow",
  // Mega forms — Champions-exclusive (custom — no @pkmn/dex entry)
  "Chandelure-Mega",
  "Chesnaught-Mega",
  "Chimecho-Mega",
  "Clefable-Mega",
  "Crabominable-Mega",
  "Delphox-Mega",
  "Dragonite-Mega",
  "Drampa-Mega",
  "Emboar-Mega",
  "Excadrill-Mega",
  "Feraligatr-Mega",
  "Floette-Mega",
  "Froslass-Mega",
  "Glimmora-Mega",
  "Golurk-Mega",
  "Greninja-Mega",
  "Hawlucha-Mega",
  "Meganium-Mega",
  "Meowstic-Mega",
  "Scovillain-Mega",
  "Skarmory-Mega",
  "Starmie-Mega",
  "Victreebel-Mega",
  // Standard Gen 6/7 mega forms (confirmed legal in Champions M-A)
  "Abomasnow-Mega",
  "Absol-Mega",
  "Aerodactyl-Mega",
  "Aggron-Mega",
  "Alakazam-Mega",
  "Altaria-Mega",
  "Ampharos-Mega",
  "Audino-Mega",
  "Banette-Mega",
  "Beedrill-Mega",
  "Blastoise-Mega",
  "Camerupt-Mega",
  "Charizard-Mega-X",
  "Charizard-Mega-Y",
  "Gallade-Mega",
  "Garchomp-Mega",
  "Gardevoir-Mega",
  "Gengar-Mega",
  "Glalie-Mega",
  "Gyarados-Mega",
  "Heracross-Mega",
  "Houndoom-Mega",
  "Kangaskhan-Mega",
  "Lopunny-Mega",
  "Lucario-Mega",
  "Manectric-Mega",
  "Medicham-Mega",
  "Pidgeot-Mega",
  "Pinsir-Mega",
  "Sableye-Mega",
  "Scizor-Mega",
  "Sharpedo-Mega",
  "Slowbro-Mega",
  "Steelix-Mega",
  "Tyranitar-Mega",
  "Venusaur-Mega",
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
    console.warn(
      `[format-legality] Failed to compute species for ${formatId}:`,
      error
    );
    return undefined; // permissive fallback — don't cache error result
  }

  simSetCache.set(formatId, legal);
  return legal;
}

// =============================================================================
// Items
// =============================================================================

/**
 * Every held item legal in Champions: VGC 2026 Reg M-A.
 *
 * Ported from Serebii's Champions items listing (serebii.net/pokemonchampions/items.shtml,
 * captured 2026-04-15). Champions has a curated item pool: 30 hold items,
 * 23 Mega Stones, and 28 Berries. Notably absent vs. gen-9 SV: Life Orb,
 * Choice Band, Choice Specs, Assault Vest, Rocky Helmet, Eviolite, Safety
 * Goggles, and most competitive staples beyond Choice Scarf.
 */
const CHAMPIONS_MA_LEGAL_ITEMS: ReadonlySet<string> = new Set([
  // Hold items (30)
  "Black Belt",
  "Black Glasses",
  "Bright Powder",
  "Charcoal",
  "Choice Scarf",
  "Dragon Fang",
  "Fairy Feather",
  "Focus Band",
  "Focus Sash",
  "Hard Stone",
  "King's Rock",
  "Leftovers",
  "Light Ball",
  "Magnet",
  "Mental Herb",
  "Metal Coat",
  "Miracle Seed",
  "Mystic Water",
  "Never-Melt Ice",
  "Poison Barb",
  "Quick Claw",
  "Scope Lens",
  "Sharp Beak",
  "Shell Bell",
  "Silk Scarf",
  "Silver Powder",
  "Soft Sand",
  "Spell Tag",
  "Twisted Spoon",
  "White Herb",
  // Mega Stones (59)
  "Chandelurite",
  "Chesnaughtite",
  "Chimechite",
  "Clefablite",
  "Crabominite",
  "Delphoxite",
  "Dragoninite",
  "Drampanite",
  "Emboarite",
  "Excadrite",
  "Feraligite",
  "Floettite",
  "Froslassite",
  "Glimmoranite",
  "Golurkite",
  "Greninjite",
  "Hawluchanite",
  "Meganiumite",
  "Meowsticite",
  "Scovillainite",
  "Skarmorite",
  "Starminite",
  "Victreebelite",
  "Abomasite",
  "Absolite",
  "Aerodactylite",
  "Aggronite",
  "Alakazite",
  "Altarianite",
  "Ampharosite",
  "Audinite",
  "Banettite",
  "Beedrillite",
  "Blastoisinite",
  "Cameruptite",
  "Charizardite X",
  "Charizardite Y",
  "Galladite",
  "Garchompite",
  "Gardevoirite",
  "Gengarite",
  "Glalitite",
  "Gyaradosite",
  "Heracronite",
  "Houndoominite",
  "Kangaskhanite",
  "Lopunnite",
  "Lucarionite",
  "Manectite",
  "Medichamite",
  "Pidgeotite",
  "Pinsirite",
  "Sablenite",
  "Scizorite",
  "Sharpedonite",
  "Slowbronite",
  "Steelixite",
  "Tyranitarite",
  "Venusaurite",
  // Berries (28)
  "Aspear Berry",
  "Babiri Berry",
  "Charti Berry",
  "Cheri Berry",
  "Chesto Berry",
  "Chilan Berry",
  "Chople Berry",
  "Coba Berry",
  "Colbur Berry",
  "Haban Berry",
  "Kasib Berry",
  "Kebia Berry",
  "Leppa Berry",
  "Lum Berry",
  "Occa Berry",
  "Oran Berry",
  "Passho Berry",
  "Payapa Berry",
  "Pecha Berry",
  "Persim Berry",
  "Rawst Berry",
  "Rindo Berry",
  "Roseli Berry",
  "Shuca Berry",
  "Sitrus Berry",
  "Tanga Berry",
  "Wacan Berry",
  "Yache Berry",
]);

/** Maps mega species names to their required mega stone (Champions M-A). */
const MEGA_SPECIES_TO_STONE: ReadonlyMap<string, string> = new Map([
  // Champions-exclusive megas
  ["Chandelure-Mega", "Chandelurite"],
  ["Chesnaught-Mega", "Chesnaughtite"],
  ["Chimecho-Mega", "Chimechite"],
  ["Clefable-Mega", "Clefablite"],
  ["Crabominable-Mega", "Crabominite"],
  ["Delphox-Mega", "Delphoxite"],
  ["Dragonite-Mega", "Dragoninite"],
  ["Drampa-Mega", "Drampanite"],
  ["Emboar-Mega", "Emboarite"],
  ["Excadrill-Mega", "Excadrite"],
  ["Feraligatr-Mega", "Feraligite"],
  ["Floette-Mega", "Floettite"],
  ["Froslass-Mega", "Froslassite"],
  ["Glimmora-Mega", "Glimmoranite"],
  ["Golurk-Mega", "Golurkite"],
  ["Greninja-Mega", "Greninjite"],
  ["Hawlucha-Mega", "Hawluchanite"],
  ["Meganium-Mega", "Meganiumite"],
  ["Meowstic-Mega", "Meowsticite"],
  ["Scovillain-Mega", "Scovillainite"],
  ["Skarmory-Mega", "Skarmorite"],
  ["Starmie-Mega", "Starminite"],
  ["Victreebel-Mega", "Victreebelite"],
  // Standard Gen 6/7 megas
  ["Abomasnow-Mega", "Abomasite"],
  ["Absol-Mega", "Absolite"],
  ["Aerodactyl-Mega", "Aerodactylite"],
  ["Aggron-Mega", "Aggronite"],
  ["Alakazam-Mega", "Alakazite"],
  ["Altaria-Mega", "Altarianite"],
  ["Ampharos-Mega", "Ampharosite"],
  ["Audino-Mega", "Audinite"],
  ["Banette-Mega", "Banettite"],
  ["Beedrill-Mega", "Beedrillite"],
  ["Blastoise-Mega", "Blastoisinite"],
  ["Camerupt-Mega", "Cameruptite"],
  ["Charizard-Mega-X", "Charizardite X"],
  ["Charizard-Mega-Y", "Charizardite Y"],
  ["Gallade-Mega", "Galladite"],
  ["Garchomp-Mega", "Garchompite"],
  ["Gardevoir-Mega", "Gardevoirite"],
  ["Gengar-Mega", "Gengarite"],
  ["Glalie-Mega", "Glalitite"],
  ["Gyarados-Mega", "Gyaradosite"],
  ["Heracross-Mega", "Heracronite"],
  ["Houndoom-Mega", "Houndoominite"],
  ["Kangaskhan-Mega", "Kangaskhanite"],
  ["Lopunny-Mega", "Lopunnite"],
  ["Lucario-Mega", "Lucarionite"],
  ["Manectric-Mega", "Manectite"],
  ["Medicham-Mega", "Medichamite"],
  ["Pidgeot-Mega", "Pidgeotite"],
  ["Pinsir-Mega", "Pinsirite"],
  ["Sableye-Mega", "Sablenite"],
  ["Scizor-Mega", "Scizorite"],
  ["Sharpedo-Mega", "Sharpedonite"],
  ["Slowbro-Mega", "Slowbronite"],
  ["Steelix-Mega", "Steelixite"],
  ["Tyranitar-Mega", "Tyranitarite"],
  ["Venusaur-Mega", "Venusaurite"],
]);

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
    console.warn(
      `[format-legality] Failed to compute items for ${formatId}:`,
      error
    );
    return undefined; // permissive fallback — don't cache error result
  }

  simItemCache.set(formatId, legal);
  return legal;
}

// =============================================================================
// Moves
// =============================================================================

// Champions M-A has no published format-level move bans (verified 2026-04-15
// via serebii.net/pokemonchampions/rankedbattle/, Reg M-A rules page, and
// serebii.net/pokemonchampions/moves.shtml — the game curates a ~500 move
// pool per species but has no additional format-level bans on top). Empty
// set means Champions goes through the sim-backed learnset path with gen-9
// data; species in Champions are all gen-9 entries so learnsets resolve.
//   5. serebii.net/vgc/ — no Champions info on overview page
const CHAMPIONS_MA_MOVE_BANLIST: ReadonlySet<string> = new Set();

/**
 * Extra moves granted to specific Champions species beyond what @pkmn/sim
 * derives from Gen 9 learnsets. Needed for moves that are isNonstandard='Past'
 * in Gen 9 data and therefore skipped by the learnset validator.
 */
const CHAMPIONS_SPECIES_MOVE_OVERRIDES: ReadonlyMap<
  string,
  ReadonlySet<string>
> = new Map([
  // Light of Ruin is Floette-Eternal's Gen 6 signature move — never released
  // officially, marked Past in Gen 9, absent from Gen 9 learnsets.
  ["Floette-Eternal", new Set(["Light of Ruin"])],
  ["Floette-Mega", new Set(["Light of Ruin"])],
]);

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

  try {
    for (const move of gen.moves.all()) {
      if (!move.exists) continue;
      if (move.isNonstandard && move.isNonstandard !== "Unobtainable") continue;

      const issues = validator.checkCanLearn(move, speciesObj);
      if (issues === null) legal.add(move.name);
    }
  } catch (error) {
    console.warn(
      `[format-legality] Failed to compute moves for ${species} in ${formatId}:`,
      error
    );
    return undefined; // permissive fallback — don't cache error result
  }

  simMoveCache.set(cacheKey, legal);
  return legal;
}

// Champions move cache is keyed by species only — all Champions species
// use the same gen-9 AG base validator and the same (currently empty)
// format-level banlist.
const championsMoveCache = new Map<string, ReadonlySet<string>>();

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

  // For Champions megas derived from non-standard base forms, use the
  // correct base for learnset lookups (e.g. Floette-Mega → Floette-Eternal).
  const lookupSpecies = CHAMPIONS_MEGA_LEARNSET_BASE[species] ?? species;

  const gen = SimDex.forGen(9);
  const speciesObj = gen.species.get(lookupSpecies);
  if (!speciesObj?.exists) return undefined;

  // Use AG as a permissive base validator — empty banlist, purely
  // learnset-based checkCanLearn with no format-specific restrictions.
  const format = SimDex.formats.get("[Gen 9] Anything Goes");
  if (!format?.exists) return undefined;
  const validator = new TeamValidator(format, SimDex);

  const legal = new Set<string>();

  try {
    for (const move of gen.moves.all()) {
      if (!move.exists) continue;
      if (move.isNonstandard && move.isNonstandard !== "Unobtainable") continue;
      if (CHAMPIONS_MA_MOVE_BANLIST.has(move.name)) continue;
      if (validator.checkCanLearn(move, speciesObj) === null) {
        legal.add(move.name);
      }
    }
  } catch (error) {
    console.warn(
      `[format-legality] Failed to compute Champions moves for ${species}:`,
      error
    );
    return undefined; // permissive fallback — don't cache error result
  }

  // Append per-species overrides — moves that @pkmn/sim can't derive from
  // Gen 9 learnsets (e.g. Past-tagged moves like Light of Ruin).
  const overrides = CHAMPIONS_SPECIES_MOVE_OVERRIDES.get(species);
  if (overrides) {
    for (const moveName of overrides) {
      legal.add(moveName);
    }
  }

  championsMoveCache.set(species, legal);
  return legal;
}

// =============================================================================
// Abilities
// =============================================================================

// Champions M-A has no format-level ability bans (verified 2026-04-15 via
// serebii.net/pokemonchampions — Reg M-A rules page lists no ability restrictions;
// the game assigns abilities per species with no additional format bans).
const CHAMPIONS_MA_ABILITY_BANLIST: ReadonlySet<string> = new Set();

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
): ReadonlySet<string> | undefined {
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
    console.warn(
      `[format-legality] Failed to compute abilities for ${species} in ${formatId}:`,
      error
    );
    return undefined; // permissive fallback — don't cache error result
  }

  simAbilityCache.set(cacheKey, legal);
  return legal;
}

/** Module-scope cache for Champions ability lookups. */
const championsAbilityCache = new Map<string, ReadonlySet<string>>();

/**
 * Compute the legal-ability set for a Champions: VGC 2026 Reg M-A species.
 * Returns the species' own abilities filtered through the Champions ability
 * banlist (currently empty — all abilities legal).
 */
function computeLegalAbilitiesForChampions(
  species: string
): ReadonlySet<string> | undefined {
  const cached = championsAbilityCache.get(species);
  if (cached) return cached;

  const gen = SimDex.forGen(9);
  const speciesObj = gen.species.get(species);
  if (!speciesObj?.exists) return undefined;
  const legal: ReadonlySet<string> = new Set(
    speciesAbilityNames(speciesObj).filter(
      (name) => !CHAMPIONS_MA_ABILITY_BANLIST.has(name)
    )
  );
  championsAbilityCache.set(species, legal);
  return legal;
}

// =============================================================================
// Format ID Constants
// =============================================================================

/** Format ID for Champions VGC 2026 Regulation M-A. */
const CHAMPIONS_MA_FORMAT_ID = "championsvgc2026regma";

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
export function getLegalSpecies(
  formatId: string
): ReadonlySet<string> | undefined {
  if (formatId === CHAMPIONS_MA_FORMAT_ID) {
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
 */
export function getLegalItems(
  formatId: string
): ReadonlySet<string> | undefined {
  if (formatId === CHAMPIONS_MA_FORMAT_ID) return CHAMPIONS_MA_LEGAL_ITEMS;
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
  if (formatId === CHAMPIONS_MA_FORMAT_ID) {
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
): ReadonlySet<string> | undefined {
  if (formatId === CHAMPIONS_MA_FORMAT_ID) {
    return computeLegalAbilitiesForChampions(species);
  }
  return computeLegalAbilitiesFromSim(species, formatId);
}

/**
 * True when `ability` is legal for `species` in `formatId`. Returns true
 * for the empty string (no ability is always legal) and for any format
 * without computable legality (permissive default).
 */
export function isLegalAbility(
  ability: string,
  species: string,
  formatId: string
): boolean {
  if (!ability) return true;
  const legal = getLegalAbilities(species, formatId);
  return legal === undefined || legal.has(ability);
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
export function getLegalTeraTypes(
  formatId: string
): ReadonlySet<string> | undefined {
  // Champions M-A has no Tera — only Mega Evolutions.
  if (formatId === CHAMPIONS_MA_FORMAT_ID) {
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
  return legal === undefined || legal.has(type);
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
const MEGA_SPECIES_TO_ABILITY: ReadonlyMap<string, string> = new Map([
  // Standard Gen 6/7 megas
  ["Abomasnow-Mega", "Snow Warning"],
  ["Absol-Mega", "Magic Bounce"],
  ["Aerodactyl-Mega", "Tough Claws"],
  ["Aggron-Mega", "Filter"],
  ["Alakazam-Mega", "Trace"],
  ["Altaria-Mega", "Pixilate"],
  ["Ampharos-Mega", "Mold Breaker"],
  ["Audino-Mega", "Healer"],
  ["Banette-Mega", "Prankster"],
  ["Beedrill-Mega", "Adaptability"],
  ["Blastoise-Mega", "Mega Launcher"],
  ["Blaziken-Mega", "Speed Boost"],
  ["Camerupt-Mega", "Sheer Force"],
  ["Charizard-Mega-X", "Tough Claws"],
  ["Charizard-Mega-Y", "Drought"],
  ["Diancie-Mega", "Magic Bounce"],
  ["Gallade-Mega", "Inner Focus"],
  ["Garchomp-Mega", "Sand Force"],
  ["Gardevoir-Mega", "Pixilate"],
  ["Gengar-Mega", "Shadow Tag"],
  ["Glalie-Mega", "Refrigerate"],
  ["Gyarados-Mega", "Mold Breaker"],
  ["Heracross-Mega", "Skill Link"],
  ["Houndoom-Mega", "Solar Power"],
  ["Kangaskhan-Mega", "Parental Bond"],
  ["Latias-Mega", "Levitate"],
  ["Latios-Mega", "Levitate"],
  ["Lopunny-Mega", "Scrappy"],
  ["Lucario-Mega", "Adaptability"],
  ["Manectric-Mega", "Intimidate"],
  ["Mawile-Mega", "Huge Power"],
  ["Medicham-Mega", "Pure Power"],
  ["Metagross-Mega", "Tough Claws"],
  ["Mewtwo-Mega-X", "Steadfast"],
  ["Mewtwo-Mega-Y", "Insomnia"],
  ["Pidgeot-Mega", "No Guard"],
  ["Pinsir-Mega", "Aerilate"],
  ["Rayquaza-Mega", "Delta Stream"],
  ["Sableye-Mega", "Magic Bounce"],
  ["Salamence-Mega", "Aerilate"],
  ["Sceptile-Mega", "Lightning Rod"],
  ["Scizor-Mega", "Technician"],
  ["Sharpedo-Mega", "Strong Jaw"],
  ["Slowbro-Mega", "Shell Armor"],
  ["Steelix-Mega", "Sand Force"],
  ["Swampert-Mega", "Swift Swim"],
  ["Tyranitar-Mega", "Sand Stream"],
  ["Venusaur-Mega", "Thick Fat"],
  // Champions-exclusive megas
  ["Barbaracle-Mega", "Tough Claws"],
  ["Baxcalibur-Mega", "Thermal Exchange"],
  ["Chandelure-Mega", "Infiltrator"],
  ["Chesnaught-Mega", "Bulletproof"],
  ["Chimecho-Mega", "Levitate"],
  ["Clefable-Mega", "Magic Bounce"],
  ["Crabominable-Mega", "Iron Fist"],
  ["Darkrai-Mega", "Bad Dreams"],
  ["Delphox-Mega", "Levitate"],
  ["Dragalge-Mega", "Poison Point"],
  ["Dragonite-Mega", "Multiscale"],
  ["Drampa-Mega", "Berserk"],
  ["Eelektross-Mega", "Levitate"],
  ["Emboar-Mega", "Mold Breaker"],
  ["Excadrill-Mega", "Piercing Drill"],
  ["Falinks-Mega", "Battle Armor"],
  ["Feraligatr-Mega", "Dragonize"],
  ["Floette-Mega", "Fairy Aura"],
  ["Froslass-Mega", "Snow Warning"],
  ["Glimmora-Mega", "Adaptability"],
  ["Golisopod-Mega", "Emergency Exit"],
  ["Golurk-Mega", "Unseen Fist"],
  ["Greninja-Mega", "Protean"],
  ["Hawlucha-Mega", "Limber"],
  ["Heatran-Mega", "Flash Fire"],
  ["Magearna-Mega", "Soul-Heart"],
  ["Magearna-Original-Mega", "Soul-Heart"],
  ["Malamar-Mega", "Contrary"],
  ["Meganium-Mega", "Mega Sol"],
  ["Meowstic-F-Mega", "Trace"],
  ["Meowstic-M-Mega", "Trace"],
  ["Pyroar-Mega", "Rivalry"],
  ["Raichu-Mega-X", "Surge Surfer"],
  ["Raichu-Mega-Y", "Surge Surfer"],
  ["Scolipede-Mega", "Poison Point"],
  ["Scovillain-Mega", "Spicy Spray"],
  ["Scrafty-Mega", "Shed Skin"],
  ["Skarmory-Mega", "Keen Eye"],
  ["Staraptor-Mega", "Intimidate"],
  ["Starmie-Mega", "Huge Power"],
  ["Tatsugiri-Curly-Mega", "Commander"],
  ["Tatsugiri-Droopy-Mega", "Commander"],
  ["Tatsugiri-Stretchy-Mega", "Commander"],
  ["Victreebel-Mega", "Innards Out"],
  ["Zeraora-Mega", "Volt Absorb"],
  ["Zygarde-Mega", "Aura Break"],
  // Misc / past-format
  ["Crucibelle-Mega", "Magic Guard"],
]);

/**
 * Returns the post-evolution ability for a mega species, or null if the
 * species is not a mega form.
 *
 * The base form's ability is what gets submitted on a tournament team
 * sheet (legality requirement). After mega evolution, the species's
 * intrinsic ability takes over — Drought for Mega Charizard Y, Tough
 * Claws for Mega Aerodactyl, etc. The damage calculator should compute
 * with the post-evolution ability while leaving the stored base ability
 * untouched.
 */
export function getMegaAbilityForSpecies(species: string): string | null {
  return MEGA_SPECIES_TO_ABILITY.get(species) ?? null;
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
