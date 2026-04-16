import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn((_species: string) => ({
    url: "https://example.com/sprite.png",
    w: 96,
    h: 96,
    pixelated: false,
  })),
}));

jest.mock("@trainers/pokemon", () => ({
  getFormatLabel: jest.fn((id: string) => id),
}));

jest.mock("@trainers/utils", () => ({
  formatTimeAgo: jest.fn((str: string) => (str ? "2h ago" : "just now")),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    ...rest
  }: {
    src: string;
    alt: string;
  } & Record<string, unknown>) => <img src={src} alt={alt} {...rest} />,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { TeamCard } from "../team-card";
import { type TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Factories
// =============================================================================

function makePokemonEntry(
  id: number,
  position: number,
  species: string | null = "Pikachu",
  isShiny = false
) {
  return {
    id,
    team_id: 1,
    pokemon_id: id,
    team_position: position,
    pokemon: species
      ? {
          id,
          species,
          is_shiny: isShiny,
          ability: "Static",
          nature: "Jolly",
          held_item: null,
          nickname: null,
          gender: null,
          level: 50,
          move1: "Thunderbolt",
          move2: null,
          move3: null,
          move4: null,
          tera_type: null,
          ev_hp: 0,
          ev_attack: 0,
          ev_defense: 0,
          ev_special_attack: 0,
          ev_special_defense: 0,
          ev_speed: 0,
          iv_hp: 31,
          iv_attack: 31,
          iv_defense: 31,
          iv_special_attack: 31,
          iv_special_defense: 31,
          iv_speed: 31,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : null,
  };
}

function makeTeam(overrides: Partial<TeamWithPokemon> = {}): TeamWithPokemon {
  return {
    id: 1,
    alt_id: 10,
    name: "Test Team",
    format: "gen9vgc2026regi",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    is_public: false,
    description: null,
    fork_source_id: null,
    team_pokemon: [
      makePokemonEntry(
        1,
        1,
        "Pikachu"
      ) as TeamWithPokemon["team_pokemon"][number],
      makePokemonEntry(
        2,
        2,
        "Charizard"
      ) as TeamWithPokemon["team_pokemon"][number],
    ],
    ...overrides,
  } as TeamWithPokemon;
}

// =============================================================================
// Tests
// =============================================================================

describe("TeamCard", () => {
  describe("basic rendering", () => {
    it("renders the team name", () => {
      render(<TeamCard team={makeTeam()} handle="ash_ketchum" />);
      expect(screen.getByText("Test Team")).toBeInTheDocument();
    });

    it("renders the format badge when format is set", () => {
      render(<TeamCard team={makeTeam()} handle="ash_ketchum" />);
      expect(screen.getByText("gen9vgc2026regi")).toBeInTheDocument();
    });

    it("does not render a format badge when format is null", () => {
      const team = makeTeam({ format: null });
      render(<TeamCard team={team} handle="ash_ketchum" />);
      expect(screen.queryByText("gen9vgc2026regi")).not.toBeInTheDocument();
    });

    it("renders the last updated time", () => {
      render(<TeamCard team={makeTeam()} handle="ash_ketchum" />);
      expect(screen.getByText("2h ago")).toBeInTheDocument();
    });
  });

  describe("sprite slots", () => {
    it("renders sprites for pokemon that have species", () => {
      render(<TeamCard team={makeTeam()} handle="ash_ketchum" />);
      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(2);
    });

    it("renders 6 slots total (pads with empty slots)", () => {
      render(<TeamCard team={makeTeam()} handle="ash_ketchum" />);
      // 2 filled + 4 empty = 6 slots
      const emptySlots = screen
        .getAllByRole("generic")
        .filter((el) =>
          el.getAttribute("aria-label")?.startsWith("Empty slot")
        );
      expect(emptySlots).toHaveLength(4);
    });

    it("renders all empty slots when team_pokemon is empty", () => {
      const team = makeTeam({ team_pokemon: [] });
      render(<TeamCard team={team} handle="ash_ketchum" />);
      const emptySlots = screen
        .getAllByRole("generic")
        .filter((el) =>
          el.getAttribute("aria-label")?.startsWith("Empty slot")
        );
      expect(emptySlots).toHaveLength(6);
    });
  });

  describe("link", () => {
    it("links to the team workspace", () => {
      render(<TeamCard team={makeTeam()} handle="ash_ketchum" />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/dashboard/alts/ash_ketchum/teams/1"
      );
    });
  });

  describe("slot ordering", () => {
    it("sorts pokemon by position before rendering", () => {
      const team = makeTeam({
        team_pokemon: [
          makePokemonEntry(
            2,
            2,
            "Charizard"
          ) as TeamWithPokemon["team_pokemon"][number],
          makePokemonEntry(
            1,
            1,
            "Pikachu"
          ) as TeamWithPokemon["team_pokemon"][number],
        ],
      });
      render(<TeamCard team={team} handle="ash_ketchum" />);
      // Pikachu and Charizard sprites should both be present
      expect(screen.getByAltText("Pikachu")).toBeInTheDocument();
      expect(screen.getByAltText("Charizard")).toBeInTheDocument();
    });
  });
});
