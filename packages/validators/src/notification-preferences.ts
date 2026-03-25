import { z } from "zod";

/**
 * All known notification type keys.
 * Must match the notification_type enum in the database.
 */
export const NOTIFICATION_TYPES = [
  "match_ready",
  "match_result",
  "match_disputed",
  "match_no_show",
  "judge_call",
  "judge_resolved",
  "tournament_start",
  "tournament_round",
  "tournament_complete",
  "org_request_approved",
  "org_request_rejected",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Schema for notification preferences — a record of notification type to boolean.
 * Each key must be a valid notification type, and each value must be a boolean.
 */
export const notificationPreferencesSchema = z.record(
  z.enum(NOTIFICATION_TYPES),
  z.boolean()
);

export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;

/**
 * Categories for grouping notification types in the preferences UI.
 */
export const NOTIFICATION_CATEGORIES = [
  {
    key: "match" as const,
    label: "Match",
    description: "Notifications about your matches",
    types: [
      {
        key: "match_ready" as const,
        label: "Match Ready",
        description: "When your match is ready to play",
      },
      {
        key: "match_result" as const,
        label: "Match Result",
        description: "When a match result is reported",
      },
      {
        key: "match_disputed" as const,
        label: "Match Disputed",
        description: "When a scoring dispute is raised on your match",
      },
      {
        key: "match_no_show" as const,
        label: "No-Show",
        description: "When a player is marked as a no-show",
      },
    ],
    staffOnly: false,
  },
  {
    key: "tournament" as const,
    label: "Tournament",
    description: "Notifications about tournament events",
    types: [
      {
        key: "tournament_start" as const,
        label: "Tournament Start",
        description: "When a tournament you are registered in starts",
      },
      {
        key: "tournament_round" as const,
        label: "New Round",
        description: "When a new round starts in your tournament",
      },
      {
        key: "tournament_complete" as const,
        label: "Tournament Complete",
        description: "When a tournament you played in is completed",
      },
    ],
    staffOnly: false,
  },
  {
    key: "staff" as const,
    label: "Staff",
    description: "Notifications for tournament staff",
    types: [
      {
        key: "judge_call" as const,
        label: "Judge Call",
        description: "When a player requests a judge at a match",
      },
      {
        key: "judge_resolved" as const,
        label: "Judge Resolved",
        description: "When a judge resolves a dispute",
      },
    ],
    staffOnly: true,
  },
  {
    key: "organization" as const,
    label: "Organization",
    description: "Notifications about your organizations",
    types: [
      {
        key: "org_request_approved" as const,
        label: "Request Approved",
        description: "When your organization request is approved",
      },
      {
        key: "org_request_rejected" as const,
        label: "Request Rejected",
        description: "When your organization request is rejected",
      },
    ],
    staffOnly: false,
  },
] as const;
