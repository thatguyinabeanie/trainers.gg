/**
 * AT Protocol Agent Utilities
 *
 * Provides utilities for creating public Bluesky Agents and error handling.
 * Platform-agnostic - can be used by web and mobile.
 *
 * Note: Authenticated agent creation is platform-specific and should be
 * implemented in each app (web uses OAuth, mobile may use different auth).
 */

import { Agent } from "@atproto/api";
import { BSKY_PUBLIC_URL } from "./config";
import { BlueskyAuthError, BlueskyApiError } from "./errors";

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
