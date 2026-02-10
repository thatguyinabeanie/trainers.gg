"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

/**
 * Shape of a user row returned by listUsersAdmin.
 * Matches the select shape in admin-users.ts.
 */
export interface AdminUserRow {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  is_locked: boolean | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  alts: Array<{
    id: number;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }> | null;
  user_roles: Array<{
    id: number;
    role: {
      id: number;
      name: string;
      description: string | null;
      scope: string;
    } | null;
  }> | null;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Map role names to human-readable labels */
const roleLabels: Record<string, string> = {
  site_admin: "Site Admin",
  site_moderator: "Moderator",
};

function getRoleLabel(name: string): string {
  return roleLabels[name] ?? name;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Extract site-scoped roles from the user_roles join.
 */
function getSiteRoles(
  userRoles: AdminUserRow["user_roles"]
): Array<{ id: number; name: string }> {
  if (!userRoles) return [];
  return userRoles
    .filter(
      (ur) =>
        ur.role &&
        typeof ur.role === "object" &&
        "scope" in ur.role &&
        ur.role.scope === "site"
    )
    .map((ur) => ({
      id: ur.role!.id,
      name: ur.role!.name,
    }));
}

// ----------------------------------------------------------------
// Column Definitions
// ----------------------------------------------------------------

export const columns: ColumnDef<AdminUserRow>[] = [
  {
    id: "user",
    accessorKey: "username",
    header: "User",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback>
              {user.username?.charAt(0).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">
              {user.first_name || user.last_name
                ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                : (user.username ?? "Unknown")}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              @{user.username ?? "—"}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.email ?? "—"}
      </span>
    ),
  },
  {
    id: "roles",
    header: "Roles",
    cell: ({ row }) => {
      const roles = getSiteRoles(row.original.user_roles);
      if (roles.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => (
            <Badge key={role.id} variant="secondary">
              {getRoleLabel(role.name)}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const isLocked = row.original.is_locked;
      if (isLocked) {
        return (
          <Badge
            variant="outline"
            className={cn(
              "border-red-500/25 bg-red-500/15 text-red-600",
              "dark:text-red-400"
            )}
          >
            Suspended
          </Badge>
        );
      }
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-emerald-500/25 bg-emerald-500/15 text-emerald-600",
            "dark:text-emerald-400"
          )}
        >
          Active
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.created_at ? formatDate(row.original.created_at) : "—"}
      </span>
    ),
  },
];
