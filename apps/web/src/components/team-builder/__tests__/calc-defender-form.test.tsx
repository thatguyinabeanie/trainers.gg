import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Normal", "Fire", "Water", "Electric", "Grass", "Psychic"],
  formatHasTera: jest.fn(
    (format: { generation?: number } | null | undefined) => {
      if (!format) return false;
      return format.generation === 9;
    }
  ),
  getAllItems: jest.fn(() => ["Leftovers", "Life Orb"]),
  getLegalAbilities: jest.fn(() => undefined),
  getLegalItems: jest.fn(() => undefined),
  getLegalTeraTypes: jest.fn(() => undefined),
  getMetaSpeedTiers: jest.fn(() => []),
  getValidAbilities: jest.fn(() => ["Intimidate", "Blaze"]),
  getValidNatures: jest.fn(() => ["Hardy", "Timid", "Adamant"]),
}));

import { CalcDefenderForm } from "../calc-defender-form";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Fixture formats
// =============================================================================

const championsFormat: GameFormat = {
  id: "championsvgc2026regma",
  game: "Pokemon Champions",
  gameShort: "Champions",
  generation: 10,
  category: "VGC",
  year: 2026,
  regulation: "M-A",
  label: "Champions: Reg M-A",
  showdownName: "[Champions] VGC 2026 Reg M-A",
  doubles: true,
  active: true,
};

const svFormat: GameFormat = {
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
// renderForm helper
// =============================================================================

function renderForm(formatOverride: GameFormat | undefined) {
  const handlers = {
    onSpeciesChange: jest.fn(),
    onAbilityChange: jest.fn(),
    onItemChange: jest.fn(),
    onNatureChange: jest.fn(),
    onTeraChange: jest.fn(),
    onEvChange: jest.fn(),
    onBoostChange: jest.fn(),
    onStatusChange: jest.fn(),
    onHpPercentChange: jest.fn(),
  };

  render(
    <CalcDefenderForm
      species="Incineroar"
      ability="Intimidate"
      item=""
      nature="Hardy"
      teraType=""
      evs={{ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }}
      boosts={{ def: 0, spd: 0 }}
      status="Healthy"
      hpPercent={100}
      format={formatOverride}
      teammates={[]}
      {...handlers}
    />
  );

  return handlers;
}

// =============================================================================
// Tests
// =============================================================================

describe("CalcDefenderForm — Tera field gating", () => {
  it("hides the Tera select for a Champions format (no Terastal)", () => {
    renderForm(championsFormat);
    expect(screen.queryByTestId("calc-defender-tera")).not.toBeInTheDocument();
    // The 'Tera' label heading should also be absent
    expect(
      screen.queryByText(/^TERA$/i, { selector: "span" })
    ).not.toBeInTheDocument();
  });

  it("renders the Tera select for a Gen 9 VGC format (has Terastal)", () => {
    renderForm(svFormat);
    expect(screen.getByTestId("calc-defender-tera")).toBeInTheDocument();
  });

  it("hides the Tera select when format is undefined (safe default → no tera)", () => {
    renderForm(undefined);
    expect(screen.queryByTestId("calc-defender-tera")).not.toBeInTheDocument();
  });

  it("still renders Nature select when Tera is hidden (no layout break)", () => {
    renderForm(championsFormat);
    // Nature select must be present even without Tera
    const natureSel = screen.getByDisplayValue("Hardy");
    expect(natureSel).toBeInTheDocument();
  });

  it("does not collapse the Ability or Item fields for Champions format", () => {
    renderForm(championsFormat);
    // Ability and Item selects must still render
    expect(screen.getByDisplayValue("Intimidate")).toBeInTheDocument();
  });
});

// =============================================================================
// Status pills
// =============================================================================

describe("CalcDefenderForm — status pills", () => {
  it("renders all status options using STATUS_LABELS (Badly Poisoned → Toxic)", () => {
    renderForm(undefined);
    // "Badly Poisoned" must not appear in the UI — it should be mapped to "Toxic"
    expect(screen.queryByText("Badly Poisoned")).not.toBeInTheDocument();
    expect(screen.getByText("Toxic")).toBeInTheDocument();
    // Other labels should appear as-is
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("Burned")).toBeInTheDocument();
    expect(screen.getByText("Poisoned")).toBeInTheDocument();
    expect(screen.getByText("Paralyzed")).toBeInTheDocument();
    expect(screen.getByText("Asleep")).toBeInTheDocument();
    expect(screen.getByText("Frozen")).toBeInTheDocument();
  });

  it("active status pill has aria-pressed true", () => {
    renderForm(undefined);
    // "Healthy" is the default status
    const healthyBtn = screen.getByText("Healthy").closest("button")!;
    expect(healthyBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("inactive status pills have aria-pressed false", () => {
    renderForm(undefined);
    const burnedBtn = screen.getByText("Burned").closest("button")!;
    expect(burnedBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking a status pill fires onStatusChange with the raw status key", async () => {
    const user = userEvent.setup();
    const handlers = {
      onSpeciesChange: jest.fn(),
      onAbilityChange: jest.fn(),
      onItemChange: jest.fn(),
      onNatureChange: jest.fn(),
      onTeraChange: jest.fn(),
      onEvChange: jest.fn(),
      onBoostChange: jest.fn(),
      onStatusChange: jest.fn(),
      onHpPercentChange: jest.fn(),
    };
    render(
      <CalcDefenderForm
        species="Incineroar"
        ability="Intimidate"
        item=""
        nature="Hardy"
        teraType=""
        evs={{ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }}
        boosts={{ def: 0, spd: 0 }}
        status="Healthy"
        hpPercent={100}
        format={undefined}
        teammates={[]}
        {...handlers}
      />
    );

    await user.click(screen.getByText("Toxic").closest("button")!);
    // onStatusChange must be called with the raw key "Badly Poisoned"
    expect(handlers.onStatusChange).toHaveBeenCalledWith("Badly Poisoned");
  });
});

// =============================================================================
// Target select — duplicate option deduplication
// =============================================================================

describe("CalcDefenderForm — Target select", () => {
  it("always renders a stable 'Custom' option with value ''", () => {
    renderForm(undefined);
    const targetSelect = screen.getByTestId(
      "calc-defender-target"
    ) as HTMLSelectElement;
    const options = Array.from(targetSelect.options).map((o) => ({
      value: o.value,
      text: o.text,
    }));
    expect(options).toContainEqual({ value: "", text: "Custom" });
  });

  it("does not render a duplicate option when species is in teammates", () => {
    const handlers = {
      onSpeciesChange: jest.fn(),
      onAbilityChange: jest.fn(),
      onItemChange: jest.fn(),
      onNatureChange: jest.fn(),
      onTeraChange: jest.fn(),
      onEvChange: jest.fn(),
      onBoostChange: jest.fn(),
      onStatusChange: jest.fn(),
      onHpPercentChange: jest.fn(),
    };
    render(
      <CalcDefenderForm
        species="Rillaboom"
        ability=""
        item=""
        nature="Hardy"
        teraType=""
        evs={{ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }}
        boosts={{ def: 0, spd: 0 }}
        status="Healthy"
        hpPercent={100}
        format={undefined}
        teammates={[
          {
            id: 1,
            species: "Rillaboom",
          } as Parameters<typeof CalcDefenderForm>[0]["teammates"][0],
        ]}
        {...handlers}
      />
    );

    const targetSelect = screen.getByTestId(
      "calc-defender-target"
    ) as HTMLSelectElement;
    const rillaboomOptions = Array.from(targetSelect.options).filter(
      (o) => o.value === "Rillaboom"
    );
    // Should appear exactly once (filtered from teammates, not duplicated)
    expect(rillaboomOptions.length).toBe(0);
  });

  it("renders selects with aria-label for screen readers", () => {
    renderForm(undefined);
    expect(
      screen.getByRole("combobox", { name: "Target" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Ability" })
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Item" })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Nature" })
    ).toBeInTheDocument();
  });
});
