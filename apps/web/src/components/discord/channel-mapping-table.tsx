"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";

import {
  ALL_CHANNEL_EVENT_TYPES,
  type DiscordChannelEventType,
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
import { useIsClient } from "@/hooks/use-is-client";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { PickerRefreshButton } from "./picker-refresh-button";
import { ChannelMappingCards } from "./channel-mapping-cards";
import {
  type ChannelMappingInnerProps,
  CHANNEL_EVENT_LABELS,
  getChannelEventMeta,
} from "./channel-mapping-shared";

// =============================================================================
// Types
// =============================================================================

interface ChannelMappingTableProps {
  channelMappings: DiscordChannelMapping[];
  guildChannels: GuildChannel[];
  serverId: number;
  communityId: number;
}

// Re-export shared types/constants so prior consumers (e.g. tests) keep
// working without touching their imports.
export {
  type ChannelMappingInnerProps,
  CHANNEL_EVENT_LABELS,
} from "./channel-mapping-shared";

// =============================================================================
// Inner table (desktop)
// =============================================================================

function ChannelMappingTableInner({
  mappings,
  guildChannels,
  serverId,
  onChannelChange,
  onDelete,
}: ChannelMappingInnerProps) {
  return (
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
          const meta = getChannelEventMeta(mapping.event_type);
          // Sentinel IDs are strings cast to number — detect by typeof after
          // cast back. Optimistic rows must not allow edit/delete until the
          // real ID is populated via router.refresh().
          const isOptimistic = typeof (mapping.id as unknown) === "string";
          return (
            <TableRow
              key={String(mapping.id)}
              className={cn(isOptimistic && "opacity-60")}
            >
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
                    disabled={isOptimistic}
                    onValueChange={(val) => {
                      if (val) onChannelChange(mapping.id, val);
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
                  disabled={isOptimistic}
                  onClick={() => onDelete(mapping.id)}
                >
                  <X className="size-4" />
                </Button>
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

export function ChannelMappingTable({
  channelMappings,
  guildChannels,
  serverId,
  communityId,
}: ChannelMappingTableProps) {
  const router = useRouter();
  const isClient = useIsClient();
  const isMobile = useIsMobile();

  // Optimistic state — start with the server-provided mappings
  const [mappings, setMappings] =
    useState<DiscordChannelMapping[]>(channelMappings);

  // Add-row form state
  const [addEventType, setAddEventType] = useState<
    DiscordChannelEventType | ""
  >("");
  const [addChannelId, setAddChannelId] = useState("");
  const [addPending, startAddTransition] = useTransition();

  // The event types that already have a mapping (used to filter the add-form dropdown)
  const mappedEventTypes = new Set(mappings.map((m) => m.event_type));
  const unmappedEventTypes = ALL_CHANNEL_EVENT_TYPES.filter(
    (t) => !mappedEventTypes.has(t)
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
      eventType: mapping.event_type as DiscordChannelEventType,
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

    // Capture values before the async transition clears them
    const eventType = addEventType;
    const channelId = addChannelId;

    // Use a sentinel ID so edit/delete on this row are disabled until the real
    // ID is available from the server (via router.refresh()).
    const sentinelId = `optimistic-${crypto.randomUUID()}` as unknown as number;

    // Immediately show the row in the table so the UI feels responsive
    setMappings((ms) => [
      ...ms,
      {
        id: sentinelId,
        discord_server_id: serverId,
        event_type: eventType as unknown as DiscordDmEventType,
        channel_id: channelId,
        ping_role_id: null,
        created_at: new Date().toISOString(),
      },
    ]);

    setAddEventType("");
    setAddChannelId("");

    startAddTransition(async () => {
      const result = await upsertChannelMappingAction({
        communityId,
        eventType,
        channelId,
      });

      if (!result.success) {
        toast.error(result.error);
        // Roll back the optimistic row
        setMappings((ms) => ms.filter((m) => m.id !== sentinelId));
        // Restore form fields so the user can retry
        setAddEventType(eventType);
        setAddChannelId(channelId);
        return;
      }

      toast.success("Channel mapping added");
      // Replace the sentinel row with the real row from the server
      router.refresh();
    });
  }

  const innerProps: ChannelMappingInnerProps = {
    mappings,
    guildChannels,
    serverId,
    unmappedEventTypes,
    addEventType,
    addChannelId,
    addPending,
    onChannelChange: handleChannelChange,
    onDelete: handleDelete,
    onAddEventTypeChange: setAddEventType,
    onAddChannelIdChange: setAddChannelId,
    onAdd: handleAdd,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel announcements</CardTitle>
        <CardDescription>
          Route tournament events to specific Discord channels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Empty state — shown before any mapping exists. Derive the empty
            condition from the source constant so it stays correct when new
            event types are added. */}
        {mappings.length === 0 &&
          unmappedEventTypes.length === ALL_CHANNEL_EVENT_TYPES.length && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Add your first channel mapping below to start getting tournament
              announcements in Discord.
            </p>
          )}

        {/* Responsive table/cards.
            Pre-hydration we always render the skeleton so the layout
            doesn't jump when isMobile resolves. Post-hydration on mobile we
            render the cards (with their inline add form) even at zero
            mappings; on desktop we skip the empty table — the empty-state
            copy + add-form below cover that case. */}
        {!isClient ? (
          <div
            aria-hidden
            className="bg-muted/30 animate-pulse rounded-lg"
            style={{ height: `${Math.max(mappings.length, 1) * 80 + 32}px` }}
          />
        ) : isMobile ? (
          <ChannelMappingCards {...innerProps} />
        ) : mappings.length > 0 ? (
          <ChannelMappingTableInner {...innerProps} />
        ) : null}

        {/* Add-row form — rendered outside the responsive conditional for
            desktop only; ChannelMappingCards renders its own add form inline. */}
        {unmappedEventTypes.length > 0 && isClient && !isMobile && (
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
                onValueChange={(v) =>
                  setAddEventType(v as DiscordChannelEventType)
                }
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Event type" />
                </SelectTrigger>
                <SelectContent>
                  {unmappedEventTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {CHANNEL_EVENT_LABELS[t]?.label}
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
