import { deriveDisplayStatus } from "../display-status";
import { type RK9EventRow, type UnifiedRow } from "../external-data-shared";

const MAPPED = "gen9championsvgc2026regma";

function limRow(
  o: Partial<{
    import_status: string | null;
    format_id: string;
    data_imported_at: string | null;
  }> = {}
): UnifiedRow {
  return {
    id: "l",
    source: "limitless",
    name: "n",
    category: "M-A",
    date: "2026-01-01",
    playerCount: 1,
    status: "pending",
    statusDetail: "",
    displayStatus: "pending",
    error: null,
    platform: null,
    isOnline: null,
    hasData: false,
    country: null,
    limitless: {
      tournament_id: "t",
      name: "n",
      format_id: o.format_id ?? MAPPED,
      date: "2026-01-01",
      player_count: 1,
      platform: null,
      is_online: false,
      decklists: false,
      data_imported_at: o.data_imported_at ?? null,
      import_status: o.import_status ?? null,
      import_requested_at: null,
      import_error: null,
      import_attempts: 0,
    },
  };
}

function rk9Row(
  normalizedStatus: string,
  rk9Overrides: Partial<RK9EventRow> = {}
): UnifiedRow {
  return {
    id: "r",
    source: "rk9",
    name: "n",
    category: "masters",
    date: "2026-01-01",
    playerCount: 1,
    status: normalizedStatus,
    statusDetail: "",
    displayStatus: "pending",
    error: null,
    platform: null,
    isOnline: null,
    hasData: false,
    country: null,
    rk9: {
      event_id: "e",
      name: "n",
      tier: "masters",
      format_id: null,
      date_start: "2026-01-01",
      date_end: null,
      location_city: null,
      location_country: null,
      player_count: 1,
      has_team_lists: false,
      import_status: "pending",
      import_error: null,
      teams_imported_count: 0,
      ...rk9Overrides,
    },
  };
}

describe("deriveDisplayStatus", () => {
  it.each([
    [
      "limitless CUSTOM → skipped",
      limRow({ format_id: "CUSTOM", import_status: "skipped" }),
      "skipped",
    ],
    [
      "limitless queued → queued",
      limRow({ import_status: "queued" }),
      "queued",
    ],
    [
      "limitless importing → in-progress",
      limRow({ import_status: "importing" }),
      "in-progress",
    ],
    [
      "limitless imported → imported",
      limRow({ data_imported_at: "2026-01-02" }),
      "imported",
    ],
    [
      "limitless failed → failed",
      limRow({ import_status: "failed" }),
      "failed",
    ],
    ["limitless pending → pending", limRow({ import_status: null }), "pending"],
  ])("%s", (_l, row, expected) => {
    expect(deriveDisplayStatus(row)).toBe(expected);
  });

  it.each([
    ["rk9 upcoming → pending", rk9Row("upcoming"), "pending"],
    ["rk9 pending → pending", rk9Row("pending"), "pending"],
    ["rk9 queued → queued", rk9Row("queued"), "queued"],
    ["rk9 in-progress → in-progress", rk9Row("in-progress"), "in-progress"],
    // A genuinely complete event (teams actually imported) stays as "imported"
    [
      "rk9 complete with teams → imported",
      rk9Row("complete", { teams_imported_count: 5, player_count: 5 }),
      "imported",
    ],
    ["rk9 failed → failed", rk9Row("failed"), "failed"],
  ])("%s", (_l, row, expected) => {
    expect(deriveDisplayStatus(row)).toBe(expected);
  });

  describe("defense-in-depth: complete+0teams guard", () => {
    it("marks 'complete' with 0 teams as in-progress when player_count > 0", () => {
      // This is the Site 1 bug scenario: scrapeRk9TeamsBatch wrote "complete"
      // but no teams were imported because standings weren't linked yet.
      const row = rk9Row("complete", {
        teams_imported_count: 0,
        player_count: 5,
      });
      expect(deriveDisplayStatus(row)).toBe("in-progress");
    });

    it("keeps 'complete' with 0 teams as imported when player_count === 0", () => {
      // A genuinely empty event (no players) is correctly complete even with 0 teams.
      const row = rk9Row("complete", {
        teams_imported_count: 0,
        player_count: 0,
      });
      expect(deriveDisplayStatus(row)).toBe("imported");
    });

    it("keeps 'complete' with 0 teams as imported when player_count is null", () => {
      // player_count null is treated as 0 (unknown/empty) — same as genuinely empty.
      const row = rk9Row("complete", {
        teams_imported_count: 0,
        player_count: null,
      });
      expect(deriveDisplayStatus(row)).toBe("imported");
    });
  });
});
