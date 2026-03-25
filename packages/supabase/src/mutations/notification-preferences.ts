import type { TypedClient } from "../client";
import type { Json } from "../types";

/**
 * Upsert notification preferences for a user.
 * Creates a new row if none exists, or updates the existing one.
 *
 * @param supabase - Supabase client (service role for Server Actions)
 * @param userId - The user's ID
 * @param preferences - Map of notification_type -> boolean (false = opted out)
 */
export async function upsertNotificationPreferences(
  supabase: TypedClient,
  userId: string,
  preferences: Record<string, boolean>
): Promise<void> {
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      preferences: preferences as unknown as Json,
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}
