import type { Database } from "../types";
import type { TypedClient } from "../client";

/**
 * Submit a game winner selection. The first report resolves the game immediately.
 * The function enforces that the caller can only modify their own selection column.
 */
export async function submitGameSelection(
  supabase: TypedClient,
  gameId: number,
  selectedWinnerAltId: number
) {
  const { data, error } = await supabase.rpc("submit_game_selection", {
    p_game_id: gameId,
    p_selected_winner_alt_id: selectedWinnerAltId,
  });

  if (error) throw error;
  const result = data as { success: boolean; error?: string };
  if (!result.success) {
    throw new Error(result.error ?? "Failed to submit game selection");
  }
  return result;
}

/**
 * Send a chat message in a match.
 * RLS ensures only match participants can send player messages,
 * and only tournament staff can send judge/system messages.
 */
export async function sendMatchMessage(
  supabase: TypedClient,
  matchId: number,
  altId: number,
  content: string,
  messageType: Database["public"]["Enums"]["match_message_type"] = "player"
) {
  const { data, error } = await supabase
    .from("match_messages")
    .insert({
      match_id: matchId,
      alt_id: altId,
      content,
      message_type: messageType,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Send a system message in a match (e.g., "Game 1 result locked").
 * Should be called from server actions using the service role client.
 */
export async function sendSystemMessage(
  supabase: TypedClient,
  matchId: number,
  content: string
) {
  const { data, error } = await supabase
    .from("match_messages")
    .insert({
      match_id: matchId,
      alt_id: null,
      content,
      message_type: "system",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create match games for a match (called when a match starts).
 * Creates the specified number of game rows in pending status.
 */
export async function createMatchGames(
  supabase: TypedClient,
  matchId: number,
  numberOfGames: number
) {
  const games = Array.from({ length: numberOfGames }, (_, i) => ({
    match_id: matchId,
    game_number: (i + 1) as number,
  }));

  const { data, error } = await supabase
    .from("match_games")
    .insert(games)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Judge: Override a game result (resolve a dispute or correct an error).
 * Only callable by org staff with tournament.manage permission (enforced by RLS).
 */
export async function judgeOverrideGame(
  supabase: TypedClient,
  gameId: number,
  winnerAltId: number,
  judgeAltId: number,
  notes?: string
) {
  const { data, error } = await supabase
    .from("match_games")
    .update({
      winner_alt_id: winnerAltId,
      status: "resolved",
      resolved_by: judgeAltId,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes ?? null,
    })
    .eq("id", gameId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Judge: Reset a specific game (clear selections, set back to pending).
 * Only callable by org staff with tournament.manage permission (enforced by RLS).
 */
export async function judgeResetGame(supabase: TypedClient, gameId: number) {
  const { data, error } = await supabase
    .from("match_games")
    .update({
      alt1_selection: null,
      alt2_selection: null,
      alt1_submitted_at: null,
      alt2_submitted_at: null,
      winner_alt_id: null,
      status: "pending",
      resolved_by: null,
      resolved_at: null,
      resolution_notes: null,
    })
    .eq("id", gameId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Judge: Reset all games in a match back to pending and clear the match score.
 * Uses a SECURITY DEFINER RPC to ensure both writes happen atomically.
 */
export async function resetMatch(supabase: TypedClient, matchId: number) {
  const { error } = await supabase.rpc("reset_match", {
    p_match_id: matchId,
  });

  if (error) throw error;
  return { id: matchId };
}
