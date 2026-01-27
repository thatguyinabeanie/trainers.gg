"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const PDS_HOST = process.env.PDS_HOST || "https://pds.trainers.gg";

/**
 * Check if a handle is available on the PDS
 */
async function checkPdsHandleAvailable(handle: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${PDS_HOST}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`
    );

    // 400 with "Unable to resolve handle" means it's available
    if (response.status === 400) {
      return true;
    }

    // 200 means handle exists (not available)
    return false;
  } catch {
    // Network error - assume available but will fail at creation
    return true;
  }
}

/**
 * Generate a trainers.gg handle from a username
 */
function generateHandle(username: string): string {
  return `${username.toLowerCase()}.trainers.gg`;
}

export async function checkUsernameAvailability(username: string) {
  try {
    const supabase = await createClient();

    // Check if username exists in users table
    const { data: existingUser, error } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("Error checking username:", error);
      return {
        available: false,
        error: "Failed to check username availability",
      };
    }

    if (existingUser) {
      return { available: false, error: null };
    }

    // Also check PDS handle availability
    const handle = generateHandle(username);
    const pdsAvailable = await checkPdsHandleAvailable(handle);

    if (!pdsAvailable) {
      return {
        available: false,
        error: "This handle is already registered on Bluesky",
      };
    }

    return { available: true, error: null };
  } catch (error) {
    console.error("Error in checkUsernameAvailability:", error);
    return { available: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get the current user's data including pds_status
 */
export async function getCurrentUserData() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: userData } = await supabase
      .from("users")
      .select("id, username, pds_status, pds_handle, did, birth_date, country")
      .eq("id", user.id)
      .maybeSingle();

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
      // Get additional metadata from auth
      blueskyHandle: user.user_metadata?.bluesky_handle as string | undefined,
      authProvider: user.user_metadata?.auth_provider as string | undefined,
    };
  } catch (error) {
    console.error("Error in getCurrentUserData:", error);
    return null;
  }
}

export async function completeProfile(data: {
  username: string;
  birthDate: string;
  country: string;
}) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get current user data to check pds_status
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("pds_status")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchError || !userData) {
      return { success: false, error: "Failed to fetch user data" };
    }

    const pdsStatus = userData.pds_status as string | null;

    // If user has pending or failed PDS status, provision their PDS account
    // - pending: Social OAuth users who haven't completed onboarding yet
    // - failed: Previous PDS provisioning attempt failed, allow retry
    // - null: Legacy users who need PDS accounts
    if (
      pdsStatus === "pending" ||
      pdsStatus === "failed" ||
      pdsStatus === null
    ) {
      // Get the access token for the edge function call
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return { success: false, error: "No active session" };
      }

      // Call the provision-pds edge function
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        console.error("NEXT_PUBLIC_SUPABASE_URL is not configured");
        return { success: false, error: "Server configuration error" };
      }

      // Use AbortController for timeout (30s - enough for PDS operations)
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
            body: JSON.stringify({ username: data.username.toLowerCase() }),
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

      const provisionResult = await provisionResponse.json();

      if (!provisionResult.success) {
        // Handle specific error codes
        if (provisionResult.code === "HANDLE_TAKEN") {
          return {
            success: false,
            error: "This handle is already registered on Bluesky",
          };
        }
        if (provisionResult.code === "ALREADY_PROVISIONED") {
          // This is OK - continue with profile update
        } else {
          return {
            success: false,
            error:
              provisionResult.error || "Failed to create your Bluesky account",
          };
        }
      }
    }
    // If pds_status is 'external' (Bluesky OAuth), skip PDS provisioning
    // They already have a PDS account elsewhere

    // Update the user record in public.users
    const { error: updateError } = await supabase
      .from("users")
      .update({
        username: data.username.toLowerCase(),
        birth_date: data.birthDate,
        country: data.country.toUpperCase(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating user:", updateError);

      // Check for unique constraint violation
      if (updateError.code === "23505") {
        return { success: false, error: "Username is already taken" };
      }

      return { success: false, error: "Failed to update profile" };
    }

    // Also update the alt username
    const { error: altError } = await supabase
      .from("alts")
      .update({
        username: data.username.toLowerCase(),
      })
      .eq("user_id", user.id);

    if (altError) {
      console.error("Error updating alt:", altError);
      // Non-fatal, continue
    }

    // Update auth user metadata
    await supabase.auth.updateUser({
      data: {
        username: data.username.toLowerCase(),
        birth_date: data.birthDate,
        country: data.country.toUpperCase(),
        onboarding_completed: true,
      },
    });

    revalidatePath("/");
    return { success: true, error: null };
  } catch (error) {
    console.error("Error in completeProfile:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function isProfileComplete(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // Check if user has completed onboarding via metadata
    if (user.user_metadata?.onboarding_completed) {
      return true;
    }

    // Check if user has required fields in the database
    const { data: userData } = await supabase
      .from("users")
      .select("username, birth_date, country, pds_status")
      .eq("id", user.id)
      .maybeSingle();

    if (!userData) return false;

    // Profile is complete if all required fields are set AND PDS is provisioned
    const hasRequiredFields = !!(
      userData.username &&
      userData.birth_date &&
      userData.country
    );

    // PDS status must be 'active' (our PDS) or 'external' (their Bluesky PDS)
    const pdsStatus = userData.pds_status as string | null;
    const hasPds = pdsStatus === "active" || pdsStatus === "external";

    return hasRequiredFields && hasPds;
  } catch {
    return false;
  }
}
