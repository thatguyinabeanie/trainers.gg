"use client";

import { useMemo } from "react";
import { useSession } from "@clerk/nextjs";
import { createSupabaseClient } from "@trainers/supabase";

/**
 * Hook to get a Supabase client authenticated with the current Clerk session.
 * Use this in client components.
 *
 * Requires a "supabase" JWT template configured in Clerk Dashboard.
 * See: https://clerk.com/docs/integrations/databases/supabase
 */
export function useSupabaseClient() {
  const { session } = useSession();

  const client = useMemo(() => {
    return createSupabaseClient(async () => {
      // Use the "supabase" JWT template configured in Clerk
      return (await session?.getToken({ template: "supabase" })) ?? null;
    });
  }, [session]);

  return client;
}
