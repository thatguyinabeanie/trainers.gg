// Client-side exports only
// Server-side code should be imported directly from "./server"
export { useSupabaseClient } from "./client";

// Hook exports
export { useSupabase, useSupabaseQuery, useSupabaseMutation } from "./hooks";

// Re-export types and utilities from the package
export type { TypedSupabaseClient } from "@trainers/supabase";
