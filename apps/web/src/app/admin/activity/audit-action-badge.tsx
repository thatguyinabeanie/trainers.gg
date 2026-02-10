import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@trainers/supabase";

type AuditAction = Database["public"]["Enums"]["audit_action"];

// Human-readable labels for each audit action
const actionLabels: Record<AuditAction, string> = {
  // Match events
  "match.score_submitted": "Score Submitted",
  "match.score_agreed": "Score Agreed",
  "match.score_disputed": "Score Disputed",
  "match.result_reported": "Result Reported",
  "match.staff_requested": "Judge Called",
  "match.staff_resolved": "Judge Resolved",
  // Judge actions
  "judge.game_reset": "Game Reset",
  "judge.match_reset": "Match Reset",
  "judge.game_override": "Game Override",
  "judge.match_override": "Match Override",
  // Tournament events
  "tournament.started": "Tournament Started",
  "tournament.round_created": "Round Created",
  "tournament.round_started": "Round Started",
  "tournament.round_completed": "Round Completed",
  "tournament.phase_advanced": "Phase Advanced",
  "tournament.completed": "Tournament Completed",
  // Team events
  "team.submitted": "Team Submitted",
  "team.locked": "Team Locked",
  "team.unlocked": "Team Unlocked",
  // Registration events
  "registration.checked_in": "Checked In",
  "registration.dropped": "Player Dropped",
  "registration.late_checkin": "Late Check-In",
  // Admin actions
  "admin.sudo_activated": "Sudo Activated",
  "admin.sudo_deactivated": "Sudo Deactivated",
  "admin.user_suspended": "User Suspended",
  "admin.user_unsuspended": "User Unsuspended",
  "admin.role_granted": "Role Granted",
  "admin.role_revoked": "Role Revoked",
  "admin.impersonation_started": "Impersonation Started",
  "admin.impersonation_ended": "Impersonation Ended",
  "admin.org_approved": "Org Approved",
  "admin.org_rejected": "Org Rejected",
  "admin.org_suspended": "Org Suspended",
  "admin.org_unsuspended": "Org Unsuspended",
  "admin.org_ownership_transferred": "Org Ownership Transferred",
  "admin.flag_created": "Flag Created",
  "admin.flag_toggled": "Flag Toggled",
  "admin.flag_deleted": "Flag Deleted",
  "admin.announcement_created": "Announcement Created",
  "admin.announcement_updated": "Announcement Updated",
  "admin.announcement_deleted": "Announcement Deleted",
};

// Color classes by action prefix
// match.* = blue, judge.* = purple, tournament.* = green,
// admin.* = red, team.* = amber, registration.* = teal
const prefixColors: Record<string, string> = {
  match: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  judge: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  tournament: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  admin: "bg-red-500/10 text-red-700 dark:text-red-400",
  team: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  registration: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
};

/**
 * Returns the human-readable label for an audit action.
 * Falls back to title-casing the action suffix if unknown.
 */
export function getActionLabel(action: AuditAction): string {
  if (action in actionLabels) {
    return actionLabels[action];
  }
  // Fallback: take the part after the dot and title-case it
  const suffix = action.split(".").pop() ?? action;
  return suffix
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Returns the color class string for an audit action's prefix category.
 */
function getActionColor(action: AuditAction): string {
  const prefix = action.split(".")[0] ?? "";
  return prefixColors[prefix] ?? "bg-muted text-muted-foreground";
}

/**
 * Returns the action prefix category (e.g., "match", "admin").
 */
export function getActionPrefix(action: AuditAction): string {
  return action.split(".")[0] ?? "";
}

interface AuditActionBadgeProps {
  action: AuditAction;
  className?: string;
}

/**
 * Renders an audit action as a colored badge with a human-readable label.
 *
 * Color coding by prefix:
 * - match.* = blue
 * - judge.* = purple
 * - tournament.* = green
 * - admin.* = red
 * - team.* = amber
 * - registration.* = teal
 */
export function AuditActionBadge({ action, className }: AuditActionBadgeProps) {
  const label = getActionLabel(action);
  const colorClasses = getActionColor(action);

  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent font-medium", colorClasses, className)}
    >
      {label}
    </Badge>
  );
}
