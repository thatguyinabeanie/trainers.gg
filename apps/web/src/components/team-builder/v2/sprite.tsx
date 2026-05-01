"use client";

import Image from "next/image";

import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { type PokemonType } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

// =============================================================================
// Sprite
// =============================================================================

interface SpriteProps {
  species: string;
  size?: number;
  types: PokemonType[];
}

// Maps PokemonType to a CSS color value for the background tint.
// These are approximations of the type colors in a translucent form
// suitable for a background — using CSS color-mix isn't available in
// all Tailwind inline contexts so we use direct hex/oklch approximations.
const TYPE_TINT: Partial<Record<PokemonType, string>> = {
  Normal: "#a8a878",
  Fire: "#f08030",
  Water: "#6890f0",
  Electric: "#f8d030",
  Grass: "#78c850",
  Ice: "#98d8d8",
  Fighting: "#c03028",
  Poison: "#a040a0",
  Ground: "#e0c068",
  Flying: "#a890f0",
  Psychic: "#f85888",
  Bug: "#a8b820",
  Rock: "#b8a038",
  Ghost: "#705898",
  Dragon: "#7038f8",
  Dark: "#705848",
  Steel: "#b8b8d0",
  Fairy: "#ee99ac",
};

/**
 * Wrapped Pokemon sprite renderer with a type-tinted background.
 * Background is tinted by the primary type using a translucent overlay,
 * matching the builder_v2 design's identity lane aesthetic.
 *
 * Default size is 128px (per the PokeRow redesign spec).
 * Tint mix is 40% for a softer background.
 */
export function Sprite({ species, size = 128, types }: SpriteProps) {
  const sprite = getPokemonSprite(species, { shiny: false });
  const primaryType = types[0];
  const tint = primaryType ? (TYPE_TINT[primaryType] ?? "#a8a878") : "#a8a878";

  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl"
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${tint} 40%, transparent)`,
      }}
    >
      <Image
        src={sprite.url}
        alt={species}
        width={sprite.w}
        height={sprite.h}
        className={cn("object-contain", sprite.pixelated && "image-rendering-pixelated")}
        style={{ width: size * 0.85, height: size * 0.85 }}
        unoptimized
      />
    </div>
  );
}
