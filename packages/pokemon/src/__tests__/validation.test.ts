import {
  validatePokemon,
  isValidSpecies,
  isValidMove,
  getValidAbilities,
  getValidTeraTypes,
  getValidNatures,
  getLearnableMoves,
} from "../validation";
import type { PokemonSet } from "../types";

// -- Helper: a valid Pikachu PokemonSet --
function makeValidPikachu(): PokemonSet {
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
  };
}

describe("isValidSpecies", () => {
  it("returns true for valid species names", () => {
    expect(isValidSpecies("Pikachu")).toBe(true);
    expect(isValidSpecies("Charizard")).toBe(true);
    expect(isValidSpecies("Garchomp")).toBe(true);
    expect(isValidSpecies("Mewtwo")).toBe(true);
  });

  it("returns false for non-existent species", () => {
    expect(isValidSpecies("Fakemon")).toBe(false);
    expect(isValidSpecies("NotAPokemon")).toBe(false);
    expect(isValidSpecies("")).toBe(false);
  });

  it("returns true for species with special forms or hyphenated names", () => {
    // Hyphenated Pokemon names
    expect(isValidSpecies("Porygon-Z")).toBe(true);
    expect(isValidSpecies("Ho-Oh")).toBe(true);
  });

  it("handles case-insensitive lookups (pkmn/dex behavior)", () => {
    // @pkmn/dex typically handles case insensitively
    expect(isValidSpecies("pikachu")).toBe(true);
    expect(isValidSpecies("PIKACHU")).toBe(true);
  });
});

describe("isValidMove", () => {
  it("returns true for valid moves", () => {
    expect(isValidMove("Thunderbolt")).toBe(true);
    expect(isValidMove("Earthquake")).toBe(true);
    expect(isValidMove("Protect")).toBe(true);
    expect(isValidMove("Surf")).toBe(true);
  });

  it("returns false for non-existent moves", () => {
    expect(isValidMove("Fakemove")).toBe(false);
    expect(isValidMove("Super Ultra Attack")).toBe(false);
    expect(isValidMove("")).toBe(false);
  });

  it("handles case-insensitive lookups", () => {
    expect(isValidMove("thunderbolt")).toBe(true);
    expect(isValidMove("THUNDERBOLT")).toBe(true);
  });
});

describe("validatePokemon", () => {
  describe("with valid Pokemon", () => {
    it("returns isValid: true for a properly configured Pikachu", () => {
      const result = validatePokemon(makeValidPikachu());
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("species validation", () => {
    it("rejects non-existent species", () => {
      const pokemon = makeValidPikachu();
      pokemon.species = "Fakemon";
      const result = validatePokemon(pokemon);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "species")).toBe(true);
      expect(
        result.errors.some((e) => e.message.includes("does not exist"))
      ).toBe(true);
    });

    it("stops validation early when species does not exist", () => {
      const pokemon = makeValidPikachu();
      pokemon.species = "Fakemon";
      const result = validatePokemon(pokemon);
      // Should only have species error since validation stops early
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.field).toBe("species");
    });
  });

  describe("nature validation", () => {
    it("rejects non-existent nature", () => {
      const pokemon = makeValidPikachu();
      pokemon.nature = "SuperNature";
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "nature")).toBe(true);
    });

    it("accepts valid natures", () => {
      const pokemon = makeValidPikachu();
      pokemon.nature = "Adamant";
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "nature")).toBe(false);
    });
  });

  describe("ability validation", () => {
    it("rejects non-existent ability", () => {
      const pokemon = makeValidPikachu();
      pokemon.ability = "SuperAbility";
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "ability")).toBe(true);
      expect(
        result.errors.some((e) => e.message.includes("does not exist"))
      ).toBe(true);
    });

    it("rejects ability that exists but the species cannot have", () => {
      const pokemon = makeValidPikachu();
      pokemon.ability = "Intimidate"; // Pikachu can't have Intimidate
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "ability")).toBe(true);
      expect(
        result.errors.some((e) => e.message.includes("cannot have ability"))
      ).toBe(true);
    });

    it("accepts valid abilities for the species", () => {
      const pokemon = makeValidPikachu();
      pokemon.ability = "Static"; // Valid for Pikachu
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "ability")).toBe(false);
    });
  });

  describe("held item validation", () => {
    it("rejects non-existent items", () => {
      const pokemon = makeValidPikachu();
      pokemon.heldItem = "Fake Item";
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "heldItem")).toBe(true);
    });

    it("allows valid items", () => {
      const pokemon = makeValidPikachu();
      pokemon.heldItem = "Leftovers";
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "heldItem")).toBe(false);
    });

    it("skips item validation when no item is set", () => {
      const pokemon = makeValidPikachu();
      pokemon.heldItem = undefined;
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "heldItem")).toBe(false);
    });
  });

  describe("move validation", () => {
    it("rejects non-existent moves", () => {
      const pokemon = makeValidPikachu();
      pokemon.moves.move1 = "SuperBlast";
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "move1")).toBe(true);
    });

    it("rejects duplicate moves", () => {
      const pokemon = makeValidPikachu();
      pokemon.moves.move2 = "Thunderbolt"; // Same as move1
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "moves")).toBe(true);
      expect(
        result.errors.some((e) => e.message.includes("duplicate moves"))
      ).toBe(true);
    });
  });

  describe("EV validation", () => {
    it("rejects total EVs exceeding 510", () => {
      const pokemon = makeValidPikachu();
      pokemon.evs = {
        hp: 252,
        attack: 252,
        defense: 252,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      };
      // Total = 756, exceeds 510
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "evs")).toBe(true);
      expect(
        result.errors.some((e) => e.message.includes("cannot exceed 510"))
      ).toBe(true);
    });

    it("accepts total EVs at exactly 510", () => {
      const pokemon = makeValidPikachu();
      pokemon.evs = {
        hp: 6,
        attack: 0,
        defense: 0,
        specialAttack: 252,
        specialDefense: 0,
        speed: 252,
      };
      // Total = 510
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "evs")).toBe(false);
    });

    it("rejects individual EV values over 252", () => {
      const pokemon = makeValidPikachu();
      pokemon.evs.hp = 253;
      const result = validatePokemon(pokemon);
      expect(
        result.errors.some((e) =>
          e.message.includes("must be between 0 and 252")
        )
      ).toBe(true);
    });

    it("rejects negative EV values", () => {
      const pokemon = makeValidPikachu();
      pokemon.evs.speed = -1;
      const result = validatePokemon(pokemon);
      expect(
        result.errors.some((e) =>
          e.message.includes("must be between 0 and 252")
        )
      ).toBe(true);
    });
  });

  describe("IV validation", () => {
    it("rejects IV values over 31", () => {
      const pokemon = makeValidPikachu();
      pokemon.ivs.hp = 32;
      const result = validatePokemon(pokemon);
      expect(
        result.errors.some((e) =>
          e.message.includes("must be between 0 and 31")
        )
      ).toBe(true);
    });

    it("rejects negative IV values", () => {
      const pokemon = makeValidPikachu();
      pokemon.ivs.attack = -1;
      const result = validatePokemon(pokemon);
      expect(
        result.errors.some((e) =>
          e.message.includes("must be between 0 and 31")
        )
      ).toBe(true);
    });

    it("accepts IV values of 0", () => {
      const pokemon = makeValidPikachu();
      pokemon.ivs.attack = 0;
      const result = validatePokemon(pokemon);
      expect(
        result.errors.some(
          (e) => e.field.startsWith("iv") && e.message.includes("attack")
        )
      ).toBe(false);
    });
  });

  describe("Tera Type validation", () => {
    it("rejects invalid Tera Type", () => {
      const pokemon = makeValidPikachu();
      pokemon.teraType = "FakeType";
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "teraType")).toBe(true);
    });

    it("accepts valid Tera Type", () => {
      const pokemon = makeValidPikachu();
      pokemon.teraType = "Electric";
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "teraType")).toBe(false);
    });

    it("skips Tera Type validation when not set", () => {
      const pokemon = makeValidPikachu();
      pokemon.teraType = undefined;
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "teraType")).toBe(false);
    });
  });

  describe("level validation", () => {
    it("rejects level below 1", () => {
      const pokemon = makeValidPikachu();
      pokemon.level = 0;
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "level")).toBe(true);
    });

    it("rejects level above 100", () => {
      const pokemon = makeValidPikachu();
      pokemon.level = 101;
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "level")).toBe(true);
    });

    it("accepts level 1", () => {
      const pokemon = makeValidPikachu();
      pokemon.level = 1;
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "level")).toBe(false);
    });

    it("accepts level 100", () => {
      const pokemon = makeValidPikachu();
      pokemon.level = 100;
      const result = validatePokemon(pokemon);
      expect(result.errors.some((e) => e.field === "level")).toBe(false);
    });
  });

  describe("flat format input", () => {
    it("accepts PokemonSetFlat and converts internally", () => {
      // The function accepts PokemonSetFlat and converts it via fromFlat
      const flat = {
        species: "Pikachu",
        level: 50,
        nature: "Timid",
        ability: "Static",
        heldItem: "Light Ball",
        isShiny: false,
        formatLegal: true,
        move1: "Thunderbolt",
        move2: "Volt Switch",
        move3: "Surf",
        move4: "Protect",
        evHp: 4,
        evAttack: 0,
        evDefense: 0,
        evSpecialAttack: 252,
        evSpecialDefense: 0,
        evSpeed: 252,
        ivHp: 31,
        ivAttack: 0,
        ivDefense: 31,
        ivSpecialAttack: 31,
        ivSpecialDefense: 31,
        ivSpeed: 31,
      };
      const result = validatePokemon(flat);
      expect(result.isValid).toBe(true);
    });
  });
});

describe("getValidAbilities", () => {
  it("returns abilities for Pikachu", () => {
    const abilities = getValidAbilities("Pikachu");
    expect(abilities.length).toBeGreaterThan(0);
    expect(abilities).toContain("Static");
  });

  it("returns abilities for Garchomp", () => {
    const abilities = getValidAbilities("Garchomp");
    expect(abilities.length).toBeGreaterThan(0);
    expect(abilities).toContain("Rough Skin");
  });

  it("returns empty array for non-existent species", () => {
    expect(getValidAbilities("Fakemon")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(getValidAbilities("")).toEqual([]);
  });
});

describe("getValidTeraTypes", () => {
  it("returns at least 18 types (Gen 9 includes Stellar)", () => {
    const types = getValidTeraTypes();
    // Gen 9 has 19 types (the 18 standard types plus Stellar)
    expect(types.length).toBeGreaterThanOrEqual(18);
  });

  it("includes all standard Pokemon types", () => {
    const types = getValidTeraTypes();
    expect(types).toContain("Normal");
    expect(types).toContain("Fire");
    expect(types).toContain("Water");
    expect(types).toContain("Electric");
    expect(types).toContain("Grass");
    expect(types).toContain("Ice");
    expect(types).toContain("Fighting");
    expect(types).toContain("Poison");
    expect(types).toContain("Ground");
    expect(types).toContain("Flying");
    expect(types).toContain("Psychic");
    expect(types).toContain("Bug");
    expect(types).toContain("Rock");
    expect(types).toContain("Ghost");
    expect(types).toContain("Dragon");
    expect(types).toContain("Dark");
    expect(types).toContain("Steel");
    expect(types).toContain("Fairy");
  });
});

describe("getValidNatures", () => {
  it("returns 25 natures", () => {
    const natures = getValidNatures();
    expect(natures.length).toBe(25);
  });

  it("includes common natures", () => {
    const natures = getValidNatures();
    expect(natures).toContain("Adamant");
    expect(natures).toContain("Jolly");
    expect(natures).toContain("Timid");
    expect(natures).toContain("Modest");
    expect(natures).toContain("Bold");
    expect(natures).toContain("Hardy");
  });
});

describe("getLearnableMoves", () => {
  it("returns moves for valid species", () => {
    const moves = getLearnableMoves("Pikachu");
    expect(moves.length).toBeGreaterThan(0);
  });

  it("returns sorted moves", () => {
    const moves = getLearnableMoves("Pikachu");
    // Check that the array is sorted alphabetically
    const sorted = [...moves].sort();
    expect(moves).toEqual(sorted);
  });

  it("returns empty array for non-existent species", () => {
    expect(getLearnableMoves("Fakemon")).toEqual([]);
  });
});
