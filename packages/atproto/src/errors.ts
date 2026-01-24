/**
 * AT Protocol Error Classes
 *
 * Custom error types for Bluesky API operations.
 * Platform-agnostic - can be used by web and mobile.
 */

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
