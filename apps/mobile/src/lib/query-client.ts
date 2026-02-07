import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query client for mobile app
 *
 * Configuration:
 * - staleTime: 30 seconds - Data considered fresh for 30s before refetch
 * - gcTime: 5 minutes - Unused data kept in cache for 5min before garbage collection
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 2, // Retry failed requests twice
      refetchOnWindowFocus: false, // Don't refetch on app focus (mobile)
    },
  },
});
