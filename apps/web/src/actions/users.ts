/**
 * User Settings Server Actions
 *
 * Wraps @trainers/supabase mutations for user preferences.
 * These enforce ownership checks and validation server-side.
 */

"use server";

import {
  type ActionResult,
  updateSpritePreferenceSchema,
  type SpritePreference,
} from "@trainers/validators";
import { createClient } from "@/lib/supabase/server";
import { withAction } from "./utils";

// --- Actions ---

/**
 * Update the authenticated user's sprite preference.
 */
export async function updateSpritePreferenceAction(
  spritePreference: SpritePreference
): Promise<ActionResult<void>> {
  return withAction(async () => {
    const validated = updateSpritePreferenceSchema.parse({ spritePreference });

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Not authenticated");
    }

    // Update sprite preference in users table
    const { error: updateError } = await supabase
      .from("users")
      .update({ sprite_preference: validated.spritePreference })
      .eq("id", user.id);

    if (updateError) {
      throw new Error(
        `Failed to update sprite preference: ${updateError.message}`
      );
    }
  }, "Failed to update sprite preference");
}
