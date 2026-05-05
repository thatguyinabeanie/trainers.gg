"use client";

import { useState } from "react";

import {
  type GameFormat,
  getCanonicalBaseSpecies,
  getFormsForSpecies,
  getMegaStoneForSpecies,
} from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ItemSprite } from "@/components/tournament/item-sprite";

import { type ValidationError } from "../../../../validation-hooks";
import { ItemPicker } from "../../../pickers/item-picker";
import { FieldErrors } from "../../../validation/field-error";
import { FormChip } from "../../form-chip";
import { cellClasses, type CellVariant } from "./identity-cell-shared";

// =============================================================================
// ItemCell — held-item form cell, row (compact) or grid (hero) variant
// =============================================================================

interface ItemCellProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  teamItems: string[];
  errors: ValidationError[];
  isMegaStone: boolean;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  variant: CellVariant;
}

export function ItemCell({
  pokemon,
  format,
  teamItems,
  errors,
  isMegaStone,
  onUpdate,
  variant,
}: ItemCellProps) {
  const [open, setOpen] = useState(false);

  // Toggle mega form when the MEGA chip is clicked.
  const handleMegaToggle = () => {
    if (!pokemon.species) return;
    const base = getCanonicalBaseSpecies(pokemon.species);
    const forms = getFormsForSpecies(pokemon.species);
    // If currently mega → go back to base. If base → find the mega form
    // whose required stone matches the held item.
    if (pokemon.species !== base) {
      onUpdate({ species: base });
    } else {
      const megaForm = forms.find((f) => {
        const stone = getMegaStoneForSpecies(f);
        return stone !== null && stone === pokemon.held_item;
      });
      if (megaForm) onUpdate({ species: megaForm });
    }
  };

  const isMegaActive =
    pokemon.species != null &&
    pokemon.species !== getCanonicalBaseSpecies(pokemon.species);

  const megaChip = isMegaStone ? (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={isMegaActive}
      onClick={(e) => {
        e.stopPropagation();
        handleMegaToggle();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          handleMegaToggle();
        }
      }}
      className={cellClasses.midMegaChip}
      title="Toggle mega form"
    >
      MEGA
    </span>
  ) : null;

  if (variant === "row") {
    return (
      <div className="flex flex-col">
        <FormChip
          label="Item"
          value={pokemon.held_item ?? ""}
          leading={pokemon.held_item ? <ItemSprite item={pokemon.held_item} size={16} className="shrink-0" /> : undefined}
          trailing={megaChip}
          triggerClassName={
            errors.length > 0
              ? "ring-1 ring-destructive/40 rounded"
              : undefined
          }
          open={open}
          onOpenChange={setOpen}
        >
          <ItemPicker
            value={pokemon.held_item}
            format={format}
            teamItems={teamItems}
            onPick={(item) => onUpdate({ held_item: item })}
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
          <span className={cellClasses.midFormLbl}>ITEM</span>
          <span className={cellClasses.midFormVal}>
            <span
              className={cn(
                "min-w-0 truncate",
                !pokemon.held_item && "text-muted-foreground/50 italic"
              )}
            >
              {pokemon.held_item || "—"}
            </span>
            {megaChip}
          </span>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-auto p-0">
          <ItemPicker
            value={pokemon.held_item}
            format={format}
            teamItems={teamItems}
            onPick={(item) => onUpdate({ held_item: item })}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <FieldErrors errors={errors} className="px-1" />
    </div>
  );
}
