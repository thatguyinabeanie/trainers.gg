import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks — keep the dex out of the test runtime
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getSpeciesTypes: jest.fn(() => ["Fire", "Dark"]),
  getValidAbilities: jest.fn(() => ["Intimidate", "Flash Fire"]),
  getMegaStoneForSpecies: jest.fn(() => null),
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

// Tooltip uses Base UI portals — mock to simple pass-through wrappers so the
// TypeSymbolIcon renders inline without needing a full JSDOM provider.
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ render: renderProp }: { render: React.ReactNode }) => (
    <>{renderProp}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
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

// EditorHeaderBand renders both layouts simultaneously and uses Tailwind
// `hidden md:flex` / `md:hidden` to show only the right one per viewport.
// JSDOM doesn't compute Tailwind class styles, so without intervention every
// FieldButton would appear twice — once in the desktop row, once in the
// mobile grid — breaking single-match queries like `getByRole`.
//
// Tests use `within()`-scoped queries to target one layout's container at a
// time, keeping queries layout-aware without mutating DOM nodes that React
// rendered. Identity/meta zone elements (sprite, name, gender, level, etc.)
// only render once in Row 1, so they remain queryable via the top-level
// `screen` queries.
function desktopFields() {
  return within(screen.getByTestId("editor-header-band-desktop-fields"));
}

function mobileFields() {
  return within(screen.getByTestId("editor-header-band-mobile-fields"));
}

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
      renderBand({ species: "Incineroar" });
      // Use alt text to disambiguate from the type symbol icons (which use role="img" too).
      const img = screen.getByRole("img", { name: "Incineroar" });
      expect(img).toHaveAttribute("src", "https://example.test/sprite.png");
    });

    it("renders both type icons (role=img) for a dual-typed species", () => {
      renderBand();
      // Types now render as TypeSymbolIcon (round glyph, no text) —
      // each has role="img" with aria-label = type name.
      expect(screen.getByRole("img", { name: "Fire" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Dark" })).toBeInTheDocument();
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
      // Build fields render in both layouts (`hidden md:flex` / `md:hidden`);
      // scope to one container so each value matches a single button.
      expect(desktopFields().getByText("Intimidate")).toBeInTheDocument();
      expect(desktopFields().getByText("Choice Scarf")).toBeInTheDocument();
      expect(desktopFields().getByText("Ghost")).toBeInTheDocument();
      expect(desktopFields().getByText("Jolly")).toBeInTheDocument();
    });

    it("renders 'None' when item or tera type is null", () => {
      renderBand({ held_item: null, tera_type: null });
      // Two "None" labels per layout — one for item, one for tera.
      expect(desktopFields().getAllByText("None")).toHaveLength(2);
    });

    it("calls onOpenAbilityPicker when the Ability button is clicked", async () => {
      const user = userEvent.setup();
      const handlers = renderBand();
      await user.click(
        desktopFields().getByRole("button", { name: /Edit Ability/ })
      );
      expect(handlers.onOpenAbilityPicker).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenItemPicker when the Item button is clicked", async () => {
      const user = userEvent.setup();
      const handlers = renderBand();
      await user.click(
        desktopFields().getByRole("button", { name: /Edit Item/ })
      );
      expect(handlers.onOpenItemPicker).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenTeraPicker when the Tera button is clicked", async () => {
      const user = userEvent.setup();
      const handlers = renderBand();
      await user.click(
        desktopFields().getByRole("button", { name: /Edit Tera/ })
      );
      expect(handlers.onOpenTeraPicker).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenNaturePicker when the Nature button is clicked", async () => {
      const user = userEvent.setup();
      const handlers = renderBand();
      await user.click(
        desktopFields().getByRole("button", { name: /Edit Nature/ })
      );
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
    it("renders the sprite as a clickable button with species picker label when onOpenSpeciesPicker is provided", async () => {
      const user = userEvent.setup();
      const onOpenSpeciesPicker = jest.fn();
      renderBand({ species: "Incineroar" }, { onOpenSpeciesPicker });

      const trigger = screen.getByRole("button", {
        name: /Change species \(currently Incineroar\)/,
      });
      await user.click(trigger);
      expect(onOpenSpeciesPicker).toHaveBeenCalledTimes(1);
    });

    it("does not render a species-change button when onOpenSpeciesPicker is omitted", () => {
      renderBand({ species: "Incineroar" });
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

      // Ability text is present in the desktop layout (also in mobile, but
      // scoping to one container keeps the assertion exact-match).
      expect(desktopFields().getByText("Levitate")).toBeInTheDocument();

      // No Edit Ability button should exist in either layout — assert both.
      expect(
        desktopFields().queryByRole("button", { name: /Edit Ability/ })
      ).not.toBeInTheDocument();
      expect(
        mobileFields().queryByRole("button", { name: /Edit Ability/ })
      ).not.toBeInTheDocument();

      // Clicking the static label should not trigger the handler
      await user.click(desktopFields().getByText("Levitate"));
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
      // Scope to one layout — Tera button renders in both desktop and mobile.
      const teraBtn = desktopFields().getByRole("button", {
        name: /Edit Tera/,
      });
      expect(teraBtn).toBeInTheDocument();
      await user.click(teraBtn);
      expect(onOpenTeraPicker).toHaveBeenCalledTimes(1);
    });

    it("hides the Tera field when format is undefined (safe default → no tera)", () => {
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

  // ===========================================================================
  // Inline identity controls (nickname, gender, shiny, level)
  // ===========================================================================

  describe("inline identity controls", () => {
    function renderBandWithControls(
      pokemonOverrides: Partial<Tables<"pokemon">> = {},
      onUpdate = jest.fn()
    ) {
      render(
        <EditorHeaderBand
          pokemon={buildPokemon(pokemonOverrides)}
          format={svFormat}
          onOpenAbilityPicker={jest.fn()}
          onOpenItemPicker={jest.fn()}
          onOpenTeraPicker={jest.fn()}
          onOpenNaturePicker={jest.fn()}
          detailsPopover={{ teamId: 1, onUpdate }}
        />
      );
      return onUpdate;
    }

    async function openNicknameEdit(user: ReturnType<typeof userEvent.setup>) {
      const nameBtn = screen.getByRole("button", { name: /Edit nickname/i });
      await user.click(nameBtn);
      return screen.getByLabelText("Nickname");
    }

    it("shows the species name as the primary name button when nickname is null", () => {
      renderBandWithControls({ nickname: null, species: "Incineroar" });
      const nameBtn = screen.getByRole("button", { name: /Edit nickname/i });
      expect(nameBtn).toHaveTextContent("Incineroar");
    });

    it("shows the nickname as the primary name button when nickname is set", () => {
      renderBandWithControls({ nickname: "Sparky", species: "Incineroar" });
      const nameBtn = screen.getByRole("button", { name: /Edit nickname/i });
      expect(nameBtn).toHaveTextContent("Sparky");
    });

    it("clicking the name button opens an input with species as placeholder when nickname is null", async () => {
      const user = userEvent.setup();
      renderBandWithControls({ nickname: null, species: "Incineroar" });
      const input = await openNicknameEdit(user);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Incineroar");
      expect(input).toHaveValue("");
    });

    it("clicking the name button opens an input pre-filled with the existing nickname", async () => {
      const user = userEvent.setup();
      renderBandWithControls({ nickname: "Sparky", species: "Incineroar" });
      const input = await openNicknameEdit(user);
      expect(input).toHaveValue("Sparky");
    });

    it("calls onUpdate with the typed nickname when the input loses focus", async () => {
      const user = userEvent.setup();
      const onUpdate = renderBandWithControls({ nickname: null });
      const input = await openNicknameEdit(user);
      await user.type(input, "Glacier");
      await user.tab();
      expect(onUpdate).toHaveBeenCalledWith("nickname", "Glacier");
    });

    it("calls onUpdate when Enter is pressed in the nickname input", async () => {
      const user = userEvent.setup();
      const onUpdate = renderBandWithControls({ nickname: null });
      const input = await openNicknameEdit(user);
      await user.type(input, "Glacier");
      await user.keyboard("{Enter}");
      expect(onUpdate).toHaveBeenCalledWith("nickname", "Glacier");
    });

    it("calls onUpdate with null when nickname is cleared and committed", async () => {
      const user = userEvent.setup();
      const onUpdate = renderBandWithControls({ nickname: "Sparky" });
      const input = await openNicknameEdit(user);
      await user.clear(input);
      await user.tab();
      expect(onUpdate).toHaveBeenLastCalledWith("nickname", null);
    });

    it("does not call onUpdate when Escape is pressed — reverts to original", async () => {
      const user = userEvent.setup();
      const onUpdate = renderBandWithControls({ nickname: "Sparky" });
      const input = await openNicknameEdit(user);
      await user.clear(input);
      await user.type(input, "Changed");
      await user.keyboard("{Escape}");
      expect(onUpdate).not.toHaveBeenCalled();
      expect(screen.queryByLabelText("Nickname")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Edit nickname/i })
      ).toHaveTextContent("Sparky");
    });

    it("renders gender buttons for ♂, ♀, and — (unknown)", () => {
      renderBandWithControls({ gender: null });
      expect(screen.getByLabelText("Male")).toBeInTheDocument();
      expect(screen.getByLabelText("Female")).toBeInTheDocument();
      expect(screen.getByLabelText("Unknown")).toBeInTheDocument();
    });

    it("calls onUpdate with 'Male' when the ♂ button is clicked", async () => {
      const user = userEvent.setup();
      const onUpdate = renderBandWithControls({ gender: null });
      await user.click(screen.getByLabelText("Male"));
      expect(onUpdate).toHaveBeenCalledWith("gender", "Male");
    });

    it("calls onUpdate with 'Female' when the ♀ button is clicked", async () => {
      const user = userEvent.setup();
      const onUpdate = renderBandWithControls({ gender: null });
      await user.click(screen.getByLabelText("Female"));
      expect(onUpdate).toHaveBeenCalledWith("gender", "Female");
    });

    it("calls onUpdate with null when — (Unknown) is clicked", async () => {
      const user = userEvent.setup();
      const onUpdate = renderBandWithControls({ gender: "Male" });
      await user.click(screen.getByLabelText("Unknown"));
      expect(onUpdate).toHaveBeenCalledWith("gender", null);
    });

    it("renders the shiny toggle button", () => {
      renderBandWithControls({ is_shiny: false });
      const btn = screen.getByLabelText("Shiny (off)");
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute("aria-pressed", "false");
    });

    it("calls onUpdate with true when shiny toggle is clicked (currently off)", async () => {
      const user = userEvent.setup();
      const onUpdate = renderBandWithControls({ is_shiny: false });
      await user.click(screen.getByLabelText("Shiny (off)"));
      expect(onUpdate).toHaveBeenCalledWith("is_shiny", true);
    });

    it("calls onUpdate with false when shiny toggle is clicked (currently on)", async () => {
      const user = userEvent.setup();
      const onUpdate = renderBandWithControls({ is_shiny: true });
      await user.click(screen.getByLabelText("Shiny (on)"));
      expect(onUpdate).toHaveBeenCalledWith("is_shiny", false);
    });

    it("renders the level input with the current level value", () => {
      renderBandWithControls({ level: 50 });
      const input = screen.getByLabelText("Level") as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(Number(input.value)).toBe(50);
    });

    it("clamps level to 100 and calls onUpdate with the clamped value", async () => {
      const user = userEvent.setup();
      const onUpdate = renderBandWithControls({ level: 50 });
      const input = screen.getByLabelText("Level");
      await user.clear(input);
      await user.type(input, "150");
      expect(onUpdate).toHaveBeenLastCalledWith("level", 100);
    });

    it("clamps level to 1 and calls onUpdate with the clamped value", () => {
      const onUpdate = renderBandWithControls({ level: 50 });
      const input = screen.getByLabelText("Level");
      // Use fireEvent.change to bypass controlled-input interaction quirks —
      // we want to assert the clamping logic, not simulate multi-key user events.
      fireEvent.change(input, { target: { value: "0" } });
      expect(onUpdate).toHaveBeenLastCalledWith("level", 1);
    });

    it("does not render identity controls when detailsPopover is omitted", () => {
      renderBand();
      expect(
        screen.queryByRole("button", { name: /Edit nickname/i })
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Male")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Shiny (off)")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Level")).not.toBeInTheDocument();
    });
  });

  describe("mobile layout", () => {
    it("renders both desktop and mobile build-fields containers", () => {
      // CSS-based responsive layout — both branches mount in the DOM (one is
      // hidden via Tailwind `hidden md:flex` / `md:hidden` per viewport).
      // Render WITHOUT trimming so we can assert both testids exist.
      render(
        <EditorHeaderBand
          pokemon={buildPokemon()}
          format={svFormat}
          onOpenAbilityPicker={jest.fn()}
          onOpenItemPicker={jest.fn()}
          onOpenTeraPicker={jest.fn()}
          onOpenNaturePicker={jest.fn()}
        />
      );
      expect(
        screen.getByTestId("editor-header-band-desktop-fields")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("editor-header-band-mobile-fields")
      ).toBeInTheDocument();
    });

    it("renders one set of FieldButtons inside the mobile grid", () => {
      renderBand();
      // Scope queries to the mobile container — each FieldButton renders
      // exactly once inside it.
      expect(
        mobileFields().getByRole("button", { name: /Edit Ability/ })
      ).toBeInTheDocument();
      expect(
        mobileFields().getByRole("button", { name: /Edit Item/ })
      ).toBeInTheDocument();
      expect(
        mobileFields().getByRole("button", { name: /Edit Tera/ })
      ).toBeInTheDocument();
      expect(
        mobileFields().getByRole("button", { name: /Edit Nature/ })
      ).toBeInTheDocument();
    });

    it("clicking the mobile Ability cell triggers onOpenAbilityPicker", async () => {
      const user = userEvent.setup();
      const handlers = renderBand();
      await user.click(
        mobileFields().getByRole("button", { name: /Edit Ability/ })
      );
      expect(handlers.onOpenAbilityPicker).toHaveBeenCalledTimes(1);
    });

    it("collapses Nature to span both columns when the format has no Tera", () => {
      // Render with a Champions (Gen 10) format — formatHasTera returns false,
      // so the mobile grid renders Ability+Item on row 1 and Nature spanning
      // both columns on row 2.
      const championsFormat = { ...svFormat, generation: 10 };
      renderBand({}, {}, championsFormat);
      const mobileContainer = screen.getByTestId(
        "editor-header-band-mobile-fields"
      );
      // The col-span-2 cell wraps the Nature field exclusively.
      const natureCell = mobileContainer.querySelector(".col-span-2");
      expect(natureCell).not.toBeNull();
      expect(natureCell!.textContent).toContain("Nature");
    });
  });
});
