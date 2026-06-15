/**
 * Tests for TournamentStandings component
 * Covers: loading state, empty/no-results state, standings rendering,
 * sorting (dropped last), top 3 highlight, full table display,
 * coach badge rendering.
 *
 * Phase 3 migration: getCoachBadges now runs via useQuery + createClient()
 * (not useSupabaseQuery). Tests use QueryClientProvider and mock
 * getCoachBadges from @trainers/supabase + createClient from
 * @/lib/supabase/client.
 */

import type React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────────────────────────

// Player-stats query result. The component reads this via `useApiQuery`
// (auth-gated `/api/v1/tournaments/[id]/player-stats`).
let mockQueryReturn: {
  data: unknown;
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
} = {
  data: null,
  isLoading: false,
};

const mockUseApiQuery = jest.fn(() => ({
  isError: false,
  error: null,
  ...mockQueryReturn,
}));

jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: () => mockUseApiQuery(),
}));

// getCoachBadges is called in the useQuery queryFn. Return a Map by default;
// individual tests can override mockGetCoachBadges.
const mockGetCoachBadges = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getCoachBadges: (...args: unknown[]) => mockGetCoachBadges(...args),
}));

// createClient() is called inside the queryFn — return a stable stub so the
// mock fn can be passed through without error.
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

// useSupabase() is called at the top of the component (singleton pattern).
jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(() => ({})),
}));

jest.mock("@/components/ui/coach-badge", () => ({
  CoachBadge: ({ handle }: { handle: string }) => (
    <span data-testid="coach-badge" data-handle={handle}>
      Coach
    </span>
  ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  CardHeader: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => <span data-testid="badge">{children}</span>,
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  AvatarImage: ({ src }: { src?: string }) => (
    <img src={src} alt="" data-testid="avatar-image" />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="avatar-fallback">{children}</span>
  ),
}));

jest.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table>{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableCell: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <td className={className}>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => (
    <th>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableRow: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <tr className={className}>{children}</tr>,
}));

import { TournamentStandings } from "../tournament-standings";

// ── Helpers ────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

function buildPlayerStat(overrides: Record<string, unknown> = {}) {
  return {
    current_standing: 1,
    alt: {
      id: 100,
      username: "ash_ketchum",
      avatar_url: "https://example.com/ash.png",
    },
    match_wins: 3,
    match_losses: 0,
    match_points: 9,
    game_win_percentage: "75.0",
    opponent_match_win_percentage: "60.0",
    is_dropped: false,
    ...overrides,
  };
}

const defaultTournament = { id: 1, status: "active" };

function renderStandings(tournament = defaultTournament) {
  return render(<TournamentStandings tournament={tournament} />, {
    wrapper: createWrapper(),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("TournamentStandings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryReturn = { data: null, isLoading: false };
    // Default: getCoachBadges returns an empty Map (no badges)
    mockGetCoachBadges.mockResolvedValue(new Map());
  });

  it("shows loading spinner when data is loading", () => {
    mockQueryReturn = { data: null, isLoading: true };
    renderStandings();
    // When loading, no heading is rendered
    expect(screen.queryByText("Standings")).not.toBeInTheDocument();
  });

  it("surfaces an error state when the query fails", () => {
    // A 401/500 must render an explicit error, not the "no standings" empty state.
    mockQueryReturn = {
      data: null,
      isLoading: false,
      isError: true,
      error: new Error("Failed to load standings."),
    };
    renderStandings();
    expect(screen.getByText("Failed to load standings.")).toBeInTheDocument();
    expect(screen.queryByText("No standings yet")).not.toBeInTheDocument();
  });

  it("shows empty state when no player stats exist", () => {
    mockQueryReturn = { data: [], isLoading: false };
    renderStandings();
    expect(screen.getByText("No standings yet")).toBeInTheDocument();
    expect(
      screen.getByText("Standings will appear once matches have been played.")
    ).toBeInTheDocument();
  });

  it("shows empty state when players have no results yet", () => {
    // Players exist but no wins or losses
    const stats = [buildPlayerStat({ match_wins: 0, match_losses: 0 })];
    mockQueryReturn = { data: stats, isLoading: false };
    renderStandings();
    expect(screen.getByText("No standings yet")).toBeInTheDocument();
  });

  it("renders standings header", () => {
    const stats = [buildPlayerStat()];
    mockQueryReturn = { data: stats, isLoading: false };
    renderStandings();
    expect(screen.getByText("Standings")).toBeInTheDocument();
    expect(
      screen.getByText("Current tournament standings and player statistics")
    ).toBeInTheDocument();
  });

  it("renders player name and username", () => {
    const stats = [
      buildPlayerStat({
        alt: { id: 1, username: "cynthia", avatar_url: null },
        match_wins: 2,
        match_losses: 1,
      }),
    ];
    mockQueryReturn = { data: stats, isLoading: false };
    renderStandings();

    // Player name and @username should appear (may appear multiple times: top3 + table)
    const names = screen.getAllByText("cynthia");
    expect(names.length).toBeGreaterThanOrEqual(1);
    const usernames = screen.getAllByText("@cynthia");
    expect(usernames.length).toBeGreaterThanOrEqual(1);
  });

  it("renders win-loss record", () => {
    const stats = [
      buildPlayerStat({
        current_standing: 1,
        match_wins: 5,
        match_losses: 2,
      }),
    ];
    mockQueryReturn = { data: stats, isLoading: false };
    renderStandings();

    // Record shown as badges "5-2"
    const badges = screen.getAllByTestId("badge");
    const records = badges.filter((b) => b.textContent?.includes("5-2"));
    expect(records.length).toBeGreaterThanOrEqual(1);
  });

  it("renders match points and percentages", () => {
    const stats = [
      buildPlayerStat({
        match_points: 15,
        game_win_percentage: "66.7",
        opponent_match_win_percentage: "55.3",
      }),
    ];
    mockQueryReturn = { data: stats, isLoading: false };
    renderStandings();

    expect(screen.getAllByText("15").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("66.7%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("55.3%")).toBeInTheDocument();
  });

  it("sorts dropped players after active players", () => {
    const stats = [
      buildPlayerStat({
        current_standing: 1,
        alt: { id: 1, username: "active_player", avatar_url: null },
        match_wins: 3,
        match_losses: 0,
        is_dropped: false,
      }),
      buildPlayerStat({
        current_standing: 2,
        alt: { id: 2, username: "dropped_player", avatar_url: null },
        match_wins: 2,
        match_losses: 1,
        is_dropped: true,
      }),
    ];
    mockQueryReturn = { data: stats, isLoading: false };
    renderStandings();

    // Active player should appear before dropped player
    const rows = screen.getAllByRole("row");
    const playerCells = rows.map((r) => r.textContent);
    const activeIdx = playerCells.findIndex((t) =>
      t?.includes("active_player")
    );
    const droppedIdx = playerCells.findIndex((t) =>
      t?.includes("dropped_player")
    );
    expect(activeIdx).toBeLessThan(droppedIdx);
  });

  it("shows 'Dropped' badge for dropped players", () => {
    const stats = [
      buildPlayerStat({
        match_wins: 1,
        match_losses: 2,
        is_dropped: true,
      }),
    ];
    mockQueryReturn = { data: stats, isLoading: false };
    renderStandings();

    const badges = screen.getAllByTestId("badge");
    expect(badges.some((b) => b.textContent === "Dropped")).toBe(true);
  });

  it("renders Complete Standings table headers", () => {
    const stats = [buildPlayerStat()];
    mockQueryReturn = { data: stats, isLoading: false };
    renderStandings();

    expect(screen.getByText("Complete Standings")).toBeInTheDocument();
    expect(screen.getByText("Rank")).toBeInTheDocument();
    expect(screen.getByText("Player")).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
    expect(screen.getByText("Match Points")).toBeInTheDocument();
    expect(screen.getByText("Game Win %")).toBeInTheDocument();
    expect(screen.getByText("Opp. Win %")).toBeInTheDocument();
  });

  it("renders top 3 highlight cards when 3+ active players", () => {
    const stats = [
      buildPlayerStat({
        current_standing: 1,
        alt: { id: 1, username: "first", avatar_url: null },
        match_wins: 5,
        match_losses: 0,
      }),
      buildPlayerStat({
        current_standing: 2,
        alt: { id: 2, username: "second", avatar_url: null },
        match_wins: 4,
        match_losses: 1,
      }),
      buildPlayerStat({
        current_standing: 3,
        alt: { id: 3, username: "third", avatar_url: null },
        match_wins: 3,
        match_losses: 2,
      }),
    ];
    mockQueryReturn = { data: stats, isLoading: false };
    renderStandings();

    // All three should appear in the top highlight + the table
    expect(screen.getAllByText("first").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("second").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("third").length).toBeGreaterThanOrEqual(2);
  });

  it("handles null/missing stats gracefully", () => {
    const stats = [
      buildPlayerStat({
        current_standing: null,
        alt: { id: 1, username: "mystery", avatar_url: null },
        match_wins: null,
        match_losses: null,
        match_points: null,
        game_win_percentage: null,
        opponent_match_win_percentage: null,
        is_dropped: null,
      }),
    ];
    mockQueryReturn = { data: stats, isLoading: false };
    // With null wins/losses, hasAnyResults is false → shows "No standings yet"
    // The important thing is it doesn't throw
    renderStandings();
    expect(screen.getByText("No standings yet")).toBeInTheDocument();
  });

  describe("coach badge display", () => {
    it("does not call getCoachBadges when altIds is empty (no stats)", async () => {
      mockQueryReturn = { data: [], isLoading: false };
      renderStandings();
      // enabled: altIds.length > 0 — query should not fire
      await waitFor(() => {
        expect(mockGetCoachBadges).not.toHaveBeenCalled();
      });
    });

    it("calls getCoachBadges with alt IDs once stats load", async () => {
      const stats = [
        buildPlayerStat({
          alt: { id: 42, username: "misty", avatar_url: null },
          match_wins: 1,
          match_losses: 0,
        }),
      ];
      mockQueryReturn = { data: stats, isLoading: false };
      mockGetCoachBadges.mockResolvedValue(new Map());
      renderStandings();

      await waitFor(() => {
        expect(mockGetCoachBadges).toHaveBeenCalledWith(
          expect.anything(),
          [42]
        );
      });
    });

    it("renders coach badge when showCoachBadge is true", async () => {
      const stats = [
        buildPlayerStat({
          alt: { id: 7, username: "brock", avatar_url: null },
          match_wins: 2,
          match_losses: 1,
        }),
      ];
      mockQueryReturn = { data: stats, isLoading: false };
      mockGetCoachBadges.mockResolvedValue(
        new Map([[7, { showCoachBadge: true, coachHandle: "coach_brock" }]])
      );
      renderStandings();

      await waitFor(() => {
        expect(screen.getAllByTestId("coach-badge").length).toBeGreaterThan(0);
      });
    });

    it("does not render coach badge when showCoachBadge is false", async () => {
      const stats = [
        buildPlayerStat({
          alt: { id: 8, username: "gary", avatar_url: null },
          match_wins: 3,
          match_losses: 0,
        }),
      ];
      mockQueryReturn = { data: stats, isLoading: false };
      mockGetCoachBadges.mockResolvedValue(
        new Map([[8, { showCoachBadge: false, coachHandle: null }]])
      );
      renderStandings();

      await waitFor(() => {
        expect(screen.queryByTestId("coach-badge")).not.toBeInTheDocument();
      });
    });
  });
});
