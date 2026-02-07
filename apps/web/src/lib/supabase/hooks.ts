"use client";

/**
 * Next.js Supabase Hooks
 *
 * Web app-specific wrappers around shared @trainers/supabase/hooks.
 * Injects Next.js browser client automatically.
 */

import { useEffect, useState } from "react";
import { createClient } from "./client";
import type { TypedSupabaseClient } from "@trainers/supabase";
import type { User } from "@supabase/supabase-js";
import {
  useSupabaseQuery as useSupabaseQueryBase,
  useSupabaseMutation as useSupabaseMutationBase,
} from "@trainers/supabase/hooks";

// Re-export types
export type { QueryResult, MutationResult } from "@trainers/supabase/hooks";

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

/**
 * Hook for executing Supabase queries with auto-refetch.
 * Web-specific wrapper that injects Next.js browser client.
 */
export function useSupabaseQuery<T>(
  queryFn: (supabase: TypedSupabaseClient) => Promise<T>,
  deps: unknown[] = []
) {
  return useSupabaseQueryBase(queryFn, createClient, deps);
}

/**
 * Hook for executing Supabase mutations.
 * Web-specific wrapper that injects Next.js browser client.
 */
export function useSupabaseMutation<TArgs, TResult>(
  mutationFn: (supabase: TypedSupabaseClient, args: TArgs) => Promise<TResult>
) {
  return useSupabaseMutationBase(mutationFn, createClient);
}
