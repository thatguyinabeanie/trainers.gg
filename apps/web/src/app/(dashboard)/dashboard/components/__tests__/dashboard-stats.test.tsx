import { render, screen } from "@testing-library/react";
import React from "react";

import { DashboardStats } from "../dashboard-stats";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultProps(): React.ComponentProps<typeof DashboardStats> {
  return {
    winRate: "62.5%",
    winRateSub: "10W 6L",
    rating: "1500",
    ratingSub: "Top 10%",
    record: "10-6",
    recordSub: "last 16 matches",
    tournaments: "3",
    tournamentsSub: "1 upcoming",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DashboardStats", () => {
  it("renders all four stat cards with correct labels and values", () => {
    render(<DashboardStats {...getDefaultProps()} />);

    // Labels
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("Rating")).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
    expect(screen.getByText("Tournaments")).toBeInTheDocument();

    // Values
    expect(screen.getByText("62.5%")).toBeInTheDocument();
    expect(screen.getByText("1500")).toBeInTheDocument();
    expect(screen.getByText("10-6")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders sub text for each stat", () => {
    render(<DashboardStats {...getDefaultProps()} />);

    expect(screen.getByText("10W 6L")).toBeInTheDocument();
    expect(screen.getByText("Top 10%")).toBeInTheDocument();
    expect(screen.getByText("last 16 matches")).toBeInTheDocument();
    expect(screen.getByText("1 upcoming")).toBeInTheDocument();
  });

  it("applies accent color to tournaments sub when tournamentsSubAccent is true", () => {
    render(
      <DashboardStats {...getDefaultProps()} tournamentsSubAccent={true} />
    );
    const subEl = screen.getByText("1 upcoming");
    expect(subEl).toHaveClass("text-emerald-600");
  });

  it("does not apply accent color to tournaments sub by default", () => {
    render(<DashboardStats {...getDefaultProps()} />);
    const subEl = screen.getByText("1 upcoming");
    expect(subEl).not.toHaveClass("text-emerald-600");
  });

  it("renders zero-state values correctly", () => {
    render(
      <DashboardStats
        winRate="—"
        winRateSub=""
        rating="—"
        ratingSub=""
        record="0-0"
        recordSub=""
        tournaments="0"
        tournamentsSub=""
      />
    );

    // Check the dash values render
    const dashes = screen.getAllByText("—");
    expect(dashes).toHaveLength(2);
    expect(screen.getByText("0-0")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
