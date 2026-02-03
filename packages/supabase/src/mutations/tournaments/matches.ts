import { type TypedClient } from "./helpers";

/**
 * Start a match (set status to active) via SECURITY DEFINER RPC.
 */
export async function startMatch(supabase: TypedClient, matchId: number) {
  const { error } = await supabase.rpc("start_match", {
    p_match_id: matchId,
  });

  if (error) throw error;
  return { success: true };
}

/**
 * Report match result via SECURITY DEFINER RPC.
 */
export async function reportMatchResult(
  supabase: TypedClient,
  matchId: number,
  winnerId: number,
  player1Score: number,
  player2Score: number
) {
  const { error } = await supabase.rpc("report_match_result", {
    p_match_id: matchId,
    p_winner_id: winnerId,
    p_score1: player1Score,
    p_score2: player2Score,
  });

  if (error) throw error;
  return { success: true };
}
