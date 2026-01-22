"use client";

import { useEffect, useState } from "react";
import { type User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/auth-provider";

/**
 * Hook to check if the current user is a site admin.
 * Reads the is_site_admin claim from the JWT token (set by custom_access_token_hook).
 *
 * @returns Object with isSiteAdmin boolean and loading state
 */
export function useSiteAdmin(): {
  isSiteAdmin: boolean;
  isLoading: boolean;
  user: User | null;
} {
  const { user, loading: userLoading } = useAuthContext();
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSiteAdmin() {
      if (!user) {
        setIsSiteAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          // Decode JWT payload to get is_site_admin claim
          const payload = session.access_token.split(".")[1];
          if (payload) {
            const claims = JSON.parse(atob(payload)) as {
              is_site_admin?: boolean;
            };
            setIsSiteAdmin(claims.is_site_admin === true);
          }
        } else {
          setIsSiteAdmin(false);
        }
      } catch {
        setIsSiteAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkSiteAdmin();
  }, [user]);

  return {
    isSiteAdmin,
    isLoading: userLoading || isLoading,
    user,
  };
}
