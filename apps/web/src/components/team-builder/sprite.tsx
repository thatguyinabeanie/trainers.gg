"use client";

import Image from "next/image";

import { getTypeColor, type PokemonType } from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";

// =============================================================================
// Sprite
// =============================================================================

interface SpriteProps {
  species: string;
  size?: number;
  types: PokemonType[];
  shiny?: boolean;
}

/**
 * Wrapped Pokemon sprite renderer with a type-tinted background.
 * Uses the same type color gradient as the rib — single type gives a solid
 * tint, dual type gives a top-to-bottom gradient. Tint is 25% opacity.
 *
 * Default size is 128px (per the PokeRow redesign spec).
 */
export function Sprite({ species, size = 128, types, shiny = false }: SpriteProps) {
  const sprite = getPokemonSprite(species, { shiny });

  const background = (() => {
    if (types.length === 0) return "color-mix(in srgb, #9298A0 25%, transparent)";
    const alpha = "40"; // ~25% opacity
    const c1 = getTypeColor(types[0]!);
    if (types.length === 1) return `${c1}${alpha}`;
    const c2 = getTypeColor(types[1]!);
    return `linear-gradient(135deg, ${c1}${alpha}, ${c2}${alpha})`;
  })();

  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl"
      style={{ width: size, height: size, background }}
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
