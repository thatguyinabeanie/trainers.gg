"use client";

import { useCallback } from "react";
import { isSiteAdmin } from "@trainers/supabase";
import { useSupabaseQuery } from "@/lib/supabase";
import { useCurrentUser } from "./use-current-user";

/**
 * Hook to check if the current user is a site admin
 *
 * @returns Object with isSiteAdmin boolean and loading state
 */
export function useSiteAdmin() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const userId = user?.id;

  // Memoize the query function to prevent infinite loops
  const queryFn = useCallback(
    async (supabase: Parameters<typeof isSiteAdmin>[0]) => {
      if (!userId) return false;
      return isSiteAdmin(supabase, userId);
    },
    [userId]
  );

  const { data: isAdmin, isLoading: adminLoading } = useSupabaseQuery(queryFn, [
    userId,
  ]);

  return {
    isSiteAdmin: isAdmin === true,
    isLoading: userLoading || (!!userId && adminLoading),
    user,
  };
}
