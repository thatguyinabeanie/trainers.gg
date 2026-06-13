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

// Mock MarkdownContent to avoid ESM react-markdown import
jest.mock("@/components/ui/markdown-content", () => ({
  MarkdownContent: ({ content }: { content: string }) => (
    <div data-testid="markdown-content">{content}</div>
  ),
}));

// PublicPairings is now passed in as the `pairingsSlot` prop (slot pattern), so
// the parent (page.tsx) — not this component — imports it. The test supplies a
// stand-in slot via defaultProps.

jest.mock("@/components/tournaments/manage/tournament-standings", () => ({
  TournamentStandings: () => (
    <div data-testid="tournament-standings">Tournament Standings</div>
  ),
}));

jest.mock("../current-match-banner", () => ({
  CurrentMatchBanner: () => null,
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
    pairingsSlot: <div data-testid="public-pairings">Public Pairings</div>,
    phases: [],
    tournamentId: 1,
    tournamentSlug: "test-tournament",
    tournamentStatus: "active",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
  });

  describe("Tab Navigation", () => {
    it("should show overview tab by default when no tab parameter is provided", () => {
      render(<TournamentTabs {...defaultProps} />);

      // Overview tab shows description
      expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
      expect(screen.getByText("Test tournament description")).toBeInTheDocument();
    });

    it("should show the register tab when tab=register is in URL", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=register")
      );

      render(<TournamentTabs {...defaultProps} />);

      expect(screen.getByTestId("sidebar-card")).toBeInTheDocument();
    });

    it("should show the details tab when tab=details is in URL", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=details")
      );

      render(<TournamentTabs {...defaultProps} />);

      expect(screen.getByTestId("format-card")).toBeInTheDocument();
      expect(screen.getByTestId("schedule-card")).toBeInTheDocument();
    });

    it("should show the pairings tab when tab=pairings is in URL", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=pairings")
      );

      render(<TournamentTabs {...defaultProps} />);

      expect(screen.getByTestId("public-pairings")).toBeInTheDocument();
    });

    it("should show the standings tab when tab=standings is in URL", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=standings")
      );

      render(<TournamentTabs {...defaultProps} />);

      expect(screen.getByTestId("tournament-standings")).toBeInTheDocument();
    });

    it("should update URL when switching tabs", async () => {
      const user = userEvent.setup();

      render(<TournamentTabs {...defaultProps} />);

      // Click on the Pairings tab
      const pairingsTab = screen.getByRole("tab", { name: /pairings/i });
      await user.click(pairingsTab);

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

      // Should show overview content (markdown)
      expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
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
        { param: "overview", testId: "markdown-content" },
        { param: "register", testId: "sidebar-card" },
        { param: "details", testId: "format-card" },
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
      expect(screen.getByTestId("markdown-content")).toBeInTheDocument();

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
        expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
      });
    });
  });

  describe("Deep Link Sharing", () => {
    it("should allow sharing direct links to specific tabs", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=pairings")
      );

      render(<TournamentTabs {...defaultProps} />);

      expect(screen.getByTestId("public-pairings")).toBeInTheDocument();
    });

    it("should preserve other query parameters when switching tabs", async () => {
      const user = userEvent.setup();

      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("utm_source=email&ref=newsletter")
      );

      render(<TournamentTabs {...defaultProps} />);

      const pairingsTab = screen.getByRole("tab", { name: /pairings/i });
      await user.click(pairingsTab);

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
      expect(screen.getByTestId("markdown-content")).toBeInTheDocument();

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

  describe("Tournament Structure", () => {
    it("should not render 'Best of null' when bestOf is null", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=details")
      );

      const phases = [
        {
          id: 1,
          name: "Swiss Rounds",
          phaseType: "swiss",
          phaseTypeLabel: "Swiss",
          status: "pending",
          bestOf: null,
          roundTimeMinutes: null,
          plannedRounds: 5,
          checkInTimeMinutes: null,
          cutRule: null,
        },
      ];

      render(<TournamentTabs {...defaultProps} phases={phases} />);

      expect(screen.queryByText(/Best of null/)).not.toBeInTheDocument();
      expect(screen.queryByText(/null min/)).not.toBeInTheDocument();
    });

    it("should render bestOf and roundTimeMinutes when they have values", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=details")
      );

      const phases = [
        {
          id: 1,
          name: "Swiss Rounds",
          phaseType: "swiss",
          phaseTypeLabel: "Swiss",
          status: "pending",
          bestOf: 3,
          roundTimeMinutes: 50,
          plannedRounds: 5,
          checkInTimeMinutes: null,
          cutRule: null,
        },
      ];

      render(<TournamentTabs {...defaultProps} phases={phases} />);

      expect(screen.getByText(/Best of 3/)).toBeInTheDocument();
      expect(screen.getByText(/50 min/)).toBeInTheDocument();
    });

    it("should display cut rule from the next phase on the connector", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=details")
      );

      const phases = [
        {
          id: 1,
          name: "Swiss Rounds",
          phaseType: "swiss",
          phaseTypeLabel: "Swiss",
          status: "pending",
          bestOf: 3,
          roundTimeMinutes: 50,
          plannedRounds: 5,
          checkInTimeMinutes: null,
          cutRule: null,
        },
        {
          id: 2,
          name: "Top Cut",
          phaseType: "single_elimination",
          phaseTypeLabel: "Single Elimination",
          status: "pending",
          bestOf: 3,
          roundTimeMinutes: 60,
          plannedRounds: 3,
          checkInTimeMinutes: null,
          cutRule: "top-8",
        },
      ];

      render(<TournamentTabs {...defaultProps} phases={phases} />);

      // The cut rule "Top 8 advance" should be displayed on the connector between phases
      expect(screen.getByText(/Top 8 advance/)).toBeInTheDocument();
    });
  });

  describe("Pairings Slot", () => {
    it("should render the provided pairingsSlot on the pairings tab", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=pairings")
      );

      render(
        <TournamentTabs
          {...defaultProps}
          pairingsSlot={<div data-testid="custom-pairings-slot">Slot</div>}
        />
      );

      expect(screen.getByTestId("custom-pairings-slot")).toBeInTheDocument();
    });

    it("should not render the pairingsSlot when the tournament is pre-tournament", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=pairings")
      );

      render(
        <TournamentTabs
          {...defaultProps}
          tournamentStatus="draft"
          pairingsSlot={<div data-testid="custom-pairings-slot">Slot</div>}
        />
      );

      expect(
        screen.queryByTestId("custom-pairings-slot")
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(
          /pairings will be available once the tournament begins/i
        )
      ).toBeInTheDocument();
    });
  });
});
