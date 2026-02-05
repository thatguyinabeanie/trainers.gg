/**
 * Team Generator
 *
 * Generates realistic Regulation F VGC teams for seed data.
 * Each team has 6 Pokemon with valid movesets, abilities, items, EVs, and natures.
 *
 * Rules:
 * - No duplicate species on a team
 * - No duplicate held items on a team
 * - 0 or 1 restricted legendary per team
 * - EVs total <= 510, max 252 per stat
 * - Level 50 for all Pokemon
 */

import {
  createSeededRandom,
  deterministicShuffle,
} from "../utils/deterministic.js";
import { type GeneratedAlt } from "./users.js";
import { type GeneratedTournamentRegistration } from "./tournaments.js";

// ============================================================================
// Types
// ============================================================================

export interface GeneratedTeam {
  id: number;
  name: string;
  createdByAltId: number;
  isPublic: boolean;
}

export interface GeneratedPokemon {
  id: number;
  species: string;
  nickname: string | null;
  level: number;
  nature: string;
  ability: string;
  heldItem: string | null;
  gender: "Male" | "Female" | null;
  isShiny: boolean;
  move1: string;
  move2: string | null;
  move3: string | null;
  move4: string | null;
  evHp: number;
  evAttack: number;
  evDefense: number;
  evSpecialAttack: number;
  evSpecialDefense: number;
  evSpeed: number;
  teraType: string | null;
}

export interface GeneratedTeamPokemon {
  teamId: number;
  pokemonId: number;
  teamPosition: number;
}

// ============================================================================
// Pokemon Data Pool — Competitive Regulation F VGC
// ============================================================================

interface PokemonTemplate {
  species: string;
  abilities: string[];
  moves: string[][];
  // Each entry is a set of 4 moves that form a valid moveset
  items: string[];
  evSpreads: [number, number, number, number, number, number][];
  natures: string[];
  teraTypes: string[];
  gender: "Male" | "Female" | null;
  isRestricted: boolean;
}

const POKEMON_POOL: PokemonTemplate[] = [
  // --- Restricted legends (0-1 per team) ---
  {
    species: "Koraidon",
    abilities: ["Orichalcum Pulse"],
    moves: [
      ["Collision Course", "Flare Blitz", "Dragon Claw", "Protect"],
      ["Collision Course", "Flare Blitz", "Close Combat", "Protect"],
    ],
    items: ["Clear Amulet", "Booster Energy"],
    evSpreads: [
      [4, 252, 0, 0, 0, 252],
      [252, 252, 0, 0, 0, 4],
    ],
    natures: ["Jolly", "Adamant"],
    teraTypes: ["Fire", "Fighting", "Grass"],
    gender: null,
    isRestricted: true,
  },
  {
    species: "Miraidon",
    abilities: ["Hadron Engine"],
    moves: [
      ["Electro Drift", "Draco Meteor", "Volt Switch", "Protect"],
      ["Electro Drift", "Draco Meteor", "Parabolic Charge", "Protect"],
    ],
    items: ["Choice Specs", "Booster Energy", "Life Orb"],
    evSpreads: [
      [4, 0, 0, 252, 0, 252],
      [252, 0, 0, 252, 0, 4],
    ],
    natures: ["Timid", "Modest"],
    teraTypes: ["Electric", "Fairy", "Water"],
    gender: null,
    isRestricted: true,
  },
  {
    species: "Calyrex-Shadow",
    abilities: ["As One"],
    moves: [
      ["Astral Barrage", "Psyshock", "Nasty Plot", "Protect"],
      ["Astral Barrage", "Draining Kiss", "Nasty Plot", "Protect"],
    ],
    items: ["Focus Sash", "Choice Specs", "Life Orb"],
    evSpreads: [
      [4, 0, 0, 252, 0, 252],
      [252, 0, 0, 252, 0, 4],
    ],
    natures: ["Timid", "Modest"],
    teraTypes: ["Fairy", "Dark", "Ghost"],
    gender: null,
    isRestricted: true,
  },
  {
    species: "Calyrex-Ice",
    abilities: ["As One"],
    moves: [
      ["Glacial Lance", "High Horsepower", "Trick Room", "Protect"],
      ["Glacial Lance", "Close Combat", "Swords Dance", "Protect"],
    ],
    items: ["Clear Amulet", "Life Orb"],
    evSpreads: [
      [252, 252, 0, 0, 4, 0],
      [252, 252, 4, 0, 0, 0],
    ],
    natures: ["Adamant", "Brave"],
    teraTypes: ["Ice", "Fighting", "Steel"],
    gender: null,
    isRestricted: true,
  },

  // --- Non-restricted Pokemon ---
  {
    species: "Flutter Mane",
    abilities: ["Protosynthesis"],
    moves: [
      ["Moonblast", "Shadow Ball", "Dazzling Gleam", "Protect"],
      ["Moonblast", "Shadow Ball", "Icy Wind", "Protect"],
    ],
    items: ["Booster Energy", "Choice Specs", "Focus Sash"],
    evSpreads: [
      [4, 0, 0, 252, 0, 252],
      [252, 0, 4, 252, 0, 0],
    ],
    natures: ["Timid", "Modest"],
    teraTypes: ["Fairy", "Ghost", "Stellar"],
    gender: null,
    isRestricted: false,
  },
  {
    species: "Iron Hands",
    abilities: ["Quark Drive"],
    moves: [
      ["Drain Punch", "Wild Charge", "Fake Out", "Protect"],
      ["Close Combat", "Thunder Punch", "Fake Out", "Protect"],
    ],
    items: ["Assault Vest", "Booster Energy", "Leftovers"],
    evSpreads: [
      [252, 252, 0, 0, 4, 0],
      [252, 252, 4, 0, 0, 0],
    ],
    natures: ["Adamant", "Brave"],
    teraTypes: ["Grass", "Water", "Electric"],
    gender: null,
    isRestricted: false,
  },
  {
    species: "Amoonguss",
    abilities: ["Regenerator"],
    moves: [
      ["Spore", "Rage Powder", "Pollen Puff", "Protect"],
      ["Spore", "Rage Powder", "Sludge Bomb", "Protect"],
    ],
    items: ["Sitrus Berry", "Rocky Helmet", "Coba Berry"],
    evSpreads: [
      [252, 0, 128, 0, 128, 0],
      [252, 0, 252, 0, 4, 0],
    ],
    natures: ["Calm", "Bold", "Relaxed"],
    teraTypes: ["Water", "Steel", "Grass"],
    gender: "Male",
    isRestricted: false,
  },
  {
    species: "Incineroar",
    abilities: ["Intimidate"],
    moves: [
      ["Flare Blitz", "Knock Off", "Fake Out", "Parting Shot"],
      ["Flare Blitz", "Darkest Lariat", "Fake Out", "Protect"],
    ],
    items: ["Safety Goggles", "Sitrus Berry", "Assault Vest"],
    evSpreads: [
      [252, 4, 0, 0, 252, 0],
      [252, 0, 4, 0, 252, 0],
    ],
    natures: ["Careful", "Adamant", "Impish"],
    teraTypes: ["Water", "Grass", "Ghost"],
    gender: "Male",
    isRestricted: false,
  },
  {
    species: "Rillaboom",
    abilities: ["Grassy Surge"],
    moves: [
      ["Grassy Glide", "Wood Hammer", "Fake Out", "U-turn"],
      ["Grassy Glide", "Knock Off", "Fake Out", "Protect"],
    ],
    items: ["Miracle Seed", "Assault Vest", "Choice Band"],
    evSpreads: [
      [252, 252, 0, 0, 4, 0],
      [4, 252, 0, 0, 0, 252],
    ],
    natures: ["Adamant", "Jolly"],
    teraTypes: ["Grass", "Fire", "Poison"],
    gender: "Male",
    isRestricted: false,
  },
  {
    species: "Urshifu-Rapid-Strike",
    abilities: ["Unseen Fist"],
    moves: [
      ["Surging Strikes", "Close Combat", "Aqua Jet", "Protect"],
      ["Surging Strikes", "Close Combat", "Detect", "U-turn"],
    ],
    items: ["Focus Sash", "Choice Scarf", "Mystic Water"],
    evSpreads: [
      [4, 252, 0, 0, 0, 252],
      [252, 252, 0, 0, 4, 0],
    ],
    natures: ["Jolly", "Adamant"],
    teraTypes: ["Water", "Poison", "Stellar"],
    gender: "Male",
    isRestricted: false,
  },
  {
    species: "Landorus-Therian",
    abilities: ["Intimidate"],
    moves: [
      ["Earthquake", "Rock Slide", "U-turn", "Protect"],
      ["Earthquake", "Fly", "Swords Dance", "Protect"],
    ],
    items: ["Choice Scarf", "Life Orb", "Assault Vest"],
    evSpreads: [
      [4, 252, 0, 0, 0, 252],
      [252, 252, 0, 0, 0, 4],
    ],
    natures: ["Jolly", "Adamant"],
    teraTypes: ["Flying", "Steel", "Water"],
    gender: "Male",
    isRestricted: false,
  },
  {
    species: "Tornadus",
    abilities: ["Prankster"],
    moves: [
      ["Tailwind", "Bleakwind Storm", "Rain Dance", "Protect"],
      ["Tailwind", "Hurricane", "Taunt", "Protect"],
    ],
    items: ["Focus Sash", "Covert Cloak", "Mental Herb"],
    evSpreads: [
      [4, 0, 0, 252, 0, 252],
      [252, 0, 4, 0, 0, 252],
    ],
    natures: ["Timid", "Hasty"],
    teraTypes: ["Flying", "Ghost", "Steel"],
    gender: "Male",
    isRestricted: false,
  },
  {
    species: "Ogerpon-Hearthflame",
    abilities: ["Mold Breaker"],
    moves: [
      ["Ivy Cudgel", "Horn Leech", "Follow Me", "Spiky Shield"],
      ["Ivy Cudgel", "Wood Hammer", "Stomping Tantrum", "Spiky Shield"],
    ],
    items: ["Hearthflame Mask"],
    evSpreads: [
      [4, 252, 0, 0, 0, 252],
      [252, 252, 4, 0, 0, 0],
    ],
    natures: ["Jolly", "Adamant"],
    teraTypes: ["Fire"],
    gender: "Female",
    isRestricted: false,
  },
  {
    species: "Ogerpon-Wellspring",
    abilities: ["Water Absorb"],
    moves: [
      ["Ivy Cudgel", "Horn Leech", "Follow Me", "Spiky Shield"],
      ["Ivy Cudgel", "Wood Hammer", "Stomping Tantrum", "Spiky Shield"],
    ],
    items: ["Wellspring Mask"],
    evSpreads: [
      [4, 252, 0, 0, 0, 252],
      [252, 252, 4, 0, 0, 0],
    ],
    natures: ["Jolly", "Adamant"],
    teraTypes: ["Water"],
    gender: "Female",
    isRestricted: false,
  },
  {
    species: "Chi-Yu",
    abilities: ["Beads of Ruin"],
    moves: [
      ["Heat Wave", "Dark Pulse", "Snarl", "Protect"],
      ["Overheat", "Dark Pulse", "Icy Wind", "Protect"],
    ],
    items: ["Choice Specs", "Focus Sash", "Safety Goggles"],
    evSpreads: [
      [4, 0, 0, 252, 0, 252],
      [252, 0, 4, 252, 0, 0],
    ],
    natures: ["Timid", "Modest"],
    teraTypes: ["Dark", "Ghost", "Fairy"],
    gender: "Male",
    isRestricted: false,
  },
  {
    species: "Chien-Pao",
    abilities: ["Sword of Ruin"],
    moves: [
      ["Ice Spinner", "Sacred Sword", "Sucker Punch", "Protect"],
      ["Icicle Crash", "Crunch", "Sacred Sword", "Protect"],
    ],
    items: ["Focus Sash", "Life Orb", "Clear Amulet"],
    evSpreads: [
      [4, 252, 0, 0, 0, 252],
      [252, 252, 0, 0, 0, 4],
    ],
    natures: ["Jolly", "Adamant"],
    teraTypes: ["Ice", "Ghost", "Dark"],
    gender: "Male",
    isRestricted: false,
  },
  {
    species: "Whimsicott",
    abilities: ["Prankster"],
    moves: [
      ["Tailwind", "Moonblast", "Encore", "Protect"],
      ["Tailwind", "Helping Hand", "Taunt", "Moonblast"],
    ],
    items: ["Focus Sash", "Mental Herb", "Covert Cloak"],
    evSpreads: [
      [4, 0, 0, 252, 0, 252],
      [252, 0, 0, 4, 0, 252],
    ],
    natures: ["Timid", "Bold"],
    teraTypes: ["Steel", "Fairy", "Ghost"],
    gender: "Female",
    isRestricted: false,
  },
  {
    species: "Pelipper",
    abilities: ["Drizzle"],
    moves: [
      ["Hurricane", "Weather Ball", "Tailwind", "Protect"],
      ["Scald", "Hurricane", "Tailwind", "Protect"],
    ],
    items: ["Focus Sash", "Damp Rock", "Safety Goggles"],
    evSpreads: [
      [252, 0, 4, 252, 0, 0],
      [252, 0, 0, 252, 4, 0],
    ],
    natures: ["Modest", "Calm"],
    teraTypes: ["Water", "Ice", "Ghost"],
    gender: "Male",
    isRestricted: false,
  },
  {
    species: "Archaludon",
    abilities: ["Stamina"],
    moves: [
      ["Body Press", "Flash Cannon", "Electro Shot", "Protect"],
      ["Body Press", "Flash Cannon", "Iron Defense", "Protect"],
    ],
    items: ["Assault Vest", "Leftovers", "Power Herb"],
    evSpreads: [
      [252, 0, 252, 0, 4, 0],
      [252, 0, 4, 252, 0, 0],
    ],
    natures: ["Bold", "Modest"],
    teraTypes: ["Water", "Flying", "Electric"],
    gender: "Male",
    isRestricted: false,
  },
  {
    species: "Gholdengo",
    abilities: ["Good as Gold"],
    moves: [
      ["Make It Rain", "Shadow Ball", "Nasty Plot", "Protect"],
      ["Make It Rain", "Shadow Ball", "Trick", "Protect"],
    ],
    items: ["Choice Specs", "Focus Sash", "Air Balloon"],
    evSpreads: [
      [4, 0, 0, 252, 0, 252],
      [252, 0, 0, 252, 4, 0],
    ],
    natures: ["Timid", "Modest"],
    teraTypes: ["Flying", "Water", "Ghost"],
    gender: null,
    isRestricted: false,
  },
  {
    species: "Kingambit",
    abilities: ["Supreme Overlord"],
    moves: [
      ["Sucker Punch", "Iron Head", "Kowtow Cleave", "Protect"],
      ["Sucker Punch", "Iron Head", "Swords Dance", "Protect"],
    ],
    items: ["Black Glasses", "Assault Vest", "Lum Berry"],
    evSpreads: [
      [252, 252, 0, 0, 4, 0],
      [252, 252, 4, 0, 0, 0],
    ],
    natures: ["Adamant", "Brave"],
    teraTypes: ["Dark", "Flying", "Ghost"],
    gender: "Male",
    isRestricted: false,
  },
  {
    species: "Farigiraf",
    abilities: ["Armor Tail"],
    moves: [
      ["Trick Room", "Psychic", "Helping Hand", "Protect"],
      ["Trick Room", "Hyper Voice", "Psychic", "Protect"],
    ],
    items: ["Mental Herb", "Sitrus Berry", "Safety Goggles"],
    evSpreads: [
      [252, 0, 4, 252, 0, 0],
      [252, 0, 252, 0, 4, 0],
    ],
    natures: ["Quiet", "Modest"],
    teraTypes: ["Fairy", "Ghost", "Normal"],
    gender: "Female",
    isRestricted: false,
  },
  {
    species: "Iron Boulder",
    abilities: ["Quark Drive"],
    moves: [
      ["Mighty Cleave", "Close Combat", "Zen Headbutt", "Protect"],
      ["Mighty Cleave", "Sacred Sword", "Psycho Cut", "Protect"],
    ],
    items: ["Booster Energy", "Focus Sash", "Clear Amulet"],
    evSpreads: [
      [4, 252, 0, 0, 0, 252],
      [252, 252, 0, 0, 0, 4],
    ],
    natures: ["Jolly", "Adamant"],
    teraTypes: ["Rock", "Fighting", "Stellar"],
    gender: null,
    isRestricted: false,
  },
  {
    species: "Entei",
    abilities: ["Inner Focus"],
    moves: [
      ["Sacred Fire", "Extreme Speed", "Stomping Tantrum", "Protect"],
      ["Sacred Fire", "Stone Edge", "Extreme Speed", "Protect"],
    ],
    items: ["Assault Vest", "Choice Band", "Charcoal"],
    evSpreads: [
      [4, 252, 0, 0, 0, 252],
      [252, 252, 0, 0, 4, 0],
    ],
    natures: ["Jolly", "Adamant"],
    teraTypes: ["Normal", "Grass", "Ground"],
    gender: null,
    isRestricted: false,
  },
  {
    species: "Porygon2",
    abilities: ["Download"],
    moves: [
      ["Trick Room", "Ice Beam", "Recover", "Thunderbolt"],
      ["Trick Room", "Tri Attack", "Eerie Impulse", "Recover"],
    ],
    items: ["Eviolite"],
    evSpreads: [
      [252, 0, 128, 0, 128, 0],
      [252, 0, 252, 0, 4, 0],
    ],
    natures: ["Calm", "Sassy", "Relaxed"],
    teraTypes: ["Ghost", "Fairy", "Water"],
    gender: null,
    isRestricted: false,
  },
  {
    species: "Iron Crown",
    abilities: ["Quark Drive"],
    moves: [
      ["Tachyon Cutter", "Focus Blast", "Expanding Force", "Protect"],
      ["Tachyon Cutter", "Calm Mind", "Psyshock", "Protect"],
    ],
    items: ["Booster Energy", "Life Orb", "Focus Sash"],
    evSpreads: [
      [4, 0, 0, 252, 0, 252],
      [252, 0, 4, 252, 0, 0],
    ],
    natures: ["Timid", "Modest"],
    teraTypes: ["Steel", "Psychic", "Fairy"],
    gender: null,
    isRestricted: false,
  },
  {
    species: "Tsareena",
    abilities: ["Queenly Majesty"],
    moves: [
      ["Power Whip", "High Jump Kick", "Triple Axel", "Protect"],
      ["Power Whip", "U-turn", "Rapid Spin", "Protect"],
    ],
    items: ["Wide Lens", "Focus Sash", "Assault Vest"],
    evSpreads: [
      [4, 252, 0, 0, 0, 252],
      [252, 252, 0, 0, 4, 0],
    ],
    natures: ["Jolly", "Adamant"],
    teraTypes: ["Grass", "Ice", "Poison"],
    gender: "Female",
    isRestricted: false,
  },
  {
    species: "Arcanine",
    abilities: ["Intimidate"],
    moves: [
      ["Flare Blitz", "Extreme Speed", "Will-O-Wisp", "Protect"],
      ["Flare Blitz", "Close Combat", "Snarl", "Protect"],
    ],
    items: ["Sitrus Berry", "Safety Goggles", "Assault Vest"],
    evSpreads: [
      [252, 4, 0, 0, 252, 0],
      [252, 0, 252, 0, 4, 0],
    ],
    natures: ["Careful", "Impish", "Adamant"],
    teraTypes: ["Water", "Ghost", "Grass"],
    gender: "Male",
    isRestricted: false,
  },
];

// ============================================================================
// Team Generation
// ============================================================================

/**
 * Build a single VGC team of 6 Pokemon.
 * No duplicate species, no duplicate held items, 0-1 restricted.
 */
function buildTeam(
  seed: string,
  teamId: number,
  altId: number,
  teamName: string
): {
  team: GeneratedTeam;
  pokemon: GeneratedPokemon[];
  teamPokemon: GeneratedTeamPokemon[];
  nextPokemonId: number;
} {
  const random = createSeededRandom(seed);
  const pokemon: GeneratedPokemon[] = [];
  const teamPokemonLinks: GeneratedTeamPokemon[] = [];

  // Decide how many restricted legends (0 or 1)
  const useRestricted = random() < 0.7; // 70% of teams use 1 restricted

  const restricted = POKEMON_POOL.filter((p) => p.isRestricted);
  const nonRestricted = POKEMON_POOL.filter((p) => !p.isRestricted);

  // Shuffle both pools
  const shuffledRestricted = deterministicShuffle(restricted, `${seed}-res`);
  const shuffledNonRestricted = deterministicShuffle(
    nonRestricted,
    `${seed}-non`
  );

  // Pick team members
  const teamMembers: PokemonTemplate[] = [];
  const usedItems = new Set<string>();

  if (useRestricted && shuffledRestricted.length > 0) {
    teamMembers.push(shuffledRestricted[0]!);
  }

  // Fill remaining slots from non-restricted
  for (const candidate of shuffledNonRestricted) {
    if (teamMembers.length >= 6) break;
    // No duplicate species
    if (teamMembers.some((m) => m.species === candidate.species)) continue;
    teamMembers.push(candidate);
  }

  // If we still don't have 6 (unlikely), fill from restricted
  if (teamMembers.length < 6 && !useRestricted) {
    for (const candidate of shuffledRestricted) {
      if (teamMembers.length >= 6) break;
      if (teamMembers.some((m) => m.species === candidate.species)) continue;
      teamMembers.push(candidate);
    }
  }

  // Global pokemon ID counter tracked externally
  let pokemonId = teamId * 100; // Give each team a block of IDs

  // Create Pokemon from templates
  for (let pos = 0; pos < teamMembers.length && pos < 6; pos++) {
    const template = teamMembers[pos]!;
    const pokeSeed = `${seed}-pokemon-${pos}`;
    const pokeRandom = createSeededRandom(pokeSeed);

    // Pick moveset
    const movesetIndex = Math.floor(pokeRandom() * template.moves.length);
    const moveset = template.moves[movesetIndex]!;

    // Pick ability
    const abilityIndex = Math.floor(pokeRandom() * template.abilities.length);
    const ability = template.abilities[abilityIndex]!;

    // Pick item (no duplicates on team)
    let item: string | null = null;
    const shuffledItems = deterministicShuffle(
      template.items,
      `${pokeSeed}-item`
    );
    for (const candidate of shuffledItems) {
      if (!usedItems.has(candidate)) {
        item = candidate;
        usedItems.add(candidate);
        break;
      }
    }

    // Pick EVs
    const evIndex = Math.floor(pokeRandom() * template.evSpreads.length);
    const evs = template.evSpreads[evIndex]!;

    // Pick nature
    const natureIndex = Math.floor(pokeRandom() * template.natures.length);
    const nature = template.natures[natureIndex]!;

    // Pick tera type
    const teraIndex = Math.floor(pokeRandom() * template.teraTypes.length);
    const teraType = template.teraTypes[teraIndex]!;

    // Shiny chance (5%)
    const isShiny = pokeRandom() < 0.05;

    const currentPokemonId = pokemonId++;

    pokemon.push({
      id: currentPokemonId,
      species: template.species,
      nickname: null,
      level: 50,
      nature,
      ability,
      heldItem: item,
      gender: template.gender,
      isShiny,
      move1: moveset[0]!,
      move2: moveset[1] ?? null,
      move3: moveset[2] ?? null,
      move4: moveset[3] ?? null,
      evHp: evs[0],
      evAttack: evs[1],
      evDefense: evs[2],
      evSpecialAttack: evs[3],
      evSpecialDefense: evs[4],
      evSpeed: evs[5],
      teraType,
    });

    teamPokemonLinks.push({
      teamId,
      pokemonId: currentPokemonId,
      teamPosition: pos + 1,
    });
  }

  const team: GeneratedTeam = {
    id: teamId,
    name: teamName,
    createdByAltId: altId,
    isPublic: false,
  };

  return {
    team,
    pokemon,
    teamPokemon: teamPokemonLinks,
    nextPokemonId: pokemonId,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate teams for checked-in registrations.
 *
 * Returns teams, pokemon, team_pokemon records, and updated registrations
 * with team_id, team_submitted_at, and team_locked fields.
 */
export function generateTeamsForRegistrations(
  registrations: GeneratedTournamentRegistration[],
  alts: GeneratedAlt[]
): {
  teams: GeneratedTeam[];
  pokemon: GeneratedPokemon[];
  teamPokemon: GeneratedTeamPokemon[];
  /** Map from registration ID to team ID */
  registrationTeamMap: Map<number, number>;
} {
  const teams: GeneratedTeam[] = [];
  const allPokemon: GeneratedPokemon[] = [];
  const allTeamPokemon: GeneratedTeamPokemon[] = [];
  const registrationTeamMap = new Map<number, number>();

  let teamId = 1;

  // Build alt lookup
  const altById = new Map<number, GeneratedAlt>();
  for (const alt of alts) {
    altById.set(alt.id, alt);
  }

  // Generate a team for each checked-in registration
  const checkedInRegs = registrations.filter((r) => r.status === "checked_in");

  for (const reg of checkedInRegs) {
    const alt = altById.get(reg.altId);
    if (!alt) continue;

    const currentTeamId = teamId++;
    const teamName = `${alt.displayName}'s Team`;
    const seed = `team-${reg.tournamentId}-${reg.altId}`;

    const result = buildTeam(seed, currentTeamId, reg.altId, teamName);

    teams.push(result.team);
    allPokemon.push(...result.pokemon);
    allTeamPokemon.push(...result.teamPokemon);
    registrationTeamMap.set(reg.id, currentTeamId);
  }

  return {
    teams,
    pokemon: allPokemon,
    teamPokemon: allTeamPokemon,
    registrationTeamMap,
  };
}
