/**
 * Shared types, constants, and helpers used by both `DmSettingsTable`
 * (desktop) and `DmSettingsCards` (mobile). Extracted to avoid the
 * cards ↔ table circular import.
 */

import {
  type DiscordDmSetting,
  type DiscordDmEventType,
  ALL_DM_EVENT_TYPES,
} from "@trainers/supabase";

import { type GuildChannel } from "@/lib/discord/guild-cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeliveryMode = "channel_only" | "dm_only" | "dm_with_fallback";

export interface DmRowState {
  eventType: DiscordDmEventType;
  mode: DeliveryMode;
  fallbackChannelId: string | null;
}

export interface DmSettingsInnerProps {
  rows: DmRowState[];
  guildChannels: GuildChannel[];
  serverId: number;
  onRowChange: (
    eventType: DiscordDmEventType,
    patch: Partial<Pick<DmRowState, "mode" | "fallbackChannelId">>
  ) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DM_EVENT_TYPES = ALL_DM_EVENT_TYPES;

export const DM_EVENT_LABELS: Record<
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
  check_in_reminder: {
    label: "Check-in reminder",
    description: "Reminder to check in when check-in opens for your tournament",
  },
};

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  channel_only: "Channel only",
  dm_only: "DM only",
  dm_with_fallback: "DM with fallback",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function buildDmInitialRows(
  dmSettings: DiscordDmSetting[]
): DmRowState[] {
  const settingsMap = new Map(dmSettings.map((s) => [s.event_type, s]));
  return DM_EVENT_TYPES.map((eventType: DiscordDmEventType) => {
    const existing = settingsMap.get(eventType);
    return {
      eventType,
      mode: (existing?.delivery_mode as DeliveryMode) ?? "channel_only",
      fallbackChannelId: existing?.fallback_channel_id ?? null,
    };
  });
}
