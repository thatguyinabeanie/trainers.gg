"use client";

/**
 * Tests for HeatmapPanel and its exported pure helpers:
 *   - getTeamDefensiveSummary (already exported)
 *   - getDefenderTypes (tested indirectly via buildDefensiveMatrix)
 *   - cellClass (tested indirectly via render)
 *   - mode toggle (defensive / offensive)
 *   - Tera toggle visibility / behavior
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Mocks — heavy pokemon package
// =============================================================================

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    // getSpeciesTypes returns [] for unknown species by default in actual —
    // override for our fixture pokemon to give deterministic results
    getSpeciesTypes: jest.fn((species: string) => {
      if (species === "Garchomp") return ["Dragon", "Ground"];
      if (species === "Incineroar") return ["Fire", "Dark"];
      if (species === "Togekiss") return ["Fairy", "Flying"];
      if (species === "Dondozo") return ["Water"];
      return actual.getSpeciesTypes(species);
    }),
    getMoveCategory: jest.fn((move: string) => {
      if (move === "Earthquake") return "Physical";
      if (move === "Flamethrower") return "Special";
      if (move === "Moonblast") return "Special";
      if (move === "Swords Dance") return "Status";
      return "Physical";
    }),
    // Keep ALL_TYPES from actual so the 18-type rows still render
  };
});

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn(() => ({ url: "/sprites/test.png" })),
}));

jest.mock("../type-dot", () => ({
  TypeDot: ({ t }: { t: string }) => <span data-testid={`type-dot-${t}`} />,
}));

// effectiveDefensiveMult / effectiveOffensiveMult — return neutral (1) by default
// so we can test counts without dealing with complex type chart logic
jest.mock("../dock/heatmap-effects", () => ({
  effectiveDefensiveMult: jest.fn(() => 1),
}));

jest.mock("../dock/move-type-overrides", () => ({
  effectiveOffensiveMult: jest.fn(() => 1),
}));

jest.mock("../format-gating", () => ({
  formatSupportsTera: jest.fn(() => false),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { HeatmapPanel, getTeamDefensiveSummary } from "../dock/heatmap-panel";
import { effectiveDefensiveMult as mockEffectiveDefensiveMult } from "../dock/heatmap-effects";
import { formatSupportsTera as mockFormatSupportsTera } from "../format-gating";

// =============================================================================
// Fixtures
// =============================================================================

function makePokemon(
  id: number,
  species: string,
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id,
    species,
    ability: "Intimidate",
    nature: "Hardy",
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

function makeTeamPokemon(
  pokemons: Tables<"pokemon">[]
): TeamWithPokemon["team_pokemon"] {
  return pokemons.map((p, i) => ({
    id: i + 100,
    pokemon_id: p.id,
    team_position: i + 1,
    pokemon: p,
  }));
}

const GARCHOMP = makePokemon(1, "Garchomp");
const INCINEROAR = makePokemon(2, "Incineroar");
const TOGEKISS = makePokemon(3, "Togekiss");

// =============================================================================
// HeatmapPanel tests
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  (mockEffectiveDefensiveMult as jest.Mock).mockReturnValue(1);
  (mockFormatSupportsTera as jest.Mock).mockReturnValue(false);
});

describe("HeatmapPanel — empty team", () => {
  it("renders the empty-state message when team is empty", () => {
    render(<HeatmapPanel team={[]} format={undefined} />);
    expect(
      screen.getByText(/Add Pokémon to your team/i)
    ).toBeInTheDocument();
  });

  it("does not render the matrix when team is empty", () => {
    render(<HeatmapPanel team={[]} format={undefined} />);
    expect(screen.queryByText("TOTAL")).not.toBeInTheDocument();
  });
});

describe("HeatmapPanel — with team", () => {
  it("renders the heatmap panel test id", () => {
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);
    expect(screen.getByTestId("heatmap-panel")).toBeInTheDocument();
  });

  it("renders 'Defensive coverage' heading by default", () => {
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);
    expect(screen.getByText("Defensive coverage")).toBeInTheDocument();
  });

  it("renders the TOTAL footer row", () => {
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);
    expect(screen.getByText("TOTAL")).toBeInTheDocument();
  });

  it("renders Defensive and Offensive toggle buttons", () => {
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);
    expect(screen.getByRole("button", { name: /defensive/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /offensive/i })).toBeInTheDocument();
  });
});

describe("HeatmapPanel — mode toggle", () => {
  it("switches to 'Offensive coverage' when clicking Offensive button", async () => {
    const user = userEvent.setup();
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);

    await user.click(screen.getByRole("button", { name: /offensive/i }));
    expect(screen.getByText("Offensive coverage")).toBeInTheDocument();
  });

  it("switches back to defensive when clicking Defensive button", async () => {
    const user = userEvent.setup();
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);

    await user.click(screen.getByRole("button", { name: /offensive/i }));
    await user.click(screen.getByRole("button", { name: /defensive/i }));
    expect(screen.getByText("Defensive coverage")).toBeInTheDocument();
  });

  it("Defensive button is aria-pressed=true by default", () => {
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);
    const defBtn = screen.getByRole("button", { name: /defensive/i });
    expect(defBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("Offensive button has aria-pressed=false by default", () => {
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);
    const offBtn = screen.getByRole("button", { name: /offensive/i });
    expect(offBtn).toHaveAttribute("aria-pressed", "false");
  });
});

describe("HeatmapPanel — Tera toggle", () => {
  it("does NOT show 'View as Tera' button when format does not support Tera", () => {
    (mockFormatSupportsTera as jest.Mock).mockReturnValue(false);
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);
    expect(screen.queryByText(/tera/i)).not.toBeInTheDocument();
  });

  it("shows 'View as Tera' button when format supports Tera (defensive mode)", () => {
    (mockFormatSupportsTera as jest.Mock).mockReturnValue(true);
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);
    expect(screen.getByText("View as Tera")).toBeInTheDocument();
  });

  it("toggling 'View as Tera' switches label to 'Tera on'", async () => {
    const user = userEvent.setup();
    (mockFormatSupportsTera as jest.Mock).mockReturnValue(true);
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);

    await user.click(screen.getByText("View as Tera"));
    expect(screen.getByText("Tera on")).toBeInTheDocument();
  });

  it("'View as Tera' button is NOT visible in offensive mode", async () => {
    const user = userEvent.setup();
    (mockFormatSupportsTera as jest.Mock).mockReturnValue(true);
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);

    await user.click(screen.getByRole("button", { name: /offensive/i }));
    // The Tera toggle button (not the legend text) should be absent in offensive mode
    expect(screen.queryByRole("button", { name: /tera/i })).not.toBeInTheDocument();
  });
});

describe("HeatmapPanel — weak/resist counts", () => {
  it("shows non-zero weak counts when a pokemon has weaknesses (mult >= 2)", () => {
    // Make all types deal 2x to make the weak count predictable
    (mockEffectiveDefensiveMult as jest.Mock).mockReturnValue(2);
    const team = makeTeamPokemon([GARCHOMP]);
    render(<HeatmapPanel team={team} format={undefined} />);

    // TOTAL row weakCount for that mon should be 18 (all 18 types at 2x)
    expect(screen.getByText("TOTAL")).toBeInTheDocument();
    // At least one "w" count that's non-zero (destructive color)
    const wTokens = screen.getAllByText(/\d+w/);
    expect(wTokens.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// getTeamDefensiveSummary — pure helper
// =============================================================================

describe("getTeamDefensiveSummary", () => {
  beforeEach(() => {
    (mockEffectiveDefensiveMult as jest.Mock).mockReturnValue(1);
  });

  it("returns zeros for an empty team", () => {
    const result = getTeamDefensiveSummary([]);
    expect(result).toEqual({ weakCount: 0, coveredCount: 0 });
  });

  it("counts weak types (any team member takes ≥2x)", () => {
    (mockEffectiveDefensiveMult as jest.Mock).mockReturnValue(2);
    const team = makeTeamPokemon([GARCHOMP]);
    const result = getTeamDefensiveSummary(team);
    // All 18 types at 2x → weakCount = 18
    expect(result.weakCount).toBe(18);
    expect(result.coveredCount).toBe(0);
  });

  it("counts covered types (resist or immune, no weakness)", () => {
    (mockEffectiveDefensiveMult as jest.Mock).mockReturnValue(0.5);
    const team = makeTeamPokemon([GARCHOMP]);
    const result = getTeamDefensiveSummary(team);
    expect(result.coveredCount).toBe(18);
    expect(result.weakCount).toBe(0);
  });

  it("immune (0x) counts as covered", () => {
    (mockEffectiveDefensiveMult as jest.Mock).mockReturnValue(0);
    const team = makeTeamPokemon([INCINEROAR]);
    const result = getTeamDefensiveSummary(team);
    expect(result.coveredCount).toBe(18);
    expect(result.weakCount).toBe(0);
  });

  it("neutral (1x) is neither weak nor covered", () => {
    (mockEffectiveDefensiveMult as jest.Mock).mockReturnValue(1);
    const team = makeTeamPokemon([TOGEKISS]);
    const result = getTeamDefensiveSummary(team);
    expect(result.weakCount).toBe(0);
    expect(result.coveredCount).toBe(0);
  });

  it("weak overrides resist — if any member is weak, type is weak not covered", () => {
    // First call returns 2 (weak), second returns 0.5 (resist)
    (mockEffectiveDefensiveMult as jest.Mock)
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(0.5);
    const team = makeTeamPokemon([GARCHOMP, INCINEROAR]);
    const result = getTeamDefensiveSummary(team);
    // Only checking that weakCount picks up the 2x call
    expect(result.weakCount).toBeGreaterThan(0);
  });

  it("ignores null pokemon entries", () => {
    const teamWithNull: TeamWithPokemon["team_pokemon"] = [
      { id: 1, pokemon_id: 1, team_position: 1, pokemon: null },
    ];
    const result = getTeamDefensiveSummary(teamWithNull);
    expect(result).toEqual({ weakCount: 0, coveredCount: 0 });
  });
});
