/**
 * Tournament Flow State Machine
 *
 * Manages tournament progression through Swiss rounds and top cut phases
 * for Pokemon VGC tournaments.
 */

import { calculateStandings } from "./standings";
import { generateSwissPairings } from "./swiss-pairing";
import {
  generateTopCutBracket,
  advanceBracket,
  type BracketPlayer,
} from "./top-cut-bracket";
import {
  processDropsForRound,
  getActivePlayerCount,
  hasMinimumPlayers,
  type DropRequest,
  type TournamentPlayerWithStatus,
} from "./drop-bye-handling";

export interface TournamentSettings {
  id: string;
  maxParticipants: number;
  topCutSize: number;
  swissRounds: number;
  format: "swiss_only" | "swiss_with_cut" | "single_elimination";
  roundTimeMinutes: number;
  matchFormat: "best_of_1" | "best_of_3";
}

export interface TournamentMatch {
  id: string;
  roundNumber: number;
  player1Id: string;
  player2Id: string | null; // null for bye
  player1MatchPoints: number;
  player2MatchPoints: number;
  player1GameWins: number;
  player2GameWins: number;
  isBye: boolean;
  isComplete: boolean;
}

export interface TournamentPlayer {
  id: string;
  name: string;
}

export interface TournamentDrop {
  tournamentId: string;
  profileId: string;
  roundNumber: number;
}

export interface TournamentState {
  currentRound: number;
  phase: "swiss" | "top_cut" | "completed";
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  drops: TournamentDrop[];
  bracket?: {
    bracketSize: number;
    totalRounds: number;
    format: "single_elimination" | "double_elimination";
  };
}

export interface RoundResult {
  roundNumber: number;
  matches: TournamentMatch[];
  phase: "swiss" | "top_cut";
}

/**
 * Check if the tournament can start the next round
 */
export function canStartNextRound(tournamentState: TournamentState): boolean {
  // Cannot start rounds in completed tournaments
  if (tournamentState.phase === "completed") {
    return false;
  }

  // For top cut phase, check if previous top cut round is complete
  if (tournamentState.phase === "top_cut") {
    // If no rounds have been played yet (currentRound = 0), we can start round 1
    if (tournamentState.currentRound === 0) {
      return true;
    }

    // Check if all top cut matches in current round are complete
    const currentTopCutMatches = tournamentState.matches.filter(
      (match) =>
        match.id.startsWith("topcut-") &&
        match.id.includes(`-r${tournamentState.currentRound}-`)
    );

    // If no matches exist for current round, we can start next round
    if (currentTopCutMatches.length === 0) {
      return true;
    }

    // All matches must be complete
    return currentTopCutMatches.every((match) => match.isComplete);
  }

  // For swiss phase, check if all matches in current round are complete
  const currentRoundMatches = tournamentState.matches.filter(
    (match) =>
      match.roundNumber === tournamentState.currentRound &&
      !match.id.startsWith("topcut-")
  );

  // If no matches exist for current round, we can start next round
  if (currentRoundMatches.length === 0) {
    return true;
  }

  // All matches must be complete
  return currentRoundMatches.every((match) => match.isComplete);
}

/**
 * Check if tournament can advance to top cut
 */
export function canAdvanceToTopCut(
  tournamentState: TournamentState,
  settings: TournamentSettings
): boolean {
  // Must be in swiss phase
  if (tournamentState.phase !== "swiss") {
    return false;
  }

  // Format must include top cut
  if (settings.format !== "swiss_with_cut") {
    return false;
  }

  // Must have completed all swiss rounds
  return tournamentState.currentRound >= settings.swissRounds;
}

/**
 * Get the next round number based on current tournament state
 */
export function getNextRoundNumber(tournamentState: TournamentState): number {
  if (tournamentState.phase === "swiss") {
    return tournamentState.currentRound + 1;
  } else if (tournamentState.phase === "top_cut") {
    // Top cut rounds start from 1, but currentRound is reset to 0 when advancing
    return tournamentState.currentRound + 1;
  }

  throw new Error(
    "Cannot determine next round number for completed tournament"
  );
}

/**
 * Calculate required number of Swiss rounds based on player count
 * Uses the formula: ceil(log2(participants)) with minimum of 3 rounds
 */
export function calculateRequiredRounds(playerCount: number): number {
  if (playerCount <= 8) {
    return 3; // Minimum 3 rounds
  }

  return Math.ceil(Math.log2(playerCount));
}

/**
 * Generate the next round of matches
 */
export async function generateNextRound(
  tournamentState: TournamentState,
  settings: TournamentSettings
): Promise<RoundResult> {
  // Verify we can start next round
  if (!canStartNextRound(tournamentState)) {
    throw new Error("Cannot start next round: previous round is not complete");
  }

  const nextRoundNumber = getNextRoundNumber(tournamentState);

  if (tournamentState.phase === "swiss") {
    return await generateSwissRound(
      settings.id,
      tournamentState,
      nextRoundNumber
    );
  } else if (tournamentState.phase === "top_cut") {
    return await generateTopCutRound(tournamentState, nextRoundNumber);
  }

  throw new Error("Cannot generate round for completed tournament");
}

/**
 * Generate a Swiss round
 */
export async function generateSwissRound(
  _tournamentId: string,
  tournamentState: TournamentState,
  roundNumber: number
): Promise<RoundResult> {
  // Get active players (not dropped)
  const activePlayers = getActivePlayers(tournamentState);

  // Convert to the format expected by Swiss pairing algorithm
  const playerRecords = activePlayers.map((player) => {
    const playerMatches = tournamentState.matches.filter(
      (match) =>
        (match.player1Id === player.id || match.player2Id === player.id) &&
        match.isComplete
    );

    let matchPoints = 0;
    let gameWins = 0;
    let gameLosses = 0;
    let gamePoints = 0;
    const previousOpponents: string[] = [];

    for (const match of playerMatches) {
      if (match.player1Id === player.id) {
        matchPoints += match.player1MatchPoints;
        gameWins += match.player1GameWins;
        gameLosses += match.player2GameWins;
        gamePoints += match.player1GameWins + match.player2GameWins;
        if (match.player2Id && !match.isBye) {
          previousOpponents.push(match.player2Id);
        }
      } else if (match.player2Id === player.id) {
        matchPoints += match.player2MatchPoints;
        gameWins += match.player2GameWins;
        gameLosses += match.player1GameWins;
        gamePoints += match.player1GameWins + match.player2GameWins;
        if (!match.isBye) {
          previousOpponents.push(match.player1Id);
        }
      }
    }

    const gameWinPercentage = gamePoints > 0 ? gameWins / gamePoints : 0;

    return {
      profileId: player.id,
      displayName: player.name,
      matchPoints,
      gameWins,
      gameLosses,
      gameWinPercentage,
      opponentMatchWinPercentage: 0, // Will be calculated by Swiss algorithm
      opponentGameWinPercentage: 0, // Will be calculated by Swiss algorithm
      previousOpponents,
      hasReceivedBye: playerMatches.some(
        (match) =>
          match.isBye &&
          (match.player1Id === player.id || match.player2Id === player.id)
      ),
      isDropped: false, // Active players are not dropped
      roundsPlayed: playerMatches.length,
    };
  });

  // Generate Swiss pairings
  const pairingResult = generateSwissPairings(playerRecords, roundNumber);

  // Convert pairings to tournament matches
  const matches: TournamentMatch[] = pairingResult.pairings.map(
    (pairing, index) => ({
      id: `${roundNumber}-${index + 1}`,
      roundNumber,
      player1Id: pairing.profile1Id,
      player2Id: pairing.profile2Id,
      player1MatchPoints: 0,
      player2MatchPoints: 0,
      player1GameWins: 0,
      player2GameWins: 0,
      isBye: pairing.isBye,
      isComplete: false,
    })
  );

  return {
    roundNumber,
    matches,
    phase: "swiss",
  };
}

/**
 * Generate a top cut elimination round
 */
async function generateTopCutRound(
  tournamentState: TournamentState,
  roundNumber: number
): Promise<RoundResult> {
  if (!tournamentState.bracket) {
    throw new Error("Tournament state does not have bracket information");
  }

  if (roundNumber === 1) {
    // First round of top cut: generate initial bracket
    const bracketPlayers: BracketPlayer[] = tournamentState.players.map(
      (player, index) => ({
        id: player.id,
        name: player.name,
        seed: index + 1, // Players are already sorted by standings
      })
    );

    const bracket = generateTopCutBracket(bracketPlayers, {
      bracketSize: tournamentState.bracket.bracketSize,
      format: tournamentState.bracket.format,
      matchFormat: "best_of_3", // Default for top cut
    });

    // Get first round matches from bracket
    const firstRoundMatches = bracket.matches
      .filter((match) => match.round === 1)
      .map((bracketMatch) => ({
        id: bracketMatch.id,
        roundNumber: 1,
        player1Id: bracketMatch.player1Id!,
        player2Id: bracketMatch.player2Id!,
        player1MatchPoints: 0,
        player2MatchPoints: 0,
        player1GameWins: 0,
        player2GameWins: 0,
        isBye: false,
        isComplete: false,
      }));

    return {
      roundNumber: 1,
      matches: firstRoundMatches,
      phase: "top_cut",
    };
  } else {
    // Later rounds: advance bracket based on completed matches
    const allTopCutMatches = tournamentState.matches
      .filter((match) => match.id.startsWith("topcut-"))
      .map((match) => {
        const idParts = match.id.split("-");
        const roundPart = idParts[1];
        const matchPart = idParts[2];

        return {
          id: match.id,
          round: roundPart ? parseInt(roundPart.substring(1)) : 0, // Extract round from ID
          matchNumber: matchPart ? parseInt(matchPart.substring(1)) : 0, // Extract match number
          player1Id: match.player1Id,
          player2Id: match.player2Id,
          player1Seed: null,
          player2Seed: null,
          player1MatchPoints: match.player1MatchPoints,
          player2MatchPoints: match.player2MatchPoints,
          player1GameWins: match.player1GameWins,
          player2GameWins: match.player2GameWins,
          winnerId:
            match.player1MatchPoints > match.player2MatchPoints
              ? match.player1Id
              : match.player2MatchPoints > match.player1MatchPoints
                ? match.player2Id
                : null,
          isComplete: match.isComplete,
          matchFormat: "best_of_3" as const,
          prerequisiteMatch1Id: null,
          prerequisiteMatch2Id: null,
        };
      });

    // Reconstruct bracket structure to advance it
    const bracketPlayers: BracketPlayer[] = tournamentState.players.map(
      (player, index) => ({
        id: player.id,
        name: player.name,
        seed: index + 1,
      })
    );

    const currentBracket = generateTopCutBracket(bracketPlayers, {
      bracketSize: tournamentState.bracket.bracketSize,
      format: tournamentState.bracket.format,
      matchFormat: "best_of_3",
    });

    // Advance bracket with completed matches
    const advancedMatches = advanceBracket(currentBracket, allTopCutMatches);

    // Get matches for the requested round
    const roundMatches = advancedMatches
      .filter(
        (match) =>
          match.round === roundNumber && match.player1Id && match.player2Id
      )
      .map((bracketMatch) => ({
        id: bracketMatch.id,
        roundNumber,
        player1Id: bracketMatch.player1Id!,
        player2Id: bracketMatch.player2Id!,
        player1MatchPoints: 0,
        player2MatchPoints: 0,
        player1GameWins: 0,
        player2GameWins: 0,
        isBye: false,
        isComplete: false,
      }));

    if (roundMatches.length === 0) {
      throw new Error(`No matches available for top cut round ${roundNumber}`);
    }

    return {
      roundNumber,
      matches: roundMatches,
      phase: "top_cut",
    };
  }
}

/**
 * Get active players (not dropped)
 */
function getActivePlayers(
  tournamentState: TournamentState
): TournamentPlayer[] {
  const droppedPlayerIds = new Set(
    tournamentState.drops.map((drop) => drop.profileId)
  );

  return tournamentState.players.filter(
    (player) => !droppedPlayerIds.has(player.id)
  );
}

/**
 * Advance tournament to top cut phase
 */
export async function advanceToTopCut(
  tournamentState: TournamentState,
  settings: TournamentSettings
): Promise<TournamentState> {
  // Verify we can advance to top cut
  if (!canAdvanceToTopCut(tournamentState, settings)) {
    if (settings.format !== "swiss_with_cut") {
      throw new Error(
        "Cannot advance to top cut: Tournament format does not include top cut"
      );
    }
    if (tournamentState.currentRound < settings.swissRounds) {
      throw new Error("Cannot advance to top cut: Swiss rounds not complete");
    }
    throw new Error("Cannot advance to top cut");
  }

  // Calculate final standings
  const activePlayers = getActivePlayers(tournamentState);
  const matchResults = tournamentState.matches
    .filter((match) => match.isComplete)
    .map((match) => ({
      id: match.id,
      roundNumber: match.roundNumber,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      player1MatchPoints: match.player1MatchPoints,
      player2MatchPoints: match.player2MatchPoints,
      player1GameWins: match.player1GameWins,
      player2GameWins: match.player2GameWins,
      isBye: match.isBye,
    }));

  const standings = calculateStandings(activePlayers, matchResults);

  // Take top N players for cut
  const topCutPlayers = standings
    .slice(0, settings.topCutSize)
    .map((standing) => {
      const player = activePlayers.find((p) => p.id === standing.playerId);
      return player;
    })
    .filter((p): p is TournamentPlayer => p !== undefined);

  // Return new tournament state for top cut
  return {
    ...tournamentState,
    phase: "top_cut",
    currentRound: 0, // Reset round counter for top cut
    players: topCutPlayers,
    bracket: {
      bracketSize: settings.topCutSize,
      totalRounds: Math.log2(settings.topCutSize),
      format: "single_elimination",
    },
  };
}

/**
 * Check if tournament is complete
 */
export function isTournamentComplete(
  tournamentState: TournamentState,
  settings: TournamentSettings
): boolean {
  if (tournamentState.phase === "completed") {
    return true;
  }

  if (settings.format === "swiss_only") {
    return tournamentState.currentRound >= settings.swissRounds;
  }

  if (settings.format === "swiss_with_cut") {
    // Tournament is complete when top cut is finished
    return (
      tournamentState.phase === "top_cut" &&
      tournamentState.players.length === 1
    ); // Only winner remains
  }

  return false;
}

/**
 * Process player drops before generating next round
 */
export async function processPlayerDrops(
  tournamentState: TournamentState,
  dropRequests: DropRequest[]
): Promise<{
  success: boolean;
  updatedState: TournamentState;
  errors?: string[];
}> {
  if (dropRequests.length === 0) {
    return { success: true, updatedState: tournamentState };
  }

  // Convert tournament players to the format expected by drop handling
  const playersWithStatus: TournamentPlayerWithStatus[] =
    tournamentState.players.map((player) => {
      // Calculate current stats from matches
      const playerMatches = tournamentState.matches.filter(
        (match) =>
          (match.player1Id === player.id || match.player2Id === player.id) &&
          match.isComplete
      );

      let matchPoints = 0;
      let byeCount = 0;

      for (const match of playerMatches) {
        if (match.isBye) {
          byeCount++;
          if (match.player1Id === player.id) {
            matchPoints += match.player1MatchPoints;
          }
        } else {
          if (match.player1Id === player.id) {
            matchPoints += match.player1MatchPoints;
          } else if (match.player2Id === player.id) {
            matchPoints += match.player2MatchPoints;
          }
        }
      }

      return {
        id: player.id,
        name: player.name,
        isDropped: false, // Will be updated by drop processing
        byeCount,
        matchPoints,
        roundsPlayed: playerMatches.length,
      };
    });

  // Process drops
  const dropResult = processDropsForRound(
    dropRequests,
    playersWithStatus,
    tournamentState.currentRound + 1
  );

  if (!dropResult.success) {
    return {
      success: false,
      updatedState: tournamentState,
      errors: dropResult.errors,
    };
  }

  // Update tournament state with dropped players
  const updatedPlayers = tournamentState.players.filter((player) => {
    const droppedPlayer = dropResult.updatedPlayers.find(
      (p) => p.id === player.id
    );
    return droppedPlayer && !droppedPlayer.isDropped;
  });

  // Add drop records to state
  const updatedDrops = [
    ...tournamentState.drops,
    ...dropResult.processedDrops.map((drop) => ({
      tournamentId: drop.tournamentId,
      profileId: drop.playerId,
      roundNumber: drop.roundNumber,
    })),
  ];

  const updatedState: TournamentState = {
    ...tournamentState,
    players: updatedPlayers,
    drops: updatedDrops,
  };

  return { success: true, updatedState };
}

/**
 * Check if tournament has minimum viable participants
 */
export function hasSufficientParticipants(
  tournamentState: TournamentState,
  minimumRequired: number = 4
): boolean {
  const playersWithStatus: TournamentPlayerWithStatus[] =
    tournamentState.players.map((p) => ({
      id: p.id,
      name: p.name,
      isDropped: false,
      byeCount: 0,
      matchPoints: 0,
      roundsPlayed: 0,
    }));

  return hasMinimumPlayers(playersWithStatus, minimumRequired);
}

/**
 * Get count of active (non-dropped) players
 */
export function getActivePlayersCount(
  tournamentState: TournamentState
): number {
  const playersWithStatus: TournamentPlayerWithStatus[] =
    tournamentState.players.map((p) => ({
      id: p.id,
      name: p.name,
      isDropped: false,
      byeCount: 0,
      matchPoints: 0,
      roundsPlayed: 0,
    }));

  return getActivePlayerCount(playersWithStatus);
}
