/**
 * Shared autocomplete helpers for Discord slash commands.
 *
 * Provides a `cached` higher-order function that wraps any autocomplete query
 * with 60-second in-memory caching, keyed by (communityId, optionName, partial).
 */

import type { TypedClient } from "@trainers/supabase";

import { getCached, setCached } from "./autocomplete-cache";

// =============================================================================
// Types
// =============================================================================

/** A single autocomplete choice returned to Discord. */
export interface AutocompleteChoice {
  name: string;
  value: string | number;
}

/** Discord's hard cap on autocomplete choices per response. */
const MAX_CHOICES = 25;

// =============================================================================
// cached() — HOF that wraps a query with 60s caching
// =============================================================================

/**
 * Wrap an autocomplete query function with 60-second LRU caching.
 *
 * The cache key includes `optionName` and `partial` (lowercased) so different
 * options and different partial inputs use separate cache entries.
 *
 * @param optionName - Discriminates cache keys for different options on the
 *   same command (e.g. "name" vs "tournament").
 * @param query - The async query to execute on a cache miss.
 * @returns A wrapped function with the same signature as `query`.
 */
export function cached<
  Q extends (
    supabase: TypedClient,
    communityId: number,
    partial: string
  ) => Promise<AutocompleteChoice[]>,
>(
  optionName: string,
  query: Q
): (
  supabase: TypedClient,
  communityId: number,
  partial: string
) => Promise<AutocompleteChoice[]> {
  return async (supabase, communityId, partial) => {
    const key = `${communityId}:${optionName}:${partial.toLowerCase()}`;
    const hit = getCached(key);
    if (hit) return hit;
    const results = (await query(supabase, communityId, partial)).slice(
      0,
      MAX_CHOICES
    );
    setCached(key, results);
    return results;
  };
}
