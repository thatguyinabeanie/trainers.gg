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
    rpc: jest.fn(),
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
      // Mock RPC call
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          registrationId: 500,
          status: "registered",
        },
        error: null,
      });

      const result = await registerForTournament(mockClient, tournamentId);

      expect(mockClient.rpc).toHaveBeenCalledWith(
        "register_for_tournament_atomic",
        {
          p_tournament_id: tournamentId,
          p_alt_id: undefined,
          p_team_name: undefined,
          p_in_game_name: undefined,
          p_display_name_option: undefined,
          p_show_country_flag: undefined,
        }
      );
      expect(result).toEqual({
        success: true,
        registrationId: 500,
        status: "registered",
      });
    });

    it("should throw error if alt cannot be loaded", async () => {
      // RPC returns error for missing alt
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          error:
            "Unable to load your account. Please try signing out and back in, or contact support.",
        },
        error: null,
      });

      await expect(
        registerForTournament(mockClient, tournamentId)
      ).rejects.toThrow("Unable to load your account");
    });

    it("should throw error if already registered", async () => {
      // RPC returns error for duplicate registration
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          error: "Already registered for this tournament",
        },
        error: null,
      });

      await expect(
        registerForTournament(mockClient, tournamentId)
      ).rejects.toThrow("Already registered for this tournament");
    });

    it("should throw error if tournament not found", async () => {
      // RPC returns error for missing tournament
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          error: "Tournament not found",
        },
        error: null,
      });

      await expect(
        registerForTournament(mockClient, tournamentId)
      ).rejects.toThrow("Tournament not found");
    });

    it("should throw error if tournament is not open for registration", async () => {
      // RPC returns error for closed registration
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          error: "Tournament is not open for registration",
        },
        error: null,
      });

      await expect(
        registerForTournament(mockClient, tournamentId)
      ).rejects.toThrow("Tournament is not open for registration");
    });

    it("should register as waitlist when tournament is at max capacity", async () => {
      // RPC returns waitlist status when tournament is full
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          registrationId: 501,
          status: "waitlist",
        },
        error: null,
      });

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

      // Mock RPC call
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          registrationId: 502,
          status: "registered",
        },
        error: null,
      });

      await registerForTournament(mockClient, tournamentId, registrationData);

      expect(mockClient.rpc).toHaveBeenCalledWith(
        "register_for_tournament_atomic",
        {
          p_tournament_id: tournamentId,
          p_alt_id: 20,
          p_team_name: "Team Rocket",
          p_in_game_name: "Jessie",
          p_display_name_option: "in_game_name",
          p_show_country_flag: true,
        }
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

      expect(result).toEqual({ success: true, tournamentId: 100 });
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

    it("passes drop fields when status is dropped", async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const fromSpy = jest.spyOn(mockClient, "from");

      // First call: registration lookup
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { tournament_id: 100 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Second call: tournament lookup
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Third call: the update
      fromSpy.mockReturnValueOnce({
        update: mockUpdate,
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await updateRegistrationStatus(
        mockClient,
        registrationId,
        "dropped",
        { dropCategory: "no_show", dropNotes: "Did not appear for round 1" }
      );

      expect(result).toEqual({ success: true, tournamentId: 100 });
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "dropped",
          drop_category: "no_show",
          drop_notes: "Did not appear for round 1",
          dropped_by: mockUser.id,
          dropped_at: expect.any(String),
        })
      );
    });

    it("throws when status is dropped but no dropInfo provided", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // First call: registration lookup
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { tournament_id: 100 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Second call: tournament lookup
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        updateRegistrationStatus(mockClient, registrationId, "dropped")
      ).rejects.toThrow(
        "Drop info (category) is required when dropping a player"
      );
    });

    it("does not include drop fields for non-drop status", async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const fromSpy = jest.spyOn(mockClient, "from");

      // First call: registration lookup
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { tournament_id: 100 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Second call: tournament lookup
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 200 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Third call: the update
      fromSpy.mockReturnValueOnce({
        update: mockUpdate,
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await updateRegistrationStatus(
        mockClient,
        registrationId,
        "checked_in"
      );

      expect(result).toEqual({ success: true, tournamentId: 100 });
      expect(mockUpdate).toHaveBeenCalledWith({ status: "checked_in" });
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
    const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
    const tournamentId = 100;
    const profileIds = [20, 21, 22];

    beforeEach(() => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
    });

    it("should send invitations via atomic RPC and return counts", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          invitationsSent: 3,
          alreadyInvited: 0,
          availableSpots: 7,
        },
        error: null,
      });

      const result = await sendTournamentInvitations(
        mockClient,
        tournamentId,
        profileIds
      );

      expect(mockClient.rpc).toHaveBeenCalledWith(
        "send_tournament_invitations_atomic",
        {
          p_tournament_id: tournamentId,
          p_invited_alt_ids: profileIds,
          p_invited_by_alt_id: mockAlt.id,
          p_message: undefined,
        }
      );
      expect(result).toEqual({
        invitationsSent: 3,
        alreadyInvited: 0,
        availableSpots: 7,
      });
    });

    it("should report already-invited players from RPC dedup", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          invitationsSent: 1,
          alreadyInvited: 2,
          availableSpots: 9,
        },
        error: null,
      });

      const result = await sendTournamentInvitations(
        mockClient,
        tournamentId,
        profileIds
      );

      expect(result.invitationsSent).toBe(1);
      expect(result.alreadyInvited).toBe(2);
    });

    it("should throw error when capacity exceeded", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          error:
            "Not enough spots available. 2 spot(s) available, 3 requested.",
          availableSpots: 2,
        },
        error: null,
      });

      await expect(
        sendTournamentInvitations(mockClient, tournamentId, profileIds)
      ).rejects.toThrow("Not enough spots available");
    });

    it("should throw error when caller lacks permission", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          error: "You don't have permission to send invitations",
        },
        error: null,
      });

      await expect(
        sendTournamentInvitations(mockClient, tournamentId, profileIds)
      ).rejects.toThrow("You don't have permission to send invitations");
    });

    it("throws when user is not authenticated", async () => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(null);

      await expect(
        sendTournamentInvitations(mockClient, tournamentId, profileIds)
      ).rejects.toThrow("Unable to load your account");
    });

    it("throws when RPC returns a transport error", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: "connection timeout", code: "PGRST301" },
      });

      await expect(
        sendTournamentInvitations(mockClient, tournamentId, profileIds)
      ).rejects.toMatchObject({ message: "connection timeout" });
    });

    it("should pass optional message to RPC", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          invitationsSent: 1,
          alreadyInvited: 0,
          availableSpots: 9,
        },
        error: null,
      });

      await sendTournamentInvitations(
        mockClient,
        tournamentId,
        [20],
        "Join us!"
      );

      expect(mockClient.rpc).toHaveBeenCalledWith(
        "send_tournament_invitations_atomic",
        expect.objectContaining({ p_message: "Join us!" })
      );
    });
  });

  describe("respondToTournamentInvitation", () => {
    const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
    const invitationId = 300;

    beforeEach(() => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
    });

    describe("accept path (uses atomic RPC)", () => {
      it("should accept invitation via RPC and return registration", async () => {
        (mockClient.rpc as jest.Mock).mockResolvedValue({
          data: { success: true, registrationId: 700 },
          error: null,
        });

        const result = await respondToTournamentInvitation(
          mockClient,
          invitationId,
          "accept"
        );

        expect(mockClient.rpc).toHaveBeenCalledWith(
          "accept_tournament_invitation_atomic",
          { p_invitation_id: invitationId }
        );
        expect(result.success).toBe(true);
        expect(result.registration).toBeTruthy();
      });

      it("should throw when RPC reports invitation has expired", async () => {
        (mockClient.rpc as jest.Mock).mockResolvedValue({
          data: { success: false, error: "Invitation has expired" },
          error: null,
        });

        await expect(
          respondToTournamentInvitation(mockClient, invitationId, "accept")
        ).rejects.toThrow("Invitation has expired");
      });

      it("throws when accept RPC returns a transport error", async () => {
        (mockClient.rpc as jest.Mock).mockResolvedValue({
          data: null,
          error: { message: "database unavailable", code: "PGRST301" },
        });

        await expect(
          respondToTournamentInvitation(mockClient, invitationId, "accept")
        ).rejects.toMatchObject({ message: "database unavailable" });
      });

      it("should throw when RPC reports invitation already responded to", async () => {
        (mockClient.rpc as jest.Mock).mockResolvedValue({
          data: { success: false, error: "Invitation already responded to" },
          error: null,
        });

        await expect(
          respondToTournamentInvitation(mockClient, invitationId, "accept")
        ).rejects.toThrow("Invitation already responded to");
      });
    });

    describe("decline path (direct update)", () => {
      it("should decline invitation without calling RPC", async () => {
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
        expect(mockClient.rpc).not.toHaveBeenCalled();
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
          respondToTournamentInvitation(mockClient, invitationId, "decline")
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
          respondToTournamentInvitation(mockClient, invitationId, "decline")
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
          respondToTournamentInvitation(mockClient, invitationId, "decline")
        ).rejects.toThrow("Invitation has expired");
      });
    });
  });
});
