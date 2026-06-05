"use client";

import { useState } from "react";

import { type StatKey, type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { type ValidationError } from "../../validation-hooks";
import { NatureChevrons } from "../../nature-chevrons";
import { NaturePicker } from "../../pickers/nature-picker";
import { FieldErrors } from "../../validation/field-error";
import { FormChip } from "../../lanes/form-chip";
import { cellClasses, type CellVariant } from "./shared";

// =============================================================================
// NatureCell — nature form cell, row (compact) or grid (hero) variant
// =============================================================================

interface NatureCellProps {
  pokemon: Tables<"pokemon">;
  /** Current format — forwarded to NaturePicker for usage data fetching. */
  format: GameFormat | undefined;
  natUp: StatKey | null | undefined;
  natDown: StatKey | null | undefined;
  errors: ValidationError[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  variant: CellVariant;
}

export function NatureCell({
  pokemon,
  format,
  natUp,
  natDown,
  errors,
  onUpdate,
  variant,
}: NatureCellProps) {
  const [open, setOpen] = useState(false);

  // Species from the pokemon row — forwarded to NaturePicker for usage data.
  const species = pokemon.species ?? undefined;

  if (variant === "row") {
    return (
      <div className="flex flex-col">
        <FormChip
          label="Nat"
          value={pokemon.nature ?? ""}
          trailing={<NatureChevrons boost={natUp} reduce={natDown} />}
          triggerClassName={
            errors.length > 0
              ? "ring-1 ring-destructive/40 rounded"
              : undefined
          }
          open={open}
          onOpenChange={setOpen}
        >
          <NaturePicker
            value={pokemon.nature ?? ""}
            species={species}
            format={format}
            onPick={(nature) => onUpdate({ nature })}
            onClose={() => setOpen(false)}
          />
        </FormChip>
        <FieldErrors errors={errors} className="px-1" />
      </div>
    );
  }

  // variant === "grid" — MidStack layout
  return (
    <div className="flex flex-col">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                cellClasses.midFormCell,
                errors.length > 0 && "ring-destructive/40 rounded ring-1"
              )}
            />
          }
        >
          <span className={cellClasses.midFormLbl}>NAT</span>
          <span
            className={cn(
              cellClasses.midFormVal,
              !pokemon.nature && "text-muted-foreground/50 italic"
            )}
          >
            {pokemon.nature || "—"}
            {pokemon.nature && (
              <NatureChevrons boost={natUp} reduce={natDown} />
            )}
          </span>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-auto p-0">
          <NaturePicker
            value={pokemon.nature ?? ""}
            species={species}
            format={format}
            onPick={(nature) => onUpdate({ nature })}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <FieldErrors errors={errors} className="px-1" />
    </div>
  );
}
