import { type TypedClient, getCurrentUser, getCurrentAlt } from "./helpers";

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
          tournaments!tournament_phases_tournament_id_fkey!inner (
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
          tournaments!tournament_phases_tournament_id_fkey!inner (
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

  // Validate match is in progress (must be started first)
  if (match.status !== "active") {
    throw new Error(
      match.status === "pending"
        ? "Match must be started before reporting results"
        : `Cannot report result for match with status "${match.status}"`
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
