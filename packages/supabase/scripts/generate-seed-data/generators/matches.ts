/**
 * Match Generator
 *
 * Generates matches for tournament phases.
 *
 * Schema notes:
 * - matches have phase_id, round, table_number
 * - matches use alt1_id, alt2_id, winner_alt_id
 * - match_games have match_id, game_number, winner_alt_id
 *
 * Match scoring (Best of 3):
 * - 60% of matches are 2-0
 * - 40% of matches are 2-1
 * - No ties in VGC
 *
 * TODO: Future ELO system - when implementing ELO rankings,
 * update this generator to weight match outcomes based on
 * player skill ratings. Currently uses purely random outcomes.
 */

import { SEED_CONFIG } from "../config.js";
import {
  createSeededRandom,
  deterministicShuffle,
  hash,
} from "../utils/deterministic.js";
import {
  type GeneratedTournament,
  type GeneratedTournamentPhase,
  type GeneratedTournamentRegistration,
} from "./tournaments.js";

export type MatchStatus = "completed" | "active" | "pending";

export interface GeneratedMatch {
  id: number;
  phaseId: number;
  round: number;
  tableNumber: number;
  status: MatchStatus;
  alt1Id: number;
  alt2Id: number;
  winnerAltId: number | null;
  alt1Score: number;
  alt2Score: number;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface GeneratedMatchGame {
  id: number;
  matchId: number;
  gameNumber: number;
  winnerAltId: number;
  startedAt: Date;
  completedAt: Date;
}

// ============================================================================
// Swiss Pairing
// ============================================================================

interface SwissPlayer {
  altId: number;
  wins: number;
  losses: number;
  opponents: Set<number>;
}

/**
 * Generate Swiss pairings for a round
 * Uses simple Swiss pairing: pair players with similar records
 */
function generateSwissPairings(
  players: SwissPlayer[],
  seed: string
): [number, number][] {
  const pairings: [number, number][] = [];

  // Sort by wins (descending), then shuffle within same win count
  const sortedPlayers = [...players].sort((a, b) => b.wins - a.wins);

  // Group by wins
  const groups = new Map<number, SwissPlayer[]>();
  for (const player of sortedPlayers) {
    const wins = player.wins;
    if (!groups.has(wins)) {
      groups.set(wins, []);
    }
    groups.get(wins)!.push(player);
  }

  // Shuffle within each group
  for (const [wins, group] of groups) {
    const shuffled = deterministicShuffle(group, `${seed}-wins-${wins}`);
    groups.set(wins, shuffled);
  }

  // Flatten back to sorted list
  const shuffledPlayers = Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .flatMap(([_, group]) => group);

  // Pair players, avoiding rematches
  const paired = new Set<number>();

  for (let i = 0; i < shuffledPlayers.length; i++) {
    const player1 = shuffledPlayers[i]!;
    if (paired.has(player1.altId)) continue;

    // Find an opponent
    for (let j = i + 1; j < shuffledPlayers.length; j++) {
      const player2 = shuffledPlayers[j]!;
      if (paired.has(player2.altId)) continue;

      // Avoid rematches if possible
      if (player1.opponents.has(player2.altId)) {
        // Only allow rematch if no other options
        const hasOtherOptions = shuffledPlayers
          .slice(j + 1)
          .some((p) => !paired.has(p.altId) && !player1.opponents.has(p.altId));
        if (hasOtherOptions) continue;
      }

      pairings.push([player1.altId, player2.altId]);
      paired.add(player1.altId);
      paired.add(player2.altId);
      break;
    }
  }

  // Handle bye if odd number of players
  const unpairedPlayer = shuffledPlayers.find((p) => !paired.has(p.altId));
  if (unpairedPlayer) {
    // Player gets a bye (we'll handle this as a win in the standings)
    // For now, don't create a match for byes
  }

  return pairings;
}

// ============================================================================
// Bracket Generation
// ============================================================================

/**
 * Generate single elimination bracket pairings
 */
function _generateBracketPairings(
  altIds: number[],
  seed: string
): [number, number][][] {
  const rounds: [number, number][][] = [];

  // Shuffle for seeding
  const shuffled = deterministicShuffle(altIds, seed);
  let remainingPlayers = [...shuffled];

  while (remainingPlayers.length > 1) {
    const roundPairings: [number, number][] = [];

    for (let i = 0; i < remainingPlayers.length; i += 2) {
      if (i + 1 < remainingPlayers.length) {
        roundPairings.push([remainingPlayers[i]!, remainingPlayers[i + 1]!]);
      }
    }

    rounds.push(roundPairings);

    // For next round, we'll determine winners when generating matches
    // For now, just halve the count
    remainingPlayers = remainingPlayers.slice(
      0,
      Math.ceil(remainingPlayers.length / 2)
    );
  }

  return rounds;
}

// ============================================================================
// Match Outcome Generation
// ============================================================================

/**
 * Determine match outcome (winner and score)
 */
function determineMatchOutcome(
  alt1Id: number,
  alt2Id: number,
  seed: string
): { winnerId: number; alt1Score: number; alt2Score: number } {
  const random = createSeededRandom(seed);

  // Determine winner (50/50 for now)
  // TODO: When ELO is implemented, weight by skill difference
  const winnerIsAlt1 = random() < 0.5;
  const winnerId = winnerIsAlt1 ? alt1Id : alt2Id;

  // Determine score distribution
  const is2_0 = random() < SEED_CONFIG.SCORE_2_0_RATE;

  if (is2_0) {
    return {
      winnerId,
      alt1Score: winnerIsAlt1 ? 2 : 0,
      alt2Score: winnerIsAlt1 ? 0 : 2,
    };
  } else {
    return {
      winnerId,
      alt1Score: winnerIsAlt1 ? 2 : 1,
      alt2Score: winnerIsAlt1 ? 1 : 2,
    };
  }
}

// ============================================================================
// Main Match Generation
// ============================================================================

/**
 * Generate all matches for all tournament phases
 */
export function generateMatches(
  tournaments: GeneratedTournament[],
  phases: GeneratedTournamentPhase[],
  registrations: GeneratedTournamentRegistration[]
): { matches: GeneratedMatch[]; games: GeneratedMatchGame[] } {
  const matches: GeneratedMatch[] = [];
  const games: GeneratedMatchGame[] = [];
  let matchId = 1;
  let gameId = 1;

  for (const tournament of tournaments) {
    // Skip upcoming and active tournaments — no matches yet
    // Active tournaments start as clean slates (round management tested via UI)
    if (tournament.status === "upcoming" || tournament.status === "active") {
      continue;
    }

    const isActive = false; // Only completed tournaments reach here
    const tournamentPhases = phases.filter(
      (p) => p.tournamentId === tournament.id
    );
    const tournamentRegistrations = registrations.filter(
      (r) => r.tournamentId === tournament.id
    );
    const altIds = tournamentRegistrations.map((r) => r.altId);

    // Track Swiss standings
    const swissPlayers = new Map<number, SwissPlayer>();
    for (const altId of altIds) {
      swissPlayers.set(altId, {
        altId,
        wins: 0,
        losses: 0,
        opponents: new Set(),
      });
    }

    // Track advancing players for top cut
    let advancingAltIds: number[] = [];

    for (const phase of tournamentPhases.sort(
      (a, b) => a.phaseOrder - b.phaseOrder
    )) {
      // For active tournaments, only generate matches for first phase (Swiss)
      // and only up to current_round (which is 4 for our active tournaments)
      if (isActive && phase.phaseOrder > 1) {
        continue; // Skip top cut for active tournaments
      }

      const phaseStartTime = tournament.startDate;

      if (phase.phaseType === "swiss") {
        // Generate Swiss rounds
        const numRounds = phase.plannedRounds || 5;

        // For active tournaments, we're in round 4 (currentRound)
        // Rounds 1-3 are completed, round 4 is in progress
        const activeRound = isActive ? Math.min(4, numRounds) : numRounds;
        const completedRounds = isActive ? activeRound - 1 : numRounds;

        for (let round = 1; round <= activeRound; round++) {
          const _isCompletedRound = round <= completedRounds;
          const isActiveRound = isActive && round === activeRound;

          const roundSeed = `swiss-${phase.id}-round-${round}`;
          const pairings = generateSwissPairings(
            Array.from(swissPlayers.values()),
            roundSeed
          );

          let tableNumber = 1;
          const roundStartTime = new Date(
            phaseStartTime.getTime() +
              (round - 1) * phase.roundTimeMinutes * 60 * 1000
          );

          for (const [alt1Id, alt2Id] of pairings) {
            const matchSeed = `match-${phase.id}-${round}-${alt1Id}-${alt2Id}`;
            const outcome = determineMatchOutcome(alt1Id, alt2Id, matchSeed);

            const matchStartTime = new Date(
              roundStartTime.getTime() + (tableNumber - 1) * 1000
            );
            const matchEndTime = new Date(
              matchStartTime.getTime() +
                (20 + hash(`duration-${matchId}`) * 30) * 60 * 1000
            );

            // Determine match status for active round
            let matchStatus: MatchStatus = "completed";
            let matchWinner: number | null = outcome.winnerId;
            let matchAlt1Score = outcome.alt1Score;
            let matchAlt2Score = outcome.alt2Score;
            let matchStartedAt: Date | null = matchStartTime;
            let matchCompletedAt: Date | null = matchEndTime;

            if (isActiveRound) {
              // Active round: 60% completed, 25% in progress, 15% pending
              // Use more varied seed including alt IDs for better distribution
              const matchProgress = hash(
                `progress-${phase.id}-${round}-${alt1Id}-${alt2Id}`
              );

              if (matchProgress < 0.6) {
                matchStatus = "completed";
              } else if (matchProgress < 0.85) {
                matchStatus = "active";
                // In progress - partial scores, no winner yet
                matchAlt1Score = Math.floor(hash(`partial1-${matchId}`) * 2);
                matchAlt2Score = Math.floor(hash(`partial2-${matchId}`) * 2);
                matchWinner = null;
                matchCompletedAt = null;
              } else {
                matchStatus = "pending";
                matchAlt1Score = 0;
                matchAlt2Score = 0;
                matchWinner = null;
                matchStartedAt = null;
                matchCompletedAt = null;
              }
            }

            matches.push({
              id: matchId,
              phaseId: phase.id,
              round,
              tableNumber,
              status: matchStatus,
              alt1Id,
              alt2Id,
              winnerAltId: matchWinner,
              alt1Score: matchAlt1Score,
              alt2Score: matchAlt2Score,
              startedAt: matchStartedAt,
              completedAt: matchCompletedAt,
            });

            // Only update standings and generate games for completed matches
            if (matchStatus === "completed" && matchWinner) {
              // Update Swiss standings
              const player1 = swissPlayers.get(alt1Id)!;
              const player2 = swissPlayers.get(alt2Id)!;
              if (matchWinner === alt1Id) {
                player1.wins++;
                player2.losses++;
              } else {
                player2.wins++;
                player1.losses++;
              }
              player1.opponents.add(alt2Id);
              player2.opponents.add(alt1Id);

              // Generate individual games
              const _totalGames = matchAlt1Score + matchAlt2Score;
              let alt1Wins = 0;
              let alt2Wins = 0;
              const gameResults: number[] = [];

              // Determine game order
              while (alt1Wins < matchAlt1Score || alt2Wins < matchAlt2Score) {
                if (alt1Wins < matchAlt1Score && alt2Wins < matchAlt2Score) {
                  // Either could win this game - use deterministic choice
                  const gameWinnerSeed = `game-${matchId}-${gameResults.length}`;
                  if (hash(gameWinnerSeed) < 0.5) {
                    gameResults.push(alt1Id);
                    alt1Wins++;
                  } else {
                    gameResults.push(alt2Id);
                    alt2Wins++;
                  }
                } else if (alt1Wins < matchAlt1Score) {
                  gameResults.push(alt1Id);
                  alt1Wins++;
                } else {
                  gameResults.push(alt2Id);
                  alt2Wins++;
                }
              }

              for (let g = 0; g < gameResults.length; g++) {
                const gameStartTime = new Date(
                  matchStartTime.getTime() + g * 10 * 60 * 1000
                );
                games.push({
                  id: gameId++,
                  matchId,
                  gameNumber: g + 1,
                  winnerAltId: gameResults[g]!,
                  startedAt: gameStartTime,
                  completedAt: new Date(
                    gameStartTime.getTime() + 8 * 60 * 1000
                  ),
                });
              }
            } else if (matchStatus === "completed") {
              // Match completed but need to update standings
              const player1 = swissPlayers.get(alt1Id)!;
              const player2 = swissPlayers.get(alt2Id)!;
              if (outcome.winnerId === alt1Id) {
                player1.wins++;
                player2.losses++;
              } else {
                player2.wins++;
                player1.losses++;
              }
              player1.opponents.add(alt2Id);
              player2.opponents.add(alt1Id);
            }

            matchId++;
            tableNumber++;
          }
        }

        // Determine advancing players if there's a top cut
        if (phase.advancementCount) {
          const sortedPlayers = Array.from(swissPlayers.values())
            .sort((a, b) => {
              // Sort by wins descending
              if (b.wins !== a.wins) return b.wins - a.wins;
              // Tiebreaker: fewer losses
              return a.losses - b.losses;
            })
            .slice(0, phase.advancementCount);

          advancingAltIds = sortedPlayers.map((p) => p.altId);
        }
      } else if (
        phase.phaseType === "single_elimination" ||
        phase.phaseType === "double_elimination"
      ) {
        // Use advancing players from Swiss, or all players if this is the only phase
        const bracketPlayers =
          advancingAltIds.length > 0 ? advancingAltIds : altIds;

        // Generate bracket
        const bracketSeed = `bracket-${phase.id}`;
        let currentRoundPlayers = deterministicShuffle(
          bracketPlayers,
          bracketSeed
        );
        let round = 1;

        while (currentRoundPlayers.length > 1) {
          const nextRoundPlayers: number[] = [];
          let tableNumber = 1;

          const roundStartTime = new Date(
            phaseStartTime.getTime() +
              (phase.plannedRounds || 0) * phase.roundTimeMinutes * 60 * 1000 +
              (round - 1) * phase.roundTimeMinutes * 60 * 1000
          );

          for (let i = 0; i < currentRoundPlayers.length; i += 2) {
            if (i + 1 >= currentRoundPlayers.length) {
              // Bye - player advances
              nextRoundPlayers.push(currentRoundPlayers[i]!);
              continue;
            }

            const alt1Id = currentRoundPlayers[i]!;
            const alt2Id = currentRoundPlayers[i + 1]!;

            const matchSeed = `bracket-match-${phase.id}-${round}-${alt1Id}-${alt2Id}`;
            const outcome = determineMatchOutcome(alt1Id, alt2Id, matchSeed);

            const matchStartTime = new Date(
              roundStartTime.getTime() + (tableNumber - 1) * 1000
            );
            const matchEndTime = new Date(
              matchStartTime.getTime() +
                (20 + hash(`duration-${matchId}`) * 30) * 60 * 1000
            );

            matches.push({
              id: matchId,
              phaseId: phase.id,
              round,
              tableNumber,
              status: "completed",
              alt1Id,
              alt2Id,
              winnerAltId: outcome.winnerId,
              alt1Score: outcome.alt1Score,
              alt2Score: outcome.alt2Score,
              startedAt: matchStartTime,
              completedAt: matchEndTime,
            });

            // Generate games
            const _totalGames = outcome.alt1Score + outcome.alt2Score;
            let alt1Wins = 0;
            let alt2Wins = 0;
            const gameResults: number[] = [];

            while (
              alt1Wins < outcome.alt1Score ||
              alt2Wins < outcome.alt2Score
            ) {
              if (
                alt1Wins < outcome.alt1Score &&
                alt2Wins < outcome.alt2Score
              ) {
                const gameWinnerSeed = `game-${matchId}-${gameResults.length}`;
                if (hash(gameWinnerSeed) < 0.5) {
                  gameResults.push(alt1Id);
                  alt1Wins++;
                } else {
                  gameResults.push(alt2Id);
                  alt2Wins++;
                }
              } else if (alt1Wins < outcome.alt1Score) {
                gameResults.push(alt1Id);
                alt1Wins++;
              } else {
                gameResults.push(alt2Id);
                alt2Wins++;
              }
            }

            for (let g = 0; g < gameResults.length; g++) {
              const gameStartTime = new Date(
                matchStartTime.getTime() + g * 10 * 60 * 1000
              );
              games.push({
                id: gameId++,
                matchId,
                gameNumber: g + 1,
                winnerAltId: gameResults[g]!,
                startedAt: gameStartTime,
                completedAt: new Date(gameStartTime.getTime() + 8 * 60 * 1000),
              });
            }

            nextRoundPlayers.push(outcome.winnerId);
            matchId++;
            tableNumber++;
          }

          currentRoundPlayers = nextRoundPlayers;
          round++;
        }
      }
    }
  }

  return { matches, games };
}

/**
 * Get matches for a specific phase
 */
export function getPhaseMatches(
  phaseId: number,
  matches: GeneratedMatch[]
): GeneratedMatch[] {
  return matches.filter((m) => m.phaseId === phaseId);
}

/**
 * Get games for a specific match
 */
export function getMatchGames(
  matchId: number,
  games: GeneratedMatchGame[]
): GeneratedMatchGame[] {
  return games.filter((g) => g.matchId === matchId);
}
