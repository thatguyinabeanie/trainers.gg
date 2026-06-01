import { render, screen, within } from "@testing-library/react";
import { MatchesTable } from "../limitless-matches";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    phase: 1,
    round: 1,
    table_number: 1,
    match_label: null,
    player1: { id: 10, username: "ash", display_name: "Ash Ketchum" },
    player2: { id: 20, username: "gary", display_name: "Gary Oak" },
    winner_id: 10,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MatchesTable", () => {
  it("renders empty when no matches are provided", () => {
    const { container } = render(<MatchesTable matches={[]} />);
    // No group headings should be rendered
    expect(container.querySelectorAll("h4")).toHaveLength(0);
  });

  it("groups matches by phase and round", () => {
    const matches = [
      makeMatch({ id: 1, phase: 1, round: 1 }),
      makeMatch({ id: 2, phase: 1, round: 1, table_number: 2 }),
      makeMatch({ id: 3, phase: 1, round: 2, table_number: 3 }),
      makeMatch({ id: 4, phase: 2, round: 1, table_number: 1 }),
    ];

    render(<MatchesTable matches={matches} />);

    // Should have 3 group headings
    expect(screen.getByText("Phase 1 — Round 1")).toBeInTheDocument();
    expect(screen.getByText("Phase 1 — Round 2")).toBeInTheDocument();
    expect(screen.getByText("Phase 2 — Round 1")).toBeInTheDocument();
  });

  it("shows display_name when available, falls back to username", () => {
    const matches = [
      makeMatch({
        id: 1,
        player1: { id: 10, username: "ash", display_name: "Ash Ketchum" },
        player2: { id: 20, username: "gary", display_name: null },
      }),
    ];

    render(<MatchesTable matches={matches} />);

    // Player 1 uses display_name
    expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    // Player 2 falls back to username
    expect(screen.getByText("gary")).toBeInTheDocument();
  });

  it("displays BYE when player2 is null", () => {
    const matches = [
      makeMatch({
        id: 1,
        player2: null,
        winner_id: 10,
      }),
    ];

    render(<MatchesTable matches={matches} />);
    expect(screen.getByText("BYE")).toBeInTheDocument();
  });

  it("shows P1 badge when player 1 wins", () => {
    const matches = [makeMatch({ id: 1, winner_id: 10 })];

    render(<MatchesTable matches={matches} />);
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.queryByText("P2")).not.toBeInTheDocument();
  });

  it("shows P2 badge when player 2 wins", () => {
    const matches = [makeMatch({ id: 1, winner_id: 20 })];

    render(<MatchesTable matches={matches} />);
    expect(screen.getByText("P2")).toBeInTheDocument();
    expect(screen.queryByText("P1")).not.toBeInTheDocument();
  });

  it("shows Tie when winner_id is null and player2 exists", () => {
    const matches = [makeMatch({ id: 1, winner_id: null })];

    render(<MatchesTable matches={matches} />);
    expect(screen.getByText("Tie")).toBeInTheDocument();
  });

  it("shows Bye when winner_id is null and player2 is null", () => {
    const matches = [makeMatch({ id: 1, winner_id: null, player2: null })];

    render(<MatchesTable matches={matches} />);
    expect(screen.getByText("Bye")).toBeInTheDocument();
  });

  it("shows match_label when available, falls back to table_number", () => {
    const matches = [
      makeMatch({ id: 1, match_label: "Finals", table_number: 5 }),
      makeMatch({ id: 2, match_label: null, table_number: 3 }),
    ];

    render(<MatchesTable matches={matches} />);
    expect(screen.getByText("Finals")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows em-dash when both match_label and table_number are null", () => {
    const matches = [
      makeMatch({ id: 1, match_label: null, table_number: null }),
    ];

    render(<MatchesTable matches={matches} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    const matches = [makeMatch()];

    render(<MatchesTable matches={matches} />);

    // Table headers
    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    expect(headers).toHaveLength(4);
    expect(headers[0]).toHaveTextContent("Table");
    expect(headers[1]).toHaveTextContent("Player 1");
    expect(headers[2]).toHaveTextContent("Player 2");
    expect(headers[3]).toHaveTextContent("Result");
  });

  it("applies font-medium to the winning player name", () => {
    const matches = [makeMatch({ id: 1, winner_id: 10 })];

    render(<MatchesTable matches={matches} />);

    // Player 1 (winner) should have font-medium
    const p1 = screen.getByText("Ash Ketchum");
    expect(p1.className).toContain("font-medium");

    // Player 2 (loser) should have text-muted-foreground
    const p2 = screen.getByText("Gary Oak");
    expect(p2.className).toContain("text-muted-foreground");
  });
});
