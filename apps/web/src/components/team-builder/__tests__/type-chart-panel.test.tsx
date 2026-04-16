import { describe, it, expect } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import React from "react";

// =============================================================================
// Module-level mocks — keep ALL_TYPES at full 18 so the panel renders 18 rows.
// =============================================================================

const MOCK_TYPES = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
] as const;

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: MOCK_TYPES,

  getSpeciesTypes: jest.fn((species: string) => {
    const map: Record<string, string[]> = {
      // 4× Rock weakness from Fire/Flying type combo
      Charizard: ["Fire", "Flying"],
      // Pure water — only weak to Electric/Grass
      Magikarp: ["Water"],
      // Ghost — immune to Normal/Fighting
      Gengar: ["Ghost", "Poison"],
      // Pure normal — weak only to Fighting
      Snorlax: ["Normal"],
    };
    return map[species] ?? ["Normal"];
  }),

  getDefensiveMatchups: jest.fn((types: string[]) => {
    // Charizard (Fire/Flying): 4× Rock, 2× Electric/Water, immunities Ground.
    if (types.includes("Fire") && types.includes("Flying")) {
      return {
        immunities: ["Ground"],
        weaknesses: { Rock: 4, Electric: 2, Water: 2 },
        resistances: { Fire: 0.25, Grass: 0.25, Bug: 0.25, Steel: 0.5 },
      };
    }
    // Pure Water
    if (types.length === 1 && types[0] === "Water") {
      return {
        immunities: [],
        weaknesses: { Electric: 2, Grass: 2 },
        resistances: { Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 },
      };
    }
    // Ghost / Poison (Gengar-like)
    if (types.includes("Ghost") && types.includes("Poison")) {
      return {
        immunities: ["Normal", "Fighting"],
        weaknesses: { Ghost: 2, Dark: 2, Psychic: 2, Ground: 2 },
        resistances: { Poison: 0.25, Bug: 0.25, Grass: 0.25, Fairy: 0.5 },
      };
    }
    // Pure Normal
    if (types.length === 1 && types[0] === "Normal") {
      return {
        immunities: ["Ghost"],
        weaknesses: { Fighting: 2 },
        resistances: {},
      };
    }
    return { immunities: [], weaknesses: {}, resistances: {} };
  }),
}));

import { TypeChartPanel } from "../type-chart-panel";
import { type Tables } from "@trainers/supabase";

// =============================================================================
// Factory
// =============================================================================

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Charizard",
    is_shiny: false,
    ability: "Blaze",
    nature: "Timid",
    held_item: null,
    nickname: null,
    gender: null,
    level: 50,
    move1: null,
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
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("TypeChartPanel", () => {
  it("renders one row per type (18 rows)", () => {
    render(<TypeChartPanel team={[]} />);
    for (const type of MOCK_TYPES) {
      expect(screen.getByTestId(`type-row-${type}`)).toBeInTheDocument();
    }
  });

  it("renders the header and footer legend", () => {
    render(<TypeChartPanel team={[]} />);
    expect(screen.getByText("Defensive coverage")).toBeInTheDocument();
    expect(screen.getByText("Full team")).toBeInTheDocument();
    expect(
      screen.getByText("↓ weak · ↑ resist · = neutral")
    ).toBeInTheDocument();
  });

  it("for an empty team, every count cell is 0 and worst is ×1", () => {
    render(<TypeChartPanel team={[]} />);
    for (const type of MOCK_TYPES) {
      expect(screen.getByTestId(`weak-${type}`)).toHaveTextContent("0");
      expect(screen.getByTestId(`resist-${type}`)).toHaveTextContent("0");
      expect(screen.getByTestId(`neutral-${type}`)).toHaveTextContent("0");
      expect(screen.getByTestId(`worst-${type}`)).toHaveTextContent("×1");
    }
  });

  it("counts add up to team size for every row", () => {
    const team = [
      makePokemon({ id: 1, species: "Charizard" }),
      makePokemon({ id: 2, species: "Magikarp" }),
      makePokemon({ id: 3, species: "Gengar" }),
    ];

    render(<TypeChartPanel team={team} />);

    for (const type of MOCK_TYPES) {
      const weak = Number(screen.getByTestId(`weak-${type}`).textContent);
      const resist = Number(screen.getByTestId(`resist-${type}`).textContent);
      const neutral = Number(screen.getByTestId(`neutral-${type}`).textContent);
      expect(weak + resist + neutral).toBe(team.length);
    }
  });

  it("shows ×4 in the Worst column for a team with a 4× Rock weakness", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);

    expect(screen.getByTestId("worst-Rock")).toHaveTextContent("×4");
  });

  it("highlights 4× weakness rows with destructive-soft background", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);

    const rockRow = screen.getByTestId("type-row-Rock");
    expect(rockRow.className).toContain("bg-destructive/5");

    // A neutral row (Dark vs Charizard) should NOT have the highlight
    const darkRow = screen.getByTestId("type-row-Dark");
    expect(darkRow.className).not.toContain("bg-destructive/5");
  });

  it("renders the worst multiplier across the team (not the first member's)", () => {
    // Magikarp alone is only ×2 to Electric. Charizard added → still ×2 (no 4×).
    // But add a Gengar (Ghost/Poison) which takes 2× Psychic, and verify Psychic worst = ×2.
    const team = [
      makePokemon({ id: 1, species: "Magikarp" }),
      makePokemon({ id: 2, species: "Gengar" }),
    ];
    render(<TypeChartPanel team={team} />);

    expect(screen.getByTestId("worst-Electric")).toHaveTextContent("×2");
    expect(screen.getByTestId("worst-Psychic")).toHaveTextContent("×2");
  });

  it("displays special tokens for fractional multipliers", () => {
    const team = [makePokemon({ id: 1, species: "Snorlax" })];
    render(<TypeChartPanel team={team} />);

    // Snorlax is immune to Ghost — worst across the (single) team is 0.
    expect(screen.getByTestId("worst-Ghost")).toHaveTextContent("0");

    // Fighting is the one weakness → ×2.
    expect(screen.getByTestId("worst-Fighting")).toHaveTextContent("×2");
  });

  it("includes the type label inside each row", () => {
    render(<TypeChartPanel team={[]} />);

    const fireRow = screen.getByTestId("type-row-Fire");
    expect(within(fireRow).getByText("Fire")).toBeInTheDocument();
  });
});
