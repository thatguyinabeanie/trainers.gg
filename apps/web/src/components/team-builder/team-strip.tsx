"use client";

import { type DragEvent, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { type TeamWithPokemon } from "@trainers/supabase";

import { type ValidationError } from "./validation-hooks";

import {
  reorderTeamPokemonAction,
  removePokemonFromTeamAction,
} from "@/actions/teams";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================================================
// Types
// =============================================================================

interface TeamStripProps {
  teamId: number;
  pokemon: TeamWithPokemon["team_pokemon"];
  selectedPokemonId: number | null;
  onSelect: (pokemonId: number) => void;
  onAddNew: () => void;
  choosingSlot?: number;
  /** Validation errors grouped by pokemon DB id — populated by Task 5 display logic. */
  pokemonErrors?: Map<number, ValidationError[]>;
}

// =============================================================================
// PokemonChip — individual slot in the team strip
// =============================================================================

interface PokemonChipProps {
  entry: TeamWithPokemon["team_pokemon"][number];
  isSelected: boolean;
  isChoosing: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDragStart: (e: DragEvent<HTMLElement>) => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
  isPending: boolean;
  hasIssues?: boolean;
  hasWarningsOnly?: boolean;
}

function PokemonChip({
  entry,
  isSelected,
  isChoosing,
  onSelect,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isPending,
  hasIssues,
  hasWarningsOnly,
}: PokemonChipProps) {
  const pokemon = entry.pokemon;

  // "Choosing..." state — species picker is open for this slot
  if (isChoosing) {
    return (
      <div
        className={cn(
          "border-primary bg-primary/5 relative flex size-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 transition-colors"
        )}
        aria-label="Choosing species…"
      >
        <span className="text-primary text-xs font-medium">Choosing…</span>
      </div>
    );
  }

  if (!pokemon) {
    // Slot exists in DB but has no species yet — treat like choosing
    return (
      <div
        className="bg-muted/40 relative flex size-16 shrink-0 items-center justify-center rounded-xl"
        aria-label="Empty slot"
      />
    );
  }

  const sprite = getPokemonSprite(pokemon.species ?? "", {
    shiny: pokemon.is_shiny ?? false,
    gender:
      pokemon.gender === "Male"
        ? "M"
        : pokemon.gender === "Female"
          ? "F"
          : undefined,
  });

  // Sprite-only chip — species name surfaces via Tooltip on hover, per the
  // locked design (mockup 01-overall-layout). Held item also surfaces in
  // the tooltip so the chip stays visually clean.
  const tooltipLabel = pokemon.nickname
    ? `${pokemon.nickname} (${pokemon.species ?? "?"})`
    : (pokemon.species ?? "Unknown");

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={cn(
              "group relative flex size-16 shrink-0 cursor-grab items-center justify-center rounded-xl border-2 transition-colors active:cursor-grabbing",
              isSelected
                ? "border-primary bg-primary/10"
                : "hover:border-border bg-muted/40 hover:bg-muted/60 border-transparent"
            )}
            aria-label={pokemon.species ?? "Unknown"}
          />
        }
      >
        {/* Clickable area — select this pokemon. Fills the chip so the
            entire square is the hit target. */}
        <button
          type="button"
          onClick={onSelect}
          disabled={isPending}
          className="flex size-full items-center justify-center"
          aria-pressed={isSelected}
        >
          <div className="relative size-12">
            <Image
              src={sprite.url}
              alt={pokemon.species ?? ""}
              width={sprite.w}
              height={sprite.h}
              className={cn(
                "size-full object-contain",
                sprite.pixelated && "image-rendering-pixelated"
              )}
              unoptimized
            />
          </div>
        </button>

        {/* Validation indicator — red for errors, amber for warnings */}
        {hasIssues && (
          <span
            className={cn(
              "absolute -top-1 -right-1 size-2.5 rounded-full",
              hasWarningsOnly ? "bg-amber-500" : "bg-destructive"
            )}
          />
        )}

        {/* Remove button — top-right, visible on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={isPending}
          className={cn(
            "absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full",
            "bg-destructive text-destructive-foreground opacity-0 transition-opacity",
            "group-hover:opacity-100 focus-visible:opacity-100",
            isPending && "pointer-events-none opacity-50"
          )}
          aria-label={`Remove ${pokemon.species ?? "Pokémon"}`}
        >
          <X className="size-2.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col">
          <span className="font-medium">{tooltipLabel}</span>
          {pokemon.held_item && (
            <span className="text-muted-foreground text-xs">
              {pokemon.held_item}
            </span>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// EmptySlot — dashed "+" placeholder for unfilled team slots
// =============================================================================

interface EmptySlotProps {
  onClick: () => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
}

function EmptySlot({ onClick, onDragOver, onDrop }: EmptySlotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "bg-muted/30 flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl md:h-20 md:w-20",
        "text-muted-foreground hover:bg-muted/60 hover:text-primary",
        "transition-colors duration-150"
      )}
      aria-label="Add Pokémon"
    >
      <Plus className="size-5" />
    </button>
  );
}

// =============================================================================
// TeamStrip
// =============================================================================

/**
 * Horizontal row of 6 Pokemon chips for the team builder workspace.
 * Supports selection, drag-and-drop reordering, and removal.
 */
export function TeamStrip({
  teamId,
  pokemon,
  selectedPokemonId,
  onSelect,
  onAddNew,
  choosingSlot,
  pokemonErrors,
}: TeamStripProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dragSourceId, setDragSourceId] = useState<number | null>(null);

  // Sort by position
  const sorted = [...pokemon].sort((a, b) => a.team_position - b.team_position);
  const filledCount = sorted.length;
  const emptySlotCount = Math.max(0, 6 - filledCount);

  // -------------------------------------------------------------------------
  // Drag handlers
  // -------------------------------------------------------------------------

  function handleDragStart(e: DragEvent<HTMLElement>, pokemonId: number) {
    e.dataTransfer.setData("text/plain", String(pokemonId));
    e.dataTransfer.effectAllowed = "move";
    setDragSourceId(pokemonId);
  }

  function handleDragOver(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(
    e: DragEvent<HTMLElement>,
    targetPokemonId: number | null
  ) {
    e.preventDefault();
    const draggedId = Number(e.dataTransfer.getData("text/plain"));
    setDragSourceId(null);

    if (!draggedId || draggedId === targetPokemonId) return;

    // Compute new positions — swap the two chips.
    // Use pokemon_id (not team_pokemon.id) since mutations key by pokemon_id.
    const newPositions = sorted.map((tp) => {
      if (tp.pokemon_id === draggedId) {
        const target = sorted.find((t) => t.pokemon_id === targetPokemonId);
        return {
          pokemonId: tp.pokemon_id,
          position: target?.team_position ?? tp.team_position,
        };
      }
      if (tp.pokemon_id === targetPokemonId) {
        const source = sorted.find((t) => t.pokemon_id === draggedId);
        return {
          pokemonId: tp.pokemon_id,
          position: source?.team_position ?? tp.team_position,
        };
      }
      return { pokemonId: tp.pokemon_id, position: tp.team_position };
    });

    startTransition(async () => {
      const result = await reorderTeamPokemonAction(teamId, newPositions);
      if (!result.success) {
        toast.error(result.error ?? "Failed to reorder Pokémon.");
        return;
      }
      router.refresh();
    });
  }

  function handleDropOnEmpty(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    // Dropping onto an empty slot doesn't change order — just reset
    setDragSourceId(null);
  }

  // -------------------------------------------------------------------------
  // Remove handler
  // -------------------------------------------------------------------------

  function handleRemove(pokemonId: number) {
    startTransition(async () => {
      const result = await removePokemonFromTeamAction(teamId, pokemonId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to remove Pokémon.");
        return;
      }
      router.refresh();
    });
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="flex items-center justify-center gap-1.5 overflow-x-auto px-3 py-3 md:gap-2 md:px-4"
      aria-label="Team strip"
    >
      {sorted.map((entry, idx) => (
        <PokemonChip
          key={entry.id}
          entry={entry}
          isSelected={entry.pokemon_id === selectedPokemonId}
          isChoosing={choosingSlot === idx}
          onSelect={() => onSelect(entry.pokemon_id)}
          onRemove={() => handleRemove(entry.pokemon_id)}
          onDragStart={(e) => handleDragStart(e, entry.pokemon_id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, entry.pokemon_id)}
          isPending={isPending || dragSourceId !== null}
          hasIssues={(pokemonErrors?.get(entry.pokemon_id)?.length ?? 0) > 0}
          hasWarningsOnly={
            (pokemonErrors?.get(entry.pokemon_id)?.length ?? 0) > 0 &&
            pokemonErrors
              ?.get(entry.pokemon_id)
              ?.every((e) => e.severity === "warning") === true
          }
        />
      ))}

      {/* Empty slots */}
      {Array.from({ length: emptySlotCount }, (_, i) => {
        const slotIdx = filledCount + i;
        const isChoosingThis = choosingSlot === slotIdx;

        if (isChoosingThis) {
          return (
            <div
              key={`empty-${i}`}
              className="border-primary bg-primary/5 flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border-2 md:h-20 md:w-20"
              aria-label="Choosing species…"
            >
              <span className="text-primary text-xs font-medium">
                Choosing…
              </span>
            </div>
          );
        }

        // Only the first empty slot is clickable (next open slot)
        if (i === 0) {
          return (
            <EmptySlot
              key={`empty-${i}`}
              onClick={onAddNew}
              onDragOver={handleDragOver}
              onDrop={handleDropOnEmpty}
            />
          );
        }

        return (
          <div
            key={`empty-${i}`}
            className="bg-muted/20 flex h-16 w-16 shrink-0 items-center justify-center rounded-xl md:h-20 md:w-20"
            aria-label={`Empty slot ${slotIdx + 1}`}
          />
        );
      })}
    </div>
  );
}
