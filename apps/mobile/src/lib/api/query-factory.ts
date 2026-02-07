import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from "@tanstack/react-query";
import type { ActionResult } from "@trainers/validators";
import { apiCall } from "./client";

/**
 * DRY factory for creating TanStack Query hooks
 *
 * Provides reusable patterns for:
 * - Query hooks (GET requests)
 * - Mutation hooks (POST/PATCH/DELETE requests)
 * - Automatic cache invalidation
 * - Type-safe ActionResult handling
 */

/**
 * Create a query hook for GET requests
 *
 * @param queryKey - TanStack Query key (e.g., ['tournament', id])
 * @param endpoint - Edge function endpoint (e.g., 'api-tournaments/123')
 * @param options - TanStack Query options (staleTime, enabled, etc.)
 *
 * @example
 * ```ts
 * export function useTournament(id: string) {
 *   return createQuery<Tournament>(
 *     ['tournament', id],
 *     `api-tournaments/${id}`
 *   );
 * }
 * ```
 */
export function createQuery<T>(
  queryKey: QueryKey,
  endpoint: string,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">
) {
  return useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      const result = await apiCall<T>(endpoint);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    ...options,
  });
}

/**
 * Create a mutation hook for POST/PATCH/DELETE requests
 *
 * @param mutationFn - Function that calls the API
 * @param options - Mutation options with onSuccess cache invalidation
 *
 * @example
 * ```ts
 * export function useRegisterTournament() {
 *   return createMutation(
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
export function createMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<ActionResult<TData>>,
  options?: UseMutationOptions<TData, Error, TVariables, unknown> & {
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
      // Invalidate specified queries
      if (invalidates) {
        const queryKeys = invalidates(variables);
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Call user-provided onSuccess if exists
      if (userOnSuccess) {
        // Type assertion needed due to TanStack Query type complexity
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
