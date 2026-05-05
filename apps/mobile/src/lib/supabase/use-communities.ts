import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "./client";
import {
  listPublicCommunities,
  getCommunityBySlug,
} from "@trainers/supabase/queries";

export type CommunityWithCounts = Awaited<
  ReturnType<typeof listPublicCommunities>
>[number];

export type CommunityDetail = NonNullable<
  Awaited<ReturnType<typeof getCommunityBySlug>>
>;

/**
 * Hook to fetch all public communities
 */
export function useCommunities() {
  const { data, isLoading, error, refetch } = useQuery<
    CommunityWithCounts[],
    Error
  >({
    queryKey: ["communities-public"],
    queryFn: async () => {
      const supabase = getSupabase();
      return listPublicCommunities(supabase);
    },
    staleTime: 300_000, // 5 minutes - communities change infrequently
  });

  return {
    communities: data ?? [],
    loading: isLoading,
    error: error ?? null,
    refetch,
  };
}

/**
 * Hook to fetch a single community by slug
 */
export function useCommunity(slug: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery<
    CommunityDetail | null,
    Error
  >({
    queryKey: ["community-detail", slug],
    queryFn: async () => {
      const supabase = getSupabase();
      return getCommunityBySlug(supabase, slug!);
    },
    enabled: !!slug,
    staleTime: 300_000,
  });

  return {
    community: data ?? null,
    loading: isLoading,
    error: error ?? null,
    refetch,
  };
}
