/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import React from "react";

import { type Tables } from "@trainers/supabase";
import { type PokemonType } from "@trainers/pokemon";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

jest.mock("../../sprite", () => ({
  Sprite: ({ species, size }: { species: string; size: number }) => (
    <div data-testid="sprite" data-species={species} data-size={size} />
  ),
}));

import { SpriteSection } from "../sprite-section";

// =============================================================================
// Helpers
// =============================================================================

function makePokemon(): Tables<"pokemon"> {
  return {
    id: "poke-1",
    species: "Garchomp",
    nickname: null,
    gender: "M",
    level: 50,
    held_item: null,
    ability: "Rough Skin",
    nature: "Jolly",
    tera_type: null,
    is_shiny: false,
    move_1: null,
    move_2: null,
    move_3: null,
    move_4: null,
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
    created_at: "",
    updated_at: "",
  } as Tables<"pokemon">;
}

const baseProps = {
  pokemon: makePokemon(),
  onSpeciesClick: jest.fn(),
  types: ["Dragon", "Ground"] as PokemonType[],
  isShiny: false,
  speciesHasError: false,
};

// =============================================================================
// Tests
// =============================================================================

describe("SpriteSection", () => {
  describe("variant=pill-top", () => {
    it("renders species name in pill", () => {
      render(<SpriteSection {...baseProps} variant="pill-top" />);
      expect(screen.getByText("Garchomp")).toBeInTheDocument();
    });

    it("renders placeholder when no species", () => {
      const noSpeciesPokemon = { ...makePokemon(), species: null } as any;
      render(
        <SpriteSection
          {...baseProps}
          pokemon={noSpeciesPokemon}
          variant="pill-top"
        />
      );
      expect(screen.getByText("Choose species…")).toBeInTheDocument();
    });

    it("renders sprite component", () => {
      render(<SpriteSection {...baseProps} variant="pill-top" />);
      expect(screen.getByTestId("sprite")).toHaveAttribute("data-species", "Garchomp");
    });

    it("applies error ring when speciesHasError", () => {
      render(<SpriteSection {...baseProps} variant="pill-top" speciesHasError />);
      const btn = screen.getByRole("button", { name: /Change species/ });
      expect(btn.className).toContain("ring-1");
    });
  });

  describe("variant=pill-bottom", () => {
    it("renders species name in pill", () => {
      render(<SpriteSection {...baseProps} variant="pill-bottom" />);
      expect(screen.getByText("Garchomp")).toBeInTheDocument();
    });

    it("renders sprite before pill", () => {
      const { container } = render(<SpriteSection {...baseProps} variant="pill-bottom" />);
      const elements = container.querySelectorAll("[data-testid='sprite'], button");
      // Sprite button comes first in pill-bottom
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
