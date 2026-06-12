import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UsageInspector } from "../usage-inspector";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getActiveFormats: () => [
    { id: "gen9vgc2025regg", label: "VGC 2025 Reg G", isChampions: false },
  ],
  getFormatById: (id: string) => ({ id }),
  VGC_FORMATS: [{ id: "gen9vgc2025regg", label: "VGC 2025 Reg G" }],
}));

jest.mock("@trainers/utils", () => ({
  formatTimeAgo: (s: string) => `ago(${s})`,
}));

// Mutable mock so individual tests can override return values.
const mockUseApiQuery = jest.fn();

// useApiQuery now lives behind the dedicated react-query subpath. The component
// also imports FormatUsageRow / SpeciesUsagePeriod from "@trainers/supabase",
// but those are type-only and erased at runtime — no module mock needed.
jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

// =============================================================================
// Helpers
// =============================================================================

/** Default idle result — no data, no error, not loading. */
const idleResult = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  isFetching: false,
};

// =============================================================================
// Tests
// =============================================================================

describe("UsageInspector", () => {
  beforeEach(() => {
    // Default: all three queries idle with no data.
    mockUseApiQuery.mockReturnValue(idleResult);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<UsageInspector />);
    // Component mounted — the species table header is always present
    expect(screen.getByText(/Species/)).toBeInTheDocument();
  });

  it("renders the stat strip empty state when no meta bucket is available", () => {
    render(<UsageInspector />);
    expect(screen.getByText(/No usage computed/i)).toBeInTheDocument();
  });

  it("renders the species table empty state when no usage rows are available", () => {
    render(<UsageInspector />);
    expect(
      screen.getByText(/No species data for this selection/i)
    ).toBeInTheDocument();
  });

  it("renders the column headers in the species ranking table", () => {
    render(<UsageInspector />);
    // Table header row labels
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("Species")).toBeInTheDocument();
    expect(screen.getByText(/USG %/i)).toBeInTheDocument();
  });

  it("renders the filter controls area", () => {
    const { container } = render(<UsageInspector />);
    // Three select controls render: Format, Source, Period.
    // Base UI Select renders triggers as buttons with aria-haspopup="listbox".
    const triggers = container.querySelectorAll(
      "button[aria-haspopup='listbox']"
    );
    expect(triggers.length).toBeGreaterThanOrEqual(3);
  });

  it("does not render 'first_party' as a source label — uses 'trainers.gg' instead", () => {
    render(<UsageInspector />);
    // The old label "First-party" should not appear anywhere
    expect(screen.queryByText("First-party")).not.toBeInTheDocument();
  });

  // ===========================================================================
  // Error states (CodeRabbit finding: errors were silently swallowed)
  // ===========================================================================

  describe("error states", () => {
    it("renders the stat strip error alert (Query 2 failure) instead of 'No usage computed'", () => {
      // Query 1 (usage rows) returns successfully with one row so topSpecies is set.
      // Query 2 (meta detail) returns an error.
      // Query 3 (expanded detail) is idle.
      const errorResult = {
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("HTTP 500"),
        isFetching: false,
      };

      const usageRowsResult = {
        data: [
          {
            species: "Rillaboom",
            rank: 1,
            usagePct: 42.5,
            usageChange7d: 1.2,
          },
        ],
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      };

      // useApiQuery is called three times in order:
      //   call 1 → Query 1 (usage rows)
      //   call 2 → Query 2 (meta/stat strip)
      //   call 3 → Query 3 (expanded detail)
      mockUseApiQuery
        .mockReturnValueOnce(usageRowsResult) // Q1
        .mockReturnValueOnce(errorResult) // Q2 — triggers stat-strip error
        .mockReturnValueOnce(idleResult); // Q3

      render(<UsageInspector />);

      expect(
        screen.getByText(/Failed to load usage stats/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();

      // Empty state must NOT render in place of the error
      expect(screen.queryByText(/No usage computed/i)).not.toBeInTheDocument();
    });

    it("renders the species rankings error alert (Query 1 failure) instead of 'No species data'", () => {
      const errorResult = {
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("HTTP 401"),
        isFetching: false,
      };

      mockUseApiQuery
        .mockReturnValueOnce(errorResult) // Q1 — triggers table error
        .mockReturnValueOnce(idleResult) // Q2
        .mockReturnValueOnce(idleResult); // Q3

      render(<UsageInspector />);

      expect(
        screen.getByText(/Failed to load species rankings/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/HTTP 401/)).toBeInTheDocument();

      // Empty state must NOT render in place of the error
      expect(
        screen.queryByText(/No species data for this selection/i)
      ).not.toBeInTheDocument();
    });

    it("renders the species detail error alert (Query 3 failure) in the expanded panel", async () => {
      const user = userEvent.setup();

      const usageRowsResult = {
        data: [
          {
            species: "Rillaboom",
            rank: 1,
            usagePct: 42.5,
            usageChange7d: 1.2,
          },
        ],
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      };

      const detailErrorResult = {
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("HTTP 403"),
        isFetching: false,
      };

      // Expand a row to trigger Q3.  useApiQuery is called on every render, so
      // set up the mock to always return the same per-query values.
      mockUseApiQuery.mockImplementation((key: unknown) => {
        // Q1 key starts with ["usage", "species", ...]
        if (Array.isArray(key) && key[1] === "species" && key.length === 5) {
          return usageRowsResult;
        }
        // Q3 key: ["usage", "species-detail", ..., expandedSpecies, 1]
        // After the user clicks a row, expandedSpecies is non-null.
        if (Array.isArray(key) && key[1] === "species-detail") {
          return detailErrorResult;
        }
        return idleResult;
      });

      render(<UsageInspector />);

      // Click the Rillaboom row to expand it
      const rillaboomButton = screen.getByRole("button", {
        name: /rillaboom/i,
      });
      await user.click(rillaboomButton);

      expect(
        screen.getByText(/Failed to load species detail/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/HTTP 403/)).toBeInTheDocument();
    });

    it("shows the raw error message when the error is not an Error instance", () => {
      const errorResult = {
        data: undefined,
        isLoading: false,
        isError: true,
        error: "string error", // non-Error shape
        isFetching: false,
      };

      mockUseApiQuery
        .mockReturnValueOnce(errorResult) // Q1
        .mockReturnValueOnce(idleResult) // Q2
        .mockReturnValueOnce(idleResult); // Q3

      render(<UsageInspector />);

      // Falls back to generic copy when error is not an Error instance
      expect(screen.getByText(/Unexpected error/i)).toBeInTheDocument();
    });
  });
});
