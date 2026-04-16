// PostHog event name constants shared across all surfaces:
// - Edge functions (Deno, raw fetch)
// - Web app (posthog-js)
// - Mobile app (posthog-react-native)
//
// Past-tense naming convention for all events.
// Surface is distinguished by the $lib property, not the event name.

// Auth events
export const USER_SIGNED_UP = "user_signed_up" as const;
export const USER_SIGNED_UP_BLUESKY = "user_signed_up_bluesky" as const;

// Tournament events
export const TOURNAMENT_CREATED = "tournament_created" as const;
export const TOURNAMENT_STARTED = "tournament_started" as const;
export const TOURNAMENT_REGISTERED = "tournament_registered" as const;

// Match events
export const GAME_RESULT_SUBMITTED = "game_result_submitted" as const;

// Organization request events
export const ORG_REQUEST_SUBMITTED = "org_request_submitted" as const;
export const ORG_REQUEST_APPROVED = "org_request_approved" as const;
export const ORG_REQUEST_REJECTED = "org_request_rejected" as const;

// Discord events
export const DISCORD_COMMAND_EXECUTED = "discord_command_executed" as const;
export const DISCORD_COMMAND_FAILED = "discord_command_failed" as const;
export const DISCORD_NOTIFICATION_SENT = "discord_notification_sent" as const;
export const DISCORD_NOTIFICATION_FAILED =
  "discord_notification_failed" as const;
export const DISCORD_BOT_INSTALLED = "discord_bot_installed" as const;
export const DISCORD_BOT_UNINSTALLED = "discord_bot_uninstalled" as const;
export const DISCORD_ACCOUNT_LINKED = "discord_account_linked" as const;
export const DISCORD_CHANNEL_MAPPED = "discord_channel_mapped" as const;
export const DISCORD_ROLE_MAPPED = "discord_role_mapped" as const;
export const DISCORD_ROLE_SYNC_FAILED = "discord_role_sync_failed" as const;
