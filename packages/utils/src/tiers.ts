// Tier definitions aligned with monetization strategy

export type UserTier = "free" | "player_pro" | "coach_premium";
export type CommunityTier = "regular" | "verified" | "partner";
export type CommunitySubscriptionTier =
  | "free"
  | "community_plus"
  | "enterprise";

export const USER_TIERS = {
  FREE: "free" as const,
  PLAYER_PRO: "player_pro" as const,
  COACH_PREMIUM: "coach_premium" as const,
} as const;

export const COMMUNITY_TIERS = {
  REGULAR: "regular" as const,
  VERIFIED: "verified" as const,
  PARTNER: "partner" as const,
} as const;

export const COMMUNITY_SUBSCRIPTION_TIERS = {
  FREE: "free" as const,
  COMMUNITY_PLUS: "community_plus" as const,
  ENTERPRISE: "enterprise" as const,
} as const;

// Pricing in cents (multiply by 100 for Stripe)
export const TIER_PRICING = {
  [USER_TIERS.PLAYER_PRO]: {
    monthly: 999, // $9.99
    annual: 9990, // $99.90 (2 months free)
  },
  [USER_TIERS.COACH_PREMIUM]: {
    monthly: 1999, // $19.99
    annual: 19990, // $199.90 (2 months free)
  },
  [COMMUNITY_SUBSCRIPTION_TIERS.COMMUNITY_PLUS]: {
    monthly: 2999, // $29.99
    annual: 29990, // $299.90 (2 months free)
  },
  [COMMUNITY_SUBSCRIPTION_TIERS.ENTERPRISE]: {
    // Custom pricing - contact sales
    monthly: null,
    annual: null,
  },
} as const;

// Platform fee percentages for tournament entry fees
export const TOURNAMENT_FEE_PERCENTAGES = {
  [COMMUNITY_TIERS.REGULAR]: 0.08, // 8%
  [COMMUNITY_TIERS.VERIFIED]: 0.05, // 5%
  [COMMUNITY_TIERS.PARTNER]: 0.03, // 3% (negotiable)
} as const;

// User tier features
export const USER_TIER_FEATURES = {
  [USER_TIERS.FREE]: {
    adFreeExperience: false,
    prioritySupport: false,
    advancedAnalytics: false,
    exportData: false,
    premiumThemes: false,
    battlePassMultiplier: 1.0,
  },
  [USER_TIERS.PLAYER_PRO]: {
    adFreeExperience: true,
    prioritySupport: true,
    advancedAnalytics: true,
    exportData: true,
    premiumThemes: true,
    battlePassMultiplier: 1.5,
  },
  [USER_TIERS.COACH_PREMIUM]: {
    adFreeExperience: true,
    prioritySupport: true,
    advancedAnalytics: true,
    exportData: true,
    premiumThemes: true,
    battlePassMultiplier: 1.5,
    // Coach-specific features
    directBooking: true,
    sessionRecordings: true,
    progressTracking: true,
    groupSessions: true,
  },
} as const;

// Community subscription features
export const COMMUNITY_SUBSCRIPTION_FEATURES = {
  [COMMUNITY_SUBSCRIPTION_TIERS.FREE]: {
    maxTournaments: 5,
    autoBrackets: false,
    autoReminders: false,
    customThemes: false,
    whiteLabel: false,
    customDomains: false,
    advancedMetrics: false,
  },
  [COMMUNITY_SUBSCRIPTION_TIERS.COMMUNITY_PLUS]: {
    maxTournaments: null, // unlimited
    autoBrackets: true,
    autoReminders: true,
    customThemes: true,
    whiteLabel: true,
    customDomains: true,
    advancedMetrics: true,
  },
  [COMMUNITY_SUBSCRIPTION_TIERS.ENTERPRISE]: {
    maxTournaments: null,
    autoBrackets: true,
    autoReminders: true,
    customThemes: true,
    whiteLabel: true,
    customDomains: true,
    advancedMetrics: true,
    // Enterprise-specific
    ssoIntegration: true,
    apiAccess: true,
    dedicatedSupport: true,
    customFeatures: true,
  },
} as const;

// Helper functions
export function getUserTierFeatures(tier: UserTier | undefined) {
  return USER_TIER_FEATURES[tier || USER_TIERS.FREE];
}

export function getCommunityFeatures(
  subscriptionTier: CommunitySubscriptionTier | undefined
) {
  return COMMUNITY_SUBSCRIPTION_FEATURES[
    subscriptionTier || COMMUNITY_SUBSCRIPTION_TIERS.FREE
  ];
}

export function getTournamentFeePercentage(orgTier: CommunityTier | undefined) {
  return TOURNAMENT_FEE_PERCENTAGES[orgTier || COMMUNITY_TIERS.REGULAR];
}

export function calculatePlatformFee(
  entryFeeInCents: number,
  orgTier: CommunityTier | undefined
): number {
  const percentage = getTournamentFeePercentage(orgTier);
  return Math.round(entryFeeInCents * percentage);
}
