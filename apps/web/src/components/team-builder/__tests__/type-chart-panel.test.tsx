import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  // Offensive coverage mocks
  getMoveType: jest.fn((moveName: string) => {
    const map: Record<string, string> = {
      Flamethrower: "Fire",
      Surf: "Water",
      Tackle: "Normal",
      WillOWisp: "Fire", // status move — should be filtered by category check
    };
    return map[moveName] ?? null;
  }),

  getMoveCategory: jest.fn((moveName: string) => {
    const map: Record<string, string> = {
      Flamethrower: "Special",
      Surf: "Special",
      Tackle: "Physical",
      WillOWisp: "Status",
    };
    return map[moveName] ?? null;
  }),

  getTypeEffectiveness: jest.fn(
    (attackType: string, defenderTypes: string[]) => {
      // Simplified type chart for tests
      const chart: Record<string, Record<string, number>> = {
        Fire: {
          Grass: 2,
          Water: 0.5,
          Fire: 0.5,
          Rock: 0.5,
          Normal: 1,
        },
        Water: {
          Fire: 2,
          Water: 0.5,
          Grass: 0.5,
          Normal: 1,
        },
        Normal: {
          Normal: 1,
          Ghost: 0,
          Rock: 0.5,
        },
      };
      const defending = defenderTypes[0] ?? "Normal";
      return chart[attackType]?.[defending] ?? 1;
    }
  ),
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

  it("renders the panel header and footer legend when team has mons (defensive default)", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);
    expect(screen.getByText("Defensive coverage")).toBeInTheDocument();
    expect(
      screen.getByText("↓ weak · ↑ resist · = neutral")
    ).toBeInTheDocument();
  });

  it("renders the Defensive / Offensive toggle buttons", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);
    expect(screen.getByTestId("mode-defensive")).toBeInTheDocument();
    expect(screen.getByTestId("mode-offensive")).toBeInTheDocument();
    // Defensive is pressed by default
    expect(screen.getByTestId("mode-defensive")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByTestId("mode-offensive")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
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

  it("renders 1/2 token for 0.5× multiplier and 1/4 for 0.25×", () => {
    const charizard = makePokemon({ id: 1, species: "Charizard" });
    render(<TypeChartPanel team={[charizard]} />);
    // Charizard resists Steel at ×0.5 → "1/2"
    expect(screen.getByTestId(`mult-Steel-${charizard.id}`)).toHaveTextContent(
      "1/2"
    );
    // Charizard resists Fire at ×0.25 → "1/4"
    expect(screen.getByTestId(`mult-Fire-${charizard.id}`)).toHaveTextContent(
      "1/4"
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

  it("highlights 4× weakness rows with a stable data-highlight attribute", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);

    // Rock is a 4× weakness for Charizard — row carries data-highlight="4x".
    const rockRow = screen.getByTestId("type-row-Rock");
    expect(rockRow).toHaveAttribute("data-highlight", "4x");

    // Dark is neutral vs Charizard — no highlight attribute.
    const darkRow = screen.getByTestId("type-row-Dark");
    expect(darkRow).not.toHaveAttribute("data-highlight");
  });

  // ---------------------------------------------------------------------------
  // Summary counts
  // ---------------------------------------------------------------------------

  it("renders the correct weak count for Charizard (Rock: 1 weak)", () => {
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);
    expect(screen.getByTestId("weak-Rock")).toHaveTextContent(/^1$/);
  });

  it("counts add up to team size for every row", () => {
    const team = [
      makePokemon({ id: 1, species: "Charizard" }),
      makePokemon({ id: 2, species: "Magikarp" }),
      makePokemon({ id: 3, species: "Gengar" }),
    ];
    render(<TypeChartPanel team={team} />);

    for (const type of MOCK_TYPES) {
      const parseCount = (el: HTMLElement): number => {
        const n = Number(el.textContent?.trim());
        expect(Number.isFinite(n)).toBe(true); // guard against "—" placeholders
        return n;
      };
      const weak = parseCount(screen.getByTestId(`weak-${type}`));
      const resist = parseCount(screen.getByTestId(`resist-${type}`));
      const neutral = parseCount(screen.getByTestId(`neutral-${type}`));
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

// =============================================================================
// Offensive coverage
// =============================================================================

describe("TypeChartPanel — offensive mode", () => {
  it("switches to Offensive mode when the toggle is clicked", async () => {
    const user = userEvent.setup();
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);

    // Default is Defensive
    expect(screen.getByText("Defensive coverage")).toBeInTheDocument();

    await user.click(screen.getByTestId("mode-offensive"));

    expect(screen.getByText("Offensive coverage")).toBeInTheDocument();
    expect(screen.getByTestId("mode-offensive")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByTestId("mode-defensive")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("switches back to Defensive when Defensive button is clicked", async () => {
    const user = userEvent.setup();
    const team = [makePokemon({ id: 1, species: "Charizard" })];
    render(<TypeChartPanel team={team} />);

    await user.click(screen.getByTestId("mode-offensive"));
    await user.click(screen.getByTestId("mode-defensive"));

    expect(screen.getByText("Defensive coverage")).toBeInTheDocument();
  });

  it("shows — for a mon with no damaging moves in offensive mode", async () => {
    const user = userEvent.setup();
    // Charizard with no moves set
    const mon = makePokemon({
      id: 1,
      species: "Charizard",
      move1: null,
      move2: null,
      move3: null,
      move4: null,
    });
    render(<TypeChartPanel team={[mon]} />);
    await user.click(screen.getByTestId("mode-offensive"));

    // All cells for this mon should show the em dash
    for (const type of MOCK_TYPES) {
      const cell = screen.getByTestId(`mult-${type}-1`);
      expect(cell).toHaveTextContent("—");
    }
  });

  it("shows — for a mon with only a Status move in offensive mode", async () => {
    const user = userEvent.setup();
    // WillOWisp is mocked as a Status category move
    const mon = makePokemon({
      id: 1,
      species: "Charizard",
      move1: "WillOWisp",
      move2: null,
      move3: null,
      move4: null,
    });
    render(<TypeChartPanel team={[mon]} />);
    await user.click(screen.getByTestId("mode-offensive"));

    for (const type of MOCK_TYPES) {
      const cell = screen.getByTestId(`mult-${type}-1`);
      expect(cell).toHaveTextContent("—");
    }
  });

  it("shows x2 in green for a Fire move vs a Grass-type defender", async () => {
    const user = userEvent.setup();
    // Flamethrower is mocked as Fire type, Special category.
    // getTypeEffectiveness("Fire", ["Grass"]) → 2 per our mock.
    const mon = makePokemon({
      id: 1,
      species: "Charizard",
      move1: "Flamethrower",
      move2: null,
      move3: null,
      move4: null,
    });
    render(<TypeChartPanel team={[mon]} />);
    await user.click(screen.getByTestId("mode-offensive"));

    const cell = screen.getByTestId("mult-Grass-1");
    expect(cell).toHaveTextContent("x2");
    // In offensive mode x2 is good → emerald (green) text
    expect(cell.className).toMatch(/emerald/);
  });

  it("shows 1/2 in red for a Water move vs a Water-type defender", async () => {
    const user = userEvent.setup();
    // Surf is mocked as Water type, Special category.
    // getTypeEffectiveness("Water", ["Water"]) → 0.5 per our mock.
    const mon = makePokemon({
      id: 1,
      species: "Magikarp",
      move1: "Surf",
      move2: null,
      move3: null,
      move4: null,
    });
    render(<TypeChartPanel team={[mon]} />);
    await user.click(screen.getByTestId("mode-offensive"));

    const cell = screen.getByTestId("mult-Water-1");
    expect(cell).toHaveTextContent("1/2");
    // In offensive mode 0.5 is bad (resisted) → destructive (red) text
    expect(cell.className).toMatch(/destructive/);
  });

  it("offensive footer legend is correct in offensive mode", async () => {
    const user = userEvent.setup();
    const team = [
      makePokemon({ id: 1, species: "Charizard", move1: "Flamethrower" }),
    ];
    render(<TypeChartPanel team={team} />);
    await user.click(screen.getByTestId("mode-offensive"));

    expect(
      screen.getByText("↑ super effective · ↓ resisted · = neutral")
    ).toBeInTheDocument();
  });

  it("summary positiveCount increments when mon has a SE move in offensive mode", async () => {
    const user = userEvent.setup();
    // Two mons: one with Flamethrower (Fire), one with no moves.
    // Fire vs Grass = x2 → positiveCount for Grass row should be 1.
    const team = [
      makePokemon({ id: 1, species: "Charizard", move1: "Flamethrower" }),
      makePokemon({ id: 2, species: "Magikarp", move1: null }),
    ];
    render(<TypeChartPanel team={team} />);
    await user.click(screen.getByTestId("mode-offensive"));

    // weak- testid holds positiveCount in both modes
    expect(screen.getByTestId("weak-Grass")).toHaveTextContent("1");
  });
});
