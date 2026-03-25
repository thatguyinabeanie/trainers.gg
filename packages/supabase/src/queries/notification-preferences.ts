import type { TypedClient } from "../client";

/**
 * Get notification preferences for a user.
 * Returns the preferences JSONB object, or null if no preferences row exists
 * (null = all notifications enabled by default).
 *
 * Uses the server client (service role) so it can be called from Server Actions
 * with an explicit userId parameter.
 */
export async function getNotificationPreferences(
  supabase: TypedClient,
  userId: string
): Promise<Record<string, boolean> | null> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  // Cast the JSONB value to the expected shape
  return data.preferences as unknown as Record<string, boolean>;
}
