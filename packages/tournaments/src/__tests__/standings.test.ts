import {
  calculateMatchWinPercentage,
  calculateGameWinPercentage,
  calculateOpponentMatchWinPercentage,
  calculateOpponentGameWinPercentage,
  calculateStandings,
  type Player,
  type MatchResult,
} from "../standings";

// -- Helper factories --

let matchIdCounter = 0;

function createPlayer(id: string, name?: string): Player {
  return { id, name: name ?? `Player ${id}` };
}

function createMatch(
  overrides: Partial<MatchResult> & {
    player1Id: string;
    player2Id: string | null;
  }
): MatchResult {
  matchIdCounter++;
  return {
    id: overrides.id ?? `match-${matchIdCounter}`,
    roundNumber: overrides.roundNumber ?? 1,
    player1Id: overrides.player1Id,
    player2Id: overrides.player2Id,
    player1MatchPoints: overrides.player1MatchPoints ?? 0,
    player2MatchPoints: overrides.player2MatchPoints ?? 0,
    player1GameWins: overrides.player1GameWins ?? 0,
    player2GameWins: overrides.player2GameWins ?? 0,
    isBye: overrides.isBye ?? false,
  };
}

beforeEach(() => {
  matchIdCounter = 0;
});

// -- Tests --

describe("calculateMatchWinPercentage", () => {
  it("returns 0.5 when matchesPlayed is 0", () => {
    // Default for players with no matches
    expect(calculateMatchWinPercentage(0, 0)).toBe(0.5);
  });

  it("returns exact percentage when above 33% floor", () => {
    // 2 wins out of 3 matches = 66.67%
    expect(calculateMatchWinPercentage(2, 3)).toBeCloseTo(2 / 3, 5);
  });

  it("returns 1.0 for a player who won all matches", () => {
    expect(calculateMatchWinPercentage(5, 5)).toBe(1);
  });

  it("applies the 33% minimum floor when below threshold", () => {
    // 0 wins out of 5 matches = 0%, should be clamped to 33%
    expect(calculateMatchWinPercentage(0, 5)).toBe(0.33);
  });

  it("returns exactly 0.33 when computed percentage equals 0.33", () => {
    // 1 out of 3 = 0.333... which is above 0.33 so it passes through
    const result = calculateMatchWinPercentage(1, 3);
    expect(result).toBeCloseTo(1 / 3, 5);
    expect(result).toBeGreaterThanOrEqual(0.33);
  });

  it("returns 0.33 for 1 win out of 10 matches (10%)", () => {
    expect(calculateMatchWinPercentage(1, 10)).toBe(0.33);
  });
});

describe("calculateGameWinPercentage", () => {
  it("returns 0.5 when totalGames is 0", () => {
    // Default for players with no games
    expect(calculateGameWinPercentage(0, 0)).toBe(0.5);
  });

  it("returns exact percentage when above 33% floor", () => {
    // 4 wins out of 6 games = 66.67%
    expect(calculateGameWinPercentage(4, 6)).toBeCloseTo(4 / 6, 5);
  });

  it("applies 33% minimum floor when below threshold", () => {
    // 0 wins out of 6 games = 0%, clamped to 33%
    expect(calculateGameWinPercentage(0, 6)).toBe(0.33);
  });

  it("returns 1.0 for a player who won all games", () => {
    expect(calculateGameWinPercentage(6, 6)).toBe(1);
  });
});

describe("calculateOpponentMatchWinPercentage", () => {
  it("returns 0.5 when the player has no opponents (no matches)", () => {
    expect(calculateOpponentMatchWinPercentage("p1", [], [])).toBe(0.5);
  });

  it("returns 0.5 when the player only has bye matches", () => {
    const byeMatch = createMatch({
      player1Id: "p1",
      player2Id: null,
      player1MatchPoints: 1,
      player2MatchPoints: 0,
      isBye: true,
    });
    expect(
      calculateOpponentMatchWinPercentage("p1", [byeMatch], [byeMatch])
    ).toBe(0.5);
  });

  it("calculates OMW% from opponents' records", () => {
    // p1 beat p2. p2 has 0-1 record (floor 0.33 OMW).
    const match = createMatch({
      player1Id: "p1",
      player2Id: "p2",
      player1MatchPoints: 1,
      player2MatchPoints: 0,
      player1GameWins: 2,
      player2GameWins: 1,
    });

    const result = calculateOpponentMatchWinPercentage("p1", [match], [match]);
    // p2's MWP is max(0/1, 0.33) = 0.33
    expect(result).toBeCloseTo(0.33, 2);
  });

  it("averages across multiple opponents", () => {
    // p1 played p2 (round 1) and p3 (round 2)
    // p2 went 0-1 (MWP = 0.33), p3 went 1-1 (MWP = 0.5)
    const match1 = createMatch({
      player1Id: "p1",
      player2Id: "p2",
      player1MatchPoints: 1,
      player2MatchPoints: 0,
      roundNumber: 1,
    });
    const match2 = createMatch({
      player1Id: "p1",
      player2Id: "p3",
      player1MatchPoints: 1,
      player2MatchPoints: 0,
      roundNumber: 2,
    });
    // p3 also beat p4 so p3 has 1 win 1 loss
    const match3 = createMatch({
      player1Id: "p3",
      player2Id: "p4",
      player1MatchPoints: 1,
      player2MatchPoints: 0,
      roundNumber: 1,
    });

    const allMatches = [match1, match2, match3];
    const p1Matches = [match1, match2];

    const result = calculateOpponentMatchWinPercentage(
      "p1",
      p1Matches,
      allMatches
    );
    // p2 MWP = max(0/1, 0.33) = 0.33
    // p3 MWP = max(1/2, 0.33) = 0.5
    // Average = (0.33 + 0.5) / 2 = 0.415
    expect(result).toBeCloseTo((0.33 + 0.5) / 2, 2);
  });
});

describe("calculateOpponentGameWinPercentage", () => {
  it("returns 0.5 when the player has no opponents", () => {
    expect(calculateOpponentGameWinPercentage("p1", [], [])).toBe(0.5);
  });

  it("calculates OGW% from opponents' game records", () => {
    const match = createMatch({
      player1Id: "p1",
      player2Id: "p2",
      player1MatchPoints: 1,
      player2MatchPoints: 0,
      player1GameWins: 2,
      player2GameWins: 1,
    });

    const result = calculateOpponentGameWinPercentage("p1", [match], [match]);
    // p2's GWP = max(1/3, 0.33) = 0.333...
    expect(result).toBeCloseTo(1 / 3, 2);
  });
});

describe("calculateStandings", () => {
  it("returns empty array when no players are given", () => {
    expect(calculateStandings([], [])).toEqual([]);
  });

  it("ranks a single player with rank 1", () => {
    const players = [createPlayer("p1")];
    const standings = calculateStandings(players, []);
    expect(standings).toHaveLength(1);
    expect(standings[0]!.rank).toBe(1);
    expect(standings[0]!.playerId).toBe("p1");
  });

  it("sorts by match points descending as primary tiebreaker", () => {
    const players = [
      createPlayer("p1"),
      createPlayer("p2"),
      createPlayer("p3"),
    ];
    // p1 beats p2, p3 beats p1 (round 2), p2 beats p3 (round 2)
    // Actually let's keep it simple: p1 has 2 wins, p2 has 1 win, p3 has 0 wins
    const matches = [
      createMatch({
        player1Id: "p1",
        player2Id: "p2",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 1,
      }),
      createMatch({
        player1Id: "p1",
        player2Id: "p3",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 2,
      }),
      createMatch({
        player1Id: "p2",
        player2Id: "p3",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 2,
      }),
    ];

    const standings = calculateStandings(players, matches);

    // p1: 2 match points (rank 1)
    // p2: 1 match point  (rank 2)
    // p3: 0 match points (rank 3)
    expect(standings[0]!.playerId).toBe("p1");
    expect(standings[0]!.matchPoints).toBe(2);
    expect(standings[0]!.rank).toBe(1);

    expect(standings[1]!.playerId).toBe("p2");
    expect(standings[1]!.matchPoints).toBe(1);
    expect(standings[1]!.rank).toBe(2);

    expect(standings[2]!.playerId).toBe("p3");
    expect(standings[2]!.matchPoints).toBe(0);
    expect(standings[2]!.rank).toBe(3);
  });

  it("uses OMW% as secondary tiebreaker when match points are equal", () => {
    // 4 players: p1 beat p3, p2 beat p4
    // p3 beat p4 (so p3 has 1-1, p4 has 0-2)
    // p1 and p2 both have 1 win but p1 beat p3 (who has 1 win) while p2 beat p4 (who has 0 wins)
    // So p1's OMW% > p2's OMW%
    const players = [
      createPlayer("p1"),
      createPlayer("p2"),
      createPlayer("p3"),
      createPlayer("p4"),
    ];

    const matches = [
      createMatch({
        player1Id: "p1",
        player2Id: "p3",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 1,
      }),
      createMatch({
        player1Id: "p2",
        player2Id: "p4",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 1,
      }),
      createMatch({
        player1Id: "p3",
        player2Id: "p4",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 2,
      }),
    ];

    const standings = calculateStandings(players, matches);

    // p1 and p2 each have 1 match point
    // p1's opponent p3 has 1/2 = 0.5 MWP
    // p2's opponent p4 has 0/2 = 0.33 MWP (floor)
    // So p1 should rank higher than p2
    const p1Standing = standings.find((s) => s.playerId === "p1")!;
    const p2Standing = standings.find((s) => s.playerId === "p2")!;
    expect(p1Standing.rank).toBeLessThan(p2Standing.rank);
  });

  it("assigns sequential ranks starting from 1", () => {
    const players = [
      createPlayer("p1"),
      createPlayer("p2"),
      createPlayer("p3"),
      createPlayer("p4"),
    ];
    const standings = calculateStandings(players, []);
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 3, 4]);
  });

  it("populates all standing fields correctly for a player with matches", () => {
    const players = [createPlayer("p1"), createPlayer("p2")];
    const matches = [
      createMatch({
        player1Id: "p1",
        player2Id: "p2",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
      }),
    ];

    const standings = calculateStandings(players, matches);
    const p1 = standings.find((s) => s.playerId === "p1")!;

    expect(p1.matchPoints).toBe(1);
    expect(p1.matchesPlayed).toBe(1);
    expect(p1.matchWinPercentage).toBe(1); // 1/1 = 100%
    expect(p1.gameWins).toBe(2);
    expect(p1.gamePoints).toBe(3); // total games = 2 + 1
    expect(p1.gameWinPercentage).toBeCloseTo(2 / 3, 5);
    expect(p1.playerName).toBe("Player p1");
  });

  it("handles players with zero matches (0 match points, default percentages)", () => {
    const players = [createPlayer("p1")];
    const standings = calculateStandings(players, []);

    expect(standings[0]!.matchPoints).toBe(0);
    expect(standings[0]!.matchesPlayed).toBe(0);
    // With 0 matches played, MWP defaults to 0.5
    expect(standings[0]!.matchWinPercentage).toBe(0.5);
    // With 0 games, GWP defaults to 0.5
    expect(standings[0]!.gameWinPercentage).toBe(0.5);
    // With no opponents, OMW and OGW default to 0.5
    expect(standings[0]!.opponentMatchWinPercentage).toBe(0.5);
    expect(standings[0]!.opponentGameWinPercentage).toBe(0.5);
  });
});
