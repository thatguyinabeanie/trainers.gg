/**
 * @jest-environment node
 */

// ---------------------------------------------------------------------------
// Mock setup — all jest.mock() calls must be hoisted above imports
// ---------------------------------------------------------------------------

// Mock bot detection — default to non-bot for all tests
jest.mock("botid/server", () => ({
  checkBotId: jest.fn().mockResolvedValue({ isBot: false }),
}));

// Mock next/headers — rejectBots() reads the bypass header
jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({
    get: jest.fn(() => null),
  })),
}));

// Sentinel Supabase client — passed through to mutations so we can assert it
const mockSupabase = {
  auth: { getUser: jest.fn() },
  from: jest.fn(),
};
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabase),
}));

// @/lib/utils — getErrorMessage used in the try/catch actions
jest.mock("@/lib/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

// @/lib/cache-invalidation — updateTag cannot run outside Server Action context
jest.mock("@/lib/cache-invalidation", () => ({
  invalidateTeamDetailCache: jest.fn(),
}));

// @trainers/utils — getErrorMessage used inside withAction.
// Return the actual Error message when available so legality violation
// messages propagate through withAction's catch block.
jest.mock("@trainers/utils", () => ({
  getErrorMessage: jest.fn((err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback
  ),
}));

// @trainers/supabase mutations + queries
const mockAddPokemonToTeam = jest.fn();
const mockUpdatePokemon = jest.fn();
const mockGetTeamWithPokemon = jest.fn();

jest.mock("@trainers/supabase", () => ({
  createTeam: jest.fn(),
  updateTeam: jest.fn(),
  deleteTeam: jest.fn(),
  forkTeam: jest.fn(),
  addPokemonToTeam: (...args: unknown[]) => mockAddPokemonToTeam(...args),
  updatePokemon: (...args: unknown[]) => mockUpdatePokemon(...args),
  removePokemonFromTeam: jest.fn(),
  reorderTeamPokemon: jest.fn(),
  getTeamWithPokemon: (...args: unknown[]) => mockGetTeamWithPokemon(...args),
}));

// @trainers/pokemon — mock legality functions for deterministic control
const mockIsLegalSpecies = jest.fn().mockReturnValue(true);
const mockIsLegalItem = jest.fn().mockReturnValue(true);
const mockIsLegalMove = jest.fn().mockReturnValue(true);
const mockIsLegalAbility = jest.fn().mockReturnValue(true);
const mockIsLegalTeraType = jest.fn().mockReturnValue(true);
const mockGetLegalSpecies = jest.fn();

jest.mock("@trainers/pokemon", () => ({
  isLegalSpecies: (...args: unknown[]) => mockIsLegalSpecies(...args),
  isLegalItem: (...args: unknown[]) => mockIsLegalItem(...args),
  isLegalMove: (...args: unknown[]) => mockIsLegalMove(...args),
  isLegalAbility: (...args: unknown[]) => mockIsLegalAbility(...args),
  isLegalTeraType: (...args: unknown[]) => mockIsLegalTeraType(...args),
  getLegalSpecies: (...args: unknown[]) => mockGetLegalSpecies(...args),
}));

// ---------------------------------------------------------------------------
// Imports — must come after all jest.mock() calls
// ---------------------------------------------------------------------------

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

import { addPokemonToTeamAction, updatePokemonAction } from "../teams";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A team row with format and one existing pokemon slot. */
function fakeTeam(overrides?: Record<string, unknown>) {
  return {
    id: 10,
    format: "gen9vgc2025regg",
    team_pokemon: [
      {
        id: 1,
        pokemon_id: 55,
        team_position: 1,
        pokemon: {
          id: 55,
          species: "Pikachu",
          ability: "Static",
          held_item: "Light Ball",
          move1: "Thunderbolt",
          move2: "Volt Tackle",
          move3: "Iron Tail",
          move4: "Quick Attack",
          tera_type: "Electric",
          nickname: null,
          gender: null,
          nature: "Jolly",
          level: 50,
          is_shiny: false,
          ev_hp: 0,
          ev_attack: 0,
          ev_defense: 0,
          ev_special_attack: 252,
          ev_special_defense: 0,
          ev_speed: 252,
          iv_hp: 31,
          iv_attack: 31,
          iv_defense: 31,
          iv_special_attack: 31,
          iv_special_defense: 31,
          iv_speed: 31,
          notes: null,
        },
      },
    ],
    ...overrides,
  };
}

/** Reset all mocks and set defaults (all legality checks pass). */
function resetMocks() {
  jest.clearAllMocks();
  // Default: all legality checks pass
  mockIsLegalSpecies.mockReturnValue(true);
  mockIsLegalItem.mockReturnValue(true);
  mockIsLegalMove.mockReturnValue(true);
  mockIsLegalAbility.mockReturnValue(true);
  mockIsLegalTeraType.mockReturnValue(true);
  // Default: team fetch returns a team with format
  mockGetTeamWithPokemon.mockResolvedValue(fakeTeam());
}

// =============================================================================
// addPokemonToTeamAction — legality guards
// =============================================================================

describe("addPokemonToTeamAction — legality guards", () => {
  beforeEach(resetMocks);

  const legalPokemon = { species: "Charizard" } as Parameters<
    typeof addPokemonToTeamAction
  >[1];

  it("rejects a Pokemon with a format-illegal species", async () => {
    mockIsLegalSpecies.mockReturnValue(false);

    const result = await addPokemonToTeamAction(10, legalPokemon, 1);

    expect(result).toEqual({
      success: false,
      error: "Charizard isn't legal in this format.",
    });
    expect(mockAddPokemonToTeam).not.toHaveBeenCalled();
  });

  it("rejects a Pokemon with a format-illegal item", async () => {
    mockIsLegalItem.mockReturnValue(false);
    const pokemon = {
      species: "Charizard",
      held_item: "Soul Dew",
    } as Parameters<typeof addPokemonToTeamAction>[1];

    const result = await addPokemonToTeamAction(10, pokemon, 1);

    expect(result).toEqual({
      success: false,
      error: "Soul Dew isn't a legal item in this format.",
    });
    expect(mockAddPokemonToTeam).not.toHaveBeenCalled();
  });

  it("rejects a Pokemon with an illegal move for the species", async () => {
    // Only reject moves, not species/item/ability
    mockIsLegalMove.mockReturnValue(false);
    const pokemon = {
      species: "Charizard",
      move1: "Spore",
    } as Parameters<typeof addPokemonToTeamAction>[1];

    const result = await addPokemonToTeamAction(10, pokemon, 1);

    expect(result).toEqual({
      success: false,
      error: "Charizard can't legally use Spore in this format.",
    });
    expect(mockAddPokemonToTeam).not.toHaveBeenCalled();
  });

  it("rejects a Pokemon with an illegal tera type", async () => {
    mockIsLegalTeraType.mockReturnValue(false);
    const pokemon = {
      species: "Charizard",
      tera_type: "Stellar",
    } as Parameters<typeof addPokemonToTeamAction>[1];

    const result = await addPokemonToTeamAction(10, pokemon, 1);

    expect(result).toEqual({
      success: false,
      error: "Tera type Stellar isn't allowed in this format.",
    });
    expect(mockAddPokemonToTeam).not.toHaveBeenCalled();
  });

  it("rejects a Pokemon with an ability it can't have in this format", async () => {
    mockIsLegalAbility.mockReturnValue(false);
    const pokemon = {
      species: "Smeargle",
      ability: "Moody",
    } as Parameters<typeof addPokemonToTeamAction>[1];

    const result = await addPokemonToTeamAction(10, pokemon, 1);

    expect(result).toEqual({
      success: false,
      error: "Smeargle can't legally have Moody in this format.",
    });
    expect(mockAddPokemonToTeam).not.toHaveBeenCalled();
  });

  it("allows a fully legal Pokemon", async () => {
    mockAddPokemonToTeam.mockResolvedValue({ pokemonId: 77 });

    const result = await addPokemonToTeamAction(10, legalPokemon, 1);

    expect(result).toEqual({ success: true, data: { pokemonId: 77 } });
    expect(mockAddPokemonToTeam).toHaveBeenCalled();
  });

  it("skips legality check when the team has no format", async () => {
    mockGetTeamWithPokemon.mockResolvedValue(fakeTeam({ format: null }));
    mockAddPokemonToTeam.mockResolvedValue({ pokemonId: 77 });

    const result = await addPokemonToTeamAction(10, legalPokemon, 1);

    expect(result).toEqual({ success: true, data: { pokemonId: 77 } });
    // Legality functions should not have been called
    expect(mockIsLegalSpecies).not.toHaveBeenCalled();
  });

  it("returns error when the team is not found", async () => {
    mockGetTeamWithPokemon.mockResolvedValue(null);

    const result = await addPokemonToTeamAction(10, legalPokemon, 1);

    expect(result).toEqual({
      success: false,
      error: "Team not found. It may have been deleted.",
    });
    expect(mockAddPokemonToTeam).not.toHaveBeenCalled();
    expect(mockIsLegalSpecies).not.toHaveBeenCalled();
  });
});

// =============================================================================
// updatePokemonAction — legality guards
// =============================================================================

describe("updatePokemonAction — legality guards", () => {
  beforeEach(resetMocks);

  it("rejects an item swap to a banned item", async () => {
    mockIsLegalItem.mockReturnValue(false);

    const result = await updatePokemonAction(10, 55, {
      held_item: "Soul Dew",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Soul Dew");
      expect(result.error).toContain("legal item");
    }
    expect(mockUpdatePokemon).not.toHaveBeenCalled();
  });

  it("rejects a move swap to an illegal move", async () => {
    mockIsLegalMove.mockReturnValue(false);

    const result = await updatePokemonAction(10, 55, {
      move1: "Spore",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Spore");
    }
    expect(mockUpdatePokemon).not.toHaveBeenCalled();
  });

  it("rejects an ability swap to one not on the species", async () => {
    mockIsLegalAbility.mockReturnValue(false);

    const result = await updatePokemonAction(10, 55, {
      ability: "Intimidate",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Intimidate");
    }
    expect(mockUpdatePokemon).not.toHaveBeenCalled();
  });

  it("rejects a species swap to a format-illegal species", async () => {
    mockIsLegalSpecies.mockReturnValue(false);

    const result = await updatePokemonAction(10, 55, {
      species: "Mewtwo",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Mewtwo");
    }
    expect(mockUpdatePokemon).not.toHaveBeenCalled();
  });

  it("rejects a tera type swap to an illegal tera type", async () => {
    mockIsLegalTeraType.mockReturnValue(false);

    const result = await updatePokemonAction(10, 55, {
      tera_type: "Stellar",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Stellar");
    }
    expect(mockUpdatePokemon).not.toHaveBeenCalled();
  });

  it("merges current pokemon data with updates before validating", async () => {
    // Change just the item — species should still come from the current row
    mockUpdatePokemon.mockResolvedValue(undefined);

    await updatePokemonAction(10, 55, { held_item: "Focus Sash" });

    // isLegalItem should have been called with the new item
    expect(mockIsLegalItem).toHaveBeenCalledWith(
      "Focus Sash",
      "gen9vgc2025regg"
    );
    // isLegalSpecies should have been called with the current species (Pikachu)
    expect(mockIsLegalSpecies).toHaveBeenCalledWith(
      "Pikachu",
      "gen9vgc2025regg"
    );
  });

  it("allows a valid update", async () => {
    mockUpdatePokemon.mockResolvedValue(undefined);

    const result = await updatePokemonAction(10, 55, {
      held_item: "Focus Sash",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdatePokemon).toHaveBeenCalled();
  });

  it("skips legality check when the team has no format", async () => {
    mockGetTeamWithPokemon.mockResolvedValue(fakeTeam({ format: null }));
    mockUpdatePokemon.mockResolvedValue(undefined);

    const result = await updatePokemonAction(10, 55, {
      held_item: "Soul Dew",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockIsLegalItem).not.toHaveBeenCalled();
  });
});
