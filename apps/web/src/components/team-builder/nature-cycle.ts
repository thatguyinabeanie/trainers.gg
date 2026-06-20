/**
 * Shared nature-cycling helpers used by the stats lane (suffix-based editing)
 * and the calc defender panel (click-to-cycle). Extracted so the radial stat
 * editor can import them without duplicating logic.
 *
 * Pure module — no React imports.
 */

import { NATURE_EFFECTS } from "@trainers/pokemon";

// =============================================================================
// Types
// =============================================================================

export type NatureStat =
  | "attack"
  | "defense"
  | "specialAttack"
  | "specialDefense"
  | "speed";

// =============================================================================
// Constants
// =============================================================================

/** Canonical neutral nature — the rest (Hardy/Docile/Bashful/Quirky) are duplicates. */
export const NEUTRAL_NATURE = "Serious";

export const ALL_NATURE_STATS: NatureStat[] = [
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];

/** When the user adds "+" to a stat with no current −nature, default to a sensible reduced stat. */
export const DEFAULT_REDUCE_FOR_BOOST: Record<NatureStat, NatureStat> = {
  attack: "specialAttack", // → Adamant
  defense: "specialAttack", // → Impish
  specialAttack: "attack", // → Modest
  specialDefense: "attack", // → Calm
  speed: "specialAttack", // → Jolly
};

/** When the user adds "−" to a stat with no current +nature, default to a sensible boosted stat. */
export const DEFAULT_BOOST_FOR_REDUCE: Record<NatureStat, NatureStat> = {
  attack: "specialAttack", // → Modest (−Atk)
  defense: "specialAttack", // → Mild (−Def)
  specialAttack: "attack", // → Adamant (−SpA)
  specialDefense: "attack", // → Naughty (−SpD)
  speed: "attack", // → Brave (−Spe)
};

/** Maps short stat key → long NatureStat key (for callers using short keys). */
export const SHORT_TO_LONG: Record<string, NatureStat> = {
  atk: "attack",
  def: "defense",
  spa: "specialAttack",
  spd: "specialDefense",
  spe: "speed",
};

// =============================================================================
// Helpers
// =============================================================================

/** Search NATURE_EFFECTS for a nature with the given (boost, reduce) pair. */
export function findNatureFor(
  boost: NatureStat,
  reduce: NatureStat
): string | null {
  for (const [name, eff] of Object.entries(NATURE_EFFECTS)) {
    if (eff.boost === boost && eff.reduce === reduce) return name;
  }
  return null;
}

/**
 * Pick a fresh nature partner stat (the −stat for a +boost, or the +stat for
 * a −reduce). Tries the default first; if the default conflicts with `avoid`
 * (the partner stat we explicitly want to leave alone — typically the
 * previous boost when we're moving the + somewhere new), falls back to the
 * first stat that isn't the new mover or `avoid`.
 */
export function pickFreshPartner(
  mover: NatureStat,
  avoid: NatureStat | null,
  defaults: Record<NatureStat, NatureStat>
): NatureStat {
  const def = defaults[mover];
  if (def !== avoid) return def;
  return ALL_NATURE_STATS.find((s) => s !== mover && s !== avoid) ?? def;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Given the current nature, the row's stat, and the suffix the user typed,
 * compute what the new nature should be (or null if no change needed).
 *
 * Rules (matching user expectation):
 * • suffix === "+": this stat becomes +nature.
 *   - If already +stat: no change.
 *   - If the row's stat is the current −stat (so we'd be moving the + onto a
 *     stat that was the −): the previous boost stat keeps its neutral status
 *     (we DO NOT flip it to −); pick a fresh − partner that isn't the
 *     previous boost or the new boost.
 *   - Otherwise: keep the existing − partner if any, else pick a default.
 * • suffix === "-": symmetric.
 * • suffix === null: if the row's stat WAS +/−, switch to neutral (Serious).
 *
 * HP returns null — HP can't be a nature stat.
 */
export function computeNatureForSuffix(opts: {
  currentNature: string;
  statKey: string;
  suffix: "+" | "-" | null;
}): string | null {
  const { currentNature, statKey, suffix } = opts;
  if (statKey === "hp") return null;
  const stat = statKey as NatureStat;

  const current = NATURE_EFFECTS[currentNature] ?? {};
  const currentBoost = current.boost ?? null;
  const currentReduce = current.reduce ?? null;

  if (suffix === "+") {
    if (currentBoost === stat) return null;

    let reduce: NatureStat;
    if (currentReduce && currentReduce !== stat) {
      // Keep the existing − partner (no conflict).
      reduce = currentReduce;
    } else {
      // Need fresh − partner. Avoid the previous boost so it isn't flipped.
      reduce = pickFreshPartner(stat, currentBoost, DEFAULT_REDUCE_FOR_BOOST);
    }
    return findNatureFor(stat, reduce);
  }

  if (suffix === "-") {
    if (currentReduce === stat) return null;

    let boost: NatureStat;
    if (currentBoost && currentBoost !== stat) {
      boost = currentBoost;
    } else {
      boost = pickFreshPartner(stat, currentReduce, DEFAULT_BOOST_FOR_REDUCE);
    }
    return findNatureFor(boost, stat);
  }

  // suffix === null — user removed the modifier on this stat
  if (currentBoost === stat || currentReduce === stat) {
    return NEUTRAL_NATURE;
  }
  return null;
}

/**
 * Cycle a stat's nature influence on click:
 * neutral → boosted → reduced → neutral
 *
 * HP cannot have nature effects — returns null (no change).
 *
 * `statKey` accepts either a SHORT key (e.g. "atk", "spa") or a LONG key
 * (e.g. "attack", "specialAttack") — SHORT_TO_LONG normalises short keys.
 */
export function cycleNature(
  currentNature: string,
  statKey: string
): string | null {
  if (statKey === "hp") return null;
  const longStat = SHORT_TO_LONG[statKey] ?? (statKey as NatureStat);
  if (!ALL_NATURE_STATS.includes(longStat)) return null;

  const current = NATURE_EFFECTS[currentNature] ?? {};
  const currentBoost = current.boost ?? null;
  const currentReduce = current.reduce ?? null;

  // Currently boosted → switch to reduced
  if (currentBoost === longStat) {
    const boost = pickFreshPartner(
      longStat,
      currentReduce,
      DEFAULT_BOOST_FOR_REDUCE
    );
    return findNatureFor(boost, longStat);
  }

  // Currently reduced → switch to neutral
  if (currentReduce === longStat) {
    return NEUTRAL_NATURE;
  }

  // Currently neutral → switch to boosted
  let reduce: NatureStat;
  if (currentReduce && currentReduce !== longStat) {
    reduce = currentReduce;
  } else {
    reduce = pickFreshPartner(longStat, currentBoost, DEFAULT_REDUCE_FOR_BOOST);
  }
  return findNatureFor(longStat, reduce);
}
