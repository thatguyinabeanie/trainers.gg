"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  type DiscordDmSetting,
  type DiscordDmEventType,
  ALL_DM_EVENT_TYPES,
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

import { PickerRefreshButton } from "./picker-refresh-button";

// =============================================================================
// Types
// =============================================================================

type DeliveryMode = "channel_only" | "dm_only" | "dm_with_fallback";

interface DmSettingsTableProps {
  dmSettings: DiscordDmSetting[];
  guildChannels: GuildChannel[];
  serverId: number;
  communityId: number;
}

// Internal row state (one per event type)
interface DmRowState {
  eventType: DiscordDmEventType;
  mode: DeliveryMode;
  fallbackChannelId: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const DM_EVENT_TYPES = ALL_DM_EVENT_TYPES;

const DM_EVENT_LABELS: Record<
  DiscordDmEventType,
  { label: string; description: string }
> = {
  match_ready: {
    label: "Match ready",
    description: "When your match is posted and both players should start",
  },
  match_starting_soon: {
    label: "Match starting soon",
    description: "Reminder sent before match start time",
  },
  match_result_to_confirm: {
    label: "Match result to confirm",
    description: "When a match result is submitted and needs your confirmation",
  },
  match_disputed: {
    label: "Match disputed",
    description: "When a match result is challenged by either player",
  },
  team_sheet_needed: {
    label: "Team sheet needed",
    description: "When you have not submitted your team sheet yet",
  },
  team_sheet_approved: {
    label: "Team sheet approved",
    description: "When a judge approves your submitted team sheet",
  },
  team_sheet_rejected: {
    label: "Team sheet rejected",
    description: "When a judge rejects your submitted team sheet",
  },
  you_dropped: {
    label: "You dropped",
    description: "When you are dropped from a tournament",
  },
  top_cut_made: {
    label: "Top cut made",
    description: "When you qualify for top cut",
  },
  tournament_starting: {
    label: "Tournament starting",
    description: "When a tournament you registered for is about to begin",
  },
  tournament_cancelled: {
    label: "Tournament cancelled",
    description: "When a tournament you registered for is cancelled",
  },
};

const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  channel_only: "Channel only",
  dm_only: "DM only",
  dm_with_fallback: "DM with fallback",
};

// =============================================================================
// Helpers
// =============================================================================

function buildInitialRows(dmSettings: DiscordDmSetting[]): DmRowState[] {
  const settingsMap = new Map(dmSettings.map((s) => [s.event_type, s]));
  return DM_EVENT_TYPES.map((eventType) => {
    const existing = settingsMap.get(eventType);
    return {
      eventType,
      mode: (existing?.delivery_mode as DeliveryMode) ?? "channel_only",
      fallbackChannelId: existing?.fallback_channel_id ?? null,
    };
  });
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
  const [rows, setRows] = useState<DmRowState[]>(buildInitialRows(dmSettings));

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Delivery mode</TableHead>
              <TableHead>Fallback channel</TableHead>
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
                        handleRowChange(row.eventType, {
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
                            handleRowChange(row.eventType, {
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
      </CardContent>
    </Card>
  );
}
