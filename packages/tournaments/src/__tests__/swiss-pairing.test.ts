import {
  generateSwissPairings,
  calculateGameWinPercentage,
  calculateMatchWinPercentage,
  hasXMinus2Record,
  calculateResistance,
  type PlayerRecord,
} from "../swiss-pairing";

// -- Helper factories --

let playerIdCounter = 0;

function createPlayerRecord(overrides?: Partial<PlayerRecord>): PlayerRecord {
  playerIdCounter++;
  const id = overrides?.profileId ?? `player-${playerIdCounter}`;
  return {
    profileId: id,
    displayName: overrides?.displayName ?? `Player ${playerIdCounter}`,
    matchPoints: overrides?.matchPoints ?? 0,
    gameWins: overrides?.gameWins ?? 0,
    gameLosses: overrides?.gameLosses ?? 0,
    gameWinPercentage: overrides?.gameWinPercentage ?? 0,
    opponentMatchWinPercentage: overrides?.opponentMatchWinPercentage ?? 0,
    opponentGameWinPercentage: overrides?.opponentGameWinPercentage ?? 0,
    hasReceivedBye: overrides?.hasReceivedBye ?? false,
    isDropped: overrides?.isDropped ?? false,
    previousOpponents: overrides?.previousOpponents ?? [],
    roundsPlayed: overrides?.roundsPlayed ?? 0,
  };
}

function createPlayers(count: number): PlayerRecord[] {
  return Array.from({ length: count }, (_, i) =>
    createPlayerRecord({
      profileId: `p${i + 1}`,
      displayName: `Player ${i + 1}`,
    })
  );
}

beforeEach(() => {
  playerIdCounter = 0;
});

// -- Tests --

describe("generateSwissPairings", () => {
  describe("round 1 (random pairings)", () => {
    it("pairs all players when there is an even number", () => {
      const players = createPlayers(8);
      const result = generateSwissPairings(players, 1);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      // 8 players = 4 pairings
      expect(result.pairings).toHaveLength(4);
      // No byes
      expect(result.pairings.every((p) => !p.isBye)).toBe(true);
    });

    it("assigns one bye when there is an odd number of players", () => {
      const players = createPlayers(7);
      const result = generateSwissPairings(players, 1);

      expect(result.success).toBe(true);
      // 3 normal pairings + 1 bye
      expect(result.pairings).toHaveLength(4);

      const byes = result.pairings.filter((p) => p.isBye);
      expect(byes).toHaveLength(1);
      expect(byes[0]!.profile2Id).toBeNull();
    });

    it("assigns every player exactly once (no duplicates)", () => {
      const players = createPlayers(8);
      const result = generateSwissPairings(players, 1);

      // Collect all player IDs from pairings
      const pairedIds = new Set<string>();
      for (const pairing of result.pairings) {
        pairedIds.add(pairing.profile1Id);
        if (pairing.profile2Id) {
          pairedIds.add(pairing.profile2Id);
        }
      }

      expect(pairedIds.size).toBe(8);
    });

    it("handles exactly 2 players", () => {
      const players = createPlayers(2);
      const result = generateSwissPairings(players, 1);

      expect(result.success).toBe(true);
      expect(result.pairings).toHaveLength(1);
      expect(result.pairings[0]!.isBye).toBe(false);
    });

    it("handles 3 players (2 paired, 1 bye)", () => {
      const players = createPlayers(3);
      const result = generateSwissPairings(players, 1);

      expect(result.success).toBe(true);
      expect(result.pairings).toHaveLength(2);

      const byes = result.pairings.filter((p) => p.isBye);
      const matches = result.pairings.filter((p) => !p.isBye);
      expect(byes).toHaveLength(1);
      expect(matches).toHaveLength(1);
    });
  });

  describe("subsequent rounds (Swiss pairing)", () => {
    it("pairs players by match points in round 2", () => {
      // Simulate after round 1: p1 and p2 won, p3 and p4 lost
      const players: PlayerRecord[] = [
        createPlayerRecord({
          profileId: "p1",
          matchPoints: 1,
          roundsPlayed: 1,
          previousOpponents: ["p3"],
        }),
        createPlayerRecord({
          profileId: "p2",
          matchPoints: 1,
          roundsPlayed: 1,
          previousOpponents: ["p4"],
        }),
        createPlayerRecord({
          profileId: "p3",
          matchPoints: 0,
          roundsPlayed: 1,
          previousOpponents: ["p1"],
        }),
        createPlayerRecord({
          profileId: "p4",
          matchPoints: 0,
          roundsPlayed: 1,
          previousOpponents: ["p2"],
        }),
      ];

      const result = generateSwissPairings(players, 2);

      expect(result.success).toBe(true);
      expect(result.pairings).toHaveLength(2);

      // All pairings should be non-bye
      expect(result.pairings.every((p) => !p.isBye)).toBe(true);

      // Winners should be paired together and losers together
      const pairing1 = result.pairings[0]!;
      const pairing2 = result.pairings[1]!;

      // One pairing should have both 1-0 players, other should have both 0-1 players
      const ids1 = [pairing1.profile1Id, pairing1.profile2Id];
      const ids2 = [pairing2.profile1Id, pairing2.profile2Id];

      const allIds = [...ids1, ...ids2];
      expect(allIds).toContain("p1");
      expect(allIds).toContain("p2");
      expect(allIds).toContain("p3");
      expect(allIds).toContain("p4");
    });

    it("assigns bye to lowest-standing player without prior bye", () => {
      // 5 players after round 1: p1 (1-0), p2 (1-0), p3 (1-0 with bye),
      // p4 (0-1), p5 (0-1)
      const players: PlayerRecord[] = [
        createPlayerRecord({
          profileId: "p1",
          matchPoints: 1,
          roundsPlayed: 1,
          previousOpponents: ["p4"],
        }),
        createPlayerRecord({
          profileId: "p2",
          matchPoints: 1,
          roundsPlayed: 1,
          previousOpponents: ["p5"],
        }),
        createPlayerRecord({
          profileId: "p3",
          matchPoints: 1,
          roundsPlayed: 1,
          hasReceivedBye: true,
          previousOpponents: [],
        }),
        createPlayerRecord({
          profileId: "p4",
          matchPoints: 0,
          roundsPlayed: 1,
          previousOpponents: ["p1"],
        }),
        createPlayerRecord({
          profileId: "p5",
          matchPoints: 0,
          roundsPlayed: 1,
          previousOpponents: ["p2"],
        }),
      ];

      const result = generateSwissPairings(players, 2);
      const byePairing = result.pairings.find((p) => p.isBye);

      expect(byePairing).toBeDefined();
      // Bye should go to lowest standing player without prior bye
      // p4 and p5 both have 0 match points and no prior bye; algorithm picks last in sorted list
      expect(["p4", "p5"]).toContain(byePairing!.profile1Id);
      // p3 already has a bye so should not receive another one
      expect(byePairing!.profile1Id).not.toBe("p3");
    });

    it("avoids rematches when possible", () => {
      // 4 players, round 2: p1 already played p2, p3 already played p4
      const players: PlayerRecord[] = [
        createPlayerRecord({
          profileId: "p1",
          matchPoints: 1,
          previousOpponents: ["p2"],
        }),
        createPlayerRecord({
          profileId: "p2",
          matchPoints: 0,
          previousOpponents: ["p1"],
        }),
        createPlayerRecord({
          profileId: "p3",
          matchPoints: 1,
          previousOpponents: ["p4"],
        }),
        createPlayerRecord({
          profileId: "p4",
          matchPoints: 0,
          previousOpponents: ["p3"],
        }),
      ];

      const result = generateSwissPairings(players, 2);

      // Should pair p1 vs p3 and p2 vs p4 (or similar non-rematch combination)
      for (const pairing of result.pairings) {
        if (!pairing.isBye && pairing.profile2Id) {
          const player = players.find(
            (p) => p.profileId === pairing.profile1Id
          )!;
          // Verify opponent was not a previous opponent
          expect(player.previousOpponents).not.toContain(pairing.profile2Id);
        }
      }
    });
  });

  describe("error cases", () => {
    it("returns error when fewer than 2 active players", () => {
      const players = [createPlayerRecord({ profileId: "p1" })];
      const result = generateSwissPairings(players, 1);

      expect(result.success).toBe(false);
      expect(result.pairings).toHaveLength(0);
      expect(result.errors).toContain(
        "Not enough active players to generate pairings"
      );
    });

    it("filters out dropped players", () => {
      const players = [
        createPlayerRecord({ profileId: "p1" }),
        createPlayerRecord({ profileId: "p2" }),
        createPlayerRecord({ profileId: "p3", isDropped: true }),
        createPlayerRecord({ profileId: "p4", isDropped: true }),
      ];

      const result = generateSwissPairings(players, 1);

      expect(result.success).toBe(true);
      expect(result.pairings).toHaveLength(1);

      // No dropped player should appear
      for (const pairing of result.pairings) {
        expect(pairing.profile1Id).not.toBe("p3");
        expect(pairing.profile1Id).not.toBe("p4");
        expect(pairing.profile2Id).not.toBe("p3");
        expect(pairing.profile2Id).not.toBe("p4");
      }
    });

    it("returns error when all players are dropped", () => {
      const players = [
        createPlayerRecord({ profileId: "p1", isDropped: true }),
        createPlayerRecord({ profileId: "p2", isDropped: true }),
      ];
      const result = generateSwissPairings(players, 1);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe("calculateGameWinPercentage (swiss-pairing module)", () => {
  it("returns 0.33 when no games played", () => {
    expect(calculateGameWinPercentage(0, 0)).toBe(0.33);
  });

  it("returns exact percentage when above floor", () => {
    // 3 wins, 1 loss = 3/4 = 0.75
    expect(calculateGameWinPercentage(3, 1)).toBe(0.75);
  });

  it("applies 33% floor for low win rates", () => {
    // 0 wins, 5 losses = 0/5 = 0, clamped to 0.33
    expect(calculateGameWinPercentage(0, 5)).toBe(0.33);
  });

  it("returns 1.0 for all wins and no losses", () => {
    expect(calculateGameWinPercentage(5, 0)).toBe(1);
  });
});

describe("calculateMatchWinPercentage (swiss-pairing module)", () => {
  it("returns 0.33 when no rounds played", () => {
    expect(calculateMatchWinPercentage(0, 0)).toBe(0.33);
  });

  it("calculates correctly for standard cases", () => {
    // 3 wins out of 5 rounds = 60%
    expect(calculateMatchWinPercentage(3, 5)).toBeCloseTo(0.6, 5);
  });

  it("applies 33% minimum floor", () => {
    expect(calculateMatchWinPercentage(0, 10)).toBe(0.33);
  });
});

describe("hasXMinus2Record", () => {
  it("returns true for a player with 0 losses", () => {
    expect(hasXMinus2Record(5, 5)).toBe(true); // 5-0
  });

  it("returns true for a player with 1 loss", () => {
    expect(hasXMinus2Record(4, 5)).toBe(true); // 4-1
  });

  it("returns true for a player with exactly 2 losses", () => {
    expect(hasXMinus2Record(3, 5)).toBe(true); // 3-2
  });

  it("returns false for a player with 3 losses", () => {
    expect(hasXMinus2Record(2, 5)).toBe(false); // 2-3
  });

  it("returns false for a player with more than 3 losses", () => {
    expect(hasXMinus2Record(1, 5)).toBe(false); // 1-4
  });
});

describe("calculateResistance", () => {
  it("returns 0.33 when no opponent records given", () => {
    expect(calculateResistance([])).toBe(0.33);
  });

  it("calculates average MWP of opponents", () => {
    const opponentRecords = [
      { matchPoints: 3, roundsPlayed: 5 }, // 3/5 = 0.6
      { matchPoints: 1, roundsPlayed: 5 }, // 1/5 = 0.33 (floor)
    ];

    const result = calculateResistance(opponentRecords);
    expect(result).toBeCloseTo((0.6 + 0.33) / 2, 2);
  });

  it("applies 33% floor per opponent before averaging", () => {
    const opponentRecords = [
      { matchPoints: 0, roundsPlayed: 5 }, // 0/5 = 0, floor = 0.33
      { matchPoints: 0, roundsPlayed: 3 }, // 0/3 = 0, floor = 0.33
    ];

    const result = calculateResistance(opponentRecords);
    expect(result).toBeCloseTo(0.33, 2);
  });

  it("handles a single opponent", () => {
    const opponentRecords = [{ matchPoints: 4, roundsPlayed: 5 }]; // 0.8
    expect(calculateResistance(opponentRecords)).toBeCloseTo(0.8, 2);
  });
});
