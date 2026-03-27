import { z } from "zod";
import { createOrganizationSchema } from "./organization";
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";

/** Optional handle field — empty string treated as omitted. */
const optionalHandle = z
  .string()
  .max(100)
  .or(z.literal(""))
  .optional()
  .transform((val) => val?.trim() || undefined);

/** Optional URL field — empty string treated as omitted. */
const optionalUrl = z
  .string()
  .url("Must be a valid URL")
  .or(z.literal(""))
  .optional()
  .transform((val) => val || undefined);

/**
 * Schema for submitting an organization request.
 * Extends createOrganizationSchema with required description,
 * required Discord invite code, and optional social profile links.
 */
export const submitOrganizationRequestSchema = createOrganizationSchema.extend({
  description: z
    .string()
    .min(1, "Description is required")
    .max(500)
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    }),
  discord_invite_code: z
    .string()
    .min(1, "Discord invite code is required")
    .max(100)
    .regex(
      /^[a-zA-Z0-9-]+$/,
      "Invite code can only contain letters, numbers, and hyphens"
    ),
  twitter_handle: optionalHandle,
  bluesky_handle: optionalHandle,
  instagram_handle: optionalHandle,
  youtube_handle: optionalHandle,
  twitch_handle: optionalHandle,
  other_url: optionalUrl,
});

export type SubmitOrganizationRequestInput = z.infer<
  typeof submitOrganizationRequestSchema
>;
