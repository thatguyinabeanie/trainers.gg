/**
 * Tournament Server Actions
 *
 * Server actions for tournament mutations with cache revalidation.
 * These wrap the @trainers/supabase mutations and trigger on-demand cache invalidation.
 */

"use server";

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
  updateRegistrationStatus as updateRegistrationStatusMutation,
  // Team submission
  submitTeam as submitTeamMutation,
  selectTeamForTournament as selectTeamForTournamentMutation,
  // Round management mutations
  createRound as createRoundMutation,
  generateRoundPairings as generateRoundPairingsMutation,
  startRound as startRoundMutation,
  completeRound as completeRoundMutation,
  deleteRoundAndMatches as deleteRoundAndMatchesMutation,
  recalculateStandings as recalculateStandingsMutation,
  dropPlayer as dropPlayerMutation,
  reportMatchResult as reportMatchResultMutation,
  // Tournament flow
  startTournamentEnhanced as startTournamentEnhancedMutation,
  advanceToTopCut as advanceToTopCutMutation,
  generateEliminationPairings as generateEliminationPairingsMutation,
  completeTournament as completeTournamentMutation,
  getCurrentUserAlts,
  getUserTeams,
  getUserRegistrationDetails,
  // Phase management mutations
  updatePhase as updatePhaseMutation,
  createPhase as createPhaseMutation,
  deletePhase as deletePhaseMutation,
  saveTournamentPhases,
  // Queries (for prepareRound preview)
  getPhaseRoundsWithStats,
  getRoundMatchesWithStats,
  getDiscordServerByCommunityId,
} from "@trainers/supabase";
import type { Enums } from "@trainers/supabase";
import {
  type ActionResult,
  type DropCategory,
  dropCategorySchema,
  dropNotesSchema,
} from "@trainers/validators";
import { getErrorMessage } from "@trainers/utils";

import { createClient } from "@/lib/supabase/server";
import {
  invalidateTournamentCaches,
  invalidateTournamentListCaches,
  invalidateTournamentAndCommunityCaches,
  invalidateTournamentWithTeamCaches,
  invalidatePlayerRankingCaches,
  invalidateDashboardCaches,
  invalidateCommunityPageCaches,
} from "@/lib/cache-invalidation";
import { rejectBots } from "./utils";
import {
  enqueueCommunityChannelNotification,
  enqueueCommunityDms,
  enqueueCommunityRoleSync,
} from "@/lib/discord/enqueue-helpers";

type TournamentFormat = Enums<"tournament_format">;
type TournamentStatus = Enums<"tournament_status">;

// =============================================================================
// Discord fire-and-forget helper
// =============================================================================

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Run a Discord notification callback as fire-and-forget.
 * Fetches the tournament row, passes it to the callback, and swallows errors
 * so the primary server action is never affected.
 */
function fireAndForgetDiscord(
  supabase: SupabaseClient,
  tournamentId: number,
  source: string,
  callback: (tournament: {
    id: number;
    name: string;
    slug: string;
    community_id: number;
    start_date: string | null;
  }) => Promise<void>
): void {
  void (async () => {
    try {
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("id, name, slug, community_id, start_date")
        .eq("id", tournamentId)
        .single();
      if (!tournament) return;
      await callback(tournament);
    } catch (discordErr) {
      console.error(`[${source}] Discord enqueue failed`, {
        tournamentId,
        error: String(discordErr),
      });
    }
  })();
}

// =============================================================================
// Tournament CRUD
// =============================================================================

/**
 * Create a new tournament
 * Revalidates: tournaments list (after publication)
 */
export async function createTournament(data: {
  communityId: number;
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
}): Promise<ActionResult<{ id: number; slug: string }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await createTournamentMutation(supabase, data);
    // Note: Don't revalidate list yet - tournament is created as draft

    // Fire-and-forget: notify Discord that a tournament was created (draft)
    void enqueueCommunityChannelNotification(
      supabase,
      data.communityId,
      "tournament_created",
      `tournament_created:${result.id}`,
      {
        tournament_id: result.id,
        tournament_name: data.name,
        tournament_slug: result.slug,
        start_date: data.startDate ?? null,
      }
    );

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
    startDate?: string | null;
    endDate?: string | null;
    maxParticipants?: number | null;
    status?: TournamentStatus;
    game?: string;
    gameFormat?: string;
    platform?: string;
    battleFormat?: string;
    registrationType?: string;
    checkInRequired?: boolean;
    allowLateRegistration?: boolean;
    lateCheckInMaxRound?: number | null;
  }
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    await updateTournamentMutation(supabase, tournamentId, updates);

    // Settings edits surface on the public tournament page and the community
    // list, so invalidate both.
    await invalidateTournamentAndCommunityCaches(supabase, tournamentId);

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
    await rejectBots();
    const supabase = await createClient();
    await updateTournamentMutation(supabase, tournamentId, {
      status: "upcoming",
    });

    await invalidateTournamentAndCommunityCaches(supabase, tournamentId);

    fireAndForgetDiscord(supabase, tournamentId, "publishTournament", (t) =>
      enqueueCommunityChannelNotification(
        supabase,
        t.community_id,
        "registration_opens",
        `registration_opens:${tournamentId}`,
        {
          tournament_id: t.id,
          tournament_name: t.name,
          tournament_slug: t.slug,
          start_date: t.start_date,
          registration_url: `/tournaments/${t.slug}`,
        }
      )
    );

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to publish tournament"),
    };
  }
}

/**
 * Start a tournament: lock teams, activate first phase, create Round 1.
 * Revalidates: tournaments list
 */
export async function startTournament(
  tournamentId: number
): Promise<
  ActionResult<{ teamsLocked: number; phaseActivated: number | null }>
> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await startTournamentEnhancedMutation(
      supabase,
      tournamentId
    );

    await invalidateTournamentAndCommunityCaches(supabase, tournamentId);

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to start tournament"),
    };
  }
}

/**
 * Complete a tournament: finalize standings, mark completed.
 * Revalidates: tournaments list
 */
export async function completeTournament(
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    await completeTournamentMutation(supabase, tournamentId);

    await invalidateTournamentAndCommunityCaches(supabase, tournamentId);
    invalidatePlayerRankingCaches();
    invalidateDashboardCaches();

    fireAndForgetDiscord(
      supabase,
      tournamentId,
      "completeTournament",
      async (t) => {
        // Resolve the server once — passed to each helper to avoid redundant lookups
        const server = await getDiscordServerByCommunityId(
          supabase,
          t.community_id
        );
        if (!server) return;

        // Channel notification + winner role sync in parallel
        const channelPromise = enqueueCommunityChannelNotification(
          supabase,
          t.community_id,
          "tournament_ended",
          `tournament_ended:${tournamentId}`,
          {
            tournament_id: t.id,
            tournament_name: t.name,
            tournament_slug: t.slug,
          },
          { server }
        );

        const winnerPromise = (async () => {
          const { data: winnerRows, error: winnerErr } = await supabase
            .from("tournament_standings")
            .select("alts(user_id)")
            .eq("tournament_id", tournamentId)
            .eq("rank", 1);

          if (winnerErr) {
            console.error("[completeTournament] Failed to fetch winner rows", {
              tournamentId,
              error: String(winnerErr),
            });
          }

          const winnerUserIds = (winnerRows ?? [])
            .map((row) => (row.alts as { user_id: string } | null)?.user_id)
            .filter((id): id is string => Boolean(id));

          if (winnerUserIds.length > 0) {
            await enqueueCommunityRoleSync(
              supabase,
              t.community_id,
              winnerUserIds,
              "winner",
              "add",
              `tournament_ended:${tournamentId}`,
              { server }
            );
          }
        })();

        await Promise.all([channelPromise, winnerPromise]);
      }
    );

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to complete tournament"),
    };
  }
}

/**
 * Advance tournament from Swiss to Top Cut elimination phase.
 * Revalidates: tournament
 */
export async function advanceToTopCut(tournamentId: number): Promise<
  ActionResult<{
    qualifiers: number;
    matchesCreated: number;
    phaseId: number;
    roundId: number;
  }>
> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await advanceToTopCutMutation(supabase, tournamentId);

    invalidateTournamentCaches(tournamentId);

    return {
      success: true,
      data: {
        qualifiers: result.qualifiers,
        matchesCreated: result.matches_created,
        phaseId: result.phase_id,
        roundId: result.round_id,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to advance to top cut"),
    };
  }
}

/**
 * Generate elimination pairings for subsequent rounds (winners advance).
 * Revalidates: tournament
 */
export async function generateEliminationPairings(
  roundId: number,
  tournamentId: number
): Promise<ActionResult<{ matchesCreated: number; winnersAdvanced: number }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await generateEliminationPairingsMutation(supabase, roundId);

    invalidateTournamentCaches(tournamentId);

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to generate elimination pairings"),
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
    await rejectBots();
    const supabase = await createClient();
    await archiveTournamentMutation(supabase, tournamentId);

    await invalidateTournamentAndCommunityCaches(supabase, tournamentId);

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
    await rejectBots();
    const supabase = await createClient();
    // Resolve community + bust caches AFTER the delete succeeds — invalidating
    // first would evict cache tags even when the mutation throws (RLS, FK,
    // status≠draft), forcing every subsequent read to repopulate stale data.
    // We capture the community link before the row is gone so the post-delete
    // invalidation can still reach the community page.
    const { data: link } = await supabase
      .from("tournaments")
      .select("communities!tournaments_community_id_fkey(slug, id)")
      .eq("id", tournamentId)
      .single();

    await deleteTournamentMutation(supabase, tournamentId);

    invalidateTournamentListCaches(tournamentId);
    if (link?.communities && "slug" in link.communities) {
      const community = link.communities as { slug: string; id: number };
      invalidateCommunityPageCaches(community.slug, community.id);
    }
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

    invalidateTournamentListCaches(tournamentId);

    fireAndForgetDiscord(
      supabase,
      tournamentId,
      "registerForTournament",
      async (t) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await enqueueCommunityRoleSync(
          supabase,
          t.community_id,
          [user.id],
          "member",
          "add",
          `tournament_registration:${result.registrationId}`
        );
      }
    );

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
 * Private helper — fire-and-forget removal of the Discord "member" role when a
 * user has no remaining active registrations in the tournament's community.
 */
function maybeDemoteMemberRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: number,
  sourceEvent: string
): void {
  void (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tournament } = await supabase
        .from("tournaments")
        .select("community_id")
        .eq("id", tournamentId)
        .single();
      if (!tournament) return;

      // Count remaining non-dropped registrations for this user in this community
      const { count } = await supabase
        .from("tournament_registrations")
        .select("id, alts!inner(user_id), tournaments!inner(community_id)", {
          count: "exact",
          head: true,
        })
        .eq("alts.user_id", user.id)
        .eq("tournaments.community_id", tournament.community_id)
        .is("dropped_at", null);

      if (count === 0) {
        await enqueueCommunityRoleSync(
          supabase,
          tournament.community_id,
          [user.id],
          "member",
          "remove",
          sourceEvent
        );
      }
    } catch (discordErr) {
      console.error(
        "[maybeDemoteMemberRole] Discord member role remove sync failed",
        { tournamentId, sourceEvent, error: String(discordErr) }
      );
    }
  })();
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
    await rejectBots();
    const supabase = await createClient();
    await cancelRegistrationMutation(supabase, registrationId);

    invalidateTournamentListCaches(tournamentId);

    maybeDemoteMemberRole(
      supabase,
      tournamentId,
      `tournament_registration_cancel:${registrationId}`
    );

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
    await rejectBots();
    const supabase = await createClient();
    await checkInMutation(supabase, tournamentId);
    invalidateTournamentCaches(tournamentId);
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
    await rejectBots();
    const supabase = await createClient();
    await undoCheckInMutation(supabase, tournamentId);
    invalidateTournamentCaches(tournamentId);
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
    await rejectBots();
    const supabase = await createClient();
    await withdrawFromTournamentMutation(supabase, tournamentId);
    invalidateTournamentListCaches(tournamentId);

    maybeDemoteMemberRole(
      supabase,
      tournamentId,
      `tournament_withdraw:${tournamentId}`
    );

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
    await rejectBots();
    const supabase = await createClient();
    const result = await updateRegistrationPreferencesMutation(
      supabase,
      tournamentId,
      data
    );
    invalidateTournamentCaches(tournamentId);
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
): Promise<
  ActionResult<{
    teamId: number;
    pokemonCount: number;
    teamName: string;
    species: string[];
  }>
> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await submitTeamMutation(supabase, tournamentId, rawText);

    if (!result.success) {
      return {
        success: false,
        error: "Team validation failed",
        validationErrors: result.errors,
      };
    }

    invalidateTournamentWithTeamCaches(tournamentId);

    return {
      success: true,
      data: {
        teamId: result.teamId,
        pokemonCount: result.pokemonCount,
        teamName: result.teamName,
        species: result.species,
      },
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
): Promise<
  ActionResult<{
    teamId: number;
    pokemonCount: number;
    teamName: string;
    species: string[];
  }>
> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await selectTeamForTournamentMutation(
      supabase,
      tournamentId,
      teamId
    );

    if (!result.success) {
      return {
        success: false,
        error: "Team validation failed",
        validationErrors: result.errors,
      };
    }

    invalidateTournamentWithTeamCaches(tournamentId);

    return {
      success: true,
      data: {
        teamId: result.teamId,
        pokemonCount: result.pokemonCount,
        teamName: result.teamName,
        species: result.species,
      },
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
        display_name: a.username,
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
    await rejectBots();
    const supabase = await createClient();
    const result = await createRoundMutation(supabase, phaseId, roundNumber);
    invalidateTournamentCaches(tournamentId);
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
    await rejectBots();
    const supabase = await createClient();
    const result = await generateRoundPairingsMutation(supabase, roundId);
    invalidateTournamentCaches(tournamentId);

    // Fire-and-forget: DM both players in each newly created match
    fireAndForgetDiscord(
      supabase,
      tournamentId,
      "generatePairings",
      async (t) => {
        const { data: matches, error: matchesErr } = await supabase
          .from("tournament_matches")
          .select(
            "id, alt1_id, alt2_id, is_bye, alt1:alts!tournament_matches_alt1_id_fkey(user_id, username), alt2:alts!tournament_matches_alt2_id_fkey(user_id, username)"
          )
          .eq("round_id", roundId)
          .eq("is_bye", false);

        if (matchesErr) {
          console.error("[generatePairings] Failed to fetch matches", {
            roundId,
            error: String(matchesErr),
          });
          return;
        }
        if (!matches || matches.length === 0) return;

        // Collect all player user IDs across matches, then batch-enqueue DMs
        // so enqueueCommunityDms resolves server + DM settings once instead of per match.
        const allPlayerUserIds: string[] = [];
        const perMatchPayloads: Array<{
          matchId: number;
          playerUserIds: string[];
          payload: Record<string, unknown>;
        }> = [];

        for (const match of matches) {
          const alt1 = match.alt1 as {
            user_id: string;
            username: string;
          } | null;
          const alt2 = match.alt2 as {
            user_id: string;
            username: string;
          } | null;
          if (!alt1 || !alt2) {
            // Guard against unexpected select shape — log so skips are visible
            console.warn(
              "[generatePairings] Match missing alt relation shape",
              {
                matchId: match.id,
                hasAlt1: Boolean(alt1),
                hasAlt2: Boolean(alt2),
              }
            );
            continue;
          }

          const playerUserIds = [alt1.user_id, alt2.user_id];
          allPlayerUserIds.push(...playerUserIds);
          perMatchPayloads.push({
            matchId: match.id,
            playerUserIds,
            payload: {
              tournament_id: t.id,
              tournament_name: t.name,
              tournament_slug: t.slug,
              opponent_name_for: {
                [alt1.user_id]: alt2.username,
                [alt2.user_id]: alt1.username,
              },
            },
          });
        }

        // Enqueue all match DMs concurrently
        await Promise.all(
          perMatchPayloads.map((m) =>
            enqueueCommunityDms(
              supabase,
              t.community_id,
              m.playerUserIds,
              "match_ready",
              `match_ready:${m.matchId}`,
              { match_id: m.matchId, ...m.payload }
            )
          )
        );
      }
    );

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
    await rejectBots();
    const supabase = await createClient();
    await startRoundMutation(supabase, roundId);
    invalidateTournamentCaches(tournamentId);
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
    await rejectBots();
    const supabase = await createClient();
    await completeRoundMutation(supabase, roundId);
    invalidateTournamentCaches(tournamentId);
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
    await rejectBots();
    const supabase = await createClient();
    const result = await recalculateStandingsMutation(supabase, tournamentId);
    invalidateTournamentCaches(tournamentId);
    return { success: true, data: { playersUpdated: result.playersUpdated } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to recalculate standings"),
    };
  }
}

/**
 * Drop a player from the tournament (TO action — requires alt ID)
 */
export async function dropPlayer(
  tournamentId: number,
  altId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    await dropPlayerMutation(supabase, tournamentId, altId);
    invalidateTournamentCaches(tournamentId);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to drop player"),
    };
  }
}

/**
 * Drop yourself from the tournament (player self-service).
 * Finds the caller's registered alt for this specific tournament — avoids
 * silently dropping the wrong alt when the user has multiple alts.
 */
export async function dropFromTournament(
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    // Get all alts for the current user
    const alts = await getCurrentUserAlts(supabase);
    if (!alts.length) {
      return { success: false, error: "No player profile found" };
    }

    const altIds = alts.map((a) => a.id);

    // Find which alt (if any) is registered for this tournament
    const { data: registration, error: regErr } = await supabase
      .from("tournament_registrations")
      .select("alt_id")
      .eq("tournament_id", tournamentId)
      .in("alt_id", altIds)
      .not("status", "eq", "dropped")
      .maybeSingle();

    if (regErr) throw regErr;

    if (!registration) {
      return {
        success: false,
        error: "You are not registered for this tournament.",
      };
    }

    await dropPlayerMutation(supabase, tournamentId, registration.alt_id);
    invalidateTournamentCaches(tournamentId);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to drop from tournament"),
    };
  }
}

// =============================================================================
// Tournament Organizer Registration Actions
// =============================================================================

/**
 * Force check-in a player (tournament organizer action)
 */
export async function forceCheckInPlayer(
  registrationId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await updateRegistrationStatusMutation(
      supabase,
      registrationId,
      "checked_in"
    );
    invalidateTournamentCaches(result.tournamentId);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to force check-in player"),
    };
  }
}

/**
 * Remove a player from tournament (tournament organizer action)
 */
export async function removePlayerFromTournament(
  registrationId: number,
  dropCategory: DropCategory,
  dropNotes?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();

    // Runtime validation
    dropCategorySchema.parse(dropCategory);
    dropNotesSchema.parse(dropNotes);

    const supabase = await createClient();
    const result = await updateRegistrationStatusMutation(
      supabase,
      registrationId,
      "dropped",
      { dropCategory, dropNotes }
    );
    invalidateTournamentCaches(result.tournamentId);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove player"),
    };
  }
}

/**
 * Bulk force check-in multiple players (tournament organizer action)
 */
export async function bulkForceCheckIn(
  registrationIds: number[]
): Promise<ActionResult<{ checkedIn: number; failed: number }>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    // Short-circuit if nothing to update
    if (!registrationIds.length) {
      return { success: true, data: { checkedIn: 0, failed: 0 } };
    }

    // Get registrations to verify they all belong to the same tournament
    const { data: registrations, error: regsErr } = await supabase
      .from("tournament_registrations")
      .select("id, tournament_id")
      .in("id", registrationIds);

    if (regsErr) throw regsErr;

    if (!registrations || registrations.length === 0) {
      throw new Error("No registrations found");
    }

    // Get unique tournament IDs
    const tournamentIds = [
      ...new Set(registrations.map((r) => r.tournament_id)),
    ];
    if (tournamentIds.length === 0) {
      throw new Error("No tournament IDs found in registrations");
    }
    if (tournamentIds.length !== 1) {
      throw new Error(
        "Cannot bulk update registrations from multiple tournaments"
      );
    }

    const tournamentId = tournamentIds[0]!;

    // Perform single bulk update
    const { data, error } = await supabase
      .from("tournament_registrations")
      .update({ status: "checked_in" })
      .in("id", registrationIds)
      .eq("tournament_id", tournamentId)
      .select("id");

    if (error) throw error;

    const checkedIn = data?.length ?? 0;
    const failed = registrationIds.length - checkedIn;

    // Invalidate cache
    invalidateTournamentCaches(tournamentId);

    return { success: true, data: { checkedIn, failed } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to bulk check-in players"),
    };
  }
}

/**
 * Bulk remove multiple players (tournament organizer action)
 */
export async function bulkRemovePlayers(
  registrationIds: number[],
  dropCategory: DropCategory,
  dropNotes?: string
): Promise<ActionResult<{ removed: number; failed: number }>> {
  try {
    await rejectBots();

    // Runtime validation
    dropCategorySchema.parse(dropCategory);
    dropNotesSchema.parse(dropNotes);

    const supabase = await createClient();

    // Short-circuit if nothing to update
    if (!registrationIds.length) {
      return { success: true, data: { removed: 0, failed: 0 } };
    }

    // Get registrations to verify they all belong to the same tournament
    const { data: registrations, error: regsErr } = await supabase
      .from("tournament_registrations")
      .select("id, tournament_id")
      .in("id", registrationIds);

    if (regsErr) throw regsErr;

    if (!registrations || registrations.length === 0) {
      throw new Error("No registrations found");
    }

    // Get unique tournament IDs
    const tournamentIds = [
      ...new Set(registrations.map((r) => r.tournament_id)),
    ];
    if (tournamentIds.length === 0) {
      throw new Error("No tournament IDs found in registrations");
    }
    if (tournamentIds.length !== 1) {
      throw new Error(
        "Cannot bulk update registrations from multiple tournaments"
      );
    }

    const tournamentId = tournamentIds[0]!;

    // Verify the caller is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Not authenticated");
    }

    // Verify the caller has permission to manage this tournament
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("community_id")
      .eq("id", tournamentId)
      .single();
    if (!tournament) throw new Error("Tournament not found");

    const { data: hasPermission } = await supabase.rpc(
      "has_community_permission",
      {
        p_community_id: tournament.community_id,
        permission_key: "tournament.manage",
      }
    );
    if (!hasPermission) {
      throw new Error("You don't have permission to manage this tournament");
    }

    // Perform single bulk update
    const { data, error } = await supabase
      .from("tournament_registrations")
      .update({
        status: "dropped" as const,
        drop_category: dropCategory,
        drop_notes: dropNotes ?? null,
        dropped_by: user.id,
        dropped_at: new Date().toISOString(),
      })
      .in("id", registrationIds)
      .eq("tournament_id", tournamentId)
      .select("id");

    if (error) throw error;

    const removed = data?.length ?? 0;
    const failed = registrationIds.length - removed;

    // Invalidate cache
    invalidateTournamentCaches(tournamentId);

    return { success: true, data: { removed, failed } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to bulk remove players"),
    };
  }
}

// =============================================================================
// Match Management
// =============================================================================

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
    await rejectBots();
    const supabase = await createClient();
    await reportMatchResultMutation(
      supabase,
      matchId,
      winnerAltId,
      player1GamesWon,
      player2GamesWon
    );
    invalidateTournamentCaches(tournamentId);

    fireAndForgetDiscord(
      supabase,
      tournamentId,
      "reportMatchResult",
      async (t) => {
        // Resolve the server once — passed to each helper to avoid redundant lookups
        const server = await getDiscordServerByCommunityId(
          supabase,
          t.community_id
        );
        if (!server) return;

        const { data: match, error: matchErr } = await supabase
          .from("tournament_matches")
          .select(
            "id, alt1_id, alt2_id, alt1:alts!tournament_matches_alt1_id_fkey(user_id, username), alt2:alts!tournament_matches_alt2_id_fkey(user_id, username)"
          )
          .eq("id", matchId)
          .single();

        if (matchErr) {
          console.error("[reportMatchResult] Failed to fetch match", {
            matchId,
            error: String(matchErr),
          });
          return;
        }
        if (!match) return;

        const alt1 = match.alt1 as { user_id: string; username: string } | null;
        const alt2 = match.alt2 as { user_id: string; username: string } | null;

        const winnerUsername =
          match.alt1_id === winnerAltId
            ? (alt1?.username ?? "Unknown")
            : (alt2?.username ?? "Unknown");

        const resultPayload = {
          match_id: matchId,
          tournament_id: t.id,
          tournament_name: t.name,
          tournament_slug: t.slug,
          winner_alt_id: winnerAltId,
          winner_username: winnerUsername,
          score: `${player1GamesWon}-${player2GamesWon}`,
        };

        // Channel notification + DM confirmation in parallel
        const channelPromise = enqueueCommunityChannelNotification(
          supabase,
          t.community_id,
          "match_result_reported",
          `match_result_reported:${matchId}`,
          resultPayload,
          { server }
        );

        const playerUserIds = [alt1?.user_id, alt2?.user_id].filter(
          (id): id is string => Boolean(id)
        );

        const dmPromise =
          playerUserIds.length > 0
            ? enqueueCommunityDms(
                supabase,
                t.community_id,
                playerUserIds,
                "match_result_to_confirm",
                `match_result_to_confirm:${matchId}`,
                resultPayload,
                { server }
              )
            : Promise.resolve();

        await Promise.all([channelPromise, dmPromise]);
      }
    );

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to report match result"),
    };
  }
}

// =============================================================================
// Round Lifecycle Actions (Overview Command Center)
// =============================================================================

/**
 * Prepare a round: create it, generate pairings, and return preview data.
 * Does NOT start the round — the TO reviews the preview first.
 */
export async function prepareRound(
  tournamentId: number,
  phaseId: number
): Promise<
  ActionResult<{
    roundId: number;
    roundNumber: number;
    matchesCreated: number;
    byePlayer: string | null;
    matches: Array<{
      tableNumber: number | null;
      player1Name: string;
      player2Name: string | null;
    }>;
  }>
> {
  try {
    await rejectBots();
    const supabase = await createClient();

    // Look up the phase type to determine which pairing algorithm to use
    const { data: phaseData, error: phaseErr } = await supabase
      .from("tournament_phases")
      .select("phase_type")
      .eq("id", phaseId)
      .single();

    if (phaseErr) throw phaseErr;

    const isElimination = phaseData?.phase_type === "single_elimination";

    // Determine next round number from existing rounds in phase
    const existingRounds = await getPhaseRoundsWithStats(supabase, phaseId);
    const nextRoundNumber = existingRounds.length + 1;

    // Create the round
    const createResult = await createRoundMutation(
      supabase,
      phaseId,
      nextRoundNumber
    );
    const roundId = createResult.round.id;

    // Generate pairings — use elimination pairings for elimination phases
    const pairingsResult = isElimination
      ? await generateEliminationPairingsMutation(supabase, roundId)
      : await generateRoundPairingsMutation(supabase, roundId);

    // Fetch the generated matches with player names for preview
    const matchesWithStats = await getRoundMatchesWithStats(
      supabase,
      roundId,
      tournamentId
    );

    // Build preview data
    let byePlayer: string | null = null;
    const matches = matchesWithStats.map((match) => {
      const p1 = match.player1 as {
        display_name?: string;
        username?: string;
      } | null;
      const p2 = match.player2 as {
        display_name?: string;
        username?: string;
      } | null;

      const isBye = !match.alt2_id;
      if (isBye && p1) {
        byePlayer = p1.username ?? "Unknown";
      }

      return {
        tableNumber: match.table_number,
        player1Name: p1?.username ?? "Unknown",
        player2Name: isBye ? null : (p2?.username ?? "Unknown"),
      };
    });

    invalidateTournamentCaches(tournamentId);

    return {
      success: true,
      data: {
        roundId,
        roundNumber: nextRoundNumber,
        matchesCreated: pairingsResult.matchesCreated,
        byePlayer,
        matches,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to prepare round"),
    };
  }
}

/**
 * Confirm and start a prepared round.
 * Called after the TO reviews the pairings preview.
 */
export async function confirmAndStartRound(
  roundId: number,
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    await startRoundMutation(supabase, roundId);
    invalidateTournamentCaches(tournamentId);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to start round"),
    };
  }
}

/**
 * Cancel a prepared round: delete the pending round and its matches.
 * Called when the TO rejects the pairings preview.
 */
export async function cancelPreparedRound(
  roundId: number,
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    await deleteRoundAndMatchesMutation(supabase, roundId);
    invalidateTournamentCaches(tournamentId);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to cancel round"),
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
    await rejectBots();
    const supabase = await createClient();
    await updatePhaseMutation(supabase, phaseId, updates);
    invalidateTournamentCaches(tournamentId);
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
    await rejectBots();
    const supabase = await createClient();
    const result = await createPhaseMutation(supabase, tournamentId, phase);
    invalidateTournamentCaches(tournamentId);
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
    await rejectBots();
    const supabase = await createClient();
    await deletePhaseMutation(supabase, phaseId);
    invalidateTournamentCaches(tournamentId);
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
    await rejectBots();
    const supabase = await createClient();
    const result = await saveTournamentPhases(supabase, tournamentId, phases);
    invalidateTournamentCaches(tournamentId);
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
