/**
 * Tests for the stable sorted-alt-ids logic used in getCachedBulkStats and
 * getCachedBulkRatings on the dashboard home page.
 *
 * The dashboard pre-sorts alt IDs ascending before passing them to the cached
 * fetchers so the cache key is stable regardless of DB return order. This test
 * verifies that sort behavior in isolation.
 */

// =============================================================================
// Helpers — mirror dashboard page logic exactly
// =============================================================================

/** Pre-sorts altIds ascending to produce a stable cache key, matching the
 * dashboard page: `const sortedAltIds = [...altIds].sort((a, b) => a - b);` */
function buildSortedAltIds(altIds: number[]): number[] {
  return [...altIds].sort((a, b) => a - b);
}

// =============================================================================
// Tests
// =============================================================================

describe("buildSortedAltIds — stable cache key for bulk fetchers", () => {
  it("returns ids sorted ascending", () => {
    expect(buildSortedAltIds([3, 1, 2])).toEqual([1, 2, 3]);
  });

  it("produces the same key regardless of input order", () => {
    const a = buildSortedAltIds([5, 1, 3]);
    const b = buildSortedAltIds([3, 5, 1]);
    const c = buildSortedAltIds([1, 3, 5]);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("handles a single alt", () => {
    expect(buildSortedAltIds([42])).toEqual([42]);
  });

  it("handles an empty array", () => {
    expect(buildSortedAltIds([])).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const original = [3, 1, 2];
    buildSortedAltIds(original);
    expect(original).toEqual([3, 1, 2]);
  });

  it("handles duplicate ids (edge case)", () => {
    expect(buildSortedAltIds([2, 2, 1])).toEqual([1, 2, 2]);
  });

  it("handles large alt id values", () => {
    expect(buildSortedAltIds([9999, 1, 5000])).toEqual([1, 5000, 9999]);
  });
});
