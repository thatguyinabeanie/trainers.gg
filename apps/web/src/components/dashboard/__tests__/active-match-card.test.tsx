import { render, screen } from "@testing-library/react";
import { ActiveMatchCard } from "../active-match-card";

describe("ActiveMatchCard", () => {
  const baseMatch = {
    id: 100,
    status: "active" as const,
    tournamentId: 50,
    tournamentName: "VGC Championship",
    tournamentSlug: "vgc-championship",
    roundNumber: 3,
    phaseName: "Swiss",
    opponent: {
      id: 20,
      displayName: "Player Two",
      username: "player2",
    },
    table: 5,
  };

  it("renders active match with all details", () => {
    render(<ActiveMatchCard match={baseMatch} />);

    expect(screen.getByText("Active Match")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("VGC Championship")).toBeInTheDocument();
    expect(screen.getByText("Swiss")).toBeInTheDocument();
    expect(screen.getByText("Round 3")).toBeInTheDocument();
    expect(screen.getByText("Player Two")).toBeInTheDocument();
    expect(screen.getByText("@player2")).toBeInTheDocument();
    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Enter Battle")).toBeInTheDocument();
  });

  it("renders pending match with Ready status", () => {
    const pendingMatch = {
      ...baseMatch,
      status: "pending" as const,
    };

    render(<ActiveMatchCard match={pendingMatch} />);

    expect(screen.getByText("READY")).toBeInTheDocument();
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
  });

  it("handles table number 0 correctly", () => {
    const matchWithTableZero = {
      ...baseMatch,
      table: 0,
    };

    render(<ActiveMatchCard match={matchWithTableZero} />);

    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("does not render table when table is null", () => {
    const matchWithoutTable = {
      ...baseMatch,
      table: null,
    };

    render(<ActiveMatchCard match={matchWithoutTable} />);

    expect(screen.queryByText(/Table/)).not.toBeInTheDocument();
  });

  it("does not render opponent section when opponent is null", () => {
    const matchWithoutOpponent = {
      ...baseMatch,
      opponent: null,
    };

    render(<ActiveMatchCard match={matchWithoutOpponent} />);

    expect(screen.queryByText("Opponent")).not.toBeInTheDocument();
    expect(screen.queryByText("@player2")).not.toBeInTheDocument();
  });

  it("renders correct link to match page", () => {
    render(<ActiveMatchCard match={baseMatch} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "/tournaments/vgc-championship/match/100"
    );
  });

  it("displays tournament phase and round correctly", () => {
    const match = {
      ...baseMatch,
      phaseName: "Top Cut",
      roundNumber: 1,
    };

    render(<ActiveMatchCard match={match} />);

    expect(screen.getByText("Top Cut")).toBeInTheDocument();
    expect(screen.getByText("Round 1")).toBeInTheDocument();
  });
});
