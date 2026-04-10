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

// @/lib/utils — getErrorMessage used in the try/catch actions (createTeamAction etc.)
jest.mock("@/lib/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

// @/lib/cache-invalidation — updateTag cannot run outside Server Action context
jest.mock("@/lib/cache-invalidation", () => ({
  invalidateTeamCaches: jest.fn(),
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
    expect(mockAddPokemonToTeam).not.toHaveBeenCalled();
  });

  it("returns a validation error when position is 0", async () => {
    const result = await addPokemonToTeamAction(10, fakePokemon, 0);

    expect(result).toEqual({ success: false, error: expect.any(String) });
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

  it("updates a pokemon", async () => {
    mockUpdatePokemon.mockResolvedValue(undefined);

    const result = await updatePokemonAction(55, { nickname: "Sparky" });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdatePokemon).toHaveBeenCalledWith(mockSupabase, 55, {
      nickname: "Sparky",
    });
  });

  it("returns an error when the mutation throws", async () => {
    mockUpdatePokemon.mockRejectedValue(new Error("Pokemon not found"));

    const result = await updatePokemonAction(55, { nickname: "Sparky" });

    expect(result).toEqual({
      success: false,
      error: "Failed to update pokemon",
    });
  });

  it("returns an error when a bot is detected", async () => {
    simulateBot();

    const result = await updatePokemonAction(55, { nickname: "Sparky" });

    expect(result.success).toBe(false);
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
