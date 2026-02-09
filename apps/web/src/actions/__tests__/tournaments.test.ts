/**
 * @jest-environment node
 */

import {
  createTournament,
  updateTournament,
  publishTournament,
  registerForTournament,
  cancelRegistration,
  startRound,
  deleteTournament,
} from "../tournaments";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

// Sentinel object used as the mock Supabase client.
const mockSupabase = { __mock: true };

// @trainers/supabase mutation mocks
const mockCreateTournament = jest.fn();
const mockUpdateTournament = jest.fn();
const mockDeleteTournament = jest.fn();
const mockRegisterForTournament = jest.fn();
const mockCancelRegistration = jest.fn();
const mockStartRound = jest.fn();

jest.mock("@trainers/supabase", () => ({
  createTournament: (...args: unknown[]) => mockCreateTournament(...args),
  updateTournament: (...args: unknown[]) => mockUpdateTournament(...args),
  deleteTournament: (...args: unknown[]) => mockDeleteTournament(...args),
  registerForTournament: (...args: unknown[]) =>
    mockRegisterForTournament(...args),
  cancelRegistration: (...args: unknown[]) => mockCancelRegistration(...args),
  startRound: (...args: unknown[]) => mockStartRound(...args),
  // Stub unused imports so the module resolves without errors
  archiveTournament: jest.fn(),
  updateRegistrationPreferences: jest.fn(),
  checkIn: jest.fn(),
  undoCheckIn: jest.fn(),
  withdrawFromTournament: jest.fn(),
  submitTeam: jest.fn(),
  selectTeamForTournament: jest.fn(),
  createRound: jest.fn(),
  generateRoundPairings: jest.fn(),
  completeRound: jest.fn(),
  deleteRoundAndMatches: jest.fn(),
  recalculateStandings: jest.fn(),
  dropPlayer: jest.fn(),
  reportMatchResult: jest.fn(),
  startTournamentEnhanced: jest.fn(),
  advanceToTopCut: jest.fn(),
  generateEliminationPairings: jest.fn(),
  completeTournament: jest.fn(),
  getCurrentUserAlts: jest.fn(),
  getUserTeams: jest.fn(),
  getUserRegistrationDetails: jest.fn(),
  getPhaseRoundsWithStats: jest.fn(),
  getRoundMatchesWithStats: jest.fn(),
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ── createTournament ───────────────────────────────────────────────────────

describe("createTournament", () => {
  const input = {
    organizationId: 1,
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
