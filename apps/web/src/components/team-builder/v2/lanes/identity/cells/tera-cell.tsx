"use client";

import { useState } from "react";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { TypeDot } from "../../../type-dot";
import { TypePicker } from "../../../pickers/type-picker";
import { formatSupportsTera } from "../../../format-gating";
import { type CellVariant } from "./identity-cell-shared";
import sLegacy from "../../../builder.module.css";
import sNew from "../identity-lane.module.css";

// =============================================================================
// TeraCell — tera type form cell, row (compact) or grid (hero) variant
//
// Returns null when the format does not support Terastallization.
// =============================================================================

interface TeraCellProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  variant: CellVariant;
}

export function TeraCell({
  pokemon,
  format,
  onUpdate,
  variant,
}: TeraCellProps) {
  const [open, setOpen] = useState(false);

  if (!formatSupportsTera(format)) return null;

  const picker = (
    <TypePicker
      value={pokemon.tera_type}
      onPick={(type) => onUpdate({ tera_type: type })}
      onClose={() => setOpen(false)}
    />
  );

  const teraContent = pokemon.tera_type ? (
    <>
      <TypeDot t={pokemon.tera_type} size={10} />
      <span
        className={
          variant === "row" ? sNew.formValue : sLegacy.heroFormVal
        }
      >
        {pokemon.tera_type}
      </span>
    </>
  ) : (
    <span
      className={cn(
        variant === "row" ? sNew.formValue : sLegacy.heroFormVal,
        "text-muted-foreground/50 italic"
      )}
    >
      —
    </span>
  );

  if (variant === "row") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<button type="button" className={sNew.formRow} />}
        >
          <span className={sNew.formLabel}>Tera</span>
          <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
            {teraContent}
          </span>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-auto p-0">
          {picker}
        </PopoverContent>
      </Popover>
    );
  }

  // variant === "grid" — hero layout
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(sLegacy.heroFormCell, sLegacy.heroFormCellSpan2)}
          />
        }
      >
        <span className={sLegacy.heroFormLbl}>TERA</span>
        <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          {teraContent}
        </span>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-auto p-0">
        {picker}
      </PopoverContent>
    </Popover>
  );
}
