/**
 * Champions: VGC 2026 Reg M-A — self-contained legality bundle.
 *
 * This module is the single source of truth for ALL M-A static data:
 * legal species, items, moves, abilities, mega stones, mega post-evolution
 * abilities, and custom mega base stats. Downstream modules (format-legality,
 * stats-calculator, abilities) import from here; this file is a LEAF and must
 * not import from format-legality or stats-calculator to avoid circular deps.
 */

// =============================================================================
// Bundle type
// =============================================================================

/** Stat block shape used for custom mega base stats. */
export interface MegaStatBlock {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

/**
 * Champions-specific override for a single move's attributes.
 *
 * All fields are optional — only the attributes that differ from the vanilla
 * @pkmn/dex Gen 9 values are encoded. Display-relevant fields (`type`,
 * `category`, `basePower`, `accuracy`) are surfaced in the move picker;
 * battle-only fields (`pp`, `secondary`, `flags`, `mechanics`, `note`) are
 * stored for future sim integration.
 */
export interface ChampionsMoveChange {
  /** New base power (replaces @pkmn/dex value). */
  basePower?: number;
  /** New type (replaces @pkmn/dex value). */
  type?: string;
  /** New category (replaces @pkmn/dex value). */
  category?: "Physical" | "Special" | "Status";
  /** New accuracy value (replaces @pkmn/dex value). */
  accuracy?: number | true;
  /** New PP value (battle-only — not surfaced in move picker display). */
  pp?: number;
  /**
   * Human-readable description of secondary-effect changes (battle-only).
   * Example: "flinch 30%→20%"
   */
  secondary?: string;
  /**
   * Flag names added to this move in Champions (battle-only).
   * Example: ["Slicing"] for moves that gain the Slicing flag.
   */
  flags?: readonly string[];
  /**
   * Free-form description of mechanics changes not captured by other fields
   * (battle-only). Example: "resets hit-counter on switch-out".
   */
  mechanics?: string;
  /**
   * Source citation or clarifying note when data is single-source or
   * requires disambiguation. Example: "source: Serebii (not corroborated)".
   */
  note?: string;
}

/**
 * Self-contained legality descriptor for one Champions format regulation.
 * Every field is `Readonly*` so callers cannot mutate shared state.
 */
export interface ChampionsRegBundle {
  /** Every species selectable in this regulation. */
  legalSpecies: ReadonlySet<string>;

  /** Every held item (including mega stones and berries) legal in this regulation. */
  legalItems: ReadonlySet<string>;

  /**
   * Per-species move overrides — moves granted BEYOND what @pkmn/sim derives
   * from Gen 9 learnsets (e.g. Past-tagged moves like Light of Ruin).
   */
  moveOverrides: ReadonlyMap<string, ReadonlySet<string>>;

  /**
   * Format-level move ban list. An empty set means no additional bans beyond
   * what @pkmn/sim would enforce for the base format.
   */
  moveBanlist: ReadonlySet<string>;

  /**
   * Format-level ability ban list. An empty set means all species abilities
   * are legal without any format-level restrictions.
   */
  abilityBanlist: ReadonlySet<string>;

  /**
   * Source-of-truth mapping of mega species names → their required mega stone.
   * Declared as a tuple array so `MegaSpeciesWithStone` can be derived via
   * `typeof megaStones[number][0]` on the const reference in format-legality.
   */
  megaStones: ReadonlyArray<readonly [string, string]>;

  /**
   * Source-of-truth mapping of mega species names → their post-evolution ability.
   * Broader than megaStones (e.g. Rayquaza-Mega has an ability entry but no stone).
   */
  megaAbilities: ReadonlyArray<readonly [string, string]>;

  /**
   * Base stats for Champions-exclusive mega forms not present in @pkmn/dex.
   * Standard Gen 6/7 megas that exist in the dex do NOT need entries here.
   */
  megaStats: ReadonlyMap<string, MegaStatBlock>;

  /**
   * Type overrides for synthetic megas whose typing cannot be derived from
   * @pkmn/dex. M-A currently has no entries — future regulations may add them.
   * Keyed by mega species name; value is an ordered [primary, secondary?] array.
   */
  megaTypes: ReadonlyMap<string, readonly string[]>;

  /**
   * Custom ability short-descriptions not present in (or different from)
   * the @pkmn/dex descriptions. Checked BEFORE the @pkmn/dex lookup in
   * abilities.ts. M-A currently has no custom entries.
   */
  abilityDescs: ReadonlyMap<string, string>;

  /**
   * Champions-wide move attribute changes keyed by exact move display name.
   * Covers base power, type, category, accuracy, PP, and battle-only attrs
   * (secondary effects, flags, mechanics). Populated on M-A (the regulation
   * that shipped these changes); M-B inherits via reference equality.
   *
   * getMoveData() merges display-relevant fields (type, category, basePower,
   * accuracy) over the @pkmn/dex values when a Champions format is active.
   */
  moveChanges: ReadonlyMap<string, ChampionsMoveChange>;
}

// =============================================================================
// Champions: VGC 2026 Reg M-A — legal species
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
// Champions: VGC 2026 Reg M-A — legal items
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

// =============================================================================
// Champions: VGC 2026 Reg M-A — moves
// =============================================================================

// Champions M-A has no published format-level move bans (verified 2026-04-15
// via serebii.net/pokemonchampions/rankedbattle/, Reg M-A rules page, and
// serebii.net/pokemonchampions/moves.shtml — the game curates a ~500 move
// pool per species but has no additional format-level bans on top). Empty
// set means Champions goes through the sim-backed learnset path with gen-9
// data; species in Champions are all gen-9 entries so learnsets resolve.
const CHAMPIONS_MA_MOVE_BANLIST: ReadonlySet<string> = new Set();

/**
 * Extra moves granted to specific Champions species beyond what @pkmn/sim
 * derives from Gen 9 learnsets. Needed for moves that are isNonstandard='Past'
 * in Gen 9 data and therefore skipped by the learnset validator.
 */
const CHAMPIONS_MA_MOVE_OVERRIDES: ReadonlyMap<
  string,
  ReadonlySet<string>
> = new Map([
  // Light of Ruin is Floette-Eternal's Gen 6 signature move — never released
  // officially, marked Past in Gen 9, absent from Gen 9 learnsets.
  ["Floette-Eternal", new Set(["Light of Ruin"])],
  ["Floette-Mega", new Set(["Light of Ruin"])],
]);

// =============================================================================
// Champions: VGC 2026 Reg M-A — abilities
// =============================================================================

// Champions M-A has no format-level ability bans (verified 2026-04-15 via
// serebii.net/pokemonchampions — Reg M-A rules page lists no ability restrictions;
// the game assigns abilities per species with no additional format bans).
const CHAMPIONS_MA_ABILITY_BANLIST: ReadonlySet<string> = new Set();

// =============================================================================
// Champions: VGC 2026 Reg M-A — mega stones
// =============================================================================

/**
 * Source-of-truth tuple-array for mega species → mega stone. Declared
 * `as const` so we can derive the literal-union of mega-species names
 * (`MegaSpeciesWithStone`) from the data — adding a row here widens the
 * type automatically.
 */
const MEGA_STONE_ENTRIES = [
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
] as const;

// =============================================================================
// Champions: VGC 2026 Reg M-A — mega abilities
// =============================================================================

/**
 * Source-of-truth tuple-array for mega species → post-evolution ability.
 * Declared `as const` so we can derive `MegaSpeciesWithAbility` from the data.
 *
 * Keep in sync with the @smogon/calc species data (calc/src/data/species.ts) —
 * each mega's `abilities[0]` field is the source of truth. Includes non-M-A
 * entries (Rayquaza-Mega, Latias-Mega, etc.) because the ability table is
 * broader than the stone table — it's used by the damage calculator for ALL
 * formats that involve mega evolution.
 */
const MEGA_ABILITY_ENTRIES = [
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
] as const;

// =============================================================================
// Champions: VGC 2026 Reg M-A — mega base stats (Champions-exclusive only)
// =============================================================================

/**
 * Base stats for Champions-exclusive mega forms not present in @pkmn/dex.
 * Standard Gen 6/7 megas that exist in the dex do NOT need entries here —
 * stats-calculator will find them via Dex.forGen(6).
 */
const CHAMPIONS_MA_MEGA_STATS: ReadonlyMap<string, MegaStatBlock> = new Map([
  [
    "Chandelure-Mega",
    { hp: 60, atk: 75, def: 110, spa: 175, spd: 110, spe: 90 },
  ],
  [
    "Chesnaught-Mega",
    { hp: 88, atk: 147, def: 162, spa: 74, spd: 95, spe: 84 },
  ],
  ["Chimecho-Mega", { hp: 75, atk: 50, def: 110, spa: 135, spd: 120, spe: 65 }],
  ["Clefable-Mega", { hp: 95, atk: 80, def: 93, spa: 135, spd: 110, spe: 70 }],
  [
    "Crabominable-Mega",
    { hp: 97, atk: 157, def: 122, spa: 62, spd: 107, spe: 33 },
  ],
  ["Delphox-Mega", { hp: 75, atk: 69, def: 72, spa: 159, spd: 125, spe: 134 }],
  [
    "Dragonite-Mega",
    { hp: 91, atk: 124, def: 115, spa: 145, spd: 125, spe: 100 },
  ],
  ["Drampa-Mega", { hp: 78, atk: 85, def: 110, spa: 160, spd: 116, spe: 36 }],
  ["Emboar-Mega", { hp: 110, atk: 148, def: 75, spa: 110, spd: 110, spe: 75 }],
  [
    "Excadrill-Mega",
    { hp: 110, atk: 165, def: 100, spa: 65, spd: 65, spe: 103 },
  ],
  [
    "Feraligatr-Mega",
    { hp: 85, atk: 160, def: 125, spa: 89, spd: 93, spe: 78 },
  ],
  ["Floette-Mega", { hp: 74, atk: 85, def: 87, spa: 155, spd: 148, spe: 102 }],
  ["Froslass-Mega", { hp: 70, atk: 80, def: 70, spa: 140, spd: 100, spe: 120 }],
  ["Glimmora-Mega", { hp: 83, atk: 90, def: 105, spa: 150, spd: 96, spe: 101 }],
  ["Golurk-Mega", { hp: 89, atk: 159, def: 105, spa: 70, spd: 105, spe: 55 }],
  ["Greninja-Mega", { hp: 72, atk: 125, def: 77, spa: 133, spd: 81, spe: 142 }],
  ["Hawlucha-Mega", { hp: 78, atk: 137, def: 100, spa: 74, spd: 93, spe: 118 }],
  ["Meganium-Mega", { hp: 80, atk: 92, def: 115, spa: 143, spd: 115, spe: 80 }],
  ["Meowstic-Mega", { hp: 74, atk: 65, def: 85, spa: 121, spd: 95, spe: 115 }],
  [
    "Scovillain-Mega",
    { hp: 65, atk: 138, def: 85, spa: 138, spd: 85, spe: 75 },
  ],
  [
    "Skarmory-Mega",
    { hp: 65, atk: 140, def: 110, spa: 40, spd: 100, spe: 110 },
  ],
  [
    "Starmie-Mega",
    { hp: 60, atk: 100, def: 105, spa: 130, spd: 105, spe: 120 },
  ],
  [
    "Victreebel-Mega",
    { hp: 80, atk: 125, def: 85, spa: 135, spd: 95, spe: 70 },
  ],
]);

// =============================================================================
// Champions: VGC 2026 Reg M-A — move changes (Champions-wide, shipped at launch)
// =============================================================================

/**
 * Champions-wide move attribute changes. These changes shipped at M-A launch
 * and are inherited unchanged by M-B (no M-B-specific move deltas).
 *
 * Keys = exact move display names (matching @pkmn/dex move.name).
 * Sources: Bulbapedia, Serebii, Smogon — annotated per entry where single-source.
 *
 * PP normalization rule (applied to most moves):
 *   base 5 → 8, 10 → 12, 15 → 16, 20+ → 20.
 *   Exceptions: Protect/Detect/Baneful Bunker/King's Shield/Spiky Shield/
 *   Sandstorm/Snowscape/Beak Blast → 8; Night Slash → 20.
 */
const CHAMPIONS_MA_MOVE_CHANGES: ReadonlyMap<string, ChampionsMoveChange> =
  new Map([
    // -------------------------------------------------------------------------
    // Base power changes
    // -------------------------------------------------------------------------
    ["Trop Kick", { basePower: 85, pp: 16 }],
    ["Psyshield Bash", { basePower: 90, pp: 12 }],
    ["Apple Acid", { basePower: 90, pp: 12 }],
    ["Fire Lash", { basePower: 90, pp: 16 }],
    ["Grav Apple", { basePower: 90, pp: 12 }],
    ["Spirit Shackle", { basePower: 90, pp: 12 }],
    [
      "First Impression",
      {
        basePower: 100,
        pp: 12,
        mechanics:
          "Unusable after the switch-in turn (same restriction as Fake Out).",
      },
    ],
    [
      "Beak Blast",
      {
        basePower: 120,
        // Exception: Beak Blast gets pp 8 (matches Protect-family protection moves)
        pp: 8,
      },
    ],
    ["Mountain Gale", { basePower: 120, pp: 12 }],
    ["Night Daze", { basePower: 90, pp: 12 }],
    ["Infernal Parade", { basePower: 65, pp: 16 }],
    // Bone Rush: 25 → 30 BP per hit (multi-hit move, 2–5 hits)
    ["Bone Rush", { basePower: 30, pp: 12 }],

    // -------------------------------------------------------------------------
    // Type changes
    // -------------------------------------------------------------------------
    ["Snap Trap", { type: "Steel", pp: 20 }],
    [
      "Growth",
      {
        type: "Grass",
        pp: 20,
        // source: Serebii (not corroborated on Bulbapedia)
        note: "source: Serebii (not corroborated on Bulbapedia)",
      },
    ],

    // -------------------------------------------------------------------------
    // Accuracy changes
    // -------------------------------------------------------------------------
    ["Crabhammer", { accuracy: 95, pp: 12 }],
    ["Syrup Bomb", { accuracy: 90, pp: 12 }],
    [
      "Make It Rain",
      {
        accuracy: 95,
        // Exception: Make It Rain retains standard 8 PP (matches other
        // multi-target 120 BP moves getting the 8-PP Protect-exception)
        pp: 8,
        secondary:
          "user SpA −1 → −2 (increased self-drop after attacking)",
      },
    ],

    // -------------------------------------------------------------------------
    // Secondary effect changes (battle-only — not surfaced in move picker display)
    // -------------------------------------------------------------------------
    [
      "Iron Head",
      { pp: 16, secondary: "flinch chance 30% → 20%" },
    ],
    [
      "Moonblast",
      { pp: 16, secondary: "SpA-drop chance 30% → 10%" },
    ],
    [
      "Dire Claw",
      {
        pp: 16,
        secondary: "status condition chance 50% → 30%",
        flags: ["Slicing"],
      },
    ],

    // -------------------------------------------------------------------------
    // Flag additions (battle-only — Slicing / Sound)
    // -------------------------------------------------------------------------
    ["Crush Claw", { pp: 16, flags: ["Slicing"] }],
    ["Dragon Claw", { pp: 16, flags: ["Slicing"] }],
    ["Shadow Claw", { pp: 16, flags: ["Slicing"] }],
    ["Dragon Cheer", { pp: 16, flags: ["Sound"] }],

    // -------------------------------------------------------------------------
    // Mechanics changes (battle-only)
    // -------------------------------------------------------------------------
    [
      "Rage Fist",
      {
        pp: 12,
        mechanics:
          "Resets the hit-counter to 0 on switch-out (base BP 50, cap 350 unchanged).",
      },
    ],
    [
      "Salt Cure",
      {
        pp: 16,
        mechanics:
          "Residual damage 1/8 → 1/16 per turn (1/4 → 1/8 vs Water/Steel-type targets).",
      },
    ],
    [
      "Freeze-Dry",
      {
        pp: 20,
        mechanics: "Can no longer inflict the Frozen status condition.",
      },
    ],
    [
      // NOTE: Unseen Fist is an ABILITY, not a move (no PP). Kept here to
      // document its Champions nerf alongside the other mechanic changes.
      "Unseen Fist",
      {
        mechanics:
          "Ability (Urshifu): deals 1/4 damage through Protect and similar blocking moves, instead of full block.",
      },
    ],
    [
      "Toxic Thread",
      {
        pp: 20,
        mechanics: "Speed drop: −1 → −2 stages (stronger debuff).",
      },
    ],
    [
      "Fake Out",
      {
        pp: 12,
        mechanics:
          "Unusable after the switch-in turn (same restriction as First Impression).",
      },
    ],
    [
      "Poltergeist",
      {
        pp: 8,
        mechanics: "Can now target holders of Mega Stones (bypasses the item-check block).",
        // source: Smogon only
        note: "source: Smogon only",
      },
    ],
  ]);

// =============================================================================
// Bundle export
// =============================================================================

/**
 * Complete legality + calculator data bundle for Champions: VGC 2026 Reg M-A.
 *
 * Import this in format-legality.ts, stats-calculator.ts, and abilities.ts
 * rather than duplicating data across those modules.
 */
export const REG_MA_BUNDLE: ChampionsRegBundle = {
  legalSpecies: CHAMPIONS_MA_LEGAL_SPECIES,
  legalItems: CHAMPIONS_MA_LEGAL_ITEMS,
  moveOverrides: CHAMPIONS_MA_MOVE_OVERRIDES,
  moveBanlist: CHAMPIONS_MA_MOVE_BANLIST,
  abilityBanlist: CHAMPIONS_MA_ABILITY_BANLIST,
  megaStones: MEGA_STONE_ENTRIES,
  megaAbilities: MEGA_ABILITY_ENTRIES,
  megaStats: CHAMPIONS_MA_MEGA_STATS,
  // M-A has no synthetic-mega type overrides — all types resolved from @pkmn/dex
  // or from the mega's own species entry. Wire type overrides in T5 if needed.
  megaTypes: new Map(),
  // M-A has no custom ability descriptions beyond what @pkmn/dex provides.
  abilityDescs: new Map(),
  // Champions-wide move changes shipped at M-A launch; inherited by M-B.
  moveChanges: CHAMPIONS_MA_MOVE_CHANGES,
};

// =============================================================================
// Derived type exports (needed by format-legality to preserve public types)
// =============================================================================

/**
 * All mega species that have a required mega stone in the bundle.
 * Derived from `MEGA_STONE_ENTRIES` so adding a row automatically widens
 * the type — format-legality.ts re-exports this as `MegaSpeciesWithStone`.
 */
export type MegaSpeciesWithStoneFromBundle =
  (typeof MEGA_STONE_ENTRIES)[number][0];

/**
 * All mega species the calculator knows a post-evolution ability for.
 * Derived from `MEGA_ABILITY_ENTRIES` — format-legality.ts re-exports
 * this as `MegaSpeciesWithAbility`.
 */
export type MegaSpeciesWithAbilityFromBundle =
  (typeof MEGA_ABILITY_ENTRIES)[number][0];
