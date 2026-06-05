"use client";

import { useQuery } from "@tanstack/react-query";

import { type GameFormat } from "@trainers/pokemon";
import { type FormatUsageRow } from "@trainers/supabase";

import { fetchFormatUsage } from "@/actions/usage";

import { normalizeSpeciesSlug } from "./pickers/usage-slug";

// =============================================================================
// Hook
// =============================================================================

/**
 * TanStack Query hook for fetching the latest-period species usage ranking for
 * a format.
 *
 * WHY a Map return: The species picker looks up usage by species name for every
 * row in the virtualizer. A `Map<string, FormatUsageRow>` keyed by normalized
 * slug makes each lookup O(1) instead of O(n). Both keys in the Map and the
 * lookup callers normalize via `normalizeSpeciesSlug` to bridge the DB's
 * lowercase-hyphen slugs (e.g. "ogerpon-hearthflame") and the builder's
 * title-case dex names (e.g. "Ogerpon-Hearthflame").
 *
 * - Enabled only when `format?.id` is defined.
 * - `staleTime`: 5 minutes — usage rollups run at most every few hours, so
 *   this prevents redundant server action calls during a builder session.
 * - Query is backed by a 1-hour server-side `unstable_cache` in the action.
 */
export function useFormatUsageData(
  format: GameFormat | undefined,
  source?: string
): Map<string, FormatUsageRow> {
  const { data } = useQuery<FormatUsageRow[]>({
    queryKey: ["usage-format", source ?? "all", format?.id],
    enabled: Boolean(format?.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!format?.id) return [];

      const result = await fetchFormatUsage({
        format: format.id,
        source: source ?? "all",
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
  });

  // Build a normalized-slug → FormatUsageRow lookup Map.
  // React Compiler tracks `data` identity — no manual memo needed.
  const usageMap = new Map<string, FormatUsageRow>();
  for (const row of data ?? []) {
    usageMap.set(normalizeSpeciesSlug(row.species), row);
  }
  return usageMap;
}
