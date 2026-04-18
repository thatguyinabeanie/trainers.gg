"use client";

/**
 * TypeSymbolIcon — round type icon with a lucide-react glyph on a
 * type-colored background. No English text on the icon itself; the full
 * type name surfaces via a shadcn Tooltip and the wrapper's aria-label.
 *
 * Source rationale: Pokémon Showdown's CDN only hosts rectangular badge PNGs
 * (sprites/types/*.png) that contain English text — there are no round/glyph
 * variants available from any CDN. Using lucide-react icons on Tailwind
 * type-color backgrounds produces a crisp, text-free, self-contained icon that
 * renders at any size without a network request.
 */

import {
  Bug,
  Circle,
  Droplets,
  Flame,
  Ghost,
  Mountain,
  Shield,
  Skull,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Swords,
  Wind,
  Zap,
  type LucideProps,
} from "lucide-react";

import { type PokemonType } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================================================
// Icon + background mapping
// =============================================================================

/**
 * Each type maps to:
 *   icon      — the lucide-react icon component (glyph only, no text)
 *   bgClass   — Tailwind background + text-color classes from TYPE_PILL_COLORS
 */
const TYPE_SYMBOL_MAP: Record<
  PokemonType | "Stellar",
  { icon: React.ComponentType<LucideProps>; bgClass: string }
> = {
  Normal: { icon: Circle, bgClass: "bg-stone-400   text-white" },
  Bug: { icon: Bug, bgClass: "bg-lime-500    text-white" },
  Dark: { icon: Skull, bgClass: "bg-stone-700   text-white" },
  Dragon: { icon: Sparkles, bgClass: "bg-indigo-600  text-white" },
  Electric: { icon: Zap, bgClass: "bg-yellow-400  text-black" },
  Fairy: { icon: Star, bgClass: "bg-pink-400    text-white" },
  Fighting: { icon: Swords, bgClass: "bg-red-700     text-white" },
  Fire: { icon: Flame, bgClass: "bg-orange-500  text-white" },
  Flying: { icon: Wind, bgClass: "bg-sky-300     text-black" },
  Ghost: { icon: Ghost, bgClass: "bg-purple-600  text-white" },
  Grass: { icon: Sun, bgClass: "bg-green-500   text-white" },
  Ground: { icon: Mountain, bgClass: "bg-amber-600   text-white" },
  Ice: { icon: Snowflake, bgClass: "bg-cyan-300    text-black" },
  Poison: { icon: Skull, bgClass: "bg-purple-500  text-white" },
  Psychic: { icon: Star, bgClass: "bg-pink-500    text-white" },
  Rock: { icon: Mountain, bgClass: "bg-amber-700   text-white" },
  Steel: { icon: Shield, bgClass: "bg-slate-400   text-black" },
  Water: { icon: Droplets, bgClass: "bg-blue-500    text-white" },
  // Stellar has a gradient in the pill — use a solid mid-point purple here for
  // the round icon (gradients on tiny circles don't read well).
  Stellar: { icon: Sparkles, bgClass: "bg-purple-500  text-white" },
};

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
 * Small round type-symbol icon with a Tooltip showing the full type name.
 * No text is rendered on the icon itself — accessibility via aria-label + Tooltip.
 */
export function TypeSymbolIcon({
  type,
  size = 18,
  className,
}: TypeSymbolIconProps) {
  const mapping = TYPE_SYMBOL_MAP[type];

  // Fallback for unknown/future types — render a neutral circle.
  const { icon: Icon, bgClass } = mapping ?? {
    icon: Circle,
    bgClass: "bg-muted text-foreground",
  };

  // Icon glyph is ~60% of the container so there's a visible colored ring.
  const glyphSize = Math.round(size * 0.6);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="img"
            aria-label={type}
            data-type={type}
            style={{ width: size, height: size }}
            className={cn(
              "inline-flex shrink-0 cursor-default items-center justify-center rounded-full",
              "outline-ring/40 focus-visible:outline-2",
              bgClass,
              className
            )}
          >
            <Icon
              aria-hidden="true"
              width={glyphSize}
              height={glyphSize}
              strokeWidth={2.5}
            />
          </span>
        }
      />
      <TooltipContent>{type}</TooltipContent>
    </Tooltip>
  );
}
