import { render, screen } from "@testing-library/react";

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
  getMyDashboardData: jest.fn(),
  getActiveMatch: jest.fn(),
  getUserTournamentHistory: jest.fn(),
  getCurrentUserAlts: jest.fn(),
}));

// --- @trainers/pokemon/sprites ---
jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn(() => ({
    url: "/sprites/pikachu.png",
    pixelated: true,
  })),
}));

// --- next/image ---
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }) => <img src={src} alt={alt} width={width} height={height} />,
}));

// --- next/link ---
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
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

function setupDefaultQueries({
  userAlts = [{ id: 5, username: "ash_alt", user_id: "user-1" }],
  dashboardData = null as {
    stats: {
      winRate: number;
      winRateChange: number;
      currentRating: number;
      ratingRank: number;
      activeTournaments: number;
      totalEnrolled: number;
      championPoints: number;
    };
    recentActivity: Array<{ id: string; result: string; date: number }>;
    myTournaments: unknown[];
    achievements: unknown[];
  } | null,
  activeMatch = null as {
    tournamentName: string;
    tournamentSlug: string;
    roundNumber: number;
    opponent: { username: string } | null;
    table: number | null;
  } | null,
  recentHistory = [] as Array<{
    id: number;
    tournamentName: string;
    tournamentSlug: string;
    placement: number | null;
    altUsername: string;
    startDate: string | null;
    endDate: string | null;
    teamPokemon: string[];
  }>,
} = {}) {
  mockUseSupabaseQuery
    .mockReturnValueOnce({
      data: userAlts,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>)
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
    } as ReturnType<typeof useSupabaseQuery>)
    .mockReturnValueOnce({
      data: recentHistory,
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
  // Welcome heading
  // ---------------------------------------------------------------------------

  describe("welcome heading", () => {
    it("renders Welcome back with display name", () => {
      mockGetUserDisplayName.mockReturnValue("Ash");
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText(/welcome back, ash/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Stats row
  // ---------------------------------------------------------------------------

  describe("stats cards", () => {
    it("renders Win Rate stat card", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("Win Rate")).toBeInTheDocument();
    });

    it("renders Rating stat card", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("Rating")).toBeInTheDocument();
    });

    it("renders Record stat card", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("Record")).toBeInTheDocument();
    });

    it("renders Tournaments stat card", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("Tournaments")).toBeInTheDocument();
    });

    it("renders 0.0% win rate when no dashboard data", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("0.0%")).toBeInTheDocument();
    });

    it("renders rating from dashboardData", () => {
      setupDefaultQueries({
        dashboardData: {
          stats: {
            winRate: 60,
            winRateChange: 5,
            currentRating: 1500,
            ratingRank: 3,
            activeTournaments: 1,
            totalEnrolled: 4,
            championPoints: 100,
          },
          recentActivity: [],
          myTournaments: [],
          achievements: [],
        },
      });
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("1,500")).toBeInTheDocument();
    });

    it("renders — for rating when rating is 0", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("renders 'across all alts' sub-label when no alt selected", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("across all alts")).toBeInTheDocument();
    });

    it("renders 'as <alt>' sub-label when alt is selected", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername="ash_alt" />);
      expect(screen.getByText("as ash_alt")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Active match bar
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
      expect(screen.getByText("Pallet Cup")).toBeInTheDocument();
      expect(screen.getByText(/round 2/i)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /go to match/i })
      ).toBeInTheDocument();
    });

    it("does not render live match bar when activeMatch is null", () => {
      setupDefaultQueries({ activeMatch: null });
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.queryByText(/go to match/i)).not.toBeInTheDocument();
    });

    it("renders opponent username in match bar", () => {
      setupDefaultQueries({
        activeMatch: {
          tournamentName: "Summer Cup",
          tournamentSlug: "summer-cup",
          roundNumber: 1,
          opponent: { username: "misty" },
          table: null,
        },
      });
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("misty")).toBeInTheDocument();
    });

    it("renders table number when table is set", () => {
      setupDefaultQueries({
        activeMatch: {
          tournamentName: "Summer Cup",
          tournamentSlug: "summer-cup",
          roundNumber: 1,
          opponent: null,
          table: 7,
        },
      });
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText(/table 7/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Recent results
  // ---------------------------------------------------------------------------

  describe("recent results", () => {
    it("shows 'No tournament history yet' when recentResults is empty", () => {
      setupDefaultQueries({ recentHistory: [] });
      render(<HomeClient selectedAltUsername={null} />);
      expect(
        screen.getByText("No tournament history yet.")
      ).toBeInTheDocument();
    });

    it("renders recent history items", () => {
      setupDefaultQueries({
        recentHistory: [
          {
            id: 1,
            tournamentName: "Kanto Regional",
            tournamentSlug: "kanto-regional",
            placement: 1,
            altUsername: "ash_alt",
            startDate: "2026-03-01",
            endDate: "2026-03-02",
            teamPokemon: ["pikachu"],
          },
        ],
      });
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText("Kanto Regional")).toBeInTheDocument();
    });

    it("renders 1st place with trophy emoji", () => {
      setupDefaultQueries({
        recentHistory: [
          {
            id: 1,
            tournamentName: "Cup A",
            tournamentSlug: "cup-a",
            placement: 1,
            altUsername: "ash_alt",
            startDate: null,
            endDate: null,
            teamPokemon: [],
          },
        ],
      });
      render(<HomeClient selectedAltUsername={null} />);
      expect(screen.getByText(/1 🏆/)).toBeInTheDocument();
    });

    it("renders — for null placement", () => {
      setupDefaultQueries({
        recentHistory: [
          {
            id: 2,
            tournamentName: "Cup B",
            tournamentSlug: "cup-b",
            placement: null,
            altUsername: "ash_alt",
            startDate: null,
            endDate: null,
            teamPokemon: [],
          },
        ],
      });
      render(<HomeClient selectedAltUsername={null} />);
      // placement null → "—" (may appear multiple times in the UI)
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it("filters history by selectedAltUsername when provided", () => {
      setupDefaultQueries({
        recentHistory: [
          {
            id: 1,
            tournamentName: "Cup A",
            tournamentSlug: "cup-a",
            placement: 2,
            altUsername: "ash_alt",
            startDate: null,
            endDate: null,
            teamPokemon: [],
          },
          {
            id: 2,
            tournamentName: "Cup B",
            tournamentSlug: "cup-b",
            placement: 3,
            altUsername: "other_alt",
            startDate: null,
            endDate: null,
            teamPokemon: [],
          },
        ],
      });
      render(<HomeClient selectedAltUsername="ash_alt" />);
      expect(screen.getByText("Cup A")).toBeInTheDocument();
      expect(screen.queryByText("Cup B")).not.toBeInTheDocument();
    });

    it("renders View history link", () => {
      setupDefaultQueries();
      render(<HomeClient selectedAltUsername={null} />);
      const link = screen.getByRole("link", { name: /view history/i });
      expect(link).toHaveAttribute("href", "/dashboard/tournaments");
    });
  });

  // ---------------------------------------------------------------------------
  // Dashboard error
  // ---------------------------------------------------------------------------

  describe("dashboard error state", () => {
    it("renders error state when dashboardError is truthy", () => {
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: [{ id: 5, username: "ash_alt", user_id: "user-1" }],
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        } as ReturnType<typeof useSupabaseQuery>)
        .mockReturnValueOnce({
          data: undefined,
          isLoading: false,
          error: new Error("DB connection failed"),
          refetch: jest.fn(),
        } as ReturnType<typeof useSupabaseQuery>)
        .mockReturnValue({
          data: null,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        } as ReturnType<typeof useSupabaseQuery>);

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
