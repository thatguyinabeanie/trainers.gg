export { createClient, supabase } from "./client";
export {
  createClient as createServerClient,
  createClientReadOnly,
} from "./server";
export {
  createClient as createMiddlewareClient,
  refreshSession,
} from "./middleware";
export {
  getUser,
  getUserClient,
  isAuthenticated,
  getUserId,
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
