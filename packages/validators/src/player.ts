import { z } from "zod";

/**
 * Query parameter validation schema for player tournament history.
 */
export const playerTournamentHistoryParamsSchema = z.object({
  altIds: z
    .string()
    .min(1)
    .transform((s) => s.split(",").map(Number))
    .pipe(z.array(z.number().int().positive())),
  format: z.string().max(50).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  status: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).max(100).optional(),
});

export type PlayerTournamentHistoryParams = z.infer<
  typeof playerTournamentHistoryParamsSchema
>;
