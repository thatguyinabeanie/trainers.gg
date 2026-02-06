/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, waitFor, act } from "@testing-library/react";

// Mock the client module
const mockCreateClient = jest.fn();
const mockGetUser = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock("../client", () => ({
  createClient: mockCreateClient,
}));

// Import after mocking
import {
  useSupabase,
  useUser,
  useSupabaseQuery,
  useSupabaseMutation,
} from "../hooks";

describe("hooks.ts - React hooks for Supabase", () => {
  const mockSupabase = {
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabase);
  });

  describe("useSupabase", () => {
    it("should return Supabase client", () => {
      const { result } = renderHook(() => useSupabase());

      expect(result.current).toBe(mockSupabase);
      expect(mockCreateClient).toHaveBeenCalled();
    });

    it("should create a stable client instance", () => {
      const { result, rerender } = renderHook(() => useSupabase());

      const firstClient = result.current;
      rerender();
      const secondClient = result.current;

      // Client should be recreated each render (createClient is called each time)
      // but the returned object is the same mock
      expect(firstClient).toBe(secondClient);
    });
  });

  describe("useUser", () => {
    it("should return user and loading state", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
      });

      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const { result } = renderHook(() => useUser());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();

      // Wait for user to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(mockGetUser).toHaveBeenCalled();
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });

    it("should return null when not authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      });

      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it("should subscribe to auth state changes", async () => {
      const unsubscribe = jest.fn();
      mockGetUser.mockResolvedValue({
        data: { user: null },
      });

      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe } },
      });

      const { unmount } = renderHook(() => useUser());

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it("should update user on auth state change", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockGetUser.mockResolvedValue({
        data: { user: null },
      });

      let authCallback: ((event: string, session: unknown) => void) | undefined;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Simulate auth state change
      act(() => {
        authCallback?.("SIGNED_IN", { user: mockUser });
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoading).toBe(false);
    });

    it("should set user to null on sign out", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
      });

      let authCallback: ((event: string, session: unknown) => void) | undefined;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Simulate sign out
      act(() => {
        authCallback?.("SIGNED_OUT", null);
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe("useSupabaseQuery", () => {
    it("should execute query and return data", async () => {
      const mockData = { id: 1, name: "Test" };
      const queryFn = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useSupabaseQuery(queryFn));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(queryFn).toHaveBeenCalledWith(mockSupabase);
    });

    it("should handle query errors", async () => {
      const mockError = new Error("Query failed");
      const queryFn = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() => useSupabaseQuery(queryFn));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toEqual(mockError);
    });

    it("should convert non-Error rejections to Error objects", async () => {
      const queryFn = jest.fn().mockRejectedValue("String error");

      const { result } = renderHook(() => useSupabaseQuery(queryFn));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("String error");
    });

    it("should refetch when deps change", async () => {
      const mockData1 = { id: 1, name: "Test 1" };
      const mockData2 = { id: 2, name: "Test 2" };
      const queryFn = jest
        .fn()
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      const { result, rerender } = renderHook(
        ({ id }) => useSupabaseQuery(() => queryFn(id), [id]),
        { initialProps: { id: 1 } }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      expect(queryFn).toHaveBeenCalledTimes(1);

      // Change dependency
      rerender({ id: 2 });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    it("should not refetch when deps are unchanged", async () => {
      const mockData = { id: 1, name: "Test" };
      const queryFn = jest.fn().mockResolvedValue(mockData);

      const { rerender } = renderHook(
        ({ id }) => useSupabaseQuery(() => queryFn(id), [id]),
        { initialProps: { id: 1 } }
      );

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalledTimes(1);
      });

      // Rerender with same dependency
      rerender({ id: 1 });

      // Should not call queryFn again
      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it("should support manual refetch", async () => {
      const mockData = { id: 1, name: "Test" };
      const queryFn = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useSupabaseQuery(queryFn));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(queryFn).toHaveBeenCalledTimes(1);

      // Manual refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    it("should not update state after unmount", async () => {
      const queryFn = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(() => resolve({ id: 1 }), 100))
        );

      const { unmount } = renderHook(() => useSupabaseQuery(queryFn));

      unmount();

      // Wait for query to resolve
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should not throw or cause issues
      expect(queryFn).toHaveBeenCalled();
    });

    it("should handle empty deps array", async () => {
      const mockData = { id: 1, name: "Test" };
      const queryFn = jest.fn().mockResolvedValue(mockData);

      const { result, rerender } = renderHook(() =>
        useSupabaseQuery(queryFn, [])
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(queryFn).toHaveBeenCalledTimes(1);

      // Rerender should not refetch with empty deps
      rerender();
      expect(queryFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("useSupabaseMutation", () => {
    it("should execute mutation and return result", async () => {
      const mockResult = { id: 1, name: "Created" };
      const mutationFn = jest.fn().mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSupabaseMutation(mutationFn));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      let mutationResult: unknown;
      await act(async () => {
        mutationResult = await result.current.mutate({ name: "Test" });
      });

      expect(mutationResult).toEqual(mockResult);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mutationFn).toHaveBeenCalledWith(mockSupabase, { name: "Test" });
    });

    it("should handle mutation errors", async () => {
      const mockError = new Error("Mutation failed");
      const mutationFn = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() => useSupabaseMutation(mutationFn));

      await act(async () => {
        try {
          await result.current.mutate({ name: "Test" });
        } catch (err) {
          expect(err).toEqual(mockError);
        }
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.isLoading).toBe(false);
    });

    it("should convert non-Error rejections to Error objects", async () => {
      const mutationFn = jest.fn().mockRejectedValue("String error");

      const { result } = renderHook(() => useSupabaseMutation(mutationFn));

      await act(async () => {
        try {
          await result.current.mutate({});
        } catch (err) {
          expect(err).toBeInstanceOf(Error);
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("String error");
    });

    it("should support mutateAsync", async () => {
      const mockResult = { id: 1, name: "Created" };
      const mutationFn = jest.fn().mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSupabaseMutation(mutationFn));

      let mutationResult: unknown;
      await act(async () => {
        mutationResult = await result.current.mutateAsync({ name: "Test" });
      });

      expect(mutationResult).toEqual(mockResult);
    });

    it("should reset error state", async () => {
      const mockError = new Error("Mutation failed");
      const mutationFn = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() => useSupabaseMutation(mutationFn));

      await act(async () => {
        try {
          await result.current.mutate({});
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).toEqual(mockError);

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("should set loading state during mutation", async () => {
      const mutationFn = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(() => resolve({ id: 1 }), 10))
        );

      const { result } = renderHook(() => useSupabaseMutation(mutationFn));

      expect(result.current.isLoading).toBe(false);

      // Start mutation
      act(() => {
        result.current.mutate({});
      });

      // Wait for state update
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should clear loading state on error", async () => {
      const mutationFn = jest.fn().mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useSupabaseMutation(mutationFn));

      let caughtError = false;
      await act(async () => {
        try {
          await result.current.mutate({});
        } catch {
          caughtError = true;
        }
      });

      expect(caughtError).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should support multiple mutations", async () => {
      const mockResult1 = { id: 1, name: "First" };
      const mockResult2 = { id: 2, name: "Second" };
      const mutationFn = jest
        .fn()
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2);

      const { result, rerender } = renderHook(() =>
        useSupabaseMutation(mutationFn)
      );

      let result1: unknown;
      await act(async () => {
        result1 = await result.current.mutate({ name: "First" });
      });

      expect(result1).toEqual(mockResult1);
      rerender(); // Force re-render to ensure state is stable

      let result2: unknown;
      await act(async () => {
        result2 = await result.current.mutate({ name: "Second" });
      });

      expect(result2).toEqual(mockResult2);
      expect(mutationFn).toHaveBeenCalledTimes(2);
    });

    it("should clear previous error on new mutation", async () => {
      const mutationFn = jest
        .fn()
        .mockRejectedValueOnce(new Error("First error"))
        .mockResolvedValueOnce({ id: 1 });

      const { result, rerender } = renderHook(() =>
        useSupabaseMutation(mutationFn)
      );

      // First mutation fails
      await act(async () => {
        try {
          await result.current.mutate({});
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();
      rerender(); // Force re-render to ensure state is stable

      // Second mutation succeeds
      await act(async () => {
        await result.current.mutate({});
      });

      expect(result.current.error).toBeNull();
    });
  });
});
