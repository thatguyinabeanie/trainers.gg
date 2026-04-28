"use client";

import { type DiscordRoleType } from "@trainers/supabase";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { type GuildRole } from "@/lib/discord/guild-cache";

import {
  ROLE_TYPE_META,
  syncStatus,
  type RoleMappingInnerProps,
  type RoleRowState,
} from "./role-mapping-table";
import { PickerRefreshButton } from "./picker-refresh-button";

// =============================================================================
// RoleMappingCard (per-row)
// =============================================================================

interface RoleMappingCardProps {
  row: RoleRowState;
  guildRoles: GuildRole[];
  serverId: number;
  hasHierarchyViolation: boolean;
  onToggle: (roleType: DiscordRoleType, enabled: boolean) => void;
  onRoleChange: (roleType: DiscordRoleType, discordRoleId: string) => void;
}

function RoleMappingCard({
  row,
  guildRoles,
  serverId,
  hasHierarchyViolation,
  onToggle,
  onRoleChange,
}: RoleMappingCardProps) {
  const meta = ROLE_TYPE_META[row.roleType];
  const status = syncStatus(row, hasHierarchyViolation);

  return (
    <div className="ring-foreground/10 bg-card overflow-hidden rounded-xl ring-1">
      {/* Header: enable toggle + label */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {meta.emoji && <span className="mr-1">{meta.emoji}</span>}
            {meta.label}
          </p>
          <p className="text-muted-foreground text-xs">{meta.description}</p>
        </div>
        <Switch
          checked={row.enabled}
          onCheckedChange={(checked) => onToggle(row.roleType, checked)}
          aria-label={`Enable ${meta.label} role sync`}
          className="mt-0.5 shrink-0"
        />
      </div>

      {/* Discord role picker */}
      <div className="flex items-center gap-1 px-3 pb-2">
        <Select
          value={row.discordRoleId}
          onValueChange={(val) => {
            if (val) onRoleChange(row.roleType, val);
          }}
          disabled={!row.enabled && !row.discordRoleId}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {guildRoles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PickerRefreshButton serverId={serverId} />
      </div>

      {/* Sync status footer */}
      <div className="border-t px-3 py-2">
        <span className={status.className}>{status.label}</span>
      </div>
    </div>
  );
}

// =============================================================================
// RoleMappingCards
// =============================================================================

export function RoleMappingCards({
  rows,
  guildRoles,
  serverId,
  hasHierarchyViolation,
  onToggle,
  onRoleChange,
}: RoleMappingInnerProps) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <RoleMappingCard
          key={row.roleType}
          row={row}
          guildRoles={guildRoles}
          serverId={serverId}
          hasHierarchyViolation={hasHierarchyViolation}
          onToggle={onToggle}
          onRoleChange={onRoleChange}
        />
      ))}
    </div>
  );
}
