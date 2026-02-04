import {
  fromFlat,
  toFlat,
  toShowdownFormat,
  createDefault,
  createDefaultEvs,
  createDefaultIvs,
  createDefaultMoves,
  type PokemonSet,
  type PokemonSetFlat,
} from "../types";

// -- Helper: a fully-specified PokemonSet used across tests --
function makePikachuSet(): PokemonSet {
  return {
    species: "Pikachu",
    nickname: "Sparky",
    level: 50,
    nature: "Timid",
    ability: "Static",
    heldItem: "Light Ball",
    gender: "Male",
    isShiny: true,
    teraType: "Electric",
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

// -- Helper: matching flat representation --
function makePikachuFlat(): PokemonSetFlat {
  return {
    species: "Pikachu",
    nickname: "Sparky",
    level: 50,
    nature: "Timid",
    ability: "Static",
    heldItem: "Light Ball",
    gender: "Male",
    isShiny: true,
    teraType: "Electric",
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
}

describe("fromFlat", () => {
  it("converts flat DB format to structured PokemonSet", () => {
    const flat = makePikachuFlat();
    const result = fromFlat(flat);

    // Core fields preserved
    expect(result.species).toBe("Pikachu");
    expect(result.nickname).toBe("Sparky");
    expect(result.level).toBe(50);
    expect(result.nature).toBe("Timid");
    expect(result.ability).toBe("Static");
    expect(result.heldItem).toBe("Light Ball");
    expect(result.gender).toBe("Male");
    expect(result.isShiny).toBe(true);
    expect(result.teraType).toBe("Electric");
    expect(result.formatLegal).toBe(true);

    // Moves grouped into nested object
    expect(result.moves).toEqual({
      move1: "Thunderbolt",
      move2: "Volt Switch",
      move3: "Surf",
      move4: "Protect",
    });

    // EVs grouped into nested object
    expect(result.evs).toEqual({
      hp: 4,
      attack: 0,
      defense: 0,
      specialAttack: 252,
      specialDefense: 0,
      speed: 252,
    });

    // IVs grouped into nested object
    expect(result.ivs).toEqual({
      hp: 31,
      attack: 0,
      defense: 31,
      specialAttack: 31,
      specialDefense: 31,
      speed: 31,
    });
  });

  it("handles optional moves (move2-4 undefined)", () => {
    const flat = makePikachuFlat();
    flat.move2 = undefined;
    flat.move3 = undefined;
    flat.move4 = undefined;

    const result = fromFlat(flat);

    expect(result.moves.move1).toBe("Thunderbolt");
    expect(result.moves.move2).toBeUndefined();
    expect(result.moves.move3).toBeUndefined();
    expect(result.moves.move4).toBeUndefined();
  });

  it("handles zero EVs and IVs", () => {
    const flat = makePikachuFlat();
    flat.evHp = 0;
    flat.evAttack = 0;
    flat.evDefense = 0;
    flat.evSpecialAttack = 0;
    flat.evSpecialDefense = 0;
    flat.evSpeed = 0;
    flat.ivHp = 0;
    flat.ivAttack = 0;
    flat.ivDefense = 0;
    flat.ivSpecialAttack = 0;
    flat.ivSpecialDefense = 0;
    flat.ivSpeed = 0;

    const result = fromFlat(flat);

    expect(result.evs).toEqual({
      hp: 0,
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
    });
    expect(result.ivs).toEqual({
      hp: 0,
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
    });
  });
});

describe("toFlat", () => {
  it("converts structured PokemonSet to flat DB format", () => {
    const set = makePikachuSet();
    const result = toFlat(set);

    // Core fields preserved
    expect(result.species).toBe("Pikachu");
    expect(result.nickname).toBe("Sparky");
    expect(result.ability).toBe("Static");
    expect(result.heldItem).toBe("Light Ball");

    // Moves flattened
    expect(result.move1).toBe("Thunderbolt");
    expect(result.move2).toBe("Volt Switch");
    expect(result.move3).toBe("Surf");
    expect(result.move4).toBe("Protect");

    // EVs flattened
    expect(result.evHp).toBe(4);
    expect(result.evAttack).toBe(0);
    expect(result.evSpecialAttack).toBe(252);
    expect(result.evSpeed).toBe(252);

    // IVs flattened
    expect(result.ivHp).toBe(31);
    expect(result.ivAttack).toBe(0);
    expect(result.ivDefense).toBe(31);
  });

  it("does not include moves/evs/ivs nested objects", () => {
    const result = toFlat(makePikachuSet());
    // The flat format should not have the nested "moves", "evs", or "ivs" keys
    expect("moves" in result).toBe(false);
    expect("evs" in result).toBe(false);
    expect("ivs" in result).toBe(false);
  });
});

describe("round-trip fromFlat(toFlat(set))", () => {
  it("preserves all data through a round-trip conversion", () => {
    const original = makePikachuSet();
    const roundTripped = fromFlat(toFlat(original));

    expect(roundTripped).toEqual(original);
  });

  it("preserves data when optional fields are missing", () => {
    const original: PokemonSet = {
      species: "Garchomp",
      level: 50,
      nature: "Jolly",
      ability: "Rough Skin",
      isShiny: false,
      formatLegal: true,
      moves: { move1: "Earthquake" },
      evs: {
        hp: 0,
        attack: 252,
        defense: 0,
        specialAttack: 0,
        specialDefense: 4,
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
    };
    const roundTripped = fromFlat(toFlat(original));
    expect(roundTripped).toEqual(original);
  });
});

describe("toShowdownFormat", () => {
  it("produces correct first line with nickname, species, and item", () => {
    const set = makePikachuSet();
    const output = toShowdownFormat(set);
    // First line: Sparky (Pikachu) (M) @ Light Ball
    expect(output).toContain("Sparky (Pikachu) (M) @ Light Ball");
  });

  it("omits nickname when it matches species", () => {
    const set = makePikachuSet();
    set.nickname = "Pikachu"; // same as species
    const output = toShowdownFormat(set);
    expect(output.startsWith("Pikachu (M) @ Light Ball")).toBe(true);
  });

  it("omits nickname when not provided", () => {
    const set = makePikachuSet();
    set.nickname = undefined;
    const output = toShowdownFormat(set);
    expect(output.startsWith("Pikachu (M) @ Light Ball")).toBe(true);
  });

  it("includes gender as (M) or (F)", () => {
    const setM = makePikachuSet();
    setM.gender = "Male";
    expect(toShowdownFormat(setM)).toContain("(M)");

    const setF = makePikachuSet();
    setF.gender = "Female";
    expect(toShowdownFormat(setF)).toContain("(F)");
  });

  it("omits gender when not provided", () => {
    const set = makePikachuSet();
    set.gender = undefined;
    set.nickname = undefined;
    const output = toShowdownFormat(set);
    // First line should be: Pikachu @ Light Ball (no gender)
    expect(output.startsWith("Pikachu @ Light Ball")).toBe(true);
  });

  it("includes Ability line", () => {
    const output = toShowdownFormat(makePikachuSet());
    expect(output).toContain("Ability: Static");
  });

  it("omits Level line when level is 50", () => {
    const set = makePikachuSet();
    set.level = 50;
    const output = toShowdownFormat(set);
    expect(output).not.toContain("Level:");
  });

  it("includes Level line when level is not 50", () => {
    const set = makePikachuSet();
    set.level = 100;
    const output = toShowdownFormat(set);
    expect(output).toContain("Level: 100");
  });

  it("includes Shiny: Yes when shiny", () => {
    const set = makePikachuSet();
    set.isShiny = true;
    expect(toShowdownFormat(set)).toContain("Shiny: Yes");
  });

  it("omits Shiny line when not shiny", () => {
    const set = makePikachuSet();
    set.isShiny = false;
    expect(toShowdownFormat(set)).not.toContain("Shiny:");
  });

  it("includes Tera Type line when set", () => {
    const set = makePikachuSet();
    set.teraType = "Electric";
    expect(toShowdownFormat(set)).toContain("Tera Type: Electric");
  });

  it("omits Tera Type line when not set", () => {
    const set = makePikachuSet();
    set.teraType = undefined;
    expect(toShowdownFormat(set)).not.toContain("Tera Type:");
  });

  it("includes EVs line with only non-zero values", () => {
    const output = toShowdownFormat(makePikachuSet());
    // EVs: 4 HP / 252 SpA / 252 Spe
    expect(output).toContain("EVs: 4 HP / 252 SpA / 252 Spe");
  });

  it("omits EVs line when all are zero", () => {
    const set = makePikachuSet();
    set.evs = {
      hp: 0,
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
    };
    expect(toShowdownFormat(set)).not.toContain("EVs:");
  });

  it("includes IVs line with only non-31 values", () => {
    const output = toShowdownFormat(makePikachuSet());
    // IVs: 0 Atk (only attack is non-31)
    expect(output).toContain("IVs: 0 Atk");
  });

  it("omits IVs line when all are 31", () => {
    const set = makePikachuSet();
    set.ivs = {
      hp: 31,
      attack: 31,
      defense: 31,
      specialAttack: 31,
      specialDefense: 31,
      speed: 31,
    };
    expect(toShowdownFormat(set)).not.toContain("IVs:");
  });

  it("includes Nature line", () => {
    const output = toShowdownFormat(makePikachuSet());
    expect(output).toContain("Timid Nature");
  });

  it("includes all moves prefixed with -", () => {
    const output = toShowdownFormat(makePikachuSet());
    expect(output).toContain("- Thunderbolt");
    expect(output).toContain("- Volt Switch");
    expect(output).toContain("- Surf");
    expect(output).toContain("- Protect");
  });

  it("only includes non-empty moves", () => {
    const set = makePikachuSet();
    set.moves = { move1: "Thunderbolt" };
    const output = toShowdownFormat(set);
    expect(output).toContain("- Thunderbolt");
    // Should not have extra "- " lines
    const moveLines = output.split("\n").filter((l) => l.startsWith("- "));
    expect(moveLines).toHaveLength(1);
  });

  it("omits item from first line when not provided", () => {
    const set = makePikachuSet();
    set.heldItem = undefined;
    set.nickname = undefined;
    set.gender = undefined;
    const output = toShowdownFormat(set);
    expect(output.startsWith("Pikachu\n")).toBe(true);
  });
});

describe("createDefault", () => {
  it("returns a valid PokemonSet with all required fields", () => {
    const def = createDefault();

    expect(def.species).toBe("");
    expect(def.level).toBe(50);
    expect(def.nature).toBe("Hardy");
    expect(def.ability).toBe("");
    expect(def.isShiny).toBe(false);
    expect(def.formatLegal).toBe(true);
    expect(def.moves).toBeDefined();
    expect(def.moves.move1).toBe("");
    expect(def.evs).toBeDefined();
    expect(def.ivs).toBeDefined();
  });

  it("has all EVs at zero", () => {
    const def = createDefault();
    for (const value of Object.values(def.evs)) {
      expect(value).toBe(0);
    }
  });

  it("has all IVs at 31", () => {
    const def = createDefault();
    for (const value of Object.values(def.ivs)) {
      expect(value).toBe(31);
    }
  });

  it("returns a new object on each call (no shared reference)", () => {
    const a = createDefault();
    const b = createDefault();
    expect(a).not.toBe(b);
    expect(a.evs).not.toBe(b.evs);
    expect(a.ivs).not.toBe(b.ivs);
  });
});

describe("createDefaultEvs", () => {
  it("returns all stats at zero", () => {
    const evs = createDefaultEvs();
    expect(evs).toEqual({
      hp: 0,
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
    });
  });

  it("returns a new object on each call", () => {
    expect(createDefaultEvs()).not.toBe(createDefaultEvs());
  });
});

describe("createDefaultIvs", () => {
  it("returns all stats at 31", () => {
    const ivs = createDefaultIvs();
    expect(ivs).toEqual({
      hp: 31,
      attack: 31,
      defense: 31,
      specialAttack: 31,
      specialDefense: 31,
      speed: 31,
    });
  });

  it("returns a new object on each call", () => {
    expect(createDefaultIvs()).not.toBe(createDefaultIvs());
  });
});

describe("createDefaultMoves", () => {
  it("returns move1 as empty string with no other moves", () => {
    const moves = createDefaultMoves();
    expect(moves.move1).toBe("");
    expect(moves.move2).toBeUndefined();
    expect(moves.move3).toBeUndefined();
    expect(moves.move4).toBeUndefined();
  });

  it("returns a new object on each call", () => {
    expect(createDefaultMoves()).not.toBe(createDefaultMoves());
  });
});
