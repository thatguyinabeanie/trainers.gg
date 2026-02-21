/**
 * Tests for tournament-presets.ts
 * Covers: deriveTournamentFormat, detectActivePreset, applyPreset, getPresetById,
 * generatePhaseId, and TOURNAMENT_PRESETS constant.
 */

import type { PhaseConfig } from "@trainers/tournaments/types";
import {
  TOURNAMENT_PRESETS,
  deriveTournamentFormat,
  detectActivePreset,
  applyPreset,
  getPresetById,
  generatePhaseId,
} from "../tournament-presets";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal PhaseConfig with overrides */
function buildPhase(overrides: Partial<PhaseConfig> = {}): PhaseConfig {
  return {
    id: "phase-test-1",
    name: "Test Phase",
    phaseType: "swiss",
    bestOf: 3,
    roundTimeMinutes: 50,
    checkInTimeMinutes: 5,
    ...overrides,
  };
}

// ── TOURNAMENT_PRESETS constant ────────────────────────────────────────────

describe("TOURNAMENT_PRESETS", () => {
  it("exports exactly 2 presets", () => {
    expect(TOURNAMENT_PRESETS).toHaveLength(2);
  });

  it.each([
    ["swiss_with_cut", "Competitive Tournament", 2],
    ["swiss_only", "Practice Tournament", 1],
  ] as const)(
    "preset '%s' is named '%s' with %d phase(s)",
    (id, name, phaseCount) => {
      const preset = TOURNAMENT_PRESETS.find((p) => p.id === id);
      expect(preset).toBeDefined();
      expect(preset!.name).toBe(name);
      expect(preset!.phases).toHaveLength(phaseCount);
    }
  );
});

// ── generatePhaseId ───────────────────────────────────────────────────────

describe("generatePhaseId", () => {
  it("returns a string starting with 'phase-'", () => {
    const id = generatePhaseId();
    expect(id).toMatch(/^phase-/);
  });

  it("generates unique IDs on consecutive calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generatePhaseId()));
    expect(ids.size).toBe(20);
  });
});

// ── deriveTournamentFormat ────────────────────────────────────────────────

describe("deriveTournamentFormat", () => {
  it.each([
    {
      label: "empty phases",
      phases: [] as PhaseConfig[],
      expected: "swiss_only",
    },
    {
      label: "swiss only",
      phases: [buildPhase({ phaseType: "swiss" })],
      expected: "swiss_only",
    },
    {
      label: "swiss + single elimination",
      phases: [
        buildPhase({ phaseType: "swiss" }),
        buildPhase({ phaseType: "single_elimination" }),
      ],
      expected: "swiss_with_cut",
    },
    {
      label: "swiss + double elimination",
      phases: [
        buildPhase({ phaseType: "swiss" }),
        buildPhase({ phaseType: "double_elimination" }),
      ],
      expected: "swiss_with_cut",
    },
    {
      label: "single elimination only",
      phases: [buildPhase({ phaseType: "single_elimination" })],
      expected: "single_elimination",
    },
    {
      label: "double elimination only",
      phases: [buildPhase({ phaseType: "double_elimination" })],
      expected: "double_elimination",
    },
  ])("returns '$expected' for $label", ({ phases, expected }) => {
    expect(deriveTournamentFormat(phases)).toBe(expected);
  });
});

// ── detectActivePreset ────────────────────────────────────────────────────

describe("detectActivePreset", () => {
  it("returns undefined for empty phases", () => {
    expect(detectActivePreset([])).toBeUndefined();
  });

  it("returns 'swiss_with_cut' for swiss + single_elimination", () => {
    const phases = [
      buildPhase({ phaseType: "swiss" }),
      buildPhase({ phaseType: "single_elimination" }),
    ];
    expect(detectActivePreset(phases)).toBe("swiss_with_cut");
  });

  it("returns 'swiss_only' for a single swiss phase", () => {
    const phases = [buildPhase({ phaseType: "swiss" })];
    expect(detectActivePreset(phases)).toBe("swiss_only");
  });

  it("returns 'custom' for a configuration that matches no preset", () => {
    const phases = [
      buildPhase({ phaseType: "single_elimination" }),
      buildPhase({ phaseType: "single_elimination" }),
    ];
    expect(detectActivePreset(phases)).toBe("custom");
  });

  it("returns 'custom' for three phases (no preset has 3)", () => {
    const phases = [
      buildPhase({ phaseType: "swiss" }),
      buildPhase({ phaseType: "swiss" }),
      buildPhase({ phaseType: "single_elimination" }),
    ];
    expect(detectActivePreset(phases)).toBe("custom");
  });
});

// ── applyPreset ───────────────────────────────────────────────────────────

describe("applyPreset", () => {
  it("generates phases with unique IDs for each preset phase", () => {
    const preset = TOURNAMENT_PRESETS[0]!; // swiss_with_cut
    const phases = applyPreset(preset);

    expect(phases).toHaveLength(preset.phases.length);
    phases.forEach((phase) => {
      expect(phase.id).toMatch(/^phase-/);
    });

    // All IDs are unique
    const ids = new Set(phases.map((p) => p.id));
    expect(ids.size).toBe(phases.length);
  });

  it("preserves phase configuration from preset", () => {
    const preset = TOURNAMENT_PRESETS[0]!; // swiss_with_cut
    const phases = applyPreset(preset);

    expect(phases[0]!.name).toBe("Swiss Rounds");
    expect(phases[0]!.phaseType).toBe("swiss");
    expect(phases[1]!.name).toBe("Top Cut");
    expect(phases[1]!.phaseType).toBe("single_elimination");
  });
});

// ── getPresetById ─────────────────────────────────────────────────────────

describe("getPresetById", () => {
  it.each(["swiss_with_cut", "swiss_only"] as const)(
    "finds preset '%s'",
    (id) => {
      const preset = getPresetById(id);
      expect(preset).toBeDefined();
      expect(preset!.id).toBe(id);
    }
  );

  it("returns undefined for 'custom'", () => {
    expect(getPresetById("custom")).toBeUndefined();
  });
});
