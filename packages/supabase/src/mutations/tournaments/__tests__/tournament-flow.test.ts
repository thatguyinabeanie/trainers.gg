import {
  startTournamentEnhanced,
  advanceToTopCut,
  generateEliminationPairings,
  completeTournament,
} from "../tournament-flow";
import type { TypedClient } from "../../../client";

// Mock helper functions
jest.mock("../helpers", () => ({
  getCurrentUser: jest.fn(),
  getCurrentAlt: jest.fn(),
  checkOrgPermission: jest.fn(),
}));

jest.mock("../standings", () => ({
  recalculateStandings: jest.fn(),
}));

import { getCurrentUser, checkOrgPermission } from "../helpers";
import { recalculateStandings } from "../standings";

// Helper to create mock Supabase client
type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
  neq: jest.Mock;
  order: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  single: jest.Mock;
  limit: jest.Mock;
  upsert: jest.Mock;
};

const createMockClient = () => {
  const mockClient = {
    from: jest.fn().mockReturnThis(),
    rpc: jest.fn(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn(),
    limit: jest.fn().mockReturnThis(),
    upsert: jest.fn(),
  };
  return mockClient as unknown as TypedClient;
};

describe("Tournament Flow Mutations", () => {
  let mockClient: TypedClient;

  beforeEach(() => {
    mockClient = createMockClient();
    jest.clearAllMocks();
  });

  describe("startTournamentEnhanced", () => {
    const mockUser = { id: "user-123" };
    const tournamentId = 100;

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
    });

    it("should successfully start tournament with phases", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament with org info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Lock teams for checked-in players
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { id: 1, phase_order: 1, status: "pending" },
            { id: 2, phase_order: 2, status: "pending" },
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Activate first phase
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Check existing rounds
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert new round
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament status
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Get checked-in registrations
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ alt_id: 10 }, { alt_id: 11 }, { alt_id: 12 }],
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Upsert player stats
      fromSpy.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await startTournamentEnhanced(mockClient, tournamentId);

      expect(result).toEqual({
        teamsLocked: 3,
        phaseActivated: 1,
      });
    });

    it("should start tournament without phases", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament with org info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Lock teams
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases (empty)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament status (no phases)
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Get checked-in registrations
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ alt_id: 10 }],
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Upsert player stats
      fromSpy.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await startTournamentEnhanced(mockClient, tournamentId);

      expect(result).toEqual({
        teamsLocked: 1,
        phaseActivated: null,
      });
    });

    it("should skip round creation if rounds already exist", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Lock teams
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 1, phase_order: 1, status: "pending" }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Activate phase
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Check existing rounds (found)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: 999 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament status
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Get checked-in registrations
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      const result = await startTournamentEnhanced(mockClient, tournamentId);

      expect(result.teamsLocked).toBe(0);
      expect(result.phaseActivated).toBe(1);
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(
        startTournamentEnhanced(mockClient, tournamentId)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if tournament not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        startTournamentEnhanced(mockClient, tournamentId)
      ).rejects.toThrow("Tournament not found");
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            organization_id: 200,
            organizations: { owner_user_id: "other-user" },
          },
          error: null,
        }),
      });

      await expect(
        startTournamentEnhanced(mockClient, tournamentId)
      ).rejects.toThrow("You don't have permission to start this tournament");
    });

    it("should throw error if tournament status is not upcoming", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "active",
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      });

      await expect(
        startTournamentEnhanced(mockClient, tournamentId)
      ).rejects.toThrow('Cannot start tournament with status "active"');
    });

    it("should throw error if locking teams fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Lock teams (error)
      const lockError = new Error("Database error");
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: lockError }),
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        startTournamentEnhanced(mockClient, tournamentId)
      ).rejects.toThrow("Database error");
    });

    it("should throw error if getting phases fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Lock teams
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases (error)
      const phasesError = new Error("Phases query failed");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: phasesError,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        startTournamentEnhanced(mockClient, tournamentId)
      ).rejects.toThrow("Phases query failed");
    });

    it("should throw error if activating phase fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Lock teams
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 1, phase_order: 1, status: "pending" }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Activate phase (error)
      const activateError = new Error("Phase activation failed");
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: activateError }),
      } as unknown as MockQueryBuilder);

      await expect(
        startTournamentEnhanced(mockClient, tournamentId)
      ).rejects.toThrow("Phase activation failed");
    });

    it("should throw error if checking existing rounds fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Lock teams
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 1, phase_order: 1, status: "pending" }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Activate phase
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Check existing rounds (error)
      const roundsError = new Error("Rounds query failed");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: roundsError,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        startTournamentEnhanced(mockClient, tournamentId)
      ).rejects.toThrow("Rounds query failed");
    });

    it("should throw error if inserting round fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Lock teams
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 1, phase_order: 1, status: "pending" }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Activate phase
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Check existing rounds (none)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert round (error)
      const insertError = new Error("Round insert failed");
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: insertError }),
      } as unknown as MockQueryBuilder);

      await expect(
        startTournamentEnhanced(mockClient, tournamentId)
      ).rejects.toThrow("Round insert failed");
    });

    it("should throw error if updating tournament fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Lock teams
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 1, phase_order: 1, status: "pending" }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Activate phase
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Check existing rounds
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert round
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament (error)
      const updateError = new Error("Tournament update failed");
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: updateError }),
      } as unknown as MockQueryBuilder);

      await expect(
        startTournamentEnhanced(mockClient, tournamentId)
      ).rejects.toThrow("Tournament update failed");
    });

    it("should throw error if getting registrations fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Lock teams
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases (none)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Get registrations (error)
      const regsError = new Error("Registrations query failed");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: regsError,
          }),
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        startTournamentEnhanced(mockClient, tournamentId)
      ).rejects.toThrow("Registrations query failed");
    });

    it("should throw error if upserting stats fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Lock teams
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases (none)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Get registrations
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ alt_id: 10 }],
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Upsert stats (error)
      const statsError = new Error("Stats upsert failed");
      fromSpy.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({ error: statsError }),
      } as unknown as MockQueryBuilder);

      await expect(
        startTournamentEnhanced(mockClient, tournamentId)
      ).rejects.toThrow("Stats upsert failed");
    });
  });

  describe("advanceToTopCut", () => {
    const tournamentId = 100;

    it("should successfully advance to top cut via RPC", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          qualifiers: 8,
          matches_created: 4,
          phase_id: 2,
          round_id: 10,
        },
        error: null,
      });

      const result = await advanceToTopCut(mockClient, tournamentId);

      expect(mockClient.rpc).toHaveBeenCalledWith("advance_to_top_cut", {
        p_tournament_id: tournamentId,
        p_top_cut_size: undefined,
      });
      expect(result).toEqual({
        success: true,
        qualifiers: 8,
        matches_created: 4,
        phase_id: 2,
        round_id: 10,
      });
    });

    it("should advance to top cut with custom size", async () => {
      const topCutSize = 16;
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          qualifiers: 16,
          matches_created: 8,
          phase_id: 2,
          round_id: 10,
        },
        error: null,
      });

      const result = await advanceToTopCut(
        mockClient,
        tournamentId,
        topCutSize
      );

      expect(mockClient.rpc).toHaveBeenCalledWith("advance_to_top_cut", {
        p_tournament_id: tournamentId,
        p_top_cut_size: topCutSize,
      });
      expect(result.qualifiers).toBe(16);
    });

    it("should throw error when RPC call fails", async () => {
      const mockError = new Error("Permission denied");
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(advanceToTopCut(mockClient, tournamentId)).rejects.toThrow(
        "Permission denied"
      );
    });

    it("should handle tournament not found error", async () => {
      const mockError = {
        message: "Tournament not found",
        code: "PGRST116",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(advanceToTopCut(mockClient, tournamentId)).rejects.toEqual(
        mockError
      );
    });

    it("should handle no Swiss phase error", async () => {
      const mockError = {
        message: "No Swiss phase found",
        code: "P0001",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(advanceToTopCut(mockClient, tournamentId)).rejects.toEqual(
        mockError
      );
    });

    it("should handle insufficient qualifiers error", async () => {
      const mockError = {
        message: "Not enough players to create top cut",
        code: "P0001",
      };
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        advanceToTopCut(mockClient, tournamentId, 8)
      ).rejects.toEqual(mockError);
    });
  });

  describe("generateEliminationPairings", () => {
    const mockUser = { id: "user-123" };
    const roundId = 50;

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
    });

    it("should successfully generate elimination pairings", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 2,
            status: "pending",
            phase_id: 2,
            tournament_phases: {
              id: 2,
              tournament_id: 100,
              phase_type: "single_elimination",
              tournaments: {
                id: 100,
                organization_id: 200,
                organizations: { owner_user_id: "user-123" },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 49 },
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous matches
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                winner_alt_id: 10,
                alt1_id: 10,
                alt2_id: 11,
                is_bye: false,
                table_number: 1,
              },
              {
                id: 2,
                winner_alt_id: 13,
                alt1_id: 12,
                alt2_id: 13,
                is_bye: false,
                table_number: 2,
              },
              {
                id: 3,
                winner_alt_id: 15,
                alt1_id: 14,
                alt2_id: 15,
                is_bye: false,
                table_number: 3,
              },
              {
                id: 4,
                winner_alt_id: 17,
                alt1_id: 16,
                alt2_id: 17,
                is_bye: false,
                table_number: 4,
              },
            ],
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert matches
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [
            { id: 5, alt1_id: 10, alt2_id: 13 },
            { id: 6, alt1_id: 15, alt2_id: 17 },
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await generateEliminationPairings(mockClient, roundId);

      expect(result).toEqual({
        matchesCreated: 2,
        winnersAdvanced: 4,
      });
    });

    it("should handle bye advancement", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 2,
            status: "pending",
            phase_id: 2,
            tournament_phases: {
              id: 2,
              tournament_id: 100,
              phase_type: "single_elimination",
              tournaments: {
                id: 100,
                organization_id: 200,
                organizations: { owner_user_id: "user-123" },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 49 },
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous matches (with bye)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                winner_alt_id: null,
                alt1_id: 10,
                alt2_id: null,
                is_bye: true,
                table_number: 1,
              },
              {
                id: 2,
                winner_alt_id: 13,
                alt1_id: 12,
                alt2_id: 13,
                is_bye: false,
                table_number: 2,
              },
            ],
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert matches
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 5, alt1_id: 10, alt2_id: 13 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await generateEliminationPairings(mockClient, roundId);

      expect(result).toEqual({
        matchesCreated: 1,
        winnersAdvanced: 2,
      });
    });

    it("should create bye match when odd number of winners", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 2,
            status: "pending",
            phase_id: 2,
            tournament_phases: {
              id: 2,
              tournament_id: 100,
              phase_type: "single_elimination",
              tournaments: {
                id: 100,
                organization_id: 200,
                organizations: { owner_user_id: "user-123" },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 49 },
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous matches (odd winners)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                winner_alt_id: 10,
                alt1_id: 10,
                alt2_id: 11,
                is_bye: false,
                table_number: 1,
              },
              {
                id: 2,
                winner_alt_id: 13,
                alt1_id: 12,
                alt2_id: 13,
                is_bye: false,
                table_number: 2,
              },
              {
                id: 3,
                winner_alt_id: 15,
                alt1_id: 14,
                alt2_id: 15,
                is_bye: false,
                table_number: 3,
              },
            ],
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert matches
      const insertMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockResolvedValue({
          data: [
            { id: 5, alt1_id: 10, alt2_id: 13 },
            { id: 6, alt1_id: 15, alt2_id: null },
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await generateEliminationPairings(mockClient, roundId);

      expect(insertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            alt1_id: 15,
            alt2_id: null,
            is_bye: true,
          }),
        ])
      );
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(
        generateEliminationPairings(mockClient, roundId)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if round not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        generateEliminationPairings(mockClient, roundId)
      ).rejects.toThrow("Round not found");
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 2,
            status: "pending",
            phase_id: 2,
            tournament_phases: {
              id: 2,
              tournament_id: 100,
              phase_type: "single_elimination",
              tournaments: {
                id: 100,
                organization_id: 200,
                organizations: { owner_user_id: "other-user" },
              },
            },
          },
          error: null,
        }),
      });

      await expect(
        generateEliminationPairings(mockClient, roundId)
      ).rejects.toThrow("You don't have permission to generate pairings");
    });

    it("should throw error if round is not pending", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 2,
            status: "active",
            phase_id: 2,
            tournament_phases: {
              id: 2,
              tournament_id: 100,
              phase_type: "single_elimination",
              tournaments: {
                id: 100,
                organization_id: 200,
                organizations: { owner_user_id: "user-123" },
              },
            },
          },
          error: null,
        }),
      });

      await expect(
        generateEliminationPairings(mockClient, roundId)
      ).rejects.toThrow("Round must be pending to generate pairings");
    });

    it("should throw error if round number is less than 2", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 1,
            status: "pending",
            phase_id: 2,
            tournament_phases: {
              id: 2,
              tournament_id: 100,
              phase_type: "single_elimination",
              tournaments: {
                id: 100,
                organization_id: 200,
                organizations: { owner_user_id: "user-123" },
              },
            },
          },
          error: null,
        }),
      });

      await expect(
        generateEliminationPairings(mockClient, roundId)
      ).rejects.toThrow("Use advanceToTopCut for round 1 elimination pairings");
    });

    it("should throw error if previous round not found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 2,
            status: "pending",
            phase_id: 2,
            tournament_phases: {
              id: 2,
              tournament_id: 100,
              phase_type: "single_elimination",
              tournaments: {
                id: 100,
                organization_id: 200,
                organizations: { owner_user_id: "user-123" },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous round (not found)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        generateEliminationPairings(mockClient, roundId)
      ).rejects.toThrow("Previous round not found");
    });

    it("should throw error if no completed matches in previous round", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 2,
            status: "pending",
            phase_id: 2,
            tournament_phases: {
              id: 2,
              tournament_id: 100,
              phase_type: "single_elimination",
              tournaments: {
                id: 100,
                organization_id: 200,
                organizations: { owner_user_id: "user-123" },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 49 },
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous matches (empty)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        generateEliminationPairings(mockClient, roundId)
      ).rejects.toThrow("No completed matches in previous round");
    });

    it("should throw error if less than 2 winners", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 2,
            status: "pending",
            phase_id: 2,
            tournament_phases: {
              id: 2,
              tournament_id: 100,
              phase_type: "single_elimination",
              tournaments: {
                id: 100,
                organization_id: 200,
                organizations: { owner_user_id: "user-123" },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 49 },
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous matches (only 1 winner)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                winner_alt_id: 10,
                alt1_id: 10,
                alt2_id: 11,
                is_bye: false,
                table_number: 1,
              },
            ],
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        generateEliminationPairings(mockClient, roundId)
      ).rejects.toThrow("Need at least 2 winners to create pairings");
    });

    it("should throw error if inserting matches fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get round info
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: roundId,
            round_number: 2,
            status: "pending",
            phase_id: 2,
            tournament_phases: {
              id: 2,
              tournament_id: 100,
              phase_type: "single_elimination",
              tournaments: {
                id: 100,
                organization_id: 200,
                organizations: { owner_user_id: "user-123" },
              },
            },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous round
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 49 },
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get previous matches
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                winner_alt_id: 10,
                alt1_id: 10,
                alt2_id: 11,
                is_bye: false,
                table_number: 1,
              },
              {
                id: 2,
                winner_alt_id: 13,
                alt1_id: 12,
                alt2_id: 13,
                is_bye: false,
                table_number: 2,
              },
            ],
            error: null,
          }),
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert matches (error)
      const insertError = new Error("Match insert failed");
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: insertError,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        generateEliminationPairings(mockClient, roundId)
      ).rejects.toThrow("Match insert failed");
    });
  });

  describe("completeTournament", () => {
    const mockUser = { id: "user-123" };
    const tournamentId = 100;

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
      (recalculateStandings as jest.Mock).mockResolvedValue({
        success: true,
        playersUpdated: 10,
      });
    });

    it("should successfully complete tournament", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "active",
            current_phase_id: 2,
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 1 }, { id: 2 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get active rounds (none)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Complete phases
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await completeTournament(mockClient, tournamentId);

      expect(result).toEqual({ success: true });
      expect(recalculateStandings).toHaveBeenCalledWith(
        mockClient,
        tournamentId
      );
    });

    it("should complete tournament with no phases", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "active",
            current_phase_id: null,
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases (none)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await completeTournament(mockClient, tournamentId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(
        completeTournament(mockClient, tournamentId)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if tournament not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        completeTournament(mockClient, tournamentId)
      ).rejects.toThrow("Tournament not found");
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "active",
            current_phase_id: 2,
            organization_id: 200,
            organizations: { owner_user_id: "other-user" },
          },
          error: null,
        }),
      });

      await expect(
        completeTournament(mockClient, tournamentId)
      ).rejects.toThrow(
        "You don't have permission to complete this tournament"
      );
    });

    it("should throw error if tournament is not active", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "upcoming",
            current_phase_id: 2,
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      });

      await expect(
        completeTournament(mockClient, tournamentId)
      ).rejects.toThrow("Tournament must be active to complete");
    });

    it("should throw error if rounds are not completed", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "active",
            current_phase_id: 2,
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get active rounds (some still active)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [
            { id: 10, round_number: 3 },
            { id: 11, round_number: 4 },
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        completeTournament(mockClient, tournamentId)
      ).rejects.toThrow(
        "Cannot complete tournament: 2 round(s) still not completed"
      );
    });

    it("should throw error if completing phases fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "active",
            current_phase_id: 2,
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get active rounds (none)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Complete phases (error)
      const phaseError = new Error("Phase completion failed");
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: phaseError }),
      } as unknown as MockQueryBuilder);

      await expect(
        completeTournament(mockClient, tournamentId)
      ).rejects.toThrow("Phase completion failed");
    });

    it("should throw error if updating tournament fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "active",
            current_phase_id: 2,
            organization_id: 200,
            organizations: { owner_user_id: "user-123" },
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get phases
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get active rounds (none)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Complete phases
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament (error)
      const updateError = new Error("Tournament update failed");
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: updateError }),
      } as unknown as MockQueryBuilder);

      await expect(
        completeTournament(mockClient, tournamentId)
      ).rejects.toThrow("Tournament update failed");
    });
  });
});
