/** All channel event types supported by Beanie Bot */
export const CHANNEL_EVENT_TYPES = [
  "tournament_created",
  "registration_opens",
  "registration_closing_soon",
  "tournament_ended",
  "match_result_reported",
  "round_posted",
  "standings_posted",
  "check_in_opened",
] as const;

export type ChannelEventType = (typeof CHANNEL_EVENT_TYPES)[number];

/** Human-readable labels for channel event types */
export const CHANNEL_EVENT_TYPE_LABELS: Record<ChannelEventType, string> = {
  tournament_created: "Tournament Created",
  registration_opens: "Registration Opens",
  registration_closing_soon: "Registration Closing Soon",
  tournament_ended: "Tournament Ended",
  match_result_reported: "Match Result Reported",
  round_posted: "Round Posted",
  standings_posted: "Standings Posted",
  check_in_opened: "Check-in Opened",
};

/** Event types that are part of tournament automation (not manually configured) */
export const AUTOMATION_EVENT_TYPES: ChannelEventType[] = [
  "round_posted",
  "standings_posted",
  "registration_closing_soon",
  "check_in_opened",
];

/** Event types manually configured in the Notifications tab */
export const MANUAL_EVENT_TYPES: ChannelEventType[] = [
  "tournament_created",
  "registration_opens",
  "tournament_ended",
  "match_result_reported",
];
