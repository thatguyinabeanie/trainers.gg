/**
 * Generic API Query Factory
 *
 * Platform-agnostic TanStack Query factory for hitting typed REST/edge-function
 * endpoints that return `ActionResult<T>`.
 *
 * **Design:** the fetcher is injected as a parameter so callers choose how to
 * reach their backend:
 *
 * - **Web** — pass a fetcher that calls `/api/v1/…` on the same origin via
 *   the standard `fetch` API (no auth header needed; cookies handle session).
 * - **Mobile** — pass `apiCall` from `apps/mobile/src/lib/api/client.ts`,
 *   which hits the Vercel/Supabase edge-function URL with a Bearer token.
 *
 * Both consumers share the same `ActionResult<T>` unwrap logic and the same
 * `invalidates` cache-busting behaviour in `useApiMutation`.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from "@tanstack/react-query";
import type { ActionResult } from "@trainers/validators";

// =============================================================================
// useApiQuery
// =============================================================================

/**
 * TanStack Query hook for typed GET requests returning `ActionResult<T>`.
 *
 * @param queryKey - TanStack Query key (e.g., `['tournament', id]`)
 * @param fetcher  - Zero-argument async function that performs the request and
 *                   returns `ActionResult<T>`. Bind any URL/params before
 *                   passing in. Throws (or returns `success: false`) on error.
 * @param options  - Standard TanStack `useQuery` options (`staleTime`, `enabled`, …)
 *
 * @example Web (same-origin fetch)
 * ```ts
 * export function useTournament(id: string) {
 *   return useApiQuery<Tournament>(
 *     ['tournament', id],
 *     () => fetch(`/api/v1/tournaments/${id}`).then(r => r.json()),
 *     { staleTime: 30_000 }
 *   );
 * }
 * ```
 *
 * @example Mobile (edge-function via apiCall)
 * ```ts
 * export function useTournament(id: string) {
 *   return useApiQuery<Tournament>(
 *     ['tournament', id],
 *     () => apiCall<Tournament>(`api-tournaments/${id}`)
 *   );
 * }
 * ```
 */
export function useApiQuery<T>(
  queryKey: QueryKey,
  fetcher: () => Promise<ActionResult<T>>,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">
) {
  return useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      const result = await fetcher();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    ...options,
  });
}

// =============================================================================
// useApiMutation
// =============================================================================

/**
 * TanStack Query mutation hook for typed write requests returning `ActionResult<T>`.
 *
 * Wraps the caller-supplied `mutationFn` in `ActionResult` unwrap logic and
 * automatically invalidates the query-key arrays returned by `options.invalidates`
 * after a successful mutation, then calls any user-supplied `onSuccess` handler.
 *
 * @param mutationFn - Async function that accepts `TVariables` and returns
 *                     `ActionResult<TData>`. Throw or return `success: false` on error.
 * @param options    - Standard TanStack `useMutation` options plus an optional
 *                     `invalidates` function that maps mutation variables to the
 *                     list of query keys to invalidate on success.
 *
 * @example
 * ```ts
 * export function useRegisterTournament() {
 *   return useApiMutation(
 *     ({ tournamentId, altId }: RegisterInput) =>
 *       apiCall(`api-tournaments/${tournamentId}/register`, {
 *         method: 'POST',
 *         body: JSON.stringify({ altId }),
 *       }),
 *     {
 *       invalidates: (variables) => [['tournament', variables.tournamentId]],
 *     }
 *   );
 * }
 * ```
 */
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<ActionResult<TData>>,
  options?: UseMutationOptions<TData, Error, TVariables, unknown> & {
    /**
     * Return the list of TanStack Query keys to invalidate after a successful
     * mutation. Called with the mutation variables so you can include IDs in
     * the key.
     */
    invalidates?: (variables: TVariables) => QueryKey[];
  }
) {
  const queryClient = useQueryClient();
  const {
    invalidates,
    onSuccess: userOnSuccess,
    ...mutationOptions
  } = options ?? {};

  return useMutation<TData, Error, TVariables, unknown>({
    mutationFn: async (variables) => {
      const result = await mutationFn(variables);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate caller-specified queries after every successful mutation.
      if (invalidates) {
        const queryKeys = invalidates(variables);
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Forward to any caller-provided onSuccess handler.
      if (userOnSuccess) {
        // Type assertion needed due to TanStack Query type-parameter complexity:
        // the inferred TData in the outer overload does not narrow through the
        // conditional Options type, so we cast here rather than fight the
        // generated overload signatures.
        (
          userOnSuccess as (
            data: TData,
            variables: TVariables,
            context: unknown
          ) => void
        )(data, variables, context);
      }
    },
    ...mutationOptions,
  });
}
