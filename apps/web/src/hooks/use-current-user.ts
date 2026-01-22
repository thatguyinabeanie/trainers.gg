"use client";

import { getCurrentUser } from "@trainers/supabase";
import { useSupabaseQuery } from "@/lib/supabase";

/**
 * Shared hook to get the current authenticated user with their profile.
 * Prevents duplicate queries when multiple components need user data.
 *
 * @returns Object with user data and loading state
 */
export function useCurrentUser() {
  const {
    data: user,
    isLoading,
    error,
  } = useSupabaseQuery((supabase) => getCurrentUser(supabase), []);

  return {
    user,
    alt: user?.alt ?? null,
    // Keep profile as alias for backwards compatibility during migration
    profile: user?.alt ?? null,
    isLoading,
    error,
    isAuthenticated: !!user,
    hasProfile: !!user?.alt,
  };
}
