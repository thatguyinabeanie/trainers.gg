import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createQuery, createMutation } from "../query-factory";
import type { ActionResult } from "@trainers/validators";

// Mock the client apiCall function
jest.mock("../client", () => ({
  apiCall: jest.fn(),
}));

import { apiCall } from "../client";
const mockApiCall = apiCall as jest.MockedFunction<typeof apiCall>;

describe("createQuery", () => {
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
    mockApiCall.mockResolvedValueOnce({
      success: true,
      data: mockData,
    });

    const useTestQuery = () =>
      createQuery<typeof mockData>(
        ["tournament", "1"],
        "api-tournaments/1",
        {}
      );

    const { result } = renderHook(() => useTestQuery(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
    expect(mockApiCall).toHaveBeenCalledWith("api-tournaments/1");
  });

  it("should handle API errors", async () => {
    const errorMessage = "Tournament not found";
    mockApiCall.mockResolvedValueOnce({
      success: false,
      error: errorMessage,
    });

    const useTestQuery = () =>
      createQuery<{ id: string }>(
        ["tournament", "999"],
        "api-tournaments/999",
        {}
      );

    const { result } = renderHook(() => useTestQuery(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error(errorMessage));
  });

  it("should respect enabled option", () => {
    const useTestQuery = (enabled: boolean) =>
      createQuery<{ id: string }>(["tournament", "1"], "api-tournaments/1", {
        enabled,
      });

    const { result } = renderHook(() => useTestQuery(false), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it("should pass custom query options", async () => {
    const mockData = { id: "1", name: "Test" };
    mockApiCall.mockResolvedValueOnce({
      success: true,
      data: mockData,
    });

    const useTestQuery = () =>
      createQuery<typeof mockData>(["tournament", "1"], "api-tournaments/1", {
        staleTime: 60000,
      });

    const { result } = renderHook(() => useTestQuery(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });
});

describe("createMutation", () => {
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

    const useTestMutation = () => createMutation(mutationFn, {});

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

    const useTestMutation = () => createMutation(mutationFn, {});

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
      createMutation(mutationFn, {
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

    const useTestMutation = () => createMutation(mutationFn, {});

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
      createMutation(mutationFn, {
        onSuccess: onSuccessSpy,
      });

    const { result } = renderHook(() => useTestMutation(), { wrapper });

    result.current.mutate({ id: "1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccessSpy).toHaveBeenCalledWith(
      mockResponse,
      { id: "1" },
      undefined
    );
  });
});
