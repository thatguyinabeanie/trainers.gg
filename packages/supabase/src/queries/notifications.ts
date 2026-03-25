import type { TypedClient } from "../client";
import type { Database } from "../types";

type NotificationType = Database["public"]["Enums"]["notification_type"];

/**
 * Get notifications for the current user, ordered by newest first.
 * RLS ensures only the user's own notifications are returned.
 *
 * @param options.types - Optional array of notification types to filter by.
 *   When provided, only notifications matching one of the given types are returned.
 *   When omitted or empty, all types are returned (backwards compatible).
 */
export async function getNotifications(
  supabase: TypedClient,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    types?: NotificationType[];
  } = {}
) {
  const { limit = 20, offset = 0, unreadOnly = false, types } = options;

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  if (types && types.length > 0) {
    query = query.in("type", types);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Get total count of notifications for the current user, with optional filters.
 * Used for pagination in the notification center.
 */
export async function getNotificationCount(
  supabase: TypedClient,
  options: { unreadOnly?: boolean; types?: NotificationType[] } = {}
) {
  const { unreadOnly = false, types } = options;

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact", head: true });

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  if (types && types.length > 0) {
    query = query.in("type", types);
  }

  const { count, error } = await query;

  if (error) throw error;
  return count ?? 0;
}

/**
 * Get the count of unread notifications for the current user.
 */
export async function getUnreadNotificationCount(supabase: TypedClient) {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .is("read_at", null);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Get active match notifications for the current user (unread match_ready or tournament_round).
 * Used for quick-nav to active matches.
 */
export async function getActiveMatchNotifications(supabase: TypedClient) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .is("read_at", null)
    .in("type", ["match_ready", "tournament_round"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
