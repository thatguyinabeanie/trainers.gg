import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { getPlayerLifetimeStats } from "../tournaments";
import type { TypedClient } from "../../client";

describe("getPlayerLifetimeStats", () => {
  let mockSupabase: TypedClient;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn() as ReturnType<typeof jest.fn>,
    } as unknown as TypedClient;
  });

  const emptyStats = {
    tournamentCount: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    bestPlacement: null,
    formats: [],
  };

  it("returns zero stats when altIds is empty", async () => {
    const result = await getPlayerLifetimeStats(mockSupabase, []);
    expect(result).toEqual(emptyStats);
    // Should not call any Supabase methods
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("returns zero stats when no tournament data exists", async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });
    jest.mocked(mockSupabase.from).mockImplementation(mockFrom);

    const result = await getPlayerLifetimeStats(mockSupabase, [1, 2]);
    expect(result).toEqual(emptyStats);
    expect(mockFrom).toHaveBeenCalledWith("tournament_player_stats");
  });

  it("aggregates stats across multiple tournaments", async () => {
    const mockData = [
      {
        tournament_id: 100,
        alt_id: 1,
        match_wins: 5,
        match_losses: 1,
        final_ranking: 2,
        tournament: { format: "VGC 2024 Reg G" },
      },
      {
        tournament_id: 101,
        alt_id: 1,
        match_wins: 3,
        match_losses: 2,
        final_ranking: 5,
        tournament: { format: "VGC 2024 Reg G" },
      },
      {
        tournament_id: 102,
        alt_id: 2,
        match_wins: 4,
        match_losses: 0,
        final_ranking: 1,
        tournament: { format: "VGC 2025 Reg A" },
      },
      {
        tournament_id: 103,
        alt_id: 1,
        match_wins: 2,
        match_losses: 3,
        final_ranking: null,
        tournament: { format: "VGC 2025 Reg A" },
      },
    ];

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
    });
    jest.mocked(mockSupabase.from).mockImplementation(mockFrom);

    const result = await getPlayerLifetimeStats(mockSupabase, [1, 2]);

    expect(result.tournamentCount).toBe(4);
    expect(result.totalWins).toBe(14); // 5 + 3 + 4 + 2
    expect(result.totalLosses).toBe(6); // 1 + 2 + 0 + 3
    expect(result.winRate).toBe(70); // 14 / 20 * 100
    expect(result.bestPlacement).toBe(1); // lowest non-null final_ranking
    expect(result.formats).toEqual(
      expect.arrayContaining(["VGC 2024 Reg G", "VGC 2025 Reg A"])
    );
    expect(result.formats).toHaveLength(2);
  });
});
