"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
  type DiscordRoleMapping,
  type DiscordRoleType,
} from "@trainers/supabase";

import {
  toggleRoleMappingAction,
  upsertRoleMappingAction,
} from "@/actions/discord-integration";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type GuildRole } from "@/lib/discord/guild-cache";
import { useIsClient } from "@/hooks/use-is-client";
import { useIsMobile } from "@/hooks/use-mobile";

import { PickerRefreshButton } from "./picker-refresh-button";
import { RoleMappingCards } from "./role-mapping-cards";
import {
  type RoleMappingInnerProps,
  type RoleRowState,
  ROLE_TYPE_META,
  buildInitialRows,
  syncStatus,
} from "./role-mapping-shared";

// =============================================================================
// Types
// =============================================================================

interface RoleMappingTableProps {
  roleMappings: DiscordRoleMapping[];
  guildRoles: GuildRole[];
  serverId: number;
  communityId: number;
  hasHierarchyViolation: boolean;
}

// Re-export shared symbols so prior consumers (tests, cards) continue to
// import from this module without changes.
export {
  type RoleMappingInnerProps,
  type RoleRowState,
  ROLE_TYPES,
  ROLE_TYPE_META,
  buildInitialRows,
  syncStatus,
} from "./role-mapping-shared";

// =============================================================================
// Inner table (desktop)
// =============================================================================

function RoleMappingTableInner({
  rows,
  guildRoles,
  serverId,
  hasHierarchyViolation,
  onToggle,
  onRoleChange,
}: RoleMappingInnerProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">Enable</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Discord role</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const meta = ROLE_TYPE_META[row.roleType];
          const status = syncStatus(row, hasHierarchyViolation);

          return (
            <TableRow key={row.roleType}>
              <TableCell>
                <Switch
                  checked={row.enabled}
                  onCheckedChange={(checked) => onToggle(row.roleType, checked)}
                  aria-label={`Enable ${meta.label} role sync`}
                />
              </TableCell>
              <TableCell>
                <p className="font-medium">
                  {meta.emoji && <span className="mr-1">{meta.emoji}</span>}
                  {meta.label}
                </p>
                <p className="text-muted-foreground text-xs">
                  {meta.description}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Select
                    value={row.discordRoleId}
                    onValueChange={(val) => {
                      if (val) onRoleChange(row.roleType, val);
                    }}
                    disabled={!row.enabled && !row.discordRoleId}
                  >
                    <SelectTrigger className="w-44">
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
              </TableCell>
              <TableCell>
                <span className={status.className}>{status.label}</span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// =============================================================================
// Component
// =============================================================================

export function RoleMappingTable({
  roleMappings,
  guildRoles,
  serverId,
  communityId,
  hasHierarchyViolation,
}: RoleMappingTableProps) {
  const isClient = useIsClient();
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<RoleRowState[]>(
    buildInitialRows(roleMappings)
  );

  // ── Toggle enable/disable ─────────────────────────────────────────────────

  function handleToggle(roleType: DiscordRoleType, enabled: boolean) {
    const prev = rows;
    const row = prev.find((r) => r.roleType === roleType)!;

    // Optimistic update
    setRows((rs) =>
      rs.map((r) => (r.roleType === roleType ? { ...r, enabled } : r))
    );

    if (row.mappingId == null) {
      // No mapping exists yet — nothing to toggle
      toast.error("Assign a Discord role before enabling.");
      setRows(prev);
      return;
    }

    void toggleRoleMappingAction(row.mappingId, enabled).then((result) => {
      if (!result.success) {
        toast.error(result.error);
        setRows(prev); // rollback
      }
    });
  }

  // ── Role picker change ────────────────────────────────────────────────────

  function handleRoleChange(roleType: DiscordRoleType, discordRoleId: string) {
    const prev = rows;
    // Optimistic
    setRows((rs) =>
      rs.map((r) =>
        r.roleType === roleType ? { ...r, discordRoleId, enabled: true } : r
      )
    );

    void upsertRoleMappingAction({
      communityId,
      roleType,
      discordRoleId,
    }).then((result) => {
      if (!result.success) {
        toast.error(result.error);
        setRows(prev); // rollback
      }
    });
  }

  const innerProps: RoleMappingInnerProps = {
    rows,
    guildRoles,
    serverId,
    hasHierarchyViolation,
    onToggle: handleToggle,
    onRoleChange: handleRoleChange,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role assignments</CardTitle>
        <CardDescription>
          Map trainers.gg membership levels to Discord roles. Beanie Bot will
          add and remove roles automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasHierarchyViolation && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              One or more configured roles are below Beanie Bot in your Discord
              server&apos;s role hierarchy. Move <strong>Beanie Bot</strong>{" "}
              above the managed roles in Discord Server Settings → Roles.
            </AlertDescription>
          </Alert>
        )}

        {!isClient ? (
          <div
            aria-hidden
            className="bg-muted/30 animate-pulse rounded-lg"
            style={{ height: `${Math.max(rows.length, 1) * 80 + 32}px` }}
          />
        ) : isMobile ? (
          <RoleMappingCards {...innerProps} />
        ) : (
          <RoleMappingTableInner {...innerProps} />
        )}
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-xs">
          Reconciliation runs every 15 min.
        </p>
      </CardFooter>
    </Card>
  );
}
