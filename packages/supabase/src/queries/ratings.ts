import type { TypedClient } from "../client";

// ============================================================================
// Types
// ============================================================================

export type PlayerRating = {
  altId: number;
  format: string;
  rating: number;
  peakRating: number;
  gamesPlayed: number;
  skillBracket: "beginner" | "intermediate" | "advanced" | "expert";
  /** 1-based global rank among all rated players for this format */
  globalRank: number;
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch the rating for a specific alt and format.
 * Returns null if no rating record exists yet or if the player has no rated games.
 */
export async function getPlayerRating(
  supabase: TypedClient,
  altId: number,
  format = "overall"
): Promise<PlayerRating | null> {
  const { data, error } = await supabase
    .from("player_ratings")
    .select("alt_id, format, rating, peak_rating, games_played, skill_bracket")
    .eq("alt_id", altId)
    .eq("format", format)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch rating: ${error.message}`);
  if (!data) return null;

  // Compute global rank: number of rated players (games_played > 0) with a strictly higher rating + 1
  const { count, error: countError } = await supabase
    .from("player_ratings")
    .select("*", { count: "exact", head: true })
    .eq("format", format)
    .gt("games_played", 0)
    .gt("rating", data.rating);

  if (countError)
    throw new Error(`Failed to fetch rating rank: ${countError.message}`);

  return {
    altId: data.alt_id,
    format: data.format,
    rating: Number(data.rating),
    peakRating: Number(data.peak_rating),
    gamesPlayed: data.games_played,
    skillBracket: data.skill_bracket as PlayerRating["skillBracket"],
    globalRank: (count ?? 0) + 1,
  };
}
