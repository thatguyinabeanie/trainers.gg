/**
 * landing-prefs-types.ts
 *
 * Shared types and defaults for the builder landing UI-preferences store.
 * These preferences are persisted in localStorage and restored on mount to
 * avoid SSR/hydration mismatches. All consumers should default to
 * `DEFAULT_LANDING_PREFS` before hydration completes.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * How the team list on the builder landing is ordered.
 *
 * - `"recent"`      — by `updatedAt` descending (default)
 * - `"name"`        — alphabetical by team name
 * - `"format"`      — grouped/sorted by format string
 * - `"completeness"` — by number of filled slots descending
 * - `"custom"`      — manual drag-and-drop order (uses `sortOrder` on the draft)
 */
export type SortMode =
  | "recent"
  | "name"
  | "format"
  | "completeness"
  | "custom";

/**
 * Visual density of the draft card list on the builder landing.
 *
 * - `"comfortable"` — default; spacious rows with species sprites visible
 * - `"compact"`     — condensed rows for power users with many drafts
 */
export type Density = "comfortable" | "compact";

/** Persisted UI preferences for the builder landing page. */
export interface LandingPrefs {
  /** Active sort mode for the team list. */
  sort: SortMode;
  /** Visual density of the draft list. */
  density: Density;
  /** Whether the folder rail (left sidebar) is collapsed. */
  railCollapsed: boolean;
  /**
   * ID of the currently-selected folder in the rail.
   * `null` means "All teams" (no folder filter applied).
   */
  selectedFolderId: string | null;
}

// =============================================================================
// Defaults
// =============================================================================

/**
 * Canonical default landing preferences.
 * Used as the initial React state before hydration and as the
 * merge base when reading a partial or missing store value.
 */
export const DEFAULT_LANDING_PREFS: LandingPrefs = {
  sort: "recent",
  density: "comfortable",
  railCollapsed: false,
  selectedFolderId: null,
};
