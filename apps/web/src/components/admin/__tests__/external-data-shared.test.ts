import {
  isQueueable,
  queueableIds,
  rosterEligibleIds,
  teamsEligibleIds,
  type UnifiedRow,
} from "../external-data-shared";
import { deriveDisplayStatus } from "../display-status";

function limRow(id: string, import_status: string | null): UnifiedRow {
  // Real "completed" rows carry a data_imported_at timestamp — mirror that so
  // the derived display status resolves to "imported" (not queueable).
  const format_id = "gen9championsvgc2026regma"; // a mapped (valid) format id
  const data_imported_at =
    import_status === "completed" ? "2026-06-05T00:00:00Z" : null;
  // Build the row first, then derive the unified (coarse) displayStatus the same
  // way production does — keeps the fixture consistent with deriveDisplayStatus.
  const row: UnifiedRow = {
    id: `limitless-${id}`,
    source: "limitless",
    name: id,
    category: "M-A",
    date: "2026-06-04",
    playerCount: 10,
    status: "pending",
    statusDetail: import_status ?? "pending",
    displayStatus: "pending",
    error: null,
    platform: null,
    isOnline: null,
    hasData: false,
    country: null,
    limitless: {
      tournament_id: id,
      name: id,
      format_id,
      date: "2026-06-04",
      player_count: 10,
      platform: null,
      is_online: null,
      decklists: false,
      data_imported_at,
      import_status,
      import_requested_at: null,
      import_error: null,
      import_attempts: 0,
    },
  };
  return { ...row, displayStatus: deriveDisplayStatus(row) };
}

function rk9Row(
  id: string,
  import_status: string,
  overrides: Partial<{ status: string; date_start: string }> = {}
): UnifiedRow {
  return {
    id: `rk9-${id}`,
    source: "rk9",
    name: id,
    category: "VG",
    date: overrides.date_start ?? "2026-06-04",
    playerCount: 10,
    status: overrides.status ?? "pending",
    statusDetail: import_status,
    displayStatus: "pending",
    error: null,
    platform: null,
    isOnline: null,
    hasData: false,
    country: "US",
    rk9: {
      event_id: id,
      name: id,
      tier: "VG",
      format_id: "gen9vgc2025regg",
      date_start: overrides.date_start ?? "2026-06-04",
      date_end: "2026-06-04",
      location_city: null,
      location_country: "US",
      player_count: 10,
      has_team_lists: false,
      import_status,
      import_error: null,
      teams_imported_count: 0,
      import_attempts: 0,
      import_requested_at: null,
      imported_at: null,
    },
  };
}

describe("queueableIds (Limitless)", () => {
  it("returns tournament ids for rows with null or failed status only", () => {
    const rows = [
      limRow("a", null),
      limRow("b", "queued"),
      limRow("c", "failed"),
      limRow("d", "completed"),
      limRow("e", "skipped"),
    ];
    expect(queueableIds(rows)).toEqual(["a", "c"]);
  });
  it("ignores rk9 rows", () => {
    expect(queueableIds([rk9Row("x", "pending")])).toEqual([]);
  });
});

describe("rosterEligibleIds (RK9)", () => {
  it("returns event ids for pending/failed events", () => {
    const rows = [
      rk9Row("a", "pending"),
      rk9Row("b", "failed"),
      rk9Row("c", "roster"),
      rk9Row("d", "complete"),
    ];
    expect(rosterEligibleIds(rows)).toEqual(["a", "b"]);
  });
});

describe("teamsEligibleIds (RK9)", () => {
  it("returns event ids for roster/teams/complete events", () => {
    const rows = [
      rk9Row("a", "pending"),
      rk9Row("b", "roster"),
      rk9Row("c", "teams"),
      rk9Row("d", "complete"),
    ];
    expect(teamsEligibleIds(rows)).toEqual(["b", "c", "d"]);
  });
});

// =============================================================================
// isQueueable — single source of truth for UI eligibility
// =============================================================================

describe("isQueueable (RK9)", () => {
  it.each([
    ["pending", true],
    ["failed", true],
    ["queued", false],
    ["roster", false],
    ["teams", false],
    ["complete", false],
  ])("rk9 import_status=%s → isQueueable=%s", (import_status, expected) => {
    expect(isQueueable(rk9Row("x", import_status))).toBe(expected);
  });

  it("returns false for an upcoming RK9 row regardless of import_status", () => {
    // Upcoming rows have status="upcoming" set by the caller — simulate that
    const upcomingPending = rk9Row("u", "pending", {
      status: "upcoming",
      date_start: "2999-01-01",
    });
    expect(isQueueable(upcomingPending)).toBe(false);
  });
});

describe("isQueueable (Limitless)", () => {
  it.each([
    // null import_status → pending → queueable
    [null, true],
    // explicit failed → queueable
    ["failed", true],
    // already queued → not queueable
    ["queued", false],
    // actively importing → not queueable
    ["importing", false],
    // fully imported — completed row has data_imported_at set → displayStatus "imported"
    ["completed", false],
  ])(
    "limitless import_status=%s → isQueueable=%s",
    (import_status, expected) => {
      expect(isQueueable(limRow("y", import_status))).toBe(expected);
    }
  );

  it("returns false for a limitless row with an unmapped format_id (skipped)", () => {
    // Rows with unmapped format resolve to displayStatus "skipped" — not queueable
    const row: UnifiedRow = {
      ...limRow("z", null),
      displayStatus: "skipped",
    };
    expect(isQueueable(row)).toBe(false);
  });
});
