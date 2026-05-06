"use client";

import { useState } from "react";

import { type GameFormat, type PokemonType } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { TeraTypeIcon } from "@/components/team-builder/tera-type-icon";
import { TypePill } from "@/components/team-builder/v2/type-pill";
import { formatSupportsTera } from "@/components/team-builder/v2/format-gating";
import { TypePicker } from "@/components/team-builder/v2/pickers/type-picker";
import { cellClasses, type CellVariant } from "./identity-cell-shared";

// =============================================================================
// TypeCell — Pokémon types + inline tera type icon (for SV formats)
//
// Regular types are read-only (derived from species). Tera type is interactive.
// When the format supports Tera, the tera icon renders inline to the right
// of the regular type icons — no separate TERA row needed.
// =============================================================================

interface TypeCellProps {
  types: PokemonType[];
  variant: CellVariant;
  /** Required for inline tera rendering */
  pokemon?: Tables<"pokemon">;
  format?: GameFormat;
  onUpdate?: (fields: Partial<TablesUpdate<"pokemon">>) => void;
}

export function TypeCell({
  types,
  variant,
  pokemon,
  format,
  onUpdate,
}: TypeCellProps) {
  const [teraOpen, setTeraOpen] = useState(false);
  const showTera = formatSupportsTera(format) && pokemon && onUpdate;

  const teraIcon = showTera ? (
    <Popover open={teraOpen} onOpenChange={setTeraOpen}>
      <PopoverTrigger
        render={
          <button type="button" className="inline-flex cursor-pointer">
            {pokemon.tera_type ? (
              <TeraTypeIcon type={pokemon.tera_type as PokemonType} size={18} />
            ) : (
              <span
                className="border-muted-foreground/40 text-muted-foreground/50 inline-flex shrink-0 cursor-pointer items-center justify-center border border-dashed"
                style={{
                  width: 18,
                  height: 18,
                  clipPath:
                    "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                }}
                aria-label="Set Tera type"
              >
                <span className="text-[8px] font-bold">T</span>
              </span>
            )}
          </button>
        }
      />
      <PopoverContent side="bottom" align="start" className="w-auto p-0">
        <TypePicker
          value={pokemon.tera_type}
          onPick={(type) => onUpdate({ tera_type: type })}
          onClose={() => setTeraOpen(false)}
        />
      </PopoverContent>
    </Popover>
  ) : null;

  if (variant === "row") {
    return (
      <div
        className={cn(
          "grid w-full grid-cols-[60px_minmax(0,1fr)] items-center gap-1.5 rounded px-1 py-[3px] text-left transition-colors",
          "cursor-default bg-transparent hover:bg-transparent"
        )}
      >
        <span className="text-muted-foreground shrink-0 overflow-hidden font-mono text-[9px] font-bold tracking-[0.08em] text-ellipsis whitespace-nowrap uppercase">
          Type
        </span>
        <span
          className={cn(
            "text-foreground min-w-0 overflow-hidden text-[11.5px] text-ellipsis whitespace-nowrap",
            "flex items-center gap-1"
          )}
        >
          {types.length > 0 ? (
            types.map((t) => <TypePill key={t} t={t} size={18} />)
          ) : (
            <span className="text-muted-foreground/25 italic">—</span>
          )}
          {teraIcon}
        </span>
      </div>
    );
  }

  // variant === "grid" — MidStack / Vertical layout
  return (
    <div
      className={cn(
        cellClasses.midFormCell,
        "cursor-default hover:bg-transparent"
      )}
    >
      <span className={cellClasses.midFormLbl}>TYPE</span>
      <span className={cn(cellClasses.midFormVal, "items-center")}>
        {types.length > 0 ? (
          types.map((t) => <TypePill key={t} t={t} size={18} />)
        ) : (
          <span className="text-muted-foreground/25 italic">—</span>
        )}
        {teraIcon}
      </span>
    </div>
  );
}
