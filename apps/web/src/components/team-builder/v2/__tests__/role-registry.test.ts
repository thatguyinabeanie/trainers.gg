import {
  GROUP_COLORS,
  ROLE_GROUP_LABELS,
  ROLE_GROUP_ORDER,
  ROLE_PRESETS,
  getRoleById,
  getRolesForMove,
  getRolesForSpecies,
} from "../pickers/role-registry";

describe("role-registry", () => {
  // -----------------------------------------------------------------------
  // Registry shape
  // -----------------------------------------------------------------------

  it("has 26 presets", () => {
    expect(ROLE_PRESETS).toHaveLength(26);
  });

  it("every preset id is unique", () => {
    const ids = ROLE_PRESETS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every preset group is one of the 7 valid RoleGroups", () => {
    const validGroups = new Set(ROLE_GROUP_ORDER);
    for (const role of ROLE_PRESETS) {
      expect(validGroups.has(role.group)).toBe(true);
    }
  });

  it("every group in ROLE_GROUP_ORDER has at least one preset", () => {
    for (const g of ROLE_GROUP_ORDER) {
      expect(ROLE_PRESETS.some((r) => r.group === g)).toBe(true);
    }
  });

  // -----------------------------------------------------------------------
  // Color and label maps
  // -----------------------------------------------------------------------

  it("GROUP_COLORS has an entry per group", () => {
    for (const g of ROLE_GROUP_ORDER) expect(GROUP_COLORS[g]).toBeDefined();
  });

  it("ROLE_GROUP_LABELS has an entry per group", () => {
    for (const g of ROLE_GROUP_ORDER)
      expect(ROLE_GROUP_LABELS[g]).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // getRoleById
  // -----------------------------------------------------------------------

  it("getRoleById returns the correct preset for a known id", () => {
    const role = getRoleById("drop-atk");
    expect(role?.id).toBe("drop-atk");
    expect(role?.group).toBe("stat-changes");
  });

  it("getRoleById returns undefined for an unknown id", () => {
    expect(getRoleById("bogus-id")).toBeUndefined();
  });

  it("drop-atk has Intimidate ability", () => {
    expect(getRoleById("drop-atk")?.abilities).toContain("Intimidate");
  });

  // -----------------------------------------------------------------------
  // getRolesForMove — O(1) reverse-index
  // -----------------------------------------------------------------------

  it("getRolesForMove returns role ids for a known move", () => {
    expect(getRolesForMove("Heat Wave")).toEqual(
      expect.arrayContaining(["spread", "burn"])
    );
  });

  it("getRolesForMove returns empty for an unknown move", () => {
    expect(getRolesForMove("Tackle")).toEqual([]);
  });

  it("getRolesForMove returns the same array reference on repeat calls (memoized)", () => {
    const first = getRolesForMove("Earthquake");
    const second = getRolesForMove("Earthquake");
    expect(first).toBe(second);
  });

  it("getRolesForMove handles a move that appears in multiple roles", () => {
    // Trick Room appears in both speed-control and disruption
    const roles = getRolesForMove("Trick Room");
    expect(roles).toContain("trick-room");
    expect(roles).toContain("disruption");
  });
});

// -----------------------------------------------------------------------
// getRolesForSpecies — format-aware role computation
// -----------------------------------------------------------------------

describe("getRolesForSpecies", () => {
  it("returns matching roles when species has an ability in role.abilities", () => {
    // Incineroar has Intimidate as a hidden ability → drop-atk role
    // Use a format ID we know is registered so getLegalMoves returns a real set
    // (which won't include moves Incineroar can't learn, filtering out false positives)
    const result = getRolesForSpecies(
      { slot1: "Blaze", slot2: null, hidden: "Intimidate" },
      "Incineroar",
      "gen9vgc2026regi"
    );
    expect(result).toContain("drop-atk");
  });

  it("returns matching roles when species can learn a move in role.moves", () => {
    // Charizard learns Heat Wave (spread + burn roles) in gen9vgc2026regi
    const result = getRolesForSpecies(
      { slot1: "Blaze", slot2: null, hidden: "Solar Power" },
      "Charizard",
      "gen9vgc2026regi"
    );
    expect(result).toContain("spread"); // Heat Wave is a spread move
    expect(result).toContain("burn"); // Heat Wave is also a burn move
  });

  it("returns roles via both ability AND move paths together", () => {
    // Incineroar: Intimidate (hidden) → drop-atk; U-turn in learnset → pivot
    const result = getRolesForSpecies(
      { slot1: "Blaze", slot2: null, hidden: "Intimidate" },
      "Incineroar",
      "gen9vgc2026regi"
    );
    expect(result).toContain("drop-atk"); // via Intimidate ability
    expect(result).toContain("pivot"); // via U-turn or Parting Shot
  });

  it("falls back to getLearnableMoves when format has no registered legality", () => {
    // Non-existent format → getLegalMoves returns undefined → legalSetOrPermissive
    // returns undefined → getRolesForSpecies falls back to getLearnableMoves, which
    // returns all gen-9 moves for any known species → many roles will match
    const result = getRolesForSpecies(
      { slot1: "Levitate", slot2: null, hidden: null },
      "Garchomp",
      "nonexistent-format-id"
    );
    // All-moves fallback means roles with a moves array match → non-empty result
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty array when species has no role-fitting abilities or moves", () => {
    // Bogus species → getLearnableMoves returns [] (species doesn't exist in dex)
    // → learnableSet is an empty Set → no move matches; generic ability (Pressure)
    // isn't in any role.abilities list → result is empty
    const result = getRolesForSpecies(
      { slot1: "Pressure", slot2: null, hidden: null },
      "BogusNonexistentSpecies",
      "gen9vgc2026regi"
    );
    expect(result).toEqual([]);
  });
});
