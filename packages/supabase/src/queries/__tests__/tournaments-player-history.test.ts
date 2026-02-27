import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { getPlayerTournamentHistory } from "../tournaments";
import type { TypedClient } from "../../client";

describe("getPlayerTournamentHistory", () => {
  let mockSupabase: TypedClient;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn() as ReturnType<typeof jest.fn>,
      rpc: jest.fn() as ReturnType<typeof jest.fn>,
    } as unknown as TypedClient;
  });

  it("should return empty array when altIds is empty", async () => {
    const result = await getPlayerTournamentHistory(mockSupabase, []);
    expect(result).toEqual([]);
    // Should not call any Supabase methods
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("should return empty array when no registrations exist", async () => {
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "tournament_registrations") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: jest.fn() };
    });
    jest.mocked(mockSupabase.from).mockImplementation(mockFrom);

    const result = await getPlayerTournamentHistory(mockSupabase, [1, 2]);
    expect(result).toEqual([]);
    expect(mockFrom).toHaveBeenCalledWith("tournament_registrations");
  });

  it("should return formatted history for completed tournaments with placement, record, and team pokemon", async () => {
    const mockRegistrations = [
      {
        id: 1,
        alt_id: 1,
        status: "checked_in",
        registered_at: "2024-01-01T00:00:00Z",
        team_id: 10,
        tournament: {
          id: 100,
          name: "Test Tournament",
          slug: "test-tournament",
          start_date: "2024-01-15T00:00:00Z",
          status: "completed",
          format: "VGC 2024 Reg G",
          organization: {
            id: 5,
            name: "Test Org",
            slug: "test-org",
          },
        },
      },
      {
        id: 2,
        alt_id: 1,
        status: "registered",
        registered_at: "2024-02-01T00:00:00Z",
        team_id: null,
        tournament: {
          id: 101,
          name: "Active Tournament",
          slug: "active",
          start_date: "2024-02-15T00:00:00Z",
          status: "active",
          format: "VGC 2024",
          organization: {
            id: 5,
            name: "Test Org",
            slug: "test-org",
          },
        },
      },
    ];

    const mockStandings = [
      {
        tournament_id: 100,
        alt_id: 1,
        rank: 1,
        game_wins: 5,
        game_losses: 0,
      },
    ];

    const mockTeamPokemon = [
      {
        team_id: 10,
        team_position: 1,
        pokemon: { species: "Incineroar" },
      },
      {
        team_id: 10,
        team_position: 2,
        pokemon: { species: "Rillaboom" },
      },
      {
        team_id: 10,
        team_position: 3,
        pokemon: { species: "Urshifu" },
      },
      {
        team_id: 10,
        team_position: 4,
        pokemon: { species: "Flutter Mane" },
      },
      {
        team_id: 10,
        team_position: 5,
        pokemon: { species: "Amoonguss" },
      },
      {
        team_id: 10,
        team_position: 6,
        pokemon: { species: "Tornadus" },
      },
    ];

    const mockRegCounts = [{ tournament_id: 100, registration_count: 32 }];

    let callCount = 0;
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1 && table === "tournament_registrations") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockRegistrations,
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 2 && table === "tournament_standings") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockImplementation((field: string) => {
              if (field === "tournament_id") {
                return {
                  in: jest.fn().mockResolvedValue({
                    data: mockStandings,
                    error: null,
                  }),
                };
              }
            }),
          }),
        };
      }
      if (callCount === 3 && table === "team_pokemon") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockTeamPokemon,
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: jest.fn() };
    });
    jest.mocked(mockSupabase.from).mockImplementation(mockFrom);
    jest
      .mocked(mockSupabase.rpc as ReturnType<typeof jest.fn>)
      .mockResolvedValue({
        data: mockRegCounts,
        error: null,
      });

    const result = await getPlayerTournamentHistory(mockSupabase, [1]);

    // Should only include the completed tournament, not the active one
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      tournamentId: 100,
      tournamentName: "Test Tournament",
      tournamentSlug: "test-tournament",
      organizationName: "Test Org",
      organizationSlug: "test-org",
      startDate: "2024-01-15T00:00:00Z",
      format: "VGC 2024 Reg G",
      playerCount: 32,
      placement: 1,
      wins: 5,
      losses: 0,
      teamPokemon: [
        "Incineroar",
        "Rillaboom",
        "Urshifu",
        "Flutter Mane",
        "Amoonguss",
        "Tornadus",
      ],
    });
  });
});
