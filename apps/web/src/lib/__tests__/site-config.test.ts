/**
 * @jest-environment node
 *
 * Tests for readSiteConfigValues — the server-to-server site_config reader
 * used by trusted server contexts (cron routes, background workers).
 */

import { readSiteConfigValues } from "../site-config";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

function makeSiteConfigMock(result: {
  data: Array<{ key: string; value: unknown }> | null;
  error: { message: string } | null;
}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    then: (onFulfilled: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  };

  return {
    from: jest.fn().mockReturnValue(chain),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("readSiteConfigValues", () => {
  describe("success path", () => {
    it("returns a key-value map for matching rows", async () => {
      const supabase = makeSiteConfigMock({
        data: [
          { key: "rk9_max_teams_per_tick", value: 25 },
          { key: "rk9_team_concurrency", value: 3 },
        ],
        error: null,
      });

      const result = await readSiteConfigValues(supabase as never, [
        "rk9_max_teams_per_tick",
        "rk9_team_concurrency",
      ]);

      expect(result).toEqual({
        rk9_max_teams_per_tick: 25,
        rk9_team_concurrency: 3,
      });
    });

    it("returns {} without querying when keys is empty (fail-open guard)", async () => {
      const fromMock = jest.fn();
      const supabase = { from: fromMock };

      const result = await readSiteConfigValues(supabase as never, []);

      expect(result).toEqual({});
      expect(fromMock).not.toHaveBeenCalled();
    });

    it("passes the keys list to the .in() filter", async () => {
      const inMock = jest.fn().mockReturnThis();
      const chain = {
        select: jest.fn().mockReturnThis(),
        in: inMock,
        then: (
          onFulfilled: (v: { data: unknown; error: unknown }) => unknown
        ) => Promise.resolve({ data: [], error: null }).then(onFulfilled),
      };
      const supabase = { from: jest.fn().mockReturnValue(chain) };

      const keys = ["key_a", "key_b"];
      await readSiteConfigValues(supabase as never, keys);

      expect(inMock).toHaveBeenCalledWith("key", keys);
    });

    it("returns an empty map when no rows match", async () => {
      const supabase = makeSiteConfigMock({ data: [], error: null });

      const result = await readSiteConfigValues(supabase as never, [
        "nonexistent_key",
      ]);

      expect(result).toEqual({});
    });

    it("returns an empty map when data is null (no rows)", async () => {
      const supabase = makeSiteConfigMock({ data: null, error: null });

      const result = await readSiteConfigValues(supabase as never, [
        "some_key",
      ]);

      expect(result).toEqual({});
    });

    it("preserves non-numeric JSONB values (strings, booleans, objects)", async () => {
      const supabase = makeSiteConfigMock({
        data: [
          { key: "feature_flag", value: true },
          { key: "description", value: "hello world" },
          { key: "nested", value: { a: 1 } },
        ],
        error: null,
      });

      const result = await readSiteConfigValues(supabase as never, [
        "feature_flag",
        "description",
        "nested",
      ]);

      expect(result["feature_flag"]).toBe(true);
      expect(result["description"]).toBe("hello world");
      expect(result["nested"]).toEqual({ a: 1 });
    });

    it("omits keys not present in DB rows (missing keys are not returned as null)", async () => {
      const supabase = makeSiteConfigMock({
        data: [{ key: "present_key", value: 42 }],
        error: null,
      });

      const result = await readSiteConfigValues(supabase as never, [
        "present_key",
        "missing_key",
      ]);

      expect("present_key" in result).toBe(true);
      expect("missing_key" in result).toBe(false);
    });
  });

  describe("error path", () => {
    it("throws with the database error message when the query fails", async () => {
      const supabase = makeSiteConfigMock({
        data: null,
        error: { message: "connection refused" },
      });

      await expect(
        readSiteConfigValues(supabase as never, ["any_key"])
      ).rejects.toThrow("Failed to read site_config: connection refused");
    });

    it("does not silently swallow DB errors — always throws", async () => {
      const supabase = makeSiteConfigMock({
        data: null,
        error: { message: "permission denied" },
      });

      await expect(
        readSiteConfigValues(supabase as never, [])
      ).rejects.toThrow();
    });
  });
});
