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
    <div className={cn(s.ribDecorations, "flex flex-col items-center gap-2")}>
      {/* Type pills — rotated -90° (counter-clockwise) so text reads bottom→top.
          The image is absolutely positioned + transformed so its centre stays
          locked to the wrapper's centre regardless of the natural-width overflow
          (Showdown type icons are ~55px wide at h-6, wider than the 24px wrapper). */}
      {types.map((t) => (
        <div
          key={t}
          className="relative h-14 w-6 overflow-visible"
        >
          <img
            src={getShowdownTypeIconUrl(t)}
            alt={t}
            title={t}
            className="absolute left-1/2 top-1/2 h-6 w-auto max-w-none origin-center -translate-x-1/2 -translate-y-1/2 -rotate-90 [image-rendering:pixelated]"
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
