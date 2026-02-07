/**
 * User Settings Server Actions
 *
 * Wraps @trainers/supabase mutations for user preferences.
 * These enforce ownership checks and validation server-side.
 */

"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@trainers/validators";
import { withAction } from "./utils";

// --- Input Schemas ---

const updateSpritePreferenceSchema = z.object({
  spritePreference: z.enum(["gen5", "gen5ani", "ani"], {
    errorMap: () => ({
      message: "Sprite preference must be gen5, gen5ani, or ani",
    }),
  }),
});

// --- Actions ---

/**
 * Update the authenticated user's sprite preference.
 */
export async function updateSpritePreferenceAction(
  spritePreference: "gen5" | "gen5ani" | "ani"
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
