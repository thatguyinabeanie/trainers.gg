import {
  type TypedClient,
  getCurrentUser,
  checkOrgPermission,
} from "./helpers";
import { recalculateStandings } from "./standings";

/**
 * Enhanced tournament start: lock teams, activate first phase, create Round 1.
 * Call this instead of the simple `updateTournament({ status: "active" })`.
 */
export async function startTournamentEnhanced(
  supabase: TypedClient,
  tournamentId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get tournament with org info
  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      status,
      organization_id,
      organizations!inner(owner_user_id)
    `
    )
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
    throw new Error("You don't have permission to start this tournament");
  }

  if (tournament.status !== "upcoming") {
    throw new Error(
      `Cannot start tournament with status "${tournament.status}"`
    );
  }

  // 1. Lock all checked-in players' teams
  const { error: lockError } = await supabase
    .from("tournament_registrations")
    .update({ team_locked: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "checked_in");

  if (lockError) throw lockError;

  // 2. Activate the first phase
  const { data: phases, error: phasesError } = await supabase
    .from("tournament_phases")
    .select("id, phase_order, status")
    .eq("tournament_id", tournamentId)
    .order("phase_order", { ascending: true });

  if (phasesError) throw phasesError;

  const firstPhase = phases?.[0];
  if (firstPhase) {
    const { error: activateError } = await supabase
      .from("tournament_phases")
      .update({ status: "active" })
      .eq("id", firstPhase.id);

    if (activateError) throw activateError;

    // 3. Create Round 1 for the first phase if no rounds exist
    const { data: existingRounds, error: roundsQueryError } = await supabase
      .from("tournament_rounds")
      .select("id")
      .eq("phase_id", firstPhase.id)
      .limit(1);

    if (roundsQueryError) throw roundsQueryError;

    if (!existingRounds || existingRounds.length === 0) {
      const { error: roundInsertError } = await supabase
        .from("tournament_rounds")
        .insert({
          phase_id: firstPhase.id,
          round_number: 1,
          status: "pending",
        });

      if (roundInsertError) throw roundInsertError;
    }

    // Update tournament current_phase_id
    const { error: tournamentUpdateError } = await supabase
      .from("tournaments")
      .update({
        status: "active",
        current_phase_id: firstPhase.id,
        current_round: 1,
      })
      .eq("id", tournamentId);

    if (tournamentUpdateError) throw tournamentUpdateError;
  } else {
    // No phases — just activate the tournament
    const { error: tournamentUpdateError } = await supabase
      .from("tournaments")
      .update({ status: "active" })
      .eq("id", tournamentId);

    if (tournamentUpdateError) throw tournamentUpdateError;
  }

  // 4. Initialize player stats for all checked-in players
  const { data: checkedInRegs, error: regsError } = await supabase
    .from("tournament_registrations")
    .select("alt_id")
    .eq("tournament_id", tournamentId)
    .eq("status", "checked_in");

  if (regsError) throw regsError;

  if (checkedInRegs && checkedInRegs.length > 0) {
    const statsInserts = checkedInRegs.map((reg) => ({
      tournament_id: tournamentId,
      alt_id: reg.alt_id,
      match_wins: 0,
      match_losses: 0,
      matches_played: 0,
      game_wins: 0,
      game_losses: 0,
      match_points: 0,
      match_win_percentage: 0,
      game_win_percentage: 0,
      opponent_match_win_percentage: 0,
      opponent_history: [] as number[],
      standings_need_recalc: false,
    }));

    // Upsert so we don't fail if some stats already exist
    const { error: statsError } = await supabase
      .from("tournament_player_stats")
      .upsert(statsInserts, { onConflict: "tournament_id,alt_id" });

    if (statsError) throw statsError;
  }

  return {
    teamsLocked: checkedInRegs?.length ?? 0,
    phaseActivated: firstPhase?.id ?? null,
  };
}

/**
 * Advance from Swiss phase to Top Cut (elimination phase) via atomic RPC.
 * Seeds top N players from Swiss standings into the elimination bracket.
 * The RPC checks that the caller is org owner or staff with `tournament.manage`.
 */
export async function advanceToTopCut(
  supabase: TypedClient,
  tournamentId: number,
  topCutSize?: number
) {
  const { data, error } = await supabase.rpc("advance_to_top_cut", {
    p_tournament_id: tournamentId,
    p_top_cut_size: topCutSize,
  });

  if (error) throw error;

  return data as {
    success: boolean;
    qualifiers: number;
    matches_created: number;
    phase_id: number;
    round_id: number;
  };
}

/**
 * Generate single elimination pairings for a new round.
 * Winners from the previous round advance to create next round's matches.
 */
export async function generateEliminationPairings(
  supabase: TypedClient,
  roundId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get round info
  const { data: round } = await supabase
    .from("tournament_rounds")
    .select(
      `
      id,
      round_number,
      status,
      phase_id,
      tournament_phases!inner(
        id,
        tournament_id,
        phase_type,
        tournaments!tournament_phases_tournament_id_fkey!inner(
          id,
          organization_id,
          organizations!inner(owner_user_id)
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
      organizations: { owner_user_id: string };
    };
  };

  // Verify permission via has_org_permission (covers org owner + staff roles)
  const hasPermission = await checkOrgPermission(
    supabase,
    phase.tournaments.organization_id,
    "tournament.manage"
  );
  if (!hasPermission) {
    throw new Error("You don't have permission to generate pairings");
  }

  if (round.status !== "pending") {
    throw new Error("Round must be pending to generate pairings");
  }

  if (round.round_number < 2) {
    throw new Error("Use advanceToTopCut for round 1 elimination pairings");
  }

  // Get previous round's completed matches to find winners
  const { data: prevRound } = await supabase
    .from("tournament_rounds")
    .select("id")
    .eq("phase_id", phase.id)
    .eq("round_number", round.round_number - 1)
    .single();

  if (!prevRound) {
    throw new Error("Previous round not found");
  }

  const { data: prevMatches } = await supabase
    .from("tournament_matches")
    .select("id, winner_alt_id, alt1_id, alt2_id, is_bye, table_number")
    .eq("round_id", prevRound.id)
    .eq("status", "completed")
    .order("table_number", { ascending: true });

  if (!prevMatches || prevMatches.length === 0) {
    throw new Error("No completed matches in previous round");
  }

  // Get winners (byes auto-advance the player)
  const winners: number[] = [];
  for (const match of prevMatches) {
    if (match.is_bye && match.alt1_id) {
      winners.push(match.alt1_id);
    } else if (match.winner_alt_id) {
      winners.push(match.winner_alt_id);
    }
  }

  if (winners.length < 2) {
    throw new Error("Need at least 2 winners to create pairings");
  }

  // Pair adjacent winners: [0,1], [2,3], [4,5], ...
  const matchInserts: Array<{
    round_id: number;
    alt1_id: number;
    alt2_id: number | null;
    is_bye: boolean;
    table_number: number;
    status: "pending";
  }> = [];

  let tableNumber = 1;
  for (let i = 0; i < winners.length; i += 2) {
    const p1 = winners[i]!;
    const p2 = winners[i + 1] ?? null;

    matchInserts.push({
      round_id: roundId,
      alt1_id: p1,
      alt2_id: p2,
      is_bye: p2 === null,
      table_number: tableNumber,
      status: "pending",
    });
    tableNumber++;
  }

  const { data: matches, error } = await supabase
    .from("tournament_matches")
    .insert(matchInserts)
    .select("id, alt1_id, alt2_id");

  if (error) throw error;

  return {
    matchesCreated: matches.length,
    winnersAdvanced: winners.length,
  };
}

/**
 * Complete a tournament: mark as completed, finalize standings.
 */
export async function completeTournament(
  supabase: TypedClient,
  tournamentId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get tournament with org info
  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      status,
      current_phase_id,
      organization_id,
      organizations!inner(owner_user_id)
    `
    )
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
    throw new Error("You don't have permission to complete this tournament");
  }

  if (tournament.status !== "active") {
    throw new Error("Tournament must be active to complete");
  }

  // Verify all rounds in all phases are completed
  const { data: phases } = await supabase
    .from("tournament_phases")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (phases && phases.length > 0) {
    const phaseIds = phases.map((p) => p.id);
    const { data: activeRounds } = await supabase
      .from("tournament_rounds")
      .select("id, round_number")
      .in("phase_id", phaseIds)
      .neq("status", "completed");

    if (activeRounds && activeRounds.length > 0) {
      throw new Error(
        `Cannot complete tournament: ${activeRounds.length} round(s) still not completed`
      );
    }

    // Complete all phases
    const { error: completePhasesError } = await supabase
      .from("tournament_phases")
      .update({ status: "completed" })
      .in("id", phaseIds);

    if (completePhasesError) throw completePhasesError;
  }

  // Final standings recalculation
  await recalculateStandings(supabase, tournamentId);

  // Mark tournament as completed
  const { error } = await supabase
    .from("tournaments")
    .update({
      status: "completed",
      end_date: new Date().toISOString(),
    })
    .eq("id", tournamentId);

  if (error) throw error;

  return { success: true };
}
