import { z } from "zod";
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";

// Social links schema
export const socialLinksSchema = z.object({
  twitter: z.string().url().optional(),
  youtube: z.string().url().optional(),
  twitch: z.string().url().optional(),
  discord: z.string().optional(),
});

// User settings schema
export const userSettingsSchema = z.object({
  crossPostToBluesky: z.boolean().default(true),
  defaultFeedView: z.enum(["pokemon", "all"]).default("pokemon"),
});

// Game preferences
export const gamePreferencesSchema = z.array(
  z.enum(["VGC", "Showdown", "Draft", "Casual", "TCG", "Unite", "Go"])
);

// User profile update schema
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1)
    .max(64)
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    })
    .optional(),
  bio: z
    .string()
    .max(256)
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    })
    .optional(),
  location: z.string().max(64).optional(),
  gamePreferences: gamePreferencesSchema.optional(),
  socialLinks: socialLinksSchema.optional(),
});

// User settings update schema
export const updateSettingsSchema = z.object({
  crossPostToBluesky: z.boolean().optional(),
  defaultFeedView: z.enum(["pokemon", "all"]).optional(),
});

// Bluesky user info (from OAuth)
export const blueskyUserSchema = z.object({
  did: z.string().startsWith("did:"),
  handle: z.string(),
  displayName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().optional(),
});

// Types
export type SocialLinks = z.infer<typeof socialLinksSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type GamePreferences = z.infer<typeof gamePreferencesSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type BlueskyUser = z.infer<typeof blueskyUserSchema>;
