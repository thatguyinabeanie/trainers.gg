/**
 * Mobile API Client
 *
 * TanStack Query hooks for accessing Supabase Edge Functions.
 * All hooks follow consistent patterns with automatic cache invalidation.
 */

export { apiCall } from "./client";
export { useApiQuery, useApiMutation } from "./query-factory";

// Realtime subscriptions
export {
  useRealtimeSubscription,
  useTournamentRealtime,
  useMatchRealtime,
  useNotificationsRealtime,
} from "./realtime";

// Tournament hooks
export {
  useTournament,
  useTournaments,
  useRegisterTournament,
  useCancelRegistration,
  useCheckInTournament,
} from "./tournaments";

// Match hooks
export {
  useMatch,
  useReportGame,
  useUpdateGame,
  useCallJudge,
} from "./matches";

// Alt hooks
export {
  useAlts,
  useAlt,
  useCreateAlt,
  useUpdateAlt,
  useDeleteAlt,
} from "./alts";

// Community hooks
export {
  useCommunities,
  useCommunity,
  useCreateCommunity,
  useUpdateCommunity,
  useInviteStaff,
  useRemoveStaff,
} from "./communities";

// Notification hooks
export {
  useNotifications,
  useMarkNotificationRead,
  useDeleteNotification,
} from "./notifications";
