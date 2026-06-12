/**
 * @jest-environment node
 *
 * Tests for useApiQuery / useApiMutation (packages/supabase/src/hooks/query-factory.ts).
 *
 * The hooks are thin wrappers around TanStack Query's useQuery / useMutation.
 * We mock @tanstack/react-query so we can drive the queryFn and mutationFn
 * synchronously without a React render environment.
 *
 * Key invariants under test:
 *   1. useApiQuery — queryFn unwraps ActionResult<T> and throws on success:false
 *   2. useApiMutation — mutationFn unwraps ActionResult<T> and throws on success:false
 *   3. useApiMutation — onSuccess calls invalidates() and invalidates all returned keys
 *   4. useApiMutation — forwards to userOnSuccess after invalidating
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { ActionResult } from "@trainers/validators";
import type { QueryKey } from "@tanstack/react-query";

// =============================================================================
// Capture TanStack Query calls so we can extract the callbacks
// =============================================================================

/** The queryFn passed to the most recent useQuery call. */
let capturedQueryFn: (() => Promise<unknown>) | undefined;

/** The mutationFn passed to the most recent useMutation call. */
let capturedMutationFn: ((vars: unknown) => Promise<unknown>) | undefined;

/** The onSuccess handler passed to the most recent useMutation call. */
let capturedOnSuccess:
  | ((
      data: unknown,
      variables: unknown,
      onMutateResult: unknown,
      context: unknown
    ) => unknown)
  | undefined;

const mockInvalidateQueries = jest.fn<
  (opts: { queryKey: QueryKey }) => Promise<void>
>();

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn((opts: { queryFn: () => Promise<unknown> }) => {
    capturedQueryFn = opts.queryFn;
    return { data: undefined, isLoading: true };
  }),
  useMutation: jest.fn(
    (opts: {
      mutationFn: (vars: unknown) => Promise<unknown>;
      onSuccess?: (
        data: unknown,
        variables: unknown,
        onMutateResult: unknown,
        context: unknown
      ) => unknown;
    }) => {
      capturedMutationFn = opts.mutationFn;
      capturedOnSuccess = opts.onSuccess;
      return { mutate: jest.fn(), isPending: false };
    }
  ),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
  })),
}));

// Import hooks AFTER mocking so the mocks are in place.
import { useApiQuery, useApiMutation } from "../query-factory";

// =============================================================================
// Helpers
// =============================================================================

function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

function fail(error: string): ActionResult<never> {
  return { success: false, error };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  capturedQueryFn = undefined;
  capturedMutationFn = undefined;
  capturedOnSuccess = undefined;
  mockInvalidateQueries.mockResolvedValue(undefined);
});

// =============================================================================
// useApiQuery
// =============================================================================

describe("useApiQuery", () => {
  describe("queryFn unwrap", () => {
    it("resolves with data when fetcher returns success:true", async () => {
      const fetcher = jest.fn<() => Promise<ActionResult<string>>>().mockResolvedValue(ok("hello"));

      useApiQuery<string>(["test"], fetcher);

      expect(capturedQueryFn).toBeDefined();
      const result = await capturedQueryFn!();
      expect(result).toBe("hello");
    });

    it("throws when fetcher returns success:false", async () => {
      const fetcher = jest
        .fn<() => Promise<ActionResult<string>>>()
        .mockResolvedValue(fail("something went wrong"));

      useApiQuery<string>(["test"], fetcher);

      expect(capturedQueryFn).toBeDefined();
      await expect(capturedQueryFn!()).rejects.toThrow("something went wrong");
    });

    it("passes through non-string data shapes", async () => {
      const payload = { id: "1", name: "Tournament A" };
      const fetcher = jest
        .fn<() => Promise<ActionResult<typeof payload>>>()
        .mockResolvedValue(ok(payload));

      useApiQuery<typeof payload>(["tournament", "1"], fetcher);

      const result = await capturedQueryFn!();
      expect(result).toEqual(payload);
    });

    it("invokes the fetcher inside queryFn (not at hook call time)", async () => {
      const fetcher = jest.fn<() => Promise<ActionResult<number>>>().mockResolvedValue(ok(42));

      useApiQuery<number>(["count"], fetcher);

      // Fetcher should not be called until TanStack Query executes queryFn.
      expect(fetcher).not.toHaveBeenCalled();

      await capturedQueryFn!();
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("forwards TanStack Query options (e.g. staleTime) to useQuery", () => {
      const { useQuery } = jest.requireMock<{
        useQuery: jest.Mock;
      }>("@tanstack/react-query");

      const fetcher = jest.fn<() => Promise<ActionResult<string>>>().mockResolvedValue(ok("x"));
      useApiQuery<string>(["key"], fetcher, { staleTime: 30_000 });

      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({ staleTime: 30_000 })
      );
    });
  });
});

// =============================================================================
// useApiMutation
// =============================================================================

describe("useApiMutation", () => {
  describe("mutationFn unwrap", () => {
    it("resolves with data when mutationFn returns success:true", async () => {
      const fn = jest
        .fn<(v: { id: string }) => Promise<ActionResult<string>>>()
        .mockResolvedValue(ok("done"));

      useApiMutation(fn);

      expect(capturedMutationFn).toBeDefined();
      const result = await capturedMutationFn!({ id: "x" });
      expect(result).toBe("done");
    });

    it.each([
      ["registration closed"],
      ["already checked in"],
    ])("throws %p when mutationFn returns success:false", async (message) => {
      const fn = jest
        .fn<(v: { id: string }) => Promise<ActionResult<string>>>()
        .mockResolvedValue(fail(message));

      useApiMutation(fn);

      await expect(capturedMutationFn!({ id: "x" })).rejects.toThrow(message);
    });
  });

  describe("invalidates", () => {
    it("calls queryClient.invalidateQueries for each key returned by invalidates()", async () => {
      const fn = jest
        .fn<(v: { tournamentId: string }) => Promise<ActionResult<void>>>()
        .mockResolvedValue(ok(undefined));

      const invalidates = jest
        .fn<(v: { tournamentId: string }) => QueryKey[]>()
        .mockReturnValue([
          ["tournament", "t-1"],
          ["tournaments"],
        ]);

      useApiMutation(fn, { invalidates });

      // Simulate TanStack calling onSuccess after a successful mutation.
      expect(capturedOnSuccess).toBeDefined();
      await capturedOnSuccess!(
        "done",
        { tournamentId: "t-1" },
        undefined,
        undefined
      );

      expect(invalidates).toHaveBeenCalledWith({ tournamentId: "t-1" });
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["tournament", "t-1"],
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["tournaments"],
      });
    });

    it("does not call invalidateQueries when invalidates is not provided", async () => {
      const fn = jest
        .fn<(v: unknown) => Promise<ActionResult<void>>>()
        .mockResolvedValue(ok(undefined));

      useApiMutation(fn);

      await capturedOnSuccess!("done", {}, undefined, undefined);

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe("userOnSuccess forwarding", () => {
    it("calls the user-supplied onSuccess handler after invalidating", async () => {
      const fn = jest
        .fn<(v: { id: string }) => Promise<ActionResult<string>>>()
        .mockResolvedValue(ok("result"));

      const userOnSuccess = jest.fn<
        (
          data: string,
          variables: { id: string },
          onMutateResult: unknown,
          context: unknown
        ) => void
      >();

      const invalidates = jest
        .fn<(v: { id: string }) => QueryKey[]>()
        .mockReturnValue([["some-key"]]);

      useApiMutation(fn, { invalidates, onSuccess: userOnSuccess });

      await capturedOnSuccess!("result", { id: "1" }, "ctx", undefined);

      // invalidateQueries called first
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["some-key"],
      });
      // then user callback — all four TanStack v5 args forwarded
      expect(userOnSuccess).toHaveBeenCalledWith(
        "result",
        { id: "1" },
        "ctx",
        undefined
      );
    });

    it("returns the user-supplied onSuccess handler's result so TanStack awaits it", async () => {
      const fn = jest
        .fn<(v: { id: string }) => Promise<ActionResult<string>>>()
        .mockResolvedValue(ok("result"));

      // Handler returns a promise — TanStack v5 awaits the onSuccess return
      // before settling the mutation, so our wrapper must propagate it.
      const userOnSuccess = jest
        .fn<
          (
            data: string,
            variables: { id: string },
            onMutateResult: unknown,
            context: unknown
          ) => Promise<string>
        >()
        .mockResolvedValue("handler-done");

      useApiMutation(fn, { onSuccess: userOnSuccess });

      const returned = await capturedOnSuccess!(
        "result",
        { id: "1" },
        undefined,
        undefined
      );

      expect(returned).toBe("handler-done");
    });

    it("does not call userOnSuccess when it is not provided", () => {
      const fn = jest
        .fn<(v: unknown) => Promise<ActionResult<void>>>()
        .mockResolvedValue(ok(undefined));

      useApiMutation(fn);

      // onSuccess should not throw when no userOnSuccess is provided
      expect(() =>
        capturedOnSuccess!("done", {}, undefined, undefined)
      ).not.toThrow();
    });
  });
});
