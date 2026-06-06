"use client";

import { useQuery } from "@tanstack/react-query";

import { type GameFormat } from "@trainers/pokemon";
import { type SpeciesUsagePeriod } from "@trainers/supabase";

import { fetchSpeciesUsageDetail } from "@/actions/usage";

// =============================================================================
// Query key factory
// =============================================================================

export const usageQueryKeys = {
  all: ["usage"] as const,
  detail: (params: { source?: string; formatId?: string; species?: string }) =>
    ["usage", params.source ?? "all", params.formatId ?? null, params.species ?? null] as const,
};

// =============================================================================
// Hook
// =============================================================================

/**
 * TanStack Query hook for fetching trailing usage periods for a species in a
 * given format.
 *
 * - Enabled only when both `species` and `format.id` are defined.
 * - `staleTime`: 5 minutes — usage rollups run at most every few hours, so
 *   this prevents redundant server action calls during a builder session.
 * - Query is backed by a 1-hour server-side `unstable_cache` in the action.
 *
 * @returns Standard `UseQueryResult` — consumers read `.data` for the
 *   `SpeciesUsagePeriod[]` array (oldest→newest, ready for sparklines).
 */
export function useUsageData(
  species: string | undefined,
  format: GameFormat | undefined,
  source?: string
) {
  return useQuery<SpeciesUsagePeriod[]>({
    queryKey: usageQueryKeys.detail({ source, formatId: format?.id, species }),
    enabled: Boolean(species && format?.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!species || !format?.id) return [];

      const result = await fetchSpeciesUsageDetail({
        format: format.id,
        species,
        source: source ?? "all",
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
  });
}
