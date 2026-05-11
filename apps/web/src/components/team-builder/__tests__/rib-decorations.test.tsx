"use client";

/**
 * Tests for RibDecorations — type pills rendered inside the active-row rib.
 * Level picker has moved to the identity panel meta-bar; gender / shiny
 * controls live there too. The rib only renders type pills now.
 */

import { render, screen } from "@testing-library/react";
import React from "react";

import { type Tables } from "@trainers/supabase";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Mocks
// =============================================================================


// @trainers/pokemon — control type resolution per test
jest.mock("@trainers/pokemon", () => ({
  getSpeciesTypes: jest.fn().mockReturnValue(["Dragon", "Ground"]),
}));

// @trainers/pokemon/sprites — return predictable URLs
jest.mock("@trainers/pokemon/sprites", () => ({
  getShowdownTypeIconUrl: (t: string) => `https://sprites.test/${t}.png`,
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { RibDecorations } from "../_deprecated/rib-decorations";
import * as TrainersPokemon from "@trainers/pokemon";

// =============================================================================
// Fixtures
// =============================================================================

const VGC_FORMAT: GameFormat = {
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

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Garchomp",
    ability: "Rough Skin",
    nature: "Adamant",
    move1: "Earthquake",
    move2: null,
    move3: null,
    move4: null,
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
    level: 50,
    held_item: null,
    nickname: null,
    notes: null,
    tera_type: null,
    is_shiny: null,
    gender: null,
    format_legal: null,
    created_at: null,
    ...overrides,
  };
}

function renderDecorations(
  pokemonOverrides: Partial<Tables<"pokemon">> = {},
  format: GameFormat | undefined = VGC_FORMAT
) {
  const onUpdate = jest.fn();
  const result = render(
    <RibDecorations
      pokemon={makePokemon(pokemonOverrides)}
      format={format}
      onUpdate={onUpdate}
    />
  );
  return { ...result, onUpdate };
}

// =============================================================================
// Tests
// =============================================================================

describe("RibDecorations — type pills", () => {
  it("renders two type pills for a dual-type pokemon (Dragon/Ground)", () => {
    renderDecorations();
    const pills = screen.getAllByRole("img");
    expect(pills).toHaveLength(2);
    expect(pills[0]).toHaveAttribute("aria-label", "Dragon");
    expect(pills[1]).toHaveAttribute("aria-label", "Ground");
  });

  it("renders one type pill for a mono-type pokemon", () => {
    (TrainersPokemon.getSpeciesTypes as jest.Mock).mockReturnValueOnce([
      "Fire",
    ]);
    renderDecorations();
    const pills = screen.getAllByRole("img");
    expect(pills).toHaveLength(1);
    expect(pills[0]).toHaveAttribute("aria-label", "Fire");
  });

  it("type pills are wordless icons (no localized text needed)", () => {
    (TrainersPokemon.getSpeciesTypes as jest.Mock).mockReturnValueOnce([
      "Water",
    ]);
    renderDecorations();
    const pill = screen.getByRole("img", { name: "Water" });
    expect(pill.tagName.toLowerCase()).toBe("span");
    expect(pill).toHaveAttribute("data-type", "Water");
  });

  it("type pill is reachable by accessible name (Psychic)", () => {
    (TrainersPokemon.getSpeciesTypes as jest.Mock).mockReturnValueOnce([
      "Psychic",
    ]);
    renderDecorations();
    expect(screen.getByRole("img", { name: "Psychic" })).toBeInTheDocument();
  });
});

describe("RibDecorations — moved-out controls", () => {
  // Level picker, gender toggle, and shiny toggle have all moved to the
  // identity panel meta-bar. The rib renders type pills only.

  it("does NOT render the level picker (it lives in the identity meta-bar)", () => {
    renderDecorations({ level: 50 });
    expect(screen.queryByTitle(/Level/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("number-picker")).not.toBeInTheDocument();
  });

  it("does NOT render the gender toggle", () => {
    renderDecorations({ gender: null });
    expect(screen.queryByTitle("Toggle gender")).not.toBeInTheDocument();
  });

  it("does NOT render the shiny toggle", () => {
    renderDecorations({ is_shiny: false });
    expect(
      screen.queryByTitle("Not shiny (click to set)")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTitle("Shiny (click to clear)")
    ).not.toBeInTheDocument();
  });

  it("renders without crashing when format is undefined", () => {
    expect(() =>
      render(
        <RibDecorations
          pokemon={makePokemon()}
          format={undefined}
          onUpdate={jest.fn()}
        />
      )
    ).not.toThrow();
  });
});
