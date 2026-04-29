/**
 * Shared types, constants, and helpers used by both the desktop
 * `ChannelMappingTable` (table layout) and the mobile `ChannelMappingCards`
 * (card layout). Lives in its own file to avoid the cards ↔ table circular
 * dependency that arose when both layouts shared types directly.
 */

import {
  type DiscordChannelEventType,
  type DiscordChannelMapping,
} from "@trainers/supabase";

import { type GuildChannel } from "@/lib/discord/guild-cache";

// ---------------------------------------------------------------------------
// Props shared by both layouts
// ---------------------------------------------------------------------------

export interface ChannelMappingInnerProps {
  mappings: DiscordChannelMapping[];
  guildChannels: GuildChannel[];
  serverId: number;
  unmappedEventTypes: DiscordChannelEventType[];
  addEventType: DiscordChannelEventType | "";
  addChannelId: string;
  addPending: boolean;
  onChannelChange: (mappingId: number, newChannelId: string) => void;
  onDelete: (mappingId: number) => void;
  onAddEventTypeChange: (v: DiscordChannelEventType) => void;
  onAddChannelIdChange: (val: string) => void;
  onAdd: () => void;
}

// ---------------------------------------------------------------------------
// Event labels
// ---------------------------------------------------------------------------

export const CHANNEL_EVENT_LABELS: Record<
  DiscordChannelEventType,
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

/**
 * Lookup helper that humanizes any event type — falls back to the raw enum
 * with underscores converted to spaces and the first letter capitalized,
 * so a label-map miss never leaks the raw DB enum into the dashboard.
 */
export function getChannelEventMeta(
  eventType: string
): { label: string; description: string } {
  const known = CHANNEL_EVENT_LABELS[eventType as DiscordChannelEventType];
  if (known) return known;
  const humanized = eventType.replace(/_/g, " ");
  return {
    label: humanized.charAt(0).toUpperCase() + humanized.slice(1),
    description: "",
  };
}
