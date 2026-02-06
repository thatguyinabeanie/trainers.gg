/**
 * Tournament Service Layer
 *
 * Pure business logic for tournament operations.
 * Called by both Server Actions (web) and API Routes (mobile).
 */

import { createClient } from "@/lib/supabase/server";
import {
  listTournamentsGrouped,
  getTournamentById,
  createTournament as createTournamentMutation,
  updateTournament as updateTournamentMutation,
  deleteTournament as deleteTournamentMutation,
  archiveTournament as archiveTournamentMutation,
  registerForTournament as registerForTournamentMutation,
  updateRegistrationPreferences as updateRegistrationPreferencesMutation,
  cancelRegistration as cancelRegistrationMutation,
  checkIn as checkInMutation,
  undoCheckIn as undoCheckInMutation,
  withdrawFromTournament as withdrawFromTournamentMutation,
  submitTeam as submitTeamMutation,
  selectTeamForTournament as selectTeamForTournamentMutation,
  createRound as createRoundMutation,
  generateRoundPairings as generateRoundPairingsMutation,
  startRound as startRoundMutation,
  completeRound as completeRoundMutation,
  deleteRoundAndMatches as deleteRoundAndMatchesMutation,
  recalculateStandings as recalculateStandingsMutation,
  dropPlayer as dropPlayerMutation,
  reportMatchResult as reportMatchResultMutation,
  startTournamentEnhanced as startTournamentEnhancedMutation,
  advanceToTopCut as advanceToTopCutMutation,
  generateEliminationPairings as generateEliminationPairingsMutation,
  completeTournament as completeTournamentMutation,
  getCurrentUserAlts,
  getUserTeams,
  getUserRegistrationDetails,
  getPhaseRoundsWithStats,
  getRoundMatchesWithStats,
  type Database,
} from "@trainers/supabase";

type TournamentFormat = Database["public"]["Enums"]["tournament_format"];
type TournamentStatus = Database["public"]["Enums"]["tournament_status"];

// =============================================================================
// Queries
// =============================================================================

export async function listTournamentsService(options?: {
  completedLimit?: number;
}) {
  const supabase = await createClient();
  return await listTournamentsGrouped(supabase, options);
}

export async function getTournamentByIdService(tournamentId: number) {
  const supabase = await createClient();
  const tournament = await getTournamentById(supabase, tournamentId);
  if (!tournament) {
    throw new Error("Tournament not found");
  }
  return tournament;
}

export async function getUserRegistrationDetailsService(tournamentId: number) {
  const supabase = await createClient();
  return await getUserRegistrationDetails(supabase, tournamentId);
}

export async function getPhaseRoundsWithStatsService(phaseId: number) {
  const supabase = await createClient();
  return await getPhaseRoundsWithStats(supabase, phaseId);
}

export async function getRoundMatchesWithStatsService(
  roundId: number,
  tournamentId: number
) {
  const supabase = await createClient();
  return await getRoundMatchesWithStats(supabase, roundId, tournamentId);
}

// =============================================================================
// Tournament CRUD
// =============================================================================

export async function createTournamentService(data: {
  organizationId: number;
  name: string;
  slug: string;
  description?: string;
  format?: string;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  topCutSize?: number;
  swissRounds?: number;
  tournamentFormat?: TournamentFormat;
  roundTimeMinutes?: number;
}) {
  const supabase = await createClient();
  return await createTournamentMutation(supabase, data);
}

export async function updateTournamentService(
  tournamentId: number,
  updates: {
    name?: string;
    description?: string;
    format?: string;
    startDate?: string;
    endDate?: string;
    maxParticipants?: number;
    status?: TournamentStatus;
  }
) {
  const supabase = await createClient();
  return await updateTournamentMutation(supabase, tournamentId, updates);
}

export async function deleteTournamentService(tournamentId: number) {
  const supabase = await createClient();
  return await deleteTournamentMutation(supabase, tournamentId);
}

export async function archiveTournamentService(tournamentId: number) {
  const supabase = await createClient();
  return await archiveTournamentMutation(supabase, tournamentId);
}

// =============================================================================
// Registration
// =============================================================================

export async function registerForTournamentService(
  tournamentId: number,
  altId?: number
) {
  const supabase = await createClient();
  return await registerForTournamentMutation(supabase, tournamentId, { altId });
}

export async function updateRegistrationPreferencesService(
  tournamentId: number,
  preferences: {
    inGameName?: string;
    displayNameOption?: string;
    showCountryFlag?: boolean;
  }
) {
  const supabase = await createClient();
  return await updateRegistrationPreferencesMutation(
    supabase,
    tournamentId,
    preferences
  );
}

export async function cancelRegistrationService(tournamentId: number) {
  const supabase = await createClient();
  return await cancelRegistrationMutation(supabase, tournamentId);
}

export async function checkInService(tournamentId: number) {
  const supabase = await createClient();
  return await checkInMutation(supabase, tournamentId);
}

export async function undoCheckInService(tournamentId: number) {
  const supabase = await createClient();
  return await undoCheckInMutation(supabase, tournamentId);
}

export async function withdrawFromTournamentService(tournamentId: number) {
  const supabase = await createClient();
  return await withdrawFromTournamentMutation(supabase, tournamentId);
}

// =============================================================================
// Team Submission
// =============================================================================

export async function submitTeamService(
  tournamentId: number,
  showdownText: string
) {
  const supabase = await createClient();
  return await submitTeamMutation(supabase, tournamentId, showdownText);
}

export async function selectTeamForTournamentService(
  tournamentId: number,
  teamId: number
) {
  const supabase = await createClient();
  return await selectTeamForTournamentMutation(supabase, tournamentId, teamId);
}

export async function getUserTeamsService() {
  const supabase = await createClient();
  return await getUserTeams(supabase);
}

// =============================================================================
// Round Management
// =============================================================================

export async function createRoundService(phaseId: number, roundNumber: number) {
  const supabase = await createClient();
  return await createRoundMutation(supabase, phaseId, roundNumber);
}

export async function generateRoundPairingsService(roundId: number) {
  const supabase = await createClient();
  return await generateRoundPairingsMutation(supabase, roundId);
}

export async function startRoundService(roundId: number) {
  const supabase = await createClient();
  return await startRoundMutation(supabase, roundId);
}

export async function completeRoundService(roundId: number) {
  const supabase = await createClient();
  return await completeRoundMutation(supabase, roundId);
}

export async function deleteRoundAndMatchesService(roundId: number) {
  const supabase = await createClient();
  return await deleteRoundAndMatchesMutation(supabase, roundId);
}

export async function recalculateStandingsService(tournamentId: number) {
  const supabase = await createClient();
  return await recalculateStandingsMutation(supabase, tournamentId);
}

export async function dropPlayerService(
  tournamentId: number,
  registrationId: number
) {
  const supabase = await createClient();
  return await dropPlayerMutation(supabase, tournamentId, registrationId);
}

export async function reportMatchResultService(
  matchId: number,
  winnerAltId: number,
  player1Wins: number,
  player2Wins: number
) {
  const supabase = await createClient();
  return await reportMatchResultMutation(
    supabase,
    matchId,
    winnerAltId,
    player1Wins,
    player2Wins
  );
}

// =============================================================================
// Tournament Flow
// =============================================================================

export async function startTournamentService(tournamentId: number) {
  const supabase = await createClient();
  return await startTournamentEnhancedMutation(supabase, tournamentId);
}

export async function advanceToTopCutService(tournamentId: number) {
  const supabase = await createClient();
  return await advanceToTopCutMutation(supabase, tournamentId);
}

export async function generateEliminationPairingsService(roundId: number) {
  const supabase = await createClient();
  return await generateEliminationPairingsMutation(supabase, roundId);
}

export async function completeTournamentService(tournamentId: number) {
  const supabase = await createClient();
  return await completeTournamentMutation(supabase, tournamentId);
}

// =============================================================================
// User Context
// =============================================================================

export async function getCurrentUserAltsService() {
  const supabase = await createClient();
  return await getCurrentUserAlts(supabase);
}
