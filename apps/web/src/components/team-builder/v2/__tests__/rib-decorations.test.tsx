"use client";

/**
 * Tests for RibDecorations — type pills (rotated) and level picker rendered
 * inside the active-row rib.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type Tables } from "@trainers/supabase";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("../builder.module.css", () => new Proxy({}, { get: (_t, k) => k }));

// Popover: render content inline so it's always queryable
jest.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (
    <div data-testid="popover" data-open={String(!!open)}>
      {children}
    </div>
  ),
  PopoverTrigger: ({
    children,
    render: renderProp,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }) => {
    if (renderProp) {
      return (
        <div data-testid="popover-trigger">
          {renderProp}
          {children}
        </div>
      );
    }
    return <div data-testid="popover-trigger">{children}</div>;
  },
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

jest.mock("../pickers/number-picker", () => ({
  NumberPicker: ({
    title,
    value,
    onChange,
    onClose,
  }: {
    title: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    onClose: () => void;
  }) => (
    <div data-testid="number-picker" data-title={title} data-value={value}>
      <button onClick={() => onChange(42)}>pick-number</button>
      <button onClick={onClose}>close-number</button>
    </div>
  ),
}));

// @trainers/pokemon — control type resolution per test
jest.mock("@trainers/pokemon", () => ({
  getSpeciesTypes: jest.fn().mockReturnValue(["Dragon", "Ground"]),
}));

// @trainers/pokemon/sprites — return predictable URLs
jest.mock("@trainers/pokemon/sprites", () => ({
  getShowdownTypeIconUrl: (t: string) => `https://sprites.test/${t}.png`,
}));

// format-gating — control level gate per test
jest.mock("../format-gating", () => ({
  formatSupportsLevel: jest.fn().mockReturnValue(true),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { RibDecorations } from "../lanes/rib-decorations";
import * as TrainersPokemon from "@trainers/pokemon";
import * as FormatGating from "../format-gating";

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

const CHAMPIONS_FORMAT: GameFormat = {
  id: "championsvgc2026regma",
  game: "Pokemon Champions",
  gameShort: "Champions",
  generation: 9,
  category: "VGC",
  year: 2026,
  regulation: "M-A",
  label: "Champions: Reg M-A",
  showdownName: "[Champions] VGC 2026 Reg M-A",
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
    // The wordless TypeSymbolIcon renders a <span role="img"> — the type
    // name is exposed via aria-label rather than image text content.
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

describe("RibDecorations — level picker (format-gated)", () => {
  beforeEach(() => {
    (FormatGating.formatSupportsLevel as jest.Mock).mockReturnValue(true);
  });

  it("renders the level trigger button when format supports levels", () => {
    renderDecorations({ level: 50 }, VGC_FORMAT);
    // The trigger renders "L50" (L prefix + level number)
    expect(screen.getByTitle("Level 50")).toBeInTheDocument();
  });

  it("shows 'L50' as default when pokemon.level is null", () => {
    renderDecorations({ level: null }, VGC_FORMAT);
    expect(screen.getByTitle("Level 50")).toBeInTheDocument();
  });

  it("renders 'L42' when level is 42", () => {
    renderDecorations({ level: 42 }, VGC_FORMAT);
    expect(screen.getByText("L42")).toBeInTheDocument();
  });

  it("calls onUpdate with level: 42 when NumberPicker fires onChange", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderDecorations({ level: 50 }, VGC_FORMAT);
    await user.click(screen.getByText("pick-number"));
    expect(onUpdate).toHaveBeenCalledWith({ level: 42 });
  });

  it("does NOT render level picker when format does not support levels", () => {
    (FormatGating.formatSupportsLevel as jest.Mock).mockReturnValue(false);
    renderDecorations({}, CHAMPIONS_FORMAT);
    expect(screen.queryByTitle(/Level/)).not.toBeInTheDocument();
  });

  it("renders the NumberPicker in the popover content", () => {
    renderDecorations({ level: 50 }, VGC_FORMAT);
    expect(screen.getByTestId("number-picker")).toBeInTheDocument();
    expect(screen.getByTestId("number-picker")).toHaveAttribute(
      "data-title",
      "Level"
    );
  });
});

describe("RibDecorations — combined render", () => {
  it("renders without crashing for a mono-type pokemon", () => {
    (TrainersPokemon.getSpeciesTypes as jest.Mock).mockReturnValueOnce([
      "Normal",
    ]);
    expect(() => renderDecorations()).not.toThrow();
  });

  it("renders without crashing when format is undefined", () => {
    (FormatGating.formatSupportsLevel as jest.Mock).mockReturnValue(false);
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

  it("renders types and level when format supports levels", () => {
    (FormatGating.formatSupportsLevel as jest.Mock).mockReturnValue(true);
    renderDecorations();
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
    expect(screen.getByTitle("Level 50")).toBeInTheDocument();
  });

  it("renders types but NOT level when format does not support levels", () => {
    (FormatGating.formatSupportsLevel as jest.Mock).mockReturnValue(false);
    renderDecorations({}, CHAMPIONS_FORMAT);
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
    expect(screen.queryByTitle(/Level/)).not.toBeInTheDocument();
  });

  it("does NOT render gender toggle in the rib", () => {
    renderDecorations({ gender: null });
    expect(screen.queryByTitle("Toggle gender")).not.toBeInTheDocument();
  });

  it("does NOT render shiny toggle in the rib", () => {
    renderDecorations({ is_shiny: false });
    expect(
      screen.queryByTitle("Not shiny (click to set)")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTitle("Shiny (click to clear)")
    ).not.toBeInTheDocument();
  });
});
