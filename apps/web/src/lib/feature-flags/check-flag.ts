import { createClient } from "@/lib/supabase/server";
import { getFeatureFlag } from "@trainers/supabase";

/**
 * Check if a user has access to a feature flag.
 *
 * Logic:
 * - If flag.enabled = true: everyone has access
 * - If flag.enabled = false: only users in metadata.allowed_users have access
 *
 * @param flagKey - Feature flag key (e.g., "dashboard_stats")
 * @param userId - Current user's ID
 * @returns true if user has access, false otherwise
 */
export async function checkFeatureAccess(
  flagKey: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  const flag = await getFeatureFlag(supabase, flagKey);

  // Flag doesn't exist = disabled
  if (!flag) return false;

  // Globally enabled = everyone has access
  if (flag.enabled) return true;

  // Globally disabled = check allowlist
  const allowedUsers =
    (flag.metadata as { allowed_users?: string[] })?.allowed_users || [];
  return allowedUsers.includes(userId);
}

/**
 * Global-only coaching flag check for anonymous viewers (no per-user allowlist).
 * Returns true only when the coaching flag is globally enabled.
 */
export async function isCoachingPublic(): Promise<boolean> {
  const supabase = await createClient();
  const flag = await getFeatureFlag(supabase, "coaching");
  return flag?.enabled ?? false;
}

/**
 * Check if a community has access to a feature flag.
 *
 * Logic:
 * - If flag.enabled = true: all communities have access
 * - If flag.enabled = false: only communities in metadata.allowed_communities
 *
 * @param flagKey - Feature flag key (e.g., "discord_integration")
 * @param communityId - Community ID to check
 * @returns true if community has access, false otherwise
 */
export async function checkCommunityFeatureAccess(
  flagKey: string,
  communityId: number
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const flag = await getFeatureFlag(supabase, flagKey);

    // Flag doesn't exist = disabled
    if (!flag) return false;

    // Globally enabled = all communities have access
    if (flag.enabled) return true;

    // Globally disabled = check allowlist
    const allowed =
      (flag.metadata as { allowed_communities?: number[] })
        ?.allowed_communities || [];
    return allowed.includes(communityId);
  } catch (error) {
    // Fail closed — if we can't read the flag, deny access
    console.error(
      "[feature-flags] Failed to check flag for community:",
      { flagKey, communityId },
      error
    );
    return false;
  }
}
