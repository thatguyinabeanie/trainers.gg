import type { TypedClient } from "../client";
import type { Json } from "../types";

/**
 * Upsert general UI preferences for a user. Creates or updates the single row.
 */
export async function upsertUserPreferences(
  supabase: TypedClient,
  userId: string,
  preferences: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      preferences: preferences as unknown as Json,
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}
