"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  type DiscordDmSetting,
  type DiscordDmEventType,
} from "@trainers/supabase";

import { upsertDmSettingAction } from "@/actions/discord-integration";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type GuildChannel } from "@/lib/discord/guild-cache";
import { useIsClient } from "@/hooks/use-is-client";
import { useIsMobile } from "@/hooks/use-mobile";

import { PickerRefreshButton } from "./picker-refresh-button";
import { DmSettingsCards } from "./dm-settings-cards";
import {
  type DeliveryMode,
  type DmRowState,
  type DmSettingsInnerProps,
  DM_EVENT_LABELS,
  DELIVERY_MODE_LABELS,
  buildDmInitialRows,
} from "./dm-settings-shared";

// =============================================================================
// Types
// =============================================================================

interface DmSettingsTableProps {
  dmSettings: DiscordDmSetting[];
  guildChannels: GuildChannel[];
  serverId: number;
  communityId: number;
}

// Re-export shared symbols so prior consumers (tests, cards) keep working.
export {
  type DeliveryMode,
  type DmRowState,
  type DmSettingsInnerProps,
  DM_EVENT_LABELS,
  DELIVERY_MODE_LABELS,
  buildDmInitialRows,
} from "./dm-settings-shared";

// =============================================================================
// Inner table (desktop)
// =============================================================================

function DmSettingsTableInner({
  rows,
  guildChannels,
  serverId,
  onRowChange,
}: DmSettingsInnerProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Delivery mode</TableHead>
          <TableHead>Channel</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const meta = DM_EVENT_LABELS[row.eventType];
          const showFallback = row.mode !== "dm_only";

          return (
            <TableRow key={row.eventType}>
              <TableCell>
                <p className="font-medium">{meta.label}</p>
                <p className="text-muted-foreground text-xs">
                  {meta.description}
                </p>
              </TableCell>
              <TableCell>
                <Select
                  value={row.mode}
                  onValueChange={(val) =>
                    onRowChange(row.eventType, {
                      mode: val as DeliveryMode,
                    })
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(DELIVERY_MODE_LABELS) as [
                        DeliveryMode,
                        string,
                      ][]
                    ).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {showFallback ? (
                  <div className="flex items-center gap-1">
                    <Select
                      value={row.fallbackChannelId ?? undefined}
                      onValueChange={(val) =>
                        onRowChange(row.eventType, {
                          fallbackChannelId: val,
                        })
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        {guildChannels.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <PickerRefreshButton serverId={serverId} />
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
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

export function DmSettingsTable({
  dmSettings,
  guildChannels,
  serverId,
  communityId,
}: DmSettingsTableProps) {
  const isClient = useIsClient();
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<DmRowState[]>(buildDmInitialRows(dmSettings));

  function handleRowChange(
    eventType: DiscordDmEventType,
    patch: Partial<Pick<DmRowState, "mode" | "fallbackChannelId">>
  ) {
    const prev = rows;
    const prevRow = prev.find((r) => r.eventType === eventType)!;
    const next: DmRowState = { ...prevRow, ...patch };

    // Optimistic
    setRows((rs) => rs.map((r) => (r.eventType === eventType ? next : r)));

    // Build fallbackChannelId for the action call
    const fallbackChannelId =
      next.mode === "dm_only" ? null : next.fallbackChannelId || null;

    // Skip the network call when switching to a channel-mode without a channel
    // pick — the action's Zod schema rejects this combination, which would roll
    // back the optimistic update before the user can complete the selection.
    if (next.mode !== "dm_only" && !fallbackChannelId) {
      return;
    }

    void upsertDmSettingAction({
      communityId,
      eventType,
      deliveryMode: next.mode,
      fallbackChannelId,
    }).then((result) => {
      if (!result.success) {
        toast.error(result.error);
        setRows(prev); // rollback
      }
    });
  }

  const innerProps: DmSettingsInnerProps = {
    rows,
    guildChannels,
    serverId,
    onRowChange: handleRowChange,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Direct messages to players</CardTitle>
        <CardDescription>
          Control how the bot delivers event notifications — via Discord DM,
          channel announcement, or both.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isClient ? (
          <div
            aria-hidden
            className="bg-muted/30 animate-pulse rounded-lg"
            style={{ height: `${Math.max(rows.length, 1) * 96 + 32}px` }}
          />
        ) : isMobile ? (
          <DmSettingsCards {...innerProps} />
        ) : (
          <DmSettingsTableInner {...innerProps} />
        )}
      </CardContent>
    </Card>
  );
}
