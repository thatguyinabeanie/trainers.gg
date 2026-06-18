/**
 * Champions: VGC 2026 Reg M-B — self-contained legality bundle.
 *
 * M-B is a strict superset of M-A: every species, item, move rule, and
 * ability rule from M-A carries forward unchanged. This file imports
 * `REG_MA_BUNDLE` and adds the M-B delta on top.
 *
 * Structure mirrors champions-reg-ma.ts exactly. This file is also a LEAF
 * and must not import from format-legality or stats-calculator.
 */

import {
  type ChampionsRegBundle,
  type MegaStatBlock,
  REG_MA_BUNDLE,
} from "./champions-reg-ma";

// =============================================================================
// Champions: VGC 2026 Reg M-B — new base species (22)
// =============================================================================

/**
 * The 22 base species added in Reg M-B that were not present in M-A.
 * String casing matches the M-A convention (PascalCase display names).
 */
const CHAMPIONS_MB_NEW_BASE_SPECIES: readonly string[] = [
  "Vileplume",
  "Qwilfish",
  "Sceptile",
  "Blaziken",
  "Swampert",
  "Mawile",
  "Metagross",
  "Staraptor",
  "Musharna",
  "Scolipede",
  "Scrafty",
  "Eelektross",
  "Pyroar",
  "Malamar",
  "Barbaracle",
  "Dragalge",
  "Grimmsnarl",
  "Falinks",
  "Overqwil",
  "Houndstone",
  "Annihilape",
  "Gholdengo",
];

// =============================================================================
// Champions: VGC 2026 Reg M-B — mega stones
// =============================================================================

/**
 * New mega stone entries for M-B-exclusive megas. Declared `as const` so
 * `MegaSpeciesWithStoneFromBundle` widens to include these mega species
 * automatically. Stone names follow the same display-name convention as M-A.
 */
const MEGA_MB_STONE_ENTRIES = [
  ["Raichu-Mega-X", "Raichunite X"],
  ["Raichu-Mega-Y", "Raichunite Y"],
  ["Sceptile-Mega", "Sceptilite"],
  ["Blaziken-Mega", "Blazikenite"],
  ["Swampert-Mega", "Swampertite"],
  ["Mawile-Mega", "Mawilite"],
  ["Metagross-Mega", "Metagrossite"],
  ["Staraptor-Mega", "Staraptite"],
  ["Scolipede-Mega", "Scolipite"],
  ["Scrafty-Mega", "Scraftinite"],
  ["Eelektross-Mega", "Eelektrossite"],
  ["Pyroar-Mega", "Pyroarite"],
  ["Malamar-Mega", "Malamarite"],
  ["Barbaracle-Mega", "Barbaracite"],
  ["Dragalge-Mega", "Dragalgite"],
  ["Falinks-Mega", "Falinksite"],
] as const;

// =============================================================================
// Champions: VGC 2026 Reg M-B — mega abilities
// =============================================================================

/**
 * New mega ability entries for M-B-exclusive megas. Declared `as const` so
 * `MegaSpeciesWithAbilityFromBundle` widens automatically.
 */
const MEGA_MB_ABILITY_ENTRIES = [
  ["Raichu-Mega-X", "Electric Surge"],
  ["Raichu-Mega-Y", "No Guard"],
  ["Sceptile-Mega", "Lightning Rod"],
  ["Blaziken-Mega", "Speed Boost"],
  ["Swampert-Mega", "Swift Swim"],
  ["Mawile-Mega", "Huge Power"],
  ["Metagross-Mega", "Tough Claws"],
  ["Staraptor-Mega", "Contrary"],
  ["Scolipede-Mega", "Shell Armor"],
  ["Scrafty-Mega", "Intimidate"],
  ["Eelektross-Mega", "Eelevate"],
  ["Pyroar-Mega", "Fire Mane"],
  ["Malamar-Mega", "Contrary"],
  ["Barbaracle-Mega", "Tough Claws"],
  ["Dragalge-Mega", "Regenerator"],
  ["Falinks-Mega", "Defiant"],
] as const;

// =============================================================================
// Champions: VGC 2026 Reg M-B — mega forms (species names only)
// =============================================================================

/** Mega forme strings derived from the stone entries, for legalSpecies inclusion. */
const CHAMPIONS_MB_MEGA_FORMS: readonly string[] = MEGA_MB_STONE_ENTRIES.map(
  ([megaSpecies]) => megaSpecies
);

// =============================================================================
// Champions: VGC 2026 Reg M-B — legal species
// =============================================================================

/**
 * Full legal species set for M-B: all M-A species PLUS the 22 new base
 * species PLUS the 16 new mega formes.
 */
const CHAMPIONS_MB_LEGAL_SPECIES: ReadonlySet<string> = new Set([
  ...REG_MA_BUNDLE.legalSpecies,
  ...CHAMPIONS_MB_NEW_BASE_SPECIES,
  ...CHAMPIONS_MB_MEGA_FORMS,
]);

// =============================================================================
// Champions: VGC 2026 Reg M-B — legal items
// =============================================================================

/**
 * Full legal items set for M-B: all M-A items PLUS the 16 new mega stones
 * PLUS 15 additional held items.
 */
const CHAMPIONS_MB_LEGAL_ITEMS: ReadonlySet<string> = new Set([
  ...REG_MA_BUNDLE.legalItems,
  // 16 new mega stones
  "Raichunite X",
  "Raichunite Y",
  "Sceptilite",
  "Blazikenite",
  "Swampertite",
  "Mawilite",
  "Metagrossite",
  "Staraptite",
  "Scolipite",
  "Scraftinite",
  "Eelektrossite",
  "Pyroarite",
  "Malamarite",
  "Barbaracite",
  "Dragalgite",
  "Falinksite",
  // 15 new held items
  "Wide Lens",
  "Muscle Band",
  "Wise Glasses",
  "Expert Belt",
  "Light Clay",
  "Life Orb",
  "Zoom Lens",
  "Metronome",
  "Iron Ball",
  "Icy Rock",
  "Smooth Rock",
  "Heat Rock",
  "Damp Rock",
  "Shed Shell",
  "Big Root",
]);

// =============================================================================
// Champions: VGC 2026 Reg M-B — mega base stats (brand-new megas only)
// =============================================================================

/**
 * Base stats for Champions-exclusive M-B mega forms not present in @pkmn/dex.
 * The 5 returning Gen 6/7 megas (Sceptile, Blaziken, Swampert, Mawile,
 * Metagross) are NOT listed here — stats-calculator resolves them via
 * Dex.forGen(6), just as it does for M-A's Gen 6/7 megas.
 */
const CHAMPIONS_MB_MEGA_STATS: ReadonlyMap<string, MegaStatBlock> = new Map([
  ["Raichu-Mega-X", { hp: 60, atk: 135, def: 95, spa: 90, spd: 95, spe: 110 }],
  ["Raichu-Mega-Y", { hp: 60, atk: 100, def: 55, spa: 160, spd: 80, spe: 130 }],
  ["Staraptor-Mega", { hp: 85, atk: 140, def: 100, spa: 60, spd: 90, spe: 110 }],
  ["Scolipede-Mega", { hp: 60, atk: 140, def: 149, spa: 75, spd: 99, spe: 62 }],
  ["Scrafty-Mega", { hp: 65, atk: 130, def: 135, spa: 55, spd: 135, spe: 68 }],
  ["Eelektross-Mega", { hp: 85, atk: 145, def: 80, spa: 135, spd: 90, spe: 80 }],
  ["Pyroar-Mega", { hp: 86, atk: 88, def: 92, spa: 129, spd: 86, spe: 126 }],
  ["Malamar-Mega", { hp: 86, atk: 102, def: 88, spa: 98, spd: 120, spe: 88 }],
  ["Barbaracle-Mega", { hp: 72, atk: 140, def: 130, spa: 64, spd: 106, spe: 88 }],
  ["Dragalge-Mega", { hp: 65, atk: 85, def: 105, spa: 132, spd: 163, spe: 44 }],
  ["Falinks-Mega", { hp: 65, atk: 135, def: 135, spa: 70, spd: 65, spe: 100 }],
]);

// =============================================================================
// Champions: VGC 2026 Reg M-B — mega type overrides
// =============================================================================

/**
 * Type overrides for M-B megas whose typing differs from the base species and
 * is not present in @pkmn/dex. Only 2 new entries in M-B.
 */
const CHAMPIONS_MB_MEGA_TYPES: ReadonlyMap<string, readonly string[]> = new Map(
  [
    // Base Staraptor is Normal/Flying; Staraptor-Mega changes Normal → Fighting.
    ["Staraptor-Mega", ["Fighting", "Flying"]],
    // Base Barbaracle is Rock/Water; Barbaracle-Mega changes Water → Fighting.
    ["Barbaracle-Mega", ["Rock", "Fighting"]],
  ] as const
);

// =============================================================================
// Champions: VGC 2026 Reg M-B — custom ability descriptions
// =============================================================================

/**
 * Short UI descriptions for the 2 brand-new abilities introduced in M-B.
 * These are not present in @pkmn/dex and would otherwise show no description.
 */
const CHAMPIONS_MB_ABILITY_DESCS: ReadonlyMap<string, string> = new Map([
  [
    "Eelevate",
    "Immune to Ground-type moves; boosts a stat after it knocks out a target.",
  ],
  ["Fire Mane", "Boosts the power of this Pokemon's Fire-type moves by 50%."],
]);

// =============================================================================
// Bundle export
// =============================================================================

// =============================================================================
// Derived type exports (for union widening in format-legality)
// =============================================================================

/**
 * Mega species with a required stone introduced in Reg M-B.
 * Derived from `MEGA_MB_STONE_ENTRIES` so adding a row automatically widens
 * the type — format-legality.ts unions this with `MegaSpeciesWithStoneFromBundle`.
 */
export type MegaSpeciesWithStoneFromMBBundle =
  (typeof MEGA_MB_STONE_ENTRIES)[number][0];

/**
 * Mega species with a known ability introduced in Reg M-B.
 * Derived from `MEGA_MB_ABILITY_ENTRIES` — format-legality.ts unions this with
 * `MegaSpeciesWithAbilityFromBundle`.
 */
export type MegaSpeciesWithAbilityFromMBBundle =
  (typeof MEGA_MB_ABILITY_ENTRIES)[number][0];

// =============================================================================
// Bundle export
// =============================================================================

/**
 * Complete legality + calculator data bundle for Champions: VGC 2026 Reg M-B.
 *
 * M-B is a strict superset of M-A: all M-A species/items/moves/abilities
 * carry forward unchanged. Only the delta (new species, new megas, new items,
 * new mega stats, new type overrides, new ability descs) is defined here.
 */
export const REG_MB_BUNDLE: ChampionsRegBundle = {
  legalSpecies: CHAMPIONS_MB_LEGAL_SPECIES,
  legalItems: CHAMPIONS_MB_LEGAL_ITEMS,
  // M-B inherits M-A's move overrides and bans; no new move changes in M-B.
  moveOverrides: REG_MA_BUNDLE.moveOverrides,
  moveBanlist: REG_MA_BUNDLE.moveBanlist,
  // M-B inherits M-A's ability banlist; no new ability bans in M-B.
  abilityBanlist: REG_MA_BUNDLE.abilityBanlist,
  // Composite stone + ability arrays: M-A entries first, then M-B additions.
  megaStones: [...REG_MA_BUNDLE.megaStones, ...MEGA_MB_STONE_ENTRIES],
  megaAbilities: [...REG_MA_BUNDLE.megaAbilities, ...MEGA_MB_ABILITY_ENTRIES],
  // Composite stat map: M-A entries plus M-B new megas.
  megaStats: new Map([
    ...REG_MA_BUNDLE.megaStats,
    ...CHAMPIONS_MB_MEGA_STATS,
  ]),
  // M-B introduces 2 type overrides; M-A had none.
  megaTypes: CHAMPIONS_MB_MEGA_TYPES,
  // M-B introduces 2 custom ability descriptions.
  abilityDescs: CHAMPIONS_MB_ABILITY_DESCS,
};
