import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";

// =============================================================================
// Module-level mocks — mock @trainers/pokemon functions
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getSpeciesTypes: jest.fn((species: string) => {
    const types: Record<string, string[]> = {
      Incineroar: ["Fire", "Dark"],
      Rillaboom: ["Grass"],
      Gastrodon: ["Water", "Ground"],
      Flutter_Mane: ["Ghost", "Fairy"],
      Charizard: ["Fire", "Flying"],
      Landorus: ["Ground", "Flying"],
    };
    return types[species] ?? ["Normal"];
  }),

  getDefensiveMatchups: jest.fn((types: string[]) => {
    // Simplified matchup logic for testing
    const immunities: string[] = [];
    const resistances: Record<string, number> = {};
    const weaknesses: Record<string, number> = {};

    if (types.includes("Ghost")) immunities.push("Normal", "Fighting");
    if (types.includes("Ground")) immunities.push("Electric");
    if (types.includes("Fire")) resistances["Ice"] = 0.5;
    if (types.includes("Grass")) resistances["Water"] = 0.5;
    if (types.includes("Water")) weaknesses["Electric"] = 2;
    if (types.includes("Fire")) weaknesses["Water"] = 2;

    return { immunities, resistances, weaknesses };
  }),

  calculateTeamSynergy: jest.fn((team: Array<{ species: string }>) => {
    const sharedWeaknesses: Record<string, number> = {};
    // Simulate: if team has multiple Fire types, they share Water weakness
    const fireCount = team.filter((m) => {
      const types: Record<string, string[]> = {
        Incineroar: ["Fire", "Dark"],
        Charizard: ["Fire", "Flying"],
      };
      return (types[m.species] ?? []).includes("Fire");
    }).length;
    if (fireCount >= 2) sharedWeaknesses["Water"] = fireCount;

    return {
      sharedWeaknesses,
      uncoveredTypes: new Set(team.length === 0 ? ["Dragon", "Steel"] : []),
    };
  }),

  getValidAbilities: jest.fn((species: string) => {
    const abilities: Record<string, string[]> = {
      Incineroar: ["Intimidate", "Blaze"],
      Rillaboom: ["Grassy Surge", "Overgrow"],
      Gastrodon: ["Storm Drain", "Sticky Hold"],
      Flutter_Mane: ["Protosynthesis"],
      Charizard: ["Blaze", "Solar Power"],
      Landorus: ["Intimidate", "Sand Force"],
    };
    return abilities[species] ?? [];
  }),

  getLearnableMoves: jest.fn((species: string) => {
    const moves: Record<string, string[]> = {
      Incineroar: ["Fake Out", "Flare Blitz", "Darkest Lariat"],
      Rillaboom: ["Fake Out", "Drum Beating", "U-turn"],
      Gastrodon: ["Icy Wind", "Earth Power", "Recover"],
      Flutter_Mane: ["Shadow Ball", "Moonblast", "Trick Room"],
      Charizard: ["Heat Wave", "Air Slash"],
      Landorus: ["Earthquake", "Rock Slide"],
    };
    return moves[species] ?? [];
  }),
}));

import { TeamFitAnalysis } from "../team-fit-analysis";

// =============================================================================
// Tests
// =============================================================================

describe("TeamFitAnalysis", () => {
  it("shows competitive abilities as positive signals", () => {
    render(<TeamFitAnalysis currentTeam={[]} candidateSpecies="Incineroar" />);

    expect(screen.getByText("Has Intimidate")).toBeInTheDocument();
    expect(screen.getByText("Team Fit")).toBeInTheDocument();
  });

  it("shows support moves as positive signals", () => {
    render(<TeamFitAnalysis currentTeam={[]} candidateSpecies="Incineroar" />);

    // Incineroar learns Fake Out
    expect(screen.getByText(/Learns:.*Fake Out/)).toBeInTheDocument();
  });

  it("shows immunities as positive signals", () => {
    render(
      <TeamFitAnalysis
        currentTeam={[{ species: "Incineroar" }]}
        candidateSpecies="Flutter_Mane"
      />
    );

    // Flutter Mane (Ghost) adds Normal and Fighting immunities
    expect(screen.getByText("Immune to Normal")).toBeInTheDocument();
    expect(screen.getByText("Immune to Fighting")).toBeInTheDocument();
  });

  it("shows shared type warnings", () => {
    render(
      <TeamFitAnalysis
        currentTeam={[{ species: "Incineroar" }]}
        candidateSpecies="Charizard"
      />
    );

    // Both are Fire type
    expect(
      screen.getByText("Shares Fire type with existing member")
    ).toBeInTheDocument();
  });

  it("shows weakness warnings when team stacks weaknesses", () => {
    render(
      <TeamFitAnalysis
        currentTeam={[{ species: "Incineroar" }]}
        candidateSpecies="Charizard"
      />
    );

    // Both Fire types are weak to Water
    expect(screen.getByText(/Adds Water weakness/)).toBeInTheDocument();
  });

  it("shows neutral fit when no significant signals exist", () => {
    // Use a species with no competitive abilities, no support moves,
    // no type overlap, and no coverage improvement
    const pokemon = jest.requireMock("@trainers/pokemon");
    pokemon.getSpeciesTypes.mockReturnValueOnce(["Normal"]);
    pokemon.getDefensiveMatchups.mockReturnValue({
      immunities: [],
      resistances: {},
      weaknesses: {},
    });
    pokemon.calculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: {},
      uncoveredTypes: new Set(),
    });
    pokemon.getValidAbilities.mockReturnValueOnce(["Run Away"]);
    pokemon.getLearnableMoves.mockReturnValueOnce(["Tackle"]);

    render(<TeamFitAnalysis currentTeam={[]} candidateSpecies="Rattata" />);

    expect(screen.getByText(/Neutral fit/)).toBeInTheDocument();
  });

  it("renders correct signal symbols", () => {
    render(<TeamFitAnalysis currentTeam={[]} candidateSpecies="Incineroar" />);

    // "+" signals should exist (Intimidate, Fake Out)
    const plusSigns = screen.getAllByText("+");
    expect(plusSigns.length).toBeGreaterThan(0);
  });
});
