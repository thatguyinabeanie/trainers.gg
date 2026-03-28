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

// tiers.ts — user, community, and subscription tier definitions
export {
  type UserTier,
  type CommunityTier,
  type CommunitySubscriptionTier,
  USER_TIERS,
  COMMUNITY_TIERS,
  COMMUNITY_SUBSCRIPTION_TIERS,
  TIER_PRICING,
  TOURNAMENT_FEE_PERCENTAGES,
  USER_TIER_FEATURES,
  COMMUNITY_SUBSCRIPTION_FEATURES,
  getUserTierFeatures,
  getCommunityFeatures,
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

// error-handling.ts — error message extraction
export { getErrorMessage } from "./error-handling";

// notifications.ts — notification type checking
export { isMatchNotification } from "./notifications";

// social-links.ts — social platform display labels and SVG icon paths
export { socialPlatformLabels, socialSvgPaths } from "./social-links";

// slug.ts — URL-friendly slug generation
export { generateSlug } from "./slug";

// sql.ts — SQL/PostgREST helpers
export { escapeLike } from "./sql";
