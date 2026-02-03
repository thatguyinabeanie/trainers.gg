import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  | "disqualified";

const statusConfig: Record<Status, { label: string; className: string }> = {
  active: {
    label: "Active",
    className:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  },
  upcoming: {
    label: "Upcoming",
    className:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  },
  draft: {
    label: "Draft",
    className:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  },
  completed: {
    label: "Completed",
    className:
      "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
  },
  pending: {
    label: "Pending",
    className:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  },
  // Match statuses
  in_progress: {
    label: "In Progress",
    className:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  },
  // Registration statuses
  registered: {
    label: "Registered",
    className:
      "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/25",
  },
  confirmed: {
    label: "Confirmed",
    className:
      "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/25",
  },
  checked_in: {
    label: "Checked In",
    className:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  },
  waitlist: {
    label: "Waitlist",
    className:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  },
  declined: {
    label: "Declined",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
  },
  dropped: {
    label: "Dropped",
    className:
      "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  },
  disqualified: {
    label: "Disqualified",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
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
