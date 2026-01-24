/**
 * AT Protocol Agent Factory
 *
 * Provides utilities for creating authenticated and public Bluesky Agents.
 * The Agent is the primary interface for making AT Protocol API calls.
 */

import { Agent } from "@atproto/api";
import { getAtprotoSession } from "./oauth-client";
import { BSKY_PUBLIC_URL } from "./config";
import { createClient } from "@/lib/supabase/server";

/**
 * Error thrown when authentication is required but not available
 */
export class BlueskyAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlueskyAuthError";
  }
}

/**
 * Error thrown when a Bluesky API call fails
 */
export class BlueskyApiError extends Error {
  public readonly statusCode?: number;
  public readonly errorType?: string;

  constructor(message: string, statusCode?: number, errorType?: string) {
    super(message);
    this.name = "BlueskyApiError";
    this.statusCode = statusCode;
    this.errorType = errorType;
  }
}

/**
 * Get an authenticated Agent for a specific DID
 *
 * This restores the OAuth session from the database and returns
 * an Agent that can make authenticated API calls on behalf of the user.
 *
 * @param did - The AT Protocol DID (e.g., "did:plc:xxx")
 * @returns An authenticated Agent instance
 * @throws BlueskyAuthError if no session exists for the DID
 *
 * @example
 * ```typescript
 * const agent = await getAuthenticatedAgent("did:plc:abc123");
 * await agent.post({ text: "Hello Bluesky!" });
 * ```
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
 *
 * @example
 * ```typescript
 * const agent = await getCurrentUserAgent();
 * if (agent) {
 *   const timeline = await agent.getTimeline();
 * }
 * ```
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

/**
 * Get a public (unauthenticated) Agent
 *
 * This Agent can read public data from Bluesky but cannot perform
 * authenticated actions like posting, liking, or following.
 *
 * @returns A public Agent instance
 *
 * @example
 * ```typescript
 * const agent = getPublicAgent();
 * const profile = await agent.getProfile({ actor: "user.bsky.social" });
 * ```
 */
export function getPublicAgent(): Agent {
  return new Agent(BSKY_PUBLIC_URL);
}

/**
 * Wrap an API call with standard error handling
 *
 * @param apiCall - The async function that makes the API call
 * @returns The result of the API call
 * @throws BlueskyApiError with meaningful error message
 */
export async function withErrorHandling<T>(
  apiCall: () => Promise<T>
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (error instanceof BlueskyAuthError || error instanceof BlueskyApiError) {
      throw error;
    }

    // Handle XRPCError from @atproto/api
    if (error && typeof error === "object" && "status" in error) {
      const xrpcError = error as {
        status?: number;
        error?: string;
        message?: string;
      };

      const statusCode = xrpcError.status;
      const errorType = xrpcError.error;
      const message = xrpcError.message || "An error occurred";

      // Map common errors to user-friendly messages
      switch (errorType) {
        case "InvalidToken":
        case "ExpiredToken":
          throw new BlueskyAuthError(
            "Your session has expired. Please sign in again."
          );
        case "RateLimitExceeded":
          throw new BlueskyApiError(
            "Too many requests. Please wait a moment and try again.",
            statusCode,
            errorType
          );
        case "RecordNotFound":
          throw new BlueskyApiError(
            "The requested content was not found.",
            statusCode,
            errorType
          );
        case "InvalidRequest":
          throw new BlueskyApiError(
            "Invalid request. Please check your input.",
            statusCode,
            errorType
          );
        default:
          throw new BlueskyApiError(message, statusCode, errorType);
      }
    }

    // Unknown error
    console.error("Unknown Bluesky API error:", error);
    throw new BlueskyApiError(
      "An unexpected error occurred. Please try again."
    );
  }
}
