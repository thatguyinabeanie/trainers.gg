/**
 * @trainers/supabase
 *
 * Supabase backend package for trainers.gg
 * Primary backend for all database operations.
 */

// Client exports
export {
  getSupabaseConfig,
  createPublicSupabaseClient,
  createAdminSupabaseClient,
  type TypedSupabaseClient,
  type TypedClient,
} from "./client";

// Query exports
export * from "./queries";

// Mutation exports
export * from "./mutations";

// Type exports
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  Json,
} from "./types";

// Utility exports
export {
  checkRegistrationOpen,
  checkCheckInOpen,
  type RegistrationOpenInput,
  type RegistrationOpenResult,
  type CheckInOpenInput,
  type CheckInOpenResult,
} from "./utils/registration";

// Constants
export { COOKIE_DOMAIN } from "./constants";

// PostgREST query helpers
export { pgInList } from "./postgrest-helpers";

// Storage exports
export {
  STORAGE_BUCKETS,
  getUploadPath,
  getPublicUrl,
  uploadFile,
  deleteFile,
  extractPathFromUrl,
} from "./storage";

// Usage aggregation helpers (pure, framework-free)
export {
  aggregateEventUsage,
  type TeamMonInput,
  type HistogramEntry,
  type UsageHistogram,
  type UsageDetails,
  type EventUsageRow,
} from "./usage/aggregate";

// Usage rollup helpers (pure, framework-free) and types
export {
  bucketStart,
  bucketEnd,
  rollupBucket,
  mergeHistogram,
  computeDelta,
  type PeriodType,
  type FactRow,
  type DetailEntry,
  type SpeciesRollup,
  type BucketRollup,
} from "./usage/rollup";

// AT Protocol extended types
export type {
  AtprotoDatabase,
  DatabaseWithAtproto,
  AtprotoSessionsTable,
  AtprotoOauthStateTable,
  LinkedAtprotoAccountsTable,
  UsersTableWithAtproto,
  PdsAccountStatus,
} from "./types-atproto";
