"use client";

/**
 * Shared Team Builder Access Hook
 *
 * Platform-agnostic hook to check team_builder_access JWT claim.
 * Works in both Next.js (web) and Expo (mobile).
 */

import { useEffect, useState } from "react";
import type { User, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamBuilderAccessHook {
  /** Get Supabase client for the current platform. */
  getSupabaseClient: () => SupabaseClient;

  /** Current authenticated user from the platform's auth context. */
  user: User | null;

  /** Whether auth is still loading. */
  userLoading?: boolean;
}

export interface TeamBuilderAccessResult {
  hasAccess: boolean;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook to check team_builder_access JWT claim set by custom_access_token_hook.
 *
 * Access is true when:
 * - The team_builder feature flag is globally enabled, OR
 * - The user is in the flag's allowed_users list, OR
 * - The user has the site_admin role
 *
 * @param params - Object with getSupabaseClient and user from platform auth
 * @returns Object with hasAccess boolean and loading state
 */
export function useTeamBuilderAccess(
  params: TeamBuilderAccessHook
): TeamBuilderAccessResult {
  const { getSupabaseClient, user, userLoading = false } = params;
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkClaim() {
      if (!user) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          const payload = session.access_token.split(".")[1];
          if (payload) {
            // base64url decode — cross-platform (Node / Browser / React Native)
            let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
            const padding = base64.length % 4;
            if (padding > 0) base64 += "=".repeat(4 - padding);

            const decoded =
              typeof Buffer !== "undefined"
                ? Buffer.from(base64, "base64").toString("utf-8")
                : atob(base64);

            const claims = JSON.parse(decoded) as {
              team_builder_access?: boolean;
            };
            setHasAccess(claims.team_builder_access ?? false);
          }
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error("Error reading team_builder_access JWT claim:", error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkClaim();
  }, [user, getSupabaseClient]);

  return { hasAccess, isLoading: userLoading || isLoading };
}
