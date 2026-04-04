import { render, screen, waitFor } from "@testing-library/react";

// --- @/components/auth/auth-provider ---
jest.mock("@/components/auth/auth-provider", () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: "user-1",
      profile: { id: "profile-1", displayName: "Ash" },
      user_metadata: { username: "ash_ketchum" },
    },
  })),
}));

// --- @/lib/supabase ---
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
  unsubscribe: jest.fn(),
};
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(),
  useSupabase: jest.fn(() => ({
    channel: jest.fn(() => mockChannel),
  })),
}));

// --- @trainers/supabase ---
jest.mock("@trainers/supabase", () => ({
  getMyDashboardData: jest.fn(),
  getActiveMatch: jest.fn(),
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

import React from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { useAuth } from "@/components/auth/auth-provider";
import { OverviewClient } from "../overview-client";

const mockUseSupabaseQuery = useSupabaseQuery as jest.MockedFunction<
  typeof useSupabaseQuery
>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

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

function setupQueries(
  dashboardData = makeDashboardData(),
  activeMatch: unknown = null
) {
  mockUseSupabaseQuery
    .mockReturnValueOnce({
      data: dashboardData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>)
    .mockReturnValueOnce({
      data: activeMatch,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>);
}

// =============================================================================
// Tests
// =============================================================================

describe("OverviewClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        profile: { id: "profile-1", displayName: "Ash" },
        user_metadata: { username: "ash_ketchum" },
      },
    } as ReturnType<typeof useAuth>);
    mockChannel.on.mockReturnThis();
    mockChannel.subscribe.mockReturnThis();
  });

  // ---------------------------------------------------------------------------
  // Welcome header
  // ---------------------------------------------------------------------------

  describe("welcome header", () => {
    it("renders welcome heading with displayName", () => {
      setupQueries();
      render(<OverviewClient />);
      expect(screen.getByText(/welcome back,/i)).toBeInTheDocument();
      expect(screen.getByText(/ash/i)).toBeInTheDocument();
    });

    it("falls back to Trainer when no display name is available", () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          profile: null,
          user_metadata: {},
        },
      } as ReturnType<typeof useAuth>);
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

  // ---------------------------------------------------------------------------
  // StatsOverview (always present)
  // ---------------------------------------------------------------------------

  it("renders StatsOverview with dashboard stats", () => {
    setupQueries(makeDashboardData({ stats: { ...emptyStats, winRate: 65 } }));
    render(<OverviewClient />);
    const statsEl = screen.getByTestId("stats-overview");
    expect(statsEl).toBeInTheDocument();
    expect(statsEl).toHaveAttribute("data-winrate", "65");
  });

  it("renders StatsOverview with zero stats when no dashboardData", () => {
    mockUseSupabaseQuery
      .mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as ReturnType<typeof useSupabaseQuery>)
      .mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as ReturnType<typeof useSupabaseQuery>);
    render(<OverviewClient />);
    const statsEl = screen.getByTestId("stats-overview");
    expect(statsEl).toHaveAttribute("data-winrate", "0");
  });

  // ---------------------------------------------------------------------------
  // WhatsNext
  // ---------------------------------------------------------------------------

  it("always renders WhatsNext component", () => {
    setupQueries();
    render(<OverviewClient />);
    expect(screen.getByTestId("whats-next")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Mode: idle
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Mode: active-competition
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Mode: pre-tournament
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Mode: post-tournament
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Welcome toast for temp usernames
  // ---------------------------------------------------------------------------

  describe("temp username toast", () => {
    it("shows info toast for temp_ usernames", async () => {
      const { toast } = await import("sonner");
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-temp",
          profile: null,
          user_metadata: { username: "temp_xyz" },
        },
      } as ReturnType<typeof useAuth>);
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
});
