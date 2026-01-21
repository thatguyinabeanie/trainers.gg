/**
 * @trainers/backend-supabase
 *
 * Supabase backend package for trainers.gg
 * Used for analytics, BI tool integration, and features requiring
 * PostgreSQL capabilities (complex queries, aggregations, Presence).
 */

// Client exports
export {
  createBrowserClient,
  createServerClient,
  getSupabaseBrowserClient,
} from "./client";

// Type exports
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  Json,
} from "./types";
