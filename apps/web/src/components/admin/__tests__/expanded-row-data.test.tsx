/**
 * Tests for the ExpandedRowData component.
 * Covers: standings tab (RK9 + Limitless), Teams/Decklists tab toggle,
 * skeleton loading states, Load more button, and error display.
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUseSupabaseQuery = jest.fn();

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: (...args: unknown[]) => mockUseSupabaseQuery(...args),
}));

import { ExpandedRowData } from "../expanded-row-data";
import { type UnifiedRow } from "../external-data-shared";

// ── Test Fixtures ──────────────────────────────────────────────────────────

const rk9Row: UnifiedRow = {
  id: "rk9-test-event-1",
  source: "rk9",
  name: "Test Regional",
  category: "regional",
  date: "2025-01-15",
  playerCount: 100,
  status: "complete",
  statusDetail: "complete",
  error: null,
  platform: null,
  isOnline: null,
  hasData: true,
  country: "US",
  rk9: {
    event_id: "test-event-1",
    name: "Test Regional",
    tier: "regional",
    format_id: "fmt-vgc25",
    date_start: "2025-01-15",
    date_end: "2025-01-16",
    location_city: "Columbus",
    location_country: "US",
    player_count: 100,
    has_team_lists: true,
    import_status: "complete",
    import_error: null,
  },
};

const limitlessRow: UnifiedRow = {
  id: "limitless-test-tourney-1",
  source: "limitless",
  name: "Test Limitless Tournament",
  category: "VGC25",
  date: "2025-02-10",
  playerCount: 50,
  status: "complete",
  statusDetail: "completed",
  error: null,
  platform: "SWITCH",
  isOnline: false,
  hasData: true,
  country: null,
  limitless: {
    tournament_id: "test-tourney-1",
    name: "Test Limitless Tournament",
    format_id: "fmt-vgc25",
    date: "2025-02-10",
    player_count: 50,
    platform: "SWITCH",
    is_online: false,
    decklists: true,
    data_imported_at: "2025-02-11T00:00:00Z",
    import_status: "completed",
    import_requested_at: null,
    import_error: null,
    import_attempts: 1,
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Sample RK9 standings rows */
function makeRk9Standings(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    placement: i + 1,
    division: "masters",
    drop_round: null,
    players: {
      first_name: "Player",
      last_name: `${i + 1}`,
      country: "US",
      trainer_name: `Trainer${i + 1}`,
    },
  }));
}

/** Sample Limitless standings rows */
function makeLimitlessStandings(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    placement: i + 1,
    record_wins: 5 + i,
    record_losses: 2,
    record_ties: 0,
    players: {
      username: `user${i + 1}`,
      display_name: `DisplayUser${i + 1}`,
      country: "JP",
    },
  }));
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUseSupabaseQuery.mockReturnValue({
    data: [],
    error: null,
    isLoading: false,
    isFetching: false,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ExpandedRowData", () => {
  describe("RK9 row", () => {
    it("renders Standings and Teams pill buttons", () => {
      render(<ExpandedRowData row={rk9Row} />);

      expect(
        screen.getByRole("button", { name: /standings/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /teams/i })
      ).toBeInTheDocument();
      // Should NOT have a "Decklists" button for RK9
      expect(
        screen.queryByRole("button", { name: /decklists/i })
      ).not.toBeInTheDocument();
    });

    it("shows 5 skeleton rows while standings load", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: undefined,
        error: null,
        isLoading: true,
        isFetching: true,
      });

      const { container } = render(<ExpandedRowData row={rk9Row} />);

      // Skeleton elements are rendered via the Skeleton component — count them
      // The standings loading state renders exactly 5 skeletons with h-8
      const skeletons = container.querySelectorAll("[data-slot='skeleton']");
      expect(skeletons).toHaveLength(5);
    });

    it("renders standings table after data loads", () => {
      const standings = makeRk9Standings(3);
      mockUseSupabaseQuery.mockReturnValue({
        data: standings,
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      // Table headers
      expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /player/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /division/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /dropped/i })
      ).toBeInTheDocument();

      // Placement values
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();

      // Player names (trainer_name)
      expect(screen.getByText("Trainer1")).toBeInTheDocument();
      expect(screen.getByText("Trainer2")).toBeInTheDocument();
    });

    it("uses trainer_name when present, falls back to first + last name", () => {
      const standings = [
        {
          placement: 1,
          division: "masters",
          drop_round: null,
          players: {
            first_name: "Jane",
            last_name: "Doe",
            country: "US",
            trainer_name: "JaneTrainer",
          },
        },
        {
          placement: 2,
          division: "masters",
          drop_round: null,
          players: {
            first_name: "John",
            last_name: "Smith",
            country: "US",
            trainer_name: null, // no trainer_name → fall back to first + last
          },
        },
        {
          placement: 3,
          division: "masters",
          drop_round: null,
          players: null, // null players → show dash "—" in the Player column
        },
      ];

      mockUseSupabaseQuery.mockReturnValue({
        data: standings,
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      // trainer_name takes priority
      expect(screen.getByText("JaneTrainer")).toBeInTheDocument();
      // falls back to "first last"
      expect(screen.getByText("John Smith")).toBeInTheDocument();
      // null players → dash in the Player column (there will be multiple "—"
      // cells in the row for Division and Dropped too — just check at least one exists)
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Limitless row", () => {
    it("renders Standings and Decklists pill buttons (not Teams)", () => {
      render(<ExpandedRowData row={limitlessRow} />);

      expect(
        screen.getByRole("button", { name: /standings/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /decklists/i })
      ).toBeInTheDocument();
      // Should NOT have a "Teams" button for Limitless
      expect(
        screen.queryByRole("button", { name: /^teams$/i })
      ).not.toBeInTheDocument();
    });

    it("renders standings table with W-L-T record format", () => {
      const standings = makeLimitlessStandings(2);
      mockUseSupabaseQuery.mockReturnValue({
        data: standings,
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={limitlessRow} />);

      // Table headers
      expect(
        screen.getByRole("columnheader", { name: /player/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /record/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /country/i })
      ).toBeInTheDocument();

      // Player display names
      expect(screen.getByText("DisplayUser1")).toBeInTheDocument();
      expect(screen.getByText("DisplayUser2")).toBeInTheDocument();

      // Record in W-L-T format
      expect(screen.getByText("5-2-0")).toBeInTheDocument();
      expect(screen.getByText("6-2-0")).toBeInTheDocument();
    });
  });

  describe("load more", () => {
    it("shows Load more button when data.length equals standingsLimit (50)", () => {
      // 50 rows = default standingsLimit → should show "Load more…"
      const standings = Array.from({ length: 50 }, (_, i) => ({
        placement: i + 1,
        division: "masters",
        drop_round: null,
        players: { first_name: "Player", last_name: `${i + 1}`, country: "US", trainer_name: `T${i + 1}` },
      }));

      mockUseSupabaseQuery.mockReturnValue({
        data: standings,
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      expect(screen.getByText("Load more…")).toBeInTheDocument();
    });

    it("does NOT show Load more button when data.length is less than standingsLimit", () => {
      const standings = makeRk9Standings(3); // 3 < 50

      mockUseSupabaseQuery.mockReturnValue({
        data: standings,
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      expect(screen.queryByText("Load more…")).not.toBeInTheDocument();
    });

    it("clicking Load more refires the query with an increased limit", async () => {
      // Provide exactly 50 rows so the button is visible
      const standings = Array.from({ length: 50 }, (_, i) => ({
        placement: i + 1,
        division: "masters",
        drop_round: null,
        players: { first_name: "P", last_name: `${i}`, country: "US", trainer_name: `T${i}` },
      }));

      mockUseSupabaseQuery.mockReturnValue({
        data: standings,
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      const loadMoreBtn = screen.getByText("Load more…");
      await act(async () => {
        fireEvent.click(loadMoreBtn);
      });

      // After click, standingsLimit increments by 50 → 100.
      // useSupabaseQuery is called with deps [row.id, standingsLimit] — verify
      // the latest call includes the updated limit (100) in the deps array.
      await waitFor(() => {
        const allCalls = mockUseSupabaseQuery.mock.calls;
        const latestDeps = allCalls[allCalls.length - 1][1] as unknown[];
        expect(latestDeps).toContain(100);
      });
    });
  });

  describe("view toggle", () => {
    it("clicking Teams mounts TeamsPanel (second useSupabaseQuery call fires)", async () => {
      // Default call count is 1 (standings query only)
      render(<ExpandedRowData row={rk9Row} />);

      const initialCallCount = mockUseSupabaseQuery.mock.calls.length;

      const teamsBtn = screen.getByRole("button", { name: /teams/i });
      await act(async () => {
        fireEvent.click(teamsBtn);
      });

      // After switching to teams view, TeamsPanel mounts and fires a second
      // useSupabaseQuery call. Total calls should be > initialCallCount.
      await waitFor(() => {
        expect(mockUseSupabaseQuery.mock.calls.length).toBeGreaterThan(
          initialCallCount
        );
      });
    });

    it("clicking Standings from teams view hides teams content", async () => {
      // With no team data, TeamsPanel shows "No team data available."
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        error: null,
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      // Switch to teams
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /teams/i }));
      });

      await waitFor(() => {
        expect(
          screen.getByText("No team data available.")
        ).toBeInTheDocument();
      });

      // Switch back to standings
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /standings/i }));
      });

      await waitFor(() => {
        expect(
          screen.queryByText("No team data available.")
        ).not.toBeInTheDocument();
      });
    });

    it("clicking Decklists for Limitless row mounts DecklistsPanel", async () => {
      render(<ExpandedRowData row={limitlessRow} />);

      const initialCallCount = mockUseSupabaseQuery.mock.calls.length;

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /decklists/i }));
      });

      await waitFor(() => {
        expect(mockUseSupabaseQuery.mock.calls.length).toBeGreaterThan(
          initialCallCount
        );
      });
    });
  });

  describe("error state", () => {
    it("shows error message when standings query fails", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: undefined,
        error: { message: "Failed to fetch standings" },
        isLoading: false,
        isFetching: false,
      });

      render(<ExpandedRowData row={rk9Row} />);

      expect(
        screen.getByText("Failed to fetch standings")
      ).toBeInTheDocument();
    });

    it("shows teams error message when TeamsPanel query fails", async () => {
      // First call (standings): success with empty data
      // Second call (TeamsPanel): error
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          isFetching: false,
        })
        .mockReturnValue({
          data: undefined,
          error: { message: "Teams query failed" },
          isLoading: false,
          isFetching: false,
        });

      render(<ExpandedRowData row={rk9Row} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /teams/i }));
      });

      await waitFor(() => {
        expect(screen.getByText("Teams query failed")).toBeInTheDocument();
      });
    });
  });
});
