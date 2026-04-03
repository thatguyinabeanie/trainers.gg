import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

jest.mock("lucide-react", () => ({
  TrendingUp: ({ className }: { className?: string }) => (
    <svg data-testid="icon-trending-up" className={className} />
  ),
  TrendingDown: ({ className }: { className?: string }) => (
    <svg data-testid="icon-trending-down" className={className} />
  ),
  Trophy: ({ className }: { className?: string }) => (
    <svg data-testid="icon-trophy" className={className} />
  ),
  Target: ({ className }: { className?: string }) => (
    <svg data-testid="icon-target" className={className} />
  ),
  Award: ({ className }: { className?: string }) => (
    <svg data-testid="icon-award" className={className} />
  ),
  Zap: ({ className }: { className?: string }) => (
    <svg data-testid="icon-zap" className={className} />
  ),
}));

import { StatsOverview } from "../stats-overview";

function makeStats(
  overrides: Partial<Parameters<typeof StatsOverview>[0]["stats"]> = {}
) {
  return {
    winRate: 0,
    winRateChange: 0,
    currentRating: 0,
    ratingRank: 0,
    activeTournaments: 0,
    totalEnrolled: 0,
    championPoints: 0,
    ...overrides,
  };
}

describe("StatsOverview", () => {
  describe("win rate card", () => {
    it("displays the win rate formatted to 1 decimal place", () => {
      render(<StatsOverview stats={makeStats({ winRate: 63.5 })} />);
      expect(screen.getByText("63.5")).toBeInTheDocument();
    });

    it("shows TrendingUp icon when win rate change is positive", () => {
      render(<StatsOverview stats={makeStats({ winRateChange: 5.2 })} />);
      expect(screen.getByTestId("icon-trending-up")).toBeInTheDocument();
    });

    it("shows TrendingDown icon when win rate change is negative", () => {
      render(<StatsOverview stats={makeStats({ winRateChange: -3.1 })} />);
      expect(screen.getByTestId("icon-trending-down")).toBeInTheDocument();
    });

    it("shows TrendingUp icon when win rate change is zero", () => {
      render(<StatsOverview stats={makeStats({ winRateChange: 0 })} />);
      expect(screen.getByTestId("icon-trending-up")).toBeInTheDocument();
    });

    it("shows positive change with plus sign", () => {
      render(<StatsOverview stats={makeStats({ winRateChange: 4.0 })} />);
      expect(screen.getByText("+4.0% this month")).toBeInTheDocument();
    });

    it("shows negative change without plus sign", () => {
      render(<StatsOverview stats={makeStats({ winRateChange: -2.5 })} />);
      expect(screen.getByText("-2.5% this month")).toBeInTheDocument();
    });
  });

  describe("rating card", () => {
    it("shows rating value when currentRating is greater than zero", () => {
      render(<StatsOverview stats={makeStats({ currentRating: 1500 })} />);
      expect(screen.getByText("1,500")).toBeInTheDocument();
    });

    it("shows global rank when currentRating is greater than zero", () => {
      render(
        <StatsOverview stats={makeStats({ currentRating: 1500, ratingRank: 42 })} />
      );
      expect(screen.getByText("#42")).toBeInTheDocument();
    });

    it("shows dash when currentRating is zero", () => {
      render(<StatsOverview stats={makeStats({ currentRating: 0 })} />);
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("shows prompt to play a rated tournament when rating is zero", () => {
      render(<StatsOverview stats={makeStats({ currentRating: 0 })} />);
      expect(
        screen.getByText("Play a rated tournament to get started")
      ).toBeInTheDocument();
    });
  });

  describe("tournaments card", () => {
    it("displays active tournament count", () => {
      render(<StatsOverview stats={makeStats({ activeTournaments: 3 })} />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("displays total enrolled count", () => {
      render(<StatsOverview stats={makeStats({ totalEnrolled: 12 })} />);
      expect(screen.getByText("12")).toBeInTheDocument();
    });

    it("shows Tournaments label", () => {
      render(<StatsOverview stats={makeStats()} />);
      expect(screen.getByText("Tournaments")).toBeInTheDocument();
    });
  });

  describe("champion points card", () => {
    it("displays champion points value", () => {
      render(<StatsOverview stats={makeStats({ championPoints: 2500 })} />);
      expect(screen.getByText("2,500")).toBeInTheDocument();
    });

    it("shows season standing label", () => {
      render(<StatsOverview stats={makeStats()} />);
      expect(screen.getByText("Season standing")).toBeInTheDocument();
    });

    it("shows zero champion points correctly", () => {
      render(
        <StatsOverview
          stats={makeStats({
            championPoints: 0,
            winRate: 50,
            winRateChange: 2,
            currentRating: 1500,
            ratingRank: 1,
            activeTournaments: 1,
            totalEnrolled: 5,
          })}
        />
      );
      // Champion points card shows "0" — all others have non-zero values
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("section labels", () => {
    it.each(["Win Rate", "Rating", "Champion Pts"])(
      "renders '%s' label",
      (label) => {
        render(<StatsOverview stats={makeStats()} />);
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    );
  });
});
