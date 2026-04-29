"use client";

import { type DiscordDmEventType } from "@trainers/supabase";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type GuildChannel } from "@/lib/discord/guild-cache";

import {
  DM_EVENT_LABELS,
  DELIVERY_MODE_LABELS,
  type DeliveryMode,
  type DmRowState,
  type DmSettingsInnerProps,
} from "./dm-settings-shared";
import { PickerRefreshButton } from "./picker-refresh-button";

// =============================================================================
// DmSettingsCard (per-row)
// =============================================================================

interface DmSettingsCardProps {
  row: DmRowState;
  guildChannels: GuildChannel[];
  serverId: number;
  onRowChange: (
    eventType: DiscordDmEventType,
    patch: Partial<Pick<DmRowState, "mode" | "fallbackChannelId">>
  ) => void;
}

function DmSettingsCard({
  row,
  guildChannels,
  serverId,
  onRowChange,
}: DmSettingsCardProps) {
  const meta = DM_EVENT_LABELS[row.eventType];
  const showFallback = row.mode !== "dm_only";

  return (
    <div className="ring-foreground/10 bg-card overflow-hidden rounded-xl ring-1">
      {/* Event label + delivery mode select on same row */}
      <div className="flex items-start gap-2 px-3 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{meta.label}</p>
        </div>
        <div className="shrink-0">
          <Select
            value={row.mode}
            onValueChange={(val) =>
              onRowChange(row.eventType, { mode: val as DeliveryMode })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(DELIVERY_MODE_LABELS) as [DeliveryMode, string][]
              ).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <p className="text-muted-foreground px-3 pb-2 text-xs">
        {meta.description}
      </p>

      {/* Fallback channel picker — only when mode ≠ dm_only */}
      {showFallback ? (
        <div className="flex items-center gap-1 border-t px-3 py-2">
          <Select
            value={row.fallbackChannelId ?? undefined}
            onValueChange={(val) =>
              onRowChange(row.eventType, { fallbackChannelId: val })
            }
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Fallback channel" />
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
        <div className="border-t px-3 py-2">
          <span className="text-muted-foreground text-sm">—</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DmSettingsCards
// =============================================================================

export function DmSettingsCards({
  rows,
  guildChannels,
  serverId,
  onRowChange,
}: DmSettingsInnerProps) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <DmSettingsCard
          key={row.eventType}
          row={row}
          guildChannels={guildChannels}
          serverId={serverId}
          onRowChange={onRowChange}
        />
      ))}
    </div>
  );
}
