import { render, screen } from "@testing-library/react";

// --- next/navigation ---
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
}));

// --- @/components/auth/auth-provider ---
const mockGetUserDisplayName = jest.fn(() => "Ash");
jest.mock("@/components/auth/auth-provider", () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: "user-1",
      user_metadata: { username: "ash_ketchum" },
    },
  })),
  getUserDisplayName: (...args: unknown[]) => mockGetUserDisplayName(...args),
}));

// --- @/lib/supabase ---
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(),
  useSupabase: jest.fn(() => ({
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    })),
  })),
}));

// --- @trainers/supabase ---
jest.mock("@trainers/supabase", () => ({
  getCurrentUserAlts: jest.fn(),
  getAltsBulkStats: jest.fn(),
  getPlayerRatingsBulk: jest.fn(),
  getActiveMatch: jest.fn(),
}));

// --- Mock child components to avoid deep dependency chains ---
// (alts-table -> sprite-picker -> cache-invalidation -> next/cache fails in test env)
jest.mock("../components/alts-table", () => ({
  AltsTable: (props: { alts: unknown[] }) => (
    <div data-testid="alts-table" data-count={props.alts?.length ?? 0} />
  ),
}));

jest.mock("../components/live-match-bar", () => ({
  LiveMatchBar: (props: { match: { tournamentName: string } }) => (
    <div data-testid="live-match-bar">{props.match.tournamentName}</div>
  ),
}));

jest.mock("../components/dashboard-stats", () => ({
  DashboardStats: (props: {
    winRate: string;
    rating: string;
    record: string;
    tournaments: string;
    winRateSub: string;
    ratingSub: string;
    recordSub: string;
    tournamentsSub: string;
  }) => (
    <div data-testid="dashboard-stats">
      <span data-testid="stat-winrate">{props.winRate}</span>
      <span data-testid="stat-winrate-sub">{props.winRateSub}</span>
      <span data-testid="stat-rating">{props.rating}</span>
      <span data-testid="stat-rating-sub">{props.ratingSub}</span>
      <span data-testid="stat-record">{props.record}</span>
      <span data-testid="stat-record-sub">{props.recordSub}</span>
      <span data-testid="stat-tournaments">{props.tournaments}</span>
      <span data-testid="stat-tournaments-sub">{props.tournamentsSub}</span>
    </div>
  ),
}));

jest.mock("../components/create-alt-form", () => ({
  CreateAltForm: () => <div data-testid="create-alt-form" />,
}));

// --- @/components/ui/button ---
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

// --- @/components/ui/card ---
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
  }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Loader2: () => <svg data-testid="icon-loader" />,
  Plus: () => <svg data-testid="icon-plus" />,
  Users: () => <svg data-testid="icon-users" />,
}));

// --- sonner ---
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import React from "react";
import { useSupabaseQuery, useSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/auth-provider";
import { HomeClient } from "../home-client";

const mockUseSupabaseQuery = useSupabaseQuery as jest.MockedFunction<
  typeof useSupabaseQuery
>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSupabase = useSupabase as jest.MockedFunction<typeof useSupabase>;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Sets up mock return values for all 5 useSupabaseQuery calls in HomeClient.
 * Order: alts, mainAltId, bulkStats, bulkRatings, activeMatch
 */
function setupDefaultQueries({
  alts = [{ id: 5, username: "ash_alt", user_id: "user-1" }],
  mainAltId = 5 as number | null,
  bulkStats = null as Record<
    number,
    { matchWins: number; matchLosses: number; tournamentCount: number }
  > | null,
  bulkRatings = null as Record<number, { rating: number | null }> | null,
  activeMatch = null as {
    tournamentName: string;
    tournamentSlug: string;
    roundNumber: number;
    opponent: { username: string } | null;
    table: number | null;
  } | null,
  altsLoading = false,
  altsError = null as Error | null,
} = {}) {
  mockUseSupabaseQuery
    // 1. alts
    .mockReturnValueOnce({
      data: alts,
      isLoading: altsLoading,
      error: altsError,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>)
    // 2. mainAltId
    .mockReturnValueOnce({
      data: mainAltId,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>)
    // 3. bulkStats
    .mockReturnValueOnce({
      data: bulkStats,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>)
    // 4. bulkRatings
    .mockReturnValueOnce({
      data: bulkRatings,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>)
    // 5. activeMatch
    .mockReturnValueOnce({
      data: activeMatch,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>);
}

function setupMockSupabase() {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
  };
  mockUseSupabase.mockReturnValue({
    channel: jest.fn(() => mockChannel),
  } as ReturnType<typeof useSupabase>);
}

// =============================================================================
// Tests
// =============================================================================

describe("HomeClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        user_metadata: { username: "ash_ketchum" },
      },
    } as ReturnType<typeof useAuth>);
    setupMockSupabase();
  });

  // ---------------------------------------------------------------------------
  // Stats row
  // ---------------------------------------------------------------------------

  describe("stats row", () => {
    it("renders DashboardStats component", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
    });

    it("renders 0.0% win rate when no dashboard data", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByTestId("stat-winrate")).toHaveTextContent("0.0%");
    });

    it("renders — for rating when no rating data", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByTestId("stat-rating")).toHaveTextContent("—");
    });

    it("renders rating from bulkRatings", () => {
      setupDefaultQueries({
        bulkRatings: { 5: { rating: 1500 } },
      });
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByTestId("stat-rating")).toHaveTextContent("1,500");
    });

    it("renders 'across all alts' sub-label always", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByTestId("stat-record-sub")).toHaveTextContent(
        "across all alts"
      );
    });

    it("renders aggregate stats even when alt is selected", () => {
      setupDefaultQueries({
        bulkStats: {
          5: { matchWins: 10, matchLosses: 5, tournamentCount: 3 },
        },
      });
      render(<HomeClient selectedAltUsername="ash_alt" />);
      // Should show aggregate, not per-alt
      expect(screen.getByTestId("stat-record-sub")).toHaveTextContent(
        "across all alts"
      );
      expect(screen.getByTestId("stat-record")).toHaveTextContent("10-5");
    });
  });

  // ---------------------------------------------------------------------------
  // Live match bar
  // ---------------------------------------------------------------------------

  describe("live match bar", () => {
    it("renders live match bar when activeMatch present", () => {
      setupDefaultQueries({
        activeMatch: {
          tournamentName: "Pallet Cup",
          tournamentSlug: "pallet-cup",
          roundNumber: 2,
          opponent: { username: "brock" },
          table: 5,
        },
      });
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByTestId("live-match-bar")).toBeInTheDocument();
      expect(screen.getByText("Pallet Cup")).toBeInTheDocument();
    });

    it("does not render live match bar when activeMatch is null", () => {
      setupDefaultQueries({ activeMatch: null });
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.queryByTestId("live-match-bar")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Alts table
  // ---------------------------------------------------------------------------

  describe("alts table", () => {
    it("renders AltsTable component when alts exist", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByTestId("alts-table")).toBeInTheDocument();
    });

    it("renders 'Your Alts' heading", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("Your Alts")).toBeInTheDocument();
    });

    it("renders empty state when no alts", () => {
      setupDefaultQueries({ alts: [] });
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("No alts yet")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  describe("error state", () => {
    it("renders error state when alts query fails", () => {
      setupDefaultQueries({
        altsError: new Error("DB connection failed"),
      });
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Temp username welcome toast
  // ---------------------------------------------------------------------------

  describe("temp username toast", () => {
    it("shows info toast for users with temp_ username", async () => {
      const { toast } = await import("sonner");
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-temp",
          user_metadata: { username: "temp_abc123" },
        },
      } as ReturnType<typeof useAuth>);
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining("Welcome to trainers.gg"),
        expect.any(Object)
      );
    });

    it("does not show toast for users with regular usernames", async () => {
      const { toast } = await import("sonner");
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(toast.info).not.toHaveBeenCalled();
    });
  });
});
