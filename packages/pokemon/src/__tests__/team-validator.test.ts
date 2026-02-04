import {
  AdvancedTeamValidator,
  SUPPORTED_FORMATS,
  type FormatId,
} from "../team-validator";
import type { PokemonSet } from "../types";

// -- Helper: creates a valid VGC-style PokemonSet --
function makePokemon(overrides: Partial<PokemonSet> = {}): PokemonSet {
  return {
    species: "Pikachu",
    level: 50,
    nature: "Timid",
    ability: "Static",
    heldItem: "Light Ball",
    isShiny: false,
    formatLegal: true,
    moves: {
      move1: "Thunderbolt",
      move2: "Volt Switch",
      move3: "Surf",
      move4: "Protect",
    },
    evs: {
      hp: 4,
      attack: 0,
      defense: 0,
      specialAttack: 252,
      specialDefense: 0,
      speed: 252,
    },
    ivs: {
      hp: 31,
      attack: 0,
      defense: 31,
      specialAttack: 31,
      specialDefense: 31,
      speed: 31,
    },
    ...overrides,
  };
}

// -- Helper: creates a valid 4-Pokemon VGC team --
function makeVgcTeam(): PokemonSet[] {
  return [
    makePokemon({
      species: "Pikachu",
      ability: "Static",
      heldItem: "Light Ball",
    }),
    makePokemon({
      species: "Charizard",
      ability: "Solar Power",
      heldItem: "Choice Specs",
      moves: {
        move1: "Flamethrower",
        move2: "Air Slash",
        move3: "Dragon Pulse",
        move4: "Protect",
      },
    }),
    makePokemon({
      species: "Garchomp",
      ability: "Rough Skin",
      heldItem: "Life Orb",
      nature: "Jolly",
      moves: {
        move1: "Earthquake",
        move2: "Dragon Claw",
        move3: "Rock Slide",
        move4: "Protect",
      },
      evs: {
        hp: 4,
        attack: 252,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 252,
      },
      ivs: {
        hp: 31,
        attack: 31,
        defense: 31,
        specialAttack: 31,
        specialDefense: 31,
        speed: 31,
      },
    }),
    makePokemon({
      species: "Amoonguss",
      ability: "Regenerator",
      heldItem: "Sitrus Berry",
      nature: "Bold",
      moves: {
        move1: "Spore",
        move2: "Pollen Puff",
        move3: "Rage Powder",
        move4: "Protect",
      },
      evs: {
        hp: 252,
        attack: 0,
        defense: 252,
        specialAttack: 0,
        specialDefense: 4,
        speed: 0,
      },
    }),
  ];
}

describe("SUPPORTED_FORMATS", () => {
  it("contains gen9vgc2024 format", () => {
    expect(SUPPORTED_FORMATS["gen9vgc2024"]).toBeDefined();
  });

  it("contains gen9ou format", () => {
    expect(SUPPORTED_FORMATS["gen9ou"]).toBeDefined();
  });

  it("contains gen9anythinggoes format", () => {
    expect(SUPPORTED_FORMATS["gen9anythinggoes"]).toBeDefined();
  });

  it("maps VGC formats to Gen 9 OU as fallback", () => {
    expect(SUPPORTED_FORMATS["gen9vgc2024"]).toBe("[Gen 9] OU");
  });
});

describe("AdvancedTeamValidator", () => {
  describe("constructor", () => {
    it("creates a validator for a valid format", () => {
      expect(() => new AdvancedTeamValidator("gen9vgc2024")).not.toThrow();
    });

    it("creates a validator with default format (gen9vgc2024)", () => {
      expect(() => new AdvancedTeamValidator()).not.toThrow();
    });

    it("creates a validator for gen9ou", () => {
      expect(() => new AdvancedTeamValidator("gen9ou")).not.toThrow();
    });

    it("creates a validator for gen9anythinggoes", () => {
      expect(() => new AdvancedTeamValidator("gen9anythinggoes")).not.toThrow();
    });
  });

  describe("getAvailableFormats", () => {
    it("returns all supported format entries", () => {
      const formats = AdvancedTeamValidator.getAvailableFormats();
      expect(formats.length).toBe(Object.keys(SUPPORTED_FORMATS).length);
    });

    it("each format has an id and name", () => {
      const formats = AdvancedTeamValidator.getAvailableFormats();
      for (const format of formats) {
        expect(format.id).toBeDefined();
        expect(format.name).toBeDefined();
        expect(typeof format.id).toBe("string");
        expect(typeof format.name).toBe("string");
      }
    });
  });

  describe("validateTeam (VGC format)", () => {
    let validator: AdvancedTeamValidator;

    beforeEach(() => {
      validator = new AdvancedTeamValidator("gen9vgc2024");
    });

    it("returns format and teamSize in result", () => {
      const team = makeVgcTeam();
      const result = validator.validateTeam(team);
      expect(result.format).toBeDefined();
      expect(result.teamSize).toBe(4);
    });

    it("detects species clause violations (duplicate species)", () => {
      const team = makeVgcTeam();
      // Make two Pikachus
      team[1] = makePokemon({
        species: "Pikachu",
        ability: "Static",
        heldItem: "Choice Specs",
      });

      const result = validator.validateTeam(team);
      // The VGC-specific validation should catch duplicate species
      const speciesErrors = result.errors.filter(
        (e) =>
          e.message.toLowerCase().includes("duplicate") &&
          e.message.toLowerCase().includes("species")
      );
      expect(speciesErrors.length).toBeGreaterThan(0);
    });

    it("detects item clause violations (duplicate items)", () => {
      const team = makeVgcTeam();
      // Give two Pokemon the same item
      team[1] = makePokemon({
        species: "Raichu",
        ability: "Surge Surfer",
        heldItem: "Light Ball", // Same as Pikachu's item
      });

      const result = validator.validateTeam(team);
      // The VGC-specific validation should catch duplicate items
      const itemErrors = result.errors.filter(
        (e) =>
          e.message.toLowerCase().includes("duplicate") &&
          e.message.toLowerCase().includes("item")
      );
      expect(itemErrors.length).toBeGreaterThan(0);
    });

    it("rejects VGC team with fewer than 4 Pokemon", () => {
      const team = [makeVgcTeam()[0]!]; // Only 1 Pokemon
      const result = validator.validateTeam(team);
      const sizeErrors = result.errors.filter((e) =>
        e.message.includes("at least 4")
      );
      expect(sizeErrors.length).toBeGreaterThan(0);
    });

    it("rejects VGC team with more than 6 Pokemon", () => {
      const team = makeVgcTeam();
      // Add 3 more Pokemon for a total of 7
      team.push(
        makePokemon({
          species: "Dondozo",
          ability: "Unaware",
          heldItem: "Leftovers",
        }),
        makePokemon({
          species: "Kingambit",
          ability: "Defiant",
          heldItem: "Assault Vest",
        }),
        makePokemon({
          species: "Annihilape",
          ability: "Defiant",
          heldItem: "Choice Band",
        })
      );
      const result = validator.validateTeam(team);
      const sizeErrors = result.errors.filter((e) =>
        e.message.includes("more than 6")
      );
      expect(sizeErrors.length).toBeGreaterThan(0);
    });

    it("enforces level 50 for VGC", () => {
      const team = makeVgcTeam();
      team[0]!.level = 100; // Not level 50
      const result = validator.validateTeam(team);
      const levelErrors = result.errors.filter((e) =>
        e.message.includes("level 50")
      );
      expect(levelErrors.length).toBeGreaterThan(0);
    });
  });

  describe("validatePokemon", () => {
    let validator: AdvancedTeamValidator;

    beforeEach(() => {
      validator = new AdvancedTeamValidator("gen9vgc2024");
    });

    it("validates a single Pokemon (wraps in team of 1)", () => {
      const pokemon = makePokemon();
      const result = validator.validatePokemon(pokemon);

      // Should return a result with teamSize of 1
      expect(result.teamSize).toBe(1);
      // VGC requires min 4, so this should trigger a team size error
      expect(result.errors.some((e) => e.message.includes("at least 4"))).toBe(
        true
      );
    });
  });

  describe("validateMoveInteractions", () => {
    let validator: AdvancedTeamValidator;

    beforeEach(() => {
      validator = new AdvancedTeamValidator("gen9vgc2024");
    });

    it("warns about Rest with Insomnia ability", () => {
      const pokemon = makePokemon({
        ability: "Insomnia",
        moves: {
          move1: "Rest",
          move2: "Thunderbolt",
          move3: "Protect",
          move4: "Volt Switch",
        },
      });
      const errors = validator.validateMoveInteractions(pokemon);
      expect(
        errors.some((e) => e.message.includes("Rest is incompatible"))
      ).toBe(true);
    });

    it("warns about Rest with Vital Spirit ability", () => {
      const pokemon = makePokemon({
        ability: "Vital Spirit",
        moves: {
          move1: "Rest",
          move2: "Thunderbolt",
          move3: "Protect",
          move4: "Volt Switch",
        },
      });
      const errors = validator.validateMoveInteractions(pokemon);
      expect(
        errors.some((e) => e.message.includes("Rest is incompatible"))
      ).toBe(true);
    });

    it("warns about Contrary without stat-lowering moves", () => {
      const pokemon = makePokemon({
        ability: "Contrary",
        moves: {
          move1: "Thunderbolt",
          move2: "Protect",
          move3: "Surf",
          move4: "Volt Switch",
        },
      });
      const errors = validator.validateMoveInteractions(pokemon);
      expect(errors.some((e) => e.message.includes("Contrary"))).toBe(true);
    });

    it("does not warn about Contrary with stat-lowering moves", () => {
      const pokemon = makePokemon({
        ability: "Contrary",
        moves: {
          move1: "Leaf Storm",
          move2: "Protect",
          move3: "Surf",
          move4: "Volt Switch",
        },
      });
      const errors = validator.validateMoveInteractions(pokemon);
      expect(
        errors.some(
          (e) =>
            e.message.includes("Contrary") &&
            e.message.includes("stat-lowering")
        )
      ).toBe(false);
    });

    it("returns empty array for normal move combos", () => {
      const pokemon = makePokemon();
      const errors = validator.validateMoveInteractions(pokemon);
      expect(errors).toHaveLength(0);
    });
  });

  describe("validateItemInteractions", () => {
    let validator: AdvancedTeamValidator;

    beforeEach(() => {
      validator = new AdvancedTeamValidator("gen9vgc2024");
    });

    it("warns about Choice items with status moves", () => {
      const pokemon = makePokemon({
        heldItem: "Choice Band",
        moves: {
          move1: "Earthquake",
          move2: "Toxic",
          move3: "Rock Slide",
          move4: "Dragon Claw",
        },
      });
      const errors = validator.validateItemInteractions(pokemon);
      expect(
        errors.some(
          (e) =>
            e.message.includes("Choice items") ||
            e.message.includes("status moves")
        )
      ).toBe(true);
    });

    it("errors for Assault Vest with status moves", () => {
      const pokemon = makePokemon({
        heldItem: "Assault Vest",
        moves: {
          move1: "Earthquake",
          move2: "Toxic",
          move3: "Rock Slide",
          move4: "Dragon Claw",
        },
      });
      const errors = validator.validateItemInteractions(pokemon);
      expect(errors.some((e) => e.message.includes("Assault Vest"))).toBe(true);
      // Assault Vest + status = error severity
      expect(errors.some((e) => e.severity === "error")).toBe(true);
    });

    it("returns empty array for Pokemon without item", () => {
      const pokemon = makePokemon({ heldItem: undefined });
      const errors = validator.validateItemInteractions(pokemon);
      expect(errors).toHaveLength(0);
    });

    it("returns empty array for non-restrictive items", () => {
      const pokemon = makePokemon({ heldItem: "Leftovers" });
      const errors = validator.validateItemInteractions(pokemon);
      expect(errors).toHaveLength(0);
    });

    it("does not warn about Choice items with only attacking moves", () => {
      const pokemon = makePokemon({
        heldItem: "Choice Scarf",
        moves: {
          move1: "Earthquake",
          move2: "Rock Slide",
          move3: "Dragon Claw",
          move4: "Close Combat",
        },
      });
      const errors = validator.validateItemInteractions(pokemon);
      expect(errors.some((e) => e.message.includes("Choice items"))).toBe(
        false
      );
    });
  });

  describe("validateTeam with format switching", () => {
    it("allows switching format via formatId parameter", () => {
      const validator = new AdvancedTeamValidator("gen9vgc2024");
      const team = makeVgcTeam();

      // Validate with a different format
      const result = validator.validateTeam(team, "gen9anythinggoes");
      expect(result.format).toBeDefined();
    });
  });
});
