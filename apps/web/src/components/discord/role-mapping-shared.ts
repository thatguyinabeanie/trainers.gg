/**
 * Shared types, constants, and helpers used by both `RoleMappingTable`
 * (desktop) and `RoleMappingCards` (mobile). Lives in its own file so the
 * two layouts don't form a circular import dependency.
 */

import {
  type DiscordRoleMapping,
  type DiscordRoleType,
} from "@trainers/supabase";

import { type GuildRole } from "@/lib/discord/guild-cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoleRowState {
  roleType: DiscordRoleType;
  mappingId: number | null;
  enabled: boolean;
  discordRoleId: string;
}

export interface RoleMappingInnerProps {
  rows: RoleRowState[];
  guildRoles: GuildRole[];
  serverId: number;
  hasHierarchyViolation: boolean;
  onToggle: (roleType: DiscordRoleType, enabled: boolean) => void;
  onRoleChange: (roleType: DiscordRoleType, discordRoleId: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ROLE_TYPES: DiscordRoleType[] = [
  "staff",
  "member",
  "participant",
  "winner",
  "currently_playing",
  "verified",
];

export const ROLE_TYPE_META: Record<
  DiscordRoleType,
  { label: string; description: string; emoji?: string }
> = {
  staff: {
    label: "Staff",
    description: "Community leaders + event staff",
  },
  member: {
    label: "Member",
    description: "Anyone who has registered for a tournament here",
  },
  participant: {
    label: "Participant",
    description: "Registered for any active tournament",
  },
  winner: {
    label: "Winner",
    description: "Rank 1 finishers — honorific, never auto-removed",
    emoji: "🏆",
  },
  currently_playing: {
    label: "Currently playing",
    description: "Players in an active round (added + removed per round)",
  },
  verified: {
    label: "Verified",
    description: "Members who linked their trainers.gg account",
    emoji: "✓",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function buildInitialRows(
  roleMappings: DiscordRoleMapping[]
): RoleRowState[] {
  const mappingsMap = new Map(roleMappings.map((m) => [m.role_type, m]));
  return ROLE_TYPES.map((roleType) => {
    const existing = mappingsMap.get(roleType);
    return {
      roleType,
      mappingId: existing?.id ?? null,
      enabled: existing?.enabled ?? false,
      discordRoleId: existing?.discord_role_id ?? "",
    };
  });
}

export function syncStatus(
  row: RoleRowState,
  hasHierarchyViolation: boolean
): { label: string; className: string } {
  if (!row.enabled) {
    return { label: "—", className: "text-muted-foreground" };
  }
  if (hasHierarchyViolation) {
    return { label: "⚠ Hierarchy", className: "text-destructive font-medium" };
  }
  return { label: "✓ Synced", className: "text-emerald-600 font-medium" };
}
