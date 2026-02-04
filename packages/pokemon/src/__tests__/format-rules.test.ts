import {
  FORMAT_RULES,
  validateTeamForFormat,
  getFormatDescription,
  type FormatRule,
} from "../format-rules";

// -- Helper: builds a valid VGC 2024 team --
function makeValidVgcTeam() {
  return {
    pokemon: [
      {
        species: "Pikachu",
        heldItem: "Light Ball",
        ability: "Static",
        moves: ["Thunderbolt", "Volt Switch", "Surf", "Protect"],
        level: 50,
      },
      {
        species: "Charizard",
        heldItem: "Choice Specs",
        ability: "Solar Power",
        moves: ["Flamethrower", "Air Slash", "Dragon Pulse", "Focus Blast"],
        level: 50,
      },
      {
        species: "Garchomp",
        heldItem: "Life Orb",
        ability: "Rough Skin",
        moves: ["Earthquake", "Dragon Claw", "Rock Slide", "Protect"],
        level: 50,
      },
      {
        species: "Amoonguss",
        heldItem: "Sitrus Berry",
        ability: "Regenerator",
        moves: ["Spore", "Pollen Puff", "Rage Powder", "Protect"],
        level: 50,
      },
    ],
  };
}

describe("FORMAT_RULES", () => {
  it("contains vgc2024 format", () => {
    expect(FORMAT_RULES["vgc2024"]).toBeDefined();
    expect(FORMAT_RULES["vgc2024"]!.name).toBe("VGC 2024 Regulation G");
  });

  it("contains singles6v6 format", () => {
    expect(FORMAT_RULES["singles6v6"]).toBeDefined();
    expect(FORMAT_RULES["singles6v6"]!.name).toBe("Singles 6v6");
  });

  it("contains battlespot format", () => {
    expect(FORMAT_RULES["battlespot"]).toBeDefined();
    expect(FORMAT_RULES["battlespot"]!.name).toBe("Battle Spot Singles");
  });

  it("contains anythinggoes format", () => {
    expect(FORMAT_RULES["anythinggoes"]).toBeDefined();
    expect(FORMAT_RULES["anythinggoes"]!.name).toBe("Anything Goes");
  });

  it("vgc2024 has correct team size constraints", () => {
    const rules = FORMAT_RULES["vgc2024"]!;
    expect(rules.teamSize.min).toBe(4);
    expect(rules.teamSize.max).toBe(6);
    expect(rules.battleSize).toBe(4);
  });

  it("vgc2024 enforces item clause and species clause", () => {
    const rules = FORMAT_RULES["vgc2024"]!;
    expect(rules.itemClause).toBe(true);
    expect(rules.speciesClause).toBe(true);
  });

  it("vgc2024 has a restricted Pokemon list with restrictedLimit of 1", () => {
    const rules = FORMAT_RULES["vgc2024"]!;
    expect(rules.restrictedPokemon).toBeDefined();
    expect(rules.restrictedPokemon!.length).toBeGreaterThan(0);
    expect(rules.restrictedLimit).toBe(1);
    expect(rules.restrictedPokemon).toContain("Koraidon");
    expect(rules.restrictedPokemon).toContain("Miraidon");
  });

  it("anythinggoes has no restrictions", () => {
    const rules = FORMAT_RULES["anythinggoes"]!;
    expect(rules.itemClause).toBe(false);
    expect(rules.speciesClause).toBe(false);
    expect(rules.teamSize.min).toBe(1);
    expect(rules.teamSize.max).toBe(6);
    expect(rules.bannedPokemon).toBeUndefined();
  });

  it("singles6v6 bans specific abilities and moves", () => {
    const rules = FORMAT_RULES["singles6v6"]!;
    expect(rules.bannedAbilities).toContain("Moody");
    expect(rules.bannedAbilities).toContain("Shadow Tag");
    expect(rules.bannedMoves).toContain("Baton Pass");
  });
});

describe("validateTeamForFormat", () => {
  describe("with valid teams", () => {
    it("returns isValid: true for a valid VGC team", () => {
      const result = validateTeamForFormat(makeValidVgcTeam(), "vgc2024");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns isValid: true for a valid anything goes team with 1 Pokemon", () => {
      const team = {
        pokemon: [
          {
            species: "Arceus",
            heldItem: "Leftovers",
            ability: "Multitype",
            moves: ["Judgment"],
            level: 100,
          },
        ],
      };
      const result = validateTeamForFormat(team, "anythinggoes");
      expect(result.isValid).toBe(true);
    });
  });

  describe("unknown format", () => {
    it("returns error for unknown format ID", () => {
      const result = validateTeamForFormat(makeValidVgcTeam(), "nonexistent");
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("Unknown format");
    });
  });

  describe("team size violations", () => {
    it("rejects a team with too few Pokemon for the format", () => {
      const team = {
        pokemon: [
          {
            species: "Pikachu",
            heldItem: "Light Ball",
            ability: "Static",
            moves: ["Thunderbolt"],
            level: 50,
          },
        ],
      };
      // vgc2024 requires min 4
      const result = validateTeamForFormat(team, "vgc2024");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("at least 4"))).toBe(true);
    });

    it("rejects a team with too many Pokemon", () => {
      const team = makeValidVgcTeam();
      // Add 3 more to exceed 6
      team.pokemon.push(
        {
          species: "Dondozo",
          heldItem: "Assault Vest",
          ability: "Unaware",
          moves: ["Wave Crash"],
          level: 50,
        },
        {
          species: "Kingambit",
          heldItem: "Black Glasses",
          ability: "Defiant",
          moves: ["Iron Head"],
          level: 50,
        },
        {
          species: "Annihilape",
          heldItem: "Leftovers",
          ability: "Defiant",
          moves: ["Rage Fist"],
          level: 50,
        }
      );
      const result = validateTeamForFormat(team, "vgc2024");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("more than 6"))).toBe(true);
    });
  });

  describe("species clause", () => {
    it("detects duplicate species", () => {
      const team = makeValidVgcTeam();
      // Duplicate Pikachu
      team.pokemon[1]!.species = "Pikachu";
      const result = validateTeamForFormat(team, "vgc2024");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate species"))).toBe(
        true
      );
      expect(result.errors.some((e) => e.includes("Pikachu"))).toBe(true);
    });

    it("allows duplicate species when species clause is off", () => {
      const team = {
        pokemon: [
          {
            species: "Pikachu",
            heldItem: "Light Ball",
            ability: "Static",
            moves: ["Thunderbolt"],
            level: 100,
          },
          {
            species: "Pikachu",
            heldItem: "Choice Band",
            ability: "Static",
            moves: ["Volt Tackle"],
            level: 100,
          },
        ],
      };
      const result = validateTeamForFormat(team, "anythinggoes");
      expect(result.errors.some((e) => e.includes("Duplicate species"))).toBe(
        false
      );
    });
  });

  describe("item clause", () => {
    it("detects duplicate items", () => {
      const team = makeValidVgcTeam();
      // Give two Pokemon the same item
      team.pokemon[1]!.heldItem = "Light Ball";
      const result = validateTeamForFormat(team, "vgc2024");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate items"))).toBe(
        true
      );
    });

    it("allows duplicate items when item clause is off", () => {
      const team = {
        pokemon: [
          {
            species: "Pikachu",
            heldItem: "Leftovers",
            ability: "Static",
            moves: ["Thunderbolt"],
            level: 100,
          },
          {
            species: "Raichu",
            heldItem: "Leftovers",
            ability: "Static",
            moves: ["Thunderbolt"],
            level: 100,
          },
        ],
      };
      const result = validateTeamForFormat(team, "anythinggoes");
      expect(result.errors.some((e) => e.includes("Duplicate items"))).toBe(
        false
      );
    });
  });

  describe("banned Pokemon", () => {
    it("detects banned Pokemon", () => {
      const team = makeValidVgcTeam();
      team.pokemon[0]!.species = "Arceus"; // Banned in VGC 2024
      const result = validateTeamForFormat(team, "vgc2024");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Banned Pokemon"))).toBe(
        true
      );
      expect(result.errors.some((e) => e.includes("Arceus"))).toBe(true);
    });
  });

  describe("restricted Pokemon", () => {
    it("allows one restricted Pokemon", () => {
      const team = makeValidVgcTeam();
      team.pokemon[0]!.species = "Koraidon";
      const result = validateTeamForFormat(team, "vgc2024");
      // Should not fail on restricted count (only 1)
      expect(result.errors.some((e) => e.includes("Too many restricted"))).toBe(
        false
      );
    });

    it("rejects two restricted Pokemon when limit is 1", () => {
      const team = makeValidVgcTeam();
      team.pokemon[0]!.species = "Koraidon";
      team.pokemon[1]!.species = "Miraidon";
      const result = validateTeamForFormat(team, "vgc2024");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Too many restricted"))).toBe(
        true
      );
    });
  });

  describe("banned items", () => {
    it("detects banned items", () => {
      const team = makeValidVgcTeam();
      team.pokemon[0]!.heldItem = "Skull Fossil"; // Banned in VGC 2024
      const result = validateTeamForFormat(team, "vgc2024");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Banned items"))).toBe(true);
    });
  });

  describe("banned abilities", () => {
    it("detects banned abilities in singles6v6", () => {
      const team = {
        pokemon: Array.from({ length: 6 }, (_, i) => ({
          species: `Pokemon${i}`,
          heldItem: `Item${i}`,
          ability: i === 0 ? "Moody" : "Ability",
          moves: ["Move1"],
          level: 100,
        })),
      };
      const result = validateTeamForFormat(team, "singles6v6");
      expect(result.errors.some((e) => e.includes("Banned abilities"))).toBe(
        true
      );
    });
  });

  describe("banned moves", () => {
    it("detects banned moves in singles6v6", () => {
      const team = {
        pokemon: Array.from({ length: 6 }, (_, i) => ({
          species: `Pokemon${i}`,
          heldItem: `Item${i}`,
          ability: `Ability${i}`,
          moves: i === 0 ? ["Baton Pass"] : ["Tackle"],
          level: 100,
        })),
      };
      const result = validateTeamForFormat(team, "singles6v6");
      expect(result.errors.some((e) => e.includes("banned moves"))).toBe(true);
      expect(result.errors.some((e) => e.includes("Baton Pass"))).toBe(true);
    });
  });

  describe("level cap", () => {
    it("warns when Pokemon exceed level cap", () => {
      const team = makeValidVgcTeam();
      team.pokemon[0]!.level = 100; // VGC cap is 50
      const result = validateTeamForFormat(team, "vgc2024");
      // Level cap issues are warnings, not errors
      expect(result.warnings.some((w) => w.includes("over level 50"))).toBe(
        true
      );
      // Team is still valid (level is a warning)
      // The actual isValid depends only on errors
    });
  });
});

describe("getFormatDescription", () => {
  it('returns "Unknown format" for invalid format ID', () => {
    expect(getFormatDescription("nonexistent")).toBe("Unknown format");
  });

  it("includes the format description", () => {
    const desc = getFormatDescription("vgc2024");
    expect(desc).toContain("VGC 2024");
  });

  it("includes team size info for bring-pick formats", () => {
    const desc = getFormatDescription("vgc2024");
    // VGC has battleSize: 4, so "Bring 6, pick 4"
    expect(desc).toContain("Bring 6, pick 4");
  });

  it("includes team size range for non-bring-pick formats", () => {
    const desc = getFormatDescription("anythinggoes");
    expect(desc).toContain("1-6 Pokemon");
  });

  it("includes level cap info", () => {
    const desc = getFormatDescription("vgc2024");
    expect(desc).toContain("Level 50 cap");
  });

  it("includes item clause info when applicable", () => {
    const desc = getFormatDescription("vgc2024");
    expect(desc).toContain("No duplicate items");
  });

  it("includes species clause info when applicable", () => {
    const desc = getFormatDescription("vgc2024");
    expect(desc).toContain("No duplicate species");
  });

  it("includes restricted legendary info when applicable", () => {
    const desc = getFormatDescription("vgc2024");
    expect(desc).toContain("Max 1 restricted legendary");
  });

  it("uses pipe separator between parts", () => {
    const desc = getFormatDescription("vgc2024");
    expect(desc).toContain(" | ");
  });
});
