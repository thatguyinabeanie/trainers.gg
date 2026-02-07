import type { Database } from "@trainers/supabase/types";
import { createQuery, createMutation } from "./query-factory";
import { apiCall } from "./client";

type Alt = Database["public"]["Tables"]["alts"]["Row"];

/**
 * Alt (player identity) API hooks using TanStack Query
 */

/**
 * Query hook: List current user's alts
 *
 * @example
 * ```tsx
 * const { data: alts, isLoading } = useAlts();
 * ```
 */
export function useAlts() {
  return createQuery<Alt[]>(["alts"], "api-alts", {
    staleTime: 300_000, // 5 minutes - alts change infrequently
  });
}

/**
 * Query hook: Get alt by ID
 *
 * @example
 * ```tsx
 * const { data: alt } = useAlt('123');
 * ```
 */
export function useAlt(id: string) {
  return createQuery<Alt>(["alt", id], `api-alts/${id}`, {
    staleTime: 300_000, // 5 minutes
  });
}

/**
 * Mutation hook: Create new alt
 *
 * @example
 * ```tsx
 * const createAlt = useCreateAlt();
 *
 * await createAlt.mutateAsync({
 *   username: 'player123',
 *   displayName: 'Player One',
 *   battleTag: 'Player#1234',
 * });
 * ```
 */
export function useCreateAlt() {
  return createMutation<
    Alt,
    {
      username: string;
      displayName: string;
      battleTag?: string;
    }
  >(
    (data) =>
      apiCall("api-alts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    {
      invalidates: () => [["alts"]],
    }
  );
}

/**
 * Mutation hook: Update alt
 *
 * @example
 * ```tsx
 * const updateAlt = useUpdateAlt();
 *
 * await updateAlt.mutateAsync({
 *   id: '123',
 *   displayName: 'New Display Name',
 * });
 * ```
 */
export function useUpdateAlt() {
  return createMutation<
    Alt,
    {
      id: string;
      username?: string;
      displayName?: string;
      battleTag?: string;
    }
  >(
    ({ id, ...data }) =>
      apiCall(`api-alts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    {
      invalidates: (variables) => [["alts"], ["alt", variables.id]],
    }
  );
}

/**
 * Mutation hook: Delete alt
 *
 * @example
 * ```tsx
 * const deleteAlt = useDeleteAlt();
 * await deleteAlt.mutateAsync({ id: '123' });
 * ```
 */
export function useDeleteAlt() {
  return createMutation<{ success: true }, { id: string }>(
    ({ id }) =>
      apiCall(`api-alts/${id}`, {
        method: "DELETE",
      }),
    {
      invalidates: (variables) => [["alts"], ["alt", variables.id]],
    }
  );
}
