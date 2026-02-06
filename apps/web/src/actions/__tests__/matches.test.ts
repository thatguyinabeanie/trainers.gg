/**
 * @jest-environment node
 */

import { updateTag } from "next/cache";
import * as supabaseModule from "@trainers/supabase";
import {
  submitGameSelectionAction,
  sendMatchMessageAction,
  createMatchGamesAction,
  judgeOverrideGameAction,
  judgeResetGameAction,
  requestJudgeAction,
  resetMatchAction,
  cancelJudgeRequestAction,
  clearJudgeRequestAction,
} from "../matches";

// Mock Next.js cache
jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
}));

// Mock Supabase server client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
  rpc: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabase),
}));

// Mock @trainers/supabase mutations
jest.mock("@trainers/supabase");

// Mock utils - mock rejectBots before the mock
jest.mock("../utils", () => {
  const mockRejectBots = jest.fn().mockResolvedValue(undefined);
  return {
    rejectBots: mockRejectBots,
    withAction: (fn: () => Promise<unknown>, fallbackMessage: string) =>
      fn().then(
        (data) => ({ success: true, data }),
        (error) => ({
          success: false,
          error: error.message || fallbackMessage,
        })
      ),
    ActionResult: jest.fn(),
  };
});

const { rejectBots: mockRejectBots } = jest.requireMock("../utils");

describe("Match Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("submitGameSelectionAction", () => {
    it("successfully submits game selection", async () => {
      (supabaseModule.submitGameSelection as jest.Mock).mockResolvedValue({});

      const result = await submitGameSelectionAction(1, 5, 10);

      expect(result.success).toBe(true);
      expect(mockRejectBots).toHaveBeenCalled();
      expect(supabaseModule.submitGameSelection).toHaveBeenCalledWith(
        mockSupabase,
        1,
        5
      );
      expect(updateTag).toHaveBeenCalledWith("tournament:10");
    });

    it("returns error when game not found", async () => {
      (supabaseModule.submitGameSelection as jest.Mock).mockRejectedValue(
        new Error("Game not found")
      );

      const result = await submitGameSelectionAction(999, 5, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Game not found");
      }
    });

    it("returns error when winner not in game", async () => {
      (supabaseModule.submitGameSelection as jest.Mock).mockRejectedValue(
        new Error("Winner must be a participant")
      );

      const result = await submitGameSelectionAction(1, 999, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("participant");
      }
    });

    it("returns error when not participant", async () => {
      (supabaseModule.submitGameSelection as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await submitGameSelectionAction(1, 5, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Permission denied");
      }
    });

    it("returns error for invalid gameId", async () => {
      const result = await submitGameSelectionAction(-1, 5, 10);

      expect(result.success).toBe(false);
    });

    it("returns error for invalid winnerId", async () => {
      const result = await submitGameSelectionAction(1, 0, 10);

      expect(result.success).toBe(false);
    });
  });

  describe("sendMatchMessageAction", () => {
    it("successfully sends a player message", async () => {
      const mockMessage = { id: 1 };
      (supabaseModule.sendMatchMessage as jest.Mock).mockResolvedValue(
        mockMessage
      );

      const result = await sendMatchMessageAction(1, 5, "Good game!", "player");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(1);
      }
      expect(mockRejectBots).toHaveBeenCalled();
      expect(supabaseModule.sendMatchMessage).toHaveBeenCalledWith(
        mockSupabase,
        1,
        5,
        "Good game!",
        "player"
      );
    });

    it("successfully sends a judge message", async () => {
      const mockMessage = { id: 2 };
      (supabaseModule.sendMatchMessage as jest.Mock).mockResolvedValue(
        mockMessage
      );

      const result = await sendMatchMessageAction(
        1,
        5,
        "Judge ruling",
        "judge"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(2);
      }
      expect(supabaseModule.sendMatchMessage).toHaveBeenCalledWith(
        mockSupabase,
        1,
        5,
        "Judge ruling",
        "judge"
      );
    });

    it("defaults to player message type", async () => {
      const mockMessage = { id: 3 };
      (supabaseModule.sendMatchMessage as jest.Mock).mockResolvedValue(
        mockMessage
      );

      const result = await sendMatchMessageAction(1, 5, "Hello");

      expect(result.success).toBe(true);
      expect(supabaseModule.sendMatchMessage).toHaveBeenCalledWith(
        mockSupabase,
        1,
        5,
        "Hello",
        "player"
      );
    });

    it("returns error when message is empty", async () => {
      const result = await sendMatchMessageAction(1, 5, "", "player");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Message cannot be empty");
      }
    });

    it("returns error when message is too long", async () => {
      const longMessage = "a".repeat(501);
      const result = await sendMatchMessageAction(1, 5, longMessage, "player");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("500 characters or fewer");
      }
    });

    it("returns error when match not found", async () => {
      (supabaseModule.sendMatchMessage as jest.Mock).mockRejectedValue(
        new Error("Match not found")
      );

      const result = await sendMatchMessageAction(999, 5, "Test", "player");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Match not found");
      }
    });

    it("returns error for invalid matchId", async () => {
      const result = await sendMatchMessageAction(0, 5, "Test", "player");

      expect(result.success).toBe(false);
    });

    it("returns error for invalid altId", async () => {
      const result = await sendMatchMessageAction(1, -1, "Test", "player");

      expect(result.success).toBe(false);
    });
  });

  describe("createMatchGamesAction", () => {
    it("successfully creates match games", async () => {
      const mockGames = [{ id: 1 }, { id: 2 }, { id: 3 }];
      (supabaseModule.createMatchGames as jest.Mock).mockResolvedValue(
        mockGames
      );

      const result = await createMatchGamesAction(1, 3, 10);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(3);
      }
      expect(mockRejectBots).toHaveBeenCalled();
      expect(supabaseModule.createMatchGames).toHaveBeenCalledWith(
        mockSupabase,
        1,
        3
      );
      expect(updateTag).toHaveBeenCalledWith("tournament:10");
    });

    it("creates best of 1 (1 game)", async () => {
      const mockGames = [{ id: 1 }];
      (supabaseModule.createMatchGames as jest.Mock).mockResolvedValue(
        mockGames
      );

      const result = await createMatchGamesAction(1, 1, 10);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(1);
      }
      expect(supabaseModule.createMatchGames).toHaveBeenCalledWith(
        mockSupabase,
        1,
        1
      );
    });

    it("creates best of 5 (5 games)", async () => {
      const mockGames = Array(5)
        .fill(null)
        .map((_, i) => ({ id: i + 1 }));
      (supabaseModule.createMatchGames as jest.Mock).mockResolvedValue(
        mockGames
      );

      const result = await createMatchGamesAction(1, 5, 10);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(5);
      }
    });

    it("returns error when game count is invalid (too low)", async () => {
      const result = await createMatchGamesAction(1, 0, 10);

      expect(result.success).toBe(false);
    });

    it("returns error when game count is invalid (too high)", async () => {
      const result = await createMatchGamesAction(1, 10, 10);

      expect(result.success).toBe(false);
    });

    it("returns error when match not found", async () => {
      (supabaseModule.createMatchGames as jest.Mock).mockRejectedValue(
        new Error("Match not found")
      );

      const result = await createMatchGamesAction(999, 3, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Match not found");
      }
    });
  });

  describe("judgeOverrideGameAction", () => {
    it("successfully overrides game result", async () => {
      const mockGame = { id: 1 };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "judge-user-id" } },
      });
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { id: 10 },
              }),
            })),
          })),
        })),
      }));
      mockSupabase.from = mockFrom;
      (supabaseModule.judgeOverrideGame as jest.Mock).mockResolvedValue(
        mockGame
      );

      const result = await judgeOverrideGameAction(1, 5, 10, "Player A wins");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gameId).toBe(1);
      }
      expect(mockRejectBots).toHaveBeenCalled();
      expect(supabaseModule.judgeOverrideGame).toHaveBeenCalledWith(
        mockSupabase,
        1,
        5,
        10,
        "Player A wins"
      );
      expect(updateTag).toHaveBeenCalledWith("tournament:10");
    });

    it("successfully overrides without notes", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "judge-user-id" } },
      });
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { id: 10 },
              }),
            })),
          })),
        })),
      }));
      mockSupabase.from = mockFrom;
      const mockGame = { id: 1 };
      (supabaseModule.judgeOverrideGame as jest.Mock).mockResolvedValue(
        mockGame
      );

      const result = await judgeOverrideGameAction(1, 5, 10);

      expect(result.success).toBe(true);
      expect(supabaseModule.judgeOverrideGame).toHaveBeenCalledWith(
        mockSupabase,
        1,
        5,
        10,
        undefined
      );
    });

    it("returns error when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await judgeOverrideGameAction(1, 5, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Not authenticated");
      }
    });

    it("returns error when no alt found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-id" } },
      });
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: null,
              }),
            })),
          })),
        })),
      }));
      mockSupabase.from = mockFrom;

      const result = await judgeOverrideGameAction(1, 5, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("No alt found");
      }
    });

    it("returns error when game not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "judge-user-id" } },
      });
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { id: 10 },
              }),
            })),
          })),
        })),
      }));
      mockSupabase.from = mockFrom;
      (supabaseModule.judgeOverrideGame as jest.Mock).mockRejectedValue(
        new Error("Game not found")
      );

      const result = await judgeOverrideGameAction(999, 5, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Game not found");
      }
    });
  });

  describe("judgeResetGameAction", () => {
    it("successfully resets game", async () => {
      const mockGame = { id: 1 };
      (supabaseModule.judgeResetGame as jest.Mock).mockResolvedValue(mockGame);

      const result = await judgeResetGameAction(1, 10);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gameId).toBe(1);
      }
      expect(mockRejectBots).toHaveBeenCalled();
      expect(supabaseModule.judgeResetGame).toHaveBeenCalledWith(
        mockSupabase,
        1
      );
      expect(updateTag).toHaveBeenCalledWith("tournament:10");
    });

    it("returns error when game not found", async () => {
      (supabaseModule.judgeResetGame as jest.Mock).mockRejectedValue(
        new Error("Game not found")
      );

      const result = await judgeResetGameAction(999, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Game not found");
      }
    });

    it("returns error when not authorized", async () => {
      (supabaseModule.judgeResetGame as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await judgeResetGameAction(1, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Permission denied");
      }
    });
  });

  describe("requestJudgeAction", () => {
    it("successfully requests judge", async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await requestJudgeAction(1, 10);

      expect(result.success).toBe(true);
      expect(mockRejectBots).toHaveBeenCalled();
      expect(mockSupabase.rpc).toHaveBeenCalledWith("request_judge", {
        p_match_id: 1,
      });
      expect(updateTag).toHaveBeenCalledWith("tournament:10");
    });

    it("returns error when RPC fails", async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: "Not a match participant" },
      });

      const result = await requestJudgeAction(1, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("match participant");
      }
    });

    it("returns error when match not found", async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: "Match not found" },
      });

      const result = await requestJudgeAction(999, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Match not found");
      }
    });
  });

  describe("resetMatchAction", () => {
    it("successfully resets match", async () => {
      const mockMatch = { id: 1 };
      (supabaseModule.resetMatch as jest.Mock).mockResolvedValue(mockMatch);

      const result = await resetMatchAction(1, 10);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.matchId).toBe(1);
      }
      expect(mockRejectBots).toHaveBeenCalled();
      expect(supabaseModule.resetMatch).toHaveBeenCalledWith(mockSupabase, 1);
      expect(updateTag).toHaveBeenCalledWith("tournament:10");
    });

    it("returns error when match not found", async () => {
      (supabaseModule.resetMatch as jest.Mock).mockRejectedValue(
        new Error("Match not found")
      );

      const result = await resetMatchAction(999, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Match not found");
      }
    });

    it("returns error when not authorized", async () => {
      (supabaseModule.resetMatch as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await resetMatchAction(1, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Permission denied");
      }
    });
  });

  describe("cancelJudgeRequestAction", () => {
    it("successfully cancels judge request", async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await cancelJudgeRequestAction(1, 10);

      expect(result.success).toBe(true);
      expect(mockRejectBots).toHaveBeenCalled();
      expect(mockSupabase.rpc).toHaveBeenCalledWith("cancel_judge_request", {
        p_match_id: 1,
      });
      expect(updateTag).toHaveBeenCalledWith("tournament:10");
    });

    it("returns error when RPC fails", async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: "Not the requester" },
      });

      const result = await cancelJudgeRequestAction(1, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("requester");
      }
    });

    it("returns error when no request to cancel", async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: "No judge request found" },
      });

      const result = await cancelJudgeRequestAction(1, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("judge request");
      }
    });
  });

  describe("clearJudgeRequestAction", () => {
    it("successfully clears judge request", async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await clearJudgeRequestAction(1, 10);

      expect(result.success).toBe(true);
      expect(mockRejectBots).toHaveBeenCalled();
      expect(mockSupabase.rpc).toHaveBeenCalledWith("clear_judge_request", {
        p_match_id: 1,
      });
      expect(updateTag).toHaveBeenCalledWith("tournament:10");
    });

    it("returns error when not authorized", async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: "Permission denied" },
      });

      const result = await clearJudgeRequestAction(1, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Permission denied");
      }
    });

    it("returns error when match not found", async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: "Match not found" },
      });

      const result = await clearJudgeRequestAction(999, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Match not found");
      }
    });

    it("returns error when no request to clear", async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: "No judge request found" },
      });

      const result = await clearJudgeRequestAction(1, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("judge request");
      }
    });
  });
});
