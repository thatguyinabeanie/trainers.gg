/**
 * AT Protocol / Bluesky Configuration
 *
 * Platform-agnostic configuration for connecting to the trainers.gg PDS
 * and Bluesky network. Can be used by both web and mobile apps.
 */

// PDS Configuration
export const PDS_URL = "https://pds.trainers.gg";

// Bluesky App View (for reading public data)
export const BSKY_APP_VIEW_URL = "https://api.bsky.app";

// Public Bluesky API (for unauthenticated reads)
export const BSKY_PUBLIC_URL = "https://public.api.bsky.app";

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
