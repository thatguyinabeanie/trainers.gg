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
  pokemonPayloadSchema,
  pokemonUpdateSchema,
  teamUpdateDataSchema,
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

// =============================================================================
// pokemonPayloadSchema
// =============================================================================

describe("pokemonPayloadSchema", () => {
  const minimalValid = { species: "Pikachu" };

  it("accepts a minimal payload with only species", () => {
    expect(pokemonPayloadSchema.safeParse(minimalValid).success).toBe(true);
  });

  it("applies default values when optional fields are omitted", () => {
    const result = pokemonPayloadSchema.safeParse(minimalValid);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.ability).toBe("");
    expect(result.data.nature).toBe("");
    expect(result.data.level).toBe(50);
    expect(result.data.is_shiny).toBe(false);
    expect(result.data.move1).toBe("");
    expect(result.data.ev_hp).toBe(0);
    expect(result.data.ev_attack).toBe(0);
    expect(result.data.ev_defense).toBe(0);
    expect(result.data.ev_special_attack).toBe(0);
    expect(result.data.ev_special_defense).toBe(0);
    expect(result.data.ev_speed).toBe(0);
    expect(result.data.iv_hp).toBe(31);
    expect(result.data.iv_attack).toBe(31);
    expect(result.data.iv_defense).toBe(31);
    expect(result.data.iv_special_attack).toBe(31);
    expect(result.data.iv_special_defense).toBe(31);
    expect(result.data.iv_speed).toBe(31);
  });

  it("preserves explicitly provided values over defaults", () => {
    const result = pokemonPayloadSchema.safeParse({
      species: "Charizard",
      ability: "Blaze",
      nature: "Timid",
      level: 100,
      is_shiny: true,
      move1: "Flamethrower",
      ev_speed: 252,
      iv_attack: 0,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.ability).toBe("Blaze");
    expect(result.data.nature).toBe("Timid");
    expect(result.data.level).toBe(100);
    expect(result.data.is_shiny).toBe(true);
    expect(result.data.move1).toBe("Flamethrower");
    expect(result.data.ev_speed).toBe(252);
    expect(result.data.iv_attack).toBe(0);
  });

  it("accepts optional nullable fields as null", () => {
    const result = pokemonPayloadSchema.safeParse({
      species: "Snorlax",
      held_item: null,
      nickname: null,
      gender: null,
      move2: null,
      tera_type: null,
      notes: null,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.held_item).toBeNull();
    expect(result.data.nickname).toBeNull();
    expect(result.data.gender).toBeNull();
    expect(result.data.move2).toBeNull();
    expect(result.data.tera_type).toBeNull();
    expect(result.data.notes).toBeNull();
  });

  it.each<[string, string]>([
    ["Male", "Male"],
    ["Female", "Female"],
  ])("accepts gender %j", (input, expected) => {
    const result = pokemonPayloadSchema.safeParse({
      species: "Ralts",
      gender: input,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.gender).toBe(expected);
  });

  it("rejects invalid gender value", () => {
    expect(
      pokemonPayloadSchema.safeParse({ species: "Ralts", gender: "Unknown" })
        .success
    ).toBe(false);
  });

  it("rejects missing species", () => {
    expect(pokemonPayloadSchema.safeParse({}).success).toBe(false);
  });

  it("rejects empty species string", () => {
    expect(pokemonPayloadSchema.safeParse({ species: "" }).success).toBe(false);
  });

  it.each<[string, unknown, string]>([
    ["species", "x".repeat(51), "species over 50 chars"],
    ["level", 0, "level below 1"],
    ["level", 101, "level above 100"],
    ["ev_hp", -1, "ev_hp below 0"],
    ["ev_hp", 253, "ev_hp above 252"],
    ["iv_attack", -1, "iv_attack below 0"],
    ["iv_attack", 32, "iv_attack above 31"],
  ])("rejects invalid %s (%s)", (field, value, _label) => {
    expect(
      pokemonPayloadSchema.safeParse({ species: "Bulbasaur", [field]: value })
        .success
    ).toBe(false);
  });
});

// =============================================================================
// pokemonUpdateSchema
// =============================================================================

describe("pokemonUpdateSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(pokemonUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("does NOT inject defaults for omitted fields", () => {
    const result = pokemonUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;

    // Every field should be undefined when not supplied — no defaults
    expect(result.data.ability).toBeUndefined();
    expect(result.data.nature).toBeUndefined();
    expect(result.data.level).toBeUndefined();
    expect(result.data.is_shiny).toBeUndefined();
    expect(result.data.move1).toBeUndefined();
    expect(result.data.ev_hp).toBeUndefined();
    expect(result.data.ev_attack).toBeUndefined();
    expect(result.data.ev_defense).toBeUndefined();
    expect(result.data.ev_special_attack).toBeUndefined();
    expect(result.data.ev_special_defense).toBeUndefined();
    expect(result.data.ev_speed).toBeUndefined();
    expect(result.data.iv_hp).toBeUndefined();
    expect(result.data.iv_attack).toBeUndefined();
    expect(result.data.iv_defense).toBeUndefined();
    expect(result.data.iv_special_attack).toBeUndefined();
    expect(result.data.iv_special_defense).toBeUndefined();
    expect(result.data.iv_speed).toBeUndefined();
    expect(result.data.species).toBeUndefined();
    expect(result.data.notes).toBeUndefined();
  });

  it("passes through only the fields that were provided", () => {
    const result = pokemonUpdateSchema.safeParse({
      ability: "Intimidate",
      level: 50,
      ev_speed: 252,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.ability).toBe("Intimidate");
    expect(result.data.level).toBe(50);
    expect(result.data.ev_speed).toBe(252);
    // Unrelated fields remain absent
    expect(result.data.nature).toBeUndefined();
    expect(result.data.species).toBeUndefined();
  });

  it("accepts partial updates with nullable fields set to null", () => {
    const result = pokemonUpdateSchema.safeParse({
      held_item: null,
      move2: null,
      tera_type: null,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.held_item).toBeNull();
    expect(result.data.move2).toBeNull();
    expect(result.data.tera_type).toBeNull();
  });

  it.each<[string, unknown, string]>([
    ["species", "", "empty species string"],
    ["species", "x".repeat(51), "species over 50 chars"],
    ["level", 0, "level below 1"],
    ["level", 101, "level above 100"],
    ["ev_hp", -1, "ev_hp below 0"],
    ["ev_hp", 253, "ev_hp above 252"],
    ["iv_speed", 32, "iv_speed above 31"],
    ["gender", "Genderless", "invalid gender value"],
  ])("rejects invalid %s (%s)", (field, value, _label) => {
    expect(pokemonUpdateSchema.safeParse({ [field]: value }).success).toBe(
      false
    );
  });
});

// =============================================================================
// pokemonPayloadSchema — EV cap
// =============================================================================

describe("pokemonPayloadSchema — EV cap", () => {
  it("rejects when total EVs exceed 510", () => {
    // 252 + 252 + 8 = 512 — over the cap
    const result = pokemonPayloadSchema.safeParse({
      species: "Garchomp",
      ev_hp: 252,
      ev_attack: 252,
      ev_defense: 8,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const issue = result.error.issues[0];
    expect(issue).toBeDefined();
    expect(issue?.path).toEqual(["ev_hp"]);
    expect(issue?.message).toMatch(/510/);
    expect(issue?.message).toMatch(/512/);
  });

  it("accepts exactly 510 total EVs", () => {
    // 252 + 252 + 6 = 510 — at the cap
    const result = pokemonPayloadSchema.safeParse({
      species: "Garchomp",
      ev_hp: 252,
      ev_attack: 252,
      ev_defense: 6,
    });
    expect(result.success).toBe(true);
  });

  it("accepts total EVs below 510", () => {
    // 252 + 252 = 504 — under the cap
    const result = pokemonPayloadSchema.safeParse({
      species: "Garchomp",
      ev_hp: 252,
      ev_attack: 252,
    });
    expect(result.success).toBe(true);
  });

  it("accepts zero total EVs (all defaults)", () => {
    expect(pokemonPayloadSchema.safeParse({ species: "Snorlax" }).success).toBe(
      true
    );
  });
});

// =============================================================================
// teamUpdateDataSchema
// =============================================================================

describe("teamUpdateDataSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(teamUpdateDataSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a fully populated valid payload", () => {
    const result = teamUpdateDataSchema.safeParse({
      name: "Rain Team",
      format: "gen9vgc2026regi",
      description: "A rain-based team",
      notes: "Remember to set up rain turn 1",
      tags: ["rain", "trick-room"],
      is_public: true,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.name).toBe("Rain Team");
    expect(result.data.format).toBe("gen9vgc2026regi");
    expect(result.data.description).toBe("A rain-based team");
    expect(result.data.notes).toBe("Remember to set up rain turn 1");
    expect(result.data.tags).toEqual(["rain", "trick-room"]);
    expect(result.data.is_public).toBe(true);
  });

  it("accepts nullable fields as null", () => {
    const result = teamUpdateDataSchema.safeParse({
      description: null,
      notes: null,
      tags: null,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.description).toBeNull();
    expect(result.data.notes).toBeNull();
    expect(result.data.tags).toBeNull();
  });

  it("strips disallowed fields (created_by)", () => {
    const result = teamUpdateDataSchema.safeParse({
      name: "My Team",
      created_by: "some-user-id",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    // created_by must not appear in the parsed output
    expect("created_by" in result.data).toBe(false);
  });

  it("strips disallowed fields (parent_team_id)", () => {
    const result = teamUpdateDataSchema.safeParse({
      name: "My Fork",
      parent_team_id: 42,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect("parent_team_id" in result.data).toBe(false);
  });

  it("validates name length (rejects > 100 chars)", () => {
    expect(
      teamUpdateDataSchema.safeParse({ name: "x".repeat(101) }).success
    ).toBe(false);
  });

  it("validates name (rejects empty string after trim)", () => {
    expect(teamUpdateDataSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("trims name whitespace", () => {
    const result = teamUpdateDataSchema.safeParse({ name: "  Rain Team  " });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.name).toBe("Rain Team");
  });

  it("validates description max length (rejects > 500 chars)", () => {
    expect(
      teamUpdateDataSchema.safeParse({ description: "x".repeat(501) }).success
    ).toBe(false);
  });

  it("validates notes max length (rejects > 2000 chars)", () => {
    expect(
      teamUpdateDataSchema.safeParse({ notes: "x".repeat(2001) }).success
    ).toBe(false);
  });

  it("validates tags max count (rejects > 10 tags)", () => {
    expect(
      teamUpdateDataSchema.safeParse({
        tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
      }).success
    ).toBe(false);
  });

  it("validates individual tag max length (rejects tag > 50 chars)", () => {
    expect(
      teamUpdateDataSchema.safeParse({ tags: ["x".repeat(51)] }).success
    ).toBe(false);
  });

  it("accepts exactly 10 tags", () => {
    expect(
      teamUpdateDataSchema.safeParse({
        tags: Array.from({ length: 10 }, (_, i) => `tag${i}`),
      }).success
    ).toBe(true);
  });
});
