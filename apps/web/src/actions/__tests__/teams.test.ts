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

// Sentinel Supabase client — passed through to mutations so we can assert it
const mockSupabase = {
  auth: { getUser: jest.fn() },
  from: jest.fn(),
};
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabase),
}));

// next/cache
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

// @/lib/utils — getErrorMessage used in the try/catch actions (createTeamAction etc.)
jest.mock("@/lib/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

// @trainers/utils — getErrorMessage used inside withAction
jest.mock("@trainers/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
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

  it("invalidates the teams list cache for the alt after creation", async () => {
    mockCreateTeam.mockResolvedValue({ id: 42 });

    await createTeamAction(7, "Rain Team", "vgc2025");

    expect(mockUpdateTag).toHaveBeenCalledWith("teams-alt-7");
    expect(mockUpdateTag).not.toHaveBeenCalledWith("team-42");
  });

  it("returns an error when the mutation throws", async () => {
    mockCreateTeam.mockRejectedValue(new Error("DB error"));

    const result = await createTeamAction(7, "Rain Team", "vgc2025");

    expect(result).toEqual({ success: false, error: "Failed to create team" });
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await createTeamAction(7, "Rain Team", "vgc2025");

    expect(result.success).toBe(false);
    expect(mockCreateTeam).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });
});

// =============================================================================
// updateTeamAction
// =============================================================================

describe("updateTeamAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates team metadata and invalidates the team cache", async () => {
    mockUpdateTeam.mockResolvedValue(undefined);

    const result = await updateTeamAction(10, { name: "Sun Team" });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdateTeam).toHaveBeenCalledWith(mockSupabase, 10, {
      name: "Sun Team",
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("team-10");
  });

  it("returns an error when the mutation throws", async () => {
    mockUpdateTeam.mockRejectedValue(new Error("Update failed"));

    const result = await updateTeamAction(10, { name: "Sun Team" });

    expect(result).toEqual({ success: false, error: "Failed to update team" });
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await updateTeamAction(10, { name: "Sun Team" });

    expect(result.success).toBe(false);
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

  it("deletes a team and invalidates the team cache", async () => {
    mockDeleteTeam.mockResolvedValue(undefined);

    const result = await deleteTeamAction(5);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockDeleteTeam).toHaveBeenCalledWith(mockSupabase, 5);
    expect(mockUpdateTag).toHaveBeenCalledWith("team-5");
  });

  it("returns an error when the mutation throws", async () => {
    mockDeleteTeam.mockRejectedValue(new Error("Delete failed"));

    const result = await deleteTeamAction(5);

    expect(result).toEqual({ success: false, error: "Failed to delete team" });
    expect(mockUpdateTag).not.toHaveBeenCalled();
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

  it("invalidates the target alt's teams list cache, not the source team cache", async () => {
    mockForkTeam.mockResolvedValue({ id: 99 });

    await forkTeamAction(1, 3);

    expect(mockUpdateTag).toHaveBeenCalledWith("teams-alt-3");
    expect(mockUpdateTag).not.toHaveBeenCalledWith("teams-alt-1");
    expect(mockUpdateTag).not.toHaveBeenCalledWith("team-1");
    expect(mockUpdateTag).not.toHaveBeenCalledWith("team-99");
  });

  it("returns an error when the mutation throws", async () => {
    mockForkTeam.mockRejectedValue(new Error("Fork failed"));

    const result = await forkTeamAction(1, 3);

    expect(result).toEqual({ success: false, error: "Failed to fork team" });
    expect(mockUpdateTag).not.toHaveBeenCalled();
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
  });

  it("adds a pokemon and returns the new pokemon id", async () => {
    mockAddPokemonToTeam.mockResolvedValue({ pokemonId: 77 });

    const result = await addPokemonToTeamAction(10, fakePokemon, 0);

    expect(result).toEqual({ success: true, data: { pokemonId: 77 } });
    expect(mockAddPokemonToTeam).toHaveBeenCalledWith(
      mockSupabase,
      10,
      fakePokemon,
      0
    );
  });

  it("invalidates the team cache after adding a pokemon", async () => {
    mockAddPokemonToTeam.mockResolvedValue({ pokemonId: 77 });

    await addPokemonToTeamAction(10, fakePokemon, 0);

    expect(mockUpdateTag).toHaveBeenCalledWith("team-10");
  });

  it("returns an error when the mutation throws", async () => {
    mockAddPokemonToTeam.mockRejectedValue(new Error("Team full"));

    const result = await addPokemonToTeamAction(10, fakePokemon, 0);

    expect(result).toEqual({
      success: false,
      error: "Failed to add pokemon to team",
    });
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await addPokemonToTeamAction(10, fakePokemon, 0);

    expect(result.success).toBe(false);
    expect(mockAddPokemonToTeam).not.toHaveBeenCalled();
  });
});

// =============================================================================
// updatePokemonAction
// =============================================================================

describe("updatePokemonAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates a pokemon and invalidates the team cache when teamId is provided", async () => {
    mockUpdatePokemon.mockResolvedValue(undefined);

    const result = await updatePokemonAction(55, { nickname: "Sparky" }, 10);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdatePokemon).toHaveBeenCalledWith(mockSupabase, 55, {
      nickname: "Sparky",
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("team-10");
  });

  it("updates a pokemon without invalidating any cache when teamId is omitted", async () => {
    mockUpdatePokemon.mockResolvedValue(undefined);

    const result = await updatePokemonAction(55, { nickname: "Sparky" });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdatePokemon).toHaveBeenCalledWith(mockSupabase, 55, {
      nickname: "Sparky",
    });
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("does not invalidate cache when teamId is 0 (falsy)", async () => {
    mockUpdatePokemon.mockResolvedValue(undefined);

    await updatePokemonAction(55, { nickname: "Sparky" }, 0);

    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns an error when the mutation throws", async () => {
    mockUpdatePokemon.mockRejectedValue(new Error("Pokemon not found"));

    const result = await updatePokemonAction(55, { nickname: "Sparky" }, 10);

    expect(result).toEqual({
      success: false,
      error: "Failed to update pokemon",
    });
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await updatePokemonAction(55, { nickname: "Sparky" }, 10);

    expect(result.success).toBe(false);
    expect(mockUpdatePokemon).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });
});

// =============================================================================
// removePokemonFromTeamAction
// =============================================================================

describe("removePokemonFromTeamAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes a pokemon and invalidates the team cache", async () => {
    mockRemovePokemonFromTeam.mockResolvedValue(undefined);

    const result = await removePokemonFromTeamAction(10, 55);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockRemovePokemonFromTeam).toHaveBeenCalledWith(
      mockSupabase,
      10,
      55
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("team-10");
  });

  it("returns an error when the mutation throws", async () => {
    mockRemovePokemonFromTeam.mockRejectedValue(new Error("Not found"));

    const result = await removePokemonFromTeamAction(10, 55);

    expect(result).toEqual({
      success: false,
      error: "Failed to remove pokemon from team",
    });
    expect(mockUpdateTag).not.toHaveBeenCalled();
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
    { pokemonId: 1, position: 0 },
    { pokemonId: 2, position: 1 },
    { pokemonId: 3, position: 2 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reorders pokemon and invalidates the team cache", async () => {
    mockReorderTeamPokemon.mockResolvedValue(undefined);

    const result = await reorderTeamPokemonAction(10, positions);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockReorderTeamPokemon).toHaveBeenCalledWith(
      mockSupabase,
      10,
      positions
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("team-10");
  });

  it("returns an error when the mutation throws", async () => {
    mockReorderTeamPokemon.mockRejectedValue(new Error("Invalid positions"));

    const result = await reorderTeamPokemonAction(10, positions);

    expect(result).toEqual({
      success: false,
      error: "Failed to reorder team pokemon",
    });
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await reorderTeamPokemonAction(10, positions);

    expect(result.success).toBe(false);
    expect(mockReorderTeamPokemon).not.toHaveBeenCalled();
  });

  it("handles an empty positions array without error", async () => {
    mockReorderTeamPokemon.mockResolvedValue(undefined);

    const result = await reorderTeamPokemonAction(10, []);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockReorderTeamPokemon).toHaveBeenCalledWith(mockSupabase, 10, []);
  });
});
