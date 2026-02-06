import {
  registerForTournament,
  updateRegistrationPreferences,
  cancelRegistration,
  updateRegistrationStatus,
  checkIn,
  undoCheckIn,
  withdrawFromTournament,
  sendTournamentInvitations,
  respondToTournamentInvitation,
} from "../registration";
import type { TypedClient } from "../../../client";

// Mock helper functions
jest.mock("../helpers", () => ({
  getCurrentUser: jest.fn(),
  getCurrentAlt: jest.fn(),
  checkOrgPermission: jest.fn(),
}));

jest.mock("../../../utils/registration", () => ({
  checkRegistrationOpen: jest.fn(),
  checkCheckInOpen: jest.fn(),
}));

jest.mock("../../../constants", () => ({
  getInvitationExpiryDate: jest.fn(() => "2026-03-05T00:00:00Z"),
}));

import { getCurrentUser, getCurrentAlt, checkOrgPermission } from "../helpers";
import {
  checkRegistrationOpen,
  checkCheckInOpen,
} from "../../../utils/registration";

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

describe("Tournament Registration Mutations", () => {
  let mockClient: TypedClient;

  beforeEach(() => {
    mockClient = createMockClient();
    jest.clearAllMocks();
  });

  describe("registerForTournament", () => {
    const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
    const tournamentId = 100;

    beforeEach(() => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
      (checkRegistrationOpen as jest.Mock).mockReturnValue({ isOpen: true });
    });

    it("should successfully register a player for a tournament", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check existing registration - return null
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament details
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            status: "draft",
            max_participants: null,
            allow_late_registration: false,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert registration
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 500, status: "registered" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await registerForTournament(mockClient, tournamentId);

      expect(result).toEqual({
        success: true,
        registrationId: 500,
        status: "registered",
      });
    });

    it("should throw error if alt cannot be loaded", async () => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(null);

      await expect(
        registerForTournament(mockClient, tournamentId)
      ).rejects.toThrow("Unable to load your account");
    });

    it("should throw error if already registered", async () => {
      (mockClient.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "tournament_registrations") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 999 },
              error: null,
            }),
          };
        }
        return mockClient;
      });

      await expect(
        registerForTournament(mockClient, tournamentId)
      ).rejects.toThrow("Already registered for this tournament");
    });

    it("should throw error if tournament not found", async () => {
      (mockClient.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "tournament_registrations") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === "tournaments") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return mockClient;
      });

      await expect(
        registerForTournament(mockClient, tournamentId)
      ).rejects.toThrow("Tournament not found");
    });

    it("should throw error if tournament is not open for registration", async () => {
      (checkRegistrationOpen as jest.Mock).mockReturnValue({ isOpen: false });

      (mockClient.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "tournament_registrations") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === "tournaments") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                status: "completed",
                max_participants: null,
                allow_late_registration: false,
              },
              error: null,
            }),
          };
        }
        return mockClient;
      });

      await expect(
        registerForTournament(mockClient, tournamentId)
      ).rejects.toThrow("Tournament is not open for registration");
    });

    it("should register as waitlist when tournament is at max capacity", async () => {
      const maxParticipants = 32;
      const currentCount = 32;
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check existing registration - return null
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament details
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            status: "draft",
            max_participants: maxParticipants,
            allow_late_registration: false,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Count existing registrations (needs two .eq() calls)
      const eqMock2 = jest.fn().mockResolvedValue({
        count: currentCount,
        error: null,
      });
      const eqMock1 = jest.fn().mockReturnValue({ eq: eqMock2 });
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: eqMock1,
      } as unknown as MockQueryBuilder);

      // Mock: Insert registration as waitlist
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 501, status: "waitlist" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await registerForTournament(mockClient, tournamentId);

      expect(result).toEqual({
        success: true,
        registrationId: 501,
        status: "waitlist",
      });
    });

    it("should include optional registration data when provided", async () => {
      const registrationData = {
        altId: 20,
        teamName: "Team Rocket",
        inGameName: "Jessie",
        displayNameOption: "in_game_name",
        showCountryFlag: true,
      };

      (getCurrentAlt as jest.Mock).mockResolvedValue({
        id: 20,
        username: "jessie",
        user_id: "user-456",
      });

      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Check existing registration - return null
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament details
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            status: "draft",
            max_participants: null,
            allow_late_registration: false,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert registration with data
      const insertMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 502 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await registerForTournament(mockClient, tournamentId, registrationData);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          team_name: "Team Rocket",
          in_game_name: "Jessie",
          display_name_option: "in_game_name",
          show_country_flag: true,
        })
      );
    });
  });

  describe("updateRegistrationPreferences", () => {
    const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
    const tournamentId = 100;

    beforeEach(() => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
    });

    it("should update registration preferences successfully", async () => {
      const updateData = {
        inGameName: "NewName",
        displayNameOption: "username",
        showCountryFlag: false,
      };

      (mockClient.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 600 },
          error: null,
        }),
      });

      const result = await updateRegistrationPreferences(
        mockClient,
        tournamentId,
        updateData
      );

      expect(result).toEqual({ success: true, registrationId: 600 });
    });

    it("should throw error if alt cannot be loaded", async () => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(null);

      await expect(
        updateRegistrationPreferences(mockClient, tournamentId, {
          inGameName: "Test",
        })
      ).rejects.toThrow("Unable to load your account");
    });
  });

  describe("cancelRegistration", () => {
    const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
    const registrationId = 500;

    beforeEach(() => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
    });

    it("should cancel registration successfully", async () => {
      (mockClient.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "tournament_registrations") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { alt_id: mockAlt.id, tournament_id: 100 },
              error: null,
            }),
            delete: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === "tournaments") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { status: "draft" },
              error: null,
            }),
          };
        }
        return mockClient;
      });

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { alt_id: mockAlt.id, tournament_id: 100 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { status: "draft" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await cancelRegistration(mockClient, registrationId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if registration not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        cancelRegistration(mockClient, registrationId)
      ).rejects.toThrow("Registration not found");
    });

    it("should throw error if user does not own registration", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { alt_id: 999, tournament_id: 100 },
          error: null,
        }),
      });

      await expect(
        cancelRegistration(mockClient, registrationId)
      ).rejects.toThrow("You can only cancel your own registration");
    });

    it("should throw error if tournament has started", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { alt_id: mockAlt.id, tournament_id: 100 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { status: "active" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        cancelRegistration(mockClient, registrationId)
      ).rejects.toThrow(
        "Cannot cancel registration after tournament has started"
      );
    });
  });

  describe("updateRegistrationStatus", () => {
    const mockUser = { id: "user-123" };
    const registrationId = 500;

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
    });

    it("should update registration status successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { tournament_id: 100 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await updateRegistrationStatus(
        mockClient,
        registrationId,
        "checked_in"
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(
        updateRegistrationStatus(mockClient, registrationId, "checked_in")
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { tournament_id: 100 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        updateRegistrationStatus(mockClient, registrationId, "checked_in")
      ).rejects.toThrow("You don't have permission to update registrations");
    });
  });

  describe("checkIn", () => {
    const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
    const tournamentId = 100;

    beforeEach(() => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
      (checkCheckInOpen as jest.Mock).mockReturnValue({ isOpen: true });
    });

    it("should check in successfully when registered with team", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            status: "registered",
            team_id: 1000,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            status: "draft",
            allow_late_registration: false,
            current_round: 0,
            late_check_in_max_round: null,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await checkIn(mockClient, tournamentId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if registration not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(checkIn(mockClient, tournamentId)).rejects.toThrow(
        "Registration not found"
      );
    });

    it("should throw error if status is not registered or confirmed", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            status: "dropped",
            team_id: 1000,
          },
          error: null,
        }),
      });

      await expect(checkIn(mockClient, tournamentId)).rejects.toThrow(
        'Cannot check in from status "dropped"'
      );
    });

    it("should throw error if team not submitted", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            status: "registered",
            team_id: null,
          },
          error: null,
        }),
      });

      await expect(checkIn(mockClient, tournamentId)).rejects.toThrow(
        "You must submit a team before checking in"
      );
    });

    it("should throw error if check-in not open", async () => {
      (checkCheckInOpen as jest.Mock).mockReturnValue({ isOpen: false });

      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            status: "registered",
            team_id: 1000,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            status: "completed",
            allow_late_registration: false,
            current_round: 5,
            late_check_in_max_round: null,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(checkIn(mockClient, tournamentId)).rejects.toThrow(
        "Tournament is not open for check-in"
      );
    });
  });

  describe("undoCheckIn", () => {
    const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
    const tournamentId = 100;

    beforeEach(() => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
    });

    it("should undo check-in successfully before tournament starts", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            status: "checked_in",
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { status: "draft" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await undoCheckIn(mockClient, tournamentId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not currently checked in", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            status: "registered",
          },
          error: null,
        }),
      });

      await expect(undoCheckIn(mockClient, tournamentId)).rejects.toThrow(
        "You are not currently checked in"
      );
    });

    it("should throw error if tournament has started", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            status: "checked_in",
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { status: "active" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(undoCheckIn(mockClient, tournamentId)).rejects.toThrow(
        "Cannot undo check-in after tournament has started"
      );
    });
  });

  describe("withdrawFromTournament", () => {
    const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
    const tournamentId = 100;

    beforeEach(() => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
    });

    it("should withdraw from tournament successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { status: "draft" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await withdrawFromTournament(mockClient, tournamentId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if tournament has started", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { status: "active" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        withdrawFromTournament(mockClient, tournamentId)
      ).rejects.toThrow("Cannot withdraw after tournament has started");
    });
  });

  describe("sendTournamentInvitations", () => {
    const mockUser = { id: "user-123" };
    const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
    const tournamentId = 100;
    const profileIds = [20, 21, 22];

    beforeEach(() => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
      (checkOrgPermission as jest.Mock).mockResolvedValue(true);
    });

    it("should send invitations to new players", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await sendTournamentInvitations(
        mockClient,
        tournamentId,
        profileIds
      );

      expect(result).toEqual({
        invitationsSent: 3,
        alreadyInvited: 0,
      });
    });

    it("should skip already invited players", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ invited_alt_id: 20 }, { invited_alt_id: 21 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await sendTournamentInvitations(
        mockClient,
        tournamentId,
        profileIds
      );

      expect(result).toEqual({
        invitationsSent: 1,
        alreadyInvited: 2,
      });
    });

    it("should return early if all players already invited", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { invited_alt_id: 20 },
            { invited_alt_id: 21 },
            { invited_alt_id: 22 },
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await sendTournamentInvitations(
        mockClient,
        tournamentId,
        profileIds
      );

      expect(result).toEqual({
        invitationsSent: 0,
        alreadyInvited: 3,
      });
    });

    it("should throw error if user lacks permission", async () => {
      (checkOrgPermission as jest.Mock).mockResolvedValue(false);

      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      });

      await expect(
        sendTournamentInvitations(mockClient, tournamentId, profileIds)
      ).rejects.toThrow("You don't have permission to send invitations");
    });
  });

  describe("respondToTournamentInvitation", () => {
    const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
    const invitationId = 300;

    beforeEach(() => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
    });

    it("should accept invitation and create registration", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: invitationId,
            invited_alt_id: mockAlt.id,
            tournament_id: 100,
            status: "pending",
            expires_at: "2026-03-05T00:00:00Z",
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 700 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await respondToTournamentInvitation(
        mockClient,
        invitationId,
        "accept"
      );

      expect(result.success).toBe(true);
      expect(result.registration).toBeTruthy();
    });

    it("should decline invitation without creating registration", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: invitationId,
            invited_alt_id: mockAlt.id,
            tournament_id: 100,
            status: "pending",
            expires_at: "2026-03-05T00:00:00Z",
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await respondToTournamentInvitation(
        mockClient,
        invitationId,
        "decline"
      );

      expect(result.success).toBe(true);
      expect(result.registration).toBeNull();
    });

    it("should throw error if invitation not for current user", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: invitationId,
            invited_alt_id: 999,
            tournament_id: 100,
            status: "pending",
            expires_at: "2026-03-05T00:00:00Z",
          },
          error: null,
        }),
      });

      await expect(
        respondToTournamentInvitation(mockClient, invitationId, "accept")
      ).rejects.toThrow("This invitation is not for you");
    });

    it("should throw error if invitation already responded to", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: invitationId,
            invited_alt_id: mockAlt.id,
            tournament_id: 100,
            status: "accepted",
            expires_at: "2026-03-05T00:00:00Z",
          },
          error: null,
        }),
      });

      await expect(
        respondToTournamentInvitation(mockClient, invitationId, "accept")
      ).rejects.toThrow("Invitation has already been responded to");
    });

    it("should throw error if invitation has expired", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: invitationId,
            invited_alt_id: mockAlt.id,
            tournament_id: 100,
            status: "pending",
            expires_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        }),
      });

      await expect(
        respondToTournamentInvitation(mockClient, invitationId, "accept")
      ).rejects.toThrow("Invitation has expired");
    });
  });
});
