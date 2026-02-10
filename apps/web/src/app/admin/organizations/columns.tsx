"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// --- Types ---

/**
 * Shape of each row returned by listOrganizationsAdmin.
 * The `owner` field is a joined relationship from the users table.
 */
export interface OrgRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: "pending" | "active" | "rejected" | "suspended";
  tier: "regular" | "verified" | "partner";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  owner: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
  } | null;
}

// --- Label / color mappings ---

/** Human-readable labels for organization statuses */
export const orgStatusLabels: Record<OrgRow["status"], string> = {
  pending: "Pending",
  active: "Active",
  rejected: "Rejected",
  suspended: "Suspended",
};

/** Tailwind classes for each organization status badge */
const orgStatusClasses: Record<OrgRow["status"], string> = {
  pending:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  active:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  rejected:
    "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  suspended: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
};

/** Human-readable labels for organization tiers */
export const orgTierLabels: Record<OrgRow["tier"], string> = {
  regular: "Regular",
  verified: "Verified",
  partner: "Partner",
};

/** Tailwind classes for each organization tier badge */
const orgTierClasses: Record<OrgRow["tier"], string> = {
  regular: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  verified:
    "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  partner:
    "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25",
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

const columnHelper = createColumnHelper<OrgRow>();

export const columns = [
  // Name column: org name with slug underneath
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

  // Status column: colored badge
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const status = info.getValue();
      return (
        <Badge variant="outline" className={cn(orgStatusClasses[status])}>
          {orgStatusLabels[status]}
        </Badge>
      );
    },
  }),

  // Tier column: colored badge
  columnHelper.accessor("tier", {
    header: "Tier",
    cell: (info) => {
      const tier = info.getValue();
      return (
        <Badge variant="outline" className={cn(orgTierClasses[tier])}>
          {orgTierLabels[tier]}
        </Badge>
      );
    },
  }),

  // Owner column: avatar + username
  columnHelper.accessor("owner", {
    header: "Owner",
    cell: (info) => {
      const owner = info.getValue();
      if (!owner) {
        return <span className="text-muted-foreground">--</span>;
      }
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={owner.image ?? undefined} />
            <AvatarFallback>
              {owner.username?.charAt(0).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm">@{owner.username}</span>
        </div>
      );
    },
  }),

  // Created column: formatted date
  columnHelper.accessor("created_at", {
    header: "Created",
    cell: (info) => (
      <span className="text-muted-foreground">
        {formatDate(info.getValue())}
      </span>
    ),
  }),
];
