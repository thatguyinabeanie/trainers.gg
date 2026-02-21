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

// Admin events
export const BETA_INVITE_SENT = "beta_invite_sent" as const;

// Tournament events
export const TOURNAMENT_CREATED = "tournament_created" as const;
export const TOURNAMENT_STARTED = "tournament_started" as const;
export const TOURNAMENT_REGISTERED = "tournament_registered" as const;

// Match events
export const GAME_RESULT_SUBMITTED = "game_result_submitted" as const;
