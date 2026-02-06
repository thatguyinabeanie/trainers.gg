/**
 * Notification Service Layer
 *
 * Pure business logic for notification operations.
 * Called by both Server Actions (web) and API Routes (mobile).
 */

import { createClient } from "@/lib/supabase/server";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@trainers/supabase";

// =============================================================================
// Queries
// =============================================================================

export async function getUserNotificationsService() {
  const supabase = await createClient();
  return await getNotifications(supabase);
}

// =============================================================================
// Mutations
// =============================================================================

export async function markNotificationReadService(notificationId: number) {
  const supabase = await createClient();
  return await markNotificationRead(supabase, notificationId);
}

export async function markAllNotificationsReadService() {
  const supabase = await createClient();
  return await markAllNotificationsRead(supabase);
}

export async function deleteNotificationService(notificationId: number) {
  const supabase = await createClient();
  return await deleteNotification(supabase, notificationId);
}
