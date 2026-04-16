"use client";

import { useTeamBuilderAccess as useTeamBuilderAccessBase } from "@trainers/supabase/hooks";

import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/auth-provider";

/**
 * Check whether the current user has access to the team builder.
 * Reads the team_builder_access JWT claim set by custom_access_token_hook.
 */
export function useTeamBuilderAccess() {
  const { user, loading } = useAuthContext();
  return useTeamBuilderAccessBase({
    getSupabaseClient: createClient,
    user,
    userLoading: loading,
  });
}
