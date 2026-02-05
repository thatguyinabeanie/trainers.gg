/**
 * Tournament Schedule Calculation
 *
 * Utilities for calculating per-round ETAs, required round counts,
 * and complete tournament schedules including Swiss rounds and top cut phases.
 */

/**
 * Round schedule information for a single round
 */
export interface RoundSchedule {
  roundNumber: number;
  name: string;
  estimatedStartTime: Date | null;
  actualStartTime: Date | null;
  isCompleted: boolean;
  isActive: boolean;
}

/**
 * Phase schedule information for Swiss or Top Cut
 */
export interface PhaseSchedule {
  phaseName: string;
  phaseType: "swiss" | "top_cut";
  rounds: RoundSchedule[];
}

/**
 * Complete tournament schedule
 */
export interface TournamentSchedule {
  tournamentStartTime: Date | null;
  phases: PhaseSchedule[];
}

/**
 * Tournament data needed for schedule calculation
 */
export interface TournamentScheduleData {
  startDate: string | null;
  roundTimeMinutes: number;
  tournamentFormat:
    | "swiss_only"
    | "swiss_with_cut"
    | "single_elimination"
    | "double_elimination";
  swissRounds: number | null;
  topCutSize: number | null;
  registrationCount: number;
  currentRound: number;
  tournamentPhases?: Array<{
    id: number;
    name: string;
    phase_type: string;
    status: string;
    current_round: number;
    planned_rounds: number | null;
    tournament_rounds?: Array<{
      id: number;
      round_number: number;
      status: string;
      start_time: string | null;
      end_time: string | null;
    }>;
  }>;
}

/**
 * Calculate required number of Swiss rounds based on player count
 * Uses the formula: ceil(log2(participants)) with minimum of 3 rounds
 */
export function calculateRequiredSwissRounds(playerCount: number): number {
  if (playerCount <= 8) {
    return 3; // Minimum 3 rounds
  }

  return Math.ceil(Math.log2(playerCount));
}

/**
 * Calculate number of elimination rounds for a given top cut size
 * Top 8 → 3 rounds (QF, SF, F)
 * Top 4 → 2 rounds (SF, F)
 * Top 16 → 4 rounds (R16, QF, SF, F)
 */
export function calculateTopCutRounds(topCutSize: number): number {
  if (topCutSize <= 1) return 0;
  return Math.ceil(Math.log2(topCutSize));
}

/**
 * Get human-readable name for a top cut round
 */
export function getTopCutRoundName(
  roundNumber: number,
  totalRounds: number
): string {
  const remainingRounds = totalRounds - roundNumber + 1;

  if (remainingRounds === 1) return "Finals";
  if (remainingRounds === 2) return "Semifinals";
  if (remainingRounds === 3) return "Quarterfinals";
  if (remainingRounds === 4) return "Round of 16";

  // For larger brackets
  const playerCount = Math.pow(2, remainingRounds);
  return `Top ${playerCount}`;
}

/**
 * Calculate estimated start time for a round
 */
export function calculateRoundETA(
  tournamentStartTime: Date,
  roundNumber: number,
  roundDurationMinutes: number,
  completedRounds: Array<{
    roundNumber: number;
    actualStartTime: Date | null;
    actualEndTime: Date | null;
  }>
): Date {
  // If we have actual completion data for previous rounds, use it
  // Otherwise, use estimated times based on round duration

  let currentTime = tournamentStartTime;

  for (let i = 1; i < roundNumber; i++) {
    const completedRound = completedRounds.find((r) => r.roundNumber === i);

    if (completedRound?.actualEndTime) {
      // Use actual end time of completed round
      currentTime = completedRound.actualEndTime;
    } else if (completedRound?.actualStartTime) {
      // Round started but not finished, estimate based on round duration
      currentTime = new Date(
        completedRound.actualStartTime.getTime() +
          roundDurationMinutes * 60 * 1000
      );
    } else {
      // No actual data, use estimated duration
      currentTime = new Date(
        currentTime.getTime() + roundDurationMinutes * 60 * 1000
      );
    }
  }

  return currentTime;
}

/**
 * Generate complete tournament schedule with per-round ETAs
 */
export function getTournamentSchedule(
  data: TournamentScheduleData
): TournamentSchedule {
  const phases: PhaseSchedule[] = [];

  if (!data.startDate) {
    return {
      tournamentStartTime: null,
      phases: [],
    };
  }

  const startTime = new Date(data.startDate);

  // Determine number of Swiss rounds
  let swissRoundCount = data.swissRounds ?? 0;
  if (!swissRoundCount && data.registrationCount > 0) {
    swissRoundCount = calculateRequiredSwissRounds(data.registrationCount);
  }

  // Build completed rounds data from tournament phases
  const completedRoundsData: Array<{
    roundNumber: number;
    actualStartTime: Date | null;
    actualEndTime: Date | null;
  }> = [];

  if (data.tournamentPhases) {
    for (const phase of data.tournamentPhases) {
      if (phase.tournament_rounds) {
        for (const round of phase.tournament_rounds) {
          completedRoundsData.push({
            roundNumber: round.round_number,
            actualStartTime: round.start_time
              ? new Date(round.start_time)
              : null,
            actualEndTime: round.end_time ? new Date(round.end_time) : null,
          });
        }
      }
    }
  }

  // Swiss rounds phase
  if (
    swissRoundCount > 0 &&
    (data.tournamentFormat === "swiss_only" ||
      data.tournamentFormat === "swiss_with_cut")
  ) {
    const swissRounds: RoundSchedule[] = [];

    for (let i = 1; i <= swissRoundCount; i++) {
      const completedRound = completedRoundsData.find(
        (r) => r.roundNumber === i
      );
      const isCompleted = completedRound?.actualEndTime != null;
      const isActive =
        data.currentRound === i && completedRound?.actualStartTime != null;

      swissRounds.push({
        roundNumber: i,
        name: `Round ${i}`,
        estimatedStartTime: calculateRoundETA(
          startTime,
          i,
          data.roundTimeMinutes,
          completedRoundsData
        ),
        actualStartTime: completedRound?.actualStartTime ?? null,
        isCompleted,
        isActive,
      });
    }

    phases.push({
      phaseName: `Swiss Rounds (${swissRoundCount})`,
      phaseType: "swiss",
      rounds: swissRounds,
    });
  }

  // Top cut phase
  if (
    data.tournamentFormat === "swiss_with_cut" &&
    data.topCutSize &&
    data.topCutSize > 1
  ) {
    const topCutRoundCount = calculateTopCutRounds(data.topCutSize);
    const topCutRounds: RoundSchedule[] = [];

    // Top cut rounds start after Swiss rounds
    const swissEndRoundNumber = swissRoundCount;

    for (let i = 1; i <= topCutRoundCount; i++) {
      const absoluteRoundNumber = swissEndRoundNumber + i;
      const completedRound = completedRoundsData.find(
        (r) => r.roundNumber === absoluteRoundNumber
      );
      const isCompleted = completedRound?.actualEndTime != null;
      const isActive =
        data.currentRound === absoluteRoundNumber &&
        completedRound?.actualStartTime != null;

      topCutRounds.push({
        roundNumber: absoluteRoundNumber,
        name: getTopCutRoundName(i, topCutRoundCount),
        estimatedStartTime: calculateRoundETA(
          startTime,
          absoluteRoundNumber,
          data.roundTimeMinutes,
          completedRoundsData
        ),
        actualStartTime: completedRound?.actualStartTime ?? null,
        isCompleted,
        isActive,
      });
    }

    phases.push({
      phaseName: `Top Cut (Top ${data.topCutSize})`,
      phaseType: "top_cut",
      rounds: topCutRounds,
    });
  }

  return {
    tournamentStartTime: startTime,
    phases,
  };
}

/**
 * Format time for display (e.g., "6:06 PM")
 */
export function formatRoundTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format date and time for start display (e.g., "Mon, Feb 2 at 6:06 PM")
 */
export function formatStartDateTime(date: Date): string {
  const datePart = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timePart = formatRoundTime(date);
  return `${datePart} at ${timePart}`;
}
