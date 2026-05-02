import {
  getLegalMoves,
  getLearnableMoves,
  legalSetOrPermissive,
} from "@trainers/pokemon";

// =============================================================================
// Types
// =============================================================================

export type RoleGroup =
  | "damage-type"
  | "speed-control"
  | "status"
  | "stat-changes"
  | "defensive"
  | "field"
  | "utility";

/** Literal union of all 26 canonical role IDs. */
export type RoleId =
  | "spread"
  | "priority"
  | "multi-hit"
  | "trick-room"
  | "tailwind"
  | "speed-drop"
  | "speed-boost"
  | "sleep"
  | "paralysis"
  | "burn"
  | "poison"
  | "boost-self"
  | "boost-ally"
  | "drop-atk"
  | "drop-spa"
  | "screens"
  | "protect"
  | "healing"
  | "drain"
  | "weather"
  | "terrain"
  | "hazards"
  | "redirection"
  | "pivot"
  | "flinching"
  | "disruption";

export interface RolePreset {
  id: RoleId;
  label: string;
  group: RoleGroup;
  /** Moves that ARE this role. */
  moves?: string[];
  /** Abilities that IMPLY this role (used only for species fit). */
  abilities?: string[];
}

// =============================================================================
// Registry — 26 roles across 7 groups
// =============================================================================

export const ROLE_PRESETS: RolePreset[] = [
  // Damage Type
  {
    id: "spread",
    label: "Spread",
    group: "damage-type",
    moves: [
      "Acid",
      "Air Cutter",
      "Astral Barrage",
      "Bleakwind Storm",
      "Blizzard",
      "Boomburst",
      "Breaking Swipe",
      "Brutal Swing",
      "Bulldoze",
      "Burning Jealousy",
      "Clanging Scales",
      "Dazzling Gleam",
      "Diamond Storm",
      "Disarming Voice",
      "Discharge",
      "Dragon Energy",
      "Earthquake",
      "Electroweb",
      "Eruption",
      "Explosion",
      "Fiery Wrath",
      "Glacial Lance",
      "Glaciate",
      "Heat Wave",
      "Hyper Voice",
      "Icy Wind",
      "Incinerate",
      "Lava Plume",
      "Make It Rain",
      "Matcha Gotcha",
      "Misty Explosion",
      "Mortal Spin",
      "Muddy Water",
      "Origin Pulse",
      "Overdrive",
      "Parabolic Charge",
      "Petal Blizzard",
      "Powder Snow",
      "Precipice Blades",
      "Razor Leaf",
      "Relic Song",
      "Rock Slide",
      "Sandsear Storm",
      "Self-Destruct",
      "Sludge Wave",
      "Snarl",
      "Sparkling Aria",
      "Springtide Storm",
      "Struggle Bug",
      "Surf",
      "Swift",
      "Twister",
      "Water Spout",
      "Wildbolt Storm",
    ],
  },
  {
    id: "priority",
    label: "Priority",
    group: "damage-type",
    moves: [
      "Accelerock",
      "Aqua Jet",
      "Bullet Punch",
      "Extreme Speed",
      "Fake Out",
      "Feint",
      "First Impression",
      "Ice Shard",
      "Jet Punch",
      "Mach Punch",
      "Quick Attack",
      "Shadow Sneak",
      "Sucker Punch",
      "Thunderclap",
      "Upper Hand",
      "Vacuum Wave",
      "Water Shuriken",
    ],
  },
  {
    id: "multi-hit",
    label: "Multi-hit",
    group: "damage-type",
    moves: [
      "Arm Thrust",
      "Bone Rush",
      "Bullet Seed",
      "Double Hit",
      "Double Kick",
      "Dragon Darts",
      "Dual Wingbeat",
      "Fury Attack",
      "Fury Swipes",
      "Icicle Spear",
      "Pin Missile",
      "Population Bomb",
      "Rock Blast",
      "Scale Shot",
      "Surging Strikes",
      "Tachyon Cutter",
      "Tail Slap",
      "Triple Axel",
      "Triple Dive",
      "Triple Kick",
      "Twin Beam",
      "Water Shuriken",
    ],
  },

  // Speed Control
  {
    id: "trick-room",
    label: "Trick Room",
    group: "speed-control",
    moves: ["Trick Room"],
  },
  {
    id: "tailwind",
    label: "Tailwind",
    group: "speed-control",
    moves: ["Tailwind"],
  },
  {
    id: "speed-drop",
    label: "Speed Drop",
    group: "speed-control",
    moves: [
      "Bleakwind Storm",
      "Body Slam",
      "Bolt Strike",
      "Bounce",
      "Bubble Beam",
      "Bulldoze",
      "Combat Torque",
      "Cotton Spore",
      "Discharge",
      "Dragon Breath",
      "Drum Beating",
      "Electroweb",
      "Force Palm",
      "Freeze Shock",
      "Glaciate",
      "Glare",
      "Icy Wind",
      "Lick",
      "Low Sweep",
      "Mud Shot",
      "Nuzzle",
      "Pounce",
      "Rock Tomb",
      "Scary Face",
      "Spark",
      "Sticky Web",
      "String Shot",
      "Stun Spore",
      "Tar Shot",
      "Thunder",
      "Thunder Punch",
      "Thunder Shock",
      "Thunder Wave",
      "Thunderbolt",
      "Toxic Thread",
      "Volt Tackle",
      "Wildbolt Storm",
      "Zap Cannon",
    ],
  },
  {
    id: "speed-boost",
    label: "Speed Boost",
    group: "speed-control",
    moves: [
      "Agility",
      "Ancient Power",
      "Aqua Step",
      "Aura Wheel",
      "Clangorous Soul",
      "Dragon Dance",
      "Esper Wing",
      "Fillet Away",
      "Flame Charge",
      "No Retreat",
      "Quiver Dance",
      "Rapid Spin",
      "Rock Polish",
      "Shell Smash",
      "Shift Gear",
      "Trailblaze",
      "Victory Dance",
    ],
  },

  // Status
  {
    id: "sleep",
    label: "Sleep",
    group: "status",
    moves: [
      "Dark Void",
      "Hypnosis",
      "Relic Song",
      "Sing",
      "Sleep Powder",
      "Spore",
      "Wicked Torque",
      "Yawn",
    ],
  },
  {
    id: "paralysis",
    label: "Paralysis",
    group: "status",
    moves: [
      "Body Slam",
      "Bolt Strike",
      "Bounce",
      "Combat Torque",
      "Discharge",
      "Dragon Breath",
      "Force Palm",
      "Freeze Shock",
      "Glare",
      "Lick",
      "Nuzzle",
      "Spark",
      "Stun Spore",
      "Thunder",
      "Thunder Punch",
      "Thunder Shock",
      "Thunder Wave",
      "Thunderbolt",
      "Volt Tackle",
      "Wildbolt Storm",
      "Zap Cannon",
    ],
  },
  {
    id: "burn",
    label: "Burn",
    group: "status",
    moves: [
      "Blaze Kick",
      "Blazing Torque",
      "Blue Flare",
      "Ember",
      "Fire Blast",
      "Fire Punch",
      "Flame Wheel",
      "Flamethrower",
      "Flare Blitz",
      "Heat Wave",
      "Ice Burn",
      "Infernal Parade",
      "Inferno",
      "Lava Plume",
      "Matcha Gotcha",
      "Pyro Ball",
      "Sacred Fire",
      "Sandsear Storm",
      "Scald",
      "Scorching Sands",
      "Steam Eruption",
      "Will-O-Wisp",
    ],
  },
  {
    id: "poison",
    label: "Poison",
    group: "status",
    moves: [
      "Barb Barrage",
      "Cross Poison",
      "Gunk Shot",
      "Malignant Chain",
      "Mortal Spin",
      "Noxious Torque",
      "Poison Fang",
      "Poison Gas",
      "Poison Jab",
      "Poison Powder",
      "Poison Sting",
      "Poison Tail",
      "Shell Side Arm",
      "Sludge",
      "Sludge Bomb",
      "Sludge Wave",
      "Smog",
      "Toxic",
      "Toxic Spikes",
      "Toxic Thread",
    ],
  },

  // Stat Changes
  {
    id: "boost-self",
    label: "Boost Self",
    group: "stat-changes",
    moves: [
      "Acid Armor",
      "Agility",
      "Amnesia",
      "Ancient Power",
      "Aqua Step",
      "Aura Wheel",
      "Belly Drum",
      "Bulk Up",
      "Calm Mind",
      "Charge",
      "Charge Beam",
      "Clangorous Soul",
      "Coil",
      "Cosmic Power",
      "Cotton Guard",
      "Curse",
      "Defend Order",
      "Defense Curl",
      "Diamond Storm",
      "Double Team",
      "Dragon Dance",
      "Esper Wing",
      "Fiery Dance",
      "Fillet Away",
      "Flame Charge",
      "Growth",
      "Harden",
      "Hone Claws",
      "Howl",
      "Iron Defense",
      "Metal Claw",
      "Meteor Mash",
      "Minimize",
      "Mystical Power",
      "Nasty Plot",
      "No Retreat",
      "Power Trick",
      "Psyshield Bash",
      "Quiver Dance",
      "Rapid Spin",
      "Rock Polish",
      "Shell Smash",
      "Shelter",
      "Shift Gear",
      "Steel Wing",
      "Swords Dance",
      "Tail Glow",
      "Tidy Up",
      "Torch Song",
      "Trailblaze",
      "Victory Dance",
      "Withdraw",
      "Work Up",
    ],
  },
  {
    id: "boost-ally",
    label: "Boost Ally",
    group: "stat-changes",
    moves: [
      "Acupressure",
      "After You",
      "Ally Switch",
      "Aromatic Mist",
      "Coaching",
      "Decorate",
      "Dragon Cheer",
      "Floral Healing",
      "Heal Pulse",
      "Helping Hand",
      "Howl",
      "Life Dew",
      "Magnetic Flux",
      "Pollen Puff",
    ],
  },
  {
    id: "drop-atk",
    label: "Drop Atk",
    group: "stat-changes",
    moves: [
      "Aurora Beam",
      "Baby-Doll Eyes",
      "Bitter Malice",
      "Breaking Swipe",
      "Charm",
      "Chilling Water",
      "Feather Dance",
      "Growl",
      "Lunge",
      "Memento",
      "Noble Roar",
      "Parting Shot",
      "Play Nice",
      "Play Rough",
      "Springtide Storm",
      "Strength Sap",
      "Tearful Look",
      "Tickle",
      "Trop Kick",
    ],
    abilities: ["Intimidate"],
  },
  {
    id: "drop-spa",
    label: "Drop SpA",
    group: "stat-changes",
    moves: [
      "Confide",
      "Eerie Impulse",
      "Memento",
      "Mist Ball",
      "Moonblast",
      "Mystical Fire",
      "Noble Roar",
      "Parting Shot",
      "Skitter Smack",
      "Snarl",
      "Spirit Break",
      "Struggle Bug",
      "Tearful Look",
    ],
  },

  // Defensive
  {
    id: "screens",
    label: "Screens",
    group: "defensive",
    moves: ["Light Screen", "Reflect", "Aurora Veil"],
  },
  {
    id: "protect",
    label: "Protect",
    group: "defensive",
    moves: [
      "Baneful Bunker",
      "Burning Bulwark",
      "Detect",
      "Endure",
      "Protect",
      "Quick Guard",
      "Silk Trap",
      "Spiky Shield",
      "Wide Guard",
    ],
  },
  {
    id: "healing",
    label: "Healing",
    group: "defensive",
    moves: [
      "Aqua Ring",
      "Floral Healing",
      "Heal Pulse",
      "Healing Wish",
      "Ingrain",
      "Jungle Healing",
      "Life Dew",
      "Lunar Dance",
      "Milk Drink",
      "Moonlight",
      "Morning Sun",
      "Pain Split",
      "Pollen Puff",
      "Recover",
      "Rest",
      "Roost",
      "Shore Up",
      "Slack Off",
      "Soft-Boiled",
      "Strength Sap",
      "Synthesis",
      "Wish",
    ],
  },
  {
    id: "drain",
    label: "Drain",
    group: "defensive",
    moves: [
      "Absorb",
      "Bitter Blade",
      "Drain Punch",
      "Draining Kiss",
      "Dream Eater",
      "Giga Drain",
      "Horn Leech",
      "Leech Life",
      "Matcha Gotcha",
      "Mega Drain",
      "Pain Split",
      "Parabolic Charge",
      "Strength Sap",
    ],
  },

  // Field
  {
    id: "weather",
    label: "Weather",
    group: "field",
    moves: [
      "Chilly Reception",
      "Rain Dance",
      "Sandstorm",
      "Snowscape",
      "Sunny Day",
    ],
    abilities: ["Drizzle", "Drought", "Sand Stream", "Snow Warning"],
  },
  {
    id: "terrain",
    label: "Terrain",
    group: "field",
    moves: [
      "Electric Terrain",
      "Grassy Terrain",
      "Misty Terrain",
      "Psychic Terrain",
    ],
    abilities: [
      "Grassy Surge",
      "Electric Surge",
      "Psychic Surge",
      "Misty Surge",
    ],
  },
  {
    id: "hazards",
    label: "Hazards",
    group: "field",
    moves: [
      "Ceaseless Edge",
      "Spikes",
      "Stealth Rock",
      "Sticky Web",
      "Stone Axe",
      "Toxic Spikes",
    ],
  },

  // Utility
  {
    id: "redirection",
    label: "Redirection",
    group: "utility",
    moves: ["Follow Me", "Rage Powder", "Ally Switch"],
  },
  {
    id: "pivot",
    label: "Pivot",
    group: "utility",
    moves: [
      "Baton Pass",
      "Chilly Reception",
      "Flip Turn",
      "Parting Shot",
      "Shed Tail",
      "Teleport",
      "U-turn",
      "Volt Switch",
    ],
  },
  {
    id: "flinching",
    label: "Flinching",
    group: "utility",
    moves: [
      "Air Slash",
      "Astonish",
      "Bite",
      "Dark Pulse",
      "Dragon Rush",
      "Extrasensory",
      "Fake Out",
      "Fiery Wrath",
      "Fire Fang",
      "Headbutt",
      "Ice Fang",
      "Icicle Crash",
      "Iron Head",
      "Mountain Gale",
      "Rock Slide",
      "Sky Attack",
      "Snore",
      "Stomp",
      "Thunder Fang",
      "Triple Arrows",
      "Twister",
      "Upper Hand",
      "Waterfall",
      "Zen Headbutt",
      "Zing Zap",
    ],
  },
  {
    id: "disruption",
    label: "Disruption",
    group: "utility",
    moves: [
      "Block",
      "Circle Throw",
      "Clear Smog",
      "Court Change",
      "Defog",
      "Disable",
      "Doodle",
      "Dragon Tail",
      "Encore",
      "Entrainment",
      "Fairy Lock",
      "Haze",
      "Imprison",
      "Knock Off",
      "Mean Look",
      "Mortal Spin",
      "Rapid Spin",
      "Roar",
      "Role Play",
      "Simple Beam",
      "Skill Swap",
      "Switcheroo",
      "Taunt",
      "Tidy Up",
      "Torment",
      "Trick",
      "Trick Room",
      "Whirlwind",
      "Worry Seed",
    ],
  },
];

export const ROLE_GROUP_LABELS: Record<RoleGroup, string> = {
  "damage-type": "Damage Type",
  "speed-control": "Speed Control",
  status: "Status",
  "stat-changes": "Stat Changes",
  defensive: "Defensive",
  field: "Field",
  utility: "Utility",
};

export const ROLE_GROUP_ORDER: RoleGroup[] = [
  "damage-type",
  "speed-control",
  "status",
  "stat-changes",
  "defensive",
  "field",
  "utility",
];

// =============================================================================
// Group color palette — Tailwind class strings, single source of truth
// =============================================================================

export interface GroupColors {
  /** Combined classes for the chip pill (background + border + text) */
  chip: string;
  /** Background-only class for active state of sidebar role buttons */
  active: string;
  /** Text-only class for the role's label color */
  text: string;
}

export const GROUP_COLORS: Record<RoleGroup, GroupColors> = {
  "damage-type": {
    chip: "bg-rose-500/8 border-rose-500/25 text-rose-700 dark:text-rose-300",
    active: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
  },
  "speed-control": {
    chip: "bg-violet-500/8 border-violet-500/25 text-violet-700 dark:text-violet-300",
    active: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
  },
  status: {
    chip: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
    active: "bg-amber-500/12",
    text: "text-amber-700 dark:text-amber-400",
  },
  "stat-changes": {
    chip: "bg-emerald-500/8 border-emerald-500/28 text-emerald-700 dark:text-emerald-400",
    active: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  defensive: {
    chip: "bg-sky-500/8 border-sky-500/25 text-sky-700 dark:text-sky-300",
    active: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
  },
  field: {
    chip: "bg-lime-500/10 border-lime-500/28 text-lime-700 dark:text-lime-400",
    active: "bg-lime-500/12",
    text: "text-lime-700 dark:text-lime-400",
  },
  utility: {
    chip: "bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400",
    active: "bg-slate-500/12",
    text: "text-slate-600 dark:text-slate-400",
  },
};

// =============================================================================
// Lookups
// =============================================================================

export function getRoleById(id: string): RolePreset | undefined {
  return ROLE_PRESETS.find((r) => r.id === id);
}

let _rolesByMove: Map<string, string[]> | null = null;
function getRolesByMoveIndex(): Map<string, string[]> {
  if (_rolesByMove) return _rolesByMove;
  const m = new Map<string, string[]>();
  for (const role of ROLE_PRESETS) {
    if (!role.moves) continue;
    for (const move of role.moves) {
      const list = m.get(move) ?? [];
      list.push(role.id);
      m.set(move, list);
    }
  }
  _rolesByMove = m;
  return m;
}

/** O(1) — returns role IDs for a move name; empty if move is in no role. */
export function getRolesForMove(moveName: string): string[] {
  return getRolesByMoveIndex().get(moveName) ?? [];
}

/**
 * Compute role IDs for a species:
 * - Any of its abilities matches a name in role.abilities, OR
 * - It can learn any move in role.moves
 *
 * Format-aware: uses getLegalMoves(species, formatId) so format-banned
 * moves don't count toward role fit. Falls back to getLearnableMoves
 * (all-format learnable) when the format has no registered legality.
 *
 * Called once per species during buildSpeciesSearchIndex.
 */
export function getRolesForSpecies(
  abilities: {
    slot1: string | null;
    slot2: string | null;
    hidden: string | null;
  },
  speciesName: string,
  formatId: string,
): string[] {
  const legalSet = legalSetOrPermissive(getLegalMoves(speciesName, formatId));
  // If format has no registered legality (legalSet === undefined), fall back
  // to all moves in the current gen — permissive default. Note: getLearnableMoves
  // returns every move in the gen, not a per-species learnset, so role-fit in
  // unknown formats effectively matches every species for all move-driven roles.
  const learnableSet: ReadonlySet<string> =
    legalSet ?? new Set(getLearnableMoves(speciesName));
  const out: string[] = [];

  for (const role of ROLE_PRESETS) {
    let matches = false;

    if (role.abilities) {
      for (const ab of role.abilities) {
        if (
          abilities.slot1 === ab ||
          abilities.slot2 === ab ||
          abilities.hidden === ab
        ) {
          matches = true;
          break;
        }
      }
    }

    if (!matches && role.moves) {
      for (const move of role.moves) {
        if (learnableSet.has(move)) {
          matches = true;
          break;
        }
      }
    }

    if (matches) out.push(role.id);
  }
  return out;
}
