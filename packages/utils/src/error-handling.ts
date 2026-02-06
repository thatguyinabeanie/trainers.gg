/**
 * Error handling utilities
 */

/**
 * Extract error message from various error types (Error, Supabase PostgrestError, etc.)
 *
 * @param error - The error to extract a message from
 * @param fallback - Fallback message if extraction fails
 * @param shouldSanitize - Whether to use fallback instead of actual error (default: false)
 *                          Set to true in production to avoid leaking error details
 */
export function getErrorMessage(
  error: unknown,
  fallback: string,
  shouldSanitize = false
): string {
  if (error instanceof Error) {
    return shouldSanitize ? fallback : error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message: string }).message;
    return shouldSanitize ? fallback : msg;
  }
  return fallback;
}
