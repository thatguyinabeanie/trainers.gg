/**
 * V1 hardcoded meta threats for damage calculations.
 * When meta pipeline is ready, this will be replaced by data from pokemon_usage_stats.
 */

export interface MetaThreat {
  species: string;
  ability: string;
  nature: string;
  evs: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  moves: string[];
}

/** Top 10 VGC meta threats with standard competitive sets (252/252 spreads). */
export const GEN9_VGC_META_THREATS: MetaThreat[] = [
  {
    species: "Incineroar",
    ability: "Intimidate",
    nature: "Careful",
    evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
    moves: ["Fake Out", "Flare Blitz", "Knock Off", "Parting Shot"],
  },
  {
    species: "Flutter Mane",
    ability: "Protosynthesis",
    nature: "Timid",
    evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
    moves: ["Moonblast", "Shadow Ball", "Dazzling Gleam", "Protect"],
  },
  {
    species: "Urshifu-Rapid-Strike",
    ability: "Unseen Fist",
    nature: "Jolly",
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 },
    moves: ["Surging Strikes", "Close Combat", "Aqua Jet", "Protect"],
  },
  {
    species: "Rillaboom",
    ability: "Grassy Surge",
    nature: "Adamant",
    evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 4, spe: 0 },
    moves: ["Grassy Glide", "Wood Hammer", "Fake Out", "U-turn"],
  },
  {
    species: "Landorus-Therian",
    ability: "Intimidate",
    nature: "Adamant",
    evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
    moves: ["Earthquake", "Rock Slide", "U-turn", "Protect"],
  },
  {
    species: "Tornadus",
    ability: "Prankster",
    nature: "Timid",
    evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
    moves: ["Bleakwind Storm", "Tailwind", "Rain Dance", "Protect"],
  },
  {
    species: "Kingambit",
    ability: "Defiant",
    nature: "Adamant",
    evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 4, spe: 0 },
    moves: ["Sucker Punch", "Iron Head", "Kowtow Cleave", "Protect"],
  },
  {
    species: "Ogerpon-Hearthflame",
    ability: "Mold Breaker",
    nature: "Jolly",
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 },
    moves: ["Ivy Cudgel", "Horn Leech", "Follow Me", "Spiky Shield"],
  },
  {
    species: "Amoonguss",
    ability: "Regenerator",
    nature: "Calm",
    evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
    moves: ["Spore", "Rage Powder", "Pollen Puff", "Protect"],
  },
  {
    species: "Chien-Pao",
    ability: "Sword of Ruin",
    nature: "Jolly",
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 },
    moves: ["Ice Spinner", "Sacred Sword", "Sucker Punch", "Protect"],
  },
];
