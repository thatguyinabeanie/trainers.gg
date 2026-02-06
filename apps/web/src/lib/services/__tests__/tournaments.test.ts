/**
 * Tests for Tournament Service Layer
 *
 * Note: This file tests a representative subset of tournament service functions.
 * The pattern established here applies to all service functions.
 */

import { describe, it, expect, jest } from "@jest/globals";
import {
  listTournamentsService,
  getTournamentByIdService,
  createTournamentService,
  updateTournamentService,
  registerForTournamentService,
  checkInService,
  cancelRegistrationService,
  submitTeamService,
  startTournamentService,
  createRoundService,
} from "../tournaments";

// Mock Supabase client
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Mock Supabase functions
jest.mock("@trainers/supabase", () => ({
  listTournamentsGrouped: jest.fn(),
  getTournamentById: jest.fn(),
  createTournament: jest.fn(),
  updateTournament: jest.fn(),
  registerForTournament: jest.fn(),
  checkIn: jest.fn(),
  cancelRegistration: jest.fn(),
  submitTeam: jest.fn(),
  startTournamentEnhanced: jest.fn(),
  createRound: jest.fn(),
}));

describe("Tournament Service", () => {
  describe("listTournamentsService", () => {
    it("should return tournaments grouped by status", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { listTournamentsGrouped } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const mockTournaments = {
        active: [{ id: 1, name: "Active Tournament" }],
        upcoming: [{ id: 2, name: "Upcoming Tournament" }],
        completed: [{ id: 3, name: "Completed Tournament" }],
      };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (listTournamentsGrouped as jest.Mock).mockResolvedValue(mockTournaments);

      const result = await listTournamentsService({ completedLimit: 10 });

      expect(createClient).toHaveBeenCalled();
      expect(listTournamentsGrouped).toHaveBeenCalledWith(mockSupabase, {
        completedLimit: 10,
      });
      expect(result).toEqual(mockTournaments);
    });

    it("should use default completedLimit if not provided", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { listTournamentsGrouped } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const mockTournaments = {
        active: [],
        upcoming: [],
        completed: [],
      };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (listTournamentsGrouped as jest.Mock).mockResolvedValue(mockTournaments);

      await listTournamentsService({});

      expect(listTournamentsGrouped).toHaveBeenCalledWith(mockSupabase, {});
    });
  });

  describe("getTournamentByIdService", () => {
    it("should return tournament by ID", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getTournamentById } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const tournamentId = 123;
      const mockTournament = { id: tournamentId, name: "Test Tournament" };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (getTournamentById as jest.Mock).mockResolvedValue(mockTournament);

      const result = await getTournamentByIdService(tournamentId);

      expect(createClient).toHaveBeenCalled();
      expect(getTournamentById).toHaveBeenCalledWith(
        mockSupabase,
        tournamentId
      );
      expect(result).toEqual(mockTournament);
    });

    it("should throw error when tournament not found", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getTournamentById } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const tournamentId = 456;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (getTournamentById as jest.Mock).mockResolvedValue(null);

      await expect(getTournamentByIdService(tournamentId)).rejects.toThrow(
        "Tournament not found"
      );
    });
  });

  describe("createTournamentService", () => {
    it("should create a new tournament", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { createTournament } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const tournamentData = {
        name: "New Tournament",
        format: "swiss",
        organization_id: 1,
      };
      const mockCreatedTournament = { id: 789, ...tournamentData };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (createTournament as jest.Mock).mockResolvedValue(mockCreatedTournament);

      const result = await createTournamentService(tournamentData);

      expect(createClient).toHaveBeenCalled();
      expect(createTournament).toHaveBeenCalledWith(
        mockSupabase,
        tournamentData
      );
      expect(result).toEqual(mockCreatedTournament);
    });
  });

  describe("updateTournamentService", () => {
    it("should update a tournament", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { updateTournament } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const tournamentId = 123;
      const updates = { name: "Updated Name", status: "upcoming" };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (updateTournament as jest.Mock).mockResolvedValue(undefined);

      await updateTournamentService(tournamentId, updates);

      expect(createClient).toHaveBeenCalled();
      expect(updateTournament).toHaveBeenCalledWith(
        mockSupabase,
        tournamentId,
        updates
      );
    });
  });

  describe("registerForTournamentService", () => {
    it("should register for tournament with altId", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { registerForTournament } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const tournamentId = 123;
      const altId = 456;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (registerForTournament as jest.Mock).mockResolvedValue(undefined);

      await registerForTournamentService(tournamentId, altId);

      expect(createClient).toHaveBeenCalled();
      expect(registerForTournament).toHaveBeenCalledWith(
        mockSupabase,
        tournamentId,
        { altId }
      );
    });

    it("should register for tournament without altId", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { registerForTournament } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const tournamentId = 123;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (registerForTournament as jest.Mock).mockResolvedValue(undefined);

      await registerForTournamentService(tournamentId);

      expect(createClient).toHaveBeenCalled();
      expect(registerForTournament).toHaveBeenCalledWith(
        mockSupabase,
        tournamentId,
        {}
      );
    });
  });

  describe("checkInService", () => {
    it("should check in for tournament", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { checkIn } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const tournamentId = 123;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (checkIn as jest.Mock).mockResolvedValue(undefined);

      await checkInService(tournamentId);

      expect(createClient).toHaveBeenCalled();
      expect(checkIn).toHaveBeenCalledWith(mockSupabase, tournamentId);
    });
  });

  describe("cancelRegistrationService", () => {
    it("should cancel tournament registration", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { cancelRegistration } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const tournamentId = 123;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (cancelRegistration as jest.Mock).mockResolvedValue(undefined);

      await cancelRegistrationService(tournamentId);

      expect(createClient).toHaveBeenCalled();
      expect(cancelRegistration).toHaveBeenCalledWith(
        mockSupabase,
        tournamentId
      );
    });
  });

  describe("submitTeamService", () => {
    it("should submit team for tournament", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { submitTeam } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const tournamentId = 123;
      const showdownText = "Pikachu @ Light Ball...";
      const mockResult = { success: true, team_id: 789 };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (submitTeam as jest.Mock).mockResolvedValue(mockResult);

      const result = await submitTeamService(tournamentId, showdownText);

      expect(createClient).toHaveBeenCalled();
      expect(submitTeam).toHaveBeenCalledWith(
        mockSupabase,
        tournamentId,
        showdownText
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("startTournamentService", () => {
    it("should start tournament", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { startTournamentEnhanced } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const tournamentId = 123;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (startTournamentEnhanced as jest.Mock).mockResolvedValue(undefined);

      await startTournamentService(tournamentId);

      expect(createClient).toHaveBeenCalled();
      expect(startTournamentEnhanced).toHaveBeenCalledWith(
        mockSupabase,
        tournamentId
      );
    });
  });

  describe("createRoundService", () => {
    it("should create a new round", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { createRound } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const phaseId = 456;
      const roundNumber = 2;
      const mockRound = {
        id: 789,
        phase_id: phaseId,
        round_number: roundNumber,
      };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (createRound as jest.Mock).mockResolvedValue(mockRound);

      const result = await createRoundService(phaseId, roundNumber);

      expect(createClient).toHaveBeenCalled();
      expect(createRound).toHaveBeenCalledWith(
        mockSupabase,
        phaseId,
        roundNumber
      );
      expect(result).toEqual(mockRound);
    });
  });
});
