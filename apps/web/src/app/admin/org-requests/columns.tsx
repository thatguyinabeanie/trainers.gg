"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// --- Types ---

export interface OrgRequestRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  discord_invite_url: string;
  social_links: { platform: string; url: string }[] | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  requester: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
    email: string | null;
  } | null;
}

// --- Label / color mappings ---

export const requestStatusLabels: Record<OrgRequestRow["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const requestStatusClasses: Record<OrgRequestRow["status"], string> = {
  pending:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  approved:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  rejected:
    "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
};

// --- Helpers ---

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// --- Column definitions ---

const columnHelper = createColumnHelper<OrgRequestRow>();

export const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => {
      const row = info.row.original;
      return (
        <div className="min-w-0">
          <div className="truncate font-medium">{row.name}</div>
          <div className="text-muted-foreground truncate text-xs">
            {row.slug}
          </div>
        </div>
      );
    },
  }),

  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const status = info.getValue();
      return (
        <Badge variant="outline" className={cn(requestStatusClasses[status])}>
          {requestStatusLabels[status]}
        </Badge>
      );
    },
  }),

  columnHelper.accessor("requester", {
    header: "Requester",
    cell: (info) => {
      const requester = info.getValue();
      if (!requester) {
        return <span className="text-muted-foreground">--</span>;
      }
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={requester.image ?? undefined} />
            <AvatarFallback>
              {requester.username?.charAt(0).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm">@{requester.username}</span>
        </div>
      );
    },
  }),

  columnHelper.accessor("created_at", {
    header: "Submitted",
    cell: (info) => (
      <span className="text-muted-foreground">
        {formatDate(info.getValue())}
      </span>
    ),
  }),
];
