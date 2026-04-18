import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// =============================================================================
// Module-level mocks
// =============================================================================
//
// `@smogon/calc` does real Pokemon math against bundled data not available in
// jsdom; we stub it so the component contract (panel renders, accordion opens,
// click switches active move, etc.) can be exercised independently.

// Per-move mock damage map: `${moveName}` → [min%, max%]
const moveDamageMap = new Map<string, [number, number]>([
  ["Flamethrower", [40, 60]],
  ["Air Slash", [25, 35]],
]);

const mockRange = jest.fn(() => [80, 120]);
const mockMaxHP = jest.fn(() => 200);
const mockDesc = jest.fn(() => "stub desc");

let activeMoveName = "Flamethrower";

const mockCalculate = jest.fn(() => {
  const range = moveDamageMap.get(activeMoveName) ?? [40, 60];
  // Convert [min%, max%] back to absolute damage against 200 maxHP for the
  // range() / damage[] shape downstream code expects.
  const min = Math.round((range[0] / 100) * 200);
  const max = Math.round((range[1] / 100) * 200);
  mockRange.mockReturnValue([min, max]);
  return {
    range: mockRange,
    desc: mockDesc,
    damage: [min, max],
  };
});

jest.mock("@smogon/calc", () => {
  const MockPokemon = jest.fn(function (
    this: Record<string, unknown>,
    _gen: unknown,
    species: string
  ) {
    this.name = species;
    this.maxHP = mockMaxHP;
  });
  const MockMove = jest.fn(function (
    this: Record<string, unknown>,
    _gen: unknown,
    name: string
  ) {
    this.name = name;
    activeMoveName = name;
  });
  const MockSide = jest.fn(function (this: Record<string, unknown>) {});
  const MockField = jest.fn(function (this: Record<string, unknown>) {});

  return {
    calculate: mockCalculate,
    Pokemon: MockPokemon,
    Move: MockMove,
    Side: MockSide,
    Field: MockField,
    Generations: {
      get: jest.fn(() => ({
        species: { get: jest.fn(() => ({ types: ["Fire"] })) },
      })),
    },
  };
});

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass", "Normal"],
  getMoveData: jest.fn((name: string) => ({
    name,
    type: name === "Flamethrower" ? "Fire" : "Flying",
    category: "Special",
    basePower: 90,
    accuracy: 100,
    shortDesc: "stub",
  })),
  getTypeColor: jest.fn(() => "#ff0000"),
  getValidAbilities: jest.fn(() => ["Blaze", "Solar Power"]),
  getValidNatures: jest.fn(() => ["Hardy", "Timid", "Adamant", "Careful"]),
  getAllItems: jest.fn(() => ["Sitrus Berry", "Leftovers", "Life Orb"]),
  getLegalAbilities: jest.fn(() => undefined),
  getLegalItems: jest.fn(() => undefined),
  getLegalTeraTypes: jest.fn(() => undefined),
  formatHasTera: jest.fn(
    (format: { generation?: number } | null | undefined) => {
      if (!format) return false;
      return format.generation === 9;
    }
  ),
  getMetaSpeedTiers: jest.fn(() => [
    {
      species: "incineroar",
      displayName: "Incineroar",
      base: 60,
      fastSpread: 110,
      slowSpread: 80,
    },
    {
      species: "amoonguss",
      displayName: "Amoonguss",
      base: 30,
      fastSpread: 50,
      slowSpread: 31,
    },
  ]),
}));

import { CalcPanel } from "../calc-panel";
import { type TeamWithPokemon, type Tables } from "@trainers/supabase";

// =============================================================================
// Factories
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
    move1: "Flamethrower",
    move2: "Air Slash",
    move3: null,
    move4: null,
    tera_type: "Fire",
    ev_hp: 4,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 252,
    ev_special_defense: 0,
    ev_speed: 252,
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

function makeTeam(pokemon: Tables<"pokemon">[] = []): TeamWithPokemon {
  return {
    id: 1,
    alt_id: 10,
    name: "Test Team",
    format: "gen9vgc2026regi",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    is_public: false,
    description: null,
    fork_source_id: null,
    team_pokemon: pokemon.map((p, i) => ({
      id: i + 1,
      pokemon_id: p.id,
      team_position: i,
      pokemon: p,
    })),
  } as TeamWithPokemon;
}

const defaultFormat = {
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

// =============================================================================
// Tests
// =============================================================================

describe("CalcPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeMoveName = "Flamethrower";
    mockMaxHP.mockReturnValue(200);
    mockDesc.mockReturnValue("stub");
  });

  it("renders empty state when no Pokemon is selected", () => {
    render(
      <CalcPanel
        team={makeTeam()}
        selectedPokemon={null}
        format={defaultFormat}
      />
    );
    expect(screen.getByTestId("calc-panel-empty")).toBeInTheDocument();
    expect(
      screen.getByText("Select a Pokémon to calculate damage.")
    ).toBeInTheDocument();
  });

  it("renders the pinned result with the active move's % range", () => {
    const charizard = makePokemon();
    render(
      <CalcPanel
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    // Default active move is index 0 (Flamethrower), which the mock returns 40-60% for.
    expect(screen.getByTestId("calc-result-range")).toHaveTextContent("40–60%");
    expect(screen.getByTestId("calc-result-move")).toHaveTextContent(
      "Flamethrower"
    );
  });

  it("renders only filled move slots in the move list", () => {
    const charizard = makePokemon({ move3: null, move4: null });
    render(
      <CalcPanel
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );
    expect(
      screen.getByTestId("calc-move-row-Flamethrower")
    ).toBeInTheDocument();
    expect(screen.getByTestId("calc-move-row-Air Slash")).toBeInTheDocument();
  });

  it("switching the active move in the Move section updates the pinned result", async () => {
    const user = userEvent.setup();
    const charizard = makePokemon();
    render(
      <CalcPanel
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    // Click Air Slash row → range updates to 25-35%
    await user.click(screen.getByTestId("calc-move-row-Air Slash"));

    expect(screen.getByTestId("calc-result-range")).toHaveTextContent("25–35%");
    expect(screen.getByTestId("calc-result-move")).toHaveTextContent(
      "Air Slash"
    );
  });

  it("selecting a different defender from the picker updates the pinned result", async () => {
    const user = userEvent.setup();
    const charizard = makePokemon();
    render(
      <CalcPanel
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    // Default defender = "Incineroar"
    expect(screen.getByTestId("calc-result-defender")).toHaveTextContent(
      "Incineroar"
    );

    // Pick "Amoonguss" from the dropdown
    const target = screen.getByTestId("calc-defender-target");
    await user.selectOptions(target, "Amoonguss");

    expect(screen.getByTestId("calc-result-defender")).toHaveTextContent(
      "Amoonguss"
    );
  });

  it("resets state when selectedPokemon changes (key-based remount)", () => {
    const charizard = makePokemon();
    const { rerender } = render(
      <CalcPanel
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    // Defender starts as Incineroar
    expect(screen.getByTestId("calc-result-defender")).toHaveTextContent(
      "Incineroar"
    );

    // Swap in a different Pokemon (different id) — this re-keys CalcPanelInner
    // and the calc state resets to defaults
    const blastoise = makePokemon({
      id: 999,
      species: "Blastoise",
      move1: "Flamethrower",
      move2: null,
    });
    rerender(
      <CalcPanel
        team={makeTeam([blastoise])}
        selectedPokemon={blastoise}
        format={defaultFormat}
      />
    );

    // After remount, defender is back to its initial value
    expect(screen.getByTestId("calc-result-defender")).toHaveTextContent(
      "Incineroar"
    );
  });

  it("renders all five accordion section triggers", () => {
    const charizard = makePokemon();
    render(
      <CalcPanel
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    expect(screen.getByRole("button", { name: /^Move$/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Attacker · Charizard$/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Defender · Incineroar$/ })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Field$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Sides$/ })).toBeInTheDocument();
  });

  it("opens the Field accordion when its trigger is clicked", async () => {
    const user = userEvent.setup();
    const charizard = makePokemon();
    render(
      <CalcPanel
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    // Field starts closed → its inner pills aren't yet visible
    const fieldTrigger = screen.getByRole("button", { name: /^Field$/ });
    expect(fieldTrigger).toHaveAttribute("aria-expanded", "false");

    await user.click(fieldTrigger);
    expect(fieldTrigger).toHaveAttribute("aria-expanded", "true");
  });
});
