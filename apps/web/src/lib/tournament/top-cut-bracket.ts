/**
 * Top Cut Bracket Generation
 *
 * Handles single and double elimination bracket generation
 * for Pokemon VGC tournament top cut phases.
 */

export interface BracketPlayer {
  id: string;
  name: string;
  seed: number;
}

export interface BracketSettings {
  bracketSize: number;
  format: "single_elimination" | "double_elimination";
  matchFormat: "best_of_1" | "best_of_3";
}

export interface BracketMatch {
  id: string;
  round: number;
  matchNumber: number;
  player1Id: string | null;
  player2Id: string | null;
  player1Seed: number | null;
  player2Seed: number | null;
  player1MatchPoints: number;
  player2MatchPoints: number;
  player1GameWins: number;
  player2GameWins: number;
  winnerId: string | null;
  isComplete: boolean;
  matchFormat: "best_of_1" | "best_of_3";
  prerequisiteMatch1Id: string | null;
  prerequisiteMatch2Id: string | null;
}

export interface BracketStructure {
  bracketSize: number;
  totalRounds: number;
  format: "single_elimination" | "double_elimination";
  matches: BracketMatch[];
}

/**
 * Check if bracket size is valid (power of 2 between 4 and 32)
 */
export function isValidBracketSize(size: number): boolean {
  // Must be power of 2
  if ((size & (size - 1)) !== 0) {
    return false;
  }

  // Must be between 4 and 32 players
  return size >= 4 && size <= 32;
}

/**
 * Calculate number of rounds needed for bracket
 */
export function calculateBracketRounds(bracketSize: number): number {
  if (!isValidBracketSize(bracketSize)) {
    throw new Error(`Invalid bracket size: ${bracketSize}`);
  }

  return Math.log2(bracketSize);
}

/**
 * Generate bracket matchups based on standard tournament seeding
 * Returns array of [seed1, seed2] pairs for first round
 */
export function getBracketMatchups(bracketSize: number): number[][] {
  if (!isValidBracketSize(bracketSize)) {
    throw new Error(`Invalid bracket size: ${bracketSize}`);
  }

  const matchups: number[][] = [];
  const seeds = Array.from({ length: bracketSize }, (_, i) => i + 1);

  // Standard tournament bracket seeding
  // Highest seed plays lowest seed, etc.
  for (let i = 0; i < bracketSize / 2; i++) {
    const highSeed = seeds[i];
    const lowSeed = seeds[bracketSize - 1 - i];
    if (highSeed !== undefined && lowSeed !== undefined) {
      matchups.push([highSeed, lowSeed]);
    }
  }

  // Reorder to create proper bracket structure
  const reorderedMatchups: number[][] = [];

  if (bracketSize === 4) {
    // For 4 players: [1,4], [2,3]
    const m0 = matchups[0];
    const m1 = matchups[1];
    if (m0) reorderedMatchups.push(m0);
    if (m1) reorderedMatchups.push(m1);
  } else if (bracketSize === 8) {
    // For 8 players: [1,8], [4,5], [2,7], [3,6]
    const m0 = matchups[0];
    const m1 = matchups[1];
    const m2 = matchups[2];
    const m3 = matchups[3];
    if (m0) reorderedMatchups.push(m0);
    if (m3) reorderedMatchups.push(m3);
    if (m1) reorderedMatchups.push(m1);
    if (m2) reorderedMatchups.push(m2);
  } else if (bracketSize === 16) {
    // For 16 players: arrange by quarters
    const quarters = [
      [matchups[0], matchups[7]], // Top quarter: [1,16], [8,9]
      [matchups[3], matchups[4]], // Second quarter: [4,13], [5,12]
      [matchups[1], matchups[6]], // Third quarter: [2,15], [7,10]
      [matchups[2], matchups[5]], // Bottom quarter: [3,14], [6,11]
    ];

    for (const quarter of quarters) {
      for (const match of quarter) {
        if (match) reorderedMatchups.push(match);
      }
    }
  } else {
    // For larger brackets, use default order for now
    reorderedMatchups.push(...matchups);
  }

  return reorderedMatchups;
}

/**
 * Generate complete top cut bracket structure
 */
export function generateTopCutBracket(
  players: BracketPlayer[],
  settings: BracketSettings
): BracketStructure {
  // Validate inputs
  if (!isValidBracketSize(settings.bracketSize)) {
    throw new Error(`Invalid bracket size: ${settings.bracketSize}`);
  }

  if (players.length !== settings.bracketSize) {
    throw new Error(
      `Player count (${players.length}) does not match bracket size (${settings.bracketSize})`
    );
  }

  const totalRounds = calculateBracketRounds(settings.bracketSize);
  const matches: BracketMatch[] = [];

  // Generate all rounds of matches
  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = generateRoundMatches(
      round,
      settings.bracketSize,
      settings.matchFormat,
      players,
      matches
    );
    matches.push(...roundMatches);
  }

  return {
    bracketSize: settings.bracketSize,
    totalRounds,
    format: settings.format,
    matches,
  };
}

/**
 * Generate matches for a specific round
 */
function generateRoundMatches(
  round: number,
  bracketSize: number,
  matchFormat: "best_of_1" | "best_of_3",
  players: BracketPlayer[],
  existingMatches: BracketMatch[]
): BracketMatch[] {
  const matchesInRound = bracketSize / Math.pow(2, round);
  const roundMatches: BracketMatch[] = [];

  if (round === 1) {
    // First round: create matches with actual players
    const matchups = getBracketMatchups(bracketSize);

    for (let i = 0; i < matchesInRound; i++) {
      const matchup = matchups[i];
      if (!matchup) continue;

      const [seed1, seed2] = matchup;
      const player1 = players.find((p) => p.seed === seed1);
      const player2 = players.find((p) => p.seed === seed2);

      if (!player1 || !player2) {
        throw new Error(
          `Could not find players for seeds ${seed1} and ${seed2}`
        );
      }

      const match: BracketMatch = {
        id: `topcut-r${round}-m${i + 1}`,
        round,
        matchNumber: i + 1,
        player1Id: player1.id,
        player2Id: player2.id,
        player1Seed: seed1 ?? null,
        player2Seed: seed2 ?? null,
        player1MatchPoints: 0,
        player2MatchPoints: 0,
        player1GameWins: 0,
        player2GameWins: 0,
        winnerId: null,
        isComplete: false,
        matchFormat,
        prerequisiteMatch1Id: null,
        prerequisiteMatch2Id: null,
      };

      roundMatches.push(match);
    }
  } else {
    // Later rounds: create matches that depend on previous round results
    const previousRound = round - 1;
    const previousRoundMatches = existingMatches.filter(
      (m) => m.round === previousRound
    );

    for (let i = 0; i < matchesInRound; i++) {
      // Each match in this round takes winners from two previous matches
      const prereq1Index = i * 2;
      const prereq2Index = i * 2 + 1;

      const prereq1 = previousRoundMatches[prereq1Index];
      const prereq2 = previousRoundMatches[prereq2Index];

      if (!prereq1 || !prereq2) {
        throw new Error(
          `Could not find prerequisite matches for round ${round}, match ${i + 1}`
        );
      }

      const match: BracketMatch = {
        id: `topcut-r${round}-m${i + 1}`,
        round,
        matchNumber: i + 1,
        player1Id: null, // TBD from prerequisite match
        player2Id: null, // TBD from prerequisite match
        player1Seed: null,
        player2Seed: null,
        player1MatchPoints: 0,
        player2MatchPoints: 0,
        player1GameWins: 0,
        player2GameWins: 0,
        winnerId: null,
        isComplete: false,
        matchFormat,
        prerequisiteMatch1Id: prereq1.id,
        prerequisiteMatch2Id: prereq2.id,
      };

      roundMatches.push(match);
    }
  }

  return roundMatches;
}

/**
 * Advance bracket by determining next round matchups based on completed matches
 */
export function advanceBracket(
  bracket: BracketStructure,
  completedMatches: BracketMatch[]
): BracketMatch[] {
  const updatedMatches: BracketMatch[] = [];

  for (const match of bracket.matches) {
    // If this match depends on other matches, check if we can fill in the players
    if (
      match.prerequisiteMatch1Id &&
      match.prerequisiteMatch2Id &&
      !match.player1Id
    ) {
      const prereq1 = completedMatches.find(
        (m) => m.id === match.prerequisiteMatch1Id
      );
      const prereq2 = completedMatches.find(
        (m) => m.id === match.prerequisiteMatch2Id
      );

      if (
        prereq1?.isComplete &&
        prereq2?.isComplete &&
        prereq1.winnerId &&
        prereq2.winnerId
      ) {
        const updatedMatch: BracketMatch = {
          ...match,
          player1Id: prereq1.winnerId,
          player2Id: prereq2.winnerId,
          // Carry forward the seeds of the winning players
          player1Seed:
            prereq1.winnerId === prereq1.player1Id
              ? prereq1.player1Seed
              : prereq1.player2Seed,
          player2Seed:
            prereq2.winnerId === prereq2.player1Id
              ? prereq2.player1Seed
              : prereq2.player2Seed,
        };
        updatedMatches.push(updatedMatch);
      } else {
        updatedMatches.push(match);
      }
    } else {
      updatedMatches.push(match);
    }
  }

  return updatedMatches;
}

/**
 * Check if bracket is complete (has a winner)
 */
export function isBracketComplete(bracket: BracketStructure): boolean {
  const finalsMatch = bracket.matches.find(
    (m) => m.round === bracket.totalRounds
  );

  return finalsMatch?.isComplete === true && finalsMatch.winnerId !== null;
}

/**
 * Get bracket winner (if tournament is complete)
 */
export function getBracketWinner(bracket: BracketStructure): string | null {
  if (!isBracketComplete(bracket)) {
    return null;
  }

  const finalsMatch = bracket.matches.find(
    (m) => m.round === bracket.totalRounds
  );

  return finalsMatch?.winnerId ?? null;
}
