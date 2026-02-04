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
