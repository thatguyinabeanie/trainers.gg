import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { supabase } from "./client";

interface SiteRolesState {
  siteRoles: string[];
  isSiteAdmin: boolean;
  isLoading: boolean;
}

/**
 * Hook to get the current user's site roles from JWT claims.
 * Reads the site_roles claim set by custom_access_token_hook.
 *
 * @returns Object with siteRoles array, isSiteAdmin boolean, and loading state
 */
export function useSiteRoles(): SiteRolesState {
  const { user } = useAuth();
  const [state, setState] = useState<SiteRolesState>({
    siteRoles: [],
    isSiteAdmin: false,
    isLoading: true,
  });

  useEffect(() => {
    async function checkClaims() {
      if (!user) {
        setState({ siteRoles: [], isSiteAdmin: false, isLoading: false });
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          const payload = session.access_token.split(".")[1];
          if (payload) {
            const claims = JSON.parse(atob(payload)) as {
              site_roles?: string[];
            };
            const roles = claims.site_roles ?? [];
            setState({
              siteRoles: roles,
              isSiteAdmin: roles.includes("site_admin"),
              isLoading: false,
            });
            return;
          }
        }
      } catch (error) {
        console.error("Error reading JWT claims:", error);
      }

      setState({ siteRoles: [], isSiteAdmin: false, isLoading: false });
    }

    checkClaims();
  }, [user]);

  return state;
}
