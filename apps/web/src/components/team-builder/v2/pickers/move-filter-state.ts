/**
 * Filter state for the move picker.
 *
 * Multi-select OR semantics: a move passes the filter if it matches AT LEAST ONE
 * value in each non-empty array (and search matches if non-empty). Consumed by
 * `move-sidebar.tsx` (left panel) and `move-picker.tsx` (the orchestrator).
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
  /** OR multi-select role IDs (see `role-registry.ROLE_PRESETS`). */
  roles: readonly RoleId[];
};

export const DEFAULT_MOVE_FILTERS: MoveFilterState = {
  search: "",
  types: [],
  categories: [],
  roles: [],
};
