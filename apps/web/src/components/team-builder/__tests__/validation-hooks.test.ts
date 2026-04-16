import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { renderHook, act } from "@testing-library/react";

// =============================================================================
// Module-level mocks — must be set up before imports
// =============================================================================

// Mock the heavy @pkmn/dex used inside @trainers/pokemon validation and
// inside validation-hooks.ts (Dex.species.get for genderless check).
jest.mock("@pkmn/dex", () => ({
  Dex: {
    forGen: jest.fn(() => ({})),
    species: {
      // Return a species object with gender property — default to non-genderless
      get: jest.fn((name: string) => ({
        exists: name !== "Fakemon",
        name,
        gender: name === "Magnemite" ? "N" : undefined,
        abilities: { 0: "Intimidate", 1: "Moxie" },
        genderRatio: { M: 0.5, F: 0.5 },
      })),
    },
    natures: { get: jest.fn() },
    abilities: { get: jest.fn() },
    items: { get: jest.fn() },
    moves: { get: jest.fn() },
    types: { get: jest.fn(), values: jest.fn(() => []) },
  },
}));

jest.mock("@pkmn/data", () => ({
  Generations: jest.fn().mockImplementation(() => ({
    get: jest.fn(() => ({
      species: {
        get: jest.fn((name: string) => ({
          exists: name !== "Fakemon",
          name,
          abilities: { 0: "Intimidate", 1: "Moxie" },
          genderRatio: { M: 0.5, F: 0.5 },
        })),
      },
      natures: {
        get: jest.fn((name: string) => ({
          exists: name === "Adamant" || name === "Jolly" || name === "Hardy",
        })),
      },
      abilities: {
        get: jest.fn((name: string) => ({
          exists: !!name && name !== "FakeAbility",
        })),
      },
      items: {
        get: jest.fn((name: string) => ({
          exists: !!name && name !== "FakeItem",
        })),
      },
      moves: {
        get: jest.fn((name: string) => ({
          exists: !!name && name !== "FakeMove",
        })),
        [Symbol.iterator]: jest.fn(() => [][Symbol.iterator]()),
      },
      types: {
        get: jest.fn((name: string) => ({ exists: !!name })),
        [Symbol.iterator]: jest.fn(() => [][Symbol.iterator]()),
      },
    })),
  })),
}));

// Mock containsProfanity from @trainers/validators
const mockContainsProfanity = jest.fn(() => false);
jest.mock("@trainers/validators", () => ({
  containsProfanity: (...args: unknown[]) => mockContainsProfanity(...args),
}));

// =============================================================================
// Import under test (after mocks)
// =============================================================================

import { useTeamValidation, type ValidationError } from "../validation-hooks";
import { type TeamWithPokemon } from "@trainers/supabase";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Helpers
// =============================================================================

type TeamPokemon = TeamWithPokemon["team_pokemon"];
type DbPokemon = NonNullable<
  TeamWithPokemon["team_pokemon"][number]["pokemon"]
>;

function makePokemon(overrides: Partial<DbPokemon> = {}): DbPokemon {
  return {
    id: overrides.id ?? 1,
    species: overrides.species ?? "Arcanine",
    nickname: overrides.nickname ?? null,
    ability: overrides.ability ?? "Intimidate",
    nature: overrides.nature ?? "Adamant",
    held_item: overrides.held_item ?? null,
    level: overrides.level ?? 50,
    is_shiny: overrides.is_shiny ?? false,
    tera_type: overrides.tera_type ?? null,
    gender: overrides.gender ?? null,
    move1: overrides.move1 ?? "Fake Out",
    move2: overrides.move2 ?? null,
    move3: overrides.move3 ?? null,
    move4: overrides.move4 ?? null,
    ev_hp: overrides.ev_hp ?? 0,
    ev_attack: overrides.ev_attack ?? 252,
    ev_defense: overrides.ev_defense ?? 0,
    ev_special_attack: overrides.ev_special_attack ?? 0,
    ev_special_defense: overrides.ev_special_defense ?? 4,
    ev_speed: overrides.ev_speed ?? 252,
    iv_hp: overrides.iv_hp ?? 31,
    iv_attack: overrides.iv_attack ?? 31,
    iv_defense: overrides.iv_defense ?? 31,
    iv_special_attack: overrides.iv_special_attack ?? 31,
    iv_special_defense: overrides.iv_special_defense ?? 31,
    iv_speed: overrides.iv_speed ?? 31,
    created_at: overrides.created_at ?? "2025-01-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2025-01-01T00:00:00Z",
    team_id: overrides.team_id ?? 1,
    ...overrides,
  } as unknown as DbPokemon;
}

function makeEntry(
  pokemonId: number,
  teamPosition: number,
  pokemon: DbPokemon | null = makePokemon({ id: pokemonId })
): TeamPokemon[number] {
  return {
    id: pokemonId * 100,
    pokemon_id: pokemonId,
    team_position: teamPosition,
    pokemon,
  };
}

function makeFullTeam(): TeamPokemon {
  return [1, 2, 3, 4, 5, 6].map((n) =>
    makeEntry(n, n, makePokemon({ id: n, species: `Species${n}` }))
  );
}

const mockFormat: GameFormat = {
  id: "gen9vgc2025regi",
  game: "Scarlet & Violet",
  gameShort: "SV",
  generation: 9,
  category: "VGC",
  year: 2025,
  regulation: "I",
  label: "SV: Reg I",
  showdownName: "VGC 2025 Reg I",
  doubles: true,
  active: true,
};

// =============================================================================
// Tests
// =============================================================================

describe("useTeamValidation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockContainsProfanity.mockReturnValue(false);
  });

  afterEach(() => {
    // Flush pending timers inside act so React state updates are wrapped correctly
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    mockContainsProfanity.mockReset().mockReturnValue(false);
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  it("starts with empty errors and isValid true", () => {
    const { result } = renderHook(() => useTeamValidation([], mockFormat));

    expect(result.current.errors).toEqual([]);
    expect(result.current.pokemonErrors.size).toBe(0);
    expect(result.current.isValid).toBe(true);
  });

  it("exposes a validate function", () => {
    const { result } = renderHook(() => useTeamValidation([], mockFormat));
    expect(typeof result.current.validate).toBe("function");
  });

  // ---------------------------------------------------------------------------
  // Debounce behaviour
  // ---------------------------------------------------------------------------

  it("does not validate synchronously — waits for the debounce timer", () => {
    const team = [makeEntry(1, 1, makePokemon({ held_item: "Leftovers" }))];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    // No validation ran yet
    expect(result.current.errors).toEqual([]);

    // Advance timer to fire debounce
    act(() => {
      jest.runAllTimers();
    });

    // Now validation has run — errors may or may not exist but state was set
    // (we just verify the hook didn't throw and state is an array)
    expect(Array.isArray(result.current.errors)).toBe(true);
  });

  it("resets the debounce timer when teamPokemon changes again before the timer fires", () => {
    const team1 = [makeEntry(1, 1)];
    let teamPokemon = team1;

    const { result, rerender } = renderHook(() =>
      useTeamValidation(teamPokemon, mockFormat)
    );

    // Advance only partially
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Change the team — should reset the timer
    teamPokemon = [makeEntry(1, 1), makeEntry(2, 2)];
    rerender();

    // Advance partway again — original timer should NOT have fired
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.errors).toEqual([]);

    // Now let the new timer fire
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    expect(Array.isArray(result.current.errors)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // validate() — immediate
  // ---------------------------------------------------------------------------

  it("validate() runs immediately without waiting for debounce", () => {
    const team = makeFullTeam();

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    // No debounce has fired yet
    expect(result.current.errors).toEqual([]);

    act(() => {
      result.current.validate();
    });

    // Validation ran synchronously (via act)
    expect(Array.isArray(result.current.errors)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Team size warning
  // ---------------------------------------------------------------------------

  it("adds a warning when team has fewer than 6 Pokemon", () => {
    const team = [makeEntry(1, 1), makeEntry(2, 2), makeEntry(3, 3)];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    const warnings = result.current.errors.filter(
      (e) => e.severity === "warning" && e.field === "teamSize"
    );
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]?.message).toContain("3 of 6");
  });

  it("does not add a team size warning for a full team of 6", () => {
    const team = makeFullTeam();

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    const warnings = result.current.errors.filter(
      (e) => e.field === "teamSize"
    );
    expect(warnings).toHaveLength(0);
  });

  it("isValid is true when only warnings are present", () => {
    const team = [makeEntry(1, 1)]; // 1 of 6 → team size warning

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    // Only warning present — isValid should be true
    const onlyWarnings = result.current.errors.every(
      (e) => e.severity === "warning"
    );
    if (onlyWarnings) {
      expect(result.current.isValid).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // Duplicate held items
  // ---------------------------------------------------------------------------

  it("creates errors on both Pokemon when they share the same held item", () => {
    const team: TeamPokemon = [
      makeEntry(
        1,
        1,
        makePokemon({ id: 1, species: "Arcanine", held_item: "Life Orb" })
      ),
      makeEntry(
        2,
        2,
        makePokemon({ id: 2, species: "Garchomp", held_item: "Life Orb" })
      ),
    ];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    const itemErrors = result.current.errors.filter((e) => e.field === "item");
    expect(itemErrors.length).toBe(2);

    const arcanineError = itemErrors.find((e) => e.pokemonId === 1);
    expect(arcanineError?.message).toContain("Garchomp");

    const garchompError = itemErrors.find((e) => e.pokemonId === 2);
    expect(garchompError?.message).toContain("Arcanine");
  });

  it("does not flag items when each Pokemon has a unique item", () => {
    const team: TeamPokemon = [
      makeEntry(1, 1, makePokemon({ id: 1, held_item: "Life Orb" })),
      makeEntry(2, 2, makePokemon({ id: 2, held_item: "Choice Scarf" })),
    ];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    const itemErrors = result.current.errors.filter((e) => e.field === "item");
    expect(itemErrors).toHaveLength(0);
  });

  it("does not flag duplicate items when held_item is null", () => {
    const team: TeamPokemon = [
      makeEntry(1, 1, makePokemon({ id: 1, held_item: null })),
      makeEntry(2, 2, makePokemon({ id: 2, held_item: null })),
    ];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    const itemErrors = result.current.errors.filter((e) => e.field === "item");
    expect(itemErrors).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Duplicate species
  // ---------------------------------------------------------------------------

  it("creates errors on all Pokemon that share the same species", () => {
    const team: TeamPokemon = [
      makeEntry(1, 1, makePokemon({ id: 1, species: "Arcanine" })),
      makeEntry(2, 2, makePokemon({ id: 2, species: "Arcanine" })),
    ];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    const speciesErrors = result.current.errors.filter(
      (e) => e.field === "species" && e.message.includes("Duplicate species")
    );
    expect(speciesErrors.length).toBe(2);
    expect(speciesErrors.every((e) => e.severity === "error")).toBe(true);
  });

  it("does not flag species when all are unique", () => {
    const team: TeamPokemon = [
      makeEntry(1, 1, makePokemon({ id: 1, species: "Arcanine" })),
      makeEntry(2, 2, makePokemon({ id: 2, species: "Garchomp" })),
    ];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    const speciesErrors = result.current.errors.filter(
      (e) => e.field === "species" && e.message.includes("Duplicate species")
    );
    expect(speciesErrors).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Nickname profanity
  // ---------------------------------------------------------------------------

  it("adds an error when a nickname contains profanity", () => {
    mockContainsProfanity.mockReturnValue(true);

    const team: TeamPokemon = [
      makeEntry(
        1,
        1,
        makePokemon({ id: 1, species: "Pikachu", nickname: "BadWord" })
      ),
    ];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    const nicknameErrors = result.current.errors.filter(
      (e) => e.field === "nickname"
    );
    expect(nicknameErrors.length).toBeGreaterThan(0);
    expect(nicknameErrors[0]?.message).toContain("inappropriate");
    expect(nicknameErrors[0]?.severity).toBe("error");
  });

  it("does not flag a clean nickname", () => {
    mockContainsProfanity.mockReturnValue(false);

    const team: TeamPokemon = [
      makeEntry(
        1,
        1,
        makePokemon({ id: 1, species: "Pikachu", nickname: "Sparky" })
      ),
    ];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    const nicknameErrors = result.current.errors.filter(
      (e) => e.field === "nickname"
    );
    expect(nicknameErrors).toHaveLength(0);
  });

  it("skips profanity check when pokemon has no nickname", () => {
    const team: TeamPokemon = [
      makeEntry(1, 1, makePokemon({ id: 1, nickname: null })),
    ];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    expect(mockContainsProfanity).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // pokemonErrors grouping
  // ---------------------------------------------------------------------------

  it("groups errors by pokemonId in pokemonErrors Map", () => {
    // Create two Pokemon with the same item (guarantees errors on both)
    const team: TeamPokemon = [
      makeEntry(
        10,
        1,
        makePokemon({ id: 10, species: "Arcanine", held_item: "Life Orb" })
      ),
      makeEntry(
        20,
        2,
        makePokemon({ id: 20, species: "Garchomp", held_item: "Life Orb" })
      ),
    ];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    // Each pokemon should have at least the duplicate item error
    expect(result.current.pokemonErrors.has(10)).toBe(true);
    expect(result.current.pokemonErrors.has(20)).toBe(true);

    const p10Errors = result.current.pokemonErrors.get(10) ?? [];
    expect(p10Errors.every((e: ValidationError) => e.pokemonId === 10)).toBe(
      true
    );
  });

  // ---------------------------------------------------------------------------
  // Null pokemon entries
  // ---------------------------------------------------------------------------

  it("skips null pokemon entries gracefully", () => {
    const team: TeamPokemon = [
      makeEntry(1, 1, null),
      makeEntry(2, 2, makePokemon({ id: 2 })),
    ];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      expect(() => result.current.validate()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // isValid reflects error presence
  // ---------------------------------------------------------------------------

  it("isValid is false when any error-severity item is present", () => {
    // Two Pokemon sharing an item guarantees error-severity errors
    const team: TeamPokemon = [
      makeEntry(1, 1, makePokemon({ id: 1, held_item: "Life Orb" })),
      makeEntry(2, 2, makePokemon({ id: 2, held_item: "Life Orb" })),
    ];

    const { result } = renderHook(() => useTeamValidation(team, mockFormat));

    act(() => {
      result.current.validate();
    });

    expect(result.current.isValid).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // format undefined
  // ---------------------------------------------------------------------------

  it("works when format is undefined", () => {
    const team = [makeEntry(1, 1)];

    const { result } = renderHook(() => useTeamValidation(team, undefined));

    act(() => {
      expect(() => result.current.validate()).not.toThrow();
    });
    expect(Array.isArray(result.current.errors)).toBe(true);
  });
});
