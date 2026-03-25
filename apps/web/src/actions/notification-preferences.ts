/**
 * Notification Preferences Server Actions
 */

"use server";

import {
  notificationPreferencesSchema,
  type ActionResult,
  type NotificationPreferences,
} from "@trainers/validators";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@trainers/supabase";
import { withAction } from "./utils";

/**
 * Get the current user's notification preferences.
 * Returns null if no preferences row exists (all defaults enabled).
 */
export async function getNotificationPreferencesAction(): Promise<
  ActionResult<{ preferences: Record<string, boolean> | null }>
> {
  return withAction(async () => {
    const user = await getUser();
    if (!user) throw new Error("Not authenticated");

    const supabase = await createClient();
    const preferences = await getNotificationPreferences(supabase, user.id);
    return { preferences };
  }, "Failed to load notification preferences");
}

/**
 * Update the current user's notification preferences.
 * Creates a row if none exists, or updates the existing one.
 */
export async function updateNotificationPreferencesAction(
  preferences: NotificationPreferences
): Promise<ActionResult<{ success: true }>> {
  return withAction(async () => {
    const user = await getUser();
    if (!user) throw new Error("Not authenticated");

    // Validate the preferences shape
    const validated = notificationPreferencesSchema.parse(preferences);

    const supabase = await createClient();
    await upsertNotificationPreferences(supabase, user.id, validated);
    return { success: true as const };
  }, "Failed to save notification preferences");
}
