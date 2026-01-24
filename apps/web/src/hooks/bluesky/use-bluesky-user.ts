"use client";

/**
 * Hook to get the current user's Bluesky DID and PDS status.
 *
 * Fetches the user's record from the users table which contains
 * their Bluesky DID if they have linked their account.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

export function useBlueskyUser() {
  const { user } = useAuth();
  const supabase = createClient();

  const query = useQuery({
    queryKey: ["bluesky-user", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("users")
        .select("did, pds_handle, pds_status")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching Bluesky user:", error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    blueskyDid: query.data?.did ?? null,
    pdsHandle: query.data?.pds_handle ?? null,
    pdsStatus: query.data?.pds_status ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
