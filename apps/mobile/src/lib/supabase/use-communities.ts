import { useState, useEffect } from "react";
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
  const [communities, setCommunities] = useState<CommunityWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabase();
      const data = await listPublicCommunities(supabase);
      setCommunities(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch communities")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  return {
    communities,
    loading,
    error,
    refetch: fetchCommunities,
  };
}

/**
 * Hook to fetch a single community by slug
 */
export function useCommunity(slug: string | undefined) {
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCommunity = async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabase();
      const data = await getCommunityBySlug(supabase, slug);
      setCommunity(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch community")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunity();
  }, [slug]);

  return {
    community,
    loading,
    error,
    refetch: fetchCommunity,
  };
}
