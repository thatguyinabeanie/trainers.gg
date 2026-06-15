import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { getPublicPhaseRoundsWithMatches } from "../tournaments";
import type { TypedClient } from "../../client";

// =============================================================================
// getPublicPhaseRoundsWithMatches — column allowlist security tests
//
// Criticality-9: this is the sole guard preventing staff-internal columns
// (staff_notes, *_rating_before, player1/2_match_confirmed, elo_applied)
// from leaking into the public spectator cache. These tests will fail if the
// SELECT string is widened to `*` or if the sensitive column list regresses.
// =============================================================================

// Sensitive columns that must NEVER appear in the public response.
const SENSITIVE_COLUMNS = [
  "staff_notes",
  "staff_requested",
  "staff_requested_at",
  "staff_resolved_by",
  "alt1_rating_before",
  "alt1_overall_rating_before",
  "alt1_games_before",
  "alt2_rating_before",
  "alt2_overall_rating_before",
  "alt2_games_before",
  "alt1_overall_games_before",
  "alt2_overall_games_before",
  "elo_applied",
  "player1_match_confirmed",
  "player2_match_confirmed",
  "match_confirmed_at",
] as const;

// Public columns that MUST appear in the response.
const PUBLIC_COLUMNS = [
  "id",
  "round_id",
  "alt1_id",
  "alt2_id",
  "table_number",
  "status",
  "game_wins1",
  "game_wins2",
  "match_points1",
  "match_points2",
  "winner_alt_id",
  "is_bye",
  "start_time",
  "end_time",
  "created_at",
] as const;

describe("getPublicPhaseRoundsWithMatches — column allowlist", () => {
  let mockSupabase: TypedClient;

  // Capture the select string passed to tournament_matches so we can assert
  // that it contains only the public allowlist and not the sensitive columns.
  let capturedMatchSelect = "";

  beforeEach(() => {
    capturedMatchSelect = "";

    // Build a mock supabase where:
    //  - tournament_rounds query resolves one round
    //  - tournament_matches query captures the SELECT string and resolves one match
    //  - tournament_player_stats resolves empty (irrelevant for the column test)
    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === "tournament_rounds") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 10,
                      phase_id: 1,
                      round_number: 1,
                      status: "completed",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "tournament_matches") {
          return {
            select: jest.fn((selectStr: string) => {
              capturedMatchSelect = selectStr;
              return {
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [
                      {
                        id: 99,
                        round_id: 10,
                        alt1_id: 1,
                        alt2_id: 2,
                        table_number: 1,
                        status: "completed",
                        game_wins1: 2,
                        game_wins2: 0,
                        match_points1: 3,
                        match_points2: 0,
                        winner_alt_id: 1,
                        is_bye: false,
                        start_time: "2024-01-01T10:00:00Z",
                        end_time: "2024-01-01T10:30:00Z",
                        created_at: "2024-01-01T09:55:00Z",
                        player1: [{ id: 1, username: "ash" }],
                        player2: [{ id: 2, username: "misty" }],
                      },
                    ],
                    error: null,
                  }),
                }),
              };
            }),
          };
        }

        if (table === "tournament_player_stats") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }

        return { select: jest.fn() };
      }),
    } as unknown as TypedClient;
  });

  it("returns empty array when no rounds exist for the phase", async () => {
    const emptyRoundsMock = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as TypedClient;

    const result = await getPublicPhaseRoundsWithMatches(emptyRoundsMock, 1, 1);
    expect(result).toEqual([]);
  });

  it("throws when the rounds query errors", async () => {
    const errorMock = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "rounds fetch failed" },
            }),
          }),
        }),
      }),
    } as unknown as TypedClient;

    await expect(
      getPublicPhaseRoundsWithMatches(errorMock, 1, 1)
    ).rejects.toMatchObject({ message: "rounds fetch failed" });
  });

  it("throws when the matches query errors", async () => {
    const errorMock = {
      from: jest.fn((table: string) => {
        if (table === "tournament_rounds") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [{ id: 10, phase_id: 1, round_number: 1 }],
                  error: null,
                }),
              }),
            }),
          };
        }
        // tournament_matches errors
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "matches fetch failed" },
              }),
            }),
          }),
        };
      }),
    } as unknown as TypedClient;

    await expect(
      getPublicPhaseRoundsWithMatches(errorMock, 1, 1)
    ).rejects.toMatchObject({ message: "matches fetch failed" });
  });

  it("SELECT string for tournament_matches does NOT include any sensitive column", async () => {
    await getPublicPhaseRoundsWithMatches(mockSupabase, 1, 100);

    // Ensure we actually captured the select string.
    expect(capturedMatchSelect.length).toBeGreaterThan(0);

    for (const col of SENSITIVE_COLUMNS) {
      expect(capturedMatchSelect).not.toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  it.each(PUBLIC_COLUMNS)(
    "SELECT string for tournament_matches includes public column '%s'",
    async (col) => {
      await getPublicPhaseRoundsWithMatches(mockSupabase, 1, 100);
      expect(capturedMatchSelect).toContain(col);
    }
  );

  it("returned match shape contains public fields and player joins", async () => {
    const result = await getPublicPhaseRoundsWithMatches(mockSupabase, 1, 100);

    expect(result).toHaveLength(1);
    const round = result[0]!;
    expect(round.matches).toHaveLength(1);

    const match = round.matches[0]!;

    // Public fields must be present.
    expect(match).toHaveProperty("id", 99);
    expect(match).toHaveProperty("round_id", 10);
    expect(match).toHaveProperty("alt1_id", 1);
    expect(match).toHaveProperty("alt2_id", 2);
    expect(match).toHaveProperty("table_number", 1);
    expect(match).toHaveProperty("status", "completed");
    expect(match).toHaveProperty("game_wins1", 2);
    expect(match).toHaveProperty("game_wins2", 0);
    expect(match).toHaveProperty("match_points1", 3);
    expect(match).toHaveProperty("match_points2", 0);
    expect(match).toHaveProperty("winner_alt_id", 1);
    expect(match).toHaveProperty("is_bye", false);
    expect(match).toHaveProperty("created_at");
    expect(match).toHaveProperty("player1");
    expect(match).toHaveProperty("player2");
  });

  it.each(SENSITIVE_COLUMNS)(
    "returned match shape does NOT contain sensitive column '%s'",
    async (col) => {
      const result = await getPublicPhaseRoundsWithMatches(
        mockSupabase,
        1,
        100
      );

      const match = result[0]?.matches[0];
      expect(match).toBeDefined();
      expect(Object.keys(match ?? {})).not.toContain(col);
    }
  );

  it("attaches player stats from tournament_player_stats as player1Stats/player2Stats", async () => {
    const statsSupabase = {
      from: jest.fn((table: string) => {
        if (table === "tournament_rounds") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [{ id: 10, phase_id: 1, round_number: 1 }],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "tournament_matches") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 99,
                      round_id: 10,
                      alt1_id: 1,
                      alt2_id: 2,
                      table_number: 1,
                      status: "active",
                      game_wins1: 1,
                      game_wins2: 0,
                      match_points1: 0,
                      match_points2: 0,
                      winner_alt_id: null,
                      is_bye: false,
                      start_time: null,
                      end_time: null,
                      created_at: "2024-01-01T09:55:00Z",
                      player1: [{ id: 1, username: "ash" }],
                      player2: [{ id: 2, username: "misty" }],
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "tournament_player_stats") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [
                    { alt_id: 1, match_wins: 3, match_losses: 1 },
                    { alt_id: 2, match_wins: 2, match_losses: 2 },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        return { select: jest.fn() };
      }),
    } as unknown as TypedClient;

    const result = await getPublicPhaseRoundsWithMatches(statsSupabase, 1, 100);

    const match = result[0]!.matches[0]!;
    expect(match.player1Stats).toEqual({ wins: 3, losses: 1 });
    expect(match.player2Stats).toEqual({ wins: 2, losses: 2 });
  });

  it("groups matches correctly under their respective rounds", async () => {
    const multiRoundSupabase = {
      from: jest.fn((table: string) => {
        if (table === "tournament_rounds") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    { id: 10, phase_id: 1, round_number: 1 },
                    { id: 11, phase_id: 1, round_number: 2 },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "tournament_matches") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 1,
                      round_id: 10,
                      alt1_id: 1,
                      alt2_id: 2,
                      table_number: 1,
                      status: "completed",
                      game_wins1: 2,
                      game_wins2: 0,
                      match_points1: 3,
                      match_points2: 0,
                      winner_alt_id: 1,
                      is_bye: false,
                      start_time: null,
                      end_time: null,
                      created_at: "2024-01-01T09:00:00Z",
                      player1: [{ id: 1, username: "ash" }],
                      player2: [{ id: 2, username: "misty" }],
                    },
                    {
                      id: 2,
                      round_id: 11,
                      alt1_id: 3,
                      alt2_id: 4,
                      table_number: 1,
                      status: "active",
                      game_wins1: 0,
                      game_wins2: 0,
                      match_points1: 0,
                      match_points2: 0,
                      winner_alt_id: null,
                      is_bye: false,
                      start_time: null,
                      end_time: null,
                      created_at: "2024-01-01T11:00:00Z",
                      player1: [{ id: 3, username: "brock" }],
                      player2: [{ id: 4, username: "misty" }],
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "tournament_player_stats") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }

        return { select: jest.fn() };
      }),
    } as unknown as TypedClient;

    const result = await getPublicPhaseRoundsWithMatches(
      multiRoundSupabase,
      1,
      100
    );

    expect(result).toHaveLength(2);
    // Round 1 gets match id=1, round 2 gets match id=2.
    expect(result[0]!.matches).toHaveLength(1);
    expect(result[0]!.matches[0]!.id).toBe(1);
    expect(result[1]!.matches).toHaveLength(1);
    expect(result[1]!.matches[0]!.id).toBe(2);
  });
});
