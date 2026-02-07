"use client";

/**
 * Web App Site Admin Hook
 *
 * Wrapper around shared @trainers/supabase/hooks that injects
 * Next.js-specific dependencies.
 */

import { useSiteRoles as useSiteRolesBase } from "@trainers/supabase/hooks";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/auth-provider";

/**
 * Hook to get the current user's site roles and admin status.
 * Reads the site_roles claim from the JWT token (set by custom_access_token_hook).
 *
 * @returns Object with siteRoles array, isSiteAdmin boolean, and loading state
 */
export function useSiteAdmin() {
  const { user, loading } = useAuthContext();

  return useSiteRolesBase({
    getSupabaseClient: createClient,
    user,
    userLoading: loading,
  });
}

/**
 * Alias for useSiteAdmin
 */
export function useSiteRoles() {
  return useSiteAdmin();
}
