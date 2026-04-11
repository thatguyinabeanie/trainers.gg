import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";

// =============================================================================
// Module-level mocks — must precede the import under test
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getBaseStats: jest.fn(() => ({
    hp: 95,
    attack: 115,
    defense: 90,
    specialAttack: 80,
    specialDefense: 90,
    speed: 130,
  })),
  getNatureMultiplier: jest.fn(() => 1.1),
  calculateStat: jest.fn((base: number) => Math.floor(base * 2 * 1.1) + 5 + 50),
  getFormatSpeedBenchmarks: jest.fn(() => [
    { species: "Flutter Mane", maxSpeed: 231 },
    { species: "Urshifu", maxSpeed: 167 },
    { species: "Incineroar", maxSpeed: 112 },
    { species: "Amoonguss", maxSpeed: 52 },
  ]),
  compareSpeedTier: jest.fn(() => ({
    outspeeds: [
      { species: "Incineroar", maxSpeed: 112 },
      { species: "Amoonguss", maxSpeed: 52 },
    ],
    outspedBy: [{ species: "Flutter Mane", maxSpeed: 231 }],
  })),
}));

import { SpeedTierTab } from "../speed-tier-tab";
import { type TeamWithPokemon, type Tables } from "@trainers/supabase";

// =============================================================================
// Factories
// =============================================================================

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Urshifu",
    is_shiny: false,
    ability: "Unseen Fist",
    nature: "Jolly",
    held_item: null,
    nickname: null,
    gender: null,
    level: 50,
    move1: "Close Combat",
    move2: "Wicked Blow",
    move3: null,
    move4: null,
    tera_type: "Water",
    ev_hp: 0,
    ev_attack: 252,
    ev_defense: 4,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeTeamPokemon(
  pokemon: Tables<"pokemon">,
  position = 1
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id: pokemon.id,
    team_id: 1,
    pokemon_id: pokemon.id,
    team_position: position,
    pokemon,
  } as TeamWithPokemon["team_pokemon"][number];
}

function makeTeam(
  teamPokemon: TeamWithPokemon["team_pokemon"] = []
): TeamWithPokemon {
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
    team_pokemon: teamPokemon,
  } as TeamWithPokemon;
}

const TEST_FORMAT = {
  id: "gen9vgc2026regi",
  label: "SV: Reg I",
  generation: 9,
};

// =============================================================================
// Tests — TeamSpeedOverview (no Pokemon selected)
// =============================================================================

describe("SpeedTierTab — TeamSpeedOverview (selectedPokemon=null)", () => {
  it("renders empty state when team has no pokemon", () => {
    render(
      <SpeedTierTab
        team={makeTeam([])}
        selectedPokemon={null}
        format={TEST_FORMAT}
      />
    );
    expect(
      screen.getByText("Add Pokemon to see speed tiers")
    ).toBeInTheDocument();
  });

  it("renders team member speed when team has pokemon", () => {
    const poke = makePokemon({ species: "Urshifu", ev_speed: 252 });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={null} format={TEST_FORMAT} />
    );

    // Species name appears in the team overview list (may also appear in benchmarks)
    expect(screen.getAllByText("Urshifu").length).toBeGreaterThan(0);
  });

  it("renders benchmark species from getFormatSpeedBenchmarks", () => {
    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={null} format={TEST_FORMAT} />
    );

    // Benchmarks from within the speed window should appear
    expect(screen.getByText("Flutter Mane")).toBeInTheDocument();
  });

  it("renders +Spe indicator next to benchmark entries", () => {
    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={null} format={TEST_FORMAT} />
    );

    const spePills = screen.getAllByText("+Spe");
    expect(spePills.length).toBeGreaterThan(0);
  });

  it("renders EV note for team member with EVs", () => {
    const poke = makePokemon({ ev_speed: 252, nature: "Jolly" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={null} format={TEST_FORMAT} />
    );

    expect(screen.getByText("Jolly, 252 EVs")).toBeInTheDocument();
  });

  it("renders '0 EVs' note when pokemon has no speed EVs", () => {
    const poke = makePokemon({ ev_speed: 0, nature: "Adamant" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={null} format={TEST_FORMAT} />
    );

    expect(screen.getByText("Adamant, 0 EVs")).toBeInTheDocument();
  });

  it("renders speed gap warning when two members have >30 speed difference", () => {
    // calculateStat is mocked to return a fixed value — override for this case
    const { calculateStat } = jest.requireMock("@trainers/pokemon") as {
      calculateStat: jest.MockedFunction<
        (b: number, iv: number, ev: number, lvl: number, mult: number) => number
      >;
    };
    // Return noticeably different speeds for two different calls
    calculateStat
      .mockReturnValueOnce(200) // first pokemon
      .mockReturnValueOnce(100); // second pokemon

    const poke1 = makePokemon({ id: 1, species: "Flutter Mane" });
    const poke2 = makePokemon({ id: 2, species: "Amoonguss" });
    const team = makeTeam([
      makeTeamPokemon(poke1, 1),
      makeTeamPokemon(poke2, 2),
    ]);

    render(
      <SpeedTierTab team={team} selectedPokemon={null} format={TEST_FORMAT} />
    );

    expect(
      screen.getByText(/Flutter Mane and Amoonguss have a 100-point speed gap/)
    ).toBeInTheDocument();
  });

  it("uses fallback format id when format is undefined", () => {
    const { getFormatSpeedBenchmarks } = jest.requireMock(
      "@trainers/pokemon"
    ) as {
      getFormatSpeedBenchmarks: jest.MockedFunction<(id: string) => unknown[]>;
    };

    const poke = makePokemon();
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={null} format={undefined} />
    );

    expect(getFormatSpeedBenchmarks).toHaveBeenCalledWith("gen9vgc2026regi");
  });

  it("renders speed category dividers (Fast / Mid / Trick Room)", () => {
    // Force very different speed values to exercise multiple categories
    const { calculateStat } = jest.requireMock("@trainers/pokemon") as {
      calculateStat: jest.MockedFunction<(...args: unknown[]) => number>;
    };
    // 170 → Fast, 100 → Mid
    calculateStat.mockReturnValueOnce(170).mockReturnValueOnce(100);

    const poke1 = makePokemon({ id: 1, species: "Flutter Mane" });
    const poke2 = makePokemon({ id: 2, species: "Incineroar" });
    const team = makeTeam([
      makeTeamPokemon(poke1, 1),
      makeTeamPokemon(poke2, 2),
    ]);

    render(
      <SpeedTierTab team={team} selectedPokemon={null} format={TEST_FORMAT} />
    );

    // At least one category divider should appear
    const dividers = screen.getAllByText(
      /Fast \(150\+\)|Mid \(80–150\)|Trick Room \(<80\)/
    );
    expect(dividers.length).toBeGreaterThan(0);
  });

  it("filters out team_pokemon entries where pokemon is null", () => {
    const nullEntry = {
      id: 99,
      team_id: 1,
      pokemon_id: null,
      team_position: 2,
      pokemon: null,
    } as unknown as TeamWithPokemon["team_pokemon"][number];

    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1), nullEntry]);

    render(
      <SpeedTierTab team={team} selectedPokemon={null} format={TEST_FORMAT} />
    );

    // Should not crash; species still visible (may appear in benchmarks too)
    expect(screen.getAllByText("Urshifu").length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Tests — PokemonSpeedView (Pokemon selected)
// =============================================================================

describe("SpeedTierTab — PokemonSpeedView (selectedPokemon set)", () => {
  it("renders Base, Tailwind, and Scarf speed cards", () => {
    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );

    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Tailwind")).toBeInTheDocument();
    expect(screen.getByText("Scarf")).toBeInTheDocument();
  });

  it("renders 'You outspeed' section header", () => {
    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );

    expect(screen.getByText("You outspeed")).toBeInTheDocument();
  });

  it("renders outsped-by section header", () => {
    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );

    expect(screen.getByText("You're outsped by")).toBeInTheDocument();
  });

  it("lists species that the pokemon outspeeds", () => {
    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );

    expect(screen.getByText("Incineroar")).toBeInTheDocument();
    expect(screen.getByText("Amoonguss")).toBeInTheDocument();
  });

  it("lists species that outspeed the pokemon", () => {
    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );

    expect(screen.getByText("Flutter Mane")).toBeInTheDocument();
  });

  it("renders 'Nothing at max speed' when outspeeds is empty", () => {
    const { compareSpeedTier } = jest.requireMock("@trainers/pokemon") as {
      compareSpeedTier: jest.MockedFunction<
        (...args: unknown[]) => { outspeeds: unknown[]; outspedBy: unknown[] }
      >;
    };
    compareSpeedTier.mockReturnValueOnce({ outspeeds: [], outspedBy: [] });

    const poke = makePokemon({ species: "Amoonguss" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );

    expect(screen.getByText("Nothing at max speed")).toBeInTheDocument();
  });

  it("renders 'Nothing outspeeds you at max speed' when outspedBy is empty", () => {
    const { compareSpeedTier } = jest.requireMock("@trainers/pokemon") as {
      compareSpeedTier: jest.MockedFunction<
        (...args: unknown[]) => { outspeeds: unknown[]; outspedBy: unknown[] }
      >;
    };
    compareSpeedTier.mockReturnValueOnce({
      outspeeds: [{ species: "Amoonguss", maxSpeed: 52 }],
      outspedBy: [],
    });

    const poke = makePokemon({ species: "Flutter Mane" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );

    expect(
      screen.getByText("Nothing outspeeds you at max speed")
    ).toBeInTheDocument();
  });

  it("shows positive delta (+N) next to outsped species", () => {
    // calculateStat returns a fixed value; outspeeds mock has maxSpeed: 112
    // delta = actualSpeed - maxSpeed  (both determined by mocks)
    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );

    // There should be at least one delta indicator prefixed with "+"
    const plusDeltas = screen.getAllByText(/^\+\d+$/);
    expect(plusDeltas.length).toBeGreaterThan(0);
  });

  it("shows negative delta (-N) next to faster species", () => {
    // Make the pokemon slow (actualSpeed=80) so Flutter Mane (231) genuinely outspeeds
    const { calculateStat } = jest.requireMock("@trainers/pokemon") as {
      calculateStat: jest.MockedFunction<(...args: unknown[]) => number>;
    };
    calculateStat.mockReturnValue(80);

    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );

    // outspedBy: Flutter Mane maxSpeed 231, actualSpeed=80 → delta = 231 - 80 = 151 → "-151"
    const minusDeltas = screen.getAllByText(/^-\d+$/);
    expect(minusDeltas.length).toBeGreaterThan(0);
  });

  it("shows EV suggestion when adding EVs would outspeed a benchmark", () => {
    // Make calculateStat return a low base speed so that adding EVs bumps over a benchmark
    const { calculateStat, getFormatSpeedBenchmarks } = jest.requireMock(
      "@trainers/pokemon"
    ) as {
      calculateStat: jest.MockedFunction<(...args: unknown[]) => number>;
      getFormatSpeedBenchmarks: jest.MockedFunction<
        (id: string) => { species: string; maxSpeed: number }[]
      >;
    };

    getFormatSpeedBenchmarks.mockReturnValueOnce([
      { species: "Urshifu", maxSpeed: 100 },
    ]);

    // First call: actual speed = 98 (below benchmark)
    // Second call onwards: bumped speed = 104 (above benchmark)
    calculateStat
      .mockReturnValueOnce(98) // actual speed
      .mockReturnValueOnce(104); // +4 EVs step

    const poke = makePokemon({ species: "Incineroar", ev_speed: 0 });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );

    // Suggestion banner should be visible
    expect(screen.getByText(/outspeeds max Urshifu/)).toBeInTheDocument();
  });

  it("uses fallback format id when format is undefined", () => {
    const { compareSpeedTier } = jest.requireMock("@trainers/pokemon") as {
      compareSpeedTier: jest.MockedFunction<
        (species: string, speed: number, formatId: string) => unknown
      >;
    };

    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={undefined} />
    );

    expect(compareSpeedTier).toHaveBeenCalledWith(
      "Urshifu",
      expect.any(Number),
      "gen9vgc2026regi"
    );
  });

  it("returns 0 speed when getBaseStats returns null", () => {
    const { getBaseStats, compareSpeedTier } = jest.requireMock(
      "@trainers/pokemon"
    ) as {
      getBaseStats: jest.MockedFunction<(species: string) => null | object>;
      compareSpeedTier: jest.MockedFunction<
        (...args: unknown[]) => { outspeeds: unknown[]; outspedBy: unknown[] }
      >;
    };
    getBaseStats.mockReturnValueOnce(null);
    // compareSpeedTier will receive speed=0 in this case
    compareSpeedTier.mockReturnValueOnce({ outspeeds: [], outspedBy: [] });

    const poke = makePokemon({ species: "UnknownMon" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    // Should not crash
    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );

    expect(compareSpeedTier).toHaveBeenCalledWith(
      "UnknownMon",
      0,
      expect.any(String)
    );
  });
});
