import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => {
  // Re-implement getStatTier so the boundary tier color tests are real.
  const getStatTier = (base: number) => {
    if (!Number.isFinite(base) || base <= 60) return "low";
    if (base <= 90) return "mid";
    if (base <= 120) return "good";
    return "great";
  };
  return {
    getBaseStats: jest.fn(() => ({
      hp: 95,
      attack: 115,
      defense: 90,
      specialAttack: 80,
      specialDefense: 90,
      speed: 60,
    })),
    getStatTier,
    // Final-stat math is replaced with a deterministic stand-in so we can
    // assert that the displayed final stat depends on the points.
    calculateStat: jest.fn(
      (base: number, _iv: number, ev: number) => base + Math.floor(ev / 4)
    ),
    calculateHP: jest.fn(
      (base: number, _iv: number, ev: number) => base + Math.floor(ev / 4) + 10
    ),
    calculateChampionsHP: jest.fn(
      (base: number, sp: number) => base + sp * 2 + 10
    ),
    calculateChampionsStat: jest.fn(
      (base: number, sp: number) => base + sp * 2
    ),
    getNatureMultiplier: jest.fn(() => 1.0),
    NATURE_EFFECTS: {
      Adamant: { boost: "attack", reduce: "specialAttack" },
      Hardy: {},
    },
  };
});

import { type GameFormat } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { StatsTable } from "../stats-table";

// =============================================================================
// Test helpers
// =============================================================================

function buildPokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    ability: "Intimidate",
    created_at: null,
    ev_attack: 0,
    ev_defense: 0,
    ev_hp: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 0,
    format_legal: true,
    gender: null,
    held_item: null,
    id: 1,
    is_shiny: false,
    iv_attack: 31,
    iv_defense: 31,
    iv_hp: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    move1: "Tackle",
    move2: null,
    move3: null,
    move4: null,
    nature: "Hardy",
    nickname: null,
    notes: null,
    species: "Incineroar",
    tera_type: null,
    ...overrides,
  };
}

// Champions format — generation 10 triggers SP mode.
const championsFormat: GameFormat = {
  id: "gen10champions",
  game: "Pokemon Champions",
  gameShort: "Champions",
  generation: 10,
  category: "VGC",
  year: 2026,
  regulation: null,
  label: "Champions",
  showdownName: "Champions",
  doubles: true,
  active: true,
};

function renderStatsTable(
  overrides: Partial<React.ComponentProps<typeof StatsTable>> = {}
) {
  const onUpdate = jest.fn();
  render(
    <StatsTable
      pokemon={buildPokemon()}
      format={undefined}
      onUpdate={onUpdate}
      {...overrides}
    />
  );
  return { onUpdate };
}

// =============================================================================
// Tests
// =============================================================================

describe("StatsTable", () => {
  describe("base stat colors (boundary cases)", () => {
    // Validate every tier boundary: low ≤60, mid ≤90, good ≤120, great >120.
    // For each pair (base, expected class) we render a synthetic "Incineroar"
    // with a single base stat overridden via the mock and read the rendered
    // class from the displayed number.
    it.each([
      [60, "text-stat-low"],
      [61, "text-stat-mid"],
      [90, "text-stat-mid"],
      [91, "text-stat-good"],
      [120, "text-stat-good"],
      [121, "text-stat-great"],
    ])("base %i renders class %s", (base, expectedClass) => {
      const { getBaseStats } = jest.requireMock("@trainers/pokemon") as {
        getBaseStats: jest.Mock;
      };
      // Stub all 6 base stats to the same value so we can grab any rendered
      // base cell — they'll all share the expected color class.
      getBaseStats.mockReturnValueOnce({
        hp: base,
        attack: base,
        defense: base,
        specialAttack: base,
        specialDefense: base,
        speed: base,
      });
      renderStatsTable();
      const baseCells = screen
        .getAllByText(String(base))
        .filter((el) => el.classList.contains(expectedClass));
      expect(baseCells.length).toBeGreaterThan(0);
    });
  });

  describe("input + slider sync", () => {
    it("typing in the points input emits onUpdate with the EV column name", () => {
      const { onUpdate } = renderStatsTable();
      const input = screen.getByLabelText("HP points");
      fireEvent.change(input, { target: { value: "100" } });
      expect(onUpdate).toHaveBeenCalledWith("ev_hp", 100);
    });

    it("moving the slider emits onUpdate with the EV column name", () => {
      const { onUpdate } = renderStatsTable();
      const slider = screen.getByLabelText("Atk points slider");
      fireEvent.change(slider, { target: { value: "252" } });
      expect(onUpdate).toHaveBeenCalledWith("ev_attack", 252);
    });

    it("input and slider for the same stat share the same value (stay in sync)", () => {
      renderStatsTable({ pokemon: buildPokemon({ ev_hp: 84 }) });
      const input = screen.getByLabelText("HP points") as HTMLInputElement;
      const slider = screen.getByLabelText(
        "HP points slider"
      ) as HTMLInputElement;
      expect(input.value).toBe("84");
      expect(slider.value).toBe("84");
    });
  });

  describe("format-specific caps", () => {
    it("classic format caps individual stat input at 252", () => {
      const { onUpdate } = renderStatsTable();
      const input = screen.getByLabelText("HP points");
      fireEvent.change(input, { target: { value: "999" } });
      expect(onUpdate).toHaveBeenCalledWith("ev_hp", 252);
    });

    it("Champions format caps individual stat input at 32 (SP mode)", () => {
      const { onUpdate } = renderStatsTable({ format: championsFormat });
      const input = screen.getByLabelText("HP points");
      fireEvent.change(input, { target: { value: "999" } });
      expect(onUpdate).toHaveBeenCalledWith("ev_hp", 32);
    });

    it("Champions format hides the EV total counter", () => {
      renderStatsTable({ format: championsFormat });
      expect(screen.queryByText(/points spent/)).not.toBeInTheDocument();
    });

    it("classic format shows the EV total counter", () => {
      renderStatsTable();
      expect(screen.getByText(/points spent/)).toBeInTheDocument();
    });
  });

  describe("final stat updates with points", () => {
    it("final stat reflects current points (re-renders when ev_hp changes)", () => {
      const { rerender } = render(
        <StatsTable
          pokemon={buildPokemon({ ev_hp: 0 })}
          format={undefined}
          onUpdate={jest.fn()}
        />
      );
      // calculateHP mock: base + floor(ev/4) + 10 → 95 + 0 + 10 = 105
      expect(screen.getByText("105")).toBeInTheDocument();

      rerender(
        <StatsTable
          pokemon={buildPokemon({ ev_hp: 252 })}
          format={undefined}
          onUpdate={jest.fn()}
        />
      );
      // 95 + 63 + 10 = 168
      expect(screen.getByText("168")).toBeInTheDocument();
    });
  });

  describe("disabled mode", () => {
    it("does not call onUpdate when typing in points input while disabled", () => {
      const { onUpdate } = renderStatsTable({ disabled: true });
      const input = screen.getByLabelText("HP points");
      fireEvent.change(input, { target: { value: "100" } });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("does not call onUpdate when moving the slider while disabled", () => {
      const { onUpdate } = renderStatsTable({ disabled: true });
      const slider = screen.getByLabelText("Atk points slider");
      fireEvent.change(slider, { target: { value: "252" } });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("disables Reset and Max preset buttons", () => {
      renderStatsTable({ disabled: true });
      expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Max bulk" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Max Atk" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Max Spe" })).toBeDisabled();
    });
  });

  describe("preset buttons", () => {
    it("Reset emits zero for every EV column", () => {
      const { onUpdate } = renderStatsTable();
      fireEvent.click(screen.getByRole("button", { name: "Reset" }));
      expect(onUpdate).toHaveBeenCalledWith("ev_hp", 0);
      expect(onUpdate).toHaveBeenCalledWith("ev_attack", 0);
      expect(onUpdate).toHaveBeenCalledWith("ev_defense", 0);
      expect(onUpdate).toHaveBeenCalledWith("ev_special_attack", 0);
      expect(onUpdate).toHaveBeenCalledWith("ev_special_defense", 0);
      expect(onUpdate).toHaveBeenCalledWith("ev_speed", 0);
    });

    it("Max Atk emits 252 attack and 252 speed", () => {
      const { onUpdate } = renderStatsTable();
      fireEvent.click(screen.getByRole("button", { name: "Max Atk" }));
      expect(onUpdate).toHaveBeenCalledWith("ev_attack", 252);
      expect(onUpdate).toHaveBeenCalledWith("ev_speed", 252);
    });

    it("Champions format hides Max bulk/Atk/Spe presets (only Reset remains)", () => {
      renderStatsTable({ format: championsFormat });
      expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Max bulk" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Max Atk" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Max Spe" })
      ).not.toBeInTheDocument();
    });
  });

  describe("nature indicators", () => {
    it("shows + on the boosted stat label and − on the reduced stat label", () => {
      renderStatsTable({ pokemon: buildPokemon({ nature: "Adamant" }) });
      // The +/− are rendered as small suffix spans next to the label so
      // the Final column stays a separate, full-width number. Find the
      // suffix by its accessibility label.
      expect(
        screen.getByLabelText("Atk is boosted by nature")
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("SpA is reduced by nature")
      ).toBeInTheDocument();
    });

    it("hides nature indicators in Champions format (natures don't affect stats)", () => {
      renderStatsTable({
        pokemon: buildPokemon({ nature: "Adamant" }),
        format: championsFormat,
      });
      expect(
        screen.queryByLabelText("Atk is boosted by nature")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText("SpA is reduced by nature")
      ).not.toBeInTheDocument();
    });
  });
});
