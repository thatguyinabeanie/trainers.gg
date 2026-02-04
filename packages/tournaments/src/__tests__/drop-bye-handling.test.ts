import {
  canPlayerDrop,
  dropPlayer,
  findByeCandidate,
  assignBye,
  handlePlayerDrop,
  processDropsForRound,
  getActivePlayerCount,
  hasMinimumPlayers,
  getPlayersWithByes,
  getPlayersWithoutByes,
  calculateTotalMatchPoints,
  validateDropTiming,
  type TournamentPlayerWithStatus,
  type DropRequest,
  type TournamentPhase,
} from "../drop-bye-handling";

// -- Helper factories --

function createTournamentPlayer(
  overrides?: Partial<TournamentPlayerWithStatus>
): TournamentPlayerWithStatus {
  return {
    id: overrides?.id ?? "player-1",
    name: overrides?.name ?? "Test Player",
    isDropped: overrides?.isDropped ?? false,
    byeCount: overrides?.byeCount ?? 0,
    matchPoints: overrides?.matchPoints ?? 0,
    roundsPlayed: overrides?.roundsPlayed ?? 0,
  };
}

function createDropRequest(overrides?: Partial<DropRequest>): DropRequest {
  return {
    playerId: overrides?.playerId ?? "player-1",
    tournamentId: overrides?.tournamentId ?? "tournament-1",
    roundNumber: overrides?.roundNumber ?? 1,
    reason: overrides?.reason,
    droppedAt: overrides?.droppedAt ?? new Date(),
  };
}

function createPlayers(count: number): TournamentPlayerWithStatus[] {
  return Array.from({ length: count }, (_, i) =>
    createTournamentPlayer({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
    })
  );
}

// -- Tests --

describe("canPlayerDrop", () => {
  it("returns true for an active player between rounds", () => {
    const players = [createTournamentPlayer({ id: "p1" })];
    expect(canPlayerDrop("p1", "between_rounds", players)).toBe(true);
  });

  it("returns true during pairing phase", () => {
    const players = [createTournamentPlayer({ id: "p1" })];
    expect(canPlayerDrop("p1", "pairing", players)).toBe(true);
  });

  it("returns true during match phase", () => {
    const players = [createTournamentPlayer({ id: "p1" })];
    expect(canPlayerDrop("p1", "during_match", players)).toBe(true);
  });

  it("returns false during an active round", () => {
    const players = [createTournamentPlayer({ id: "p1" })];
    expect(canPlayerDrop("p1", "during_round", players)).toBe(false);
  });

  it("returns false if the player does not exist", () => {
    const players = [createTournamentPlayer({ id: "p1" })];
    expect(canPlayerDrop("nonexistent", "between_rounds", players)).toBe(false);
  });

  it("returns false if the player is already dropped", () => {
    const players = [createTournamentPlayer({ id: "p1", isDropped: true })];
    expect(canPlayerDrop("p1", "between_rounds", players)).toBe(false);
  });
});

describe("dropPlayer", () => {
  it("marks the player as dropped when they exist and are active", () => {
    const players = createPlayers(4);
    const dropReq = createDropRequest({ playerId: "p1" });

    const result = dropPlayer(dropReq, players);

    expect(result.success).toBe(true);
    expect(result.dropRecord).toBe(dropReq);

    // Verify the dropped player is marked
    const droppedPlayer = result.updatedPlayers.find((p) => p.id === "p1");
    expect(droppedPlayer?.isDropped).toBe(true);
  });

  it("does not modify other players when one player drops", () => {
    const players = createPlayers(4);
    const dropReq = createDropRequest({ playerId: "p1" });

    const result = dropPlayer(dropReq, players);

    // Other players should remain active
    for (const player of result.updatedPlayers) {
      if (player.id !== "p1") {
        expect(player.isDropped).toBe(false);
      }
    }
  });

  it("returns error when player does not exist", () => {
    const players = createPlayers(4);
    const dropReq = createDropRequest({ playerId: "nonexistent" });

    const result = dropPlayer(dropReq, players);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Player not found or already dropped");
  });

  it("returns error when player is already dropped", () => {
    const players = [createTournamentPlayer({ id: "p1", isDropped: true })];
    const dropReq = createDropRequest({ playerId: "p1" });

    const result = dropPlayer(dropReq, players);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Player not found or already dropped");
  });
});

describe("findByeCandidate", () => {
  it("returns null when there is an even number of active players", () => {
    const players = createPlayers(4);
    expect(findByeCandidate(players)).toBeNull();
  });

  it("returns a player when there is an odd number of active players", () => {
    const players = createPlayers(5);
    const candidate = findByeCandidate(players);
    expect(candidate).not.toBeNull();
  });

  it("prefers a player without a prior bye", () => {
    const players = [
      createTournamentPlayer({ id: "p1", byeCount: 1, matchPoints: 0 }),
      createTournamentPlayer({ id: "p2", byeCount: 0, matchPoints: 0 }),
      createTournamentPlayer({ id: "p3", byeCount: 0, matchPoints: 1 }),
    ];

    const candidate = findByeCandidate(players);

    // Should pick a player without a bye, preferring lower match points
    expect(candidate?.id).toBe("p2");
  });

  it("picks the player with the lowest match points among non-bye players", () => {
    const players = [
      createTournamentPlayer({ id: "p1", byeCount: 0, matchPoints: 3 }),
      createTournamentPlayer({ id: "p2", byeCount: 0, matchPoints: 1 }),
      createTournamentPlayer({ id: "p3", byeCount: 0, matchPoints: 2 }),
    ];

    const candidate = findByeCandidate(players);
    expect(candidate?.id).toBe("p2");
  });

  it("skips dropped players when finding bye candidate", () => {
    const players = [
      createTournamentPlayer({ id: "p1", isDropped: true }),
      createTournamentPlayer({ id: "p2" }),
      createTournamentPlayer({ id: "p3" }),
      createTournamentPlayer({ id: "p4" }),
    ];

    // 3 active players (odd) - should find a candidate
    const candidate = findByeCandidate(players);
    expect(candidate).not.toBeNull();
    expect(candidate?.id).not.toBe("p1"); // Dropped player should not receive bye
  });

  it("falls back to lowest-standing player when all have had byes", () => {
    const players = [
      createTournamentPlayer({ id: "p1", byeCount: 1, matchPoints: 3 }),
      createTournamentPlayer({ id: "p2", byeCount: 1, matchPoints: 1 }),
      createTournamentPlayer({ id: "p3", byeCount: 1, matchPoints: 2 }),
    ];

    const candidate = findByeCandidate(players);
    // All have byes, so pick lowest match points
    expect(candidate?.id).toBe("p2");
  });
});

describe("assignBye", () => {
  it("increments the player's bye count", () => {
    const players = createPlayers(3);
    const result = assignBye("p1", 1, players);

    expect(result.success).toBe(true);
    const updatedP1 = result.updatedPlayers.find((p) => p.id === "p1");
    expect(updatedP1?.byeCount).toBe(1);
  });

  it("creates a bye record with 1 match point", () => {
    const players = createPlayers(3);
    const result = assignBye("p1", 2, players);

    expect(result.byeRecord).toEqual({
      playerId: "p1",
      roundNumber: 2,
      matchPoints: 1,
    });
  });

  it("returns error when player does not exist", () => {
    const players = createPlayers(3);
    const result = assignBye("nonexistent", 1, players);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Player not found or already dropped");
  });

  it("returns error when player is dropped", () => {
    const players = [createTournamentPlayer({ id: "p1", isDropped: true })];
    const result = assignBye("p1", 1, players);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Player not found or already dropped");
  });

  it("does not modify other players' bye counts", () => {
    const players = createPlayers(3);
    const result = assignBye("p1", 1, players);

    for (const player of result.updatedPlayers) {
      if (player.id !== "p1") {
        expect(player.byeCount).toBe(0);
      }
    }
  });
});

describe("handlePlayerDrop", () => {
  it("drops the player and assigns a bye if needed", () => {
    // 5 active players -> drop 1 -> 4 active (even), no bye needed
    const players = createPlayers(5);
    const dropReq = createDropRequest({ playerId: "p1" });

    const result = handlePlayerDrop(dropReq, players, "between_rounds");

    expect(result.success).toBe(true);
    // 5 players minus 1 drop = 4 active (even), no bye needed
    expect(result.byeAssignment).toBeUndefined();
  });

  it("assigns bye when drop creates odd number of active players", () => {
    // 4 active players -> drop 1 -> 3 active (odd), bye needed
    const players = createPlayers(4);
    const dropReq = createDropRequest({ playerId: "p1" });

    const result = handlePlayerDrop(dropReq, players, "between_rounds");

    expect(result.success).toBe(true);
    expect(result.byeAssignment).toBeDefined();
    expect(result.byeAssignment?.matchPoints).toBe(1);
  });

  it("sets opponentAutoWin when dropping during a match", () => {
    const players = createPlayers(4);
    const dropReq = createDropRequest({ playerId: "p1" });

    const result = handlePlayerDrop(dropReq, players, "during_match");

    expect(result.success).toBe(true);
    expect(result.opponentAutoWin).toBe(true);
    // Bye assignment is only checked when NOT during a match
    expect(result.byeAssignment).toBeUndefined();
  });

  it("returns error when the player cannot be dropped", () => {
    const players = [createTournamentPlayer({ id: "p1", isDropped: true })];
    const dropReq = createDropRequest({ playerId: "p1" });

    const result = handlePlayerDrop(dropReq, players, "between_rounds");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Player not found or already dropped");
  });
});

describe("processDropsForRound", () => {
  it("processes multiple drops successfully", () => {
    const players = createPlayers(6);
    const drops = [
      createDropRequest({ playerId: "p1" }),
      createDropRequest({ playerId: "p2" }),
    ];

    const result = processDropsForRound(drops, players, 2);

    expect(result.success).toBe(true);
    expect(result.processedDrops).toHaveLength(2);

    // 6 - 2 = 4 active (even), no bye
    expect(result.byeAssignment).toBeUndefined();
  });

  it("assigns a bye when drops create odd active players", () => {
    const players = createPlayers(6);
    const drops = [createDropRequest({ playerId: "p1" })];

    const result = processDropsForRound(drops, players, 2);

    expect(result.success).toBe(true);
    // 6 - 1 = 5 active (odd), bye needed
    expect(result.byeAssignment).toBeDefined();
  });

  it("returns error for invalid drop requests", () => {
    const players = createPlayers(4);
    const drops = [createDropRequest({ playerId: "nonexistent" })];

    const result = processDropsForRound(drops, players, 1);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("handles empty drop requests array", () => {
    const players = createPlayers(4);
    const result = processDropsForRound([], players, 1);

    // No drops processed, so no bye assignment either
    expect(result.success).toBe(true);
    expect(result.processedDrops).toHaveLength(0);
  });
});

describe("getActivePlayerCount", () => {
  it("returns count of non-dropped players", () => {
    const players = [
      createTournamentPlayer({ id: "p1" }),
      createTournamentPlayer({ id: "p2", isDropped: true }),
      createTournamentPlayer({ id: "p3" }),
      createTournamentPlayer({ id: "p4", isDropped: true }),
    ];

    expect(getActivePlayerCount(players)).toBe(2);
  });

  it("returns 0 when all players are dropped", () => {
    const players = [
      createTournamentPlayer({ id: "p1", isDropped: true }),
      createTournamentPlayer({ id: "p2", isDropped: true }),
    ];

    expect(getActivePlayerCount(players)).toBe(0);
  });

  it("returns total count when no players are dropped", () => {
    const players = createPlayers(5);
    expect(getActivePlayerCount(players)).toBe(5);
  });

  it("returns 0 for empty array", () => {
    expect(getActivePlayerCount([])).toBe(0);
  });
});

describe("hasMinimumPlayers", () => {
  it("returns true when active players meet the default minimum (4)", () => {
    const players = createPlayers(4);
    expect(hasMinimumPlayers(players)).toBe(true);
  });

  it("returns false when active players are below the default minimum", () => {
    const players = createPlayers(3);
    expect(hasMinimumPlayers(players)).toBe(false);
  });

  it("accepts a custom minimum parameter", () => {
    const players = createPlayers(2);
    expect(hasMinimumPlayers(players, 2)).toBe(true);
    expect(hasMinimumPlayers(players, 3)).toBe(false);
  });

  it("excludes dropped players from the count", () => {
    const players = [
      createTournamentPlayer({ id: "p1" }),
      createTournamentPlayer({ id: "p2" }),
      createTournamentPlayer({ id: "p3" }),
      createTournamentPlayer({ id: "p4", isDropped: true }),
      createTournamentPlayer({ id: "p5", isDropped: true }),
    ];

    // 3 active out of 5 total
    expect(hasMinimumPlayers(players)).toBe(false); // default 4
    expect(hasMinimumPlayers(players, 3)).toBe(true);
  });
});

describe("getPlayersWithByes", () => {
  it("returns only active players who have received byes", () => {
    const players = [
      createTournamentPlayer({ id: "p1", byeCount: 1 }),
      createTournamentPlayer({ id: "p2", byeCount: 0 }),
      createTournamentPlayer({ id: "p3", byeCount: 2 }),
      createTournamentPlayer({ id: "p4", byeCount: 1, isDropped: true }),
    ];

    const result = getPlayersWithByes(players);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toContain("p1");
    expect(result.map((p) => p.id)).toContain("p3");
    // Dropped player should not be included
    expect(result.map((p) => p.id)).not.toContain("p4");
  });

  it("returns empty array when no active player has byes", () => {
    const players = createPlayers(4);
    expect(getPlayersWithByes(players)).toHaveLength(0);
  });
});

describe("getPlayersWithoutByes", () => {
  it("returns only active players who have not received byes", () => {
    const players = [
      createTournamentPlayer({ id: "p1", byeCount: 1 }),
      createTournamentPlayer({ id: "p2", byeCount: 0 }),
      createTournamentPlayer({ id: "p3", byeCount: 0 }),
    ];

    const result = getPlayersWithoutByes(players);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(["p2", "p3"]);
  });

  it("excludes dropped players", () => {
    const players = [
      createTournamentPlayer({ id: "p1", byeCount: 0, isDropped: true }),
      createTournamentPlayer({ id: "p2", byeCount: 0 }),
    ];

    const result = getPlayersWithoutByes(players);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("p2");
  });
});

describe("calculateTotalMatchPoints", () => {
  it("adds match points and bye count", () => {
    const player = createTournamentPlayer({
      matchPoints: 3,
      byeCount: 1,
    });

    // 3 match points + 1 bye = 4 total
    expect(calculateTotalMatchPoints(player)).toBe(4);
  });

  it("returns just match points when no byes", () => {
    const player = createTournamentPlayer({
      matchPoints: 5,
      byeCount: 0,
    });

    expect(calculateTotalMatchPoints(player)).toBe(5);
  });

  it("returns just bye count when no match point wins", () => {
    const player = createTournamentPlayer({
      matchPoints: 0,
      byeCount: 2,
    });

    expect(calculateTotalMatchPoints(player)).toBe(2);
  });

  it("returns 0 when player has no points and no byes", () => {
    const player = createTournamentPlayer({
      matchPoints: 0,
      byeCount: 0,
    });

    expect(calculateTotalMatchPoints(player)).toBe(0);
  });
});

describe("validateDropTiming", () => {
  it("allows drops during pairing phase", () => {
    const result = validateDropTiming("pairing", false);
    expect(result.canDrop).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows drops between rounds", () => {
    const result = validateDropTiming("between_rounds", false);
    expect(result.canDrop).toBe(true);
  });

  it("blocks drops during active rounds when round has started", () => {
    const result = validateDropTiming("during_round", true);
    expect(result.canDrop).toBe(false);
    expect(result.reason).toContain("cannot drop during active rounds");
  });

  it("blocks drops during active matches", () => {
    const result = validateDropTiming("during_match", false);
    expect(result.canDrop).toBe(false);
    expect(result.reason).toContain("cannot drop during active matches");
  });

  it("allows drops during_round when round has not started", () => {
    // When roundStarted is false, during_round check should pass
    // because the condition is: currentPhase === "during_round" && roundStarted
    const result = validateDropTiming("during_round", false);
    expect(result.canDrop).toBe(true);
  });
});
