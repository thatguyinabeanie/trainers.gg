import {
  generateSwissPairings,
  type PlayerForPairing,
  type Pairing,
} from "../../lib/swiss-pairings";
import { type TypedClient, getCurrentUser } from "./helpers";
import { recalculateStandings } from "./standings";

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
        tournaments!tournament_phases_tournament_id_fkey!inner (
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

  // If not round 1, ensure previous round is completed
  if (round.round_number > 1) {
    const { data: previousRound } = await supabase
      .from("tournament_rounds")
      .select("id, status, round_number")
      .eq("phase_id", phase.id)
      .eq("round_number", round.round_number - 1)
      .maybeSingle();

    if (previousRound && previousRound.status !== "completed") {
      throw new Error(
        `Round ${previousRound.round_number} must be completed before generating pairings for round ${round.round_number}.`
      );
    }
  }

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
    .select("id, round_id, alt1_id, alt2_id");

  if (matchError) throw matchError;

  // Create a map to look up match IDs by their unique key (alt1_id, alt2_id)
  // This avoids relying on array index order which isn't guaranteed by PostgreSQL
  const matchMap = new Map<string, number>();
  for (const match of matches) {
    // Key format: "alt1_id:alt2_id" (alt2_id can be null for byes)
    const key = `${match.alt1_id}:${match.alt2_id}`;
    matchMap.set(key, match.id);
  }

  // Link pairings to matches using the map
  const pairingsWithMatchId = pairingInserts.map((p) => {
    const key = `${p.alt1_id}:${p.alt2_id}`;
    const matchId = matchMap.get(key);
    return {
      ...p,
      match_id: matchId,
    };
  });

  const { error: pairingError } = await supabase
    .from("tournament_pairings")
    .insert(pairingsWithMatchId);

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

  // Mark players with byes - ensure stats record exists first
  const byePlayers = result.pairings
    .filter((p) => p.isBye)
    .map((p) => p.alt1Id);

  if (byePlayers.length > 0) {
    for (const altId of byePlayers) {
      // First try to update existing record
      const { data: updated } = await supabase
        .from("tournament_player_stats")
        .update({ has_received_bye: true })
        .eq("tournament_id", tournamentId)
        .eq("alt_id", altId)
        .select("alt_id");

      // If no record was updated, insert a new one
      if (!updated || updated.length === 0) {
        await supabase.from("tournament_player_stats").insert({
          tournament_id: tournamentId,
          alt_id: altId,
          has_received_bye: true,
          match_wins: 0,
          match_losses: 0,
          matches_played: 0,
          game_wins: 0,
          game_losses: 0,
          match_points: 0,
          match_win_percentage: 0,
          game_win_percentage: 0,
          opponent_match_win_percentage: 0,
          opponent_history: [],
          standings_need_recalc: true,
        });
      }
    }
  }

  return {
    success: true,
    matchesCreated: matches.length,
    warnings: result.warnings,
    algorithm: result.algorithm,
  };
}

/**
 * Start a round (set status to active).
 * Also activates all non-bye matches and creates their games.
 */
export async function startRound(supabase: TypedClient, roundId: number) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get round with tournament and phase info (including best_of for game creation)
  const { data: round } = await supabase
    .from("tournament_rounds")
    .select(
      `
      id,
      status,
      round_number,
      phase_id,
      tournament_phases!inner (
        id,
        tournament_id,
        best_of,
        tournaments!tournament_phases_tournament_id_fkey!inner (
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
    best_of: number | null;
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

  // If not round 1, ensure previous round is completed
  if (round.round_number > 1) {
    const { data: previousRound } = await supabase
      .from("tournament_rounds")
      .select("id, status, round_number")
      .eq("phase_id", phase.id)
      .eq("round_number", round.round_number - 1)
      .maybeSingle();

    if (previousRound && previousRound.status !== "completed") {
      throw new Error(
        `Round ${previousRound.round_number} must be completed before starting round ${round.round_number}.`
      );
    }
  }

  // Get all matches in this round (needed for activation and game creation)
  const { data: matches } = await supabase
    .from("tournament_matches")
    .select("id, is_bye")
    .eq("round_id", roundId);

  if (!matches || matches.length === 0) {
    throw new Error(
      "Cannot start round without pairings. Generate pairings first."
    );
  }

  const now = new Date().toISOString();

  // Update round status
  const { error: roundError } = await supabase
    .from("tournament_rounds")
    .update({
      status: "active",
      start_time: now,
    })
    .eq("id", roundId);

  if (roundError) throw roundError;

  // Activate all non-bye matches
  const nonByeMatches = matches.filter((m) => !m.is_bye);
  if (nonByeMatches.length > 0) {
    const nonByeIds = nonByeMatches.map((m) => m.id);

    const { error: matchError } = await supabase
      .from("tournament_matches")
      .update({
        status: "active",
        start_time: now,
      })
      .in("id", nonByeIds);

    if (matchError) throw matchError;

    // Create games for each non-bye match
    const bestOf = phase.best_of ?? 3;
    const gameInserts = nonByeMatches.flatMap((match) =>
      Array.from({ length: bestOf }, (_, i) => ({
        match_id: match.id,
        game_number: i + 1,
      }))
    );

    const { error: gamesError } = await supabase
      .from("match_games")
      .insert(gameInserts);

    if (gamesError) throw gamesError;
  }

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
        tournaments!tournament_phases_tournament_id_fkey!inner (
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
      end_time: new Date().toISOString(),
    })
    .eq("id", roundId);

  if (error) throw error;

  // Recalculate standings after round completion
  await recalculateStandings(supabase, phase.tournament_id);

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
      tournaments!tournament_phases_tournament_id_fkey!inner (
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

  // Check for any active or pending rounds in this phase
  const { data: existingRounds } = await supabase
    .from("tournament_rounds")
    .select("id, round_number, status")
    .eq("phase_id", phaseId)
    .order("round_number", { ascending: false });

  if (existingRounds && existingRounds.length > 0) {
    // Check if there's an active round
    const activeRound = existingRounds.find((r) => r.status === "active");
    if (activeRound) {
      throw new Error(
        `Round ${activeRound.round_number} is still active. Complete it before creating a new round.`
      );
    }

    // Check if the previous round (highest round number) is completed
    const lastRound = existingRounds[0];
    if (lastRound && lastRound.status !== "completed") {
      throw new Error(
        `Round ${lastRound.round_number} must be completed before creating round ${roundNumber}.`
      );
    }

    // Validate round number sequence
    if (roundNumber !== (lastRound?.round_number ?? 0) + 1) {
      throw new Error(
        `Invalid round number. Expected ${(lastRound?.round_number ?? 0) + 1}, got ${roundNumber}.`
      );
    }
  } else if (roundNumber !== 1) {
    throw new Error("First round must be round number 1.");
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
 * Delete a pending round and all its matches/pairings.
 * Only works if round status is 'pending'.
 */
export async function deleteRoundAndMatches(
  supabase: TypedClient,
  roundId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get round with tournament info for permission check
  const { data: round } = await supabase
    .from("tournament_rounds")
    .select(
      `
      id,
      status,
      round_number,
      phase_id,
      tournament_phases!inner (
        id,
        tournament_id,
        tournaments!tournament_phases_tournament_id_fkey!inner (
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
    id: number;
    tournament_id: number;
    tournaments: {
      organization_id: number;
      organizations: { owner_user_id: string };
    };
  };

  // Verify permission
  if (phase.tournaments.organizations.owner_user_id !== user.id) {
    throw new Error("You don't have permission to delete this round");
  }

  // Only allow deleting pending rounds
  if (round.status !== "pending") {
    throw new Error(
      `Cannot delete round with status "${round.status}". Only pending rounds can be deleted.`
    );
  }

  // Delete pairings for matches in this round
  const { data: matchIds } = await supabase
    .from("tournament_matches")
    .select("id")
    .eq("round_id", roundId);

  if (matchIds && matchIds.length > 0) {
    const ids = matchIds.map((m) => m.id);

    // Delete pairings that reference these matches
    await supabase.from("tournament_pairings").delete().eq("round_id", roundId);

    // Delete the matches
    await supabase.from("tournament_matches").delete().eq("round_id", roundId);
  }

  // Delete the round
  const { error } = await supabase
    .from("tournament_rounds")
    .delete()
    .eq("id", roundId);

  if (error) throw error;

  return { success: true };
}
