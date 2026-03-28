import type { Database } from "@trainers/supabase/types";
import { createQuery, createMutation } from "./query-factory";
import { apiCall } from "./client";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

/**
 * Community API hooks using TanStack Query
 */

/**
 * Query hook: List all communities
 *
 * @example
 * ```tsx
 * const { data: communities, isLoading } = useCommunities();
 * ```
 */
export function useCommunities() {
  return createQuery<Organization[]>(["communities"], "api-organizations", {
    staleTime: 300_000, // 5 minutes - communities change infrequently
  });
}

/**
 * Query hook: Get community by slug
 *
 * @example
 * ```tsx
 * const { data: community } = useCommunity('trainers-gg');
 * ```
 */
export function useCommunity(slug: string) {
  return createQuery<Organization>(
    ["community", slug],
    `api-organizations/${slug}`,
    {
      staleTime: 300_000, // 5 minutes
    }
  );
}

/**
 * Mutation hook: Create new community
 *
 * @example
 * ```tsx
 * const createCommunity = useCreateCommunity();
 *
 * await createCommunity.mutateAsync({
 *   name: 'My League',
 *   slug: 'my-league',
 *   type: 'league',
 * });
 * ```
 */
export function useCreateCommunity() {
  return createMutation<
    Organization,
    {
      name: string;
      slug: string;
      type: "league" | "store" | "community";
      description?: string;
      website?: string;
      discord?: string;
    }
  >(
    (data) =>
      apiCall("api-organizations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    {
      invalidates: () => [["communities"]],
    }
  );
}

/**
 * Mutation hook: Update community
 *
 * @example
 * ```tsx
 * const updateCommunity = useUpdateCommunity();
 *
 * await updateCommunity.mutateAsync({
 *   slug: 'my-league',
 *   description: 'Updated description',
 * });
 * ```
 */
export function useUpdateCommunity() {
  return createMutation<
    Organization,
    {
      slug: string;
      name?: string;
      description?: string;
      website?: string;
      discord?: string;
    }
  >(
    ({ slug, ...data }) =>
      apiCall(`api-organizations/${slug}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    {
      invalidates: (variables) => [
        ["communities"],
        ["community", variables.slug],
      ],
    }
  );
}

/**
 * Mutation hook: Invite community staff
 *
 * @example
 * ```tsx
 * const inviteStaff = useInviteStaff();
 *
 * await inviteStaff.mutateAsync({
 *   slug: 'my-league',
 *   userId: '123',
 *   role: 'organizer',
 * });
 * ```
 */
export function useInviteStaff() {
  return createMutation<
    { success: true },
    {
      slug: string;
      userId: string;
      role: "organizer" | "judge" | "staff";
    }
  >(
    ({ slug, userId, role }) =>
      apiCall(`api-organizations/${slug}/staff`, {
        method: "POST",
        body: JSON.stringify({ userId, role }),
      }),
    {
      invalidates: (variables) => [["community", variables.slug]],
    }
  );
}

/**
 * Mutation hook: Remove community staff
 *
 * @example
 * ```tsx
 * const removeStaff = useRemoveStaff();
 * await removeStaff.mutateAsync({ slug: 'my-league', userId: '123' });
 * ```
 */
export function useRemoveStaff() {
  return createMutation<{ success: true }, { slug: string; userId: string }>(
    ({ slug, userId }) =>
      apiCall(`api-organizations/${slug}/staff/${userId}`, {
        method: "DELETE",
      }),
    {
      invalidates: (variables) => [["community", variables.slug]],
    }
  );
}
