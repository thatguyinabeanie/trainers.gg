/**
 * Drop and Bye Handling
 *
 * Manages player drops and bye assignments for Pokemon VGC tournaments.
 * Handles mid-tournament drops and automatic bye reassignment.
 */

export interface TournamentPlayerWithStatus {
  id: string;
  name: string;
  isDropped: boolean;
  byeCount: number;
  matchPoints: number;
  roundsPlayed: number;
}

export interface DropRequest {
  playerId: string;
  tournamentId: string;
  roundNumber: number;
  reason?: string;
  droppedAt: Date;
}

export interface ByeRecord {
  playerId: string;
  roundNumber: number;
  matchPoints: number; // Byes award 1 match point in Pokemon VGC
}

export interface DropResult {
  success: boolean;
  updatedPlayers: TournamentPlayerWithStatus[];
  dropRecord?: DropRequest;
  error?: string;
}

export interface ByeResult {
  success: boolean;
  updatedPlayers: TournamentPlayerWithStatus[];
  byeRecord?: ByeRecord;
  error?: string;
}

export interface DropHandlingResult {
  success: boolean;
  updatedPlayers: TournamentPlayerWithStatus[];
  dropRecord?: DropRequest;
  byeAssignment?: ByeRecord;
  opponentAutoWin?: boolean;
  error?: string;
}

export interface ProcessDropsResult {
  success: boolean;
  updatedPlayers: TournamentPlayerWithStatus[];
  processedDrops: DropRequest[];
  byeAssignment?: ByeRecord;
  errors?: string[];
}

export type TournamentPhase =
  | "pairing"
  | "during_match"
  | "between_rounds"
  | "during_round";

/**
 * Check if a player can drop from the tournament
 */
export function canPlayerDrop(
  playerId: string,
  currentPhase: TournamentPhase,
  players: TournamentPlayerWithStatus[]
): boolean {
  const player = players.find((p) => p.id === playerId);

  // Player must exist and not already be dropped
  if (!player || player.isDropped) {
    return false;
  }

  // Pokemon VGC: Players can only drop between rounds, not during active matches
  if (currentPhase === "during_round") {
    return false;
  }

  return true;
}

/**
 * Drop a player from the tournament
 */
export function dropPlayer(
  dropRequest: DropRequest,
  players: TournamentPlayerWithStatus[]
): DropResult {
  const player = players.find((p) => p.id === dropRequest.playerId);

  if (!player || player.isDropped) {
    return {
      success: false,
      updatedPlayers: players,
      error: "Player not found or already dropped",
    };
  }

  const updatedPlayers = players.map((p) =>
    p.id === dropRequest.playerId ? { ...p, isDropped: true } : p
  );

  return {
    success: true,
    updatedPlayers,
    dropRecord: dropRequest,
  };
}

/**
 * Find the best candidate for receiving a bye
 * Priority: Lowest standing player who hasn't received a bye yet
 * If all have byes, pick lowest standing regardless
 */
export function findByeCandidate(
  players: TournamentPlayerWithStatus[]
): TournamentPlayerWithStatus | null {
  const activePlayers = players.filter((p) => !p.isDropped);

  // No bye needed for even number of players
  if (activePlayers.length % 2 === 0) {
    return null;
  }

  // Sort by bye priority: byeCount ASC, matchPoints ASC
  // This prioritizes players who haven't had byes yet, then lowest standing
  const sorted = [...activePlayers].sort((a, b) => {
    // First priority: players without byes
    if (a.byeCount !== b.byeCount) {
      return a.byeCount - b.byeCount;
    }

    // Second priority: lowest match points (worst standing)
    return a.matchPoints - b.matchPoints;
  });

  return sorted[0] ?? null;
}

/**
 * Assign a bye to a specific player
 */
export function assignBye(
  playerId: string,
  roundNumber: number,
  players: TournamentPlayerWithStatus[]
): ByeResult {
  const player = players.find((p) => p.id === playerId);

  if (!player || player.isDropped) {
    return {
      success: false,
      updatedPlayers: players,
      error: "Player not found or already dropped",
    };
  }

  const updatedPlayers = players.map((p) =>
    p.id === playerId ? { ...p, byeCount: p.byeCount + 1 } : p
  );

  const byeRecord: ByeRecord = {
    playerId,
    roundNumber,
    matchPoints: 1, // Pokemon VGC: Byes award 1 match point
  };

  return {
    success: true,
    updatedPlayers,
    byeRecord,
  };
}

/**
 * Handle a player drop and any resulting bye assignment
 */
export function handlePlayerDrop(
  dropRequest: DropRequest,
  players: TournamentPlayerWithStatus[],
  currentPhase: TournamentPhase
): DropHandlingResult {
  // First, drop the player
  const dropResult = dropPlayer(dropRequest, players);

  if (!dropResult.success) {
    return {
      success: false,
      updatedPlayers: players,
      error: dropResult.error,
    };
  }

  let finalPlayers = dropResult.updatedPlayers;
  let byeAssignment: ByeRecord | undefined;
  let opponentAutoWin = false;

  // Handle different phases
  if (currentPhase === "during_match") {
    // During active match: opponent gets automatic win
    opponentAutoWin = true;
  } else {
    // During pairing or between rounds: check if bye is needed
    const byeCandidate = findByeCandidate(finalPlayers);

    if (byeCandidate) {
      const byeResult = assignBye(
        byeCandidate.id,
        dropRequest.roundNumber,
        finalPlayers
      );

      if (byeResult.success) {
        finalPlayers = byeResult.updatedPlayers;
        byeAssignment = byeResult.byeRecord;
      }
    }
  }

  return {
    success: true,
    updatedPlayers: finalPlayers,
    dropRecord: dropRequest,
    byeAssignment,
    opponentAutoWin,
  };
}

/**
 * Process multiple drops for a round and handle resulting bye assignment
 */
export function processDropsForRound(
  dropRequests: DropRequest[],
  players: TournamentPlayerWithStatus[],
  roundNumber: number
): ProcessDropsResult {
  let currentPlayers = [...players];
  const processedDrops: DropRequest[] = [];
  const errors: string[] = [];

  // Process all drops first
  for (const dropRequest of dropRequests) {
    const dropResult = dropPlayer(dropRequest, currentPlayers);

    if (dropResult.success) {
      currentPlayers = dropResult.updatedPlayers;
      processedDrops.push(dropRequest);
    } else {
      errors.push(
        `Failed to drop player ${dropRequest.playerId}: ${dropResult.error}`
      );
    }
  }

  // If any drops failed, return error
  if (errors.length > 0) {
    return {
      success: false,
      updatedPlayers: players,
      processedDrops: [],
      errors,
    };
  }

  // Check if bye is needed after all drops
  const byeCandidate = findByeCandidate(currentPlayers);
  let byeAssignment: ByeRecord | undefined;

  if (byeCandidate) {
    const byeResult = assignBye(byeCandidate.id, roundNumber, currentPlayers);

    if (byeResult.success) {
      currentPlayers = byeResult.updatedPlayers;
      byeAssignment = byeResult.byeRecord;
    }
  }

  return {
    success: true,
    updatedPlayers: currentPlayers,
    processedDrops,
    byeAssignment,
  };
}

/**
 * Get active (non-dropped) players count
 */
export function getActivePlayerCount(
  players: TournamentPlayerWithStatus[]
): number {
  return players.filter((p) => !p.isDropped).length;
}

/**
 * Check if tournament has minimum viable players
 */
export function hasMinimumPlayers(
  players: TournamentPlayerWithStatus[],
  minimumRequired: number = 4
): boolean {
  return getActivePlayerCount(players) >= minimumRequired;
}

/**
 * Get players who have received byes
 */
export function getPlayersWithByes(
  players: TournamentPlayerWithStatus[]
): TournamentPlayerWithStatus[] {
  return players.filter((p) => !p.isDropped && p.byeCount > 0);
}

/**
 * Get players who haven't received byes yet
 */
export function getPlayersWithoutByes(
  players: TournamentPlayerWithStatus[]
): TournamentPlayerWithStatus[] {
  return players.filter((p) => !p.isDropped && p.byeCount === 0);
}

/**
 * Calculate total match points including byes
 */
export function calculateTotalMatchPoints(
  player: TournamentPlayerWithStatus
): number {
  // Each bye awards 1 match point
  return player.matchPoints + player.byeCount;
}

/**
 * Validate drop timing (Pokemon VGC specific rules)
 */
export function validateDropTiming(
  currentPhase: TournamentPhase,
  roundStarted: boolean
): { canDrop: boolean; reason?: string } {
  if (currentPhase === "during_round" && roundStarted) {
    return {
      canDrop: false,
      reason:
        "Players cannot drop during active rounds. Please wait until round completion.",
    };
  }

  if (currentPhase === "during_match") {
    return {
      canDrop: false,
      reason:
        "Players cannot drop during active matches. This will result in opponent auto-win.",
    };
  }

  return { canDrop: true };
}
