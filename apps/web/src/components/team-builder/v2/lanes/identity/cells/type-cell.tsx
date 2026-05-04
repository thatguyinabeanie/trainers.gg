"use client";

import { type PokemonType } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { TypePill } from "../../../type-pill";
import { type CellVariant } from "./identity-cell-shared";
import bs from "../../../builder.module.css";

// =============================================================================
// TypeCell — read-only display of the Pokémon's types in the form section
//
// Unlike other cells this is NOT interactive (types derive from species).
// Renders TypePill icons inline with the same label/value chrome as siblings.
// =============================================================================

interface TypeCellProps {
  types: PokemonType[];
  variant: CellVariant;
}

export function TypeCell({ types, variant }: TypeCellProps) {
  if (variant === "row") {
    return (
      <div className={cn(bs.formRow, "cursor-default hover:bg-transparent")}>
        <span className={bs.formLabel}>Type</span>
        <span className={cn(bs.formValue, "flex items-center gap-1")}>
          {types.length > 0 ? (
            types.map((t) => <TypePill key={t} t={t} size={18} />)
          ) : (
            <span className="text-muted-foreground/25 italic">—</span>
          )}
        </span>
      </div>
    );
  }

  // variant === "grid" — MidStack / Vertical layout
  return (
    <div className="grid w-full min-w-0 cursor-default grid-cols-[56px_minmax(0,1fr)] items-baseline gap-2 rounded-[5px] border-0 bg-transparent px-1.5 py-1 text-left transition-colors">
      <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        TYPE
      </span>
      <span className="flex min-w-0 items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-foreground">
        {types.length > 0 ? (
          types.map((t) => <TypePill key={t} t={t} size={18} />)
        ) : (
          <span className="text-muted-foreground/25 italic">—</span>
        )}
      </span>
    </div>
  );
}
