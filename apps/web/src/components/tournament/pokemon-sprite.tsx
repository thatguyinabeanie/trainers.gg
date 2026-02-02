"use client";

import Image from "next/image";
import { useState } from "react";
import { getShowdownSpriteUrl } from "@/lib/pokemon/sprites";
import { cn } from "@/lib/utils";

interface PokemonSpriteProps {
  species: string;
  size?: number;
  className?: string;
}

export function PokemonSprite({
  species,
  size = 32,
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

  return (
    <Image
      src={getShowdownSpriteUrl(species)}
      alt={species}
      width={size}
      height={size}
      className={cn("[image-rendering:pixelated]", className)}
      onError={() => setError(true)}
      unoptimized
    />
  );
}
