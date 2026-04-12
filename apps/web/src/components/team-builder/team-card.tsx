"use client";

import Image from "next/image";
import Link from "next/link";

import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { getFormatLabel } from "@trainers/pokemon";
import { formatTimeAgo } from "@trainers/utils";
import { type TeamListItem } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamCardProps {
  team: TeamListItem;
  handle: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Sprite slot — renders a single Pokemon sprite or an empty placeholder
// ---------------------------------------------------------------------------

interface SpriteSlotProps {
  species: string | null | undefined;
  isShiny: boolean;
  position: number;
}

function SpriteSlot({ species, isShiny, position }: SpriteSlotProps) {
  if (!species) {
    return (
      <div
        className="bg-muted size-10 rounded-md"
        aria-label={`Empty slot ${position + 1}`}
      />
    );
  }

  const sprite = getPokemonSprite(species, { shiny: isShiny });

  return (
    <div className="relative size-10 shrink-0">
      <Image
        src={sprite.url}
        alt={species}
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
// TeamCard
// ---------------------------------------------------------------------------

/**
 * Team card for the teams list view.
 * Displays 6 sprite slots, format badge, name, and last updated time.
 * Navigates to the team workspace on click.
 */
export function TeamCard({ team, handle, className }: TeamCardProps) {
  // Sort by position and pad to 6 slots
  const sortedPokemon = [...team.team_pokemon].sort(
    (a, b) => a.team_position - b.team_position
  );
  const slots = Array.from({ length: 6 }, (_, i) => sortedPokemon[i] ?? null);

  return (
    <Link
      href={`/dashboard/alts/${handle}/teams/${team.id}`}
      className={cn(
        "bg-card hover:bg-accent/50 group flex flex-col gap-3 rounded-xl border p-3 transition-colors md:p-4",
        className
      )}
    >
      {/* Sprite row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {slots.map((slot, i) => (
          <SpriteSlot
            key={i}
            position={i}
            species={slot?.pokemon?.species ?? null}
            isShiny={slot?.pokemon?.is_shiny ?? false}
          />
        ))}
      </div>

      {/* Team name + metadata */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm leading-tight font-medium group-hover:underline">
          {team.name}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {team.format && (
            <Badge variant="secondary" className="text-xs">
              {getFormatLabel(team.format)}
            </Badge>
          )}
          <span className="text-muted-foreground text-xs">
            {formatTimeAgo(team.updated_at ?? team.created_at ?? "")}
          </span>
        </div>
      </div>
    </Link>
  );
}
