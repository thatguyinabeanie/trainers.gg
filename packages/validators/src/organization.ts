import { z } from "zod";
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";

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
});

// Types
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
