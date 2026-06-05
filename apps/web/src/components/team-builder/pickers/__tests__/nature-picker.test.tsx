/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Behavioral tests for NaturePicker.
 *
 * Covers:
 *   - Picker shell title is "Nature" for non-Champions / undefined format
 *   - Picker shell title is "Stat Alignment" for Champions format
 *   - Internal prop names remain `nature` (not renamed)
 */

import { render, screen } from "@testing-library/react";
import React from "react";

import { NaturePicker } from "../nature-picker";

// =============================================================================
// Mock @trainers/pokemon
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getValidNatures: () => ["Adamant", "Modest", "Bold", "Jolly", "Timid", "Serious"],
  NATURE_EFFECTS: {
    Adamant: { boost: "attack", reduce: "specialAttack" },
    Modest: { boost: "specialAttack", reduce: "attack" },
    Bold: { boost: "defense", reduce: "attack" },
    Jolly: { boost: "speed", reduce: "specialAttack" },
    Timid: { boost: "speed", reduce: "attack" },
    Serious: null,
  },
  isChampionsFormat: (format: any) => format?.gameShort === "Champions",
}));

// =============================================================================
// Mock PickerShell — capture title prop for assertion
// =============================================================================

jest.mock("../picker-shell", () => ({
  PickerShell: ({ title, children, search }: any) => (
    <div>
      <span data-testid="picker-shell-title">{title}</span>
      {search && (
        <input
          data-testid="picker-search"
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder}
        />
      )}
      {children}
    </div>
  ),
}));

// =============================================================================
// Mock usage data hook — return no data so the picker renders normally
// =============================================================================

jest.mock("../../use-usage-data", () => ({
  useUsageData: () => ({ data: undefined }),
}));

jest.mock("../usage-sparkline", () => ({
  UsageSparkline: () => null,
}));

jest.mock("../stat-types", () => ({
  STAT_LABELS: {
    attack: "Atk",
    defense: "Def",
    specialAttack: "SpA",
    specialDefense: "SpD",
    speed: "Spe",
    hp: "HP",
  },
}));

// =============================================================================
// Format fixtures
// =============================================================================

const championsFormat = {
  id: "gen9championsvgc2026regma",
  gameShort: "Champions",
} as any;

const vgcFormat = {
  id: "gen9vgc2025regf",
  gameShort: "SV",
} as any;

// =============================================================================
// Tests
// =============================================================================

describe("NaturePicker — picker shell title", () => {
  const baseProps = {
    value: "Adamant",
    onPick: jest.fn(),
    onClose: jest.fn(),
  };

  it("shows 'Nature' when format is undefined", () => {
    render(<NaturePicker {...baseProps} />);
    expect(screen.getByTestId("picker-shell-title")).toHaveTextContent("Nature");
  });

  it("shows 'Nature' for a non-Champions (VGC) format", () => {
    render(<NaturePicker {...baseProps} format={vgcFormat} />);
    expect(screen.getByTestId("picker-shell-title")).toHaveTextContent("Nature");
  });

  it("shows 'Stat Alignment' for a Champions format", () => {
    render(<NaturePicker {...baseProps} format={championsFormat} />);
    expect(screen.getByTestId("picker-shell-title")).toHaveTextContent("Stat Alignment");
  });

  it("renders nature options with the correct names (internal value stays 'nature')", () => {
    render(<NaturePicker {...baseProps} format={championsFormat} />);
    // Nature names are rendered as-is — the label change is title-only
    expect(screen.getByText("Adamant")).toBeInTheDocument();
    expect(screen.getByText("Modest")).toBeInTheDocument();
  });
});
