/**
 * Speed-stat modifier helpers and grouping utilities for the team builder.
 *
 * All exports here are pure (zero framework imports). They take a base computed
 * speed stat and apply battle-time modifiers (stage, item, status, ability +
 * weather, tailwind), bucket the result into a verbal tier, group records by
 * speed for ladder displays, and expose the speed-affecting items legal for a
 * given format.
 */

import { type GameFormat } from "./formats";

// =============================================================================
// Types
// =============================================================================

/** Speed stat modifications from in-battle effects, ability+weather, items, status, stages. */
export interface SpeedModifiers {
  /** Stat stage from -6 to +6. Default 0. */
  stage?: number;
  /** Active field conditions affecting all combatants */
  field?: {
    /** ×2 to BOTH sides */
    tailwind?: boolean;
    /** Active weather — drives weather-conditional speed abilities */
    weather?: "sun" | "rain" | "sand" | "snow" | "none";
    /** Doesn't change value but affects turn order; helper just records it */
    trickRoom?: boolean;
  };
  /** Item effects */
  item?:
    | "choice-scarf"
    | "iron-ball"
    | "lagging-tail"
    | "quick-powder"
    | "macho-brace"
    | null;
  /** Status conditions affecting speed */
  status?: "healthy" | "paralyzed";
  /** Pokémon's ability — used to apply weather-conditional boosts (Chlorophyll, Swift Swim, Sand Rush, Slush Rush, etc.) */
  ability?: string;
  /** Whether the pokémon is the Ditto/Smeargle holder for Quick Powder */
  isDitto?: boolean;
  /** Whether Unburden is active (item consumed) — doubles speed for mons with Unburden */
  unburden?: boolean;
}

/** Verbal speed tiers. Boundaries are calibrated for L50 competitive play. */
export type SpeedTierLabel =
  | "very slow"
  | "slow"
  | "mid-slow"
  | "mid"
  | "mid-fast"
  | "fast"
  | "very fast";

/** A single speed-affecting item entry returned from {@link getSpeedAffectingItems}. */
export interface SpeedAffectingItem {
  /** Showdown-style id, e.g., "choice-scarf" */
  id: string;
  /** Display name shown in pickers, e.g., "Choice Scarf" */
  displayName: string;
  /** ×N multiplier the item applies to speed. lagging-tail is turn-order only — multiplier 1. */
  multiplier: number;
  /** Description shown in tooltip / select */
  effect: string;
}

// =============================================================================
// Internal data
// =============================================================================

/** Catalogue of speed-affecting items, keyed by item id. */
const SPEED_ITEMS: Record<string, SpeedAffectingItem> = {
  "choice-scarf": {
    id: "choice-scarf",
    displayName: "Choice Scarf",
    multiplier: 1.5,
    effect: "Boosts Speed by 50%, but locks the holder into one move.",
  },
  "iron-ball": {
    id: "iron-ball",
    displayName: "Iron Ball",
    multiplier: 0.5,
    effect: "Halves Speed; grounds Flying-type and Levitate holders.",
  },
  "lagging-tail": {
    id: "lagging-tail",
    displayName: "Lagging Tail",
    multiplier: 1,
    effect: "Holder always moves last within its priority bracket.",
  },
  "quick-powder": {
    id: "quick-powder",
    displayName: "Quick Powder",
    multiplier: 2,
    effect: "Doubles Ditto's Speed (only works on Ditto).",
  },
  "macho-brace": {
    id: "macho-brace",
    displayName: "Macho Brace",
    multiplier: 0.5,
    effect: "Halves Speed; doubles EV gain in battle.",
  },
};

/** Items that are legal in modern competitive (Reg M-A / Reg M-B). Conservative list. */
const MODERN_LEGAL_ITEM_IDS = new Set<string>([
  "choice-scarf",
  "iron-ball", // M-B addition: halves Speed (no M-A equivalent — Iron Ball is not in M-A's item pool)
]);

/** Format IDs that use the modern Champions item set (M-A and M-B share the same rules). */
const CHAMPIONS_FORMAT_IDS = new Set<string>([
  "gen9championsvgc2026regma",
  "gen9championsvgc2026regmb",
]);

/** Weather → ability id that doubles speed under that weather. */
const WEATHER_SPEED_ABILITIES: Record<
  "sun" | "rain" | "sand" | "snow",
  string
> = {
  sun: "chlorophyll",
  rain: "swiftswim",
  sand: "sandrush",
  snow: "slushrush",
};

/** Normalize ability strings ("Swift Swim", "swift-swim", "swiftSwim") to a compact id. */
function normalizeAbility(ability: string | undefined): string {
  if (!ability) return "";
  return ability.toLowerCase().replace(/[\s_-]+/g, "");
}

// =============================================================================
// Stage formula
// =============================================================================

/** Stage modifier per the standard Showdown formula. Stages clamped to [-6, +6]. */
function stageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return Math.max(2, 2 + s) / Math.max(2, 2 - s);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Apply all speed modifiers to a base computed Speed stat.
 *
 * Order: stage → item → paralysis → ability+weather → tailwind. Result is
 * floored at each multiplicative step that competitive rules round at.
 *
 * @param speed - Pre-computed Speed stat (e.g., from {@link calculateStat})
 * @param mods - Modifier set to apply
 * @returns Effective Speed after all modifiers
 */
export function applySpeedModifiers(
  speed: number,
  mods: SpeedModifiers
): number {
  let value = speed;

  // Stage modifier (e.g., +1 = ×1.5, -1 = ×0.66)
  const stage = mods.stage ?? 0;
  if (stage !== 0) {
    value = Math.floor(value * stageMultiplier(stage));
  }

  // Item multiplier (Quick Powder gated on Ditto)
  if (mods.item) {
    const item = SPEED_ITEMS[mods.item];
    if (item && item.multiplier !== 1) {
      const isQuickPowderEligible =
        mods.item !== "quick-powder" || mods.isDitto === true;
      if (isQuickPowderEligible) {
        value = Math.floor(value * item.multiplier);
      }
    }
  }

  // Paralysis: ×½ in Gen 7+ (Quick Feet immune is handled by ability boost block)
  if (mods.status === "paralyzed") {
    const ability = normalizeAbility(mods.ability);
    if (ability !== "quickfeet") {
      value = Math.floor(value * 0.5);
    }
  }

  // Ability + weather speed boosts
  const ability = normalizeAbility(mods.ability);
  const weather = mods.field?.weather;
  if (ability && weather && weather !== "none") {
    const expectedAbility = WEATHER_SPEED_ABILITIES[weather];
    if (ability === expectedAbility) {
      value = Math.floor(value * 2);
    }
  }
  // Quick Feet boosts speed by 1.5× when statused (paralysis already exempted above).
  if (ability === "quickfeet" && mods.status && mods.status !== "healthy") {
    value = Math.floor(value * 1.5);
  }

  // Unburden: ×2 when item consumed (only for mons with Unburden ability)
  if (mods.unburden && ability === "unburden") {
    value = Math.floor(value * 2);
  }

  // Tailwind: ×2 (applied last)
  if (mods.field?.tailwind) {
    value = Math.floor(value * 2);
  }

  return value;
}

/**
 * Bucket effective speed into a verbal tier for display.
 * Boundaries calibrated for L50 competitive play.
 */
export function getSpeedTierLabel(effectiveSpeed: number): SpeedTierLabel {
  if (effectiveSpeed < 60) return "very slow";
  if (effectiveSpeed < 90) return "slow";
  if (effectiveSpeed < 110) return "mid-slow";
  if (effectiveSpeed < 130) return "mid";
  if (effectiveSpeed < 160) return "mid-fast";
  if (effectiveSpeed < 200) return "fast";
  return "very fast";
}

/**
 * Group an array of records by their speed, sorted descending by speed.
 *
 * Records that share a speed value are bucketed into the same group. Order
 * within a group preserves the input order.
 */
export function groupBySpeed<T extends { speed: number }>(
  items: readonly T[]
): { speed: number; items: T[] }[] {
  const buckets = new Map<number, T[]>();
  for (const item of items) {
    const bucket = buckets.get(item.speed);
    if (bucket) {
      bucket.push(item);
    } else {
      buckets.set(item.speed, [item]);
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => b - a)
    .map(([speed, group]) => ({ speed, items: group }));
}

/**
 * Speed-affecting items legal in a given format.
 *
 * Pulls from the curated catalogue above. For modern Champions formats (Reg
 * M-A and Reg M-B) this returns just `choice-scarf`. For older / classic
 * formats it returns the full set so calculations and pickers reflect what the
 * format actually allows.
 */
export function getSpeedAffectingItems(
  format: GameFormat
): SpeedAffectingItem[] {
  const useModernSet = CHAMPIONS_FORMAT_IDS.has(format.id);
  const legalIds = useModernSet
    ? MODERN_LEGAL_ITEM_IDS
    : new Set(Object.keys(SPEED_ITEMS));

  return Array.from(legalIds)
    .map((id) => SPEED_ITEMS[id])
    .filter((item): item is SpeedAffectingItem => item !== undefined);
}
