/**
 * Tournament Server Actions
 *
 * Server actions for tournament mutations with cache revalidation.
 * These wrap the @trainers/supabase mutations and trigger on-demand cache invalidation.
 */

"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import {
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
  // Team submission
  submitTeam as submitTeamMutation,
  selectTeamForTournament as selectTeamForTournamentMutation,
  // Round management mutations
  createRound as createRoundMutation,
  generateRoundPairings as generateRoundPairingsMutation,
  startRound as startRoundMutation,
  completeRound as completeRoundMutation,
  recalculateStandings as recalculateStandingsMutation,
  dropPlayer as dropPlayerMutation,
  reportMatchResult as reportMatchResultMutation,
  getCurrentUserAlts,
  getUserTeams,
  getUserRegistrationDetails,
} from "@trainers/supabase";
import type { Database } from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";

type TournamentFormat = Database["public"]["Enums"]["tournament_format"];
type TournamentStatus = Database["public"]["Enums"]["tournament_status"];

/**
 * Action result type for consistent error handling
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// =============================================================================
// Tournament CRUD
// =============================================================================

/**
 * Create a new tournament
 * Revalidates: tournaments list (after publication)
 */
export async function createTournament(data: {
  organizationId: number;
  name: string;
  slug: string;
  description?: string;
  format?: string;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  maxParticipants?: number;
  topCutSize?: number;
  swissRounds?: number;
  tournamentFormat?: TournamentFormat;
  roundTimeMinutes?: number;
}): Promise<ActionResult<{ id: number; slug: string }>> {
  try {
    const supabase = await createClient();
    const result = await createTournamentMutation(supabase, data);
    // Note: Don't revalidate list yet - tournament is created as draft
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create tournament"),
    };
  }
}

/**
 * Update tournament details
 * Revalidates: tournaments list when status changes to 'upcoming' (published)
 */
export async function updateTournament(
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
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await updateTournamentMutation(supabase, tournamentId, updates);

    // Revalidate list when tournament is published (becomes visible)
    if (updates.status === "upcoming") {
      updateTag(CacheTags.TOURNAMENTS_LIST);
    }

    // Revalidate individual tournament page
    updateTag(CacheTags.tournament(tournamentId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update tournament"),
    };
  }
}

/**
 * Publish a tournament (change status from draft to upcoming)
 * Revalidates: tournaments list
 */
export async function publishTournament(
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await updateTournamentMutation(supabase, tournamentId, {
      status: "upcoming",
    });

    // Tournament is now visible on the public list
    updateTag(CacheTags.TOURNAMENTS_LIST);
    updateTag(CacheTags.tournament(tournamentId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to publish tournament"),
    };
  }
}

/**
 * Start a tournament (change status to active)
 * Revalidates: tournaments list
 */
export async function startTournament(
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await updateTournamentMutation(supabase, tournamentId, {
      status: "active",
    });

    // Update the list to show in "Active" section
    updateTag(CacheTags.TOURNAMENTS_LIST);
    updateTag(CacheTags.tournament(tournamentId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to start tournament"),
    };
  }
}

/**
 * Complete a tournament
 * Revalidates: tournaments list
 */
export async function completeTournament(
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await updateTournamentMutation(supabase, tournamentId, {
      status: "completed",
    });

    // Update the list to show in "Completed" section
    updateTag(CacheTags.TOURNAMENTS_LIST);
    updateTag(CacheTags.tournament(tournamentId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to complete tournament"),
    };
  }
}

/**
 * Archive a tournament
 * Revalidates: tournaments list (removes from public view)
 */
export async function archiveTournament(
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await archiveTournamentMutation(supabase, tournamentId);

    // Remove from public list
    updateTag(CacheTags.TOURNAMENTS_LIST);
    updateTag(CacheTags.tournament(tournamentId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to archive tournament"),
    };
  }
}

/**
 * Delete a tournament (draft only)
 * Note: Only draft tournaments can be deleted, so no list revalidation needed
 */
export async function deleteTournament(
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await deleteTournamentMutation(supabase, tournamentId);
    // Draft tournaments are not visible on public list, no revalidation needed
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete tournament"),
    };
  }
}

// =============================================================================
// Registration Actions
// =============================================================================

/**
 * Register for a tournament
 * Revalidates: tournaments list (registration count changes), individual tournament
 */
export async function registerForTournament(
  tournamentId: number,
  data?: {
    altId?: number;
    teamName?: string;
    inGameName?: string;
    displayNameOption?: string;
    showCountryFlag?: boolean;
  }
): Promise<ActionResult<{ registrationId: number; status: string }>> {
  try {
    const supabase = await createClient();
    const result = await registerForTournamentMutation(
      supabase,
      tournamentId,
      data
    );

    // Revalidate tournaments list (registration count displayed in list)
    updateTag(CacheTags.TOURNAMENTS_LIST);
    // Revalidate individual tournament page
    updateTag(CacheTags.tournament(tournamentId));

    return {
      success: true,
      data: { registrationId: result.registrationId, status: result.status },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to register"),
    };
  }
}

/**
 * Cancel tournament registration
 * Revalidates: tournaments list (registration count changes), individual tournament
 */
export async function cancelRegistration(
  registrationId: number,
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await cancelRegistrationMutation(supabase, registrationId);

    // Revalidate tournaments list (registration count displayed in list)
    updateTag(CacheTags.TOURNAMENTS_LIST);
    // Revalidate individual tournament page
    updateTag(CacheTags.tournament(tournamentId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to cancel registration"),
    };
  }
}

/**
 * Check in to a tournament
 */
export async function checkIn(
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await checkInMutation(supabase, tournamentId);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to check in"),
    };
  }
}

/**
 * Undo check-in
 */
export async function undoCheckIn(
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await undoCheckInMutation(supabase, tournamentId);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to undo check-in"),
    };
  }
}

/**
 * Withdraw from a tournament
 * Revalidates: tournaments list (registration count changes), individual tournament
 */
export async function withdrawFromTournament(
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await withdrawFromTournamentMutation(supabase, tournamentId);

    // Revalidate tournaments list (registration count displayed in list)
    updateTag(CacheTags.TOURNAMENTS_LIST);
    // Revalidate individual tournament page
    updateTag(CacheTags.tournament(tournamentId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to withdraw"),
    };
  }
}

/**
 * Get registration details for the current user
 * Used to pre-fill the "Edit Registration" modal
 */
export async function getRegistrationDetailsAction(
  tournamentId: number
): Promise<
  ActionResult<{
    id: number;
    alt_id: number;
    in_game_name: string | null;
    display_name_option: string | null;
    show_country_flag: boolean | null;
    status: string | null;
  } | null>
> {
  try {
    const supabase = await createClient();
    const details = await getUserRegistrationDetails(supabase, tournamentId);
    return { success: true, data: details };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to load registration"),
    };
  }
}

/**
 * Update registration preferences (in-game name, display options)
 * Used by the "Edit Registration" flow
 */
export async function updateRegistrationAction(
  tournamentId: number,
  data: {
    inGameName?: string;
    displayNameOption?: string;
    showCountryFlag?: boolean;
  }
): Promise<ActionResult<{ success: true; registrationId: number }>> {
  try {
    const supabase = await createClient();
    const result = await updateRegistrationPreferencesMutation(
      supabase,
      tournamentId,
      data
    );
    updateTag(CacheTags.tournament(tournamentId));
    return {
      success: true,
      data: { success: true, registrationId: result.registrationId },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update registration"),
    };
  }
}

// =============================================================================
// Team Submission Actions
// =============================================================================

/**
 * Submit a team for a tournament registration.
 * Revalidates: tournament detail page, tournament team list
 */
export async function submitTeamAction(
  tournamentId: number,
  rawText: string
): Promise<ActionResult<{ teamId: number; pokemonCount: number }>> {
  try {
    const supabase = await createClient();
    const result = await submitTeamMutation(supabase, tournamentId, rawText);

    // Revalidate tournament detail page (shows team submission status)
    updateTag(CacheTags.tournament(tournamentId));
    // Revalidate tournament team list (for open teamsheet public view)
    updateTag(CacheTags.tournamentTeams(tournamentId));

    return {
      success: true,
      data: { teamId: result.teamId, pokemonCount: result.pokemonCount },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to submit team"),
    };
  }
}

/**
 * Select an existing team for a tournament registration.
 * Links a pre-existing team (owned by the user's alt) to their registration.
 */
export async function selectTeamAction(
  tournamentId: number,
  teamId: number
): Promise<ActionResult<{ teamId: number; pokemonCount: number }>> {
  try {
    const supabase = await createClient();
    const result = await selectTeamForTournamentMutation(
      supabase,
      tournamentId,
      teamId
    );

    updateTag(CacheTags.tournament(tournamentId));
    updateTag(CacheTags.tournamentTeams(tournamentId));

    return {
      success: true,
      data: { teamId: result.teamId, pokemonCount: result.pokemonCount },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to select team"),
    };
  }
}

// =============================================================================
// User Alt Actions
// =============================================================================

/**
 * Get current user's alts for registration selection.
 * Includes first_name/last_name from the users table for display name options.
 */
export async function getCurrentUserAltsAction(): Promise<
  ActionResult<
    Array<{
      id: number;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      first_name: string | null;
      last_name: string | null;
      country: string | null;
    }>
  >
> {
  try {
    const supabase = await createClient();
    const alts = await getCurrentUserAlts(supabase);

    if (alts.length === 0) return { success: true, data: [] };

    // Fetch user's name and country for display name options and flag
    const userId = alts[0]!.user_id;
    const { data: user } = await supabase
      .from("users")
      .select("first_name, last_name, country")
      .eq("id", userId)
      .single();

    return {
      success: true,
      data: alts.map((a) => ({
        id: a.id,
        username: a.username,
        display_name: a.display_name,
        avatar_url: a.avatar_url,
        first_name: user?.first_name ?? null,
        last_name: user?.last_name ?? null,
        country: user?.country ?? null,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to fetch user alts"),
    };
  }
}

/**
 * Get current user's teams for registration selection
 */
export async function getUserTeamsAction(): Promise<
  ActionResult<
    Array<{
      id: number;
      name: string | null;
      pokemonCount: number;
    }>
  >
> {
  try {
    const supabase = await createClient();
    const teams = await getUserTeams(supabase);
    return {
      success: true,
      data: teams.map((t) => ({
        id: t.id,
        name: t.name,
        pokemonCount: t.pokemonCount,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to fetch user teams"),
    };
  }
}

// =============================================================================
// Round Management Actions
// =============================================================================

/**
 * Create a new round for a phase
 */
export async function createRound(
  phaseId: number,
  roundNumber: number,
  tournamentId: number
): Promise<ActionResult<{ roundId: number }>> {
  try {
    const supabase = await createClient();
    const result = await createRoundMutation(supabase, phaseId, roundNumber);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { roundId: result.round.id } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create round"),
    };
  }
}

/**
 * Generate pairings for a round using Swiss algorithm
 */
export async function generatePairings(
  roundId: number,
  tournamentId: number
): Promise<
  ActionResult<{
    matchesCreated: number;
    warnings: string[];
  }>
> {
  try {
    const supabase = await createClient();
    const result = await generateRoundPairingsMutation(supabase, roundId);
    updateTag(CacheTags.tournament(tournamentId));
    return {
      success: true,
      data: {
        matchesCreated: result.matchesCreated,
        warnings: result.warnings,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to generate pairings"),
    };
  }
}

/**
 * Start a round (set status to active)
 */
export async function startRound(
  roundId: number,
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await startRoundMutation(supabase, roundId);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to start round"),
    };
  }
}

/**
 * Complete a round (set status to completed, recalculate standings)
 */
export async function completeRound(
  roundId: number,
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await completeRoundMutation(supabase, roundId);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to complete round"),
    };
  }
}

/**
 * Recalculate tournament standings
 */
export async function recalculateStandings(
  tournamentId: number
): Promise<ActionResult<{ playersUpdated: number }>> {
  try {
    const supabase = await createClient();
    const result = await recalculateStandingsMutation(supabase, tournamentId);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { playersUpdated: result.playersUpdated } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to recalculate standings"),
    };
  }
}

/**
 * Drop a player from the tournament
 */
export async function dropPlayer(
  tournamentId: number,
  altId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await dropPlayerMutation(supabase, tournamentId, altId);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to drop player"),
    };
  }
}

/**
 * Report match result
 */
export async function reportMatchResult(
  matchId: number,
  tournamentId: number,
  winnerAltId: number,
  player1GamesWon: number,
  player2GamesWon: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await reportMatchResultMutation(
      supabase,
      matchId,
      winnerAltId,
      player1GamesWon,
      player2GamesWon
    );
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to report match result"),
    };
  }
}

// =============================================================================
// Phase Management Actions
// =============================================================================

/**
 * Update a tournament phase
 */
export async function updatePhase(
  phaseId: number,
  tournamentId: number,
  updates: {
    name?: string;
    bestOf?: 1 | 3 | 5;
    roundTimeMinutes?: number;
    checkInTimeMinutes?: number;
    plannedRounds?: number;
    cutRule?: "x-1" | "x-2" | "x-3" | "top-4" | "top-8" | "top-16" | "top-32";
  }
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    const { updatePhase: updatePhaseMutation } =
      await import("@trainers/supabase");
    await updatePhaseMutation(supabase, phaseId, updates);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update phase"),
    };
  }
}

/**
 * Create a new tournament phase
 */
export async function createTournamentPhase(
  tournamentId: number,
  phase: {
    name: string;
    phaseType: "swiss" | "single_elimination" | "double_elimination";
    bestOf: 1 | 3 | 5;
    roundTimeMinutes: number;
    checkInTimeMinutes: number;
    plannedRounds?: number;
    cutRule?: "x-1" | "x-2" | "x-3" | "top-4" | "top-8" | "top-16" | "top-32";
  }
): Promise<ActionResult<{ phaseId: number }>> {
  try {
    const supabase = await createClient();
    const { createPhase: createPhaseMutation } =
      await import("@trainers/supabase");
    const result = await createPhaseMutation(supabase, tournamentId, phase);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { phaseId: result.phase.id } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create phase"),
    };
  }
}

/**
 * Delete a tournament phase
 */
export async function deleteTournamentPhase(
  phaseId: number,
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    const { deletePhase: deletePhaseMutation } =
      await import("@trainers/supabase");
    await deletePhaseMutation(supabase, phaseId);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete phase"),
    };
  }
}

/**
 * Phase input for batch save
 */
interface PhaseInput {
  id?: number;
  name: string;
  phaseType: "swiss" | "single_elimination" | "double_elimination";
  bestOf: 1 | 3 | 5;
  roundTimeMinutes: number;
  checkInTimeMinutes: number;
  plannedRounds?: number;
  cutRule?: "x-1" | "x-2" | "x-3" | "top-4" | "top-8" | "top-16" | "top-32";
}

/**
 * Save all tournament phases in a single batch operation
 * Creates, updates, and deletes phases as needed
 */
export async function saveTournamentPhasesAction(
  tournamentId: number,
  phases: PhaseInput[]
): Promise<
  ActionResult<{ deleted: number; updated: number; created: number }>
> {
  try {
    const supabase = await createClient();
    const { saveTournamentPhases } = await import("@trainers/supabase");
    const result = await saveTournamentPhases(supabase, tournamentId, phases);
    updateTag(CacheTags.tournament(tournamentId));
    return {
      success: true,
      data: {
        deleted: result.deleted,
        updated: result.updated,
        created: result.created,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to save phases"),
    };
  }
}
