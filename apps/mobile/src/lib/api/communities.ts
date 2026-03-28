import type { Database } from "@trainers/supabase/types";
import { createQuery, createMutation } from "./query-factory";
import { apiCall } from "./client";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

/**
 * Organization API hooks using TanStack Query
 */

/**
 * Query hook: List all organizations
 *
 * @example
 * ```tsx
 * const { data: organizations, isLoading } = useOrganizations();
 * ```
 */
export function useOrganizations() {
  return createQuery<Organization[]>(["organizations"], "api-organizations", {
    staleTime: 300_000, // 5 minutes - organizations change infrequently
  });
}

/**
 * Query hook: Get organization by slug
 *
 * @example
 * ```tsx
 * const { data: org } = useOrganization('trainers-gg');
 * ```
 */
export function useOrganization(slug: string) {
  return createQuery<Organization>(
    ["organization", slug],
    `api-organizations/${slug}`,
    {
      staleTime: 300_000, // 5 minutes
    }
  );
}

/**
 * Mutation hook: Create new organization
 *
 * @example
 * ```tsx
 * const createOrg = useCreateOrganization();
 *
 * await createOrg.mutateAsync({
 *   name: 'My League',
 *   slug: 'my-league',
 *   type: 'league',
 * });
 * ```
 */
export function useCreateOrganization() {
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
      invalidates: () => [["organizations"]],
    }
  );
}

/**
 * Mutation hook: Update organization
 *
 * @example
 * ```tsx
 * const updateOrg = useUpdateOrganization();
 *
 * await updateOrg.mutateAsync({
 *   slug: 'my-league',
 *   description: 'Updated description',
 * });
 * ```
 */
export function useUpdateOrganization() {
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
        ["organizations"],
        ["organization", variables.slug],
      ],
    }
  );
}

/**
 * Mutation hook: Invite organization staff
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
      invalidates: (variables) => [["organization", variables.slug]],
    }
  );
}

/**
 * Mutation hook: Remove organization staff
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
      invalidates: (variables) => [["organization", variables.slug]],
    }
  );
}
