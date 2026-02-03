import { type TypedClient, type CutRule, getCurrentUser } from "./helpers";

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
      tournaments!tournament_phases_tournament_id_fkey!inner (
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
      tournaments!tournament_phases_tournament_id_fkey!inner (
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
