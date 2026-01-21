"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createClient } from "./client";
import type { TypedSupabaseClient } from "@trainers/supabase";
import type { User } from "@supabase/supabase-js";

/**
 * Hook to get a Supabase client for client components.
 * Creates a stable client instance that persists across re-renders.
 */
export function useSupabase() {
  const client = useMemo(() => createClient(), []);
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
  const supabase = useSupabase();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
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
  }, [supabase, queryFn]);

  // Stringify deps to trigger re-execution when values change
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();

    return () => {
      mountedRef.current = false;
    };
  }, [execute, depsKey]);

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
  const supabase = useSupabase();
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
