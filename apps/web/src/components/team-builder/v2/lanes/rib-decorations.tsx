"use client";

import { useState } from "react";

import { getSpeciesTypes, type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { formatSupportsLevel } from "../format-gating";
import { NumberPicker } from "../pickers/number-picker";
import { TypeSymbolIcon } from "../../type-symbol-icon";
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
      {/* Wordless round type symbols — translation-friendly (no English text). */}
      {types.map((t) => (
        <TypeSymbolIcon
          key={t}
          type={t as Parameters<typeof TypeSymbolIcon>[0]["type"]}
          size={24}
        />
      ))}

      {/* Level picker — format-gated.
          The .levelPicker wrapper keeps this visible on mobile (≤767px) even
          when the surrounding .ribDecorations hides type pills. */}
      {showLevel && (
        <div className={s.levelPicker}>
          <Popover open={levelOpen} onOpenChange={setLevelOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  title={`Level ${level}`}
                  className="bg-muted/60 hover:bg-muted border-border text-muted-foreground rounded border px-1 py-0.5 font-mono text-[9px] font-medium"
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
        </div>
      )}
    </div>
  );
}
