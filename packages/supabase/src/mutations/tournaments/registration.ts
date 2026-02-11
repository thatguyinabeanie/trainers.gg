import { getInvitationExpiryDate } from "../../constants";
import { checkCheckInOpen } from "../../utils/registration";
import type { Database } from "../../types";
import {
  type TypedClient,
  getCurrentUser,
  getCurrentAlt,
  checkOrgPermission,
} from "./helpers";

/**
 * Register for a tournament
 */
export async function registerForTournament(
  supabase: TypedClient,
  tournamentId: number,
  data?: {
    altId?: number;
    teamName?: string;
    inGameName?: string;
    displayNameOption?: string;
    showCountryFlag?: boolean;
  }
) {
  // Call atomic registration RPC - handles all validation and prevents TOCTOU race conditions
  const { data: result, error: rpcError } = await supabase.rpc(
    "register_for_tournament_atomic",
    {
      p_tournament_id: tournamentId,
      p_alt_id: data?.altId ?? (null as unknown as undefined),
      p_team_name: data?.teamName ?? (null as unknown as undefined),
      p_in_game_name: data?.inGameName ?? (null as unknown as undefined),
      p_display_name_option:
        data?.displayNameOption ?? (null as unknown as undefined),
      p_show_country_flag:
        data?.showCountryFlag ?? (null as unknown as undefined),
    }
  );

  if (rpcError) throw rpcError;

  // RPC returns { success, registrationId, status } or { success: false, error }
  const typedResult = result as
    | { success: true; registrationId: number; status: string }
    | { success: false; error: string }
    | null;

  if (!typedResult?.success) {
    throw new Error(
      (typedResult as { success: false; error: string } | null)?.error ??
        "Registration failed"
    );
  }

  return {
    success: true,
    registrationId: typedResult.registrationId,
    status: typedResult.status as "registered" | "waitlist",
  };
}

/**
 * Update registration preferences (in-game name, display options)
 * Used by the "Edit Registration" flow.
 */
export async function updateRegistrationPreferences(
  supabase: TypedClient,
  tournamentId: number,
  data: {
    inGameName?: string;
    displayNameOption?: string;
    showCountryFlag?: boolean;
  }
) {
  const alt = await getCurrentAlt(supabase);
  if (!alt) {
    throw new Error("Unable to load your account.");
  }

  const { data: registration, error } = await supabase
    .from("tournament_registrations")
    .update({
      in_game_name: data.inGameName,
      display_name_option: data.displayNameOption,
      show_country_flag: data.showCountryFlag,
    })
    .eq("tournament_id", tournamentId)
    .eq("alt_id", alt.id)
    .select("id")
    .single();

  if (error) throw error;
  return { success: true, registrationId: registration.id };
}

/**
 * Cancel tournament registration
 */
export async function cancelRegistration(
  supabase: TypedClient,
  registrationId: number
) {
  const alt = await getCurrentAlt(supabase);
  if (!alt) {
    throw new Error(
      "Unable to load your account. Please try signing out and back in, or contact support."
    );
  }

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
 * Update registration status (for tournament organizers)
 */
export async function updateRegistrationStatus(
  supabase: TypedClient,
  registrationId: number,
  status: Database["public"]["Enums"]["registration_status"]
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

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
  const hasPermission = await checkOrgPermission(
    supabase,
    tournament.organization_id,
    "tournament.manage"
  );
  if (!hasPermission) {
    throw new Error("You don't have permission to update registrations");
  }

  const { error } = await supabase
    .from("tournament_registrations")
    .update({ status })
    .eq("id", registrationId);

  if (error) throw error;
  return { success: true, tournamentId: registration.tournament_id };
}

/**
 * Check in to a tournament
 */
export async function checkIn(supabase: TypedClient, tournamentId: number) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) {
    throw new Error(
      "Unable to load your account. Please try signing out and back in, or contact support."
    );
  }

  // Find the user's registration
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, status, team_id")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", profile.id)
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

  if (!registration.team_id) {
    throw new Error(
      "You must submit a team before checking in. Go to the tournament page to submit your team."
    );
  }

  // Check tournament allows check-in
  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      "status, allow_late_registration, current_round, late_check_in_max_round"
    )
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");
  const { isOpen: checkInOpen } = checkCheckInOpen(tournament);
  if (!checkInOpen) {
    throw new Error("Tournament is not open for check-in");
  }

  const updateData: Record<string, unknown> = {
    status: "checked_in",
    checked_in_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("tournament_registrations")
    .update(updateData)
    .eq("id", registration.id);

  if (error) throw error;
  return { success: true };
}

/**
 * Undo check-in for a tournament
 */
export async function undoCheckIn(supabase: TypedClient, tournamentId: number) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) {
    throw new Error(
      "Unable to load your account. Please try signing out and back in, or contact support."
    );
  }

  // Find the user's registration
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, status")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", profile.id)
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
 * Withdraw from a tournament (delete registration)
 */
export async function withdrawFromTournament(
  supabase: TypedClient,
  tournamentId: number
) {
  const profile = await getCurrentAlt(supabase);
  if (!profile) {
    throw new Error(
      "Unable to load your account. Please try signing out and back in, or contact support."
    );
  }

  // Find registration
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, tournament_id")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", profile.id)
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
 * Send tournament invitations to players
 */
export async function sendTournamentInvitations(
  supabase: TypedClient,
  tournamentId: number,
  profileIds: number[],
  message?: string
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get user's alt for recording who sent the invitation
  const alt = await getCurrentAlt(supabase);
  if (!alt) throw new Error("Alt not found");

  // Get tournament and verify permission
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("organization_id")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");

  const hasPermission = await checkOrgPermission(
    supabase,
    tournament.organization_id,
    "tournament.manage"
  );
  if (!hasPermission) {
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
    invited_by_alt_id: alt.id,
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
  if (!alt) {
    throw new Error(
      "Unable to load your account. Please try signing out and back in, or contact support."
    );
  }

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
    const { data: registration, error: regError } = await supabase
      .from("tournament_registrations")
      .insert({
        tournament_id: invitation.tournament_id,
        alt_id: alt.id,
        status: "registered",
        registered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (regError) throw regError;
    registrationResult = { message: `Registration ID: ${registration.id}` };
  }

  return {
    success: true,
    registration: registrationResult,
  };
}
