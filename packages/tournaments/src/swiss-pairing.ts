/**
 * Swiss Tournament Pairing Algorithm
 *
 * Implements standard Swiss pairing rules for Pokemon VGC tournaments:
 * 1. Players are paired based on their current standings
 * 2. Players cannot be paired against the same opponent twice
 * 3. Players with similar records are paired together
 * 4. Odd number of players results in one bye (lowest rated player who hasn't had a bye)
 */

export interface PlayerRecord {
  profileId: string;
  displayName: string;
  matchPoints: number; // 1 for win, 0 for loss (no ties in Pokemon VGC)
  gameWins: number;
  gameLosses: number;
  gameWinPercentage: number;
  opponentMatchWinPercentage: number; // Resistance for tiebreakers
  opponentGameWinPercentage: number;
  hasReceivedBye: boolean;
  isDropped: boolean;
  previousOpponents: string[];
  roundsPlayed: number;
}

export interface SwissPairing {
  profile1Id: string;
  profile2Id: string | null; // null indicates a bye
  isBye: boolean;
}

export interface SwissPairingResult {
  pairings: SwissPairing[];
  success: boolean;
  errors: string[];
}

/**
 * Generate Swiss pairings for a tournament round
 */
export function generateSwissPairings(
  players: PlayerRecord[],
  roundNumber: number
): SwissPairingResult {
  const errors: string[] = [];

  // Filter out dropped players
  const activePlayers = players.filter((p) => !p.isDropped);

  if (activePlayers.length < 2) {
    return {
      pairings: [],
      success: false,
      errors: ["Not enough active players to generate pairings"],
    };
  }

  // Sort players by Swiss standings (match points, then tiebreakers)
  const sortedPlayers = [...activePlayers].sort(comparePlayersByStandings);

  // For round 1, use random pairings to avoid skill-based initial seeding
  if (roundNumber === 1) {
    return generateFirstRoundPairings(sortedPlayers);
  }

  // For subsequent rounds, use Swiss pairing algorithm
  return generateSwissRoundPairings(sortedPlayers, errors);
}

/**
 * Compare players by Swiss standings (for sorting)
 */
function comparePlayersByStandings(a: PlayerRecord, b: PlayerRecord): number {
  // 1. Match points (higher is better)
  if (a.matchPoints !== b.matchPoints) {
    return b.matchPoints - a.matchPoints;
  }

  // 2. Opponent Match Win Percentage (higher is better)
  if (a.opponentMatchWinPercentage !== b.opponentMatchWinPercentage) {
    return b.opponentMatchWinPercentage - a.opponentMatchWinPercentage;
  }

  // 3. Game Win Percentage (higher is better)
  if (a.gameWinPercentage !== b.gameWinPercentage) {
    return b.gameWinPercentage - a.gameWinPercentage;
  }

  // 4. Opponent Game Win Percentage (higher is better)
  return b.opponentGameWinPercentage - a.opponentGameWinPercentage;
}

/**
 * Fisher-Yates shuffle algorithm for randomizing array order
 * Creates a new array with elements in random order
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Generate random pairings for round 1
 */
function generateFirstRoundPairings(
  players: PlayerRecord[]
): SwissPairingResult {
  const shuffled = shuffleArray(players);
  const pairings: SwissPairing[] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    const player1 = shuffled[i];
    const player2 = shuffled[i + 1];

    if (player1 && player2) {
      // Normal pairing
      pairings.push({
        profile1Id: player1.profileId,
        profile2Id: player2.profileId,
        isBye: false,
      });
    } else if (player1) {
      // Bye for the last player
      pairings.push({
        profile1Id: player1.profileId,
        profile2Id: null,
        isBye: true,
      });
    }
  }

  return {
    pairings,
    success: true,
    errors: [],
  };
}

/**
 * Generate Swiss pairings for rounds 2+
 */
function generateSwissRoundPairings(
  sortedPlayers: PlayerRecord[],
  errors: string[]
): SwissPairingResult {
  const pairings: SwissPairing[] = [];
  const unpaired = [...sortedPlayers];

  // Handle bye first if odd number of players
  if (unpaired.length % 2 === 1) {
    const byePlayer = findByePlayer(unpaired);
    if (byePlayer) {
      pairings.push({
        profile1Id: byePlayer.profileId,
        profile2Id: null,
        isBye: true,
      });
      // Remove bye player from unpaired list
      const byeIndex = unpaired.findIndex(
        (p) => p.profileId === byePlayer.profileId
      );
      unpaired.splice(byeIndex, 1);
    } else {
      errors.push(
        "Could not assign bye - all players have already received one"
      );
    }
  }

  // Pair remaining players using Swiss algorithm
  const pairingResult = pairPlayersSwiss(unpaired);

  if (!pairingResult.success) {
    errors.push(...pairingResult.errors);
    // Fallback to best-effort pairing
    const fallbackPairings = generateFallbackPairings(unpaired);
    pairings.push(...fallbackPairings);
  } else {
    pairings.push(...pairingResult.pairings);
  }

  return {
    pairings,
    success: errors.length === 0,
    errors,
  };
}

/**
 * Find the best player to receive a bye
 */
function findByePlayer(players: PlayerRecord[]): PlayerRecord | null {
  // First preference: players who haven't had a bye yet, starting from lowest standing
  const noByePlayers = players.filter((p) => !p.hasReceivedBye);
  if (noByePlayers.length > 0) {
    return noByePlayers[noByePlayers.length - 1] ?? null; // Lowest standing player
  }

  // If all players have had a bye, give it to the lowest standing player
  return players[players.length - 1] ?? null;
}

/**
 * Pair players using Swiss algorithm with backtracking
 */
function pairPlayersSwiss(players: PlayerRecord[]): SwissPairingResult {
  const pairings: SwissPairing[] = [];
  const used = new Set<string>();

  // Group players by match points for more efficient pairing
  const pointGroups = groupPlayersByPoints(players);

  // Try to pair within point groups first, then across groups
  for (const [, groupPlayers] of Array.from(pointGroups.entries())) {
    const availablePlayers = groupPlayers.filter((p) => !used.has(p.profileId));

    // Pair within this point group
    const groupPairings = pairWithinGroup(availablePlayers, used);
    pairings.push(...groupPairings);
  }

  // Check if all players are paired
  const totalPlayers = players.length;
  const pairedPlayers = pairings.length * 2;

  if (pairedPlayers !== totalPlayers) {
    // Try cross-group pairing for remaining players
    const remainingPlayers = players.filter((p) => !used.has(p.profileId));
    const crossPairings = pairAcrossGroups(remainingPlayers);
    pairings.push(...crossPairings);
  }

  return {
    pairings,
    success: pairings.length * 2 === players.length,
    errors: [],
  };
}

/**
 * Group players by match points
 */
function groupPlayersByPoints(
  players: PlayerRecord[]
): Map<number, PlayerRecord[]> {
  const groups = new Map<number, PlayerRecord[]>();

  for (const player of players) {
    const points = player.matchPoints;
    const existing = groups.get(points);
    if (existing) {
      existing.push(player);
    } else {
      groups.set(points, [player]);
    }
  }

  // Sort groups by points (highest first)
  const entriesArray = Array.from(groups.entries());
  const sortedEntries = entriesArray.sort(
    ([pointsA], [pointsB]) => pointsB - pointsA
  );
  return new Map(sortedEntries);
}

/**
 * Pair players within the same point group
 */
function pairWithinGroup(
  players: PlayerRecord[],
  used: Set<string>
): SwissPairing[] {
  const pairings: SwissPairing[] = [];
  const available = players.filter((p) => !used.has(p.profileId));

  for (let i = 0; i < available.length - 1; i += 2) {
    const player1 = available[i];
    if (!player1) continue;

    const player2 = findBestOpponent(player1, available.slice(i + 1));

    if (player2) {
      pairings.push({
        profile1Id: player1.profileId,
        profile2Id: player2.profileId,
        isBye: false,
      });

      used.add(player1.profileId);
      used.add(player2.profileId);

      // Remove player2 from available list for next iteration
      const player2Index = available.findIndex(
        (p) => p.profileId === player2.profileId
      );
      available.splice(player2Index, 1);
    }
  }

  return pairings;
}

/**
 * Find the best opponent for a player
 */
function findBestOpponent(
  player: PlayerRecord,
  candidates: PlayerRecord[]
): PlayerRecord | null {
  // Filter out players this player has already faced
  const validOpponents = candidates.filter(
    (candidate) => !player.previousOpponents.includes(candidate.profileId)
  );

  if (validOpponents.length === 0) {
    // If no valid opponents, return the first candidate (allowing rematch)
    return candidates[0] ?? null;
  }

  // Return the first valid opponent (they're already sorted by standing)
  return validOpponents[0] ?? null;
}

/**
 * Pair remaining players across different point groups
 */
function pairAcrossGroups(players: PlayerRecord[]): SwissPairing[] {
  const pairings: SwissPairing[] = [];
  const available = [...players];

  while (available.length >= 2) {
    const player1 = available.shift();
    if (!player1) break;

    const player2 = findBestOpponent(player1, available);

    if (player2) {
      pairings.push({
        profile1Id: player1.profileId,
        profile2Id: player2.profileId,
        isBye: false,
      });

      // Remove player2 from available
      const player2Index = available.findIndex(
        (p) => p.profileId === player2.profileId
      );
      available.splice(player2Index, 1);
    }
  }

  return pairings;
}

/**
 * Generate fallback pairings when Swiss algorithm fails
 */
function generateFallbackPairings(players: PlayerRecord[]): SwissPairing[] {
  const pairings: SwissPairing[] = [];

  for (let i = 0; i < players.length; i += 2) {
    const player1 = players[i];
    const player2 = players[i + 1];

    if (player1 && player2) {
      pairings.push({
        profile1Id: player1.profileId,
        profile2Id: player2.profileId,
        isBye: false,
      });
    }
  }

  return pairings;
}

/**
 * Calculate game win percentage (minimum 33% for tiebreaker purposes)
 */
export function calculateGameWinPercentage(
  wins: number,
  losses: number
): number {
  const total = wins + losses;
  if (total === 0) return 0.33; // Default for players with no games

  const percentage = wins / total;
  return Math.max(percentage, 0.33); // Minimum 33% per tournament rules
}

/**
 * Calculate match win percentage (minimum 33% for tiebreaker purposes)
 * Pokemon VGC: 1 point for win, 0 for loss
 */
export function calculateMatchWinPercentage(
  matchPoints: number,
  totalRounds: number
): number {
  if (totalRounds === 0) return 0.33;

  const percentage = matchPoints / totalRounds; // 1 point per round max in Pokemon VGC
  return Math.max(percentage, 0.33); // Minimum 33% per tournament rules
}

/**
 * Check if a player meets X-2 record for asymmetric cut
 */
export function hasXMinus2Record(
  matchPoints: number,
  totalRounds: number
): boolean {
  const losses = totalRounds - matchPoints;
  return losses <= 2;
}

/**
 * Calculate resistance (Opponent Match Win Percentage) for tiebreakers
 */
export function calculateResistance(
  opponentRecords: Array<{ matchPoints: number; roundsPlayed: number }>
): number {
  if (opponentRecords.length === 0) return 0.33;

  let totalOpponentMatchWinPercentage = 0;

  for (const opponent of opponentRecords) {
    const opponentMWP = calculateMatchWinPercentage(
      opponent.matchPoints,
      opponent.roundsPlayed
    );
    totalOpponentMatchWinPercentage += opponentMWP;
  }

  return totalOpponentMatchWinPercentage / opponentRecords.length;
}
