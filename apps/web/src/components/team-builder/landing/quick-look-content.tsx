"use client";

/**
 * QuickLookContent — presentational component
 *
 * Renders the full 6-slot team preview: sprite, species name, held item,
 * ability, tera type, and move list. Used by both the desktop HoverCard
 * (`quick-look.tsx`) and the mobile bottom-sheet (`quick-look-sheet.tsx`).
 *
 * Empty-slot placeholders are shown when there are fewer than 6 filled slots.
 */

import Image from "next/image";

import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";

import { type QuickLookData, type QuickLookSlot } from "./quick-look-shared";

// =============================================================================
// Constants
// =============================================================================

const MAX_SLOTS = 6;

// =============================================================================
// SlotCard — one Pokémon's details
// =============================================================================

interface SlotCardProps {
  slot: QuickLookSlot;
}

function SlotCard({ slot }: SlotCardProps) {
  const sprite = getPokemonSprite(slot.species ?? "", { shiny: slot.isShiny });

  return (
    <div className="flex items-start gap-2.5 rounded-md p-1.5">
      {/* Sprite */}
      <div className="relative size-10 shrink-0">
        <Image
          src={sprite.url}
          alt={slot.species ?? "Unknown Pokémon"}
          width={sprite.w}
          height={sprite.h}
          className={cn(
            "size-full object-contain",
            sprite.pixelated && "image-rendering-pixelated"
          )}
          unoptimized
        />
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1 space-y-0.5">
        {/* Species name */}
        <p className="truncate text-sm font-medium leading-tight">
          {slot.species ?? "Unknown"}
        </p>

        {/* Item + Ability + Tera — compact metadata line */}
        <div className="text-muted-foreground flex flex-wrap gap-x-2 gap-y-0 text-xs leading-tight">
          {slot.heldItem && (
            <span className="truncate" data-testid="ql-item">
              @ {slot.heldItem}
            </span>
          )}
          {slot.ability && (
            <span className="truncate" data-testid="ql-ability">
              {slot.ability}
            </span>
          )}
          {slot.teraType && (
            <span className="truncate" data-testid="ql-tera">
              Tera: {slot.teraType}
            </span>
          )}
        </div>

        {/* Moves */}
        {slot.moves.length > 0 && (
          <ul
            className="text-muted-foreground grid grid-cols-2 gap-x-2 text-xs leading-tight"
            aria-label="Moves"
          >
            {slot.moves.map((move) => (
              <li key={move} className="truncate" data-testid="ql-move">
                {move}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// EmptySlotCard — placeholder for unfilled slots
// =============================================================================

function EmptySlotCard() {
  return (
    <div
      className="flex items-center gap-2.5 rounded-md p-1.5"
      aria-hidden="true"
    >
      {/* Placeholder circle */}
      <div className="bg-muted size-10 shrink-0 rounded-full" />
      <p className="text-muted-foreground text-xs">Empty slot</p>
    </div>
  );
}

// =============================================================================
// QuickLookContent
// =============================================================================

export interface QuickLookContentProps {
  data: QuickLookData;
  className?: string;
}

/**
 * Renders the full 6-slot peek content.
 *
 * Filled slots show sprite + species + item/ability/tera/moves.
 * Unfilled slots (< 6 filled) show a muted placeholder.
 */
export function QuickLookContent({ data, className }: QuickLookContentProps) {
  const emptyCount = MAX_SLOTS - data.slots.length;

  return (
    <div className={cn("space-y-1", className)}>
      {data.slots.map((slot, i) => (
        <SlotCard key={i} slot={slot} />
      ))}
      {Array.from({ length: emptyCount }).map((_, i) => (
        <EmptySlotCard key={`empty-${i}`} />
      ))}
    </div>
  );
}
