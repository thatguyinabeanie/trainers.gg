"use client";

import { type getCurrentUser } from "@trainers/supabase";
import { useApiQuery } from "@trainers/supabase/react-query";
import { type ActionResult } from "@trainers/validators";

/** The current-user shape returned by `getCurrentUser` (null when unavailable). */
type CurrentUserResult = Awaited<ReturnType<typeof getCurrentUser>>;

/**
 * Fetch the caller's own profile from the auth-gated `/api/v1/me/profile` route.
 *
 * The read moved off the browser anon client (`useSupabaseQuery(getCurrentUser)`)
 * because Phase 2 Task 9 revokes `anon`/`authenticated` SELECT on the `users` /
 * `alts` base tables — a browser-keyed read would silently return zero rows. The
 * route runs the read server-side as the caller's identity instead.
 */
async function fetchCurrentUser(): Promise<ActionResult<CurrentUserResult>> {
  return fetch("/api/v1/me/profile").then((r) => r.json());
}

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
  } = useApiQuery<CurrentUserResult>(["me", "profile"], fetchCurrentUser, {
    staleTime: 60_000,
  });

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
