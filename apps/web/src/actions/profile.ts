"use server";

import {
  z,
  usernameSchema,
  pdsStatusSchema,
  type ActionResult,
} from "@trainers/validators";
import { checkBotId } from "botid/server";
import { createClient } from "@/lib/supabase/server";
import { escapeLike } from "@trainers/utils";
import {
  invalidatePlayerProfileCaches,
  invalidatePlayerDirectoryCaches,
  invalidatePlayerRankingCaches,
} from "@/lib/cache-invalidation";
import { withAction } from "./utils";
import {
  checkPdsHandleAvailable,
  derivePdsUsername,
  generateHandle,
} from "./pds-utils";

const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must be in YYYY-MM-DD format")
    .optional(),
  country: z
    .string()
    .length(2, "Country must be a 2-letter ISO code")
    .optional(),
  bio: z.string().max(160, "Bio must be 160 characters or less").optional(),
});

// --- Interfaces ---

interface UserProfile {
  id: string;
  username: string | null;
  pdsStatus: "pending" | "active" | "failed" | "suspended" | "external" | null;
  pdsHandle: string | null;
  did: string | null;
  birthDate: string | null;
  country: string | null;
  mainAltId: number | null;
  altAvatarUrl: string | null;
  bio: string | null;
  showDiscordPublicly: boolean;
}

// --- Helpers ---

type InvokeOutcome<T> =
  | { kind: "ok"; data: T }
  | { kind: "timeout" }
  | { kind: "error"; cause: unknown };

/**
 * Invoke a Supabase edge function with a 30s abort timeout. Returns a tagged
 * outcome so callers can map to action error messages without duplicating
 * try/catch + AbortController plumbing for each function call.
 */
async function invokeWithTimeout<T>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  functionName: string,
  body: Record<string, unknown>
): Promise<InvokeOutcome<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  try {
    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body,
      signal: controller.signal,
    });
    if (error) {
      if (controller.signal.aborted || error.name === "AbortError") {
        return { kind: "timeout" };
      }
      return { kind: "error", cause: error };
    }
    return { kind: "ok", data: (data ?? {}) as T };
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === "AbortError" || controller.signal.aborted)
    ) {
      return { kind: "timeout" };
    }
    return { kind: "error", cause: err };
  } finally {
    clearTimeout(timeoutId);
  }
}

// --- Actions ---

/**
 * Check if a username is available (excluding the current user)
 */
export async function checkUsernameAvailability(
  username: string
): Promise<ActionResult<{ available: boolean; reason?: string }>> {
  try {
    // usernameSchema rejects temp_*/user_* placeholders + profanity
    const validated = usernameSchema.safeParse(username);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message ?? "Invalid username",
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const escaped = escapeLike(username);

    // Check users + alts tables in parallel (case-insensitive, excluding self)
    const usersQuery = supabase
      .from("users")
      .select("id")
      .ilike("username", escaped);

    const altsQuery = supabase
      .from("alts")
      .select("id")
      .ilike("username", escaped);

    if (user) {
      usersQuery.neq("id", user.id);
      altsQuery.neq("user_id", user.id);
    }

    const [usersResult, altsResult] = await Promise.all([
      usersQuery.maybeSingle(),
      altsQuery.maybeSingle(),
    ]);

    if (usersResult.error) {
      console.error("Error checking username in users:", usersResult.error);
      return {
        success: false,
        error: "Failed to check username availability",
      };
    }

    if (usersResult.data) {
      return { success: true, data: { available: false } };
    }

    if (altsResult.error) {
      console.error("Error checking username in alts:", altsResult.error);
      return {
        success: false,
        error: "Failed to check username availability",
      };
    }

    if (altsResult.data) {
      return { success: true, data: { available: false } };
    }

    // Check PDS handle availability (skip for emoji-only usernames)
    const handle = generateHandle(username);
    if (handle) {
      const pdsAvailable = await checkPdsHandleAvailable(handle);

      if (!pdsAvailable) {
        return {
          success: true,
          data: {
            available: false,
            reason: "This handle is already registered on Bluesky",
          },
        };
      }
    }

    return { success: true, data: { available: true } };
  } catch (error) {
    console.error("Error in checkUsernameAvailability:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get the current user's profile data
 */
export async function getCurrentUserProfile(): Promise<
  ActionResult<UserProfile | null>
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: true, data: null };

    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select(
        "id, username, pds_status, pds_handle, did, birth_date, country, main_alt_id, show_discord_publicly"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (dbError) {
      console.error("Error fetching user profile:", dbError);
      return { success: false, error: "Failed to fetch profile" };
    }

    if (!userData) return { success: true, data: null };

    // Fetch main alt's avatar URL and bio if a main alt exists
    let altAvatarUrl: string | null = null;
    let bio: string | null = null;
    if (userData.main_alt_id) {
      const { data: altData } = await supabase
        .from("alts")
        .select("avatar_url, bio")
        .eq("id", userData.main_alt_id)
        .maybeSingle();
      altAvatarUrl = altData?.avatar_url ?? null;
      bio = altData?.bio ?? null;
    }

    return {
      success: true,
      data: {
        id: userData.id,
        username: userData.username,
        pdsStatus: userData.pds_status as
          | "pending"
          | "active"
          | "failed"
          | "suspended"
          | "external"
          | null,
        pdsHandle: userData.pds_handle,
        did: userData.did,
        birthDate: userData.birth_date,
        country: userData.country,
        mainAltId: userData.main_alt_id,
        altAvatarUrl,
        bio,
        showDiscordPublicly: userData.show_discord_publicly,
      },
    };
  } catch (error) {
    console.error("Error in getCurrentUserProfile:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Update user profile (username, birth date, country).
 * Handles PDS provisioning for users with pending status.
 */
export async function updateProfile(data: {
  username?: string;
  birthDate?: string;
  country?: string;
  bio?: string;
}): Promise<ActionResult<void>> {
  const { isBot } = await checkBotId();
  if (isBot) return { success: false, error: "Access denied" };

  try {
    const validated = updateProfileSchema.parse(data);

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Fetch current username for cache invalidation
    const { data: currentUser } = await supabase
      .from("users")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    const currentUsername = currentUser?.username;

    // Build update data for the users table
    const userUpdate: Record<string, string> = {};
    const hasUsernameChange = validated.username !== undefined;

    if (hasUsernameChange) {
      // usernameSchema already rejects temp_*/user_* placeholders + profanity
      userUpdate.username = validated.username!;
    }

    if (validated.birthDate !== undefined) {
      userUpdate.birth_date = validated.birthDate;
    }

    if (validated.country !== undefined) {
      userUpdate.country = validated.country.toUpperCase();
    }

    // If changing username, check PDS status for provisioning
    if (hasUsernameChange) {
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("pds_status")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError || !userData) {
        return { success: false, error: "Failed to fetch user data" };
      }

      const pdsStatus = pdsStatusSchema.nullable().parse(userData.pds_status);

      type PdsResult = { success?: boolean; code?: string; error?: string };

      // If PDS is pending, failed, or null — provision a new PDS account
      if (
        pdsStatus === "pending" ||
        pdsStatus === "failed" ||
        pdsStatus === null
      ) {
        const pdsUsername = derivePdsUsername(validated.username!, user.id);
        const outcome = await invokeWithTimeout<PdsResult>(
          supabase,
          "provision-pds",
          { username: pdsUsername }
        );

        if (outcome.kind === "timeout") {
          return {
            success: false,
            error: "Request timed out. Please try again.",
          };
        }
        if (outcome.kind === "error") {
          console.error("Failed to call provision-pds:", outcome.cause);
          return {
            success: false,
            error: "Failed to connect to server. Please try again.",
          };
        }

        const provisionResult = outcome.data;
        if (!provisionResult.success) {
          if (provisionResult.code === "HANDLE_TAKEN") {
            return {
              success: false,
              error: "This handle is already registered on Bluesky",
            };
          }
          if (provisionResult.code !== "ALREADY_PROVISIONED") {
            return {
              success: false,
              error:
                provisionResult.error ||
                "Failed to create your Bluesky account",
            };
          }
          // ALREADY_PROVISIONED is OK — continue with profile update
        }
      }
      // If PDS is active, update the handle on existing PDS account
      else if (pdsStatus === "active") {
        const pdsUsername = derivePdsUsername(validated.username!, user.id);
        const outcome = await invokeWithTimeout<PdsResult>(
          supabase,
          "update-pds-handle",
          { username: pdsUsername }
        );

        if (outcome.kind === "timeout") {
          return {
            success: false,
            error: "Request timed out. Please try again.",
          };
        }
        if (outcome.kind === "error") {
          console.error("Failed to call update-pds-handle:", outcome.cause);
          return {
            success: false,
            error: "Failed to update Bluesky handle. Please try again.",
          };
        }

        const updateResult = outcome.data;
        if (!updateResult.success) {
          if (updateResult.code === "HANDLE_TAKEN") {
            return {
              success: false,
              error: "This handle is already registered on Bluesky",
            };
          }
          return {
            success: false,
            error: updateResult.error || "Failed to update Bluesky handle",
          };
        }
      }
      // If pds_status is 'external', skip PDS operations (external Bluesky account)
    }

    // Update the users table
    if (Object.keys(userUpdate).length > 0) {
      const { error: updateError } = await supabase
        .from("users")
        .update(userUpdate)
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating user:", updateError);

        if (updateError.code === "23505") {
          return { success: false, error: "Username is already taken" };
        }

        return { success: false, error: "Failed to update profile" };
      }
    }

    // Sync changes to the main alt (username, display_name, bio)
    const needsAltSync = hasUsernameChange || validated.bio !== undefined;

    if (needsAltSync) {
      const { data: userData, error: altFetchError } = await supabase
        .from("users")
        .select("main_alt_id")
        .eq("id", user.id)
        .maybeSingle();

      if (altFetchError) {
        console.error("Error fetching main_alt_id:", altFetchError);
        return { success: false, error: "Failed to sync profile to alt" };
      }

      if (userData?.main_alt_id) {
        const altUpdate: Record<string, string | null> = {};
        if (hasUsernameChange) {
          altUpdate.username = validated.username!;
          altUpdate.display_name = validated.username!;
        }
        if (validated.bio !== undefined) {
          altUpdate.bio = validated.bio || null;
        }

        const { error: altUpdateError } = await supabase
          .from("alts")
          .update(altUpdate)
          .eq("id", userData.main_alt_id);

        if (altUpdateError) {
          console.error("Error updating main alt:", altUpdateError);
          return { success: false, error: "Failed to sync profile to alt" };
        }
      }
    }

    if (hasUsernameChange) {
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { username: validated.username! },
      });

      if (authUpdateError) {
        console.error("Error updating auth metadata:", authUpdateError);
        return { success: false, error: "Failed to update auth metadata" };
      }
    }

    if (currentUsername) {
      invalidatePlayerProfileCaches(currentUsername);
    }
    if (hasUsernameChange && validated.username !== currentUsername) {
      invalidatePlayerDirectoryCaches(validated.username!);
      // Leaderboards display usernames — bust ranking caches on rename
      invalidatePlayerRankingCaches();
    }

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message ?? "Invalid input",
      };
    }
    console.error("Error in updateProfile:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Toggle the `is_public` visibility of an alt.
 * Validates that the alt belongs to the current user.
 */
export async function updateAltVisibilityAction(
  altId: number,
  isPublic: boolean
) {
  return withAction(async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: alt, error: altError } = await supabase
      .from("alts")
      .select("id, user_id")
      .eq("id", altId)
      .maybeSingle();

    if (altError || !alt) throw new Error("Alt not found");
    if (alt.user_id !== user.id)
      throw new Error("You can only update your own alts");

    const { error: updateError } = await supabase
      .from("alts")
      .update({ is_public: isPublic })
      .eq("id", altId);

    if (updateError) throw updateError;

    // Invalidate the public profile cache so /u/[handle] reflects the change
    const { data: userData } = await supabase
      .from("users")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (userData?.username) {
      invalidatePlayerProfileCaches(userData.username);
    }
  }, "Failed to update alt visibility");
}
