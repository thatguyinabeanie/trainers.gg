import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    refresh: jest.fn(),
  })),
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

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn((_species: string) => ({
    url: "https://example.com/sprite.png",
    w: 96,
    h: 96,
    pixelated: false,
  })),
}));

jest.mock("@/actions/teams", () => ({
  reorderTeamPokemonAction: jest.fn().mockResolvedValue({ success: true }),
  removePokemonFromTeamAction: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("lucide-react", () => {
  const mock = (name: string) => {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy({}, { get: (_target, prop: string) => mock(prop) });
});

import { TeamStrip } from "../team-strip";
import { type TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Factories
// =============================================================================

function makePokemonEntry(
  id: number,
  position: number,
  species = "Pikachu",
  options: { heldItem?: string; nickname?: string } = {}
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id,
    team_id: 1,
    pokemon_id: id,
    team_position: position,
    pokemon: {
      id,
      species,
      is_shiny: false,
      ability: "Static",
      nature: "Jolly",
      held_item: options.heldItem ?? null,
      nickname: options.nickname ?? null,
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
    },
  } as TeamWithPokemon["team_pokemon"][number];
}

const defaultStripProps = {
  teamId: 1,
  handle: "ash_ketchum",
  selectedPokemonId: null,
  onSelect: jest.fn(),
  onAddNew: jest.fn(),
};

// =============================================================================
// Tests
// =============================================================================

describe("TeamStrip", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("pokemon chips", () => {
    it("renders a chip for each team member", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[
            makePokemonEntry(1, 1, "Pikachu"),
            makePokemonEntry(2, 2, "Charizard"),
          ]}
        />
      );
      expect(screen.getByAltText("Pikachu")).toBeInTheDocument();
      expect(screen.getByAltText("Charizard")).toBeInTheDocument();
    });

    it("displays species name on each chip", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Arcanine")]}
        />
      );
      expect(screen.getByText("Arcanine")).toBeInTheDocument();
    });

    it("displays nickname when set instead of species name", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu", { nickname: "Sparky" })]}
        />
      );
      expect(screen.getByText("Sparky")).toBeInTheDocument();
    });

    it("displays held item when set", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[
            makePokemonEntry(1, 1, "Pikachu", { heldItem: "Leftovers" }),
          ]}
        />
      );
      expect(screen.getByText("Leftovers")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("calls onSelect with pokemon id when chip is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(
        <TeamStrip
          {...defaultStripProps}
          onSelect={onSelect}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      // Click the select button (has aria-pressed), not the remove button
      const selectBtn = screen
        .getAllByRole("button", { name: /Pikachu/i })
        .find((el) => el.hasAttribute("aria-pressed"));
      await user.click(selectBtn!);
      expect(onSelect).toHaveBeenCalledWith(1);
    });
  });

  describe("empty slots", () => {
    it("renders empty slot placeholders to fill to 6 total", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      // 1 pokemon + first empty (clickable Add) + 4 static empties
      expect(
        screen.getByRole("button", { name: "Add Pokémon" })
      ).toBeInTheDocument();
    });

    it("renders 6 empty slots when no pokemon exist", () => {
      render(<TeamStrip {...defaultStripProps} pokemon={[]} />);
      expect(
        screen.getByRole("button", { name: "Add Pokémon" })
      ).toBeInTheDocument();
    });

    it("calls onAddNew when the + empty slot is clicked", async () => {
      const user = userEvent.setup();
      const onAddNew = jest.fn();
      render(
        <TeamStrip
          {...defaultStripProps}
          onAddNew={onAddNew}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      await user.click(screen.getByRole("button", { name: "Add Pokémon" }));
      expect(onAddNew).toHaveBeenCalled();
    });
  });

  describe("choosing slot state", () => {
    it("shows 'Choosing…' on the designated choosing slot index", () => {
      render(
        <TeamStrip {...defaultStripProps} pokemon={[]} choosingSlot={0} />
      );
      // The choosing slot renders "Choosing…" text
      expect(screen.getByText("Choosing…")).toBeInTheDocument();
    });
  });

  describe("full team (6 pokemon)", () => {
    it("does not render Add Pokémon button when team has 6 members", () => {
      const pokemon = Array.from({ length: 6 }, (_, i) =>
        makePokemonEntry(i + 1, i + 1, `Pokemon${i + 1}`)
      );
      render(<TeamStrip {...defaultStripProps} pokemon={pokemon} />);
      expect(
        screen.queryByRole("button", { name: "Add Pokémon" })
      ).not.toBeInTheDocument();
    });
  });

  describe("remove button", () => {
    it("renders remove button for each filled chip", () => {
      render(
        <TeamStrip
          {...defaultStripProps}
          pokemon={[makePokemonEntry(1, 1, "Pikachu")]}
        />
      );
      expect(
        screen.getByRole("button", { name: "Remove Pikachu" })
      ).toBeInTheDocument();
    });
  });
});
