// Shared types for external-data.tsx and expanded-row-data.tsx.
// Kept in a dedicated file to avoid a sibling import cycle.

export interface RK9EventRow {
  event_id: string;
  name: string;
  tier: string;
  format_id: string | null;
  date_start: string;
  date_end: string | null;
  location_city: string | null;
  location_country: string | null;
  player_count: number | null;
  has_team_lists: boolean;
  import_status: string;
  import_error: string | null;
  teams_imported_count: number | null;
}

export interface LimitlessTournamentRow {
  tournament_id: string;
  name: string;
  format_id: string;
  date: string;
  player_count: number;
  platform: string | null;
  is_online: boolean;
  decklists: boolean;
  data_imported_at: string | null;
  import_status: string | null;
  import_requested_at: string | null;
  import_error: string | null;
  import_attempts: number | null;
}

// Unified row that merges both sources
export interface UnifiedRow {
  id: string;
  source: "rk9" | "limitless";
  name: string;
  category: string; // tier for RK9, format code for Limitless
  date: string;
  playerCount: number | null;
  status: string; // normalized status
  statusDetail: string; // original status for display
  error: string | null;
  // Filterable extras
  platform: string | null; // "SWITCH" | "SIM" (Limitless only)
  isOnline: boolean | null; // Limitless only
  hasData: boolean; // has_team_lists (RK9) or decklists (Limitless)
  country: string | null; // RK9 location_country
  // Source-specific extras
  rk9?: RK9EventRow;
  limitless?: LimitlessTournamentRow;
}

// ---------------------------------------------------------------------------
// Bulk-action selectors — operate on a row list (already filtered by the
// caller) and return the native source ids eligible for each bulk action.
// Keeping these pure makes the filter-aware bulk logic unit-testable.
// ---------------------------------------------------------------------------

/** Limitless tournament_ids eligible to queue: never-queued (null) or failed. */
export function queueableIds(rows: UnifiedRow[]): string[] {
  return rows
    .filter(
      (r) =>
        r.source === "limitless" &&
        r.limitless != null &&
        (!r.limitless.import_status || r.limitless.import_status === "failed")
    )
    .map((r) => r.limitless!.tournament_id);
}

/** RK9 event_ids eligible for a roster scrape: pending or failed. */
export function rosterEligibleIds(rows: UnifiedRow[]): string[] {
  return rows
    .filter(
      (r) =>
        r.source === "rk9" &&
        r.rk9 != null &&
        (r.rk9.import_status === "pending" || r.rk9.import_status === "failed")
    )
    .map((r) => r.rk9!.event_id);
}

/** RK9 event_ids eligible for a teams scrape: roster, teams, or complete. */
export function teamsEligibleIds(rows: UnifiedRow[]): string[] {
  return rows
    .filter(
      (r) =>
        r.source === "rk9" &&
        r.rk9 != null &&
        ["roster", "teams", "complete"].includes(r.rk9.import_status)
    )
    .map((r) => r.rk9!.event_id);
}

