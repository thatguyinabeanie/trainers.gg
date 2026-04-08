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
 * Fetch ratings with global rank for multiple alts in a single RPC call.
 * Returns a map keyed by altId. Alts without ratings are omitted.
 */
export async function getPlayerRatingsBulk(
  supabase: TypedClient,
  altIds: number[],
  format = "overall"
): Promise<Record<number, PlayerRating>> {
  if (altIds.length === 0) return {};

  const { data, error } = await supabase.rpc("get_player_ratings_with_rank", {
    p_alt_ids: altIds,
    p_format: format,
  });

  if (error) throw new Error(`Failed to fetch bulk ratings: ${error.message}`);
  if (!data || data.length === 0) return {};

  return Object.fromEntries(
    data.map((row) => [
      row.alt_id,
      {
        altId: row.alt_id,
        format: row.format,
        rating: Number(row.rating),
        peakRating: Number(row.peak_rating),
        gamesPlayed: row.games_played,
        skillBracket: row.skill_bracket as PlayerRating["skillBracket"],
        globalRank: Number(row.global_rank),
      } satisfies PlayerRating,
    ])
  );
}

/**
 * Fetch the rating for a specific alt and format.
 * Returns null if no rating record exists yet.
 */
export async function getPlayerRating(
  supabase: TypedClient,
  altId: number,
  format = "overall"
): Promise<PlayerRating | null> {
  const result = await getPlayerRatingsBulk(supabase, [altId], format);
  return result[altId] ?? null;
}
