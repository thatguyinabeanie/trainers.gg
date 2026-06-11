/**
 * Tests for RowActions.
 *
 * Coverage targets (branches in external-data-row-actions.tsx):
 *  - RK9 + isUpcomingRow → null
 *  - RK9 + complete + has_team_lists → CheckCircle2 + reset button
 *  - RK9 + pending/failed/roster/teams/complete-no-teams → Import button
 *  - RK9 + import_status "pending" → no Trash2 reset button
 *  - RK9 + isBusy (queuingIds includes event_id) → Loader2 spinner
 *  - RK9 + fallthrough (unknown status that isn't any of the above) → null
 *  - Limitless + pending/failed displayStatus → Import button
 *  - Limitless + other displayStatus → null
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-testid="import-button">
      {children}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { RowActions } from "../external-data-row-actions";
import { type UnifiedRow } from "../external-data-shared";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeRk9Row(
  importStatus: string,
  hasTeamLists = false,
  overrides: Partial<UnifiedRow> = {}
): UnifiedRow {
  return {
    id: "evt-1",
    source: "rk9",
    name: "Test Event",
    category: "Masters",
    date: "2024-01-01",
    playerCount: 100,
    status: importStatus,
    displayStatus: "pending",
    statusDetail: importStatus,
    error: null,
    platform: null,
    isOnline: null,
    hasData: hasTeamLists,
    country: "US",
    rk9: {
      event_id: "evt-1",
      name: "Test Event",
      tier: "Masters",
      format_id: null,
      date_start: "2024-01-01",
      date_end: null,
      location_city: null,
      location_country: "US",
      player_count: 100,
      has_team_lists: hasTeamLists,
      import_status: importStatus,
      import_error: null,
      teams_imported_count: null,
      import_attempts: null,
      import_requested_at: null,
      imported_at: null,
    },
    ...overrides,
  };
}

function makeLimitlessRow(
  displayStatus: UnifiedRow["displayStatus"],
  importStatus: string | null = null
): UnifiedRow {
  return {
    id: "lim-1",
    source: "limitless",
    name: "Limitless Tournament",
    category: "SWSH",
    date: "2024-01-01",
    playerCount: 64,
    status: importStatus ?? "pending",
    displayStatus,
    statusDetail: importStatus ?? "pending",
    error: null,
    platform: "SWITCH",
    isOnline: true,
    hasData: false,
    country: null,
    limitless: {
      tournament_id: "lim-1",
      name: "Limitless Tournament",
      format_id: "SWSH",
      date: "2024-01-01",
      player_count: 64,
      platform: "SWITCH",
      is_online: true,
      decklists: false,
      data_imported_at: null,
      import_status: importStatus,
      import_requested_at: null,
      import_error: null,
      import_attempts: null,
    },
  };
}

const BASE_PROPS = {
  queuingIds: new Set<string>(),
  batchQueuing: false,
  isUpcomingRow: false,
  onImport: jest.fn(),
  onResetEvent: jest.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RowActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // RK9 branch
  // -------------------------------------------------------------------------
  describe("RK9 rows", () => {
    it("renders nothing when isUpcomingRow is true", () => {
      const { container } = render(
        <RowActions
          {...BASE_PROPS}
          row={makeRk9Row("pending")}
          isUpcomingRow={true}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders CheckCircle2 and reset button for complete + has_team_lists", () => {
      render(
        <RowActions
          {...BASE_PROPS}
          row={makeRk9Row("complete", true)}
          isUpcomingRow={false}
        />
      );
      // CheckCircle2 is an SVG — confirm no Import button
      expect(screen.queryByTestId("import-button")).not.toBeInTheDocument();
      // Reset button (Trash2) should be present (status !== "pending")
      expect(
        screen.getByRole("button", { name: "Reset event" })
      ).toBeInTheDocument();
    });

    it.each([
      ["pending", false],
      ["failed", false],
      ["roster", false],
      ["teams", false],
      ["complete", false], // complete but no team lists
    ])(
      "renders Import button for status '%s' (hasTeamLists=%s)",
      (importStatus: string, hasTeamLists: boolean) => {
        render(
          <RowActions
            {...BASE_PROPS}
            row={makeRk9Row(importStatus, hasTeamLists)}
            isUpcomingRow={false}
          />
        );
        expect(screen.getByTestId("import-button")).toBeInTheDocument();
      }
    );

    it("does NOT render the reset button when import_status is 'pending'", () => {
      render(
        <RowActions
          {...BASE_PROPS}
          row={makeRk9Row("pending")}
          isUpcomingRow={false}
        />
      );
      expect(
        screen.queryByRole("button", { name: "Reset event" })
      ).not.toBeInTheDocument();
    });

    it("renders reset button when import_status is not 'pending'", () => {
      render(
        <RowActions
          {...BASE_PROPS}
          row={makeRk9Row("failed")}
          isUpcomingRow={false}
        />
      );
      expect(
        screen.getByRole("button", { name: "Reset event" })
      ).toBeInTheDocument();
    });

    it("shows Loader2 spinner and disables Import button when event is busy (queuingIds)", () => {
      render(
        <RowActions
          {...BASE_PROPS}
          row={makeRk9Row("pending")}
          queuingIds={new Set(["evt-1"])}
          isUpcomingRow={false}
        />
      );
      const btn = screen.getByTestId("import-button");
      expect(btn).toBeDisabled();
    });

    it("calls onImport with the row when Import button is clicked", () => {
      const onImport = jest.fn();
      const row = makeRk9Row("pending");
      render(
        <RowActions
          {...BASE_PROPS}
          row={row}
          onImport={onImport}
          isUpcomingRow={false}
        />
      );
      fireEvent.click(screen.getByTestId("import-button"));
      expect(onImport).toHaveBeenCalledWith(row);
    });

    it("calls onResetEvent with the event_id when reset button is clicked", () => {
      const onReset = jest.fn();
      render(
        <RowActions
          {...BASE_PROPS}
          row={makeRk9Row("failed")}
          onResetEvent={onReset}
          isUpcomingRow={false}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "Reset event" }));
      expect(onReset).toHaveBeenCalledWith("evt-1");
    });

    it("renders nothing for an unknown RK9 status that doesn't match any branch", () => {
      // status "queued" is not one of the import-button statuses and not "complete"
      // so the component falls through to return null
      const { container } = render(
        <RowActions
          {...BASE_PROPS}
          row={makeRk9Row("queued")}
          isUpcomingRow={false}
        />
      );
      // "queued" isn't in the allowed Import button statuses nor complete+hasTeamLists
      // → hits `return null` at line 84
      expect(container.firstChild).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Limitless branch
  // -------------------------------------------------------------------------
  describe("Limitless rows", () => {
    it.each(["pending", "failed"] as const)(
      "renders Import button when displayStatus is '%s'",
      (status) => {
        render(
          <RowActions
            {...BASE_PROPS}
            row={makeLimitlessRow(status, status)}
            isUpcomingRow={false}
          />
        );
        expect(screen.getByTestId("import-button")).toBeInTheDocument();
      }
    );

    it.each(["queued", "in-progress", "imported", "skipped"] as const)(
      "renders nothing when displayStatus is '%s'",
      (status) => {
        const { container } = render(
          <RowActions
            {...BASE_PROPS}
            row={makeLimitlessRow(status)}
            isUpcomingRow={false}
          />
        );
        expect(container.firstChild).toBeNull();
      }
    );

    it("disables Import button when queuingIds includes the tournament_id", () => {
      render(
        <RowActions
          {...BASE_PROPS}
          row={makeLimitlessRow("pending")}
          queuingIds={new Set(["lim-1"])}
          isUpcomingRow={false}
        />
      );
      expect(screen.getByTestId("import-button")).toBeDisabled();
    });

    it("disables Import button when batchQueuing is true", () => {
      render(
        <RowActions
          {...BASE_PROPS}
          row={makeLimitlessRow("pending")}
          batchQueuing={true}
          isUpcomingRow={false}
        />
      );
      expect(screen.getByTestId("import-button")).toBeDisabled();
    });

    it("calls onImport with the row when Import button is clicked", () => {
      const onImport = jest.fn();
      const row = makeLimitlessRow("failed");
      render(
        <RowActions
          {...BASE_PROPS}
          row={row}
          onImport={onImport}
          isUpcomingRow={false}
        />
      );
      fireEvent.click(screen.getByTestId("import-button"));
      expect(onImport).toHaveBeenCalledWith(row);
    });
  });

  // -------------------------------------------------------------------------
  // Neither branch
  // -------------------------------------------------------------------------
  it("renders nothing for a row with source rk9 but no rk9 data", () => {
    const row: UnifiedRow = {
      ...makeRk9Row("pending"),
      rk9: undefined,
    };
    const { container } = render(
      <RowActions {...BASE_PROPS} row={row} isUpcomingRow={false} />
    );
    expect(container.firstChild).toBeNull();
  });
});
