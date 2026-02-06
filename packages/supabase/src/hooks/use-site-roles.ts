/**
 * Shared Site Roles Hook
 *
 * Platform-agnostic hook to get user's site roles from JWT claims.
 * Works in both Next.js (web) and Expo (mobile).
 */

import { useEffect, useState } from "react";
import type { User, SupabaseClient } from "@supabase/supabase-js";

/**
 * Cross-platform base64url decoder for JWT payloads
 * Converts base64url to base64 and decodes safely across Node/Browser/React Native
 */
function decodeBase64Url(base64url: string): string {
  // Convert base64url to base64
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if needed
  const padding = base64.length % 4;
  if (padding > 0) {
    base64 += "=".repeat(4 - padding);
  }

  // Decode using cross-platform approach
  if (typeof Buffer !== "undefined") {
    // Node.js environment
    return Buffer.from(base64, "base64").toString("utf-8");
  } else if (typeof atob === "function") {
    // Browser environment
    return atob(base64);
  } else {
    // Fallback for environments without atob or Buffer
    throw new Error(
      "No base64 decoder available - neither Buffer nor atob found"
    );
  }
}

interface SiteRolesHook {
  /**
   * Get Supabase client for the current platform.
   * This should return the platform-specific client.
   */
  getSupabaseClient: () => SupabaseClient;

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
            const claims = JSON.parse(decodeBase64Url(payload)) as {
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
 * Simplified hook for checking site admin status.
 * Returns just isSiteAdmin and loading state.
 */
export function useSiteAdmin(params: SiteRolesHook): {
  isSiteAdmin: boolean;
  isLoading: boolean;
} {
  const { isSiteAdmin, isLoading } = useSiteRoles(params);
  return { isSiteAdmin, isLoading };
}
