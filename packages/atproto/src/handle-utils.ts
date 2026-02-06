/**
 * AT Protocol handle utilities
 */

/**
 * Extract username from a Bluesky handle
 * e.g., "thatguyinabeanie.bsky.social" -> "thatguyinabeanie"
 * e.g., "user.trainers.gg" -> "user"
 */
export function extractUsernameFromHandle(handle: string): string {
  // Remove the domain suffix to get the username part
  const parts = handle.split(".");
  return parts[0] || handle;
}
