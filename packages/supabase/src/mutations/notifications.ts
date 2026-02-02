import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;

/**
 * Mark a single notification as read.
 * RLS ensures only the notification's owner can update it.
 */
export async function markNotificationRead(
  supabase: TypedClient,
  notificationId: number
) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);

  if (error) throw error;
}

/**
 * Mark all unread notifications as read for the current user.
 * RLS ensures only the user's own notifications are updated.
 */
export async function markAllNotificationsRead(supabase: TypedClient) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) throw error;
}

/**
 * Delete a notification.
 * RLS ensures only the notification's owner can delete it.
 */
export async function deleteNotification(
  supabase: TypedClient,
  notificationId: number
) {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) throw error;
}
