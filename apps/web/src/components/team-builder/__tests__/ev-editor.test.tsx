import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  calculateStat: jest.fn(
    (
      _base: number,
      _iv: number,
      _ev: number,
      _level: number,
      _nature: number
    ) => 150
  ),
  calculateHP: jest.fn(() => 200),
  getNatureMultiplier: jest.fn((_nature: string, _stat: string) => 1.0),
  calculateNatureBumps: jest.fn(() => [0, 40, 80, 120, 160, 200, 240]),
  NATURE_EFFECTS: {
    Adamant: { boost: "attack", reduce: "specialAttack" },
    Jolly: { boost: "speed", reduce: "specialAttack" },
    Modest: { boost: "specialAttack", reduce: "attack" },
    Timid: { boost: "speed", reduce: "attack" },
    Bold: { boost: "defense", reduce: "attack" },
    Hardy: {},
  },
}));

import { EvEditor } from "../ev-editor";

// =============================================================================
// Test helpers
// =============================================================================

const defaultEvs = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};

const defaultIvs = {
  hp: 31,
  attack: 31,
  defense: 31,
  specialAttack: 31,
  specialDefense: 31,
  speed: 31,
};

const defaultBaseStats = {
  hp: 95,
  attack: 115,
  defense: 90,
  specialAttack: 80,
  specialDefense: 90,
  speed: 60,
};

function renderEvEditor(
  overrides: Partial<React.ComponentProps<typeof EvEditor>> = {}
) {
  const onChange = jest.fn();
  const onPreset = jest.fn();
  render(
    <EvEditor
      evs={defaultEvs}
      ivs={defaultIvs}
      baseStats={defaultBaseStats}
      nature="Hardy"
      level={50}
      onChange={onChange}
      onPreset={onPreset}
      {...overrides}
    />
  );
  return { onChange, onPreset };
}

// =============================================================================
// Tests
// =============================================================================

describe("EvEditor", () => {
  describe("stat rows", () => {
    it("renders all 6 stat labels", () => {
      renderEvEditor();
      expect(screen.getByLabelText("HP EVs")).toBeInTheDocument();
      expect(screen.getByLabelText("Atk EVs")).toBeInTheDocument();
      expect(screen.getByLabelText("Def EVs")).toBeInTheDocument();
      expect(screen.getByLabelText("SpA EVs")).toBeInTheDocument();
      expect(screen.getByLabelText("SpD EVs")).toBeInTheDocument();
      expect(screen.getByLabelText("Spe EVs")).toBeInTheDocument();
    });

    it("renders 6 numeric EV inputs", () => {
      renderEvEditor();
      const inputs = screen.getAllByRole("spinbutton");
      expect(inputs).toHaveLength(6);
    });

    it("shows current EV value in each input", () => {
      const evs = { ...defaultEvs, attack: 252, speed: 252 };
      renderEvEditor({ evs });
      const inputs = screen.getAllByRole("spinbutton");
      // inputs[1] is Atk, inputs[5] is Spe
      expect(inputs[1]).toHaveValue(252);
      expect(inputs[5]).toHaveValue(252);
    });
  });

  describe("nature indicators", () => {
    it("shows + indicator on boosted stat label for Adamant", () => {
      renderEvEditor({ nature: "Adamant" });
      // Atk label should have "Atk+" text
      expect(screen.getByText("Atk+")).toBeInTheDocument();
    });

    it("shows - indicator on reduced stat label for Adamant", () => {
      renderEvEditor({ nature: "Adamant" });
      // SpA label should have "SpA-" text
      expect(screen.getByText("SpA-")).toBeInTheDocument();
    });

    it("shows no nature indicators for neutral nature", () => {
      renderEvEditor({ nature: "Hardy" });
      // No + or - modifiers should appear on labels
      expect(screen.queryByText("Atk+")).not.toBeInTheDocument();
      expect(screen.queryByText("SpA-")).not.toBeInTheDocument();
    });
  });

  describe("EV total counter", () => {
    it("shows 0 / 510 with default empty EVs", () => {
      renderEvEditor();
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("/ 510")).toBeInTheDocument();
    });

    it("shows remaining EVs when not maxed", () => {
      const evs = { ...defaultEvs, attack: 252, speed: 252 };
      renderEvEditor({ evs });
      expect(screen.getByText("• 6 remaining")).toBeInTheDocument();
    });

    it("shows Full indicator when EVs are exactly 510", () => {
      const evs = {
        hp: 6,
        attack: 252,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 252,
      };
      renderEvEditor({ evs });
      expect(screen.getByText("• Full")).toBeInTheDocument();
    });
  });

  describe("preset buttons", () => {
    it("renders Reset, Max Atk, and Max Bulk buttons", () => {
      renderEvEditor();
      expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Max Atk" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Max Bulk" })
      ).toBeInTheDocument();
    });

    it("calls onPreset('reset') when Reset is clicked", async () => {
      const user = userEvent.setup();
      const { onPreset } = renderEvEditor();
      await user.click(screen.getByRole("button", { name: "Reset" }));
      expect(onPreset).toHaveBeenCalledWith("reset");
    });

    it("calls onPreset('maxAtk') when Max Atk is clicked", async () => {
      const user = userEvent.setup();
      const { onPreset } = renderEvEditor();
      await user.click(screen.getByRole("button", { name: "Max Atk" }));
      expect(onPreset).toHaveBeenCalledWith("maxAtk");
    });

    it("calls onPreset('maxBulk') when Max Bulk is clicked", async () => {
      const user = userEvent.setup();
      const { onPreset } = renderEvEditor();
      await user.click(screen.getByRole("button", { name: "Max Bulk" }));
      expect(onPreset).toHaveBeenCalledWith("maxBulk");
    });
  });

  describe("EV input onChange", () => {
    it("calls onChange with stat key and clamped value when input changes", () => {
      const { onChange } = renderEvEditor();
      const inputs = screen.getAllByRole("spinbutton");
      // First input is HP
      fireEvent.change(inputs[0], { target: { value: "100" } });
      expect(onChange).toHaveBeenCalledWith("hp", 100);
    });

    it("ignores non-numeric input", () => {
      const { onChange } = renderEvEditor();
      const inputs = screen.getAllByRole("spinbutton");
      fireEvent.change(inputs[0], { target: { value: "abc" } });
      expect(onChange).not.toHaveBeenCalled();
    });

    it("clamps EV value to 0 minimum", () => {
      const { onChange } = renderEvEditor();
      const inputs = screen.getAllByRole("spinbutton");
      fireEvent.change(inputs[0], { target: { value: "-10" } });
      expect(onChange).toHaveBeenCalledWith("hp", 0);
    });

    it("clamps EV value to 252 maximum per stat", () => {
      const { onChange } = renderEvEditor();
      const inputs = screen.getAllByRole("spinbutton");
      fireEvent.change(inputs[0], { target: { value: "999" } });
      expect(onChange).toHaveBeenCalledWith("hp", 252);
    });
  });

  describe("slider keyboard navigation", () => {
    it("slider roles are accessible", () => {
      renderEvEditor();
      const sliders = screen.getAllByRole("slider");
      expect(sliders).toHaveLength(6);
    });

    it("ArrowRight increases EV by 4", () => {
      const { onChange } = renderEvEditor();
      const sliders = screen.getAllByRole("slider");
      // HP slider — starts at 0, can go up to 252
      fireEvent.keyDown(sliders[0], { key: "ArrowRight" });
      // EvEditor calls onChange(statKey, cappedValue)
      expect(onChange).toHaveBeenCalledWith("hp", 4);
    });

    it("ArrowLeft decreases EV by 4 (clamped to 0)", () => {
      const { onChange } = renderEvEditor();
      const sliders = screen.getAllByRole("slider");
      fireEvent.keyDown(sliders[0], { key: "ArrowLeft" });
      // EvEditor calls onChange(statKey, cappedValue)
      expect(onChange).toHaveBeenCalledWith("hp", 0);
    });
  });

  describe("nature bump tick marks", () => {
    it("renders tick marks only on the boosted stat bar for Adamant", () => {
      renderEvEditor({ nature: "Adamant" });
      // aria-hidden tick marks should exist in the document
      // The mocked calculateNatureBumps returns [0,40,80,120,160,200,240] => 7 ticks
      const ticks = document.querySelectorAll('[aria-hidden="true"]');
      expect(ticks.length).toBeGreaterThan(0);
    });
  });
});
