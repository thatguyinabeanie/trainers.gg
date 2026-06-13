/**
 * Tests for TournamentStandings component
 * Covers: loading state, empty/no-results state, standings rendering,
 * sorting (dropped last), top 3 highlight, full table display.
 */

import type React from "react";
import { render, screen } from "@testing-library/react";
import { TournamentStandings } from "../tournament-standings";

// ── Mocks ──────────────────────────────────────────────────────────────────

// Player-stats query result. The component now reads this via `useApiQuery`
// (auth-gated `/api/v1/tournaments/[id]/player-stats`), so we drive that hook.
let mockQueryReturn: {
  data: unknown;
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
} = {
  data: null,
  isLoading: false,
};

// Coach-badge lookup result, keyed by alt id. The component runs a
// useSupabaseQuery for getCoachBadges after stats load — we hand it this Map.
let mockCoachBadges: Map<
  number,
  { showCoachBadge: boolean; coachHandle: string | null }
> = new Map();

// Player stats now come from `useApiQuery` (single auth-gated route). The mock
// returns whatever `mockQueryReturn` holds, plus the fields the component reads.
const mockUseApiQuery = jest.fn(() => ({
  isError: false,
  error: null,
  ...mockQueryReturn,
}));

jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: () => mockUseApiQuery(),
}));

// Coach badges are still fetched client-side via useSupabaseQuery (privacy-safe
// booleans + public handles). Hand it the badge Map.
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(() => ({
    data: mockCoachBadges,
    isLoading: false,
  })),
}));

// getCoachBadges is imported alongside the player-stats endpoint type. The query
// fn itself is never invoked here (useSupabaseQuery is mocked), but the import
// must resolve, so stub it.
jest.mock("@trainers/supabase", () => ({
  getCoachBadges: jest.fn(),
  getTournamentPlayerStats: jest.fn(),
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

// ── Helpers ────────────────────────────────────────────────────────────────

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
  return render(<TournamentStandings tournament={tournament} />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("TournamentStandings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryReturn = { data: null, isLoading: false };
    mockCoachBadges = new Map();
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
        alt: { username: "cynthia", avatar_url: null },
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
        alt: { username: "active_player", avatar_url: null },
        match_wins: 3,
        match_losses: 0,
        is_dropped: false,
      }),
      buildPlayerStat({
        current_standing: 2,
        alt: { username: "dropped_player", avatar_url: null },
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
    // "Game Win %" and "Opp. Win %" - may appear in headers
    expect(screen.getByText("Game Win %")).toBeInTheDocument();
    expect(screen.getByText("Opp. Win %")).toBeInTheDocument();
  });

  it("renders top 3 highlight cards when 3+ active players", () => {
    const stats = [
      buildPlayerStat({
        current_standing: 1,
        alt: { username: "first", avatar_url: null },
        match_wins: 5,
        match_losses: 0,
      }),
      buildPlayerStat({
        current_standing: 2,
        alt: { username: "second", avatar_url: null },
        match_wins: 4,
        match_losses: 1,
      }),
      buildPlayerStat({
        current_standing: 3,
        alt: { username: "third", avatar_url: null },
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
        alt: { username: "mystery", avatar_url: null },
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
});
