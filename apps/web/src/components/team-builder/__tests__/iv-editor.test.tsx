import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { IvEditor } from "../iv-editor";

// =============================================================================
// Test helpers
// =============================================================================

const allMaxIvs = {
  hp: 31,
  attack: 31,
  defense: 31,
  specialAttack: 31,
  specialDefense: 31,
  speed: 31,
};

function renderIvEditor(ivs = allMaxIvs, onChange = jest.fn()) {
  render(<IvEditor ivs={ivs} onChange={onChange} />);
  return { onChange };
}

// =============================================================================
// Tests
// =============================================================================

describe("IvEditor", () => {
  describe("rendering", () => {
    it("renders 6 IV inputs", () => {
      renderIvEditor();
      const inputs = screen.getAllByRole("spinbutton");
      expect(inputs).toHaveLength(6);
    });

    it("renders stat labels HP, Atk, Def, SpA, SpD, Spe", () => {
      renderIvEditor();
      expect(screen.getByText("HP")).toBeInTheDocument();
      expect(screen.getByText("Atk")).toBeInTheDocument();
      expect(screen.getByText("Def")).toBeInTheDocument();
      expect(screen.getByText("SpA")).toBeInTheDocument();
      expect(screen.getByText("SpD")).toBeInTheDocument();
      expect(screen.getByText("Spe")).toBeInTheDocument();
    });

    it("renders aria-labels for each input", () => {
      renderIvEditor();
      expect(screen.getByLabelText("HP IV")).toBeInTheDocument();
      expect(screen.getByLabelText("Atk IV")).toBeInTheDocument();
      expect(screen.getByLabelText("Def IV")).toBeInTheDocument();
      expect(screen.getByLabelText("SpA IV")).toBeInTheDocument();
      expect(screen.getByLabelText("SpD IV")).toBeInTheDocument();
      expect(screen.getByLabelText("Spe IV")).toBeInTheDocument();
    });

    it("shows current IV values", () => {
      const ivs = { ...allMaxIvs, attack: 0 };
      renderIvEditor(ivs);
      const atkInput = screen.getByLabelText("Atk IV");
      expect(atkInput).toHaveValue(0);
    });
  });

  describe("non-standard IV summary", () => {
    it("does not show summary when all IVs are 31", () => {
      renderIvEditor(allMaxIvs);
      // The summary line only appears when there are non-standard IVs
      expect(screen.queryByText(/0 Atk/)).not.toBeInTheDocument();
    });

    it("shows summary for non-31 IVs", () => {
      const ivs = { ...allMaxIvs, attack: 0, speed: 27 };
      renderIvEditor(ivs);
      expect(screen.getByText("0 Atk, 27 Spe")).toBeInTheDocument();
    });

    it("shows summary for a single non-standard IV", () => {
      const ivs = { ...allMaxIvs, hp: 0 };
      renderIvEditor(ivs);
      expect(screen.getByText("0 HP")).toBeInTheDocument();
    });
  });

  describe("onChange behavior", () => {
    it("calls onChange with stat key and value", () => {
      const onChange = jest.fn();
      renderIvEditor(allMaxIvs, onChange);
      const hpInput = screen.getByLabelText("HP IV");
      fireEvent.change(hpInput, { target: { value: "20" } });
      expect(onChange).toHaveBeenCalledWith("hp", 20);
    });

    it("clamps value to 0 minimum", () => {
      const onChange = jest.fn();
      renderIvEditor(allMaxIvs, onChange);
      const atkInput = screen.getByLabelText("Atk IV");
      fireEvent.change(atkInput, { target: { value: "-5" } });
      expect(onChange).toHaveBeenCalledWith("attack", 0);
    });

    it("clamps value to 31 maximum", () => {
      const onChange = jest.fn();
      renderIvEditor(allMaxIvs, onChange);
      const atkInput = screen.getByLabelText("Atk IV");
      fireEvent.change(atkInput, { target: { value: "50" } });
      expect(onChange).toHaveBeenCalledWith("attack", 31);
    });

    it("ignores non-numeric input (NaN)", () => {
      const onChange = jest.fn();
      renderIvEditor(allMaxIvs, onChange);
      const atkInput = screen.getByLabelText("Atk IV");
      fireEvent.change(atkInput, { target: { value: "abc" } });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("IVs header", () => {
    it("renders IVs section header", () => {
      renderIvEditor();
      expect(screen.getByText("IVs")).toBeInTheDocument();
    });
  });

  describe("each stat key triggers correct stat argument", () => {
    it.each([
      ["HP IV", "hp"],
      ["Atk IV", "attack"],
      ["Def IV", "defense"],
      ["SpA IV", "specialAttack"],
      ["SpD IV", "specialDefense"],
      ["Spe IV", "speed"],
    ])("input '%s' calls onChange with stat key '%s'", (label, statKey) => {
      const onChange = jest.fn();
      renderIvEditor(allMaxIvs, onChange);
      const input = screen.getByLabelText(label);
      fireEvent.change(input, { target: { value: "15" } });
      expect(onChange).toHaveBeenCalledWith(statKey, 15);
    });
  });

  // ---------------------------------------------------------------------------
  // disabled prop
  // ---------------------------------------------------------------------------

  describe("disabled prop", () => {
    it("all IV inputs are disabled when disabled=true", () => {
      const onChange = jest.fn();
      render(<IvEditor ivs={allMaxIvs} onChange={onChange} disabled={true} />);
      const inputs = screen.getAllByRole("spinbutton");
      expect(inputs).toHaveLength(6);
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });

    it("does NOT call onChange when an IV input is changed while disabled", () => {
      const onChange = jest.fn();
      render(<IvEditor ivs={allMaxIvs} onChange={onChange} disabled={true} />);
      const hpInput = screen.getByLabelText("HP IV");
      fireEvent.change(hpInput, { target: { value: "20" } });
      expect(onChange).not.toHaveBeenCalled();
    });

    it("inputs are NOT disabled when disabled=false (default)", () => {
      const onChange = jest.fn();
      render(<IvEditor ivs={allMaxIvs} onChange={onChange} />);
      const inputs = screen.getAllByRole("spinbutton");
      inputs.forEach((input) => {
        expect(input).not.toBeDisabled();
      });
    });

    it("calls onChange normally when disabled=false (regression)", () => {
      const onChange = jest.fn();
      render(<IvEditor ivs={allMaxIvs} onChange={onChange} disabled={false} />);
      const hpInput = screen.getByLabelText("HP IV");
      fireEvent.change(hpInput, { target: { value: "20" } });
      expect(onChange).toHaveBeenCalledWith("hp", 20);
    });
  });
});
