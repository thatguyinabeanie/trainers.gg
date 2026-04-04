import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

jest.mock("lucide-react", () => ({
  Trophy: ({ className }: { className?: string }) => (
    <svg data-testid="icon-trophy" className={className} />
  ),
  Award: ({ className }: { className?: string }) => (
    <svg data-testid="icon-award" className={className} />
  ),
  Star: ({ className }: { className?: string }) => (
    <svg data-testid="icon-star" className={className} />
  ),
  Medal: ({ className }: { className?: string }) => (
    <svg data-testid="icon-medal" className={className} />
  ),
}));

import { RecentAchievements } from "../recent-achievements";

function makeAchievement(
  overrides: Partial<{
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
  }> = {}
) {
  return {
    id: "ach-1",
    title: "First Win",
    description: "Won your first match",
    icon: "Trophy",
    color: "text-amber-500",
    ...overrides,
  };
}

describe("RecentAchievements", () => {
  describe("empty state", () => {
    it("shows empty state message when no achievements", () => {
      render(<RecentAchievements achievements={[]} />);
      expect(screen.getByText("No achievements yet")).toBeInTheDocument();
    });

    it("shows earn rewards hint in empty state", () => {
      render(<RecentAchievements achievements={[]} />);
      expect(
        screen.getByText("Win battles to earn rewards")
      ).toBeInTheDocument();
    });

    it("does not render 'View All Achievements' button in empty state", () => {
      render(<RecentAchievements achievements={[]} />);
      expect(
        screen.queryByText("View All Achievements")
      ).not.toBeInTheDocument();
    });
  });

  describe("with achievements", () => {
    it("renders achievement title", () => {
      render(<RecentAchievements achievements={[makeAchievement()]} />);
      expect(screen.getByText("First Win")).toBeInTheDocument();
    });

    it("renders achievement description", () => {
      render(<RecentAchievements achievements={[makeAchievement()]} />);
      expect(screen.getByText("Won your first match")).toBeInTheDocument();
    });

    it("renders all achievements when multiple provided", () => {
      const achievements = [
        makeAchievement({ id: "1", title: "First Win" }),
        makeAchievement({ id: "2", title: "Hot Streak" }),
        makeAchievement({ id: "3", title: "Champion" }),
      ];
      render(<RecentAchievements achievements={achievements} />);
      expect(screen.getByText("First Win")).toBeInTheDocument();
      expect(screen.getByText("Hot Streak")).toBeInTheDocument();
      expect(screen.getByText("Champion")).toBeInTheDocument();
    });

    it("renders 'View All Achievements' link when achievements exist", () => {
      render(<RecentAchievements achievements={[makeAchievement()]} />);
      expect(screen.getByText("View All Achievements")).toBeInTheDocument();
    });

    it("'View All Achievements' links to /achievements", () => {
      render(<RecentAchievements achievements={[makeAchievement()]} />);
      const link = screen.getByRole("link", { name: "View All Achievements" });
      expect(link).toHaveAttribute("href", "/achievements");
    });

    it("uses Trophy icon as fallback for unknown icon names", () => {
      render(
        <RecentAchievements
          achievements={[makeAchievement({ icon: "UnknownIcon" })]}
        />
      );
      // Trophy is the fallback; should still render without crashing
      expect(screen.getByText("First Win")).toBeInTheDocument();
    });

    it.each(["Trophy", "Award", "Star", "Medal"])(
      "renders achievement with %s icon without crashing",
      (icon) => {
        render(
          <RecentAchievements achievements={[makeAchievement({ icon })]} />
        );
        expect(screen.getByText("First Win")).toBeInTheDocument();
      }
    );
  });

  describe("card header", () => {
    it("renders the Achievements section label", () => {
      render(<RecentAchievements achievements={[]} />);
      expect(screen.getByText("Achievements")).toBeInTheDocument();
    });
  });
});
