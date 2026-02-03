/**
 * Notification Server Actions
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@trainers/supabase";
import type { ActionResult } from "./utils";

/**
 * Mark a single notification as read.
 */
export async function markNotificationReadAction(
  notificationId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await markNotificationRead(supabase, notificationId);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to mark notification as read"),
    };
  }
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsReadAction(): Promise<
  ActionResult<{ success: true }>
> {
  try {
    const supabase = await createClient();
    await markAllNotificationsRead(supabase);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to mark all as read"),
    };
  }
}

/**
 * Delete a notification.
 */
export async function deleteNotificationAction(
  notificationId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await deleteNotification(supabase, notificationId);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete notification"),
    };
  }
}
