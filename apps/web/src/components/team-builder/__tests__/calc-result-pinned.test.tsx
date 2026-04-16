import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { CalcResultPinned } from "../calc-result-pinned";
import { type CalcOutput } from "../use-calc-state";

// =============================================================================
// Fixtures
// =============================================================================

function makeOutput(overrides: Partial<CalcOutput> = {}): CalcOutput {
  return {
    minPercent: 62,
    maxPercent: 74,
    desc: "Moonblast vs. 252 HP / 4 SpD Incineroar",
    rolls: [124, 130, 136, 142, 148],
    defenderMaxHP: 200,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("CalcResultPinned", () => {
  it("renders the pct range and verdict for a known result", () => {
    render(
      <CalcResultPinned
        attackerName="Tinkaton"
        defenderName="Incineroar"
        moveName="Moonblast"
        output={makeOutput()}
      />
    );

    expect(screen.getByTestId("calc-result-attacker")).toHaveTextContent(
      "Tinkaton"
    );
    expect(screen.getByTestId("calc-result-defender")).toHaveTextContent(
      "Incineroar"
    );
    expect(screen.getByTestId("calc-result-move")).toHaveTextContent(
      "Moonblast"
    );
    expect(screen.getByTestId("calc-result-range")).toHaveTextContent("62–74%");
    // 2HKO with min ≥ 50 → guaranteed
    expect(screen.getByTestId("calc-result-verdict")).toHaveTextContent(
      "Guaranteed 2HKO"
    );
  });

  it("labels a possible OHKO when max ≥ 100 but min < 100", () => {
    render(
      <CalcResultPinned
        attackerName="Iron Hands"
        defenderName="Pikachu"
        moveName="Drain Punch"
        output={makeOutput({ minPercent: 90, maxPercent: 110 })}
      />
    );
    expect(screen.getByTestId("calc-result-verdict")).toHaveTextContent(
      "Possible OHKO"
    );
  });

  it("shows the placeholder when no move is selected", () => {
    render(
      <CalcResultPinned
        attackerName="—"
        defenderName="—"
        moveName={null}
        output={null}
      />
    );
    expect(
      screen.getByText("Pick an attacker move to calculate.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("calc-result-range")).not.toBeInTheDocument();
  });

  it("shows the placeholder when output is null", () => {
    render(
      <CalcResultPinned
        attackerName="Charizard"
        defenderName="Incineroar"
        moveName="Moonblast"
        output={null}
      />
    );
    expect(
      screen.getByText("Pick an attacker move to calculate.")
    ).toBeInTheDocument();
  });

  it("respects a custom placeholder string", () => {
    render(
      <CalcResultPinned
        attackerName="—"
        defenderName="—"
        moveName={null}
        output={null}
        placeholder="No attacker yet."
      />
    );
    expect(screen.getByText("No attacker yet.")).toBeInTheDocument();
  });
});
