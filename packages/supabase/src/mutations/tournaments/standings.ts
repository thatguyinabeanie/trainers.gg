import { type TypedClient, getCurrentUser, getCurrentAlt } from "./helpers";

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

  // Update player stats to mark as dropped - ensure record exists first
  const { data: updated } = await supabase
    .from("tournament_player_stats")
    .update({ is_dropped: true })
    .eq("tournament_id", tournamentId)
    .eq("alt_id", altId)
    .select("alt_id");

  // If no record was updated, insert a new one with is_dropped = true
  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabase
      .from("tournament_player_stats")
      .insert({
        tournament_id: tournamentId,
        alt_id: altId,
        is_dropped: true,
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
        has_received_bye: false,
        standings_need_recalc: true,
      });
    if (insertError) throw insertError;
  }

  // Update registration status
  const { error: regError } = await supabase
    .from("tournament_registrations")
    .update({ status: "dropped" })
    .eq("tournament_id", tournamentId)
    .eq("alt_id", altId);

  if (regError) throw regError;

  return { success: true };
}
