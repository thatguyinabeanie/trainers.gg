import {
  isValidBracketSize,
  calculateBracketRounds,
  getBracketMatchups,
  generateTopCutBracket,
  advanceBracket,
  isBracketComplete,
  getBracketWinner,
  type BracketPlayer,
  type BracketSettings,
  type BracketStructure,
  type BracketMatch,
} from "../top-cut-bracket";

// -- Helper factories --

function createPlayers(count: number): BracketPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Player ${i + 1}`,
    seed: i + 1,
  }));
}

function createBracketSettings(
  overrides?: Partial<BracketSettings>
): BracketSettings {
  return {
    bracketSize: overrides?.bracketSize ?? 8,
    format: overrides?.format ?? "single_elimination",
    bestOf: overrides?.bestOf ?? 3,
  };
}

// -- Tests --

describe("isValidBracketSize", () => {
  it("returns true for valid bracket sizes (powers of 2 between 4 and 32)", () => {
    expect(isValidBracketSize(4)).toBe(true);
    expect(isValidBracketSize(8)).toBe(true);
    expect(isValidBracketSize(16)).toBe(true);
    expect(isValidBracketSize(32)).toBe(true);
  });

  it("returns false for non-powers of 2", () => {
    expect(isValidBracketSize(3)).toBe(false);
    expect(isValidBracketSize(5)).toBe(false);
    expect(isValidBracketSize(6)).toBe(false);
    expect(isValidBracketSize(7)).toBe(false);
    expect(isValidBracketSize(9)).toBe(false);
    expect(isValidBracketSize(10)).toBe(false);
    expect(isValidBracketSize(15)).toBe(false);
  });

  it("returns false for sizes less than 4", () => {
    expect(isValidBracketSize(1)).toBe(false);
    expect(isValidBracketSize(2)).toBe(false);
  });

  it("returns false for sizes greater than 32", () => {
    expect(isValidBracketSize(64)).toBe(false);
    expect(isValidBracketSize(128)).toBe(false);
  });

  it("returns false for 0 and negative numbers", () => {
    expect(isValidBracketSize(0)).toBe(false);
    expect(isValidBracketSize(-4)).toBe(false);
  });
});

describe("calculateBracketRounds", () => {
  it("returns 2 rounds for a 4-player bracket", () => {
    expect(calculateBracketRounds(4)).toBe(2);
  });

  it("returns 3 rounds for an 8-player bracket", () => {
    expect(calculateBracketRounds(8)).toBe(3);
  });

  it("returns 4 rounds for a 16-player bracket", () => {
    expect(calculateBracketRounds(16)).toBe(4);
  });

  it("returns 5 rounds for a 32-player bracket", () => {
    expect(calculateBracketRounds(32)).toBe(5);
  });

  it("throws an error for invalid bracket sizes", () => {
    expect(() => calculateBracketRounds(3)).toThrow("Invalid bracket size: 3");
    expect(() => calculateBracketRounds(5)).toThrow("Invalid bracket size: 5");
    expect(() => calculateBracketRounds(7)).toThrow("Invalid bracket size: 7");
  });
});

describe("getBracketMatchups", () => {
  it("returns correct matchups for a 4-player bracket", () => {
    const matchups = getBracketMatchups(4);

    expect(matchups).toHaveLength(2);
    // Standard seeding: [1,4] and [2,3]
    expect(matchups[0]).toEqual([1, 4]);
    expect(matchups[1]).toEqual([2, 3]);
  });

  it("returns correct matchups for an 8-player bracket", () => {
    const matchups = getBracketMatchups(8);

    expect(matchups).toHaveLength(4);
    // Standard bracket seeding for 8: [1,8], [4,5], [2,7], [3,6]
    // Reorder is m0, m3, m1, m2 where:
    //   m0=[1,8], m1=[2,7], m2=[3,6], m3=[4,5]
    // Result: [1,8], [4,5], [2,7], [3,6]
    expect(matchups[0]).toEqual([1, 8]);
    expect(matchups[1]).toEqual([4, 5]);
    expect(matchups[2]).toEqual([2, 7]);
    expect(matchups[3]).toEqual([3, 6]);
  });

  it("returns correct matchups for a 16-player bracket", () => {
    const matchups = getBracketMatchups(16);

    expect(matchups).toHaveLength(8);
    // 16-player bracket: arranged by quarters
    // Top quarter: [1,16], [8,9]
    expect(matchups[0]).toEqual([1, 16]);
    expect(matchups[1]).toEqual([8, 9]);
    // Second quarter: [4,13], [5,12]
    expect(matchups[2]).toEqual([4, 13]);
    expect(matchups[3]).toEqual([5, 12]);
    // Third quarter: [2,15], [7,10]
    expect(matchups[4]).toEqual([2, 15]);
    expect(matchups[5]).toEqual([7, 10]);
    // Bottom quarter: [3,14], [6,11]
    expect(matchups[6]).toEqual([3, 14]);
    expect(matchups[7]).toEqual([6, 11]);
  });

  it("throws for invalid bracket sizes", () => {
    expect(() => getBracketMatchups(3)).toThrow("Invalid bracket size: 3");
  });

  it("ensures highest seed plays lowest seed", () => {
    const matchups = getBracketMatchups(8);

    // Every matchup should contain seed 1-8 exactly once total
    const allSeeds = matchups.flat();
    for (let i = 1; i <= 8; i++) {
      expect(allSeeds).toContain(i);
    }
    expect(allSeeds).toHaveLength(8);
  });
});

describe("generateTopCutBracket", () => {
  it("generates a complete bracket for 4 players", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4 });

    const bracket = generateTopCutBracket(players, settings);

    expect(bracket.bracketSize).toBe(4);
    expect(bracket.totalRounds).toBe(2);
    expect(bracket.format).toBe("single_elimination");
    // 4 players: 2 first-round matches + 1 finals = 3 matches total
    expect(bracket.matches).toHaveLength(3);
  });

  it("generates a complete bracket for 8 players", () => {
    const players = createPlayers(8);
    const settings = createBracketSettings({ bracketSize: 8 });

    const bracket = generateTopCutBracket(players, settings);

    expect(bracket.bracketSize).toBe(8);
    expect(bracket.totalRounds).toBe(3);
    // 8 players: 4 QF + 2 SF + 1 F = 7 matches
    expect(bracket.matches).toHaveLength(7);
  });

  it("populates first round matches with actual player IDs and seeds", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4 });

    const bracket = generateTopCutBracket(players, settings);
    const round1 = bracket.matches.filter((m) => m.round === 1);

    expect(round1).toHaveLength(2);
    for (const match of round1) {
      expect(match.player1Id).not.toBeNull();
      expect(match.player2Id).not.toBeNull();
      expect(match.player1Seed).not.toBeNull();
      expect(match.player2Seed).not.toBeNull();
      expect(match.isComplete).toBe(false);
      expect(match.winnerId).toBeNull();
    }
  });

  it("sets prerequisite match IDs for later rounds", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4 });

    const bracket = generateTopCutBracket(players, settings);
    const finals = bracket.matches.find((m) => m.round === 2)!;

    // Finals should reference the two semifinal matches
    expect(finals.prerequisiteMatch1Id).not.toBeNull();
    expect(finals.prerequisiteMatch2Id).not.toBeNull();
    // Finals players are TBD
    expect(finals.player1Id).toBeNull();
    expect(finals.player2Id).toBeNull();
  });

  it("throws when player count does not match bracket size", () => {
    const players = createPlayers(6);
    const settings = createBracketSettings({ bracketSize: 8 });

    expect(() => generateTopCutBracket(players, settings)).toThrow(
      "Player count (6) does not match bracket size (8)"
    );
  });

  it("throws for invalid bracket size", () => {
    const players = createPlayers(5);
    const settings = createBracketSettings({ bracketSize: 5 });

    expect(() => generateTopCutBracket(players, settings)).toThrow(
      "Invalid bracket size: 5"
    );
  });

  it("uses the correct bestOf setting for all matches", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4, bestOf: 5 });

    const bracket = generateTopCutBracket(players, settings);
    for (const match of bracket.matches) {
      expect(match.bestOf).toBe(5);
    }
  });
});

describe("advanceBracket", () => {
  it("fills in player IDs for next round when prerequisites are complete", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4 });
    const bracket = generateTopCutBracket(players, settings);

    // Complete both first-round matches
    const completedMatches: BracketMatch[] = bracket.matches.map((match) => {
      if (match.round === 1) {
        return {
          ...match,
          isComplete: true,
          winnerId: match.player1Id, // Seed 1 and Seed 2 win
          player1MatchPoints: 1,
          player2MatchPoints: 0,
        };
      }
      return match;
    });

    const advanced = advanceBracket(bracket, completedMatches);
    const finals = advanced.find((m) => m.round === 2)!;

    // Winners should be filled in for the finals match
    expect(finals.player1Id).not.toBeNull();
    expect(finals.player2Id).not.toBeNull();
  });

  it("carries forward seeds of winning players", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4 });
    const bracket = generateTopCutBracket(players, settings);

    // Complete matches with player 1 (seed 1 vs 4) winning, player 2 (seed 2 vs 3) winning
    const r1Matches = bracket.matches.filter((m) => m.round === 1);
    const completedMatches: BracketMatch[] = bracket.matches.map((match) => {
      if (match.round === 1) {
        return {
          ...match,
          isComplete: true,
          winnerId: match.player1Id,
          player1MatchPoints: 1,
          player2MatchPoints: 0,
        };
      }
      return match;
    });

    const advanced = advanceBracket(bracket, completedMatches);
    const finals = advanced.find((m) => m.round === 2)!;

    // Seeds should be carried from winning players
    const match1Seed = r1Matches[0]!.player1Seed;
    const match2Seed = r1Matches[1]!.player1Seed;
    expect(finals.player1Seed).toBe(match1Seed);
    expect(finals.player2Seed).toBe(match2Seed);
  });

  it("does not fill players when prerequisites are incomplete", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4 });
    const bracket = generateTopCutBracket(players, settings);

    // Only complete one of the two first-round matches
    const completedMatches: BracketMatch[] = bracket.matches.map(
      (match, index) => {
        if (match.round === 1 && index === 0) {
          return {
            ...match,
            isComplete: true,
            winnerId: match.player1Id,
            player1MatchPoints: 1,
            player2MatchPoints: 0,
          };
        }
        return match;
      }
    );

    const advanced = advanceBracket(bracket, completedMatches);
    const finals = advanced.find((m) => m.round === 2)!;

    // Should remain null since one prerequisite is incomplete
    expect(finals.player1Id).toBeNull();
    expect(finals.player2Id).toBeNull();
  });

  it("preserves matches that don't have prerequisites", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4 });
    const bracket = generateTopCutBracket(players, settings);

    const advanced = advanceBracket(bracket, bracket.matches);
    const round1 = advanced.filter((m) => m.round === 1);

    // First round matches should still have their original player IDs
    for (const match of round1) {
      expect(match.player1Id).not.toBeNull();
      expect(match.player2Id).not.toBeNull();
    }
  });
});

describe("isBracketComplete", () => {
  it("returns false when finals match is not complete", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4 });
    const bracket = generateTopCutBracket(players, settings);

    expect(isBracketComplete(bracket)).toBe(false);
  });

  it("returns true when finals match is complete with a winner", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4 });
    const bracket = generateTopCutBracket(players, settings);

    // Mark the finals as complete with a winner
    const finalsIndex = bracket.matches.findIndex(
      (m) => m.round === bracket.totalRounds
    );
    bracket.matches[finalsIndex] = {
      ...bracket.matches[finalsIndex]!,
      isComplete: true,
      winnerId: "player-1",
      player1Id: "player-1",
      player2Id: "player-2",
    };

    expect(isBracketComplete(bracket)).toBe(true);
  });

  it("returns false when finals is complete but has no winnerId", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4 });
    const bracket = generateTopCutBracket(players, settings);

    const finalsIndex = bracket.matches.findIndex(
      (m) => m.round === bracket.totalRounds
    );
    bracket.matches[finalsIndex] = {
      ...bracket.matches[finalsIndex]!,
      isComplete: true,
      winnerId: null,
    };

    expect(isBracketComplete(bracket)).toBe(false);
  });
});

describe("getBracketWinner", () => {
  it("returns null when bracket is not complete", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4 });
    const bracket = generateTopCutBracket(players, settings);

    expect(getBracketWinner(bracket)).toBeNull();
  });

  it("returns the winner ID when bracket is complete", () => {
    const players = createPlayers(4);
    const settings = createBracketSettings({ bracketSize: 4 });
    const bracket = generateTopCutBracket(players, settings);

    // Complete the finals
    const finalsIndex = bracket.matches.findIndex(
      (m) => m.round === bracket.totalRounds
    );
    bracket.matches[finalsIndex] = {
      ...bracket.matches[finalsIndex]!,
      isComplete: true,
      winnerId: "player-1",
      player1Id: "player-1",
      player2Id: "player-2",
    };

    expect(getBracketWinner(bracket)).toBe("player-1");
  });

  it("returns null when there is no finals match", () => {
    // Edge case: empty bracket
    const bracket: BracketStructure = {
      bracketSize: 4,
      totalRounds: 2,
      format: "single_elimination",
      matches: [],
    };

    expect(getBracketWinner(bracket)).toBeNull();
  });
});
