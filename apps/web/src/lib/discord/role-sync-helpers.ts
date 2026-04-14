/**
 * Role sync error classifiers.
 *
 * Thin predicate wrappers over the DiscordAPIError hierarchy. Used by
 * the role-sync cron (/api/discord/role-sync) to determine which failure
 * reason to record and whether to disable the mapping after a permanent error.
 */

import { DiscordAPIError, DiscordRateLimitError } from "@/lib/discord/api";

export { DiscordAPIError, DiscordRateLimitError };

// =============================================================================
// Error classifiers
// =============================================================================

/**
 * Returns true when Discord returned 403 + code 50013 (Missing Permissions).
 * Indicates the bot's role is ranked below the target role in the hierarchy,
 * so it cannot assign/remove the role.
 */
export function isHierarchyViolation(e: unknown): boolean {
  return (
    e instanceof DiscordAPIError && e.status === 403 && e.body.code === 50013
  );
}

/**
 * Returns true when Discord returned error code 10011 (Unknown Role).
 * The role was deleted from the server — the mapping should be disabled
 * to prevent repeated retry failures.
 */
export function isUnknownRole(e: unknown): boolean {
  return e instanceof DiscordAPIError && e.body.code === 10011;
}

/**
 * Returns true when Discord returned error code 10007 (Unknown Member).
 * The user left the server — the job should be failed but no mapping change
 * is needed (the user may rejoin later).
 */
export function isUnknownMember(e: unknown): boolean {
  return e instanceof DiscordAPIError && e.body.code === 10007;
}
