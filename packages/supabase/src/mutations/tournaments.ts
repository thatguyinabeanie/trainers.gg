import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";
import { getInvitationExpiryDate } from "../constants";

type TypedClient = SupabaseClient<Database>;
type TournamentFormat = Database["public"]["Enums"]["tournament_format"];
type TournamentStatus = Database["public"]["Enums"]["tournament_status"];

/**
 * Helper to get current user (for organization ownership checks)
 */
async function getCurrentUser(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Helper to get current alt (for tournament registrations/matches)
 * If altId is provided, fetches that specific alt (must belong to user)
 * Otherwise, uses the user's main_alt_id from the users table
 */
async function getCurrentAlt(supabase: TypedClient, altId?: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // If specific altId provided, verify it belongs to this user
  if (altId !== undefined) {
    const { data: alt } = await supabase
      .from("alts")
      .select("*")
      .eq("id", altId)
      .eq("user_id", user.id)
      .maybeSingle();

    return alt;
  }

  // Otherwise, get the user's main alt
  const { data: userData } = await supabase
    .from("users")
    .select("main_alt_id")
    .eq("id", user.id)
    .single();

  if (!userData?.main_alt_id) {
    // Fallback: get first alt for this user
    const { data: alt } = await supabase
      .from("alts")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    return alt;
  }

  // Get the main alt
  const { data: alt } = await supabase
    .from("alts")
    .select("*")
    .eq("id", userData.main_alt_id)
    .maybeSingle();

  return alt;
}

/**
 * Cut rule for elimination phases preceded by Swiss
 */
type CutRule = "x-1" | "x-2" | "x-3" | "top-4" | "top-8" | "top-16" | "top-32";

/**
 * Phase configuration for tournament creation
 */
interface PhaseConfig {
  name: string;
  phaseType: "swiss" | "single_elimination" | "double_elimination";
  bestOf: 1 | 3 | 5;
  roundTimeMinutes: number;
  checkInTimeMinutes: number;
  plannedRounds?: number; // Swiss only, null = auto
  cutRule?: CutRule; // Elimination only (when preceded by Swiss)
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
    // Game settings
    game?: string;
    gameFormat?: string;
    platform?: string;
    battleFormat?: string;
    // Registration settings
    registrationType?: string;
    checkInRequired?: boolean;
    allowLateRegistration?: boolean;
    // New phases array for flexible phase configuration
    phases?: PhaseConfig[];
  }
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Verify organization exists and user has permission
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", data.organizationId)
    .single();

  if (!org) throw new Error("Organization not found");

  // TODO: Check TOURNAMENT_CREATE permission through RBAC
  // For now, only org owner can create tournaments
  if (org.owner_user_id !== user.id) {
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
      description: data.description,
      format: data.format,
      status: "draft",
      start_date: data.startDate,
      end_date: data.endDate,
      registration_deadline: data.registrationDeadline,
      max_participants: data.maxParticipants,
      top_cut_size: data.topCutSize,
      swiss_rounds: data.swissRounds,
      tournament_format: data.tournamentFormat,
      round_time_minutes: data.roundTimeMinutes ?? 50,
      current_round: 0,
      // Game settings
      game: data.game,
      game_format: data.gameFormat,
      platform: data.platform ?? "cartridge",
      battle_format: data.battleFormat ?? "doubles",
      // Registration settings
      registration_type: data.registrationType ?? "open",
      check_in_required: data.checkInRequired ?? false,
      allow_late_registration: data.allowLateRegistration ?? false,
    })
    .select()
    .single();

  if (error) throw error;

  // Create phases from the phases array if provided
  if (data.phases && data.phases.length > 0) {
    for (let i = 0; i < data.phases.length; i++) {
      const phase = data.phases[i];
      if (!phase) continue; // TypeScript guard for noUncheckedIndexedAccess
      const { error: phaseError } = await supabase
        .from("tournament_phases")
        .insert({
          tournament_id: tournament.id,
          name: phase.name,
          phase_order: i + 1,
          phase_type: phase.phaseType,
          status: "pending",
          best_of: phase.bestOf,
          round_time_minutes: phase.roundTimeMinutes,
          check_in_time_minutes: phase.checkInTimeMinutes,
          planned_rounds: phase.plannedRounds,
          cut_rule: phase.cutRule,
          current_round: 0,
        });

      if (phaseError) {
        console.error("Failed to create phase:", phaseError);
        throw new Error(
          `Failed to create phase "${phase.name}": ${phaseError.message}`
        );
      }
    }
  } else {
    // Fallback: Create default phases based on tournamentFormat (legacy behavior)
    if (
      data.tournamentFormat === "swiss_with_cut" ||
      data.tournamentFormat === "swiss_only"
    ) {
      const { error: swissError } = await supabase
        .from("tournament_phases")
        .insert({
          tournament_id: tournament.id,
          name: "Swiss Rounds",
          phase_order: 1,
          phase_type: "swiss",
          status: "pending",
          best_of: 3,
          round_time_minutes: data.roundTimeMinutes ?? 50,
          check_in_time_minutes: 5,
          planned_rounds: data.swissRounds,
          current_round: 0,
        });

      if (swissError) {
        console.error("Failed to create Swiss phase:", swissError);
      }

      if (data.tournamentFormat === "swiss_with_cut") {
        const { error: cutError } = await supabase
          .from("tournament_phases")
          .insert({
            tournament_id: tournament.id,
            name: "Top Cut",
            phase_order: 2,
            phase_type: "single_elimination",
            status: "pending",
            best_of: 3,
            round_time_minutes: data.roundTimeMinutes ?? 50,
            check_in_time_minutes: 5,
            cut_rule: "x-2", // Default cut rule
            current_round: 0,
          });

        if (cutError) {
          console.error("Failed to create Top Cut phase:", cutError);
        }
      }
    } else if (data.tournamentFormat === "single_elimination") {
      const { error: elimError } = await supabase
        .from("tournament_phases")
        .insert({
          tournament_id: tournament.id,
          name: "Single Elimination Bracket",
          phase_order: 1,
          phase_type: "single_elimination",
          status: "pending",
          best_of: 3,
          round_time_minutes: data.roundTimeMinutes ?? 50,
          check_in_time_minutes: 5,
          current_round: 0,
        });

      if (elimError) {
        console.error("Failed to create Single Elimination phase:", elimError);
      }
    } else if (data.tournamentFormat === "double_elimination") {
      const { error: doubleError } = await supabase
        .from("tournament_phases")
        .insert({
          tournament_id: tournament.id,
          name: "Double Elimination Bracket",
          phase_order: 1,
          phase_type: "double_elimination",
          status: "pending",
          best_of: 3,
          round_time_minutes: data.roundTimeMinutes ?? 50,
          check_in_time_minutes: 5,
          current_round: 0,
        });

      if (doubleError) {
        console.error(
          "Failed to create Double Elimination phase:",
          doubleError
        );
      }
    }
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
    registrationDeadline?: string;
    maxParticipants?: number | null;
    status?: TournamentStatus;
    // Game settings
    game?: string;
    gameFormat?: string;
    platform?: string;
    battleFormat?: string;
    // Registration settings
    registrationType?: string;
    checkInRequired?: boolean;
    allowLateRegistration?: boolean;
  }
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

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
    .select("owner_user_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_user_id !== user.id) {
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
  if (updates.registrationDeadline !== undefined)
    updateData.registration_deadline = updates.registrationDeadline;
  if (updates.maxParticipants !== undefined)
    updateData.max_participants = updates.maxParticipants;
  if (updates.status !== undefined) updateData.status = updates.status;
  // Game settings
  if (updates.game !== undefined) updateData.game = updates.game;
  if (updates.gameFormat !== undefined)
    updateData.game_format = updates.gameFormat;
  if (updates.platform !== undefined) updateData.platform = updates.platform;
  if (updates.battleFormat !== undefined)
    updateData.battle_format = updates.battleFormat;
  // Registration settings
  if (updates.registrationType !== undefined)
    updateData.registration_type = updates.registrationType;
  if (updates.checkInRequired !== undefined)
    updateData.check_in_required = updates.checkInRequired;
  if (updates.allowLateRegistration !== undefined)
    updateData.allow_late_registration = updates.allowLateRegistration;

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
    altId?: number;
    teamName?: string;
    inGameName?: string;
  }
) {
  const alt = await getCurrentAlt(supabase, data?.altId);
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
      in_game_name: data?.inGameName,
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
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

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
    .select("owner_user_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_user_id !== user.id) {
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
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_user_id !== user.id) {
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
 * Start a match (set status to active)
 */
export async function startMatch(supabase: TypedClient, matchId: number) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get user's alt for player check
  const alt = await getCurrentAlt(supabase);

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
              owner_user_id
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
          owner_user_id: string;
        };
      };
    };
  };

  const isOrganizer =
    rounds.tournament_phases.tournaments.organizations.owner_user_id ===
    user.id;
  const isPlayer =
    alt && (match.alt1_id === alt.id || match.alt2_id === alt.id);

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
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get user's alt for player check
  const alt = await getCurrentAlt(supabase);

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
              owner_user_id
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
          owner_user_id: string;
        };
      };
    };
  };

  const isOrganizer =
    rounds.tournament_phases.tournaments.organizations.owner_user_id ===
    user.id;
  const isPlayer =
    alt && (match.alt1_id === alt.id || match.alt2_id === alt.id);

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
 * Delete a tournament (draft only)
 */
export async function deleteTournament(
  supabase: TypedClient,
  tournamentId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

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
    .select("owner_user_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_user_id !== user.id) {
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

  const { data: org } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_user_id !== user.id) {
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

// =============================================================================
// ROUND MANAGEMENT
// =============================================================================

import {
  generateSwissPairings,
  type PlayerForPairing,
  type Pairing,
} from "../lib/swiss-pairings";

/**
 * Generate pairings for a round using the Swiss pairing algorithm
 */
export async function generateRoundPairings(
  supabase: TypedClient,
  roundId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get round with phase and tournament info
  const { data: round } = await supabase
    .from("tournament_rounds")
    .select(
      `
      id,
      round_number,
      status,
      phase_id,
      tournament_phases!inner (
        id,
        tournament_id,
        phase_type,
        tournaments!inner (
          id,
          organization_id,
          status,
          organizations!inner (
            owner_user_id
          )
        )
      )
    `
    )
    .eq("id", roundId)
    .single();

  if (!round) throw new Error("Round not found");

  const phase = round.tournament_phases as unknown as {
    id: number;
    tournament_id: number;
    phase_type: string;
    tournaments: {
      id: number;
      organization_id: number;
      status: string;
      organizations: {
        owner_user_id: string;
      };
    };
  };

  // Verify permission
  if (phase.tournaments.organizations.owner_user_id !== user.id) {
    throw new Error("You don't have permission to generate pairings");
  }

  // Validate tournament is active
  if (phase.tournaments.status !== "active") {
    throw new Error("Tournament must be active to generate pairings");
  }

  // Validate round is pending
  if (round.status !== "pending") {
    throw new Error(
      `Cannot generate pairings for round with status "${round.status}"`
    );
  }

  const tournamentId = phase.tournament_id;

  // Get all checked-in players with their stats
  const { data: registrations } = await supabase
    .from("tournament_registrations")
    .select("alt_id")
    .eq("tournament_id", tournamentId)
    .eq("status", "checked_in");

  if (!registrations || registrations.length === 0) {
    throw new Error("No checked-in players to pair");
  }

  const altIds = registrations.map((r) => r.alt_id);

  // Get player stats
  const { data: playerStats } = await supabase
    .from("tournament_player_stats")
    .select("*")
    .eq("tournament_id", tournamentId)
    .in("alt_id", altIds);

  // Build player data for pairing algorithm
  const statsMap = new Map(playerStats?.map((s) => [s.alt_id, s]) ?? []);

  const players: PlayerForPairing[] = altIds.map((altId, index) => {
    const stats = statsMap.get(altId);
    return {
      altId,
      matchPoints: stats?.match_points ?? 0,
      gameWinPercentage: stats?.game_win_percentage ?? 0,
      opponentMatchWinPercentage: stats?.opponent_match_win_percentage ?? 0,
      opponentHistory: stats?.opponent_history ?? [],
      hasReceivedBye: stats?.has_received_bye ?? false,
      isDropped: stats?.is_dropped ?? false,
      currentSeed: stats?.current_seed ?? index + 1,
    };
  });

  // Generate pairings
  const result = generateSwissPairings(players, round.round_number);

  if (result.pairings.length === 0) {
    throw new Error("Failed to generate any pairings");
  }

  // Create matches and pairings in the database
  const matchInserts: Array<{
    round_id: number;
    alt1_id: number | null;
    alt2_id: number | null;
    is_bye: boolean;
    table_number: number | null;
    status: "pending";
  }> = [];

  const pairingInserts: Array<{
    tournament_id: number;
    round_id: number;
    alt1_id: number | null;
    alt2_id: number | null;
    alt1_seed: number | null;
    alt2_seed: number | null;
    is_bye: boolean;
    pairing_reason: string;
    pairing_type: string;
    table_number: number | null;
  }> = [];

  for (const pairing of result.pairings) {
    matchInserts.push({
      round_id: roundId,
      alt1_id: pairing.alt1Id,
      alt2_id: pairing.alt2Id,
      is_bye: pairing.isBye,
      table_number: pairing.isBye ? null : pairing.tableNumber,
      status: "pending",
    });

    pairingInserts.push({
      tournament_id: tournamentId,
      round_id: roundId,
      alt1_id: pairing.alt1Id,
      alt2_id: pairing.alt2Id,
      alt1_seed: pairing.alt1Seed,
      alt2_seed: pairing.alt2Seed,
      is_bye: pairing.isBye,
      pairing_reason: pairing.pairingReason,
      pairing_type: "swiss",
      table_number: pairing.isBye ? null : pairing.tableNumber,
    });
  }

  // Insert matches
  const { data: matches, error: matchError } = await supabase
    .from("tournament_matches")
    .insert(matchInserts)
    .select("id");

  if (matchError) throw matchError;

  // Link pairings to matches and insert
  for (let i = 0; i < pairingInserts.length; i++) {
    const pairingInsert = pairingInserts[i];
    const match = matches[i];
    if (pairingInsert && match) {
      (pairingInsert as { match_id?: number }).match_id = match.id;
    }
  }

  const { error: pairingError } = await supabase
    .from("tournament_pairings")
    .insert(
      pairingInserts.map((p) => ({
        ...p,
        match_id: (p as { match_id?: number }).match_id,
      }))
    );

  if (pairingError) throw pairingError;

  // Update opponent history for non-bye matches
  const opponentHistoryInserts: Array<{
    tournament_id: number;
    alt_id: number;
    opponent_alt_id: number;
    round_number: number;
  }> = [];

  for (const pairing of result.pairings) {
    if (!pairing.isBye && pairing.alt2Id !== null) {
      opponentHistoryInserts.push({
        tournament_id: tournamentId,
        alt_id: pairing.alt1Id,
        opponent_alt_id: pairing.alt2Id,
        round_number: round.round_number,
      });
      opponentHistoryInserts.push({
        tournament_id: tournamentId,
        alt_id: pairing.alt2Id,
        opponent_alt_id: pairing.alt1Id,
        round_number: round.round_number,
      });
    }
  }

  if (opponentHistoryInserts.length > 0) {
    await supabase
      .from("tournament_opponent_history")
      .insert(opponentHistoryInserts);
  }

  // Mark players with byes
  const byePlayers = result.pairings
    .filter((p) => p.isBye)
    .map((p) => p.alt1Id);

  if (byePlayers.length > 0) {
    await supabase
      .from("tournament_player_stats")
      .update({ has_received_bye: true })
      .eq("tournament_id", tournamentId)
      .in("alt_id", byePlayers);
  }

  return {
    success: true,
    matchesCreated: matches.length,
    warnings: result.warnings,
    algorithm: result.algorithm,
  };
}

/**
 * Start a round (set status to active)
 */
export async function startRound(supabase: TypedClient, roundId: number) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get round with tournament info
  const { data: round } = await supabase
    .from("tournament_rounds")
    .select(
      `
      id,
      status,
      phase_id,
      tournament_phases!inner (
        tournament_id,
        tournaments!inner (
          organization_id,
          status,
          organizations!inner (
            owner_user_id
          )
        )
      )
    `
    )
    .eq("id", roundId)
    .single();

  if (!round) throw new Error("Round not found");

  const phase = round.tournament_phases as unknown as {
    tournament_id: number;
    tournaments: {
      organization_id: number;
      status: string;
      organizations: {
        owner_user_id: string;
      };
    };
  };

  // Verify permission
  if (phase.tournaments.organizations.owner_user_id !== user.id) {
    throw new Error("You don't have permission to start this round");
  }

  // Validate round status
  if (round.status !== "pending") {
    throw new Error(`Cannot start round with status "${round.status}"`);
  }

  // Check that pairings exist
  const { count } = await supabase
    .from("tournament_matches")
    .select("*", { count: "exact", head: true })
    .eq("round_id", roundId);

  if (!count || count === 0) {
    throw new Error(
      "Cannot start round without pairings. Generate pairings first."
    );
  }

  // Update round status
  const { error } = await supabase
    .from("tournament_rounds")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
    })
    .eq("id", roundId);

  if (error) throw error;

  return { success: true };
}

/**
 * Complete a round (set status to completed)
 */
export async function completeRound(supabase: TypedClient, roundId: number) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get round with tournament info
  const { data: round } = await supabase
    .from("tournament_rounds")
    .select(
      `
      id,
      status,
      phase_id,
      tournament_phases!inner (
        tournament_id,
        tournaments!inner (
          organization_id,
          organizations!inner (
            owner_user_id
          )
        )
      )
    `
    )
    .eq("id", roundId)
    .single();

  if (!round) throw new Error("Round not found");

  const phase = round.tournament_phases as unknown as {
    tournament_id: number;
    tournaments: {
      organization_id: number;
      organizations: {
        owner_user_id: string;
      };
    };
  };

  // Verify permission
  if (phase.tournaments.organizations.owner_user_id !== user.id) {
    throw new Error("You don't have permission to complete this round");
  }

  // Validate round status
  if (round.status !== "active") {
    throw new Error(`Cannot complete round with status "${round.status}"`);
  }

  // Check that all matches are completed
  const { data: incompleteMatches } = await supabase
    .from("tournament_matches")
    .select("id")
    .eq("round_id", roundId)
    .neq("status", "completed");

  if (incompleteMatches && incompleteMatches.length > 0) {
    throw new Error(
      `Cannot complete round: ${incompleteMatches.length} match(es) still in progress`
    );
  }

  // Update round status
  const { error } = await supabase
    .from("tournament_rounds")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", roundId);

  if (error) throw error;

  // Recalculate standings after round completion
  await recalculateStandings(supabase, phase.tournament_id);

  return { success: true };
}

// =============================================================================
// STANDINGS CALCULATION
// =============================================================================

/**
 * Recalculate standings for a tournament
 * Updates match points, game win %, opponent match win %, etc.
 */
export async function recalculateStandings(
  supabase: TypedClient,
  tournamentId: number
) {
  // Get all completed matches for this tournament
  const { data: matches } = await supabase
    .from("tournament_matches")
    .select(
      `
      id,
      alt1_id,
      alt2_id,
      winner_alt_id,
      game_wins1,
      game_wins2,
      is_bye,
      status,
      tournament_rounds!inner (
        tournament_phases!inner (
          tournament_id
        )
      )
    `
    )
    .eq("status", "completed");

  // Filter to only this tournament's matches
  const tournamentMatches =
    matches?.filter((m) => {
      const rounds = m.tournament_rounds as unknown as {
        tournament_phases: { tournament_id: number };
      };
      return rounds.tournament_phases.tournament_id === tournamentId;
    }) ?? [];

  // Get all registered players
  const { data: registrations } = await supabase
    .from("tournament_registrations")
    .select("alt_id")
    .eq("tournament_id", tournamentId)
    .in("status", ["checked_in", "registered", "confirmed"]);

  if (!registrations || registrations.length === 0) {
    return { success: true, playersUpdated: 0 };
  }

  const altIds = registrations.map((r) => r.alt_id);

  // Calculate stats for each player
  interface PlayerMatchData {
    matchWins: number;
    matchLosses: number;
    matchDraws: number;
    gameWins: number;
    gameLosses: number;
    opponents: number[];
    matchesPlayed: number;
    hasReceivedBye: boolean;
  }

  const playerData = new Map<number, PlayerMatchData>();

  // Initialize all players
  for (const altId of altIds) {
    playerData.set(altId, {
      matchWins: 0,
      matchLosses: 0,
      matchDraws: 0,
      gameWins: 0,
      gameLosses: 0,
      opponents: [],
      matchesPlayed: 0,
      hasReceivedBye: false,
    });
  }

  // Process matches
  for (const match of tournamentMatches) {
    if (match.is_bye) {
      // Bye counts as a win with 2-0 game score
      const player = playerData.get(match.alt1_id!);
      if (player) {
        player.matchWins += 1;
        player.gameWins += 2;
        player.matchesPlayed += 1;
        player.hasReceivedBye = true;
      }
      continue;
    }

    const player1Data = playerData.get(match.alt1_id!);
    const player2Data = playerData.get(match.alt2_id!);

    if (player1Data && player2Data) {
      // Record opponents
      player1Data.opponents.push(match.alt2_id!);
      player2Data.opponents.push(match.alt1_id!);

      // Record games
      player1Data.gameWins += match.game_wins1 ?? 0;
      player1Data.gameLosses += match.game_wins2 ?? 0;
      player2Data.gameWins += match.game_wins2 ?? 0;
      player2Data.gameLosses += match.game_wins1 ?? 0;

      // Record match result
      player1Data.matchesPlayed += 1;
      player2Data.matchesPlayed += 1;

      if (match.winner_alt_id === match.alt1_id) {
        player1Data.matchWins += 1;
        player2Data.matchLosses += 1;
      } else if (match.winner_alt_id === match.alt2_id) {
        player2Data.matchWins += 1;
        player1Data.matchLosses += 1;
      } else {
        // Draw (rare in Pokemon)
        player1Data.matchDraws += 1;
        player2Data.matchDraws += 1;
      }
    }
  }

  // Calculate match points and percentages
  const calculateMatchWinPercentage = (data: PlayerMatchData): number => {
    if (data.matchesPlayed === 0) return 0;
    // Match points: 3 for win, 1 for draw, 0 for loss
    const matchPoints = data.matchWins * 3 + data.matchDraws * 1;
    const maxPoints = data.matchesPlayed * 3;
    const percentage = (matchPoints / maxPoints) * 100;
    // VGC uses minimum 25% for tiebreaker calculations
    return Math.max(percentage, 25);
  };

  const calculateGameWinPercentage = (data: PlayerMatchData): number => {
    const totalGames = data.gameWins + data.gameLosses;
    if (totalGames === 0) return 0;
    const percentage = (data.gameWins / totalGames) * 100;
    return Math.max(percentage, 25);
  };

  // Calculate opponent match win percentage
  const calculateOpponentMatchWinPercentage = (
    data: PlayerMatchData
  ): number => {
    if (data.opponents.length === 0) return 0;

    let totalPercentage = 0;
    for (const oppId of data.opponents) {
      const oppData = playerData.get(oppId);
      if (oppData) {
        totalPercentage += calculateMatchWinPercentage(oppData);
      }
    }
    return totalPercentage / data.opponents.length;
  };

  // Build stats for upsert
  const statsToUpsert: Array<{
    tournament_id: number;
    alt_id: number;
    match_wins: number;
    match_losses: number;
    matches_played: number;
    game_wins: number;
    game_losses: number;
    match_points: number;
    match_win_percentage: number;
    game_win_percentage: number;
    opponent_match_win_percentage: number;
    opponent_history: number[];
    has_received_bye: boolean;
    standings_need_recalc: boolean;
    updated_at: string;
  }> = [];

  for (const [altId, data] of playerData) {
    const matchPoints = data.matchWins * 3 + data.matchDraws * 1;
    const matchWinPct = calculateMatchWinPercentage(data);
    const gameWinPct = calculateGameWinPercentage(data);
    const oppMatchWinPct = calculateOpponentMatchWinPercentage(data);

    statsToUpsert.push({
      tournament_id: tournamentId,
      alt_id: altId,
      match_wins: data.matchWins,
      match_losses: data.matchLosses,
      matches_played: data.matchesPlayed,
      game_wins: data.gameWins,
      game_losses: data.gameLosses,
      match_points: matchPoints,
      match_win_percentage: matchWinPct,
      game_win_percentage: gameWinPct,
      opponent_match_win_percentage: oppMatchWinPct,
      opponent_history: data.opponents,
      has_received_bye: data.hasReceivedBye,
      standings_need_recalc: false,
      updated_at: new Date().toISOString(),
    });
  }

  // Upsert stats (update if exists, insert if not)
  for (const stats of statsToUpsert) {
    const { error } = await supabase
      .from("tournament_player_stats")
      .upsert(stats, {
        onConflict: "tournament_id,alt_id",
      });

    if (error) {
      console.error(`Error upserting stats for alt ${stats.alt_id}:`, error);
    }
  }

  // Calculate standings (rank by match points, then tiebreakers)
  const sortedPlayers = [...statsToUpsert].sort((a, b) => {
    // First by match points
    if (b.match_points !== a.match_points) {
      return b.match_points - a.match_points;
    }
    // Then by opponent match win %
    if (b.opponent_match_win_percentage !== a.opponent_match_win_percentage) {
      return b.opponent_match_win_percentage - a.opponent_match_win_percentage;
    }
    // Then by game win %
    return b.game_win_percentage - a.game_win_percentage;
  });

  // Update standings
  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    if (player) {
      await supabase
        .from("tournament_player_stats")
        .update({ current_standing: i + 1 })
        .eq("tournament_id", tournamentId)
        .eq("alt_id", player.alt_id);
    }
  }

  return {
    success: true,
    playersUpdated: statsToUpsert.length,
  };
}

/**
 * Drop a player from the tournament (they can no longer participate)
 */
export async function dropPlayer(
  supabase: TypedClient,
  tournamentId: number,
  altId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get tournament with organization info
  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      status,
      organization_id,
      organizations!inner (
        owner_user_id
      )
    `
    )
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");

  const org = tournament.organizations as unknown as { owner_user_id: string };

  // Check permission - either the player themselves or the organizer
  const currentAlt = await getCurrentAlt(supabase);
  const isPlayer = currentAlt?.id === altId;
  const isOrganizer = org.owner_user_id === user.id;

  if (!isPlayer && !isOrganizer) {
    throw new Error("You don't have permission to drop this player");
  }

  // Validate tournament is active
  if (tournament.status !== "active") {
    throw new Error("Can only drop players from active tournaments");
  }

  // Update player stats to mark as dropped
  const { error: statsError } = await supabase
    .from("tournament_player_stats")
    .update({ is_dropped: true })
    .eq("tournament_id", tournamentId)
    .eq("alt_id", altId);

  if (statsError) throw statsError;

  // Update registration status
  const { error: regError } = await supabase
    .from("tournament_registrations")
    .update({ status: "dropped" })
    .eq("tournament_id", tournamentId)
    .eq("alt_id", altId);

  if (regError) throw regError;

  return { success: true };
}

/**
 * Create a new round for a phase
 */
export async function createRound(
  supabase: TypedClient,
  phaseId: number,
  roundNumber: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get phase with tournament info
  const { data: phase } = await supabase
    .from("tournament_phases")
    .select(
      `
      id,
      tournament_id,
      tournaments!inner (
        organization_id,
        organizations!inner (
          owner_user_id
        )
      )
    `
    )
    .eq("id", phaseId)
    .single();

  if (!phase) throw new Error("Phase not found");

  const tournament = phase.tournaments as unknown as {
    organization_id: number;
    organizations: { owner_user_id: string };
  };

  // Verify permission
  if (tournament.organizations.owner_user_id !== user.id) {
    throw new Error("You don't have permission to create rounds");
  }

  // Create the round
  const { data: round, error } = await supabase
    .from("tournament_rounds")
    .insert({
      phase_id: phaseId,
      round_number: roundNumber,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;

  return { success: true, round };
}

/**
 * Update a tournament phase
 */
export async function updatePhase(
  supabase: TypedClient,
  phaseId: number,
  updates: {
    name?: string;
    bestOf?: 1 | 3 | 5;
    roundTimeMinutes?: number;
    checkInTimeMinutes?: number;
    plannedRounds?: number;
    cutRule?: CutRule;
  }
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get phase with tournament info
  const { data: phase } = await supabase
    .from("tournament_phases")
    .select(
      `
      id,
      status,
      tournament_id,
      tournaments!inner (
        organization_id,
        status,
        organizations!inner (
          owner_user_id
        )
      )
    `
    )
    .eq("id", phaseId)
    .single();

  if (!phase) throw new Error("Phase not found");

  const tournament = phase.tournaments as unknown as {
    organization_id: number;
    status: string;
    organizations: { owner_user_id: string };
  };

  // Verify permission
  if (tournament.organizations.owner_user_id !== user.id) {
    throw new Error("You don't have permission to update this phase");
  }

  // Only allow editing phases when tournament is draft or upcoming
  if (tournament.status !== "draft" && tournament.status !== "upcoming") {
    throw new Error("Cannot edit phases after tournament has started");
  }

  // Build update object
  const updateData: {
    name?: string;
    best_of?: number;
    round_time_minutes?: number;
    check_in_time_minutes?: number;
    planned_rounds?: number;
    cut_rule?: string;
  } = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.bestOf !== undefined) updateData.best_of = updates.bestOf;
  if (updates.roundTimeMinutes !== undefined)
    updateData.round_time_minutes = updates.roundTimeMinutes;
  if (updates.checkInTimeMinutes !== undefined)
    updateData.check_in_time_minutes = updates.checkInTimeMinutes;
  if (updates.plannedRounds !== undefined)
    updateData.planned_rounds = updates.plannedRounds;
  if (updates.cutRule !== undefined) updateData.cut_rule = updates.cutRule;

  const { error } = await supabase
    .from("tournament_phases")
    .update(updateData)
    .eq("id", phaseId);

  if (error) throw error;

  return { success: true };
}

/**
 * Create a new tournament phase
 */
export async function createPhase(
  supabase: TypedClient,
  tournamentId: number,
  phase: {
    name: string;
    phaseType: "swiss" | "single_elimination" | "double_elimination";
    bestOf: 1 | 3 | 5;
    roundTimeMinutes: number;
    checkInTimeMinutes: number;
    plannedRounds?: number;
    cutRule?: CutRule;
  }
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get tournament with organization info
  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      status,
      organization_id,
      organizations!inner (
        owner_user_id
      )
    `
    )
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");

  const org = tournament.organizations as unknown as { owner_user_id: string };

  // Verify permission
  if (org.owner_user_id !== user.id) {
    throw new Error(
      "You don't have permission to add phases to this tournament"
    );
  }

  // Only allow adding phases when tournament is draft or upcoming
  if (tournament.status !== "draft" && tournament.status !== "upcoming") {
    throw new Error("Cannot add phases after tournament has started");
  }

  // Get the current max phase_order to append new phase at the end
  const { data: existingPhases } = await supabase
    .from("tournament_phases")
    .select("phase_order")
    .eq("tournament_id", tournamentId)
    .order("phase_order", { ascending: false })
    .limit(1);

  const maxOrder = existingPhases?.[0]?.phase_order ?? 0;

  // Insert the new phase
  const { data: newPhase, error } = await supabase
    .from("tournament_phases")
    .insert({
      tournament_id: tournamentId,
      name: phase.name,
      phase_order: maxOrder + 1,
      phase_type: phase.phaseType,
      status: "pending",
      best_of: phase.bestOf,
      round_time_minutes: phase.roundTimeMinutes,
      check_in_time_minutes: phase.checkInTimeMinutes,
      planned_rounds: phase.plannedRounds ?? null,
      cut_rule: phase.cutRule ?? null,
      current_round: 0,
    })
    .select()
    .single();

  if (error) throw error;

  return { success: true, phase: newPhase };
}

/**
 * Delete a tournament phase
 */
export async function deletePhase(supabase: TypedClient, phaseId: number) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get phase with tournament info
  const { data: phase } = await supabase
    .from("tournament_phases")
    .select(
      `
      id,
      phase_order,
      tournament_id,
      tournaments!inner (
        status,
        organization_id,
        organizations!inner (
          owner_user_id
        )
      )
    `
    )
    .eq("id", phaseId)
    .single();

  if (!phase) throw new Error("Phase not found");

  const tournament = phase.tournaments as unknown as {
    status: string;
    organization_id: number;
    organizations: { owner_user_id: string };
  };

  // Verify permission
  if (tournament.organizations.owner_user_id !== user.id) {
    throw new Error("You don't have permission to delete this phase");
  }

  // Only allow deleting phases when tournament is draft or upcoming
  if (tournament.status !== "draft" && tournament.status !== "upcoming") {
    throw new Error("Cannot delete phases after tournament has started");
  }

  // Check if this is the last phase - don't allow deleting if it's the only one
  const { count } = await supabase
    .from("tournament_phases")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", phase.tournament_id);

  if (count === 1) {
    throw new Error(
      "Cannot delete the last phase. A tournament must have at least one phase."
    );
  }

  // Delete the phase
  const { error: deleteError } = await supabase
    .from("tournament_phases")
    .delete()
    .eq("id", phaseId);

  if (deleteError) throw deleteError;

  // Reorder remaining phases to fill the gap
  const { data: remainingPhases } = await supabase
    .from("tournament_phases")
    .select("id, phase_order")
    .eq("tournament_id", phase.tournament_id)
    .order("phase_order", { ascending: true });

  if (remainingPhases) {
    for (let i = 0; i < remainingPhases.length; i++) {
      const p = remainingPhases[i];
      if (p && p.phase_order !== i + 1) {
        await supabase
          .from("tournament_phases")
          .update({ phase_order: i + 1 })
          .eq("id", p.id);
      }
    }
  }

  return { success: true };
}

/**
 * Phase configuration for batch save
 */
interface PhaseInput {
  id?: number; // undefined for new phases, number for existing
  name: string;
  phaseType: "swiss" | "single_elimination" | "double_elimination";
  bestOf: 1 | 3 | 5;
  roundTimeMinutes: number;
  checkInTimeMinutes: number;
  plannedRounds?: number;
  cutRule?: CutRule;
}

/**
 * Save all tournament phases in a single transaction
 * Replaces all existing phases with the provided ones
 */
export async function saveTournamentPhases(
  supabase: TypedClient,
  tournamentId: number,
  phases: PhaseInput[]
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get tournament with organization info
  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      status,
      organization_id,
      organizations!inner (
        owner_user_id
      )
    `
    )
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");

  const org = tournament.organizations as unknown as { owner_user_id: string };

  // Verify permission
  if (org.owner_user_id !== user.id) {
    throw new Error(
      "You don't have permission to modify phases for this tournament"
    );
  }

  // Only allow modifying phases when tournament is draft or upcoming
  if (tournament.status !== "draft" && tournament.status !== "upcoming") {
    throw new Error("Cannot modify phases after tournament has started");
  }

  // Validate that we have at least one phase
  if (phases.length === 0) {
    throw new Error("Tournament must have at least one phase");
  }

  // Get existing phases
  const { data: existingPhases } = await supabase
    .from("tournament_phases")
    .select("id")
    .eq("tournament_id", tournamentId);

  const existingPhaseIds = new Set(existingPhases?.map((p) => p.id) ?? []);
  const inputPhaseIds = new Set(
    phases.filter((p) => p.id !== undefined).map((p) => p.id!)
  );

  // Determine which phases to delete, update, and create
  const toDelete = [...existingPhaseIds].filter((id) => !inputPhaseIds.has(id));
  const toUpdate = phases.filter(
    (p) => p.id !== undefined && existingPhaseIds.has(p.id!)
  );
  const toCreate = phases.filter((p) => p.id === undefined);

  // Delete phases that are no longer in the list
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("tournament_phases")
      .delete()
      .in("id", toDelete);

    if (deleteError) throw deleteError;
  }

  // Update existing phases
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if (!phase) continue;

    if (phase.id !== undefined && existingPhaseIds.has(phase.id)) {
      const { error: updateError } = await supabase
        .from("tournament_phases")
        .update({
          name: phase.name,
          phase_type: phase.phaseType,
          phase_order: i + 1,
          best_of: phase.bestOf,
          round_time_minutes: phase.roundTimeMinutes,
          check_in_time_minutes: phase.checkInTimeMinutes,
          planned_rounds: phase.plannedRounds ?? null,
          cut_rule: phase.cutRule ?? null,
        })
        .eq("id", phase.id);

      if (updateError) throw updateError;
    }
  }

  // Create new phases
  const newPhases: Array<{
    tournament_id: number;
    name: string;
    phase_order: number;
    phase_type: string;
    status: "pending";
    best_of: number;
    round_time_minutes: number;
    check_in_time_minutes: number;
    planned_rounds: number | null;
    cut_rule: string | null;
    current_round: number;
  }> = [];

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if (!phase) continue;

    if (phase.id === undefined) {
      newPhases.push({
        tournament_id: tournamentId,
        name: phase.name,
        phase_order: i + 1,
        phase_type: phase.phaseType,
        status: "pending",
        best_of: phase.bestOf,
        round_time_minutes: phase.roundTimeMinutes,
        check_in_time_minutes: phase.checkInTimeMinutes,
        planned_rounds: phase.plannedRounds ?? null,
        cut_rule: phase.cutRule ?? null,
        current_round: 0,
      });
    }
  }

  if (newPhases.length > 0) {
    const { error: insertError } = await supabase
      .from("tournament_phases")
      .insert(newPhases);

    if (insertError) throw insertError;
  }

  return {
    success: true,
    deleted: toDelete.length,
    updated: toUpdate.length,
    created: toCreate.length,
  };
}
