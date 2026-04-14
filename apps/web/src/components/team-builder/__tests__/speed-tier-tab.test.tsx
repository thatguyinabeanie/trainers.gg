import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks — must precede the import under test
// =============================================================================

/** Build a mock benchmark entry in the shape the SpeedTable expects. */
function makeBenchmark(
  species: string,
  baseSpeed: number,
  neutral252: number,
  positive252: number
) {
  return {
    species,
    baseSpeed,
    minSpeed: Math.floor(neutral252 * 0.67),
    commonSpeeds: {
      neutral252,
      positive252,
      tailwind: Math.floor(positive252 * 2),
      scarf: Math.floor(positive252 * 1.5),
    },
  };
}

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
  calculateStat: jest.fn(() => 177),
  getFormatSpeedBenchmarks: jest.fn(() => [
    makeBenchmark("Flutter Mane", 135, 210, 231),
    makeBenchmark("Urshifu", 97, 152, 167),
    makeBenchmark("Incineroar", 60, 102, 112),
    makeBenchmark("Amoonguss", 30, 47, 52),
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
// Tests — Speed table (team overview)
// =============================================================================

describe("SpeedTierTab — data table", () => {
  it("renders without crashing with an empty team", () => {
    expect(() =>
      render(
        <SpeedTierTab
          team={makeTeam([])}
          selectedPokemon={null}
          format={TEST_FORMAT}
        />
      )
    ).not.toThrow();
  });

  it("renders benchmark species in the table", () => {
    const team = makeTeam([]);
    render(
      <SpeedTierTab team={team} selectedPokemon={null} format={TEST_FORMAT} />
    );
    expect(screen.getByText("Flutter Mane")).toBeInTheDocument();
    expect(screen.getByText("Incineroar")).toBeInTheDocument();
  });

  it("renders team member with star prefix", () => {
    const poke = makePokemon({ id: 1, species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);
    render(
      <SpeedTierTab team={team} selectedPokemon={null} format={TEST_FORMAT} />
    );
    expect(screen.getByText("★ Urshifu")).toBeInTheDocument();
  });

  it("renders table column headers", () => {
    render(
      <SpeedTierTab
        team={makeTeam([])}
        selectedPokemon={null}
        format={TEST_FORMAT}
      />
    );
    expect(screen.getByText("Pokemon")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Tailwind")).toBeInTheDocument();
    expect(screen.getByText("Scarf")).toBeInTheDocument();
  });

  it("renders group-header dividers for speed categories", () => {
    render(
      <SpeedTierTab
        team={makeTeam([])}
        selectedPokemon={null}
        format={TEST_FORMAT}
      />
    );
    // Benchmarks span Fast (135 base), Mid (97, 60 base), TR (30 base) — all 3 groups present
    expect(screen.getByText("Fast (Base 100+)")).toBeInTheDocument();
    expect(screen.getByText("Mid (Base 60–99)")).toBeInTheDocument();
    expect(screen.getByText("Trick Room (Base <60)")).toBeInTheDocument();
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

    expect(() =>
      render(
        <SpeedTierTab team={team} selectedPokemon={null} format={TEST_FORMAT} />
      )
    ).not.toThrow();
    // Only one ★ Urshifu should appear (null entry is skipped)
    expect(screen.getByText("★ Urshifu")).toBeInTheDocument();
  });

  it("calls getFormatSpeedBenchmarks with format id", () => {
    const { getFormatSpeedBenchmarks } = jest.requireMock(
      "@trainers/pokemon"
    ) as {
      getFormatSpeedBenchmarks: jest.MockedFunction<(id: string) => unknown[]>;
    };
    getFormatSpeedBenchmarks.mockClear();
    render(
      <SpeedTierTab
        team={makeTeam([])}
        selectedPokemon={null}
        format={TEST_FORMAT}
      />
    );
    expect(getFormatSpeedBenchmarks).toHaveBeenCalledWith("gen9vgc2026regi");
  });

  it("uses fallback format id when format is undefined", () => {
    const { getFormatSpeedBenchmarks } = jest.requireMock(
      "@trainers/pokemon"
    ) as {
      getFormatSpeedBenchmarks: jest.MockedFunction<(id: string) => unknown[]>;
    };
    getFormatSpeedBenchmarks.mockClear();
    render(
      <SpeedTierTab
        team={makeTeam([])}
        selectedPokemon={null}
        format={undefined}
      />
    );
    expect(getFormatSpeedBenchmarks).toHaveBeenCalledWith("gen9vgc2026regi");
  });
});

// =============================================================================
// Tests — stat stage modifier toggle
// =============================================================================

describe("SpeedTierTab — stage modifier toggle", () => {
  it("renders the Stage toggle buttons", () => {
    render(
      <SpeedTierTab
        team={makeTeam([])}
        selectedPokemon={null}
        format={TEST_FORMAT}
      />
    );
    expect(screen.getByText("Stage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "—" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+2" })).toBeInTheDocument();
  });

  it("shows speed multiplier note when stage is active", async () => {
    const user = userEvent.setup();
    render(
      <SpeedTierTab
        team={makeTeam([])}
        selectedPokemon={null}
        format={TEST_FORMAT}
      />
    );
    await user.click(screen.getByRole("button", { name: "+1" }));
    expect(screen.getByText(/×1\.5 applied to all speeds/)).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — summary cards (when Pokemon is selected)
// =============================================================================

describe("SpeedTierTab — summary cards (selectedPokemon set)", () => {
  it("renders Current, Tailwind ×2, and Scarf ×1.5 summary cards", () => {
    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);
    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Tailwind ×2")).toBeInTheDocument();
    expect(screen.getByText("Scarf ×1.5")).toBeInTheDocument();
  });

  it("does not render summary cards when no Pokemon is selected", () => {
    const poke = makePokemon({ species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);
    render(
      <SpeedTierTab team={team} selectedPokemon={null} format={TEST_FORMAT} />
    );
    expect(screen.queryByText("Tailwind ×2")).not.toBeInTheDocument();
    expect(screen.queryByText("Scarf ×1.5")).not.toBeInTheDocument();
  });

  it("renders the selected pokemon highlighted in the table with summary cards", () => {
    const poke = makePokemon({ id: 1, species: "Urshifu" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);
    render(
      <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
    );
    // Summary cards visible
    expect(screen.getByText("Current")).toBeInTheDocument();
    // Team member still in table
    expect(screen.getByText("★ Urshifu")).toBeInTheDocument();
  });

  it("returns 0 speed when getBaseStats returns null", () => {
    const { getBaseStats } = jest.requireMock("@trainers/pokemon") as {
      getBaseStats: jest.MockedFunction<(species: string) => null>;
    };
    getBaseStats.mockReturnValueOnce(null);

    const poke = makePokemon({ species: "UnknownMon" });
    const team = makeTeam([makeTeamPokemon(poke, 1)]);

    // Should not crash
    expect(() =>
      render(
        <SpeedTierTab team={team} selectedPokemon={poke} format={TEST_FORMAT} />
      )
    ).not.toThrow();
  });
});
