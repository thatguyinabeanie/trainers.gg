export interface TournamentValidationSettings {
  name: string;
  maxParticipants: number;
  minParticipants: number;
  topCutSize: number;
  swissRounds: number;
  format: "swiss_only" | "swiss_with_cut" | "single_elimination";
  roundTimeMinutes: number;
  startDate: Date;
  endDate: Date;
  allowLateRegistration: boolean;
  requiresApproval: boolean;
}

export interface TournamentTimingData {
  tournamentId: string;
  status: string;
  currentRound: number;
  totalRounds: number;
  startDate: Date;
  currentTime: Date;
  roundStartTime: Date | null;
  roundTimeMinutes: number;
  currentParticipants?: number;
  minParticipants?: number;
}

export interface MatchResultData {
  matchId: string;
  player1Id: string;
  player2Id: string | null;
  matchPoints1: number;
  matchPoints2: number;
  gameWins1: number;
  gameWins2: number;
  bestOf: 1 | 3 | 5;
  isBye: boolean;
  winnerId: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface TournamentStartCheck {
  canStart: boolean;
  reason?: string;
}

export interface RoundStartData {
  currentRound: number;
  totalRounds: number;
  previousRoundComplete: boolean;
  participantCount: number;
  minParticipants: number;
  roundTimeMinutes: number;
}

/**
 * Validate tournament settings for Pokemon VGC tournaments
 */
export function validateTournamentSettings(
  settings: TournamentValidationSettings
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Tournament name validation
  if (!settings.name || settings.name.trim().length === 0) {
    errors.push("Tournament name is required");
  } else if (settings.name.length > 100) {
    errors.push("Tournament name must be 100 characters or less");
  }

  // Participant limits validation
  if (settings.minParticipants < 4) {
    errors.push(
      "Minimum participants must be at least 4 for Pokemon VGC tournaments"
    );
  }

  if (settings.maxParticipants < settings.minParticipants) {
    errors.push(
      "Maximum participants must be greater than minimum participants"
    );
  }

  // Top cut validation
  if (settings.format === "swiss_with_cut") {
    // Validate power of 2 for elimination bracket
    const validTopCutSizes = [4, 8, 16, 32, 64, 128, 256];
    if (!validTopCutSizes.includes(settings.topCutSize)) {
      errors.push(
        "Top cut size must be a power of 2 (4, 8, 16, 32, 64, 128, 256)"
      );
    }

    // Warning if top cut is larger than expected participants (but organizer can allow)
    if (settings.topCutSize > settings.maxParticipants) {
      warnings.push(
        "Top cut size exceeds maximum participants - ensure sufficient registration"
      );
    }
  }

  // Swiss rounds validation (organizer can override, but provide recommendations)
  if (settings.swissRounds < 1) {
    errors.push("Swiss rounds must be at least 1");
  }

  if (settings.swissRounds > 20) {
    warnings.push(
      "Very high number of Swiss rounds - tournaments may take a very long time"
    );
  }

  // Round time validation (Pokemon VGC: ~20 min per game, best of 3 = ~60 min + buffer)
  if (settings.roundTimeMinutes < 15 || settings.roundTimeMinutes > 120) {
    errors.push("Round time must be between 15 and 120 minutes");
  }

  // Date validation (flexible for organizer preferences)
  const _now = new Date();

  if (settings.endDate <= settings.startDate) {
    errors.push("End date must be after start date");
  }

  // Format-specific validation
  if (settings.format === "swiss_only" && settings.swissRounds === 0) {
    errors.push("Swiss-only tournaments must have at least 1 Swiss round");
  }

  // Swiss rounds calculation and validation
  if (settings.maxParticipants > 0) {
    const calculatedRounds = calculateSwissRounds(settings.maxParticipants);

    // If organizer specified different rounds, provide guidance
    if (settings.swissRounds !== calculatedRounds) {
      if (settings.swissRounds < calculatedRounds - 1) {
        warnings.push(
          `Low Swiss rounds may not properly eliminate players. Calculated: ${calculatedRounds}, you have: ${settings.swissRounds}`
        );
      } else if (settings.swissRounds > calculatedRounds + 2) {
        warnings.push(
          `High Swiss rounds may make tournament very long. Calculated: ${calculatedRounds}, you have: ${settings.swissRounds}`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate tournament timing and scheduling
 */
export function validateTournamentTiming(
  data: TournamentTimingData
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Allow immediate starts, but warn if starting very early
  if (data.currentTime < data.startDate) {
    warnings.push("Starting tournament before scheduled start date");
  }

  // Must have minimum participants
  if (
    data.currentParticipants !== undefined &&
    data.minParticipants !== undefined
  ) {
    if (data.currentParticipants < data.minParticipants) {
      errors.push("Insufficient participants to start tournament");
    }
  }

  // Round timing validation
  if (data.roundStartTime && data.currentTime < data.roundStartTime) {
    errors.push("Cannot start round before scheduled time");
  }

  // Round progression validation
  if (data.currentRound > data.totalRounds) {
    errors.push("Current round exceeds total planned rounds");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate round start conditions
 */
export function validateRoundStart(data: RoundStartData): ValidationResult {
  const errors: string[] = [];

  // Previous round must be complete (except for first round)
  if (data.currentRound > 0 && !data.previousRoundComplete) {
    errors.push("Previous round must be completed before starting next round");
  }

  // Cannot exceed total rounds
  if (data.currentRound >= data.totalRounds) {
    errors.push("Cannot start round beyond total scheduled rounds");
  }

  // Must have sufficient participants
  if (data.participantCount < data.minParticipants) {
    errors.push("Insufficient participants to continue tournament");
  }

  // Round time validation
  if (data.roundTimeMinutes < 15) {
    errors.push("Round time too short - minimum 15 minutes required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate match result for Pokemon VGC rules
 */
export function validateMatchResult(data: MatchResultData): ValidationResult {
  const errors: string[] = [];

  // Pokemon VGC: No ties allowed
  if (data.matchPoints1 === data.matchPoints2 && !data.isBye) {
    errors.push("Ties are not allowed in Pokemon VGC tournaments");
  }

  // Match points must be 0 or 1 (Pokemon VGC scoring)
  if (
    ![0, 1].includes(data.matchPoints1) ||
    ![0, 1].includes(data.matchPoints2)
  ) {
    errors.push("Match points must be 0 or 1");
  }

  // Winner consistency check
  if (!data.isBye && data.winnerId) {
    const player1Wins = data.matchPoints1 > data.matchPoints2;
    const player2Wins = data.matchPoints2 > data.matchPoints1;

    if (player1Wins && data.winnerId !== data.player1Id) {
      errors.push("Winner must be the player with higher match points");
    }
    if (player2Wins && data.winnerId !== data.player2Id) {
      errors.push("Winner must be the player with higher match points");
    }
  }

  // Bye match validation
  if (data.isBye) {
    if (data.player2Id !== null) {
      errors.push("Bye matches should not have a second player");
    }
    if (data.matchPoints1 !== 1 || data.matchPoints2 !== 0) {
      errors.push("Bye matches must award 1 match point to the active player");
    }
    if (data.gameWins1 !== 0 || data.gameWins2 !== 0) {
      errors.push("Bye matches should not record game wins");
    }
  }

  // Game count validation based on format
  if (!data.isBye) {
    const totalGames = data.gameWins1 + data.gameWins2;
    const gamesToWin = Math.ceil(data.bestOf / 2);

    if (data.bestOf === 1) {
      if (totalGames !== 1) {
        errors.push("Best of 1 matches must have exactly 1 game");
      }
    } else {
      // Best of 3 or Best of 5
      const minGames = gamesToWin;
      const maxGames = data.bestOf;

      if (totalGames < minGames || totalGames > maxGames) {
        errors.push(
          `Best of ${data.bestOf} matches must have ${minGames} to ${maxGames} games`
        );
      }

      // Winner must have won required number of games
      const winner = data.matchPoints1 > data.matchPoints2 ? 1 : 2;
      const winnerGames = winner === 1 ? data.gameWins1 : data.gameWins2;

      if (winnerGames < gamesToWin) {
        errors.push(
          `Best of ${data.bestOf} winner must win at least ${gamesToWin} games`
        );
      }

      // Ensure loser didn't win more games than winner
      const loserGames = winner === 1 ? data.gameWins2 : data.gameWins1;
      if (loserGames >= winnerGames) {
        errors.push("Match winner must have won more games than opponent");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if tournament can start
 */
export function canStartTournament(data: {
  currentParticipants: number;
  minParticipants: number;
  startDate: Date;
  currentTime: Date;
}): TournamentStartCheck {
  if (data.currentParticipants < data.minParticipants) {
    return {
      canStart: false,
      reason: `Insufficient participants: ${data.currentParticipants}/${data.minParticipants} minimum required`,
    };
  }

  if (data.currentTime < data.startDate) {
    return {
      canStart: false,
      reason: "Cannot start tournament before scheduled start date",
    };
  }

  return { canStart: true };
}

/**
 * Calculate required Swiss rounds for participant count
 * Pokemon VGC standard: ceil(log2(participants)) to ensure proper elimination
 */
export function calculateSwissRounds(participantCount: number): number {
  if (participantCount < 4) return 3; // Minimum viable tournament
  return Math.ceil(Math.log2(participantCount));
}

/**
 * Estimate tournament duration based on settings
 */
export function estimateTournamentDuration(
  participantCount: number,
  swissRounds: number,
  topCutSize: number,
  roundTimeMinutes: number,
  format: "swiss_only" | "swiss_with_cut"
): number {
  let totalMinutes = 0;

  // Swiss rounds
  totalMinutes += swissRounds * roundTimeMinutes;

  // Top cut rounds (if applicable)
  if (format === "swiss_with_cut" && topCutSize > 0) {
    const topCutRounds = Math.log2(topCutSize);
    totalMinutes += topCutRounds * roundTimeMinutes;
  }

  // Add buffer time between rounds (15 minutes per round)
  const totalRounds =
    format === "swiss_with_cut"
      ? swissRounds + Math.log2(topCutSize)
      : swissRounds;
  totalMinutes += totalRounds * 15; // 15-minute buffer between rounds

  return totalMinutes;
}

/**
 * Validate tournament can advance to next round
 */
export function canAdvanceRound(data: {
  currentRound: number;
  totalRounds: number;
  allMatchesComplete: boolean;
  activeParticipants: number;
  minParticipants: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.allMatchesComplete) {
    errors.push("All matches in current round must be completed");
  }

  if (data.activeParticipants < data.minParticipants) {
    errors.push("Insufficient active participants to continue tournament");
  }

  if (data.currentRound >= data.totalRounds) {
    errors.push("Tournament has reached maximum rounds");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Auto-calculate optimal tournament settings based on expected participants
 */
export function calculateOptimalTournamentSettings(
  expectedParticipants: number
): {
  swissRounds: number;
  recommendedTopCut: number;
  estimatedDuration: number;
  recommendedRoundTime: number;
} {
  const swissRounds = calculateSwissRounds(expectedParticipants);

  // Recommended top cut sizes based on participant count
  let recommendedTopCut = 8; // Default
  if (expectedParticipants >= 256) recommendedTopCut = 32;
  else if (expectedParticipants >= 128) recommendedTopCut = 16;
  else if (expectedParticipants >= 64) recommendedTopCut = 8;
  else if (expectedParticipants >= 32) recommendedTopCut = 8;
  else if (expectedParticipants >= 16) recommendedTopCut = 4;
  else recommendedTopCut = 4;

  // Recommended round time based on format (20 min per game + buffer)
  const recommendedRoundTime = 50; // Standard for best of 3

  // Estimate total duration
  const topCutRounds = Math.log2(recommendedTopCut);
  const totalRounds = swissRounds + topCutRounds;
  const estimatedDuration =
    totalRounds * recommendedRoundTime + totalRounds * 15; // 15 min buffer per round

  return {
    swissRounds,
    recommendedTopCut,
    estimatedDuration,
    recommendedRoundTime,
  };
}

/**
 * Validate that tournament settings make sense together
 */
export function validateTournamentIntegrity(
  settings: TournamentValidationSettings
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if Swiss rounds and top cut make sense together
  if (settings.format === "swiss_with_cut") {
    const calculatedRounds = calculateSwissRounds(settings.maxParticipants);

    // If too few Swiss rounds, top cut may not be meaningful
    if (settings.swissRounds < calculatedRounds - 1) {
      warnings.push(
        "Few Swiss rounds may result in tied players advancing to top cut"
      );
    }

    // If top cut is very large relative to participants
    const topCutRatio = settings.topCutSize / settings.maxParticipants;
    if (topCutRatio > 0.5) {
      warnings.push(
        "Top cut includes more than 50% of participants - consider reducing size"
      );
    }
  }

  // Check tournament duration reasonableness
  if (settings.format !== "single_elimination") {
    const duration = estimateTournamentDuration(
      settings.maxParticipants,
      settings.swissRounds,
      settings.topCutSize,
      settings.roundTimeMinutes,
      settings.format
    );

    if (duration > 720) {
      // More than 12 hours
      warnings.push(
        `Tournament estimated to take ${Math.round(duration / 60)} hours - very long event`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
