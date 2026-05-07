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

import { DM_EVENT_LABELS as DM_EVENT_META } from "./dm-settings-shared";
import { ROLE_TYPE_META } from "./role-mapping-shared";

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
  registration_closing_soon: {
    label: "Registration closing soon",
    description: "Reminder before registration closes",
  },
  tournament_ended: {
    label: "Tournament ended",
    description: "Final standings + winner announcement",
  },
  match_result_reported: {
    label: "Match result reported",
    description: "Score reported for a match",
  },
  round_posted: {
    label: "Round posted",
    description: "When new round pairings are published",
  },
  standings_posted: {
    label: "Standings posted",
    description: "Updated standings after each round",
  },
  check_in_opened: {
    label: "Check-in opened",
    description: "When check-in opens for a tournament",
  },
};

/**
 * Lookup helper that humanizes any event type — falls back to the raw enum
 * with underscores converted to spaces and the first letter capitalized,
 * so a label-map miss never leaks the raw DB enum into the dashboard.
 */
export function getChannelEventMeta(eventType: string): {
  label: string;
  description: string;
} {
  const known = CHANNEL_EVENT_LABELS[eventType as DiscordChannelEventType];
  if (known) return known;
  const humanized = eventType.replace(/_/g, " ");
  return {
    label: humanized.charAt(0).toUpperCase() + humanized.slice(1),
    description: "",
  };
}

// ---------------------------------------------------------------------------
// DM event labels — derived from canonical dm-settings-shared.ts
// ---------------------------------------------------------------------------

/** Title-cased DM event labels, derived from the canonical DM_EVENT_LABELS */
const DM_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(DM_EVENT_META).map(([key, meta]) => [
    key,
    meta.label.replace(/(?:^|\s)\w/g, (c) => c.toUpperCase()),
  ])
);

// ---------------------------------------------------------------------------
// Role sync event labels — derived from canonical role-mapping-shared.ts
// ---------------------------------------------------------------------------

/** Title-cased role sync labels, derived from ROLE_TYPE_META + "Role" suffix */
const ROLE_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(ROLE_TYPE_META).map(([key, meta]) => [
      key,
      meta.label.endsWith("Role") ? meta.label : `${meta.label} Role`,
    ])
  ),
  // Overrides for labels that differ from "<meta.label> Role"
  winner: "Tournament Winner Role",
  subscriber: "Subscriber Role",
};

// ---------------------------------------------------------------------------
// Universal event label helper — works for channel, DM, and role_sync types
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable label for any event type across all Discord
 * notification categories. Returns title-cased labels for use in activity
 * feeds, ping role config, etc. Falls back to title-cased humanization.
 */
export function getEventLabel(eventType: string): string {
  const channelMeta = CHANNEL_EVENT_LABELS[eventType as DiscordChannelEventType];
  if (channelMeta) {
    // Title-case the sentence-case label (capitalize first letter of each word)
    return channelMeta.label.replace(/(?:^|\s)\w/g, (c) => c.toUpperCase());
  }
  const dmLabel = DM_LABELS[eventType];
  if (dmLabel) return dmLabel;
  const roleLabel = ROLE_LABELS[eventType];
  if (roleLabel) return roleLabel;
  // Fallback: title-case humanization
  return eventType
    .replace(/_/g, " ")
    .replace(/(?:^|\s)\w/g, (c) => c.toUpperCase());
}
