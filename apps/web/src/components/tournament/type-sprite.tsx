"use client";

import Image from "next/image";
import { useState } from "react";
import {
  getShowdownTypeIconUrl,
  getShowdownTeraTypeIconUrl,
} from "@/lib/pokemon/sprites";
import { cn } from "@/lib/utils";

interface TypeSpriteProps {
  type: string;
  tera?: boolean;
  className?: string;
}

export function TypeSprite({ type, tera = false, className }: TypeSpriteProps) {
  const [error, setError] = useState(false);

  if (error || !type) {
    return null;
  }

  const src = tera
    ? getShowdownTeraTypeIconUrl(type)
    : getShowdownTypeIconUrl(type);

  return (
    <Image
      src={src}
      alt={tera ? `Tera ${type}` : type}
      width={32}
      height={14}
      className={cn("inline-block", className)}
      onError={() => setError(true)}
    />
  );
}
