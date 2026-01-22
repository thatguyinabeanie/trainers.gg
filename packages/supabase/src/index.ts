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
