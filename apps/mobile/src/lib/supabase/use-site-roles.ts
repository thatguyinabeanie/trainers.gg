/**
 * Mobile App Site Roles Hook
 *
 * Wrapper around shared @trainers/supabase/hooks that injects
 * Expo-specific dependencies.
 */

import { useSiteRoles as useSiteRolesBase } from "@trainers/supabase/hooks";
import { useAuth } from "./auth-provider";
import { getSupabase } from "./client";

/**
 * Hook to get the current user's site roles from JWT claims.
 * Reads the site_roles claim set by custom_access_token_hook.
 *
 * @returns Object with siteRoles array, isSiteAdmin boolean, and loading state
 */
export function useSiteRoles() {
  const { user, loading } = useAuth();

  return useSiteRolesBase({
    getSupabaseClient: getSupabase,
    user,
    userLoading: loading,
  });
}

/**
 * Alias for useSiteRoles
 */
export function useSiteAdmin() {
  return useSiteRoles();
}
