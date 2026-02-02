import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;

/**
 * Get match games for a specific match (raw data, for staff/judges).
 * Returns all columns including blind selections — only use for staff views.
 */
export async function getMatchGames(supabase: TypedClient, matchId: number) {
  const { data, error } = await supabase
    .from("match_games")
    .select("*")
    .eq("match_id", matchId)
    .order("game_number", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get match games with opponent blind selections redacted.
 * Uses the SECURITY DEFINER RPC function that hides the opponent's
 * selection until the game reaches agreed/disputed/resolved status.
 */
export async function getMatchGamesForPlayer(
  supabase: TypedClient,
  matchId: number
) {
  const { data, error } = await supabase.rpc("get_match_games_for_player", {
    p_match_id: matchId,
  });

  if (error) throw error;
  return data;
}

/**
 * Get messages for a match, ordered chronologically.
 * RLS ensures only match participants and tournament staff can view.
 */
export async function getMatchMessages(
  supabase: TypedClient,
  matchId: number,
  options: { limit?: number; cursor?: string } = {}
) {
  const { limit = 100, cursor } = options;

  let query = supabase
    .from("match_messages")
    .select(
      `
      *,
      alt:alts(id, display_name, username, avatar_url)
    `
    )
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(limit);

  // Cursor-based pagination: fetch messages after a given timestamp
  if (cursor) {
    query = query.gt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Get a single match game by ID.
 */
export async function getMatchGame(supabase: TypedClient, gameId: number) {
  const { data, error } = await supabase
    .from("match_games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error) throw error;
  return data;
}
