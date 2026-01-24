/**
 * AT Protocol / Bluesky Configuration
 *
 * Re-exports shared configuration and adds web-specific OAuth settings.
 */

// Re-export shared configuration
export {
  PDS_URL,
  BSKY_APP_VIEW_URL,
  BSKY_PUBLIC_URL,
  POKEMON_KEYWORDS,
  isPokemonContent,
} from "@trainers/atproto";

// Web-specific OAuth Configuration
export const OAUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID ||
  "https://trainers.gg/oauth/client-metadata.json";

export const OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI ||
  "https://trainers.gg/oauth/callback";

export const OAUTH_SCOPES = "atproto transition:generic";
