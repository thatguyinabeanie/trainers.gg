/**
 * Notification utilities
 */

/**
 * Check if a notification type is a match notification (match_ready or tournament_round).
 * Used for styling and prioritizing match notifications in the notification bell.
 */
export function isMatchNotification(type: string | null): boolean {
  return type === "match_ready" || type === "tournament_round";
}
