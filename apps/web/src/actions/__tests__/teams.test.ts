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

// Chainable query builder factory — used when tests need mockSupabase.from()
// to behave like a real Supabase query builder.
const createMockQueryBuilder = () => {
  const qb = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return qb;
};

// Sentinel Supabase client — passed through to mutations so we can assert it
const mockSupabase = {
  auth: { getUser: jest.fn() },
  from: jest.fn(),
};
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabase),
}));

// @/lib/utils — getErrorMessage used in the try/catch actions (createTeamAction etc.)
jest.mock("@/lib/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

// @/lib/cache-invalidation — updateTag cannot run outside Server Action context
jest.mock("@/lib/cache-invalidation", () => ({
  invalidateTeamDetailCache: jest.fn(),
}));

// @trainers/utils — getErrorMessage used inside withAction
const mockTrainersGetErrorMessage = jest.fn(
  (_err: unknown, fallback: string) => fallback
);
jest.mock("@trainers/utils", () => ({
  getErrorMessage: (...args: unknown[]) => mockTrainersGetErrorMessage(...args),
}));

// @trainers/supabase mutations
const mockCreateTeam = jest.fn();
const mockUpdateTeam = jest.fn();
const mockDeleteTeam = jest.fn();
const mockForkTeam = jest.fn();
const mockAddPokemonToTeam = jest.fn();
const mockUpdatePokemon = jest.fn();
const mockRemovePokemonFromTeam = jest.fn();
const mockReorderTeamPokemon = jest.fn();
const mockGetTeamWithPokemon = jest.fn();

jest.mock("@trainers/supabase", () => ({
  createTeam: (...args: unknown[]) => mockCreateTeam(...args),
  updateTeam: (...args: unknown[]) => mockUpdateTeam(...args),
  deleteTeam: (...args: unknown[]) => mockDeleteTeam(...args),
  forkTeam: (...args: unknown[]) => mockForkTeam(...args),
  addPokemonToTeam: (...args: unknown[]) => mockAddPokemonToTeam(...args),
  updatePokemon: (...args: unknown[]) => mockUpdatePokemon(...args),
  removePokemonFromTeam: (...args: unknown[]) =>
    mockRemovePokemonFromTeam(...args),
  reorderTeamPokemon: (...args: unknown[]) => mockReorderTeamPokemon(...args),
  getTeamWithPokemon: (...args: unknown[]) => mockGetTeamWithPokemon(...args),
}));

// @trainers/pokemon — mock legality functions so tests are deterministic
const mockGetLegalSpecies = jest.fn();
const mockIsLegalSpecies = jest.fn().mockReturnValue(true);
const mockIsLegalItem = jest.fn().mockReturnValue(true);
const mockIsLegalMove = jest.fn().mockReturnValue(true);
const mockIsLegalAbility = jest.fn().mockReturnValue(true);
const mockIsLegalTeraType = jest.fn().mockReturnValue(true);

jest.mock("@trainers/pokemon", () => ({
  getLegalSpecies: (...args: unknown[]) => mockGetLegalSpecies(...args),
  isLegalSpecies: (...args: unknown[]) => mockIsLegalSpecies(...args),
  isLegalItem: (...args: unknown[]) => mockIsLegalItem(...args),
  isLegalMove: (...args: unknown[]) => mockIsLegalMove(...args),
  isLegalAbility: (...args: unknown[]) => mockIsLegalAbility(...args),
  isLegalTeraType: (...args: unknown[]) => mockIsLegalTeraType(...args),
}));

// ---------------------------------------------------------------------------
// Imports — must come after all jest.mock() calls
// ---------------------------------------------------------------------------

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { checkBotId } from "botid/server";

import {
  createTeamAction,
  updateTeamAction,
  deleteTeamAction,
  forkTeamAction,
  addPokemonToTeamAction,
  updatePokemonAction,
  removePokemonFromTeamAction,
  reorderTeamPokemonAction,
} from "../teams";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Force the bot check to return isBot: true for a single test. */
function simulateBot() {
  (checkBotId as ReturnType<typeof jest.fn>).mockResolvedValueOnce({
    isBot: true,
  });
}

// =============================================================================
// createTeamAction
// =============================================================================

describe("createTeamAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: caller is authenticated as user "user-123"
    (mockSupabase.auth.getUser as ReturnType<typeof jest.fn>).mockResolvedValue(
      { data: { user: { id: "user-123" } } }
    );
    // Default: caller owns the alt (from("alts") returns a row)
    const mockAltQb = createMockQueryBuilder();
    mockAltQb.maybeSingle.mockResolvedValue({
      data: { id: 7 },
      error: null,
    });
    (mockSupabase.from as ReturnType<typeof jest.fn>).mockReturnValue(
      mockAltQb
    );
  });

  it("creates a team and returns the new id", async () => {
    mockCreateTeam.mockResolvedValue({ id: 42 });

    const result = await createTeamAction(7, "Rain Team", "vgc2025");

    expect(result).toEqual({ success: true, data: { id: 42 } });
    expect(mockCreateTeam).toHaveBeenCalledWith(
      mockSupabase,
      7,
      "Rain Team",
      "vgc2025"
    );
  });

  it("returns an error when the mutation throws", async () => {
    mockCreateTeam.mockRejectedValue(new Error("DB error"));

    const result = await createTeamAction(7, "Rain Team", "vgc2025");

    expect(result).toEqual({ success: false, error: "Failed to create team" });
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await createTeamAction(7, "Rain Team", "vgc2025");

    expect(result.success).toBe(false);
    expect(mockCreateTeam).not.toHaveBeenCalled();
  });

  it("returns a validation error when altId is 0", async () => {
    const result = await createTeamAction(0, "Rain Team", "vgc2025");

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(mockCreateTeam).not.toHaveBeenCalled();
  });

  it("returns 'You do not own this alt.' when the caller does not own the altId", async () => {
    // Ownership check returns no row — caller doesn't own this alt
    const mockAltQb = createMockQueryBuilder();
    mockAltQb.maybeSingle.mockResolvedValue({ data: null, error: null });
    (mockSupabase.from as ReturnType<typeof jest.fn>).mockReturnValue(
      mockAltQb
    );

    const result = await createTeamAction(7, "Rain Team", "vgc2025");

    expect(result).toEqual({
      success: false,
      error: "You do not own this alt.",
    });
    expect(mockCreateTeam).not.toHaveBeenCalled();
  });
});

// =============================================================================
// updateTeamAction
// =============================================================================

describe("updateTeamAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates team metadata", async () => {
    mockUpdateTeam.mockResolvedValue(undefined);

    const result = await updateTeamAction(10, { name: "Sun Team" });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdateTeam).toHaveBeenCalledWith(mockSupabase, 10, {
      name: "Sun Team",
    });
  });

  it("returns an error when the mutation throws", async () => {
    mockUpdateTeam.mockRejectedValue(new Error("Update failed"));

    const result = await updateTeamAction(10, { name: "Sun Team" });

    expect(result).toEqual({ success: false, error: "Failed to update team" });
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await updateTeamAction(10, { name: "Sun Team" });

    expect(result.success).toBe(false);
    expect(mockUpdateTeam).not.toHaveBeenCalled();
  });

  it("strips disallowed fields (created_by) before calling mutation", async () => {
    // teamUpdateDataSchema strips unknown fields — created_by is omitted, not rejected.
    // The mutation is called with an empty (safe) object rather than the raw input.
    mockUpdateTeam.mockResolvedValue(undefined);

    const result = await updateTeamAction(10, {
      created_by: 999,
    } as unknown as Parameters<typeof updateTeamAction>[1]);

    expect(result).toEqual({ success: true, data: undefined });
    // Mutation was called with stripped data (no created_by)
    expect(mockUpdateTeam).toHaveBeenCalledWith(mockSupabase, 10, {});
  });

  // ---------------------------------------------------------------------------
  // Format-change legality guard
  // ---------------------------------------------------------------------------

  it("blocks a format change when the team holds a species illegal in the target format", async () => {
    // Team is on gen9vgc2024regh, trying to switch to gen9vgc2026regi.
    // Mew is not in the gen9vgc2026regi legal set.
    const illegalLegalSet = new Set(["Charizard", "Pikachu"]); // Mew is absent
    mockGetLegalSpecies.mockReturnValue(illegalLegalSet);
    mockGetTeamWithPokemon.mockResolvedValue({
      id: 10,
      format: "gen9vgc2024regh",
      team_pokemon: [
        { pokemon: { species: "Charizard" } },
        { pokemon: { species: "Mew" } },
      ],
    });

    const result = await updateTeamAction(10, { format: "gen9vgc2026regi" });

    expect(result.success).toBe(false);
    // The guard now returns directly — verify the error message mentions Mew
    if (!result.success) {
      expect(result.error).toContain("Mew");
      expect(result.error).toContain("Remove them before changing format");
    }
    expect(mockUpdateTeam).not.toHaveBeenCalled();
  });

  it("allows a format change when all current species are legal in the target format", async () => {
    // All team members are in the legal set for the target format.
    const allLegalSet = new Set(["Charizard", "Pikachu"]);
    mockGetLegalSpecies.mockReturnValue(allLegalSet);
    mockGetTeamWithPokemon.mockResolvedValue({
      id: 10,
      format: "gen9vgc2024regh",
      team_pokemon: [
        { pokemon: { species: "Charizard" } },
        { pokemon: { species: "Pikachu" } },
      ],
    });
    mockUpdateTeam.mockResolvedValue(undefined);

    const result = await updateTeamAction(10, { format: "gen9vgc2026regi" });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdateTeam).toHaveBeenCalled();
  });

  it("bypasses the legality check entirely for non-format updates", async () => {
    mockUpdateTeam.mockResolvedValue(undefined);

    const result = await updateTeamAction(10, { name: "New Name" });

    expect(result).toEqual({ success: true, data: undefined });
    // getTeamWithPokemon should not have been called — no format field present
    expect(mockGetTeamWithPokemon).not.toHaveBeenCalled();
    expect(mockUpdateTeam).toHaveBeenCalledWith(mockSupabase, 10, {
      name: "New Name",
    });
  });

  it("returns an error when the team is not found during a format change", async () => {
    mockGetTeamWithPokemon.mockResolvedValue(null);

    const result = await updateTeamAction(10, { format: "gen9vgc2026regi" });

    expect(result.success).toBe(false);
    // The guard now returns directly instead of throwing inside withAction
    if (!result.success) {
      expect(result.error).toContain("Team not found");
    }
    expect(mockUpdateTeam).not.toHaveBeenCalled();
  });
});

// =============================================================================
// deleteTeamAction
// =============================================================================

describe("deleteTeamAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes a team", async () => {
    mockDeleteTeam.mockResolvedValue(undefined);

    const result = await deleteTeamAction(5);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockDeleteTeam).toHaveBeenCalledWith(mockSupabase, 5);
  });

  it("returns an error when the mutation throws", async () => {
    mockDeleteTeam.mockRejectedValue(new Error("Delete failed"));

    const result = await deleteTeamAction(5);

    expect(result).toEqual({ success: false, error: "Failed to delete team" });
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await deleteTeamAction(5);

    expect(result.success).toBe(false);
    expect(mockDeleteTeam).not.toHaveBeenCalled();
  });
});

// =============================================================================
// forkTeamAction
// =============================================================================

describe("forkTeamAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forks a team and returns the new team id", async () => {
    mockForkTeam.mockResolvedValue({ id: 99 });

    const result = await forkTeamAction(1, 3);

    expect(result).toEqual({ success: true, data: { id: 99 } });
    expect(mockForkTeam).toHaveBeenCalledWith(mockSupabase, 1, 3, undefined);
  });

  it("passes an optional new name to the mutation", async () => {
    mockForkTeam.mockResolvedValue({ id: 99 });

    await forkTeamAction(1, 3, "My Fork");

    expect(mockForkTeam).toHaveBeenCalledWith(mockSupabase, 1, 3, "My Fork");
  });

  it("returns an error when the mutation throws", async () => {
    mockForkTeam.mockRejectedValue(new Error("Fork failed"));

    const result = await forkTeamAction(1, 3);

    expect(result).toEqual({ success: false, error: "Failed to fork team" });
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await forkTeamAction(1, 3);

    expect(result.success).toBe(false);
    expect(mockForkTeam).not.toHaveBeenCalled();
  });
});

// =============================================================================
// addPokemonToTeamAction
// =============================================================================

describe("addPokemonToTeamAction", () => {
  const fakePokemon = { species: "Pikachu" } as Parameters<
    typeof addPokemonToTeamAction
  >[1];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: legality checks pass, team has a format
    mockIsLegalSpecies.mockReturnValue(true);
    mockIsLegalItem.mockReturnValue(true);
    mockIsLegalMove.mockReturnValue(true);
    mockIsLegalAbility.mockReturnValue(true);
    mockIsLegalTeraType.mockReturnValue(true);
    mockGetTeamWithPokemon.mockResolvedValue({
      id: 10,
      format: "gen9vgc2025regg",
      team_pokemon: [],
    });
  });

  it("adds a pokemon and returns the new pokemon id", async () => {
    mockAddPokemonToTeam.mockResolvedValue({ pokemonId: 77 });

    const result = await addPokemonToTeamAction(10, fakePokemon, 1);

    expect(result).toEqual({ success: true, data: { pokemonId: 77 } });
    expect(mockAddPokemonToTeam).toHaveBeenCalledWith(
      mockSupabase,
      10,
      expect.objectContaining({ species: "Pikachu" }),
      1
    );
  });

  it("returns an error when the mutation throws", async () => {
    mockAddPokemonToTeam.mockRejectedValue(new Error("Team full"));

    const result = await addPokemonToTeamAction(10, fakePokemon, 1);

    expect(result).toEqual({
      success: false,
      error: "Failed to add pokemon to team",
    });
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await addPokemonToTeamAction(10, fakePokemon, 1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to add pokemon to team");
    }
    expect(mockAddPokemonToTeam).not.toHaveBeenCalled();
  });

  it("returns a validation error when position is 0", async () => {
    const result = await addPokemonToTeamAction(10, fakePokemon, 0);

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(mockAddPokemonToTeam).not.toHaveBeenCalled();
  });

  it("returns an error when the team is not found", async () => {
    mockGetTeamWithPokemon.mockResolvedValue(null);

    const result = await addPokemonToTeamAction(10, fakePokemon, 1);

    expect(result).toEqual({
      success: false,
      error: "Team not found. It may have been deleted.",
    });
    expect(mockAddPokemonToTeam).not.toHaveBeenCalled();
  });
});

// =============================================================================
// updatePokemonAction
// =============================================================================

describe("updatePokemonAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: legality checks pass, team has a format with the pokemon
    mockIsLegalSpecies.mockReturnValue(true);
    mockIsLegalItem.mockReturnValue(true);
    mockIsLegalMove.mockReturnValue(true);
    mockIsLegalAbility.mockReturnValue(true);
    mockIsLegalTeraType.mockReturnValue(true);
    mockGetTeamWithPokemon.mockResolvedValue({
      id: 1,
      format: "gen9vgc2025regg",
      team_pokemon: [
        {
          id: 1,
          pokemon_id: 55,
          team_position: 1,
          pokemon: { id: 55, species: "Pikachu", ability: "Static" },
        },
      ],
    });
  });

  it("updates a pokemon", async () => {
    mockUpdatePokemon.mockResolvedValue(undefined);

    const result = await updatePokemonAction(1, 55, { nickname: "Sparky" });

    expect(result).toEqual({ success: true, data: undefined });
    // teamId (1) is now passed to the mutation so it can verify the binding
    expect(mockUpdatePokemon).toHaveBeenCalledWith(mockSupabase, 1, 55, {
      nickname: "Sparky",
    });
  });

  it("returns an error when the mutation throws", async () => {
    mockUpdatePokemon.mockRejectedValue(new Error("Pokemon not found"));

    const result = await updatePokemonAction(1, 55, { nickname: "Sparky" });

    expect(result).toEqual({
      success: false,
      error: "Failed to update pokemon",
    });
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await updatePokemonAction(1, 55, { nickname: "Sparky" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to update pokemon");
    }
    expect(mockUpdatePokemon).not.toHaveBeenCalled();
  });

  it("returns a validation error when teamId is 0", async () => {
    const result = await updatePokemonAction(0, 55, { nickname: "Sparky" });

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(mockUpdatePokemon).not.toHaveBeenCalled();
  });

  it("returns an error when the team is not found", async () => {
    mockGetTeamWithPokemon.mockResolvedValue(null);

    const result = await updatePokemonAction(1, 55, { nickname: "Sparky" });

    expect(result).toEqual({
      success: false,
      error: "Team not found. It may have been deleted.",
    });
    expect(mockUpdatePokemon).not.toHaveBeenCalled();
  });

  it("rejects when pokemonId exists but is not on the specified teamId", async () => {
    // Team exists but the pokemon slot for pokemonId 99 is NOT on team 1.
    // The in-memory guard (team.team_pokemon.find) returns undefined, so the
    // action should return an error before calling the mutation.
    mockGetTeamWithPokemon.mockResolvedValue({
      id: 1,
      format: "gen9vgc2025regg",
      team_pokemon: [
        {
          id: 1,
          pokemon_id: 55, // only pokemonId 55 is on this team
          team_position: 1,
          pokemon: { id: 55, species: "Pikachu", ability: "Static" },
        },
      ],
    });

    // Attempt to update pokemonId 99, which belongs to a different team
    const result = await updatePokemonAction(1, 99, { nickname: "Impostor" });

    expect(result).toEqual({
      success: false,
      error: "Pokemon not found on this team.",
    });
    expect(mockUpdatePokemon).not.toHaveBeenCalled();
  });
});

// =============================================================================
// removePokemonFromTeamAction
// =============================================================================

describe("removePokemonFromTeamAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes a pokemon from a team", async () => {
    mockRemovePokemonFromTeam.mockResolvedValue(undefined);

    const result = await removePokemonFromTeamAction(10, 55);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockRemovePokemonFromTeam).toHaveBeenCalledWith(
      mockSupabase,
      10,
      55
    );
  });

  it("returns an error when the mutation throws", async () => {
    mockRemovePokemonFromTeam.mockRejectedValue(new Error("Not found"));

    const result = await removePokemonFromTeamAction(10, 55);

    expect(result).toEqual({
      success: false,
      error: "Failed to remove pokemon from team",
    });
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await removePokemonFromTeamAction(10, 55);

    expect(result.success).toBe(false);
    expect(mockRemovePokemonFromTeam).not.toHaveBeenCalled();
  });
});

// =============================================================================
// reorderTeamPokemonAction
// =============================================================================

describe("reorderTeamPokemonAction", () => {
  const positions = [
    { pokemonId: 1, position: 1 },
    { pokemonId: 2, position: 2 },
    { pokemonId: 3, position: 3 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reorders pokemon within a team", async () => {
    mockReorderTeamPokemon.mockResolvedValue(undefined);

    const result = await reorderTeamPokemonAction(10, positions);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockReorderTeamPokemon).toHaveBeenCalledWith(
      mockSupabase,
      10,
      positions
    );
  });

  it("returns an error when the mutation throws", async () => {
    mockReorderTeamPokemon.mockRejectedValue(new Error("Invalid positions"));

    const result = await reorderTeamPokemonAction(10, positions);

    expect(result).toEqual({
      success: false,
      error: "Failed to reorder team pokemon",
    });
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await reorderTeamPokemonAction(10, positions);

    expect(result.success).toBe(false);
    expect(mockReorderTeamPokemon).not.toHaveBeenCalled();
  });

  it("returns a validation error for an empty positions array", async () => {
    const result = await reorderTeamPokemonAction(10, []);

    expect(result.success).toBe(false);
    expect(mockReorderTeamPokemon).not.toHaveBeenCalled();
  });
});
