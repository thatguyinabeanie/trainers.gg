// =============================================================================
// move-target-info.ts
//
// Returns target classification and spread flag for a move name.
// Driven by the KNOWN_SPREAD_MOVES list from calc-results-block.tsx;
// no new third-party imports are added.
// =============================================================================

export type MoveTargetKind =
  | "single-foe"
  | "all-foes"
  | "all-others"
  | "single"
  | "self";

export interface MoveTargetInfo {
  kind: MoveTargetKind;
  /** True when this is a Doubles spread move (hits multiple opponents). */
  isSpread: boolean;
}

// ---------------------------------------------------------------------------
// Known spread move sets
// All-foes moves hit both opposing slots.
// All-others moves hit every slot except the user (both foes + ally).
//
// NOTE: Single-target moves with non-standard targets (e.g. Pollen Puff, which
// targets an ally; Tera Blast, which targets a single foe) must NOT be listed
// here — they are single-target and never receive the spread −25% penalty.
// ---------------------------------------------------------------------------

/** Hits both opponents. −25% damage when 2 foes alive. */
const ALL_FOES_MOVES = new Set([
  "Earthquake",
  "Magnitude",
  "Surf",
  "Discharge",
  "Blizzard",
  "Hyper Voice",
  "Explosion",
  "Self-Destruct",
  "Heat Wave",
  "Sludge Wave",
  "Muddy Water",
  "Glacial Lance",
  "Astral Barrage",
  "Dazzling Gleam",
  "Boomburst",
  "Rock Slide",
  "Lava Plume",
  "Bubble",
  "Bubble Beam",
  "Icy Wind",
  "Electroweb",
  "Mudshot",
  "Snarl",
  "Razor Wind",
  "Twister",
  "Whirlpool",
  "Swift",
  "Fairy Wind",
  "Venom Drench",
  "Round",
  "Overdrive",
]);

/**
 * Hits both opponents AND the ally. −25% when ≥2 targets alive.
 * Examples: Flower Shield, Lava Plume (field).
 * Do NOT add single-target moves here even if they have unusual targets.
 */
const ALL_OTHERS_MOVES = new Set<string>();

/** Self-targeting moves (no offensive application). */
const SELF_MOVES = new Set([
  "Swords Dance",
  "Calm Mind",
  "Nasty Plot",
  "Quiver Dance",
  "Shell Smash",
  "Dragon Dance",
  "Bulk Up",
  "Coil",
  "Iron Defense",
  "Cotton Guard",
  "Geomancy",
  "Growth",
  "Agility",
  "Amnesia",
  "Barrier",
  "Harden",
  "Minimize",
  "Protect",
  "Detect",
  "Wide Guard",
  "Quick Guard",
  "Endure",
  "Focus Energy",
  "Tailwind",
  "Trick Room",
  "Sunny Day",
  "Rain Dance",
  "Sandstorm",
  "Snowscape",
  "Reflect",
  "Light Screen",
  "Aurora Veil",
  "Recover",
  "Roost",
  "Soft-Boiled",
  "Synthesis",
  "Moonlight",
  "Morning Sun",
  "Healing Wish",
  "Lunar Dance",
  "Substitute",
  "Belly Drum",
  "Rest",
  "Sleep Talk",
  "Snore",
  "Recycle",
  "Charge",
  "Encore",
]);

/**
 * Returns target classification and spread flag for a move.
 * Defaults to "single-foe" / isSpread=false for any unknown move.
 */
export function getMoveTargetInfo(moveName: string): MoveTargetInfo {
  if (!moveName) return { kind: "single-foe", isSpread: false };

  if (ALL_FOES_MOVES.has(moveName)) {
    return { kind: "all-foes", isSpread: true };
  }
  if (ALL_OTHERS_MOVES.has(moveName)) {
    return { kind: "all-others", isSpread: true };
  }
  if (SELF_MOVES.has(moveName)) {
    return { kind: "self", isSpread: false };
  }
  return { kind: "single-foe", isSpread: false };
}

/**
 * Human-readable label for a target kind.
 */
export function getMoveTargetLabel(kind: MoveTargetKind): string {
  switch (kind) {
    case "all-foes":
      return "ALL-FOES";
    case "all-others":
      return "ALL-OTHERS";
    case "single-foe":
      return "SINGLE-FOE";
    case "single":
      return "SINGLE";
    case "self":
      return "SELF";
  }
}

/**
 * One-line description for a target kind.
 */
export function getMoveTargetDesc(kind: MoveTargetKind): string {
  switch (kind) {
    case "all-foes":
      return "Spread move — hits both opposing slots. −25% damage when 2 foes alive.";
    case "all-others":
      return "Hits everyone but you. −25% damage when 2+ targets alive.";
    case "single-foe":
      return "Single target — never spreads.";
    case "single":
      return "Single target (any side) — never spreads.";
    case "self":
      return "Self / status move.";
  }
}
