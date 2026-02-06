/**
 * Shared Site Roles Hook
 *
 * Platform-agnostic hook to get user's site roles from JWT claims.
 * Works in both Next.js (web) and Expo (mobile).
 */

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

interface SiteRolesHook {
  /**
   * Get Supabase client for the current platform.
   * This should return the platform-specific client.
   */
  getSupabaseClient: () => { auth: { getSession: () => Promise<any> } };

  /**
   * Get current authenticated user.
   * This should come from the platform's auth context.
   */
  user: User | null;

  /**
   * Whether auth is still loading.
   * This should come from the platform's auth context.
   */
  userLoading?: boolean;
}

export interface SiteRolesResult {
  siteRoles: string[];
  isSiteAdmin: boolean;
  isLoading: boolean;
  user: User | null;
}

/**
 * Hook to get the current user's site roles from JWT claims.
 * Reads the site_roles claim set by custom_access_token_hook.
 *
 * @param params - Object with getSupabaseClient and user from platform auth
 * @returns Object with siteRoles array, isSiteAdmin boolean, and loading state
 *
 * @example
 * // Web (Next.js)
 * import { useSiteRoles as useSiteRolesBase } from "@trainers/supabase/hooks";
 * import { createClient } from "@/lib/supabase/client";
 * import { useAuthContext } from "@/components/auth/auth-provider";
 *
 * export function useSiteRoles() {
 *   const { user, loading } = useAuthContext();
 *   return useSiteRolesBase({
 *     getSupabaseClient: createClient,
 *     user,
 *     userLoading: loading
 *   });
 * }
 *
 * @example
 * // Mobile (Expo)
 * import { useSiteRoles as useSiteRolesBase } from "@trainers/supabase/hooks";
 * import { getSupabase } from "@/lib/supabase/client";
 * import { useAuth } from "@/lib/supabase/auth-provider";
 *
 * export function useSiteRoles() {
 *   const { user } = useAuth();
 *   return useSiteRolesBase({
 *     getSupabaseClient: getSupabase,
 *     user
 *   });
 * }
 */
export function useSiteRoles(params: SiteRolesHook): SiteRolesResult {
  const { getSupabaseClient, user, userLoading = false } = params;
  const [siteRoles, setSiteRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkClaims() {
      if (!user) {
        setSiteRoles([]);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          // Decode JWT payload to get site_roles claim
          const payload = session.access_token.split(".")[1];
          if (payload) {
            const claims = JSON.parse(atob(payload)) as {
              site_roles?: string[];
            };
            setSiteRoles(claims.site_roles ?? []);
          }
        } else {
          setSiteRoles([]);
        }
      } catch (error) {
        console.error("Error reading JWT claims:", error);
        setSiteRoles([]);
      } finally {
        setIsLoading(false);
      }
    }

    checkClaims();
  }, [user, getSupabaseClient]);

  return {
    siteRoles,
    isSiteAdmin: siteRoles.includes("site_admin"),
    isLoading: userLoading || isLoading,
    user,
  };
}

/**
 * Alias for useSiteRoles with simpler return type.
 * Returns just isSiteAdmin and loading state.
 */
export function useSiteAdmin(params: SiteRolesHook) {
  return useSiteRoles(params);
}
