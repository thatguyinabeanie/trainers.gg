import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getMatchGames,
  getMatchGamesForPlayer,
  getMatchMessages,
  getMatchGame,
} from "../match-games";
import type { TypedClient } from "../../client";

// Mock query builder
type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => MockQueryBuilder>;
  limit: jest.Mock<() => MockQueryBuilder>;
  gt: jest.Mock<() => MockQueryBuilder>;
  single: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
  then: jest.Mock<
    (
      resolve: (value: { data: unknown; error: unknown }) => void
    ) => Promise<{ data: unknown; error: unknown }>
  >;
};

const createMockClient = () => {
  const mockQueryBuilder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn(function (
      this: MockQueryBuilder,
      resolve: (value: { data: unknown; error: unknown }) => void
    ) {
      return Promise.resolve({ data: [], error: null }).then(resolve);
    }),
  };

  // Make the query builder thenable
  Object.defineProperty(mockQueryBuilder, "then", {
    value: jest.fn((resolve) => {
      return Promise.resolve({ data: [], error: null }).then(resolve);
    }),
  });

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    _queryBuilder: mockQueryBuilder,
  } as unknown as TypedClient & { _queryBuilder: MockQueryBuilder };
};

describe("match-games queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getMatchGames", () => {
    it("should fetch all match games for a match", async () => {
      const mockGames = [
        {
          id: 1,
          match_id: 100,
          game_number: 1,
          winner_alt_id: 10,
          player1_selection: "pokemon-1",
          player2_selection: "pokemon-2",
        },
        {
          id: 2,
          match_id: 100,
          game_number: 2,
          winner_alt_id: 20,
          player1_selection: "pokemon-3",
          player2_selection: "pokemon-4",
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockGames, error: null }).then(resolve);
      });

      const result = await getMatchGames(mockClient, 100);

      expect(result).toEqual(mockGames);
      expect(mockClient.from).toHaveBeenCalledWith("match_games");
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith("*");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("match_id", 100);
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "game_number",
        { ascending: true }
      );
    });

    it("should return empty array when no games exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const result = await getMatchGames(mockClient, 999);

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(getMatchGames(mockClient, 100)).rejects.toThrow(
        "Database error"
      );
    });

    it("should order games by game_number ascending", async () => {
      const mockGames = [
        { id: 1, match_id: 100, game_number: 1 },
        { id: 2, match_id: 100, game_number: 2 },
        { id: 3, match_id: 100, game_number: 3 },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockGames, error: null }).then(resolve);
      });

      const result = await getMatchGames(mockClient, 100);

      expect(result).toHaveLength(3);
      expect(result[0]?.game_number).toBe(1);
      expect(result[2]?.game_number).toBe(3);
    });
  });

  describe("getMatchGamesForPlayer", () => {
    it("should fetch match games with redacted opponent selections via RPC", async () => {
      const mockGames = [
        {
          id: 1,
          match_id: 100,
          game_number: 1,
          my_selection: "pokemon-1",
          opponent_selection: null, // Redacted until game ends
        },
        {
          id: 2,
          match_id: 100,
          game_number: 2,
          my_selection: "pokemon-3",
          opponent_selection: "pokemon-4", // Revealed after game ends
        },
      ];

      const mockClient = createMockClient();
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: mockGames,
        error: null,
      });

      const result = await getMatchGamesForPlayer(mockClient, 100);

      expect(result).toEqual(mockGames);
      expect(mockClient.rpc).toHaveBeenCalledWith(
        "get_match_games_for_player",
        {
          p_match_id: 100,
        }
      );
    });

    it("should return empty array when no games exist", async () => {
      const mockClient = createMockClient();
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getMatchGamesForPlayer(mockClient, 999);

      expect(result).toEqual([]);
    });

    it("should throw error on RPC failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("RPC error");
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(getMatchGamesForPlayer(mockClient, 100)).rejects.toThrow(
        "RPC error"
      );
    });
  });

  describe("getMatchMessages", () => {
    it("should fetch match messages with alt information", async () => {
      const mockMessages = [
        {
          id: 1,
          match_id: 100,
          alt_id: 10,
          message: "Good luck!",
          created_at: "2024-01-01T12:00:00Z",
          alt: {
            id: 10,
            display_name: "Player One",
            username: "player1",
            avatar_url: "https://example.com/avatar1.png",
          },
        },
        {
          id: 2,
          match_id: 100,
          alt_id: 20,
          message: "Thanks, you too!",
          created_at: "2024-01-01T12:01:00Z",
          alt: {
            id: 20,
            display_name: "Player Two",
            username: "player2",
            avatar_url: "https://example.com/avatar2.png",
          },
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockMessages, error: null }).then(
          resolve
        );
      });

      const result = await getMatchMessages(mockClient, 100);

      expect(result).toEqual(mockMessages);
      expect(mockClient.from).toHaveBeenCalledWith("match_messages");
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith(
        expect.stringContaining("alt:alts")
      );
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("match_id", 100);
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: true }
      );
      expect(mockClient._queryBuilder.limit).toHaveBeenCalledWith(100);
    });

    it("should apply custom limit", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await getMatchMessages(mockClient, 100, { limit: 50 });

      expect(mockClient._queryBuilder.limit).toHaveBeenCalledWith(50);
    });

    it("should apply cursor-based pagination", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const cursor = "2024-01-01T12:00:00Z";
      await getMatchMessages(mockClient, 100, { cursor });

      expect(mockClient._queryBuilder.gt).toHaveBeenCalledWith(
        "created_at",
        cursor
      );
    });

    it("should not apply cursor filter when cursor is not provided", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await getMatchMessages(mockClient, 100);

      expect(mockClient._queryBuilder.gt).not.toHaveBeenCalled();
    });

    it("should return empty array when no messages exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const result = await getMatchMessages(mockClient, 999);

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(getMatchMessages(mockClient, 100)).rejects.toThrow(
        "Database error"
      );
    });

    it("should order messages chronologically", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await getMatchMessages(mockClient, 100);

      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: true }
      );
    });
  });

  describe("getMatchGame", () => {
    it("should fetch a single match game by ID", async () => {
      const mockGame = {
        id: 1,
        match_id: 100,
        game_number: 1,
        winner_alt_id: 10,
        player1_selection: "pokemon-1",
        player2_selection: "pokemon-2",
      };

      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: mockGame,
        error: null,
      });

      const result = await getMatchGame(mockClient, 1);

      expect(result).toEqual(mockGame);
      expect(mockClient.from).toHaveBeenCalledWith("match_games");
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith("*");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("id", 1);
      expect(mockClient._queryBuilder.single).toHaveBeenCalled();
    });

    it("should throw error when game not found", async () => {
      const mockClient = createMockClient();
      const notFoundError = new Error("Game not found");
      mockClient._queryBuilder.single.mockResolvedValue({
        data: null,
        error: notFoundError,
      });

      await expect(getMatchGame(mockClient, 999)).rejects.toThrow(
        "Game not found"
      );
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(getMatchGame(mockClient, 1)).rejects.toThrow(
        "Database error"
      );
    });
  });
});
