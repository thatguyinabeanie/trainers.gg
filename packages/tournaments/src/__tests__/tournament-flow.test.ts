import {
  canStartNextRound,
  canAdvanceToTopCut,
  getNextRoundNumber,
  calculateRequiredRounds,
  generateNextRound,
  generateSwissRound,
  advanceToTopCut,
  isTournamentComplete,
  processPlayerDrops,
  hasSufficientParticipants,
  getActivePlayersCount,
  type TournamentSettings,
  type TournamentMatch,
  type TournamentPlayer,
  type TournamentDrop,
  type TournamentState,
} from "../tournament-flow";
import type { DropRequest } from "../drop-bye-handling";

// -- Helper factories --

function createTournamentSettings(
  overrides?: Partial<TournamentSettings>
): TournamentSettings {
  return {
    id: overrides?.id ?? "tournament-1",
    maxParticipants: overrides?.maxParticipants ?? 32,
    topCutSize: overrides?.topCutSize ?? 8,
    swissRounds: overrides?.swissRounds ?? 5,
    format: overrides?.format ?? "swiss_with_cut",
    roundTimeMinutes: overrides?.roundTimeMinutes ?? 50,
    bestOf: overrides?.bestOf ?? 3,
  };
}

function createTournamentPlayer(
  overrides?: Partial<TournamentPlayer>
): TournamentPlayer {
  return {
    id: overrides?.id ?? "player-1",
    name: overrides?.name ?? "Player 1",
  };
}

function createTournamentMatch(
  overrides?: Partial<TournamentMatch>
): TournamentMatch {
  return {
    id: overrides?.id ?? "1-1",
    roundNumber: overrides?.roundNumber ?? 1,
    player1Id: overrides?.player1Id ?? "p1",
    player2Id: overrides?.player2Id ?? "p2",
    player1MatchPoints: overrides?.player1MatchPoints ?? 0,
    player2MatchPoints: overrides?.player2MatchPoints ?? 0,
    player1GameWins: overrides?.player1GameWins ?? 0,
    player2GameWins: overrides?.player2GameWins ?? 0,
    isBye: overrides?.isBye ?? false,
    isComplete: overrides?.isComplete ?? false,
  };
}

function createTournamentDrop(
  overrides?: Partial<TournamentDrop>
): TournamentDrop {
  return {
    tournamentId: overrides?.tournamentId ?? "tournament-1",
    profileId: overrides?.profileId ?? "p1",
    roundNumber: overrides?.roundNumber ?? 1,
  };
}

function createTournamentState(
  overrides?: Partial<TournamentState>
): TournamentState {
  return {
    currentRound: overrides?.currentRound ?? 0,
    phase: overrides?.phase ?? "swiss",
    players: overrides?.players ?? [],
    matches: overrides?.matches ?? [],
    drops: overrides?.drops ?? [],
    bracket: overrides?.bracket,
  };
}

function createPlayers(count: number): TournamentPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
  }));
}

function createDropRequest(overrides?: Partial<DropRequest>): DropRequest {
  return {
    playerId: overrides?.playerId ?? "p1",
    tournamentId: overrides?.tournamentId ?? "tournament-1",
    roundNumber: overrides?.roundNumber ?? 1,
    reason: overrides?.reason,
    droppedAt: overrides?.droppedAt ?? new Date(),
  };
}

// -- Tests --

describe("canStartNextRound", () => {
  it("returns false if tournament is completed", () => {
    const state = createTournamentState({
      phase: "completed",
      currentRound: 5,
    });

    expect(canStartNextRound(state)).toBe(false);
  });

  it("returns true if no matches exist for current round", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 0,
      matches: [],
    });

    expect(canStartNextRound(state)).toBe(true);
  });

  it("returns true if all Swiss matches in current round are complete", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 1,
      matches: [
        createTournamentMatch({
          id: "1-1",
          roundNumber: 1,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "1-2",
          roundNumber: 1,
          isComplete: true,
        }),
      ],
    });

    expect(canStartNextRound(state)).toBe(true);
  });

  it("returns false if any Swiss match in current round is incomplete", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 1,
      matches: [
        createTournamentMatch({
          id: "1-1",
          roundNumber: 1,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "1-2",
          roundNumber: 1,
          isComplete: false, // Incomplete
        }),
      ],
    });

    expect(canStartNextRound(state)).toBe(false);
  });

  it("returns true for top cut phase with currentRound = 0 (first round)", () => {
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 0,
      matches: [],
    });

    expect(canStartNextRound(state)).toBe(true);
  });

  it("returns true if no top cut matches exist for current round", () => {
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 1,
      matches: [],
    });

    expect(canStartNextRound(state)).toBe(true);
  });

  it("returns true if all top cut matches in current round are complete", () => {
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 1,
      matches: [
        createTournamentMatch({
          id: "topcut-r1-m1",
          roundNumber: 1,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "topcut-r1-m2",
          roundNumber: 1,
          isComplete: true,
        }),
      ],
    });

    expect(canStartNextRound(state)).toBe(true);
  });

  it("returns false if any top cut match in current round is incomplete", () => {
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 1,
      matches: [
        createTournamentMatch({
          id: "topcut-r1-m1",
          roundNumber: 1,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "topcut-r1-m2",
          roundNumber: 1,
          isComplete: false, // Incomplete
        }),
      ],
    });

    expect(canStartNextRound(state)).toBe(false);
  });

  it("ignores Swiss matches when in top cut phase", () => {
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 1,
      matches: [
        // Old Swiss matches (should be ignored)
        createTournamentMatch({
          id: "1-1",
          roundNumber: 1,
          isComplete: false,
        }),
        // Current top cut matches (should be checked)
        createTournamentMatch({
          id: "topcut-r1-m1",
          roundNumber: 1,
          isComplete: true,
        }),
      ],
    });

    expect(canStartNextRound(state)).toBe(true);
  });
});

describe("canAdvanceToTopCut", () => {
  it("returns true when Swiss phase is complete and format includes top cut", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 5,
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 5,
    });

    expect(canAdvanceToTopCut(state, settings)).toBe(true);
  });

  it("returns false if not in Swiss phase", () => {
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 1,
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 5,
    });

    expect(canAdvanceToTopCut(state, settings)).toBe(false);
  });

  it("returns false if format is swiss_only", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 5,
    });
    const settings = createTournamentSettings({
      format: "swiss_only",
      swissRounds: 5,
    });

    expect(canAdvanceToTopCut(state, settings)).toBe(false);
  });

  it("returns false if format is single_elimination", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 5,
    });
    const settings = createTournamentSettings({
      format: "single_elimination",
      swissRounds: 0,
    });

    expect(canAdvanceToTopCut(state, settings)).toBe(false);
  });

  it("returns false if Swiss rounds are not complete", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 3,
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 5,
    });

    expect(canAdvanceToTopCut(state, settings)).toBe(false);
  });

  it("returns true if more Swiss rounds have been played than required", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 6,
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 5,
    });

    expect(canAdvanceToTopCut(state, settings)).toBe(true);
  });
});

describe("getNextRoundNumber", () => {
  it("increments round number for Swiss phase", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 3,
    });

    expect(getNextRoundNumber(state)).toBe(4);
  });

  it("increments round number for top cut phase", () => {
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 1,
    });

    expect(getNextRoundNumber(state)).toBe(2);
  });

  it("returns 1 when currentRound is 0 in Swiss phase", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 0,
    });

    expect(getNextRoundNumber(state)).toBe(1);
  });

  it("returns 1 when currentRound is 0 in top cut phase", () => {
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 0,
    });

    expect(getNextRoundNumber(state)).toBe(1);
  });

  it("throws error for completed tournament", () => {
    const state = createTournamentState({
      phase: "completed",
      currentRound: 5,
    });

    expect(() => getNextRoundNumber(state)).toThrow(
      "Cannot determine next round number for completed tournament"
    );
  });
});

describe("calculateRequiredRounds", () => {
  it("returns 3 rounds for 8 players or fewer", () => {
    expect(calculateRequiredRounds(4)).toBe(3);
    expect(calculateRequiredRounds(6)).toBe(3);
    expect(calculateRequiredRounds(8)).toBe(3);
  });

  it("returns ceil(log2(n)) for more than 8 players", () => {
    expect(calculateRequiredRounds(9)).toBe(4); // ceil(log2(9)) = ceil(3.17) = 4
    expect(calculateRequiredRounds(16)).toBe(4); // ceil(log2(16)) = ceil(4) = 4
    expect(calculateRequiredRounds(17)).toBe(5); // ceil(log2(17)) = ceil(4.09) = 5
    expect(calculateRequiredRounds(32)).toBe(5); // ceil(log2(32)) = ceil(5) = 5
    expect(calculateRequiredRounds(33)).toBe(6); // ceil(log2(33)) = ceil(5.04) = 6
    expect(calculateRequiredRounds(64)).toBe(6); // ceil(log2(64)) = ceil(6) = 6
  });

  it("handles edge cases correctly", () => {
    expect(calculateRequiredRounds(1)).toBe(3); // Minimum 3 rounds
    expect(calculateRequiredRounds(2)).toBe(3); // Minimum 3 rounds
    expect(calculateRequiredRounds(128)).toBe(7); // ceil(log2(128)) = 7
  });
});

describe("generateNextRound", () => {
  it("throws error if previous round is not complete", async () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 1,
      players: createPlayers(8),
      matches: [
        createTournamentMatch({
          id: "1-1",
          roundNumber: 1,
          isComplete: false,
        }),
      ],
    });
    const settings = createTournamentSettings();

    await expect(generateNextRound(state, settings)).rejects.toThrow(
      "Cannot start next round: previous round is not complete"
    );
  });

  it("throws error for completed tournament", async () => {
    const state = createTournamentState({
      phase: "completed",
      currentRound: 5,
    });
    const settings = createTournamentSettings();

    await expect(generateNextRound(state, settings)).rejects.toThrow(
      "Cannot start next round: previous round is not complete"
    );
  });

  it("generates Swiss round when in Swiss phase", async () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 0,
      players: createPlayers(8),
      matches: [],
    });
    const settings = createTournamentSettings();

    const result = await generateNextRound(state, settings);

    expect(result.phase).toBe("swiss");
    expect(result.roundNumber).toBe(1);
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it("generates top cut round when in top cut phase", async () => {
    const players = createPlayers(8);
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 0,
      players,
      matches: [],
      bracket: {
        bracketSize: 8,
        totalRounds: 3,
        format: "single_elimination",
      },
    });
    const settings = createTournamentSettings();

    const result = await generateNextRound(state, settings);

    expect(result.phase).toBe("top_cut");
    expect(result.roundNumber).toBe(1);
    expect(result.matches.length).toBe(4); // 8 players = 4 matches in first round
  });
});

describe("generateSwissRound", () => {
  it("generates pairings for first round with even number of players", async () => {
    const players = createPlayers(8);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 0,
      players,
      matches: [],
    });

    const result = await generateSwissRound("tournament-1", state, 1);

    expect(result.phase).toBe("swiss");
    expect(result.roundNumber).toBe(1);
    expect(result.matches).toHaveLength(4); // 8 players = 4 matches
    expect(result.matches.every((m) => !m.isBye)).toBe(true);
  });

  it("generates pairings for first round with odd number of players", async () => {
    const players = createPlayers(7);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 0,
      players,
      matches: [],
    });

    const result = await generateSwissRound("tournament-1", state, 1);

    expect(result.phase).toBe("swiss");
    expect(result.roundNumber).toBe(1);
    expect(result.matches).toHaveLength(4); // 3 matches + 1 bye
    const byes = result.matches.filter((m) => m.isBye);
    expect(byes).toHaveLength(1);
    expect(byes[0]!.player2Id).toBeNull();
  });

  it("generates pairings based on standings for subsequent rounds", async () => {
    const players = createPlayers(4);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 1,
      players,
      matches: [
        // Round 1 results - p1 and p2 won
        createTournamentMatch({
          id: "1-1",
          roundNumber: 1,
          player1Id: "p1",
          player2Id: "p2",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 2,
          player2GameWins: 0,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "1-2",
          roundNumber: 1,
          player1Id: "p3",
          player2Id: "p4",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 2,
          player2GameWins: 0,
          isComplete: true,
        }),
      ],
    });

    const result = await generateSwissRound("tournament-1", state, 2);

    expect(result.phase).toBe("swiss");
    expect(result.roundNumber).toBe(2);
    expect(result.matches).toHaveLength(2);
    // Winners (p1, p3) should be paired together, losers (p2, p4) together
    // But Swiss pairing may shuffle within same point group
    expect(result.matches.every((m) => !m.isBye)).toBe(true);
  });

  it("excludes dropped players from pairings", async () => {
    const players = createPlayers(6);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 1,
      players,
      matches: [
        // Round 1 completed
        createTournamentMatch({
          id: "1-1",
          roundNumber: 1,
          player1Id: "p1",
          player2Id: "p2",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 2,
          player2GameWins: 0,
          isComplete: true,
        }),
      ],
      drops: [
        createTournamentDrop({
          profileId: "p2",
          roundNumber: 1,
        }),
      ],
    });

    const result = await generateSwissRound("tournament-1", state, 2);

    expect(result.phase).toBe("swiss");
    expect(result.roundNumber).toBe(2);
    // 6 players - 1 dropped = 5 active players = 2 matches + 1 bye
    expect(result.matches).toHaveLength(3);
    // Ensure dropped player is not in any pairing
    const allPlayerIds = result.matches.flatMap((m) =>
      [m.player1Id, m.player2Id].filter(Boolean)
    );
    expect(allPlayerIds).not.toContain("p2");
  });

  it("assigns correct match IDs with round number prefix", async () => {
    const players = createPlayers(4);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 0,
      players,
      matches: [],
    });

    const result = await generateSwissRound("tournament-1", state, 3);

    expect(result.matches[0]!.id).toBe("3-1");
    expect(result.matches[1]!.id).toBe("3-2");
  });

  it("initializes all matches as incomplete with zero scores", async () => {
    const players = createPlayers(6);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 0,
      players,
      matches: [],
    });

    const result = await generateSwissRound("tournament-1", state, 1);

    result.matches.forEach((match) => {
      expect(match.isComplete).toBe(false);
      expect(match.player1MatchPoints).toBe(0);
      expect(match.player2MatchPoints).toBe(0);
      expect(match.player1GameWins).toBe(0);
      expect(match.player2GameWins).toBe(0);
    });
  });

  it("calculates player records correctly from previous matches", async () => {
    const players = createPlayers(4);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 2,
      players,
      matches: [
        // Round 1
        createTournamentMatch({
          id: "1-1",
          roundNumber: 1,
          player1Id: "p1",
          player2Id: "p2",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 2,
          player2GameWins: 1,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "1-2",
          roundNumber: 1,
          player1Id: "p3",
          player2Id: "p4",
          player1MatchPoints: 0,
          player2MatchPoints: 3,
          player1GameWins: 0,
          player2GameWins: 2,
          isComplete: true,
        }),
        // Round 2
        createTournamentMatch({
          id: "2-1",
          roundNumber: 2,
          player1Id: "p1",
          player2Id: "p4",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 2,
          player2GameWins: 0,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "2-2",
          roundNumber: 2,
          player1Id: "p2",
          player2Id: "p3",
          player1MatchPoints: 0,
          player2MatchPoints: 3,
          player1GameWins: 1,
          player2GameWins: 2,
          isComplete: true,
        }),
      ],
    });

    const result = await generateSwissRound("tournament-1", state, 3);

    expect(result.phase).toBe("swiss");
    expect(result.roundNumber).toBe(3);
    expect(result.matches).toHaveLength(2);
    // p1: 6 points (2-0 record)
    // p3, p4: 3 points each (1-1 record)
    // p2: 0 points (0-2 record)
  });
});

describe("advanceToTopCut", () => {
  it("advances to top cut with correct bracket structure", async () => {
    const players = createPlayers(16);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 5,
      players,
      matches: [
        // Simulate completed Swiss rounds
        createTournamentMatch({
          id: "1-1",
          roundNumber: 1,
          player1Id: "p1",
          player2Id: "p2",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 2,
          player2GameWins: 0,
          isComplete: true,
        }),
      ],
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 5,
      topCutSize: 8,
    });

    const result = await advanceToTopCut(state, settings);

    expect(result.phase).toBe("top_cut");
    expect(result.currentRound).toBe(0); // Reset for top cut
    expect(result.players).toHaveLength(8); // Top 8 players
    expect(result.bracket).toBeDefined();
    expect(result.bracket?.bracketSize).toBe(8);
    expect(result.bracket?.totalRounds).toBe(3); // log2(8) = 3
    expect(result.bracket?.format).toBe("single_elimination");
  });

  it("throws error if cannot advance (format is swiss_only)", async () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 5,
    });
    const settings = createTournamentSettings({
      format: "swiss_only",
      swissRounds: 5,
    });

    await expect(advanceToTopCut(state, settings)).rejects.toThrow(
      "Cannot advance to top cut: Tournament format does not include top cut"
    );
  });

  it("throws error if Swiss rounds not complete", async () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 3,
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 5,
    });

    await expect(advanceToTopCut(state, settings)).rejects.toThrow(
      "Cannot advance to top cut: Swiss rounds not complete"
    );
  });

  it("throws error if not in Swiss phase", async () => {
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 1,
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 5,
    });

    await expect(advanceToTopCut(state, settings)).rejects.toThrow(
      "Cannot advance to top cut"
    );
  });

  it("selects top N players based on standings", async () => {
    const players = createPlayers(12);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 5,
      players,
      matches: [
        // Give p1, p2, p3, p4 the most points
        createTournamentMatch({
          id: "1-1",
          roundNumber: 1,
          player1Id: "p1",
          player2Id: "p10",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 2,
          player2GameWins: 0,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "1-2",
          roundNumber: 1,
          player1Id: "p2",
          player2Id: "p11",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 2,
          player2GameWins: 0,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "1-3",
          roundNumber: 1,
          player1Id: "p3",
          player2Id: "p12",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 2,
          player2GameWins: 0,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "1-4",
          roundNumber: 1,
          player1Id: "p4",
          player2Id: "p9",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 2,
          player2GameWins: 0,
          isComplete: true,
        }),
      ],
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 5,
      topCutSize: 4,
    });

    const result = await advanceToTopCut(state, settings);

    expect(result.players).toHaveLength(4);
    // Top 4 players should include p1, p2, p3, p4 (they have match wins)
    const topPlayerIds = result.players.map((p) => p.id);
    expect(topPlayerIds).toContain("p1");
    expect(topPlayerIds).toContain("p2");
    expect(topPlayerIds).toContain("p3");
    expect(topPlayerIds).toContain("p4");
  });

  it("excludes dropped players from top cut", async () => {
    const players = createPlayers(10);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 5,
      players,
      matches: [
        createTournamentMatch({
          id: "1-1",
          roundNumber: 1,
          player1Id: "p1",
          player2Id: "p2",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 2,
          player2GameWins: 0,
          isComplete: true,
        }),
      ],
      drops: [
        createTournamentDrop({
          profileId: "p1",
          roundNumber: 4,
        }),
      ],
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 5,
      topCutSize: 8,
    });

    const result = await advanceToTopCut(state, settings);

    expect(result.players).toHaveLength(8);
    const topPlayerIds = result.players.map((p) => p.id);
    expect(topPlayerIds).not.toContain("p1"); // Dropped player excluded
  });
});

describe("isTournamentComplete", () => {
  it("returns true if phase is completed", () => {
    const state = createTournamentState({ phase: "completed" });
    const settings = createTournamentSettings();

    expect(isTournamentComplete(state, settings)).toBe(true);
  });

  it("returns true for swiss_only format when all rounds complete", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 5,
    });
    const settings = createTournamentSettings({
      format: "swiss_only",
      swissRounds: 5,
    });

    expect(isTournamentComplete(state, settings)).toBe(true);
  });

  it("returns false for swiss_only format when rounds incomplete", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 3,
    });
    const settings = createTournamentSettings({
      format: "swiss_only",
      swissRounds: 5,
    });

    expect(isTournamentComplete(state, settings)).toBe(false);
  });

  it("returns true for swiss_with_cut when top cut complete (1 player remains)", () => {
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 3,
      players: [createTournamentPlayer({ id: "p1", name: "Winner" })],
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
    });

    expect(isTournamentComplete(state, settings)).toBe(true);
  });

  it("returns false for swiss_with_cut when multiple players remain", () => {
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 2,
      players: createPlayers(2),
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
    });

    expect(isTournamentComplete(state, settings)).toBe(false);
  });

  it("returns false for swiss_with_cut when still in Swiss phase", () => {
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 5,
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 5,
    });

    expect(isTournamentComplete(state, settings)).toBe(false);
  });

  it("returns false for single_elimination format (not fully implemented)", () => {
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 3,
      players: [createTournamentPlayer({ id: "p1" })],
    });
    const settings = createTournamentSettings({
      format: "single_elimination",
    });

    expect(isTournamentComplete(state, settings)).toBe(false);
  });
});

describe("processPlayerDrops", () => {
  it("returns success with unchanged state when no drop requests", async () => {
    const state = createTournamentState({
      currentRound: 1,
      players: createPlayers(8),
    });

    const result = await processPlayerDrops(state, []);

    expect(result.success).toBe(true);
    expect(result.updatedState).toEqual(state);
    expect(result.errors).toBeUndefined();
  });

  it("processes valid drop request and updates state", async () => {
    const players = createPlayers(6);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 1,
      players,
      matches: [],
      drops: [],
    });
    const dropRequests = [
      createDropRequest({
        playerId: "p1",
        tournamentId: "tournament-1",
        roundNumber: 2,
      }),
    ];

    const result = await processPlayerDrops(state, dropRequests);

    expect(result.success).toBe(true);
    expect(result.updatedState.players).toHaveLength(5); // 6 - 1 dropped
    expect(result.updatedState.drops).toHaveLength(1);
    expect(result.updatedState.drops[0]!.profileId).toBe("p1");
  });

  it("processes multiple drop requests", async () => {
    const players = createPlayers(8);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 2,
      players,
      matches: [],
      drops: [],
    });
    const dropRequests = [
      createDropRequest({
        playerId: "p1",
        tournamentId: "tournament-1",
        roundNumber: 3,
      }),
      createDropRequest({
        playerId: "p2",
        tournamentId: "tournament-1",
        roundNumber: 3,
      }),
    ];

    const result = await processPlayerDrops(state, dropRequests);

    expect(result.success).toBe(true);
    expect(result.updatedState.players).toHaveLength(6); // 8 - 2 dropped
    expect(result.updatedState.drops).toHaveLength(2);
  });

  it("preserves existing drops in state", async () => {
    const players = createPlayers(8);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 2,
      players,
      matches: [],
      drops: [
        createTournamentDrop({
          profileId: "p8",
          roundNumber: 1,
        }),
      ],
    });
    const dropRequests = [
      createDropRequest({
        playerId: "p1",
        tournamentId: "tournament-1",
        roundNumber: 3,
      }),
    ];

    const result = await processPlayerDrops(state, dropRequests);

    expect(result.success).toBe(true);
    expect(result.updatedState.drops).toHaveLength(2);
    expect(result.updatedState.drops.map((d) => d.profileId)).toEqual(
      expect.arrayContaining(["p8", "p1"])
    );
  });

  it("calculates player stats correctly from matches", async () => {
    const players = createPlayers(4);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 1,
      players,
      matches: [
        createTournamentMatch({
          id: "1-1",
          roundNumber: 1,
          player1Id: "p1",
          player2Id: "p2",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 2,
          player2GameWins: 0,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "1-2",
          roundNumber: 1,
          player1Id: "p3",
          player2Id: null,
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          player1GameWins: 0,
          player2GameWins: 0,
          isBye: true,
          isComplete: true,
        }),
      ],
      drops: [],
    });
    const dropRequests = [
      createDropRequest({
        playerId: "p1",
        tournamentId: "tournament-1",
        roundNumber: 2,
      }),
    ];

    const result = await processPlayerDrops(state, dropRequests);

    expect(result.success).toBe(true);
    // p1 had 3 match points and 1 round played before dropping
  });

  it("processes drops successfully even when close to minimum", async () => {
    const players = createPlayers(6);
    const state = createTournamentState({
      phase: "swiss",
      currentRound: 1,
      players,
      matches: [],
      drops: [],
    });
    // Drop 2 players (6 → 4, still at minimum)
    const dropRequests = [
      createDropRequest({
        playerId: "p5",
        tournamentId: "tournament-1",
        roundNumber: 2,
      }),
      createDropRequest({
        playerId: "p6",
        tournamentId: "tournament-1",
        roundNumber: 2,
      }),
    ];

    const result = await processPlayerDrops(state, dropRequests);

    // Should succeed even though we're at minimum
    expect(result.success).toBe(true);
    expect(result.updatedState.players).toHaveLength(4);
    expect(result.updatedState.drops).toHaveLength(2);
    // Verify we still have sufficient participants
    expect(hasSufficientParticipants(result.updatedState, 4)).toBe(true);
  });
});

describe("hasSufficientParticipants", () => {
  it("returns true when player count meets minimum", () => {
    const state = createTournamentState({
      players: createPlayers(4),
    });

    expect(hasSufficientParticipants(state, 4)).toBe(true);
  });

  it("returns true when player count exceeds minimum", () => {
    const state = createTournamentState({
      players: createPlayers(8),
    });

    expect(hasSufficientParticipants(state, 4)).toBe(true);
  });

  it("returns false when player count is below minimum", () => {
    const state = createTournamentState({
      players: createPlayers(3),
    });

    expect(hasSufficientParticipants(state, 4)).toBe(false);
  });

  it("uses default minimum of 4 when not specified", () => {
    const state = createTournamentState({
      players: createPlayers(4),
    });

    expect(hasSufficientParticipants(state)).toBe(true);
  });

  it("returns false when empty player list", () => {
    const state = createTournamentState({
      players: [],
    });

    expect(hasSufficientParticipants(state)).toBe(false);
  });

  it("handles custom minimum requirements", () => {
    const state = createTournamentState({
      players: createPlayers(6),
    });

    expect(hasSufficientParticipants(state, 8)).toBe(false);
    expect(hasSufficientParticipants(state, 6)).toBe(true);
    expect(hasSufficientParticipants(state, 2)).toBe(true);
  });
});

describe("getActivePlayersCount", () => {
  it("returns count of all players when none are dropped", () => {
    const state = createTournamentState({
      players: createPlayers(8),
      drops: [],
    });

    expect(getActivePlayersCount(state)).toBe(8);
  });

  it("returns player count for empty tournament", () => {
    const state = createTournamentState({
      players: [],
      drops: [],
    });

    expect(getActivePlayersCount(state)).toBe(0);
  });

  it("counts players correctly with various counts", () => {
    expect(
      getActivePlayersCount(
        createTournamentState({ players: createPlayers(1) })
      )
    ).toBe(1);
    expect(
      getActivePlayersCount(
        createTournamentState({ players: createPlayers(16) })
      )
    ).toBe(16);
    expect(
      getActivePlayersCount(
        createTournamentState({ players: createPlayers(32) })
      )
    ).toBe(32);
  });
});

describe("Integration: Complete Tournament Flow", () => {
  it("successfully runs a swiss_only tournament from start to finish", async () => {
    const players = createPlayers(8);
    let state = createTournamentState({
      phase: "swiss",
      currentRound: 0,
      players,
      matches: [],
      drops: [],
    });
    const settings = createTournamentSettings({
      format: "swiss_only",
      swissRounds: 3,
    });

    // Round 1
    expect(canStartNextRound(state)).toBe(true);
    const round1 = await generateNextRound(state, settings);
    expect(round1.roundNumber).toBe(1);
    expect(round1.matches.length).toBe(4);

    // Simulate completing round 1
    const round1Matches = round1.matches.map((m) => ({
      ...m,
      isComplete: true,
      player1MatchPoints: 3,
      player2MatchPoints: 0,
      player1GameWins: 2,
      player2GameWins: 0,
    }));
    state = {
      ...state,
      currentRound: 1,
      matches: round1Matches,
    };

    // Round 2
    expect(canStartNextRound(state)).toBe(true);
    const round2 = await generateNextRound(state, settings);
    expect(round2.roundNumber).toBe(2);

    // Simulate completing round 2
    const round2Matches = round2.matches.map((m) => ({
      ...m,
      isComplete: true,
      player1MatchPoints: 3,
      player2MatchPoints: 0,
      player1GameWins: 2,
      player2GameWins: 0,
    }));
    state = {
      ...state,
      currentRound: 2,
      matches: [...round1Matches, ...round2Matches],
    };

    // Round 3
    expect(canStartNextRound(state)).toBe(true);
    const round3 = await generateNextRound(state, settings);
    expect(round3.roundNumber).toBe(3);

    // Simulate completing round 3
    const round3Matches = round3.matches.map((m) => ({
      ...m,
      isComplete: true,
      player1MatchPoints: 3,
      player2MatchPoints: 0,
      player1GameWins: 2,
      player2GameWins: 0,
    }));
    state = {
      ...state,
      currentRound: 3,
      matches: [...round1Matches, ...round2Matches, ...round3Matches],
    };

    // Tournament should be complete
    expect(isTournamentComplete(state, settings)).toBe(true);
  });

  it("successfully runs a swiss_with_cut tournament including top cut", async () => {
    const players = createPlayers(16);
    let state = createTournamentState({
      phase: "swiss",
      currentRound: 0,
      players,
      matches: [],
      drops: [],
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 4,
      topCutSize: 8,
    });

    // Run 4 Swiss rounds
    for (let round = 1; round <= 4; round++) {
      expect(canStartNextRound(state)).toBe(true);
      const roundResult = await generateNextRound(state, settings);
      expect(roundResult.roundNumber).toBe(round);

      // Simulate completing the round
      const roundMatches = roundResult.matches.map((m) => ({
        ...m,
        isComplete: true,
        player1MatchPoints: 3,
        player2MatchPoints: 0,
        player1GameWins: 2,
        player2GameWins: 0,
      }));
      state = {
        ...state,
        currentRound: round,
        matches: [...state.matches, ...roundMatches],
      };
    }

    // Can advance to top cut
    expect(canAdvanceToTopCut(state, settings)).toBe(true);
    state = await advanceToTopCut(state, settings);

    // Verify top cut state
    expect(state.phase).toBe("top_cut");
    expect(state.currentRound).toBe(0);
    expect(state.players).toHaveLength(8);
    expect(state.bracket).toBeDefined();

    // Generate first top cut round
    expect(canStartNextRound(state)).toBe(true);
    const topCutRound1 = await generateNextRound(state, settings);
    expect(topCutRound1.roundNumber).toBe(1);
    expect(topCutRound1.matches).toHaveLength(4); // 8 players = 4 matches
    expect(topCutRound1.phase).toBe("top_cut");

    // Tournament not complete until winner determined
    expect(isTournamentComplete(state, settings)).toBe(false);
  });

  it("handles player drops mid-tournament", async () => {
    const players = createPlayers(8);
    let state = createTournamentState({
      phase: "swiss",
      currentRound: 0,
      players,
      matches: [],
      drops: [],
    });
    const settings = createTournamentSettings({
      format: "swiss_only",
      swissRounds: 3,
    });

    // Round 1
    const round1 = await generateNextRound(state, settings);
    const round1Matches = round1.matches.map((m) => ({
      ...m,
      isComplete: true,
      player1MatchPoints: 3,
      player2MatchPoints: 0,
      player1GameWins: 2,
      player2GameWins: 0,
    }));
    state = {
      ...state,
      currentRound: 1,
      matches: round1Matches,
    };

    // Drop a player before round 2
    const dropResult = await processPlayerDrops(state, [
      createDropRequest({
        playerId: "p8",
        tournamentId: settings.id,
        roundNumber: 2,
      }),
    ]);
    expect(dropResult.success).toBe(true);
    state = dropResult.updatedState;

    // Verify player count
    expect(state.players).toHaveLength(7);
    expect(state.drops).toHaveLength(1);

    // Round 2 should work with 7 players (3 matches + 1 bye)
    const round2 = await generateNextRound(state, settings);
    expect(round2.matches.length).toBe(4); // 3 pairings + 1 bye
    const byes = round2.matches.filter((m) => m.isBye);
    expect(byes).toHaveLength(1);
  });

  it("handles dropping to odd player count correctly", async () => {
    const players = createPlayers(6);
    let state = createTournamentState({
      phase: "swiss",
      currentRound: 0,
      players,
      matches: [],
      drops: [],
    });
    const settings = createTournamentSettings({
      format: "swiss_only",
      swissRounds: 3,
    });

    // Round 1 with 6 players (3 matches, no bye)
    const round1 = await generateNextRound(state, settings);
    expect(round1.matches.filter((m) => !m.isBye)).toHaveLength(3);

    const round1Matches = round1.matches.map((m) => ({
      ...m,
      isComplete: true,
      player1MatchPoints: 3,
      player2MatchPoints: 0,
      player1GameWins: 2,
      player2GameWins: 0,
    }));
    state = {
      ...state,
      currentRound: 1,
      matches: round1Matches,
    };

    // Drop one player (6 → 5)
    const dropResult = await processPlayerDrops(state, [
      createDropRequest({
        playerId: "p6",
        tournamentId: settings.id,
        roundNumber: 2,
      }),
    ]);
    state = dropResult.updatedState;
    expect(state.players).toHaveLength(5);

    // Round 2 with 5 players (2 matches + 1 bye)
    const round2 = await generateNextRound(state, settings);
    expect(round2.matches).toHaveLength(3);
    expect(round2.matches.filter((m) => m.isBye)).toHaveLength(1);
  });
});

describe("Edge Cases: Bracket ID Parsing", () => {
  it("correctly parses top cut match IDs for round detection", async () => {
    const players = createPlayers(8);
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 1,
      players,
      matches: [
        // Round 1 completed
        createTournamentMatch({
          id: "topcut-r1-m1",
          roundNumber: 1,
          player1Id: "p1",
          player2Id: "p2",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "topcut-r1-m2",
          roundNumber: 1,
          player1Id: "p3",
          player2Id: "p4",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "topcut-r1-m3",
          roundNumber: 1,
          player1Id: "p5",
          player2Id: "p6",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "topcut-r1-m4",
          roundNumber: 1,
          player1Id: "p7",
          player2Id: "p8",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          isComplete: true,
        }),
      ],
      bracket: {
        bracketSize: 8,
        totalRounds: 3,
        format: "single_elimination",
      },
    });

    // Should recognize all round 1 matches are complete
    expect(canStartNextRound(state)).toBe(true);
  });

  it("correctly distinguishes between different top cut rounds", async () => {
    const players = createPlayers(4);
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 2,
      players,
      matches: [
        // Round 1 completed
        createTournamentMatch({
          id: "topcut-r1-m1",
          roundNumber: 1,
          player1Id: "p1",
          player2Id: "p2",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          isComplete: true,
        }),
        createTournamentMatch({
          id: "topcut-r1-m2",
          roundNumber: 1,
          player1Id: "p3",
          player2Id: "p4",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          isComplete: true,
        }),
        // Round 2 in progress
        createTournamentMatch({
          id: "topcut-r2-m1",
          roundNumber: 2,
          player1Id: "p1",
          player2Id: "p3",
          player1MatchPoints: 0,
          player2MatchPoints: 0,
          isComplete: false,
        }),
      ],
      bracket: {
        bracketSize: 4,
        totalRounds: 2,
        format: "single_elimination",
      },
    });

    // Should detect that round 2 is not complete
    expect(canStartNextRound(state)).toBe(false);
  });
});

describe("Edge Cases: Phase Transitions", () => {
  it("maintains correct state during swiss → top_cut transition", async () => {
    const players = createPlayers(8);
    let state = createTournamentState({
      phase: "swiss",
      currentRound: 3,
      players,
      matches: [
        createTournamentMatch({
          id: "1-1",
          roundNumber: 1,
          player1Id: "p1",
          player2Id: "p2",
          player1MatchPoints: 3,
          player2MatchPoints: 0,
          isComplete: true,
        }),
      ],
      drops: [],
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 3,
      topCutSize: 4,
    });

    // Can advance to top cut
    expect(canAdvanceToTopCut(state, settings)).toBe(true);

    // Advance
    const newState = await advanceToTopCut(state, settings);

    // Verify transition
    expect(newState.phase).toBe("top_cut");
    expect(newState.currentRound).toBe(0); // Reset
    expect(newState.players).toHaveLength(4); // Top cut size
    expect(newState.matches).toEqual(state.matches); // Preserve Swiss matches
    expect(newState.drops).toEqual(state.drops); // Preserve drops
    expect(newState.bracket).toBeDefined();
  });

  it("prevents starting new Swiss rounds after advancing to top cut", async () => {
    const players = createPlayers(8);
    const state = createTournamentState({
      phase: "top_cut",
      currentRound: 0,
      players: players.slice(0, 4),
      matches: [],
      bracket: {
        bracketSize: 4,
        totalRounds: 2,
        format: "single_elimination",
      },
    });
    const settings = createTournamentSettings({
      format: "swiss_with_cut",
      swissRounds: 3,
      topCutSize: 4,
    });

    // Cannot advance to top cut again
    expect(canAdvanceToTopCut(state, settings)).toBe(false);

    // Next round should be top cut, not Swiss
    const nextRound = await generateNextRound(state, settings);
    expect(nextRound.phase).toBe("top_cut");
    expect(nextRound.matches[0]!.id).toContain("topcut-");
  });
});
