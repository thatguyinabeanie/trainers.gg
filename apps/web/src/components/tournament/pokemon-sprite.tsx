"use client";

import Image from "next/image";
import { useState } from "react";
import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { cn } from "@/lib/utils";

interface PokemonSpriteProps {
  species: string;
  size?: number;
  shiny?: boolean;
  gender?: "M" | "F";
  className?: string;
}

export function PokemonSprite({
  species,
  size = 68,
  shiny,
  gender,
  className,
}: PokemonSpriteProps) {
  const [error, setError] = useState(false);

  if (error || !species) {
    return (
      <span
        className={cn(
          "bg-muted text-muted-foreground inline-flex items-center justify-center rounded-full text-[10px] font-medium uppercase",
          className
        )}
        style={{ width: size, height: size }}
        title={species}
      >
        {species.slice(0, 3)}
      </span>
    );
  }

  const sprite = getPokemonSprite(species, { shiny, gender });

  return (
    <Image
      src={sprite.url}
      alt={species}
      width={size}
      height={size}
      className={cn(
        sprite.pixelated && "[image-rendering:pixelated]",
        className
      )}
      onError={() => setError(true)}
      unoptimized
    />
  );
}
