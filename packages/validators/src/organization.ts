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
export const organizationSocialLinkSchema = z.object({
  platform: z.enum(SOCIAL_LINK_PLATFORMS),
  url: z.string().url("Must be a valid URL"),
  label: z.string().max(50).optional(),
});

/**
 * Schema for an array of social links.
 * Max 10 links per organization to prevent abuse.
 */
export const organizationSocialLinksSchema = z
  .array(organizationSocialLinkSchema)
  .max(10, "Maximum 10 social links allowed");

/**
 * Schema for creating an organization.
 * Validates name, slug, and optional description.
 */
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
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
 * Schema for updating an organization.
 */
export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
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
  socialLinks: organizationSocialLinksSchema.optional(),
});

// Types
export type OrganizationSocialLink = z.infer<
  typeof organizationSocialLinkSchema
>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
