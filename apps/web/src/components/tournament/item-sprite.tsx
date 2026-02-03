"use client";

import Image from "next/image";
import { useState } from "react";
import { getShowdownItemSpriteUrl } from "@/lib/pokemon/sprites";
import { cn } from "@/lib/utils";

interface ItemSpriteProps {
  item: string;
  size?: number;
  className?: string;
}

export function ItemSprite({ item, size = 24, className }: ItemSpriteProps) {
  const [error, setError] = useState(false);

  if (error || !item) {
    return null;
  }

  return (
    <Image
      src={getShowdownItemSpriteUrl(item)}
      alt={item}
      width={size}
      height={size}
      className={cn("[image-rendering:pixelated]", className)}
      onError={() => setError(true)}
      unoptimized
    />
  );
}
