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
  type ServiceRoleClient,
} from "./client";

// Query exports
export * from "./queries";

// Mutation exports
export * from "./mutations";

// Usage compile exports — pure slot-row mapping shared by the mutations
// layer, tests, and test-utils factories.
export {
  buildTeamSlotRows,
  type EventMeta,
  type RawSlotRow,
  type TeamSlotRow,
} from "./usage/compile";

// Type exports
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  Json,
} from "./types";

// Generated runtime enum constants — used for input validation at API boundaries
export { Constants } from "./types";

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
  createSignedUrl,
  uploadFile,
  deleteFile,
  extractPathFromUrl,
} from "./storage";

// Limitless format constants — pure (cheerio-free); the scraper graph stays
// out of the web bundle, only this Set of valid format IDs is re-exported.
export { ALL_VALID_FORMATS } from "./sources/limitless/format";

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

// NOTE: The TanStack Query wrappers (useApiQuery / useApiMutation) are
// intentionally NOT re-exported here — they live behind the dedicated
// `@trainers/supabase/react-query` subpath so the root barrel stays
// framework-agnostic and does not couple every consumer to
// `@tanstack/react-query`. Import them from "@trainers/supabase/react-query".
