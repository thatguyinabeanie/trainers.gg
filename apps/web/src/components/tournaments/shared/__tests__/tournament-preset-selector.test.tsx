/**
 * Tests for TournamentPresetSelector component
 * Covers: rendering preset buttons, active preset detection, preset selection callback.
 */

import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PhaseConfig } from "@trainers/tournaments/types";
import { TournamentPresetSelector } from "../tournament-preset-selector";
import { TOURNAMENT_PRESETS } from "../tournament-presets";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    variant,
    ...props
  }: {
    children: React.ReactNode;
    variant?: string;
    [key: string]: unknown;
  }) => (
    <button data-variant={variant ?? "default"} {...props}>
      {children}
    </button>
  ),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildPhase(overrides: Partial<PhaseConfig> = {}): PhaseConfig {
  return {
    id: "phase-1",
    name: "Test Phase",
    phaseType: "swiss",
    bestOf: 3,
    roundTimeMinutes: 50,
    checkInTimeMinutes: 5,
    ...overrides,
  };
}

const defaultProps = {
  phases: [] as PhaseConfig[],
  onPresetSelect: jest.fn(),
};

function renderSelector(overrides = {}) {
  return render(<TournamentPresetSelector {...defaultProps} {...overrides} />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("TournamentPresetSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the default label", () => {
    renderSelector();
    expect(screen.getByText("Quick start:")).toBeInTheDocument();
  });

  it("renders a custom label", () => {
    renderSelector({ label: "Templates:" });
    expect(screen.getByText("Templates:")).toBeInTheDocument();
  });

  it("renders a button for each preset", () => {
    renderSelector();
    for (const preset of TOURNAMENT_PRESETS) {
      expect(screen.getByText(preset.name)).toBeInTheDocument();
    }
  });

  it("calls onPresetSelect with generated phases when a preset is clicked", async () => {
    const user = userEvent.setup();
    const onPresetSelect = jest.fn();
    renderSelector({ onPresetSelect });

    await user.click(screen.getByText("Competitive Tournament"));

    expect(onPresetSelect).toHaveBeenCalledTimes(1);
    const [phases, presetId] = onPresetSelect.mock.calls[0] as [
      PhaseConfig[],
      string,
    ];
    expect(presetId).toBe("swiss_with_cut");
    expect(phases).toHaveLength(2);
    expect(phases[0]!.phaseType).toBe("swiss");
    expect(phases[1]!.phaseType).toBe("single_elimination");
  });

  it("calls onPresetSelect with swiss-only preset", async () => {
    const user = userEvent.setup();
    const onPresetSelect = jest.fn();
    renderSelector({ onPresetSelect });

    await user.click(screen.getByText("Practice Tournament"));

    expect(onPresetSelect).toHaveBeenCalledTimes(1);
    const [phases, presetId] = onPresetSelect.mock.calls[0] as [
      PhaseConfig[],
      string,
    ];
    expect(presetId).toBe("swiss_only");
    expect(phases).toHaveLength(1);
    expect(phases[0]!.phaseType).toBe("swiss");
  });

  it("disables all buttons when disabled is true", () => {
    renderSelector({ disabled: true });
    for (const preset of TOURNAMENT_PRESETS) {
      expect(screen.getByText(preset.name)).toBeDisabled();
    }
  });

  it("highlights the active preset based on current phases", () => {
    // Swiss + single_elimination matches "swiss_with_cut"
    const phases = [
      buildPhase({ phaseType: "swiss" }),
      buildPhase({ phaseType: "single_elimination" }),
    ];
    renderSelector({ phases });

    // The "Competitive Tournament" button should have variant="default" (active)
    const activeBtn = screen.getByText("Competitive Tournament");
    expect(activeBtn).toHaveAttribute("data-variant", "default");

    // The "Practice Tournament" button should have variant="outline" (inactive)
    const inactiveBtn = screen.getByText("Practice Tournament");
    expect(inactiveBtn).toHaveAttribute("data-variant", "outline");
  });
});
