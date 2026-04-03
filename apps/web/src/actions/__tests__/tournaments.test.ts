/**
 * @jest-environment node
 */

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

// Sentinel object used as the mock Supabase client.
const mockSupabase: Record<string, unknown> = {
  __mock: true,
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    }),
  },
};

// @trainers/supabase mutation mocks
const mockCreateTournament = jest.fn();
const mockUpdateTournament = jest.fn();
const mockDeleteTournament = jest.fn();
const mockArchiveTournament = jest.fn();
const mockRegisterForTournament = jest.fn();
const mockCancelRegistration = jest.fn();
const mockStartRound = jest.fn();
const mockUpdateRegistrationStatus = jest.fn();
const mockCheckIn = jest.fn();
const mockUndoCheckIn = jest.fn();
const mockWithdrawFromTournament = jest.fn();
const mockUpdateRegistrationPreferences = jest.fn();
const mockSubmitTeam = jest.fn();
const mockSelectTeamForTournament = jest.fn();
const mockCreateRound = jest.fn();
const mockGenerateRoundPairings = jest.fn();
const mockCompleteRound = jest.fn();
const mockDeleteRoundAndMatches = jest.fn();
const mockRecalculateStandings = jest.fn();
const mockDropPlayer = jest.fn();
const mockReportMatchResult = jest.fn();
const mockStartTournamentEnhanced = jest.fn();
const mockAdvanceToTopCut = jest.fn();
const mockGenerateEliminationPairings = jest.fn();
const mockCompleteTournament = jest.fn();
const mockGetCurrentUserAlts = jest.fn();
const mockGetUserTeams = jest.fn();
const mockGetUserRegistrationDetails = jest.fn();
const mockGetPhaseRoundsWithStats = jest.fn();
const mockGetRoundMatchesWithStats = jest.fn();

jest.mock("@trainers/supabase", () => ({
  createTournament: (...args: unknown[]) => mockCreateTournament(...args),
  updateTournament: (...args: unknown[]) => mockUpdateTournament(...args),
  deleteTournament: (...args: unknown[]) => mockDeleteTournament(...args),
  archiveTournament: (...args: unknown[]) => mockArchiveTournament(...args),
  registerForTournament: (...args: unknown[]) =>
    mockRegisterForTournament(...args),
  cancelRegistration: (...args: unknown[]) => mockCancelRegistration(...args),
  startRound: (...args: unknown[]) => mockStartRound(...args),
  updateRegistrationStatus: (...args: unknown[]) =>
    mockUpdateRegistrationStatus(...args),
  updateRegistrationPreferences: (...args: unknown[]) =>
    mockUpdateRegistrationPreferences(...args),
  checkIn: (...args: unknown[]) => mockCheckIn(...args),
  undoCheckIn: (...args: unknown[]) => mockUndoCheckIn(...args),
  withdrawFromTournament: (...args: unknown[]) =>
    mockWithdrawFromTournament(...args),
  submitTeam: (...args: unknown[]) => mockSubmitTeam(...args),
  selectTeamForTournament: (...args: unknown[]) =>
    mockSelectTeamForTournament(...args),
  createRound: (...args: unknown[]) => mockCreateRound(...args),
  generateRoundPairings: (...args: unknown[]) =>
    mockGenerateRoundPairings(...args),
  completeRound: (...args: unknown[]) => mockCompleteRound(...args),
  deleteRoundAndMatches: (...args: unknown[]) =>
    mockDeleteRoundAndMatches(...args),
  recalculateStandings: (...args: unknown[]) =>
    mockRecalculateStandings(...args),
  dropPlayer: (...args: unknown[]) => mockDropPlayer(...args),
  reportMatchResult: (...args: unknown[]) => mockReportMatchResult(...args),
  startTournamentEnhanced: (...args: unknown[]) =>
    mockStartTournamentEnhanced(...args),
  advanceToTopCut: (...args: unknown[]) => mockAdvanceToTopCut(...args),
  generateEliminationPairings: (...args: unknown[]) =>
    mockGenerateEliminationPairings(...args),
  completeTournament: (...args: unknown[]) => mockCompleteTournament(...args),
  getCurrentUserAlts: (...args: unknown[]) => mockGetCurrentUserAlts(...args),
  getUserTeams: (...args: unknown[]) => mockGetUserTeams(...args),
  getUserRegistrationDetails: (...args: unknown[]) =>
    mockGetUserRegistrationDetails(...args),
  getPhaseRoundsWithStats: (...args: unknown[]) =>
    mockGetPhaseRoundsWithStats(...args),
  getRoundMatchesWithStats: (...args: unknown[]) =>
    mockGetRoundMatchesWithStats(...args),
}));

const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

jest.mock("botid/server", () => ({
  checkBotId: jest.fn().mockResolvedValue({ isBot: false }),
}));

// Use a lazy factory so `mockSupabase` is resolved at call time, not hoist time.
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabase),
}));

jest.mock("@/lib/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

import {
  createTournament,
  updateTournament,
  publishTournament,
  startTournament,
  completeTournament,
  advanceToTopCut,
  generateEliminationPairings,
  archiveTournament,
  deleteTournament,
  registerForTournament,
  cancelRegistration,
  checkIn,
  undoCheckIn,
  withdrawFromTournament,
  getRegistrationDetailsAction,
  updateRegistrationAction,
  submitTeamAction,
  selectTeamAction,
  getCurrentUserAltsAction,
  getUserTeamsAction,
  createRound,
  generatePairings,
  startRound,
  completeRound,
  recalculateStandings,
  dropPlayer,
  dropFromTournament,
  reportMatchResult,
  prepareRound,
  confirmAndStartRound,
  cancelPreparedRound,
  forceCheckInPlayer,
  removePlayerFromTournament,
  bulkForceCheckIn,
  bulkRemovePlayers,
} from "../tournaments";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ── createTournament ───────────────────────────────────────────────────────

describe("createTournament", () => {
  const input = {
    communityId: 1,
    name: "VGC Regionals",
    slug: "vgc-regionals",
  };

  it("returns success with id and slug on happy path", async () => {
    mockCreateTournament.mockResolvedValue({ id: 42, slug: "vgc-regionals" });

    const result = await createTournament(input);

    expect(result).toEqual({
      success: true,
      data: { id: 42, slug: "vgc-regionals" },
    });
    // Mutation receives supabase client + data
    expect(mockCreateTournament).toHaveBeenCalledWith(mockSupabase, input);
    // Draft tournaments do not revalidate the list
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns error when the mutation throws", async () => {
    mockCreateTournament.mockRejectedValue(new Error("db error"));

    const result = await createTournament(input);

    expect(result).toEqual({
      success: false,
      error: "Failed to create tournament",
    });
  });
});

// ── updateTournament ───────────────────────────────────────────────────────

describe("updateTournament", () => {
  it("revalidates tournament tag on success", async () => {
    mockUpdateTournament.mockResolvedValue(undefined);

    const result = await updateTournament(10, { name: "Updated Name" });

    expect(result.success).toBe(true);
    expect(mockUpdateTournament).toHaveBeenCalledWith(mockSupabase, 10, {
      name: "Updated Name",
    });
    // Should revalidate individual tournament but NOT the list
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:10");
    expect(mockUpdateTag).not.toHaveBeenCalledWith("tournaments-list");
  });

  it("also revalidates TOURNAMENTS_LIST when status is 'upcoming'", async () => {
    mockUpdateTournament.mockResolvedValue(undefined);

    await updateTournament(10, { status: "upcoming" });

    expect(mockUpdateTag).toHaveBeenCalledWith("tournaments-list");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:10");
  });

  it("returns error when the mutation throws", async () => {
    mockUpdateTournament.mockRejectedValue(new Error("fail"));

    const result = await updateTournament(10, { name: "x" });

    expect(result).toEqual({
      success: false,
      error: "Failed to update tournament",
    });
  });
});

// ── publishTournament ──────────────────────────────────────────────────────

describe("publishTournament", () => {
  it("sets status to upcoming and revalidates both tags", async () => {
    mockUpdateTournament.mockResolvedValue(undefined);

    const result = await publishTournament(7);

    expect(result).toEqual({ success: true, data: { success: true } });
    // Calls updateTournament mutation with status: "upcoming"
    expect(mockUpdateTournament).toHaveBeenCalledWith(mockSupabase, 7, {
      status: "upcoming",
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("tournaments-list");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:7");
  });
});

// ── registerForTournament ──────────────────────────────────────────────────

describe("registerForTournament", () => {
  it("returns registrationId and status on success", async () => {
    mockRegisterForTournament.mockResolvedValue({
      registrationId: 99,
      status: "registered",
    });

    const result = await registerForTournament(5, { altId: 1 });

    expect(result).toEqual({
      success: true,
      data: { registrationId: 99, status: "registered" },
    });
    expect(mockRegisterForTournament).toHaveBeenCalledWith(mockSupabase, 5, {
      altId: 1,
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("tournaments-list");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when registration fails", async () => {
    mockRegisterForTournament.mockRejectedValue(
      new Error("already registered")
    );

    const result = await registerForTournament(5);

    expect(result).toEqual({
      success: false,
      error: "Failed to register",
    });
  });
});

// ── cancelRegistration ─────────────────────────────────────────────────────

describe("cancelRegistration", () => {
  it("cancels and revalidates list + tournament tags", async () => {
    mockCancelRegistration.mockResolvedValue(undefined);

    const result = await cancelRegistration(100, 5);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockCancelRegistration).toHaveBeenCalledWith(mockSupabase, 100);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournaments-list");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });
});

// ── startRound ─────────────────────────────────────────────────────────────

describe("startRound", () => {
  it("starts the round and revalidates tournament tag", async () => {
    mockStartRound.mockResolvedValue(undefined);

    const result = await startRound(20, 5);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockStartRound).toHaveBeenCalledWith(mockSupabase, 20);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });
});

// ── deleteTournament ───────────────────────────────────────────────────────

describe("deleteTournament", () => {
  it("deletes successfully without revalidating list (draft only)", async () => {
    mockDeleteTournament.mockResolvedValue(undefined);

    const result = await deleteTournament(3);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockDeleteTournament).toHaveBeenCalledWith(mockSupabase, 3);
    // Draft tournaments are not public — no list revalidation
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns error when delete fails", async () => {
    mockDeleteTournament.mockRejectedValue(new Error("not found"));

    const result = await deleteTournament(3);

    expect(result).toEqual({
      success: false,
      error: "Failed to delete tournament",
    });
  });
});
// ── forceCheckInPlayer ─────────────────────────────────────────────────────

describe("forceCheckInPlayer", () => {
  it("updates status to checked_in and revalidates tournament cache", async () => {
    mockUpdateRegistrationStatus.mockResolvedValue({
      success: true,
      tournamentId: 10,
    });

    const result = await forceCheckInPlayer(42);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockUpdateRegistrationStatus).toHaveBeenCalledWith(
      mockSupabase,
      42,
      "checked_in"
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:10");
  });

  it("returns error when mutation fails", async () => {
    mockUpdateRegistrationStatus.mockRejectedValue(
      new Error("permission denied")
    );

    const result = await forceCheckInPlayer(42);

    expect(result).toEqual({
      success: false,
      error: "Failed to force check-in player",
    });
  });
});

// ── removePlayerFromTournament ─────────────────────────────────────────────

describe("removePlayerFromTournament", () => {
  it("updates status to dropped and revalidates tournament cache", async () => {
    mockUpdateRegistrationStatus.mockResolvedValue({
      success: true,
      tournamentId: 10,
    });

    const result = await removePlayerFromTournament(42, "no_show");

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockUpdateRegistrationStatus).toHaveBeenCalledWith(
      mockSupabase,
      42,
      "dropped",
      { dropCategory: "no_show", dropNotes: undefined }
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:10");
  });

  it("returns error when mutation fails", async () => {
    mockUpdateRegistrationStatus.mockRejectedValue(
      new Error("permission denied")
    );

    const result = await removePlayerFromTournament(
      42,
      "conduct",
      "Bad behavior"
    );

    expect(result).toEqual({
      success: false,
      error: "Failed to remove player",
    });
  });
});

// ── bulkForceCheckIn ───────────────────────────────────────────────────────

describe("bulkForceCheckIn", () => {
  it("performs bulk update and returns counts", async () => {
    // First call: select registrations
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [
          { id: 1, tournament_id: 10 },
          { id: 2, tournament_id: 10 },
        ],
        error: null,
      }),
    });

    // Second call: bulk update
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [{ id: 1 }, { id: 2 }],
        error: null,
      }),
    });

    const result = await bulkForceCheckIn([1, 2]);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ checkedIn: 2, failed: 0 });
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:10");
  });

  it("returns empty result for empty array", async () => {
    const result = await bulkForceCheckIn([]);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ checkedIn: 0, failed: 0 });
  });

  it("handles partial update failures", async () => {
    // Select returns 3 registrations
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [
          { id: 1, tournament_id: 10 },
          { id: 2, tournament_id: 10 },
          { id: 3, tournament_id: 10 },
        ],
        error: null,
      }),
    });

    // Update only succeeds for 2 of them
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [{ id: 1 }, { id: 2 }],
        error: null,
      }),
    });

    const result = await bulkForceCheckIn([1, 2, 3]);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ checkedIn: 2, failed: 1 });
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:10");
  });
});

// ── bulkRemovePlayers ──────────────────────────────────────────────────────

describe("bulkRemovePlayers", () => {
  it("performs bulk update with drop fields and returns counts", async () => {
    const mockUpdate = jest.fn().mockReturnThis();

    // First call: select registrations
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [
          { id: 1, tournament_id: 10 },
          { id: 2, tournament_id: 10 },
        ],
        error: null,
      }),
    });

    // Second call: tournament lookup for permission check
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 1 },
        error: null,
      }),
    });

    // Third call: bulk update
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      update: mockUpdate,
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [{ id: 1 }, { id: 2 }],
        error: null,
      }),
    });

    // Mock rpc for permission check
    mockSupabase.rpc = jest.fn().mockResolvedValue({ data: true });

    const result = await bulkRemovePlayers([1, 2], "no_show");

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ removed: 2, failed: 0 });
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:10");

    // Verify the update payload includes drop metadata
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "dropped",
        drop_category: "no_show",
        drop_notes: null,
        dropped_by: "user-123",
        dropped_at: expect.any(String),
      })
    );
  });

  it("returns empty result for empty array", async () => {
    const result = await bulkRemovePlayers([], "no_show");

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ removed: 0, failed: 0 });
  });

  it("handles partial update failures and passes drop notes", async () => {
    const mockUpdate = jest.fn().mockReturnThis();

    // Select returns 3 registrations
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [
          { id: 1, tournament_id: 10 },
          { id: 2, tournament_id: 10 },
          { id: 3, tournament_id: 10 },
        ],
        error: null,
      }),
    });

    // Tournament lookup for permission check
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 1 },
        error: null,
      }),
    });

    // Update only succeeds for 2 of them
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      update: mockUpdate,
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [{ id: 1 }, { id: 2 }],
        error: null,
      }),
    });

    // Mock rpc for permission check
    mockSupabase.rpc = jest.fn().mockResolvedValue({ data: true });

    const result = await bulkRemovePlayers(
      [1, 2, 3],
      "conduct",
      "Group violation"
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ removed: 2, failed: 1 });
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:10");

    // Verify the update payload includes drop metadata with notes
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "dropped",
        drop_category: "conduct",
        drop_notes: "Group violation",
        dropped_by: "user-123",
        dropped_at: expect.any(String),
      })
    );
  });
});

// ── startTournament ────────────────────────────────────────────────────────

describe("startTournament", () => {
  it("returns teamsLocked and phaseActivated on success", async () => {
    mockStartTournamentEnhanced.mockResolvedValue({
      teamsLocked: 8,
      phaseActivated: 1,
    });

    const result = await startTournament(5);

    expect(result).toEqual({
      success: true,
      data: { teamsLocked: 8, phaseActivated: 1 },
    });
    expect(mockStartTournamentEnhanced).toHaveBeenCalledWith(mockSupabase, 5);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournaments-list");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockStartTournamentEnhanced.mockRejectedValue(new Error("cannot start"));

    const result = await startTournament(5);

    expect(result).toEqual({
      success: false,
      error: "Failed to start tournament",
    });
  });
});

// ── completeTournament ─────────────────────────────────────────────────────

describe("completeTournament", () => {
  it("completes and revalidates all relevant tags", async () => {
    mockCompleteTournament.mockResolvedValue(undefined);

    const result = await completeTournament(7);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockCompleteTournament).toHaveBeenCalledWith(mockSupabase, 7);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournaments-list");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:7");
    expect(mockUpdateTag).toHaveBeenCalledWith("players-leaderboard");
    expect(mockUpdateTag).toHaveBeenCalledWith("players-recent");
  });

  it("returns error when mutation throws", async () => {
    mockCompleteTournament.mockRejectedValue(new Error("db error"));

    const result = await completeTournament(7);

    expect(result).toEqual({
      success: false,
      error: "Failed to complete tournament",
    });
  });
});

// ── advanceToTopCut ────────────────────────────────────────────────────────

describe("advanceToTopCut", () => {
  it("advances and returns camelCased result", async () => {
    mockAdvanceToTopCut.mockResolvedValue({
      qualifiers: 8,
      matches_created: 4,
      phase_id: 2,
      round_id: 10,
    });

    const result = await advanceToTopCut(5);

    expect(result).toEqual({
      success: true,
      data: {
        qualifiers: 8,
        matchesCreated: 4,
        phaseId: 2,
        roundId: 10,
      },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockAdvanceToTopCut.mockRejectedValue(new Error("not enough players"));

    const result = await advanceToTopCut(5);

    expect(result).toEqual({
      success: false,
      error: "Failed to advance to top cut",
    });
  });
});

// ── generateEliminationPairings ────────────────────────────────────────────

describe("generateEliminationPairings", () => {
  it("generates pairings and revalidates tournament", async () => {
    mockGenerateEliminationPairings.mockResolvedValue({
      matchesCreated: 4,
      winnersAdvanced: 4,
    });

    const result = await generateEliminationPairings(10, 5);

    expect(result).toEqual({
      success: true,
      data: { matchesCreated: 4, winnersAdvanced: 4 },
    });
    expect(mockGenerateEliminationPairings).toHaveBeenCalledWith(
      mockSupabase,
      10
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockGenerateEliminationPairings.mockRejectedValue(new Error("no bracket"));

    const result = await generateEliminationPairings(10, 5);

    expect(result).toEqual({
      success: false,
      error: "Failed to generate elimination pairings",
    });
  });
});

// ── archiveTournament ──────────────────────────────────────────────────────

describe("archiveTournament", () => {
  it("archives and revalidates both list and tournament tags", async () => {
    mockArchiveTournament.mockResolvedValue(undefined);

    const result = await archiveTournament(3);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockArchiveTournament).toHaveBeenCalledWith(mockSupabase, 3);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournaments-list");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:3");
  });

  it("returns error when mutation throws", async () => {
    mockArchiveTournament.mockRejectedValue(new Error("not found"));

    const result = await archiveTournament(3);

    expect(result).toEqual({
      success: false,
      error: "Failed to archive tournament",
    });
  });
});

// ── checkIn ───────────────────────────────────────────────────────────────

describe("checkIn", () => {
  it("checks in and revalidates tournament cache", async () => {
    mockCheckIn.mockResolvedValue(undefined);

    const result = await checkIn(5);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockCheckIn).toHaveBeenCalledWith(mockSupabase, 5);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockCheckIn.mockRejectedValue(new Error("check-in closed"));

    const result = await checkIn(5);

    expect(result).toEqual({
      success: false,
      error: "Failed to check in",
    });
  });
});

// ── undoCheckIn ────────────────────────────────────────────────────────────

describe("undoCheckIn", () => {
  it("undoes check-in and revalidates tournament cache", async () => {
    mockUndoCheckIn.mockResolvedValue(undefined);

    const result = await undoCheckIn(5);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockUndoCheckIn).toHaveBeenCalledWith(mockSupabase, 5);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockUndoCheckIn.mockRejectedValue(new Error("not checked in"));

    const result = await undoCheckIn(5);

    expect(result).toEqual({
      success: false,
      error: "Failed to undo check-in",
    });
  });
});

// ── withdrawFromTournament ─────────────────────────────────────────────────

describe("withdrawFromTournament", () => {
  it("withdraws and revalidates list + tournament tags", async () => {
    mockWithdrawFromTournament.mockResolvedValue(undefined);

    const result = await withdrawFromTournament(5);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockWithdrawFromTournament).toHaveBeenCalledWith(mockSupabase, 5);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournaments-list");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockWithdrawFromTournament.mockRejectedValue(
      new Error("tournament already started")
    );

    const result = await withdrawFromTournament(5);

    expect(result).toEqual({
      success: false,
      error: "Failed to withdraw",
    });
  });
});

// ── getRegistrationDetailsAction ───────────────────────────────────────────

describe("getRegistrationDetailsAction", () => {
  it("returns registration details on success", async () => {
    const details = {
      id: 10,
      alt_id: 2,
      in_game_name: "Ash",
      display_name_option: "username",
      show_country_flag: true,
      status: "registered",
    };
    mockGetUserRegistrationDetails.mockResolvedValue(details);

    const result = await getRegistrationDetailsAction(5);

    expect(result).toEqual({ success: true, data: details });
    expect(mockGetUserRegistrationDetails).toHaveBeenCalledWith(mockSupabase, 5);
  });

  it("returns null data when no registration found", async () => {
    mockGetUserRegistrationDetails.mockResolvedValue(null);

    const result = await getRegistrationDetailsAction(5);

    expect(result).toEqual({ success: true, data: null });
  });

  it("returns error when query throws", async () => {
    mockGetUserRegistrationDetails.mockRejectedValue(new Error("not found"));

    const result = await getRegistrationDetailsAction(5);

    expect(result).toEqual({
      success: false,
      error: "Failed to load registration",
    });
  });
});

// ── updateRegistrationAction ───────────────────────────────────────────────

describe("updateRegistrationAction", () => {
  it("updates registration and revalidates tournament", async () => {
    mockUpdateRegistrationPreferences.mockResolvedValue({ registrationId: 42 });

    const result = await updateRegistrationAction(5, {
      inGameName: "Trainer Red",
      showCountryFlag: true,
    });

    expect(result).toEqual({
      success: true,
      data: { success: true, registrationId: 42 },
    });
    expect(mockUpdateRegistrationPreferences).toHaveBeenCalledWith(
      mockSupabase,
      5,
      { inGameName: "Trainer Red", showCountryFlag: true }
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockUpdateRegistrationPreferences.mockRejectedValue(
      new Error("registration closed")
    );

    const result = await updateRegistrationAction(5, {});

    expect(result).toEqual({
      success: false,
      error: "Failed to update registration",
    });
  });
});

// ── submitTeamAction ───────────────────────────────────────────────────────

describe("submitTeamAction", () => {
  const rawTeam =
    "Pikachu\nBulbasaur\nCharmander\nSquirtle\nEevee\nSnorlax";

  it("returns team data on success", async () => {
    mockSubmitTeam.mockResolvedValue({
      success: true,
      teamId: 1,
      pokemonCount: 6,
      teamName: "My Team",
      species: ["Pikachu", "Bulbasaur", "Charmander", "Squirtle", "Eevee", "Snorlax"],
      errors: [],
    });

    const result = await submitTeamAction(5, rawTeam);

    expect(result).toEqual({
      success: true,
      data: {
        teamId: 1,
        pokemonCount: 6,
        teamName: "My Team",
        species: ["Pikachu", "Bulbasaur", "Charmander", "Squirtle", "Eevee", "Snorlax"],
      },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament-teams:5");
  });

  it("returns validation errors when team fails validation", async () => {
    mockSubmitTeam.mockResolvedValue({
      success: false,
      errors: ["Invalid Pokémon: Fakemon"],
    });

    const result = await submitTeamAction(5, "Fakemon");

    expect(result).toEqual({
      success: false,
      error: "Team validation failed",
      validationErrors: ["Invalid Pokémon: Fakemon"],
    });
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns error when mutation throws", async () => {
    mockSubmitTeam.mockRejectedValue(new Error("team limit reached"));

    const result = await submitTeamAction(5, rawTeam);

    expect(result).toEqual({
      success: false,
      error: "Failed to submit team",
    });
  });
});

// ── selectTeamAction ───────────────────────────────────────────────────────

describe("selectTeamAction", () => {
  it("links existing team and revalidates tournament + team tags", async () => {
    mockSelectTeamForTournament.mockResolvedValue({
      success: true,
      teamId: 5,
      pokemonCount: 6,
      teamName: "Archive Team",
      species: ["Garchomp"],
      errors: [],
    });

    const result = await selectTeamAction(10, 5);

    expect(result).toEqual({
      success: true,
      data: {
        teamId: 5,
        pokemonCount: 6,
        teamName: "Archive Team",
        species: ["Garchomp"],
      },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:10");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament-teams:10");
  });

  it("returns validation errors when team fails validation", async () => {
    mockSelectTeamForTournament.mockResolvedValue({
      success: false,
      errors: ["Team format mismatch"],
    });

    const result = await selectTeamAction(10, 5);

    expect(result).toEqual({
      success: false,
      error: "Team validation failed",
      validationErrors: ["Team format mismatch"],
    });
  });

  it("returns error when mutation throws", async () => {
    mockSelectTeamForTournament.mockRejectedValue(new Error("team not found"));

    const result = await selectTeamAction(10, 5);

    expect(result).toEqual({
      success: false,
      error: "Failed to select team",
    });
  });
});

// ── getCurrentUserAltsAction ───────────────────────────────────────────────

describe("getCurrentUserAltsAction", () => {
  it("returns empty array when user has no alts", async () => {
    mockGetCurrentUserAlts.mockResolvedValue([]);

    const result = await getCurrentUserAltsAction();

    expect(result).toEqual({ success: true, data: [] });
  });

  it("enriches alts with user name/country from users table", async () => {
    mockGetCurrentUserAlts.mockResolvedValue([
      {
        id: 1,
        user_id: "user-123",
        username: "ash_ketchum",
        avatar_url: null,
      },
    ]);

    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { first_name: "Ash", last_name: "Ketchum", country: "JP" },
        error: null,
      }),
    });

    const result = await getCurrentUserAltsAction();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([
        {
          id: 1,
          username: "ash_ketchum",
          display_name: "ash_ketchum",
          avatar_url: null,
          first_name: "Ash",
          last_name: "Ketchum",
          country: "JP",
        },
      ]);
    }
  });

  it("returns null name/country when user row not found", async () => {
    mockGetCurrentUserAlts.mockResolvedValue([
      {
        id: 1,
        user_id: "user-123",
        username: "ash_ketchum",
        avatar_url: null,
      },
    ]);

    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await getCurrentUserAltsAction();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0]).toMatchObject({
        first_name: null,
        last_name: null,
        country: null,
      });
    }
  });

  it("returns error when query throws", async () => {
    mockGetCurrentUserAlts.mockRejectedValue(new Error("not authenticated"));

    const result = await getCurrentUserAltsAction();

    expect(result).toEqual({
      success: false,
      error: "Failed to fetch user alts",
    });
  });
});

// ── getUserTeamsAction ─────────────────────────────────────────────────────

describe("getUserTeamsAction", () => {
  it("returns mapped teams on success", async () => {
    mockGetUserTeams.mockResolvedValue([
      { id: 1, name: "Wolfe's Team", pokemonCount: 6 },
      { id: 2, name: null, pokemonCount: 3 },
    ]);

    const result = await getUserTeamsAction();

    expect(result).toEqual({
      success: true,
      data: [
        { id: 1, name: "Wolfe's Team", pokemonCount: 6 },
        { id: 2, name: null, pokemonCount: 3 },
      ],
    });
  });

  it("returns empty array when user has no teams", async () => {
    mockGetUserTeams.mockResolvedValue([]);

    const result = await getUserTeamsAction();

    expect(result).toEqual({ success: true, data: [] });
  });

  it("returns error when query throws", async () => {
    mockGetUserTeams.mockRejectedValue(new Error("permission denied"));

    const result = await getUserTeamsAction();

    expect(result).toEqual({
      success: false,
      error: "Failed to fetch user teams",
    });
  });
});

// ── createRound ────────────────────────────────────────────────────────────

describe("createRound", () => {
  it("creates round and revalidates tournament tag", async () => {
    mockCreateRound.mockResolvedValue({ round: { id: 7 } });

    const result = await createRound(2, 1, 5);

    expect(result).toEqual({ success: true, data: { roundId: 7 } });
    expect(mockCreateRound).toHaveBeenCalledWith(mockSupabase, 2, 1);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockCreateRound.mockRejectedValue(new Error("phase not found"));

    const result = await createRound(2, 1, 5);

    expect(result).toEqual({
      success: false,
      error: "Failed to create round",
    });
  });
});

// ── generatePairings ───────────────────────────────────────────────────────

describe("generatePairings", () => {
  it("generates pairings and returns counts", async () => {
    mockGenerateRoundPairings.mockResolvedValue({
      matchesCreated: 4,
      warnings: ["One player received a bye"],
    });

    const result = await generatePairings(10, 5);

    expect(result).toEqual({
      success: true,
      data: { matchesCreated: 4, warnings: ["One player received a bye"] },
    });
    expect(mockGenerateRoundPairings).toHaveBeenCalledWith(mockSupabase, 10);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when pairing algorithm throws", async () => {
    mockGenerateRoundPairings.mockRejectedValue(new Error("no eligible players"));

    const result = await generatePairings(10, 5);

    expect(result).toEqual({
      success: false,
      error: "Failed to generate pairings",
    });
  });
});

// ── completeRound ──────────────────────────────────────────────────────────

describe("completeRound", () => {
  it("completes round and revalidates tournament", async () => {
    mockCompleteRound.mockResolvedValue(undefined);

    const result = await completeRound(10, 5);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockCompleteRound).toHaveBeenCalledWith(mockSupabase, 10);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockCompleteRound.mockRejectedValue(new Error("open matches remain"));

    const result = await completeRound(10, 5);

    expect(result).toEqual({
      success: false,
      error: "Failed to complete round",
    });
  });
});

// ── recalculateStandings ───────────────────────────────────────────────────

describe("recalculateStandings", () => {
  it("returns playersUpdated count and revalidates tournament", async () => {
    mockRecalculateStandings.mockResolvedValue({ playersUpdated: 16 });

    const result = await recalculateStandings(5);

    expect(result).toEqual({
      success: true,
      data: { playersUpdated: 16 },
    });
    expect(mockRecalculateStandings).toHaveBeenCalledWith(mockSupabase, 5);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockRecalculateStandings.mockRejectedValue(new Error("db error"));

    const result = await recalculateStandings(5);

    expect(result).toEqual({
      success: false,
      error: "Failed to recalculate standings",
    });
  });
});

// ── dropPlayer ─────────────────────────────────────────────────────────────

describe("dropPlayer", () => {
  it("drops player by alt ID and revalidates tournament", async () => {
    mockDropPlayer.mockResolvedValue(undefined);

    const result = await dropPlayer(5, 2);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockDropPlayer).toHaveBeenCalledWith(mockSupabase, 5, 2);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockDropPlayer.mockRejectedValue(new Error("player not in tournament"));

    const result = await dropPlayer(5, 2);

    expect(result).toEqual({
      success: false,
      error: "Failed to drop player",
    });
  });
});

// ── dropFromTournament ─────────────────────────────────────────────────────

describe("dropFromTournament", () => {
  it("drops self using first alt and revalidates tournament", async () => {
    mockGetCurrentUserAlts.mockResolvedValue([{ id: 3, user_id: "user-123" }]);
    mockDropPlayer.mockResolvedValue(undefined);

    const result = await dropFromTournament(5);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockDropPlayer).toHaveBeenCalledWith(mockSupabase, 5, 3);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when user has no alts", async () => {
    mockGetCurrentUserAlts.mockResolvedValue([]);

    const result = await dropFromTournament(5);

    expect(result).toEqual({
      success: false,
      error: "No player profile found",
    });
  });

  it("returns error when drop mutation throws", async () => {
    mockGetCurrentUserAlts.mockResolvedValue([{ id: 3, user_id: "user-123" }]);
    mockDropPlayer.mockRejectedValue(new Error("already dropped"));

    const result = await dropFromTournament(5);

    expect(result).toEqual({
      success: false,
      error: "Failed to drop from tournament",
    });
  });
});

// ── reportMatchResult ──────────────────────────────────────────────────────

describe("reportMatchResult", () => {
  it("reports result and revalidates tournament", async () => {
    mockReportMatchResult.mockResolvedValue(undefined);

    const result = await reportMatchResult(20, 5, 1, 2, 0);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockReportMatchResult).toHaveBeenCalledWith(
      mockSupabase,
      20,
      1,
      2,
      0
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockReportMatchResult.mockRejectedValue(new Error("match not found"));

    const result = await reportMatchResult(20, 5, 1, 2, 0);

    expect(result).toEqual({
      success: false,
      error: "Failed to report match result",
    });
  });
});

// ── cancelRegistration (error path) ───────────────────────────────────────

describe("cancelRegistration error path", () => {
  it("returns error when mutation throws", async () => {
    mockCancelRegistration.mockRejectedValue(new Error("already cancelled"));

    const result = await cancelRegistration(100, 5);

    expect(result).toEqual({
      success: false,
      error: "Failed to cancel registration",
    });
  });
});

// ── startRound (error path) ────────────────────────────────────────────────

describe("startRound error path", () => {
  it("returns error when mutation throws", async () => {
    mockStartRound.mockRejectedValue(new Error("round not found"));

    const result = await startRound(20, 5);

    expect(result).toEqual({
      success: false,
      error: "Failed to start round",
    });
  });
});

// ── confirmAndStartRound ───────────────────────────────────────────────────

describe("confirmAndStartRound", () => {
  it("starts prepared round and revalidates tournament", async () => {
    mockStartRound.mockResolvedValue(undefined);

    const result = await confirmAndStartRound(10, 5);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockStartRound).toHaveBeenCalledWith(mockSupabase, 10);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockStartRound.mockRejectedValue(new Error("no pairings generated"));

    const result = await confirmAndStartRound(10, 5);

    expect(result).toEqual({
      success: false,
      error: "Failed to start round",
    });
  });
});

// ── cancelPreparedRound ────────────────────────────────────────────────────

describe("cancelPreparedRound", () => {
  it("deletes round and matches, then revalidates tournament", async () => {
    mockDeleteRoundAndMatches.mockResolvedValue(undefined);

    const result = await cancelPreparedRound(10, 5);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockDeleteRoundAndMatches).toHaveBeenCalledWith(mockSupabase, 10);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockDeleteRoundAndMatches.mockRejectedValue(new Error("round has results"));

    const result = await cancelPreparedRound(10, 5);

    expect(result).toEqual({
      success: false,
      error: "Failed to cancel round",
    });
  });
});

// ── prepareRound ───────────────────────────────────────────────────────────

describe("prepareRound", () => {
  function setupPrepareRound({
    phaseType = "swiss",
    existingRoundCount = 0,
    matchesCreated = 4,
    matches = [] as Array<{
      table_number: number | null;
      alt2_id: number | null;
      player1: { display_name?: string; username?: string } | null;
      player2: { display_name?: string; username?: string } | null;
    }>,
  } = {}) {
    // Phase type lookup
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { phase_type: phaseType },
        error: null,
      }),
    });

    // Existing rounds
    mockGetPhaseRoundsWithStats.mockResolvedValue(
      Array.from({ length: existingRoundCount }, (_, i) => ({ id: i + 1 }))
    );

    // Create round
    mockCreateRound.mockResolvedValue({ round: { id: 99 } });

    // Generate pairings
    if (phaseType === "single_elimination") {
      mockGenerateEliminationPairings.mockResolvedValue({
        matchesCreated,
        winnersAdvanced: 0,
      });
    } else {
      mockGenerateRoundPairings.mockResolvedValue({
        matchesCreated,
        warnings: [],
      });
    }

    // Fetch matches with stats
    mockGetRoundMatchesWithStats.mockResolvedValue(matches);
  }

  it("creates swiss round 1, generates pairings, returns preview", async () => {
    setupPrepareRound({
      phaseType: "swiss",
      existingRoundCount: 0,
      matchesCreated: 2,
      matches: [
        {
          table_number: 1,
          alt2_id: 2,
          player1: { username: "ash" },
          player2: { username: "gary" },
        },
        {
          table_number: 2,
          alt2_id: null,
          player1: { username: "misty" },
          player2: null,
        },
      ],
    });

    const result = await prepareRound(5, 1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roundId).toBe(99);
      expect(result.data.roundNumber).toBe(1);
      expect(result.data.matchesCreated).toBe(2);
      expect(result.data.byePlayer).toBe("misty");
      expect(result.data.matches).toEqual([
        { tableNumber: 1, player1Name: "ash", player2Name: "gary" },
        { tableNumber: 2, player1Name: "misty", player2Name: null },
      ]);
    }
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("uses elimination pairings for single_elimination phase", async () => {
    setupPrepareRound({ phaseType: "single_elimination", matchesCreated: 4 });

    await prepareRound(5, 1);

    expect(mockGenerateEliminationPairings).toHaveBeenCalledWith(
      mockSupabase,
      99
    );
    expect(mockGenerateRoundPairings).not.toHaveBeenCalled();
  });

  it("calculates correct roundNumber from existing rounds", async () => {
    setupPrepareRound({ existingRoundCount: 2, matchesCreated: 4 });

    const result = await prepareRound(5, 1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roundNumber).toBe(3);
    }
  });

  it("returns null byePlayer when all matches have two players", async () => {
    setupPrepareRound({
      matchesCreated: 2,
      matches: [
        {
          table_number: 1,
          alt2_id: 2,
          player1: { username: "ash" },
          player2: { username: "gary" },
        },
      ],
    });

    const result = await prepareRound(5, 1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.byePlayer).toBeNull();
    }
  });

  it("returns error when phase lookup fails", async () => {
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    mockGetPhaseRoundsWithStats.mockResolvedValue([]);
    mockCreateRound.mockRejectedValue(new Error("phase not found"));

    const result = await prepareRound(5, 1);

    expect(result).toEqual({
      success: false,
      error: "Failed to prepare round",
    });
  });
});

// ── bulkForceCheckIn (error paths) ─────────────────────────────────────────

describe("bulkForceCheckIn additional error cases", () => {
  it("returns error when no registrations found for given IDs", async () => {
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    const result = await bulkForceCheckIn([99, 100]);

    expect(result).toEqual({
      success: false,
      error: "Failed to bulk check-in players",
    });
  });

  it("returns error when registrations span multiple tournaments", async () => {
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [
          { id: 1, tournament_id: 10 },
          { id: 2, tournament_id: 20 },
        ],
        error: null,
      }),
    });

    const result = await bulkForceCheckIn([1, 2]);

    expect(result).toEqual({
      success: false,
      error: "Failed to bulk check-in players",
    });
  });

  it("returns error when DB update itself errors", async () => {
    (mockSupabase.from as jest.Mock) = jest
      .fn()
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 1, tournament_id: 10 }],
          error: null,
        }),
      })
      .mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "constraint violation" },
        }),
      });

    const result = await bulkForceCheckIn([1]);

    expect(result).toEqual({
      success: false,
      error: "Failed to bulk check-in players",
    });
  });
});
