import { getDiscordIdsByUserIds } from "../queries/discord";
import type { TypedClient } from "../client";

// ============================================================================
// Test helpers
// ============================================================================

/**
 * Create a resolvable chain mock that supports fluent Supabase query chaining.
 * Every chained method returns the proxy; awaiting resolves to `resolveValue`.
 */
function makeResolvableChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  const proxy = new Proxy(chain, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(resolveValue);
      }
      if (typeof prop === "string") {
        return jest.fn().mockReturnValue(proxy);
      }
      return undefined;
    },
  });
  return proxy;
}

/**
 * Build a Supabase mock where `.schema().from()` returns chains that resolve
 * to the configured results in sequence. Used to simulate chunked IN-queries
 * over auth.identities.
 *
 * getDiscordIdsByUserIds calls authIdentities(supabase), which calls:
 *   (supabase as unknown as SupabaseClient<...>).schema("auth").from("identities")
 *
 * We intercept at .schema() to return a from() that returns the chain.
 */
function mockSupabaseIdentitiesSequential(
  results: Array<{ data: unknown; error?: { message: string } | null }>
) {
  let callIndex = 0;
  const supabase = {
    schema: jest.fn(() => ({
      from: jest.fn(() => {
        const result = results[callIndex] ?? { data: null };
        callIndex++;
        return makeResolvableChain(result);
      }),
    })),
  };
  return supabase as unknown as TypedClient;
}

// ============================================================================
// getDiscordIdsByUserIds
// ============================================================================

describe("getDiscordIdsByUserIds", () => {
  it("returns empty array immediately for empty input", async () => {
    // No mock needed — early return before any DB call
    const supabase = {} as unknown as TypedClient;
    const result = await getDiscordIdsByUserIds(supabase, []);
    expect(result).toEqual([]);
  });

  it("returns Discord identity IDs for a small list of user IDs", async () => {
    const supabase = mockSupabaseIdentitiesSequential([
      {
        data: [
          { identity_id: "discord-snowflake-1" },
          { identity_id: "discord-snowflake-2" },
        ],
        error: null,
      },
    ]);

    const result = await getDiscordIdsByUserIds(supabase, [
      "user-uuid-1",
      "user-uuid-2",
    ]);

    expect(result).toEqual(["discord-snowflake-1", "discord-snowflake-2"]);
  });

  it("omits users who have no Discord identity linked", async () => {
    // Only 1 of 2 users has a Discord identity — the DB only returns linked ones
    const supabase = mockSupabaseIdentitiesSequential([
      { data: [{ identity_id: "discord-only-one" }], error: null },
    ]);

    const result = await getDiscordIdsByUserIds(supabase, [
      "user-with-discord",
      "user-without-discord",
    ]);

    expect(result).toEqual(["discord-only-one"]);
  });

  it("chunks large userIds lists and merges all results", async () => {
    // 150 user IDs → 2 chunks: [0..99] and [100..149].
    // Each chunk returns its own batch of Discord identity_ids.
    // Regression guard: a single oversized IN-list causes PostgREST to return
    // "URI too long", which silently dropped all Discord IDs and broke role-sync
    // for large communities.
    const userIds = Array.from({ length: 150 }, (_, i) => `user-${i}`);

    const chunk1Identities = userIds.slice(0, 100).map((_, i) => ({
      identity_id: `discord-${i}`,
    }));
    const chunk2Identities = userIds.slice(100).map((_, i) => ({
      identity_id: `discord-${i + 100}`,
    }));

    const supabase = mockSupabaseIdentitiesSequential([
      { data: chunk1Identities, error: null },
      { data: chunk2Identities, error: null },
    ]);

    const result = await getDiscordIdsByUserIds(supabase, userIds);

    // All 150 Discord IDs must be present
    expect(result).toHaveLength(150);
    expect(result[0]).toBe("discord-0");
    expect(result[99]).toBe("discord-99");
    expect(result[100]).toBe("discord-100");
    expect(result[149]).toBe("discord-149");
  });

  it("throws on chunk error instead of silently returning partial results", async () => {
    // With 150 users, chunk 1 succeeds but chunk 2 errors. fetchInChunks must
    // throw — never silently return only chunk 1's identities — so that the
    // caller gets a visible failure rather than a partial/empty role-sync.
    const userIds = Array.from({ length: 150 }, (_, i) => `user-${i}`);

    const chunk1Identities = userIds.slice(0, 100).map((_, i) => ({
      identity_id: `discord-${i}`,
    }));

    const supabase = mockSupabaseIdentitiesSequential([
      { data: chunk1Identities, error: null },
      { data: null, error: { message: "URI too long" } },
    ]);

    await expect(
      getDiscordIdsByUserIds(supabase, userIds)
    ).rejects.toThrow("URI too long");
  });

  it("handles exactly 100 user IDs in a single chunk without splitting", async () => {
    const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);
    const identities = userIds.map((_, i) => ({
      identity_id: `discord-${i}`,
    }));

    const supabase = mockSupabaseIdentitiesSequential([
      { data: identities, error: null },
    ]);

    const result = await getDiscordIdsByUserIds(supabase, userIds);

    expect(result).toHaveLength(100);
    // Only one chunk call (exactly at the boundary)
    expect((supabase as unknown as { schema: jest.Mock }).schema).toHaveBeenCalledTimes(1);
  });

  it("uses exactly two chunk calls for 101 user IDs", async () => {
    const userIds = Array.from({ length: 101 }, (_, i) => `user-${i}`);

    const supabase = mockSupabaseIdentitiesSequential([
      { data: [{ identity_id: "discord-batch-1" }], error: null },
      { data: [{ identity_id: "discord-batch-2" }], error: null },
    ]);

    const result = await getDiscordIdsByUserIds(supabase, userIds);

    expect(result).toEqual(["discord-batch-1", "discord-batch-2"]);
    // Two chunks: [0..99] and [100]
    expect((supabase as unknown as { schema: jest.Mock }).schema).toHaveBeenCalledTimes(2);
  });
});
