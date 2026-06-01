import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StandingsTable } from "../limitless-standings";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeStanding(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    placement: 1,
    record_wins: 7,
    record_losses: 2,
    record_ties: 0,
    drop_round: null,
    player: {
      id: 100,
      username: "ash_ketchum",
      display_name: "Ash Ketchum",
      country: "US",
    },
    team_pokemon: [
      {
        position: 1,
        species: "pikachu",
        ability: "Static",
        held_item: "Light Ball",
        tera_type: "Electric",
        moves: ["Thunderbolt", "Volt Tackle", "Iron Tail", "Quick Attack"],
      },
      {
        position: 2,
        species: "charizard",
        ability: "Blaze",
        held_item: "Choice Specs",
        tera_type: "Fire",
        moves: ["Flamethrower", "Air Slash"],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StandingsTable", () => {
  it("renders column headers", () => {
    render(<StandingsTable standings={[makeStanding()]} />);

    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(4);
    expect(headers[0]).toHaveTextContent("#");
    expect(headers[1]).toHaveTextContent("Player");
    expect(headers[2]).toHaveTextContent("Record");
    expect(headers[3]).toHaveTextContent("Team");
  });

  it("renders placement and player name", () => {
    render(<StandingsTable standings={[makeStanding()]} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
  });

  it("shows username below display_name when both exist", () => {
    render(<StandingsTable standings={[makeStanding()]} />);

    expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    expect(screen.getByText("ash_ketchum")).toBeInTheDocument();
  });

  it("shows only username when display_name is null", () => {
    const standing = makeStanding({
      player: {
        id: 100,
        username: "ash_ketchum",
        display_name: null,
        country: "US",
      },
    });

    render(<StandingsTable standings={[standing]} />);

    // Username is shown as the main name
    expect(screen.getByText("ash_ketchum")).toBeInTheDocument();
  });

  it("renders win-loss record", () => {
    render(<StandingsTable standings={[makeStanding()]} />);
    expect(screen.getByText("7-2")).toBeInTheDocument();
  });

  it("includes ties in record when non-zero", () => {
    const standing = makeStanding({ record_ties: 1 });
    render(<StandingsTable standings={[standing]} />);
    expect(screen.getByText("7-2-1")).toBeInTheDocument();
  });

  it("renders country flag emoji", () => {
    render(<StandingsTable standings={[makeStanding()]} />);
    // US flag emoji: 🇺🇸
    expect(screen.getByTitle("US")).toBeInTheDocument();
  });

  it("does not render country flag when country is null", () => {
    const standing = makeStanding({
      player: {
        id: 100,
        username: "ash",
        display_name: null,
        country: null,
      },
    });

    render(<StandingsTable standings={[standing]} />);
    expect(screen.queryByTitle("US")).not.toBeInTheDocument();
  });

  it("shows drop round when present", () => {
    const standing = makeStanding({ drop_round: 5 });
    render(<StandingsTable standings={[standing]} />);
    expect(screen.getByText("(drop R5)")).toBeInTheDocument();
  });

  it("does not show drop round when null", () => {
    render(<StandingsTable standings={[makeStanding()]} />);
    expect(screen.queryByText(/drop R/)).not.toBeInTheDocument();
  });

  it("shows expand button when team_pokemon is present", () => {
    render(<StandingsTable standings={[makeStanding()]} />);
    // The chevron button should be present
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows em-dash when no team_pokemon", () => {
    const standing = makeStanding({ team_pokemon: [] });
    render(<StandingsTable standings={[standing]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("expands team details on row click", async () => {
    const user = userEvent.setup();
    render(<StandingsTable standings={[makeStanding()]} />);

    // Team details should NOT be visible initially
    expect(screen.queryByText("pikachu")).not.toBeInTheDocument();

    // Click the row to expand
    const rows = screen.getAllByRole("row");
    // rows[0] is header, rows[1] is the data row
    await user.click(rows[1]);

    // Team pokemon should now be visible
    expect(screen.getByText("pikachu")).toBeInTheDocument();
    expect(screen.getByText("charizard")).toBeInTheDocument();
  });

  it("shows pokemon details when expanded", async () => {
    const user = userEvent.setup();
    render(<StandingsTable standings={[makeStanding()]} />);

    // Click to expand
    const rows = screen.getAllByRole("row");
    await user.click(rows[1]);

    // Check pokemon details
    expect(screen.getByText("pikachu")).toBeInTheDocument();
    expect(screen.getByText("Static")).toBeInTheDocument();
    expect(screen.getByText("Light Ball")).toBeInTheDocument();
    expect(screen.getByText("Tera: Electric")).toBeInTheDocument();
    expect(
      screen.getByText("Thunderbolt, Volt Tackle, Iron Tail, Quick Attack")
    ).toBeInTheDocument();
  });

  it("collapses team details on second click", async () => {
    const user = userEvent.setup();
    render(<StandingsTable standings={[makeStanding()]} />);

    const rows = screen.getAllByRole("row");

    // Expand
    await user.click(rows[1]);
    expect(screen.getByText("pikachu")).toBeInTheDocument();

    // Collapse
    await user.click(rows[1]);
    expect(screen.queryByText("pikachu")).not.toBeInTheDocument();
  });

  it("expands via the chevron button", async () => {
    const user = userEvent.setup();
    render(<StandingsTable standings={[makeStanding()]} />);

    const expandButton = screen.getByRole("button");
    await user.click(expandButton);

    expect(screen.getByText("pikachu")).toBeInTheDocument();
  });

  it("does not expand when team_pokemon is empty", async () => {
    const user = userEvent.setup();
    const standing = makeStanding({ team_pokemon: [] });
    render(<StandingsTable standings={[standing]} />);

    const rows = screen.getAllByRole("row");
    await user.click(rows[1]);

    // No pokemon details should appear
    expect(screen.queryByText("pikachu")).not.toBeInTheDocument();
  });

  it("renders multiple standings", () => {
    const standings = [
      makeStanding({ id: 1, placement: 1 }),
      makeStanding({
        id: 2,
        placement: 2,
        player: {
          id: 200,
          username: "gary",
          display_name: "Gary Oak",
          country: "US",
        },
      }),
    ];

    render(<StandingsTable standings={standings} />);

    expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    expect(screen.getByText("Gary Oak")).toBeInTheDocument();
  });

  it("handles pokemon without optional fields", async () => {
    const user = userEvent.setup();
    const standing = makeStanding({
      team_pokemon: [
        {
          position: 1,
          species: "ditto",
          ability: null,
          held_item: null,
          tera_type: null,
          moves: null,
        },
      ],
    });

    render(<StandingsTable standings={[standing]} />);

    const rows = screen.getAllByRole("row");
    await user.click(rows[1]);

    // Species should be shown
    expect(screen.getByText("ditto")).toBeInTheDocument();
    // Optional fields should NOT be rendered
    expect(screen.queryByText(/Tera:/)).not.toBeInTheDocument();
  });

  it("handles pokemon with empty moves array", async () => {
    const user = userEvent.setup();
    const standing = makeStanding({
      team_pokemon: [
        {
          position: 1,
          species: "magikarp",
          ability: "Swift Swim",
          held_item: null,
          tera_type: null,
          moves: [],
        },
      ],
    });

    render(<StandingsTable standings={[standing]} />);

    const rows = screen.getAllByRole("row");
    await user.click(rows[1]);

    expect(screen.getByText("magikarp")).toBeInTheDocument();
    expect(screen.getByText("Swift Swim")).toBeInTheDocument();
  });

  it("sorts team_pokemon by position", async () => {
    const user = userEvent.setup();
    const standing = makeStanding({
      team_pokemon: [
        {
          position: 3,
          species: "venusaur",
          ability: null,
          held_item: null,
          tera_type: null,
          moves: null,
        },
        {
          position: 1,
          species: "bulbasaur",
          ability: null,
          held_item: null,
          tera_type: null,
          moves: null,
        },
        {
          position: 2,
          species: "ivysaur",
          ability: null,
          held_item: null,
          tera_type: null,
          moves: null,
        },
      ],
    });

    render(<StandingsTable standings={[standing]} />);

    const rows = screen.getAllByRole("row");
    await user.click(rows[1]);

    // All three should be visible
    const pokemonNames = screen
      .getAllByText(/bulbasaur|ivysaur|venusaur/)
      .map((el) => el.textContent);
    expect(pokemonNames).toEqual(["bulbasaur", "ivysaur", "venusaur"]);
  });
});
