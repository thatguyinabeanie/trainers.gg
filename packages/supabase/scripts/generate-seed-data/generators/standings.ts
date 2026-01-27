/**
 * Standings Generator
 *
 * Generates tournament standings based on match results.
 *
 * Schema notes:
 * - tournament_standings have tournament_id, alt_id, placement, wins, losses
 */

import {
  type GeneratedTournament,
  type GeneratedTournamentPhase,
  type GeneratedTournamentRegistration,
} from "./tournaments.js";
import { type GeneratedMatch } from "./matches.js";

export interface GeneratedStanding {
  id: number;
  tournamentId: number;
  altId: number;
  placement: number;
  wins: number;
  losses: number;
  gameWins: number;
  gameLosses: number;
  resistancePct: number;
}

interface PlayerStats {
  altId: number;
  wins: number;
  losses: number;
  gameWins: number;
  gameLosses: number;
  opponents: number[];
  eliminatedRound: number | null;
  madeTopCut: boolean;
}

/**
 * Generate standings for all tournaments
 */
export function generateStandings(
  tournaments: GeneratedTournament[],
  phases: GeneratedTournamentPhase[],
  registrations: GeneratedTournamentRegistration[],
  matches: GeneratedMatch[]
): GeneratedStanding[] {
  const standings: GeneratedStanding[] = [];
  let standingId = 1;

  for (const tournament of tournaments) {
    const tournamentRegistrations = registrations.filter(
      (r) => r.tournamentId === tournament.id
    );
    const tournamentPhases = phases
      .filter((p) => p.tournamentId === tournament.id)
      .sort((a, b) => a.phaseOrder - b.phaseOrder);

    // Initialize player stats
    const playerStats = new Map<number, PlayerStats>();
    for (const reg of tournamentRegistrations) {
      playerStats.set(reg.altId, {
        altId: reg.altId,
        wins: 0,
        losses: 0,
        gameWins: 0,
        gameLosses: 0,
        opponents: [],
        eliminatedRound: null,
        madeTopCut: false,
      });
    }

    // Process matches
    for (const phase of tournamentPhases) {
      const phaseMatches = matches.filter((m) => m.phaseId === phase.id);

      for (const match of phaseMatches) {
        const player1 = playerStats.get(match.alt1Id);
        const player2 = playerStats.get(match.alt2Id);

        if (!player1 || !player2) continue;

        // Update game stats
        player1.gameWins += match.alt1Score;
        player1.gameLosses += match.alt2Score;
        player2.gameWins += match.alt2Score;
        player2.gameLosses += match.alt1Score;

        // Update match stats
        if (match.winnerAltId === match.alt1Id) {
          player1.wins++;
          player2.losses++;

          // Track elimination in bracket phases
          if (
            phase.phaseType === "single_elimination" ||
            phase.phaseType === "double_elimination"
          ) {
            player2.eliminatedRound = match.round;
          }
        } else {
          player2.wins++;
          player1.losses++;

          if (
            phase.phaseType === "single_elimination" ||
            phase.phaseType === "double_elimination"
          ) {
            player1.eliminatedRound = match.round;
          }
        }

        // Track opponents for resistance calculation
        player1.opponents.push(match.alt2Id);
        player2.opponents.push(match.alt1Id);
      }

      // Mark top cut participants
      if (phase.phaseOrder === 2) {
        // Assume phase 2 is top cut
        const topCutParticipants = new Set(
          phaseMatches.flatMap((m) => [m.alt1Id, m.alt2Id])
        );
        for (const altId of topCutParticipants) {
          const player = playerStats.get(altId);
          if (player) {
            player.madeTopCut = true;
          }
        }
      }
    }

    // Calculate resistance percentage for each player
    // Resistance = average win rate of opponents
    const resistanceCache = new Map<number, number>();

    for (const [altId, stats] of playerStats) {
      if (stats.opponents.length === 0) {
        resistanceCache.set(altId, 0);
        continue;
      }

      let totalOpponentWinRate = 0;
      for (const oppId of stats.opponents) {
        const opp = playerStats.get(oppId);
        if (opp) {
          const oppTotal = opp.wins + opp.losses;
          const oppWinRate = oppTotal > 0 ? opp.wins / oppTotal : 0;
          totalOpponentWinRate += oppWinRate;
        }
      }

      const resistance = totalOpponentWinRate / stats.opponents.length;
      resistanceCache.set(altId, resistance);
    }

    // Sort players for placement
    const sortedPlayers = Array.from(playerStats.values()).sort((a, b) => {
      // 1. Top cut finishers first (by elimination round, later = better)
      if (a.madeTopCut && !b.madeTopCut) return -1;
      if (!a.madeTopCut && b.madeTopCut) return 1;

      if (a.madeTopCut && b.madeTopCut) {
        // Winner (never eliminated) beats runner-up
        if (a.eliminatedRound === null && b.eliminatedRound !== null) return -1;
        if (a.eliminatedRound !== null && b.eliminatedRound === null) return 1;

        // Later elimination = better placement
        if (a.eliminatedRound !== b.eliminatedRound) {
          return (b.eliminatedRound || 0) - (a.eliminatedRound || 0);
        }
      }

      // 2. More wins first
      if (b.wins !== a.wins) return b.wins - a.wins;

      // 3. Fewer losses
      if (a.losses !== b.losses) return a.losses - b.losses;

      // 4. Higher resistance
      const resistanceA = resistanceCache.get(a.altId) || 0;
      const resistanceB = resistanceCache.get(b.altId) || 0;
      if (resistanceB !== resistanceA) return resistanceB - resistanceA;

      // 5. Better game win percentage
      const gwpA =
        a.gameWins + a.gameLosses > 0
          ? a.gameWins / (a.gameWins + a.gameLosses)
          : 0;
      const gwpB =
        b.gameWins + b.gameLosses > 0
          ? b.gameWins / (b.gameWins + b.gameLosses)
          : 0;
      return gwpB - gwpA;
    });

    // Assign placements
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i]!;
      const resistance = resistanceCache.get(player.altId) || 0;

      standings.push({
        id: standingId++,
        tournamentId: tournament.id,
        altId: player.altId,
        placement: i + 1,
        wins: player.wins,
        losses: player.losses,
        gameWins: player.gameWins,
        gameLosses: player.gameLosses,
        resistancePct: Math.round(resistance * 10000) / 100, // Store as percentage
      });
    }
  }

  return standings;
}

/**
 * Get standings for a specific tournament
 */
export function getTournamentStandings(
  tournamentId: number,
  standings: GeneratedStanding[]
): GeneratedStanding[] {
  return standings
    .filter((s) => s.tournamentId === tournamentId)
    .sort((a, b) => a.placement - b.placement);
}

/**
 * Get top N finishers for a tournament
 */
export function getTopFinishers(
  tournamentId: number,
  standings: GeneratedStanding[],
  topN: number
): GeneratedStanding[] {
  return getTournamentStandings(tournamentId, standings).slice(0, topN);
}
