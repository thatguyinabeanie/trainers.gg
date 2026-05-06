"use client";

/**
 * TeraTypeIcon — hexagonal crystalline type icon used for Tera types.
 * Visually distinct from the round TypeSymbolIcon: uses a hexagonal
 * clip-path to evoke Scarlet/Violet's Tera crystal shape.
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
// Icon + background mapping (same glyphs as TypeSymbolIcon)
// =============================================================================

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
  Stellar: { icon: Sparkles, bgClass: "bg-purple-500  text-white" },
};

// Hexagonal clip-path (pointy-top hexagon)
export const HEXAGON_CLIP =
  "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

// =============================================================================
// TeraTypeIcon
// =============================================================================

interface TeraTypeIconProps {
  type: PokemonType | "Stellar";
  /** Icon size in pixels (width and height of the bounding box). */
  size?: number;
  className?: string;
}

/**
 * Hexagonal crystalline type icon for Tera types.
 * Uses the same lucide glyphs but a hex clip-path to distinguish from regular types.
 */
export function TeraTypeIcon({
  type,
  size = 18,
  className,
}: TeraTypeIconProps) {
  const mapping = TYPE_SYMBOL_MAP[type];
  const { icon: Icon, bgClass } = mapping ?? {
    icon: Circle,
    bgClass: "bg-muted text-foreground",
  };

  const glyphSize = Math.round(size * 0.55);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="img"
            aria-label={`Tera ${type}`}
            data-type={type}
            data-tera
            style={{
              width: size,
              height: size,
              clipPath: HEXAGON_CLIP,
            }}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center justify-center",
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
      <TooltipContent>Tera {type}</TooltipContent>
    </Tooltip>
  );
}
