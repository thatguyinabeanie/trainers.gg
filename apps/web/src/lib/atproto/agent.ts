/**
 * AT Protocol Agent Factory (Web)
 *
 * Web-specific agent utilities that integrate with Supabase auth and OAuth.
 * Re-exports shared utilities from @trainers/atproto.
 */

import { Agent } from "@atproto/api";
import { getAtprotoSession } from "./oauth-client";
import { createClient } from "@/lib/supabase/server";

// Re-export shared utilities
export {
  getPublicAgent,
  withErrorHandling,
  BlueskyAuthError,
  BlueskyApiError,
} from "@trainers/atproto";

// Import for local use
import { BlueskyAuthError } from "@trainers/atproto";

/**
 * Get an authenticated Agent for a specific DID
 *
 * This restores the OAuth session from the database and returns
 * an Agent that can make authenticated API calls on behalf of the user.
 *
 * @param did - The AT Protocol DID (e.g., "did:plc:xxx")
 * @returns An authenticated Agent instance
 * @throws BlueskyAuthError if no session exists for the DID
 */
export async function getAuthenticatedAgent(did: string): Promise<Agent> {
  try {
    const session = await getAtprotoSession(did);

    if (!session) {
      throw new BlueskyAuthError(
        "No Bluesky session found. Please sign in again."
      );
    }

    // The OAuthSession from @atproto/oauth-client-node can be used directly
    // with the Agent constructor - it implements the SessionManager interface
    return new Agent(session);
  } catch (error) {
    if (error instanceof BlueskyAuthError) {
      throw error;
    }

    // Handle specific OAuth errors
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        throw new BlueskyAuthError(
          "Your Bluesky session has expired. Please sign in again."
        );
      }
      if (error.message.includes("revoked")) {
        throw new BlueskyAuthError(
          "Your Bluesky session was revoked. Please sign in again."
        );
      }
    }

    console.error("Failed to restore Bluesky session:", error);
    throw new BlueskyAuthError(
      "Failed to authenticate with Bluesky. Please try signing in again."
    );
  }
}

/**
 * Get the authenticated Agent for the current logged-in user
 *
 * This reads the current Supabase session to get the user's DID,
 * then returns an authenticated Agent for that DID.
 *
 * @returns An authenticated Agent for the current user, or null if not authenticated
 */
export async function getCurrentUserAgent(): Promise<Agent | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get the user's DID from the users table
  const { data: userData } = await supabase
    .from("users")
    .select("did")
    .eq("id", user.id)
    .maybeSingle();

  if (!userData?.did) {
    return null;
  }

  try {
    return await getAuthenticatedAgent(userData.did);
  } catch {
    // Session may have expired - return null instead of throwing
    return null;
  }
}

/**
 * Get the current user's DID if they have a linked Bluesky account
 *
 * @returns The user's DID or null if not authenticated/linked
 */
export async function getCurrentUserDid(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: userData } = await supabase
    .from("users")
    .select("did")
    .eq("id", user.id)
    .maybeSingle();

  return userData?.did ?? null;
}
