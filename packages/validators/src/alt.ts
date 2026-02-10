import { z } from "zod";
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";

/**
 * Schema for creating an alt (alternative player identity).
 * Validates username and optional battle tag.
 * display_name is auto-synced with username (not user-editable).
 */
export const createAltSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[\p{L}\p{N}_-]+$/u,
      "Username can only contain letters, numbers, underscores, and hyphens"
    )
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    }),
  battleTag: z
    .string()
    .max(20)
    .refine((val) => !val || !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    })
    .optional(),
});

/**
 * Schema for updating an alt.
 */
export const updateAltSchema = z.object({
  battleTag: z
    .string()
    .max(20)
    .refine((val) => !val || !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    })
    .optional(),
});

// Types
export type CreateAltInput = z.infer<typeof createAltSchema>;
export type UpdateAltInput = z.infer<typeof updateAltSchema>;
