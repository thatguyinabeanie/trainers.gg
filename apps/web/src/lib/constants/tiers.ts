// Tier definitions aligned with monetization strategy

export type UserTier = "free" | "player_pro" | "coach_premium";
export type OrganizationTier = "regular" | "verified" | "partner";
export type OrganizationSubscriptionTier =
  | "free"
  | "organization_plus"
  | "enterprise";

export const USER_TIERS = {
  FREE: "free" as const,
  PLAYER_PRO: "player_pro" as const,
  COACH_PREMIUM: "coach_premium" as const,
} as const;

export const ORGANIZATION_TIERS = {
  REGULAR: "regular" as const,
  VERIFIED: "verified" as const,
  PARTNER: "partner" as const,
} as const;

export const ORGANIZATION_SUBSCRIPTION_TIERS = {
  FREE: "free" as const,
  ORGANIZATION_PLUS: "organization_plus" as const,
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
  [ORGANIZATION_SUBSCRIPTION_TIERS.ORGANIZATION_PLUS]: {
    monthly: 2999, // $29.99
    annual: 29990, // $299.90 (2 months free)
  },
  [ORGANIZATION_SUBSCRIPTION_TIERS.ENTERPRISE]: {
    // Custom pricing - contact sales
    monthly: null,
    annual: null,
  },
} as const;

// Platform fee percentages for tournament entry fees
export const TOURNAMENT_FEE_PERCENTAGES = {
  [ORGANIZATION_TIERS.REGULAR]: 0.08, // 8%
  [ORGANIZATION_TIERS.VERIFIED]: 0.05, // 5%
  [ORGANIZATION_TIERS.PARTNER]: 0.03, // 3% (negotiable)
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

// Organization subscription features
export const ORGANIZATION_SUBSCRIPTION_FEATURES = {
  [ORGANIZATION_SUBSCRIPTION_TIERS.FREE]: {
    maxTournaments: 5,
    autoBrackets: false,
    autoReminders: false,
    customThemes: false,
    whiteLabel: false,
    customDomains: false,
    advancedMetrics: false,
  },
  [ORGANIZATION_SUBSCRIPTION_TIERS.ORGANIZATION_PLUS]: {
    maxTournaments: null, // unlimited
    autoBrackets: true,
    autoReminders: true,
    customThemes: true,
    whiteLabel: true,
    customDomains: true,
    advancedMetrics: true,
  },
  [ORGANIZATION_SUBSCRIPTION_TIERS.ENTERPRISE]: {
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

export function getOrganizationFeatures(
  subscriptionTier: OrganizationSubscriptionTier | undefined
) {
  return ORGANIZATION_SUBSCRIPTION_FEATURES[
    subscriptionTier || ORGANIZATION_SUBSCRIPTION_TIERS.FREE
  ];
}

export function getTournamentFeePercentage(
  orgTier: OrganizationTier | undefined
) {
  return TOURNAMENT_FEE_PERCENTAGES[orgTier || ORGANIZATION_TIERS.REGULAR];
}

export function calculatePlatformFee(
  entryFeeInCents: number,
  orgTier: OrganizationTier | undefined
): number {
  const percentage = getTournamentFeePercentage(orgTier);
  return Math.round(entryFeeInCents * percentage);
}
