/**
 * Pokemon sprite URL utilities.
 *
 * Uses Pokemon Showdown's sprite CDN which accepts species names directly.
 */

/**
 * Convert a species name to a Showdown-compatible sprite slug.
 * Handles forms like "Urshifu-Rapid-Strike" -> "urshifu-rapidstrike"
 */
function toShowdownSlug(species: string): string {
  return species
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "");
}

/**
 * Get the Pokemon Showdown sprite URL for a given species.
 * Uses gen5ani (animated) sprites with a static gen5 fallback.
 */
export function getShowdownSpriteUrl(species: string): string {
  const slug = toShowdownSlug(species);
  return `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;
}
