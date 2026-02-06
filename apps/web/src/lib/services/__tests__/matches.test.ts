/**
 * Tests for Match Service Layer
 */

import { describe, it, expect, jest } from "@jest/globals";
import {
  getMatchByIdService,
  submitGameSelectionService,
  sendMatchMessageService,
  createMatchGamesService,
  judgeOverrideGameService,
  judgeResetGameService,
  resetMatchService,
} from "../matches";

// Mock Supabase client
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Mock Supabase functions
jest.mock("@trainers/supabase", () => ({
  getMatchDetails: jest.fn(),
  submitGameSelection: jest.fn(),
  sendMatchMessage: jest.fn(),
  createMatchGames: jest.fn(),
  judgeOverrideGame: jest.fn(),
  judgeResetGame: jest.fn(),
  resetMatch: jest.fn(),
}));

describe("Match Service", () => {
  describe("getMatchByIdService", () => {
    it("should return match details", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getMatchDetails } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const matchId = 123;
      const mockMatch = { id: matchId, round_id: 1, table_number: 5 };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (getMatchDetails as jest.Mock).mockResolvedValue(mockMatch);

      const result = await getMatchByIdService(matchId);

      expect(createClient).toHaveBeenCalled();
      expect(getMatchDetails).toHaveBeenCalledWith(mockSupabase, matchId);
      expect(result).toEqual(mockMatch);
    });

    it("should throw error when match not found", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getMatchDetails } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const matchId = 456;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (getMatchDetails as jest.Mock).mockResolvedValue(null);

      await expect(getMatchByIdService(matchId)).rejects.toThrow(
        "Match not found"
      );
    });
  });

  describe("submitGameSelectionService", () => {
    it("should submit game selection", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { submitGameSelection } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const gameId = 789;
      const selectedWinnerAltId = 123;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (submitGameSelection as jest.Mock).mockResolvedValue(undefined);

      await submitGameSelectionService(gameId, selectedWinnerAltId);

      expect(createClient).toHaveBeenCalled();
      expect(submitGameSelection).toHaveBeenCalledWith(
        mockSupabase,
        gameId,
        selectedWinnerAltId
      );
    });
  });

  describe("sendMatchMessageService", () => {
    it("should send a match message with default type", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { sendMatchMessage } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const matchId = 123;
      const altId = 456;
      const content = "Good game!";

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (sendMatchMessage as jest.Mock).mockResolvedValue({
        id: 789,
        content,
      });

      const result = await sendMatchMessageService(matchId, altId, content);

      expect(createClient).toHaveBeenCalled();
      expect(sendMatchMessage).toHaveBeenCalledWith(
        mockSupabase,
        matchId,
        altId,
        content,
        "player"
      );
      expect(result).toEqual({ id: 789, content });
    });

    it("should send a match message with custom type", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { sendMatchMessage } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const matchId = 123;
      const altId = 456;
      const content = "Judge call needed";
      const messageType = "judge" as const;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (sendMatchMessage as jest.Mock).mockResolvedValue({
        id: 999,
        content,
      });

      await sendMatchMessageService(matchId, altId, content, messageType);

      expect(createClient).toHaveBeenCalled();
      expect(sendMatchMessage).toHaveBeenCalledWith(
        mockSupabase,
        matchId,
        altId,
        content,
        messageType
      );
    });
  });

  describe("createMatchGamesService", () => {
    it("should create match games", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { createMatchGames } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const matchId = 123;
      const numberOfGames = 3;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (createMatchGames as jest.Mock).mockResolvedValue(undefined);

      await createMatchGamesService(matchId, numberOfGames);

      expect(createClient).toHaveBeenCalled();
      expect(createMatchGames).toHaveBeenCalledWith(
        mockSupabase,
        matchId,
        numberOfGames
      );
    });
  });

  describe("judgeOverrideGameService", () => {
    it("should override game result with notes", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { judgeOverrideGame } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const gameId = 789;
      const winnerAltId = 123;
      const judgeAltId = 456;
      const notes = "Verified winner";

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (judgeOverrideGame as jest.Mock).mockResolvedValue(undefined);

      await judgeOverrideGameService(gameId, winnerAltId, judgeAltId, notes);

      expect(createClient).toHaveBeenCalled();
      expect(judgeOverrideGame).toHaveBeenCalledWith(
        mockSupabase,
        gameId,
        winnerAltId,
        judgeAltId,
        notes
      );
    });

    it("should override game result without notes", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { judgeOverrideGame } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const gameId = 789;
      const winnerAltId = 123;
      const judgeAltId = 456;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (judgeOverrideGame as jest.Mock).mockResolvedValue(undefined);

      await judgeOverrideGameService(gameId, winnerAltId, judgeAltId);

      expect(createClient).toHaveBeenCalled();
      expect(judgeOverrideGame).toHaveBeenCalledWith(
        mockSupabase,
        gameId,
        winnerAltId,
        judgeAltId,
        undefined
      );
    });
  });

  describe("judgeResetGameService", () => {
    it("should reset a game", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { judgeResetGame } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const gameId = 789;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (judgeResetGame as jest.Mock).mockResolvedValue(undefined);

      await judgeResetGameService(gameId);

      expect(createClient).toHaveBeenCalled();
      expect(judgeResetGame).toHaveBeenCalledWith(mockSupabase, gameId);
    });
  });

  describe("resetMatchService", () => {
    it("should reset a match", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { resetMatch } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const matchId = 123;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (resetMatch as jest.Mock).mockResolvedValue(undefined);

      await resetMatchService(matchId);

      expect(createClient).toHaveBeenCalled();
      expect(resetMatch).toHaveBeenCalledWith(mockSupabase, matchId);
    });
  });
});
