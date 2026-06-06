import {
  queueableIds,
  rosterEligibleIds,
  teamsEligibleIds,
  type UnifiedRow,
} from "../external-data-shared";
import { deriveLimitlessDisplayStatus } from "../limitless-display-status";

function limRow(id: string, import_status: string | null): UnifiedRow {
  // Real "completed" rows carry a data_imported_at timestamp — mirror that so
  // the derived display status resolves to "imported" (not queueable).
  const format_id = "gen9championsvgc2026regma"; // a mapped (valid) format id
  const data_imported_at =
    import_status === "completed" ? "2026-06-05T00:00:00Z" : null;
  return {
    id: `limitless-${id}`,
    source: "limitless",
    name: id,
    category: "M-A",
    date: "2026-06-04",
    playerCount: 10,
    status: "pending",
    statusDetail: import_status ?? "pending",
    displayStatus: deriveLimitlessDisplayStatus({
      import_status,
      format_id,
      data_imported_at,
    }),
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
}

function rk9Row(id: string, import_status: string): UnifiedRow {
  return {
    id: `rk9-${id}`,
    source: "rk9",
    name: id,
    category: "VG",
    date: "2026-06-04",
    playerCount: 10,
    status: "pending",
    statusDetail: import_status,
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
      date_start: "2026-06-04",
      date_end: "2026-06-04",
      location_city: null,
      location_country: "US",
      player_count: 10,
      has_team_lists: false,
      import_status,
      import_error: null,
      teams_imported_count: 0,
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
