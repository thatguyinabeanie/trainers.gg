/**
 * @jest-environment node
 *
 * Tests for pokemon-utils.ts
 *
 * dbPokemonToFlat maps 30+ snake_case DB fields to camelCase PokemonSetFlat.
 * A single swapped field (e.g. ev_special_attack ↔ ev_special_defense) silently
 * corrupts exports and validation — every field is asserted explicitly.
 */

import { describe, it, expect } from "@jest/globals";

import { type Tables } from "@trainers/supabase";

import { dbPokemonToFlat, dbPokemonToPokemonSet } from "../pokemon-utils";

// =============================================================================
// Factory helpers
// =============================================================================

/**
 * Build a fully-populated Tables<"pokemon"> row. Override individual fields
 * with the second argument to produce targeted edge-case rows.
 */
function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Garchomp",
    ability: "Rough Skin",
    nature: "Jolly",
    nickname: "Garc",
    held_item: "Choice Scarf",
    gender: "Male",
    level: 50,
    is_shiny: false,
    tera_type: "Dragon",
    move1: "Earthquake",
    move2: "Dragon Claw",
    move3: "Protect",
    move4: "Rock Slide",
    ev_hp: 4,
    ev_attack: 252,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    format_legal: true,
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// =============================================================================
// dbPokemonToFlat
// =============================================================================

describe("dbPokemonToFlat", () => {
  // ---------------------------------------------------------------------------
  // Full happy path
  // ---------------------------------------------------------------------------

  describe("full happy path — all fields populated", () => {
    it("maps species correctly", () => {
      const result = dbPokemonToFlat(makePokemon());
      expect(result.species).toBe("Garchomp");
    });

    it("maps nickname correctly", () => {
      const result = dbPokemonToFlat(makePokemon());
      expect(result.nickname).toBe("Garc");
    });

    it("maps ability correctly", () => {
      const result = dbPokemonToFlat(makePokemon());
      expect(result.ability).toBe("Rough Skin");
    });

    it("maps nature correctly", () => {
      const result = dbPokemonToFlat(makePokemon());
      expect(result.nature).toBe("Jolly");
    });

    it("sets formatLegal to true regardless of DB value", () => {
      const result = dbPokemonToFlat(makePokemon({ format_legal: false }));
      expect(result.formatLegal).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Move field mappings (positional swaps are a common bug)
  // ---------------------------------------------------------------------------

  describe("move field mappings", () => {
    it.each([
      ["move1", "Earthquake"],
      ["move2", "Dragon Claw"],
      ["move3", "Protect"],
      ["move4", "Rock Slide"],
    ] as const)("maps %s correctly", (field, expected) => {
      const result = dbPokemonToFlat(makePokemon());
      expect(result[field]).toBe(expected);
    });

    it("maps null move2 to undefined", () => {
      const result = dbPokemonToFlat(makePokemon({ move2: null }));
      expect(result.move2).toBeUndefined();
    });

    it("maps null move3 to undefined", () => {
      const result = dbPokemonToFlat(makePokemon({ move3: null }));
      expect(result.move3).toBeUndefined();
    });

    it("maps null move4 to undefined", () => {
      const result = dbPokemonToFlat(makePokemon({ move4: null }));
      expect(result.move4).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // EV field mappings (ev_special_attack ↔ ev_special_defense swaps are silent)
  // ---------------------------------------------------------------------------

  describe("EV field mappings", () => {
    const evRow = makePokemon({
      ev_hp: 4,
      ev_attack: 252,
      ev_defense: 8,
      ev_special_attack: 16,
      ev_special_defense: 32,
      ev_speed: 196,
    });

    it("maps ev_hp → evHp", () => {
      expect(dbPokemonToFlat(evRow).evHp).toBe(4);
    });

    it("maps ev_attack → evAttack", () => {
      expect(dbPokemonToFlat(evRow).evAttack).toBe(252);
    });

    it("maps ev_defense → evDefense", () => {
      expect(dbPokemonToFlat(evRow).evDefense).toBe(8);
    });

    it("maps ev_special_attack → evSpecialAttack (not evSpecialDefense)", () => {
      expect(dbPokemonToFlat(evRow).evSpecialAttack).toBe(16);
    });

    it("maps ev_special_defense → evSpecialDefense (not evSpecialAttack)", () => {
      expect(dbPokemonToFlat(evRow).evSpecialDefense).toBe(32);
    });

    it("maps ev_speed → evSpeed", () => {
      expect(dbPokemonToFlat(evRow).evSpeed).toBe(196);
    });

    it("all six distinct EV values are preserved without any swapping", () => {
      // Use all-unique values so any single swap is caught
      const row = makePokemon({
        ev_hp: 10,
        ev_attack: 20,
        ev_defense: 30,
        ev_special_attack: 40,
        ev_special_defense: 50,
        ev_speed: 60,
      });
      const result = dbPokemonToFlat(row);
      expect(result.evHp).toBe(10);
      expect(result.evAttack).toBe(20);
      expect(result.evDefense).toBe(30);
      expect(result.evSpecialAttack).toBe(40);
      expect(result.evSpecialDefense).toBe(50);
      expect(result.evSpeed).toBe(60);
    });

    it("uses 0 as default when all EV fields are null", () => {
      const row = makePokemon({
        ev_hp: null,
        ev_attack: null,
        ev_defense: null,
        ev_special_attack: null,
        ev_special_defense: null,
        ev_speed: null,
      });
      const result = dbPokemonToFlat(row);
      expect(result.evHp).toBe(0);
      expect(result.evAttack).toBe(0);
      expect(result.evDefense).toBe(0);
      expect(result.evSpecialAttack).toBe(0);
      expect(result.evSpecialDefense).toBe(0);
      expect(result.evSpeed).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // IV field mappings
  // ---------------------------------------------------------------------------

  describe("IV field mappings", () => {
    const ivRow = makePokemon({
      iv_hp: 30,
      iv_attack: 0,
      iv_defense: 29,
      iv_special_attack: 28,
      iv_special_defense: 27,
      iv_speed: 31,
    });

    it("maps iv_hp → ivHp", () => {
      expect(dbPokemonToFlat(ivRow).ivHp).toBe(30);
    });

    it("maps iv_attack → ivAttack", () => {
      expect(dbPokemonToFlat(ivRow).ivAttack).toBe(0);
    });

    it("maps iv_defense → ivDefense", () => {
      expect(dbPokemonToFlat(ivRow).ivDefense).toBe(29);
    });

    it("maps iv_special_attack → ivSpecialAttack (not ivSpecialDefense)", () => {
      expect(dbPokemonToFlat(ivRow).ivSpecialAttack).toBe(28);
    });

    it("maps iv_special_defense → ivSpecialDefense (not ivSpecialAttack)", () => {
      expect(dbPokemonToFlat(ivRow).ivSpecialDefense).toBe(27);
    });

    it("maps iv_speed → ivSpeed", () => {
      expect(dbPokemonToFlat(ivRow).ivSpeed).toBe(31);
    });

    it("all six distinct IV values are preserved without any swapping", () => {
      const row = makePokemon({
        iv_hp: 1,
        iv_attack: 2,
        iv_defense: 3,
        iv_special_attack: 4,
        iv_special_defense: 5,
        iv_speed: 6,
      });
      const result = dbPokemonToFlat(row);
      expect(result.ivHp).toBe(1);
      expect(result.ivAttack).toBe(2);
      expect(result.ivDefense).toBe(3);
      expect(result.ivSpecialAttack).toBe(4);
      expect(result.ivSpecialDefense).toBe(5);
      expect(result.ivSpeed).toBe(6);
    });

    it("uses 31 as default when all IV fields are null", () => {
      const row = makePokemon({
        iv_hp: null,
        iv_attack: null,
        iv_defense: null,
        iv_special_attack: null,
        iv_special_defense: null,
        iv_speed: null,
      });
      const result = dbPokemonToFlat(row);
      expect(result.ivHp).toBe(31);
      expect(result.ivAttack).toBe(31);
      expect(result.ivDefense).toBe(31);
      expect(result.ivSpecialAttack).toBe(31);
      expect(result.ivSpecialDefense).toBe(31);
      expect(result.ivSpeed).toBe(31);
    });
  });

  // ---------------------------------------------------------------------------
  // Gender mapping
  // ---------------------------------------------------------------------------

  describe("gender mapping", () => {
    it.each([
      ["Male", "Male"],
      ["Female", "Female"],
    ] as const)(
      "maps gender '%s' correctly to PokemonSetFlat",
      (dbGender, expected) => {
        const result = dbPokemonToFlat(makePokemon({ gender: dbGender }));
        expect(result.gender).toBe(expected);
      }
    );

    it("maps null gender to undefined", () => {
      const result = dbPokemonToFlat(makePokemon({ gender: null }));
      expect(result.gender).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Shiny mapping
  // ---------------------------------------------------------------------------

  describe("isShiny mapping", () => {
    it("maps is_shiny: true correctly", () => {
      const result = dbPokemonToFlat(makePokemon({ is_shiny: true }));
      expect(result.isShiny).toBe(true);
    });

    it("maps is_shiny: false correctly", () => {
      const result = dbPokemonToFlat(makePokemon({ is_shiny: false }));
      expect(result.isShiny).toBe(false);
    });

    it("defaults isShiny to false when is_shiny is null", () => {
      const result = dbPokemonToFlat(makePokemon({ is_shiny: null }));
      expect(result.isShiny).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Level mapping
  // ---------------------------------------------------------------------------

  describe("level mapping", () => {
    it("maps an explicit level value", () => {
      const result = dbPokemonToFlat(makePokemon({ level: 100 }));
      expect(result.level).toBe(100);
    });

    it("defaults level to 50 when level is null", () => {
      const result = dbPokemonToFlat(makePokemon({ level: null }));
      expect(result.level).toBe(50);
    });
  });

  // ---------------------------------------------------------------------------
  // Tera Type mapping
  // ---------------------------------------------------------------------------

  describe("teraType mapping", () => {
    it("maps tera_type to teraType", () => {
      const result = dbPokemonToFlat(makePokemon({ tera_type: "Steel" }));
      expect(result.teraType).toBe("Steel");
    });

    it("maps null tera_type to undefined", () => {
      const result = dbPokemonToFlat(makePokemon({ tera_type: null }));
      expect(result.teraType).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Held item mapping
  // ---------------------------------------------------------------------------

  describe("heldItem mapping", () => {
    it("maps held_item to heldItem", () => {
      const result = dbPokemonToFlat(makePokemon({ held_item: "Life Orb" }));
      expect(result.heldItem).toBe("Life Orb");
    });

    it("maps null held_item to undefined", () => {
      const result = dbPokemonToFlat(makePokemon({ held_item: null }));
      expect(result.heldItem).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // species / ability / nature null-guard defaults
  // ---------------------------------------------------------------------------

  describe("required string fields — null-guard defaults", () => {
    it("defaults species to empty string when null", () => {
      // species is non-null in the DB schema, but test the ?? guard defensively
      const row = makePokemon();
      // @ts-expect-error — intentionally testing the null guard
      row.species = null;
      expect(dbPokemonToFlat(row).species).toBe("");
    });

    it("defaults ability to empty string when null", () => {
      const row = makePokemon();
      // @ts-expect-error — testing null guard on a required field
      row.ability = null;
      expect(dbPokemonToFlat(row).ability).toBe("");
    });

    it("defaults nature to empty string when null", () => {
      const row = makePokemon();
      // @ts-expect-error — testing null guard on a required field
      row.nature = null;
      expect(dbPokemonToFlat(row).nature).toBe("");
    });
  });

  // ---------------------------------------------------------------------------
  // Minimal / empty DB row
  // ---------------------------------------------------------------------------

  describe("minimal DB row — all nullable fields are null", () => {
    const minimalRow = makePokemon({
      nickname: null,
      held_item: null,
      gender: null,
      level: null,
      is_shiny: null,
      tera_type: null,
      move2: null,
      move3: null,
      move4: null,
      ev_hp: null,
      ev_attack: null,
      ev_defense: null,
      ev_special_attack: null,
      ev_special_defense: null,
      ev_speed: null,
      iv_hp: null,
      iv_attack: null,
      iv_defense: null,
      iv_special_attack: null,
      iv_special_defense: null,
      iv_speed: null,
    });

    it("produces a structurally valid PokemonSetFlat", () => {
      const result = dbPokemonToFlat(minimalRow);
      expect(result).toMatchObject({
        species: "Garchomp",
        ability: "Rough Skin",
        nature: "Jolly",
        move1: "Earthquake",
        level: 50,
        isShiny: false,
        formatLegal: true,
        evHp: 0,
        evAttack: 0,
        evDefense: 0,
        evSpecialAttack: 0,
        evSpecialDefense: 0,
        evSpeed: 0,
        ivHp: 31,
        ivAttack: 31,
        ivDefense: 31,
        ivSpecialAttack: 31,
        ivSpecialDefense: 31,
        ivSpeed: 31,
      });
    });

    it("optional fields are absent (undefined) on a minimal row", () => {
      const result = dbPokemonToFlat(minimalRow);
      expect(result.nickname).toBeUndefined();
      expect(result.heldItem).toBeUndefined();
      expect(result.gender).toBeUndefined();
      expect(result.teraType).toBeUndefined();
      expect(result.move2).toBeUndefined();
      expect(result.move3).toBeUndefined();
      expect(result.move4).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Output shape completeness
  // ---------------------------------------------------------------------------

  describe("output shape completeness", () => {
    it("returns an object with all 22 expected keys", () => {
      const result = dbPokemonToFlat(makePokemon());
      const expectedKeys = [
        "species",
        "nickname",
        "ability",
        "nature",
        "move1",
        "move2",
        "move3",
        "move4",
        "heldItem",
        "level",
        "isShiny",
        "teraType",
        "gender",
        "formatLegal",
        "evHp",
        "evAttack",
        "evDefense",
        "evSpecialAttack",
        "evSpecialDefense",
        "evSpeed",
        "ivHp",
        "ivAttack",
        "ivDefense",
        "ivSpecialAttack",
        "ivSpecialDefense",
        "ivSpeed",
      ];
      for (const key of expectedKeys) {
        expect(result).toHaveProperty(key);
      }
    });
  });
});

// =============================================================================
// dbPokemonToPokemonSet
// =============================================================================

describe("dbPokemonToPokemonSet", () => {
  it("returns a structured PokemonSet with nested moves, evs, ivs", () => {
    const row = makePokemon();
    const result = dbPokemonToPokemonSet(row);

    expect(result.moves).toEqual({
      move1: "Earthquake",
      move2: "Dragon Claw",
      move3: "Protect",
      move4: "Rock Slide",
    });

    expect(result.evs).toEqual({
      hp: 4,
      attack: 252,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 252,
    });

    expect(result.ivs).toEqual({
      hp: 31,
      attack: 31,
      defense: 31,
      specialAttack: 31,
      specialDefense: 31,
      speed: 31,
    });
  });

  it("carries core fields to the top-level PokemonSet", () => {
    const result = dbPokemonToPokemonSet(makePokemon());
    expect(result.species).toBe("Garchomp");
    expect(result.ability).toBe("Rough Skin");
    expect(result.nature).toBe("Jolly");
    expect(result.heldItem).toBe("Choice Scarf");
    expect(result.level).toBe(50);
    expect(result.isShiny).toBe(false);
    expect(result.teraType).toBe("Dragon");
    expect(result.gender).toBe("Male");
    expect(result.formatLegal).toBe(true);
  });

  it("uses correct EV stat keys (not swapped)", () => {
    const row = makePokemon({
      ev_special_attack: 200,
      ev_special_defense: 56,
    });
    const result = dbPokemonToPokemonSet(row);
    expect(result.evs.specialAttack).toBe(200);
    expect(result.evs.specialDefense).toBe(56);
  });

  it("uses correct IV stat keys (not swapped)", () => {
    const row = makePokemon({
      iv_special_attack: 0,
      iv_special_defense: 30,
    });
    const result = dbPokemonToPokemonSet(row);
    expect(result.ivs.specialAttack).toBe(0);
    expect(result.ivs.specialDefense).toBe(30);
  });

  it("handles null optional fields gracefully on a minimal row", () => {
    const row = makePokemon({
      nickname: null,
      held_item: null,
      gender: null,
      tera_type: null,
      move2: null,
      move3: null,
      move4: null,
      level: null,
      is_shiny: null,
      ev_hp: null,
      ev_attack: null,
      ev_defense: null,
      ev_special_attack: null,
      ev_special_defense: null,
      ev_speed: null,
      iv_hp: null,
      iv_attack: null,
      iv_defense: null,
      iv_special_attack: null,
      iv_special_defense: null,
      iv_speed: null,
    });

    const result = dbPokemonToPokemonSet(row);
    expect(result.level).toBe(50);
    expect(result.isShiny).toBe(false);
    expect(result.evs.hp).toBe(0);
    expect(result.ivs.hp).toBe(31);
    expect(result.moves.move2).toBeUndefined();
  });
});
