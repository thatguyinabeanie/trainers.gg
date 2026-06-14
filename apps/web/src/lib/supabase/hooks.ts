"use client";

/**
 * Next.js Supabase Hooks
 *
 * Web app-specific wrappers around shared @trainers/supabase/hooks.
 * Injects Next.js browser client automatically.
 */

import { useEffect, useState } from "react";
import { createClient } from "./client";
import type { User } from "@supabase/supabase-js";

/**
 * Hook to get a Supabase client for client components.
 * Creates a stable client instance that persists across re-renders.
 */
export function useSupabase() {
  const client = createClient();
  return client;
}

/**
 * Hook to get the current authenticated user.
 * Subscribes to auth state changes.
 */
export function useUser() {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return { user, isLoading };
}
