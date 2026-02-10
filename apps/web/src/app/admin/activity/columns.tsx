"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Database } from "@trainers/supabase";
import { formatTimeAgo } from "@trainers/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AuditActionBadge } from "./audit-action-badge";

type AuditAction = Database["public"]["Enums"]["audit_action"];

// Shape of a single audit log row returned by getAuditLog (with joined actor)
export interface AuditLogEntry {
  id: number;
  action: AuditAction;
  actor_user_id: string | null;
  actor_alt_id: number | null;
  tournament_id: number | null;
  match_id: number | null;
  game_id: number | null;
  organization_id: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_user: {
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
  } | null;
}

// --- Helpers ---

/**
 * Format a date string into a full, human-readable date/time.
 */
function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Build a display name for the actor user. Returns "System" when no actor.
 */
function getActorDisplayName(actor: AuditLogEntry["actor_user"]): string {
  if (!actor) return "System";
  const parts = [actor.first_name, actor.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return actor.username ?? "Unknown";
}

/**
 * Extract a short, human-readable details string from the metadata JSON.
 * Surfaces the most useful information depending on what fields are present.
 */
function extractDetails(entry: AuditLogEntry): string {
  const meta = entry.metadata;
  if (!meta) return "";

  // If there is an explicit description, use it
  if (typeof meta.description === "string" && meta.description) {
    return meta.description;
  }

  // Build contextual detail fragments
  const fragments: string[] = [];

  if (typeof meta.reason === "string" && meta.reason) {
    fragments.push(meta.reason);
  }
  if (typeof meta.role_name === "string") {
    fragments.push(`Role: ${meta.role_name}`);
  }
  if (typeof meta.target_username === "string") {
    fragments.push(`Target: @${meta.target_username}`);
  }
  if (typeof meta.actor_name === "string") {
    fragments.push(`By: ${meta.actor_name}`);
  }
  if (typeof meta.winner_name === "string") {
    fragments.push(`Winner: ${meta.winner_name}`);
  }
  if (typeof meta.round_number === "number") {
    fragments.push(`Round ${meta.round_number}`);
  }
  if (typeof meta.game_number === "number") {
    fragments.push(`Game ${meta.game_number}`);
  }
  if (typeof meta.table_number === "number") {
    fragments.push(`Table ${meta.table_number}`);
  }
  if (typeof meta.score === "string") {
    fragments.push(`Score: ${meta.score}`);
  }

  return fragments.join(" \u00b7 ");
}

/**
 * Build an entity link label from the audit log entry's FK fields.
 * Shows which tournament/match/org the event relates to.
 */
function getEntityLabel(entry: AuditLogEntry): string {
  const parts: string[] = [];
  if (entry.tournament_id) parts.push(`Tournament #${entry.tournament_id}`);
  if (entry.match_id) parts.push(`Match #${entry.match_id}`);
  if (entry.organization_id) parts.push(`Org #${entry.organization_id}`);
  if (entry.game_id) parts.push(`Game #${entry.game_id}`);
  return parts.join(" \u00b7 ");
}

// --- Column Definitions ---

export const columns: ColumnDef<AuditLogEntry>[] = [
  // Timestamp: relative time with full date tooltip
  {
    accessorKey: "created_at",
    header: "Time",
    cell: ({ row }) => {
      const dateStr = row.original.created_at;
      return (
        <Tooltip>
          <TooltipTrigger className="text-muted-foreground text-sm whitespace-nowrap">
            {formatTimeAgo(dateStr)}
          </TooltipTrigger>
          <TooltipContent>{formatFullDate(dateStr)}</TooltipContent>
        </Tooltip>
      );
    },
  },

  // Action: colored badge based on action prefix
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => <AuditActionBadge action={row.original.action} />,
  },

  // Actor: avatar + username, or "System" when null
  {
    accessorKey: "actor_user",
    header: "Actor",
    cell: ({ row }) => {
      const actor = row.original.actor_user;

      if (!actor) {
        return (
          <span className="text-muted-foreground text-sm italic">System</span>
        );
      }

      const displayName = getActorDisplayName(actor);
      const initials = displayName.charAt(0).toUpperCase();

      return (
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarImage src={actor.image ?? undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{displayName}</div>
            {actor.username && (
              <div className="text-muted-foreground truncate text-xs">
                @{actor.username}
              </div>
            )}
          </div>
        </div>
      );
    },
  },

  // Details: extracted from metadata JSON
  {
    id: "details",
    header: "Details",
    cell: ({ row }) => {
      const details = extractDetails(row.original);
      if (!details) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span className="text-muted-foreground max-w-xs truncate text-sm">
          {details}
        </span>
      );
    },
  },

  // Entity: shows related tournament/match/org IDs
  {
    id: "entity",
    header: "Entity",
    cell: ({ row }) => {
      const label = getEntityLabel(row.original);
      if (!label) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {label}
        </span>
      );
    },
  },
];
