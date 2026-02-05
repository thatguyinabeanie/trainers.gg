import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import { TournamentTabs } from "../tournament-tabs";
import userEvent from "@testing-library/user-event";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock child components
jest.mock("../public-pairings", () => ({
  PublicPairings: () => (
    <div data-testid="public-pairings">Public Pairings</div>
  ),
}));

jest.mock("@/components/tournaments/manage/tournament-standings", () => ({
  TournamentStandings: () => (
    <div data-testid="tournament-standings">Tournament Standings</div>
  ),
}));

describe("TournamentTabs - Deep Linkable Tabs", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  };

  const defaultProps = {
    description: "Test tournament description",
    scheduleCard: <div data-testid="schedule-card">Schedule</div>,
    formatCard: <div data-testid="format-card">Format</div>,
    sidebarCard: <div data-testid="sidebar-card">Sidebar</div>,
    tournamentId: 1,
    tournamentSlug: "test-tournament",
    tournamentStatus: "active",
    canManage: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
  });

  describe("Tab Navigation", () => {
    it("should show overview tab by default when no tab parameter is provided", () => {
      render(<TournamentTabs {...defaultProps} />);

      // Check that the overview tab content is visible
      expect(screen.getByTestId("schedule-card")).toBeInTheDocument();
      expect(screen.getByTestId("format-card")).toBeInTheDocument();
      expect(screen.getByTestId("sidebar-card")).toBeInTheDocument();
    });

    it("should show the pairings tab when tab=pairings is in URL", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=pairings")
      );

      render(<TournamentTabs {...defaultProps} />);

      // Check that the pairings tab content is visible
      expect(screen.getByTestId("public-pairings")).toBeInTheDocument();
    });

    it("should show the standings tab when tab=standings is in URL", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=standings")
      );

      render(<TournamentTabs {...defaultProps} />);

      // Check that the standings tab content is visible
      expect(screen.getByTestId("tournament-standings")).toBeInTheDocument();
    });

    it("should update URL when switching tabs", async () => {
      const user = userEvent.setup();

      render(<TournamentTabs {...defaultProps} />);

      // Verify we're on the overview tab initially
      expect(screen.getByTestId("schedule-card")).toBeInTheDocument();

      // Click on the Pairings tab
      const pairingsTab = screen.getByRole("tab", { name: /pairings/i });
      await user.click(pairingsTab);

      // Check that router.replace was called with the correct URL
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining("tab=pairings"),
        { scroll: false }
      );
    });

    it("should fall back to overview tab for invalid tab parameter", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=invalid")
      );

      render(<TournamentTabs {...defaultProps} />);

      // Should show overview content
      expect(screen.getByTestId("schedule-card")).toBeInTheDocument();
      expect(screen.getByTestId("format-card")).toBeInTheDocument();
    });
  });

  describe("Pre-tournament State", () => {
    it("should show placeholder message for pairings when tournament is draft", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=pairings")
      );

      render(<TournamentTabs {...defaultProps} tournamentStatus="draft" />);

      expect(
        screen.getByText(
          /pairings will be available once the tournament begins/i
        )
      ).toBeInTheDocument();
    });

    it("should show placeholder message for pairings when tournament is upcoming", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=pairings")
      );

      render(<TournamentTabs {...defaultProps} tournamentStatus="upcoming" />);

      expect(
        screen.getByText(
          /pairings will be available once the tournament begins/i
        )
      ).toBeInTheDocument();
    });

    it("should show placeholder message for standings when tournament is draft", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=standings")
      );

      render(<TournamentTabs {...defaultProps} tournamentStatus="draft" />);

      expect(
        screen.getByText(/standings will appear once the tournament begins/i)
      ).toBeInTheDocument();
    });

    it("should show actual pairings when tournament is active", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=pairings")
      );

      render(<TournamentTabs {...defaultProps} tournamentStatus="active" />);

      expect(screen.getByTestId("public-pairings")).toBeInTheDocument();
    });

    it("should show actual standings when tournament is active", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=standings")
      );

      render(<TournamentTabs {...defaultProps} tournamentStatus="active" />);

      expect(screen.getByTestId("tournament-standings")).toBeInTheDocument();
    });
  });

  describe("All Tab Parameters", () => {
    it("should handle all valid tab values", () => {
      const tabs = [
        { param: "overview", testId: "schedule-card" },
        { param: "pairings", testId: "public-pairings" },
        { param: "standings", testId: "tournament-standings" },
      ];

      for (const { param, testId } of tabs) {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useSearchParams as jest.Mock).mockReturnValue(
          new URLSearchParams(`tab=${param}`)
        );

        const { unmount } = render(<TournamentTabs {...defaultProps} />);

        expect(screen.getByTestId(testId)).toBeInTheDocument();

        unmount();
      }
    });
  });

  describe("Browser Navigation", () => {
    it("should preserve tab state when navigating with browser back/forward", async () => {
      const user = userEvent.setup();

      const { unmount } = render(<TournamentTabs {...defaultProps} />);

      // Verify we're on the overview tab
      expect(screen.getByTestId("schedule-card")).toBeInTheDocument();

      // Click on Standings tab
      const standingsTab = screen.getByRole("tab", { name: /standings/i });
      await user.click(standingsTab);

      // Simulate browser back by changing the search params and remounting
      unmount();
      jest.clearAllMocks();

      (useRouter as jest.Mock).mockReturnValue(mockRouter);
      (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams(""));

      render(<TournamentTabs {...defaultProps} />);

      // Should be back on overview tab
      await waitFor(() => {
        expect(screen.getByTestId("schedule-card")).toBeInTheDocument();
      });
    });
  });

  describe("Deep Link Sharing", () => {
    it("should allow sharing direct links to specific tabs", () => {
      // Simulate user opening a shared link with tab=pairings
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=pairings")
      );

      render(<TournamentTabs {...defaultProps} />);

      // Pairings tab should be immediately visible
      expect(screen.getByTestId("public-pairings")).toBeInTheDocument();
    });

    it("should preserve other query parameters when switching tabs", async () => {
      const user = userEvent.setup();

      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("utm_source=email&ref=newsletter")
      );

      render(<TournamentTabs {...defaultProps} />);

      // Click on Pairings tab
      const pairingsTab = screen.getByRole("tab", { name: /pairings/i });
      await user.click(pairingsTab);

      // Check that router.replace was called with both the new tab param and existing params
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringMatching(/utm_source=email/),
        { scroll: false }
      );
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringMatching(/ref=newsletter/),
        { scroll: false }
      );
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringMatching(/tab=pairings/),
        { scroll: false }
      );
    });
  });

  describe("Tab Switching Behavior", () => {
    it("should switch between all tabs without page reload", async () => {
      const user = userEvent.setup();

      render(<TournamentTabs {...defaultProps} />);

      // Start on overview
      expect(screen.getByTestId("schedule-card")).toBeInTheDocument();

      // Switch to pairings
      const pairingsTab = screen.getByRole("tab", { name: /pairings/i });
      await user.click(pairingsTab);
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining("tab=pairings"),
        { scroll: false }
      );

      // Switch to standings
      const standingsTab = screen.getByRole("tab", { name: /standings/i });
      await user.click(standingsTab);
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining("tab=standings"),
        { scroll: false }
      );

      // Verify router.replace was called but never router.push
      expect(mockRouter.replace).toHaveBeenCalledTimes(2);
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe("CanManage Prop", () => {
    it("should pass canManage prop to PublicPairings component", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=pairings")
      );

      const { rerender } = render(
        <TournamentTabs {...defaultProps} canManage={false} />
      );
      expect(screen.getByTestId("public-pairings")).toBeInTheDocument();

      rerender(<TournamentTabs {...defaultProps} canManage={true} />);
      expect(screen.getByTestId("public-pairings")).toBeInTheDocument();
    });
  });
});
