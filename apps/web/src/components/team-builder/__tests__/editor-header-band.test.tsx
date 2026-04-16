import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks — keep the dex out of the test runtime
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getSpeciesTypes: jest.fn(() => ["Fire", "Dark"]),
  getValidAbilities: jest.fn(() => ["Intimidate", "Flash Fire"]),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn(() => ({
    url: "https://example.test/sprite.png",
    w: 96,
    h: 96,
    pixelated: false,
  })),
}));

// next/image renders an <img> in tests so query-by-alt works.
// Strip next/image-specific boolean props React doesn't understand as DOM attrs.
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    unoptimized: _unoptimized,
    priority: _priority,
    fill: _fill,
    loader: _loader,
    placeholder: _placeholder,
    ...rest
  }: Record<string, unknown>) => {
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

import { getValidAbilities, getSpeciesTypes } from "@trainers/pokemon";

import { EditorHeaderBand } from "../editor-header-band";
import { type Tables } from "@trainers/supabase";

// =============================================================================
// Test helpers
// =============================================================================

const mockedGetValidAbilities = jest.mocked(getValidAbilities);
const mockedGetSpeciesTypes = jest.mocked(getSpeciesTypes);

function buildPokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    ability: "Intimidate",
    created_at: null,
    ev_attack: 0,
    ev_defense: 0,
    ev_hp: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 0,
    format_legal: true,
    gender: null,
    held_item: "Choice Scarf",
    id: 1,
    is_shiny: false,
    iv_attack: 31,
    iv_defense: 31,
    iv_hp: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    move1: "Flare Blitz",
    move2: null,
    move3: null,
    move4: null,
    nature: "Jolly",
    nickname: null,
    notes: null,
    species: "Incineroar",
    tera_type: "Ghost",
    ...overrides,
  };
}

function renderBand(
  pokemonOverrides: Partial<Tables<"pokemon">> = {},
  handlerOverrides: Partial<{
    onOpenAbilityPicker: () => void;
    onOpenItemPicker: () => void;
    onOpenTeraPicker: () => void;
    onOpenNaturePicker: () => void;
  }> = {}
) {
  const handlers = {
    onOpenAbilityPicker: jest.fn(),
    onOpenItemPicker: jest.fn(),
    onOpenTeraPicker: jest.fn(),
    onOpenNaturePicker: jest.fn(),
    ...handlerOverrides,
  };
  render(
    <EditorHeaderBand
      pokemon={buildPokemon(pokemonOverrides)}
      format={undefined}
      {...handlers}
    />
  );
  return handlers;
}

beforeEach(() => {
  // Reset to multi-ability default so each test starts from a known baseline.
  mockedGetValidAbilities.mockReturnValue(["Intimidate", "Flash Fire"]);
  mockedGetSpeciesTypes.mockReturnValue(["Fire", "Dark"]);
});

// =============================================================================
// Tests
// =============================================================================

describe("EditorHeaderBand", () => {
  describe("identity", () => {
    it("renders the species name", () => {
      renderBand({ species: "Incineroar" });
      expect(screen.getByText("Incineroar")).toBeInTheDocument();
    });

    it("renders the sprite image", () => {
      renderBand();
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "https://example.test/sprite.png");
    });

    it("renders both type pills for a dual-typed species", () => {
      renderBand();
      expect(screen.getByText("Fire")).toBeInTheDocument();
      expect(screen.getByText("Dark")).toBeInTheDocument();
    });
  });

  describe("loadout fields", () => {
    it("renders the selected ability, item, tera, and nature values", () => {
      renderBand({
        ability: "Intimidate",
        held_item: "Choice Scarf",
        tera_type: "Ghost",
        nature: "Jolly",
      });
      expect(screen.getByText("Intimidate")).toBeInTheDocument();
      expect(screen.getByText("Choice Scarf")).toBeInTheDocument();
      expect(screen.getByText("Ghost")).toBeInTheDocument();
      expect(screen.getByText("Jolly")).toBeInTheDocument();
    });

    it("renders 'None' when item or tera type is null", () => {
      renderBand({ held_item: null, tera_type: null });
      // Two "None" labels — one for item, one for tera
      expect(screen.getAllByText("None")).toHaveLength(2);
    });

    it("calls onOpenAbilityPicker when the Ability button is clicked", async () => {
      const user = userEvent.setup();
      const handlers = renderBand();
      await user.click(screen.getByRole("button", { name: /Edit Ability/ }));
      expect(handlers.onOpenAbilityPicker).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenItemPicker when the Item button is clicked", async () => {
      const user = userEvent.setup();
      const handlers = renderBand();
      await user.click(screen.getByRole("button", { name: /Edit Item/ }));
      expect(handlers.onOpenItemPicker).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenTeraPicker when the Tera button is clicked", async () => {
      const user = userEvent.setup();
      const handlers = renderBand();
      await user.click(screen.getByRole("button", { name: /Edit Tera/ }));
      expect(handlers.onOpenTeraPicker).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenNaturePicker when the Nature button is clicked", async () => {
      const user = userEvent.setup();
      const handlers = renderBand();
      await user.click(screen.getByRole("button", { name: /Edit Nature/ }));
      expect(handlers.onOpenNaturePicker).toHaveBeenCalledTimes(1);
    });
  });

  describe("single-ability species", () => {
    it("renders ability as static text (not a clickable button)", async () => {
      mockedGetValidAbilities.mockReturnValue(["Levitate"]);
      const user = userEvent.setup();
      const handlers = renderBand({ ability: "Levitate" });

      // Ability text is present
      expect(screen.getByText("Levitate")).toBeInTheDocument();

      // No Edit Ability button should exist
      expect(
        screen.queryByRole("button", { name: /Edit Ability/ })
      ).not.toBeInTheDocument();

      // Clicking the static label should not trigger the handler
      await user.click(screen.getByText("Levitate"));
      expect(handlers.onOpenAbilityPicker).not.toHaveBeenCalled();
    });
  });
});
