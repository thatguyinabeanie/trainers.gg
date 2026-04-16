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

jest.mock("@trainers/pokemon/sprites", () => ({
  // The chart uses Showdown type icons — mock to a stable URL so tests can
  // assert the icon source without hitting the network.
  getShowdownTypeIconUrl: jest.fn(
    (type: string) => `https://example.test/types/${type}.png`
  ),
  getPokemonSprite: jest.fn(() => ({
    url: "https://example.test/sprite.png",
    w: 96,
    h: 96,
    pixelated: false,
  })),
}));

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
    expect(
      screen.getByText("↓ weak · ↑ resist · = neutral")
    ).toBeInTheDocument();
  });

  it("for an empty team, every count cell is 0", () => {
    render(<TypeChartPanel team={[]} />);
    for (const type of MOCK_TYPES) {
      expect(screen.getByTestId(`weak-${type}`)).toHaveTextContent("0");
      expect(screen.getByTestId(`resist-${type}`)).toHaveTextContent("0");
      expect(screen.getByTestId(`neutral-${type}`)).toHaveTextContent("0");
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

  it("shows x4 in the multiplier cell for Charizard's 4× Rock weakness", () => {
    const charizard = makePokemon({ id: 1, species: "Charizard" });
    render(<TypeChartPanel team={[charizard]} />);

    // The multiplier cell for this team member on the Rock row shows x4
    const mult = screen.getByTestId(`mult-Rock-${charizard.id}`);
    expect(mult).toHaveTextContent("x4");
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

  it("renders the correct weak count for Charizard (Rock: 1 weak)", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);
    expect(screen.getByTestId("weak-Rock")).toHaveTextContent("1");
  });

  it("renders ½ token for 0.5× multiplier and ¼ for 0.25×", () => {
    const charizard = makePokemon({ id: 1, species: "Charizard" });
    render(<TypeChartPanel team={[charizard]} />);

    // Charizard resists Steel at ×0.5 → "½"
    expect(screen.getByTestId(`mult-Steel-${charizard.id}`)).toHaveTextContent(
      "½"
    );
    // Charizard resists Fire at ×0.25 → "¼"
    expect(screen.getByTestId(`mult-Fire-${charizard.id}`)).toHaveTextContent(
      "¼"
    );
  });

  it("renders 0 immunity token for Ground vs Charizard", () => {
    const charizard = makePokemon({ id: 1, species: "Charizard" });
    render(<TypeChartPanel team={[charizard]} />);

    expect(screen.getByTestId(`mult-Ground-${charizard.id}`)).toHaveTextContent(
      "0"
    );
  });

  it("renders 6 mon column header slots — empty slots show placeholder circles", () => {
    // One pokemon means 5 empty header slots
    const charizard = makePokemon({ id: 1, species: "Charizard" });
    render(<TypeChartPanel team={[charizard]} />);

    // All 6 col header slots should exist (indices 0–5)
    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`type-chart-mon-col-${i}`)).toBeInTheDocument();
    }
  });

  it("renders a Showdown type icon (with full type name as alt) per row", () => {
    render(<TypeChartPanel team={[]} />);

    // The narrow label column uses the Showdown type icon instead of a
    // 3-letter abbreviation. The full type name surfaces via:
    //   - the `<img alt>` attribute (screen readers)
    //   - the wrapper's `aria-label` (focus + tooltip trigger)
    const fireRow = screen.getByTestId("type-row-Fire");
    const icon = within(fireRow).getByRole("img", { name: "Fire" });
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("src", "https://example.test/types/Fire.png");

    // Tooltip trigger wrapper exposes the type name to assistive tech.
    expect(
      within(fireRow).getByLabelText("Fire", { selector: "span" })
    ).toBeInTheDocument();
  });

  it("Snorlax: Ghost immunity renders as 0 token and Fighting weakness renders as x2", () => {
    const snorlax = makePokemon({ id: 1, species: "Snorlax" });
    render(<TypeChartPanel team={[snorlax]} />);

    expect(screen.getByTestId(`mult-Ghost-${snorlax.id}`)).toHaveTextContent(
      "0"
    );
    expect(screen.getByTestId(`mult-Fighting-${snorlax.id}`)).toHaveTextContent(
      "x2"
    );
  });

  it("renders correct weak/resist counts for a multi-member team", () => {
    const team = [
      makePokemon({ id: 1, species: "Magikarp" }),
      makePokemon({ id: 2, species: "Gengar" }),
    ];
    render(<TypeChartPanel team={team} />);

    // Both Magikarp and Gengar are weak to Electric and Grass
    expect(screen.getByTestId("weak-Electric")).toHaveTextContent("1"); // only Magikarp
    expect(screen.getByTestId("weak-Ghost")).toHaveTextContent("1"); // only Gengar
    // Gengar is immune to Normal — resist count includes 0 mult
    expect(screen.getByTestId("resist-Normal")).toHaveTextContent("1");
  });
});
