import {
  generateSwissPairings,
  recommendedSwissRounds,
  recommendedTopCutSize,
  type PlayerForPairing,
} from "../swiss-pairings";

// Helper to create a basic player for testing
function makePlayer(
  altId: number,
  matchPoints: number = 0,
  overrides: Partial<PlayerForPairing> = {}
): PlayerForPairing {
  return {
    altId,
    matchPoints,
    gameWinPercentage: 0,
    opponentMatchWinPercentage: 0,
    opponentHistory: [],
    hasReceivedBye: false,
    isDropped: false,
    currentSeed: altId,
    ...overrides,
  };
}

describe("generateSwissPairings", () => {
  it("returns no pairings for empty player list", () => {
    const result = generateSwissPairings([], 1);
    expect(result.pairings).toHaveLength(0);
    expect(result.warnings).toContain("No active players to pair");
    expect(result.algorithm).toBe("swiss-vgc-v1");
  });

  it("gives a bye to a single player", () => {
    const players = [makePlayer(1)];
    const result = generateSwissPairings(players, 1);
    expect(result.pairings).toHaveLength(1);
    expect(result.pairings[0]!.isBye).toBe(true);
    expect(result.pairings[0]!.alt1Id).toBe(1);
    expect(result.pairings[0]!.alt2Id).toBeNull();
  });

  it("pairs two players together", () => {
    const players = [makePlayer(1), makePlayer(2)];
    const result = generateSwissPairings(players, 1);
    expect(result.pairings).toHaveLength(1);
    expect(result.pairings[0]!.isBye).toBe(false);
    expect(result.pairings[0]!.tableNumber).toBe(1);
  });

  it("assigns a bye to the lowest-ranked player with odd count", () => {
    const players = [makePlayer(1, 3), makePlayer(2, 3), makePlayer(3, 0)];
    const result = generateSwissPairings(players, 2);
    // With odd number, one player gets a bye
    const byePairing = result.pairings.find((p) => p.isBye);
    expect(byePairing).toBeDefined();
    // Player 3 has 0 points and hasn't had a bye → should get the bye
    expect(byePairing!.alt1Id).toBe(3);
  });

  it("filters out dropped players", () => {
    const players = [
      makePlayer(1),
      makePlayer(2, 0, { isDropped: true }),
      makePlayer(3),
    ];
    const result = generateSwissPairings(players, 1);
    // Only 2 active players, so 1 pairing
    expect(result.pairings).toHaveLength(1);
    expect(result.pairings[0]!.isBye).toBe(false);
  });

  it("avoids rematches when possible", () => {
    const players = [
      makePlayer(1, 3, { opponentHistory: [2] }),
      makePlayer(2, 3, { opponentHistory: [1] }),
      makePlayer(3, 3),
      makePlayer(4, 3),
    ];
    const result = generateSwissPairings(players, 2);
    // Player 1 and 2 have already played, so they should not be paired
    const p1Pairing = result.pairings.find(
      (p) => p.alt1Id === 1 || p.alt2Id === 1
    );
    expect(p1Pairing).toBeDefined();
    expect(p1Pairing!.alt2Id).not.toBe(2);
    expect(p1Pairing!.alt1Id).not.toBe(2);
  });

  it("allows rematches with warning when no other option", () => {
    // Two players who've already played, forced to rematch
    const players = [
      makePlayer(1, 3, { opponentHistory: [2] }),
      makePlayer(2, 3, { opponentHistory: [1] }),
    ];
    const result = generateSwissPairings(players, 3);
    expect(result.pairings).toHaveLength(1);
    expect(result.warnings.some((w) => w.includes("Rematch"))).toBe(true);
  });

  it("groups players by match points", () => {
    const players = [
      makePlayer(1, 6),
      makePlayer(2, 6),
      makePlayer(3, 3),
      makePlayer(4, 3),
    ];
    const result = generateSwissPairings(players, 3);
    expect(result.pairings).toHaveLength(2);
    // Players with 6 points should be paired together
    const topPairing = result.pairings.find(
      (p) =>
        (p.alt1Id === 1 && p.alt2Id === 2) || (p.alt1Id === 2 && p.alt2Id === 1)
    );
    expect(topPairing).toBeDefined();
  });

  it("prefers giving bye to player who hasn't had one", () => {
    const players = [
      makePlayer(1, 0, { hasReceivedBye: true }),
      makePlayer(2, 0, { hasReceivedBye: false }),
      makePlayer(3, 0, { hasReceivedBye: false }),
    ];
    const result = generateSwissPairings(players, 2);
    const byePairing = result.pairings.find((p) => p.isBye);
    expect(byePairing).toBeDefined();
    // Player 1 already had a bye, so 2 or 3 should get it
    expect(byePairing!.alt1Id).not.toBe(1);
  });

  it("sets table numbers starting at 1 for non-bye pairings", () => {
    const players = [
      makePlayer(1),
      makePlayer(2),
      makePlayer(3),
      makePlayer(4),
    ];
    const result = generateSwissPairings(players, 1);
    const tableNumbers = result.pairings
      .filter((p) => !p.isBye)
      .map((p) => p.tableNumber);
    expect(tableNumbers).toContain(1);
    expect(tableNumbers).toContain(2);
  });

  it("sets table number to 0 for byes", () => {
    const players = [makePlayer(1), makePlayer(2), makePlayer(3)];
    const result = generateSwissPairings(players, 1);
    const byePairing = result.pairings.find((p) => p.isBye);
    expect(byePairing!.tableNumber).toBe(0);
  });
});

describe("recommendedSwissRounds", () => {
  it("returns 2 for 4 or fewer players", () => {
    expect(recommendedSwissRounds(1)).toBe(2);
    expect(recommendedSwissRounds(4)).toBe(2);
  });

  it("returns 3 for 5-8 players", () => {
    expect(recommendedSwissRounds(5)).toBe(3);
    expect(recommendedSwissRounds(8)).toBe(3);
  });

  it("returns 4 for 9-16 players", () => {
    expect(recommendedSwissRounds(9)).toBe(4);
    expect(recommendedSwissRounds(16)).toBe(4);
  });

  it("returns 5 for 17-32 players", () => {
    expect(recommendedSwissRounds(17)).toBe(5);
    expect(recommendedSwissRounds(32)).toBe(5);
  });

  it("returns 6 for 33-64 players", () => {
    expect(recommendedSwissRounds(33)).toBe(6);
    expect(recommendedSwissRounds(64)).toBe(6);
  });

  it("returns 7 for 65-128 players", () => {
    expect(recommendedSwissRounds(65)).toBe(7);
    expect(recommendedSwissRounds(128)).toBe(7);
  });

  it("returns 8 for 129+ players", () => {
    expect(recommendedSwissRounds(129)).toBe(8);
    expect(recommendedSwissRounds(500)).toBe(8);
  });
});

describe("recommendedTopCutSize", () => {
  it("returns 4 for 8 or fewer players", () => {
    expect(recommendedTopCutSize(4)).toBe(4);
    expect(recommendedTopCutSize(8)).toBe(4);
  });

  it("returns 8 for 9-32 players", () => {
    expect(recommendedTopCutSize(9)).toBe(8);
    expect(recommendedTopCutSize(32)).toBe(8);
  });

  it("returns 8 for 33-64 players", () => {
    expect(recommendedTopCutSize(33)).toBe(8);
    expect(recommendedTopCutSize(64)).toBe(8);
  });

  it("returns 16 for 65+ players", () => {
    expect(recommendedTopCutSize(65)).toBe(16);
    expect(recommendedTopCutSize(200)).toBe(16);
  });
});
