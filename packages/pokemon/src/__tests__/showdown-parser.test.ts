import { parseShowdownTeam, exportToShowdownFormat } from "../showdown-parser";
import type { PokemonSet } from "../types";

// -- Standard Showdown paste for a single Pokemon --
const PIKACHU_PASTE = `Pikachu @ Light Ball
Ability: Static
Level: 50
Shiny: Yes
Tera Type: Electric
EVs: 252 SpA / 252 Spe / 4 HP
Timid Nature
IVs: 0 Atk
- Thunderbolt
- Volt Switch
- Surf
- Protect`;

// -- A full team paste (2 Pokemon) --
const TWO_POKEMON_PASTE = `Pikachu @ Light Ball
Ability: Static
Level: 50
EVs: 252 SpA / 252 Spe / 4 HP
Timid Nature
- Thunderbolt
- Volt Switch
- Surf
- Protect

Garchomp @ Life Orb
Ability: Rough Skin
Level: 50
EVs: 252 Atk / 252 Spe / 4 HP
Jolly Nature
- Earthquake
- Dragon Claw
- Rock Slide
- Protect`;

describe("parseShowdownTeam", () => {
  describe("basic parsing", () => {
    it("parses a single standard Pokemon paste", () => {
      const result = parseShowdownTeam(PIKACHU_PASTE);
      expect(result.success).toBe(true);
      expect(result.pokemon).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it("correctly extracts species", () => {
      const result = parseShowdownTeam(PIKACHU_PASTE);
      expect(result.pokemon[0]!.species).toBe("Pikachu");
    });

    it("correctly extracts held item", () => {
      const result = parseShowdownTeam(PIKACHU_PASTE);
      expect(result.pokemon[0]!.heldItem).toBe("Light Ball");
    });

    it("correctly extracts ability", () => {
      const result = parseShowdownTeam(PIKACHU_PASTE);
      expect(result.pokemon[0]!.ability).toBe("Static");
    });

    it("correctly extracts level", () => {
      const result = parseShowdownTeam(PIKACHU_PASTE);
      expect(result.pokemon[0]!.level).toBe(50);
    });

    it("correctly extracts shiny status", () => {
      const result = parseShowdownTeam(PIKACHU_PASTE);
      expect(result.pokemon[0]!.isShiny).toBe(true);
    });

    it("correctly extracts Tera Type", () => {
      const result = parseShowdownTeam(PIKACHU_PASTE);
      expect(result.pokemon[0]!.teraType).toBe("Electric");
    });

    it("correctly extracts nature", () => {
      const result = parseShowdownTeam(PIKACHU_PASTE);
      expect(result.pokemon[0]!.nature).toBe("Timid");
    });

    it("correctly extracts moves", () => {
      const result = parseShowdownTeam(PIKACHU_PASTE);
      const pokemon = result.pokemon[0]!;
      expect(pokemon.moves.move1).toBe("Thunderbolt");
      expect(pokemon.moves.move2).toBe("Volt Switch");
      expect(pokemon.moves.move3).toBe("Surf");
      expect(pokemon.moves.move4).toBe("Protect");
    });

    it("correctly extracts EVs", () => {
      const result = parseShowdownTeam(PIKACHU_PASTE);
      const pokemon = result.pokemon[0]!;
      expect(pokemon.evs.specialAttack).toBe(252);
      expect(pokemon.evs.speed).toBe(252);
      expect(pokemon.evs.hp).toBe(4);
      // Non-specified EVs default to 0
      expect(pokemon.evs.attack).toBe(0);
      expect(pokemon.evs.defense).toBe(0);
      expect(pokemon.evs.specialDefense).toBe(0);
    });

    it("correctly extracts IVs", () => {
      const result = parseShowdownTeam(PIKACHU_PASTE);
      const pokemon = result.pokemon[0]!;
      expect(pokemon.ivs.attack).toBe(0);
      // Non-specified IVs default to 31
      expect(pokemon.ivs.hp).toBe(31);
      expect(pokemon.ivs.defense).toBe(31);
      expect(pokemon.ivs.specialAttack).toBe(31);
      expect(pokemon.ivs.specialDefense).toBe(31);
      expect(pokemon.ivs.speed).toBe(31);
    });
  });

  describe("nickname parsing", () => {
    it("parses nickname when provided", () => {
      const paste = `Sparky (Pikachu) @ Light Ball
Ability: Static
- Thunderbolt`;
      const result = parseShowdownTeam(paste);
      expect(result.pokemon[0]!.nickname).toBe("Sparky");
      expect(result.pokemon[0]!.species).toBe("Pikachu");
    });

    it("treats species-only line (no nickname) correctly", () => {
      const paste = `Pikachu @ Light Ball
Ability: Static
- Thunderbolt`;
      const result = parseShowdownTeam(paste);
      expect(result.pokemon[0]!.species).toBe("Pikachu");
      expect(result.pokemon[0]!.nickname).toBeUndefined();
    });
  });

  describe("gender parsing", () => {
    it("parses male gender", () => {
      const paste = `Pikachu (M) @ Light Ball
Ability: Static
- Thunderbolt`;
      const result = parseShowdownTeam(paste);
      expect(result.pokemon[0]!.gender).toBe("Male");
    });

    it("parses female gender", () => {
      const paste = `Pikachu (F) @ Light Ball
Ability: Static
- Thunderbolt`;
      const result = parseShowdownTeam(paste);
      expect(result.pokemon[0]!.gender).toBe("Female");
    });

    it("parses nickname with gender", () => {
      const paste = `Sparky (Pikachu) (M) @ Light Ball
Ability: Static
- Thunderbolt`;
      const result = parseShowdownTeam(paste);
      expect(result.pokemon[0]!.nickname).toBe("Sparky");
      expect(result.pokemon[0]!.species).toBe("Pikachu");
      expect(result.pokemon[0]!.gender).toBe("Male");
    });
  });

  describe("missing optional fields", () => {
    it("defaults level to 50 when not specified", () => {
      const paste = `Pikachu @ Light Ball
Ability: Static
- Thunderbolt`;
      const result = parseShowdownTeam(paste);
      expect(result.pokemon[0]!.level).toBe(50);
    });

    it("defaults nature to Hardy when not specified", () => {
      const paste = `Pikachu @ Light Ball
Ability: Static
- Thunderbolt`;
      const result = parseShowdownTeam(paste);
      expect(result.pokemon[0]!.nature).toBe("Hardy");
    });

    it("defaults shiny to false when not specified", () => {
      const paste = `Pikachu @ Light Ball
Ability: Static
- Thunderbolt`;
      const result = parseShowdownTeam(paste);
      expect(result.pokemon[0]!.isShiny).toBe(false);
    });

    it("defaults EVs to all zeros when not specified", () => {
      const paste = `Pikachu @ Light Ball
Ability: Static
- Thunderbolt`;
      const result = parseShowdownTeam(paste);
      const pokemon = result.pokemon[0]!;
      expect(pokemon.evs).toEqual({
        hp: 0,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      });
    });

    it("defaults IVs to all 31 when not specified", () => {
      const paste = `Pikachu @ Light Ball
Ability: Static
- Thunderbolt`;
      const result = parseShowdownTeam(paste);
      const pokemon = result.pokemon[0]!;
      expect(pokemon.ivs).toEqual({
        hp: 31,
        attack: 31,
        defense: 31,
        specialAttack: 31,
        specialDefense: 31,
        speed: 31,
      });
    });

    it("handles Pokemon without an item", () => {
      const paste = `Pikachu
Ability: Static
- Thunderbolt`;
      const result = parseShowdownTeam(paste);
      expect(result.pokemon[0]!.heldItem).toBeUndefined();
    });

    it("handles Pokemon without ability (defaults to empty string)", () => {
      const paste = `Pikachu @ Light Ball
- Thunderbolt`;
      const result = parseShowdownTeam(paste);
      expect(result.pokemon[0]!.ability).toBe("");
    });
  });

  describe("multiple Pokemon", () => {
    it("parses multiple Pokemon separated by blank lines", () => {
      const result = parseShowdownTeam(TWO_POKEMON_PASTE);
      expect(result.success).toBe(true);
      expect(result.pokemon).toHaveLength(2);
    });

    it("correctly parses both Pokemon in a two-Pokemon paste", () => {
      const result = parseShowdownTeam(TWO_POKEMON_PASTE);
      expect(result.pokemon[0]!.species).toBe("Pikachu");
      expect(result.pokemon[1]!.species).toBe("Garchomp");
    });

    it("warns about duplicate species", () => {
      const paste = `Pikachu @ Light Ball
Ability: Static
- Thunderbolt

Pikachu @ Leftovers
Ability: Lightning Rod
- Volt Tackle`;
      const result = parseShowdownTeam(paste);
      expect(result.warnings.some((w) => w.includes("Duplicate species"))).toBe(
        true
      );
    });

    it("rejects more than 6 Pokemon", () => {
      const blocks = Array.from(
        { length: 7 },
        (_, i) => `Pokemon${i}\nAbility: Ability${i}\n- Move${i}`
      );
      const result = parseShowdownTeam(blocks.join("\n\n"));
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("more than 6"))).toBe(true);
    });
  });

  describe("empty and invalid input", () => {
    it("returns error for empty string", () => {
      const result = parseShowdownTeam("");
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("No Pokemon found"))).toBe(
        true
      );
    });

    it("returns error for whitespace-only string", () => {
      const result = parseShowdownTeam("   \n   \n   ");
      expect(result.success).toBe(false);
    });
  });

  describe("formatLegal default", () => {
    it("defaults formatLegal to true", () => {
      const result = parseShowdownTeam(PIKACHU_PASTE);
      expect(result.pokemon[0]!.formatLegal).toBe(true);
    });
  });
});

describe("exportToShowdownFormat", () => {
  it("exports a single Pokemon to Showdown text format", () => {
    const pokemon: PokemonSet[] = [
      {
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
      },
    ];

    const output = exportToShowdownFormat(pokemon);

    expect(output).toContain("Sparky (Pikachu)");
    expect(output).toContain("(M)");
    expect(output).toContain("@ Light Ball");
    expect(output).toContain("Ability: Static");
    expect(output).toContain("Shiny: Yes");
    expect(output).toContain("Tera Type: Electric");
    expect(output).toContain("Timid Nature");
    expect(output).toContain("- Thunderbolt");
    expect(output).toContain("- Volt Switch");
    expect(output).toContain("- Surf");
    expect(output).toContain("- Protect");
  });

  it("exports multiple Pokemon separated by blank lines", () => {
    const pokemon: PokemonSet[] = [
      {
        species: "Pikachu",
        level: 50,
        nature: "Timid",
        ability: "Static",
        isShiny: false,
        formatLegal: true,
        moves: { move1: "Thunderbolt" },
        evs: {
          hp: 0,
          attack: 0,
          defense: 0,
          specialAttack: 0,
          specialDefense: 0,
          speed: 0,
        },
        ivs: {
          hp: 31,
          attack: 31,
          defense: 31,
          specialAttack: 31,
          specialDefense: 31,
          speed: 31,
        },
      },
      {
        species: "Garchomp",
        level: 50,
        nature: "Jolly",
        ability: "Rough Skin",
        isShiny: false,
        formatLegal: true,
        moves: { move1: "Earthquake" },
        evs: {
          hp: 0,
          attack: 0,
          defense: 0,
          specialAttack: 0,
          specialDefense: 0,
          speed: 0,
        },
        ivs: {
          hp: 31,
          attack: 31,
          defense: 31,
          specialAttack: 31,
          specialDefense: 31,
          speed: 31,
        },
      },
    ];

    const output = exportToShowdownFormat(pokemon);
    const blocks = output.split("\n\n");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain("Pikachu");
    expect(blocks[1]).toContain("Garchomp");
  });

  it("omits level when it is 50", () => {
    const pokemon: PokemonSet[] = [
      {
        species: "Pikachu",
        level: 50,
        nature: "Timid",
        ability: "Static",
        isShiny: false,
        formatLegal: true,
        moves: { move1: "Thunderbolt" },
        evs: {
          hp: 0,
          attack: 0,
          defense: 0,
          specialAttack: 0,
          specialDefense: 0,
          speed: 0,
        },
        ivs: {
          hp: 31,
          attack: 31,
          defense: 31,
          specialAttack: 31,
          specialDefense: 31,
          speed: 31,
        },
      },
    ];
    const output = exportToShowdownFormat(pokemon);
    expect(output).not.toContain("Level:");
  });

  it("omits Hardy nature (it is the default neutral nature)", () => {
    const pokemon: PokemonSet[] = [
      {
        species: "Pikachu",
        level: 50,
        nature: "Hardy",
        ability: "Static",
        isShiny: false,
        formatLegal: true,
        moves: { move1: "Thunderbolt" },
        evs: {
          hp: 0,
          attack: 0,
          defense: 0,
          specialAttack: 0,
          specialDefense: 0,
          speed: 0,
        },
        ivs: {
          hp: 31,
          attack: 31,
          defense: 31,
          specialAttack: 31,
          specialDefense: 31,
          speed: 31,
        },
      },
    ];
    const output = exportToShowdownFormat(pokemon);
    // The export function from showdown-parser omits Hardy Nature
    expect(output).not.toContain("Hardy Nature");
  });
});

describe("round-trip: parseShowdownTeam -> exportToShowdownFormat", () => {
  it("preserves key data through parse-export-parse cycle", () => {
    // Parse
    const parsed1 = parseShowdownTeam(PIKACHU_PASTE);
    expect(parsed1.success).toBe(true);

    // Export
    const exported = exportToShowdownFormat(parsed1.pokemon);

    // Parse again
    const parsed2 = parseShowdownTeam(exported);
    expect(parsed2.success).toBe(true);

    // Compare key fields
    const p1 = parsed1.pokemon[0]!;
    const p2 = parsed2.pokemon[0]!;

    expect(p2.species).toBe(p1.species);
    expect(p2.ability).toBe(p1.ability);
    expect(p2.heldItem).toBe(p1.heldItem);
    expect(p2.isShiny).toBe(p1.isShiny);
    expect(p2.teraType).toBe(p1.teraType);
    expect(p2.moves.move1).toBe(p1.moves.move1);
    expect(p2.evs).toEqual(p1.evs);
    expect(p2.ivs).toEqual(p1.ivs);
  });
});
