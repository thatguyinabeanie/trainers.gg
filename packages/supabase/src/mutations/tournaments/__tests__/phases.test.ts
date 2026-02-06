import {
  updatePhase,
  createPhase,
  deletePhase,
  saveTournamentPhases,
} from "../phases";
import type { TypedClient } from "../../../client";
import { getCurrentUser, checkOrgPermission } from "../helpers";

// Mock helper functions
jest.mock("../helpers", () => ({
  getCurrentUser: jest.fn(),
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

describe("Tournament Phase Mutations", () => {
  let mockClient: TypedClient & MockClient;
  const mockUser = { id: "user-123" };

  beforeEach(() => {
    mockClient = createMockClient() as TypedClient & MockClient;
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (checkOrgPermission as jest.Mock).mockResolvedValue(true);
  });

  describe("updatePhase", () => {
    const phaseId = 1;

    it("should update phase successfully", async () => {
      const phaseBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            status: "pending",
            tournament_id: 100,
            tournaments: {
              organization_id: 200,
              status: "draft",
              organizations: { owner_user_id: mockUser.id },
            },
          },
          error: null,
        }),
      };

      const updateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      let fromCallCount = 0;
      mockClient.from.mockImplementation((_table: string) => {
        fromCallCount++;
        if (fromCallCount === 1) return phaseBuilder;
        return updateBuilder;
      });

      const result = await updatePhase(mockClient, phaseId, {
        name: "Swiss Round 1",
      });

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(
        updatePhase(mockClient, phaseId, { name: "New Name" })
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if phase not found", async () => {
      const phaseBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockClient.from.mockReturnValue(phaseBuilder);

      await expect(
        updatePhase(mockClient, phaseId, { name: "New Name" })
      ).rejects.toThrow("Phase not found");
    });

    it("should throw error if tournament has started", async () => {
      const phaseBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            status: "pending",
            tournament_id: 100,
            tournaments: {
              organization_id: 200,
              status: "active",
              organizations: { owner_user_id: mockUser.id },
            },
          },
          error: null,
        }),
      };

      mockClient.from.mockReturnValue(phaseBuilder);

      await expect(
        updatePhase(mockClient, phaseId, { name: "New Name" })
      ).rejects.toThrow("Cannot edit phases after tournament has started");
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      const phaseBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            status: "pending",
            tournament_id: 100,
            tournaments: {
              organization_id: 200,
              status: "draft",
              organizations: { owner_user_id: "other-user" },
            },
          },
          error: null,
        }),
      };

      mockClient.from.mockReturnValue(phaseBuilder);

      await expect(
        updatePhase(mockClient, phaseId, { name: "New Name" })
      ).rejects.toThrow("You don't have permission to update this phase");
    });
  });

  describe("createPhase", () => {
    const tournamentId = 100;

    it("should create a new phase successfully", async () => {
      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "draft",
            organization_id: 200,
            organizations: { owner_user_id: mockUser.id },
          },
          error: null,
        }),
      };

      const phasesBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const insertBuilder = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 1, name: "Swiss" },
          error: null,
        }),
      };

      let fromCallCount = 0;
      mockClient.from.mockImplementation((_table: string) => {
        fromCallCount++;
        if (fromCallCount === 1) return tournamentBuilder;
        if (fromCallCount === 2) return phasesBuilder;
        return insertBuilder;
      });

      const result = await createPhase(mockClient, tournamentId, {
        name: "Swiss",
        phaseType: "swiss",
        bestOf: 3,
        roundTimeMinutes: 50,
        checkInTimeMinutes: 10,
      });

      expect(result).toEqual({
        success: true,
        phase: { id: 1, name: "Swiss" },
      });
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(
        createPhase(mockClient, tournamentId, {
          name: "Swiss",
          phaseType: "swiss",
          bestOf: 3,
          roundTimeMinutes: 50,
          checkInTimeMinutes: 10,
        })
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if tournament not found", async () => {
      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockClient.from.mockReturnValue(tournamentBuilder);

      await expect(
        createPhase(mockClient, tournamentId, {
          name: "Swiss",
          phaseType: "swiss",
          bestOf: 3,
          roundTimeMinutes: 50,
          checkInTimeMinutes: 10,
        })
      ).rejects.toThrow("Tournament not found");
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

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

      await expect(
        createPhase(mockClient, tournamentId, {
          name: "Swiss",
          phaseType: "swiss",
          bestOf: 3,
          roundTimeMinutes: 50,
          checkInTimeMinutes: 10,
        })
      ).rejects.toThrow(
        "You don't have permission to add phases to this tournament"
      );
    });

    it("should throw error if tournament has started", async () => {
      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "active",
            organization_id: 200,
            organizations: { owner_user_id: mockUser.id },
          },
          error: null,
        }),
      };

      mockClient.from.mockReturnValue(tournamentBuilder);

      await expect(
        createPhase(mockClient, tournamentId, {
          name: "Swiss",
          phaseType: "swiss",
          bestOf: 3,
          roundTimeMinutes: 50,
          checkInTimeMinutes: 10,
        })
      ).rejects.toThrow("Cannot add phases after tournament has started");
    });
  });

  describe("deletePhase", () => {
    const phaseId = 1;

    it("should delete a phase successfully", async () => {
      const phaseBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            phase_order: 2,
            tournament_id: 100,
            tournaments: {
              status: "draft",
              organization_id: 200,
              organizations: { owner_user_id: mockUser.id },
            },
          },
          error: null,
        }),
      };

      const countBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 2,
          error: null,
        }),
      };

      const deleteBuilder = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const remainingPhasesBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 2, phase_order: 3 }],
          error: null,
        }),
      };

      const updateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      let fromCallCount = 0;
      mockClient.from.mockImplementation((_table: string) => {
        fromCallCount++;
        if (fromCallCount === 1) return phaseBuilder;
        if (fromCallCount === 2) return countBuilder;
        if (fromCallCount === 3) return deleteBuilder;
        if (fromCallCount === 4) return remainingPhasesBuilder;
        return updateBuilder;
      });

      const result = await deletePhase(mockClient, phaseId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(deletePhase(mockClient, phaseId)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if phase not found", async () => {
      const phaseBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockClient.from.mockReturnValue(phaseBuilder);

      await expect(deletePhase(mockClient, phaseId)).rejects.toThrow(
        "Phase not found"
      );
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      const phaseBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            phase_order: 1,
            tournament_id: 100,
            tournaments: {
              status: "draft",
              organization_id: 200,
              organizations: { owner_user_id: "other-user" },
            },
          },
          error: null,
        }),
      };

      mockClient.from.mockReturnValue(phaseBuilder);

      await expect(deletePhase(mockClient, phaseId)).rejects.toThrow(
        "You don't have permission to delete this phase"
      );
    });

    it("should throw error if trying to delete last phase", async () => {
      const phaseBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: phaseId,
            phase_order: 1,
            tournament_id: 100,
            tournaments: {
              status: "draft",
              organization_id: 200,
              organizations: { owner_user_id: mockUser.id },
            },
          },
          error: null,
        }),
      };

      const countBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 1,
          error: null,
        }),
      };

      let fromCallCount = 0;
      mockClient.from.mockImplementation((_table: string) => {
        fromCallCount++;
        if (fromCallCount === 1) return phaseBuilder;
        return countBuilder;
      });

      await expect(deletePhase(mockClient, phaseId)).rejects.toThrow(
        "Cannot delete the last phase. A tournament must have at least one phase."
      );
    });
  });

  describe("saveTournamentPhases", () => {
    const tournamentId = 100;

    it("should create new phases when none exist", async () => {
      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "draft",
            organization_id: 200,
            organizations: { owner_user_id: mockUser.id },
          },
          error: null,
        }),
      };

      const existingPhasesBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const insertBuilder = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      let fromCallCount = 0;
      mockClient.from.mockImplementation((_table: string) => {
        fromCallCount++;
        if (fromCallCount === 1) return tournamentBuilder;
        if (fromCallCount === 2) return existingPhasesBuilder;
        return insertBuilder;
      });

      const result = await saveTournamentPhases(mockClient, tournamentId, [
        {
          name: "Swiss",
          phaseType: "swiss",
          bestOf: 3,
          roundTimeMinutes: 50,
          checkInTimeMinutes: 10,
        },
      ]);

      expect(result).toEqual({
        success: true,
        deleted: 0,
        updated: 0,
        created: 1,
      });
    });

    it("should update existing phases", async () => {
      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "draft",
            organization_id: 200,
            organizations: { owner_user_id: mockUser.id },
          },
          error: null,
        }),
      };

      const existingPhasesBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null,
        }),
      };

      const updateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      let fromCallCount = 0;
      mockClient.from.mockImplementation((_table: string) => {
        fromCallCount++;
        if (fromCallCount === 1) return tournamentBuilder;
        if (fromCallCount === 2) return existingPhasesBuilder;
        return updateBuilder;
      });

      const result = await saveTournamentPhases(mockClient, tournamentId, [
        {
          id: 1,
          name: "Swiss Updated",
          phaseType: "swiss",
          bestOf: 3,
          roundTimeMinutes: 60,
          checkInTimeMinutes: 10,
        },
      ]);

      expect(result).toEqual({
        success: true,
        deleted: 0,
        updated: 1,
        created: 0,
      });
    });

    it("should delete phases not in the input list", async () => {
      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "draft",
            organization_id: 200,
            organizations: { owner_user_id: mockUser.id },
          },
          error: null,
        }),
      };

      const existingPhasesBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 1 }, { id: 2 }],
          error: null,
        }),
      };

      const deleteBuilder = {
        delete: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: null }),
      };

      const updateBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      let fromCallCount = 0;
      mockClient.from.mockImplementation((_table: string) => {
        fromCallCount++;
        if (fromCallCount === 1) return tournamentBuilder;
        if (fromCallCount === 2) return existingPhasesBuilder;
        if (fromCallCount === 3) return deleteBuilder;
        return updateBuilder;
      });

      const result = await saveTournamentPhases(mockClient, tournamentId, [
        {
          id: 1,
          name: "Swiss",
          phaseType: "swiss",
          bestOf: 3,
          roundTimeMinutes: 50,
          checkInTimeMinutes: 10,
        },
      ]);

      expect(result).toEqual({
        success: true,
        deleted: 1,
        updated: 1,
        created: 0,
      });
    });

    it("should throw error if no phases provided", async () => {
      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "draft",
            organization_id: 200,
            organizations: { owner_user_id: mockUser.id },
          },
          error: null,
        }),
      };

      mockClient.from.mockReturnValue(tournamentBuilder);

      await expect(
        saveTournamentPhases(mockClient, tournamentId, [])
      ).rejects.toThrow("Tournament must have at least one phase");
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(
        saveTournamentPhases(mockClient, tournamentId, [
          {
            name: "Swiss",
            phaseType: "swiss",
            bestOf: 3,
            roundTimeMinutes: 50,
            checkInTimeMinutes: 10,
          },
        ])
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if tournament has started", async () => {
      const tournamentBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: tournamentId,
            status: "active",
            organization_id: 200,
            organizations: { owner_user_id: mockUser.id },
          },
          error: null,
        }),
      };

      mockClient.from.mockReturnValue(tournamentBuilder);

      await expect(
        saveTournamentPhases(mockClient, tournamentId, [
          {
            name: "Swiss",
            phaseType: "swiss",
            bestOf: 3,
            roundTimeMinutes: 50,
            checkInTimeMinutes: 10,
          },
        ])
      ).rejects.toThrow("Cannot modify phases after tournament has started");
    });
  });
});
