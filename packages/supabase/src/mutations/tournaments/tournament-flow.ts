import { type TypedClient, getCurrentUser } from "./helpers";
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

  const org = tournament.organizations as unknown as {
    owner_user_id: string;
  };
  if (org.owner_user_id !== user.id) {
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
 * Advance from Swiss phase to Top Cut (elimination phase).
 * Seeds top N players from Swiss standings into the elimination bracket.
 */
export async function advanceToTopCut(
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
      top_cut_size,
      organization_id,
      current_phase_id,
      organizations!inner(owner_user_id)
    `
    )
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");

  const org = tournament.organizations as unknown as {
    owner_user_id: string;
  };
  if (org.owner_user_id !== user.id) {
    throw new Error("You don't have permission to advance this tournament");
  }

  if (tournament.status !== "active") {
    throw new Error("Tournament must be active to advance phases");
  }

  // Get all phases ordered
  const { data: phases } = await supabase
    .from("tournament_phases")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("phase_order", { ascending: true });

  if (!phases || phases.length < 2) {
    throw new Error("Tournament needs at least 2 phases to advance");
  }

  // Find current Swiss phase and next elimination phase
  const currentPhase = phases.find((p) => p.id === tournament.current_phase_id);
  if (!currentPhase || currentPhase.phase_type !== "swiss") {
    throw new Error("Current phase must be Swiss to advance to Top Cut");
  }

  // Verify all Swiss rounds are completed
  const { data: activeRounds } = await supabase
    .from("tournament_rounds")
    .select("id, status")
    .eq("phase_id", currentPhase.id)
    .neq("status", "completed");

  if (activeRounds && activeRounds.length > 0) {
    throw new Error(
      "All Swiss rounds must be completed before advancing to Top Cut"
    );
  }

  const nextPhase = phases.find(
    (p) => p.phase_order === currentPhase.phase_order + 1
  );
  if (
    !nextPhase ||
    (nextPhase.phase_type !== "single_elimination" &&
      nextPhase.phase_type !== "double_elimination")
  ) {
    throw new Error("Next phase must be an elimination phase");
  }

  // Get top N players from standings
  const cutSize = tournament.top_cut_size ?? 8;

  const { data: standings } = await supabase
    .from("tournament_player_stats")
    .select(
      "alt_id, match_points, match_win_percentage, game_win_percentage, opponent_match_win_percentage, current_standing, is_dropped"
    )
    .eq("tournament_id", tournamentId)
    .eq("is_dropped", false)
    .order("match_points", { ascending: false })
    .order("opponent_match_win_percentage", { ascending: false })
    .order("game_win_percentage", { ascending: false })
    .limit(cutSize);

  if (!standings || standings.length === 0) {
    throw new Error("No players available for top cut");
  }

  // Complete Swiss phase
  const { error: completeSwissError } = await supabase
    .from("tournament_phases")
    .update({ status: "completed" })
    .eq("id", currentPhase.id);

  if (completeSwissError) throw completeSwissError;

  // Activate elimination phase
  const { error: activateElimError } = await supabase
    .from("tournament_phases")
    .update({ status: "active" })
    .eq("id", nextPhase.id);

  if (activateElimError) throw activateElimError;

  // Create Round 1 for the elimination phase
  const { data: elimRound } = await supabase
    .from("tournament_rounds")
    .insert({
      phase_id: nextPhase.id,
      round_number: 1,
      status: "pending",
    })
    .select("id")
    .single();

  if (!elimRound) throw new Error("Failed to create elimination round");

  // Generate seeded pairings (1v8, 2v7, etc.)
  const qualifiers = standings.map((s, i) => ({
    altId: s.alt_id,
    seed: i + 1,
  }));

  const matchInserts: Array<{
    round_id: number;
    alt1_id: number;
    alt2_id: number | null;
    is_bye: boolean;
    table_number: number;
    status: "pending";
  }> = [];

  const pairingInserts: Array<{
    tournament_id: number;
    round_id: number;
    alt1_id: number;
    alt2_id: number | null;
    alt1_seed: number;
    alt2_seed: number | null;
    is_bye: boolean;
    pairing_reason: string;
    pairing_type: string;
    table_number: number;
  }> = [];

  // Standard seeded bracket: 1vs8, 4vs5, 2vs7, 3vs6 (for 8)
  const bracketOrder = generateBracketSeeding(qualifiers.length);

  let tableNumber = 1;
  for (const [highSeedIdx, lowSeedIdx] of bracketOrder) {
    const highSeed = qualifiers[highSeedIdx];
    const lowSeed =
      lowSeedIdx !== null ? (qualifiers[lowSeedIdx] ?? null) : null;

    matchInserts.push({
      round_id: elimRound.id,
      alt1_id: highSeed!.altId,
      alt2_id: lowSeed?.altId ?? null,
      is_bye: !lowSeed,
      table_number: tableNumber,
      status: "pending",
    });

    pairingInserts.push({
      tournament_id: tournamentId,
      round_id: elimRound.id,
      alt1_id: highSeed!.altId,
      alt2_id: lowSeed?.altId ?? null,
      alt1_seed: highSeed!.seed,
      alt2_seed: lowSeed?.seed ?? null,
      is_bye: !lowSeed,
      pairing_reason: `Seed ${highSeed!.seed} vs Seed ${lowSeed?.seed ?? "BYE"}`,
      pairing_type: "elimination_seeded",
      table_number: tableNumber,
    });

    tableNumber++;
  }

  // Insert matches
  const { data: matches, error: matchError } = await supabase
    .from("tournament_matches")
    .insert(matchInserts)
    .select("id, alt1_id, alt2_id");

  if (matchError) throw matchError;

  // Link pairings to matches
  const matchMap = new Map<string, number>();
  for (const m of matches) {
    matchMap.set(`${m.alt1_id}:${m.alt2_id}`, m.id);
  }

  const pairingsWithMatchId = pairingInserts.map((p) => ({
    ...p,
    match_id: matchMap.get(`${p.alt1_id}:${p.alt2_id}`),
  }));

  const { error: pairingsError } = await supabase
    .from("tournament_pairings")
    .insert(pairingsWithMatchId);

  if (pairingsError) throw pairingsError;

  // Update tournament current phase
  const { error: updatePhaseError } = await supabase
    .from("tournaments")
    .update({
      current_phase_id: nextPhase.id,
      current_round: 1,
    })
    .eq("id", tournamentId);

  if (updatePhaseError) throw updatePhaseError;

  return {
    qualifiers: qualifiers.length,
    matchesCreated: matches.length,
    phaseId: nextPhase.id,
    roundId: elimRound.id,
  };
}

/**
 * Generate bracket seeding order for single elimination.
 * Returns array of [highSeedIndex, lowSeedIndex] pairs.
 * Uses standard tournament seeding (1v8, 4v5, 2v7, 3v6 for 8 players).
 */
function generateBracketSeeding(
  playerCount: number
): Array<[number, number | null]> {
  // Round up to nearest power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
  const pairs: Array<[number, number | null]> = [];

  // Standard bracket seeding: seed 1 plays seed N, seed 2 plays seed N-1, etc.
  // But in proper bracket order so 1 and 2 can meet in finals
  const seeds = generateBracketOrder(bracketSize);

  for (let i = 0; i < seeds.length; i += 2) {
    const highSeedIdx = (seeds[i] ?? 1) - 1;
    const lowSeedIdx = (seeds[i + 1] ?? bracketSize) - 1;

    // If the low seed index exceeds our actual player count, it's a bye
    if (lowSeedIdx >= playerCount) {
      pairs.push([highSeedIdx, null]);
    } else {
      pairs.push([highSeedIdx, lowSeedIdx]);
    }
  }

  return pairs;
}

/**
 * Generate standard bracket seed ordering.
 * For a bracket of size N, produces the order of seeds
 * such that seed 1 and seed 2 meet in the final.
 */
function generateBracketOrder(bracketSize: number): number[] {
  if (bracketSize === 1) return [1];
  if (bracketSize === 2) return [1, 2];

  const smaller = generateBracketOrder(bracketSize / 2);
  const result: number[] = [];

  for (const seed of smaller) {
    result.push(seed);
    result.push(bracketSize + 1 - seed);
  }

  return result;
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

  if (phase.tournaments.organizations.owner_user_id !== user.id) {
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

  const org = tournament.organizations as unknown as {
    owner_user_id: string;
  };
  if (org.owner_user_id !== user.id) {
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
