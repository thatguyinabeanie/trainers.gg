import {
  submitGameSelection,
  sendMatchMessage,
  sendSystemMessage,
  createMatchGames,
  judgeOverrideGame,
  judgeResetGame,
  resetMatch,
  confirmMatchCheckIn,
} from "../match-games";
import type { TypedClient } from "../../client";
import { createMockClient } from "@trainers/test-utils/mocks";

type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  single: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
};

describe("Match Game Mutations", () => {
  let mockClient: TypedClient;

  beforeEach(() => {
    mockClient = createMockClient() as unknown as TypedClient;
    jest.clearAllMocks();
  });

  describe("submitGameSelection", () => {
    const gameId = 1;
    const selectedWinnerAltId = 10;

    it("should submit game selection successfully", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const result = await submitGameSelection(
        mockClient,
        gameId,
        selectedWinnerAltId
      );

      expect(result).toEqual({ success: true });
      expect(rpcMock).toHaveBeenCalledWith("submit_game_selection", {
        p_game_id: gameId,
        p_selected_winner_alt_id: selectedWinnerAltId,
      });
    });

    it("should throw error when RPC fails", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      const rpcError = new Error("RPC error");
      rpcMock.mockResolvedValue({
        data: null,
        error: rpcError,
      });

      await expect(
        submitGameSelection(mockClient, gameId, selectedWinnerAltId)
      ).rejects.toThrow("RPC error");
    });

    it("should throw error when RPC returns success: false", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: { success: false, error: "Custom error message" },
        error: null,
      });

      await expect(
        submitGameSelection(mockClient, gameId, selectedWinnerAltId)
      ).rejects.toThrow("Custom error message");
    });

    it("should throw default error when RPC returns success: false without message", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: { success: false },
        error: null,
      });

      await expect(
        submitGameSelection(mockClient, gameId, selectedWinnerAltId)
      ).rejects.toThrow("Failed to submit game selection");
    });
  });

  describe("sendMatchMessage", () => {
    const matchId = 1;
    const altId = 10;
    const content = "Good game!";

    it("should send player message successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const mockMessage = {
        id: 1,
        match_id: matchId,
        alt_id: altId,
        content,
        message_type: "player",
      };

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockMessage,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await sendMatchMessage(
        mockClient,
        matchId,
        altId,
        content
      );

      expect(result).toEqual(mockMessage);
    });

    it("should send judge message when messageType specified", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const mockMessage = {
        id: 1,
        match_id: matchId,
        alt_id: altId,
        content,
        message_type: "judge",
      };

      const insertMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockMessage,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await sendMatchMessage(
        mockClient,
        matchId,
        altId,
        content,
        "judge"
      );

      expect(result).toEqual(mockMessage);
      expect(insertMock).toHaveBeenCalledWith({
        match_id: matchId,
        alt_id: altId,
        content,
        message_type: "judge",
      });
    });

    it("should default to player message type", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 1 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await sendMatchMessage(mockClient, matchId, altId, content);

      expect(insertMock).toHaveBeenCalledWith({
        match_id: matchId,
        alt_id: altId,
        content,
        message_type: "player",
      });
    });

    it("should propagate database errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const dbError = new Error("Insert failed");

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        sendMatchMessage(mockClient, matchId, altId, content)
      ).rejects.toThrow("Insert failed");
    });
  });

  describe("sendSystemMessage", () => {
    const matchId = 1;
    const content = "Game 1 result locked";

    it("should send system message successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const mockMessage = {
        id: 1,
        match_id: matchId,
        alt_id: null,
        content,
        message_type: "system",
      };

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockMessage,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await sendSystemMessage(mockClient, matchId, content);

      expect(result).toEqual(mockMessage);
    });

    it("should set alt_id to null for system messages", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 1 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await sendSystemMessage(mockClient, matchId, content);

      expect(insertMock).toHaveBeenCalledWith({
        match_id: matchId,
        alt_id: null,
        content,
        message_type: "system",
      });
    });

    it("should propagate database errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const dbError = new Error("Insert failed");

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        sendSystemMessage(mockClient, matchId, content)
      ).rejects.toThrow("Insert failed");
    });
  });

  describe("createMatchGames", () => {
    const matchId = 1;
    const numberOfGames = 3;

    it("should create match games successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const mockGames = [
        { id: 1, match_id: matchId, game_number: 1 },
        { id: 2, match_id: matchId, game_number: 2 },
        { id: 3, match_id: matchId, game_number: 3 },
      ];

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: mockGames,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await createMatchGames(mockClient, matchId, numberOfGames);

      expect(result).toEqual(mockGames);
    });

    it("should create correct number of games with sequential game_numbers", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await createMatchGames(mockClient, matchId, numberOfGames);

      expect(insertMock).toHaveBeenCalledWith([
        { match_id: matchId, game_number: 1 },
        { match_id: matchId, game_number: 2 },
        { match_id: matchId, game_number: 3 },
      ]);
    });

    it("should handle single game creation", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await createMatchGames(mockClient, matchId, 1);

      expect(insertMock).toHaveBeenCalledWith([
        { match_id: matchId, game_number: 1 },
      ]);
    });

    it("should handle five game series", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await createMatchGames(mockClient, matchId, 5);

      expect(insertMock).toHaveBeenCalledWith([
        { match_id: matchId, game_number: 1 },
        { match_id: matchId, game_number: 2 },
        { match_id: matchId, game_number: 3 },
        { match_id: matchId, game_number: 4 },
        { match_id: matchId, game_number: 5 },
      ]);
    });

    it("should propagate database errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const dbError = new Error("Insert failed");

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        createMatchGames(mockClient, matchId, numberOfGames)
      ).rejects.toThrow("Insert failed");
    });
  });

  describe("judgeOverrideGame", () => {
    const gameId = 1;
    const winnerAltId = 10;
    const judgeAltId = 20;
    const notes = "Player 1 won by timeout";

    it("should override game result successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const mockGame = {
        id: gameId,
        winner_alt_id: winnerAltId,
        status: "resolved",
        resolved_by: judgeAltId,
        resolution_notes: notes,
      };

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockGame,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await judgeOverrideGame(
        mockClient,
        gameId,
        winnerAltId,
        judgeAltId,
        notes
      );

      expect(result).toEqual(mockGame);
    });

    it("should set status to resolved", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: gameId },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await judgeOverrideGame(mockClient, gameId, winnerAltId, judgeAltId);

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "resolved",
          winner_alt_id: winnerAltId,
          resolved_by: judgeAltId,
        })
      );
    });

    it("should set notes to null when not provided", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: gameId },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await judgeOverrideGame(mockClient, gameId, winnerAltId, judgeAltId);

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          resolution_notes: null,
        })
      );
    });

    it("should include notes when provided", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: gameId },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await judgeOverrideGame(
        mockClient,
        gameId,
        winnerAltId,
        judgeAltId,
        notes
      );

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          resolution_notes: notes,
        })
      );
    });

    it("should set resolved_at timestamp", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: gameId },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await judgeOverrideGame(mockClient, gameId, winnerAltId, judgeAltId);

      const callArgs = updateMock.mock.calls[0][0];
      expect(callArgs).toHaveProperty("resolved_at");
      expect(callArgs.resolved_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });

    it("should propagate database errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const dbError = new Error("Update failed");

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        judgeOverrideGame(mockClient, gameId, winnerAltId, judgeAltId)
      ).rejects.toThrow("Update failed");
    });
  });

  describe("judgeResetGame", () => {
    const gameId = 1;

    it("should reset game successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const mockGame = {
        id: gameId,
        alt1_selection: null,
        alt2_selection: null,
        winner_alt_id: null,
        status: "pending",
      };

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockGame,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await judgeResetGame(mockClient, gameId);

      expect(result).toEqual(mockGame);
    });

    it("should clear all game fields", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: gameId },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await judgeResetGame(mockClient, gameId);

      expect(updateMock).toHaveBeenCalledWith({
        alt1_selection: null,
        alt2_selection: null,
        alt1_submitted_at: null,
        alt2_submitted_at: null,
        winner_alt_id: null,
        status: "pending",
        resolved_by: null,
        resolved_at: null,
        resolution_notes: null,
      });
    });

    it("should set status to pending", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: gameId },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await judgeResetGame(mockClient, gameId);

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
        })
      );
    });

    it("should propagate database errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const dbError = new Error("Update failed");

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      } as unknown as MockQueryBuilder);

      await expect(judgeResetGame(mockClient, gameId)).rejects.toThrow(
        "Update failed"
      );
    });
  });

  describe("resetMatch", () => {
    const matchId = 1;

    it("should reset match successfully", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await resetMatch(mockClient, matchId);

      expect(result).toEqual({ id: matchId });
      expect(rpcMock).toHaveBeenCalledWith("reset_match", {
        p_match_id: matchId,
      });
    });

    it("should throw error when RPC fails", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      const rpcError = new Error("RPC error");
      rpcMock.mockResolvedValue({
        data: null,
        error: rpcError,
      });

      await expect(resetMatch(mockClient, matchId)).rejects.toThrow(
        "RPC error"
      );
    });

    it("should call RPC with correct parameters", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: null,
        error: null,
      });

      await resetMatch(mockClient, matchId);

      expect(rpcMock).toHaveBeenCalledTimes(1);
      expect(rpcMock).toHaveBeenCalledWith("reset_match", {
        p_match_id: matchId,
      });
    });

    it("should return match id on success", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await resetMatch(mockClient, 42);

      expect(result).toEqual({ id: 42 });
    });
  });

  describe("confirmMatchCheckIn", () => {
    const matchId = 1;

    it("should confirm check-in successfully", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: { success: true, match_activated: false, player_name: "ash" },
        error: null,
      });

      const result = await confirmMatchCheckIn(mockClient, matchId);

      expect(result).toEqual({
        success: true,
        match_activated: false,
        player_name: "ash",
      });
    });

    it("should call RPC with correct parameters", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: { success: true, match_activated: false },
        error: null,
      });

      await confirmMatchCheckIn(mockClient, matchId);

      expect(rpcMock).toHaveBeenCalledWith("confirm_match_checkin", {
        p_match_id: matchId,
        p_alt_id: null,
      });
    });

    it("should pass altId when provided (staff force check-in)", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: { success: true, match_activated: false },
        error: null,
      });

      await confirmMatchCheckIn(mockClient, matchId, 42);

      expect(rpcMock).toHaveBeenCalledWith("confirm_match_checkin", {
        p_match_id: matchId,
        p_alt_id: 42,
      });
    });

    it("should default altId to null when not provided", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: { success: true, match_activated: false },
        error: null,
      });

      await confirmMatchCheckIn(mockClient, matchId);

      expect(rpcMock).toHaveBeenCalledWith(
        "confirm_match_checkin",
        expect.objectContaining({ p_alt_id: null })
      );
    });

    it("should return match_activated: true when both players confirmed", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: { success: true, match_activated: true },
        error: null,
      });

      const result = await confirmMatchCheckIn(mockClient, matchId);

      expect(result.match_activated).toBe(true);
    });

    it("should throw error when RPC fails", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      const rpcError = new Error("RPC error");
      rpcMock.mockResolvedValue({
        data: null,
        error: rpcError,
      });

      await expect(confirmMatchCheckIn(mockClient, matchId)).rejects.toThrow(
        "RPC error"
      );
    });

    it("should throw error when RPC returns success: false", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: { success: false, error: "Match is not in pending status" },
        error: null,
      });

      await expect(confirmMatchCheckIn(mockClient, matchId)).rejects.toThrow(
        "Match is not in pending status"
      );
    });

    it("should throw default error when RPC returns success: false without message", async () => {
      const rpcMock = mockClient.rpc as jest.Mock;
      rpcMock.mockResolvedValue({
        data: { success: false },
        error: null,
      });

      await expect(confirmMatchCheckIn(mockClient, matchId)).rejects.toThrow(
        "Failed to confirm match check-in"
      );
    });
  });
});
