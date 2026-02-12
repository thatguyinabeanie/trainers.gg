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
