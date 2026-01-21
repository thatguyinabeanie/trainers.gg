import { Doc } from "../_generated/dataModel";
import {
  USER_TIERS,
  ORGANIZATION_SUBSCRIPTION_TIERS,
  getUserTierFeatures,
  getOrganizationFeatures,
} from "../tierConstants";

/**
 * Check if a user profile has an active subscription
 */
export function hasActiveSubscription(profile: Doc<"profiles">): boolean {
  if (!profile.tier || profile.tier === USER_TIERS.FREE) {
    return false;
  }

  if (!profile.tierExpiresAt) {
    // No expiry means lifetime subscription (rare but possible)
    return true;
  }

  return profile.tierExpiresAt > Date.now();
}

/**
 * Check if an organization has an active subscription
 */
export function hasActiveOrgSubscription(org: Doc<"organizations">): boolean {
  if (
    !org.subscriptionTier ||
    org.subscriptionTier === ORGANIZATION_SUBSCRIPTION_TIERS.FREE
  ) {
    return false;
  }

  if (!org.subscriptionExpiresAt) {
    return true;
  }

  return org.subscriptionExpiresAt > Date.now();
}

/**
 * Check if a user has a specific feature based on their tier
 */
export function userHasFeature(
  profile: Doc<"profiles">,
  feature: keyof ReturnType<typeof getUserTierFeatures>
): boolean {
  const tier = hasActiveSubscription(profile) ? profile.tier : USER_TIERS.FREE;
  const features = getUserTierFeatures(tier);
  return !!features[feature];
}

/**
 * Check if an organization has a specific feature based on their subscription tier
 */
export function orgHasFeature(
  org: Doc<"organizations">,
  feature: keyof ReturnType<typeof getOrganizationFeatures>
): boolean {
  const tier = hasActiveOrgSubscription(org)
    ? org.subscriptionTier
    : ORGANIZATION_SUBSCRIPTION_TIERS.FREE;
  const features = getOrganizationFeatures(tier);
  return !!features[feature];
}

/**
 * Get the effective tier for a user profile
 */
export function getEffectiveUserTier(
  profile: Doc<"profiles">
): (typeof USER_TIERS)[keyof typeof USER_TIERS] {
  return hasActiveSubscription(profile)
    ? profile.tier || USER_TIERS.FREE
    : USER_TIERS.FREE;
}

/**
 * Get the effective subscription tier for an organization
 */
export function getEffectiveOrgSubscriptionTier(
  org: Doc<"organizations">
): (typeof ORGANIZATION_SUBSCRIPTION_TIERS)[keyof typeof ORGANIZATION_SUBSCRIPTION_TIERS] {
  return hasActiveOrgSubscription(org)
    ? org.subscriptionTier || ORGANIZATION_SUBSCRIPTION_TIERS.FREE
    : ORGANIZATION_SUBSCRIPTION_TIERS.FREE;
}

/**
 * Check if an organization can create more tournaments based on their tier limits
 */
export async function canCreateTournament(
  org: Doc<"organizations">,
  getCurrentTournamentCount: () => Promise<number>
): Promise<{ allowed: boolean; reason?: string }> {
  const features = getOrganizationFeatures(
    getEffectiveOrgSubscriptionTier(org)
  );

  if (features.maxTournaments === null) {
    // Unlimited tournaments
    return { allowed: true };
  }

  const currentCount = await getCurrentTournamentCount();

  if (currentCount >= features.maxTournaments) {
    return {
      allowed: false,
      reason: `Tournament limit reached. Your plan allows ${features.maxTournaments} tournaments.`,
    };
  }

  return { allowed: true };
}
