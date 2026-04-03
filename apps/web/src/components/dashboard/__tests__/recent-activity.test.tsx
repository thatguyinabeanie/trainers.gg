import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("lucide-react", () => ({
  Clock: ({ className }: { className?: string }) => (
    <svg data-testid="icon-clock" className={className} />
  ),
  Swords: ({ className }: { className?: string }) => (
    <svg data-testid="icon-swords" className={className} />
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg data-testid="icon-chevron-down" className={className} />
  ),
}));

import { RecentActivity } from "../recent-activity";

function makeActivity(
  overrides: Partial<{
    id: number;
    tournamentName: string;
    opponentName: string;
    result: string;
    date: number;
  }> = {}
) {
  return {
    id: 1,
    tournamentName: "VGC Regional",
    opponentName: "ash_ketchum",
    result: "won",
    date: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    ...overrides,
  };
}

describe("RecentActivity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("empty state", () => {
    it("shows empty state message when no activities", () => {
      render(<RecentActivity activities={[]} />);
      expect(screen.getByText("No recent battles")).toBeInTheDocument();
    });

    it("does not render activity items in empty state", () => {
      render(<RecentActivity activities={[]} />);
      expect(screen.queryByText("VGC Regional")).not.toBeInTheDocument();
    });
  });

  describe("activity list", () => {
    it("renders tournament name", () => {
      render(<RecentActivity activities={[makeActivity()]} />);
      expect(screen.getByText("VGC Regional")).toBeInTheDocument();
    });

    it("renders opponent name", () => {
      render(<RecentActivity activities={[makeActivity()]} />);
      expect(screen.getByText("ash_ketchum")).toBeInTheDocument();
    });

    it("shows W badge for won result", () => {
      render(<RecentActivity activities={[makeActivity({ result: "won" })]} />);
      expect(screen.getByText("W")).toBeInTheDocument();
    });

    it("shows L badge for lost result", () => {
      render(<RecentActivity activities={[makeActivity({ result: "lost" })]} />);
      expect(screen.getByText("L")).toBeInTheDocument();
    });

    it("renders multiple activities", () => {
      const activities = [
        makeActivity({ id: 1, tournamentName: "Regional A" }),
        makeActivity({ id: 2, tournamentName: "Regional B" }),
        makeActivity({ id: 3, tournamentName: "Nationals" }),
      ];
      render(<RecentActivity activities={activities} />);
      expect(screen.getByText("Regional A")).toBeInTheDocument();
      expect(screen.getByText("Regional B")).toBeInTheDocument();
      expect(screen.getByText("Nationals")).toBeInTheDocument();
    });
  });

  describe("date formatting", () => {
    it("shows minutes ago for recent activity", () => {
      const activity = makeActivity({ date: Date.now() - 1000 * 60 * 10 }); // 10 min ago
      render(<RecentActivity activities={[activity]} />);
      expect(screen.getByText("10m ago")).toBeInTheDocument();
    });

    it("shows hours ago for activity a few hours old", () => {
      const activity = makeActivity({ date: Date.now() - 1000 * 60 * 60 * 3 }); // 3h ago
      render(<RecentActivity activities={[activity]} />);
      expect(screen.getByText("3h ago")).toBeInTheDocument();
    });

    it("shows days ago for activity a few days old", () => {
      const activity = makeActivity({ date: Date.now() - 1000 * 60 * 60 * 24 * 3 }); // 3d ago
      render(<RecentActivity activities={[activity]} />);
      expect(screen.getByText("3d ago")).toBeInTheDocument();
    });
  });

  describe("expand/collapse", () => {
    it("shows expanded details when activity is clicked", async () => {
      const user = userEvent.setup();
      const activity = makeActivity({ id: 42 });
      render(<RecentActivity activities={[activity]} />);

      const activityItem = screen.getByText("VGC Regional").closest("div[class*='rounded-lg']");
      await user.click(activityItem!);

      expect(screen.getByText(/Match ID:/)).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("collapses when clicked again", async () => {
      const user = userEvent.setup();
      const activity = makeActivity({ id: 42 });
      render(<RecentActivity activities={[activity]} />);

      const activityItem = screen.getByText("VGC Regional").closest("div[class*='rounded-lg']");
      // Expand
      await user.click(activityItem!);
      expect(screen.getByText(/Match ID:/)).toBeInTheDocument();
      // Collapse
      await user.click(activityItem!);
      expect(screen.queryByText(/Match ID:/)).not.toBeInTheDocument();
    });

    it("only expands the clicked item when multiple activities exist", async () => {
      const user = userEvent.setup();
      const activities = [
        makeActivity({ id: 1, tournamentName: "Regional A" }),
        makeActivity({ id: 2, tournamentName: "Regional B" }),
      ];
      render(<RecentActivity activities={activities} />);

      const firstActivity = screen.getByText("Regional A").closest("div[class*='rounded-lg']");
      await user.click(firstActivity!);

      // Only first activity's details visible
      const matchIdTexts = screen.getAllByText(/Match ID:/);
      expect(matchIdTexts).toHaveLength(1);
    });
  });

  describe("card structure", () => {
    it("renders Recent Activity card title", () => {
      render(<RecentActivity activities={[]} />);
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    it("renders Latest match results description", () => {
      render(<RecentActivity activities={[]} />);
      expect(screen.getByText("Latest match results")).toBeInTheDocument();
    });
  });
});
