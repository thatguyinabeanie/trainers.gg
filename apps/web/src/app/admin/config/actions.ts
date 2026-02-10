"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import {
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@trainers/supabase";
import type { Json } from "@trainers/supabase/types";

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
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    const supabase = createServiceRoleClient();
    await createFeatureFlag(supabase, data, adminCheck.userId);

    return { success: true };
  } catch (err) {
    console.error("Error creating feature flag:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
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
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    const supabase = createServiceRoleClient();
    await updateFeatureFlag(supabase, id, data, adminCheck.userId);

    return { success: true };
  } catch (err) {
    console.error("Error updating feature flag:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Delete a feature flag.
 * Requires admin + sudo mode.
 */
export async function deleteFlagAction(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    const supabase = createServiceRoleClient();
    await deleteFeatureFlag(supabase, id, adminCheck.userId);

    return { success: true };
  } catch (err) {
    console.error("Error deleting feature flag:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
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
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    const supabase = createServiceRoleClient();
    await createAnnouncement(supabase, data, adminCheck.userId);

    return { success: true };
  } catch (err) {
    console.error("Error creating announcement:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
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
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    const supabase = createServiceRoleClient();
    await updateAnnouncement(supabase, id, data, adminCheck.userId);

    return { success: true };
  } catch (err) {
    console.error("Error updating announcement:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Delete an announcement.
 * Requires admin + sudo mode.
 */
export async function deleteAnnouncementAction(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    const supabase = createServiceRoleClient();
    await deleteAnnouncement(supabase, id, adminCheck.userId);

    return { success: true };
  } catch (err) {
    console.error("Error deleting announcement:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}
