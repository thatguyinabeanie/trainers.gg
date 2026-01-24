/**
 * AT Protocol / Bluesky Configuration
 *
 * Configuration for connecting to the trainers.gg PDS and Bluesky network.
 */

// PDS Configuration
export const PDS_URL =
  process.env.NEXT_PUBLIC_PDS_URL || "https://pds.trainers.gg";

// Bluesky App View (for reading public data)
export const BSKY_APP_VIEW_URL = "https://api.bsky.app";

// Public Bluesky API (for unauthenticated reads)
export const BSKY_PUBLIC_URL = "https://public.api.bsky.app";

// OAuth Configuration
export const OAUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID ||
  "https://trainers.gg/oauth/client-metadata.json";

export const OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI ||
  "https://trainers.gg/oauth/callback";

export const OAUTH_SCOPES = "atproto transition:generic";

// Pokemon-related keywords for filtering feeds
export const POKEMON_KEYWORDS = [
  // Hashtags
  "#pokemon",
  "#vgc",
  "#pokemonvgc",
  "#shinyhunting",
  "#shiny",
  "#draftleague",
  "#pokemonshowdown",
  "#competitivepokemon",
  "#pokemonscarlet",
  "#pokemonviolet",
  "#pokemonsv",

  // Keywords
  "pokemon",
  "vgc",
  "showdown",
  "draft league",
  "shiny hunt",
  "competitive pokemon",
  "regionals",
  "nationals",
  "worlds",
  "terastal",
  "tera type",
] as const;

/**
 * Check if text contains Pokemon-related content
 */
export function isPokemonContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return POKEMON_KEYWORDS.some((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );
}
