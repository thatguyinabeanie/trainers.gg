"use client";

import { useMemo } from "react";
import { useSession } from "@clerk/nextjs";
import { createSupabaseClient } from "@trainers/supabase";

/**
 * Hook to get a Supabase client authenticated with the current Clerk session.
 * Use this in client components.
 */
export function useSupabaseClient() {
  const { session } = useSession();

  const client = useMemo(() => {
    return createSupabaseClient(async () => {
      return session?.getToken() ?? null;
    });
  }, [session]);

  return client;
}
