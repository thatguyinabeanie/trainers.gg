/**
 * Pokemon sprite URL utilities.
 *
 * Uses @pkmn/img for Pokemon and item sprites (handles all forms/variants
 * correctly), and Showdown's CDN directly for type icons.
 */

import { Sprites, Icons } from "@pkmn/img";

export interface SpriteData {
  url: string;
  w: number;
  h: number;
  pixelated: boolean;
}

/**
 * Get sprite data for a Pokemon species.
 * Handles all forms and variants (Ogerpon-Hearthflame, Urshifu-Rapid-Strike, etc.).
 */
export function getPokemonSprite(
  species: string,
  options?: { shiny?: boolean; gender?: "M" | "F" }
): SpriteData {
  const sprite = Sprites.getPokemon(species, {
    gen: "gen5",
    shiny: options?.shiny,
    gender: options?.gender,
  });
  return {
    url: sprite.url,
    w: sprite.w,
    h: sprite.h,
    pixelated: sprite.pixelated ?? false,
  };
}

/**
 * Get inline style string for rendering an item icon from the spritesheet.
 */
export function getItemSpriteStyle(item: string): string {
  return Icons.getItem(item).style;
}

/**
 * Get the Pokemon Showdown type icon URL for a given type name.
 * Type names are capitalized (e.g., "Fire", "Water", "Stellar").
 */
export function getShowdownTypeIconUrl(type: string): string {
  return `https://play.pokemonshowdown.com/sprites/types/${type}.png`;
}

/**
 * Get the Pokemon Showdown Tera type icon URL for a given type name.
 * These are the crystallized gem-shaped icons specific to Terastallization.
 * Type names are capitalized (e.g., "Fire" → "TeraFire").
 */
export function getShowdownTeraTypeIconUrl(type: string): string {
  return `https://play.pokemonshowdown.com/sprites/types/Tera${type}.png`;
}
