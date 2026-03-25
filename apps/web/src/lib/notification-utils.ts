import {
  AlertCircle,
  Swords,
  Trophy,
  ShieldAlert,
  Gavel,
  CirclePlay,
  Flag,
  Building2,
} from "lucide-react";

export const notificationIcons: Record<string, typeof Swords> = {
  match_ready: Swords,
  match_result: Flag,
  match_disputed: AlertCircle,
  match_no_show: AlertCircle,
  judge_call: ShieldAlert,
  judge_resolved: Gavel,
  tournament_start: CirclePlay,
  tournament_round: Trophy,
  tournament_complete: Trophy,
  org_request_approved: Building2,
  org_request_rejected: Building2,
};

export function isSafeRelativeUrl(
  url: string | null | undefined
): url is string {
  if (!url) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(url.trim());
  } catch {
    return false;
  }
  // Must start with / and the second char must not be / or \
  return /^\/[^/\\]/.test(decoded);
}
