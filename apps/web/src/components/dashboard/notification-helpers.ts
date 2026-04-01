import { formatDistanceToNowStrict } from "date-fns";
import type { Database } from "@trainers/supabase/types";

type NotificationType = Database["public"]["Enums"]["notification_type"];

/**
 * "Needs attention" types require user action (persistent until resolved).
 * Everything else is informational (shown in the Recent section).
 */
export const ACTION_TYPES: NotificationType[] = ["match_ready", "judge_call"];

export const TYPE_ICON: Record<NotificationType, string> = {
  match_ready: "⚔️",
  match_result: "⚔️",
  match_disputed: "⚖️",
  judge_call: "⚖️",
  judge_resolved: "✅",
  tournament_start: "🏆",
  tournament_round: "🏆",
  tournament_complete: "🏆",
  match_no_show: "📋",
  org_request_approved: "✅",
  org_request_rejected: "✅",
};

export function getTypeIcon(type: NotificationType): string {
  return TYPE_ICON[type] ?? "🔔";
}

export function isActionType(type: NotificationType): boolean {
  return ACTION_TYPES.includes(type);
}

export function formatAge(createdAt: string): string {
  return formatDistanceToNowStrict(new Date(createdAt), { addSuffix: false })
    .replace(" seconds", "s")
    .replace(" second", "s")
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d")
    .replace(" months", "mo")
    .replace(" month", "mo");
}
