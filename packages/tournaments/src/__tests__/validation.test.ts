import {
  validateTournamentSettings,
  validateTournamentTiming,
  validateRoundStart,
  validateMatchResult,
  canStartTournament,
  calculateSwissRounds,
  estimateTournamentDuration,
  canAdvanceRound,
  calculateOptimalTournamentSettings,
  validateTournamentIntegrity,
  type TournamentValidationSettings,
  type TournamentTimingData,
  type RoundStartData,
  type MatchResultData,
} from "../validation";

// -- Helper factories --

function createSettings(
  overrides?: Partial<TournamentValidationSettings>
): TournamentValidationSettings {
  const now = new Date();
  return {
    name: overrides?.name ?? "VGC Tournament",
    maxParticipants: overrides?.maxParticipants ?? 64,
    minParticipants: overrides?.minParticipants ?? 8,
    topCutSize: overrides?.topCutSize ?? 8,
    swissRounds: overrides?.swissRounds ?? 6,
    format: overrides?.format ?? "swiss_with_cut",
    roundTimeMinutes: overrides?.roundTimeMinutes ?? 50,
    startDate: overrides?.startDate ?? now,
    endDate: overrides?.endDate ?? new Date(now.getTime() + 86400000),
    allowLateRegistration: overrides?.allowLateRegistration ?? false,
    requiresApproval: overrides?.requiresApproval ?? false,
  };
}

function createTimingData(
  overrides?: Partial<TournamentTimingData>
): TournamentTimingData {
  const now = new Date();
  return {
    tournamentId: overrides?.tournamentId ?? "t1",
    status: overrides?.status ?? "in_progress",
    currentRound: overrides?.currentRound ?? 1,
    totalRounds: overrides?.totalRounds ?? 6,
    startDate: overrides?.startDate ?? new Date(now.getTime() - 3600000),
    currentTime: overrides?.currentTime ?? now,
    roundStartTime: overrides?.roundStartTime ?? null,
    roundTimeMinutes: overrides?.roundTimeMinutes ?? 50,
    currentParticipants: overrides?.currentParticipants,
    minParticipants: overrides?.minParticipants,
  };
}

function createRoundStartData(
  overrides?: Partial<RoundStartData>
): RoundStartData {
  return {
    currentRound: overrides?.currentRound ?? 1,
    totalRounds: overrides?.totalRounds ?? 6,
    previousRoundComplete: overrides?.previousRoundComplete ?? true,
    participantCount: overrides?.participantCount ?? 32,
    minParticipants: overrides?.minParticipants ?? 4,
    roundTimeMinutes: overrides?.roundTimeMinutes ?? 50,
  };
}

function createMatchResult(
  overrides?: Partial<MatchResultData>
): MatchResultData {
  const defaults: MatchResultData = {
    matchId: "m1",
    player1Id: "p1",
    player2Id: "p2",
    matchPoints1: 1,
    matchPoints2: 0,
    gameWins1: 2,
    gameWins2: 1,
    bestOf: 3,
    isBye: false,
    winnerId: "p1",
  };
  return { ...defaults, ...overrides };
}

// -- Tests --

describe("validateTournamentSettings", () => {
  it("validates a correct set of tournament settings", () => {
    const settings = createSettings();
    const result = validateTournamentSettings(settings);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects empty tournament name", () => {
    const settings = createSettings({ name: "" });
    const result = validateTournamentSettings(settings);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Tournament name is required");
  });

  it("rejects whitespace-only tournament name", () => {
    const settings = createSettings({ name: "   " });
    const result = validateTournamentSettings(settings);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Tournament name is required");
  });

  it("rejects tournament name longer than 100 characters", () => {
    const settings = createSettings({ name: "A".repeat(101) });
    const result = validateTournamentSettings(settings);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Tournament name must be 100 characters or less"
    );
  });

  it("accepts a tournament name of exactly 100 characters", () => {
    const settings = createSettings({ name: "A".repeat(100) });
    const result = validateTournamentSettings(settings);

    expect(result.errors).not.toContain(
      "Tournament name must be 100 characters or less"
    );
  });

  it("rejects minimum participants below 4", () => {
    const settings = createSettings({ minParticipants: 3 });
    const result = validateTournamentSettings(settings);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Minimum participants must be at least 4 for Pokemon VGC tournaments"
    );
  });

  it("rejects max participants less than min participants", () => {
    const settings = createSettings({
      minParticipants: 16,
      maxParticipants: 8,
    });
    const result = validateTournamentSettings(settings);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Maximum participants must be greater than minimum participants"
    );
  });

  it("rejects non-power-of-2 top cut sizes for swiss_with_cut format", () => {
    const settings = createSettings({
      format: "swiss_with_cut",
      topCutSize: 12,
    });
    const result = validateTournamentSettings(settings);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Top cut size must be a power of 2 (4, 8, 16, 32, 64, 128, 256)"
    );
  });

  it("accepts valid power-of-2 top cut sizes", () => {
    for (const size of [4, 8, 16, 32]) {
      const settings = createSettings({
        format: "swiss_with_cut",
        topCutSize: size,
      });
      const result = validateTournamentSettings(settings);
      expect(result.errors).not.toContain(
        "Top cut size must be a power of 2 (4, 8, 16, 32, 64, 128, 256)"
      );
    }
  });

  it("rejects swiss rounds less than 1", () => {
    const settings = createSettings({ swissRounds: 0 });
    const result = validateTournamentSettings(settings);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Swiss rounds must be at least 1");
  });

  it("warns when swiss rounds exceed 20", () => {
    const settings = createSettings({ swissRounds: 21 });
    const result = validateTournamentSettings(settings);

    expect(result.warnings).toContain(
      "Very high number of Swiss rounds - tournaments may take a very long time"
    );
  });

  it("rejects round time below 15 minutes", () => {
    const settings = createSettings({ roundTimeMinutes: 10 });
    const result = validateTournamentSettings(settings);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Round time must be between 15 and 120 minutes"
    );
  });

  it("rejects round time above 120 minutes", () => {
    const settings = createSettings({ roundTimeMinutes: 130 });
    const result = validateTournamentSettings(settings);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Round time must be between 15 and 120 minutes"
    );
  });

  it("accepts round time of exactly 15 minutes", () => {
    const settings = createSettings({ roundTimeMinutes: 15 });
    const result = validateTournamentSettings(settings);

    expect(result.errors).not.toContain(
      "Round time must be between 15 and 120 minutes"
    );
  });

  it("accepts round time of exactly 120 minutes", () => {
    const settings = createSettings({ roundTimeMinutes: 120 });
    const result = validateTournamentSettings(settings);

    expect(result.errors).not.toContain(
      "Round time must be between 15 and 120 minutes"
    );
  });

  it("rejects end date before start date", () => {
    const now = new Date();
    const settings = createSettings({
      startDate: new Date(now.getTime() + 86400000),
      endDate: now,
    });
    const result = validateTournamentSettings(settings);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("End date must be after start date");
  });

  it("warns when top cut size exceeds max participants in swiss_with_cut", () => {
    const settings = createSettings({
      format: "swiss_with_cut",
      maxParticipants: 16,
      topCutSize: 32,
    });
    const result = validateTournamentSettings(settings);

    expect(result.warnings).toContain(
      "Top cut size exceeds maximum participants - ensure sufficient registration"
    );
  });

  it("rejects swiss_only format with 0 swiss rounds", () => {
    const settings = createSettings({ format: "swiss_only", swissRounds: 0 });
    const result = validateTournamentSettings(settings);

    expect(result.errors).toContain(
      "Swiss-only tournaments must have at least 1 Swiss round"
    );
  });
});

describe("validateTournamentTiming", () => {
  it("validates correct timing data", () => {
    const data = createTimingData();
    const result = validateTournamentTiming(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("warns when starting before scheduled start date", () => {
    const data = createTimingData({
      currentTime: new Date("2024-01-01T10:00:00Z"),
      startDate: new Date("2024-01-01T12:00:00Z"),
    });
    const result = validateTournamentTiming(data);

    expect(result.warnings).toContain(
      "Starting tournament before scheduled start date"
    );
  });

  it("rejects insufficient participants", () => {
    const data = createTimingData({
      currentParticipants: 3,
      minParticipants: 8,
    });
    const result = validateTournamentTiming(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Insufficient participants to start tournament"
    );
  });

  it("rejects starting round before scheduled time", () => {
    const now = new Date();
    const data = createTimingData({
      currentTime: now,
      roundStartTime: new Date(now.getTime() + 3600000),
    });
    const result = validateTournamentTiming(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Cannot start round before scheduled time");
  });

  it("rejects current round exceeding total rounds", () => {
    const data = createTimingData({
      currentRound: 7,
      totalRounds: 6,
    });
    const result = validateTournamentTiming(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Current round exceeds total planned rounds"
    );
  });
});

describe("validateRoundStart", () => {
  it("validates a valid round start", () => {
    const data = createRoundStartData();
    const result = validateRoundStart(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects when previous round is not complete (round > 0)", () => {
    const data = createRoundStartData({
      currentRound: 2,
      previousRoundComplete: false,
    });
    const result = validateRoundStart(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Previous round must be completed before starting next round"
    );
  });

  it("allows first round without previous round check", () => {
    const data = createRoundStartData({
      currentRound: 0,
      previousRoundComplete: false,
    });
    const result = validateRoundStart(data);

    // currentRound === 0, so previous round check is skipped
    expect(
      result.errors.includes(
        "Previous round must be completed before starting next round"
      )
    ).toBe(false);
  });

  it("rejects when current round exceeds total rounds", () => {
    const data = createRoundStartData({
      currentRound: 6,
      totalRounds: 6,
    });
    const result = validateRoundStart(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Cannot start round beyond total scheduled rounds"
    );
  });

  it("rejects when insufficient participants", () => {
    const data = createRoundStartData({
      participantCount: 2,
      minParticipants: 4,
    });
    const result = validateRoundStart(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Insufficient participants to continue tournament"
    );
  });

  it("rejects round time below 15 minutes", () => {
    const data = createRoundStartData({ roundTimeMinutes: 10 });
    const result = validateRoundStart(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Round time too short - minimum 15 minutes required"
    );
  });
});

describe("validateMatchResult", () => {
  it("validates a correct Bo3 match result", () => {
    const data = createMatchResult({
      matchPoints1: 1,
      matchPoints2: 0,
      gameWins1: 2,
      gameWins2: 1,
      bestOf: 3,
      winnerId: "p1",
    });
    const result = validateMatchResult(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects tied match points (no ties in VGC)", () => {
    const data = createMatchResult({
      matchPoints1: 1,
      matchPoints2: 1,
    });
    const result = validateMatchResult(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Ties are not allowed in Pokemon VGC tournaments"
    );
  });

  it("rejects match points outside 0 or 1", () => {
    const data = createMatchResult({
      matchPoints1: 2,
      matchPoints2: 0,
    });
    const result = validateMatchResult(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Match points must be 0 or 1");
  });

  it("rejects winner inconsistency (winner ID does not match higher match points)", () => {
    const data = createMatchResult({
      matchPoints1: 1,
      matchPoints2: 0,
      winnerId: "p2", // p2 has 0 points but is listed as winner
    });
    const result = validateMatchResult(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Winner must be the player with higher match points"
    );
  });

  it("validates a correct bye match", () => {
    const data = createMatchResult({
      player2Id: null,
      matchPoints1: 1,
      matchPoints2: 0,
      gameWins1: 0,
      gameWins2: 0,
      isBye: true,
      winnerId: null,
    });
    const result = validateMatchResult(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects bye match with a second player", () => {
    const data = createMatchResult({
      player2Id: "p2",
      matchPoints1: 1,
      matchPoints2: 0,
      gameWins1: 0,
      gameWins2: 0,
      isBye: true,
    });
    const result = validateMatchResult(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Bye matches should not have a second player"
    );
  });

  it("rejects bye match with incorrect match points", () => {
    const data = createMatchResult({
      player2Id: null,
      matchPoints1: 0,
      matchPoints2: 0,
      gameWins1: 0,
      gameWins2: 0,
      isBye: true,
    });
    const result = validateMatchResult(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Bye matches must award 1 match point to the active player"
    );
  });

  it("rejects bye match with game wins recorded", () => {
    const data = createMatchResult({
      player2Id: null,
      matchPoints1: 1,
      matchPoints2: 0,
      gameWins1: 2,
      gameWins2: 0,
      isBye: true,
    });
    const result = validateMatchResult(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Bye matches should not record game wins");
  });

  it("validates a correct Bo1 match result", () => {
    const data = createMatchResult({
      matchPoints1: 1,
      matchPoints2: 0,
      gameWins1: 1,
      gameWins2: 0,
      bestOf: 1,
      winnerId: "p1",
    });
    const result = validateMatchResult(data);

    expect(result.isValid).toBe(true);
  });

  it("rejects Bo1 match with more than 1 game", () => {
    const data = createMatchResult({
      matchPoints1: 1,
      matchPoints2: 0,
      gameWins1: 2,
      gameWins2: 0,
      bestOf: 1,
      winnerId: "p1",
    });
    const result = validateMatchResult(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Best of 1 matches must have exactly 1 game"
    );
  });

  it("validates a correct Bo5 match result (3-2)", () => {
    const data = createMatchResult({
      matchPoints1: 1,
      matchPoints2: 0,
      gameWins1: 3,
      gameWins2: 2,
      bestOf: 5,
      winnerId: "p1",
    });
    const result = validateMatchResult(data);

    expect(result.isValid).toBe(true);
  });

  it("rejects Bo3 match where winner hasn't won enough games", () => {
    const data = createMatchResult({
      matchPoints1: 1,
      matchPoints2: 0,
      gameWins1: 1,
      gameWins2: 0,
      bestOf: 3,
      winnerId: "p1",
    });
    const result = validateMatchResult(data);

    // Winner needs at least 2 game wins in Bo3
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Best of 3 winner must win at least 2 games"
    );
  });

  it("rejects match where loser has more or equal game wins than winner", () => {
    const data = createMatchResult({
      matchPoints1: 1,
      matchPoints2: 0,
      gameWins1: 2,
      gameWins2: 2,
      bestOf: 3,
      winnerId: "p1",
    });
    const result = validateMatchResult(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Match winner must have won more games than opponent"
    );
  });

  it("rejects Bo3 match with too many games", () => {
    const data = createMatchResult({
      matchPoints1: 1,
      matchPoints2: 0,
      gameWins1: 3,
      gameWins2: 2,
      bestOf: 3,
      winnerId: "p1",
    });
    const result = validateMatchResult(data);

    // Total games = 5, but max for Bo3 is 3
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Best of 3 matches must have 2 to 3 games");
  });
});

describe("canStartTournament", () => {
  it("returns canStart: true when conditions are met", () => {
    const now = new Date();
    const result = canStartTournament({
      currentParticipants: 16,
      minParticipants: 8,
      startDate: new Date(now.getTime() - 3600000),
      currentTime: now,
    });

    expect(result.canStart).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("blocks start when insufficient participants", () => {
    const now = new Date();
    const result = canStartTournament({
      currentParticipants: 3,
      minParticipants: 8,
      startDate: new Date(now.getTime() - 3600000),
      currentTime: now,
    });

    expect(result.canStart).toBe(false);
    expect(result.reason).toContain("Insufficient participants");
  });

  it("blocks start before scheduled start date", () => {
    const now = new Date();
    const result = canStartTournament({
      currentParticipants: 16,
      minParticipants: 8,
      startDate: new Date(now.getTime() + 86400000),
      currentTime: now,
    });

    expect(result.canStart).toBe(false);
    expect(result.reason).toContain(
      "Cannot start tournament before scheduled start date"
    );
  });
});

describe("calculateSwissRounds", () => {
  it("returns ceil(log2(n)) for standard participant counts", () => {
    // 8 players -> log2(8) = 3
    expect(calculateSwissRounds(8)).toBe(3);
    // 16 players -> log2(16) = 4
    expect(calculateSwissRounds(16)).toBe(4);
    // 32 players -> log2(32) = 5
    expect(calculateSwissRounds(32)).toBe(5);
    // 64 players -> log2(64) = 6
    expect(calculateSwissRounds(64)).toBe(6);
  });

  it("rounds up for non-power-of-2 counts", () => {
    // 10 players -> ceil(log2(10)) = ceil(3.32) = 4
    expect(calculateSwissRounds(10)).toBe(4);
    // 24 players -> ceil(log2(24)) = ceil(4.58) = 5
    expect(calculateSwissRounds(24)).toBe(5);
  });

  it("returns 3 as minimum for very small tournaments (< 4 players)", () => {
    expect(calculateSwissRounds(2)).toBe(3);
    expect(calculateSwissRounds(3)).toBe(3);
  });

  it("returns 2 for 4 players (ceil(log2(4)) = 2)", () => {
    expect(calculateSwissRounds(4)).toBe(2);
  });

  it("handles large participant counts", () => {
    // 256 players -> log2(256) = 8
    expect(calculateSwissRounds(256)).toBe(8);
    // 512 players -> log2(512) = 9
    expect(calculateSwissRounds(512)).toBe(9);
  });
});

describe("estimateTournamentDuration", () => {
  it("returns a positive number for valid inputs", () => {
    const result = estimateTournamentDuration(32, 5, 8, 50, "swiss_with_cut");
    expect(result).toBeGreaterThan(0);
  });

  it("calculates correctly for swiss_only format", () => {
    // 5 swiss rounds * 50 min = 250 min playing + 5 * 15 buffer = 325 min total
    const result = estimateTournamentDuration(32, 5, 0, 50, "swiss_only");
    expect(result).toBe(5 * 50 + 5 * 15);
  });

  it("includes top cut rounds for swiss_with_cut format", () => {
    // 5 swiss + log2(8)=3 top cut = 8 rounds
    // Playing: (5+3)*50 = 400
    // Buffer: 8*15 = 120
    // Total: 520
    const result = estimateTournamentDuration(32, 5, 8, 50, "swiss_with_cut");
    expect(result).toBe(8 * 50 + 8 * 15);
  });

  it("handles topCutSize of 4", () => {
    // Swiss: 4 * 50 = 200, Top cut: log2(4)=2 * 50 = 100
    // Buffer: (4+2) * 15 = 90
    // Total: 390
    const result = estimateTournamentDuration(16, 4, 4, 50, "swiss_with_cut");
    expect(result).toBe(6 * 50 + 6 * 15);
  });
});

describe("canAdvanceRound", () => {
  it("allows advancing when all conditions are met", () => {
    const result = canAdvanceRound({
      currentRound: 3,
      totalRounds: 6,
      allMatchesComplete: true,
      activeParticipants: 32,
      minParticipants: 4,
    });

    expect(result.isValid).toBe(true);
  });

  it("rejects advancing when matches are incomplete", () => {
    const result = canAdvanceRound({
      currentRound: 3,
      totalRounds: 6,
      allMatchesComplete: false,
      activeParticipants: 32,
      minParticipants: 4,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "All matches in current round must be completed"
    );
  });

  it("rejects advancing when insufficient active participants", () => {
    const result = canAdvanceRound({
      currentRound: 3,
      totalRounds: 6,
      allMatchesComplete: true,
      activeParticipants: 2,
      minParticipants: 4,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Insufficient active participants to continue tournament"
    );
  });

  it("rejects advancing when at maximum rounds", () => {
    const result = canAdvanceRound({
      currentRound: 6,
      totalRounds: 6,
      allMatchesComplete: true,
      activeParticipants: 32,
      minParticipants: 4,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Tournament has reached maximum rounds");
  });
});

describe("calculateOptimalTournamentSettings", () => {
  it("returns sensible defaults for a typical tournament size", () => {
    const result = calculateOptimalTournamentSettings(64);

    expect(result.swissRounds).toBe(6); // ceil(log2(64))
    expect(result.recommendedTopCut).toBe(8);
    expect(result.recommendedRoundTime).toBe(50);
    expect(result.estimatedDuration).toBeGreaterThan(0);
  });

  it("recommends top cut of 4 for small tournaments", () => {
    const result = calculateOptimalTournamentSettings(12);
    expect(result.recommendedTopCut).toBe(4);
  });

  it("recommends top cut of 16 for 128+ participant tournaments", () => {
    const result = calculateOptimalTournamentSettings(128);
    expect(result.recommendedTopCut).toBe(16);
  });

  it("recommends top cut of 32 for 256+ participant tournaments", () => {
    const result = calculateOptimalTournamentSettings(256);
    expect(result.recommendedTopCut).toBe(32);
  });

  it("returns positive estimated duration", () => {
    const result = calculateOptimalTournamentSettings(8);
    expect(result.estimatedDuration).toBeGreaterThan(0);
  });

  it("increases swiss rounds as participant count grows", () => {
    const small = calculateOptimalTournamentSettings(8);
    const medium = calculateOptimalTournamentSettings(64);
    const large = calculateOptimalTournamentSettings(256);

    expect(small.swissRounds).toBeLessThan(medium.swissRounds);
    expect(medium.swissRounds).toBeLessThan(large.swissRounds);
  });
});

describe("validateTournamentIntegrity", () => {
  it("passes for a well-configured tournament", () => {
    const settings = createSettings({
      format: "swiss_with_cut",
      maxParticipants: 64,
      swissRounds: 6,
      topCutSize: 8,
      roundTimeMinutes: 50,
    });
    const result = validateTournamentIntegrity(settings);

    expect(result.isValid).toBe(true);
  });

  it("warns when top cut ratio exceeds 50%", () => {
    const settings = createSettings({
      format: "swiss_with_cut",
      maxParticipants: 16,
      topCutSize: 16, // 100% of participants
      swissRounds: 4,
    });
    const result = validateTournamentIntegrity(settings);

    expect(result.warnings).toContain(
      "Top cut includes more than 50% of participants - consider reducing size"
    );
  });

  it("warns when swiss rounds are very low for participant count", () => {
    const settings = createSettings({
      format: "swiss_with_cut",
      maxParticipants: 64,
      swissRounds: 2, // calculated would be 6
      topCutSize: 8,
    });
    const result = validateTournamentIntegrity(settings);

    expect(result.warnings).toContain(
      "Few Swiss rounds may result in tied players advancing to top cut"
    );
  });

  it("warns for extremely long estimated duration (>12 hours)", () => {
    const settings = createSettings({
      format: "swiss_with_cut",
      maxParticipants: 256,
      swissRounds: 10,
      topCutSize: 32,
      roundTimeMinutes: 120,
    });
    const result = validateTournamentIntegrity(settings);

    const hasLongDurationWarning = result.warnings?.some((w) =>
      w.includes("hours")
    );
    expect(hasLongDurationWarning).toBe(true);
  });
});
