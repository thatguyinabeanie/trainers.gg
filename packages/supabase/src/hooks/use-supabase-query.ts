/**
 * Generic Supabase Query Hook
 *
 * Platform-agnostic hook for executing Supabase queries with auto-refetch.
 * Similar to TanStack Query / Convex useQuery but for Supabase.
 */

import { useEffect, useState, useRef } from "react";

/**
 * Generic query result type
 */
export interface QueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook for executing Supabase queries with auto-refetch.
 *
 * @param queryFn - Async function that accepts a Supabase client and returns data
 * @param getClient - Function to get the platform-specific Supabase client
 * @param deps - Dependency array to trigger re-execution when values change
 *
 * @example
 * // Web (Next.js)
 * import { useSupabaseQuery } from "@trainers/supabase/hooks";
 * import { createClient } from "@/lib/supabase/client";
 * import { getTournaments } from "@trainers/supabase/client";
 *
 * function useTournaments() {
 *   return useSupabaseQuery(
 *     (supabase) => listTournaments(supabase),
 *     createClient,
 *     []
 *   );
 * }
 *
 * @example
 * // Mobile (Expo)
 * import { useSupabaseQuery } from "@trainers/supabase/hooks";
 * import { getSupabase } from "@/lib/supabase/client";
 * import { getTournaments } from "@trainers/supabase/mobile";
 *
 * function useTournaments() {
 *   return useSupabaseQuery(
 *     (supabase) => listTournaments(supabase),
 *     getSupabase,
 *     []
 *   );
 * }
 */
export function useSupabaseQuery<T>(
  queryFn: (supabase: any) => Promise<T>,
  getClient: () => any,
  deps: unknown[] = []
): QueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  // Store queryFn in a ref to avoid triggering re-executions
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  // Stringify deps to trigger re-execution when values change
  const depsKey = JSON.stringify(deps);

  const execute = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const client = getClient();
      const result = await queryFnRef.current(client);
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
  };

  useEffect(() => {
    mountedRef.current = true;
    execute();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  return {
    data,
    error,
    isLoading,
    refetch: execute,
  };
}
