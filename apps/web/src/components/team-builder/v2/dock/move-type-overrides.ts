import { getMoveType, getTypeEffectiveness, type PokemonType } from "@trainers/pokemon";

// =============================================================================
// Warn-once for unknown moves
// =============================================================================

const warnedMoves = new Set<string>();
function warnUnknownMove(move: string): void {
  if (warnedMoves.has(move)) return;
  warnedMoves.add(move);
  console.warn(`[effectiveMoveType] Unknown move: "${move}"`);
}

// =============================================================================
// Sound moves (for Liquid Voice)
// =============================================================================

const SOUND_MOVES = new Set([
  "boomburst",
  "bug buzz",
  "chatter",
  "echoed voice",
  "growl",
  "grass whistle",
  "hyper voice",
  "metal sound",
  "noble roar",
  "perish song",
  "relic song",
  "roar",
  "round",
  "screech",
  "sing",
  "snore",
  "supersonic",
  "uproar",
  "clanging scales",
  "clangorous soul",
  "clangorous soulblaze",
  "disarming voice",
  "overdrive",
  "sparkling aria",
  "torch song",
]);

// =============================================================================
// Abilities that change a move's type
// =============================================================================

/**
 * Abilities that change a move's type.
 * Ability key (normalized: lowercase, no spaces) → fn(moveName, originalType) → newType.
 */
export const MOVE_TYPE_CHANGING_ABILITIES: Record<
  string,
  (move: string, type: PokemonType) => PokemonType
> = {
  pixilate: (_, t) => (t === "Normal" ? "Fairy" : t),
  aerilate: (_, t) => (t === "Normal" ? "Flying" : t),
  refrigerate: (_, t) => (t === "Normal" ? "Ice" : t),
  galvanize: (_, t) => (t === "Normal" ? "Electric" : t),
  normalize: (_m, _t) => "Normal",
  liquidvoice: (move, t) =>
    SOUND_MOVES.has(move.toLowerCase()) ? "Water" : t,
};

// =============================================================================
// Quirk moves
// =============================================================================

/**
 * Moves whose effective offensive matchup overrides the standard type rules.
 *
 * - freeze-dry: ice, but forces ×2 vs water
 * - flying-press: simultaneously fighting + flying
 * - thousand-arrows: ground, but hits flying-types at ×1 instead of immune
 */
export const QUIRK_MOVES: Record<
  string,
  | { kind: "freeze-dry" }
  | { kind: "flying-press" }
  | { kind: "thousand-arrows" }
> = {
  "freeze dry": { kind: "freeze-dry" },
  "flying press": { kind: "flying-press" },
  "thousand arrows": { kind: "thousand-arrows" },
};

// =============================================================================
// effectiveMoveType
// =============================================================================

/**
 * Resolve the effective offensive type of a move for an attacker with the
 * given ability. Applies MOVE_TYPE_CHANGING_ABILITIES after the base lookup.
 *
 * Note: quirk moves (freeze-dry, flying-press, thousand-arrows) have their
 * matchup computed separately in effectiveOffensiveMult — they don't reduce to
 * a single type, so effectiveMoveType returns the base type for those.
 */
export function effectiveMoveType(
  move: string,
  attackerAbility: string | null | undefined
): PokemonType {
  const baseType = getMoveType(move) as PokemonType | null;
  if (!baseType) {
    if (typeof move === "string" && move.length > 0) {
      warnUnknownMove(move);
    }
    return "Normal";
  }

  if (!attackerAbility) return baseType;

  const abilityKey = attackerAbility.toLowerCase().replace(/[^a-z0-9]/g, "");
  const transformer = MOVE_TYPE_CHANGING_ABILITIES[abilityKey];
  if (!transformer) return baseType;

  return transformer(move, baseType);
}

// =============================================================================
// effectiveOffensiveMult
// =============================================================================

/**
 * Returns the offensive multiplier for a move against a defender, taking
 * ability-driven type changes and move quirks into account.
 *
 * Standard path: getTypeEffectiveness(effectiveMoveType(move, ability), defenderTypes)
 *
 * Quirk paths:
 *   freeze-dry  — standard ice matchup, but force ×2 vs water (multiplied
 *                 through any other defender type multiplier).
 *   flying-press — getTypeEffectiveness("Fighting", ...) ×
 *                  getTypeEffectiveness("Flying", ...).
 *   thousand-arrows — standard ground; if defender includes Flying, treat as ×1
 *                    instead of immune.
 */
export function effectiveOffensiveMult(opts: {
  move: string;
  attackerAbility?: string | null;
  defenderTypes: PokemonType[];
}): number {
  const { move, attackerAbility, defenderTypes } = opts;

  const moveLower = move.toLowerCase();

  // ---- Quirk: freeze-dry ------------------------------------------------------
  const quirkFD = QUIRK_MOVES[moveLower];
  if (quirkFD?.kind === "freeze-dry") {
    const hasWater = defenderTypes.includes("Water");
    if (hasWater) {
      const nonWaterTypes = defenderTypes.filter((t) => t !== "Water");
      const iceMult =
        nonWaterTypes.length > 0
          ? getTypeEffectiveness("Ice", nonWaterTypes)
          : 1;
      return iceMult * 2;
    }
    return getTypeEffectiveness("Ice", defenderTypes);
  }

  // ---- Quirk: flying-press ---------------------------------------------------
  const quirkFP = QUIRK_MOVES[moveLower];
  if (quirkFP?.kind === "flying-press") {
    return (
      getTypeEffectiveness("Fighting", defenderTypes) *
      getTypeEffectiveness("Flying", defenderTypes)
    );
  }

  // ---- Quirk: thousand-arrows ------------------------------------------------
  const quirkTA = QUIRK_MOVES[moveLower];
  if (quirkTA?.kind === "thousand-arrows") {
    const hasFlying = defenderTypes.includes("Flying");
    if (hasFlying) {
      const nonFlyingTypes = defenderTypes.filter((t) => t !== "Flying");
      const groundMult =
        nonFlyingTypes.length > 0
          ? getTypeEffectiveness("Ground", nonFlyingTypes)
          : 1;
      return Math.max(groundMult, 1);
    }
    return getTypeEffectiveness("Ground", defenderTypes);
  }

  // ---- Standard path --------------------------------------------------------
  const offensiveType = effectiveMoveType(move, attackerAbility);
  return getTypeEffectiveness(offensiveType, defenderTypes);
}
