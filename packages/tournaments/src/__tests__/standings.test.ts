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

describe("calculateStandings - tiebreaker cascading", () => {
  it("breaks tie using GW% when matchPoints and OMW% are equal", () => {
    // A and B both have 1 matchPt. Their opponents (C and D) both have 0 matchPts
    // so OMW% is equal (both 0.33 floor). But A won 2-0 (GW% = 1.0) while
    // B won 2-1 (GW% = 0.667). A should rank above B.
    const players = [
      createPlayer("A"),
      createPlayer("B"),
      createPlayer("C"),
      createPlayer("D"),
    ];
    const matches = [
      createMatch({
        player1Id: "A",
        player2Id: "C",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 1,
      }),
      createMatch({
        player1Id: "B",
        player2Id: "D",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 1,
      }),
    ];

    const standings = calculateStandings(players, matches);

    const standingA = standings.find((s) => s.playerId === "A")!;
    const standingB = standings.find((s) => s.playerId === "B")!;

    // Both have 1 matchPt
    expect(standingA.matchPoints).toBe(1);
    expect(standingB.matchPoints).toBe(1);

    // Both opponents have 0-1 record → MWP = 0.33 (floor), so OMW% tied
    expect(standingA.opponentMatchWinPercentage).toBeCloseTo(0.33, 2);
    expect(standingB.opponentMatchWinPercentage).toBeCloseTo(0.33, 2);

    // GW% differs: A = 2/2 = 1.0, B = 2/3 ≈ 0.667
    expect(standingA.gameWinPercentage).toBe(1.0);
    expect(standingB.gameWinPercentage).toBeCloseTo(2 / 3, 5);

    // A should rank higher than B (lower rank number)
    expect(standingA.rank).toBeLessThan(standingB.rank);
  });

  it("breaks tie using OGW% when first 3 tiebreakers are equal", () => {
    // A and B both have 1 matchPt, same GW% (2/3), same OMW% (0.5).
    // A's opponent (C) has better game record than B's opponent (D),
    // so A's OGW% > B's OGW%.
    const players = [
      createPlayer("A"),
      createPlayer("B"),
      createPlayer("C"),
      createPlayer("D"),
      createPlayer("E"),
      createPlayer("F"),
    ];
    const matches = [
      // A beats C 2-1
      createMatch({
        player1Id: "A",
        player2Id: "C",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 1,
      }),
      // B beats D 2-1
      createMatch({
        player1Id: "B",
        player2Id: "D",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 1,
      }),
      // C beats E 2-0 (gives C a better game record: 3/5 = 0.6 GW%)
      createMatch({
        player1Id: "C",
        player2Id: "E",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 2,
      }),
      // D beats F 2-1 (gives D a worse game record: 3/6 = 0.5 GW%)
      createMatch({
        player1Id: "D",
        player2Id: "F",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 2,
      }),
    ];

    const standings = calculateStandings(players, matches);

    const standingA = standings.find((s) => s.playerId === "A")!;
    const standingB = standings.find((s) => s.playerId === "B")!;

    // Same matchPoints
    expect(standingA.matchPoints).toBe(1);
    expect(standingB.matchPoints).toBe(1);

    // Same OMW%: C MWP = 1/2 = 0.5, D MWP = 1/2 = 0.5
    expect(standingA.opponentMatchWinPercentage).toBeCloseTo(0.5, 2);
    expect(standingB.opponentMatchWinPercentage).toBeCloseTo(0.5, 2);

    // Same GW%: both 2/3
    expect(standingA.gameWinPercentage).toBeCloseTo(2 / 3, 5);
    expect(standingB.gameWinPercentage).toBeCloseTo(2 / 3, 5);

    // OGW% differs: A's opponent C has GW% = 3/5 = 0.6, B's opponent D has GW% = 3/6 = 0.5
    expect(standingA.opponentGameWinPercentage).toBeCloseTo(0.6, 2);
    expect(standingB.opponentGameWinPercentage).toBeCloseTo(0.5, 2);

    // A should rank higher
    expect(standingA.rank).toBeLessThan(standingB.rank);
  });

  it("handles three-way tie resolved by GW%", () => {
    // 3 players (p1, p2, p3) each with 1 matchPt and same OMW% (0.33 floor).
    // Different game scores produce different GW%.
    const players = [
      createPlayer("p1"),
      createPlayer("p2"),
      createPlayer("p3"),
      createPlayer("opp1"),
      createPlayer("opp2"),
      createPlayer("opp3"),
    ];
    const matches = [
      // p1 beats opp1 with 2-0 → GW% = 2/2 = 1.0
      createMatch({
        player1Id: "p1",
        player2Id: "opp1",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 1,
      }),
      // p2 beats opp2 with 2-1 → GW% = 2/3 ≈ 0.667
      createMatch({
        player1Id: "p2",
        player2Id: "opp2",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 1,
      }),
      // p3 beats opp3 with 3-2 → GW% = 3/5 = 0.6
      createMatch({
        player1Id: "p3",
        player2Id: "opp3",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 3,
        player2GameWins: 2,
        roundNumber: 1,
      }),
    ];

    const standings = calculateStandings(players, matches);

    const s1 = standings.find((s) => s.playerId === "p1")!;
    const s2 = standings.find((s) => s.playerId === "p2")!;
    const s3 = standings.find((s) => s.playerId === "p3")!;

    // All have 1 matchPt, all OMW% = 0.33 (opponents all 0-1)
    expect(s1.matchPoints).toBe(1);
    expect(s2.matchPoints).toBe(1);
    expect(s3.matchPoints).toBe(1);

    // GW% ordering: p1 (1.0) > p2 (0.667) > p3 (0.6)
    expect(s1.rank).toBeLessThan(s2.rank);
    expect(s2.rank).toBeLessThan(s3.rank);
  });

  it("includes bye winner match points but excludes bye from game stats and opponents", () => {
    // A has a bye (1 matchPt) then beats B (2-1). B beats C (2-0).
    // Bye should give A match points but NOT contribute to game records or opponent list.
    const players = [createPlayer("A"), createPlayer("B"), createPlayer("C")];
    const matches = [
      // A's bye
      createMatch({
        player1Id: "A",
        player2Id: null,
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 0,
        player2GameWins: 0,
        isBye: true,
        roundNumber: 1,
      }),
      // A beats B 2-1
      createMatch({
        player1Id: "A",
        player2Id: "B",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 2,
      }),
      // B beats C 2-0
      createMatch({
        player1Id: "B",
        player2Id: "C",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 1,
      }),
    ];

    const standings = calculateStandings(players, matches);
    const standingA = standings.find((s) => s.playerId === "A")!;

    // A has 2 match points (bye + win)
    expect(standingA.matchPoints).toBe(2);
    expect(standingA.matchesPlayed).toBe(2);

    // A's game stats should only count the real match (2 wins, 3 total games)
    expect(standingA.gameWins).toBe(2);
    expect(standingA.gamePoints).toBe(3); // 2 + 1 total games
    expect(standingA.gameWinPercentage).toBeCloseTo(2 / 3, 5);

    // A's OMW% should only include B (not the bye opponent)
    // B has 1 win, 1 loss → MWP = 1/2 = 0.5
    expect(standingA.opponentMatchWinPercentage).toBeCloseTo(0.5, 2);

    // A should be rank 1
    expect(standingA.rank).toBe(1);
  });

  it("includes dropped opponent's record in OMW% calculation", () => {
    // A beats B, then B loses to C (B "drops" after going 0-2).
    // B's 0-2 record (MWP = 0.33 floor) should still count in A's OMW%.
    const players = [createPlayer("A"), createPlayer("B"), createPlayer("C")];
    const matches = [
      // A beats B 2-0
      createMatch({
        player1Id: "A",
        player2Id: "B",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 1,
      }),
      // C beats B 2-1 (B now 0-2, effectively dropped)
      createMatch({
        player1Id: "C",
        player2Id: "B",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 2,
      }),
    ];

    const standings = calculateStandings(players, matches);
    const standingA = standings.find((s) => s.playerId === "A")!;

    // A's only opponent is B. B's record: 0 wins, 2 matches.
    // B's MWP = max(0/2, 0.33) = 0.33
    // A's OMW% = 0.33
    expect(standingA.opponentMatchWinPercentage).toBeCloseTo(0.33, 2);
  });

  it("calculates correct standings for 8-player Swiss after 3 rounds", () => {
    const players = Array.from({ length: 8 }, (_, i) =>
      createPlayer(`p${i + 1}`)
    );

    const matches = [
      // Round 1
      createMatch({
        player1Id: "p1",
        player2Id: "p5",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 1,
      }),
      createMatch({
        player1Id: "p2",
        player2Id: "p6",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 1,
      }),
      createMatch({
        player1Id: "p3",
        player2Id: "p7",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 1,
      }),
      createMatch({
        player1Id: "p4",
        player2Id: "p8",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 1,
      }),
      // Round 2: 1-0 players face each other, 0-1 players face each other
      createMatch({
        player1Id: "p1",
        player2Id: "p2",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 2,
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
      createMatch({
        player1Id: "p5",
        player2Id: "p6",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 2,
      }),
      createMatch({
        player1Id: "p7",
        player2Id: "p8",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 2,
      }),
      // Round 3: 2-0 face each other, 1-1 face each other, 0-2 face each other
      createMatch({
        player1Id: "p1",
        player2Id: "p3",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 3,
      }),
      createMatch({
        player1Id: "p2",
        player2Id: "p5",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 3,
      }),
      createMatch({
        player1Id: "p4",
        player2Id: "p7",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 1,
        roundNumber: 3,
      }),
      createMatch({
        player1Id: "p6",
        player2Id: "p8",
        player1MatchPoints: 1,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
        roundNumber: 3,
      }),
    ];

    const standings = calculateStandings(players, matches);

    // Verify all 8 players have unique sequential ranks
    const ranks = standings.map((s) => s.rank).sort((a, b) => a - b);
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    // p1 went 3-0: must be rank 1
    expect(standings.find((s) => s.playerId === "p1")!.rank).toBe(1);
    expect(standings.find((s) => s.playerId === "p1")!.matchPoints).toBe(3);

    // p8 went 0-3: must be rank 8
    expect(standings.find((s) => s.playerId === "p8")!.rank).toBe(8);
    expect(standings.find((s) => s.playerId === "p8")!.matchPoints).toBe(0);

    // 2-1 players (p2, p3, p4) should be ranked 2-4
    const twoOneRanks = ["p2", "p3", "p4"].map(
      (id) => standings.find((s) => s.playerId === id)!.rank
    );
    for (const rank of twoOneRanks) {
      expect(rank).toBeGreaterThanOrEqual(2);
      expect(rank).toBeLessThanOrEqual(4);
    }

    // 1-2 players (p5, p6, p7) should be ranked 5-7
    const oneTwoRanks = ["p5", "p6", "p7"].map(
      (id) => standings.find((s) => s.playerId === id)!.rank
    );
    for (const rank of oneTwoRanks) {
      expect(rank).toBeGreaterThanOrEqual(5);
      expect(rank).toBeLessThanOrEqual(7);
    }

    // Tiebreakers should differentiate within each group (no two players share a rank)
    expect(new Set(twoOneRanks).size).toBe(3);
    expect(new Set(oneTwoRanks).size).toBe(3);
  });
});
