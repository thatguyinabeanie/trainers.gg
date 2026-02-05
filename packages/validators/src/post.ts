import { z } from "zod";
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";

// Post creation schema
export const createPostSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(300) // Bluesky limit is 300 chars
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    }),
  crossPostToBluesky: z.boolean().default(true),
});

// Post engagement
export const postEngagementSchema = z.object({
  uri: z.string(),
  cid: z.string(),
});

// Types
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type PostEngagement = z.infer<typeof postEngagementSchema>;
