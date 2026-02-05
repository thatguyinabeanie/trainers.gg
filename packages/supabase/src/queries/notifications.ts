import type { TypedClient } from "../client";

/**
 * Get notifications for the current user, ordered by newest first.
 * RLS ensures only the user's own notifications are returned.
 */
export async function getNotifications(
  supabase: TypedClient,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
) {
  const { limit = 20, offset = 0, unreadOnly = false } = options;

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
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
