"use client";

/**
 * TanStack Query hooks for Bluesky profile data.
 *
 * These hooks fetch profile data via server actions and handle
 * caching, optimistic updates, and background refetching.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import type { ProfileView } from "@/lib/atproto/api";
import { getProfileAction } from "@/actions/bluesky/profile-actions";
import {
  followBlueskyUser,
  unfollowBlueskyUser,
  getFollowersAction,
  getFollowsAction,
} from "@/actions/bluesky/social-actions";

/**
 * Query keys for profile data
 */
export const profileKeys = {
  all: ["profile"] as const,
  detail: (actor: string) => [...profileKeys.all, "detail", actor] as const,
  followers: (actor: string) =>
    [...profileKeys.all, "followers", actor] as const,
  following: (actor: string) =>
    [...profileKeys.all, "following", actor] as const,
};

/**
 * Hook for fetching a Bluesky profile by handle or DID
 *
 * @param actor - The handle or DID of the user
 * @returns Query result with profile data
 *
 * @example
 * ```tsx
 * const { data: profile, isLoading } = useProfile("user.bsky.social");
 * ```
 */
export function useProfile(actor: string | null | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(actor ?? ""),
    queryFn: async () => {
      if (!actor) return null;
      const result = await getProfileAction(actor);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!actor,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for following/unfollowing a user with optimistic updates
 *
 * @returns Mutation for toggling follow state
 */
export function useFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetDid,
      isFollowing,
      followUri,
    }: {
      targetDid: string;
      isFollowing: boolean;
      followUri?: string;
    }) => {
      if (isFollowing && followUri) {
        const result = await unfollowBlueskyUser(followUri);
        if (!result.success) throw new Error(result.error);
        return { following: false, followUri: null };
      } else {
        const result = await followBlueskyUser(targetDid);
        if (!result.success) throw new Error(result.error);
        return { following: true, followUri: result.data.followUri };
      }
    },
    onMutate: async ({ targetDid, isFollowing }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: profileKeys.detail(targetDid),
      });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData<ProfileView>(
        profileKeys.detail(targetDid)
      );

      // Optimistically update the profile
      if (previousProfile) {
        queryClient.setQueryData<ProfileView>(
          profileKeys.detail(targetDid),
          (old) =>
            old
              ? {
                  ...old,
                  viewer: {
                    ...old.viewer,
                    following: isFollowing ? undefined : "pending",
                  },
                  followersCount: isFollowing
                    ? (old.followersCount ?? 1) - 1
                    : (old.followersCount ?? 0) + 1,
                }
              : old
        );
      }

      return { previousProfile };
    },
    onError: (_err, { targetDid }, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(
          profileKeys.detail(targetDid),
          context.previousProfile
        );
      }
    },
    onSuccess: (data, { targetDid }) => {
      // Update with actual follow URI
      queryClient.setQueryData<ProfileView>(
        profileKeys.detail(targetDid),
        (old) =>
          old
            ? {
                ...old,
                viewer: {
                  ...old.viewer,
                  following: data.followUri ?? undefined,
                },
              }
            : old
      );
    },
    onSettled: (_, __, { targetDid }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: profileKeys.detail(targetDid),
      });
    },
  });
}

/**
 * Hook for fetching a user's followers with infinite scroll
 *
 * @param actor - The handle or DID of the user
 */
export function useFollowers(actor: string) {
  return useInfiniteQuery({
    queryKey: profileKeys.followers(actor),
    queryFn: async ({ pageParam }) => {
      const result = await getFollowersAction(actor, {
        cursor: pageParam,
        limit: 50,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.cursor : undefined,
    enabled: !!actor,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook for fetching users that a user follows with infinite scroll
 *
 * @param actor - The handle or DID of the user
 */
export function useFollowing(actor: string) {
  return useInfiniteQuery({
    queryKey: profileKeys.following(actor),
    queryFn: async ({ pageParam }) => {
      const result = await getFollowsAction(actor, {
        cursor: pageParam,
        limit: 50,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.cursor : undefined,
    enabled: !!actor,
    staleTime: 60 * 1000,
  });
}

/**
 * Flatten pages of follow list data into a single array of profiles
 */
export function flattenFollowPages(
  pages: Array<{ profiles: ProfileView[] }> | undefined
): ProfileView[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.profiles);
}
