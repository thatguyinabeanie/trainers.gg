"use client";

import { useState } from "react";

import { getMoveData, type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { TypeDot } from "../type-dot";
import { MovePicker } from "../pickers/move-picker";
import { TYPE_BG_COLORS } from "../../type-colors";

// =============================================================================
// Types
// =============================================================================

interface MovesLaneProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
}

type MoveSlot = "move1" | "move2" | "move3" | "move4";

// =============================================================================
// Helpers
// =============================================================================

const MOVE_SLOTS: MoveSlot[] = ["move1", "move2", "move3", "move4"];

// =============================================================================
// MoveTile — one move row
// =============================================================================

interface MoveTileProps {
  slotKey: MoveSlot;
  moveName: string | null;
  species: string;
  format: GameFormat | undefined;
  onPick: (slotKey: MoveSlot, moveName: string) => void;
}

function MoveTile({ slotKey, moveName, species, format, onPick }: MoveTileProps) {
  const [open, setOpen] = useState(false);
  const move = moveName ? getMoveData(moveName) : undefined;

  const typeColorClass = move?.type
    ? (TYPE_BG_COLORS[move.type as keyof typeof TYPE_BG_COLORS] ?? "bg-muted text-foreground")
    : "bg-muted text-foreground";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <button
          type="button"
          // TODO Phase 4: live damage preview, calc detail card on left-click, move picker on right-click
          className={cn(
            "grid min-w-0 items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors",
            moveName
              ? "bg-card/80 border-border hover:border-border/80 hover:bg-muted/40"
              : "border-dashed border-border/40 bg-transparent hover:border-border/60"
          )}
          style={{ gridTemplateColumns: "12px 1fr auto auto" }}
        >
          {/* Type dot */}
          <TypeDot t={move?.type ?? "Normal"} size={10} />

          {/* Move name */}
          <span
            className={cn(
              "min-w-0 truncate text-[12.5px] font-medium",
              !moveName && "text-muted-foreground/50 italic"
            )}
          >
            {moveName ?? `— set move ${MOVE_SLOTS.indexOf(slotKey) + 1}`}
          </span>

          {/* Type badge */}
          {move?.type && (
            <span
              className={cn(
                "shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase leading-none",
                typeColorClass
              )}
            >
              {move.type.slice(0, 3)}
            </span>
          )}

          {/* BP */}
          <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
            {move?.basePower && move.basePower > 0 ? move.basePower : "—"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-auto p-0">
        <MovePicker
          value={moveName}
          species={species}
          format={format}
          onPick={(name) => {
            onPick(slotKey, name);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// MovesLane
// =============================================================================

/**
 * Vertical stack of 4 move tiles.
 * Clicking a tile opens the move picker popover.
 *
 * TODO Phase 4: live damage preview, calc detail card on left-click, move picker on right-click.
 */
export function MovesLane({ pokemon, format, onUpdate }: MovesLaneProps) {
  function handlePick(slotKey: MoveSlot, moveName: string) {
    onUpdate({ [slotKey]: moveName });
  }

  return (
    <div className="flex min-w-0 flex-col gap-1 border-r border-dashed border-border/60 p-3" style={{ minWidth: 200 }}>
      {/* Header */}
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          Moves
        </span>
      </div>

      {/* Move tiles */}
      <div className="flex flex-col gap-1">
        {MOVE_SLOTS.map((slotKey) => (
          <MoveTile
            key={slotKey}
            slotKey={slotKey}
            moveName={pokemon[slotKey]}
            species={pokemon.species ?? ""}
            format={format}
            onPick={handlePick}
          />
        ))}
      </div>
    </div>
  );
}
