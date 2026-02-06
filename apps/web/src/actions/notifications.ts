/**
 * Notification Server Actions
 */

"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@trainers/supabase";
import { type ActionResult } from "@trainers/validators";
import { withAction } from "./utils";

const idSchema = z.number().int().positive();

/**
 * Mark a single notification as read.
 */
export async function markNotificationReadAction(
  notificationId: number
): Promise<ActionResult<{ success: true }>> {
  return withAction(async () => {
    const id = idSchema.parse(notificationId);
    const supabase = await createClient();
    await markNotificationRead(supabase, id);
    return { success: true as const };
  }, "Failed to mark notification as read");
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsReadAction(): Promise<
  ActionResult<{ success: true }>
> {
  return withAction(async () => {
    const supabase = await createClient();
    await markAllNotificationsRead(supabase);
    return { success: true as const };
  }, "Failed to mark all as read");
}

/**
 * Delete a notification.
 */
export async function deleteNotificationAction(
  notificationId: number
): Promise<ActionResult<{ success: true }>> {
  return withAction(async () => {
    const id = idSchema.parse(notificationId);
    const supabase = await createClient();
    await deleteNotification(supabase, id);
    return { success: true as const };
  }, "Failed to delete notification");
}
