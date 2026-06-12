/**
 * Tests for dashboard/overview/overview-client.tsx
 *
 * The component uses `useApiQuery` (via `@trainers/supabase/react-query`) to
 * fetch dashboard data and active match data. No realtime subscription is used
 * (D2: realtime was removed and replaced with fetch-on-load +
 * visibilitychange refetch via TanStack Query's refetchOnWindowFocus).
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

// --- @trainers/supabase/react-query ---
const mockUseApiQuery = jest.fn();
jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

// --- @/components/auth/auth-provider ---
const mockUseAuth = jest.fn();
jest.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));

// --- sonner ---
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Trophy: () => <svg data-testid="icon-trophy" />,
}));

// --- @/components/dashboard ---
jest.mock("@/components/dashboard", () => ({
  StatsOverview: ({ stats }: { stats: { winRate: number } }) => (
    <div data-testid="stats-overview" data-winrate={stats.winRate} />
  ),
  ActiveMatchCard: ({ match }: { match: { tournamentName: string } }) => (
    <div data-testid="active-match-card">{match.tournamentName}</div>
  ),
  UpcomingTournaments: () => <div data-testid="upcoming-tournaments" />,
  RecentActivity: () => <div data-testid="recent-activity" />,
  RecentAchievements: ({ achievements }: { achievements: unknown[] }) => (
    <div data-testid="recent-achievements" data-count={achievements.length} />
  ),
  WhatsNext: ({ mode }: { mode: string }) => (
    <div data-testid="whats-next" data-mode={mode} />
  ),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { OverviewClient } from "../overview-client";

// =============================================================================
// Helpers
// =============================================================================

const emptyStats = {
  winRate: 0,
  winRateChange: 0,
  currentRating: 0,
  ratingRank: 0,
  activeTournaments: 0,
  totalEnrolled: 0,
  championPoints: 0,
};

function makeDashboardData(
  overrides: Partial<{
    myTournaments: Array<{
      id: number;
      name: string;
      startDate: string | null;
      status: string;
      hasTeam: boolean;
      registrationStatus: string;
      registrationId: number | null;
      lateCheckInMaxRound: number | null;
    }>;
    recentActivity: Array<{
      id: string;
      tournamentName: string;
      opponentName: string;
      result: string;
      date: number;
    }>;
    achievements: unknown[];
    stats: typeof emptyStats;
  }> = {}
) {
  return {
    myTournaments: [],
    recentActivity: [],
    achievements: [],
    stats: emptyStats,
    ...overrides,
  };
}

/** Set up both useApiQuery calls: first = dashboard data, second = active match. */
function setupQueries(
  dashboardData: ReturnType<typeof makeDashboardData> | null = makeDashboardData(),
  activeMatch: unknown = null
) {
  mockUseApiQuery
    .mockReturnValueOnce({
      data: dashboardData,
      isLoading: false,
      isError: false,
      error: null,
    })
    .mockReturnValueOnce({
      data: activeMatch,
      isLoading: false,
      isError: false,
      error: null,
    });
}

const DEFAULT_USER = {
  id: "user-1",
  profile: { id: "profile-1", displayName: "Ash" },
  user_metadata: { username: "ash_ketchum" },
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: DEFAULT_USER });
});

// =============================================================================
// Welcome header
// =============================================================================

describe("welcome header", () => {
  it("renders welcome heading with displayName", () => {
    setupQueries();
    render(<OverviewClient />);
    expect(screen.getByText(/welcome back,/i)).toBeInTheDocument();
    expect(screen.getByText(/ash/i)).toBeInTheDocument();
  });

  it("falls back to Trainer when no display name is available", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", profile: null, user_metadata: {} },
    });
    setupQueries();
    render(<OverviewClient />);
    const trainerElements = screen.getAllByText(/trainer/i);
    expect(trainerElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders subtitle text", () => {
    setupQueries();
    render(<OverviewClient />);
    expect(
      screen.getByText("Here's your competitive overview")
    ).toBeInTheDocument();
  });
});

// =============================================================================
// StatsOverview (always present)
// =============================================================================

it("renders StatsOverview with dashboard stats", () => {
  setupQueries(makeDashboardData({ stats: { ...emptyStats, winRate: 65 } }));
  render(<OverviewClient />);
  const statsEl = screen.getByTestId("stats-overview");
  expect(statsEl).toBeInTheDocument();
  expect(statsEl).toHaveAttribute("data-winrate", "65");
});

it("renders StatsOverview with zero stats when dashboardData is null", () => {
  setupQueries(null);
  render(<OverviewClient />);
  const statsEl = screen.getByTestId("stats-overview");
  expect(statsEl).toHaveAttribute("data-winrate", "0");
});

// =============================================================================
// WhatsNext (always present)
// =============================================================================

it("always renders WhatsNext component", () => {
  setupQueries();
  render(<OverviewClient />);
  expect(screen.getByTestId("whats-next")).toBeInTheDocument();
});

// =============================================================================
// Mode: idle
// =============================================================================

describe("idle mode", () => {
  it("shows idle mode when no active match and no tournaments", () => {
    setupQueries(makeDashboardData(), null);
    render(<OverviewClient />);
    expect(screen.getByTestId("whats-next")).toHaveAttribute(
      "data-mode",
      "idle"
    );
  });

  it("renders empty state trophy icon in idle mode with no tournaments", () => {
    setupQueries(makeDashboardData(), null);
    render(<OverviewClient />);
    expect(screen.getByTestId("icon-trophy")).toBeInTheDocument();
  });

  it("renders 'Ready to compete?' heading in idle mode", () => {
    setupQueries(makeDashboardData(), null);
    render(<OverviewClient />);
    expect(screen.getByText("Ready to compete?")).toBeInTheDocument();
  });

  it("renders UpcomingTournaments in idle mode when tournaments exist", () => {
    setupQueries(
      makeDashboardData({
        myTournaments: [
          {
            id: 1,
            name: "Kanto Cup",
            startDate: null,
            status: "upcoming",
            hasTeam: true,
            registrationStatus: "registered",
            registrationId: 1,
            lateCheckInMaxRound: null,
          },
        ],
      }),
      null
    );
    render(<OverviewClient />);
    expect(screen.getByTestId("upcoming-tournaments")).toBeInTheDocument();
  });
});

// =============================================================================
// Mode: active-competition
// =============================================================================

describe("active-competition mode", () => {
  const activeMatch = {
    tournamentName: "Pallet Cup",
    tournamentSlug: "pallet-cup",
    roundNumber: 2,
    opponent: { username: "brock" },
    table: 3,
  };

  it("shows active-competition mode when activeMatch exists", () => {
    setupQueries(makeDashboardData(), activeMatch);
    render(<OverviewClient />);
    expect(screen.getByTestId("whats-next")).toHaveAttribute(
      "data-mode",
      "active-competition"
    );
  });

  it("renders ActiveMatchCard in active-competition mode", () => {
    setupQueries(makeDashboardData(), activeMatch);
    render(<OverviewClient />);
    expect(screen.getByTestId("active-match-card")).toBeInTheDocument();
    expect(screen.getByText("Pallet Cup")).toBeInTheDocument();
  });

  it("renders UpcomingTournaments in active-competition mode", () => {
    setupQueries(makeDashboardData(), activeMatch);
    render(<OverviewClient />);
    expect(screen.getByTestId("upcoming-tournaments")).toBeInTheDocument();
  });

  it("renders RecentActivity in active-competition mode", () => {
    setupQueries(makeDashboardData(), activeMatch);
    render(<OverviewClient />);
    expect(screen.getByTestId("recent-activity")).toBeInTheDocument();
  });

  it("renders RecentAchievements in active-competition mode", () => {
    setupQueries(makeDashboardData(), activeMatch);
    render(<OverviewClient />);
    expect(screen.getByTestId("recent-achievements")).toBeInTheDocument();
  });
});

// =============================================================================
// Mode: pre-tournament
// =============================================================================

describe("pre-tournament mode", () => {
  it("shows pre-tournament mode when tournament needs team", () => {
    setupQueries(
      makeDashboardData({
        myTournaments: [
          {
            id: 1,
            name: "Cup",
            startDate: null,
            status: "upcoming",
            hasTeam: false, // needs action
            registrationStatus: "registered",
            registrationId: 1,
            lateCheckInMaxRound: null,
          },
        ],
      }),
      null
    );
    render(<OverviewClient />);
    expect(screen.getByTestId("whats-next")).toHaveAttribute(
      "data-mode",
      "pre-tournament"
    );
  });
});

// =============================================================================
// Mode: post-tournament
// =============================================================================

describe("post-tournament mode", () => {
  it("shows post-tournament mode when recent activity within 24 hours", () => {
    const recentDate = Date.now() - 1000 * 60 * 30; // 30 minutes ago
    setupQueries(
      makeDashboardData({
        recentActivity: [
          {
            id: "a1",
            tournamentName: "Cup",
            opponentName: "Brock",
            result: "won",
            date: recentDate,
          },
        ],
      }),
      null
    );
    render(<OverviewClient />);
    expect(screen.getByTestId("whats-next")).toHaveAttribute(
      "data-mode",
      "post-tournament"
    );
  });

  it("renders RecentActivity in post-tournament mode", () => {
    const recentDate = Date.now() - 1000 * 60 * 30;
    setupQueries(
      makeDashboardData({
        recentActivity: [
          {
            id: "a1",
            tournamentName: "Cup",
            opponentName: "Brock",
            result: "won",
            date: recentDate,
          },
        ],
      }),
      null
    );
    render(<OverviewClient />);
    expect(screen.getByTestId("recent-activity")).toBeInTheDocument();
  });
});

// =============================================================================
// No realtime subscription (D2)
// =============================================================================

describe("no realtime subscription (D2)", () => {
  it("does not import or use useSupabase channel", () => {
    // The component must NOT call supabase.channel() — that was removed in D2.
    // We verify by asserting the module never imports @/lib/supabase with channel
    // usage. As a behavior test: rendering should succeed without any Supabase
    // Realtime mock in scope.
    setupQueries();
    // If channel() were called, the test would throw because no mock is set up.
    expect(() => render(<OverviewClient />)).not.toThrow();
  });

  it("uses useApiQuery for active match (not realtime)", () => {
    setupQueries(makeDashboardData(), null);
    render(<OverviewClient />);
    // useApiQuery must have been called twice: once for dashboard, once for match
    expect(mockUseApiQuery).toHaveBeenCalledTimes(2);
    // The second call should have staleTime: 0 + refetchOnWindowFocus: true
    const secondCallOptions = mockUseApiQuery.mock.calls[1]?.[2] as
      | { staleTime?: number; refetchOnWindowFocus?: boolean }
      | undefined;
    expect(secondCallOptions?.staleTime).toBe(0);
    expect(secondCallOptions?.refetchOnWindowFocus).toBe(true);
  });
});

// =============================================================================
// Welcome toast for temp usernames
// =============================================================================

describe("temp username toast", () => {
  it("shows info toast for temp_ usernames", async () => {
    const { toast } = await import("sonner");
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-temp",
        profile: null,
        user_metadata: { username: "temp_xyz" },
      },
    });
    setupQueries();
    render(<OverviewClient />);
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining("Welcome to trainers.gg"),
        expect.any(Object)
      );
    });
  });

  it("does not show toast for regular usernames", async () => {
    const { toast } = await import("sonner");
    setupQueries();
    render(<OverviewClient />);
    expect(toast.info).not.toHaveBeenCalled();
  });
});
