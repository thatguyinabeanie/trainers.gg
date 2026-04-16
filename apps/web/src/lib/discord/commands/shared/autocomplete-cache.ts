/**
 * Simple LRU cache for Discord autocomplete results.
 *
 * Autocomplete fires on every keystroke, so we cache results for 60 seconds
 * keyed by (community_id, option_name, partial_input_lowercase) to avoid
 * hammering the database. ~1000 entries capacity; expired entries are evicted
 * on read.
 */

// =============================================================================
// Types
// =============================================================================

type AutocompleteChoice = { name: string; value: string | number };
type CacheEntry = { value: AutocompleteChoice[]; expiresAt: number };

// =============================================================================
// Constants
// =============================================================================

const MAX_ENTRIES = 1000;
const TTL_MS = 60_000;

// =============================================================================
// Cache store
// =============================================================================

const cache = new Map<string, CacheEntry>();

// =============================================================================
// Public API
// =============================================================================

/**
 * Get a cached autocomplete result.
 * Returns `null` on a cache miss or if the entry has expired.
 * Refreshes the LRU position on a hit.
 */
export function getCached(key: string): AutocompleteChoice[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  // Refresh LRU position by re-inserting
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

/**
 * Store an autocomplete result in the cache.
 * Evicts the oldest entry when capacity is exceeded.
 */
export function setCached(key: string, value: AutocompleteChoice[]): void {
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  if (cache.size > MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
}

// =============================================================================
// Test helpers
// =============================================================================

/** Reset all cache entries — for use in tests only. */
export function _resetAutocompleteCache(): void {
  cache.clear();
}

/** Return the current number of cache entries — for use in tests only. */
export function _cacheSize(): number {
  return cache.size;
}
