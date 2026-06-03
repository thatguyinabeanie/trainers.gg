/**
 * Builder Preferences Server Actions
 */

"use server";

import {
  builderPreferencesSchema,
  type ActionResult,
  type BuilderPreferences,
} from "@trainers/validators";
import { getUserPreferences, upsertUserPreferences } from "@trainers/supabase";

import { createClient, getUser } from "@/lib/supabase/server";

import { withAction } from "./utils";

/**
 * Get the current user's builder preferences.
 * Returns null when not signed in or no row exists (caller applies defaults).
 */
export async function getBuilderPreferencesAction(): Promise<
  ActionResult<{ preferences: BuilderPreferences | null }>
> {
  return withAction(async () => {
    const user = await getUser();
    if (!user) return { preferences: null };

    const supabase = await createClient();
    const raw = await getUserPreferences(supabase, user.id);
    if (!raw) return { preferences: null };
    // Coerce stored JSONB through the schema so unknown/legacy keys are dropped
    // and missing keys get defaults.
    return { preferences: builderPreferencesSchema.parse(raw) };
  }, "Failed to load builder preferences");
}

/**
 * Update the current user's builder preferences.
 * Returns an error result when not signed in (the client hook only calls this
 * when authenticated; signed-out users persist via localStorage instead).
 */
export async function updateBuilderPreferencesAction(
  preferences: BuilderPreferences
): Promise<ActionResult<{ success: true }>> {
  return withAction(async () => {
    const user = await getUser();
    if (!user) throw new Error("Not authenticated");

    const validated = builderPreferencesSchema.parse(preferences);
    const supabase = await createClient();
    await upsertUserPreferences(supabase, user.id, validated);
    return { success: true as const };
  }, "Failed to save builder preferences");
}
