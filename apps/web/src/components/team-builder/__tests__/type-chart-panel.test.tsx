import { describe, it, expect } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import React from "react";

// =============================================================================
// Module-level mocks — keep ALL_TYPES at full 18 so the panel renders 18 rows.
// =============================================================================

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
  // ---------------------------------------------------------------------------
  // Structure
  // ---------------------------------------------------------------------------

  it("renders one row per type (18 rows)", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);
    for (const type of MOCK_TYPES) {
      expect(screen.getByTestId(`type-row-${type}`)).toBeInTheDocument();
    }
  });

  it("renders the panel header and footer legend when team has mons", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);
    expect(screen.getByText("Defensive coverage")).toBeInTheDocument();
    expect(
      screen.getByText("↓ weak · ↑ resist · = neutral")
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  it("shows empty-state message and no type rows when team is empty", () => {
    render(<TypeChartPanel team={[]} />);
    expect(
      screen.getByText(/Add Pokémon to your team to see the type chart/i)
    ).toBeInTheDocument();
    // No type rows should render
    for (const type of MOCK_TYPES) {
      expect(screen.queryByTestId(`type-row-${type}`)).not.toBeInTheDocument();
    }
  });

  // ---------------------------------------------------------------------------
  // Sprite column count = team size
  // ---------------------------------------------------------------------------

  it("renders exactly 3 mon header columns for a 3-mon team", () => {
    const team = [
      makePokemon({ id: 1, species: "Charizard" }),
      makePokemon({ id: 2, species: "Magikarp" }),
      makePokemon({ id: 3, species: "Gengar" }),
    ];
    render(<TypeChartPanel team={team} />);

    // Columns 0, 1, 2 must exist
    for (let i = 0; i < 3; i++) {
      expect(screen.getByTestId(`type-chart-mon-col-${i}`)).toBeInTheDocument();
    }
    // Column 3 must NOT exist — no placeholder circles
    expect(
      screen.queryByTestId("type-chart-mon-col-3")
    ).not.toBeInTheDocument();
  });

  it("renders exactly 6 mon header columns for a full 6-mon team", () => {
    const team = [
      makePokemon({ id: 1, species: "Charizard" }),
      makePokemon({ id: 2, species: "Magikarp" }),
      makePokemon({ id: 3, species: "Gengar" }),
      makePokemon({ id: 4, species: "Snorlax" }),
      makePokemon({ id: 5, species: "Charizard" }),
      makePokemon({ id: 6, species: "Magikarp" }),
    ];
    render(<TypeChartPanel team={team} />);
    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`type-chart-mon-col-${i}`)).toBeInTheDocument();
    }
    // No 7th column
    expect(
      screen.queryByTestId("type-chart-mon-col-6")
    ).not.toBeInTheDocument();
  });

  it("renders exactly 1 mon header column for a 1-mon team", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);
    expect(screen.getByTestId("type-chart-mon-col-0")).toBeInTheDocument();
    expect(
      screen.queryByTestId("type-chart-mon-col-1")
    ).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Per-cell multipliers
  // ---------------------------------------------------------------------------

  it("shows x4 in the multiplier cell for Charizard's 4× Rock weakness", () => {
    const charizard = makePokemon({ id: 1, species: "Charizard" });
    render(<TypeChartPanel team={[charizard]} />);
    const mult = screen.getByTestId(`mult-Rock-${charizard.id}`);
    expect(mult).toHaveTextContent("x4");
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

  it("Rock row has 3 multiplier cells for a 3-mon team", () => {
    const team = [
      makePokemon({ id: 1, species: "Charizard" }),
      makePokemon({ id: 2, species: "Magikarp" }),
      makePokemon({ id: 3, species: "Gengar" }),
    ];
    render(<TypeChartPanel team={team} />);
    // Charizard x4, Magikarp x1 (no entry → default 1), Gengar x1
    expect(screen.getByTestId("mult-Rock-1")).toHaveTextContent("x4");
    expect(screen.getByTestId("mult-Rock-2")).toHaveTextContent("x1");
    expect(screen.getByTestId("mult-Rock-3")).toHaveTextContent("x1");
  });

  // ---------------------------------------------------------------------------
  // Row highlighting
  // ---------------------------------------------------------------------------

  it("highlights 4× weakness rows with bg-destructive/5", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);

    const rockRow = screen.getByTestId("type-row-Rock");
    expect(rockRow.className).toContain("bg-destructive/5");

    // A neutral row (Dark vs Charizard) should NOT have the highlight
    const darkRow = screen.getByTestId("type-row-Dark");
    expect(darkRow.className).not.toContain("bg-destructive/5");
  });

  // ---------------------------------------------------------------------------
  // Summary counts
  // ---------------------------------------------------------------------------

  it("renders the correct weak count for Charizard (Rock: 1 weak)", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);
    expect(screen.getByTestId("weak-Rock")).toHaveTextContent("1");
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

  it("renders correct weak/resist counts for a multi-member team", () => {
    const team = [
      makePokemon({ id: 1, species: "Magikarp" }),
      makePokemon({ id: 2, species: "Gengar" }),
    ];
    render(<TypeChartPanel team={team} />);

    // Only Magikarp is weak to Electric (Gengar is neutral)
    expect(screen.getByTestId("weak-Electric")).toHaveTextContent("1");
    // Only Gengar is weak to Ghost
    expect(screen.getByTestId("weak-Ghost")).toHaveTextContent("1");
    // Gengar is immune to Normal — resist count includes 0 mult
    expect(screen.getByTestId("resist-Normal")).toHaveTextContent("1");
  });

  // ---------------------------------------------------------------------------
  // Type icons
  // ---------------------------------------------------------------------------

  it("renders a round type symbol icon (role=img, aria-label = type name) per row", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);

    // Each row's label column uses TypeSymbolIcon — a <span role="img"> with
    // aria-label equal to the type name. No text or src attribute is required
    // (it's a lucide-react glyph, not an <img> tag).
    const fireRow = screen.getByTestId("type-row-Fire");
    const icon = within(fireRow).getByRole("img", { name: "Fire" });
    expect(icon).toBeInTheDocument();
    // data-type attribute helps with visual debugging / CSS selection
    expect(icon).toHaveAttribute("data-type", "Fire");
  });

  // ---------------------------------------------------------------------------
  // Sprite tooltip
  // ---------------------------------------------------------------------------

  it("mon header icon uses species name as aria-label (tooltip trigger)", () => {
    const charizard = makePokemon({ id: 1, species: "Charizard" });
    render(<TypeChartPanel team={[charizard]} />);

    // The MonHeaderIcon renders a span with aria-label = species name
    const headerSpan = screen.getByTestId("mon-header-1");
    expect(headerSpan).toHaveAttribute("aria-label", "Charizard");
  });

  it("mon header uses nickname in aria-label when set", () => {
    const char = makePokemon({
      id: 1,
      species: "Charizard",
      nickname: "Blaze",
    });
    render(<TypeChartPanel team={[char]} />);
    expect(screen.getByTestId("mon-header-1")).toHaveAttribute(
      "aria-label",
      "Blaze (Charizard)"
    );
  });
});
