import {
  createTournament,
  updateTournament,
  archiveTournament,
  deleteTournament,
} from "../tournament-crud";
import type { TypedClient } from "../../../client";
import type { PhaseConfig } from "../helpers";

// Mock helper functions
jest.mock("../helpers", () => ({
  getCurrentUser: jest.fn(),
  getCurrentAlt: jest.fn(),
  checkOrgPermission: jest.fn(),
}));

import { getCurrentUser, checkOrgPermission } from "../helpers";

// Helper to create mock Supabase client
type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  single: jest.Mock;
};

const createMockClient = () => {
  const mockClient = {
    from: jest.fn().mockReturnThis(),
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

describe("Tournament CRUD Mutations", () => {
  let mockClient: TypedClient;

  beforeEach(() => {
    mockClient = createMockClient();
    jest.clearAllMocks();
  });

  describe("createTournament", () => {
    const mockUser = { id: "user-123" };
    const tournamentData = {
      organizationId: 200,
      name: "Regional Championship",
      slug: "regional-championship",
      description: "A competitive tournament",
      format: "VGC",
      startDate: "2026-03-15T10:00:00Z",
      endDate: "2026-03-15T18:00:00Z",
      maxParticipants: 64,
      topCutSize: 8,
      swissRounds: 5,
      tournamentFormat: "swiss_with_cut" as const,
      roundTimeMinutes: 50,
      game: "pokemon",
      gameFormat: "vgc2026",
      platform: "cartridge" as const,
      battleFormat: "doubles" as const,
      registrationType: "open",
      checkInRequired: true,
      allowLateRegistration: false,
      lateCheckInMaxRound: null,
    };

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
    });

    it("should create a tournament with default phases (swiss_with_cut)", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness - return null (no existing)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1000,
            slug: "regional-championship",
            organization_id: 200,
            name: "Regional Championship",
            status: "draft",
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create Swiss phase
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Create Top Cut phase
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await createTournament(mockClient, tournamentData);

      expect(result).toEqual({
        id: 1000,
        slug: "regional-championship",
      });
    });

    it("should create a tournament with custom phases", async () => {
      const phases: PhaseConfig[] = [
        {
          name: "Custom Swiss",
          phaseType: "swiss",
          bestOf: 3,
          roundTimeMinutes: 60,
          checkInTimeMinutes: 10,
          plannedRounds: 7,
        },
        {
          name: "Custom Top Cut",
          phaseType: "single_elimination",
          bestOf: 5,
          roundTimeMinutes: 75,
          checkInTimeMinutes: 15,
          cutRule: "top-8",
        },
      ];

      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1001,
            slug: "regional-championship",
            organization_id: 200,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create phase 1
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Create phase 2
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await createTournament(mockClient, {
        ...tournamentData,
        phases,
      });

      expect(result.id).toBe(1001);
    });

    it("should create a tournament with swiss_only format", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1002,
            slug: "swiss-only",
            organization_id: 200,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create Swiss phase (only one phase)
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await createTournament(mockClient, {
        ...tournamentData,
        slug: "swiss-only",
        tournamentFormat: "swiss_only",
      });

      expect(result.id).toBe(1002);
    });

    it("should create a tournament with single_elimination format", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1003,
            slug: "single-elim",
            organization_id: 200,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create single elimination phase
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await createTournament(mockClient, {
        ...tournamentData,
        slug: "single-elim",
        tournamentFormat: "single_elimination",
      });

      expect(result.id).toBe(1003);
    });

    it("should create a tournament with double_elimination format", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1004,
            slug: "double-elim",
            organization_id: 200,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create double elimination phase
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await createTournament(mockClient, {
        ...tournamentData,
        slug: "double-elim",
        tournamentFormat: "double_elimination",
      });

      expect(result.id).toBe(1004);
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(
        createTournament(mockClient, tournamentData)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if organization not found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        createTournament(mockClient, tournamentData)
      ).rejects.toThrow("Organization not found");
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        createTournament(mockClient, tournamentData)
      ).rejects.toThrow("You don't have permission to create tournaments");
    });

    it("should throw error if slug already exists", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness - return existing tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 999 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        createTournament(mockClient, tournamentData)
      ).rejects.toThrow("Tournament slug already exists in this organization");
    });

    it("should normalize slug to lowercase", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockReturnThis();

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness (with lowercase)
      const eqMock2 = jest.fn().mockReturnThis();
      const eqMock1 = jest.fn().mockReturnValue({
        eq: eqMock2,
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: eqMock1,
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament
      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1005,
            slug: "upper-case-slug",
            organization_id: 200,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create phases
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await createTournament(mockClient, {
        ...tournamentData,
        slug: "UPPER-CASE-SLUG",
      });

      // Verify slug was normalized to lowercase
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "upper-case-slug",
        })
      );
      expect(eqMock2).toHaveBeenCalledWith("slug", "upper-case-slug");
    });

    it("should use default values for optional parameters", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockReturnThis();

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament
      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1006,
            slug: "minimal-tournament",
            organization_id: 200,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create phases
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await createTournament(mockClient, {
        organizationId: 200,
        name: "Minimal Tournament",
        slug: "minimal-tournament",
        tournamentFormat: "swiss_with_cut",
      });

      // Verify defaults were applied
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          round_time_minutes: 50,
          platform: "cartridge",
          battle_format: "doubles",
          registration_type: "open",
          check_in_required: false,
          allow_late_registration: false,
          late_check_in_max_round: null,
          status: "draft",
          current_round: 0,
        })
      );
    });

    it("should throw error if phase creation fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1007,
            slug: "phase-error",
            organization_id: 200,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create Swiss phase - FAILS
      const phaseError = new Error("Database constraint violation");
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: phaseError }),
      } as unknown as MockQueryBuilder);

      await expect(
        createTournament(mockClient, {
          ...tournamentData,
          slug: "phase-error",
        })
      ).rejects.toThrow(
        "Failed to create Swiss phase: Database constraint violation"
      );
    });

    it("should throw error if custom phase creation fails", async () => {
      const phases: PhaseConfig[] = [
        {
          name: "Custom Phase",
          phaseType: "swiss",
          bestOf: 3,
          roundTimeMinutes: 60,
          checkInTimeMinutes: 10,
          plannedRounds: 7,
        },
      ];

      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1008,
            slug: "custom-phase-error",
            organization_id: 200,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create custom phase - FAILS
      const phaseError = new Error("Invalid phase configuration");
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: phaseError }),
      } as unknown as MockQueryBuilder);

      await expect(
        createTournament(mockClient, {
          ...tournamentData,
          slug: "custom-phase-error",
          phases,
        })
      ).rejects.toThrow(
        'Failed to create phase "Custom Phase": Invalid phase configuration'
      );
    });

    it("should throw error if tournament insert fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament - FAILS
      const insertError = new Error("Unique constraint violation");
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: insertError,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        createTournament(mockClient, tournamentData)
      ).rejects.toThrow("Unique constraint violation");
    });

    it("should throw error if Top Cut phase creation fails (swiss_with_cut)", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1009,
            slug: "top-cut-error",
            organization_id: 200,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create Swiss phase - SUCCESS
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Create Top Cut phase - FAILS
      const phaseError = new Error("Top cut constraint violation");
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: phaseError }),
      } as unknown as MockQueryBuilder);

      await expect(
        createTournament(mockClient, {
          ...tournamentData,
          slug: "top-cut-error",
          tournamentFormat: "swiss_with_cut",
        })
      ).rejects.toThrow(
        "Failed to create Top Cut phase: Top cut constraint violation"
      );
    });

    it("should throw error if Single Elimination phase creation fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1010,
            slug: "single-elim-error",
            organization_id: 200,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create Single Elimination phase - FAILS
      const phaseError = new Error("Bracket configuration error");
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: phaseError }),
      } as unknown as MockQueryBuilder);

      await expect(
        createTournament(mockClient, {
          ...tournamentData,
          slug: "single-elim-error",
          tournamentFormat: "single_elimination",
        })
      ).rejects.toThrow(
        "Failed to create Single Elimination phase: Bracket configuration error"
      );
    });

    it("should throw error if Double Elimination phase creation fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check organization exists
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check slug uniqueness
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create tournament
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1011,
            slug: "double-elim-error",
            organization_id: 200,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create Double Elimination phase - FAILS
      const phaseError = new Error("Losers bracket error");
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: phaseError }),
      } as unknown as MockQueryBuilder);

      await expect(
        createTournament(mockClient, {
          ...tournamentData,
          slug: "double-elim-error",
          tournamentFormat: "double_elimination",
        })
      ).rejects.toThrow(
        "Failed to create Double Elimination phase: Losers bracket error"
      );
    });
  });

  describe("updateTournament", () => {
    const mockUser = { id: "user-123" };
    const tournamentId = 1000;

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
    });

    it("should update tournament basic fields successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await updateTournament(mockClient, tournamentId, {
        name: "Updated Name",
        description: "Updated description",
      });

      expect(result).toEqual({ success: true });
    });

    it("should update all tournament fields", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament
      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await updateTournament(mockClient, tournamentId, {
        name: "New Name",
        description: "New description",
        format: "VGC 2026",
        startDate: "2026-04-01T10:00:00Z",
        endDate: "2026-04-01T18:00:00Z",
        maxParticipants: 128,
        status: "active",
        game: "pokemon",
        gameFormat: "vgc2026",
        platform: "showdown",
        battleFormat: "singles",
        registrationType: "invite",
        checkInRequired: true,
        allowLateRegistration: true,
        lateCheckInMaxRound: 3,
      });

      expect(updateMock).toHaveBeenCalledWith({
        name: "New Name",
        description: "New description",
        format: "VGC 2026",
        start_date: "2026-04-01T10:00:00Z",
        end_date: "2026-04-01T18:00:00Z",
        max_participants: 128,
        status: "active",
        game: "pokemon",
        game_format: "vgc2026",
        platform: "showdown",
        battle_format: "singles",
        registration_type: "invite",
        check_in_required: true,
        allow_late_registration: true,
        late_check_in_max_round: 3,
      });
    });

    it("should update only specified fields", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament
      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await updateTournament(mockClient, tournamentId, {
        name: "Updated Name Only",
      });

      expect(updateMock).toHaveBeenCalledWith({
        name: "Updated Name Only",
      });
    });

    it("should handle null values for nullable fields", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament
      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await updateTournament(mockClient, tournamentId, {
        maxParticipants: null,
        lateCheckInMaxRound: null,
      });

      expect(updateMock).toHaveBeenCalledWith({
        max_participants: null,
        late_check_in_max_round: null,
      });
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(
        updateTournament(mockClient, tournamentId, { name: "Updated" })
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if tournament not found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        updateTournament(mockClient, tournamentId, { name: "Updated" })
      ).rejects.toThrow("Tournament not found");
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        updateTournament(mockClient, tournamentId, { name: "Updated" })
      ).rejects.toThrow("You don't have permission to update this tournament");
    });

    it("should throw error if update fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament - FAILS
      const updateError = new Error("Database constraint violation");
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: updateError }),
      } as unknown as MockQueryBuilder);

      await expect(
        updateTournament(mockClient, tournamentId, { name: "Updated" })
      ).rejects.toThrow("Database constraint violation");
    });

    it("should update tournament status", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament
      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await updateTournament(mockClient, tournamentId, {
        status: "completed",
      });

      expect(updateMock).toHaveBeenCalledWith({
        status: "completed",
      });
    });
  });

  describe("archiveTournament", () => {
    const mockUser = { id: "user-123" };
    const tournamentId = 1000;

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
    });

    it("should archive tournament successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament (set archived_at)
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await archiveTournament(mockClient, tournamentId);

      expect(result).toEqual({ success: true });
    });

    it("should set archived_at timestamp", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament
      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await archiveTournament(mockClient, tournamentId);

      // Verify archived_at is set to a valid ISO string
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          archived_at: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
          ),
        })
      );
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(archiveTournament(mockClient, tournamentId)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if tournament not found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(archiveTournament(mockClient, tournamentId)).rejects.toThrow(
        "Tournament not found"
      );
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(archiveTournament(mockClient, tournamentId)).rejects.toThrow(
        "You don't have permission to archive this tournament"
      );
    });

    it("should throw error if archive fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update tournament - FAILS
      const updateError = new Error("Database error");
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: updateError }),
      } as unknown as MockQueryBuilder);

      await expect(archiveTournament(mockClient, tournamentId)).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("deleteTournament", () => {
    const mockUser = { id: "user-123" };
    const tournamentId = 1000;

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
    });

    it("should delete draft tournament successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament (draft status)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200, status: "draft" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete tournament
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await deleteTournament(mockClient, tournamentId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(deleteTournament(mockClient, tournamentId)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if tournament not found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(deleteTournament(mockClient, tournamentId)).rejects.toThrow(
        "Tournament not found"
      );
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200, status: "draft" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(deleteTournament(mockClient, tournamentId)).rejects.toThrow(
        "You don't have permission to delete this tournament"
      );
    });

    it("should throw error if tournament is not in draft status", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200, status: "active" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(deleteTournament(mockClient, tournamentId)).rejects.toThrow(
        "Only draft tournaments can be deleted"
      );
    });

    it("should not allow deletion of completed tournament", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200, status: "completed" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(deleteTournament(mockClient, tournamentId)).rejects.toThrow(
        "Only draft tournaments can be deleted"
      );
    });

    it("should not allow deletion of cancelled tournament", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200, status: "cancelled" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(deleteTournament(mockClient, tournamentId)).rejects.toThrow(
        "Only draft tournaments can be deleted"
      );
    });

    it("should throw error if delete fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get tournament
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200, status: "draft" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete tournament - FAILS
      const deleteError = new Error("Foreign key constraint violation");
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: deleteError }),
      } as unknown as MockQueryBuilder);

      await expect(deleteTournament(mockClient, tournamentId)).rejects.toThrow(
        "Foreign key constraint violation"
      );
    });
  });
});
