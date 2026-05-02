"use client";

import { useState } from "react";

import { getSpeciesTypes, type GameFormat } from "@trainers/pokemon";
import { getShowdownTypeIconUrl } from "@trainers/pokemon/sprites";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { formatSupportsLevel } from "../format-gating";
import { NumberPicker } from "../pickers/number-picker";
import s from "../builder.module.css";

// =============================================================================
// Types
// =============================================================================

interface RibDecorationsProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
}

// =============================================================================
// RibDecorations
// =============================================================================

/**
 * Vertical strip of Pokémon decorations rendered inside the active-row rib.
 *
 * Renders:
 *  - Type pills rotated -90° (counter-clockwise, text reads bottom→top)
 *  - Level picker (only when format supports levels)
 *
 * Hidden on mobile (≤767px) via `.ribDecorations` CSS class.
 */
export function RibDecorations({
  pokemon,
  format,
  onUpdate,
}: RibDecorationsProps) {
  const types = getSpeciesTypes(pokemon.species ?? "");
  const [levelOpen, setLevelOpen] = useState(false);

  const level = pokemon.level ?? 50;
  const showLevel = formatSupportsLevel(format);

  return (
    <div className={cn(s.ribDecorations, "flex flex-col items-center gap-1.5")}>
      {/* Type pills — rotated -90° so text reads bottom→top.
          Wrapper uses grid (not flex) so the image keeps its intrinsic
          h-6 size. After rotation the image's visual footprint is
          ~24px wide × ~55px tall, fitting the 6×14 (24×56) wrapper.
          The image overflows horizontally pre-rotation; that overflow
          is benign (the row card's overflow:hidden contains it). */}
      {types.map((t) => (
        <div
          key={t}
          className="grid h-14 w-6 place-items-center overflow-visible"
        >
          <img
            src={getShowdownTypeIconUrl(t)}
            alt={t}
            title={t}
            className="-rotate-90 h-6 w-auto max-w-none [image-rendering:pixelated]"
          />
        </div>
      ))}

      {/* Level picker — format-gated */}
      {showLevel && (
        <Popover open={levelOpen} onOpenChange={setLevelOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                title={`Level ${level}`}
                className="bg-muted/60 hover:bg-muted border-border rounded border px-1 py-0.5 font-mono font-medium text-[9px] text-muted-foreground"
              />
            }
          >
            <span>L{level}</span>
          </PopoverTrigger>
          <PopoverContent side="right" align="center" className="w-auto p-0">
            <NumberPicker
              title="Level"
              value={level}
              min={1}
              max={100}
              onChange={(v) => onUpdate({ level: v })}
              onClose={() => setLevelOpen(false)}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
