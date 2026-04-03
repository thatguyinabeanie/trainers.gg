import { render, screen } from "@testing-library/react";
import { TeamSheet, type TeamData } from "../team-sheet";

// ===========================================================================
// Mock helpers for heavy sub-components
// ===========================================================================

jest.mock("../pokemon-card", () => ({
  PokemonCard: ({ pokemon }: { pokemon: { species: string; position: number } }) => (
    <div data-testid={`pokemon-card-${pokemon.position}`}>{pokemon.species}</div>
  ),
}));

// ===========================================================================
// Fixtures
// ===========================================================================

function makePokemon(position: number, species: string) {
  return {
    species,
    nickname: null,
    ability: "Intimidate",
    held_item: null,
    tera_type: "Fire",
    move1: "Flamethrower",
    move2: null,
    move3: null,
    move4: null,
    nature: "Jolly",
    gender: null,
    is_shiny: false,
    position,
  };
}

const defaultTeam: TeamData = {
  teamId: 1,
  teamName: "VGC Team",
  pokemon: [
    makePokemon(3, "Charizard"),
    makePokemon(1, "Pikachu"),
    makePokemon(2, "Mewtwo"),
  ],
};

// ===========================================================================
// Tests
// ===========================================================================

describe("TeamSheet", () => {
  it("renders a card for each Pokemon in the team", () => {
    render(<TeamSheet team={defaultTeam} />);

    expect(screen.getByTestId("pokemon-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("pokemon-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("pokemon-card-3")).toBeInTheDocument();
  });

  it("renders Pokemon cards in ascending position order", () => {
    render(<TeamSheet team={defaultTeam} />);

    const cards = screen.getAllByTestId(/pokemon-card-/);
    // Positions should come out as 1, 2, 3
    expect(cards[0]).toHaveAttribute("data-testid", "pokemon-card-1");
    expect(cards[1]).toHaveAttribute("data-testid", "pokemon-card-2");
    expect(cards[2]).toHaveAttribute("data-testid", "pokemon-card-3");
  });

  it("renders species names for all Pokemon", () => {
    render(<TeamSheet team={defaultTeam} />);

    expect(screen.getByText("Pikachu")).toBeInTheDocument();
    expect(screen.getByText("Mewtwo")).toBeInTheDocument();
    expect(screen.getByText("Charizard")).toBeInTheDocument();
  });

  it("renders an empty grid when Pokemon list is empty", () => {
    const emptyTeam: TeamData = { teamId: 2, teamName: null, pokemon: [] };
    const { container } = render(<TeamSheet team={emptyTeam} />);

    // No pokemon cards should appear
    expect(screen.queryByTestId(/pokemon-card-/)).not.toBeInTheDocument();
    // But the container still renders
    expect(container.firstChild).toBeInTheDocument();
  });

  it("applies additional className to the wrapper", () => {
    const { container } = render(
      <TeamSheet team={defaultTeam} className="extra-class" />
    );
    expect(container.firstChild).toHaveClass("extra-class");
  });

  it("handles a team with null teamName without crashing", () => {
    const teamWithoutName: TeamData = {
      ...defaultTeam,
      teamName: null,
    };
    render(<TeamSheet team={teamWithoutName} />);
    expect(screen.getByTestId("pokemon-card-1")).toBeInTheDocument();
  });

  it("handles a single-Pokemon team", () => {
    const singlePokemonTeam: TeamData = {
      teamId: 3,
      teamName: "Solo",
      pokemon: [makePokemon(1, "Arceus")],
    };
    render(<TeamSheet team={singlePokemonTeam} />);
    expect(screen.getByText("Arceus")).toBeInTheDocument();
  });
});
