// Client-safe exports only
// Server-only functions should be imported directly from "@/lib/supabase/server"
// Middleware functions should be imported directly from "@/lib/supabase/middleware"

export { createClient, supabase } from "./client";
export {
  getUserClient,
  getAuthUrls,
  oauthProviders,
  type OAuthProvider,
} from "./auth";

// Hook exports for client components
export {
  useSupabase,
  useUser,
  useSupabaseQuery,
  useSupabaseMutation,
} from "./hooks";
