/**
 * Tournament Server Actions
 *
 * Server actions for tournament mutations with cache revalidation.
 * These wrap the @trainers/supabase mutations and trigger on-demand cache invalidation.
 */

"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createTournament as createTournamentMutation,
  updateTournament as updateTournamentMutation,
  deleteTournament as deleteTournamentMutation,
  archiveTournament as archiveTournamentMutation,
  registerForTournament as registerForTournamentMutation,
  cancelRegistration as cancelRegistrationMutation,
  checkIn as checkInMutation,
  undoCheckIn as undoCheckInMutation,
  withdrawFromTournament as withdrawFromTournamentMutation,
  getCurrentUserAlts,
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
  rentalTeamPhotosEnabled?: boolean;
  rentalTeamPhotosRequired?: boolean;
}): Promise<ActionResult<{ id: number; slug: string }>> {
  try {
    const supabase = await createClient();
    const result = await createTournamentMutation(supabase, data);
    // Note: Don't revalidate list yet - tournament is created as draft
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create tournament",
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
      error:
        error instanceof Error ? error.message : "Failed to update tournament",
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
      error:
        error instanceof Error ? error.message : "Failed to publish tournament",
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
      error:
        error instanceof Error ? error.message : "Failed to start tournament",
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
      error:
        error instanceof Error
          ? error.message
          : "Failed to complete tournament",
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
      error:
        error instanceof Error ? error.message : "Failed to archive tournament",
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
      error:
        error instanceof Error ? error.message : "Failed to delete tournament",
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
  data?: { altId?: number; teamName?: string; inGameName?: string }
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
      error: error instanceof Error ? error.message : "Failed to register",
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
      error:
        error instanceof Error
          ? error.message
          : "Failed to cancel registration",
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
      error: error instanceof Error ? error.message : "Failed to check in",
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
      error: error instanceof Error ? error.message : "Failed to undo check-in",
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
      error: error instanceof Error ? error.message : "Failed to withdraw",
    };
  }
}

// =============================================================================
// User Alt Actions
// =============================================================================

/**
 * Get current user's alts for registration selection
 */
export async function getCurrentUserAltsAction(): Promise<
  ActionResult<
    Array<{
      id: number;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>
  >
> {
  try {
    const supabase = await createClient();
    const alts = await getCurrentUserAlts(supabase);
    return { success: true, data: alts };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch user alts",
    };
  }
}
