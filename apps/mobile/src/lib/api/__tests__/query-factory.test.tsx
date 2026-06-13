import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useApiQuery, useApiMutation } from "../query-factory";
import type { ActionResult } from "@trainers/validators";

/**
 * These tests exercise the generalized factory imported via the back-compat shim
 * (`apps/mobile/src/lib/api/query-factory.ts` → `@trainers/supabase/react-query`).
 *
 * The new API takes a **fetcher function** instead of a string endpoint, so
 * tests construct an inline fetcher rather than calling `apiCall` directly.
 * Mobile callers bind `apiCall` inside their own fetcher before passing it in:
 *
 *   useApiQuery(['tournament', id], () => apiCall<Tournament>(`api-tournaments/${id}`))
 */

describe("useApiQuery", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should fetch data successfully", async () => {
    const mockData = { id: "1", name: "Test Tournament" };
    const fetcher = jest
      .fn()
      .mockResolvedValue({ success: true, data: mockData } as ActionResult<
        typeof mockData
      >);

    const useTestQuery = () =>
      useApiQuery<typeof mockData>(["tournament", "1"], fetcher);

    const { result } = renderHook(() => useTestQuery(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("should handle API errors", async () => {
    const errorMessage = "Tournament not found";
    const fetcher = jest
      .fn()
      .mockResolvedValue({
        success: false,
        error: errorMessage,
      } as ActionResult<{ id: string }>);

    const useTestQuery = () =>
      useApiQuery<{ id: string }>(["tournament", "999"], fetcher);

    const { result } = renderHook(() => useTestQuery(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error(errorMessage));
  });

  it("should respect enabled option", () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue({ success: true, data: { id: "1" } } as ActionResult<{
        id: string;
      }>);

    const useTestQuery = (enabled: boolean) =>
      useApiQuery<{ id: string }>(["tournament", "1"], fetcher, { enabled });

    const { result } = renderHook(() => useTestQuery(false), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("should pass custom query options", async () => {
    const mockData = { id: "1", name: "Test" };
    const fetcher = jest
      .fn()
      .mockResolvedValue({ success: true, data: mockData } as ActionResult<
        typeof mockData
      >);

    const useTestQuery = () =>
      useApiQuery<typeof mockData>(["tournament", "1"], fetcher, {
        staleTime: 60000,
      });

    const { result } = renderHook(() => useTestQuery(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });
});

describe("useApiMutation", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should mutate data successfully", async () => {
    const mockResponse = { id: "1", status: "checked_in" };
    const mutationFn = jest.fn().mockResolvedValueOnce({
      success: true,
      data: mockResponse,
    } as ActionResult<typeof mockResponse>);

    const useTestMutation = () => useApiMutation(mutationFn, {});

    const { result } = renderHook(() => useTestMutation(), { wrapper });

    result.current.mutate({ tournamentId: "1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(mutationFn).toHaveBeenCalledWith({ tournamentId: "1" });
  });

  it("should handle mutation errors", async () => {
    const errorMessage = "Failed to check in";
    const mutationFn = jest.fn().mockResolvedValueOnce({
      success: false,
      error: errorMessage,
    } as ActionResult<never>);

    const useTestMutation = () => useApiMutation(mutationFn, {});

    const { result } = renderHook(() => useTestMutation(), { wrapper });

    result.current.mutate({ tournamentId: "1" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error(errorMessage));
  });

  it("should invalidate queries after successful mutation", async () => {
    const mockResponse = { id: "1", status: "checked_in" };
    const mutationFn = jest.fn().mockResolvedValueOnce({
      success: true,
      data: mockResponse,
    } as ActionResult<typeof mockResponse>);

    const invalidateQueriesSpy = jest.spyOn(queryClient, "invalidateQueries");

    const useTestMutation = () =>
      useApiMutation(mutationFn, {
        invalidates: (vars: { tournamentId: string }) => [
          ["tournament", vars.tournamentId],
          ["tournaments"],
        ],
      });

    const { result } = renderHook(() => useTestMutation(), { wrapper });

    result.current.mutate({ tournamentId: "1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["tournament", "1"],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["tournaments"],
    });
  });

  it("should not invalidate queries if invalidates not provided", async () => {
    const mockResponse = { id: "1" };
    const mutationFn = jest.fn().mockResolvedValueOnce({
      success: true,
      data: mockResponse,
    } as ActionResult<typeof mockResponse>);

    const invalidateQueriesSpy = jest.spyOn(queryClient, "invalidateQueries");

    const useTestMutation = () => useApiMutation(mutationFn, {});

    const { result } = renderHook(() => useTestMutation(), { wrapper });

    result.current.mutate({});

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it("should call onSuccess callback", async () => {
    const mockResponse = { id: "1" };
    const mutationFn = jest.fn().mockResolvedValueOnce({
      success: true,
      data: mockResponse,
    } as ActionResult<typeof mockResponse>);

    const onSuccessSpy = jest.fn();

    const useTestMutation = () =>
      useApiMutation(mutationFn, {
        onSuccess: onSuccessSpy,
      });

    const { result } = renderHook(() => useTestMutation(), { wrapper });

    result.current.mutate({ id: "1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // TanStack Query v5 onSuccess forwards four args:
    // (data, variables, onMutateResult, context)
    // The 4th arg (context) is a MutationFunctionContext object managed by
    // TanStack internally — assert only that the first three are correct.
    expect(onSuccessSpy).toHaveBeenCalledWith(
      mockResponse,
      { id: "1" },
      undefined,
      expect.anything()
    );
  });
});
