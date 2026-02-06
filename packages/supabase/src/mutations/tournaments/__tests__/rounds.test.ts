import {
  generateRoundPairings,
  startRound,
  completeRound,
  createRound,
  deleteRoundAndMatches,
} from "../rounds";
import type { TypedClient } from "../../../client";
import type { PairingResult } from "../../../lib/swiss-pairings";

// Mock helper functions
jest.mock("../helpers", () => ({
  getCurrentUser: jest.fn(),
  getCurrentAlt: jest.fn(),
  checkOrgPermission: jest.fn(),
}));

jest.mock("../standings", () => ({
  recalculateStandings: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("../../../lib/swiss-pairings", () => ({
  generateSwissPairings: jest.fn(),
}));

import { getCurrentUser, checkOrgPermission } from "../helpers";
import { recalculateStandings } from "../standings";
import { generateSwissPairings } from "../../../lib/swiss-pairings";

// Helper to create mock Supabase client
type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  rpc: jest.Mock;
};

const createMockClient = () => {
  const mockClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    rpc: jest.fn(),
  };
  return mockClient as unknown as TypedClient;
};

describe("Tournament Rounds Mutations", () => {
  let mockClient: TypedClient;

  beforeEach(() => {
    mockClient = createMockClient();
    jest.clearAllMocks();
  });

  describe("generateRoundPairings", () => {
    const mockUser = { id: "user-123" };
    const roundId = 1000;

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
    });

    it("should generate pairings for round 1 successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round with tournament info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "active",
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get checked-in players
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [{ alt_id: 10 }, { alt_id: 11 }, { alt_id: 12 }, { alt_id: 13 }],
      } as unknown as MockQueryBuilder);

      // Mock: Get player stats
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            {
              alt_id: 10,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 1,
            },
            {
              alt_id: 11,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 2,
            },
            {
              alt_id: 12,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 3,
            },
            {
              alt_id: 13,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 4,
            },
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Generate pairings
      const mockPairingResult: PairingResult = {
        pairings: [
          {
            alt1Id: 10,
            alt2Id: 11,
            alt1Seed: 1,
            alt2Seed: 2,
            isBye: false,
            pairingReason: "Top-down pairing in 0-point group",
            tableNumber: 1,
          },
          {
            alt1Id: 12,
            alt2Id: 13,
            alt1Seed: 3,
            alt2Seed: 4,
            isBye: false,
            pairingReason: "Top-down pairing in 0-point group",
            tableNumber: 2,
          },
        ],
        warnings: [],
        algorithm: "swiss",
      };
      (generateSwissPairings as jest.Mock).mockReturnValue(mockPairingResult);

      // Mock: Insert matches
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [
            { id: 500, round_id: roundId, alt1_id: 10, alt2_id: 11 },
            { id: 501, round_id: roundId, alt1_id: 12, alt2_id: 13 },
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert pairings
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert opponent history
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await generateRoundPairings(mockClient, roundId);

      expect(result).toEqual({
        success: true,
        matchesCreated: 2,
        warnings: [],
        algorithm: "swiss",
      });
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(generateRoundPairings(mockClient, roundId)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if round not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(generateRoundPairings(mockClient, roundId)).rejects.toThrow(
        "Round not found"
      );
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "active",
                organizations: {
                  owner_user_id: "user-456",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(generateRoundPairings(mockClient, roundId)).rejects.toThrow(
        "You don't have permission to generate pairings"
      );
    });

    it("should throw error if tournament is not active", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "draft",
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(generateRoundPairings(mockClient, roundId)).rejects.toThrow(
        "Tournament must be active to generate pairings"
      );
    });

    it("should throw error if round is not pending", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "active",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "active",
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(generateRoundPairings(mockClient, roundId)).rejects.toThrow(
        'Cannot generate pairings for round with status "active"'
      );
    });

    it("should throw error if previous round not completed", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round 2
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 2,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "active",
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous round (still active)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: 999,
            round_number: 1,
            status: "active",
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(generateRoundPairings(mockClient, roundId)).rejects.toThrow(
        "Round 1 must be completed before generating pairings for round 2."
      );
    });

    it("should throw error if no checked-in players", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "active",
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: No checked-in players
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [],
      } as unknown as MockQueryBuilder);

      await expect(generateRoundPairings(mockClient, roundId)).rejects.toThrow(
        "No checked-in players to pair"
      );
    });

    it("should throw error if pairing generation fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "active",
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get checked-in players
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [{ alt_id: 10 }],
      } as unknown as MockQueryBuilder);

      // Mock: Get player stats
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Generate pairings returns empty array
      (generateSwissPairings as jest.Mock).mockReturnValue({
        pairings: [],
        warnings: [],
        algorithm: "swiss",
      });

      await expect(generateRoundPairings(mockClient, roundId)).rejects.toThrow(
        "Failed to generate any pairings"
      );
    });

    it("should handle bye matches correctly", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "active",
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get checked-in players (odd number)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [{ alt_id: 10 }, { alt_id: 11 }, { alt_id: 12 }],
      } as unknown as MockQueryBuilder);

      // Mock: Get player stats
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            {
              alt_id: 10,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 1,
            },
            {
              alt_id: 11,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 2,
            },
            {
              alt_id: 12,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 3,
            },
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Generate pairings with bye
      const mockPairingResult: PairingResult = {
        pairings: [
          {
            alt1Id: 10,
            alt2Id: 11,
            alt1Seed: 1,
            alt2Seed: 2,
            isBye: false,
            pairingReason: "Top-down pairing in 0-point group",
            tableNumber: 1,
          },
          {
            alt1Id: 12,
            alt2Id: null,
            alt1Seed: 3,
            alt2Seed: null,
            isBye: true,
            pairingReason: "Bye - odd number of players",
            tableNumber: 0,
          },
        ],
        warnings: [],
        algorithm: "swiss",
      };
      (generateSwissPairings as jest.Mock).mockReturnValue(mockPairingResult);

      // Mock: Insert matches
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [
            { id: 500, round_id: roundId, alt1_id: 10, alt2_id: 11 },
            { id: 501, round_id: roundId, alt1_id: 12, alt2_id: null },
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert pairings
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert opponent history (only for non-bye)
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Update bye player stats - first try update
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ alt_id: 12 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await generateRoundPairings(mockClient, roundId);

      expect(result).toEqual({
        success: true,
        matchesCreated: 2,
        warnings: [],
        algorithm: "swiss",
      });
    });

    it("should insert stats record for bye player if none exists", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "active",
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get checked-in players
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [{ alt_id: 12 }],
      } as unknown as MockQueryBuilder);

      // Mock: Get player stats (empty)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Generate pairings with bye
      (generateSwissPairings as jest.Mock).mockReturnValue({
        pairings: [
          {
            alt1Id: 12,
            alt2Id: null,
            alt1Seed: 1,
            alt2Seed: null,
            isBye: true,
            pairingReason: "Bye - odd number of players",
            tableNumber: 0,
          },
        ],
        warnings: [],
        algorithm: "swiss",
      });

      // Mock: Insert matches
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 501, round_id: roundId, alt1_id: 12, alt2_id: null }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert pairings
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Update bye player stats - returns empty (no record)
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert new stats record
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await generateRoundPairings(mockClient, roundId);

      expect(result).toEqual({
        success: true,
        matchesCreated: 1,
        warnings: [],
        algorithm: "swiss",
      });
    });

    it("should throw error if match insert fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "active",
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get checked-in players
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [{ alt_id: 10 }, { alt_id: 11 }],
      } as unknown as MockQueryBuilder);

      // Mock: Get player stats
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            {
              alt_id: 10,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 1,
            },
            {
              alt_id: 11,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 2,
            },
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Generate pairings
      (generateSwissPairings as jest.Mock).mockReturnValue({
        pairings: [
          {
            alt1Id: 10,
            alt2Id: 11,
            alt1Seed: 1,
            alt2Seed: 2,
            isBye: false,
            pairingReason: "Top-down pairing",
            tableNumber: 1,
          },
        ],
        warnings: [],
        algorithm: "swiss",
      });

      // Mock: Insert matches fails
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(generateRoundPairings(mockClient, roundId)).rejects.toEqual({
        message: "Database error",
      });
    });

    it("should throw error if pairing insert fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "active",
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get checked-in players
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [{ alt_id: 10 }, { alt_id: 11 }],
      } as unknown as MockQueryBuilder);

      // Mock: Get player stats
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            {
              alt_id: 10,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 1,
            },
            {
              alt_id: 11,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 2,
            },
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Generate pairings
      (generateSwissPairings as jest.Mock).mockReturnValue({
        pairings: [
          {
            alt1Id: 10,
            alt2Id: 11,
            alt1Seed: 1,
            alt2Seed: 2,
            isBye: false,
            pairingReason: "Top-down pairing",
            tableNumber: 1,
          },
        ],
        warnings: [],
        algorithm: "swiss",
      });

      // Mock: Insert matches succeeds
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 500, round_id: roundId, alt1_id: 10, alt2_id: 11 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert pairings fails
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: { message: "Pairing insert failed" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(generateRoundPairings(mockClient, roundId)).rejects.toEqual({
        message: "Pairing insert failed",
      });
    });

    it("should throw error if opponent history insert fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "active",
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get checked-in players
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [{ alt_id: 10 }, { alt_id: 11 }],
      } as unknown as MockQueryBuilder);

      // Mock: Get player stats
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            {
              alt_id: 10,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 1,
            },
            {
              alt_id: 11,
              match_points: 0,
              game_win_percentage: 0,
              opponent_match_win_percentage: 0,
              opponent_history: [],
              has_received_bye: false,
              is_dropped: false,
              current_seed: 2,
            },
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Generate pairings
      (generateSwissPairings as jest.Mock).mockReturnValue({
        pairings: [
          {
            alt1Id: 10,
            alt2Id: 11,
            alt1Seed: 1,
            alt2Seed: 2,
            isBye: false,
            pairingReason: "Top-down pairing",
            tableNumber: 1,
          },
        ],
        warnings: [],
        algorithm: "swiss",
      });

      // Mock: Insert matches
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 500, round_id: roundId, alt1_id: 10, alt2_id: 11 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert pairings
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert opponent history fails
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: { message: "History insert failed" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(generateRoundPairings(mockClient, roundId)).rejects.toEqual({
        message: "History insert failed",
      });
    });

    it("should throw error if bye player stats insert fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              phase_type: "swiss",
              tournaments: {
                id: 200,
                organization_id: 300,
                status: "active",
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get checked-in players
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [{ alt_id: 12 }],
      } as unknown as MockQueryBuilder);

      // Mock: Get player stats
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Generate pairings with bye
      (generateSwissPairings as jest.Mock).mockReturnValue({
        pairings: [
          {
            alt1Id: 12,
            alt2Id: null,
            alt1Seed: 1,
            alt2Seed: null,
            isBye: true,
            pairingReason: "Bye",
            tableNumber: 0,
          },
        ],
        warnings: [],
        algorithm: "swiss",
      });

      // Mock: Insert matches
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 501, round_id: roundId, alt1_id: 12, alt2_id: null }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert pairings
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Update bye player stats - returns empty (no record)
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert new stats record fails
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: { message: "Stats insert failed" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(generateRoundPairings(mockClient, roundId)).rejects.toEqual({
        message: "Stats insert failed",
      });
    });
  });

  describe("startRound", () => {
    it("should start a round successfully via RPC", async () => {
      const roundId = 1000;
      const rpcSpy = jest.spyOn(mockClient, "rpc");

      rpcSpy.mockResolvedValue({
        data: {
          success: true,
          matches_activated: 2,
          games_created: 4,
          best_of: 3,
        },
        error: null,
      });

      const result = await startRound(mockClient, roundId);

      expect(rpcSpy).toHaveBeenCalledWith("start_round", {
        p_round_id: roundId,
        p_best_of_override: undefined,
      });
      expect(result).toEqual({
        success: true,
        matches_activated: 2,
        games_created: 4,
        best_of: 3,
      });
    });

    it("should start a round with best-of override", async () => {
      const roundId = 1000;
      const bestOfOverride = 5;
      const rpcSpy = jest.spyOn(mockClient, "rpc");

      rpcSpy.mockResolvedValue({
        data: {
          success: true,
          matches_activated: 2,
          games_created: 10,
          best_of: 5,
        },
        error: null,
      });

      const result = await startRound(mockClient, roundId, bestOfOverride);

      expect(rpcSpy).toHaveBeenCalledWith("start_round", {
        p_round_id: roundId,
        p_best_of_override: bestOfOverride,
      });
      expect(result).toEqual({
        success: true,
        matches_activated: 2,
        games_created: 10,
        best_of: 5,
      });
    });

    it("should throw error if RPC fails", async () => {
      const roundId = 1000;
      const rpcSpy = jest.spyOn(mockClient, "rpc");

      rpcSpy.mockResolvedValue({
        data: null,
        error: { message: "Round not found" },
      });

      await expect(startRound(mockClient, roundId)).rejects.toEqual({
        message: "Round not found",
      });
    });
  });

  describe("completeRound", () => {
    const mockUser = { id: "user-123" };
    const roundId = 1000;

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
    });

    it("should complete a round successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round with tournament info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            status: "active",
            phase_id: 100,
            tournament_phases: {
              tournament_id: 200,
              tournaments: {
                organization_id: 300,
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check incomplete matches - none found
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update round status
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await completeRound(mockClient, roundId);

      expect(result).toEqual({ success: true });
      expect(recalculateStandings).toHaveBeenCalledWith(mockClient, 200);
    });

    it("should throw error if round update fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round with tournament info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            status: "active",
            phase_id: 100,
            tournament_phases: {
              tournament_id: 200,
              tournaments: {
                organization_id: 300,
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check incomplete matches - none found
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update round status fails
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: "Update failed" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(completeRound(mockClient, roundId)).rejects.toEqual({
        message: "Update failed",
      });
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(completeRound(mockClient, roundId)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if round not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(completeRound(mockClient, roundId)).rejects.toThrow(
        "Round not found"
      );
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            status: "active",
            phase_id: 100,
            tournament_phases: {
              tournament_id: 200,
              tournaments: {
                organization_id: 300,
                organizations: {
                  owner_user_id: "user-456",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(completeRound(mockClient, roundId)).rejects.toThrow(
        "You don't have permission to complete this round"
      );
    });

    it("should throw error if round is not active", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            status: "pending",
            phase_id: 100,
            tournament_phases: {
              tournament_id: 200,
              tournaments: {
                organization_id: 300,
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(completeRound(mockClient, roundId)).rejects.toThrow(
        'Cannot complete round with status "pending"'
      );
    });

    it("should throw error if matches are incomplete", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            status: "active",
            phase_id: 100,
            tournament_phases: {
              tournament_id: 200,
              tournaments: {
                organization_id: 300,
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check incomplete matches - 2 found
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [{ id: 500 }, { id: 501 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(completeRound(mockClient, roundId)).rejects.toThrow(
        "Cannot complete round: 2 match(es) still in progress"
      );
    });
  });

  describe("createRound", () => {
    const mockUser = { id: "user-123" };
    const phaseId = 100;
    const roundNumber = 1;

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
    });

    it("should create round 1 successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get phase with tournament info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            tournament_id: 200,
            tournaments: {
              organization_id: 300,
              organizations: {
                owner_user_id: "user-123",
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check existing rounds - none
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert round
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1000,
            phase_id: phaseId,
            round_number: 1,
            status: "pending",
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await createRound(mockClient, phaseId, roundNumber);

      expect(result).toEqual({
        success: true,
        round: {
          id: 1000,
          phase_id: phaseId,
          round_number: 1,
          status: "pending",
        },
      });
    });

    it("should throw error if round insert fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get phase with tournament info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            tournament_id: 200,
            tournaments: {
              organization_id: 300,
              organizations: {
                owner_user_id: "user-123",
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check existing rounds - none
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert round fails
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        createRound(mockClient, phaseId, roundNumber)
      ).rejects.toEqual({
        message: "Insert failed",
      });
    });

    it("should create round 2 after round 1 is completed", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get phase
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            tournament_id: 200,
            tournaments: {
              organization_id: 300,
              organizations: {
                owner_user_id: "user-123",
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check existing rounds - round 1 completed
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 999, round_number: 1, status: "completed" }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert round 2
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1001,
            phase_id: phaseId,
            round_number: 2,
            status: "pending",
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await createRound(mockClient, phaseId, 2);

      expect(result).toEqual({
        success: true,
        round: {
          id: 1001,
          phase_id: phaseId,
          round_number: 2,
          status: "pending",
        },
      });
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(
        createRound(mockClient, phaseId, roundNumber)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if phase not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        createRound(mockClient, phaseId, roundNumber)
      ).rejects.toThrow("Phase not found");
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            tournament_id: 200,
            tournaments: {
              organization_id: 300,
              organizations: {
                owner_user_id: "user-456",
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        createRound(mockClient, phaseId, roundNumber)
      ).rejects.toThrow("You don't have permission to create rounds");
    });

    it("should throw error if active round exists", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get phase
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            tournament_id: 200,
            tournaments: {
              organization_id: 300,
              organizations: {
                owner_user_id: "user-123",
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Active round exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 999, round_number: 1, status: "active" }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(createRound(mockClient, phaseId, 2)).rejects.toThrow(
        "Round 1 is still active. Complete it before creating a new round."
      );
    });

    it("should throw error if previous round not completed", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get phase
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            tournament_id: 200,
            tournaments: {
              organization_id: 300,
              organizations: {
                owner_user_id: "user-123",
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Previous round is pending
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 999, round_number: 1, status: "pending" }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(createRound(mockClient, phaseId, 2)).rejects.toThrow(
        "Round 1 must be completed before creating round 2."
      );
    });

    it("should throw error if round number sequence is invalid", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get phase
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            tournament_id: 200,
            tournaments: {
              organization_id: 300,
              organizations: {
                owner_user_id: "user-123",
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Round 1 exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 999, round_number: 1, status: "completed" }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(createRound(mockClient, phaseId, 5)).rejects.toThrow(
        "Invalid round number. Expected 2, got 5."
      );
    });

    it("should throw error if first round is not number 1", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get phase
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            tournament_id: 200,
            tournaments: {
              organization_id: 300,
              organizations: {
                owner_user_id: "user-123",
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: No existing rounds
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(createRound(mockClient, phaseId, 2)).rejects.toThrow(
        "First round must be round number 1."
      );
    });
  });

  describe("deleteRoundAndMatches", () => {
    const mockUser = { id: "user-123" };
    const roundId = 1000;

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
    });

    it("should delete pending round and its matches/pairings", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round with tournament info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            status: "pending",
            round_number: 2,
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              tournaments: {
                organization_id: 300,
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get match IDs
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 500 }, { id: 501 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete pairings
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete matches
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete round
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await deleteRoundAndMatches(mockClient, roundId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if pairing delete fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round with tournament info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            status: "pending",
            round_number: 2,
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              tournaments: {
                organization_id: 300,
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get match IDs
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 500 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete pairings fails
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: "Pairing delete failed" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(deleteRoundAndMatches(mockClient, roundId)).rejects.toEqual({
        message: "Pairing delete failed",
      });
    });

    it("should throw error if match delete fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            status: "pending",
            round_number: 2,
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              tournaments: {
                organization_id: 300,
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get match IDs
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 500 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete pairings succeeds
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete matches fails
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: "Match delete failed" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(deleteRoundAndMatches(mockClient, roundId)).rejects.toEqual({
        message: "Match delete failed",
      });
    });

    it("should throw error if round delete fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            status: "pending",
            round_number: 1,
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              tournaments: {
                organization_id: 300,
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: No matches found
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete round fails
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: "Round delete failed" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(deleteRoundAndMatches(mockClient, roundId)).rejects.toEqual({
        message: "Round delete failed",
      });
    });

    it("should delete round even if no matches exist", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            status: "pending",
            round_number: 1,
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              tournaments: {
                organization_id: 300,
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: No matches found
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete round
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await deleteRoundAndMatches(mockClient, roundId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(deleteRoundAndMatches(mockClient, roundId)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if round not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(deleteRoundAndMatches(mockClient, roundId)).rejects.toThrow(
        "Round not found"
      );
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            status: "pending",
            round_number: 1,
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              tournaments: {
                organization_id: 300,
                organizations: {
                  owner_user_id: "user-456",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(deleteRoundAndMatches(mockClient, roundId)).rejects.toThrow(
        "You don't have permission to delete this round"
      );
    });

    it("should throw error if round is not pending", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            status: "active",
            round_number: 1,
            phase_id: 100,
            tournament_phases: {
              id: 100,
              tournament_id: 200,
              tournaments: {
                organization_id: 300,
                organizations: {
                  owner_user_id: "user-123",
                },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(deleteRoundAndMatches(mockClient, roundId)).rejects.toThrow(
        'Cannot delete round with status "active". Only pending rounds can be deleted.'
      );
    });
  });
});
