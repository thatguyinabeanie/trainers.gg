"use client";

import { useMemo } from "react";
import { useSession } from "@clerk/nextjs";
import { createSupabaseClient } from "@trainers/supabase";

/**
 * Hook to get a Supabase client authenticated with the current Clerk session.
 * Use this in client components.
 *
 * Requires Third-Party Auth configured in Supabase Dashboard.
 * See: https://supabase.com/docs/guides/auth/third-party/clerk
 */
export function useSupabaseClient() {
  const { session } = useSession();

  const client = useMemo(() => {
    return createSupabaseClient(async () => {
      // Use Clerk's session token directly (native Supabase integration)
      return (await session?.getToken()) ?? null;
    });
  }, [session]);

  return client;
}
