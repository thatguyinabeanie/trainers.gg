/**
 * Filter state for the move picker.
 *
 * Per-field semantics — see each property's JSDoc for the rule:
 *   - `types`, `categories`: OR multi-select (any match)
 *   - `roles`: AND multi-select (must carry all)
 *   - `search`: substring match across name/effect/type/category
 *
 * Consumed by `move-sidebar.tsx` (left panel) and `move-picker.tsx`
 * (the orchestrator).
 */

import { type RoleId } from "./role-registry";

export type MoveCategory = "Physical" | "Special" | "Status";

export type MoveFilterState = {
  /** Free-text query — matches move name, effect, type, category. */
  search: string;
  /** OR multi-select. */
  types: readonly string[];
  /** OR multi-select. */
  categories: readonly MoveCategory[];
  /**
   * AND multi-select role IDs (see `role-registry.ROLE_PRESETS`).
   * A move is kept only when it carries every selected role — picking
   * "Hazards" + "Pivot" (the actual role labels) surfaces moves that
   * carry both tags, not either.
   */
  roles: readonly RoleId[];
};

export const DEFAULT_MOVE_FILTERS: MoveFilterState = {
  search: "",
  types: [],
  categories: [],
  roles: [],
};
