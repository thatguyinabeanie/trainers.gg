"use client";

/**
 * Tests for the CalcColumn component.
 *
 * Critical regression: an empty row's CalcColumn must NOT render the active
 * pokemon's calc results. moveCalcOutputs is keyed by slot index across the
 * whole workspace context — gating on moveName !== null prevents the leak.
 */

import { render, screen } from "@testing-library/react";
import React from "react";

import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

const mockCalcContext = {
  calcEnabled: true,
  defenderSpecies: "Garchomp",
  defenderAbility: "",
  defenderItem: "",
  defenderNature: "",
  weather: "",
  inferredWeather: "",
  // Realistic active-pokemon calc outputs for slot 0
  moveCalcOutputs: [
    { minPercent: 24.7, maxPercent: 29.8 },
    null,
    null,
    null,
  ] as (null | { minPercent: number; maxPercent: number })[],
  field: { foesAlive: 2, allyAlive: true },
};

jest.mock("../calc/calc-state-context", () => ({
  useCalcStateContext: jest.fn(() => mockCalcContext),
}));

jest.mock("../calc/move-effectiveness", () => ({
  getMoveEffectiveness: jest.fn().mockReturnValue(1),
}));

jest.mock("../calc/move-target-info", () => ({
  getMoveTargetInfo: jest.fn().mockReturnValue({ isSpread: false, kind: "normal" }),
}));

jest.mock("../../use-calc-state", () => ({
  getVerdict: jest.fn().mockReturnValue("4HKO"),
}));

jest.mock("@trainers/pokemon", () => ({
  getMoveData: jest.fn().mockReturnValue({
    type: "Fairy",
    category: "Special",
    basePower: 80,
    accuracy: 100,
  }),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { CalcColumn } from "../lanes/calc-column";

// =============================================================================
// Fixtures
// =============================================================================

function makePokemon(overrides: Partial<Tables<"pokemon">> = {}): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Floette-Eternal",
    ability: null,
    nature: "Mild",
    move1: "Dazzling Gleam",
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

// =============================================================================
// Tests
// =============================================================================

describe("CalcColumn — empty-row leak protection", () => {
  it("renders calc results for a real pokemon when its move + output match", () => {
    render(<CalcColumn pokemon={makePokemon()} format={undefined} />);
    // Slot 0: Dazzling Gleam + output → real KO data renders
    expect(screen.getByText(/24\.7.*29\.8%/)).toBeInTheDocument();
  });

  it("does NOT show calc results when pokemon is null, even though moveCalcOutputs has data", () => {
    // The active pokemon's outputs are still in the context (slot 0 = 24.7-29.8%).
    // An empty row must not display them.
    render(<CalcColumn pokemon={null} format={undefined} />);
    expect(screen.queryByText(/24\.7.*29\.8%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4HKO\+/)).not.toBeInTheDocument();
  });

  it("renders the CALC header and 4 placeholder rows in ghost mode", () => {
    const { container } = render(<CalcColumn pokemon={null} format={undefined} />);
    expect(screen.getByText("CALC")).toBeInTheDocument();
    expect(container.querySelectorAll(".calc-col-row")).toHaveLength(4);
  });

  it("does not show calc results for slots whose moveName is null on a real pokemon", () => {
    // Pokemon has only move1 set; slots 2-4 must not leak any calc data
    // (irrelevant here since output is null, but verifies the moveName guard)
    render(<CalcColumn pokemon={makePokemon()} format={undefined} />);
    // Only slot 0 has a result → exactly one "4HKO+" badge
    expect(screen.getAllByText(/4HKO\+/)).toHaveLength(1);
  });
});
