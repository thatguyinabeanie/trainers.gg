import type { TypedClient } from "../client";

/**
 * Get general UI preferences for a user.
 * Returns the preferences JSONB object, or null if no row exists.
 */
export async function getUserPreferences(
  supabase: TypedClient,
  userId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  // Cast the JSONB value to the expected shape
  return data.preferences as unknown as Record<string, unknown>;
}
