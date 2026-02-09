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
    .refine((val) => [...val].length >= 3, {
      message: "Username must be at least 3 characters",
    })
    .refine((val) => [...val].length <= 20, {
      message: "Username must be at most 20 characters",
    })
    .refine((val) => /^[\p{L}\p{N}\p{Extended_Pictographic}_-]+$/u.test(val), {
      message:
        "Username can only contain letters, numbers, emoji, underscores, and hyphens",
    })
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
