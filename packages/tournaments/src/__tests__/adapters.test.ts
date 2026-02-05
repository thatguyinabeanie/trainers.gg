import {
  dbPhasesToPhaseConfigs,
  phaseConfigToDbUpdate,
  phaseConfigsToDbUpdates,
  createDefaultSwissPhase,
  createDefaultEliminationPhase,
  getDefaultPhaseName,
  getDefaultRoundTime,
  type DBPhase,
} from "../adapters";

import type { PhaseConfig } from "../types";

// -- Helper factories --

function createDBPhase(overrides?: Partial<DBPhase>): DBPhase {
  const defaults: DBPhase = {
    id: 1,
    tournament_id: 100,
    name: "Swiss Rounds",
    phase_order: 1,
    phase_type: "swiss",
    status: "pending",
    best_of: 3,
    round_time_minutes: 50,
    check_in_time_minutes: 5,
    planned_rounds: 6,
    current_round: null,
    cut_rule: null,
    started_at: null,
    completed_at: null,
    created_at: "2024-01-01T00:00:00Z",
  };
  return { ...defaults, ...overrides };
}

function createPhaseConfig(overrides?: Partial<PhaseConfig>): PhaseConfig {
  return {
    id: overrides?.id ?? "phase-test-123",
    name: overrides?.name ?? "Swiss Rounds",
    phaseType: overrides?.phaseType ?? "swiss",
    bestOf: overrides?.bestOf ?? 3,
    roundTimeMinutes: overrides?.roundTimeMinutes ?? 50,
    checkInTimeMinutes: overrides?.checkInTimeMinutes ?? 5,
    plannedRounds: overrides?.plannedRounds,
    cutRule: overrides?.cutRule,
  };
}

// -- Tests --

describe("dbPhasesToPhaseConfigs", () => {
  it("converts a single Swiss phase correctly", () => {
    const dbPhases = [createDBPhase()];
    const configs = dbPhasesToPhaseConfigs(dbPhases);

    expect(configs).toHaveLength(1);
    const config = configs[0]!;
    expect(config.id).toBe("db-1");
    expect(config.name).toBe("Swiss Rounds");
    expect(config.phaseType).toBe("swiss");
    expect(config.bestOf).toBe(3);
    expect(config.roundTimeMinutes).toBe(50);
    expect(config.checkInTimeMinutes).toBe(5);
    expect(config.plannedRounds).toBe(6);
    expect(config.cutRule).toBeUndefined();
  });

  it("converts an elimination phase with cut rule", () => {
    const dbPhases = [
      createDBPhase({
        id: 2,
        name: "Top Cut",
        phase_order: 2,
        phase_type: "single_elimination",
        cut_rule: "top-8",
      }),
    ];
    const configs = dbPhasesToPhaseConfigs(dbPhases);

    expect(configs).toHaveLength(1);
    expect(configs[0]!.phaseType).toBe("single_elimination");
    expect(configs[0]!.cutRule).toBe("top-8");
  });

  it("sorts phases by phase_order", () => {
    const dbPhases = [
      createDBPhase({ id: 2, name: "Top Cut", phase_order: 2 }),
      createDBPhase({ id: 1, name: "Swiss Rounds", phase_order: 1 }),
    ];
    const configs = dbPhasesToPhaseConfigs(dbPhases);

    expect(configs[0]!.name).toBe("Swiss Rounds");
    expect(configs[1]!.name).toBe("Top Cut");
  });

  it("defaults to 'swiss' for unknown phase types", () => {
    const dbPhases = [createDBPhase({ phase_type: "unknown_type" })];
    const configs = dbPhasesToPhaseConfigs(dbPhases);

    expect(configs[0]!.phaseType).toBe("swiss");
  });

  it("defaults to bestOf 3 for invalid best_of values", () => {
    const dbPhases = [createDBPhase({ best_of: 7 })];
    const configs = dbPhasesToPhaseConfigs(dbPhases);

    expect(configs[0]!.bestOf).toBe(3);
  });

  it("defaults to bestOf 3 when best_of is null", () => {
    const dbPhases = [createDBPhase({ best_of: null })];
    const configs = dbPhasesToPhaseConfigs(dbPhases);

    expect(configs[0]!.bestOf).toBe(3);
  });

  it("defaults roundTimeMinutes to 50 when null", () => {
    const dbPhases = [createDBPhase({ round_time_minutes: null })];
    const configs = dbPhasesToPhaseConfigs(dbPhases);

    expect(configs[0]!.roundTimeMinutes).toBe(50);
  });

  it("defaults checkInTimeMinutes to 5 when null", () => {
    const dbPhases = [createDBPhase({ check_in_time_minutes: null })];
    const configs = dbPhasesToPhaseConfigs(dbPhases);

    expect(configs[0]!.checkInTimeMinutes).toBe(5);
  });

  it("sets plannedRounds to undefined when null", () => {
    const dbPhases = [createDBPhase({ planned_rounds: null })];
    const configs = dbPhasesToPhaseConfigs(dbPhases);

    expect(configs[0]!.plannedRounds).toBeUndefined();
  });

  it("sets cutRule to undefined for invalid cut rules", () => {
    const dbPhases = [createDBPhase({ cut_rule: "invalid-rule" })];
    const configs = dbPhasesToPhaseConfigs(dbPhases);

    expect(configs[0]!.cutRule).toBeUndefined();
  });

  it("handles valid cut rules correctly", () => {
    const validCutRules = [
      "x-1",
      "x-2",
      "x-3",
      "top-4",
      "top-8",
      "top-16",
      "top-32",
    ] as const;

    for (const rule of validCutRules) {
      const dbPhases = [createDBPhase({ cut_rule: rule })];
      const configs = dbPhasesToPhaseConfigs(dbPhases);
      expect(configs[0]!.cutRule).toBe(rule);
    }
  });

  it("handles empty array input", () => {
    expect(dbPhasesToPhaseConfigs([])).toEqual([]);
  });

  it("handles valid bestOf values (1, 3, 5)", () => {
    for (const bo of [1, 3, 5] as const) {
      const dbPhases = [createDBPhase({ best_of: bo })];
      const configs = dbPhasesToPhaseConfigs(dbPhases);
      expect(configs[0]!.bestOf).toBe(bo);
    }
  });

  it("recognizes all valid phase types", () => {
    const validTypes = [
      "swiss",
      "single_elimination",
      "double_elimination",
    ] as const;

    for (const type of validTypes) {
      const dbPhases = [createDBPhase({ phase_type: type })];
      const configs = dbPhasesToPhaseConfigs(dbPhases);
      expect(configs[0]!.phaseType).toBe(type);
    }
  });
});

describe("phaseConfigToDbUpdate", () => {
  it("converts a PhaseConfig to DBPhaseUpdate format", () => {
    const phase = createPhaseConfig({
      id: "db-42",
      name: "Swiss Rounds",
      phaseType: "swiss",
      bestOf: 3,
      roundTimeMinutes: 50,
      checkInTimeMinutes: 5,
      plannedRounds: 6,
    });

    const update = phaseConfigToDbUpdate(phase, 1);

    expect(update.id).toBe(42); // Extracted from "db-42"
    expect(update.name).toBe("Swiss Rounds");
    expect(update.phase_order).toBe(1);
    expect(update.phase_type).toBe("swiss");
    expect(update.best_of).toBe(3);
    expect(update.round_time_minutes).toBe(50);
    expect(update.check_in_time_minutes).toBe(5);
    expect(update.planned_rounds).toBe(6);
    expect(update.cut_rule).toBeNull();
  });

  it("sets id to undefined for new phases (non-db- prefix)", () => {
    const phase = createPhaseConfig({
      id: "phase-new-123",
    });

    const update = phaseConfigToDbUpdate(phase, 1);
    expect(update.id).toBeUndefined();
  });

  it("extracts numeric DB ID from 'db-' prefixed IDs", () => {
    const phase = createPhaseConfig({ id: "db-99" });
    const update = phaseConfigToDbUpdate(phase, 2);
    expect(update.id).toBe(99);
  });

  it("converts cut rule correctly", () => {
    const phase = createPhaseConfig({
      phaseType: "single_elimination",
      cutRule: "top-8",
    });

    const update = phaseConfigToDbUpdate(phase, 2);
    expect(update.cut_rule).toBe("top-8");
  });

  it("sets planned_rounds to null when undefined", () => {
    const phase = createPhaseConfig({
      plannedRounds: undefined,
    });

    const update = phaseConfigToDbUpdate(phase, 1);
    expect(update.planned_rounds).toBeNull();
  });

  it("sets cut_rule to null when undefined", () => {
    const phase = createPhaseConfig({
      cutRule: undefined,
    });

    const update = phaseConfigToDbUpdate(phase, 1);
    expect(update.cut_rule).toBeNull();
  });

  it("uses the provided order parameter", () => {
    const phase = createPhaseConfig();
    const update = phaseConfigToDbUpdate(phase, 5);
    expect(update.phase_order).toBe(5);
  });
});

describe("phaseConfigsToDbUpdates", () => {
  it("converts an array of configs with correct ordering", () => {
    const phases = [
      createPhaseConfig({ id: "db-1", name: "Swiss" }),
      createPhaseConfig({ id: "db-2", name: "Top Cut" }),
    ];

    const updates = phaseConfigsToDbUpdates(phases);

    expect(updates).toHaveLength(2);
    expect(updates[0]!.phase_order).toBe(1); // 0-based index + 1
    expect(updates[1]!.phase_order).toBe(2);
    expect(updates[0]!.name).toBe("Swiss");
    expect(updates[1]!.name).toBe("Top Cut");
  });

  it("returns empty array for empty input", () => {
    expect(phaseConfigsToDbUpdates([])).toEqual([]);
  });
});

describe("createDefaultSwissPhase", () => {
  it("returns a Swiss phase with default values", () => {
    const phase = createDefaultSwissPhase();

    expect(phase.name).toBe("Swiss Rounds");
    expect(phase.phaseType).toBe("swiss");
    expect(phase.bestOf).toBe(3);
    expect(phase.roundTimeMinutes).toBe(50);
    expect(phase.checkInTimeMinutes).toBe(5);
    expect(phase.plannedRounds).toBeUndefined();
    expect(phase.cutRule).toBeUndefined();
  });

  it("generates a unique ID starting with 'phase-'", () => {
    const phase = createDefaultSwissPhase();
    expect(phase.id).toMatch(/^phase-/);
  });

  it("generates different IDs on each call", () => {
    const phase1 = createDefaultSwissPhase();
    // Small delay to ensure different timestamp
    const phase2 = createDefaultSwissPhase();
    // IDs should be different (includes timestamp + random suffix)
    // Note: in very fast execution they could theoretically collide,
    // but the random suffix makes it extremely unlikely
    expect(phase1.id).not.toBe(phase2.id);
  });
});

describe("createDefaultEliminationPhase", () => {
  it("returns an elimination phase with cut rule when preceded by Swiss", () => {
    const phase = createDefaultEliminationPhase(true);

    expect(phase.name).toBe("Top Cut");
    expect(phase.phaseType).toBe("single_elimination");
    expect(phase.bestOf).toBe(3);
    expect(phase.roundTimeMinutes).toBe(50);
    expect(phase.checkInTimeMinutes).toBe(5);
    expect(phase.cutRule).toBe("x-2"); // Default cut rule when preceded by Swiss
  });

  it("returns an elimination phase without cut rule when standalone", () => {
    const phase = createDefaultEliminationPhase(false);

    expect(phase.name).toBe("Top Cut");
    expect(phase.phaseType).toBe("single_elimination");
    expect(phase.cutRule).toBeUndefined();
  });

  it("generates a unique ID starting with 'phase-'", () => {
    const phase = createDefaultEliminationPhase(true);
    expect(phase.id).toMatch(/^phase-/);
  });
});

describe("getDefaultPhaseName", () => {
  it("returns 'Swiss Rounds' for swiss type", () => {
    expect(getDefaultPhaseName("swiss")).toBe("Swiss Rounds");
  });

  it("returns 'Top Cut' for single_elimination type", () => {
    expect(getDefaultPhaseName("single_elimination")).toBe("Top Cut");
  });

  it("returns 'Double Elimination' for double_elimination type", () => {
    expect(getDefaultPhaseName("double_elimination")).toBe(
      "Double Elimination"
    );
  });
});

describe("getDefaultRoundTime", () => {
  it("returns 25 minutes for Best of 1", () => {
    expect(getDefaultRoundTime(1)).toBe(25);
  });

  it("returns 50 minutes for Best of 3", () => {
    expect(getDefaultRoundTime(3)).toBe(50);
  });

  it("returns 75 minutes for Best of 5", () => {
    expect(getDefaultRoundTime(5)).toBe(75);
  });
});
