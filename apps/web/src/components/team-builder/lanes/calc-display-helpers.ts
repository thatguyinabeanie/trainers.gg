// =============================================================================
// calc-display-helpers.ts
//
// Shared helpers used by both <MovesLane> (move tile border colour) and
// <CalcColumn> (calc result row). Keeping the spread-adjusted range and KO-tier
// derivation in a single helper prevents drift between the two render paths
// when balance / mechanics tweaks land.
// =============================================================================

import { getMoveTargetInfo } from "../calc/move-target-info";
import { type CalcOutput, type KoTierLabel } from "../use-calc-state";
import { getVerdict } from "../calc/calc-verdict";

/**
 * Numeric coloring tag for KO-tier rows: "1" = OHKO, "2" = 2HKO, "3" = 3HKO,
 * "4" = 4HKO+, null = no damage. Distinct from `KoTierLabel` (the user-facing
 * "OHKO"/"2HKO"/... string) — this is purely for CSS class lookup.
 */
export type KoTierNumeric = "1" | "2" | "3" | "4" | null;
/** @deprecated Renamed to `KoTierNumeric` for clarity vs `KoTierLabel`. */
export type KoTier = KoTierNumeric;

/**
 * Map a min/max damage range to a KO tier label used for row colouring.
 * "1" = OHKO, "2" = 2HKO, "3" = 3HKO, "4" = 4HKO+, null = no damage.
 */
export function getKoTier(minPct: number, maxPct: number): KoTierNumeric {
  const verdict = getVerdict(minPct, maxPct);
  if (verdict === "OHKO") return "1";
  if (verdict === "2HKO") return "2";
  if (verdict === "3HKO") return "3";
  if (maxPct > 0) return "4";
  return null;
}

interface DisplayRangeInput {
  moveName: string | null;
  output: Pick<CalcOutput, "minPercent" | "maxPercent" | "recoveryTier"> | null;
  hasCalc: boolean;
  /** Number of opposing slots still alive (0–2). */
  foesAlive: number;
  /** Whether the user's ally slot is still alive. */
  allyAlive: boolean;
}

interface DisplayRangeResult {
  /** True when the spread −25% multiplier applies for the current target count. */
  spreadApplied: boolean;
  /** Min damage percent after applying spread reduction. */
  displayMin: number;
  /** Max damage percent after applying spread reduction. */
  displayMax: number;
  /** KO tier driven by the displayed (post-spread) range, or null if no calc. */
  koTier: KoTierNumeric;
}

/**
 * Map a recovery-simulation KO tier label to the row-coloring numeric tag.
 * Exhaustive over `KoTierLabel`; the `null` branch covers both
 * "no recovery applied" and "no damage" states.
 */
function recoveryTierToKoTier(tier: KoTierLabel): KoTierNumeric {
  if (tier === "OHKO") return "1";
  if (tier === "2HKO") return "2";
  if (tier === "3HKO") return "3";
  if (tier === "4HKO+") return "4";
  return null;
}

/**
 * Compute the display-ready min/max damage range and KO tier for one move tile.
 *
 * Spread rules:
 *   - "all-foes" moves take the −25% multiplier when both opposing slots are alive
 *   - "all-others" moves take the −25% multiplier when ≥2 targets are alive
 *     (which means either both foes alive OR the ally is alive)
 *   - Single-target moves are never spread
 */
export function getDisplayRangeAndKoTier({
  moveName,
  output,
  hasCalc,
  foesAlive,
  allyAlive,
}: DisplayRangeInput): DisplayRangeResult {
  const targetInfo = moveName ? getMoveTargetInfo(moveName) : null;
  const isSpread = targetInfo?.isSpread ?? false;
  const spreadApplied =
    isSpread &&
    (targetInfo?.kind === "all-foes"
      ? foesAlive >= 2
      : foesAlive + (allyAlive ? 1 : 0) >= 2);

  const rawMin = output?.minPercent ?? 0;
  const rawMax = output?.maxPercent ?? 0;
  const displayMin = spreadApplied ? rawMin * 0.75 : rawMin;
  const displayMax = spreadApplied ? rawMax * 0.75 : rawMax;
  // Prefer the recovery-aware simulation tier when recovery changed the
  // verdict and no spread modifier is active (spread + recovery don't
  // compose cleanly since the simulation uses raw-roll damage, not
  // spread-adjusted damage).
  const recoveryKoTier =
    !spreadApplied && output?.recoveryTier
      ? recoveryTierToKoTier(output.recoveryTier)
      : null;
  const koTier = hasCalc
    ? (recoveryKoTier ?? getKoTier(displayMin, displayMax))
    : null;

  return { spreadApplied, displayMin, displayMax, koTier };
}

// =============================================================================
// Shared move-slot constants
// Used by MovesLane, MovePickerMobile, and any component that iterates moves.
// =============================================================================

export type MoveSlot = "move1" | "move2" | "move3" | "move4";

export const MOVE_SLOTS: MoveSlot[] = ["move1", "move2", "move3", "move4"];

// =============================================================================
// KO-tier display maps
// Source of truth for labels and CSS color classes across all calc views.
// Centralised here so MovesLane, CalcColumn, and mobile variants stay in sync.
// =============================================================================

/**
 * Maps a KO-tier numeric key to the user-facing label string.
 * Keys are the string form of `KoTierNumeric` (never null).
 */
export const KO_LABELS: Record<string, string> = {
  "1": "OHKO",
  "2": "2HKO",
  "3": "3HKO",
  "4": "4HKO+",
};

/**
 * Maps a KO-tier numeric key to its Tailwind CSS color class.
 * Keys are the string form of `KoTierNumeric` (never null).
 */
export const KO_COLORS: Record<string, string> = {
  "1": "text-[var(--ko-red)]",
  "2": "text-[var(--ko-amber2-fg)]",
  "3": "text-[var(--ko-yellow-fg)]",
  "4": "text-muted-foreground",
};
