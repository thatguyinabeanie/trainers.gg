import { z } from "zod";
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";

/**
 * Predefined social link platforms with auto-detected icons.
 * "custom" allows any URL with a user-provided label.
 */
export const SOCIAL_LINK_PLATFORMS = [
  "discord",
  "twitter",
  "youtube",
  "twitch",
  "tiktok",
  "instagram",
  "facebook",
  "reddit",
  "github",
  "bluesky",
  "threads",
  "mastodon",
  "linkedin",
  "patreon",
  "kofi",
  "website",
  "custom",
] as const;

export type SocialLinkPlatform = (typeof SOCIAL_LINK_PLATFORMS)[number];

/**
 * Schema for a single social link entry.
 * Stored in the organizations.social_links JSONB column.
 */
export const communitySocialLinkSchema = z.object({
  platform: z.enum(SOCIAL_LINK_PLATFORMS),
  url: z.string().url("Must be a valid URL"),
  label: z
    .string()
    .max(50)
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    })
    .optional(),
});

/**
 * Schema for an array of social links.
 */
export const communitySocialLinksSchema = z.array(communitySocialLinkSchema);

/**
 * Schema for creating a community.
 * Validates name, slug, and optional description.
 */
export const createCommunitySchema = z.object({
  name: z
    .string()
    .min(1, "Community name is required")
    .max(100)
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    }),
  slug: z
    .string()
    .min(1, "URL slug is required")
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "URL can only contain lowercase letters, numbers, and hyphens"
    )
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    }),
  description: z
    .string()
    .max(500)
    .refine((val) => !val || !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    })
    .optional(),
});

/**
 * Schema for updating a community.
 */
export const updateCommunitySchema = z.object({
  name: z
    .string()
    .min(1, "Community name is required")
    .max(100)
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    })
    .optional(),
  description: z
    .string()
    .max(500)
    .refine((val) => !val || !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    })
    .optional(),
  socialLinks: communitySocialLinksSchema.optional(),
});

// Types
export type CommunitySocialLink = z.infer<typeof communitySocialLinkSchema>;
export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;

// =============================================================================
// Community Permissions
// =============================================================================

export const REGISTRATION_MODES = ["anyone", "invite_only"] as const;
export type RegistrationMode = (typeof REGISTRATION_MODES)[number];

export const STAFF_INVITE_MODES = ["owner_only", "admins_and_above"] as const;
export type StaffInviteMode = (typeof STAFF_INVITE_MODES)[number];

export const TEAM_SHEET_VISIBILITY_OPTIONS = [
  "after_tournament",
  "after_round",
  "never",
] as const;
export type TeamSheetVisibility =
  (typeof TEAM_SHEET_VISIBILITY_OPTIONS)[number];

export const updateCommunityPermissionsSchema = z.object({
  isPublic: z.boolean().optional(),
  registrationMode: z.enum(REGISTRATION_MODES).optional(),
  staffInviteMode: z.enum(STAFF_INVITE_MODES).optional(),
  teamSheetVisibility: z.enum(TEAM_SHEET_VISIBILITY_OPTIONS).optional(),
});

export type UpdateCommunityPermissionsInput = z.infer<
  typeof updateCommunityPermissionsSchema
>;
