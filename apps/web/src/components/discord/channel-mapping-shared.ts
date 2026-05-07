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
// DM event labels
// ---------------------------------------------------------------------------

export const DM_EVENT_LABELS: Record<string, string> = {
  match_ready: "Match Ready",
  match_starting_soon: "Match Starting Soon",
  match_result_to_confirm: "Match Result to Confirm",
  match_disputed: "Match Disputed",
  team_sheet_needed: "Team Sheet Needed",
  team_sheet_approved: "Team Sheet Approved",
  team_sheet_rejected: "Team Sheet Rejected",
  you_dropped: "You Dropped",
  top_cut_made: "Top Cut Made",
  tournament_starting: "Tournament Starting",
  tournament_cancelled: "Tournament Cancelled",
  check_in_reminder: "Check-in Reminder",
};

// ---------------------------------------------------------------------------
// Role sync event labels
// ---------------------------------------------------------------------------

export const ROLE_SYNC_LABELS: Record<string, string> = {
  verified: "Verified Role",
  member: "Member Role",
  participant: "Participant Role",
  winner: "Tournament Winner Role",
  staff: "Staff Role",
  currently_playing: "Currently Playing Role",
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
  const dmLabel = DM_EVENT_LABELS[eventType];
  if (dmLabel) return dmLabel;
  const roleLabel = ROLE_SYNC_LABELS[eventType];
  if (roleLabel) return roleLabel;
  // Fallback: title-case humanization
  return eventType
    .replace(/_/g, " ")
    .replace(/(?:^|\s)\w/g, (c) => c.toUpperCase());
}
