"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import {
  type DiscordChannelMapping,
  type DiscordDmEventType,
} from "@trainers/supabase";

import {
  upsertChannelMappingAction,
  deleteChannelMappingAction,
} from "@/actions/discord-integration";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

import { PickerRefreshButton } from "./picker-refresh-button";

// =============================================================================
// Types
// =============================================================================

type ChannelEventType =
  | "tournament_created"
  | "registration_opens"
  | "tournament_ended"
  | "match_result_reported";

interface ChannelMappingTableProps {
  channelMappings: DiscordChannelMapping[];
  guildChannels: GuildChannel[];
  serverId: number;
  communityId: number;
}

// =============================================================================
// Constants
// =============================================================================

const CHANNEL_EVENT_LABELS: Record<
  ChannelEventType,
  { label: string; description: string }
> = {
  tournament_created: {
    label: "Tournament created",
    description: "When a draft tournament is created",
  },
  registration_opens: {
    label: "Registration opens",
    description: "When sign-ups open for a tournament",
  },
  tournament_ended: {
    label: "Tournament ended",
    description: "Final standings + winner announcement",
  },
  match_result_reported: {
    label: "Match result reported",
    description: "Score reported for a match",
  },
};

const ALL_CHANNEL_EVENT_TYPES = Object.keys(
  CHANNEL_EVENT_LABELS
) as ChannelEventType[];

// =============================================================================
// Component
// =============================================================================

export function ChannelMappingTable({
  channelMappings,
  guildChannels,
  serverId,
  communityId,
}: ChannelMappingTableProps) {
  // Optimistic state — start with the server-provided mappings
  const [mappings, setMappings] =
    useState<DiscordChannelMapping[]>(channelMappings);

  // Add-row form state
  const [addEventType, setAddEventType] = useState<ChannelEventType | "">("");
  const [addChannelId, setAddChannelId] = useState("");
  const [addPending, startAddTransition] = useTransition();

  // The event types that already have a mapping (used to filter the add-form dropdown)
  const mappedEventTypes = new Set(mappings.map((m) => m.event_type));
  const unmappedEventTypes = ALL_CHANNEL_EVENT_TYPES.filter(
    (t) => !mappedEventTypes.has(t as DiscordDmEventType)
  );

  // ── Channel change (immediate commit) ─────────────────────────────────────

  function handleChannelChange(mappingId: number, newChannelId: string) {
    const prev = mappings;
    // Optimistic update
    setMappings((ms) =>
      ms.map((m) =>
        m.id === mappingId ? { ...m, channel_id: newChannelId } : m
      )
    );

    const mapping = prev.find((m) => m.id === mappingId);
    if (!mapping) return;

    void upsertChannelMappingAction({
      communityId,
      eventType: mapping.event_type as ChannelEventType,
      channelId: newChannelId,
    }).then((result) => {
      if (!result.success) {
        toast.error(result.error);
        setMappings(prev); // rollback
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(mappingId: number) {
    const prev = mappings;
    // Optimistic remove
    setMappings((ms) => ms.filter((m) => m.id !== mappingId));

    void deleteChannelMappingAction(mappingId).then((result) => {
      if (!result.success) {
        toast.error(result.error);
        setMappings(prev); // rollback
      }
    });
  }

  // ── Add mapping ───────────────────────────────────────────────────────────

  function handleAdd() {
    if (!addEventType || !addChannelId) return;

    startAddTransition(async () => {
      const result = await upsertChannelMappingAction({
        communityId,
        eventType: addEventType,
        channelId: addChannelId,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Optimistically add the new row (server will revalidate with real id on next load)
      setMappings((ms) => [
        ...ms,
        {
          id: result.data.id, // best-effort id from server
          discord_server_id: serverId,
          event_type: addEventType as unknown as DiscordDmEventType,
          channel_id: addChannelId,
          created_at: new Date().toISOString(),
        },
      ]);

      setAddEventType("");
      setAddChannelId("");
      toast.success("Channel mapping added");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel announcements</CardTitle>
        <CardDescription>
          Route tournament events to specific Discord channels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mappings.length === 0 && unmappedEventTypes.length === 4 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Add your first channel mapping below to start getting tournament
            announcements in Discord.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => {
                const meta = CHANNEL_EVENT_LABELS[
                  mapping.event_type as ChannelEventType
                ] ?? {
                  label: mapping.event_type,
                  description: "",
                };
                return (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <p className="font-medium">{meta.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {meta.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Select
                          value={mapping.channel_id}
                          onValueChange={(val) => {
                            if (val) handleChannelChange(mapping.id, val);
                          }}
                        >
                          <SelectTrigger className="w-52">
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
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove mapping"
                        className="size-8"
                        onClick={() => handleDelete(mapping.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Add-row form */}
        {unmappedEventTypes.length > 0 && (
          <div
            className={cn(
              "border-t pt-4",
              mappings.length === 0 && "border-t-0 pt-0"
            )}
          >
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Add mapping
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={addEventType}
                onValueChange={(v) => setAddEventType(v as ChannelEventType)}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Event type" />
                </SelectTrigger>
                <SelectContent>
                  {unmappedEventTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {CHANNEL_EVENT_LABELS[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1">
                <Select
                  value={addChannelId}
                  onValueChange={(val) => {
                    if (val) setAddChannelId(val);
                  }}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Channel" />
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

              <Button
                type="button"
                onClick={handleAdd}
                disabled={!addEventType || !addChannelId || addPending}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
