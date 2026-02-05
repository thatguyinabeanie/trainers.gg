import { render, screen } from "@testing-library/react";
import { PokemonCard, type PokemonData } from "../pokemon-card";

describe("PokemonCard", () => {
  const mockPokemon: PokemonData = {
    species: "Raging Bolt",
    nickname: null,
    ability: "Protosynthesis",
    held_item: "Booster Energy",
    tera_type: "Electric",
    move1: "Thunderclap",
    move2: "Dragon Pulse",
    move3: "Thunderbolt",
    move4: "Volt Switch",
    nature: "Modest",
    gender: null,
    is_shiny: false,
    position: 1,
  };

  it("renders Pokemon species name", () => {
    render(<PokemonCard pokemon={mockPokemon} />);
    expect(screen.getByText("Raging Bolt")).toBeInTheDocument();
  });

  it("renders Pokemon ability below the species name", () => {
    render(<PokemonCard pokemon={mockPokemon} />);
    expect(screen.getByText("Protosynthesis")).toBeInTheDocument();
  });

  it("renders held item with sprite", () => {
    render(<PokemonCard pokemon={mockPokemon} />);
    expect(screen.getByText("Booster Energy")).toBeInTheDocument();
  });

  it("renders all moves", () => {
    render(<PokemonCard pokemon={mockPokemon} />);
    expect(screen.getByText("Thunderclap")).toBeInTheDocument();
    expect(screen.getByText("Dragon Pulse")).toBeInTheDocument();
    expect(screen.getByText("Thunderbolt")).toBeInTheDocument();
    expect(screen.getByText("Volt Switch")).toBeInTheDocument();
  });

  it("renders nickname when provided", () => {
    const pokemonWithNickname = {
      ...mockPokemon,
      nickname: "Sparky",
    };
    render(<PokemonCard pokemon={pokemonWithNickname} />);
    expect(screen.getByTitle("Sparky")).toBeInTheDocument();
  });

  it("renders without held item", () => {
    const pokemonWithoutItem = {
      ...mockPokemon,
      held_item: null,
    };
    render(<PokemonCard pokemon={pokemonWithoutItem} />);
    // Should render without crashing and show species + ability
    expect(screen.getByText("Raging Bolt")).toBeInTheDocument();
    expect(screen.getByText("Protosynthesis")).toBeInTheDocument();
  });

  it("renders gender icon for female Pokemon", () => {
    const femalePokemon = {
      ...mockPokemon,
      species: "Gardevoir",
      gender: "Female" as const,
    };
    render(<PokemonCard pokemon={femalePokemon} />);
    const genderIcon = screen.getByLabelText("Female");
    expect(genderIcon).toBeInTheDocument();
  });

  it("renders gender icon for male Pokemon", () => {
    const malePokemon = {
      ...mockPokemon,
      species: "Lucario",
      gender: "Male" as const,
    };
    render(<PokemonCard pokemon={malePokemon} />);
    const genderIcon = screen.getByLabelText("Male");
    expect(genderIcon).toBeInTheDocument();
  });
});
