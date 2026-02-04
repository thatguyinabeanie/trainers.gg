export interface PlayerStanding {
  playerId: string;
  playerName: string;
  matchPoints: number;
  matchesPlayed: number;
  matchWinPercentage: number;
  gameWins: number;
  gamePoints: number;
  gameWinPercentage: number;
  opponentMatchWinPercentage: number;
  opponentGameWinPercentage: number;
  rank: number;
}

export interface MatchResult {
  id: string;
  roundNumber: number;
  player1Id: string;
  player2Id: string | null; // null for bye
  player1MatchPoints: number;
  player2MatchPoints: number;
  player1GameWins: number;
  player2GameWins: number;
  isBye: boolean;
}

export interface Player {
  id: string;
  name: string;
}

/**
 * Calculate match win percentage with minimum 33% floor
 * Pokemon VGC scoring: 1 point for win, 0 for loss (no ties)
 */
export function calculateMatchWinPercentage(
  matchPoints: number,
  matchesPlayed: number
): number {
  if (matchesPlayed === 0) return 0.5; // Default for players with no matches

  const percentage = matchPoints / matchesPlayed;
  return Math.max(percentage, 0.33); // Minimum 33% per tournament rules
}

/**
 * Calculate game win percentage with minimum 33% floor
 */
export function calculateGameWinPercentage(
  gameWins: number,
  totalGames: number
): number {
  if (totalGames === 0) return 0.5; // Default for players with no games

  const percentage = gameWins / totalGames;
  return Math.max(percentage, 0.33); // Minimum 33% per tournament rules
}

/**
 * Calculate opponent match win percentage (OMW%)
 * This is the average match win percentage of all opponents played
 */
export function calculateOpponentMatchWinPercentage(
  playerId: string,
  playerMatches: MatchResult[],
  allMatches: MatchResult[]
): number {
  const opponents = getOpponentIds(playerId, playerMatches);

  if (opponents.length === 0) {
    return 0.5; // Default when no opponents
  }

  const opponentWinPercentages = opponents.map((opponentId) => {
    const opponentMatches = allMatches.filter(
      (match) =>
        (match.player1Id === opponentId || match.player2Id === opponentId) &&
        !match.isBye
    );

    const { matchPoints, matchesPlayed } = calculatePlayerMatchRecord(
      opponentId,
      opponentMatches
    );
    return calculateMatchWinPercentage(matchPoints, matchesPlayed);
  });

  return (
    opponentWinPercentages.reduce((sum, percentage) => sum + percentage, 0) /
    opponentWinPercentages.length
  );
}

/**
 * Calculate opponent game win percentage (OGW%)
 * This is the average game win percentage of all opponents played
 */
export function calculateOpponentGameWinPercentage(
  playerId: string,
  playerMatches: MatchResult[],
  allMatches: MatchResult[]
): number {
  const opponents = getOpponentIds(playerId, playerMatches);

  if (opponents.length === 0) {
    return 0.5; // Default when no opponents
  }

  const opponentWinPercentages = opponents.map((opponentId) => {
    const opponentMatches = allMatches.filter(
      (match) =>
        (match.player1Id === opponentId || match.player2Id === opponentId) &&
        !match.isBye
    );

    const { gameWins, totalGames } = calculatePlayerGameRecord(
      opponentId,
      opponentMatches
    );
    return calculateGameWinPercentage(gameWins, totalGames);
  });

  return (
    opponentWinPercentages.reduce((sum, percentage) => sum + percentage, 0) /
    opponentWinPercentages.length
  );
}

/**
 * Get list of opponent IDs for a player
 */
function getOpponentIds(
  playerId: string,
  playerMatches: MatchResult[]
): string[] {
  return playerMatches
    .filter((match) => !match.isBye)
    .map((match) => {
      if (match.player1Id === playerId) {
        return match.player2Id;
      } else if (match.player2Id === playerId) {
        return match.player1Id;
      }
      return null;
    })
    .filter((id): id is string => id !== null);
}

/**
 * Calculate a player's match record (points and games played)
 */
function calculatePlayerMatchRecord(
  playerId: string,
  matches: MatchResult[]
): {
  matchPoints: number;
  matchesPlayed: number;
} {
  let matchPoints = 0;
  let matchesPlayed = 0;

  for (const match of matches) {
    if (match.player1Id === playerId) {
      matchPoints += match.player1MatchPoints;
      matchesPlayed++;
    } else if (match.player2Id === playerId) {
      matchPoints += match.player2MatchPoints;
      matchesPlayed++;
    }
  }

  return { matchPoints, matchesPlayed };
}

/**
 * Calculate a player's game record (wins and total games)
 */
function calculatePlayerGameRecord(
  playerId: string,
  matches: MatchResult[]
): {
  gameWins: number;
  totalGames: number;
} {
  let gameWins = 0;
  let totalGames = 0;

  for (const match of matches) {
    if (match.isBye) continue; // Byes don't count for game records

    if (match.player1Id === playerId) {
      gameWins += match.player1GameWins;
      totalGames += match.player1GameWins + match.player2GameWins;
    } else if (match.player2Id === playerId) {
      gameWins += match.player2GameWins;
      totalGames += match.player1GameWins + match.player2GameWins;
    }
  }

  return { gameWins, totalGames };
}

/**
 * Calculate complete tournament standings with all tiebreakers
 * Sorting priority:
 * 1. Match Points (descending)
 * 2. Opponent Match Win % (descending)
 * 3. Game Win % (descending)
 * 4. Opponent Game Win % (descending)
 */
export function calculateStandings(
  players: Player[],
  matches: MatchResult[]
): PlayerStanding[] {
  const standings: PlayerStanding[] = players.map((player) => {
    const playerMatches = matches.filter(
      (match) => match.player1Id === player.id || match.player2Id === player.id
    );

    const { matchPoints, matchesPlayed } = calculatePlayerMatchRecord(
      player.id,
      playerMatches
    );
    const { gameWins, totalGames } = calculatePlayerGameRecord(
      player.id,
      playerMatches
    );

    const matchWinPercentage = calculateMatchWinPercentage(
      matchPoints,
      matchesPlayed
    );
    const gameWinPercentage = calculateGameWinPercentage(gameWins, totalGames);
    const opponentMatchWinPercentage = calculateOpponentMatchWinPercentage(
      player.id,
      playerMatches,
      matches
    );
    const opponentGameWinPercentage = calculateOpponentGameWinPercentage(
      player.id,
      playerMatches,
      matches
    );

    return {
      playerId: player.id,
      playerName: player.name,
      matchPoints,
      matchesPlayed,
      matchWinPercentage,
      gameWins,
      gamePoints: totalGames, // Total games played
      gameWinPercentage,
      opponentMatchWinPercentage,
      opponentGameWinPercentage,
      rank: 0, // Will be set after sorting
    };
  });

  // Sort by tournament rules priority
  standings.sort((a, b) => {
    // 1. Match Points (descending)
    if (a.matchPoints !== b.matchPoints) {
      return b.matchPoints - a.matchPoints;
    }

    // 2. Opponent Match Win % (descending)
    if (
      Math.abs(a.opponentMatchWinPercentage - b.opponentMatchWinPercentage) >
      0.001
    ) {
      return b.opponentMatchWinPercentage - a.opponentMatchWinPercentage;
    }

    // 3. Game Win % (descending)
    if (Math.abs(a.gameWinPercentage - b.gameWinPercentage) > 0.001) {
      return b.gameWinPercentage - a.gameWinPercentage;
    }

    // 4. Opponent Game Win % (descending)
    return b.opponentGameWinPercentage - a.opponentGameWinPercentage;
  });

  // Assign ranks
  standings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  return standings;
}
