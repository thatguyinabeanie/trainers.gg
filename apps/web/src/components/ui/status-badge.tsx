import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  registrationStatusLabels,
  tournamentStatusLabels,
  matchStatusLabels,
} from "@trainers/utils";

type Status =
  | "active"
  | "upcoming"
  | "draft"
  | "completed"
  | "cancelled"
  | "pending"
  // Match statuses
  | "in_progress"
  // Registration statuses
  | "registered"
  | "confirmed"
  | "checked_in"
  | "waitlist"
  | "declined"
  | "dropped"
  | "disqualified"
  // Tournament statuses
  | "registration";

// Combine all label mappings for centralized label lookup
const allLabels: Record<string, string> = {
  ...registrationStatusLabels,
  ...tournamentStatusLabels,
  ...matchStatusLabels,
};

const statusConfig: Record<Status, { label: string; className: string }> = {
  active: {
    label: allLabels.active ?? "Active",
    className:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  },
  upcoming: {
    label: allLabels.upcoming ?? "Upcoming",
    className:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  },
  draft: {
    label: allLabels.draft ?? "Draft",
    className:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  },
  completed: {
    label: allLabels.completed ?? "Completed",
    className:
      "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  },
  cancelled: {
    label: allLabels.cancelled ?? "Cancelled",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
  },
  pending: {
    label: allLabels.pending ?? "Pending",
    className:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  },
  // Match statuses
  in_progress: {
    label: allLabels.in_progress ?? "In Progress",
    className:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  },
  // Registration statuses
  registered: {
    label: allLabels.registered ?? "Registered",
    className:
      "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/25",
  },
  confirmed: {
    label: allLabels.confirmed ?? "Confirmed",
    className:
      "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/25",
  },
  checked_in: {
    label: allLabels.checked_in ?? "Checked In",
    className:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  },
  waitlist: {
    label: allLabels.waitlist ?? "Waitlist",
    className:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  },
  declined: {
    label: allLabels.declined ?? "Declined",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
  },
  dropped: {
    label: allLabels.dropped ?? "Dropped",
    className:
      "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  },
  disqualified: {
    label: allLabels.disqualified ?? "Disqualified",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
  },
  registration: {
    label: allLabels.registration ?? "Registration Open",
    className:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  },
};

interface StatusBadgeProps {
  status: Status;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {label ?? config.label}
    </Badge>
  );
}

export type { Status };
