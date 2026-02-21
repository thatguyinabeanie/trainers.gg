import { z } from "zod";

/**
 * Schema for a player submitting their game winner selection.
 */
export const submitGameSelectionSchema = z.object({
  gameId: z.number().int().positive("Game ID must be a positive integer"),
  selectedWinnerAltId: z
    .number()
    .int()
    .positive("Winner alt ID must be a positive integer"),
});

/**
 * Schema for sending a message in match chat.
 */
export const sendMatchMessageSchema = z.object({
  altId: z.number().int().positive("Alt ID must be a positive integer"),
  content: z
    .string()
    .min(1, "Message content is required")
    .max(500, "Message must not exceed 500 characters"),
  messageType: z.enum(["player", "judge"]).default("player"),
});

/**
 * Schema for creating games in a match (judge action).
 */
export const createMatchGamesSchema = z.object({
  numberOfGames: z
    .number()
    .int()
    .min(1, "At least 1 game required")
    .max(9, "At most 9 games allowed"),
});

/**
 * Schema for a judge overriding a game result.
 */
export const judgeOverrideSchema = z.object({
  gameId: z.number().int().positive("Game ID must be a positive integer"),
  winnerAltId: z
    .number()
    .int()
    .positive("Winner alt ID must be a positive integer"),
});

/**
 * Schema for a judge resetting a game result.
 */
export const judgeResetSchema = z.object({
  gameId: z.number().int().positive("Game ID must be a positive integer"),
});

// Types
export type SubmitGameSelectionInput = z.infer<
  typeof submitGameSelectionSchema
>;
export type SendMatchMessageInput = z.infer<typeof sendMatchMessageSchema>;
export type CreateMatchGamesInput = z.infer<typeof createMatchGamesSchema>;
export type JudgeOverrideInput = z.infer<typeof judgeOverrideSchema>;
export type JudgeResetInput = z.infer<typeof judgeResetSchema>;
