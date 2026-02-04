import type { Database } from "../../types";
import {
  type TypedClient,
  getCurrentUser,
  checkOrgPermission,
  type PhaseConfig,
} from "./helpers";

type TournamentFormat = Database["public"]["Enums"]["tournament_format"];
type TournamentStatus = Database["public"]["Enums"]["tournament_status"];

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
    lateCheckInMaxRound?: number;
    // New phases array for flexible phase configuration
    phases?: PhaseConfig[];
  }
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Verify organization exists and user has permission
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", data.organizationId)
    .single();

  if (!org) throw new Error("Organization not found");

  // Check permission via has_org_permission (covers org owner + staff roles)
  const hasPermission = await checkOrgPermission(
    supabase,
    data.organizationId,
    "tournament.manage"
  );
  if (!hasPermission) {
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
      late_check_in_max_round: data.lateCheckInMaxRound ?? null,
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
        throw new Error(`Failed to create Swiss phase: ${swissError.message}`);
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
          throw new Error(
            `Failed to create Top Cut phase: ${cutError.message}`
          );
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
        throw new Error(
          `Failed to create Single Elimination phase: ${elimError.message}`
        );
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
        throw new Error(
          `Failed to create Double Elimination phase: ${doubleError.message}`
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
    lateCheckInMaxRound?: number | null;
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

  // Verify permission via has_org_permission (covers org owner + staff roles)
  const hasPermission = await checkOrgPermission(
    supabase,
    tournament.organization_id,
    "tournament.manage"
  );
  if (!hasPermission) {
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
  if (updates.lateCheckInMaxRound !== undefined)
    updateData.late_check_in_max_round = updates.lateCheckInMaxRound;

  const { error } = await supabase
    .from("tournaments")
    .update(updateData)
    .eq("id", tournamentId);

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

  // Verify permission via has_org_permission (covers org owner + staff roles)
  const hasPermission = await checkOrgPermission(
    supabase,
    tournament.organization_id,
    "tournament.manage"
  );
  if (!hasPermission) {
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

  // Verify permission via has_org_permission (covers org owner + staff roles)
  const hasPermission = await checkOrgPermission(
    supabase,
    tournament.organization_id,
    "tournament.manage"
  );
  if (!hasPermission) {
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
