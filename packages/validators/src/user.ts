import { z } from "zod";
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";

// =============================================================================
// Shared PII field schemas (used in profile.ts and signup/onboarding flows)
// =============================================================================

/**
 * First name — up to 64 characters, optional.
 * Empty string is accepted and treated as "clear" by the RPC layer.
 */
export const firstNameSchema = z
  .string()
  .trim()
  .max(64, "First name must be 64 characters or less");

/**
 * Last name — up to 64 characters, optional.
 * Empty string is accepted and treated as "clear" by the RPC layer.
 */
export const lastNameSchema = z
  .string()
  .trim()
  .max(64, "Last name must be 64 characters or less");

/**
 * Birth date schema.
 * - Accepts YYYY-MM-DD date strings (set / update path)
 * - Accepts empty string "" to represent "clear this field"
 * - Rejects any other non-empty string that doesn't match the date format
 */
export const birthDateSchema = z
  .string()
  .trim()
  .refine(
    (val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val),
    "Birth date must be in YYYY-MM-DD format"
  );

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
  location: z
    .string()
    .trim()
    .max(64)
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    })
    .optional(),
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

/**
 * Sprite style preference for Pokemon display.
 */
export const spritePreferenceSchema = z.enum(["gen5", "gen5ani", "ani"]);

/**
 * Schema for updating sprite preference.
 */
export const updateSpritePreferenceSchema = z.object({
  spritePreference: spritePreferenceSchema,
});

// Types
export type SocialLinks = z.infer<typeof socialLinksSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type GamePreferences = z.infer<typeof gamePreferencesSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type BlueskyUser = z.infer<typeof blueskyUserSchema>;
export type SpritePreference = z.infer<typeof spritePreferenceSchema>;
export type BirthDate = z.infer<typeof birthDateSchema>;
