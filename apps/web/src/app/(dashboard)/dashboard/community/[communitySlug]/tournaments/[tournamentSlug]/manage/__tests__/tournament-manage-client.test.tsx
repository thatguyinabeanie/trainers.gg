import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import { TournamentManageClient } from "../tournament-manage-client";
import { useSupabaseQuery, useSupabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/use-current-user";
import userEvent from "@testing-library/user-event";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock Supabase hooks
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn((callback) => {
    if (typeof callback === "function") {
      callback("SUBSCRIBED", null);
    }
    return mockChannel;
  }),
  unsubscribe: jest.fn(),
};

const mockSupabase = {
  channel: jest.fn(() => mockChannel),
};

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(),
  useSupabase: jest.fn(() => mockSupabase),
}));

// Mock current user hook
jest.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: jest.fn(),
}));

// Mock child components
jest.mock("@/components/tournaments", () => ({
  TournamentOverview: () => <div data-testid="overview-tab">Overview</div>,
  TournamentRegistrations: () => <div data-testid="players-tab">Players</div>,
  TournamentStandings: () => (
    <div data-testid="standings-content">Standings</div>
  ),
  TournamentAuditLog: () => <div data-testid="audit-content">Audit Log</div>,
}));

// Mock TournamentPairingsJudge separately (imported from different path)
jest.mock("@/components/tournaments/manage/tournament-pairings-judge", () => ({
  TournamentPairingsJudge: () => (
    <div data-testid="pairings-content">Pairings</div>
  ),
}));

// Mock server actions (next/cache not available in Jest)
jest.mock("@/actions/tournaments", () => ({
  publishTournament: jest
    .fn()
    .mockResolvedValue({ success: true, data: { success: true } }),
}));

// Mock Sheet components (Base UI Dialog-based)
jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({
    children,
  }: {
    children: React.ReactNode;
    side?: string;
    className?: string;
  }) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("TournamentManageClient - Consolidated 3-Tab Layout", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  };

  const mockOrganization = {
    id: "org-1",
    name: "Test Org",
    slug: "test-org",
    owner_user_id: "user-1",
  };

  const mockTournament = {
    id: BigInt(1),
    name: "Test Tournament",
    slug: "test-tournament",
    status: "draft",
    current_phase_id: null,
    registrations: [
      { status: "registered" },
      { status: "checked_in" },
      { status: "dropped" },
    ],
    max_participants: null,
    start_date: null,
    end_date: null,
    tournament_format: "swiss_with_cut",
    format: "VGC 2025",
    current_round: null,
    round_time_minutes: 50,
    swiss_rounds: null,
    top_cut_size: null,
    rental_team_photos_enabled: false,
    rental_team_photos_required: false,
    description: null,
    registration_type: "open",
    check_in_required: false,
    allow_late_registration: false,
    late_check_in_max_round: null,
  };

  const mockUser = {
    id: "user-1",
    email: "test@example.com",
  };

  const mockPhases: Array<{
    id: number;
    name: string;
    tournament_id: bigint;
  }> = [];

  // Helper function to setup useSupabaseQuery mocks
  // Uses a persistent counter that resets at the start of each render cycle
  // by tracking if the component is re-rendering (callIndex wraps around)
  const setupQueryMocks = () => {
    const mockResponses = [mockOrganization, mockTournament, mockPhases];
    let callIndex = 0;
    (useSupabaseQuery as jest.Mock).mockImplementation(() => {
      const response = mockResponses[callIndex % mockResponses.length];
      callIndex++;
      return {
        data: response,
        isLoading: false,
      };
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-setup persistent mocks after clearAllMocks
    (useSupabase as jest.Mock).mockReturnValue(mockSupabase);

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
  });

  describe("Tab Navigation", () => {
    it("should show overview tab by default when no tab parameter is provided", async () => {
      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });
    });

    it("should show the correct tab when tab parameter is in URL", async () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=live")
      );

      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("pairings-content")).toBeVisible();
        expect(screen.getByTestId("standings-content")).toBeVisible();
      });
    });

    it("should update URL when switching tabs", async () => {
      const user = userEvent.setup();

      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });

      // Click on the Players tab
      const playersTab = screen.getByRole("tab", {
        name: /players/i,
      });
      await user.click(playersTab);

      // Check that router.replace was called with the correct URL
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining("tab=players"),
        { scroll: false }
      );
    });

    it.each([
      { param: "overview", testId: "overview-tab" },
      { param: "players", testId: "players-tab" },
      { param: "live", testId: "pairings-content" },
    ])(
      "should render $param tab content when tab=$param",
      async ({ param, testId }) => {
        jest.clearAllMocks();

        (useSearchParams as jest.Mock).mockReturnValue(
          new URLSearchParams(`tab=${param}`)
        );

        (useCurrentUser as jest.Mock).mockReturnValue({
          user: mockUser,
          isLoading: false,
        });

        (useSupabase as jest.Mock).mockReturnValue(mockSupabase);
        setupQueryMocks();

        const { unmount } = render(
          <TournamentManageClient
            communitySlug="test-org"
            tournamentSlug="test-tournament"
          />
        );

        await waitFor(() => {
          expect(screen.getByTestId(testId)).toBeVisible();
        });

        unmount();
      }
    );

    it("should fall back to overview tab for invalid tab parameter", async () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=invalid")
      );

      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });
    });
  });

  describe("Header Actions", () => {
    it("should render Settings link in header", async () => {
      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        // Settings is a link button in the header
        const settingsLink = screen.getByRole("link", {
          name: /settings/i,
        });
        expect(settingsLink).toBeVisible();
        expect(settingsLink).toHaveAttribute(
          "href",
          "/dashboard/community/test-org/tournaments/test-tournament/manage/settings"
        );
      });
    });

    it("should open audit log sheet when Audit Log button is clicked", async () => {
      const user = userEvent.setup();
      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });

      // Click the Audit Log button
      const auditButton = screen.getByRole("button", {
        name: /audit log/i,
      });
      await user.click(auditButton);

      // Sheet should be open with audit content
      await waitFor(() => {
        expect(screen.getByTestId("sheet")).toBeVisible();
        expect(screen.getByTestId("audit-content")).toBeVisible();
      });
    });
  });

  describe("Live Tab", () => {
    it("should render both pairings and standings in the live tab", async () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=live")
      );

      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("pairings-content")).toBeVisible();
        expect(screen.getByTestId("standings-content")).toBeVisible();
      });
    });
  });

  describe("Players Tab Badge", () => {
    it("should display player count badge on the Players tab", async () => {
      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        // mockTournament has 2 active registrations (registered + checked_in)
        // and 1 dropped, so badge should show "2"
        const playersTab = screen.getByRole("tab", { name: /players/i });
        expect(playersTab).toHaveTextContent("2");
      });
    });
  });

  describe("Browser Navigation", () => {
    it("should preserve tab state when navigating with browser back/forward", async () => {
      const user = userEvent.setup();

      setupQueryMocks();

      const { unmount } = render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });

      // Click on Live tab
      const liveTab = screen.getByRole("tab", { name: /live/i });
      await user.click(liveTab);

      // Simulate browser back by changing the search params and remounting
      unmount();
      jest.clearAllMocks();

      (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams(""));
      (useCurrentUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      // Re-setup useSupabase mock after clearAllMocks
      (useSupabase as jest.Mock).mockReturnValue(mockSupabase);

      // Setup query mocks again for rerender
      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });
    });
  });

  describe("Deep Link Sharing", () => {
    it("should allow sharing direct links to specific tabs", async () => {
      // Simulate user opening a shared link with tab parameter
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=players")
      );

      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      // Players tab should be immediately visible
      await waitFor(() => {
        expect(screen.getByTestId("players-tab")).toBeVisible();
      });
    });
  });

  describe("Removed tabs", () => {
    it("should fall back to overview for old tab values (registrations, pairings, standings, audit, settings)", async () => {
      const oldTabValues = [
        "registrations",
        "pairings",
        "standings",
        "audit",
        "settings",
      ];

      for (const tabValue of oldTabValues) {
        jest.clearAllMocks();

        (useSearchParams as jest.Mock).mockReturnValue(
          new URLSearchParams(`tab=${tabValue}`)
        );
        (useCurrentUser as jest.Mock).mockReturnValue({
          user: mockUser,
          isLoading: false,
        });
        (useSupabase as jest.Mock).mockReturnValue(mockSupabase);
        setupQueryMocks();

        const { unmount } = render(
          <TournamentManageClient
            communitySlug="test-org"
            tournamentSlug="test-tournament"
          />
        );

        await waitFor(() => {
          expect(screen.getByTestId("overview-tab")).toBeVisible();
        });

        unmount();
      }
    });
  });
});
