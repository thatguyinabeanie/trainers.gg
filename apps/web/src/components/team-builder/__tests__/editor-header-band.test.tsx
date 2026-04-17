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
  formatHasTera: jest.fn(
    (format: { generation?: number } | null | undefined) => {
      if (!format) return false;
      return format.generation === 9;
    }
  ),
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

// Default to an SV Gen 9 format so the Tera field renders in most tests.
// Tests that need to verify Tera is HIDDEN pass `format={championsFormat}`.
const svFormat = {
  id: "gen9vgc2026regi",
  game: "Scarlet & Violet",
  gameShort: "SV",
  generation: 9,
  category: "VGC",
  year: 2026,
  regulation: "I",
  label: "SV: Reg I",
  showdownName: "[Gen 9] VGC 2026 Reg I",
  doubles: true,
  active: true,
};

function renderBand(
  pokemonOverrides: Partial<Tables<"pokemon">> = {},
  handlerOverrides: Partial<{
    onOpenAbilityPicker: () => void;
    onOpenItemPicker: () => void;
    onOpenTeraPicker: () => void;
    onOpenNaturePicker: () => void;
    onOpenSpeciesPicker?: () => void;
  }> = {},
  formatOverride: Parameters<typeof EditorHeaderBand>[0]["format"] = svFormat
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
      format={formatOverride}
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

  describe("details popover slot", () => {
    it("renders the ⋯ trigger when detailsPopover is wired", () => {
      render(
        <EditorHeaderBand
          pokemon={buildPokemon()}
          format={undefined}
          onOpenAbilityPicker={jest.fn()}
          onOpenItemPicker={jest.fn()}
          onOpenTeraPicker={jest.fn()}
          onOpenNaturePicker={jest.fn()}
          detailsPopover={{ teamId: 1, onUpdate: jest.fn() }}
        />
      );
      expect(
        screen.getByRole("button", { name: /More Pokémon details/i })
      ).toBeInTheDocument();
    });

    it("does not render the ⋯ trigger when detailsPopover is omitted", () => {
      renderBand();
      expect(
        screen.queryByRole("button", { name: /More Pokémon details/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("species picker affordance", () => {
    it("renders sprite + name as a clickable button when onOpenSpeciesPicker is provided", async () => {
      const user = userEvent.setup();
      const onOpenSpeciesPicker = jest.fn();
      renderBand({ species: "Incineroar" }, { onOpenSpeciesPicker });

      // Single click target labeled with the current species — covers both
      // sprite and name per the design.
      const trigger = screen.getByRole("button", {
        name: /Change species \(currently Incineroar\)/,
      });
      await user.click(trigger);
      expect(onOpenSpeciesPicker).toHaveBeenCalledTimes(1);
    });

    it("renders sprite + name as static when onOpenSpeciesPicker is omitted", () => {
      renderBand({ species: "Incineroar" });
      // No species-change button — placeholder/static mode.
      expect(
        screen.queryByRole("button", { name: /Change species/ })
      ).not.toBeInTheDocument();
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

  describe("Tera field gating (formatHasTera)", () => {
    // Fixture helpers — build minimal GameFormat-like objects for the mock.
    const championsFormat = {
      id: "championsvgc2026regma",
      game: "Pokemon Champions",
      gameShort: "Champions",
      generation: 10,
      category: "VGC",
      year: 2026,
      regulation: "M-A",
      label: "Champions: Reg M-A",
      showdownName: "[Champions] VGC 2026 Reg M-A",
      doubles: true,
      active: true,
    };

    const svFormat = {
      id: "gen9vgc2026regi",
      game: "Scarlet & Violet",
      gameShort: "SV",
      generation: 9,
      category: "VGC",
      year: 2026,
      regulation: "I",
      label: "SV: Reg I",
      showdownName: "[Gen 9] VGC 2026 Reg I",
      doubles: true,
      active: true,
    };

    it("hides the Tera field button for a Champions format (no Terastal)", () => {
      render(
        <EditorHeaderBand
          pokemon={buildPokemon({ tera_type: "Fire" })}
          format={championsFormat}
          onOpenAbilityPicker={jest.fn()}
          onOpenItemPicker={jest.fn()}
          onOpenTeraPicker={jest.fn()}
          onOpenNaturePicker={jest.fn()}
        />
      );
      // Neither the button nor any visible "Tera" label should be present.
      expect(
        screen.queryByRole("button", { name: /Edit Tera/ })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/^Tera$/i, { selector: "span" })
      ).not.toBeInTheDocument();
    });

    it("hides the Tera field even when disabled=true for a Champions format", () => {
      render(
        <EditorHeaderBand
          pokemon={buildPokemon({ tera_type: "Fire" })}
          format={championsFormat}
          onOpenAbilityPicker={jest.fn()}
          onOpenItemPicker={jest.fn()}
          onOpenTeraPicker={jest.fn()}
          onOpenNaturePicker={jest.fn()}
          disabled
        />
      );
      expect(
        screen.queryByRole("button", { name: /Edit Tera/ })
      ).not.toBeInTheDocument();
    });

    it("shows the Tera field button for a VGC Gen 9 format (has Terastal)", async () => {
      const user = userEvent.setup();
      const onOpenTeraPicker = jest.fn();
      render(
        <EditorHeaderBand
          pokemon={buildPokemon({ tera_type: "Fire" })}
          format={svFormat}
          onOpenAbilityPicker={jest.fn()}
          onOpenItemPicker={jest.fn()}
          onOpenTeraPicker={onOpenTeraPicker}
          onOpenNaturePicker={jest.fn()}
        />
      );
      const teraBtn = screen.getByRole("button", { name: /Edit Tera/ });
      expect(teraBtn).toBeInTheDocument();
      await user.click(teraBtn);
      expect(onOpenTeraPicker).toHaveBeenCalledTimes(1);
    });

    it("hides the Tera field when format is undefined (safe default → no tera)", () => {
      // Render directly without the renderBand helper so we can pass undefined
      // cleanly — JS treats undefined default params as the default value.
      render(
        <EditorHeaderBand
          pokemon={buildPokemon({ tera_type: "Ghost" })}
          format={undefined}
          onOpenAbilityPicker={jest.fn()}
          onOpenItemPicker={jest.fn()}
          onOpenTeraPicker={jest.fn()}
          onOpenNaturePicker={jest.fn()}
        />
      );
      // formatHasTera(undefined) → false → Tera field hidden
      expect(
        screen.queryByRole("button", { name: /Edit Tera/ })
      ).not.toBeInTheDocument();
    });
  });
});
