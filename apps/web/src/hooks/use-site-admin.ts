"use client";

import { useEffect, useState } from "react";
import { type User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/auth-provider";

/**
 * Hook to get the current user's site roles and admin status.
 * Reads the site_roles claim from the JWT token (set by custom_access_token_hook).
 *
 * @returns Object with siteRoles array, isSiteAdmin boolean, and loading state
 */
export function useSiteAdmin(): {
  siteRoles: string[];
  isSiteAdmin: boolean;
  isLoading: boolean;
  user: User | null;
} {
  const { user, loading: userLoading } = useAuthContext();
  const [siteRoles, setSiteRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSiteRoles() {
      if (!user) {
        setSiteRoles([]);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
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
      } catch {
        setSiteRoles([]);
      } finally {
        setIsLoading(false);
      }
    }

    checkSiteRoles();
  }, [user]);

  return {
    siteRoles,
    isSiteAdmin: siteRoles.includes("Site Admin"),
    isLoading: userLoading || isLoading,
    user,
  };
}
