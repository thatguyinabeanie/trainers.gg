"use server";

import { z } from "zod";
import {
  withAdminAction,
  type ActionResult,
} from "@/lib/auth/with-admin-action";
import {
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@trainers/supabase";
import type { Json } from "@trainers/supabase/types";

// -- Zod Schemas --

const flagIdSchema = z.number().int().positive();
const announcementIdSchema = z.number().int().positive();
const announcementTypeSchema = z.enum(["info", "warning", "error", "success"]);

const createFlagSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  metadata: z.any().optional(),
});

const updateFlagDataSchema = z.object({
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  metadata: z.any().optional(),
});

const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type: announcementTypeSchema,
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
});

const updateAnnouncementDataSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(2000).optional(),
  type: announcementTypeSchema.optional(),
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
});

// --- Feature Flag Actions ---

/**
 * Create a new feature flag.
 * Requires admin + sudo mode.
 */
export async function createFlagAction(data: {
  key: string;
  description?: string;
  enabled?: boolean;
  metadata?: Json;
}): Promise<ActionResult> {
  const parsed = createFlagSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid input: ${parsed.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await createFeatureFlag(supabase, parsed.data, adminUserId);
    return { success: true };
  }, "Error creating feature flag");
}

/**
 * Update an existing feature flag.
 * Requires admin + sudo mode.
 */
export async function updateFlagAction(
  id: number,
  data: {
    description?: string;
    enabled?: boolean;
    metadata?: Json;
  }
): Promise<ActionResult> {
  const parsedId = flagIdSchema.safeParse(id);
  if (!parsedId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedId.error.issues[0]?.message}`,
    };
  }
  const parsedData = updateFlagDataSchema.safeParse(data);
  if (!parsedData.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedData.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await updateFeatureFlag(
      supabase,
      parsedId.data,
      parsedData.data,
      adminUserId
    );
    return { success: true };
  }, "Error updating feature flag");
}

/**
 * Delete a feature flag.
 * Requires admin + sudo mode.
 */
export async function deleteFlagAction(id: number): Promise<ActionResult> {
  const parsedId = flagIdSchema.safeParse(id);
  if (!parsedId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedId.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await deleteFeatureFlag(supabase, parsedId.data, adminUserId);
    return { success: true };
  }, "Error deleting feature flag");
}

// --- Announcement Actions ---

/**
 * Create a new announcement.
 * Requires admin + sudo mode.
 */
export async function createAnnouncementAction(data: {
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  start_at?: string;
  end_at?: string;
  is_active?: boolean;
}): Promise<ActionResult> {
  const parsed = createAnnouncementSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid input: ${parsed.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await createAnnouncement(supabase, parsed.data, adminUserId);
    return { success: true };
  }, "Error creating announcement");
}

/**
 * Update an existing announcement.
 * Requires admin + sudo mode.
 */
export async function updateAnnouncementAction(
  id: number,
  data: {
    title?: string;
    message?: string;
    type?: "info" | "warning" | "error" | "success";
    start_at?: string;
    end_at?: string | null;
    is_active?: boolean;
  }
): Promise<ActionResult> {
  const parsedId = announcementIdSchema.safeParse(id);
  if (!parsedId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedId.error.issues[0]?.message}`,
    };
  }
  const parsedData = updateAnnouncementDataSchema.safeParse(data);
  if (!parsedData.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedData.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await updateAnnouncement(
      supabase,
      parsedId.data,
      parsedData.data,
      adminUserId
    );
    return { success: true };
  }, "Error updating announcement");
}

/**
 * Delete an announcement.
 * Requires admin + sudo mode.
 */
export async function deleteAnnouncementAction(
  id: number
): Promise<ActionResult> {
  const parsedId = announcementIdSchema.safeParse(id);
  if (!parsedId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedId.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await deleteAnnouncement(supabase, parsedId.data, adminUserId);
    return { success: true };
  }, "Error deleting announcement");
}
