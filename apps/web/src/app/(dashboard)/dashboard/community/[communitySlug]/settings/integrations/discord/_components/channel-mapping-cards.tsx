"use client";

import { X } from "lucide-react";

import {
  type DiscordChannelMapping,
  type DiscordChannelEventType,
} from "@trainers/supabase";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type GuildChannel } from "@/lib/discord/guild-cache";
import { cn } from "@/lib/utils";

import {
  CHANNEL_EVENT_LABELS,
  type ChannelMappingInnerProps,
} from "./channel-mapping-table";
import { PickerRefreshButton } from "./picker-refresh-button";

// =============================================================================
// ChannelMappingCard (per-row)
// =============================================================================

interface ChannelMappingCardProps {
  mapping: DiscordChannelMapping;
  guildChannels: GuildChannel[];
  serverId: number;
  onChannelChange: (mappingId: number, newChannelId: string) => void;
  onDelete: (mappingId: number) => void;
}

function ChannelMappingCard({
  mapping,
  guildChannels,
  serverId,
  onChannelChange,
  onDelete,
}: ChannelMappingCardProps) {
  const meta = CHANNEL_EVENT_LABELS[
    mapping.event_type as DiscordChannelEventType
  ] ?? {
    label: mapping.event_type,
    description: "",
  };
  // Sentinel IDs are strings cast to number — detect by typeof after cast back.
  const isOptimistic = typeof (mapping.id as unknown) === "string";

  return (
    <div
      className={cn(
        "ring-foreground/10 bg-card overflow-hidden rounded-xl ring-1",
        isOptimistic && "opacity-60"
      )}
    >
      {/* Event label + description */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{meta.label}</p>
          <p className="text-muted-foreground text-xs">{meta.description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Remove mapping"
          className="size-10 shrink-0"
          disabled={isOptimistic}
          onClick={() => onDelete(mapping.id)}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Channel picker */}
      <div className="flex items-center gap-1 px-3 pb-3">
        <Select
          value={mapping.channel_id}
          disabled={isOptimistic}
          onValueChange={(val) => {
            if (val) onChannelChange(mapping.id, val);
          }}
        >
          <SelectTrigger className="flex-1">
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
    </div>
  );
}

// =============================================================================
// ChannelMappingCards
// =============================================================================

export function ChannelMappingCards({
  mappings,
  guildChannels,
  serverId,
  unmappedEventTypes,
  addEventType,
  addChannelId,
  addPending,
  onChannelChange,
  onDelete,
  onAddEventTypeChange,
  onAddChannelIdChange,
  onAdd,
}: ChannelMappingInnerProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Existing mapping cards */}
      {mappings.map((mapping) => (
        <ChannelMappingCard
          key={String(mapping.id)}
          mapping={mapping}
          guildChannels={guildChannels}
          serverId={serverId}
          onChannelChange={onChannelChange}
          onDelete={onDelete}
        />
      ))}

      {/* Add-mapping form — stacks vertically on mobile */}
      {unmappedEventTypes.length > 0 && (
        <div
          className={cn(
            "border-t pt-3",
            mappings.length === 0 && "border-t-0 pt-0"
          )}
        >
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Add mapping
          </p>
          <div className="flex flex-col gap-2">
            <Select
              value={addEventType}
              onValueChange={(v) =>
                onAddEventTypeChange(v as DiscordChannelEventType)
              }
            >
              <SelectTrigger className="w-full">
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
                  if (val) onAddChannelIdChange(val);
                }}
              >
                <SelectTrigger className="flex-1">
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
              className="w-full"
              onClick={onAdd}
              disabled={!addEventType || !addChannelId || addPending}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
