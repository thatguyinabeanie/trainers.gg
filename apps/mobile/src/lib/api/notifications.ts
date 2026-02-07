import type { Database } from "@trainers/supabase/types";
import { createQuery, createMutation } from "./query-factory";
import { apiCall } from "./client";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

/**
 * Notification API hooks using TanStack Query
 */

/**
 * Query hook: List user's notifications
 *
 * @example
 * ```tsx
 * const { data: notifications, isLoading } = useNotifications();
 * ```
 */
export function useNotifications() {
  return createQuery<Notification[]>(["notifications"], "api-notifications", {
    staleTime: 10_000, // 10 seconds - notifications should be near real-time
    refetchInterval: 30_000, // Poll every 30 seconds
  });
}

/**
 * Mutation hook: Mark notification as read
 *
 * @example
 * ```tsx
 * const markRead = useMarkNotificationRead();
 * await markRead.mutateAsync({ id: '123' });
 * ```
 */
export function useMarkNotificationRead() {
  return createMutation<{ success: true }, { id: string }>(
    ({ id }) =>
      apiCall(`api-notifications/${id}/read`, {
        method: "PATCH",
      }),
    {
      invalidates: () => [["notifications"]],
    }
  );
}

/**
 * Mutation hook: Delete notification
 *
 * @example
 * ```tsx
 * const deleteNotification = useDeleteNotification();
 * await deleteNotification.mutateAsync({ id: '123' });
 * ```
 */
export function useDeleteNotification() {
  return createMutation<{ success: true }, { id: string }>(
    ({ id }) =>
      apiCall(`api-notifications/${id}`, {
        method: "DELETE",
      }),
    {
      invalidates: () => [["notifications"]],
    }
  );
}
