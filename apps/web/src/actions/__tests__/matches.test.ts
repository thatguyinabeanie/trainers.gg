/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock bot detection
jest.mock("botid/server", () => ({
  checkBotId: jest.fn().mockResolvedValue({ isBot: false }),
}));

// Mock Supabase client
const mockSupabase = {
  auth: { getUser: jest.fn() },
  from: jest.fn(),
  rpc: jest.fn(),
};
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabase),
}));

// Mock next/cache updateTag
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

// Mock getErrorMessage (used by withAction in @trainers/utils)
jest.mock("@/lib/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

// Mock @trainers/supabase mutations
const mockSubmitGameSelection = jest.fn();
const mockSendMatchMessage = jest.fn();
const mockCreateMatchGames = jest.fn();
const mockJudgeOverrideGame = jest.fn();
const mockJudgeResetGame = jest.fn();
const mockResetMatch = jest.fn();
const mockConfirmMatchCheckIn = jest.fn();
jest.mock("@trainers/supabase", () => ({
  submitGameSelection: (...args: unknown[]) => mockSubmitGameSelection(...args),
  sendMatchMessage: (...args: unknown[]) => mockSendMatchMessage(...args),
  createMatchGames: (...args: unknown[]) => mockCreateMatchGames(...args),
  judgeOverrideGame: (...args: unknown[]) => mockJudgeOverrideGame(...args),
  judgeResetGame: (...args: unknown[]) => mockJudgeResetGame(...args),
  resetMatch: (...args: unknown[]) => mockResetMatch(...args),
  confirmMatchCheckIn: (...args: unknown[]) => mockConfirmMatchCheckIn(...args),
}));

import {
  submitGameSelectionAction,
  sendMatchMessageAction,
  createMatchGamesAction,
  judgeResetGameAction,
  requestJudgeAction,
  resetMatchAction,
  confirmMatchCheckInAction,
} from "../matches";

// =============================================================================
// submitGameSelectionAction
// =============================================================================

describe("submitGameSelectionAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits a game selection and revalidates the tournament cache", async () => {
    mockSubmitGameSelection.mockResolvedValue(undefined);

    const result = await submitGameSelectionAction(10, 20, 30);

    expect(result.success).toBe(true);
    expect(mockSubmitGameSelection).toHaveBeenCalledWith(mockSupabase, 10, 20);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:30");
  });

  it("returns a validation error for a negative gameId", async () => {
    const result = await submitGameSelectionAction(-1, 20, 30);

    expect(result.success).toBe(false);
    // The mutation should never be called when validation fails
    expect(mockSubmitGameSelection).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });
});

// =============================================================================
// sendMatchMessageAction
// =============================================================================

describe("sendMatchMessageAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends a match message and returns the new message id", async () => {
    mockSendMatchMessage.mockResolvedValue({ id: 42 });

    const result = await sendMatchMessageAction(1, 2, "Hello!");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: 42 });
    }
    expect(mockSendMatchMessage).toHaveBeenCalledWith(
      mockSupabase,
      1,
      2,
      "Hello!",
      "player"
    );
  });

  it("returns a validation error when content is empty", async () => {
    const result = await sendMatchMessageAction(1, 2, "");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
    expect(mockSendMatchMessage).not.toHaveBeenCalled();
  });
});

// =============================================================================
// createMatchGamesAction
// =============================================================================

describe("createMatchGamesAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates match games and returns the count", async () => {
    mockCreateMatchGames.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);

    const result = await createMatchGamesAction(5, 3, 100);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ count: 3 });
    }
    expect(mockCreateMatchGames).toHaveBeenCalledWith(mockSupabase, 5, 3);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:100");
  });
});

// =============================================================================
// judgeResetGameAction
// =============================================================================

describe("judgeResetGameAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resets a game and revalidates the tournament cache", async () => {
    mockJudgeResetGame.mockResolvedValue({ id: 7 });

    const result = await judgeResetGameAction(7, 50);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ gameId: 7 });
    }
    expect(mockJudgeResetGame).toHaveBeenCalledWith(mockSupabase, 7);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:50");
  });
});

// =============================================================================
// requestJudgeAction
// =============================================================================

describe("requestJudgeAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls supabase.rpc to request a judge and revalidates the cache", async () => {
    mockSupabase.rpc.mockResolvedValue({ error: null });

    const result = await requestJudgeAction(11, 99);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ success: true });
    }
    expect(mockSupabase.rpc).toHaveBeenCalledWith("request_judge", {
      p_match_id: 11,
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:99");
  });

  it("returns an error when the rpc call fails", async () => {
    mockSupabase.rpc.mockResolvedValue({
      error: { message: "Permission denied" },
    });

    const result = await requestJudgeAction(11, 99);

    expect(result.success).toBe(false);
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });
});

// =============================================================================
// resetMatchAction
// =============================================================================

describe("resetMatchAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resets a match and revalidates the tournament cache", async () => {
    mockResetMatch.mockResolvedValue({ id: 15 });

    const result = await resetMatchAction(15, 200);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ matchId: 15 });
    }
    expect(mockResetMatch).toHaveBeenCalledWith(mockSupabase, 15);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:200");
  });

  it("returns an error when the mutation throws", async () => {
    mockResetMatch.mockRejectedValue(new Error("Match not found"));

    const result = await resetMatchAction(15, 200);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });
});

// =============================================================================
// confirmMatchCheckInAction
// =============================================================================

describe("confirmMatchCheckInAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("confirms check-in and returns matchActivated status", async () => {
    mockConfirmMatchCheckIn.mockResolvedValue({
      success: true,
      match_activated: true,
    });

    const result = await confirmMatchCheckInAction(10, 50);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ matchActivated: true });
    }
    expect(mockConfirmMatchCheckIn).toHaveBeenCalledWith(mockSupabase, 10);
    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:50");
  });

  it("defaults matchActivated to false when not returned", async () => {
    mockConfirmMatchCheckIn.mockResolvedValue({
      success: true,
    });

    const result = await confirmMatchCheckInAction(10, 50);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ matchActivated: false });
    }
  });

  it("returns matchActivated false when match not yet activated", async () => {
    mockConfirmMatchCheckIn.mockResolvedValue({
      success: true,
      match_activated: false,
    });

    const result = await confirmMatchCheckInAction(10, 50);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ matchActivated: false });
    }
  });

  it("returns a validation error for a negative matchId", async () => {
    const result = await confirmMatchCheckInAction(-1, 50);

    expect(result.success).toBe(false);
    expect(mockConfirmMatchCheckIn).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns a validation error for a negative tournamentId", async () => {
    const result = await confirmMatchCheckInAction(10, -1);

    expect(result.success).toBe(false);
    expect(mockConfirmMatchCheckIn).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns an error when the mutation throws", async () => {
    mockConfirmMatchCheckIn.mockRejectedValue(
      new Error("Match is not in pending status")
    );

    const result = await confirmMatchCheckInAction(10, 50);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("revalidates the tournament cache on success", async () => {
    mockConfirmMatchCheckIn.mockResolvedValue({
      success: true,
      match_activated: false,
    });

    await confirmMatchCheckInAction(10, 99);

    expect(mockUpdateTag).toHaveBeenCalledWith("tournament:99");
  });
});
