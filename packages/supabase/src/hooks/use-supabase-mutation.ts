/**
 * Generic Supabase Mutation Hook
 *
 * Platform-agnostic hook for executing Supabase mutations.
 * Similar to TanStack Query / Convex useMutation but for Supabase.
 */

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mutation result type
 */
export interface MutationResult<TArgs, TResult> {
  mutate: (args: TArgs) => Promise<TResult>;
  mutateAsync: (args: TArgs) => Promise<TResult>;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook for executing Supabase mutations.
 *
 * @param mutationFn - Async function that accepts a Supabase client and args, returns result
 * @param getClient - Function to get the platform-specific Supabase client
 *
 * @example
 * // Web (Next.js)
 * import { useSupabaseMutation } from "@trainers/supabase/hooks";
 * import { createClient } from "@/lib/supabase/client";
 * import { createTournament } from "@trainers/supabase/client";
 *
 * function useCreateTournament() {
 *   return useSupabaseMutation(
 *     (supabase, data) => createTournament(supabase, data),
 *     createClient
 *   );
 * }
 *
 * @example
 * // Mobile (Expo)
 * import { useSupabaseMutation } from "@trainers/supabase/hooks";
 * import { getSupabase } from "@/lib/supabase/client";
 * import { createTournament } from "@trainers/supabase/mobile";
 *
 * function useCreateTournament() {
 *   return useSupabaseMutation(
 *     (supabase, data) => createTournament(supabase, data),
 *     getSupabase
 *   );
 * }
 */
export function useSupabaseMutation<TArgs, TResult>(
  mutationFn: (supabase: SupabaseClient, args: TArgs) => Promise<TResult>,
  getClient: () => SupabaseClient
): MutationResult<TArgs, TResult> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = async (args: TArgs): Promise<TResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const client = getClient();
      const result = await mutationFn(client, args);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const mutate = async (args: TArgs): Promise<TResult> => {
    return mutateAsync(args);
  };

  const reset = () => {
    setError(null);
    setIsLoading(false);
  };

  return {
    mutate,
    mutateAsync,
    isLoading,
    error,
    reset,
  };
}
