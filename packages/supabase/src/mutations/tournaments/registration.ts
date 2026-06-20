import { z } from "zod";

import { checkCheckInOpen } from "../../utils/registration";
import type { Database } from "../../types";
import {
  type TypedClient,
  getCurrentUser,
  getCurrentAlt,
  checkCommunityPermission,
  throwForMissingSingle,
} from "./helpers";

// =============================================================================
// Atomic-RPC result schemas
//
// Both `register_for_tournament_atomic` and `accept_tournament_invitation_atomic`
// return a JSON discriminated union. Parsing at the boundary catches drift
// between the SQL function shape and the TypeScript expectation — a missing
// `registrationId` or an unknown `status` would silently corrupt downstream
// data otherwise.
// =============================================================================

const registerAtomicResultSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    registrationId: z.number().int().positive(),
    status: z.enum(["registered", "waitlist"]),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

const acceptInvitationResultSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    registrationId: z.number().int().positive(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

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
      p_alt_id: data?.altId ?? undefined,
      p_team_name: data?.teamName ?? undefined,
      p_in_game_name: data?.inGameName ?? undefined,
      p_display_name_option: data?.displayNameOption ?? undefined,
      p_show_country_flag: data?.showCountryFlag ?? undefined,
    }
  );

  if (rpcError) throw rpcError;

  const parsed = registerAtomicResultSchema.safeParse(result);
  if (!parsed.success) {
    throw new Error(
      "register_for_tournament_atomic returned an unexpected shape — " +
        "the RPC may have drifted from the client's expected contract."
    );
  }
  if (!parsed.data.success) {
    throw new Error(parsed.data.error);
  }

  return {
    success: true,
    registrationId: parsed.data.registrationId,
    status: parsed.data.status,
  };
}

/**
 * Update registration preferences (in-game name, display options)
 * Used by the "Edit Registration" flow.
 *
 * Filters by both `id` and `tournament_id` so a stale/mismatched registration
 * ID cannot accidentally mutate a registration belonging to a different tournament.
 *
 * Cross-user ownership is enforced by RLS, NOT by an `.eq("alt_id", …)` filter
 * here — the "Users can update own registration" policy on
 * `tournament_registrations` (migration 20260201220000_fix_rls_auth_initplan)
 * restricts UPDATE to rows whose `alt_id` belongs to one of the caller's alts.
 * If that policy is ever changed, re-evaluate whether app-level enforcement is
 * needed.
 */
export async function updateRegistrationPreferences(
  supabase: TypedClient,
  registrationId: number,
  tournamentId: number,
  data: {
    inGameName?: string;
    displayNameOption?: string;
    showCountryFlag?: boolean;
  }
) {
  const { data: registration, error } = await supabase
    .from("tournament_registrations")
    .update({
      in_game_name: data.inGameName,
      display_name_option: data.displayNameOption,
      show_country_flag: data.showCountryFlag,
    })
    .eq("id", registrationId)
    .eq("tournament_id", tournamentId)
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
  const { data: registration, error: regErr } = await supabase
    .from("tournament_registrations")
    .select("alt_id, tournament_id")
    .eq("id", registrationId)
    .single();

  if (!registration) {
    throwForMissingSingle(regErr, {
      scope: "cancelRegistration.fetchRegistration",
      notFoundMessage: "Registration not found",
      context: { registrationId, altId: alt.id },
    });
  }
  if (registration.alt_id !== alt.id) {
    throw new Error("You can only cancel your own registration");
  }

  // Check tournament status
  const { data: tournament, error: tournamentErr } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", registration.tournament_id)
    .single();

  if (!tournament) {
    throwForMissingSingle(tournamentErr, {
      scope: "cancelRegistration.fetchTournament",
      notFoundMessage: "Tournament not found",
      context: { tournamentId: registration.tournament_id },
    });
  }
  if (tournament.status === "active") {
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
  status: Database["public"]["Enums"]["registration_status"],
  dropInfo?: {
    dropCategory: Database["public"]["Enums"]["drop_category"];
    dropNotes?: string;
  }
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get registration and tournament
  const { data: registration, error: regErr } = await supabase
    .from("tournament_registrations")
    .select("tournament_id")
    .eq("id", registrationId)
    .single();

  if (!registration) {
    throwForMissingSingle(regErr, {
      scope: "updateRegistrationStatus.fetchRegistration",
      notFoundMessage: "Registration not found",
      context: { registrationId },
    });
  }

  const { data: tournament, error: tournamentErr } = await supabase
    .from("tournaments")
    .select("community_id")
    .eq("id", registration.tournament_id)
    .single();

  if (!tournament) {
    throwForMissingSingle(tournamentErr, {
      scope: "updateRegistrationStatus.fetchTournament",
      notFoundMessage: "Tournament not found",
      context: { tournamentId: registration.tournament_id },
    });
  }

  // Verify permission
  const hasPermission = await checkCommunityPermission(
    supabase,
    tournament.community_id,
    "tournament.manage"
  );
  if (!hasPermission) {
    throw new Error("You don't have permission to update registrations");
  }

  // Dropping requires a category
  if (status === "dropped" && !dropInfo) {
    throw new Error("Drop info (category) is required when dropping a player");
  }

  if (dropInfo) {
    // Use the atomic drop_registrations RPC so the staff upsert and the
    // status UPDATE happen in a single transaction. The audit trigger fires
    // on the UPDATE and reads drop metadata from tournament_registration_staff
    // — both writes commit or roll back together, preventing a half-applied
    // state (staff row written but status still not 'dropped').
    const { error: dropError } = await supabase.rpc("drop_registrations", {
      p_registration_ids: [registrationId],
      p_drop_category: dropInfo.dropCategory,
      p_drop_notes: dropInfo.dropNotes ?? "",
    });

    if (dropError) throw dropError;
  } else {
    // Non-drop status change: direct update on the base table (no staff row needed).
    const { error: statusError } = await supabase
      .from("tournament_registrations")
      .update({ status })
      .eq("id", registrationId);

    if (statusError) throw statusError;
  }

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
  const { data: registration, error: regErr } = await supabase
    .from("tournament_registrations")
    .select("id, status, team_id")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", profile.id)
    .single();

  if (!registration) {
    throwForMissingSingle(regErr, {
      scope: "checkIn.fetchRegistration",
      notFoundMessage: "Registration not found",
      context: { tournamentId, altId: profile.id },
    });
  }

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
  const { data: tournament, error: tournamentErr } = await supabase
    .from("tournaments")
    .select(
      "status, allow_late_registration, current_round, late_check_in_max_round"
    )
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    throwForMissingSingle(tournamentErr, {
      scope: "checkIn.fetchTournament",
      notFoundMessage: "Tournament not found",
      context: { tournamentId },
    });
  }
  const { isOpen: checkInOpen } = checkCheckInOpen(tournament);
  if (!checkInOpen) {
    throw new Error("Tournament is not open for check-in");
  }

  const updateData: { status: "checked_in"; checked_in_at: string } = {
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
  const { data: registration, error: regErr } = await supabase
    .from("tournament_registrations")
    .select("id, status")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", profile.id)
    .single();

  if (!registration) {
    throwForMissingSingle(regErr, {
      scope: "undoCheckIn.fetchRegistration",
      notFoundMessage: "Registration not found",
      context: { tournamentId, altId: profile.id },
    });
  }

  if (registration.status !== "checked_in") {
    throw new Error("You are not currently checked in");
  }

  // Check tournament status - can only undo before tournament starts
  const { data: tournament, error: tournamentErr } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    throwForMissingSingle(tournamentErr, {
      scope: "undoCheckIn.fetchTournament",
      notFoundMessage: "Tournament not found",
      context: { tournamentId },
    });
  }
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
  const { data: registration, error: regErr } = await supabase
    .from("tournament_registrations")
    .select("id, tournament_id")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", profile.id)
    .single();

  if (!registration) {
    throwForMissingSingle(regErr, {
      scope: "withdrawFromTournament.fetchRegistration",
      notFoundMessage: "Registration not found",
      context: { tournamentId, altId: profile.id },
    });
  }

  // Check tournament status
  const { data: tournament, error: tournamentErr } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", registration.tournament_id)
    .single();

  if (!tournament) {
    throwForMissingSingle(tournamentErr, {
      scope: "withdrawFromTournament.fetchTournament",
      notFoundMessage: "Tournament not found",
      context: { tournamentId: registration.tournament_id },
    });
  }
  if (tournament.status === "active") {
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
 * Send tournament invitations to players (atomic — capacity-checked)
 */
export async function sendTournamentInvitations(
  supabase: TypedClient,
  tournamentId: number,
  profileIds: number[],
  message?: string
) {
  const alt = await getCurrentAlt(supabase);
  if (!alt) {
    throw new Error(
      "Unable to load your account. Please try signing out and back in, or contact support."
    );
  }

  const { data, error } = await supabase.rpc(
    "send_tournament_invitations_atomic",
    {
      p_tournament_id: tournamentId,
      p_invited_alt_ids: profileIds,
      p_invited_by_alt_id: alt.id,
      p_message: message || undefined,
    }
  );

  if (error) throw error;

  const result = data as {
    success: boolean;
    error?: string;
    invitationsSent?: number;
    alreadyInvited?: number;
    availableSpots?: number | null;
  } | null;

  if (!result?.success) {
    throw new Error(
      result?.error ?? "Failed to send invitations. Please try again."
    );
  }

  return {
    invitationsSent: result.invitationsSent,
    alreadyInvited: result.alreadyInvited,
    availableSpots: result.availableSpots,
  };
}

/**
 * Respond to a tournament invitation.
 * Accept uses an atomic RPC; decline uses a direct update.
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

  if (response === "decline") {
    const { data: invitation, error: invitationErr } = await supabase
      .from("tournament_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (!invitation) {
      throwForMissingSingle(invitationErr, {
        scope: "respondToTournamentInvitation.fetchInvitation",
        notFoundMessage: "Invitation not found",
        context: { invitationId, altId: alt.id },
      });
    }
    if (invitation.invited_alt_id !== alt.id) {
      throw new Error("This invitation is not for you");
    }
    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been responded to");
    }
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      throw new Error("Invitation has expired");
    }

    const { error } = await supabase
      .from("tournament_invitations")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", invitationId);

    if (error) throw error;
    return { success: true, registration: null };
  }

  // Accept: atomic RPC handles ownership check, expiry, and registration insert
  const { data, error } = await supabase.rpc(
    "accept_tournament_invitation_atomic",
    { p_invitation_id: invitationId }
  );

  if (error) throw error;

  const parsed = acceptInvitationResultSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      "accept_tournament_invitation_atomic returned an unexpected shape — " +
        "the RPC may have drifted from the client's expected contract."
    );
  }
  if (!parsed.data.success) {
    throw new Error(parsed.data.error);
  }

  return {
    success: true,
    registration: { message: `Registration ID: ${parsed.data.registrationId}` },
  };
}
