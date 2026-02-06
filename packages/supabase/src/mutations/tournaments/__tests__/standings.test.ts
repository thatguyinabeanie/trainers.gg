import { recalculateStandings, dropPlayer } from "../standings";
import type { TypedClient } from "../../../client";
import { getCurrentUser, getCurrentAlt, checkOrgPermission } from "../helpers";

// Mock helper functions
jest.mock("../helpers", () => ({
  getCurrentUser: jest.fn(),
  getCurrentAlt: jest.fn(),
  checkOrgPermission: jest.fn(),
}));

// Mock client type
type MockClient = {
  from: jest.Mock;
};

const createMockClient = () => {
  return {
    from: jest.fn(),
  } as unknown as TypedClient;
};

describe("Tournament Standings Mutations", () => {
  let mockClient: TypedClient & MockClient;

  beforeEach(() => {
    mockClient = createMockClient() as TypedClient & MockClient;
    jest.clearAllMocks();
  });

  describe("recalculateStandings", () => {
    const tournamentId = 100;

    it("should return early with 0 players if no registrations found", async () => {
      // Mock matches query (two chained .eq() calls)
      const matchesBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      matchesBuilder.eq.mockImplementation((field: string) => {
        if (field === "status") return matchesBuilder;
        return Promise.resolve({ data: [], error: null });
      });

      // Mock registrations query
      const regsBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === "tournament_matches") return matchesBuilder;
        if (table === "tournament_registrations") return regsBuilder;
        return {};
      });

      const result = await recalculateStandings(mockClient, tournamentId);

      expect(result).toEqual({ success: true, playersUpdated: 0 });
    });

    it("should throw error when fetching matches fails", async () => {
      const mockError = new Error("Database connection failed");
      const matchesBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      matchesBuilder.eq.mockImplementation((field: string) => {
        if (field === "status") return matchesBuilder;
        return Promise.resolve({ data: null, error: mockError });
      });

      mockClient.from.mockReturnValue(matchesBuilder);

      await expect(
        recalculateStandings(mockClient, tournamentId)
      ).rejects.toThrow("Database connection failed");
    });

    it("should calculate standings for players with no matches", async () => {
      const matchesBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      matchesBuilder.eq.mockImplementation((field: string) => {
        if (field === "status") return matchesBuilder;
        return Promise.resolve({ data: [], error: null });
      });

      const regsBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ alt_id: 10 }, { alt_id: 20 }],
          error: null,
        }),
      };

      const upsertBuilder = {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };

      const updateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      updateBuilder.eq.mockImplementation((field: string) => {
        if (field === "tournament_id") return updateBuilder;
        return Promise.resolve({ error: null });
      });

      let fromCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "tournament_matches") return matchesBuilder;
        if (table === "tournament_registrations") return regsBuilder;
        if (table === "tournament_player_stats") {
          fromCallCount++;
          // First two calls are upserts, next two are updates
          if (fromCallCount <= 2) return upsertBuilder;
          return updateBuilder;
        }
        return {};
      });

      const result = await recalculateStandings(mockClient, tournamentId);

      expect(result).toEqual({ success: true, playersUpdated: 2 });
    });

    it("should calculate standings with bye matches", async () => {
      const matchesBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      matchesBuilder.eq.mockImplementation((field: string) => {
        if (field === "status") return matchesBuilder;
        return Promise.resolve({
          data: [
            {
              id: 1,
              alt1_id: 10,
              alt2_id: null,
              winner_alt_id: 10,
              game_wins1: 2,
              game_wins2: 0,
              is_bye: true,
              status: "completed",
            },
          ],
          error: null,
        });
      });

      const regsBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ alt_id: 10 }],
          error: null,
        }),
      };

      const upsertMock = jest.fn().mockResolvedValue({ error: null });
      const upsertBuilder = { upsert: upsertMock };

      const updateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      updateBuilder.eq.mockImplementation((field: string) => {
        if (field === "tournament_id") return updateBuilder;
        return Promise.resolve({ error: null });
      });

      let fromCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "tournament_matches") return matchesBuilder;
        if (table === "tournament_registrations") return regsBuilder;
        if (table === "tournament_player_stats") {
          fromCallCount++;
          if (fromCallCount === 1) return upsertBuilder;
          return updateBuilder;
        }
        return {};
      });

      const result = await recalculateStandings(mockClient, tournamentId);

      expect(result).toEqual({ success: true, playersUpdated: 1 });
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          alt_id: 10,
          match_wins: 1,
          match_losses: 0,
          game_wins: 2,
          game_losses: 0,
          match_points: 3,
          has_received_bye: true,
        }),
        { onConflict: "tournament_id,alt_id" }
      );
    });

    it("should calculate standings with regular matches", async () => {
      const matchesBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      matchesBuilder.eq.mockImplementation((field: string) => {
        if (field === "status") return matchesBuilder;
        return Promise.resolve({
          data: [
            {
              id: 1,
              alt1_id: 10,
              alt2_id: 20,
              winner_alt_id: 10,
              game_wins1: 2,
              game_wins2: 1,
              is_bye: false,
              status: "completed",
            },
          ],
          error: null,
        });
      });

      const regsBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ alt_id: 10 }, { alt_id: 20 }],
          error: null,
        }),
      };

      const upsertMock = jest.fn().mockResolvedValue({ error: null });
      const upsertBuilder = { upsert: upsertMock };

      const updateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      updateBuilder.eq.mockImplementation((field: string) => {
        if (field === "tournament_id") return updateBuilder;
        return Promise.resolve({ error: null });
      });

      let fromCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "tournament_matches") return matchesBuilder;
        if (table === "tournament_registrations") return regsBuilder;
        if (table === "tournament_player_stats") {
          fromCallCount++;
          if (fromCallCount <= 2) return upsertBuilder;
          return updateBuilder;
        }
        return {};
      });

      const result = await recalculateStandings(mockClient, tournamentId);

      expect(result).toEqual({ success: true, playersUpdated: 2 });

      const player10Stats = upsertMock.mock.calls.find(
        (call) => call[0].alt_id === 10
      )?.[0];
      expect(player10Stats).toMatchObject({
        alt_id: 10,
        match_wins: 1,
        match_losses: 0,
        game_wins: 2,
        game_losses: 1,
        match_points: 3,
        opponent_history: [20],
      });

      const player20Stats = upsertMock.mock.calls.find(
        (call) => call[0].alt_id === 20
      )?.[0];
      expect(player20Stats).toMatchObject({
        alt_id: 20,
        match_wins: 0,
        match_losses: 1,
        game_wins: 1,
        game_losses: 2,
        match_points: 0,
        opponent_history: [10],
      });
    });

    it("should throw error when upsert fails", async () => {
      const matchesBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      matchesBuilder.eq.mockImplementation((field: string) => {
        if (field === "status") return matchesBuilder;
        return Promise.resolve({ data: [], error: null });
      });

      const regsBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ alt_id: 10 }],
          error: null,
        }),
      };

      const upsertError = new Error("Unique constraint violation");
      const upsertBuilder = {
        upsert: jest.fn().mockResolvedValue({ error: upsertError }),
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === "tournament_matches") return matchesBuilder;
        if (table === "tournament_registrations") return regsBuilder;
        if (table === "tournament_player_stats") return upsertBuilder;
        return {};
      });

      await expect(
        recalculateStandings(mockClient, tournamentId)
      ).rejects.toThrow(/Failed to upsert stats for 1 player/);
    });

    it("should throw error when standing update fails", async () => {
      const matchesBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      matchesBuilder.eq.mockImplementation((field: string) => {
        if (field === "status") return matchesBuilder;
        return Promise.resolve({ data: [], error: null });
      });

      const regsBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ alt_id: 10 }],
          error: null,
        }),
      };

      const upsertBuilder = {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };

      const standingError = new Error("Permission denied");
      const updateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      updateBuilder.eq.mockImplementation((field: string) => {
        if (field === "tournament_id") return updateBuilder;
        return Promise.resolve({ error: standingError });
      });

      let fromCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "tournament_matches") return matchesBuilder;
        if (table === "tournament_registrations") return regsBuilder;
        if (table === "tournament_player_stats") {
          fromCallCount++;
          if (fromCallCount === 1) return upsertBuilder;
          return updateBuilder;
        }
        return {};
      });

      await expect(
        recalculateStandings(mockClient, tournamentId)
      ).rejects.toThrow(/Failed to update standing for alt 10/);
    });
  });

  describe("dropPlayer", () => {
    const mockUser = { id: "user-123" };
    const mockAlt = { id: 10, username: "player1", user_id: "user-123" };
    const tournamentId = 100;
    const altId = 10;

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);
    });

    it("should allow player to drop themselves", async () => {
      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "active",
            organization_id: 200,
            organizations: { owner_user_id: "other-user" },
          },
          error: null,
        }),
      };

      const statsUpdateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ alt_id: altId }],
          error: null,
        }),
      };
      statsUpdateBuilder.eq.mockImplementation((field: string) => {
        if (field === "tournament_id") return statsUpdateBuilder;
        return statsUpdateBuilder;
      });

      const regUpdateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      regUpdateBuilder.eq.mockImplementation((field: string) => {
        if (field === "tournament_id") return regUpdateBuilder;
        return Promise.resolve({ error: null });
      });

      let _fromCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "tournaments") return tournamentBuilder;
        if (table === "tournament_player_stats") {
          _fromCallCount++;
          return statsUpdateBuilder;
        }
        if (table === "tournament_registrations") return regUpdateBuilder;
        return {};
      });

      const result = await dropPlayer(mockClient, tournamentId, altId);

      expect(result).toEqual({ success: true });
    });

    it("should insert new stats record if player has no stats", async () => {
      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "active",
            organization_id: 200,
            organizations: { owner_user_id: "other-user" },
          },
          error: null,
        }),
      };

      const statsUpdateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [], // No existing record
          error: null,
        }),
      };
      statsUpdateBuilder.eq.mockImplementation((field: string) => {
        if (field === "tournament_id") return statsUpdateBuilder;
        return statsUpdateBuilder;
      });

      const insertMock = jest.fn().mockResolvedValue({ error: null });
      const statsInsertBuilder = {
        insert: insertMock,
      };

      const regUpdateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      regUpdateBuilder.eq.mockImplementation((field: string) => {
        if (field === "tournament_id") return regUpdateBuilder;
        return Promise.resolve({ error: null });
      });

      let fromCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "tournaments") return tournamentBuilder;
        if (table === "tournament_player_stats") {
          fromCallCount++;
          if (fromCallCount === 1) return statsUpdateBuilder;
          return statsInsertBuilder;
        }
        if (table === "tournament_registrations") return regUpdateBuilder;
        return {};
      });

      const result = await dropPlayer(mockClient, tournamentId, altId);

      expect(result).toEqual({ success: true });
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tournament_id: tournamentId,
          alt_id: altId,
          is_dropped: true,
          standings_need_recalc: true,
        })
      );
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(dropPlayer(mockClient, tournamentId, altId)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if tournament not found", async () => {
      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockClient.from.mockReturnValue(tournamentBuilder);

      await expect(dropPlayer(mockClient, tournamentId, altId)).rejects.toThrow(
        "Tournament not found"
      );
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);
      (getCurrentAlt as jest.Mock).mockResolvedValue({ id: 999 }); // Different player

      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "active",
            organization_id: 200,
            organizations: { owner_user_id: "other-user" },
          },
          error: null,
        }),
      };

      mockClient.from.mockReturnValue(tournamentBuilder);

      await expect(dropPlayer(mockClient, tournamentId, altId)).rejects.toThrow(
        "You don't have permission to drop this player"
      );
    });

    it("should throw error if tournament is not active", async () => {
      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "draft",
            organization_id: 200,
            organizations: { owner_user_id: "other-user" },
          },
          error: null,
        }),
      };

      mockClient.from.mockReturnValue(tournamentBuilder);

      await expect(dropPlayer(mockClient, tournamentId, altId)).rejects.toThrow(
        "Can only drop players from active tournaments"
      );
    });
  });
});
