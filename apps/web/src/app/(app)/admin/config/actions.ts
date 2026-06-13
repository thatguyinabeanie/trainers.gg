"use server";

import {
  positiveIntSchema,
  createFeatureFlagSchema,
  updateFeatureFlagSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "@trainers/validators";
import {
  withAdminAction,
  withAdminReadAction,
  type ActionResult,
} from "@/lib/auth/with-admin-action";
import { invalidateAnnouncementCaches } from "@/lib/cache-invalidation";
import {
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listFeatureFlags,
  listAnnouncements,
  type FeatureFlag,
} from "@trainers/supabase";
import type { Json, Tables } from "@trainers/supabase/types";

// --- Read Actions ---
//
// These reads require admin ROLE only — no sudo step-up. The proxy already
// gates the entire /admin surface to site admins; sudo is reserved for
// destructive mutations (create/update/delete below). Using withAdminReadAction
// here means the E2E admin helper's cookie-based auth satisfies the gate and
// the feature-flags/announcements list renders correctly.
//
// Note: service-role client is used so these reads survive any future
// Phase 2 Task 9 REVOKE on S-bucket base tables.

/**
 * Read all feature flags (admin-only, role check — no sudo required).
 * Returns `{ success: true, data }` with flags ordered by key, or an error.
 */
export async function getFeatureFlagsAction(): Promise<
  ActionResult & { data?: FeatureFlag[] }
> {
  return withAdminReadAction(async (supabase) => {
    const flags = await listFeatureFlags(supabase);
    return { success: true, data: flags };
  }, "Error loading feature flags");
}

/**
 * Read all announcements (admin-only, role check — no sudo required).
 * Returns `{ success: true, data }` ordered by created_at desc, or an error.
 */
export async function getAnnouncementsAction(): Promise<
  ActionResult & { data?: Tables<"announcements">[] }
> {
  return withAdminReadAction(async (supabase) => {
    const announcements = await listAnnouncements(supabase);
    return { success: true, data: announcements };
  }, "Error loading announcements");
}

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
  const parsed = createFeatureFlagSchema.safeParse(data);
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
  const parsedId = positiveIntSchema.safeParse(id);
  if (!parsedId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedId.error.issues[0]?.message}`,
    };
  }
  const parsedData = updateFeatureFlagSchema.safeParse(data);
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
  const parsedId = positiveIntSchema.safeParse(id);
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
    invalidateAnnouncementCaches();
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
  const parsedId = positiveIntSchema.safeParse(id);
  if (!parsedId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedId.error.issues[0]?.message}`,
    };
  }
  const parsedData = updateAnnouncementSchema.safeParse(data);
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
    invalidateAnnouncementCaches();
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
  const parsedId = positiveIntSchema.safeParse(id);
  if (!parsedId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedId.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await deleteAnnouncement(supabase, parsedId.data, adminUserId);
    invalidateAnnouncementCaches();
    return { success: true };
  }, "Error deleting announcement");
}
