import { z } from "zod";

/**
 * Sort options for the player directory.
 */
export const PLAYER_SORT_OPTIONS = [
  "tournaments",
  "win_rate",
  "newest",
  "alphabetical",
] as const;

export type PlayerSortOption = (typeof PLAYER_SORT_OPTIONS)[number];

/**
 * Query parameter validation schema for player search.
 */
export const playerSearchParamsSchema = z.object({
  q: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  format: z.string().max(50).optional(),
  sort: z.enum(PLAYER_SORT_OPTIONS).optional(),
  page: z.coerce.number().int().min(1).max(100).optional(),
});

export type PlayerSearchParams = z.infer<typeof playerSearchParamsSchema>;
