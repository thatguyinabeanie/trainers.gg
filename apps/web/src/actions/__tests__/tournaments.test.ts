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
const mockGetDiscordServerByCommunityId = jest.fn();
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
  getDiscordServerByCommunityId: (...args: unknown[]) =>
    mockGetDiscordServerByCommunityId(...args),
}));

const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

// Mock cache-invalidation helpers so they call mockUpdateTag without any DB
// queries. This isolates action tests from the helper implementation.
jest.mock("@/lib/cache-invalidation", () => ({
  invalidateTournamentCaches: (id: number) => {
    mockUpdateTag(`tournament:${id}`);
  },
  invalidateTournamentListCaches: (id: number) => {
    mockUpdateTag("tournaments-list");
    mockUpdateTag(`tournament:${id}`);
  },
  invalidateTournamentAndCommunityCaches: async (
    _supabase: unknown,
    id: number
  ) => {
    mockUpdateTag("tournaments-list");
    mockUpdateTag(`tournament:${id}`);
    mockUpdateTag("communities-list");
  },
  invalidateTournamentWithTeamCaches: (id: number) => {
    mockUpdateTag(`tournament:${id}`);
    mockUpdateTag(`tournament-teams:${id}`);
  },
  invalidatePlayerRankingCaches: () => {
    mockUpdateTag("players-leaderboard");
    mockUpdateTag("players-recent");
  },
  invalidateDashboardCaches: () => {
    mockUpdateTag("dashboard-stats");
    mockUpdateTag("dashboard-ratings");
  },
  invalidateCommunityPageCaches: (slug?: string, id?: number) => {
    mockUpdateTag("communities-list");
    if (slug) mockUpdateTag(`community:${slug}`);
    if (id != null) mockUpdateTag(`community:${id}`);
  },
}));

jest.mock("botid/server", () => ({
  checkBotId: jest.fn().mockResolvedValue({ isBot: false }),
}));

// Mock next/headers — rejectBots() reads the bypass header
jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({
    get: jest.fn(() => null),
  })),
}));

// Use a lazy factory so `mockSupabase` is resolved at call time, not hoist time.
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabase),
}));

jest.mock("@trainers/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
  // Production code routes catch-block reporting through `logError`; the
  // tests just need it to not throw. We don't assert on its calls.
  logError: jest.fn(),
  setErrorSink: jest.fn(() => () => undefined),
}));

// Discord enqueue helper mocks — all helpers are fire-and-forget, so failures
// must not propagate to the primary action return value.
const mockEnqueueCommunityChannelNotification = jest.fn();
const mockEnqueueCommunityDms = jest.fn();
const mockEnqueueCommunityRoleSync = jest.fn();
jest.mock("@/lib/discord/enqueue-helpers", () => ({
  enqueueCommunityChannelNotification: (...args: unknown[]) =>
    mockEnqueueCommunityChannelNotification(...args),
  enqueueCommunityDms: (...args: unknown[]) => mockEnqueueCommunityDms(...args),
  enqueueCommunityRoleSync: (...args: unknown[]) =>
    mockEnqueueCommunityRoleSync(...args),
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
  it("revalidates tournament + list + community caches on success", async () => {
    mockUpdateTournament.mockResolvedValue(undefined);

    const result = await updateTournament(10, { name: "Updated Name" });

    expect(result.success).toBe(true);
    expect(mockUpdateTournament).toHaveBeenCalledWith(mockSupabase, 10, {
      name: "Updated Name",
    });
    // Settings changes (name, game, dates) flow into the public tournament
    // page AND the community/list views, so all three need to invalidate.
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:10");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournaments-list");
  });

  it("also revalidates TOURNAMENTS_LIST when status is 'upcoming'", async () => {
    mockUpdateTournament.mockResolvedValue(undefined);

    await updateTournament(10, { status: "upcoming" });

    expect(mockUpdateTag).toHaveBeenCalledWith("tournaments-list");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:10");
  });

  it("returns error when the mutation throws", async () => {
    mockUpdateTournament.mockRejectedValue(new Error("fail"));

    // Use a valid payload — invalid input is rejected at the validation
    // boundary before the mutation runs (see schema test below).
    const result = await updateTournament(10, { name: "Valid Name" });

    expect(result).toEqual({
      success: false,
      error: "Failed to update tournament",
    });
  });

  it("rejects invalid input at the validation boundary without calling the mutation", async () => {
    const result = await updateTournament(10, {
      // Force a schema failure: name shorter than the 3-char minimum.
      name: "x",
    });

    expect(result.success).toBe(false);
    expect(mockUpdateTournament).not.toHaveBeenCalled();
    if (!result.success) {
      expect(result.error).toBe("Invalid tournament settings");
      expect(result.validationErrors).toBeDefined();
    }
  });

  it("rejects an out-of-range player cap before mutating", async () => {
    const result = await updateTournament(10, {
      maxParticipants: 99999,
    });

    expect(result.success).toBe(false);
    expect(mockUpdateTournament).not.toHaveBeenCalled();
  });

  it("accepts the full settings payload with all new fields", async () => {
    mockUpdateTournament.mockResolvedValue(undefined);

    const result = await updateTournament(10, {
      name: "VGC Regionals",
      game: "sv",
      gameFormat: "reg-i",
      platform: "cartridge",
      battleFormat: "doubles",
      registrationType: "open",
      checkInRequired: true,
      allowLateRegistration: false,
      lateCheckInMaxRound: null,
      startDate: "2026-06-01T00:00:00Z",
      endDate: null,
      maxParticipants: 64,
    });

    expect(result.success).toBe(true);
    expect(mockUpdateTournament).toHaveBeenCalledTimes(1);
  });

  it("short-circuits empty updates without calling the mutation or invalidating", async () => {
    // Empty object passes schema validation (every field is optional).
    // The action should treat that as a no-op rather than running a DB
    // write and busting cache tags.
    const result = await updateTournament(10, {});

    expect(result.success).toBe(true);
    expect(mockUpdateTournament).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("treats explicit-undefined keys as empty and skips the mutation", async () => {
    // `Object.keys({ name: undefined }).length` is 1, but the underlying
    // mutation skips undefined fields — so without stripping, this would
    // run a no-op DB write and bust cache tags. The action must filter
    // undefined entries before checking emptiness.
    const result = await updateTournament(10, {
      name: undefined,
      description: undefined,
    });

    expect(result.success).toBe(true);
    expect(mockUpdateTournament).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("forwards only defined fields to the mutation", async () => {
    mockUpdateTournament.mockResolvedValue(undefined);

    await updateTournament(10, {
      name: "New Name",
      description: undefined,
      game: undefined,
    });

    expect(mockUpdateTournament).toHaveBeenCalledTimes(1);
    const [, , updates] = mockUpdateTournament.mock.calls[0];
    expect(updates).toEqual({ name: "New Name" });
    expect(updates).not.toHaveProperty("description");
    expect(updates).not.toHaveProperty("game");
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
  // The action looks up the community BEFORE deleting (so it can invalidate
  // the community page after the row is gone). Mock that lookup chain.
  function mockCommunityLookup(community: { slug: string; id: number } | null) {
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: community ? { communities: community } : null,
            error: null,
          }),
        }),
      }),
    });
  }

  it("invalidates list + tournament + community caches after a successful delete", async () => {
    mockDeleteTournament.mockResolvedValue(undefined);
    mockCommunityLookup({ slug: "test-org", id: 7 });

    const result = await deleteTournament(3);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockDeleteTournament).toHaveBeenCalledWith(mockSupabase, 3);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournaments-list");
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:3");
    expect(mockUpdateTag).toHaveBeenCalledWith("community:test-org");
  });

  it("does not invalidate caches when the delete fails", async () => {
    mockDeleteTournament.mockRejectedValue(new Error("not found"));
    mockCommunityLookup({ slug: "test-org", id: 7 });

    const result = await deleteTournament(3);

    expect(result).toEqual({
      success: false,
      error: "Failed to delete tournament",
    });
    // Cache tags must NOT be busted on failure — otherwise every viewer of
    // the community page pays for an unnecessary refetch of unchanged data.
    expect(mockUpdateTag).not.toHaveBeenCalled();
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
    // 1: select registrations
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

    // 2: tournament lookup for permission check
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 1 },
        error: null,
      }),
    });

    // 3: bulk update
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [{ id: 1 }, { id: 2 }],
        error: null,
      }),
    });

    mockSupabase.rpc = jest.fn().mockResolvedValue({ data: true });

    const result = await bulkForceCheckIn([1, 2]);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ checkedIn: 2, failed: 0 });
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:10");
    expect(mockSupabase.rpc).toHaveBeenCalledWith("has_community_permission", {
      p_community_id: 1,
      permission_key: "tournament.manage",
    });
  });

  it("returns empty result for empty array", async () => {
    const result = await bulkForceCheckIn([]);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ checkedIn: 0, failed: 0 });
  });

  it("rejects when caller lacks tournament.manage permission", async () => {
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [{ id: 1, tournament_id: 10 }],
        error: null,
      }),
    });
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 1 },
        error: null,
      }),
    });
    mockSupabase.rpc = jest.fn().mockResolvedValue({ data: false });

    const result = await bulkForceCheckIn([1]);

    expect(result.success).toBe(false);
  });

  it("handles partial update failures", async () => {
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

    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 1 },
        error: null,
      }),
    });

    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [{ id: 1 }, { id: 2 }],
        error: null,
      }),
    });

    mockSupabase.rpc = jest.fn().mockResolvedValue({ data: true });

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
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });

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

    // Third call: upsert drop metadata into tournament_registration_staff (BEFORE status update)
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      upsert: mockUpsert,
    });

    // Fourth call: bulk update tournament_registrations status to 'dropped'
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

    // Verify the base update only sets status
    expect(mockUpdate).toHaveBeenCalledWith({ status: "dropped" });

    // Verify drop metadata was upserted into the staff table
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          registration_id: expect.any(Number),
          drop_category: "no_show",
          drop_notes: null,
          dropped_by: "user-123",
          dropped_at: expect.any(String),
        }),
      ]),
      { onConflict: "registration_id" }
    );
  });

  it("returns empty result for empty array", async () => {
    const result = await bulkRemovePlayers([], "no_show");

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ removed: 0, failed: 0 });
  });

  it("returns error and stops before status update when staff upsert errors", async () => {
    const mockUpdate = jest.fn();

    // First call: select registrations
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [{ id: 1, tournament_id: 10 }],
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

    // Third call: upsert into tournament_registration_staff — errors
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      upsert: jest.fn().mockResolvedValue({
        error: { message: "FK violation", code: "23503" },
      }),
    });

    // rpc for permission check
    mockSupabase.rpc = jest.fn().mockResolvedValue({ data: true });

    const result = await bulkRemovePlayers([1], "no_show");

    expect(result).toEqual({
      success: false,
      error: "Failed to bulk remove players",
    });
    // status update must NOT have been called
    expect(mockUpdate).not.toHaveBeenCalled();
    // Exactly 3 `from()` calls: (1) registrations select, (2) tournament lookup,
    // (3) staff upsert — the 4th call (tournament_registrations status update)
    // must never be reached after the staff upsert throws.
    expect(mockSupabase.from).toHaveBeenCalledTimes(3);
  });

  it("returns error when getUser returns no user", async () => {
    // Override auth.getUser to return no user
    (mockSupabase.auth as Record<string, unknown>).getUser = jest
      .fn()
      .mockResolvedValue({ data: { user: null }, error: null });

    // First call: select registrations
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [{ id: 1, tournament_id: 10 }],
        error: null,
      }),
    });

    // Second call: tournament lookup
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 1 },
        error: null,
      }),
    });

    // rpc for permission check
    mockSupabase.rpc = jest.fn().mockResolvedValue({ data: true });

    const result = await bulkRemovePlayers([1], "no_show");

    expect(result).toEqual({
      success: false,
      error: "Failed to bulk remove players",
    });
  });

  it("handles partial update failures and passes drop notes", async () => {
    const mockUpdate = jest.fn().mockReturnThis();
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });

    // A prior test overrides auth.getUser to a null user; restore a valid
    // authenticated user for this test (test isolation).
    (mockSupabase.auth as Record<string, unknown>).getUser = jest
      .fn()
      .mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });

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

    // Upsert drop metadata FIRST (before status update)
    (mockSupabase.from as jest.Mock).mockReturnValueOnce({
      upsert: mockUpsert,
    });

    // Update only succeeds for 2 of them (status update fires after upsert)
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

    // Verify the base update only sets status
    expect(mockUpdate).toHaveBeenCalledWith({ status: "dropped" });

    // Verify drop metadata with notes was upserted to the staff table
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          drop_category: "conduct",
          drop_notes: "Group violation",
          dropped_by: "user-123",
          dropped_at: expect.any(String),
        }),
      ]),
      { onConflict: "registration_id" }
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
    expect(mockGetUserRegistrationDetails).toHaveBeenCalledWith(
      mockSupabase,
      5
    );
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

    const result = await updateRegistrationAction(42, 5, {
      inGameName: "Trainer Red",
      showCountryFlag: true,
    });

    expect(result).toEqual({
      success: true,
      data: { success: true, registrationId: 42 },
    });
    expect(mockUpdateRegistrationPreferences).toHaveBeenCalledWith(
      mockSupabase,
      42,
      5,
      { inGameName: "Trainer Red", showCountryFlag: true }
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:5");
  });

  it("returns error when mutation throws", async () => {
    mockUpdateRegistrationPreferences.mockRejectedValue(
      new Error("registration closed")
    );

    const result = await updateRegistrationAction(42, 5, {});

    expect(result).toEqual({
      success: false,
      error: "Failed to update registration",
    });
  });
});

// ── submitTeamAction ───────────────────────────────────────────────────────

describe("submitTeamAction", () => {
  const rawTeam = "Pikachu\nBulbasaur\nCharmander\nSquirtle\nEevee\nSnorlax";

  it("returns team data on success", async () => {
    mockSubmitTeam.mockResolvedValue({
      success: true,
      teamId: 1,
      pokemonCount: 6,
      teamName: "My Team",
      species: [
        "Pikachu",
        "Bulbasaur",
        "Charmander",
        "Squirtle",
        "Eevee",
        "Snorlax",
      ],
      errors: [],
    });

    const result = await submitTeamAction(5, rawTeam);

    expect(result).toEqual({
      success: true,
      data: {
        teamId: 1,
        pokemonCount: 6,
        teamName: "My Team",
        species: [
          "Pikachu",
          "Bulbasaur",
          "Charmander",
          "Squirtle",
          "Eevee",
          "Snorlax",
        ],
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

  it("enriches alts with user name/country from rpc + users table", async () => {
    mockGetCurrentUserAlts.mockResolvedValue([
      {
        id: 1,
        user_id: "user-123",
        username: "ash_ketchum",
        avatar_url: null,
      },
    ]);

    // rpc("get_my_user_pii") returns first/last name
    mockSupabase.rpc = jest.fn().mockResolvedValue({
      data: [{ first_name: "Ash", last_name: "Ketchum", birth_date: null }],
      error: null,
    });

    // from("users").select("country") returns country
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { country: "JP" },
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

  it("returns null name/country when rpc and user row not found", async () => {
    mockGetCurrentUserAlts.mockResolvedValue([
      {
        id: 1,
        user_id: "user-123",
        username: "ash_ketchum",
        avatar_url: null,
      },
    ]);

    // rpc returns empty PII array
    mockSupabase.rpc = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    // from("users").select("country") returns null
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
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

  it("returns error when get_my_user_pii RPC errors", async () => {
    mockGetCurrentUserAlts.mockResolvedValue([
      {
        id: 1,
        user_id: "user-123",
        username: "ash_ketchum",
        avatar_url: null,
      },
    ]);

    // rpc("get_my_user_pii") returns an error
    mockSupabase.rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "permission denied", code: "42501" },
    });

    // from("users").select("country") succeeds (Promise.all runs both)
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { country: "US" },
        error: null,
      }),
    });

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
    mockGenerateRoundPairings.mockRejectedValue(
      new Error("no eligible players")
    );

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
  it("drops the registered alt (not just first alt) and revalidates", async () => {
    // User has two alts; alt_id 7 is the one registered for tournament 5
    mockGetCurrentUserAlts.mockResolvedValue([
      { id: 3, user_id: "user-123" },
      { id: 7, user_id: "user-123" },
    ]);
    mockDropPlayer.mockResolvedValue(undefined);

    // Mock the tournament_registrations lookup
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { alt_id: 7 },
        error: null,
      }),
    });

    const result = await dropFromTournament(5);

    expect(result).toEqual({ success: true, data: { success: true } });
    // Must use the registered alt (7), not the first alt (3)
    expect(mockDropPlayer).toHaveBeenCalledWith(mockSupabase, 5, 7);
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

  it("returns error when no alt is registered for this tournament", async () => {
    mockGetCurrentUserAlts.mockResolvedValue([{ id: 3, user_id: "user-123" }]);

    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    const result = await dropFromTournament(5);

    expect(result).toEqual({
      success: false,
      error: "You are not registered for this tournament.",
    });
    expect(mockDropPlayer).not.toHaveBeenCalled();
  });

  it("returns error when drop mutation throws", async () => {
    mockGetCurrentUserAlts.mockResolvedValue([{ id: 3, user_id: "user-123" }]);
    mockDropPlayer.mockRejectedValue(new Error("already dropped"));

    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { alt_id: 3 },
        error: null,
      }),
    });

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

// ── reportMatchResult — Discord channel + DM notifications ─────────────────

describe("reportMatchResult — Discord channel + DM notifications", () => {
  const mockServer = { id: 77, guild_id: "discord-guild-7" };
  const matchRow = {
    id: 20,
    alt1_id: 1,
    alt2_id: 2,
    alt1: { user_id: "user-p1", username: "player1" },
    alt2: { user_id: "user-p2", username: "player2" },
  };

  beforeEach(() => {
    mockReportMatchResult.mockResolvedValue(undefined);
  });

  it("resolves server once then passes it to channel and DM helpers", async () => {
    mockGetDiscordServerByCommunityId.mockResolvedValue(mockServer);
    mockEnqueueCommunityChannelNotification.mockResolvedValue(undefined);
    mockEnqueueCommunityDms.mockResolvedValue(undefined);

    const fromMock = jest.fn();
    fromMock
      .mockReturnValueOnce({
        // tournaments lookup (fireAndForgetDiscord)
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 5, name: "Test Cup", slug: "test-cup", community_id: 7 },
          error: null,
        }),
      })
      .mockReturnValueOnce({
        // tournament_matches lookup
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: matchRow, error: null }),
      });
    (mockSupabase.from as jest.Mock) = fromMock;

    const result = await reportMatchResult(20, 5, 1, 2, 0);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
    // Server resolved once for community_id 7
    expect(mockGetDiscordServerByCommunityId).toHaveBeenCalledTimes(1);
    expect(mockGetDiscordServerByCommunityId).toHaveBeenCalledWith(
      mockSupabase,
      7
    );
    // Channel notification receives pre-resolved server
    expect(mockEnqueueCommunityChannelNotification).toHaveBeenCalledWith(
      mockSupabase,
      7,
      "match_result_reported",
      "match_result_reported:20",
      expect.objectContaining({ match_id: 20, winner_username: "player1" }),
      { server: mockServer }
    );
    // DM notification receives pre-resolved server
    expect(mockEnqueueCommunityDms).toHaveBeenCalledWith(
      mockSupabase,
      7,
      ["user-p1", "user-p2"],
      "match_result_to_confirm",
      "match_result_to_confirm:20",
      expect.objectContaining({ match_id: 20 }),
      { server: mockServer }
    );
  });

  it("no-ops when server lookup returns null", async () => {
    mockGetDiscordServerByCommunityId.mockResolvedValue(null);

    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      // tournaments lookup (fireAndForgetDiscord)
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 5, name: "Test Cup", slug: "test-cup", community_id: 7 },
        error: null,
      }),
    });

    const result = await reportMatchResult(20, 5, 1, 2, 0);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockEnqueueCommunityChannelNotification).not.toHaveBeenCalled();
    expect(mockEnqueueCommunityDms).not.toHaveBeenCalled();
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
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { community_id: 1 },
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

    mockSupabase.rpc = jest.fn().mockResolvedValue({ data: true });

    const result = await bulkForceCheckIn([1]);

    expect(result).toEqual({
      success: false,
      error: "Failed to bulk check-in players",
    });
  });
});

// =============================================================================
// Discord enqueue integration tests
// These tests verify that fire-and-forget Discord helpers are called correctly
// and that their rejection does NOT propagate to the primary action result.
// =============================================================================

// Helper: flush all pending microtasks so IIFE fire-and-forget code runs.
async function flushMicrotasks() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

// ── publishTournament — Discord registration_opens ─────────────────────────

describe("publishTournament — Discord registration_opens", () => {
  beforeEach(() => {
    mockUpdateTournament.mockResolvedValue(undefined);
  });

  it("enqueues registration_opens channel notification with correct args", async () => {
    mockEnqueueCommunityChannelNotification.mockResolvedValue(undefined);
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 7,
          name: "Spring Cup",
          slug: "spring-cup",
          community_id: 3,
          start_date: "2026-06-01",
        },
        error: null,
      }),
    });

    const result = await publishTournament(7);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockEnqueueCommunityChannelNotification).toHaveBeenCalledWith(
      mockSupabase,
      3,
      "registration_opens",
      "registration_opens:7",
      expect.objectContaining({
        tournament_id: 7,
        tournament_name: "Spring Cup",
        tournament_slug: "spring-cup",
        registration_url: "/tournaments/spring-cup",
      })
    );
  });

  it("returns success even when the Discord enqueue rejects", async () => {
    mockEnqueueCommunityChannelNotification.mockRejectedValue(
      new Error("discord down")
    );
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 7,
          name: "Spring Cup",
          slug: "spring-cup",
          community_id: 3,
          start_date: null,
        },
        error: null,
      }),
    });

    const result = await publishTournament(7);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
  });

  it("does not enqueue when tournament lookup returns null", async () => {
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    await publishTournament(7);
    await flushMicrotasks();

    expect(mockEnqueueCommunityChannelNotification).not.toHaveBeenCalled();
  });
});

// ── completeTournament — Discord tournament_ended + winner role ─────────────

describe("completeTournament — Discord tournament_ended + winner role", () => {
  const mockServer = { id: 55, guild_id: "discord-guild-3" };

  beforeEach(() => {
    mockCompleteTournament.mockResolvedValue(undefined);
  });

  it("enqueues tournament_ended notification and winner role sync", async () => {
    mockGetDiscordServerByCommunityId.mockResolvedValue(mockServer);
    mockEnqueueCommunityChannelNotification.mockResolvedValue(undefined);
    mockEnqueueCommunityRoleSync.mockResolvedValue(undefined);

    // standings query: .select().eq(tournament_id).eq(rank) chain
    const standingsEqRank = jest.fn().mockResolvedValue({
      data: [{ alts: { user_id: "user-winner" } }],
      error: null,
    });
    const standingsEqTournament = jest
      .fn()
      .mockReturnValue({ eq: standingsEqRank });

    const fromMock = jest.fn();
    fromMock
      .mockReturnValueOnce({
        // tournaments lookup (fireAndForgetDiscord)
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 7,
            name: "Spring Cup",
            slug: "spring-cup",
            community_id: 3,
          },
          error: null,
        }),
      })
      .mockReturnValueOnce({
        // tournament_standings lookup
        select: jest.fn().mockReturnValue({ eq: standingsEqTournament }),
      });
    (mockSupabase.from as jest.Mock) = fromMock;

    const result = await completeTournament(7);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
    // Server resolved once for community_id 3
    expect(mockGetDiscordServerByCommunityId).toHaveBeenCalledWith(
      mockSupabase,
      3
    );
    // Helpers receive the pre-resolved server object
    expect(mockEnqueueCommunityChannelNotification).toHaveBeenCalledWith(
      mockSupabase,
      3,
      "tournament_ended",
      "tournament_ended:7",
      expect.objectContaining({
        tournament_id: 7,
        tournament_name: "Spring Cup",
        tournament_slug: "spring-cup",
      }),
      { server: mockServer }
    );
    expect(mockEnqueueCommunityRoleSync).toHaveBeenCalledWith(
      mockSupabase,
      3,
      ["user-winner"],
      "winner",
      "add",
      "tournament_ended:7",
      { server: mockServer }
    );
  });

  it("no-ops when server lookup returns null", async () => {
    mockGetDiscordServerByCommunityId.mockResolvedValue(null);

    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      // tournaments lookup (fireAndForgetDiscord)
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 7,
          name: "Spring Cup",
          slug: "spring-cup",
          community_id: 3,
        },
        error: null,
      }),
    });

    const result = await completeTournament(7);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockEnqueueCommunityChannelNotification).not.toHaveBeenCalled();
    expect(mockEnqueueCommunityRoleSync).not.toHaveBeenCalled();
  });

  it("returns success even when the Discord enqueue rejects", async () => {
    mockGetDiscordServerByCommunityId.mockResolvedValue(mockServer);
    mockEnqueueCommunityChannelNotification.mockRejectedValue(
      new Error("discord down")
    );
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 7,
          name: "Spring Cup",
          slug: "spring-cup",
          community_id: 3,
        },
        error: null,
      }),
    });

    const result = await completeTournament(7);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
  });
});

// ── registerForTournament — Discord member role add ─────────────────────────

describe("registerForTournament — Discord member role add", () => {
  it("enqueues member role add after successful registration", async () => {
    mockRegisterForTournament.mockResolvedValue({
      registrationId: 99,
      status: "registered",
    });
    mockEnqueueCommunityRoleSync.mockResolvedValue(undefined);
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 5 },
        error: null,
      }),
    });

    const result = await registerForTournament(10, { altId: 1 });
    await flushMicrotasks();

    expect(result).toEqual({
      success: true,
      data: { registrationId: 99, status: "registered" },
    });
    expect(mockEnqueueCommunityRoleSync).toHaveBeenCalledWith(
      mockSupabase,
      5,
      ["user-123"],
      "member",
      "add",
      "tournament_registration:99"
    );
  });

  it("returns success even when role sync rejects", async () => {
    mockRegisterForTournament.mockResolvedValue({
      registrationId: 99,
      status: "registered",
    });
    mockEnqueueCommunityRoleSync.mockRejectedValue(new Error("discord down"));
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    (mockSupabase.from as jest.Mock) = jest.fn().mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 5 },
        error: null,
      }),
    });

    const result = await registerForTournament(10);
    await flushMicrotasks();

    expect(result).toEqual({
      success: true,
      data: { registrationId: 99, status: "registered" },
    });
  });
});

// ── cancelRegistration — Discord member role remove ────────────────────────

describe("cancelRegistration — Discord member role remove", () => {
  it("enqueues member role remove when user has no remaining registrations", async () => {
    mockCancelRegistration.mockResolvedValue(undefined);
    mockEnqueueCommunityRoleSync.mockResolvedValue(undefined);
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const fromMock = jest.fn();
    // First call: tournament lookup for community_id
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 5 },
        error: null,
      }),
    });
    // Second call: count remaining registrations — returns 0
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockResolvedValue({ count: 0, error: null }),
    });
    (mockSupabase.from as jest.Mock) = fromMock;

    const result = await cancelRegistration(100, 5);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockEnqueueCommunityRoleSync).toHaveBeenCalledWith(
      mockSupabase,
      5,
      ["user-123"],
      "member",
      "remove",
      "tournament_registration_cancel:100"
    );
  });

  it("does NOT enqueue role remove when user still has active registrations", async () => {
    mockCancelRegistration.mockResolvedValue(undefined);
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const fromMock = jest.fn();
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 5 },
        error: null,
      }),
    });
    // Still has 1 active registration
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockResolvedValue({ count: 1, error: null }),
    });
    (mockSupabase.from as jest.Mock) = fromMock;

    const result = await cancelRegistration(100, 5);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockEnqueueCommunityRoleSync).not.toHaveBeenCalled();
  });

  it("returns success even when role sync rejects", async () => {
    mockCancelRegistration.mockResolvedValue(undefined);
    mockEnqueueCommunityRoleSync.mockRejectedValue(new Error("discord down"));
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const fromMock = jest.fn();
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 5 },
        error: null,
      }),
    });
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockResolvedValue({ count: 0, error: null }),
    });
    (mockSupabase.from as jest.Mock) = fromMock;

    const result = await cancelRegistration(100, 5);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
  });
});

// ── withdrawFromTournament — Discord member role remove ────────────────────

describe("withdrawFromTournament — Discord member role remove", () => {
  it("enqueues member role remove when user has no remaining registrations", async () => {
    mockWithdrawFromTournament.mockResolvedValue(undefined);
    mockEnqueueCommunityRoleSync.mockResolvedValue(undefined);
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const fromMock = jest.fn();
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 5 },
        error: null,
      }),
    });
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockResolvedValue({ count: 0, error: null }),
    });
    (mockSupabase.from as jest.Mock) = fromMock;

    const result = await withdrawFromTournament(5);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockEnqueueCommunityRoleSync).toHaveBeenCalledWith(
      mockSupabase,
      5,
      ["user-123"],
      "member",
      "remove",
      "tournament_withdraw:5"
    );
  });

  it("does NOT enqueue role remove when user still has active registrations", async () => {
    mockWithdrawFromTournament.mockResolvedValue(undefined);
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const fromMock = jest.fn();
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 5 },
        error: null,
      }),
    });
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockResolvedValue({ count: 2, error: null }),
    });
    (mockSupabase.from as jest.Mock) = fromMock;

    const result = await withdrawFromTournament(5);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockEnqueueCommunityRoleSync).not.toHaveBeenCalled();
  });

  it("returns success even when role sync rejects", async () => {
    mockWithdrawFromTournament.mockResolvedValue(undefined);
    mockEnqueueCommunityRoleSync.mockRejectedValue(new Error("discord down"));
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const fromMock = jest.fn();
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { community_id: 5 },
        error: null,
      }),
    });
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockResolvedValue({ count: 0, error: null }),
    });
    (mockSupabase.from as jest.Mock) = fromMock;

    const result = await withdrawFromTournament(5);
    await flushMicrotasks();

    expect(result).toEqual({ success: true, data: { success: true } });
  });
});
