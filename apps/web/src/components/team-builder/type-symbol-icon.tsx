"use client";

/**
 * TypeSymbolIcon — official Pokémon type symbol icons
 * (Scarlet/Violet/Champions/HOME style).
 *
 * The PNGs at `/types/{Type}.png` are 60×60 RGBA with their own colored
 * circular backgrounds baked in, so no additional Tailwind background is needed.
 */

import Image from "next/image";

import { type PokemonType } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

// =============================================================================
// TypeSymbolIcon
// =============================================================================

interface TypeSymbolIconProps {
  type: PokemonType | "Stellar";
  /**
   * Icon size in pixels (both width and height).
   * - Type chart left column: 18
   * - EditorHeaderBand types: 16
   * - MoveRow type column: 20
   */
  size?: number;
  className?: string;
}

/**
 * Small round type-symbol icon.
 * Uses the official Pokémon type symbols (SV/Champions/HOME).
 */
export function TypeSymbolIcon({
  type,
  size = 18,
  className,
}: TypeSymbolIconProps) {
  return (
    <span
      role="img"
      aria-label={type}
      data-type={type}
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        className
      )}
    >
      <Image
        src={`/types/${type}.png`}
        alt=""
        width={size}
        height={size}
        className="size-full rounded-full object-contain"
        aria-hidden="true"
        unoptimized
      />
    </span>
  );
}
