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

  it("should return empty array when no stats exist", async () => {
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "tournament_player_stats") {
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
    expect(mockFrom).toHaveBeenCalledWith("tournament_player_stats");
  });

  it("should return formatted history for completed tournaments with placement, record, and team pokemon", async () => {
    const mockStats = [
      {
        id: 1,
        alt_id: 1,
        tournament_id: 100,
        match_wins: 5,
        match_losses: 0,
        final_ranking: 1,
        created_at: "2024-01-01T00:00:00Z",
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
        tournament_id: 101,
        match_wins: 2,
        match_losses: 3,
        final_ranking: 8,
        created_at: "2024-02-01T00:00:00Z",
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

    const mockRegistrations = [{ tournament_id: 100, alt_id: 1, team_id: 10 }];

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
      if (callCount === 1 && table === "tournament_player_stats") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockStats,
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 2 && table === "tournament_registrations") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockRegistrations,
                error: null,
              }),
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
      altId: 1,
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

  it("should filter out non-completed tournaments", async () => {
    const mockStats = [
      {
        id: 1,
        alt_id: 1,
        tournament_id: 100,
        match_wins: 3,
        match_losses: 1,
        final_ranking: 2,
        created_at: "2024-01-01T00:00:00Z",
        tournament: {
          id: 100,
          name: "Active Tournament",
          slug: "active-tournament",
          start_date: "2024-01-15T00:00:00Z",
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

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "tournament_player_stats") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockStats,
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: jest.fn() };
    });
    jest.mocked(mockSupabase.from).mockImplementation(mockFrom);

    const result = await getPlayerTournamentHistory(mockSupabase, [1]);
    expect(result).toEqual([]);
  });

  it("should handle null tournament gracefully", async () => {
    const mockStats = [
      {
        id: 1,
        alt_id: 1,
        tournament_id: 100,
        match_wins: 3,
        match_losses: 1,
        final_ranking: 2,
        created_at: "2024-01-01T00:00:00Z",
        tournament: null,
      },
    ];

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "tournament_player_stats") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockStats,
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: jest.fn() };
    });
    jest.mocked(mockSupabase.from).mockImplementation(mockFrom);

    const result = await getPlayerTournamentHistory(mockSupabase, [1]);
    expect(result).toEqual([]);
  });

  it("should default wins/losses to 0 when null", async () => {
    const mockStats = [
      {
        id: 1,
        alt_id: 1,
        tournament_id: 100,
        match_wins: null,
        match_losses: null,
        final_ranking: 4,
        created_at: "2024-01-01T00:00:00Z",
        tournament: {
          id: 100,
          name: "Null Wins Tournament",
          slug: "null-wins",
          start_date: "2024-01-15T00:00:00Z",
          status: "completed",
          format: "VGC 2024",
          organization: {
            id: 5,
            name: "Test Org",
            slug: "test-org",
          },
        },
      },
    ];

    const mockRegistrations = [
      { tournament_id: 100, alt_id: 1, team_id: null },
    ];

    const mockRegCounts = [{ tournament_id: 100, registration_count: 16 }];

    let callCount = 0;
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1 && table === "tournament_player_stats") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockStats,
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 2 && table === "tournament_registrations") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockRegistrations,
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

    expect(result).toHaveLength(1);
    expect(result[0]!.wins).toBe(0);
    expect(result[0]!.losses).toBe(0);
  });

  // ===========================================================================
  // publicOnly option — private-team species exclusion
  //
  // When publicOnly=true (used by service-role callers where RLS is bypassed),
  // getPlayerTournamentHistory MUST restrict team_pokemon reads to teams where
  // is_public=true. Without this guard, species from a player's private team
  // would be served to anonymous spectators via the public profile page cache.
  // ===========================================================================

  describe("publicOnly option", () => {
    // Shared: one completed tournament, one registration with a team
    const completedStats = [
      {
        id: 1,
        alt_id: 1,
        tournament_id: 100,
        match_wins: 4,
        match_losses: 1,
        final_ranking: 2,
        created_at: "2024-01-01T00:00:00Z",
        tournament: {
          id: 100,
          name: "Public Tournament",
          slug: "public-tournament",
          start_date: "2024-01-15T00:00:00Z",
          status: "completed",
          format: "VGC 2024",
          organization: {
            id: 5,
            name: "Test Org",
            slug: "test-org",
          },
        },
      },
    ];

    const registrationWithTeam = [
      { tournament_id: 100, alt_id: 1, team_id: 20 },
    ];

    const pokemonRows = [
      { team_id: 20, team_position: 1, pokemon: { species: "Koraidon" } },
      { team_id: 20, team_position: 2, pokemon: { species: "Miraidon" } },
    ];

    it("with publicOnly=true: skips team_pokemon for teams where is_public=false", async () => {
      // teams query returns the team but is_public=false → allowedTeamIds = []
      // → team_pokemon query is never called → teamPokemon is []
      let callCount = 0;
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1 && table === "tournament_player_stats") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: completedStats,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (callCount === 2 && table === "tournament_registrations") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: registrationWithTeam,
                  error: null,
                }),
              }),
            }),
          };
        }
        // teams.select("id").in(...).eq("is_public", true) → private team excluded
        if (callCount === 3 && table === "teams") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [], // no public teams
                  error: null,
                }),
              }),
            }),
          };
        }
        // team_pokemon must NOT be reached when allowedTeamIds is empty
        if (table === "team_pokemon") {
          throw new Error(
            "team_pokemon query must not be called when allowedTeamIds is empty"
          );
        }
        return { select: jest.fn() };
      });
      jest.mocked(mockSupabase.from).mockImplementation(mockFrom);
      jest
        .mocked(mockSupabase.rpc as ReturnType<typeof jest.fn>)
        .mockResolvedValue({
          data: [{ tournament_id: 100, registration_count: 32 }],
          error: null,
        });

      const result = await getPlayerTournamentHistory(mockSupabase, [1], {
        publicOnly: true,
      });

      expect(result).toHaveLength(1);
      // Private team → no pokemon species leaked
      expect(result[0]!.teamPokemon).toEqual([]);
    });

    it("with publicOnly=true: includes team_pokemon for teams where is_public=true", async () => {
      let callCount = 0;
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1 && table === "tournament_player_stats") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: completedStats,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (callCount === 2 && table === "tournament_registrations") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: registrationWithTeam,
                  error: null,
                }),
              }),
            }),
          };
        }
        // teams.select("id").in(...).eq("is_public", true) → team IS public
        if (callCount === 3 && table === "teams") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ id: 20 }], // team 20 is public
                  error: null,
                }),
              }),
            }),
          };
        }
        if (callCount === 4 && table === "team_pokemon") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: pokemonRows,
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
          data: [{ tournament_id: 100, registration_count: 32 }],
          error: null,
        });

      const result = await getPlayerTournamentHistory(mockSupabase, [1], {
        publicOnly: true,
      });

      expect(result).toHaveLength(1);
      // Public team → species are visible
      expect(result[0]!.teamPokemon).toEqual(["Koraidon", "Miraidon"]);
    });

    it("without publicOnly (default): skips the teams is_public check and reads pokemon directly", async () => {
      // When publicOnly is not set (or false), the teams visibility check is
      // skipped entirely — the function goes straight to team_pokemon, relying
      // on RLS for access control. We verify the teams table is NOT queried.
      let teamsQueryCalled = false;
      let callCount = 0;
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1 && table === "tournament_player_stats") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: completedStats,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (callCount === 2 && table === "tournament_registrations") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: registrationWithTeam,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "teams") {
          teamsQueryCalled = true;
          return { select: jest.fn() };
        }
        if (table === "team_pokemon") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: pokemonRows,
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
          data: [{ tournament_id: 100, registration_count: 32 }],
          error: null,
        });

      const result = await getPlayerTournamentHistory(mockSupabase, [1]);

      expect(result).toHaveLength(1);
      // teams is_public filter must NOT be consulted when publicOnly is omitted
      expect(teamsQueryCalled).toBe(false);
      // team_pokemon is read directly (RLS enforces access)
      expect(result[0]!.teamPokemon).toEqual(["Koraidon", "Miraidon"]);
    });

    it("with publicOnly=true: throws when the teams public-filter query errors", async () => {
      let callCount = 0;
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1 && table === "tournament_player_stats") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: completedStats,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (callCount === 2 && table === "tournament_registrations") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: registrationWithTeam,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (callCount === 3 && table === "teams") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: "teams query failed" },
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
        .mockResolvedValue({ data: [], error: null });

      await expect(
        getPlayerTournamentHistory(mockSupabase, [1], { publicOnly: true })
      ).rejects.toMatchObject({ message: "teams query failed" });
    });
  });

  it("should handle registrations without teams", async () => {
    const mockStats = [
      {
        id: 1,
        alt_id: 1,
        tournament_id: 100,
        match_wins: 2,
        match_losses: 1,
        final_ranking: 3,
        created_at: "2024-01-01T00:00:00Z",
        tournament: {
          id: 100,
          name: "No Team Tournament",
          slug: "no-team",
          start_date: "2024-01-15T00:00:00Z",
          status: "completed",
          format: "VGC 2024",
          organization: {
            id: 5,
            name: "Test Org",
            slug: "test-org",
          },
        },
      },
    ];

    const mockRegistrations = [
      { tournament_id: 100, alt_id: 1, team_id: null },
    ];

    const mockRegCounts = [{ tournament_id: 100, registration_count: 24 }];

    let callCount = 0;
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1 && table === "tournament_player_stats") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockStats,
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 2 && table === "tournament_registrations") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockRegistrations,
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

    expect(result).toHaveLength(1);
    expect(result[0]!.teamPokemon).toEqual([]);
    expect(result[0]!.playerCount).toBe(24);
    expect(result[0]!.placement).toBe(3);
  });
});
