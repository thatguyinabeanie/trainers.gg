// =============================================================================
// calc-target-options.ts
//
// Static list of common meta targets for the defender select.
// Hardcodes the default EV spreads and abilities used in competitive play.
// =============================================================================

export interface CalcTarget {
  /** Display label shown in <option> */
  name: string;
  /** Canonical Showdown species name used with useCalcState resetDefenderForSpecies */
  species: string;
  ability: string;
  item: string;
  nature: string;
  evs: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  /** Optional default move set for the "Their moves" reverse-calc column. */
  moves?: [string, string, string, string];
}

/** Common VGC / Pokemon Champions meta defensive spread targets. */
export const CALC_TARGETS: CalcTarget[] = [
  {
    name: "Incineroar",
    species: "Incineroar",
    ability: "Intimidate",
    item: "Sitrus Berry",
    nature: "Careful",
    evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
    moves: ["Knock Off", "Flare Blitz", "U-turn", "Fake Out"],
  },
  {
    name: "Flutter Mane",
    species: "Flutter Mane",
    ability: "Protosynthesis",
    item: "Booster Energy",
    nature: "Timid",
    evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
    moves: ["Moonblast", "Shadow Ball", "Dazzling Gleam", "Icy Wind"],
  },
  {
    name: "Urshifu (Single Strike)",
    species: "Urshifu",
    ability: "Unseen Fist",
    item: "Choice Band",
    nature: "Jolly",
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 },
    moves: ["Wicked Blow", "Close Combat", "U-turn", "Sucker Punch"],
  },
  {
    name: "Urshifu (Rapid Strike)",
    species: "Urshifu-Rapid-Strike",
    ability: "Unseen Fist",
    item: "Choice Band",
    nature: "Jolly",
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 },
    moves: ["Surging Strikes", "Close Combat", "U-turn", "Aqua Jet"],
  },
  {
    name: "Iron Hands",
    species: "Iron Hands",
    ability: "Quark Drive",
    item: "Assault Vest",
    nature: "Brave",
    evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 4, spe: 0 },
    moves: ["Drain Punch", "Wild Charge", "Fake Out", "Heavy Slam"],
  },
  {
    name: "Calyrex-Shadow",
    species: "Calyrex-Shadow",
    ability: "As One (Spectrier)",
    item: "Focus Sash",
    nature: "Timid",
    evs: { hp: 0, atk: 0, def: 4, spa: 252, spd: 0, spe: 252 },
    moves: ["Astral Barrage", "Psyshock", "Nasty Plot", "Protect"],
  },
  {
    name: "Calyrex-Ice",
    species: "Calyrex-Ice",
    ability: "As One (Glastrier)",
    item: "Weakness Policy",
    nature: "Brave",
    evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },
  },
  {
    name: "Kyogre",
    species: "Kyogre",
    ability: "Drizzle",
    item: "Choice Scarf",
    nature: "Modest",
    evs: { hp: 0, atk: 0, def: 4, spa: 252, spd: 0, spe: 252 },
  },
  {
    name: "Groudon",
    species: "Groudon",
    ability: "Drought",
    item: "Protective Pads",
    nature: "Adamant",
    evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
  },
  {
    name: "Rillaboom",
    species: "Rillaboom",
    ability: "Grassy Surge",
    item: "Assault Vest",
    nature: "Adamant",
    evs: { hp: 196, atk: 124, def: 52, spa: 0, spd: 100, spe: 36 },
  },
  {
    name: "Tornadus",
    species: "Tornadus",
    ability: "Prankster",
    item: "Focus Sash",
    nature: "Timid",
    evs: { hp: 0, atk: 0, def: 4, spa: 252, spd: 0, spe: 252 },
  },
  {
    name: "Amoonguss",
    species: "Amoonguss",
    ability: "Regenerator",
    item: "Rocky Helmet",
    nature: "Calm",
    evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
  },
  {
    name: "Ogerpon-Wellspring",
    species: "Ogerpon-Wellspring",
    ability: "Water Absorb",
    item: "Wellspring Mask",
    nature: "Jolly",
    evs: { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 },
  },
  {
    name: "Farigiraf",
    species: "Farigiraf",
    ability: "Armor Tail",
    item: "Sitrus Berry",
    nature: "Calm",
    evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
  },
  {
    name: "Gholdengo",
    species: "Gholdengo",
    ability: "Good as Gold",
    item: "Choice Specs",
    nature: "Modest",
    evs: { hp: 0, atk: 0, def: 4, spa: 252, spd: 0, spe: 252 },
  },
  {
    name: "Miraidon",
    species: "Miraidon",
    ability: "Hadron Engine",
    item: "Choice Specs",
    nature: "Timid",
    evs: { hp: 0, atk: 0, def: 4, spa: 252, spd: 0, spe: 252 },
  },
  {
    name: "Koraidon",
    species: "Koraidon",
    ability: "Orichalcum Pulse",
    item: "Clear Amulet",
    nature: "Jolly",
    evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
  },
  {
    name: "Landorus-Therian",
    species: "Landorus-Therian",
    ability: "Intimidate",
    item: "Choice Scarf",
    nature: "Jolly",
    evs: { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 },
  },
  {
    name: "Chien-Pao",
    species: "Chien-Pao",
    ability: "Sword of Ruin",
    item: "Focus Sash",
    nature: "Jolly",
    evs: { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 },
  },
  {
    name: "Whimsicott",
    species: "Whimsicott",
    ability: "Prankster",
    item: "Eject Button",
    nature: "Timid",
    evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
  },
];
