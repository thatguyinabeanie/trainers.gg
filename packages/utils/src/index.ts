/**
 * @trainers/utils
 *
 * Shared utilities for trainers.gg.
 * Used by web, mobile, and edge functions.
 */

// format.ts — player name resolution and time formatting
export { type PlayerRef, getPlayerName, formatTimeAgo } from "./format";

// countries.ts — ISO 3166-1 country codes and helpers
export {
  COUNTRIES,
  type CountryCode,
  getCountryName,
  isValidCountryCode,
} from "./countries";

// tiers.ts — user, organization, and subscription tier definitions
export {
  type UserTier,
  type OrganizationTier,
  type OrganizationSubscriptionTier,
  USER_TIERS,
  ORGANIZATION_TIERS,
  ORGANIZATION_SUBSCRIPTION_TIERS,
  TIER_PRICING,
  TOURNAMENT_FEE_PERCENTAGES,
  USER_TIER_FEATURES,
  ORGANIZATION_SUBSCRIPTION_FEATURES,
  getUserTierFeatures,
  getOrganizationFeatures,
  getTournamentFeePercentage,
  calculatePlatformFee,
} from "./tiers";

// permissions.ts — permission keys and constants
export { type PermissionKey, PERMISSIONS } from "./permissions";

// labels.ts — enum value to human-readable label mappings
export {
  registrationStatusLabels,
  tournamentStatusLabels,
  matchStatusLabels,
  roundStatusLabels,
  getLabel,
} from "./labels";

// ports.ts — port detection and allocation for worktree development
export { isPortAvailable, findAvailablePort, findPortBlock } from "./ports";
