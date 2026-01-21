// Client-side exports
export { useSupabaseClient } from "./client";

// Server-side exports
export {
  createServerSupabaseClient,
  createPublicServerSupabaseClient,
  createAdminSupabaseClient,
} from "./server";

// Hook exports
export { useSupabase, useSupabaseQuery, useSupabaseMutation } from "./hooks";

// Re-export types and utilities from the package
export type { TypedSupabaseClient } from "@trainers/supabase";
