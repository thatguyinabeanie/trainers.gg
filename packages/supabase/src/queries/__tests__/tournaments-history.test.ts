import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { getUserTournamentHistory } from "../tournaments";
import type { TypedClient } from "../../client";

describe("getUserTournamentHistory", () => {
  let mockSupabase: TypedClient;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
      rpc: jest.fn(),
    } as unknown as TypedClient;
  });

  it("should return empty array if user is not authenticated", async () => {
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await getUserTournamentHistory(mockSupabase);
    expect(result).toEqual([]);
  });

  it("should return empty array if user has no alts", async () => {
    const mockUserId = "user-123";
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: mockUserId } as never },
      error: null,
    });

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });
    (mockSupabase.from as jest.Mock).mockImplementation(mockFrom);

    const result = await getUserTournamentHistory(mockSupabase);
    expect(result).toEqual([]);
    expect(mockFrom).toHaveBeenCalledWith("alts");
  });

  it("should return empty array if user has no tournament registrations", async () => {
    const mockUserId = "user-123";
    const mockAlts = [
      { id: 1, username: "alt1", display_name: "Alt One" },
      { id: 2, username: "alt2", display_name: "Alt Two" },
    ];

    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: mockUserId } as never },
      error: null,
    });

    let callCount = 0;
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1 && table === "alts") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockAlts,
              error: null,
            }),
          }),
        };
      }
      if (callCount === 2 && table === "tournament_registrations") {
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
      return {
        select: jest.fn(),
      };
    });
    (mockSupabase.from as jest.Mock).mockImplementation(mockFrom);

    const result = await getUserTournamentHistory(mockSupabase);
    expect(result).toEqual([]);
  });

  it("should return tournament history with placement and team data", async () => {
    const mockUserId = "user-123";
    const mockAlts = [{ id: 1, username: "alt1", display_name: "Alt One" }];
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
          end_date: "2024-01-15T18:00:00Z",
          status: "completed",
          format: "VGC 2024 Reg G",
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
        match_wins: 5,
        match_losses: 0,
        match_ties: 0,
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

    jest.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as never },
      error: null,
    });

    let callCount = 0;
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1 && table === "alts") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockAlts,
              error: null,
            }),
          }),
        };
      }
      if (callCount === 2 && table === "tournament_registrations") {
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
      if (callCount === 3 && table === "tournament_standings") {
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
      if (callCount === 4 && table === "team_pokemon") {
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
      return {
        select: jest.fn(),
      };
    });
    jest.mocked(mockSupabase.from).mockImplementation(mockFrom);

    const result = await getUserTournamentHistory(mockSupabase);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      tournamentId: 100,
      tournamentName: "Test Tournament",
      tournamentSlug: "test-tournament",
      organizationName: "Test Org",
      organizationSlug: "test-org",
      startDate: "2024-01-15T00:00:00Z",
      endDate: "2024-01-15T18:00:00Z",
      format: "VGC 2024 Reg G",
      altId: 1,
      altUsername: "alt1",
      altDisplayName: "Alt One",
      placement: 1,
      wins: 5,
      losses: 0,
      ties: 0,
      teamPokemon: [
        "Incineroar",
        "Rillaboom",
        "Urshifu",
        "Flutter Mane",
        "Amoonguss",
        "Tornadus",
      ],
      registeredAt: "2024-01-01T00:00:00Z",
    });
  });

  it("should filter out non-completed tournaments", async () => {
    const mockUserId = "user-123";
    const mockAlts = [{ id: 1, username: "alt1", display_name: "Alt One" }];
    const mockRegistrations = [
      {
        id: 1,
        alt_id: 1,
        status: "checked_in",
        registered_at: "2024-01-01T00:00:00Z",
        team_id: null,
        tournament: {
          id: 100,
          name: "Completed Tournament",
          slug: "completed",
          start_date: "2024-01-15T00:00:00Z",
          end_date: "2024-01-15T18:00:00Z",
          status: "completed",
          format: "VGC 2024",
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
          end_date: null,
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

    jest.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as never },
      error: null,
    });

    let callCount = 0;
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1 && table === "alts") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockAlts,
              error: null,
            }),
          }),
        };
      }
      if (callCount === 2 && table === "tournament_registrations") {
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
      if (callCount === 3 && table === "tournament_standings") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockImplementation((field: string) => {
              if (field === "tournament_id") {
                return {
                  in: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                };
              }
            }),
          }),
        };
      }
      return {
        select: jest.fn(),
      };
    });
    jest.mocked(mockSupabase.from).mockImplementation(mockFrom);

    const result = await getUserTournamentHistory(mockSupabase);

    // Should only include the completed tournament
    expect(result).toHaveLength(1);
    expect(result[0]?.tournamentName).toBe("Completed Tournament");
  });
});
