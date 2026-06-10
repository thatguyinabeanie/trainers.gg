/**
 * Unit tests for StatusBadge — the unified import-status badge in the
 * external-data queue monitor.
 *
 * Covers every branch in StatusBadge:
 *  - displayStatus "queued" → amber Queued badge
 *  - displayStatus "skipped" → outline Skipped badge
 *  - status "upcoming" → Upcoming badge
 *  - status "complete" with source "rk9" → "Complete"
 *  - status "complete" with source "limitless" → "Imported"
 *  - status "in-progress" with limitless importing → "Importing" spinner
 *  - status "in-progress" with rk9 roster status → "Roster ready"
 *  - status "in-progress" fallthrough → "Teams partial"
 *  - status "failed" → "Failed" with optional attempt count
 *  - default (unknown status) → "Pending"
 */
import React from "react";
import { render, screen } from "@testing-library/react";

import { StatusBadge } from "../external-data-status-badge";
import { type UnifiedRow } from "../external-data-shared";

// ---------------------------------------------------------------------------
// Mock heavy UI primitives that are irrelevant to badge logic
// ---------------------------------------------------------------------------

jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant: _variant,
    className: _className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => <span data-testid="badge">{children}</span>,
}));

// ---------------------------------------------------------------------------
// Row fixture helpers (matching the shape established in external-data-shared.test.ts)
// ---------------------------------------------------------------------------

function baseRow(overrides: Partial<UnifiedRow> = {}): UnifiedRow {
  return {
    id: "test-1",
    source: "rk9",
    name: "Test Event",
    category: "VG",
    date: "2026-06-04",
    playerCount: null,
    status: "pending",
    displayStatus: "pending",
    statusDetail: "pending",
    error: null,
    platform: null,
    isOnline: null,
    hasData: false,
    country: null,
    ...overrides,
  };
}

function rk9Row(
  importStatus: string,
  overrides: Partial<UnifiedRow> = {}
): UnifiedRow {
  return baseRow({
    source: "rk9",
    rk9: {
      event_id: "evt-1",
      name: "Test Event",
      tier: "VG",
      format_id: null,
      date_start: "2026-06-04",
      date_end: null,
      location_city: null,
      location_country: null,
      player_count: null,
      has_team_lists: false,
      import_status: importStatus,
      import_error: null,
      teams_imported_count: null,
      import_attempts: null,
      import_requested_at: null,
      imported_at: null,
    },
    ...overrides,
  });
}

function limitlessRow(
  importStatus: string | null,
  extra: Partial<{ import_attempts: number }> = {}
): UnifiedRow {
  return baseRow({
    source: "limitless",
    limitless: {
      tournament_id: "t-1",
      name: "Test Tournament",
      format_id: "gen9vgc",
      date: "2026-06-04",
      player_count: 32,
      platform: null,
      is_online: false,
      decklists: false,
      data_imported_at: null,
      import_status: importStatus,
      import_requested_at: null,
      import_error: null,
      import_attempts: extra.import_attempts ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StatusBadge", () => {
  describe("displayStatus overrides", () => {
    it("renders 'Queued' amber badge when displayStatus is 'queued'", () => {
      render(
        <StatusBadge row={rk9Row("queued", { displayStatus: "queued" })} />
      );
      expect(screen.getByTestId("badge")).toHaveTextContent("Queued");
    });

    it("renders 'Skipped' outline badge when displayStatus is 'skipped'", () => {
      render(<StatusBadge row={limitlessRow(null, { import_attempts: 0 })} />);
      // For a row explicitly marked skipped
      render(
        <StatusBadge
          row={baseRow({
            source: "limitless",
            displayStatus: "skipped",
            status: "pending",
          })}
        />
      );
      // The last rendered badge shows ⊘ and "Skipped"
      const badges = screen.getAllByTestId("badge");
      const lastBadge = badges[badges.length - 1];
      expect(lastBadge).toHaveTextContent("Skipped");
      expect(lastBadge).toHaveTextContent("⊘");
    });
  });

  describe("status switch branches", () => {
    it("renders 'Upcoming' badge for status 'upcoming'", () => {
      render(
        <StatusBadge
          row={rk9Row("pending", {
            status: "upcoming",
            displayStatus: "upcoming",
          })}
        />
      );
      expect(screen.getByTestId("badge")).toHaveTextContent("Upcoming");
    });

    describe("status 'complete'", () => {
      it("renders 'Complete' for rk9 source", () => {
        render(
          <StatusBadge
            row={rk9Row("complete", {
              status: "complete",
              displayStatus: "complete",
            })}
          />
        );
        expect(screen.getByTestId("badge")).toHaveTextContent("Complete");
      });

      it("renders 'Imported' for limitless source", () => {
        render(
          <StatusBadge
            row={baseRow({
              source: "limitless",
              status: "complete",
              displayStatus: "complete",
              limitless: {
                tournament_id: "t-2",
                name: "Tourney",
                format_id: "gen9vgc",
                date: "2026-06-04",
                player_count: 10,
                platform: null,
                is_online: false,
                decklists: true,
                data_imported_at: "2026-06-05T00:00:00Z",
                import_status: "completed",
                import_requested_at: null,
                import_error: null,
                import_attempts: null,
              },
            })}
          />
        );
        expect(screen.getByTestId("badge")).toHaveTextContent("Imported");
      });
    });

    describe("status 'in-progress'", () => {
      it("renders 'Importing' spinner when limitless import_status is 'importing'", () => {
        render(
          <StatusBadge
            row={baseRow({
              source: "limitless",
              status: "in-progress",
              displayStatus: "in-progress",
              limitless: {
                tournament_id: "t-3",
                name: "Tourney",
                format_id: "gen9vgc",
                date: "2026-06-04",
                player_count: 10,
                platform: null,
                is_online: false,
                decklists: false,
                data_imported_at: null,
                import_status: "importing",
                import_requested_at: null,
                import_error: null,
                import_attempts: null,
              },
            })}
          />
        );
        expect(screen.getByTestId("badge")).toHaveTextContent("Importing");
      });

      it("renders 'Roster ready' when rk9 import_status is 'roster'", () => {
        render(
          <StatusBadge
            row={rk9Row("roster", {
              status: "in-progress",
              displayStatus: "in-progress",
            })}
          />
        );
        expect(screen.getByTestId("badge")).toHaveTextContent("Roster ready");
      });

      it("renders 'Teams partial' for in-progress rk9 rows not in roster status", () => {
        render(
          <StatusBadge
            row={rk9Row("teams", {
              status: "in-progress",
              displayStatus: "in-progress",
            })}
          />
        );
        expect(screen.getByTestId("badge")).toHaveTextContent("Teams partial");
      });

      it("renders 'Teams partial' as fallthrough for in-progress with no source-specific status", () => {
        render(
          <StatusBadge
            row={baseRow({
              status: "in-progress",
              displayStatus: "in-progress",
              source: "rk9",
              // rk9 sub-row with a non-roster, non-teams status
              rk9: {
                event_id: "evt-x",
                name: "X",
                tier: "VG",
                format_id: null,
                date_start: "2026-06-04",
                date_end: null,
                location_city: null,
                location_country: null,
                player_count: null,
                has_team_lists: false,
                import_status: "complete",
                import_error: null,
                teams_imported_count: null,
                import_attempts: null,
                import_requested_at: null,
                imported_at: null,
              },
            })}
          />
        );
        expect(screen.getByTestId("badge")).toHaveTextContent("Teams partial");
      });
    });

    describe("status 'failed'", () => {
      it("renders 'Failed' badge without attempt count when no import_attempts", () => {
        render(
          <StatusBadge
            row={rk9Row("failed", {
              status: "failed",
              displayStatus: "failed",
            })}
          />
        );
        expect(screen.getByTestId("badge")).toHaveTextContent("Failed");
        expect(screen.getByTestId("badge")).not.toHaveTextContent("x");
      });

      it("renders attempt count suffix when limitless import_attempts is set", () => {
        render(
          <StatusBadge
            row={baseRow({
              source: "limitless",
              status: "failed",
              displayStatus: "failed",
              limitless: {
                tournament_id: "t-4",
                name: "Fail Tourney",
                format_id: "gen9vgc",
                date: "2026-06-04",
                player_count: 10,
                platform: null,
                is_online: false,
                decklists: false,
                data_imported_at: null,
                import_status: "failed",
                import_requested_at: null,
                import_error: "Network error",
                import_attempts: 2,
              },
            })}
          />
        );
        expect(screen.getByTestId("badge")).toHaveTextContent("Failed (2x)");
      });
    });

    it("renders 'Pending' badge for default (unknown) status", () => {
      render(
        <StatusBadge
          row={baseRow({ status: "unknown", displayStatus: "pending" })}
        />
      );
      expect(screen.getByTestId("badge")).toHaveTextContent("Pending");
    });
  });

  describe("it.each — full branch matrix", () => {
    it.each([
      [
        "queued displayStatus",
        rk9Row("queued", { displayStatus: "queued" }),
        "Queued",
      ],
      [
        "upcoming status",
        rk9Row("pending", { status: "upcoming", displayStatus: "upcoming" }),
        "Upcoming",
      ],
      [
        "rk9 complete",
        rk9Row("complete", { status: "complete", displayStatus: "complete" }),
        "Complete",
      ],
      [
        "roster ready",
        rk9Row("roster", {
          status: "in-progress",
          displayStatus: "in-progress",
        }),
        "Roster ready",
      ],
      [
        "teams partial",
        rk9Row("teams", {
          status: "in-progress",
          displayStatus: "in-progress",
        }),
        "Teams partial",
      ],
      [
        "rk9 failed no count",
        rk9Row("failed", { status: "failed", displayStatus: "failed" }),
        "Failed",
      ],
      [
        "default pending",
        baseRow({ status: "unknown_status", displayStatus: "pending" }),
        "Pending",
      ],
    ])("renders expected text for %s", (_label, row, expectedText) => {
      const { unmount } = render(<StatusBadge row={row} />);
      expect(screen.getByTestId("badge")).toHaveTextContent(expectedText);
      unmount();
    });
  });
});
