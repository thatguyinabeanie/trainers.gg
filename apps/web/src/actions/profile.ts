"use server";

import { z, usernameSchema } from "@trainers/validators";
import { checkBotId } from "botid/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { escapeLike } from "@trainers/utils";

const PDS_HOST = process.env.PDS_HOST || "https://pds.trainers.gg";

/**
 * Check if a handle is available on the PDS.
 * Returns true if available, false if taken.
 * On network errors, assumes available (provisioning will catch conflicts).
 */
async function checkPdsHandleAvailable(handle: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(
      `${PDS_HOST}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
      { signal: controller.signal }
    );

    // 400 means the handle could not be resolved — it's available
    if (response.status === 400) {
      return true;
    }

    // 200 means handle exists (not available)
    return false;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("PDS handle check timed out for:", handle);
    } else {
      console.warn("PDS handle check failed for:", handle, error);
    }
    // Assume available — provisioning will catch conflicts
    return true;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate a trainers.gg handle from a username.
 * AT Protocol handles must be ASCII lowercase alphanumeric + hyphens,
 * so non-matching characters (emoji, underscores, etc.) are stripped.
 * Returns empty string if the result is too short (< 3 chars).
 */
function generateHandle(username: string): string {
  const asciiPart = username.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (asciiPart.length < 3) return "";
  return `${asciiPart}.trainers.gg`;
}

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
});

// --- Actions ---

/**
 * Check if a username is available (excluding the current user)
 */
export async function checkUsernameAvailability(username: string) {
  try {
    // usernameSchema rejects temp_*/user_* placeholders + profanity
    const validated = usernameSchema.safeParse(username);
    if (!validated.success) {
      return {
        available: false,
        error: validated.error.errors[0]?.message ?? "Invalid username",
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const escaped = escapeLike(username);

    // Check users table (case-insensitive, excluding self)
    const usersQuery = supabase
      .from("users")
      .select("id")
      .ilike("username", escaped);

    if (user) {
      usersQuery.neq("id", user.id);
    }

    const { data: existingUser, error: usersError } =
      await usersQuery.maybeSingle();

    if (usersError) {
      console.error("Error checking username in users:", usersError);
      return {
        available: false,
        error: "Failed to check username availability",
      };
    }

    if (existingUser) {
      return { available: false, error: null };
    }

    // Check alts table (case-insensitive, excluding current user's alts)
    const altsQuery = supabase
      .from("alts")
      .select("id")
      .ilike("username", escaped);

    if (user) {
      altsQuery.neq("user_id", user.id);
    }

    const { data: existingAlt, error: altsError } =
      await altsQuery.maybeSingle();

    if (altsError) {
      console.error("Error checking username in alts:", altsError);
      return {
        available: false,
        error: "Failed to check username availability",
      };
    }

    if (existingAlt) {
      return { available: false, error: null };
    }

    // Check PDS handle availability (skip for emoji-only usernames)
    const handle = generateHandle(username);
    if (handle) {
      const pdsAvailable = await checkPdsHandleAvailable(handle);

      if (!pdsAvailable) {
        return {
          available: false,
          error: "This handle is already registered on Bluesky",
        };
      }
    }

    return { available: true, error: null };
  } catch (error) {
    console.error("Error in checkUsernameAvailability:", error);
    return { available: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get the current user's profile data
 */
export async function getCurrentUserProfile() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("id, username, pds_status, pds_handle, did, birth_date, country")
      .eq("id", user.id)
      .maybeSingle();

    if (dbError) {
      console.error("Error fetching user profile:", dbError);
      return null;
    }

    if (!userData) return null;

    return {
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
    };
  } catch (error) {
    console.error("Error in getCurrentUserProfile:", error);
    return null;
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
}) {
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

      const pdsStatus = userData.pds_status as string | null;

      // If PDS is pending, failed, or null — provision a new PDS account
      if (
        pdsStatus === "pending" ||
        pdsStatus === "failed" ||
        pdsStatus === null
      ) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          return { success: false, error: "No active session" };
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
          console.error("NEXT_PUBLIC_SUPABASE_URL is not configured");
          return { success: false, error: "Server configuration error" };
        }

        // Call provision-pds edge function (30s timeout)
        // PDS handles must be ASCII — derive from username
        const pdsUsername =
          validated.username!.toLowerCase().replace(/[^a-z0-9-]/g, "") ||
          `user-${user.id.slice(0, 8)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30_000);

        let provisionResponse: Response;
        try {
          provisionResponse = await fetch(
            `${supabaseUrl}/functions/v1/provision-pds`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                username: pdsUsername,
              }),
              signal: controller.signal,
            }
          );
        } catch (fetchError) {
          if (fetchError instanceof Error && fetchError.name === "AbortError") {
            return {
              success: false,
              error: "Request timed out. Please try again.",
            };
          }
          console.error("Failed to call provision-pds:", fetchError);
          return {
            success: false,
            error: "Failed to connect to server. Please try again.",
          };
        } finally {
          clearTimeout(timeoutId);
        }

        let provisionResult: {
          success?: boolean;
          code?: string;
          error?: string;
        };
        try {
          provisionResult = await provisionResponse.json();
        } catch {
          console.error(
            "Failed to parse provision-pds response:",
            provisionResponse.status
          );
          return {
            success: false,
            error: "Failed to create your Bluesky account. Please try again.",
          };
        }

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
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          return { success: false, error: "No active session" };
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
          console.error("NEXT_PUBLIC_SUPABASE_URL is not configured");
          return { success: false, error: "Server configuration error" };
        }

        // PDS handles must be ASCII — derive from username
        const pdsUsername =
          validated.username!.toLowerCase().replace(/[^a-z0-9-]/g, "") ||
          `user-${user.id.slice(0, 8)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30_000);

        let updateResponse: Response;
        try {
          updateResponse = await fetch(
            `${supabaseUrl}/functions/v1/update-pds-handle`,
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
        } catch (fetchError) {
          if (fetchError instanceof Error && fetchError.name === "AbortError") {
            return {
              success: false,
              error: "Request timed out. Please try again.",
            };
          }
          console.error("Failed to call update-pds-handle:", fetchError);
          return {
            success: false,
            error: "Failed to update Bluesky handle. Please try again.",
          };
        } finally {
          clearTimeout(timeoutId);
        }

        let updateResult: { success?: boolean; code?: string; error?: string };
        try {
          updateResult = await updateResponse.json();
        } catch {
          console.error(
            "Failed to parse update-pds-handle response:",
            updateResponse.status
          );
          return {
            success: false,
            error: "Failed to update Bluesky handle. Please try again.",
          };
        }

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

    // If username changed, also update the main alt's username + display_name
    if (hasUsernameChange) {
      const username = validated.username!;

      // Get main alt ID
      const { data: userData, error: altFetchError } = await supabase
        .from("users")
        .select("main_alt_id")
        .eq("id", user.id)
        .maybeSingle();

      if (altFetchError) {
        console.error("Error fetching main_alt_id:", altFetchError);
        return { success: false, error: "Failed to sync username to alt" };
      }

      if (userData?.main_alt_id) {
        const { error: altUpdateError } = await supabase
          .from("alts")
          .update({
            username,
            display_name: username,
          })
          .eq("id", userData.main_alt_id);

        if (altUpdateError) {
          console.error("Error updating main alt username:", altUpdateError);
          return { success: false, error: "Failed to sync username to alt" };
        }
      }

      // Update auth user metadata
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          username,
        },
      });

      if (authUpdateError) {
        console.error("Error updating auth metadata:", authUpdateError);
        return { success: false, error: "Failed to update auth metadata" };
      }
    }

    revalidatePath("/");
    return { success: true, error: null };
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
