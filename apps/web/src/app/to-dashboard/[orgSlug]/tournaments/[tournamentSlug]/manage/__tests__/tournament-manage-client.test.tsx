import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import { TournamentManageClient } from "../tournament-manage-client";
import { useSupabaseQuery } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/use-current-user";
import userEvent from "@testing-library/user-event";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock Supabase query hook
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(),
}));

// Mock current user hook
jest.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: jest.fn(),
}));

// Mock child components
jest.mock("@/components/tournaments", () => ({
  TournamentOverview: () => <div data-testid="overview-tab">Overview</div>,
  TournamentSettings: () => <div data-testid="settings-tab">Settings</div>,
  TournamentPairings: () => <div data-testid="pairings-tab">Pairings</div>,
  TournamentRegistrations: () => (
    <div data-testid="registrations-tab">Registrations</div>
  ),
  TournamentStandings: () => <div data-testid="standings-tab">Standings</div>,
  TournamentJudge: () => <div data-testid="judge-tab">Judge</div>,
  TournamentAuditLog: () => <div data-testid="audit-tab">Audit Log</div>,
}));

describe("TournamentManageClient - Deep Linkable Tabs", () => {
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
    registrations: [],
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

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    // Setup default query mocks
    (useSupabaseQuery as jest.Mock)
      .mockReturnValueOnce({
        data: mockOrganization,
        isLoading: false,
      }) // organization query
      .mockReturnValueOnce({
        data: mockTournament,
        isLoading: false,
      }) // tournament query
      .mockReturnValueOnce({
        data: mockPhases,
        isLoading: false,
      }); // phases query
  });

  describe("Tab Navigation", () => {
    it("should show overview tab by default when no tab parameter is provided", async () => {
      render(
        <TournamentManageClient
          orgSlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });
    });

    it("should show the correct tab when tab parameter is in URL", async () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=pairings")
      );

      render(
        <TournamentManageClient
          orgSlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("pairings-tab")).toBeVisible();
      });
    });

    it("should update URL when switching tabs", async () => {
      const user = userEvent.setup();

      render(
        <TournamentManageClient
          orgSlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });

      // Click on the Registrations tab
      const registrationsTab = screen.getByRole("tab", {
        name: /registrations/i,
      });
      await user.click(registrationsTab);

      // Check that router.replace was called with the correct URL
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining("tab=registrations"),
        { scroll: false }
      );
    });

    it("should handle all available tabs", async () => {
      const tabs = [
        { param: "overview", testId: "overview-tab" },
        { param: "registrations", testId: "registrations-tab" },
        { param: "pairings", testId: "pairings-tab" },
        { param: "standings", testId: "standings-tab" },
        { param: "judge", testId: "judge-tab" },
        { param: "audit", testId: "audit-tab" },
        { param: "settings", testId: "settings-tab" },
      ];

      for (const { param, testId } of tabs) {
        jest.clearAllMocks();

        (useSearchParams as jest.Mock).mockReturnValue(
          new URLSearchParams(`tab=${param}`)
        );

        (useCurrentUser as jest.Mock).mockReturnValue({
          user: mockUser,
          isLoading: false,
        });

        // Setup query mocks for each iteration
        (useSupabaseQuery as jest.Mock)
          .mockReturnValueOnce({
            data: mockOrganization,
            isLoading: false,
          }) // organization query
          .mockReturnValueOnce({
            data: mockTournament,
            isLoading: false,
          }) // tournament query
          .mockReturnValueOnce({
            data: mockPhases,
            isLoading: false,
          }); // phases query

        const { unmount } = render(
          <TournamentManageClient
            orgSlug="test-org"
            tournamentSlug="test-tournament"
          />
        );

        await waitFor(() => {
          expect(screen.getByTestId(testId)).toBeVisible();
        });

        unmount();
      }
    });

    it("should fall back to overview tab for invalid tab parameter", async () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=invalid")
      );

      render(
        <TournamentManageClient
          orgSlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });
    });
  });

  describe("Browser Navigation", () => {
    it("should preserve tab state when navigating with browser back/forward", async () => {
      const user = userEvent.setup();

      const { rerender: _rerender, unmount } = render(
        <TournamentManageClient
          orgSlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });

      // Click on Pairings tab
      const pairingsTab = screen.getByRole("tab", { name: /pairings/i });
      await user.click(pairingsTab);

      // Simulate browser back by changing the search params and remounting
      unmount();
      jest.clearAllMocks();

      (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams(""));
      (useCurrentUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      // Setup query mocks again for rerender
      (useSupabaseQuery as jest.Mock)
        .mockReturnValueOnce({
          data: mockOrganization,
          isLoading: false,
        }) // organization query
        .mockReturnValueOnce({
          data: mockTournament,
          isLoading: false,
        }) // tournament query
        .mockReturnValueOnce({
          data: mockPhases,
          isLoading: false,
        }); // phases query

      render(
        <TournamentManageClient
          orgSlug="test-org"
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
        new URLSearchParams("tab=settings")
      );

      render(
        <TournamentManageClient
          orgSlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      // Settings tab should be immediately visible
      await waitFor(() => {
        expect(screen.getByTestId("settings-tab")).toBeVisible();
      });
    });
  });
});
