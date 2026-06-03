"use server";

/**
 * Server actions for the coach self-edit dashboard page.
 * The user-scoped client is intentional — RLS enforces ownership.
 */

import { updateTag } from "next/cache";

import { coachProfileSchema } from "@trainers/validators";
import { updateCoachProfile } from "@trainers/supabase/mutations";

import { createClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

/**
 * Allow a coach to update their own profile.
 * Guards: authenticated, is_coach must be true.
 * Cache invalidation: COACHES_LIST + per-handle coach profile tag.
 */
export async function updateCoachProfileAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = coachProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: me, error: meError } = await supabase
    .from("users")
    .select("is_coach, username")
    .eq("id", user.id)
    .maybeSingle();

  if (meError) {
    return {
      success: false,
      error: meError.message ?? "Failed to load user",
    };
  }
  if (!me?.is_coach) return { success: false, error: "Not a coach" };

  try {
    await updateCoachProfile(supabase, user.id, parsed.data);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save",
    };
  }

  // Invalidate both the coaches list and this coach's public profile cache
  updateTag(CacheTags.COACHES_LIST);
  if (me.username) {
    updateTag(CacheTags.coachProfile(me.username));
  }

  return { success: true };
}
