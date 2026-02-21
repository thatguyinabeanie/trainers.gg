import { z } from "zod";

/**
 * Announcement type for site-wide notifications.
 */
export const announcementTypeSchema = z.enum([
  "info",
  "warning",
  "error",
  "success",
]);

/**
 * Schema for creating a feature flag.
 */
export const createFeatureFlagSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  metadata: z.any().optional(),
});

/**
 * Schema for updating a feature flag.
 */
export const updateFeatureFlagSchema = z.object({
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  metadata: z.any().optional(),
});

/**
 * Schema for creating an announcement.
 */
export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type: announcementTypeSchema,
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
});

/**
 * Schema for updating an announcement.
 */
export const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(2000).optional(),
  type: announcementTypeSchema.optional(),
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
});

/**
 * Admin action reason (e.g., for suspensions/rejections).
 */
export const adminReasonSchema = z.string().trim().min(1).max(1000);

// Types
export type AnnouncementType = z.infer<typeof announcementTypeSchema>;
export type CreateFeatureFlagInput = z.infer<typeof createFeatureFlagSchema>;
export type UpdateFeatureFlagInput = z.infer<typeof updateFeatureFlagSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
