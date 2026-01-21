import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;
type TournamentFormat = Database["public"]["Enums"]["tournament_format"];
type TournamentStatus = Database["public"]["Enums"]["tournament_status"];

/**
 * Helper to get current profile
 */
async function getCurrentProfile(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return profile;
}

/**
 * Create a new tournament
 */
export async function createTournament(
  supabase: TypedClient,
  data: {
    organizationId: string;
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
  },
) {
  const profile = await getCurrentProfile(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Verify organization exists and user has permission
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_profile_id")
    .eq("id", data.organizationId)
    .single();

  if (!org) throw new Error("Organization not found");

  // TODO: Check TOURNAMENT_CREATE permission through RBAC
  // For now, only org owner can create tournaments
  if (org.owner_profile_id !== profile.id) {
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
  tournamentId: string,
  updates: {
    name?: string;
    description?: string;
    format?: string;
    startDate?: string;
    endDate?: string;
    maxParticipants?: number;
    status?: TournamentStatus;
  },
) {
  const profile = await getCurrentProfile(supabase);
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
    .select("owner_profile_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_profile_id !== profile.id) {
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
  tournamentId: string,
  data?: {
    teamName?: string;
    notes?: string;
  },
) {
  const profile = await getCurrentProfile(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Check if already registered
  const { data: existing } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("profile_id", profile.id)
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

  // Check max participants
  if (tournament.max_participants) {
    const { count } = await supabase
      .from("tournament_registrations")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);

    if ((count ?? 0) >= tournament.max_participants) {
      throw new Error("Tournament is full");
    }
  }

  // Create registration
  const { data: registration, error } = await supabase
    .from("tournament_registrations")
    .insert({
      tournament_id: tournamentId,
      profile_id: profile.id,
      status: "pending",
      registered_at: new Date().toISOString(),
      team_name: data?.teamName,
      notes: data?.notes,
      rental_team_photo_verified: false,
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, registrationId: registration.id };
}

/**
 * Cancel tournament registration
 */
export async function cancelRegistration(
  supabase: TypedClient,
  registrationId: string,
) {
  const profile = await getCurrentProfile(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Verify ownership
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("profile_id, tournament_id")
    .eq("id", registrationId)
    .single();

  if (!registration) throw new Error("Registration not found");
  if (registration.profile_id !== profile.id) {
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
  tournamentId: string,
) {
  const profile = await getCurrentProfile(supabase);
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
    .select("owner_profile_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_profile_id !== profile.id) {
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
  registrationId: string,
  status: Database["public"]["Enums"]["registration_status"],
) {
  const profile = await getCurrentProfile(supabase);
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
    .select("owner_profile_id")
    .eq("id", tournament.organization_id)
    .single();

  if (org?.owner_profile_id !== profile.id) {
    throw new Error("You don't have permission to update registrations");
  }

  const { error } = await supabase
    .from("tournament_registrations")
    .update({ status })
    .eq("id", registrationId);

  if (error) throw error;
  return { success: true };
}
