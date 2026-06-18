/**
 * Move data utilities for Pokemon team builder.
 * Wraps @pkmn/dex move lookups for type, category, base power, and full move data.
 *
 * When a Champions format ID is supplied to getMoveData(), Champions-specific
 * move-attribute changes (base power, type, category, accuracy) are merged
 * over the @pkmn/dex values. The Champions move-changes dataset lives on the
 * regulation bundles in champions-reg-ma.ts / champions-reg-mb.ts.
 *
 * Cycle-avoidance: this file imports the two leaf bundle files directly rather
 * than going through format-legality.ts (which re-imports move-data.ts and
 * would form a cycle). Bundle resolution is a simple map lookup keyed on the
 * Champions format IDs from the same leaf file (format-legality.ts exports
 * the constants but they're just strings — we keep a local copy here to stay
 * cycle-free).
 */

import { Dex } from "@pkmn/dex";
import { Generations } from "@pkmn/data";

import { type ChampionsMoveChange, REG_MA_BUNDLE } from "./champions-reg-ma";
import { REG_MB_BUNDLE } from "./champions-reg-mb";
import { isChampionsFormatId } from "./formats";
import { type MoveHelperInput } from "./move-helpers";

const gens = new Generations(Dex);
const gen9 = gens.get(9);

/** The dex instance used for direct move lookups (full Move object access). */
const gen9Dex = Dex.forGen(9);

export type MoveCategory = "Physical" | "Special" | "Status";

/**
 * Fallback types for moves that @pkmn/dex Gen 9 data marks as nonstandard
 * (Past, Unobtainable) and the Generations wrapper filters out.
 * Key: move name as stored in the DB/team sheet.
 * Value: canonical type.
 */
const MOVE_TYPE_FALLBACKS: Record<string, string> = {
  "Light of Ruin": "Fairy",
};

// =============================================================================
// Champions move-change resolver
// =============================================================================

/**
 * Champions format ID → move-changes map. Keyed by the raw format ID strings
 * (avoids importing from format-legality.ts which would cycle).
 *
 * Both M-A and M-B point to the same map (M-B inherits M-A's changes by
 * reference) — this is intentional.
 *
 * Stored as a Map (not a plain Record) to prevent prototype-key collisions —
 * a formatId like "constructor" or "toString" would resolve an inherited
 * Object.prototype member and be mis-treated as a registered entry.
 */
const CHAMPIONS_MOVE_CHANGES_BY_FORMAT_ID = new Map<
  string,
  ReadonlyMap<string, ChampionsMoveChange>
>([
  ["gen9championsvgc2026regma", REG_MA_BUNDLE.moveChanges],
  ["gen9championsvgc2026regmb", REG_MB_BUNDLE.moveChanges],
]);

/**
 * Resolve the Champions move-changes map for a given format ID.
 * Returns `undefined` for non-Champions formats or unknown IDs.
 */
function getChampionsMoveChanges(
  formatId: string | null | undefined
): ReadonlyMap<string, ChampionsMoveChange> | undefined {
  if (!formatId || !isChampionsFormatId(formatId)) return undefined;
  return CHAMPIONS_MOVE_CHANGES_BY_FORMAT_ID.get(formatId);
}

/**
 * Get the type of a move (e.g., "Fire", "Water").
 * Returns null if the move is not found.
 */
export function getMoveType(moveName: string): string | null {
  if (MOVE_TYPE_FALLBACKS[moveName]) return MOVE_TYPE_FALLBACKS[moveName];
  try {
    const move = gen9.moves.get(moveName);
    if (!move?.exists) return null;
    return move.type;
  } catch {
    return null;
  }
}

/**
 * Get the category of a move (Physical, Special, or Status).
 * Returns null if the move is not found.
 */
export function getMoveCategory(moveName: string): MoveCategory | null {
  try {
    const move = gen9.moves.get(moveName);
    if (!move?.exists) return null;
    return move.category as MoveCategory;
  } catch {
    return null;
  }
}

/**
 * Get the base power of a move.
 * Returns null if the move is not found or has no base power (status moves).
 */
export function getMoveBP(moveName: string): number | null {
  try {
    const move = gen9.moves.get(moveName);
    if (!move?.exists) return null;
    return move.basePower || null;
  } catch {
    return null;
  }
}

/** Full move data for UI rendering. */
export interface MoveData {
  name: string;
  type: string;
  category: MoveCategory;
  basePower: number;
  /** Accuracy as a number (e.g. 100), or true if always hits, or 0 if unknown. */
  accuracy: number | true;
  shortDesc: string;
}

/**
 * Get full move data by name for UI rendering.
 *
 * When `formatId` is a Champions format, display-relevant Champions move
 * changes (type, category, basePower, accuracy) are merged over the vanilla
 * @pkmn/dex Gen 9 values so the move picker reflects accurate Champions stats.
 *
 * Non-Champions formats and an absent `formatId` → identical to the original
 * behavior (pure @pkmn/dex lookup).
 *
 * Returns null if the move does not exist in @pkmn/dex.
 */
export function getMoveData(
  moveName: string,
  formatId?: string | null
): MoveData | null {
  const move = gen9Dex.moves.get(moveName);
  if (!move?.exists) return null;

  // Start with the vanilla dex values.
  let type: string = move.type;
  let category: MoveCategory = move.category as MoveCategory;
  let basePower: number = move.basePower;
  let accuracy: number | true = move.accuracy;

  // Apply Champions overrides for display-relevant fields when active.
  const changes = getChampionsMoveChanges(formatId);
  if (changes) {
    const override = changes.get(move.name);
    if (override) {
      if (override.type !== undefined) type = override.type;
      if (override.category !== undefined) category = override.category;
      if (override.basePower !== undefined) basePower = override.basePower;
      if (override.accuracy !== undefined) accuracy = override.accuracy;
    }
  }

  return {
    name: move.name,
    type,
    category,
    basePower,
    accuracy,
    shortDesc: move.shortDesc,
  };
}

/**
 * Get the full dex Move object for a move name as a `MoveHelperInput`.
 * Returns null if the move does not exist.
 *
 * Use this instead of importing `@pkmn/dex` directly in client components —
 * the dex lookup stays in the shared package and out of the client bundle path.
 */
export function getMoveHelperInput(moveName: string): MoveHelperInput | null {
  const move = gen9Dex.moves.get(moveName);
  if (!move?.exists) return null;
  // The full Move object from @pkmn/dex is structurally compatible with
  // MoveHelperInput — it is a strict superset. The cast is safe here.
  return move as unknown as MoveHelperInput;
}
