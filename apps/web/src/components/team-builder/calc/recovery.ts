// =============================================================================
// recovery.ts
//
// Post-processing for held-item recovery (Sitrus Berry, Leftovers, Black
// Sludge). @smogon/calc returns raw damage rolls but doesn't fold mid-battle
// healing into the KO verdict. NCP-VGC and Showdown's calc UI both append
// "after Sitrus Berry recovery" / "after Leftovers recovery" to verdicts when
// the defender's item changes the KO tier — this module does the same so our
// UI can match their output.
//
// Algorithm: simulate hit-by-hit using a single damage value, applying:
//   1. Damage subtracts from currentHP.
//   2. Sitrus Berry restores 25% of maxHP once when HP drops to ≤ 50% (after
//      the hit that brought it there).
//   3. Leftovers / Black Sludge (Poison-type holder) heals 1/16 of maxHP per
//      turn after damage. Black Sludge on a non-Poison-type holder DAMAGES
//      1/8 of maxHP per turn — surfaced separately.
// =============================================================================

import { type PokemonType } from "@trainers/pokemon";

/** Display labels recognised here. Anything else is treated as no recovery. */
const SITRUS_BERRY = "Sitrus Berry";
const LEFTOVERS = "Leftovers";
const BLACK_SLUDGE = "Black Sludge";
const BERRY_JUICE = "Berry Juice";

/**
 * "Flavor" berries — Aguav / Figy / Iapapa / Mago / Wiki. Each heals the
 * holder for floor(maxHP / 3) at ≤25% HP threshold (gen 8+ values; gen 9
 * inherits). Each also confuses the holder if their nature dislikes the
 * berry's flavor; we ignore confusion since it doesn't change the damage
 * verdict on the incoming hit.
 */
const FLAVOR_BERRIES = new Set([
  "Aguav Berry",
  "Figy Berry",
  "Iapapa Berry",
  "Mago Berry",
  "Wiki Berry",
]);

interface RecoveryConfig {
  /** Defender's max HP (always positive). */
  maxHP: number;
  /** Defender's held item display name. */
  item: string | null | undefined;
  /** Defender's types — drives Black Sludge heal vs damage. */
  defenderTypes: readonly PokemonType[];
  /**
   * Defender's ability. Magic Guard and Klutz negate item-based passive
   * damage (Black Sludge on a non-Poison holder) — Magic Guard blocks all
   * indirect damage, Klutz disables the held item entirely so the damage
   * effect doesn't fire.
   */
  ability?: string | null;
}

/** Abilities that negate Black Sludge self-damage on non-Poison holders. */
const SELF_DAMAGE_NEGATING_ABILITIES = new Set([
  "Magic Guard",
  "Klutz",
]);

interface RecoveryComputed {
  /** One-time HP restore (item-specific amount). 0 when no eligible item. */
  oneShot: number;
  /**
   * Threshold (current-HP value) at or below which the one-shot triggers.
   * Sitrus / flavor berries / Berry Juice each use a different threshold.
   * Ignored when oneShot === 0.
   */
  oneShotThreshold: number;
  /** Per-turn passive heal (positive value, applied between hits). */
  perTurnHeal: number;
  /** Per-turn passive damage (positive value, applied between hits). */
  perTurnSelfDamage: number;
  /** Suffix emitted on a verdict when this recovery actually changed it. */
  suffix: string;
}

/**
 * Inspect the defender's item and types to pre-compute recovery values.
 * Public for tests; production callers go through `simulateKoTier`.
 */
export function getRecoveryConfig(cfg: RecoveryConfig): RecoveryComputed {
  const { maxHP, item, defenderTypes, ability } = cfg;
  const empty: RecoveryComputed = {
    oneShot: 0,
    oneShotThreshold: 0,
    perTurnHeal: 0,
    perTurnSelfDamage: 0,
    suffix: "",
  };
  if (!item || maxHP <= 0) return empty;

  if (item === SITRUS_BERRY) {
    return {
      ...empty,
      oneShot: Math.floor(maxHP / 4),
      // Triggers when HP is at or below 50%.
      oneShotThreshold: Math.floor(maxHP / 2),
      suffix: "after Sitrus Berry recovery",
    };
  }

  if (item === BERRY_JUICE) {
    return {
      ...empty,
      // Berry Juice restores a flat 20 HP. Triggers when HP ≤ 50% (this
      // mirrors smogon/calc + showdown's behavior; older gens behaved
      // slightly differently but gen 7+ is uniform).
      oneShot: 20,
      oneShotThreshold: Math.floor(maxHP / 2),
      suffix: "after Berry Juice recovery",
    };
  }

  if (FLAVOR_BERRIES.has(item)) {
    return {
      ...empty,
      // Aguav / Figy / Iapapa / Mago / Wiki — gen 8+ heals floor(maxHP/3)
      // at the ≤25% HP threshold (gen 9 inherits this). Confusion side-
      // effect (nature-dependent) is ignored; doesn't change the damage
      // verdict for the incoming hit.
      oneShot: Math.floor(maxHP / 3),
      oneShotThreshold: Math.floor(maxHP / 4),
      suffix: `after ${item} recovery`,
    };
  }

  if (item === LEFTOVERS) {
    return {
      ...empty,
      perTurnHeal: Math.floor(maxHP / 16),
      suffix: "after Leftovers recovery",
    };
  }

  if (item === BLACK_SLUDGE) {
    const isPoison = defenderTypes.includes("Poison");
    if (isPoison) {
      return {
        ...empty,
        perTurnHeal: Math.floor(maxHP / 16),
        suffix: "after Black Sludge recovery",
      };
    }
    // Non-Poison holder takes 1/8 maxHP per turn UNLESS Magic Guard blocks
    // indirect damage or Klutz disables the held item entirely. Either way,
    // no damage and no suffix.
    if (ability && SELF_DAMAGE_NEGATING_ABILITIES.has(ability)) {
      return empty;
    }
    return {
      ...empty,
      perTurnSelfDamage: Math.floor(maxHP / 8),
      suffix: "after Black Sludge damage",
    };
  }

  return empty;
}

export type KoTier = "OHKO" | "2HKO" | "3HKO" | "4HKO+" | null;

interface SimulationInput {
  /** Per-hit damage (use a specific roll — typically max for "guaranteed" or
   *  min for "possible" probes). */
  damagePerHit: number;
  maxHP: number;
  recovery: RecoveryComputed;
  /** Cap simulation length so we never spin on healing-stalemate. */
  maxTurns?: number;
}

/**
 * Simulate hit-by-hit how many turns the defender survives this damage.
 * Returns null when the damage doesn't KO within `maxTurns` (defender outheals
 * or stalls indefinitely). The returned tier names match the engine's
 * vocabulary so consumers can use them in verdict strings.
 */
export function simulateKoTier(input: SimulationInput): KoTier {
  const { damagePerHit, maxHP, recovery } = input;
  const maxTurns = input.maxTurns ?? 12;

  if (damagePerHit <= 0) return null;

  let currentHP = maxHP;
  let oneShotConsumed = false;

  for (let turn = 1; turn <= maxTurns; turn++) {
    currentHP -= damagePerHit;
    if (currentHP <= 0) {
      if (turn === 1) return "OHKO";
      if (turn === 2) return "2HKO";
      if (turn === 3) return "3HKO";
      return "4HKO+";
    }

    // One-shot recovery (Sitrus / Berry Juice / flavor berries) — fires
    // when HP drops at or below the item-specific threshold and triggers
    // BEFORE leftovers per Showdown engine semantics.
    if (
      !oneShotConsumed &&
      recovery.oneShot > 0 &&
      currentHP <= recovery.oneShotThreshold
    ) {
      currentHP = Math.min(maxHP, currentHP + recovery.oneShot);
      oneShotConsumed = true;
    }

    if (recovery.perTurnHeal > 0) {
      currentHP = Math.min(maxHP, currentHP + recovery.perTurnHeal);
    }
    if (recovery.perTurnSelfDamage > 0) {
      currentHP -= recovery.perTurnSelfDamage;
      if (currentHP <= 0) {
        // Defender fainted to its own item before the next hit lands. Treat
        // this as if the previous hit KO'd them: tier counts the hits taken.
        if (turn === 1) return "OHKO";
        if (turn === 2) return "2HKO";
        if (turn === 3) return "3HKO";
        return "4HKO+";
      }
    }
  }

  return null;
}

interface VerdictInput {
  /** Roll array from the engine — sorted ascending min→max. */
  rolls: readonly number[];
  maxHP: number;
  /** Defender's held item display name. */
  item: string | null | undefined;
  defenderTypes: readonly PokemonType[];
  /** Defender's ability — Magic Guard / Klutz negate Black Sludge damage. */
  ability?: string | null;
}

interface VerdictOutput {
  /** KO tier under the worst-case roll (max damage). null = doesn't KO. */
  tier: KoTier;
  /** Suffix to append when recovery genuinely changed the verdict. */
  suffix: string;
}

/**
 * Top-level: given engine output and defender state, compute the KO tier and
 * the recovery-aware suffix. Suffix is empty when no recovery item is held
 * OR when recovery didn't change the verdict (i.e. the defender would still
 * KO in the same number of hits without the item).
 */
export function getRecoveryAwareVerdict(input: VerdictInput): VerdictOutput {
  const recovery = getRecoveryConfig({
    maxHP: input.maxHP,
    item: input.item,
    defenderTypes: input.defenderTypes,
    ability: input.ability,
  });

  // Use the max roll for the deterministic-KO question Showdown answers
  // ("guaranteed 2HKO after Sitrus Berry"). The rolls array from the engine
  // is sorted ascending, so the last element is the max.
  const maxRoll = input.rolls.length
    ? (input.rolls[input.rolls.length - 1] ?? 0)
    : 0;
  const minRoll = input.rolls[0] ?? 0;

  const tierWithRecovery = simulateKoTier({
    damagePerHit: maxRoll,
    maxHP: input.maxHP,
    recovery,
  });

  if (!recovery.suffix) {
    return { tier: tierWithRecovery, suffix: "" };
  }

  // Compute the same tier WITHOUT recovery to decide whether the suffix is
  // meaningful — if the defender drops in the same number of hits either way,
  // the suffix is noise.
  const tierWithoutRecovery = simulateKoTier({
    damagePerHit: maxRoll,
    maxHP: input.maxHP,
    recovery: {
      oneShot: 0,
      oneShotThreshold: 0,
      perTurnHeal: 0,
      perTurnSelfDamage: 0,
      suffix: "",
    },
  });

  // Edge: if min roll wouldn't KO without recovery either, the matchup is
  // already a non-KO at the engine level — the suffix is still useful for
  // documentation but doesn't change the verdict.
  void minRoll;

  return {
    tier: tierWithRecovery,
    suffix: tierWithRecovery === tierWithoutRecovery ? "" : recovery.suffix,
  };
}
