/**
 * Swiss Pairing Algorithm
 *
 * Implements the Swiss-system tournament pairing algorithm used in VGC and other
 * competitive Pokemon formats. The algorithm pairs players based on:
 *
 * 1. Match points (players with similar records play each other)
 * 2. Opponent history (avoid rematches)
 * 3. Bye handling (players who haven't had a bye get priority)
 *
 * For VGC-style tournaments, we use a simplified Swiss system where:
 * - Players are grouped by match points
 * - Within each group, players are paired top-down
 * - If odd number in a group, the lowest player pairs down to the next group
 * - Byes are assigned to the lowest-ranked player without a previous bye
 */

export interface PlayerForPairing {
  altId: number;
  matchPoints: number;
  gameWinPercentage: number;
  opponentMatchWinPercentage: number;
  opponentHistory: number[]; // Array of opponent altIds
  hasReceivedBye: boolean;
  isDropped: boolean;
  currentSeed?: number;
}

export interface Pairing {
  alt1Id: number;
  alt2Id: number | null; // null indicates a bye
  alt1Seed: number;
  alt2Seed: number | null;
  isBye: boolean;
  pairingReason: string;
  tableNumber: number;
}

export interface PairingResult {
  pairings: Pairing[];
  warnings: string[];
  algorithm: string;
}

/**
 * Group players by their match points
 */
function groupByMatchPoints(
  players: PlayerForPairing[]
): Map<number, PlayerForPairing[]> {
  const groups = new Map<number, PlayerForPairing[]>();

  for (const player of players) {
    const points = player.matchPoints;
    const group = groups.get(points) ?? [];
    group.push(player);
    groups.set(points, group);
  }

  return groups;
}

/**
 * Sort players within a point group by tiebreakers
 * VGC uses: Opponent Match Win %, then Game Win %
 */
function sortByTiebreakers(players: PlayerForPairing[]): PlayerForPairing[] {
  return [...players].sort((a, b) => {
    // First by opponent match win percentage (higher is better)
    if (b.opponentMatchWinPercentage !== a.opponentMatchWinPercentage) {
      return b.opponentMatchWinPercentage - a.opponentMatchWinPercentage;
    }
    // Then by game win percentage (higher is better)
    if (b.gameWinPercentage !== a.gameWinPercentage) {
      return b.gameWinPercentage - a.gameWinPercentage;
    }
    // Finally by seed (lower seed is better - they were ranked higher initially)
    return (a.currentSeed ?? 999) - (b.currentSeed ?? 999);
  });
}

/**
 * Check if two players have already played each other
 */
function havePlayedBefore(
  player1: PlayerForPairing,
  player2: PlayerForPairing
): boolean {
  return (
    player1.opponentHistory.includes(player2.altId) ||
    player2.opponentHistory.includes(player1.altId)
  );
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
 * Check if this is effectively Round 1 (all players at 0 match points)
 */
function isRound1(players: PlayerForPairing[]): boolean {
  return players.every((p) => p.matchPoints === 0);
}

/**
 * Find the best opponent for a player from available players
 * Returns null if no valid opponent found
 */
function findBestOpponent(
  player: PlayerForPairing,
  availablePlayers: PlayerForPairing[],
  allowRematches: boolean = false
): PlayerForPairing | null {
  // Filter out players we've already played (unless allowing rematches)
  const validOpponents = allowRematches
    ? availablePlayers
    : availablePlayers.filter((p) => !havePlayedBefore(player, p));

  if (validOpponents.length === 0) {
    return null;
  }

  // Return the first valid opponent (they're already sorted by tiebreakers)
  return validOpponents[0] ?? null;
}

/**
 * Select the player who should receive a bye
 * Priority:
 * 1. Players who haven't received a bye yet
 * 2. Lowest ranked player in the lowest point group
 */
function selectByePlayer(players: PlayerForPairing[]): PlayerForPairing | null {
  // Filter to players who haven't had a bye
  const eligibleForBye = players.filter((p) => !p.hasReceivedBye);

  if (eligibleForBye.length === 0) {
    // Everyone has had a bye - just pick the lowest ranked overall
    const sorted = sortByTiebreakers(players);
    return sorted[sorted.length - 1] ?? null;
  }

  // Sort by match points (ascending) then by tiebreakers (descending within group)
  const sorted = [...eligibleForBye].sort((a, b) => {
    if (a.matchPoints !== b.matchPoints) {
      return a.matchPoints - b.matchPoints; // Lower points first
    }
    // Within same points, lower tiebreakers get bye
    if (a.opponentMatchWinPercentage !== b.opponentMatchWinPercentage) {
      return a.opponentMatchWinPercentage - b.opponentMatchWinPercentage;
    }
    return a.gameWinPercentage - b.gameWinPercentage;
  });

  return sorted[0] ?? null;
}

/**
 * Main Swiss pairing algorithm
 *
 * @param players - Array of players to pair
 * @param roundNumber - Current round number (1-indexed)
 * @returns PairingResult with pairings and any warnings
 */
export function generateSwissPairings(
  players: PlayerForPairing[],
  roundNumber: number
): PairingResult {
  const warnings: string[] = [];

  // Filter out dropped players
  const activePlayers = players.filter((p) => !p.isDropped);

  if (activePlayers.length === 0) {
    return {
      pairings: [],
      warnings: ["No active players to pair"],
      algorithm: "swiss-vgc-v1",
    };
  }

  if (activePlayers.length === 1) {
    // Single player gets a bye
    const player = activePlayers[0]!;
    return {
      pairings: [
        {
          alt1Id: player.altId,
          alt2Id: null,
          alt1Seed: player.currentSeed ?? 1,
          alt2Seed: null,
          isBye: true,
          pairingReason: "Only player remaining",
          tableNumber: 1,
        },
      ],
      warnings: ["Only one active player - awarded bye"],
      algorithm: "swiss-vgc-v1",
    };
  }

  const pairings: Pairing[] = [];
  const pairedPlayers = new Set<number>();
  let tableNumber = 1;

  // Check if this is Round 1 (all players at 0 points) before bye selection
  const isRound1Condition = isRound1(activePlayers);

  // For Round 1, shuffle all players before any pairing logic
  let playersForPairing = isRound1Condition
    ? shuffleArray(activePlayers)
    : activePlayers;

  // Handle odd number of players - assign bye first
  let byePlayer: PlayerForPairing | null = null;
  if (playersForPairing.length % 2 === 1) {
    // For Round 1, take the last player after shuffle as bye
    // For subsequent rounds, use the standard bye selection algorithm
    byePlayer = isRound1Condition
      ? (playersForPairing[playersForPairing.length - 1] ?? null)
      : selectByePlayer(playersForPairing);

    if (byePlayer) {
      pairings.push({
        alt1Id: byePlayer.altId,
        alt2Id: null,
        alt1Seed: byePlayer.currentSeed ?? playersForPairing.length,
        alt2Seed: null,
        isBye: true,
        pairingReason: isRound1Condition
          ? "Random bye (Round 1)"
          : byePlayer.hasReceivedBye
            ? "Lowest ranked player (all players have received bye)"
            : "Lowest ranked player without previous bye",
        tableNumber: 0, // Byes don't need a table
      });
      pairedPlayers.add(byePlayer.altId);
    }
  }

  // Group remaining players by match points
  const remainingPlayers = playersForPairing.filter(
    (p) => !pairedPlayers.has(p.altId)
  );

  const pointGroups = groupByMatchPoints(remainingPlayers);

  // Sort point values in descending order (highest points first)
  const sortedPoints = [...pointGroups.keys()].sort((a, b) => b - a);

  // Pair within each point group, cascading unpaired players down
  let carryOver: PlayerForPairing[] = [];

  for (const points of sortedPoints) {
    const group = pointGroups.get(points) ?? [];
    // For Round 1, players are already shuffled, so maintain that order
    // For subsequent rounds, sort by tiebreakers
    const playersToMatch = isRound1Condition
      ? [...carryOver, ...group]
      : [...carryOver, ...sortByTiebreakers(group)];
    carryOver = [];

    while (playersToMatch.length >= 2) {
      const player1 = playersToMatch.shift()!;

      if (pairedPlayers.has(player1.altId)) {
        continue;
      }

      // Find available opponents (not already paired)
      const availableOpponents = playersToMatch.filter(
        (p) => !pairedPlayers.has(p.altId)
      );

      // Try to find opponent without rematch
      let opponent = findBestOpponent(player1, availableOpponents, false);

      // If no valid opponent without rematch, allow rematches with warning
      if (!opponent && availableOpponents.length > 0) {
        opponent = findBestOpponent(player1, availableOpponents, true);
        if (opponent) {
          warnings.push(
            `Rematch required: Player ${player1.altId} vs ${opponent.altId} (round ${roundNumber})`
          );
        }
      }

      if (opponent) {
        pairings.push({
          alt1Id: player1.altId,
          alt2Id: opponent.altId,
          alt1Seed: player1.currentSeed ?? 999,
          alt2Seed: opponent.currentSeed ?? 999,
          isBye: false,
          pairingReason: `Swiss round ${roundNumber}: ${player1.matchPoints} pts vs ${opponent.matchPoints} pts`,
          tableNumber: tableNumber++,
        });

        pairedPlayers.add(player1.altId);
        pairedPlayers.add(opponent.altId);

        // Remove opponent from playersToMatch
        const opponentIndex = playersToMatch.indexOf(opponent);
        if (opponentIndex > -1) {
          playersToMatch.splice(opponentIndex, 1);
        }
      } else {
        // No opponent found - carry over to next point group
        carryOver.push(player1);
      }
    }

    // Any remaining unpaired players carry over to the next group
    carryOver.push(
      ...playersToMatch.filter((p) => !pairedPlayers.has(p.altId))
    );
  }

  // Handle any players still unpaired (shouldn't happen normally)
  if (carryOver.length > 0) {
    warnings.push(
      `${carryOver.length} player(s) could not be paired: ${carryOver.map((p) => p.altId).join(", ")}`
    );

    // Force pair remaining players even with rematches
    while (carryOver.length >= 2) {
      const p1 = carryOver.shift()!;
      const p2 = carryOver.shift()!;

      pairings.push({
        alt1Id: p1.altId,
        alt2Id: p2.altId,
        alt1Seed: p1.currentSeed ?? 999,
        alt2Seed: p2.currentSeed ?? 999,
        isBye: false,
        pairingReason: `Forced pairing (no other options)`,
        tableNumber: tableNumber++,
      });

      warnings.push(`Forced pairing: Player ${p1.altId} vs ${p2.altId}`);
    }

    // If one player left, give them a bye
    if (carryOver.length === 1) {
      const player = carryOver[0]!;
      pairings.push({
        alt1Id: player.altId,
        alt2Id: null,
        alt1Seed: player.currentSeed ?? 999,
        alt2Seed: null,
        isBye: true,
        pairingReason: "Could not be paired with any opponent",
        tableNumber: 0,
      });
      warnings.push(`Player ${player.altId} received emergency bye`);
    }
  }

  return {
    pairings,
    warnings,
    algorithm: "swiss-vgc-v1",
  };
}

/**
 * Calculate the recommended number of Swiss rounds based on player count
 *
 * Standard formula: ceil(log2(playerCount))
 * VGC typically uses:
 * - 8 players: 3 rounds
 * - 16 players: 4 rounds
 * - 32 players: 5 rounds
 * - 64 players: 6 rounds
 * - 128+ players: 7 rounds
 */
export function recommendedSwissRounds(playerCount: number): number {
  if (playerCount <= 4) return 2;
  if (playerCount <= 8) return 3;
  if (playerCount <= 16) return 4;
  if (playerCount <= 32) return 5;
  if (playerCount <= 64) return 6;
  if (playerCount <= 128) return 7;
  return 8; // Max for very large tournaments
}

/**
 * Calculate recommended top cut size based on player count
 *
 * VGC typically uses:
 * - 8-16 players: Top 4
 * - 17-32 players: Top 8
 * - 33-64 players: Top 8 or Top 16
 * - 65+ players: Top 16 or Top 32
 */
export function recommendedTopCutSize(playerCount: number): number {
  if (playerCount <= 8) return 4;
  if (playerCount <= 32) return 8;
  if (playerCount <= 64) return 8; // Could be 16
  return 16; // Could be 32 for very large tournaments
}
