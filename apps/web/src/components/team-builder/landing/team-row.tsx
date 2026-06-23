"use client";

import Image from "next/image";
import Link from "next/link";
import { MoreHorizontal, Trash2 } from "lucide-react";

import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { getFormatLabel } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  type TeamRowProps,
  type DraftSpeciesSlot,
  draftEditorHref,
} from "./team-landing-shared";

// ---------------------------------------------------------------------------
// Sprite strip — renders up to 6 species sprites
// ---------------------------------------------------------------------------

interface SpriteProps {
  slot: DraftSpeciesSlot;
  index: number;
  highlighted: boolean;
}

function Sprite({ slot, index, highlighted }: SpriteProps) {
  const sprite = getPokemonSprite(slot.species ?? "", { shiny: slot.isShiny });

  return (
    <div
      className={cn(
        "relative size-8 shrink-0 rounded sm:size-9",
        // Subtle teal highlight ring+bg when this species is a search match
        highlighted && "bg-teal-500/10 ring-2 ring-teal-500/40"
      )}
    >
      <Image
        src={sprite.url}
        alt={slot.species ?? `Slot ${index + 1}`}
        width={sprite.w}
        height={sprite.h}
        className={cn(
          "size-full object-contain",
          sprite.pixelated && "image-rendering-pixelated"
        )}
        unoptimized
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TeamRow
// ---------------------------------------------------------------------------

/**
 * Name-first row for the /builder landing draft list.
 *
 * Layout: [name] → [sprites] → [format badge] … [⋯ overflow menu]
 *
 * The main area is a Next.js Link to the draft editor. The overflow menu
 * is a sibling (not nested inside the link) to avoid nested interactive
 * elements.
 *
 * Optional props (additive — existing behaviour preserved when unset):
 * - `highlightSpecies` — species strings to highlight with a teal ring/bg
 * - `onPeek` — adds a "Peek" item to the overflow menu above Delete
 */
export function TeamRow({ summary, onDelete, highlightSpecies, onPeek }: TeamRowProps) {
  const highlightSet = new Set(highlightSpecies ?? []);

  return (
    <div className="group flex items-center gap-2 rounded-lg py-1.5 transition-colors hover:bg-accent/40 sm:gap-3">
      {/* Main clickable area */}
      <Link
        href={draftEditorHref(summary.id)}
        className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
      >
        {/* Name column — fixed width, truncates on overflow */}
        <div className="w-36 min-w-0 shrink-0 sm:w-48">
          <span className="block truncate text-sm font-medium leading-tight">
            {summary.name}
          </span>
        </div>

        {/* Sprite strip */}
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {summary.filledCount === 0 ? (
            <span className="text-muted-foreground text-xs">Empty</span>
          ) : (
            summary.species.map((slot, i) => (
              <Sprite
                key={`${slot.species ?? "empty"}-${i}`}
                slot={slot}
                index={i}
                highlighted={slot.species !== null && highlightSet.has(slot.species)}
              />
            ))
          )}
        </div>

        {/* Format badge */}
        {summary.format && (
          <div className="shrink-0">
            <Badge variant="secondary" className="text-xs">
              {getFormatLabel(summary.format)}
            </Badge>
          </div>
        )}
      </Link>

      {/* Overflow menu — sibling of Link, not nested inside it */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            // ≥40px tap target on mobile, smaller on sm+
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-10 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-8",
            // Keep visible on hover/focus; hidden by default on larger screens
            "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          )}
          aria-label="Team options"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          {/* Peek item — shown only when onPeek is provided */}
          {onPeek && (
            <DropdownMenuItem onClick={() => onPeek(summary.id)}>
              Peek
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete?.(summary.id)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
