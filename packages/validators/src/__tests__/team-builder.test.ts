import {
  teamNameSchema,
  teamFormatSchema,
  createTeamInputSchema,
  updateTeamInputSchema,
  deleteTeamInputSchema,
  forkTeamInputSchema,
  addPokemonInputSchema,
  updatePokemonInputSchema,
  removePokemonInputSchema,
  teamPositionSchema,
  reorderTeamPokemonInputSchema,
} from "../team-builder";

// =============================================================================
// teamNameSchema
// =============================================================================

describe("teamNameSchema", () => {
  it.each(["Rain Team", "a", "x".repeat(100)])(
    "accepts valid name %j",
    (name) => {
      expect(teamNameSchema.safeParse(name).success).toBe(true);
    }
  );

  it("trims whitespace from name", () => {
    const result = teamNameSchema.safeParse("  Rain Team  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("Rain Team");
  });

  it.each(["", " ", "x".repeat(101)])("rejects invalid name %j", (name) => {
    expect(teamNameSchema.safeParse(name).success).toBe(false);
  });
});

// =============================================================================
// teamFormatSchema
// =============================================================================

describe("teamFormatSchema", () => {
  it.each(["gen9vgc2026regi", "vgc2025", "x".repeat(50)])(
    "accepts valid format %j",
    (format) => {
      expect(teamFormatSchema.safeParse(format).success).toBe(true);
    }
  );

  it("trims whitespace from format", () => {
    const result = teamFormatSchema.safeParse("  gen9vgc2026regi  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("gen9vgc2026regi");
  });

  it.each(["", "  ", "x".repeat(51)])("rejects invalid format %j", (format) => {
    expect(teamFormatSchema.safeParse(format).success).toBe(false);
  });
});

// =============================================================================
// createTeamInputSchema
// =============================================================================

describe("createTeamInputSchema", () => {
  const valid = { altId: 1, name: "Rain Team", format: "gen9vgc2026regi" };

  it("accepts valid input", () => {
    expect(createTeamInputSchema.safeParse(valid).success).toBe(true);
  });

  it.each<[Record<string, unknown>, string]>([
    [{ ...valid, altId: 0 }, "altId: 0"],
    [{ ...valid, altId: -1 }, "altId: -1"],
    [{ ...valid, name: "" }, "empty name"],
    [{ ...valid, format: "" }, "empty format"],
    [{ altId: 1, name: "Rain Team" }, "missing format"],
    [{ altId: 1, format: "gen9vgc2026regi" }, "missing name"],
    [{}, "empty object"],
  ])("rejects input with %s", (input, _label) => {
    expect(createTeamInputSchema.safeParse(input).success).toBe(false);
  });
});

// =============================================================================
// updateTeamInputSchema
// =============================================================================

describe("updateTeamInputSchema", () => {
  it("accepts valid teamId", () => {
    expect(updateTeamInputSchema.safeParse({ teamId: 1 }).success).toBe(true);
  });

  it.each([0, -1, "abc"])("rejects teamId: %j", (teamId) => {
    expect(updateTeamInputSchema.safeParse({ teamId }).success).toBe(false);
  });
});

// =============================================================================
// deleteTeamInputSchema
// =============================================================================

describe("deleteTeamInputSchema", () => {
  it("accepts valid teamId", () => {
    expect(deleteTeamInputSchema.safeParse({ teamId: 5 }).success).toBe(true);
  });

  it.each([0, -1])("rejects teamId: %j", (teamId) => {
    expect(deleteTeamInputSchema.safeParse({ teamId }).success).toBe(false);
  });
});

// =============================================================================
// forkTeamInputSchema
// =============================================================================

describe("forkTeamInputSchema", () => {
  const valid = { sourceTeamId: 1, targetAltId: 2 };

  it("accepts valid input without newName", () => {
    expect(forkTeamInputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts valid input with newName", () => {
    expect(
      forkTeamInputSchema.safeParse({ ...valid, newName: "My Fork" }).success
    ).toBe(true);
  });

  it("rejects overlong newName", () => {
    expect(
      forkTeamInputSchema.safeParse({ ...valid, newName: "x".repeat(101) })
        .success
    ).toBe(false);
  });

  it.each<[Record<string, unknown>, string]>([
    [{ ...valid, sourceTeamId: 0 }, "sourceTeamId: 0"],
    [{ ...valid, targetAltId: -1 }, "targetAltId: -1"],
    [{ sourceTeamId: 1 }, "missing targetAltId"],
  ])("rejects input with %s", (input, _label) => {
    expect(forkTeamInputSchema.safeParse(input).success).toBe(false);
  });
});

// =============================================================================
// addPokemonInputSchema
// =============================================================================

describe("addPokemonInputSchema", () => {
  it.each([1, 3, 6])("accepts position %d", (position) => {
    expect(
      addPokemonInputSchema.safeParse({ teamId: 1, position }).success
    ).toBe(true);
  });

  it.each([0, 7, -1])("rejects position %d", (position) => {
    expect(
      addPokemonInputSchema.safeParse({ teamId: 1, position }).success
    ).toBe(false);
  });

  it("rejects invalid teamId", () => {
    expect(
      addPokemonInputSchema.safeParse({ teamId: 0, position: 1 }).success
    ).toBe(false);
  });
});

// =============================================================================
// updatePokemonInputSchema
// =============================================================================

describe("updatePokemonInputSchema", () => {
  it("accepts valid pokemonId", () => {
    expect(updatePokemonInputSchema.safeParse({ pokemonId: 42 }).success).toBe(
      true
    );
  });

  it.each([0, -1])("rejects pokemonId: %d", (pokemonId) => {
    expect(updatePokemonInputSchema.safeParse({ pokemonId }).success).toBe(
      false
    );
  });
});

// =============================================================================
// removePokemonInputSchema
// =============================================================================

describe("removePokemonInputSchema", () => {
  it("accepts valid teamId and pokemonId", () => {
    expect(
      removePokemonInputSchema.safeParse({ teamId: 1, pokemonId: 42 }).success
    ).toBe(true);
  });

  it.each<[Record<string, unknown>, string]>([
    [{ teamId: 0, pokemonId: 1 }, "teamId: 0"],
    [{ teamId: 1, pokemonId: 0 }, "pokemonId: 0"],
    [{ teamId: 1 }, "missing pokemonId"],
    [{ pokemonId: 1 }, "missing teamId"],
  ])("rejects input with %s", (input, _label) => {
    expect(removePokemonInputSchema.safeParse(input).success).toBe(false);
  });
});

// =============================================================================
// teamPositionSchema
// =============================================================================

describe("teamPositionSchema", () => {
  it.each([1, 2, 3, 4, 5, 6])("accepts position %d", (position) => {
    expect(
      teamPositionSchema.safeParse({ pokemonId: 1, position }).success
    ).toBe(true);
  });

  it.each([0, 7, -1])("rejects position %d", (position) => {
    expect(
      teamPositionSchema.safeParse({ pokemonId: 1, position }).success
    ).toBe(false);
  });
});

// =============================================================================
// reorderTeamPokemonInputSchema
// =============================================================================

describe("reorderTeamPokemonInputSchema", () => {
  const pos = (pokemonId: number, position: number) => ({
    pokemonId,
    position,
  });

  it("accepts a valid reorder with one entry", () => {
    expect(
      reorderTeamPokemonInputSchema.safeParse({
        teamId: 1,
        positions: [pos(10, 1)],
      }).success
    ).toBe(true);
  });

  it("accepts a full team reorder (6 entries)", () => {
    const positions = [1, 2, 3, 4, 5, 6].map((p) => pos(p * 10, p));
    expect(
      reorderTeamPokemonInputSchema.safeParse({ teamId: 1, positions }).success
    ).toBe(true);
  });

  it("rejects empty positions array", () => {
    expect(
      reorderTeamPokemonInputSchema.safeParse({ teamId: 1, positions: [] })
        .success
    ).toBe(false);
  });

  it("rejects positions array with 7 entries", () => {
    const positions = [1, 2, 3, 4, 5, 6, 7].map((p) => pos(p * 10, p));
    expect(
      reorderTeamPokemonInputSchema.safeParse({ teamId: 1, positions }).success
    ).toBe(false);
  });

  it("rejects invalid position values within entries", () => {
    expect(
      reorderTeamPokemonInputSchema.safeParse({
        teamId: 1,
        positions: [pos(10, 0)],
      }).success
    ).toBe(false);
  });

  it("rejects invalid teamId", () => {
    expect(
      reorderTeamPokemonInputSchema.safeParse({
        teamId: 0,
        positions: [pos(10, 1)],
      }).success
    ).toBe(false);
  });
});
