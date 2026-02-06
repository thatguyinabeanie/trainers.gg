import { startMatch, reportMatchResult } from "../matches";
import type { TypedClient } from "../../../client";

// Mock helper functions
jest.mock("../helpers", () => ({
  getCurrentUser: jest.fn(),
  getCurrentAlt: jest.fn(),
  checkOrgPermission: jest.fn(),
}));

// Helper to create mock Supabase client

const createMockClient = () => {
  const mockClient = {
    from: jest.fn().mockReturnThis(),
    rpc: jest.fn(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };
  return mockClient as unknown as TypedClient;
};

describe("Tournament Match Mutations", () => {
  let mockClient: TypedClient;

  beforeEach(() => {
    mockClient = createMockClient();
    jest.clearAllMocks();
  });

  describe("startMatch", () => {
    const matchId = 1000;

    it("should successfully start a match via RPC", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await startMatch(mockClient, matchId);

      expect(mockClient.rpc).toHaveBeenCalledWith("start_match", {
        p_match_id: matchId,
      });
      expect(result).toEqual({ success: true });
    });

    it("should throw error when RPC call fails", async () => {
      const mockError = new Error("Permission denied");
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(startMatch(mockClient, matchId)).rejects.toThrow(
        "Permission denied"
      );
    });

    it("should handle database errors during match start", async () => {
      const mockError = {
        message: "Match not found",
        code: "PGRST116",
        details: "The result contains 0 rows",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(startMatch(mockClient, matchId)).rejects.toEqual(mockError);
    });

    it("should handle unauthorized access to match start", async () => {
      const mockError = {
        message: "You do not have permission to start this match",
        code: "42501",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(startMatch(mockClient, matchId)).rejects.toEqual(mockError);
    });

    it("should handle match already started error", async () => {
      const mockError = {
        message: "Match has already been started",
        code: "P0001",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(startMatch(mockClient, matchId)).rejects.toEqual(mockError);
    });

    it("should handle invalid match ID", async () => {
      const invalidMatchId = -1;
      const mockError = {
        message: "Invalid match ID",
        code: "23514",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(startMatch(mockClient, invalidMatchId)).rejects.toEqual(
        mockError
      );
    });
  });

  describe("reportMatchResult", () => {
    const matchId = 1000;
    const winnerId = 10;
    const player1Score = 2;
    const player2Score = 1;

    it("should successfully report match result via RPC", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await reportMatchResult(
        mockClient,
        matchId,
        winnerId,
        player1Score,
        player2Score
      );

      expect(mockClient.rpc).toHaveBeenCalledWith("report_match_result", {
        p_match_id: matchId,
        p_winner_id: winnerId,
        p_score1: player1Score,
        p_score2: player2Score,
      });
      expect(result).toEqual({ success: true });
    });

    it("should handle best of 3 match result (2-0)", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await reportMatchResult(
        mockClient,
        matchId,
        winnerId,
        2,
        0
      );

      expect(mockClient.rpc).toHaveBeenCalledWith("report_match_result", {
        p_match_id: matchId,
        p_winner_id: winnerId,
        p_score1: 2,
        p_score2: 0,
      });
      expect(result).toEqual({ success: true });
    });

    it("should handle best of 3 match result (2-1)", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await reportMatchResult(
        mockClient,
        matchId,
        winnerId,
        2,
        1
      );

      expect(mockClient.rpc).toHaveBeenCalledWith("report_match_result", {
        p_match_id: matchId,
        p_winner_id: winnerId,
        p_score1: 2,
        p_score2: 1,
      });
      expect(result).toEqual({ success: true });
    });

    it("should handle best of 5 match result (3-2)", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await reportMatchResult(
        mockClient,
        matchId,
        winnerId,
        3,
        2
      );

      expect(mockClient.rpc).toHaveBeenCalledWith("report_match_result", {
        p_match_id: matchId,
        p_winner_id: winnerId,
        p_score1: 3,
        p_score2: 2,
      });
      expect(result).toEqual({ success: true });
    });

    it("should handle best of 1 match result (1-0)", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await reportMatchResult(
        mockClient,
        matchId,
        winnerId,
        1,
        0
      );

      expect(mockClient.rpc).toHaveBeenCalledWith("report_match_result", {
        p_match_id: matchId,
        p_winner_id: winnerId,
        p_score1: 1,
        p_score2: 0,
      });
      expect(result).toEqual({ success: true });
    });

    it("should throw error when RPC call fails", async () => {
      const mockError = new Error("Permission denied");
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(
          mockClient,
          matchId,
          winnerId,
          player1Score,
          player2Score
        )
      ).rejects.toThrow("Permission denied");
    });

    it("should handle match not found error", async () => {
      const mockError = {
        message: "Match not found",
        code: "PGRST116",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(
          mockClient,
          matchId,
          winnerId,
          player1Score,
          player2Score
        )
      ).rejects.toEqual(mockError);
    });

    it("should handle unauthorized access to report result", async () => {
      const mockError = {
        message: "You do not have permission to report this match result",
        code: "42501",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(
          mockClient,
          matchId,
          winnerId,
          player1Score,
          player2Score
        )
      ).rejects.toEqual(mockError);
    });

    it("should handle invalid winner ID error", async () => {
      const mockError = {
        message: "Winner must be one of the match participants",
        code: "P0001",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(mockClient, matchId, 999, player1Score, player2Score)
      ).rejects.toEqual(mockError);
    });

    it("should handle invalid score validation error", async () => {
      const mockError = {
        message: "Invalid score: scores must be non-negative",
        code: "P0001",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(mockClient, matchId, winnerId, -1, 2)
      ).rejects.toEqual(mockError);
    });

    it("should handle score inconsistency with winner error", async () => {
      const mockError = {
        message: "Winner score must be higher than loser score",
        code: "P0001",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(mockClient, matchId, winnerId, 1, 2)
      ).rejects.toEqual(mockError);
    });

    it("should handle match already completed error", async () => {
      const mockError = {
        message: "Match result has already been reported",
        code: "P0001",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(
          mockClient,
          matchId,
          winnerId,
          player1Score,
          player2Score
        )
      ).rejects.toEqual(mockError);
    });

    it("should handle match not started error", async () => {
      const mockError = {
        message: "Match must be started before reporting results",
        code: "P0001",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(
          mockClient,
          matchId,
          winnerId,
          player1Score,
          player2Score
        )
      ).rejects.toEqual(mockError);
    });

    it("should handle bye match report error", async () => {
      const mockError = {
        message: "Cannot report results for a bye match",
        code: "P0001",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(
          mockClient,
          matchId,
          winnerId,
          player1Score,
          player2Score
        )
      ).rejects.toEqual(mockError);
    });

    it("should handle concurrent update conflict", async () => {
      const mockError = {
        message: "Concurrent modification detected",
        code: "40001",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(
          mockClient,
          matchId,
          winnerId,
          player1Score,
          player2Score
        )
      ).rejects.toEqual(mockError);
    });

    it("should handle database constraint violation", async () => {
      const mockError = {
        message: "Check constraint violation",
        code: "23514",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(
          mockClient,
          matchId,
          winnerId,
          player1Score,
          player2Score
        )
      ).rejects.toEqual(mockError);
    });

    it("should handle tie score error", async () => {
      const mockError = {
        message: "Match cannot end in a tie",
        code: "P0001",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(mockClient, matchId, winnerId, 2, 2)
      ).rejects.toEqual(mockError);
    });

    it("should handle invalid match state transition", async () => {
      const mockError = {
        message: "Invalid match state for result reporting",
        code: "P0001",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(
          mockClient,
          matchId,
          winnerId,
          player1Score,
          player2Score
        )
      ).rejects.toEqual(mockError);
    });

    it("should successfully report result for player 2 as winner", async () => {
      const player2Id = 20;
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await reportMatchResult(
        mockClient,
        matchId,
        player2Id,
        0,
        2
      );

      expect(mockClient.rpc).toHaveBeenCalledWith("report_match_result", {
        p_match_id: matchId,
        p_winner_id: player2Id,
        p_score1: 0,
        p_score2: 2,
      });
      expect(result).toEqual({ success: true });
    });

    it("should handle zero scores (forfeit scenario)", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await reportMatchResult(
        mockClient,
        matchId,
        winnerId,
        0,
        0
      );

      expect(mockClient.rpc).toHaveBeenCalledWith("report_match_result", {
        p_match_id: matchId,
        p_winner_id: winnerId,
        p_score1: 0,
        p_score2: 0,
      });
      expect(result).toEqual({ success: true });
    });

    it("should handle network timeout error", async () => {
      const mockError = {
        message: "Network request failed",
        code: "NETWORK_ERROR",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        reportMatchResult(
          mockClient,
          matchId,
          winnerId,
          player1Score,
          player2Score
        )
      ).rejects.toEqual(mockError);
    });
  });
});
