"use server";

import {
  z,
  completeOnboardingSchema,
  pdsStatusSchema,
} from "@trainers/validators";
import { checkBotId } from "botid/server";
import { createClient } from "@/lib/supabase/server";
import { escapeLike } from "@trainers/utils";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

const PDS_HOST = process.env.PDS_HOST || "https://pds.trainers.gg";

/**
 * Complete the onboarding flow for OAuth users with temporary usernames.
 *
 * Updates the user's username, country, bio, and optional birth date.
 * Syncs the username to the main alt record and auth metadata.
 * Provisions a PDS account (@username.trainers.gg) if not already active.
 */
export async function completeOnboarding(data: {
  username: string;
  country: string;
  bio: string;
  birthDate?: string;
}) {
  // Skip BotID in E2E: headless Chromium is flagged as a bot
  const headerStore = await headers();
  const bypassSecret = headerStore.get("x-vercel-protection-bypass");
  const expectedSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const isE2E = !!(
    bypassSecret &&
    expectedSecret &&
    bypassSecret === expectedSecret
  );

  if (!isE2E) {
    const { isBot } = await checkBotId();
    if (isBot) return { success: false, error: "Access denied" };
  }

  try {
    const validated = completeOnboardingSchema.parse(data);

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Re-check username availability (race condition guard)
    const escaped = escapeLike(validated.username);

    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id")
      .ilike("username", escaped)
      .neq("id", user.id)
      .maybeSingle();

    if (existingUserError) {
      console.error("Error checking username in users:", existingUserError);
      return {
        success: false,
        error: "Unable to verify username availability",
      };
    }

    if (existingUser) {
      return { success: false, error: "Username is already taken" };
    }

    const { data: existingAlt, error: existingAltError } = await supabase
      .from("alts")
      .select("id, user_id")
      .ilike("username", escaped)
      .neq("user_id", user.id)
      .maybeSingle();

    if (existingAltError) {
      console.error("Error checking username in alts:", existingAltError);
      return {
        success: false,
        error: "Unable to verify username availability",
      };
    }

    if (existingAlt) {
      return { success: false, error: "Username is already taken" };
    }

    // Check PDS handle availability
    const pdsUsername =
      validated.username.toLowerCase().replace(/[^a-z0-9-]/g, "") ||
      `user-${user.id.slice(0, 8)}`;
    const handle = `${pdsUsername}.trainers.gg`;

    const handleAvailable = await checkPdsHandleAvailable(handle);
    if (!handleAvailable) {
      return {
        success: false,
        error: "This handle is already registered on Bluesky",
      };
    }

    // Update users table
    const { error: updateError } = await supabase
      .from("users")
      .update({
        username: validated.username,
        country: validated.country.toUpperCase(),
        bio: validated.bio,
        ...(validated.birthDate ? { birth_date: validated.birthDate } : {}),
      })
      .eq("id", user.id);

    if (updateError) {
      if (updateError.code === "23505") {
        return { success: false, error: "Username is already taken" };
      }
      console.error("Error updating user:", updateError);
      return { success: false, error: "Failed to update profile" };
    }

    // Get main alt ID and update alt record (non-blocking — log failures)
    const { data: userData } = await supabase
      .from("users")
      .select("main_alt_id")
      .eq("id", user.id)
      .maybeSingle();

    if (userData?.main_alt_id) {
      const { error: altError } = await supabase
        .from("alts")
        .update({
          username: validated.username,
          bio: validated.bio,
        })
        .eq("id", userData.main_alt_id);

      if (altError) {
        console.error("Error updating alt:", altError);
      }
    }

    // Update auth metadata so proxy gate clears
    const { error: authError } = await supabase.auth.updateUser({
      data: { username: validated.username },
    });

    if (authError) {
      console.error("Error updating auth metadata:", authError);
      return { success: false, error: "Failed to update auth metadata" };
    }

    // Provision PDS account (non-blocking failure)
    await provisionPds(supabase, user.id, pdsUsername);

    revalidatePath("/");
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message ?? "Invalid input",
      };
    }
    console.error("Error in completeOnboarding:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Provision a PDS account. Non-blocking — sets pds_status to 'failed'
 * on error so the user can retry later in settings.
 */
async function provisionPds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  pdsUsername: string
) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return;

    // Check current PDS status — only provision if pending/failed/null
    const { data: userData } = await supabase
      .from("users")
      .select("pds_status")
      .eq("id", userId)
      .maybeSingle();

    const pdsStatus = pdsStatusSchema.nullable().parse(userData?.pds_status);
    if (
      pdsStatus !== "pending" &&
      pdsStatus !== "failed" &&
      pdsStatus !== null
    ) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/provision-pds`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ username: pdsUsername }),
          signal: controller.signal,
        }
      );

      const result = await response.json();

      if (!result.success && result.code !== "ALREADY_PROVISIONED") {
        console.warn("PDS provisioning failed during onboarding:", result);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // Non-blocking — user can retry PDS provisioning later in settings
    console.warn("PDS provisioning error during onboarding:", error);
  }
}

/**
 * Check if a handle is available on the PDS.
 */
async function checkPdsHandleAvailable(handle: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(
      `${PDS_HOST}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
      { signal: controller.signal }
    );
    return response.status === 400;
  } catch {
    return true;
  } finally {
    clearTimeout(timeoutId);
  }
}
