import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";
import { getInvitationExpiryDate } from "../constants";

type TypedClient = SupabaseClient<Database>;
type TournamentFormat = Database["public"]["Enums"]["tournament_format"];
type TournamentStatus = Database["public"]["Enums"]["tournament_status"];

/**
 * Helper to get current alt
 */
async function getCurrentAlt(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: alt } = await supabase
    .from("alts")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return alt;
}

/**
 * Create a new tournament
 */
export async function createTournament(
  supabase: TypedClient,
  data: {
    organizationId: number;
    name: string;
    slug: string;
    format?: string;
    startDate?: string;
    endDate?: string;
    maxParticipants?: number;
    topCutSize?: number;
    swissRounds?: number;
    tournamentFormat?: TournamentFormat;
    roundTimeMinutes?: number;
  }
) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Verify organization exists and user has permission
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_alt_id")
    .eq("id", data.organizationId)
    .single();

  if (!org) throw new Error("Organization not found");

  // TODO: Check TOURNAMENT_CREATE permission through RBAC
  // For now, only org owner can create tournaments
  if (org.owner_alt_id !== profile.id) {
    throw new Error("You don't have permission to create tournaments");
  }

  // Check slug uniqueness within organization
  const { data: existing } = await supabase
    .from("tournaments")
    .select("id")
    .eq("organization_id", data.organizationId)
    .eq("slug", data.slug.toLowerCase())
    .single();

  if (existing) {
    throw new Error("Tournament slug already exists in this organization");
  }

  // Create tournament
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .insert({
      organization_id: data.organizationId,
      name: data.name,
      slug: data.slug.toLowerCase(),
      format: data.format,
      status: "draft",
      start_date: data.startDate,
      end_date: data.endDate,
      max_participants: data.maxParticipants,
      top_cut_size: data.topCutSize,
      swiss_rounds: data.swissRounds,
      tournament_format: data.tournamentFormat,
      round_time_minutes: data.roundTimeMinutes ?? 50,
      rental_team_photos_enabled: true,
      rental_team_photos_required: false,
      current_round: 0,
    })
    .select()
    .single();

  if (error) throw error;

  // Create default Swiss phase if applicable
  if (
    data.tournamentFormat === "swiss_with_cut" ||
    data.tournamentFormat === "swiss_only"
  ) {
    await supabase.from("tournament_phases").insert({
      tournament_id: tournament.id,
      name: "Swiss Rounds",
      phase_order: 1,
      phase_type: "swiss",
      status: "pending",
      match_format: "best_of_3",
      round_time_minutes: data.roundTimeMinutes,
      planned_rounds: data.swissRounds,
      current_round: 0,
    });
  }

  return { id: tournament.id, slug: tournament.slug };
}

/**
 * Update tournament details
 */
export async function updateTournament(
  supabase: TypedClient,
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
  const profile = await getCurrentAlt(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Get tournament and org
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("organization_id")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");

  // Verify permission
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_alt_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_alt_id !== profile.id) {
    throw new Error("You don't have permission to update this tournament");
  }

  const updateData: Database["public"]["Tables"]["tournaments"]["Update"] = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.format !== undefined) updateData.format = updates.format;
  if (updates.startDate !== undefined)
    updateData.start_date = updates.startDate;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
  if (updates.maxParticipants !== undefined)
    updateData.max_participants = updates.maxParticipants;
  if (updates.status !== undefined) updateData.status = updates.status;

  const { error } = await supabase
    .from("tournaments")
    .update(updateData)
    .eq("id", tournamentId);

  if (error) throw error;
  return { success: true };
}

/**
 * Register for a tournament
 */
export async function registerForTournament(
  supabase: TypedClient,
  tournamentId: number,
  data?: {
    teamName?: string;
    notes?: string;
  }
) {
  const alt = await getCurrentAlt(supabase);
  if (!alt) throw new Error("Not authenticated");

  // Check if already registered
  const { data: existing } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", alt.id)
    .single();

  if (existing) {
    throw new Error("Already registered for this tournament");
  }

  // Check tournament status
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status, max_participants")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status !== "upcoming") {
    throw new Error("Tournament is not open for registration");
  }

  // Check max participants and determine registration status
  let registrationStatus: "registered" | "waitlist" = "registered";
  if (tournament.max_participants) {
    const { count } = await supabase
      .from("tournament_registrations")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("status", "registered");

    if ((count ?? 0) >= tournament.max_participants) {
      // Tournament is full, add to waitlist instead of rejecting
      registrationStatus = "waitlist";
    }
  }

  // Create registration
  const { data: registration, error } = await supabase
    .from("tournament_registrations")
    .insert({
      tournament_id: tournamentId,
      alt_id: alt.id,
      status: registrationStatus,
      registered_at: new Date().toISOString(),
      team_name: data?.teamName,
      notes: data?.notes,
      rental_team_photo_verified: false,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    success: true,
    registrationId: registration.id,
    status: registrationStatus,
  };
}

/**
 * Cancel tournament registration
 */
export async function cancelRegistration(
  supabase: TypedClient,
  registrationId: number
) {
  const alt = await getCurrentAlt(supabase);
  if (!alt) throw new Error("Not authenticated");

  // Verify ownership
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("alt_id, tournament_id")
    .eq("id", registrationId)
    .single();

  if (!registration) throw new Error("Registration not found");
  if (registration.alt_id !== alt.id) {
    throw new Error("You can only cancel your own registration");
  }

  // Check tournament status
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", registration.tournament_id)
    .single();

  if (tournament?.status === "active") {
    throw new Error("Cannot cancel registration after tournament has started");
  }

  const { error } = await supabase
    .from("tournament_registrations")
    .delete()
    .eq("id", registrationId);

  if (error) throw error;
  return { success: true };
}

/**
 * Archive a tournament
 */
export async function archiveTournament(
  supabase: TypedClient,
  tournamentId: number
) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Get tournament
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("organization_id")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");

  // Verify permission
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_alt_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_alt_id !== profile.id) {
    throw new Error("You don't have permission to archive this tournament");
  }

  const { error } = await supabase
    .from("tournaments")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", tournamentId);

  if (error) throw error;
  return { success: true };
}

/**
 * Update registration status (for tournament organizers)
 */
export async function updateRegistrationStatus(
  supabase: TypedClient,
  registrationId: number,
  status: Database["public"]["Enums"]["registration_status"]
) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Get registration and tournament
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("tournament_id")
    .eq("id", registrationId)
    .single();

  if (!registration) throw new Error("Registration not found");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("organization_id")
    .eq("id", registration.tournament_id)
    .single();

  if (!tournament) throw new Error("Tournament not found");

  // Verify permission
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_alt_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_alt_id !== profile.id) {
    throw new Error("You don't have permission to update registrations");
  }

  const { error } = await supabase
    .from("tournament_registrations")
    .update({ status })
    .eq("id", registrationId);

  if (error) throw error;
  return { success: true };
}

/**
 * Check in to a tournament
 */
export async function checkIn(supabase: TypedClient, tournamentId: number) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Find the user's registration
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, status")
    .eq("tournament_id", tournamentId)
    .eq("profile_id", profile.id)
    .single();

  if (!registration) throw new Error("Registration not found");

  // Validate current status allows check-in
  if (
    registration.status !== "registered" &&
    registration.status !== "confirmed"
  ) {
    throw new Error(
      `Cannot check in from status "${registration.status}". Must be "registered" or "confirmed".`
    );
  }

  // Check tournament allows check-in (should be upcoming or active)
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status !== "upcoming" && tournament.status !== "active") {
    throw new Error("Tournament is not open for check-in");
  }

  const { error } = await supabase
    .from("tournament_registrations")
    .update({ status: "checked_in" })
    .eq("id", registration.id);

  if (error) throw error;
  return { success: true };
}

/**
 * Undo check-in for a tournament
 */
export async function undoCheckIn(supabase: TypedClient, tournamentId: number) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Find the user's registration
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, status")
    .eq("tournament_id", tournamentId)
    .eq("profile_id", profile.id)
    .single();

  if (!registration) throw new Error("Registration not found");

  if (registration.status !== "checked_in") {
    throw new Error("You are not currently checked in");
  }

  // Check tournament status - can only undo before tournament starts
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status === "active") {
    throw new Error("Cannot undo check-in after tournament has started");
  }

  const { error } = await supabase
    .from("tournament_registrations")
    .update({ status: "registered" })
    .eq("id", registration.id);

  if (error) throw error;
  return { success: true };
}

/**
 * Start a match (set status to active)
 */
export async function startMatch(supabase: TypedClient, matchId: number) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Get match with round and phase info to verify tournament ownership
  const { data: match } = await supabase
    .from("tournament_matches")
    .select(
      `
      id,
      status,
      alt1_id,
      alt2_id,
      round_id,
      tournament_rounds!inner (
        phase_id,
        tournament_phases!inner (
          tournament_id,
          tournaments!inner (
            organization_id,
            organizations!inner (
              owner_alt_id
            )
          )
        )
      )
    `
    )
    .eq("id", matchId)
    .single();

  if (!match) throw new Error("Match not found");

  // Check permission - must be tournament organizer or a player in the match
  const rounds = match.tournament_rounds as unknown as {
    phase_id: number;
    tournament_phases: {
      tournament_id: number;
      tournaments: {
        organization_id: number;
        organizations: {
          owner_alt_id: number;
        };
      };
    };
  };

  const isOrganizer =
    rounds.tournament_phases.tournaments.organizations.owner_alt_id ===
    profile.id;
  const isPlayer = match.alt1_id === profile.id || match.alt2_id === profile.id;

  if (!isOrganizer && !isPlayer) {
    throw new Error("You don't have permission to start this match");
  }

  if (match.status !== "pending") {
    throw new Error(`Cannot start match with status "${match.status}"`);
  }

  const { error } = await supabase
    .from("tournament_matches")
    .update({
      status: "active",
      start_time: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (error) throw error;
  return { success: true };
}

/**
 * Report match result
 */
export async function reportMatchResult(
  supabase: TypedClient,
  matchId: number,
  winnerId: number,
  player1Score: number,
  player2Score: number
) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Get match with tournament info
  const { data: match } = await supabase
    .from("tournament_matches")
    .select(
      `
      id,
      status,
      alt1_id,
      alt2_id,
      round_id,
      tournament_rounds!inner (
        phase_id,
        tournament_phases!inner (
          tournament_id,
          tournaments!inner (
            organization_id,
            organizations!inner (
              owner_alt_id
            )
          )
        )
      )
    `
    )
    .eq("id", matchId)
    .single();

  if (!match) throw new Error("Match not found");

  // Check permission - must be tournament organizer or a player in the match
  const rounds = match.tournament_rounds as unknown as {
    phase_id: number;
    tournament_phases: {
      tournament_id: number;
      tournaments: {
        organization_id: number;
        organizations: {
          owner_alt_id: number;
        };
      };
    };
  };

  const isOrganizer =
    rounds.tournament_phases.tournaments.organizations.owner_alt_id ===
    profile.id;
  const isPlayer = match.alt1_id === profile.id || match.alt2_id === profile.id;

  if (!isOrganizer && !isPlayer) {
    throw new Error("You don't have permission to report this match result");
  }

  // Validate match is in progress
  if (match.status !== "active" && match.status !== "pending") {
    throw new Error(
      `Cannot report result for match with status "${match.status}"`
    );
  }

  // Validate winner is one of the players
  if (winnerId !== match.alt1_id && winnerId !== match.alt2_id) {
    throw new Error("Winner must be one of the match participants");
  }

  // Validate scores are non-negative
  if (player1Score < 0 || player2Score < 0) {
    throw new Error("Scores cannot be negative");
  }

  const { error } = await supabase
    .from("tournament_matches")
    .update({
      winner_alt_id: winnerId,
      game_wins1: player1Score,
      game_wins2: player2Score,
      status: "completed",
      end_time: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (error) throw error;
  return { success: true };
}

/**
 * Withdraw from a tournament (delete registration)
 */
export async function withdrawFromTournament(
  supabase: TypedClient,
  tournamentId: number
) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Find registration
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, tournament_id")
    .eq("tournament_id", tournamentId)
    .eq("profile_id", profile.id)
    .single();

  if (!registration) throw new Error("Registration not found");

  // Check tournament status
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", registration.tournament_id)
    .single();

  if (tournament?.status === "active") {
    throw new Error("Cannot withdraw after tournament has started");
  }

  const { error } = await supabase
    .from("tournament_registrations")
    .delete()
    .eq("id", registration.id);

  if (error) throw error;
  return { success: true };
}

/**
 * Delete a tournament (draft only)
 */
export async function deleteTournament(
  supabase: TypedClient,
  tournamentId: number
) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Get tournament
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("organization_id, status")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");

  // Verify permission
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_alt_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_alt_id !== profile.id) {
    throw new Error("You don't have permission to delete this tournament");
  }

  if (tournament.status !== "draft") {
    throw new Error("Only draft tournaments can be deleted");
  }

  const { error } = await supabase
    .from("tournaments")
    .delete()
    .eq("id", tournamentId);

  if (error) throw error;
  return { success: true };
}

/**
 * Send tournament invitations to players
 */
export async function sendTournamentInvitations(
  supabase: TypedClient,
  tournamentId: number,
  profileIds: number[],
  message?: string
) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Get tournament and verify permission
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("organization_id")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");

  const { data: org } = await supabase
    .from("organizations")
    .select("owner_alt_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_alt_id !== profile.id) {
    throw new Error("You don't have permission to send invitations");
  }

  // Check for existing invitations
  const { data: existingInvitations } = await supabase
    .from("tournament_invitations")
    .select("invited_alt_id")
    .eq("tournament_id", tournamentId)
    .in("invited_alt_id", profileIds);

  const existingIds = new Set(
    existingInvitations?.map((inv) => inv.invited_alt_id) ?? []
  );
  const newProfileIds = profileIds.filter((id) => !existingIds.has(id));

  if (newProfileIds.length === 0) {
    return {
      invitationsSent: 0,
      alreadyInvited: profileIds.length,
    };
  }

  // Create invitations
  const invitations = newProfileIds.map((profileId) => ({
    tournament_id: tournamentId,
    invited_alt_id: profileId,
    invited_by_alt_id: profile.id,
    status: "pending" as const,
    message: message ?? null,
    invited_at: new Date().toISOString(),
    expires_at: getInvitationExpiryDate(),
  }));

  const { error } = await supabase
    .from("tournament_invitations")
    .insert(invitations);

  if (error) throw error;

  return {
    invitationsSent: newProfileIds.length,
    alreadyInvited: existingIds.size,
  };
}

/**
 * Respond to a tournament invitation
 */
export async function respondToTournamentInvitation(
  supabase: TypedClient,
  invitationId: number,
  response: "accept" | "decline"
) {
  const alt = await getCurrentAlt(supabase);
  if (!alt) throw new Error("Not authenticated");

  // Get invitation
  const { data: invitation } = await supabase
    .from("tournament_invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (!invitation) throw new Error("Invitation not found");

  if (invitation.invited_alt_id !== alt.id) {
    throw new Error("This invitation is not for you");
  }

  if (invitation.status !== "pending") {
    throw new Error("Invitation has already been responded to");
  }

  // Check expiration
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    throw new Error("Invitation has expired");
  }

  // Update invitation
  const { error: updateError } = await supabase
    .from("tournament_invitations")
    .update({
      status: response === "accept" ? "accepted" : "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  if (updateError) throw updateError;

  // If accepted, create registration
  let registrationResult: { message?: string } | null = null;
  if (response === "accept") {
    try {
      const { data: registration, error: regError } = await supabase
        .from("tournament_registrations")
        .insert({
          tournament_id: invitation.tournament_id,
          alt_id: alt.id,
          status: "registered",
          registered_at: new Date().toISOString(),
          rental_team_photo_verified: false,
        })
        .select()
        .single();

      if (regError) throw regError;
      registrationResult = { message: `Registration ID: ${registration.id}` };
    } catch {
      registrationResult = { message: "Registration created from invitation" };
    }
  }

  return {
    success: true,
    registration: registrationResult,
  };
}
