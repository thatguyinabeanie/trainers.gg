"use server";

import {
  z,
  completeOnboardingSchema,
  pdsStatusSchema,
} from "@trainers/validators";
import { createClient } from "@/lib/supabase/server";
import { escapeLike } from "@trainers/utils";
import { invalidatePlayerDirectoryCaches } from "@/lib/cache-invalidation";
import { checkPdsHandleAvailable, derivePdsUsername } from "./pds-utils";
import { rejectBots } from "./utils";

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
  bio?: string;
  birthDate?: string;
}) {
  await rejectBots();

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
    const pdsUsername = derivePdsUsername(validated.username, user.id);
    const handle = `${pdsUsername}.trainers.gg`;

    const handleAvailable = await checkPdsHandleAvailable(handle);
    if (!handleAvailable) {
      return {
        success: false,
        error: "This handle is already registered on Bluesky",
      };
    }

    // Update users table (birth_date lives in the private schema — see RPC below)
    const { error: updateError } = await supabase
      .from("users")
      .update({
        username: validated.username,
        country: validated.country.toUpperCase(),
        bio: validated.bio || null,
      })
      .eq("id", user.id);

    if (updateError) {
      if (updateError.code === "23505") {
        return { success: false, error: "Username is already taken" };
      }
      console.error("Error updating user:", updateError);
      return { success: false, error: "Failed to update profile" };
    }

    // birth_date lives in the private schema — route to the dedicated RPC
    if (validated.birthDate) {
      const { error: piiError } = await supabase.rpc("update_my_user_pii", {
        p_birth_date: validated.birthDate,
      });
      if (piiError) {
        // Non-blocking: username/country/bio are already committed and
        // birth_date is optional. Hard-failing here would strand the user in a
        // confusing "onboarded but told it failed" state (and re-submitting is
        // awkward once the username is saved). Log and continue — the user can
        // set their birth date later in profile settings.
        console.error("Error updating birth date during onboarding:", piiError);
      }
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
          bio: validated.bio || null,
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

    // New user is now visible in the players directory and new members sidebar
    invalidatePlayerDirectoryCaches(validated.username);
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
      const { data: result, error: fnError } = await supabase.functions.invoke<{
        success: boolean;
        code?: string;
      }>("provision-pds", {
        body: { username: pdsUsername },
        signal: controller.signal,
      });

      // supabase.functions.invoke returns errors via the `error` field rather
      // than throwing — abort/timeout shows up as fnError with name "AbortError".
      if (fnError) {
        if (controller.signal.aborted || fnError.name === "AbortError") {
          console.warn("PDS provisioning timed out during onboarding");
        } else {
          console.warn("PDS provisioning failed during onboarding:", fnError);
        }
      } else if (
        result &&
        !result.success &&
        result.code !== "ALREADY_PROVISIONED"
      ) {
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
