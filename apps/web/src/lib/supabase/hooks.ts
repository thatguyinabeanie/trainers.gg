"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSupabaseClient } from "./client";
import type { TypedSupabaseClient } from "@trainers/supabase";

/**
 * Re-export useSupabaseClient for convenience
 */
export { useSupabaseClient as useSupabase } from "./client";

/**
 * Generic query result type
 */
interface QueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook for executing Supabase queries with auto-refetch
 * Similar to Convex's useQuery but for Supabase
 */
export function useSupabaseQuery<T>(
  queryFn: (supabase: TypedSupabaseClient) => Promise<T>,
  deps: unknown[] = []
): QueryResult<T> {
  const { client: supabase, isSessionLoaded } = useSupabaseClient();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    // Wait for session to be loaded before executing
    if (!isSessionLoaded) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFn(supabase);
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [supabase, queryFn, isSessionLoaded]);

  useEffect(() => {
    mountedRef.current = true;
    execute();

    return () => {
      mountedRef.current = false;
    };
  }, [execute, ...deps]);

  return {
    data,
    error,
    isLoading,
    refetch: execute,
  };
}

/**
 * Mutation result type
 */
interface MutationResult<TArgs, TResult> {
  mutate: (args: TArgs) => Promise<TResult>;
  mutateAsync: (args: TArgs) => Promise<TResult>;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook for executing Supabase mutations
 * Similar to Convex's useMutation but for Supabase
 */
export function useSupabaseMutation<TArgs, TResult>(
  mutationFn: (supabase: TypedSupabaseClient, args: TArgs) => Promise<TResult>
): MutationResult<TArgs, TResult> {
  const { client: supabase } = useSupabaseClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = useCallback(
    async (args: TArgs): Promise<TResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFn(supabase, args);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, mutationFn]
  );

  const mutate = useCallback(
    async (args: TArgs): Promise<TResult> => {
      return mutateAsync(args);
    },
    [mutateAsync]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    mutate,
    mutateAsync,
    isLoading,
    error,
    reset,
  };
}
